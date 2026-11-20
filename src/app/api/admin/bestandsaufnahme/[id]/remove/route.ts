import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { extractContactNames } from "@/lib/contact-name";
import {
  escapeHtml,
  isSmtpConfigured,
  sendAuthCodeMail,
} from "@/lib/email/sendAuthCodeMail";

/**
 * Admin-Funktion: Schule aus dem Förderprogramm entfernen.
 *
 * Löscht die Bestandsaufnahme, die Anträge und das Login-Konto der Schule
 * (Anmeldung ist danach nicht mehr möglich) und informiert die Schule per
 * Mail über den vom Admin angegebenen Grund. Best-Practice-Beiträge bleiben
 * anonymisiert erhalten – wie bei der Selbst-Löschung ohne Zusatzoption.
 *
 * Step-up: Der Admin muss den Vorgang mit einem frischen Code seines
 * zweiten Faktors (Authenticator-App) bestätigen – eine bereits per 2FA
 * angemeldete Sitzung allein reicht nicht.
 *
 * Sperrliste (Migration 037): Standardmäßig landen E-Mail-Adresse(n) und
 * Schulname in program_blocklist, damit sich die Schule nicht neu
 * registrieren kann. Der Eintrag wird VOR dem Löschen geschrieben – schlägt
 * er fehl, bleibt alles unverändert.
 */

export const runtime = "nodejs";

