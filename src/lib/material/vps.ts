import { createHmac } from "node:crypto";
import { createServiceClient } from "@/lib/schulungen/server";

// HTML-Material auf dem eigenen Server (scripts/material-vps).
//
// Der Server liefert eine Datei nur über einen Link aus, der für genau ein
// Konto ausgestellt ist und abläuft:
//   https://<host>/k/<ordner>/<konto>-<ablauf>-<signatur>/index.html
// signatur = HMAC-SHA256(Schlüssel, "<ordner>\n<konto>\n<ablauf>"), die
// ersten 40 Hex-Zeichen. Der Server prüft jeden Abruf, schreibt ihn mit dem
// Konto ins Protokoll und liefert nur in einen Rahmen aus (nicht beim
// direkten Öffnen der Adresse). Ein weitergegebener Link führt damit zum
// Konto zurück. Den Link bekommt nur, wer hier angemeldet ist und das
// Material sehen darf.

/** Adresse des Material-Servers (ohne Schrägstrich am Ende). */
export const MATERIAL_HOST_URL = (
  process.env.MATERIAL_HOST_URL || "https://material.digiki-os.de"
).replace(/\/+$/, "");

/** Schlüssel in `app_settings`, falls die Umgebungsvariable nicht gesetzt ist. */
const SECRET_SETTING = "material_host_secret";

let cachedSecret: { value: string; at: number } | null = null;

/**
 * Schlüssel des Material-Servers: Umgebungsvariable MATERIAL_HOST_SECRET,
 * sonst die Zeile „material_host_secret" in app_settings (lesbar nur für
 * Admins und den Server). Der Datenbank-Wert wird fünf Minuten gemerkt.
 */
async function hostSecret(): Promise<string | null> {
  const fromEnv = process.env.MATERIAL_HOST_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (cachedSecret && Date.now() - cachedSecret.at < 5 * 60 * 1000) {
    return cachedSecret.value;
  }
  const { data, error } = await createServiceClient()
    .from("app_settings")
    .select("value")
    .eq("key", SECRET_SETTING)
    .maybeSingle();
  const value = typeof data?.value === "string" ? data.value.trim() : "";
  if (error || !value) {
    console.error("[material/vps] Schlüssel fehlt:", error?.message ?? "nicht hinterlegt");
    return null;
  }
  cachedSecret = { value, at: Date.now() };
  return value;
}

/**
 * Ablauf des Links: 06:00 UTC am Folgetag. So bleibt die Adresse für ein Konto
 * den Tag über gleich (der Browser kann geladene Einheiten wiederverwenden)
 * und gilt zwischen 6 und 30 Stunden.
 */
function linkExpiry(now: Date): number {
  const nextMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
  return Math.floor(nextMidnight / 1000) + 6 * 3600;
}

/**
 * Link auf die Startseite eines Materials für ein Konto – oder null, wenn
 * der Schlüssel fehlt oder die Konto-ID nicht die erwartete Form hat.
 */
export async function vpsMaterialUrl(
  slug: string,
  userId: string,
  now: Date = new Date()
): Promise<string | null> {
  const account = userId.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(account)) return null;
  const secret = await hostSecret();
  if (!secret) return null;
  const expiry = linkExpiry(now);
  const signature = createHmac("sha256", secret)
    .update(`${slug}\n${account}\n${expiry}`)
    .digest("hex")
    .slice(0, 40);
  return `${MATERIAL_HOST_URL}/k/${slug}/${account}-${expiry}-${signature}/index.html`;
}
