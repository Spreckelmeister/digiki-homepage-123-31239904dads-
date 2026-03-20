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

  // Verify record exists, belongs to this user's email, and status is "neu"
  const { data: existing, error: fetchError } = await supabase
    .from("applications_student_assistants")
    .select("id, status, email")
    .eq("id", recordId)
    .ilike("email", user.email ?? "")
    .maybeSingle();

  if (fetchError) {
    console.error("[update-student-app] fetch error:", fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Datensatz nicht gefunden" }, { status: 404 });
  }

  if (existing.status !== "neu") {
    return NextResponse.json(
      { error: "Nur Anträge mit Status 'neu' können bearbeitet werden." },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("applications_student_assistants")
    .update({
      school_name:              fields.school_name,
      school_street:            fields.school_street,
      school_plz:               fields.school_plz,
      school_city:              fields.school_city,
      principal_name:           fields.principal_name,
      contact_person:           fields.contact_person,
      phone:                    fields.phone,
      email:                    fields.email,
      teacher_count:            fields.teacher_count,
      student_count:            fields.student_count,
      support_technical_setup:  fields.support_technical_setup,
      support_onboarding:       fields.support_onboarding,
      support_tech_support:     fields.support_tech_support,
      support_material_creation: fields.support_material_creation,
      support_classroom:        fields.support_classroom,
      support_other:            fields.support_other,
      support_explanation:      fields.support_explanation,
      start_date:               fields.start_date,
      duration:                 fields.duration,
      hours_per_week:           fields.hours_per_week,
      preferred_days:           fields.preferred_days,
      has_wifi:                 fields.has_wifi,
      has_devices:              fields.has_devices,
      device_count:             fields.device_count,
      has_interactive_displays: fields.has_interactive_displays,
      has_school_server:        fields.has_school_server,
      updated_at:               new Date().toISOString(),
    })
    .eq("id", recordId)
    .ilike("email", user.email ?? "");

  if (error) {
    console.error("[update-student-app]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
