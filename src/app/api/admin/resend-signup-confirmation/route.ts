import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";

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

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  // Admin-Auth
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

  // Body
  let body: { userId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { userId } = body;
  if (typeof userId !== "string" || !userId.trim()) {
    return NextResponse.json({ error: "Fehlende Felder" }, { status: 400 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Zielnutzer abfragen
  const { data: userData, error: userError } =
    await admin.auth.admin.getUserById(userId);
  if (userError || !userData?.user) {
    return NextResponse.json(
      { error: "Benutzer nicht gefunden" },
      { status: 404 },
    );
  }

  const targetEmail = userData.user.email;
  if (!targetEmail) {
    return NextResponse.json(
      { error: "Benutzer hat keine E-Mail-Adresse" },
      { status: 400 },
    );
  }

  if (userData.user.email_confirmed_at) {
    return NextResponse.json(
      { error: "E-Mail bereits bestätigt" },
      { status: 400 },
    );
  }

  // Begrüßungsdaten aus dem Profil
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("full_name, school")
    .eq("id", userId)
    .single();
  const fullName = targetProfile?.full_name ?? "";
  const schoolName = targetProfile?.school ?? "";

  // Magic-Link erzeugen. Beim Klick wird der User eingeloggt UND die E-Mail
  // als bestätigt markiert – das ersetzt also die ursprüngliche Signup-
  // Bestätigung. Vorteil gegenüber type:"signup": funktioniert ohne dass
  // wir das Klartext-Passwort des Users kennen müssen.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://digiki-os.de";
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: targetEmail,
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=/best-practice/datenbank`,
      },
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error(
      "[resend-signup-confirmation] generateLink error:",
      linkError?.message,
    );
    return NextResponse.json(
      { error: "Bestätigungs-Link konnte nicht erzeugt werden" },
      { status: 500 },
    );
  }

  // WICHTIG: NICHT `action_link` verwenden – Supabase's eingebaute
  // Verify-Route würde nach Erfolg zur "Site URL" (Startseite) zurück-
  // redirecten, wenn unsere redirectTo nicht in der Allowlist steht.
  // Stattdessen bauen wir die URL zu unserer eigenen Callback-Route,
  // die token_hash + type direkt verifiziert.
  const tokenHash = linkData.properties.hashed_token;
  const nextPath = "/best-practice/datenbank";
  const confirmationUrl =
    `${siteUrl}/auth/callback` +
    `?token_hash=${encodeURIComponent(tokenHash)}` +
    `&type=magiclink` +
    `&next=${encodeURIComponent(nextPath)}`;
  const otpCode = linkData.properties.email_otp ?? "";

  // SMTP-Konfiguration prüfen
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD
  ) {
    return NextResponse.json(
      { error: "Mail-Versand ist serverseitig nicht konfiguriert" },
      { status: 500 },
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

    const greeting = fullName
      ? `Guten Tag ${escapeHtml(fullName.slice(0, 100))},`
      : "Guten Tag,";
    const schoolSafe = escapeHtml(schoolName.slice(0, 200));
    const emailSafe = escapeHtml(targetEmail);
    const confirmationUrlSafe = escapeHtml(confirmationUrl);
    const otpCodeSafe = escapeHtml(otpCode);
    const codeEinloesenUrl = `${siteUrl}/best-practice/code-einloesen?type=signup`;
    const codeEinloesenUrlSafe = escapeHtml(codeEinloesenUrl);
    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

    const codeAlternativeHtml = otpCode
      ? `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#FFF8E7;border:1px solid #F3D98A;border-radius:8px;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px 0;font-weight:bold;color:#8B6200;font-size:14px;">
                      Der Button funktioniert nicht?
                    </p>
                    <p style="margin:0 0 12px 0;color:#1A1A1A;font-size:14px;line-height:1.5;">
                      Manche Schul- oder Firmen-Netzwerke scannen E-Mail-Links
                      automatisch und machen sie dadurch ungültig. Sie können
                      Ihren Zugang stattdessen mit diesem Code bestätigen:
                    </p>
                    <p style="margin:0 0 12px 0;font-size:24px;font-weight:bold;letter-spacing:6px;
                              color:#006363;font-family:Consolas,Courier New,monospace;text-align:center;
                              background-color:#ffffff;border:1px solid #F3D98A;border-radius:6px;padding:12px 8px;">
                      ${otpCodeSafe}
                    </p>
                    <p style="margin:0;color:#555555;font-size:13px;line-height:1.6;">
                      Code eingeben unter:<br />
                      <a href="${codeEinloesenUrlSafe}" style="color:#006363;font-weight:bold;">
                        digiki-os.de/best-practice/code-einloesen
                      </a>
                    </p>
                  </td>
                </tr>
              </table>`
      : "";

    const schoolPhrase = schoolName
      ? ` für <strong>${schoolSafe}</strong>`
      : "";

    // Freundliche Einleitung, die erklärt, WARUM diese Mail kommt – kein
    // anonymes „erneut zugesandt", sondern eine persönliche Notiz, dass uns
    // das Fehlen der Bestätigung aufgefallen ist.
    const introBlock = `
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                bei der Übersicht der eingegangenen Bestandsaufnahmen ist uns aufgefallen,
                dass Sie das Bestätigungs-Fenster für Ihren DigiKI-Zugang${schoolPhrase}
                bisher noch nicht erreicht haben. Vermutlich ist die erste Bestätigungs-Mail
                in einem Spam-Filter gelandet oder im Schul-Alltag untergegangen.
              </p>
              <p style="margin:0 0 20px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                Damit Sie nichts verpassen, senden wir Ihnen den Bestätigungs-Link
                gerne ein zweites Mal zu – unten finden Sie zusätzlich einen
                8-stelligen Code für den Fall, dass Ihr Schul-Netzwerk Links blockiert.
              </p>`;

    // Sichtbarer 24h-Hinweis als eigene Callout-Box – nutzt die ruhige
    // Türkis-Familie aus dem Designsystem, damit der Hinweis informativ
    // statt warnend wirkt.
    const validityCallout = `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#EBF8F7;border:1px solid #B6E1DD;border-radius:8px;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;color:#006363;font-size:13px;line-height:1.6;">
                      <strong style="letter-spacing:0.5px;">Bitte zeitnah bestätigen:</strong>
                      Aus Sicherheitsgründen sind der Bestätigungs-Link <em>und</em> der
                      8-stellige Code nur <strong>24 Stunden lang gültig</strong>.
                      Danach erlischt beides – melden Sie sich in diesem Fall einfach
                      kurz bei uns, wir senden Ihnen dann gerne eine neue Bestätigung.
                    </p>
                  </td>
                </tr>
              </table>`;

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
          <tr>
            <td align="center"
              style="background-color:#006363;padding:28px 32px 24px;border-radius:12px 12px 0 0;">
              <img src="https://digiki-os.de/images/logos/DigiKI_Logo_v5.png"
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
              border-left:1px solid #DEE8E8;border-right:1px solid #DEE8E8;">
              <p style="margin:0 0 4px 0;font-size:11px;font-weight:bold;letter-spacing:3px;
                        text-transform:uppercase;color:#AB7A0E;">
                Erinnerung
              </p>
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:bold;color:#006363;line-height:1.3;">
                Ihr DigiKI-Zugang wartet noch auf Sie
              </h1>
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;">${greeting}</p>
              ${introBlock}
              ${validityCallout}

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #AB7A0E;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px 0;font-weight:bold;color:#006363;font-size:15px;">
                      E-Mail-Adresse bestätigen
                    </p>
                    <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:14px;line-height:1.5;">
                      Klicken Sie einmal auf den Button, um Ihre Adresse zu
                      bestätigen und sich direkt anzumelden.
                    </p>
                    <p style="margin:0 0 10px 0;">
                      <a href="${confirmationUrlSafe}"
                        style="display:inline-block;background-color:#006363;color:#ffffff;
                          text-decoration:none;font-weight:bold;font-size:15px;
                          padding:12px 22px;border-radius:8px;">
                        Zugang bestätigen
                      </a>
                    </p>
                    <p style="margin:0;color:#555555;font-size:12px;line-height:1.5;">
                      Der Link funktioniert nicht?
                      <a href="${confirmationUrlSafe}"
                        style="color:#006363;word-break:break-all;">${confirmationUrlSafe}</a>
                    </p>
                  </td>
                </tr>
              </table>
${codeAlternativeHtml}
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #006363;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-weight:bold;color:#006363;font-size:14px;">
                      Ihre Login-E-Mail
                    </p>
                    <p style="margin:0;color:#555555;font-size:14px;line-height:1.5;">
                      <strong>${emailSafe}</strong>
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
      to: targetEmail,
      subject: "Bitte E-Mail bestätigen – DigiKI (erneute Zustellung)",
      html,
    });
  } catch (emailErr) {
    console.error(
      "[resend-signup-confirmation] mail error:",
      emailErr,
    );
    return NextResponse.json(
      { error: "Mail-Versand fehlgeschlagen" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, email: targetEmail });
}
