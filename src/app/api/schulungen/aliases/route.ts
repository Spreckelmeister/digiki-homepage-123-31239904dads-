import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";
import { schoolKeyFromName } from "@/lib/schulungen/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

/** Liste der gespeicherten Schul-Zuordnungen (Aliase) inkl. Nutzungszahl. */
export async function GET() {
  const auth = await requireSchulungenAccess();
  if (!auth.ok) return auth.response;

  const admin = createServiceClient();
  const [{ data: aliases, error }, { data: regs }] = await Promise.all([
    admin
      .from("school_aliases")
      .select("id, alias_key, alias_label, canonical_name, is_auto, created_at")
      .order("is_auto", { ascending: true })
      .order("alias_label", { ascending: true }),
    admin.from("registrations").select("alias_id").not("alias_id", "is", null),
  ]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts = new Map<string, number>();
  for (const r of (regs ?? []) as Array<{ alias_id: string | null }>) {
    if (r.alias_id) counts.set(r.alias_id, (counts.get(r.alias_id) ?? 0) + 1);
  }

  return NextResponse.json({
    aliases: (aliases ?? []).map((a) => ({
      ...a,
      usage: counts.get(a.id) ?? 0,
    })),
  });
}

/**
 * Entfernt eine Zuordnung und macht ihre Folgen rückgängig: Alle Anmeldungen,
 * die über diesen Alias zugeordnet wurden, werden zurückgesetzt – auf einen
 * automatischen Treffer (falls die Schule jetzt erkannt wird) oder zurück auf
 * den Import-Schulnamen samt erneut geöffnetem Konflikt.
 */
export async function DELETE(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auth = await requireSchulungenAccess();
  if (!auth.ok) return auth.response;

  let id = "";
  try {
    const body = (await request.json()) as { id?: unknown };
    id = typeof body.id === "string" ? body.id : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: "Ungültige Parameter" }, { status: 400 });
  }

  const admin = createServiceClient();

  const { data: alias } = await admin
    .from("school_aliases")
    .select("id, alias_label")
    .eq("id", id)
    .single();
  if (!alias) {
    return NextResponse.json({ error: "Zuordnung nicht gefunden" }, { status: 404 });
  }

  // Zurück auf den ursprünglichen Import-Schulnamen, damit der Admin neu
  // entscheiden kann (manuell zuweisen ODER beim nächsten Import automatisch
  // neu zuordnen lassen).
  const revertSchoolId = await upsertSchoolByName(admin, alias.alias_label);

  // Betroffene Anmeldungen einsammeln.
  const { data: affected } = await admin
    .from("registrations")
    .select("id, event_id, person_id, role, workshops, import_batch_id")
    .eq("alias_id", id);

  let reverted = 0;
  for (const r of (affected ?? []) as Array<{
    id: string;
    event_id: string;
    person_id: string;
    role: string;
    workshops: string | null;
    import_batch_id: string | null;
  }>) {
    // Anmeldung neu setzen (delete+insert umgeht den Update-Pfad des
    // Quoten-Triggers; Override hält sie unabhängig von der Quote registriert).
    await admin.from("registrations").delete().eq("id", r.id);
    const { error: insErr } = await admin.from("registrations").insert({
      event_id: r.event_id,
      school_id: revertSchoolId,
      person_id: r.person_id,
      role: r.role,
      status: "registered",
      quota_override: true,
      school_locked: false,
      alias_id: null,
      workshops: r.workshops,
      import_batch_id: r.import_batch_id,
    });
    if (insErr) continue;
    reverted++;

    // Konflikt wieder öffnen, damit die Zuordnung neu entschieden wird.
    const { data: prior } = await admin
      .from("import_conflicts")
      .select("id")
      .eq("event_id", r.event_id)
      .eq("person_id", r.person_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const reason =
      "Schulzuordnung wurde entfernt – bitte erneut zuweisen (oder beim nächsten Import automatisch neu zuordnen lassen)";
    if (prior) {
      await admin
        .from("import_conflicts")
        .update({
          status: "open",
          school_id: revertSchoolId,
          role: r.role,
          reason,
          resolved_by: null,
          resolved_at: null,
        })
        .eq("id", prior.id);
    } else {
      await admin.from("import_conflicts").insert({
        import_batch_id: r.import_batch_id,
        event_id: r.event_id,
        school_id: revertSchoolId,
        person_id: r.person_id,
        role: r.role,
        reason,
        payload: { workshops: r.workshops },
      });
    }
  }

  await admin.from("school_aliases").delete().eq("id", id);

  return NextResponse.json({ ok: true, reverted });
}

/** Schulname → schools.id (vorhandene wiederverwenden, sonst anlegen). */
async function upsertSchoolByName(
  admin: SupabaseClient,
  name: string
): Promise<string> {
  const key = schoolKeyFromName(name);
  const { data: existing } = await admin
    .from("schools")
    .select("id")
    .eq("school_key", key)
    .maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await admin
    .from("schools")
    .insert({ school_key: key, name })
    .select("id")
    .single();
  if (error || !created) {
    const { data: retry } = await admin
      .from("schools")
      .select("id")
      .eq("school_key", key)
      .maybeSingle();
    if (retry) return retry.id;
    throw new Error(error?.message ?? "Schule konnte nicht angelegt werden");
  }
  return created.id;
}
