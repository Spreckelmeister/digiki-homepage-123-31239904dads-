import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requireSchulungenAccess,
  createServiceClient,
  isQuotaError,
} from "@/lib/schulungen/server";
import { schoolKeyFromName, schoolMatchKey } from "@/lib/schulungen/parse";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

type AssignBody = {
  conflictId?: unknown;
  /** Name der registrierten Zielschule (aus der Bestandsaufnahme). */
  schoolName?: unknown;
};

type Conflict = {
  id: string;
  status: string;
  event_id: string;
  person_id: string | null;
  role: "teacher" | "leadership";
  payload: { workshops?: string | null } | null;
  import_batch_id: string | null;
};

/**
 * Weist die Person eines (nicht zuweisbaren) Konflikts manuell einer
 * registrierten Schule zu. Die Anmeldung wird auf diese Schule umgezogen;
 * der DB-Trigger prüft dabei die Quote der Zielschule für die Rolle
 * (Lehrkraft/Schulleitung). Anschließend wird der Konflikt geschlossen.
 *
 * Das Dropdown im Dashboard bietet ohnehin nur Schulen mit freiem Pensum
 * an – die Trigger-Prüfung fängt nur seltene Races (zwischenzeitlich voll)
 * ab und meldet sie verständlich zurück.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auth = await requireSchulungenAccess();
  if (!auth.ok) return auth.response;

  let body: AssignBody;
  try {
    body = (await request.json()) as AssignBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const conflictId = typeof body.conflictId === "string" ? body.conflictId : "";
  const schoolName =
    typeof body.schoolName === "string" ? body.schoolName.trim() : "";
  if (!conflictId || !schoolName) {
    return NextResponse.json({ error: "Ungültige Parameter" }, { status: 400 });
  }

  const admin = createServiceClient();

  const { data: conflict } = await admin
    .from("import_conflicts")
    .select("id, status, event_id, person_id, role, payload, import_batch_id")
    .eq("id", conflictId)
    .single();

  if (!conflict) {
    return NextResponse.json({ error: "Konflikt nicht gefunden" }, { status: 404 });
  }
  if ((conflict as Conflict).status !== "open") {
    return NextResponse.json(
      { error: "Konflikt wurde bereits bearbeitet" },
      { status: 409 }
    );
  }
  const c = conflict as Conflict;
  if (!c.person_id) {
    return NextResponse.json(
      { error: "Konflikt enthält keine Person" },
      { status: 422 }
    );
  }

  // Zielschule auflösen (vorhandene Schule wiederverwenden, sonst anlegen).
  let targetSchoolId: string;
  try {
    targetSchoolId = await resolveSchool(admin, schoolName);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Schule konnte nicht zugeordnet werden: ${
          err instanceof Error ? err.message : "unbekannter Fehler"
        }`,
      },
      { status: 500 }
    );
  }

  // Anmeldung auf die Zielschule umziehen (oder neu anlegen). Der Trigger
  // setzt quota_override zurück (Schulwechsel) und prüft die Quote.
  const payload = c.payload ?? {};
  const { data: existing } = await admin
    .from("registrations")
    .select("id")
    .eq("event_id", c.event_id)
    .eq("person_id", c.person_id)
    .maybeSingle();

  const regError = existing
    ? (
        await admin
          .from("registrations")
          .update({ school_id: targetSchoolId, status: "registered" })
          .eq("id", existing.id)
      ).error
    : (
        await admin.from("registrations").insert({
          event_id: c.event_id,
          school_id: targetSchoolId,
          person_id: c.person_id,
          role: c.role,
          status: "registered",
          workshops: payload.workshops ?? null,
          import_batch_id: c.import_batch_id,
        })
      ).error;

  if (regError) {
    if (isQuotaError(regError.message)) {
      return NextResponse.json(
        {
          error:
            "Die gewählte Schule hat ihr Pensum für diese Rolle inzwischen ausgeschöpft – bitte eine andere Schule wählen.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: `Zuweisung fehlgeschlagen: ${regError.message}` },
      { status: 500 }
    );
  }

  // Person zur Zielschule umhängen, damit sie auch künftig (Re-Import,
  // Quoten) zur richtigen Schule zählt – nur wenn das nicht mit einer
  // gleichnamigen Person an der Zielschule kollidiert (UNIQUE-Constraint).
  const { data: clash } = await admin
    .from("persons")
    .select("id, first_norm, last_norm")
    .eq("id", c.person_id)
    .maybeSingle();
  if (clash) {
    const { data: other } = await admin
      .from("persons")
      .select("id")
      .eq("school_id", targetSchoolId)
      .eq("last_norm", clash.last_norm)
      .eq("first_norm", clash.first_norm)
      .neq("id", c.person_id)
      .maybeSingle();
    if (!other) {
      await admin
        .from("persons")
        .update({ school_id: targetSchoolId })
        .eq("id", c.person_id);
    }
  }

  const { error: updErr } = await admin
    .from("import_conflicts")
    .update({
      status: "approved",
      resolved_by: auth.userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", c.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Schulname → schools.id. Bevorzugt eine vorhandene Schule (exakter
 * Schlüssel, sonst tolerant über schoolMatchKey), legt sonst eine neue an.
 */
async function resolveSchool(
  admin: SupabaseClient,
  name: string
): Promise<string> {
  const exactKey = schoolKeyFromName(name);

  const { data: exact } = await admin
    .from("schools")
    .select("id")
    .eq("school_key", exactKey)
    .maybeSingle();
  if (exact) return exact.id;

  // Tolerant: abweichende Schreibweise (Schultyp-Wörter ignoriert).
  const mkey = schoolMatchKey(name);
  if (mkey) {
    const { data: all } = await admin.from("schools").select("id, name");
    const hit = (all ?? []).find(
      (s) => schoolMatchKey((s as { name: string }).name) === mkey
    );
    if (hit) return (hit as { id: string }).id;
  }

  const { data: created, error } = await admin
    .from("schools")
    .insert({ school_key: exactKey, name })
    .select("id")
    .single();
  if (error || !created) {
    // Unique-Kollision (parallel angelegt) → erneut suchen.
    const { data: retry } = await admin
      .from("schools")
      .select("id")
      .eq("school_key", exactKey)
      .maybeSingle();
    if (retry) return retry.id;
    throw new Error(error?.message ?? "Schule konnte nicht angelegt werden");
  }
  return created.id;
}
