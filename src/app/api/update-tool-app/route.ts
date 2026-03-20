import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

  // Auth check via session client
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

  // Use admin client to bypass RLS (tables have no SELECT/UPDATE policy for users)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify record exists, belongs to this user's email, and status is "neu"
  const { data: existing } = await admin
    .from("applications_tool_licenses")
    .select("id, status")
    .eq("id", recordId)
    .ilike("email", user.email ?? "")
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Datensatz nicht gefunden" }, { status: 404 });
  }

  if (existing.status !== "neu") {
    return NextResponse.json(
      { error: "Nur Anträge mit Status 'neu' können bearbeitet werden." },
      { status: 403 }
    );
  }

  const { error } = await admin
    .from("applications_tool_licenses")
    .update({
      school_name:                          fields.school_name,
      school_street:                        fields.school_street,
      school_plz:                           fields.school_plz,
      school_city:                          fields.school_city,
      principal_name:                       fields.principal_name,
      contact_person:                       fields.contact_person,
      phone:                                fields.phone,
      email:                                fields.email,
      teacher_count:                        fields.teacher_count,
      student_count:                        fields.student_count,
      tool_selections:                      fields.tool_selections,
      additional_tools:                     fields.additional_tools,
      grade_levels:                         fields.grade_levels,
      subjects:                             fields.subjects,
      start_date:                           fields.start_date,
      usage_description:                    fields.usage_description,
      privacy_concept_exists:               fields.privacy_concept_exists,
      parental_consent:                     fields.parental_consent,
      it_infrastructure_meets_requirements: fields.it_infrastructure_meets_requirements,
      updated_at:                           new Date().toISOString(),
    })
    .eq("id", recordId);

  if (error) {
    console.error("[update-tool-app]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
