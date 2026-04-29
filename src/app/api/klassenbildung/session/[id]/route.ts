import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

function checkOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}

// ── GET: einzelne Session + Registrations (Owner) ─────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const denied = checkOrigin(req);
  if (denied) return denied;
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: session } = await supabase
    .from("klassenbildung_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: registrations } = await supabase
    .from("klassenbildung_registrations")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ session, registrations: registrations ?? [] });
}

// ── PATCH: Session-Felder ändern (Status, max_wishes, etc.) ───────
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = checkOrigin(req);
  if (denied) return denied;
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string")
    patch.name = body.name.trim().slice(0, 120);
  if (typeof body.school_name === "string")
    patch.school_name = body.school_name.trim().slice(0, 200) || null;
  if (
    body.status === "open" ||
    body.status === "closed" ||
    body.status === "assigned"
  )
    patch.status = body.status;
  if (
    Number.isFinite(body.max_wishes) &&
    body.max_wishes >= 1 &&
    body.max_wishes <= 5
  )
    patch.max_wishes = Math.floor(body.max_wishes);

  const { data, error } = await supabase
    .from("klassenbildung_sessions")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ session: data });
}

// ── DELETE: Session entfernen ─────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = checkOrigin(req);
  if (denied) return denied;
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("klassenbildung_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error)
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
