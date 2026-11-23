import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/schulungen/server";
import { MATERIAL_BUCKET } from "@/lib/material/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liefert Schulungsmaterial vom Typ HTML aus – für den Rahmen (iframe) auf
// /schulungsmaterial/[id].
//
// Die Datei stammt von Dritten und enthält in der Regel Skripte. Sie darf
// deshalb NIE mit den Rechten unserer Seite laufen (sonst könnte sie die
// Anmeldung des Besuchers auslesen). Zwei Riegel:
//   1. CSP „sandbox" OHNE allow-same-origin: Das Dokument bekommt einen
//      eigenen, leeren Ursprung – kein Zugriff auf Cookies, Speicher oder
//      die umgebende Seite. Gilt auch, wenn jemand die Adresse direkt öffnet.
//   2. default-src 'none': Die Datei darf nichts aus dem Netz nachladen und
//      nichts dorthin senden. Erlaubt ist nur, was in der Datei selbst steckt
//      (eingebettete Skripte, Stile, Bilder/Medien/Schriften als data:) und
//      was sie daraus im Browser selbst erzeugt (blob:). Letzteres brauchen
//      Sammeldateien, die ihre Einheiten in eigenen Rahmen öffnen und beim
//      Start entpacken (frame-src, connect-src, font-src, style-src). blob:-
//      Rahmen erben Abschottung und diese Regeln – ins Netz führt keiner.
// Diese Route ist in next.config.ts von den globalen Headern ausgenommen
// (dort stehen X-Frame-Options: DENY und frame-ancestors 'none').

const CONTENT_CSP = [
  "sandbox allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox",
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval' blob: data:",
  "style-src 'unsafe-inline' blob:",
  "img-src data: blob:",
  "media-src data: blob:",
  "font-src data: blob:",
  "connect-src data: blob:",
  "frame-src blob:",
  "worker-src blob:",
  "frame-ancestors 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

// Im abgeschotteten Rahmen wirft schon der Zugriff auf localStorage /
// sessionStorage einen Fehler – viele Lerneinheiten merken sich dort den
// Fortschritt und würden abbrechen. Ersatz: ein Speicher, der bis zum
// Schließen der Seite hält.
const STORAGE_SHIM = `<script>(function(){function mem(){var d={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}["localStorage","sessionStorage"].forEach(function(n){try{window[n].getItem("_")}catch(e){try{Object.defineProperty(window,n,{value:mem(),configurable:true})}catch(_){}}})})();</script>`;

const SHIM_BYTES = new TextEncoder().encode(STORAGE_SHIM);

/**
 * Stelle (in Bytes), an der der Speicher-Ersatz eingefügt wird: direkt hinter
 * <head> bzw. <html>, sonst ganz vorn. Gesucht wird nur im Dateianfang – die
 * Dateien sind teils sehr groß (eingebettete Medien) und sollen nicht als
 * Ganzes in Text umgewandelt werden.
 */
function shimOffset(bytes: Uint8Array): number {
  // latin1: ein Zeichen je Byte, die Fundstelle ist also zugleich die Byte-Stelle.
  const start = new TextDecoder("latin1").decode(bytes.subarray(0, 64 * 1024));
  const tag = start.match(/<head[^>]*>/i) ?? start.match(/<html[^>]*>/i);
  return tag?.index !== undefined ? tag.index + tag[0].length : 0;
}

// Zwischenspeichern im Browser: Die Dateien sind groß (zig MB), jeder Abruf
// kostet Datenvolumen im Speicher-Kontingent. „no-cache" heißt: Der Browser
// darf seine Kopie behalten, muss aber vor JEDER Anzeige hier nachfragen –
// Anmeldung und Freischaltung werden also weiterhin jedes Mal geprüft; nur
// wenn beides stimmt, antworten wir mit 304 statt die Datei neu zu laden.
// Eine hochgeladene Datei ändert sich nie (neuer Upload = neuer Eintrag),
// deshalb genügt die Eintrags-ID als Kennung. CONTENT_VERSION erhöhen, wenn
// sich der eingefügte Speicher-Ersatz ändert.
const CONTENT_VERSION = 2;
const CACHE_CONTROL = "private, no-cache";

function etagFor(id: string): string {
  return `"${id.toLowerCase()}-${CONTENT_VERSION}"`;
}

function etagMatches(header: string | null, etag: string): boolean {
  if (!header) return false;
  // Unterwegs kann die Kennung als „schwach" markiert werden (W/…).
  return header.split(",").some((part) => part.trim().replace(/^W\//, "") === etag);
}

function contentHeaders(etag: string): Record<string, string> {
  return {
    "Content-Security-Policy": CONTENT_CSP,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Robots-Tag": "noindex, nofollow",
    "Cache-Control": CACHE_CONTROL,
    ETag: etag,
  };
}

function plain(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Security-Policy": "sandbox; default-src 'none'; frame-ancestors 'self'",
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return plain("Nicht gefunden.", 404);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return plain("Bitte melden Sie sich an.", 401);

  // Zugriff entscheidet die Datenbank (RLS): Schulkonten nur Freigeschaltetes,
  // Admins auch Entwürfe.
  const { data: item } = await supabase
    .from("schulungsmaterial")
    .select("storage_path, kind")
    .eq("id", id)
    .eq("uploaded", true)
    .maybeSingle();
  if (!item || item.kind !== "html") return plain("Nicht gefunden.", 404);

  const etag = etagFor(id);
  if (etagMatches(request.headers.get("if-none-match"), etag)) {
    return new Response(null, { status: 304, headers: contentHeaders(etag) });
  }

  const { data: file, error } = await createServiceClient()
    .storage.from(MATERIAL_BUCKET)
    .download(item.storage_path);
  if (error || !file) {
    console.error("[schulungsmaterial/inhalt] download:", error?.message);
    return plain("Die Datei kann im Moment nicht geladen werden.", 502);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const at = shimOffset(bytes);

  // Als Strom senden (große Dateien mit eingebetteten Medien).
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const CHUNK = 256 * 1024;
      controller.enqueue(bytes.subarray(0, at));
      controller.enqueue(SHIM_BYTES);
      for (let i = at; i < bytes.length; i += CHUNK) {
        controller.enqueue(bytes.subarray(i, i + CHUNK));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/html; charset=utf-8", ...contentHeaders(etag) },
  });
}
