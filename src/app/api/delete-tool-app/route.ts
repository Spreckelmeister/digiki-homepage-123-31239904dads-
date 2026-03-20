import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

export async function DELETE(request: NextRequest) {
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

  const { recordId } = await request.json();
  if (!recordId) {
    return NextResponse.json({ error: "recordId fehlt" }, { status: 400 });
  }

  // Use admin client to bypass RLS
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify record belongs to this user's email and status is "neu"
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
      { error: "Nur Anträge mit Status 'neu' können gelöscht werden." },
      { status: 403 }
    );
  }

  const { error } = await admin
    .from("applications_tool_licenses")
    .delete()
    .eq("id", recordId);

  if (error) {
    console.error("[delete-tool-app]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
