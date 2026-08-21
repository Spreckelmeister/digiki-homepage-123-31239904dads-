import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";
import type { AccessUser } from "@/lib/schulungen/types";
import { escapeHtml, sendAuthCodeMail } from "@/lib/email/sendAuthCodeMail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

/**
 * Zugriffsverwaltung des Schulungs-Dashboards (nur Admins).
 *
 * Schulungsteam-Mitglieder sind reine EINLADUNGS-Accounts: Sie haben KEINEN
 * normalen DigiKI-Account (kein Zugriff auf die Best-Practice-Datenbank) und
 * sollen auch nie einen bekommen. Der Admin trägt nur eine E-Mail ein; das
 * System legt den Account an und verschickt eine Einladungs-Mail mit der
 * Anleitung, per Code ein eigenes Passwort festzulegen (kein Token-Link).
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
 * schulungsteam) + Einladungs-Mail mit Anleitung (Code anfordern → Passwort
 * festlegen). Bestehende Accounts (DigiKI) werden abgelehnt.
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

  // „Code statt Link": Die Einladung enthält KEIN Geheimnis (weder Token-Link
  // noch Code) – nur die Anleitung, über die Passwort-vergessen-Seite einen
  // Code anzufordern und das eigene Passwort festzulegen. So kann die
  // Einladung nie ablaufen und kein Mail-Scanner sie unbrauchbar machen.
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://digiki-os.de").replace(/\/$/, "");
  const passwortVergessenUrl = `${siteUrl}/best-practice/passwort-vergessen`;
  const loginUrl = `${siteUrl}/best-practice/login`;

  try {
    await sendInviteMail({ to: email, passwortVergessenUrl, loginUrl });
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

/** Versendet die gebrandete Einladungs-Mail (nur Anleitung, kein Geheimnis). */
async function sendInviteMail(args: {
  to: string;
  passwortVergessenUrl: string;
  loginUrl: string;
}): Promise<void> {
  const { to, passwortVergessenUrl, loginUrl } = args;
  const emailSafe = escapeHtml(to);

  await sendAuthCodeMail({
    to,
    subject: "Einladung ins DigiKI-Schulungsteam – Zugang einrichten",
    eyebrow: "Schulungsteam",
    heading: "Willkommen im DigiKI-Schulungsteam",
    preheader:
      "In drei kurzen Schritten richten Sie Ihren Zugang zum Schulungs-Dashboard ein.",
    introHtml: `
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;">Guten Tag,</p>
              <p style="margin:0 0 20px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                für Ihre E-Mail-Adresse wurde ein Zugang zum
                DigiKI-Schulungs-Dashboard freigeschaltet. Dort verwalten Sie
                die Anmeldungen zu den KOS-Fortbildungen, behalten Quoten im
                Blick und klären Konflikte.
              </p>`,
    extraHtml: `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #AB7A0E;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px 0;font-weight:bold;color:#006363;font-size:15px;">
                      So richten Sie Ihren Zugang ein
                    </p>
                    <ol style="margin:0 0 12px 0;padding:0 0 0 20px;color:#1A1A1A;font-size:14px;line-height:1.7;">
                      <li>Öffnen Sie die Seite:
                        <a href="${escapeHtml(passwortVergessenUrl)}" style="color:#006363;font-weight:bold;">digiki-os.de/best-practice/passwort-vergessen</a>
                      </li>
                      <li>Geben Sie Ihre E-Mail-Adresse (<strong>${emailSafe}</strong>) ein und klicken Sie auf <strong>„Code anfordern"</strong>.</li>
                      <li>Geben Sie den 8-stelligen Code aus der E-Mail ein und legen Sie Ihr persönliches Passwort fest.</li>
                    </ol>
                    <p style="margin:0;color:#555555;font-size:13px;line-height:1.6;">
                      Anschließend melden Sie sich unter
                      <a href="${escapeHtml(loginUrl)}" style="color:#006363;font-weight:bold;">digiki-os.de/best-practice/login</a>
                      an – dort geht es jederzeit auch ganz ohne Passwort, per
                      Code – und landen direkt im Schulungs-Dashboard.
                      <strong>Diese Einladung läuft nicht ab.</strong>
                    </p>
                  </td>
                </tr>
              </table>
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
              </table>`,
    footerNoteHtml:
      "Sie kennen DigiKI nicht oder haben diese Einladung nicht erwartet? Dann können Sie diese E-Mail einfach ignorieren.",
  });
}
