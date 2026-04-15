import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

export async function PUT(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const body = await request.json();
  const { recordId, ...fields } = body;

  if (!recordId) {
    return NextResponse.json({ error: "recordId fehlt" }, { status: 400 });
  }

  const { error } = await supabase
    .from("bestandsaufnahme_responses")
    .update({
      school_name:              fields.schoolName,
      school_location:          fields.schoolLocation,
      student_count:            fields.studentCount,
      teacher_count:            fields.teacherCount,
      is_startchancen_school:   fields.isStartchancen,
      daz_share:                fields.dazShare,
      respondent_role:          fields.respondentRole,
      respondent_role_other:    fields.respondentRoleOther,
      devices:                  fields.devices,
      devices_other:            fields.devicesOther,
      tablet_count:             fields.tabletCount,
      wlan_rating:              fields.wlanRating,
      infrastructure:           fields.infrastructure,
      infrastructure_other:     fields.infrastructureOther,
      challenges:               fields.challenges,
      challenges_other:         fields.challengesOther,
      support_satisfaction:     fields.supportSatisfaction,
      digitization_level:       fields.digitizationLevel,
      tools_used:               fields.toolsUsed,
      tools_used_other:         fields.toolsUsedOther,
      usage_frequency:          fields.usageFrequency,
      diagnostic_tools:         fields.diagnosticTools,
      diagnostic_tools_other:   fields.diagnosticToolsOther,
      media_concept:            fields.mediaConcept,
      media_responsible:        fields.mediaResponsible,
      ai_usage:                 fields.aiUsage,
      ai_purposes:              fields.aiPurposes,
      ai_purposes_other:        fields.aiPurposesOther,
      ai_tools_used:            fields.aiToolsUsed,
      ai_tools_other:           fields.aiToolsOther,
      ai_competence:            fields.aiCompetence,
      ai_concerns:              fields.aiConcerns,
      ai_concerns_other:        fields.aiConcernsOther,
      ai_trainings:             fields.aiTrainings,
      ai_trainings_other:       fields.aiTrainingsOther,
      training_needs:           fields.trainingNeeds,
      training_needs_other:     fields.trainingNeedsOther,
      training_format:          fields.trainingFormat,
      training_times:           fields.trainingTimes,
      participation_count:      fields.participationCount,
      pioneer_interest:         fields.pioneerInterest,
      has_best_practice:        fields.hasBestPractice,
      best_practice_description: fields.bestPracticeDescription,
      share_practice:           fields.sharePractice,
      support_needs:            fields.supportNeeds,
      software_licenses:        fields.softwareLicenses,
      software_licenses_other:  fields.softwareLicensesOther,
      student_support:          fields.studentSupport,
      time_for_tools:           fields.timeForTools,
      project_wishes:           fields.projectWishes,
      additional_notes:         fields.additionalNotes,
      updated_at:               new Date().toISOString(),
    })
    .eq("id", recordId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[update-bestandsaufnahme]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
