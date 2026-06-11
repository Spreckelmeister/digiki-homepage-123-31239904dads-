import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requireSchulungenAccess,
  createServiceClient,
  isQuotaError,
} from "@/lib/schulungen/server";
import {
  parseRegistrationFile,
  normalizeKey,
  schoolKeyFromName,
  type ParsedRow,
} from "@/lib/schulungen/parse";
import type { ImportFileResult } from "@/lib/schulungen/types";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Importiert EINE Excel-Datei in eine Schulung. Das Frontend ruft die
 * Route pro Datei sequentiell auf (gleiche batchId), damit der
 * Fortschritt echt angezeigt werden kann und Requests klein bleiben.
 *
 * Upsert-Reihenfolge je Zeile: Schule → Person → Anmeldung.
 * Quotenverletzungen wirft der DB-Trigger (QUOTA_EXCEEDED); sie werden
 * hier abgefangen und als Konflikt gespeichert statt die Zeile zu
 * verwerfen.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auth = await requireSchulungenAccess();
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const file = form.get("file");
  const eventId = String(form.get("eventId") ?? "");
  const batchIdRaw = String(form.get("batchId") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Datei "${file.name}" ist größer als 10 MB` },
      { status: 400 }
    );
  }
  if (!eventId) {
    return NextResponse.json(
      { error: `Für "${file.name}" wurde keine Schulung ausgewählt` },
      { status: 400 }
    );
  }

  const admin = createServiceClient();

  const { data: event, error: eventError } = await admin
    .from("training_events")
    .select("id, kurs_nr, title, audience")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json(
      { error: "Schulung konnte nicht geladen werden – bitte erneut versuchen." },
      { status: 503 }
    );
  }
  if (!event) {
    return NextResponse.json(
      { error: "Die ausgewählte Schulung wurde nicht gefunden" },
      { status: 400 }
    );
  }

  let parsed;
  try {
    parsed = parseRegistrationFile(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    return NextResponse.json(
      {
        error: `"${file.name}": ${err instanceof Error ? err.message : "Datei konnte nicht gelesen werden"}`,
      },
      { status: 400 }
    );
  }

  // Batch holen oder anlegen (erste Datei eines Mehrfachimports legt ihn an)
  let batchId = batchIdRaw;
  if (batchId) {
    const { data: existing } = await admin
      .from("import_batches")
      .select("id")
      .eq("id", batchId)
      .single();
    if (!existing) batchId = "";
  }
  if (!batchId) {
    const { data: created, error: batchError } = await admin
      .from("import_batches")
      .insert({ created_by: auth.userId })
      .select("id")
      .single();
    if (batchError || !created) {
      return NextResponse.json(
        { error: "Import-Batch konnte nicht angelegt werden" },
        { status: 500 }
      );
    }
    batchId = created.id;
  }

  // Registrierte Schulen (= in der Bestandsaufnahme vorhanden). Teilnehmende
  // von NICHT registrierten Schulen dürfen eigentlich nicht teilnehmen und
  // werden als Warnung zurückgemeldet.
  const { data: regSchools } = await admin
    .from("school_participation")
    .select("school_key")
    .eq("in_bestandsaufnahme", true);
  const registeredSet = new Set(
    (regSchools ?? [])
      .map((s) => s.school_key as string | null)
      .filter((k): k is string => !!k)
  );
  const unregisteredRows: { name: string; school: string }[] = [];

  const counts = { new: 0, updated: 0, conflicts: 0, errors: 0, skipped: 0 };
  const errorMessages: string[] = [];
  // Bereits geparste Leer-/Fehlzeilen plus während des Imports
  // übersprungene Zeilen (z. B. zuvor abgelehnte Konflikte).
  const skippedRows = [...parsed.skipped];

  for (const row of parsed.rows) {
    try {
      const schoolId = await upsertSchool(admin, row);
      const personId = await upsertPerson(admin, row, schoolId);

      // Schule nicht bei DigiKI registriert (= nicht in der Bestandsaufnahme)?
      // → als Konflikt erfassen statt direkt anzumelden. So erscheint die
      //   Person in der Konflikt-Box und es muss bewusst entschieden werden
      //   („Trotzdem zulassen" oder „Ablehnen").
      if (!registeredSet.has(schoolKeyFromName(row.schoolName))) {
        unregisteredRows.push({
          name: [row.lastName, row.firstName].filter(Boolean).join(", "),
          school: row.schoolName.trim(),
        });
        const recorded = await recordConflict(admin, {
          batchId,
          eventId: event.id,
          schoolId,
          personId,
          role: event.audience,
          reason:
            "Schule nicht bei DigiKI registriert (Bestandsaufnahme fehlt) – Teilnahme eigentlich nicht möglich",
          payload: { ...row, kurs_nr: event.kurs_nr },
        });
        if (recorded === "skipped_rejected") counts.skipped++;
        else counts.conflicts++;
        continue;
      }

      const result = await upsertRegistration(admin, {
        row,
        eventId: event.id,
        kursNr: event.kurs_nr,
        audience: event.audience,
        schoolId,
        personId,
        batchId,
      });
      counts[result]++;
      if (result === "skipped") {
        skippedRows.push({
          row: row.row,
          reason: `${row.lastName}, ${row.firstName}: Konflikt wurde zuvor abgelehnt – übersprungen`,
        });
      }
    } catch (err) {
      counts.errors++;
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      errorMessages.push(
        `Zeile ${row.row} (${row.lastName}, ${row.firstName}): ${msg}`
      );
    }
  }

  const fileSummary = {
    name: file.name,
    kurs_nr: event.kurs_nr,
    rows: parsed.rows.length,
    new: counts.new,
    updated: counts.updated,
    conflicts: counts.conflicts,
    errors: counts.errors + skippedRows.length,
    unregistered: unregisteredRows.length,
  };

  // Batch-Zähler fortschreiben (Dateien werden sequentiell verarbeitet).
  // Schlägt der SELECT fehl, NICHT mit 0-Fallbacks weiterschreiben – das
  // würde die bisherigen Zähler/Dateien überschreiben.
  const { data: batch, error: batchReadError } = await admin
    .from("import_batches")
    .select("file_count, rows_total, rows_new, rows_updated, rows_conflict, rows_error, files")
    .eq("id", batchId)
    .single();

  if (batchReadError || !batch) {
    return NextResponse.json(
      { error: "Import-Batch konnte nicht aktualisiert werden – bitte erneut versuchen." },
      { status: 503 }
    );
  }

  const totals = {
    rows_total: batch.rows_total + fileSummary.rows,
    rows_new: batch.rows_new + counts.new,
    rows_updated: batch.rows_updated + counts.updated,
    rows_conflict: batch.rows_conflict + counts.conflicts,
    rows_error: batch.rows_error + fileSummary.errors,
  };

  await admin
    .from("import_batches")
    .update({
      ...totals,
      file_count: batch.file_count + 1,
      files: [...((batch.files as unknown[]) ?? []), fileSummary],
    })
    .eq("id", batchId);

  const result: ImportFileResult = {
    batch_id: batchId,
    file: {
      ...fileSummary,
      skipped: skippedRows,
      error_messages: errorMessages,
      unregistered_rows: unregisteredRows.slice(0, 100),
    },
    batch_totals: totals,
  };

  return NextResponse.json(result);
}

/**
 * Schule per normalisiertem Namen upserten. Felder werden nur
 * überschrieben, wenn die Datei sie liefert (educa-Export hat z. B.
 * keine Adresse und soll NLC-Adressdaten nicht löschen).
 */
async function upsertSchool(admin: SupabaseClient, row: ParsedRow): Promise<string> {
  const key = schoolKeyFromName(row.schoolName);
  const name = row.schoolName.replace(/\s+$/, "");

  const { data: existing } = await admin
    .from("schools")
    .select("id")
    .eq("school_key", key)
    .maybeSingle();

  const fields: Record<string, string> = { name };
  if (row.schoolStreet) fields.street = row.schoolStreet;
  if (row.schoolPlz) fields.plz = row.schoolPlz;
  if (row.schoolCity) fields.city = row.schoolCity;
  if (row.schoolPhone) fields.phone = row.schoolPhone;
  if (row.schoolType) fields.school_type = row.schoolType;

  if (existing) {
    const { error } = await admin
      .from("schools")
      .update(fields)
      .eq("id", existing.id);
    if (error) throw new Error(`Schule konnte nicht aktualisiert werden: ${error.message}`);
    return existing.id;
  }

  const { data: created, error } = await admin
    .from("schools")
    .insert({ school_key: key, ...fields })
    .select("id")
    .single();

  if (error || !created) {
    // Unique-Kollision (gleiche Schule weiter oben in der Datei angelegt)
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

/**
 * Person matchen: zuerst per E-Mail (NLC-Format), sonst per
 * normalisiertem Namen + Schule (educa-Format hat keine E-Mail).
 * So wird dieselbe Lehrkraft über beide Formate hinweg erkannt.
 */
async function upsertPerson(
  admin: SupabaseClient,
  row: ParsedRow,
  schoolId: string
): Promise<string> {
  const firstNorm = normalizeKey(row.firstName);
  const lastNorm = normalizeKey(row.lastName);

  if (row.email) {
    // E-Mails werden beim Parsen immer kleingeschrieben (parseEmail),
    // daher ist .eq korrekt und konsistent mit dem Unique-Index auf
    // lower(email). Kein .ilike, da '_' dort ein Wildcard wäre und
    // Adressen wie "simons_adresse@…" falsch matchen würden.
    const { data: byEmail } = await admin
      .from("persons")
      .select("id")
      .eq("email", row.email)
      .maybeSingle();
    if (byEmail) {
      // school_id nur aktualisieren, wenn das nicht mit einer
      // bestehenden gleichnamigen Person an der Zielschule kollidiert
      // (UNIQUE school_id,last_norm,first_norm). Bei Kollision bleibt
      // die Person an ihrer bisherigen Schule – sauberer als ein
      // stiller Constraint-Fehler.
      const { data: clash } = await admin
        .from("persons")
        .select("id")
        .eq("school_id", schoolId)
        .eq("last_norm", lastNorm)
        .eq("first_norm", firstNorm)
        .neq("id", byEmail.id)
        .maybeSingle();
      const update: Record<string, string> = {
        first_name: row.firstName,
        last_name: row.lastName,
        first_norm: firstNorm,
        last_norm: lastNorm,
      };
      if (!clash) update.school_id = schoolId;
      const { error } = await admin
        .from("persons")
        .update(update)
        .eq("id", byEmail.id);
      if (error)
        throw new Error(`Person konnte nicht aktualisiert werden: ${error.message}`);
      return byEmail.id;
    }
  }

  const { data: byName } = await admin
    .from("persons")
    .select("id, email")
    .eq("school_id", schoolId)
    .eq("last_norm", lastNorm)
    .eq("first_norm", firstNorm)
    .maybeSingle();

  if (byName) {
    if (row.email && !byName.email) {
      const { error } = await admin
        .from("persons")
        .update({ email: row.email })
        .eq("id", byName.id);
      // E-Mail-Backfill kann an persons_email_unique scheitern, wenn die
      // Adresse bereits einer anderen Person gehört (z. B. Sammeladresse).
      // Das ist kein harter Importfehler – der Name+Schule-Match bleibt
      // gültig, nur die E-Mail wird dann nicht gesetzt.
      if (error && !/duplicate key|unique/i.test(error.message)) {
        throw new Error(`Person konnte nicht aktualisiert werden: ${error.message}`);
      }
    }
    return byName.id;
  }

  const { data: created, error } = await admin
    .from("persons")
    .insert({
      first_name: row.firstName,
      last_name: row.lastName,
      first_norm: firstNorm,
      last_norm: lastNorm,
      email: row.email,
      school_id: schoolId,
    })
    .select("id")
    .single();

  if (error || !created) {
    const { data: retry } = await admin
      .from("persons")
      .select("id")
      .eq("school_id", schoolId)
      .eq("last_norm", lastNorm)
      .eq("first_norm", firstNorm)
      .maybeSingle();
    if (retry) return retry.id;
    throw new Error(error?.message ?? "Person konnte nicht angelegt werden");
  }
  return created.id;
}

/**
 * Anmeldung upserten. Wirft der Quoten-Trigger QUOTA_EXCEEDED, wird ein
 * offener Konflikt angelegt bzw. aktualisiert (idempotent bei
 * Mehrfachimport derselben Datei).
 */
async function upsertRegistration(
  admin: SupabaseClient,
  args: {
    row: ParsedRow;
    eventId: string;
    kursNr: string;
    audience: "teacher" | "leadership";
    schoolId: string;
    personId: string;
    batchId: string;
  }
): Promise<"new" | "updated" | "conflicts" | "skipped"> {
  const { row, eventId, kursNr, audience, schoolId, personId, batchId } = args;

  const { data: existing } = await admin
    .from("registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("person_id", personId)
    .maybeSingle();

  // workshops nur überschreiben, wenn die Datei einen Wert liefert –
  // sonst würde ein NLC-Re-Import (ohne Workshops) eine zuvor per
  // educa gesetzte Workshop-Wahl mit null überschreiben.
  const updateFields: Record<string, unknown> = {
    school_id: schoolId,
    import_batch_id: batchId,
  };
  if (row.workshops !== null) updateFields.workshops = row.workshops;

  const error = existing
    ? (
        await admin
          .from("registrations")
          .update(updateFields)
          .eq("id", existing.id)
      ).error
    : (
        await admin.from("registrations").insert({
          event_id: eventId,
          school_id: schoolId,
          person_id: personId,
          role: audience,
          status: "registered",
          workshops: row.workshops,
          import_batch_id: batchId,
        })
      ).error;

  if (!error) return existing ? "updated" : "new";

  if (!isQuotaError(error.message)) {
    throw new Error(error.message);
  }

  const recorded = await recordConflict(admin, {
    batchId,
    eventId,
    schoolId,
    personId,
    role: audience,
    reason: friendlyQuotaReason(error.message, audience),
    payload: { ...row, kurs_nr: kursNr },
  });
  // War der Konflikt für diese Person/Schulung bereits abgelehnt, wird
  // er nicht erneut geöffnet – die Admin-Entscheidung bleibt bestehen.
  return recorded === "skipped_rejected" ? "skipped" : "conflicts";
}

function friendlyQuotaReason(triggerMessage: string, role: string): string {
  const match = triggerMessage.match(/(\d+)\/(\d+)/);
  const used = match ? match[0] : null;
  if (role === "leadership") {
    return `Quote überschritten: ${used ?? "1/1"} Schulleitung bereits angemeldet (max. 1 je Schule, über alle Schulungen)`;
  }
  return `Quote überschritten: ${used ?? "2/2"} Lehrkräfte bereits angemeldet (max. 2 je Schule, über alle Schulungen)`;
}

async function recordConflict(
  admin: SupabaseClient,
  conflict: {
    batchId: string;
    eventId: string;
    schoolId: string;
    personId: string;
    role: string;
    reason: string;
    payload: Record<string, unknown>;
  }
): Promise<"recorded" | "skipped_rejected"> {
  // Bestehende Konflikt-Entscheidung für dieselbe Person/Schulung prüfen.
  const { data: prior } = await admin
    .from("import_conflicts")
    .select("id, status")
    .eq("event_id", conflict.eventId)
    .eq("person_id", conflict.personId)
    .in("status", ["open", "rejected"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Bereits abgelehnt → Entscheidung respektieren, keinen neuen offenen
  // Konflikt anlegen (Idempotenz bei Re-Import).
  if (prior?.status === "rejected") {
    return "skipped_rejected";
  }

  if (prior?.status === "open") {
    const { error } = await admin
      .from("import_conflicts")
      .update({
        import_batch_id: conflict.batchId,
        school_id: conflict.schoolId,
        role: conflict.role,
        reason: conflict.reason,
        payload: conflict.payload,
      })
      .eq("id", prior.id);
    if (error) throw new Error(`Konflikt konnte nicht aktualisiert werden: ${error.message}`);
    return "recorded";
  }

  const { error } = await admin.from("import_conflicts").insert({
    import_batch_id: conflict.batchId,
    event_id: conflict.eventId,
    school_id: conflict.schoolId,
    person_id: conflict.personId,
    role: conflict.role,
    reason: conflict.reason,
    payload: conflict.payload,
  });
  if (error) throw new Error(`Konflikt konnte nicht gespeichert werden: ${error.message}`);
  return "recorded";
}
