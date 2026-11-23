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
//      (eingebettete Skripte, Stile, Bilder/Medien/Schriften als data:).
// Diese Route ist in next.config.ts von den globalen Headern ausgenommen
// (dort stehen X-Frame-Options: DENY und frame-ancestors 'none').

const CONTENT_CSP = [
  "sandbox allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox",
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval' blob: data:",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "media-src data: blob:",
  "font-src data:",
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

function withShim(html: string): string {
  const head = html.match(/<head[^>]*>/i);
  if (head?.index !== undefined) {
    const at = head.index + head[0].length;
    return html.slice(0, at) + STORAGE_SHIM + html.slice(at);
  }
  const root = html.match(/<html[^>]*>/i);
  if (root?.index !== undefined) {
    const at = root.index + root[0].length;
    return html.slice(0, at) + STORAGE_SHIM + html.slice(at);
  }
  return STORAGE_SHIM + html;
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
  _request: NextRequest,
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

  const { data: file, error } = await createServiceClient()
    .storage.from(MATERIAL_BUCKET)
    .download(item.storage_path);
  if (error || !file) {
    console.error("[schulungsmaterial/inhalt] download:", error?.message);
    return plain("Die Datei kann im Moment nicht geladen werden.", 502);
  }

  const html = withShim(await file.text());

  // Als Strom senden (große Dateien mit eingebetteten Medien).
  const bytes = new TextEncoder().encode(html);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const CHUNK = 256 * 1024;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        controller.enqueue(bytes.subarray(i, i + CHUNK));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CONTENT_CSP,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "private, no-store",
    },
  });
}
