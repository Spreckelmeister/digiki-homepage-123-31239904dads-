import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

// In-Memory Rate-Limit: max 1 Anmeldung pro 10 s pro IP
const rateMap = new Map<string, number>();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimStr(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function arrStrings(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .slice(0, maxItems)
    .map((x) => x.slice(0, maxLen));
}

// ── POST: Eltern reichen Anmeldung ein (öffentlich) ─────────────────
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Rate-Limit
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const last = rateMap.get(ip) ?? 0;
  if (now - last < 10_000) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (rateMap.size > 5000) rateMap.clear();
  rateMap.set(ip, now);

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const sessionCode = trimStr(body.session_code, 20);
  const childName = trimStr(body.child_name, 80);
  if (!sessionCode || !childName) {
    return NextResponse.json(
      { error: "missing_fields", detail: "session_code und child_name sind Pflicht" },
      { status: 400 }
    );
  }

  const gender =
    body.gender === "m" || body.gender === "w" || body.gender === "x"
      ? body.gender
      : null;

  const parentEmail = trimStr(body.parent_email, 200);
  if (parentEmail && !EMAIL_RE.test(parentEmail)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const reg = {
    child_name: childName,
    gender,
    notes: trimStr(body.notes, 200),
    prev_class: trimStr(body.prev_class, 30),
    parent_email: parentEmail ? parentEmail.toLowerCase() : null,
    parent_name: trimStr(body.parent_name, 120),
    wishes: arrStrings(body.wishes, 10, 80),
    no_go: arrStrings(body.no_go, 10, 80),
    siblings: arrStrings(body.siblings, 10, 80),
  };

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { error: "service_unavailable" },
      { status: 503 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Session muss existieren + 'open' sein
  const { data: session } = await supabase
    .from("klassenbildung_sessions")
    .select("id, status, max_wishes")
    .eq("code", sessionCode.toUpperCase())
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }
  if (session.status !== "open") {
    return NextResponse.json({ error: "session_closed" }, { status: 409 });
  }

  // Wunsch-Limit erzwingen
  if (reg.wishes.length > session.max_wishes) {
    reg.wishes = reg.wishes.slice(0, session.max_wishes);
  }

  const { data, error } = await supabase
    .from("klassenbildung_registrations")
    .insert({
      session_id: session.id,
      ...reg,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "db_error", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, registration_id: data.id });
}
