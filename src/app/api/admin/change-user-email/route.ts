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
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Require authenticated admin
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

  // Parse + validate body
  let body: { userId?: unknown; newEmail?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, newEmail } = body;
  if (
    typeof userId !== "string" ||
    typeof newEmail !== "string" ||
    !userId.trim() ||
    !newEmail.trim()
  ) {
    return NextResponse.json({ error: "Fehlende Felder" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail) || newEmail.length > 200) {
    return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 });
  }

  if (/\.nibis\.de\s*$/i.test(newEmail)) {
    return NextResponse.json(
      {
        error:
          "NIBIS-Adressen können keine Bestätigungsmails empfangen. Bitte eine andere E-Mail-Adresse wählen.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Update auth email (email_confirm: false triggers a new confirmation mail)
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: false,
  });

  if (authError) {
    console.error("[change-user-email] auth update:", authError.message);
    return NextResponse.json(
      { error: authError.message || "Aktualisierung fehlgeschlagen" },
      { status: 500 }
    );
  }

  // Keep bestandsaufnahme_responses contact_email in sync for records belonging to this user
  await admin
    .from("bestandsaufnahme_responses")
    .update({ contact_email: newEmail, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return NextResponse.json({ ok: true });
}
