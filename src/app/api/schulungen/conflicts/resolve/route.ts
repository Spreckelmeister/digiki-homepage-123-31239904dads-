import { NextRequest, NextResponse } from "next/server";
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
};

/**
 * Löst einen Import-Konflikt auf:
 * - "reject":  Konflikt schließen, keine Anmeldung anlegen.
 * - "approve": Anmeldung MIT quota_override=true anlegen ("Trotz Quote
 *   zulassen") – der DB-Trigger lässt überschriebene Zeilen durch und
 *   das Flag bleibt bei späteren Re-Importen erhalten.
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

  const conflictId = typeof body.conflictId === "string" ? body.conflictId : "";
  const action = body.action === "approve" ? "approve" : body.action === "reject" ? "reject" : null;

  if (!conflictId || !action) {
    return NextResponse.json({ error: "Ungültige Parameter" }, { status: 400 });
  }

  const admin = createServiceClient();

  const { data: conflict } = await admin
    .from("import_conflicts")
    .select("id, status, event_id, school_id, person_id, role, payload, import_batch_id")
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

  if (action === "approve") {
    if (!conflict.person_id || !conflict.school_id) {
      return NextResponse.json(
        { error: "Konflikt enthält keine vollständigen Personendaten" },
        { status: 422 }
      );
    }

    const payload = (conflict.payload ?? {}) as { workshops?: string | null };

    const { data: existing } = await admin
      .from("registrations")
      .select("id, status")
      .eq("event_id", conflict.event_id)
      .eq("person_id", conflict.person_id)
      .maybeSingle();

    // Wurde die Person zwischenzeitlich regulär angemeldet (z. B. weil
    // ein Platz frei wurde), ist der Konflikt obsolet. Dann KEIN
    // quota_override setzen und den aktuelleren school_id-Snapshot nicht
    // mit dem veralteten Wert aus dem Konflikt überschreiben.
    if (existing && existing.status === "registered") {
      await admin
        .from("import_conflicts")
        .update({
          status: "approved",
          resolved_by: auth.userId,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", conflict.id);
      return NextResponse.json({ ok: true, action: "approve", note: "already_registered" });
    }

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
      return NextResponse.json(
        { error: `Anmeldung konnte nicht angelegt werden: ${error.message}` },
        { status: 500 }
      );
    }
  }

  const { error: updateError } = await admin
    .from("import_conflicts")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      resolved_by: auth.userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", conflict.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action });
}
