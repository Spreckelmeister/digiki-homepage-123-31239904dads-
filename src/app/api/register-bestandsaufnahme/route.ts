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
    userId,
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

  // Basic validation
  if (
    typeof userId !== "string" ||
    typeof contactEmail !== "string" ||
    typeof contactPerson !== "string" ||
    typeof principalName !== "string" ||
    typeof schoolName !== "string"
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Upsert profile (trigger may have already created it from signUp metadata)
  const { error: profileError } = await adminSupabase.from("profiles").upsert(
    {
      id: userId,
      full_name: String(contactPerson).slice(0, 200),
      school: String(schoolName).slice(0, 200),
      role: "teacher",
      phone: contactPhone ? String(contactPhone).slice(0, 50) : null,
      principal_name: String(principalName).slice(0, 200),
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("[register-bestandsaufnahme] Profile upsert error:", profileError.message);
    return NextResponse.json({ error: "Profile creation failed" }, { status: 500 });
  }

  // Insert bestandsaufnahme response
  const { error: insertError } = await adminSupabase
    .from("bestandsaufnahme_responses")
    .insert({
      user_id: userId,
      contact_person: String(contactPerson).slice(0, 200),
      principal_name: String(principalName).slice(0, 200),
      contact_email: String(contactEmail).slice(0, 200),
      contact_phone: contactPhone ? String(contactPhone).slice(0, 50) : null,
      school_name: String(schoolName).slice(0, 200),
      school_location: schoolLocation ?? null,
      student_count: studentCount ?? null,
      teacher_count: teacherCount ?? null,
      is_startchancen_school: isStartchancen ?? null,
      daz_share: dazShare ?? null,
      respondent_role: respondentRole ?? null,
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
    console.error("[register-bestandsaufnahme] Insert error:", insertError.message);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  // Send confirmation email via nodemailer
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

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://digiki-os.de";
      const greeting = `Guten Tag ${escapeHtml(String(contactPerson).slice(0, 100))},`;
      const schoolSafe = escapeHtml(String(schoolName).slice(0, 200));
      const emailSafe = escapeHtml(String(contactEmail).slice(0, 200));
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
          <!-- Farbbalken -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#006363 0%,#00cabe 100%);"></td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 32px;
              border-left:1px solid #DEE8E8;border-right:1px solid #DEE8E8;">
              <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:bold;color:#006363;">
                Bestandsaufnahme erfolgreich eingereicht
              </h1>
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;">${greeting}</p>
              <p style="margin:0 0 24px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                Vielen Dank! Ihre Bestandsaufnahme für
                <strong>${schoolSafe}</strong> ist erfolgreich bei uns eingegangen.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #00cabe;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-weight:bold;color:#006363;font-size:14px;">Ihr DigiKI-Account wurde erstellt</p>
                    <p style="margin:0;color:#555555;font-size:14px;line-height:1.5;">
                      Wir haben einen Zugang für die Best-Practice-Datenbank für Sie angelegt.
                      Bitte bestätigen Sie zunächst Ihre E-Mail-Adresse über den Link in der
                      separaten Bestätigungs-E-Mail von uns.<br /><br />
                      Ihre Login-E-Mail: <strong>${emailSafe}</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #006363;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-weight:bold;color:#006363;font-size:14px;">Wie geht es weiter?</p>
                    <p style="margin:0;color:#555555;font-size:14px;line-height:1.5;">
                      Wir prüfen Ihre Angaben und melden uns zeitnah bei Ihnen.
                      Nach der E-Mail-Bestätigung können Sie sich jederzeit in der
                      Best-Practice-Datenbank anmelden.
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
        to: String(contactEmail),
        subject: "Ihre Bestandsaufnahme wurde eingereicht – DigiKI",
        html,
      });
    } catch (emailErr) {
      // Email failure is non-fatal – data is already saved
      console.error("[register-bestandsaufnahme] Email error:", emailErr);
    }
  }

  return NextResponse.json({ ok: true });
}
