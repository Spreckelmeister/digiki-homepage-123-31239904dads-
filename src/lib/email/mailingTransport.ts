/**
 * SMTP-Transport NUR für das Admin-Mail-Tool (Rundmails an viele Empfänger).
 *
 * Bewusst getrennt von Resend (SMTP_*): Massenmails sollen das Resend-
 * Kontingent nicht aufbrauchen – Resend bleibt für Login-Codes und andere
 * transaktionale Mails, deren Zustellung man dort nachverfolgen kann.
 *
 * Nutzt denselben eigenen SMTP-Server wie die Klassenverteilung (KV_SMTP_*).
 * Ist der nicht konfiguriert, fällt das Tool auf Resend zurück.
 */

import nodemailer from "nodemailer";

export type MailingProvider = "eigener SMTP" | "Resend";

/** Nodemailer ≥ 10 exportiert keinen `Transporter`-Typ mehr. */
export type SmtpTransporter = ReturnType<typeof nodemailer.createTransport>;

/** Sichtbarer Absender der Rundmails – ohne eigenes Postfach. */
const MAILING_FROM = "noreply@digiki-os.de";

export function getMailingSmtp(): {
  provider: MailingProvider;
  transporter: SmtpTransporter;
  from: string;
  /** SMTP-Envelope-Absender (Bounces landen im echten Postfach). */
  envelopeFrom?: string;
} | null {
  if (
    process.env.KV_SMTP_HOST &&
    process.env.KV_SMTP_USER &&
    process.env.KV_SMTP_PASSWORD
  ) {
    return {
      provider: "eigener SMTP",
      // Gepoolte Verbindung: eine SMTP-Sitzung für alle Mails statt
      // Verbindungsaufbau pro Empfänger – schneller und schonender.
      transporter: nodemailer.createTransport({
        pool: true,
        maxConnections: 1,
        host: process.env.KV_SMTP_HOST,
        port: parseInt(process.env.KV_SMTP_PORT ?? "587"),
        secure: process.env.KV_SMTP_SECURE === "true",
        auth: {
          user: process.env.KV_SMTP_USER,
          pass: process.env.KV_SMTP_PASSWORD,
        },
      }),
      from: MAILING_FROM,
      envelopeFrom: process.env.KV_SMTP_USER,
    };
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return {
      provider: "Resend",
      transporter: nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      }),
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER!,
    };
  }

  return null;
}
