/**
 * Gemeinsamer Versand-Baustein für alle Auth-Code-Mails („Code statt Link").
 *
 * Grundsatz: Transaktionale Auth-Mails enthalten NIE Token-Links (die von
 * Schul-/Firmen-Mailscannern beim Vorab-Abruf verbrannt würden), sondern
 * einen Einmal-Code zum Abtippen plus einen normalen Seiten-Link ohne
 * Geheimnis. Visuelle Hülle: wrapMailing (identisch zu allen DigiKI-Mails).
 */

import nodemailer from "nodemailer";
import { wrapMailing } from "./wrapMailing";

/** Muss zur Supabase-Dashboard-Einstellung „Email OTP expiry" passen. */
export const OTP_VALIDITY_LABEL = "24 Stunden";
/** Muss zur Supabase-Dashboard-Einstellung „Email OTP length" (8) passen. */
export const OTP_LENGTH_LABEL = "8-stellig";

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://digiki-os.de").replace(
    /\/$/,
    ""
  );
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
  );
}

/** Der bisher 5-fach kopierte nodemailer-Transport (Resend-SMTP). */
export function createSmtpTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

/** Großer, gut abtippbarer Code-Kasten (Stil der bisherigen Code-Mails). */
export function renderCodeBlock(code: string): string {
  return `
              <p style="margin:0 0 16px 0;font-size:24px;font-weight:bold;letter-spacing:6px;
                        color:#006363;font-family:Consolas,Courier New,monospace;text-align:center;
                        background-color:#ffffff;border:2px solid #006363;border-radius:8px;padding:14px 8px;">
                ${escapeHtml(code)}
              </p>`;
}

/** Türkis-Rand-Infobox mit normalem Seiten-Link (kein Token, scanner-sicher). */
export function renderPlainLinkBox({
  label,
  url,
  urlText,
}: {
  label: string;
  url: string;
  urlText?: string;
}): string {
  const urlSafe = escapeHtml(url);
  const textSafe = escapeHtml(urlText ?? url.replace(/^https?:\/\/(www\.)?/, ""));
  return `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #006363;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-weight:bold;color:#006363;font-size:14px;">
                      ${escapeHtml(label)}
                    </p>
                    <p style="margin:0;color:#555555;font-size:14px;line-height:1.5;">
                      <a href="${urlSafe}" style="color:#006363;font-weight:bold;">${textSafe}</a>
                    </p>
                  </td>
                </tr>
              </table>`;
}

export interface SendAuthCodeMailOptions {
  to: string;
  subject: string;
  heading: string;
  eyebrow?: string;
  preheader?: string;
  /** Anrede + Einleitung (fertiges HTML; Werte vom Aufrufer escapen!). */
  introHtml: string;
  /** Satz direkt über dem Code-Kasten. */
  codeLeadHtml?: string;
  /** Der Einmal-Code. Ohne Code wird kein Code-Block gerendert. */
  code?: string;
  /** Gültigkeits-/Hinweiszeile unter dem Code (Default siehe unten). */
  validityHtml?: string;
  /** Normaler Seiten-Link (ohne Token) als Info-Box. */
  pageUrl?: string;
  pageLabel?: string;
  pageUrlText?: string;
  /** Zusätzliche Blöcke (z.B. „Ihre Login-E-Mail"-Box). */
  extraHtml?: string;
  /** Kleiner grauer Schlusshinweis (z.B. „nicht angefordert? ignorieren"). */
  footerNoteHtml?: string;
}

/** Baut und versendet eine Code-Mail. Wirft bei Transportfehlern. */
export async function sendAuthCodeMail(
  opts: SendAuthCodeMailOptions
): Promise<void> {
  const {
    to,
    subject,
    heading,
    eyebrow,
    preheader,
    introHtml,
    codeLeadHtml,
    code,
    validityHtml,
    pageUrl,
    pageLabel,
    pageUrlText,
    extraHtml,
    footerNoteHtml,
  } = opts;

  const codeSection = code
    ? `
              ${codeLeadHtml ? `<p style="margin:0 0 12px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">${codeLeadHtml}</p>` : ""}
              ${renderCodeBlock(code)}
              <p style="margin:0 0 24px 0;color:#555555;font-size:13px;line-height:1.6;">
                ${
                  validityHtml ??
                  `Der Code ist <strong>${OTP_VALIDITY_LABEL}</strong> gültig und nur einmal verwendbar. Es gilt immer der Code aus der neuesten E-Mail.`
                }
              </p>`
    : "";

  const linkSection = pageUrl
    ? renderPlainLinkBox({
        label: pageLabel ?? "Zur Seite",
        url: pageUrl,
        urlText: pageUrlText,
      })
    : "";

  const bodyHtml = `
              ${introHtml}
              ${codeSection}
              ${linkSection}
              ${extraHtml ?? ""}
              <p style="margin:0 0 ${footerNoteHtml ? "20px" : "0"} 0;color:#1A1A1A;font-size:15px;">
                Mit freundlichen Grüßen<br />
                <strong>Das DigiKI-Team</strong>
              </p>
              ${footerNoteHtml ? `<p style="margin:0;color:#999999;font-size:12px;line-height:1.6;">${footerNoteHtml}</p>` : ""}`;

  const html = wrapMailing({
    bodyHtml,
    eyebrow,
    heading,
    preheader,
  });

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  const transporter = createSmtpTransporter();
  await transporter.sendMail({
    from: `DigiKI <${from}>`,
    to,
    subject,
    html,
  });
}
