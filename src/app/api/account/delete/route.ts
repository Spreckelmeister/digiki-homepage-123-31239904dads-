import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Require authenticated user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  let body: { password?: unknown; deleteBestPractices?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { password, deleteBestPractices } = body;
  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "Passwort fehlt" }, { status: 400 });
  }
  const shouldDeleteBP = deleteBestPractices === true;

  // Re-verify password by attempting a sign-in on a separate client instance
  const verifier = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error: pwError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (pwError) {
    return NextResponse.json(
      { error: "Passwort ist nicht korrekt." },
      { status: 401 }
    );
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Delete user-owned records before removing the auth user (GDPR Art. 17)
  await admin.from("bestandsaufnahme_responses").delete().eq("user_id", user.id);

  // Applications are linked by email (case-insensitive)
  await admin
    .from("applications_tool_licenses")
    .delete()
    .ilike("email", user.email);
  await admin
    .from("applications_student_assistants")
    .delete()
    .ilike("email", user.email);

  // Best-Practice-Beiträge: nur löschen, wenn Nutzer dies wünscht
  if (shouldDeleteBP) {
    await admin.from("best_practices").delete().eq("author_id", user.id);
  } else {
    // Autor entkoppeln, damit der Beitrag anonym erhalten bleibt
    await admin
      .from("best_practices")
      .update({ author_id: null })
      .eq("author_id", user.id);
  }

  // Delete auth user; CASCADE handles profiles row
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("[account/delete] auth.admin.deleteUser:", deleteError.message);
    return NextResponse.json(
      { error: deleteError.message || "Löschen fehlgeschlagen" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
