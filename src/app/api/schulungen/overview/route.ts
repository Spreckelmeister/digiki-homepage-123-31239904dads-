import { NextResponse } from "next/server";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";
import type { OverviewResponse, TrainingEvent } from "@/lib/schulungen/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liefert alle Dashboard-Daten (Stats, Schulungen, Quoten, Batches). */
export async function GET() {
  const auth = await requireSchulungenAccess();
  if (!auth.ok) return auth.response;

  const admin = createServiceClient();

  const [
    eventsRes,
    regCountsRes,
    quotasRes,
    batchesRes,
    conflictsCountRes,
    registrationsCountRes,
  ] = await Promise.all([
    admin
      .from("training_events")
      .select("id, kurs_nr, nlc_event_id, title, audience, start_date, end_date, location, anmeldung_url")
      .order("start_date", { ascending: true }),
    admin
      .from("registrations")
      .select("event_id")
      .eq("status", "registered"),
    admin
      .from("school_quota_usage")
      .select("*")
      .order("name", { ascending: true }),
    admin
      .from("import_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("import_conflicts")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    admin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("status", "registered"),
  ]);

  const countsByEvent = new Map<string, number>();
  for (const r of regCountsRes.data ?? []) {
    countsByEvent.set(r.event_id, (countsByEvent.get(r.event_id) ?? 0) + 1);
  }

  const events: TrainingEvent[] = (eventsRes.data ?? []).map((e) => ({
    ...e,
    registration_count: countsByEvent.get(e.id) ?? 0,
  }));

  const quotas = quotasRes.data ?? [];

  const response: OverviewResponse = {
    stats: {
      events_total: events.length,
      registrations_total: registrationsCountRes.count ?? 0,
      conflicts_open: conflictsCountRes.count ?? 0,
      schools_total: quotas.length,
    },
    events,
    quotas,
    recent_batches: batchesRes.data ?? [],
    is_admin: auth.isAdmin,
  };

  return NextResponse.json(response);
}
