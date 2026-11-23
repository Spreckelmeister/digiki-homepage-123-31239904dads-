import { createHmac } from "node:crypto";

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

/** Link auf die Startseite eines Materials – oder null, wenn der Schlüssel fehlt. */
export function vpsMaterialUrl(slug: string, now: Date = new Date()): string | null {
  const secret = process.env.MATERIAL_HOST_SECRET?.trim();
  if (!secret) {
    console.error("[material/vps] MATERIAL_HOST_SECRET fehlt");
    return null;
  }
  const day = now.toISOString().slice(0, 10);
  const token = createHmac("sha256", secret)
    .update(`${slug}\n${day}`)
    .digest("hex")
    .slice(0, 40);
  return `${MATERIAL_HOST_URL}/${token}/index.html`;
}
