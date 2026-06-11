import { NextRequest, NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

type ResolveBody = {
  conflictId?: unknown;
  action?: unknown; // "reject" | "approve"
  all?: unknown; // true = alle offenen Konflikte auf einmal
};

type Conflict = {
  id: string;
  status: string;
  event_id: string;
  school_id: string | null;
  person_id: string | null;
  role: string;
  payload: { workshops?: string | null } | null;
  import_batch_id: string | null;
};

const SELECT =
  "id, status, event_id, school_id, person_id, role, payload, import_batch_id";

/**
 * Löst Import-Konflikte auf (einzeln per conflictId oder alle offenen per
 * all:true):
 * - "reject":  Konflikt ablehnen UND eine ggf. vorhandene Anmeldung
 *   entfernen (Schulen ohne Registrierung werden direkt angemeldet, daher
 *   muss „Ablehnen" sie wieder löschen).
 * - "approve": Anmeldung mit quota_override sicherstellen und Konflikt als
 *   zugelassen markieren.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auth = await requireSchulungenAccess();
  if (!auth.ok) return auth.response;

  let body: ResolveBody;
  try {
    body = (await request.json()) as ResolveBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action =
    body.action === "approve" ? "approve" : body.action === "reject" ? "reject" : null;
  if (!action) {
    return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
  }

  const admin = createServiceClient();

  // ── Bulk: alle offenen Konflikte ──────────────────────────────────
  if (body.all === true) {
    const { data: list, error } = await admin
      .from("import_conflicts")
      .select(SELECT)
      .eq("status", "open")
      .limit(1000);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    let done = 0;
    for (const c of (list ?? []) as Conflict[]) {
      const res = await resolveOne(admin, c, action, auth.userId);
      if (res.ok) done++;
    }
    return NextResponse.json({ ok: true, action, resolved: done });
  }

  // ── Einzeln ───────────────────────────────────────────────────────
  const conflictId = typeof body.conflictId === "string" ? body.conflictId : "";
  if (!conflictId) {
    return NextResponse.json({ error: "Ungültige Parameter" }, { status: 400 });
  }

  const { data: conflict } = await admin
    .from("import_conflicts")
    .select(SELECT)
    .eq("id", conflictId)
    .single();

  if (!conflict) {
    return NextResponse.json({ error: "Konflikt nicht gefunden" }, { status: 404 });
  }
  if (conflict.status !== "open") {
    return NextResponse.json(
      { error: "Konflikt wurde bereits bearbeitet" },
      { status: 409 }
    );
  }

  const res = await resolveOne(admin, conflict as Conflict, action, auth.userId);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true, action });
}

async function resolveOne(
  admin: SupabaseClient,
  conflict: Conflict,
  action: "approve" | "reject",
  userId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (action === "reject") {
    // Ablehnen: eine ggf. bestehende Anmeldung entfernen (bei Schul-
    // Konflikten wurde direkt angemeldet) und Konflikt als abgelehnt
    // markieren.
    if (conflict.person_id) {
      await admin
        .from("registrations")
        .delete()
        .eq("event_id", conflict.event_id)
        .eq("person_id", conflict.person_id);
    }
  } else {
    // Zulassen: Anmeldung sicherstellen (mit quota_override).
    if (!conflict.person_id || !conflict.school_id) {
      return { ok: false, error: "Konflikt enthält keine vollständigen Personendaten", status: 422 };
    }
    const payload = conflict.payload ?? {};
    const { data: existing } = await admin
      .from("registrations")
      .select("id, status")
      .eq("event_id", conflict.event_id)
      .eq("person_id", conflict.person_id)
      .maybeSingle();

    if (!(existing && existing.status === "registered")) {
      const error = existing
        ? (
            await admin
              .from("registrations")
              .update({
                status: "registered",
                quota_override: true,
                school_id: conflict.school_id,
              })
              .eq("id", existing.id)
          ).error
        : (
            await admin.from("registrations").insert({
              event_id: conflict.event_id,
              school_id: conflict.school_id,
              person_id: conflict.person_id,
              role: conflict.role,
              status: "registered",
              quota_override: true,
              workshops: payload.workshops ?? null,
              import_batch_id: conflict.import_batch_id,
            })
          ).error;
      if (error) {
        return { ok: false, error: `Anmeldung konnte nicht angelegt werden: ${error.message}`, status: 500 };
      }
    }
  }

  const { error: updateError } = await admin
    .from("import_conflicts")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", conflict.id);
  if (updateError) {
    return { ok: false, error: updateError.message, status: 500 };
  }
  return { ok: true };
}
