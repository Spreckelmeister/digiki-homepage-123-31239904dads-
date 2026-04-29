import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { PublicSessionInfo } from "@/lib/klassenbildung/types";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

interface Params {
  params: Promise<{ code: string }>;
}

// ── GET: Eltern lesen Session-Info per Code (öffentlich) ────────────
export async function GET(req: NextRequest, { params }: Params) {
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { code } = await params;
  if (!code || code.length > 20) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

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

  const { data, error } = await supabase
    .from("klassenbildung_sessions")
    .select(
      "code, name, school_name, status, max_wishes, contact_name, contact_email"
    )
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const info: PublicSessionInfo = {
    code: data.code,
    name: data.name,
    school_name: data.school_name,
    status: data.status,
    max_wishes: data.max_wishes,
    contact_name: data.contact_name,
    contact_email: data.contact_email,
  };
  return NextResponse.json({ session: info });
}
