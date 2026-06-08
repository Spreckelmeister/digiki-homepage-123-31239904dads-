/**
 * Standard-HTML-Hülle für alle DigiKI-Mailings.
 *
 * Identische visuelle Sprache wie unsere transaktionalen Mails
 * (Passwort-Reset, Account-Bestätigung): türkis Header mit Logo,
 * goldener Gradient-Trennstrich, weiße Inhaltsfläche, dezenter Footer.
 *
 * Der Body wird als Roh-HTML eingebettet – die Admin-Oberfläche prüft
 * deren Inhalt; hier findet KEINE Sanitization statt, weil das Tool nur
 * Admins zugänglich ist und sie HTML mit voller Kontrolle einfügen
 * können sollen (Tabellen, Inline-Styles, eigene Buttons usw.).
 *
 * Eyebrow + Heading sind optional – wenn beide leer sind, beginnt der
 * Inhaltsbereich direkt mit dem übergebenen Body.
 */
export interface WrapMailingOptions {
  bodyHtml: string;
  /** Kleiner, gesperrter Vor-Titel über der H1 (z.B. „Update"). */
  eyebrow?: string;
  /** H1 oberhalb des Bodys – in DigiKI-Türkis gerendert. */
  heading?: string;
  /** Versteckter Pre-Header-Text (sichtbar in der Mail-Vorschauliste). */
  preheader?: string;
}

const LOGO_URL = "https://digiki-os.de/images/logos/DigiKI_Logo_v5.png";
const FOOTER_NAME = "DigiKI – Digitalisierung & Künstliche Intelligenz an Grundschulen Osnabrück";
const FOOTER_CONTACT_NAME = "Kai Krafft · Bildungskoordinator im Fachbereich 40-3 Bildung, Stadt Osnabrück";
const FOOTER_EMAIL = "krafft@osnabrueck.de";

export function wrapMailing({
  bodyHtml,
  eyebrow,
  heading,
  preheader,
}: WrapMailingOptions): string {
  const preheaderBlock = preheader
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>`
    : "";

  const eyebrowBlock = eyebrow
    ? `<p style="margin:0 0 4px 0;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:#AB7A0E;">${eyebrow}</p>`
    : "";

  const headingBlock = heading
    ? `<h1 style="margin:0 0 20px 0;font-size:22px;font-weight:bold;color:#006363;line-height:1.3;">${heading}</h1>`
    : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#F5F9F9;font-family:Arial,Helvetica,sans-serif;">
  ${preheaderBlock}
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background-color:#F5F9F9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:560px;width:100%;">
          <tr>
            <td align="center"
              style="background-color:#006363;padding:28px 32px 24px;border-radius:12px 12px 0 0;">
              <img src="${LOGO_URL}"
                alt="DigiKI – Grundschulen Osnabrück"
                width="160" height="73"
                style="display:block;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#006363 0%,#00cabe 100%);"></td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:36px 32px;
              border-left:1px solid #DEE8E8;border-right:1px solid #DEE8E8;
              color:#1A1A1A;font-size:15px;line-height:1.6;">
              ${eyebrowBlock}
              ${headingBlock}
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:#F5F9F9;padding:20px 32px;
              border:1px solid #DEE8E8;border-top:none;
              border-radius:0 0 12px 12px;">
              <p style="margin:0;font-size:11px;color:#999999;line-height:1.6;text-align:center;">
                Diese E-Mail wurde im Rahmen des DigiKI-Projekts versendet.<br />
                ${FOOTER_NAME}<br />
                ${FOOTER_CONTACT_NAME} ·
                <a href="mailto:${FOOTER_EMAIL}" style="color:#006363;text-decoration:none;">${FOOTER_EMAIL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
