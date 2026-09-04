import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";
import { extractContactNames } from "@/lib/contact-name";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function buildEmailHtml(params: {
  greeting: string;
  oldEmail: string;
  newEmail: string;
}): string {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#F5F9F9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background-color:#F5F9F9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:560px;width:100%;">
          <tr>
            <td align="center"
              style="background-color:#006363;padding:28px 32px 24px;border-radius:12px 12px 0 0;">
              <img src="https://www.digiki-os.de/images/logos/DigiKI_Logo_v5.png"
                alt="DigiKI" width="120" height="40"
                style="display:block;height:40px;width:auto;max-width:120px;background-color:#ffffff;border-radius:6px;padding:4px 8px;" />
            </td>
          </tr>
          <tr><td style="height:4px;background:linear-gradient(90deg,#006363 0%,#00cabe 100%);"></td></tr>
          <tr>
            <td style="background-color:#ffffff;padding:36px 32px;
              border-left:1px solid #DEE8E8;border-right:1px solid #DEE8E8;">
              <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:bold;color:#006363;">
                Ihre Login-E-Mail wurde geändert
              </h1>
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">${params.greeting}</p>
              <p style="margin:0 0 24px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                Ihre Login-E-Mail für DigiKI wurde soeben durch das
                <strong>DigiKI-Admin-Team</strong> aktualisiert. Ab sofort melden Sie sich mit
                der neuen Adresse an – Ihr bisheriges Passwort bleibt unverändert gültig.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-radius:10px;margin:0 0 28px 0;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 4px 0;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:1.5px;font-weight:bold;">
                      Bisherige Adresse
                    </p>
                    <p style="margin:0 0 14px 0;font-size:14px;color:#888888;font-family:Consolas,Courier New,monospace;text-decoration:line-through;">
                      ${params.oldEmail}
                    </p>
                    <p style="margin:0 0 14px 0;color:#00cabe;font-size:18px;font-weight:bold;letter-spacing:2px;line-height:1;">↓</p>
                    <p style="margin:0 0 4px 0;font-size:11px;color:#006363;text-transform:uppercase;letter-spacing:1.5px;font-weight:bold;">
                      Neue Login-Adresse
                    </p>
                    <p style="margin:0;font-size:15px;color:#006363;font-weight:bold;font-family:Consolas,Courier New,monospace;">
                      ${params.newEmail}
                    </p>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px 0;">
                <tr>
                  <td style="border-radius:8px;background-color:#E8A838;">
                    <a href="https://www.digiki-os.de/best-practice/login"
                      style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
                      Jetzt anmelden
                    </a>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #006363;border-radius:0 6px 6px 0;margin-bottom:20px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:13px;color:#555555;line-height:1.6;">
                      Diese Änderung wurde meist vorgenommen, weil Ihre bisherige
                      E-Mail-Adresse keine automatisierten Mails empfangen konnte
                      (z.&nbsp;B. schul-interne Postfächer wie <em>@*.nibis.de</em>).
                      Sie müssen nichts weiter tun.
                    </p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#FFF8E7;border:1px solid #F3D98A;border-radius:8px;margin-bottom:20px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-size:13px;font-weight:bold;color:#8B6200;">
                      &#9888; War das nicht von Ihnen angefragt?
                    </p>
                    <p style="margin:0;font-size:13px;color:#555555;line-height:1.6;">
                      Wenn Sie diese Änderung nicht veranlasst haben, melden Sie sich bitte
                      umgehend über das
                      <a href="https://digiki-os.de/#kontakt" style="color:#006363;">Kontaktformular</a>
                      der DigiKI-Website, damit der Zugang gesichert werden kann.
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
          <tr>
            <td style="background-color:#F5F9F9;padding:20px 32px;
              border:1px solid #DEE8E8;border-top:none;border-radius:0 0 12px 12px;">
              <p style="margin:0;font-size:11px;color:#999999;line-height:1.6;text-align:center;">
                Diese E-Mail wurde automatisch versendet – bitte nicht antworten.<br />
                DigiKI – Digitalisierung &amp; Künstliche Intelligenz an Grundschulen Osnabrück<br />
                DigiKI-Team · Stadt Osnabrück, Fachbereich 40-3 Bildung ·
                <a href="https://digiki-os.de/#kontakt" style="color:#006363;text-decoration:none;">Kontaktformular</a>
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

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Require authenticated admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role?.toLowerCase() !== "admin") {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  // Parse + validate body
  let body: { userId?: unknown; newEmail?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, newEmail } = body;
  if (
    typeof userId !== "string" ||
    typeof newEmail !== "string" ||
    !userId.trim() ||
    !newEmail.trim()
  ) {
    return NextResponse.json({ error: "Fehlende Felder" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail) || newEmail.length > 200) {
    return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 });
  }

  if (/\.nibis\.de\s*$/i.test(newEmail)) {
    return NextResponse.json(
      {
        error:
          "NIBIS-Adressen können keine Bestätigungsmails empfangen. Bitte eine andere E-Mail-Adresse wählen.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Alte Adresse + Name für die Info-Mail vor dem Update abgreifen
  const { data: targetUserData } = await admin.auth.admin.getUserById(userId);
  const oldEmail = targetUserData?.user?.email ?? "";
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();
  const fullName = targetProfile?.full_name ?? "";

  // Admin-triggered change: direkt als verifiziert markieren,
  // weil der Admin die neue Adresse extern (Telefon/Rücksprache) bestätigt hat.
  // So vermeiden wir das Zustellproblem bei NIBIS-blockierten Alt-Adressen.
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: true,
  });

  if (authError) {
    console.error("[change-user-email] auth update:", authError.message);
    return NextResponse.json(
      { error: authError.message || "Aktualisierung fehlgeschlagen" },
      { status: 500 }
    );
  }

  // Keep bestandsaufnahme_responses contact_email in sync for records belonging to this user
  await admin
    .from("bestandsaufnahme_responses")
    .update({ contact_email: newEmail, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  // Info-Mail an die neue Adresse versenden (falls SMTP konfiguriert ist)
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  ) {
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

      // full_name kann „Name, Funktion" (ggf. mehrere Personen) sein – für die
      // Anrede nur die Namen verwenden (Funktionen entfernt).
      const contactName = extractContactNames(fullName);
      const greeting = contactName
        ? `Guten Tag ${escapeHtml(contactName.slice(0, 100))},`
        : "Guten Tag,";
      const html = buildEmailHtml({
        greeting,
        oldEmail: escapeHtml(oldEmail.slice(0, 200)),
        newEmail: escapeHtml(newEmail.slice(0, 200)),
      });
      const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

      await transporter.sendMail({
        from: `DigiKI <${from}>`,
        to: newEmail,
        subject: "Ihre Login-E-Mail für DigiKI wurde geändert",
        html,
      });
    } catch (mailErr) {
      console.error("[change-user-email] info mail failed:", mailErr);
      // Mail-Versagen darf den Erfolg nicht blockieren – Account ist ja bereits aktualisiert.
    }
  }

  return NextResponse.json({ ok: true });
}
