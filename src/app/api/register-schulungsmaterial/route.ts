import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  escapeHtml,
  isSmtpConfigured,
  sendAuthCodeMail,
} from "@/lib/email/sendAuthCodeMail";
import { isEmailDomainBlocked, isSchoolRegistered } from "@/lib/material/server";

// Registrierung NUR für den Bereich Schulungsmaterial (Migration 038):
// legt ein Schulkonto ohne Bestandsaufnahme an. Solche Konten sehen das
// Schulungsmaterial, gehören aber nicht zum Förderprogramm (keine Anträge).
// Anmeldung danach wie bei allen Konten über /best-practice/login.

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

// Einfache Bremse: 1 Registrierung je 60 s je IP.
const rateMap = new Map<string, number>();

function isEmailValid(email: string): boolean {
  return email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  if (now - (rateMap.get(ip) ?? 0) < 60_000) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json({ error: "server_config" }, { status: 500 });
  }
  if (!isSmtpConfigured()) {
    // Ohne Mail kein Bestätigungscode – dann lieber gar kein Konto anlegen.
    return NextResponse.json({ error: "mail_unavailable" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Honeypot: Bots füllen das versteckte Feld aus – still „Erfolg" melden.
  if (typeof body.website_url === "string" && body.website_url.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const schoolName =
    typeof body.schoolName === "string" ? body.schoolName.trim().slice(0, 200) : "";
  const contactName =
    typeof body.contactName === "string" ? body.contactName.trim().slice(0, 200) : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (schoolName.length < 3) {
    return NextResponse.json(
      { error: "missing_field", focusId: "schoolName" },
      { status: 400 }
    );
  }
  if (contactName.length < 3) {
    return NextResponse.json(
      { error: "missing_field", focusId: "contactName" },
      { status: 400 }
    );
  }
  if (!isEmailValid(email)) {
    return NextResponse.json(
      { error: "invalid_email", focusId: "email" },
      { status: 400 }
    );
  }
  if (body.privacyConsent !== true) {
    return NextResponse.json({ error: "consent_missing" }, { status: 400 });
  }
  // NIBIS-Postfächer nehmen unsere Mails nicht an – der Code käme nie an.
  if (/\.nibis\.de$/i.test(email)) {
    return NextResponse.json(
      { error: "nibis_email", focusId: "email" },
      { status: 400 }
    );
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  if (await isEmailDomainBlocked(admin, email)) {
    return NextResponse.json(
      { error: "private_email", focusId: "email" },
      { status: 400 }
    );
  }

  // Ab hier zählt der Versuch für die Bremse (Eingabefehler oben nicht).
  if (rateMap.size >= 5000) rateMap.clear();
  rateMap.set(ip, now);

  // Sperrliste des Förderprogramms (Migration 037) gilt auch hier.
  const { data: isBlocked, error: blockError } = await admin.rpc(
    "is_program_blocked",
    { p_email: email, p_school: schoolName }
  );
  if (blockError) {
    console.error("[register-schulungsmaterial] Sperrliste:", blockError.message);
  } else if (isBlocked === true) {
    return NextResponse.json({ error: "program_blocked" }, { status: 403 });
  }

  // Ein Konto je Schule: Schulkonto ODER Bestandsaufnahme unter diesem Namen
  // (Migration 041); ohne sie der ältere Abgleich nur gegen Konten (038).
  let schoolExists = await isSchoolRegistered(admin, schoolName);
  if (schoolExists === null) {
    const { data, error: schoolError } = await admin.rpc("school_has_account", {
      p_school: schoolName,
    });
    if (schoolError) {
      // Ohne Migration 038 gibt es den Bereich noch nicht.
      console.error("[register-schulungsmaterial] Schulabgleich:", schoolError.message);
      return NextResponse.json({ error: "not_available" }, { status: 503 });
    }
    schoolExists = data === true;
  }
  if (schoolExists === true) {
    return NextResponse.json(
      { error: "school_exists", focusId: "schoolName" },
      { status: 409 }
    );
  }

  // Konto ohne Passwort: Anmeldung per Code (Standard). Ein Passwort lässt
  // sich später über „Passwort vergessen" setzen.
  const { data: userData, error: createError } =
    await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { full_name: contactName, school: schoolName },
    });

  if (createError || !userData?.user?.id) {
    const msg = createError?.message?.toLowerCase() ?? "";
    if (
      msg.includes("already registered") ||
      msg.includes("already been registered") ||
      msg.includes("user already exists") ||
      msg.includes("email address has already been used") ||
      msg.includes("duplicate key")
    ) {
      return NextResponse.json(
        { error: "email_already_registered", focusId: "email" },
        { status: 409 }
      );
    }
    console.error("[register-schulungsmaterial] createUser:", createError?.message);
    return NextResponse.json({ error: "account_creation_failed" }, { status: 500 });
  }

  const userId = userData.user.id;
  const rollback = async () => {
    try {
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
    } catch {
      /* Rollback-Fehler sind tolerierbar */
    }
  };

  const { error: profileError } = await admin.from("profiles").upsert(
    { id: userId, full_name: contactName, school: schoolName, role: "teacher" },
    { onConflict: "id" }
  );
  if (profileError) {
    console.error("[register-schulungsmaterial] Profil:", profileError.message);
    await rollback();
    return NextResponse.json({ error: "account_creation_failed" }, { status: 500 });
  }

  // „Code statt Link": Der Anmeldecode bestätigt zugleich die Adresse
  // (siehe verifySignInCode). Der Link selbst wird nie verschickt.
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({ type: "magiclink", email });
  const code = linkData?.properties?.email_otp ?? "";
  if (linkError || !code) {
    console.error(
      "[register-schulungsmaterial] generateLink:",
      linkError?.message ?? "email_otp fehlt"
    );
    await rollback();
    return NextResponse.json({ error: "account_creation_failed" }, { status: 500 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://digiki-os.de").replace(/\/$/, "");
  let emailSent = false;
  try {
    await sendAuthCodeMail({
      to: email,
      subject: "Bitte E-Mail bestätigen – Ihr DigiKI-Code",
      eyebrow: "Schulungsmaterial",
      heading: "Zugang zum Schulungsmaterial – bitte E-Mail bestätigen",
      preheader: "Ihr 8-stelliger Bestätigungscode für Ihren DigiKI-Zugang.",
      introHtml: `
            <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;">Guten Tag ${escapeHtml(contactName.slice(0, 100))},</p>
            <p style="margin:0 0 20px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
              für <strong>${escapeHtml(schoolName)}</strong> wurde ein Zugang zum
              DigiKI-Schulungsmaterial angelegt.
            </p>`,
      codeLeadHtml:
        "Geben Sie diesen 8-stelligen Code auf der Registrierungsseite ein – dort ist bereits ein Eingabefeld geöffnet. Damit bestätigen Sie Ihre E-Mail-Adresse und sind direkt angemeldet:",
      code,
      pageUrl: `${siteUrl}/best-practice/login`,
      pageLabel:
        "Seite bereits geschlossen? Melden Sie sich einfach hier mit Ihrer E-Mail-Adresse an – Sie erhalten automatisch einen neuen Code, und mit der Anmeldung wird Ihre Adresse bestätigt.",
      pageUrlText: "digiki-os.de/best-practice/login",
    });
    emailSent = true;
  } catch (mailError) {
    // Nicht fatal: Ein neuer Code lässt sich jederzeit über die Anmeldung
    // anfordern (bestätigt die Adresse gleich mit).
    console.error("[register-schulungsmaterial] Mail:", mailError);
  }

  return NextResponse.json({ ok: true, emailSent });
}
