import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requireSchulungenAccess,
  createServiceClient,
  isQuotaError,
} from "@/lib/schulungen/server";
import {
  schoolKeyFromName,
  schoolMatchKey,
  NO_SCHOOL_NAME,
} from "@/lib/schulungen/parse";

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
  school: { name: string | null } | null;
};

const CONFLICT_SELECT =
  "id, status, event_id, person_id, role, payload, import_batch_id, school:schools (name)";

/**
 * Weist die Person eines Konflikts manuell einer registrierten Schule zu.
 *
 * Bei einem ECHTEN Schulnamen wird zusätzlich ein dauerhafter Alias gespeichert
 * (Import-Schulname → Zielschule). Dieser Alias
 *  - wird beim Import automatisch angewendet (auch für weitere Lehrkräfte),
 *  - überlebt das Zurücksetzen der Daten,
 *  - kaskadiert sofort auf alle anderen offenen Konflikte derselben Schule.
 * Bei fehlender Schulangabe gibt es keinen sinnvollen Schlüssel → die Zuordnung
 * wird stattdessen als „gesperrt" (school_locked) markiert.
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
    .select(CONFLICT_SELECT)
    .eq("id", conflictId)
    .single();

  if (!conflict) {
    return NextResponse.json({ error: "Konflikt nicht gefunden" }, { status: 404 });
  }
  const c = conflict as unknown as Conflict;
  if (c.status !== "open") {
    return NextResponse.json(
      { error: "Konflikt wurde bereits bearbeitet" },
      { status: 409 }
    );
  }
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

  // Import-Schulname des Konflikts (für den Alias-Schlüssel). Bei fehlender
  // Schule (Platzhalter) ist kein sinnvoller Alias möglich.
  const importName = (c.school?.name ?? "").trim();
  const noSchool = !importName || importName === NO_SCHOOL_NAME;
  const aliasKey = noSchool ? "" : schoolMatchKey(importName);

  // Alias dauerhaft speichern (nur bei echtem Schulnamen).
  let aliasId: string | null = null;
  if (aliasKey) {
    const { data: aliasRow, error: aliasErr } = await admin
      .from("school_aliases")
      .upsert(
        {
          alias_key: aliasKey,
          alias_label: importName,
          canonical_name: schoolName,
          is_auto: false,
          created_by: auth.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "alias_key" }
      )
      .select("id")
      .single();
    if (aliasErr) {
      return NextResponse.json(
        { error: `Zuordnung konnte nicht gespeichert werden: ${aliasErr.message}` },
        { status: 500 }
      );
    }
    aliasId = aliasRow?.id ?? null;
  }

  // Den angefragten Konflikt zuweisen.
  const res = await assignOne(admin, c, targetSchoolId, aliasId, noSchool, auth.userId);
  if (!res.ok) {
    return NextResponse.json(
      {
        error: res.quota
          ? "Die gewählte Schule hat ihr Pensum für diese Rolle inzwischen ausgeschöpft – bitte eine andere Schule wählen."
          : res.error,
      },
      { status: res.quota ? 409 : 500 }
    );
  }

  // Kaskade: alle anderen offenen Konflikte derselben Schule automatisch
  // mitzuordnen (Quote wird je Schule geprüft – volle bleiben offen).
  let cascaded = 0;
  if (aliasKey) {
    const { data: others } = await admin
      .from("import_conflicts")
      .select(CONFLICT_SELECT)
      .eq("status", "open")
      .neq("id", c.id)
      .limit(1000);
    for (const o of (others ?? []) as unknown as Conflict[]) {
      if (!o.person_id) continue;
      if (schoolMatchKey((o.school?.name ?? "").trim()) !== aliasKey) continue;
      const r = await assignOne(admin, o, targetSchoolId, aliasId, false, auth.userId);
      if (r.ok) cascaded++;
    }
  }

  return NextResponse.json({ ok: true, cascaded });
}

type AssignResult = { ok: true } | { ok: false; quota?: boolean; error?: string };

/**
 * Zieht die Anmeldung einer Konflikt-Person auf die Zielschule um (oder legt
 * sie an), setzt alias_id/school_locked und schließt den Konflikt.
 */
async function assignOne(
  admin: SupabaseClient,
  conflict: Conflict,
  targetSchoolId: string,
  aliasId: string | null,
  lock: boolean,
  userId: string
): Promise<AssignResult> {
  const payload = conflict.payload ?? {};
  const { data: existing } = await admin
    .from("registrations")
    .select("id")
    .eq("event_id", conflict.event_id)
    .eq("person_id", conflict.person_id)
    .maybeSingle();

  const regError = existing
    ? (
        await admin
          .from("registrations")
          .update({
            school_id: targetSchoolId,
            status: "registered",
            alias_id: aliasId,
            school_locked: lock,
          })
          .eq("id", existing.id)
      ).error
    : (
        await admin.from("registrations").insert({
          event_id: conflict.event_id,
          school_id: targetSchoolId,
          person_id: conflict.person_id,
          role: conflict.role,
          status: "registered",
          alias_id: aliasId,
          school_locked: lock,
          workshops: payload.workshops ?? null,
          import_batch_id: conflict.import_batch_id,
        })
      ).error;

  if (regError) {
    if (isQuotaError(regError.message)) return { ok: false, quota: true };
    return { ok: false, error: `Zuweisung fehlgeschlagen: ${regError.message}` };
  }

  // persons.school_id wird BEWUSST NICHT geändert (Re-Import-Matching ohne
  // E-Mail bleibt stabil, keine Dubletten).

  const { error: updErr } = await admin
    .from("import_conflicts")
    .update({
      status: "approved",
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", conflict.id);
  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true };
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
