import { NextRequest, NextResponse } from "next/server";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";

export const runtime = "nodejs";

/**
 * POST – Neue Schulung (Training Event) anlegen.
 *
 * Body (JSON):
 *   kurs_nr:   string  (Pflicht, z.B. "26.45-2601")
 *   start_date: string  (Pflicht, ISO-Datum YYYY-MM-DD)
 *   audience:  "teacher" | "leadership"
 *   title:     string  (optional – wird aus audience generiert, wenn leer)
 */
export async function POST(request: NextRequest) {
  const auth = await requireSchulungenAccess({ adminOnly: true });
  if (!auth.ok) return auth.response;

  let body: {
    kurs_nr?: string;
    start_date?: string;
    audience?: string;
    title?: string;
    anmeldung_url?: string;
    registration_deadline?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const kursNr = (body.kurs_nr ?? "").trim();
  const startDate = (body.start_date ?? "").trim();
  const audience = body.audience === "leadership" ? "leadership" : "teacher";
  const title =
    (body.title ?? "").trim() ||
    (audience === "leadership"
      ? "KOS-Fortbildung Schulleitungen"
      : "KOS-Fortbildung Lehrkräfte");
  const anmeldungUrl = (body.anmeldung_url ?? "").trim() || null;
  const registrationDeadline = (body.registration_deadline ?? "").trim() || null;

  if (!kursNr) {
    return NextResponse.json(
      { error: "Bitte eine KOS-Nummer eingeben." },
      { status: 400 }
    );
  }
  // Datum validieren (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || isNaN(Date.parse(startDate))) {
    return NextResponse.json(
      { error: "Bitte ein gültiges Datum eingeben." },
      { status: 400 }
    );
  }

  const admin = createServiceClient();

  // Duplikat-Check: gleiche KOS-Nummer + gleiches Datum?
  const { data: dup } = await admin
    .from("training_events")
    .select("id")
    .eq("kurs_nr", kursNr)
    .eq("start_date", startDate)
    .maybeSingle();

  if (dup) {
    return NextResponse.json(
      { error: `Eine Schulung mit der Nummer ${kursNr} am ${startDate} existiert bereits.` },
      { status: 409 }
    );
  }

  const { data: created, error } = await admin
    .from("training_events")
    .insert({
      kurs_nr: kursNr,
      title,
      audience,
      start_date: startDate,
      anmeldung_url: anmeldungUrl,
      registration_deadline: registrationDeadline,
    })
    .select("id, kurs_nr, title, audience, start_date, anmeldung_url, registration_deadline")
    .single();

  if (error || !created) {
    return NextResponse.json(
      { error: error?.message ?? "Schulung konnte nicht angelegt werden." },
      { status: 500 }
    );
  }

  return NextResponse.json({ event: created }, { status: 201 });
}

/**
 * DELETE – Schulung löschen (inkl. zugehörige Anmeldungen + Konflikte).
 *
 * Body (JSON):
 *   id: string (UUID der Schulung)
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireSchulungenAccess({ adminOnly: true });
  if (!auth.ok) return auth.response;

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const eventId = (body.id ?? "").trim();
  if (!eventId) {
    return NextResponse.json(
      { error: "Keine Schulungs-ID angegeben." },
      { status: 400 }
    );
  }

  const admin = createServiceClient();

  // Prüfen ob Schulung existiert
  const { data: event } = await admin
    .from("training_events")
    .select("id, kurs_nr")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    return NextResponse.json(
      { error: "Schulung nicht gefunden." },
      { status: 404 }
    );
  }

  // Anmeldungen zählen + löschen
  const { count: regCount } = await admin
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  // Konflikte löschen
  await admin
    .from("import_conflicts")
    .delete()
    .eq("event_id", eventId);

  // Anmeldungen löschen
  await admin
    .from("registrations")
    .delete()
    .eq("event_id", eventId);

  // Schulung selbst löschen
  const { error } = await admin
    .from("training_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    return NextResponse.json(
      { error: `Schulung konnte nicht gelöscht werden: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    deleted: true,
    kurs_nr: event.kurs_nr,
    registrations_removed: regCount ?? 0,
  });
}

/**
 * PATCH – Schulung aktualisieren.
 *
 * Body (JSON):
 *   id: string (UUID)
 *   kurs_nr?: string
 *   start_date?: string
 *   title?: string
 *   audience?: "teacher" | "leadership"
 *   anmeldung_url?: string
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireSchulungenAccess({ adminOnly: true });
  if (!auth.ok) return auth.response;

  let body: {
    id: string;
    kurs_nr?: string;
    start_date?: string;
    audience?: string;
    title?: string;
    anmeldung_url?: string;
    registration_deadline?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const eventId = (body.id ?? "").trim();
  if (!eventId) {
    return NextResponse.json(
      { error: "Keine Schulungs-ID angegeben." },
      { status: 400 }
    );
  }

  const updates: Record<string, any> = {};
  if (body.kurs_nr !== undefined) updates.kurs_nr = body.kurs_nr.trim();
  if (body.start_date !== undefined) updates.start_date = body.start_date.trim();
  if (body.audience !== undefined) updates.audience = body.audience === "leadership" ? "leadership" : "teacher";
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.anmeldung_url !== undefined) updates.anmeldung_url = body.anmeldung_url.trim() || null;
  if (body.registration_deadline !== undefined) updates.registration_deadline = body.registration_deadline.trim() || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen übermittelt." }, { status: 400 });
  }

  const admin = createServiceClient();

  const { data: updated, error } = await admin
    .from("training_events")
    .update(updates)
    .eq("id", eventId)
    .select("id, kurs_nr, title, audience, start_date, anmeldung_url, registration_deadline")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Schulung konnte nicht aktualisiert werden." },
      { status: 500 }
    );
  }

  return NextResponse.json({ event: updated });
}
