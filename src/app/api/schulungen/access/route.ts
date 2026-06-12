import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";
import type { AccessUser } from "@/lib/schulungen/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    .replace(/'/g, "&#39;");
}

/**
 * Zugriffsverwaltung des Schulungs-Dashboards (nur Admins).
 *
 * Schulungsteam-Mitglieder sind reine EINLADUNGS-Accounts: Sie haben KEINEN
 * normalen DigiKI-Account (kein Zugriff auf die Best-Practice-Datenbank) und
 * sollen auch nie einen bekommen. Der Admin trägt nur eine E-Mail ein; das
 * System legt den Account an und verschickt eine Einladungs-Mail mit einem
 * Link zum Passwort-Festlegen.
 */
export async function GET() {
  const auth = await requireSchulungenAccess({ adminOnly: true });
  if (!auth.ok) return auth.response;

  const admin = createServiceClient();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, full_name, school")
    .eq("role", "schulungsteam");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users: AccessUser[] = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      return {
        id: p.id,
        full_name: p.full_name,
        school: p.school,
        email: data?.user?.email ?? null,
      };
    })
  );

  return NextResponse.json({ users });
}

type AccessBody = {
  email?: unknown;
  action?: unknown; // "grant" (= einladen) | "revoke" (= entfernen)
};

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auth = await requireSchulungenAccess({ adminOnly: true });
  if (!auth.ok) return auth.response;

  let body: AccessBody;
  try {
    body = (await request.json()) as AccessBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const action = body.action === "grant" ? "grant" : body.action === "revoke" ? "revoke" : null;

  if (!email || !email.includes("@") || !action) {
    return NextResponse.json({ error: "Ungültige Parameter" }, { status: 400 });
  }

  const admin = createServiceClient();

  // Alle unerwarteten Fehler abfangen und die echte Meldung zurückgeben,
  // statt einem generischen „Internal Server Error".
  try {
    return action === "grant"
      ? await handleInvite(admin, email)
      : await handleRevoke(admin, email);
  } catch (err) {
    console.error("[schulungen/access] unhandled error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unerwarteter Fehler bei der Verarbeitung.",
      },
      { status: 500 }
    );
  }
}

/** Sucht einen Auth-User per E-Mail (seitenweise). */
async function findUserIdByEmail(
  admin: SupabaseClient,
  email: string
): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

/**
 * Lädt eine E-Mail als Schulungsmitglied ein: Account anlegen (Rolle
 * schulungsteam) + Einladungs-Mail mit Passwort-festlegen-Link. Bestehende
 * Accounts (DigiKI) werden abgelehnt.
 */
