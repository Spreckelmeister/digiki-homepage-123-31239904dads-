import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string; regId: string }>;
}

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

// ── DELETE: einzelne Anmeldung entfernen (Owner-only) ─────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id: sessionId, regId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Eigentumsprüfung über Join: Anmeldung gehört zu Session, die der User besitzt.
  const { data: reg } = await supabase
    .from("klassenbildung_registrations")
    .select("id, session_id")
    .eq("id", regId)
    .maybeSingle();
  if (!reg || reg.session_id !== sessionId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { data: session } = await supabase
    .from("klassenbildung_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("klassenbildung_registrations")
    .delete()
    .eq("id", regId);
  if (error)
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
