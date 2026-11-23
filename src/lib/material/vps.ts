import { createHmac } from "node:crypto";
import { createServiceClient } from "@/lib/schulungen/server";

// HTML-Material auf dem eigenen Server (scripts/material-vps).
//
// Der Server liefert die Dateien ohne Anmeldung aus – geschützt durch einen
// Ordnernamen, den man nicht erraten kann und der täglich wechselt:
//   https://<host>/<kennung>/index.html
// Die Kennung ist HMAC-SHA256(Schlüssel, "<ordner>\n<JJJJ-MM-TT>") (UTC),
// die ersten 40 Hex-Zeichen. Der Server legt dieselben Kennungen stündlich
// als Verweise an (gestern, heute, morgen) und räumt ältere ab. Ein
// weitergegebener Link ist damit nach spätestens zwei Tagen wertlos.
// Den Link bekommt nur, wer hier angemeldet ist und das Material sehen darf.

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

/** Link auf die Startseite eines Materials – oder null, wenn der Schlüssel fehlt. */
export async function vpsMaterialUrl(
  slug: string,
  now: Date = new Date()
): Promise<string | null> {
  const secret = await hostSecret();
  if (!secret) return null;
  const day = now.toISOString().slice(0, 10);
  const token = createHmac("sha256", secret)
    .update(`${slug}\n${day}`)
    .digest("hex")
    .slice(0, 40);
  return `${MATERIAL_HOST_URL}/${token}/index.html`;
}
