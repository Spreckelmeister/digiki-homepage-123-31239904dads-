import { NextRequest, NextResponse } from "next/server";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";
import type { EventParticipant, ParticipantRole } from "@/lib/schulungen/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  role: ParticipantRole;
  person: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
  school: { name: string | null; city: string | null; school_key: string | null } | null;
};

/** Teilnehmende einer Schulung (Name, Schule, E-Mail) – nur aktive Anmeldungen. */
export async function GET(request: NextRequest) {
  const auth = await requireSchulungenAccess();
  if (!auth.ok) return auth.response;

  const eventId = request.nextUrl.searchParams.get("event_id");
  if (!eventId) {
    return NextResponse.json({ error: "event_id fehlt" }, { status: 400 });
  }

  const admin = createServiceClient();
  const [{ data, error }, registeredRes] = await Promise.all([
    admin
      .from("registrations")
      .select(
        `role,
         person:persons (id, first_name, last_name, email),
         school:schools (name, city, school_key)`
      )
      .eq("event_id", eventId)
      .eq("status", "registered")
      .limit(500),
    // Registrierte Schulen = in der Bestandsaufnahme vorhanden.
    admin
      .from("school_participation")
      .select("school_key")
      .eq("in_bestandsaufnahme", true),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const registered = new Set(
    (registeredRes.data ?? [])
      .map((s) => s.school_key as string | null)
      .filter((k): k is string => !!k)
  );

  const participants: EventParticipant[] = ((data ?? []) as unknown as Row[]).map(
    (r) => ({
      person_id: r.person?.id ?? "",
      first_name: r.person?.first_name ?? "",
      last_name: r.person?.last_name ?? "",
      email: r.person?.email ?? null,
      school_name: r.school?.name ?? null,
      school_city: r.school?.city ?? null,
      role: r.role,
      school_registered: !!r.school?.school_key && registered.has(r.school.school_key),
    })
  );

  // Sortierung: nach Schule, dann Nachname – ergibt eine saubere Übersicht.
  participants.sort(
    (a, b) =>
      (a.school_name ?? "").localeCompare(b.school_name ?? "", "de") ||
      a.last_name.localeCompare(b.last_name, "de")
  );

  return NextResponse.json({ participants });
}
