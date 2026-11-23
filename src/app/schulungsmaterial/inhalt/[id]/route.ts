import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/schulungen/server";
import { MATERIAL_BUCKET, vpsSlug } from "@/lib/material/shared";
import {
  ACCOUNT_MARK_HEAD,
  ACCOUNT_PLACEHOLDER,
  STORAGE_SHIM,
} from "@/lib/material/storageShim";
import { vpsMaterialUrl } from "@/lib/material/vps";
import { streamWithInsert } from "@/lib/material/htmlStream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Große Dateien brauchen bei langsamer Leitung länger als die Standardzeit.
export const maxDuration = 300;
// In Frankfurt ausführen: nah an den Schulen. Sonst läuft die Datei erst
// über den Atlantik und wieder zurück.
export const preferredRegion = "fra1";

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

/**
 * Skript und Kennzeichnung für ein Konto: Der Platzhalter wird durch die
 * Konto-Kennung ersetzt – jede ausgelieferte Kopie trägt ihre Herkunft in sich.
 */
function insertFor(userId: string): Uint8Array {
  const account = userId.replace(/-/g, "").toLowerCase();
  const safe = /^[0-9a-f]{32}$/.test(account) ? account : "";
  return new TextEncoder().encode(
    (STORAGE_SHIM + ACCOUNT_MARK_HEAD).split(ACCOUNT_PLACEHOLDER).join(safe)
  );
}

// Zwischenspeichern im Browser: Die Dateien sind groß (zig MB), jeder Abruf
// kostet Datenvolumen im Speicher-Kontingent. „no-cache" heißt: Der Browser
// darf seine Kopie behalten, muss aber vor JEDER Anzeige hier nachfragen –
// Anmeldung und Freischaltung werden also weiterhin jedes Mal geprüft; nur
// wenn beides stimmt, antworten wir mit 304 statt die Datei neu zu laden.
// Eine hochgeladene Datei ändert sich nie (neuer Upload = neuer Eintrag),
// deshalb genügen Eintrags-ID und Konto als Kennung. CONTENT_VERSION erhöhen, wenn
// sich der eingefügte Speicher-Ersatz ändert.
const CONTENT_VERSION = 6;
const CACHE_CONTROL = "private, no-cache";

function etagFor(id: string, userId: string): string {
  // Mit Konto: Die Datei trägt dessen Kennung.
  return `"${id.toLowerCase()}-${userId.slice(0, 8)}-${CONTENT_VERSION}"`;
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

  // Nur eingebettet in unsere eigene Seite: Der Browser nennt Ziel und Herkunft
  // jeder Anfrage. Wer die Adresse direkt öffnet (Adresszeile, neuer Tab,
  // „Link speichern") oder von einer fremden Seite einbettet, bekommt nichts.
  // Alte Browser ohne diese Angaben werden nicht ausgesperrt.
  const dest = request.headers.get("sec-fetch-dest");
  const site = request.headers.get("sec-fetch-site");
  if ((dest !== null && dest !== "iframe") || (site !== null && site !== "same-origin")) {
    return plain("Dieses Material lässt sich nur über die DigiKI-Seite ansehen.", 403);
  }

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

  // Material auf dem eigenen Server (in Einheiten aufgeteilt, wird je Einheit
  // geladen): dorthin weiterleiten. Der Link gilt nur für dieses Konto und
  // läuft ab, siehe vps.ts.
  const slug = vpsSlug(item.storage_path);
  if (slug) {
    const url = await vpsMaterialUrl(slug, user.id);
    if (!url) return plain("Die Datei kann im Moment nicht geladen werden.", 502);
    return new Response(null, {
      status: 302,
      headers: { Location: url, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
    });
  }

  const etag = etagFor(id, user.id);
  if (etagMatches(request.headers.get("if-none-match"), etag)) {
    return new Response(null, { status: 304, headers: contentHeaders(etag) });
  }

  // Direkt aus dem Speicher durchreichen (kurzlebiger Link, verlässt den
  // Server nicht) – nicht erst vollständig laden: Der Browser beginnt sofort
  // mit der Anzeige.
  const { data: signed, error } = await createServiceClient()
    .storage.from(MATERIAL_BUCKET)
    .createSignedUrl(item.storage_path, 60);
  const upstream = signed?.signedUrl
    ? await fetch(signed.signedUrl, { cache: "no-store" }).catch(() => null)
    : null;
  if (!upstream?.ok || !upstream.body) {
    console.error(
      "[schulungsmaterial/inhalt] download:",
      error?.message ?? `Status ${upstream?.status ?? "–"}`
    );
    return plain("Die Datei kann im Moment nicht geladen werden.", 502);
  }

  const stream = streamWithInsert(upstream.body, insertFor(user.id));

  return new Response(stream, {
    headers: { "Content-Type": "text/html; charset=utf-8", ...contentHeaders(etag) },
  });
}
