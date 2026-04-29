import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSessionCode } from "@/lib/klassenbildung/types";

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

// ── POST: Lehrkraft erstellt neue Anmelde-Session ───────────────────
export async function POST(req: NextRequest) {
  const denied = checkOrigin(req);
  if (denied) return denied;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const name =
    typeof body.name === "string" && body.name.trim().length > 0
      ? body.name.trim().slice(0, 120)
      : null;
  if (!name)
    return NextResponse.json({ error: "name_required" }, { status: 400 });

  const schoolName =
    typeof body.school_name === "string"
      ? body.school_name.trim().slice(0, 200) || null
      : null;
  const maxWishes =
    Number.isFinite(body.max_wishes) &&
    body.max_wishes >= 1 &&
    body.max_wishes <= 5
      ? Math.floor(body.max_wishes)
      : 2;

  // Code generieren – im seltenen Konfliktfall einmal neu probieren
  let code = generateSessionCode();
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabase
      .from("klassenbildung_sessions")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!existing) break;
    code = generateSessionCode();
  }

  const { data, error } = await supabase
    .from("klassenbildung_sessions")
    .insert({
      user_id: user.id,
      code,
      name,
      school_name: schoolName,
      max_wishes: maxWishes,
      status: "open",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "db_error", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ session: data });
}

// ── GET: Lehrkraft listet eigene Sessions ───────────────────────────
export async function GET(req: NextRequest) {
  const denied = checkOrigin(req);
  if (denied) return denied;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("klassenbildung_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "db_error", detail: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ sessions: data ?? [] });
}
