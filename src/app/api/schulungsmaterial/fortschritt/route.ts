import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeProgress } from "@/lib/material/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Speichert den Stand einer HTML-Lerneinheit für das angemeldete Konto
// (Migration 043). Aufgerufen von der Seite /schulungsmaterial/[id], nicht
// von der Lerneinheit selbst – die läuft abgeschottet und hat keine Anmeldung.

export async function PUT(request: NextRequest) {
  // Nur Aufrufe von unserer eigenen Seite.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    originHost = null;
  }
  if (!originHost || originHost !== host) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { id?: unknown; data?: unknown }
    | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const data = sanitizeProgress(body?.data);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !data) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  // Nur für Material, das dieses Konto auch ansehen darf (RLS).
  const { data: item } = await supabase
    .from("schulungsmaterial")
    .select("id")
    .eq("id", id)
    .eq("uploaded", true)
    .eq("kind", "html")
    .maybeSingle();
  if (!item) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  const { error } = await supabase.from("schulungsmaterial_fortschritt").upsert(
    {
      user_id: user.id,
      material_id: id,
      daten: data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,material_id" }
  );
  if (error) {
    console.error("[schulungsmaterial/fortschritt] speichern:", error.message);
    return NextResponse.json({ error: "Speichern nicht möglich" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
