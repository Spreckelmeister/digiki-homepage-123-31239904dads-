import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Simple in-memory rate limiting
const rateMap = new Map<string, number>();

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { type, email, school_name, contact_person } = body;

    // Validate required fields
    if (
      !type ||
      typeof email !== "string" ||
      typeof school_name !== "string" ||
      ![
        "student_assistant",
        "tool_license",
      ].includes(type) ||
      (contact_person !== undefined &&
        contact_person !== null &&
        typeof contact_person !== "string")
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
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://digiki-os.de";

    const greeting = contact_person
      ? `Guten Tag ${escapeHtml(String(contact_person).slice(0, 100))},`
      : "Guten Tag,";

    const html = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#F5F9F9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background-color:#F5F9F9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:560px;width:100%;">
          <!-- Logo-Header -->
          <tr>
            <td align="center"
              style="background-color:#006363;padding:28px 32px 24px;border-radius:12px 12px 0 0;">
              <span style="font-size:26px;font-weight:bold;letter-spacing:-0.5px;color:#ffffff;">Digi</span><span
                style="font-size:26px;font-weight:bold;letter-spacing:-0.5px;color:#00cabe;">KI</span>
              <span style="margin-left:10px;font-size:12px;color:rgba(255,255,255,0.7);">Grundschulen Osnabrück</span>
            </td>
          </tr>
          <!-- Farbbalken -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#006363 0%,#00cabe 100%);"></td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 32px;
              border-left:1px solid #DEE8E8;border-right:1px solid #DEE8E8;">
              <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:bold;color:#006363;">
                Bestätigung Ihres Antrags
              </h1>
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;">${greeting}</p>
              <p style="margin:0 0 24px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                Ihr Antrag auf <strong>${antragTyp}</strong> für
                <strong>${escapeHtml(String(school_name).slice(0, 200))}</strong> ist erfolgreich bei uns eingegangen.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #006363;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-weight:bold;color:#006363;font-size:14px;">Wie geht es weiter?</p>
                    <p style="margin:0;color:#555555;font-size:14px;line-height:1.5;">
                      Wir prüfen Ihren Antrag sorgfältig und melden uns zeitnah bei Ihnen.
                      Bei Fragen können Sie sich jederzeit per E-Mail an uns wenden.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                Den aktuellen Bearbeitungsstatus können Sie jederzeit in unserer
                <a href="${siteUrl}/best-practice/datenbank" style="color:#006363;">Best-Practice-Datenbank</a>
                unter dem Abschnitt <em>„Meine Einreichungen"</em> mit Ihrer E-Mail-Adresse abrufen.
              </p>

              <p style="margin:0;color:#1A1A1A;font-size:15px;">
                Mit freundlichen Grüßen<br />
                <strong>Das DigiKI-Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#F5F9F9;padding:20px 32px;
              border:1px solid #DEE8E8;border-top:none;
              border-radius:0 0 12px 12px;">
              <p style="margin:0;font-size:11px;color:#999999;line-height:1.6;text-align:center;">
                Diese E-Mail wurde automatisch versendet – bitte nicht antworten.<br />
                DigiKI – Digitalisierung &amp; Künstliche Intelligenz an Grundschulen Osnabrück<br />
                Kai Krafft · Bildungskoordinator im Fachbereich 40-3 Bildung, Stadt Osnabrück ·
                <a href="mailto:krafft@osnabrueck.de" style="color:#006363;text-decoration:none;">krafft@osnabrueck.de</a>
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
    return NextResponse.json({ ok: false, error: true }, { status: 500 });
  }
}
