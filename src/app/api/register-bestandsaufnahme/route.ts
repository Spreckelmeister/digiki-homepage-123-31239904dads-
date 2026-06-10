import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

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

  // Feld 9 erfasst „Name, Funktion" (z. B. „Maria Mustermann, IT-Beauftragte").
  // Für full_name (Auth + Profil → Anreden/Anzeigen) nur den Namen vor dem ersten
  // Komma verwenden. Die volle Angabe bleibt in der Bestandsaufnahme (contact_person)
  // erhalten; die Funktion steckt zusätzlich in respondent_role.
  const contactName =
    String(contactPerson).split(",")[0].trim() || String(contactPerson).trim();

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

  // ── Bestätigungs-Link generieren ───────────────────────────────────────────
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://digiki-os.de";
  const { data: linkData, error: linkError } =
    await adminSupabase.auth.admin.generateLink({
      type: "signup",
      email: loginEmail,
      password,
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=/best-practice/datenbank`,
      },
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error(
      "[register-bestandsaufnahme] generateLink error:",
      linkError?.message
    );
    // Account wurde angelegt, aber kein Link – rollback, sonst blockiert die
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
  // Wir bauen den Bestätigungs-Link bewusst SELBST – nicht `action_link`
  // verwenden! Supabase's eingebaute Verify-Route würde sonst nach
  // erfolgreichem Token-Check zur "Site URL" (https://digiki-os.de)
  // redirecten, wenn unsere `redirectTo` nicht in der Allowlist steht.
  // Mit `token_hash` + unserer eigenen /auth/callback-Route haben wir
  // die volle Kontrolle über den Ziel-Redirect (-> /best-practice/datenbank).
  const tokenHash = linkData.properties.hashed_token;
  const nextPath = "/best-practice/datenbank";
  const confirmationUrl =
    `${siteUrl}/auth/callback` +
    `?token_hash=${encodeURIComponent(tokenHash)}` +
    `&type=signup` +
    `&next=${encodeURIComponent(nextPath)}`;
  // OTP für den Fall, dass Schul-/Firmennetzwerke den Link blockieren.
  // Wird im Mail-Template als prominente Alternative dargestellt.
  const otpCode = linkData.properties.email_otp ?? "";

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
      contact_person: String(contactPerson).slice(0, 200),
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

  // ── Bestätigungs-Mail versenden ────────────────────────────────────────────
  let emailSent = false;
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

      const greeting = `Guten Tag ${escapeHtml(contactName.slice(0, 100))},`;
      const schoolSafe = escapeHtml(String(schoolName).slice(0, 200));
      const emailSafe = escapeHtml(loginEmail);
      const confirmationUrlSafe = escapeHtml(confirmationUrl);
      const otpCodeSafe = escapeHtml(otpCode);
      const codeEinloesenUrl = `${siteUrl}/best-practice/code-einloesen?type=signup`;
      const codeEinloesenUrlSafe = escapeHtml(codeEinloesenUrl);
      const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

      // Code-Alternative nur einbauen, wenn Supabase tatsächlich eine OTP
      // mitgeliefert hat – ansonsten leerer Block.
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
          <!-- Farbbalken -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#006363 0%,#00cabe 100%);"></td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 32px;
              border-left:1px solid #DEE8E8;border-right:1px solid #DEE8E8;">
              <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:bold;color:#006363;">
                Bestandsaufnahme eingereicht – bitte E-Mail bestätigen
              </h1>
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;">${greeting}</p>
              <p style="margin:0 0 24px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                Vielen Dank! Ihre Bestandsaufnahme für
                <strong>${schoolSafe}</strong> ist erfolgreich bei uns eingegangen.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #AB7A0E;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px 0;font-weight:bold;color:#006363;font-size:15px;">
                      E-Mail-Adresse bestätigen
                    </p>
                    <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:14px;line-height:1.5;">
                      Damit wir sicher sind, dass diese Adresse Ihnen gehört,
                      bestätigen Sie bitte Ihren Zugang mit einem Klick auf den
                      folgenden Link. Erst danach können Sie sich in der
                      Best-Practice-Datenbank anmelden.
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
        to: loginEmail,
        subject: "Bitte E-Mail bestätigen – DigiKI",
        html,
      });
      emailSent = true;
    } catch (emailErr) {
      // Email-Fehler nicht fatal – Daten sind gespeichert, User kann den Link
      // bei Bedarf über "Passwort vergessen" oder den Code-Einlöser neu anfordern.
      console.error("[register-bestandsaufnahme] Email error:", emailErr);
    }
  }

  return NextResponse.json({ ok: true, emailSent });
}
