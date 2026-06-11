import { NextRequest, NextResponse } from "next/server";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";
import { buildRegisteredSchools, isRegisteredSchool } from "@/lib/schulungen/parse";
import type { ConflictItem } from "@/lib/schulungen/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Listet Import-Konflikte (Standard: alle offenen; optional gefiltert
 * per ?batch_id=… oder ?status=…).
 */
export async function GET(request: NextRequest) {
  const auth = await requireSchulungenAccess({ adminOnly: true });
  if (!auth.ok) return auth.response;

  const admin = createServiceClient();
  const batchId = request.nextUrl.searchParams.get("batch_id");
  const status = request.nextUrl.searchParams.get("status") ?? "open";

  let query = admin
    .from("import_conflicts")
    .select(
      `id, status, role, reason, created_at,
       school:schools (id, name, city),
       person:persons (id, first_name, last_name, email),
       event:training_events (id, kurs_nr, title, start_date)`
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status !== "all") query = query.eq("status", status);
  if (batchId) query = query.eq("import_batch_id", batchId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let conflicts = (data ?? []) as unknown as ConflictItem[];

  // Selbstheilung: Ein „Schule nicht registriert"-Konflikt ist eine LIVE-
  // Bedingung. Füllt die Schule die Bestandsaufnahme erst nach dem Import aus
  // (oder verbessert sich das Matching), ist der gespeicherte offene Konflikt
  // veraltet. Solche Konflikte werden hier automatisch geschlossen, damit sie
  // nicht fälschlich als offen erscheinen.
  if (status === "open" || status === "all") {
    const schoolConflicts = conflicts.filter(
      (c) => c.status === "open" && /registriert/i.test(c.reason) && c.school?.name
    );
    if (schoolConflicts.length > 0) {
      const { data: bestand } = await admin
        .from("bestandsaufnahme_responses")
        .select("school_name")
        .not("school_name", "is", null);
      const registeredSchools = buildRegisteredSchools(
        (bestand ?? []).map((b) => b.school_name as string | null)
      );
      const staleIds = schoolConflicts
        .filter((c) => isRegisteredSchool(c.school!.name, registeredSchools))
        .map((c) => c.id);
      if (staleIds.length > 0) {
        await admin
          .from("import_conflicts")
          .update({
            status: "approved",
            resolved_by: auth.userId,
            resolved_at: new Date().toISOString(),
          })
          .in("id", staleIds);
        const stale = new Set(staleIds);
        conflicts = conflicts.filter((c) => !stale.has(c.id));
      }
    }
  }

  return NextResponse.json({ conflicts });
}
