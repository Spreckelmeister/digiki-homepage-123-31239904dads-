import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractContactNames } from "@/lib/contact-name";
import {
  escapeHtml,
  isSmtpConfigured,
  sendAuthCodeMail,
} from "@/lib/email/sendAuthCodeMail";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

// Simple in-memory rate limiting
const rateMap = new Map<string, number>();

// Passwort-Mindestanforderungen (spiegeln die Client-Validierung in BestandsaufnahmeForm)
function isPasswordStrong(p: string): boolean {
  return (
    typeof p === "string" &&
    p.length >= 8 &&
    /[A-Z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[^A-Za-z0-9]/.test(p)
  );
}

function isEmailValid(email: string): boolean {
  return (
    typeof email === "string" &&
    email.length <= 200 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limiting: max 1 registration per 60s per IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const lastSent = rateMap.get(ip) ?? 0;
  if (now - lastSent < 60_000) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (rateMap.size >= 5000) rateMap.clear();
  rateMap.set(ip, now);

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error("[register-bestandsaufnahme] Supabase env vars not set.");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    email,
    password,
    contactEmail,
    contactPerson,
    principalName,
    contactPhone,
    schoolName,
    schoolLocation,
    studentCount,
    teacherCount,
    isStartchancen,
    dazShare,
    respondentRole,
    respondentRoleOther,
    devices,
    devicesOther,
    tabletCount,
    wlanRating,
    infrastructure,
    infrastructureOther,
    challenges,
    challengesOther,
    supportSatisfaction,
    digitizationLevel,
    toolsUsed,
    toolsUsedOther,
    usageFrequency,
    diagnosticTools,
    diagnosticToolsOther,
    mediaConcept,
    mediaResponsible,
    aiUsage,
    aiPurposes,
    aiPurposesOther,
    aiToolsUsed,
    aiToolsOther,
    aiCompetence,
    aiConcerns,
    aiConcernsOther,
    aiTrainings,
    aiTrainingsOther,
    trainingNeeds,
    trainingNeedsOther,
    trainingFormat,
    trainingTimes,
    participationCount,
    pioneerInterest,
    hasBestPractice,
    bestPracticeDescription,
    sharePractice,
    supportNeeds,
    softwareLicenses,
    softwareLicensesOther,
    studentSupport,
    timeForTools,
    projectWishes,
    additionalNotes,
  } = body;

  // ── Account-Pflichtfelder ──────────────────────────────────────────────────
  if (typeof email !== "string" || !isEmailValid(email)) {
    return NextResponse.json(
      { error: "invalid_email", focusId: "contactEmail" },
      { status: 400 }
    );
  }
  if (typeof password !== "string" || !isPasswordStrong(password)) {
    return NextResponse.json(
      { error: "weak_password", focusId: "password" },
      { status: 400 }
    );
  }
  // Login-Email und Kontakt-Email müssen identisch sein (Client schickt nur eine)
  const loginEmail = email.trim().toLowerCase();

  // ── Bestandsaufnahme-Pflichtfelder ─────────────────────────────────────────
  // Spiegelt die Client-Validierung in validateStep(); alles andere darf optional sein.
  const requiredStrings: Array<[string, unknown, string | undefined]> = [
    ["contactPerson", contactPerson, "contactPerson"],
    ["principalName", principalName, "principalName"],
    ["contactPhone", contactPhone, "contactPhone"],
    ["schoolName", schoolName, "schoolName"],
    ["schoolLocation", schoolLocation, undefined],
    ["studentCount", studentCount, undefined],
    ["teacherCount", teacherCount, "teacherCount"],
    ["isStartchancen", isStartchancen, undefined],
    ["dazShare", dazShare, undefined],
    ["respondentRole", respondentRole, undefined],
    ["usageFrequency", usageFrequency, undefined],
    ["mediaConcept", mediaConcept, undefined],
    ["mediaResponsible", mediaResponsible, undefined],
    ["aiUsage", aiUsage, undefined],
    ["pioneerInterest", pioneerInterest, undefined],
    ["hasBestPractice", hasBestPractice, undefined],
    ["sharePractice", sharePractice, undefined],
    ["studentSupport", studentSupport, undefined],
    ["timeForTools", timeForTools, undefined],
  ];
  for (const [name, value, focusId] of requiredStrings) {
    if (typeof value !== "string" || value.trim() === "") {
      return NextResponse.json(
        { error: "missing_field", field: name, focusId },
        { status: 400 }
      );
    }
  }

  const requiredArrays: Array<[string, unknown]> = [
    ["devices", devices],
    ["infrastructure", infrastructure],
    ["challenges", challenges],
    ["toolsUsed", toolsUsed],
    ["diagnosticTools", diagnosticTools],
    ["aiConcerns", aiConcerns],
    ["aiTrainings", aiTrainings],
    ["trainingNeeds", trainingNeeds],
    ["trainingFormat", trainingFormat],
    ["trainingTimes", trainingTimes],
    ["supportNeeds", supportNeeds],
    ["softwareLicenses", softwareLicenses],
  ];
  for (const [name, value] of requiredArrays) {
    if (!Array.isArray(value) || value.length === 0) {
      return NextResponse.json(
        { error: "missing_field", field: name },
        { status: 400 }
      );
    }
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Feld 9 erfasst nur den Namen (die Funktion steckt in Frage 7 / respondent_role).
  // extractContactNames bleibt als Schutz, falls doch „Name, Funktion" eingetippt wird.
  const contactName =
    extractContactNames(contactPerson) || String(contactPerson).trim();

  // ── Account serverseitig anlegen ───────────────────────────────────────────
  // email_confirm: false → User muss bestätigen; wir erzeugen den Link selbst
  // und versenden ihn in unserer Custom-Mail (Supabase verschickt dann keine).
  const { data: userData, error: createError } =
    await adminSupabase.auth.admin.createUser({
      email: loginEmail,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: contactName.slice(0, 200),
        school: String(schoolName).slice(0, 200),
      },
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
        { error: "email_already_registered", focusId: "contactEmail" },
        { status: 409 }
      );
    }
    console.error(
      "[register-bestandsaufnahme] createUser error:",
      createError?.message
    );
    return NextResponse.json(
      { error: "account_creation_failed" },
      { status: 500 }
    );
  }

  const userId = userData.user.id;

  // ── Bestätigungscode generieren („Code statt Link") ────────────────────────
  // Der generierte Link wird NIE verschickt – wir nutzen ausschließlich den
  // Einmal-Code (properties.email_otp). Ein Code kann von automatischen
  // Mail-Scannern (Schul-/Firmennetze) nicht verbraucht werden; die Eingabe
  // passiert direkt auf dem Erfolgsbildschirm der Bestandsaufnahme oder
  // später beim Code-Login (der die Adresse ebenfalls bestätigt).
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://digiki-os.de").replace(/\/$/, "");
  const { data: linkData, error: linkError } =
    await adminSupabase.auth.admin.generateLink({
      type: "signup",
      email: loginEmail,
      password,
    });

  const otpCode = linkData?.properties?.email_otp ?? "";
  if (linkError || !otpCode) {
    console.error(
      "[register-bestandsaufnahme] generateLink error:",
      linkError?.message ?? "email_otp fehlt"
    );
    // Account wurde angelegt, aber kein Code – rollback, sonst blockiert die
    // Email für eine spätere echte Registrierung.
    try {
      await adminSupabase.auth.admin.deleteUser(userId);
    } catch {
      /* Rollback-Fehler sind tolerierbar */
    }
    return NextResponse.json(
      { error: "confirmation_link_failed" },
      { status: 500 }
    );
  }

  // ── Profil schreiben ───────────────────────────────────────────────────────
  const { error: profileError } = await adminSupabase.from("profiles").upsert(
    {
      id: userId,
      full_name: contactName.slice(0, 200),
      school: String(schoolName).slice(0, 200),
      role: "teacher",
      phone: contactPhone ? String(contactPhone).slice(0, 50) : null,
      principal_name: String(principalName).slice(0, 200),
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error(
      "[register-bestandsaufnahme] Profile upsert error:",
      profileError.message
    );
    try {
      await adminSupabase.auth.admin.deleteUser(userId);
    } catch {
      /* Rollback-Fehler sind tolerierbar */
    }
    return NextResponse.json(
      { error: "profile_creation_failed" },
      { status: 500 }
    );
  }

  // ── Bestandsaufnahme schreiben ─────────────────────────────────────────────
  const { error: insertError } = await adminSupabase
    .from("bestandsaufnahme_responses")
    .insert({
      user_id: userId,
      contact_person: contactName.slice(0, 200),
      principal_name: String(principalName).slice(0, 200),
      contact_email:
        typeof contactEmail === "string"
          ? String(contactEmail).slice(0, 200)
          : loginEmail,
      contact_phone: contactPhone ? String(contactPhone).slice(0, 50) : null,
      school_name: String(schoolName).slice(0, 200),
      school_location: schoolLocation,
      student_count: studentCount,
      teacher_count: teacherCount,
      is_startchancen_school: isStartchancen,
      daz_share: dazShare,
      respondent_role: respondentRole,
      respondent_role_other: respondentRoleOther ?? null,
      devices: devices ?? [],
      devices_other: devicesOther ?? null,
      tablet_count: tabletCount ?? null,
      wlan_rating: wlanRating ?? null,
      infrastructure: infrastructure ?? [],
      infrastructure_other: infrastructureOther ?? null,
      challenges: challenges ?? [],
      challenges_other: challengesOther ?? null,
      support_satisfaction: supportSatisfaction ?? null,
      digitization_level: digitizationLevel ?? null,
      tools_used: toolsUsed ?? [],
      tools_used_other: toolsUsedOther ?? null,
      usage_frequency: usageFrequency ?? null,
      diagnostic_tools: diagnosticTools ?? [],
      diagnostic_tools_other: diagnosticToolsOther ?? null,
      media_concept: mediaConcept ?? null,
      media_responsible: mediaResponsible ?? null,
      ai_usage: aiUsage ?? null,
      ai_purposes: aiPurposes ?? [],
      ai_purposes_other: aiPurposesOther ?? null,
      ai_tools_used: aiToolsUsed ?? [],
      ai_tools_other: aiToolsOther ?? null,
      ai_competence: aiCompetence ?? null,
      ai_concerns: aiConcerns ?? [],
      ai_concerns_other: aiConcernsOther ?? null,
      ai_trainings: aiTrainings ?? [],
      ai_trainings_other: aiTrainingsOther ?? null,
      training_needs: trainingNeeds ?? [],
      training_needs_other: trainingNeedsOther ?? null,
      training_format: trainingFormat ?? [],
      training_times: trainingTimes ?? [],
      participation_count: participationCount ?? null,
      pioneer_interest: pioneerInterest ?? null,
      has_best_practice: hasBestPractice ?? null,
      best_practice_description: bestPracticeDescription ?? null,
      share_practice: sharePractice ?? null,
      support_needs: supportNeeds ?? [],
      software_licenses: softwareLicenses ?? [],
      software_licenses_other: softwareLicensesOther ?? null,
      student_support: studentSupport ?? null,
      time_for_tools: timeForTools ?? null,
      project_wishes: projectWishes ?? null,
      additional_notes: additionalNotes ?? null,
      status: "neu",
    });

  if (insertError) {
    console.error(
      "[register-bestandsaufnahme] Insert error:",
      insertError.message
    );
    // Profil + Auth-User zurückrollen, damit die Email wieder frei ist.
    try {
      await adminSupabase.from("profiles").delete().eq("id", userId);
    } catch {
      /* Rollback-Fehler sind tolerierbar */
    }
    try {
      await adminSupabase.auth.admin.deleteUser(userId);
    } catch {
      /* Rollback-Fehler sind tolerierbar */
    }
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  // ── Bestätigungs-Mail versenden (nur Code + Seiten-Link, kein Token-Link) ──
  let emailSent = false;
  if (isSmtpConfigured()) {
    try {
      const greeting = `Guten Tag ${escapeHtml(contactName.slice(0, 100))},`;
      const schoolSafe = escapeHtml(String(schoolName).slice(0, 200));
      const emailSafe = escapeHtml(loginEmail);

      await sendAuthCodeMail({
        to: loginEmail,
        subject: "Bitte E-Mail bestätigen – Ihr DigiKI-Code",
        eyebrow: "Bestandsaufnahme",
        heading: "Bestandsaufnahme eingereicht – bitte E-Mail bestätigen",
        preheader: "Ihr 8-stelliger Bestätigungscode für Ihren DigiKI-Account.",
        introHtml: `
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;">${greeting}</p>
              <p style="margin:0 0 20px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                Vielen Dank! Ihre Bestandsaufnahme für
                <strong>${schoolSafe}</strong> ist erfolgreich bei uns eingegangen.
              </p>`,
        codeLeadHtml:
          "Geben Sie diesen 8-stelligen Code auf der Abschluss-Seite der Bestandsaufnahme ein – dort ist bereits ein Eingabefeld geöffnet. Damit bestätigen Sie Ihre E-Mail-Adresse und sind direkt angemeldet:",
        code: otpCode,
        pageUrl: `${siteUrl}/best-practice/login`,
        pageLabel:
          "Seite bereits geschlossen? Kein Problem: Melden Sie sich einfach hier mit Ihrer E-Mail-Adresse an – Sie erhalten automatisch einen neuen Code, und mit der Anmeldung wird Ihre Adresse bestätigt.",
        pageUrlText: "digiki-os.de/best-practice/login",
        extraHtml: `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #AB7A0E;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
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
      });
      emailSent = true;
    } catch (emailErr) {
      // Email-Fehler nicht fatal – Daten sind gespeichert; ein neuer Code kann
      // jederzeit über die Anmeldeseite angefordert werden (der Code-Login
      // bestätigt die Adresse gleich mit).
      console.error("[register-bestandsaufnahme] Email error:", emailErr);
    }
  }

  return NextResponse.json({ ok: true, emailSent });
}
