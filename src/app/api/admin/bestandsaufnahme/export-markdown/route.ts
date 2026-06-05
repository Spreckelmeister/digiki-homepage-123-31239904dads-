import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  type BestandsaufnahmeRow,
  totals,
  average,
  countMulti,
  countSingle,
  countRating,
  dedupeBySchool,
} from "@/lib/bestandsaufnahme/aggregations";
import {
  AI_CONCERN_OPTIONS,
  AI_PURPOSE_OPTIONS,
  AI_TOOL_OPTIONS,
  AI_TRAINING_OPTIONS,
  AI_USAGE_OPTIONS,
  CHALLENGE_OPTIONS,
  DEVICE_OPTIONS,
  DIAGNOSTIC_OPTIONS,
  INFRASTRUCTURE_OPTIONS,
  MEDIA_CONCEPT_OPTIONS,
  MEDIA_RESPONSIBLE_OPTIONS,
  PIONEER_INTEREST_OPTIONS,
  SOFTWARE_LICENSE_OPTIONS,
  SUPPORT_NEED_OPTIONS,
  TOOL_OPTIONS,
  TRAINING_FORMAT_OPTIONS,
  TRAINING_NEED_OPTIONS,
  TRAINING_TIME_OPTIONS,
  USAGE_FREQUENCY_OPTIONS,
} from "@/lib/bestandsaufnahme/options";
import { generateMarkdownReport } from "@/lib/bestandsaufnahme/markdownReport";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
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

  const { data: rawRows } = await supabase
    .from("bestandsaufnahme_responses")
    .select(
      `
      id, school_name, school_location, student_count, teacher_count,
      is_startchancen_school, daz_share, respondent_role, respondent_role_other,
      devices, devices_other, tablet_count, wlan_rating,
      infrastructure, infrastructure_other,
      challenges, challenges_other, support_satisfaction,
      digitization_level, tools_used, tools_used_other, usage_frequency,
      diagnostic_tools, diagnostic_tools_other, media_concept, media_responsible,
      ai_usage, ai_purposes, ai_purposes_other, ai_tools_used, ai_tools_other,
      ai_competence, ai_concerns, ai_concerns_other, ai_trainings, ai_trainings_other,
      training_needs, training_needs_other, training_format, training_times,
      participation_count, pioneer_interest,
      has_best_practice, share_practice,
      support_needs, software_licenses, software_licenses_other,
      student_support, time_for_tools,
      created_at
      `,
    )
    .not("school_name", "ilike", "%test%")
    .not("school_name", "ilike", "%admin%")
    .order("created_at", { ascending: false });

  const allRows = (rawRows ?? []) as BestandsaufnahmeRow[];
  const { unique: rows, duplicates } = dedupeBySchool(allRows);
  const t = totals(rows);

  const markdown = generateMarkdownReport({
    generatedAt: new Date(),
    lastSubmission: rows[0]?.created_at ? new Date(rows[0].created_at) : null,
    totals: t,
    duplicatesSkipped: duplicates,
    averages: {
      wlan: average(rows, "wlan_rating"),
      support: average(rows, "support_satisfaction"),
      digitization: average(rows, "digitization_level"),
      aiCompetence: average(rows, "ai_competence"),
    },
    ratings: {
      digitization: countRating(rows, "digitization_level"),
      support: countRating(rows, "support_satisfaction"),
    },
    multi: {
      devices: countMulti(rows, "devices", DEVICE_OPTIONS),
      infrastructure: countMulti(rows, "infrastructure", INFRASTRUCTURE_OPTIONS),
      challenges: countMulti(rows, "challenges", CHALLENGE_OPTIONS),
      tools: countMulti(rows, "tools_used", TOOL_OPTIONS),
      diagnostics: countMulti(rows, "diagnostic_tools", DIAGNOSTIC_OPTIONS),
      aiPurposes: countMulti(rows, "ai_purposes", AI_PURPOSE_OPTIONS),
      aiTools: countMulti(rows, "ai_tools_used", AI_TOOL_OPTIONS),
      aiConcerns: countMulti(rows, "ai_concerns", AI_CONCERN_OPTIONS),
      aiTrainings: countMulti(rows, "ai_trainings", AI_TRAINING_OPTIONS),
      trainingNeeds: countMulti(rows, "training_needs", TRAINING_NEED_OPTIONS),
      trainingFormat: countMulti(rows, "training_format", TRAINING_FORMAT_OPTIONS),
      trainingTimes: countMulti(rows, "training_times", TRAINING_TIME_OPTIONS),
      supportNeeds: countMulti(rows, "support_needs", SUPPORT_NEED_OPTIONS),
      licenses: countMulti(rows, "software_licenses", SOFTWARE_LICENSE_OPTIONS),
    },
    single: {
      usageFrequency: countSingle(rows, "usage_frequency", USAGE_FREQUENCY_OPTIONS),
      mediaConcept: countSingle(rows, "media_concept", MEDIA_CONCEPT_OPTIONS),
      mediaResponsible: countSingle(
        rows,
        "media_responsible",
        MEDIA_RESPONSIBLE_OPTIONS,
      ),
      aiUsage: countSingle(rows, "ai_usage", AI_USAGE_OPTIONS),
      pioneerInterest: countSingle(
        rows,
        "pioneer_interest",
        PIONEER_INTEREST_OPTIONS,
      ),
    },
  });

  // Dateiname mit aktuellem Datum für saubere Download-Liste
  const today = new Date().toISOString().slice(0, 10);
  const filename = `digiki-bestandsaufnahme-${today}.md`;

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
