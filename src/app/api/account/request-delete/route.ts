import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import nodemailer from "nodemailer";
import { createDeletionToken } from "@/lib/deletionToken";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Rate-Limit: max 1 Löschanfrage pro 60 Sekunden pro User-ID.
// Verhindert Missbrauch, wenn jemand anderes kurz Sessionzugang hatte.
const rateMap = new Map<string, number>();

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const now = Date.now();
  const lastSent = rateMap.get(user.id) ?? 0;
  if (now - lastSent < 60_000) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (rateMap.size >= 5000) rateMap.clear();
  rateMap.set(user.id, now);

  let body: { password?: unknown; deleteBestPractices?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { password, deleteBestPractices } = body;
  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "Passwort fehlt" }, { status: 400 });
  }
  const shouldDeleteBP = deleteBestPractices === true;

  // Passwort serverseitig verifizieren (separater Anon-Client, damit die
  // bestehende Session unberührt bleibt).
  const verifier = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error: pwError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (pwError) {
    return NextResponse.json(
      { error: "Passwort ist nicht korrekt." },
      { status: 401 }
    );
  }

  // Token erzeugen und per Mail versenden – noch KEIN Löschen.
  const token = createDeletionToken(user.id, user.email, shouldDeleteBP);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://digiki-os.de";
  const confirmUrl = `${siteUrl}/api/account/confirm-delete?token=${encodeURIComponent(token)}`;

  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD
  ) {
    console.error("[account/request-delete] SMTP not configured");
    return NextResponse.json(
      { error: "Mailversand ist aktuell nicht möglich. Bitte später erneut versuchen." },
      { status: 500 }
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const emailSafe = escapeHtml(user.email);
    const confirmUrlSafe = escapeHtml(confirmUrl);
    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

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
              <img src="https://digiki-os.de/images/logos/DigiKI_Logo_v5.png"
                alt="DigiKI – Grundschulen Osnabrück"
                width="160" height="73"
                style="display:block;border:0;" />
            </td>
          </tr>
          <!-- Farbbalken (rot = Warn-Kontext) -->
          <tr>
            <td style="height:4px;background-color:#B91C1C;"></td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 32px;
              border-left:1px solid #DEE8E8;border-right:1px solid #DEE8E8;">
              <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:bold;color:#006363;">
                Bitte bestätigen Sie die Löschung Ihres Kontos
              </h1>
              <p style="margin:0 0 24px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                Sie haben soeben die Löschung Ihres DigiKI-Zugangs
                (<strong>${emailSafe}</strong>) angefordert. Bevor wir Ihr Konto
                endgültig entfernen, benötigen wir eine Bestätigung von dieser
                E-Mail-Adresse.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #B91C1C;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px 0;font-weight:bold;color:#006363;font-size:15px;">
                      Konto endgültig löschen
                    </p>
                    <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:14px;line-height:1.5;">
                      Nach einem Klick auf den folgenden Link werden Ihr Zugang,
                      Ihr Profil, Ihre Bestandsaufnahmen und alle eingereichten
                      Anträge unwiderruflich aus unserem System entfernt. Der
                      Link ist <strong>24 Stunden</strong> gültig.
                    </p>
                    <p style="margin:0 0 10px 0;">
                      <a href="${confirmUrlSafe}"
                        style="display:inline-block;background-color:#B91C1C;color:#ffffff;
                          text-decoration:none;font-weight:bold;font-size:15px;
                          padding:12px 22px;border-radius:8px;">
                        Löschung bestätigen
                      </a>
                    </p>
                    <p style="margin:0;color:#555555;font-size:12px;line-height:1.5;">
                      Der Link funktioniert nicht?
                      <a href="${confirmUrlSafe}"
                        style="color:#006363;word-break:break-all;">${confirmUrlSafe}</a>
                    </p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #006363;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-weight:bold;color:#006363;font-size:14px;">
                      Sie haben das nicht angefordert?
                    </p>
                    <p style="margin:0;color:#555555;font-size:14px;line-height:1.5;">
                      Ignorieren Sie diese E-Mail einfach. Ohne Klick auf den
                      Link geschieht nichts – Ihr Konto bleibt bestehen. Zur
                      Sicherheit empfehlen wir, Ihr Passwort zu ändern.
                    </p>
                  </td>
                </tr>
              </table>

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

    await transporter.sendMail({
      from: `DigiKI <${from}>`,
      to: user.email,
      subject: "Konto-Löschung bestätigen – DigiKI",
      html,
    });
  } catch (emailErr) {
    console.error("[account/request-delete] Email error:", emailErr);
    return NextResponse.json(
      { error: "Bestätigungsmail konnte nicht versendet werden. Bitte später erneut versuchen." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, email: user.email });
}
