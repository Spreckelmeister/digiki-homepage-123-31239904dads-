import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Simple in-memory rate limiting
const rateMap = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, email, school_name, contact_person } = body;

    // Validate required fields
    if (
      !type ||
      typeof email !== "string" ||
      typeof school_name !== "string" ||
      !["student_assistant", "tool_license"].includes(type)
    ) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Basic email validation
    if (
      !email.includes("@") ||
      email.length > 200 ||
      email.length < 5
    ) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Rate limiting: max 1 email per 30s per IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const now = Date.now();
    const lastSent = rateMap.get(ip) ?? 0;
    if (now - lastSent < 30_000) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    if (rateMap.size >= 5000) rateMap.clear();
    rateMap.set(ip, now);

    // Skip silently if SMTP is not configured
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASSWORD
    ) {
      console.warn(
        "[send-confirmation] SMTP not configured – skipping email."
      );
      return NextResponse.json({ ok: true, skipped: true });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const isStudentApp = type === "student_assistant";
    const antragTyp = isStudentApp
      ? "studentische Hilfskräfte"
      : "Tool-Lizenzen";
    const subject = isStudentApp
      ? "Ihr Antrag auf studentische Hilfskräfte wurde eingereicht – DigiKI"
      : "Ihr Antrag auf Tool-Lizenzen wurde eingereicht – DigiKI";

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.digiki-osnabrueck.de";

    const greeting = contact_person
      ? `Guten Tag ${String(contact_person).slice(0, 100)},`
      : "Guten Tag,";

    const html = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a4a6e;padding:28px 32px;border-radius:10px 10px 0 0;">
              <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:bold;">
                DigiKI – Bestätigung Ihres Antrags
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
              <p style="margin:0 0 16px 0;color:#333;font-size:15px;">${greeting}</p>
              <p style="margin:0 0 16px 0;color:#333;font-size:15px;">
                Ihr Antrag auf <strong>${antragTyp}</strong> für
                <strong>${String(school_name).slice(0, 200)}</strong> ist erfolgreich bei uns eingegangen.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#e8f4f0;border-left:4px solid #2a8a6e;border-radius:4px;margin:24px 0;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 8px 0;font-weight:bold;color:#1a4a6e;font-size:14px;">Wie geht es weiter?</p>
                    <p style="margin:0;color:#555;font-size:14px;line-height:1.5;">
                      Wir prüfen Ihren Antrag sorgfältig und melden uns zeitnah bei Ihnen.
                      Bei Fragen können Sie sich jederzeit per E-Mail an uns wenden.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px 0;color:#333;font-size:15px;">
                Den aktuellen Bearbeitungsstatus können Sie jederzeit in unserer
                <a href="${siteUrl}/best-practice/datenbank" style="color:#1a4a6e;">Best-Practice-Datenbank</a>
                unter dem Abschnitt <em>„Meine Einreichungen"</em> mit Ihrer E-Mail-Adresse abrufen.
              </p>

              <p style="margin:0;color:#333;font-size:15px;">
                Mit freundlichen Grüßen<br />
                <strong>Das DigiKI-Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f4f6f8;padding:20px 32px;border-radius:0 0 10px 10px;border:1px solid #e0e0e0;border-top:none;">
              <p style="margin:0;font-size:12px;color:#888;line-height:1.5;">
                Diese E-Mail wurde automatisch versendet. Bitte antworten Sie nicht darauf.<br />
                DigiKI – Digitalisierung &amp; Künstliche Intelligenz an Grundschulen Osnabrück<br />
                Kai Krafft · Bildungskoordinator, Stadt Osnabrück ·
                <a href="mailto:krafft@osnabrueck.de" style="color:#888;">krafft@osnabrueck.de</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

    await transporter.sendMail({
      from: `DigiKI <${from}>`,
      to: email,
      subject,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-confirmation] Error:", err);
    // Don't expose error details; email is non-critical
    return NextResponse.json({ ok: true });
  }
}
