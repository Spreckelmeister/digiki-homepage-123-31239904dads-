import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Verwaltet die dauerhaft gespeicherten manuellen Mail-Empfänger.
 * GET = laden, POST = hinzufügen (eine oder mehrere Adressen),
 * DELETE = entfernen. Admin-only.
 */
async function requireAdmin() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return { ok: false as const, res: NextResponse.json({ error: "Server configuration error" }, { status: 500 }) };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, res: NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role?.toLowerCase() !== "admin") {
    return { ok: false as const, res: NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 }) };
  }
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return { ok: true as const, admin, userId: user.id };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { data, error } = await auth.admin
    .from("mailing_extra_recipients")
    .select("id, email, label")
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ recipients: data ?? [] });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  let body: { emails?: unknown };
  try {
    body = (await request.json()) as { emails?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Adressen kleinschreiben (passt zum lower(email)-Unique-Index) + dedupe.
  const seen = new Set<string>();
  const emails = (Array.isArray(body.emails) ? body.emails : [])
    .filter((e): e is string => typeof e === "string")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => EMAIL_RE.test(e) && !seen.has(e) && (seen.add(e), true));
  if (emails.length === 0) {
    return NextResponse.json({ error: "Keine gültigen Adressen." }, { status: 400 });
  }

  // Einzel-Inserts; bereits vorhandene Adressen (Unique-Verletzung 23505)
  // werden toleriert.
  for (const email of emails) {
    const { error } = await auth.admin
      .from("mailing_extra_recipients")
      .insert({ email, created_by: auth.userId });
    if (error && error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { data } = await auth.admin
    .from("mailing_extra_recipients")
    .select("id, email, label")
    .order("created_at", { ascending: true });
  return NextResponse.json({ recipients: data ?? [] });
}

export async function DELETE(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "E-Mail fehlt." }, { status: 400 });
  }

  const { error } = await auth.admin
    .from("mailing_extra_recipients")
    .delete()
    .eq("email", email);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