async function handleInvite(
  admin: SupabaseClient,
  email: string
): Promise<NextResponse> {
  // SMTP zuerst prüfen, damit kein Account ohne versendbare Einladung entsteht.
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD
  ) {
    return NextResponse.json(
      { error: "Mail-Versand ist serverseitig nicht konfiguriert" },
      { status: 500 }
    );
  }

  // Bereits ein Account mit dieser E-Mail? → ablehnen.
  let existing: string | null;
  try {
    existing = await findUserIdByEmail(admin, email);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Suche fehlgeschlagen" },
      { status: 500 }
    );
  }
  if (existing) {
    return NextResponse.json(
      {
        error:
          "Diese E-Mail-Adresse hat bereits einen DigiKI-Account und kann nicht als Schulungsmitglied eingeladen werden.",
      },
      { status: 409 }
    );
  }

  // Account anlegen (E-Mail gilt als bestätigt – Einladung durch Admin; ein
  // zufälliges Wegwerf-Passwort, das die Person über den Link sofort ersetzt).
  // WICHTIG: Das Passwort muss < 72 Zeichen bleiben (bcrypt-Limit) – sonst
  // antwortet GoTrue mit einem 500 „Internal Server Error". Web-Crypto mit
  // Math.random-Fallback (kein optionaler Node-Builtin-Import); ein einzelnes
  // UUID + Präfix sind ~40 Zeichen und enthalten Groß-/Klein-/Zahl/Sonderzeichen.
  const rand = () =>
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  const tempPassword = `Aa1!${rand()}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: tempPassword,
    user_metadata: { full_name: email },
  });
  if (createErr || !created?.user) {
    // Duplikat trotz Vorab-Prüfung (z. B. paginierte listUsers-Lücke) sauber
    // als 409 melden statt als generischer 500.
    const msg = createErr?.message?.toLowerCase() ?? "";
    if (
      msg.includes("already registered") ||
      msg.includes("already been registered") ||
      msg.includes("user already exists") ||
      msg.includes("already been used") ||
      msg.includes("duplicate key")
    ) {
      return NextResponse.json(
        {
          error:
            "Diese E-Mail-Adresse hat bereits einen DigiKI-Account und kann nicht als Schulungsmitglied eingeladen werden.",
        },
        { status: 409 }
      );
    }
    console.error("[schulungen/access] createUser error:", createErr?.message);
    return NextResponse.json(
      {
        error: `Account konnte nicht angelegt werden${
          createErr?.message ? `: ${createErr.message}` : ""
        }`,
      },
      { status: 500 }
    );
  }
  const userId = created.user.id;

  const rollback = async () => {
    try {
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
    } catch {
      /* Rollback-Fehler tolerierbar */
    }
  };

  // Profil mit Rolle schulungsteam (Service-Role umgeht protect_profile_role).
  const { error: profErr } = await admin.from("profiles").upsert(
    { id: userId, role: "schulungsteam", full_name: email, school: "" },
    { onConflict: "id" }
  );
  if (profErr) {
    await rollback();
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  // Recovery-Link zum Passwort-Festlegen.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  if (linkErr || !linkData?.properties?.hashed_token) {
    await rollback();
    return NextResponse.json(
      { error: "Einladungs-Link konnte nicht erzeugt werden" },
      { status: 500 }
    );
  }

  // Trailing-Slash entfernen, sonst „…de//auth/bestaetigen" (ungültig).
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://digiki-os.de").replace(/\/$/, "");
  const tokenHash = linkData.properties.hashed_token;
  const otpCode = linkData.properties.email_otp ?? "";
  // Passwort-Setzen läuft über das sichere Interstitial /auth/bestaetigen
  // (löst den Token nur per Klick ein) → danach /passwort-zuruecksetzen.
  const setPasswordUrl =
    `${siteUrl}/auth/bestaetigen` +
    `?token_hash=${encodeURIComponent(tokenHash)}` +
    `&type=recovery` +
    `&next=${encodeURIComponent("/best-practice/passwort-zuruecksetzen")}`;
  const codeUrl = `${siteUrl}/best-practice/code-einloesen?type=recovery`;
  const loginUrl = `${siteUrl}/best-practice/login`;

  try {
    await sendInviteMail({ to: email, setPasswordUrl, codeUrl, loginUrl, otpCode });
  } catch (mailErr) {
    await rollback();
    console.error("[schulungen/access] invite mail error:", mailErr);
    return NextResponse.json(
      { error: "Einladung konnte nicht versendet werden" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, action: "grant" });
}

/** Entfernt ein Schulungsmitglied vollständig (Account wird gelöscht). */
async function handleRevoke(
  admin: SupabaseClient,
  email: string
): Promise<NextResponse> {
  let userId: string | null;
  try {
    userId = await findUserIdByEmail(admin, email);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Suche fehlgeschlagen" },
      { status: 500 }
    );
  }
  if (!userId) {
    return NextResponse.json(
      { error: "Kein Zugang mit dieser E-Mail gefunden." },
      { status: 404 }
    );
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role === "admin") {
    return NextResponse.json(
      { error: "Admins können hier nicht entfernt werden." },
      { status: 409 }
    );
  }
  if (profile?.role !== "schulungsteam") {
    return NextResponse.json(
      { error: "Diese Person ist kein Schulungsmitglied." },
      { status: 409 }
    );
  }

  // Profil zuerst löschen (falls keine FK-Kaskade), dann den Auth-User.
  await admin.from("profiles").delete().eq("id", userId);
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action: "revoke" });
}

/** Versendet die gebrandete Einladungs-Mail per SMTP. */
async function sendInviteMail(args: {
  to: string;
  setPasswordUrl: string;
  codeUrl: string;
  loginUrl: string;
  otpCode: string;
}): Promise<void> {
  const { to, setPasswordUrl, codeUrl, loginUrl, otpCode } = args;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  const setPasswordSafe = escapeHtml(setPasswordUrl);
  const codeSafe = escapeHtml(codeUrl);
  const loginSafe = escapeHtml(loginUrl);
  const emailSafe = escapeHtml(to);
  const otpSafe = escapeHtml(otpCode);

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
                      stattdessen mit diesem Code fortfahren:
                    </p>
                    <p style="margin:0 0 12px 0;font-size:24px;font-weight:bold;letter-spacing:6px;
                              color:#006363;font-family:Consolas,Courier New,monospace;text-align:center;
                              background-color:#ffffff;border:1px solid #F3D98A;border-radius:6px;padding:12px 8px;">
                      ${otpSafe}
                    </p>
                    <p style="margin:0;color:#555555;font-size:13px;line-height:1.6;">
                      Code eingeben unter:<br />
                      <a href="${codeSafe}" style="color:#006363;font-weight:bold;">
                        digiki-os.de/best-practice/code-einloesen
                      </a>
                    </p>
                  </td>
                </tr>
              </table>`
    : "";

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
                Einladung
              </p>
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:bold;color:#006363;line-height:1.3;">
                Sie wurden zum DigiKI-Schulungsteam eingeladen
              </h1>
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;">Guten Tag,</p>
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                Sie wurden als Mitglied des <strong>DigiKI-Schulungsteams</strong>
                eingeladen. Damit erhalten Sie Zugang zum Schulungs-Dashboard, in
                dem Sie die Termine und Teilnehmenden der KOS-Fortbildungen einsehen
                können.
              </p>
              <p style="margin:0 0 20px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                Legen Sie dazu bitte zunächst Ihr persönliches Passwort fest –
                anschließend können Sie sich jederzeit über die normale
                Anmeldeseite einloggen.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#EBF8F7;border:1px solid #B6E1DD;border-radius:8px;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;color:#006363;font-size:13px;line-height:1.6;">
                      <strong style="letter-spacing:0.5px;">Bitte zeitnah einrichten:</strong>
                      Der Link <em>und</em> der 8-stellige Code sind aus
                      Sicherheitsgründen nur <strong>24 Stunden lang gültig</strong>.
                      Danach erlischt beides – melden Sie sich in diesem Fall einfach
                      kurz bei uns, wir senden Ihnen dann gerne eine neue Einladung.
                    </p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #AB7A0E;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px 0;font-weight:bold;color:#006363;font-size:15px;">
                      Passwort festlegen
                    </p>
                    <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:14px;line-height:1.5;">
                      Klicken Sie einmal auf den Button, um Ihr Passwort zu setzen.
                    </p>
                    <p style="margin:0 0 10px 0;">
                      <a href="${setPasswordSafe}"
                        style="display:inline-block;background-color:#006363;color:#ffffff;
                          text-decoration:none;font-weight:bold;font-size:15px;
                          padding:12px 22px;border-radius:8px;">
                        Passwort festlegen
                      </a>
                    </p>
                    <p style="margin:0;color:#555555;font-size:12px;line-height:1.5;">
                      Der Link funktioniert nicht?
                      <a href="${setPasswordSafe}"
                        style="color:#006363;word-break:break-all;">${setPasswordSafe}</a>
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
                    <p style="margin:0 0 10px 0;color:#555555;font-size:14px;line-height:1.5;">
                      <strong>${emailSafe}</strong>
                    </p>
                    <p style="margin:0;color:#555555;font-size:13px;line-height:1.6;">
                      Nach dem Festlegen des Passworts melden Sie sich hier an:<br />
                      <a href="${loginSafe}" style="color:#006363;font-weight:bold;">
                        digiki-os.de/best-practice/login
                      </a><br />
                      Sie landen anschließend direkt im Schulungs-Dashboard.
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
    to,
    subject: "Einladung ins DigiKI-Schulungsteam – Passwort festlegen",
    html,
  });
}