const REASON_MIN = 10;
const REASON_MAX = 1000;

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
  let body: { reason?: unknown; code?: unknown; block?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < REASON_MIN || reason.length > REASON_MAX) {
    return NextResponse.json(
      {
        error: `Bitte einen Grund angeben (${REASON_MIN}–${REASON_MAX} Zeichen).`,
      },
      { status: 400 },
    );
  }

  // ── Zweiten Faktor frisch prüfen ──────────────────────────────────────────
  const code =
    typeof body.code === "string" ? body.code.replace(/\s+/g, "") : "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Bitte den 6-stelligen Code aus der Authenticator-App eingeben." },
      { status: 400 },
    );
  }
  const { data: factorList } = await supabase.auth.mfa.listFactors();
  const totpFactor = (factorList?.totp ?? []).find(
    (f) => f.status === "verified",
  );
  if (!totpFactor) {
    return NextResponse.json(
      {
        error:
          "Für diesen Vorgang ist ein eingerichteter zweiter Faktor (Authenticator-App) nötig.",
      },
      { status: 403 },
    );
  }
  const { error: mfaError } = await supabase.auth.mfa.challengeAndVerify({
    factorId: totpFactor.id,
    code,
  });
  if (mfaError) {
    const wrongCode =
      mfaError.code === "mfa_verification_failed" || mfaError.status === 422;
    if (!wrongCode) {
      console.error("[bestandsaufnahme/remove] mfa:", mfaError.message);
    }
    return NextResponse.json(
      {
        error: wrongCode
          ? "Der Code stimmt nicht. Bitte den aktuellen 6-stelligen Code aus der App eingeben."
          : "Der zweite Faktor konnte nicht geprüft werden. Bitte erneut versuchen.",
      },
      { status: wrongCode ? 401 : 500 },
    );
  }

  const block = body.block !== false;

  const { id } = await params;
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: row } = await admin
    .from("bestandsaufnahme_responses")
    .select("id, user_id, school_name, contact_email, contact_person")
    .eq("id", id)
    .maybeSingle();
  if (!row) {
    return NextResponse.json(
      { error: "Bestandsaufnahme nicht gefunden." },
      { status: 404 },
    );
  }

  const userId: string | null = row.user_id ?? null;
  let loginEmail = "";
  let fullName = "";

  if (userId) {
    if (userId === user.id) {
      return NextResponse.json(
        { error: "Das eigene Konto kann hier nicht entfernt werden." },
        { status: 400 },
      );
    }
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role, full_name")
      .eq("id", userId)
      .maybeSingle();
    if (targetProfile?.role?.toLowerCase() === "admin") {
      return NextResponse.json(
        { error: "Admin-Konten können hier nicht entfernt werden." },
        { status: 400 },
      );
    }
    fullName = targetProfile?.full_name ?? "";
    const { data: targetUser } = await admin.auth.admin.getUserById(userId);
    loginEmail = targetUser?.user?.email ?? "";
  }

  // Empfänger: Login-Adresse und (falls abweichend) Kontaktadresse.
  const recipients = Array.from(
    new Map(
      [loginEmail, row.contact_email ?? ""]
        .map((e) => String(e).trim())
        .filter(Boolean)
        .map((e) => [e.toLowerCase(), e] as const),
    ).values(),
  );

  // ── Sperrliste ────────────────────────────────────────────────────────────
  if (block) {
    const schoolName = String(row.school_name ?? "").slice(0, 200);
    const entries = (recipients.length > 0 ? recipients : [null]).map(
      (email) => ({
        email: email ? email.toLowerCase() : null,
        school_name: schoolName,
        reason,
        created_by: user.id,
      }),
    );
    const { error: blockError } = await admin
      .from("program_blocklist")
      .insert(entries);
    if (blockError) {
      console.error("[bestandsaufnahme/remove] blocklist:", blockError.message);
      return NextResponse.json(
        {
          error:
            "Die Sperrliste konnte nicht geschrieben werden (Migration 037 ausgeführt?). Es wurde nichts gelöscht.",
        },
        { status: 500 },
      );
    }
  }

  // ── Löschen ───────────────────────────────────────────────────────────────
  // Zuerst das Login-Konto: Schlägt das fehl, bleibt alles unverändert und
  // der Admin kann es erneut versuchen.
  if (userId) {
    await admin
      .from("best_practices")
      .update({ author_id: null })
      .eq("author_id", userId);

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[bestandsaufnahme/remove] deleteUser:", deleteError.message);
      return NextResponse.json(
        {
          error: block
            ? "Das Login-Konto konnte nicht gelöscht werden. Der Sperrlisten-Eintrag wurde bereits angelegt."
            : "Das Login-Konto konnte nicht gelöscht werden.",
        },
        { status: 500 },
      );
    }
    await admin.from("bestandsaufnahme_responses").delete().eq("user_id", userId);
  }

  const { error: rowError } = await admin
    .from("bestandsaufnahme_responses")
    .delete()
    .eq("id", id);
  if (rowError) {
    console.error("[bestandsaufnahme/remove] delete row:", rowError.message);
    return NextResponse.json(
      { error: "Die Bestandsaufnahme konnte nicht gelöscht werden." },
      { status: 500 },
    );
  }

  for (const email of recipients) {
    await admin.from("applications_tool_licenses").delete().ilike("email", email);
    await admin
      .from("applications_student_assistants")
      .delete()
      .ilike("email", email);
    try {
      await admin.from("account_deletion_codes").delete().ilike("email", email);
    } catch {
      /* Aufräumen ist nicht fatal */
    }
  }

  console.info(
    `[bestandsaufnahme/remove] Schule „${row.school_name}" (${id}) entfernt durch Admin ${user.id}`,
  );

  // ── Mail an die Schule ────────────────────────────────────────────────────
  let mailSent = false;
  if (recipients.length > 0 && isSmtpConfigured()) {
    try {
      const contactName = extractContactNames(
        fullName || row.contact_person || "",
      );
      const greeting = contactName
        ? `Guten Tag ${escapeHtml(contactName.slice(0, 100))},`
        : "Guten Tag,";
      const schoolSafe = escapeHtml(String(row.school_name ?? "").slice(0, 200));
      const reasonHtml = escapeHtml(reason).replace(/\r?\n/g, "<br />");

      await sendAuthCodeMail({
        to: recipients.join(", "),
        subject: "Ihre Teilnahme am Förderprogramm DigiKI",
        eyebrow: "Förderprogramm",
        heading: "Ihre Schule wurde aus dem Förderprogramm entfernt",
        preheader: "Information zu Ihrer Teilnahme am Förderprogramm DigiKI.",
        introHtml: `
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">${greeting}</p>
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                leider wurde Ihre Schule${schoolSafe ? ` (<strong>${schoolSafe}</strong>)` : ""}
                aus dem Förderprogramm DigiKI entfernt, weil:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #006363;border-radius:0 6px 6px 0;margin:0 0 20px 0;">
                <tr>
                  <td style="padding:14px 16px;color:#1A1A1A;font-size:15px;line-height:1.6;">
                    ${reasonHtml}
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                Ihr Zugang zur DigiKI-Plattform wurde damit geschlossen; eine
                Anmeldung ist nicht mehr möglich. Ihre Bestandsaufnahme und
                Ihre eingereichten Anträge haben wir gelöscht.${
                  block ? " Eine erneute Registrierung ist nicht möglich." : ""
                }
              </p>
              <p style="margin:0 0 24px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                Wenn Sie Fragen dazu haben oder die Entscheidung aus Ihrer
                Sicht auf einem Irrtum beruht, erreichen Sie uns über das
                <a href="https://digiki-os.de/#kontakt" style="color:#006363;">Kontaktformular</a>
                der DigiKI-Website.
              </p>`,
      });
      mailSent = true;
    } catch (mailErr) {
      console.error("[bestandsaufnahme/remove] mail failed:", mailErr);
    }
  }

  return NextResponse.json({ ok: true, mailSent, recipients });
}
