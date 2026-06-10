import { NextRequest, NextResponse } from "next/server";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";
import type { ConflictItem } from "@/lib/schulungen/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Listet Import-Konflikte (Standard: alle offenen; optional gefiltert
 * per ?batch_id=… oder ?status=…).
 */
export async function GET(request: NextRequest) {
  const auth = await requireSchulungenAccess();
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

  return NextResponse.json({ conflicts: (data ?? []) as unknown as ConflictItem[] });
}
