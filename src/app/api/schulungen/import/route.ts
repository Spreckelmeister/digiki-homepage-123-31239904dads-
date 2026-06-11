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
  schoolMatchKey,
  buildRegisteredSchools,
  matchRegisteredSchool,
  NO_SCHOOL_NAME,
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

  // Registrierte Schulen (= in der Bestandsaufnahme vorhanden). Die Erkennung
  // ist tolerant (Schultyp-Wörter/Komma-Zusätze ignoriert, markante Namen
  // dürfen einen Orts-Zusatz haben – siehe matchRegisteredSchool).
  const { data: bestandSchools } = await admin
    .from("bestandsaufnahme_responses")
    .select("school_name")
    .not("school_name", "is", null);
  const registeredSchools = buildRegisteredSchools(
    (bestandSchools ?? []).map((b) => b.school_name as string | null)
  );

  // Persistente Zuordnungsliste (Aliase): manuell gepflegte Abbildung
  // „Import-Schulname → registrierte Schule". Wird VOR dem Auto-Matching
  // geprüft und überlebt das Zurücksetzen der Daten.
  const { data: aliasRows } = await admin
    .from("school_aliases")
    .select("id, alias_key, canonical_name");
  const aliasMap = new Map<string, { id: string; canonical: string }>();
  for (const a of (aliasRows ?? []) as Array<{
    id: string;
    alias_key: string;
    canonical_name: string;
  }>) {
    aliasMap.set(a.alias_key, { id: a.id, canonical: a.canonical_name });
  }

  const unregisteredRows: { name: string; school: string }[] = [];

  const counts = { new: 0, updated: 0, conflicts: 0, errors: 0, skipped: 0 };
  const errorMessages: string[] = [];
  // Bereits geparste Leer-/Fehlzeilen plus während des Imports
  // übersprungene Zeilen (z. B. zuvor abgelehnte Konflikte).
  const skippedRows = [...parsed.skipped];

  const total = parsed.rows.length;
  // Fortschritt wird gedrosselt gemeldet (~50 Updates), damit große
  // Dateien nicht hunderte Events erzeugen, kleine aber flüssig laufen.
  const step = Math.max(1, Math.ceil(total / 50));

  // Antwort als NDJSON-Stream: pro verarbeiteter Zeile (gedrosselt) ein
  // {type:"progress"}-Event, am Ende {type:"result"} mit dem vollständigen
  // ImportFileResult. So zeigt das Dashboard echten Zeilen-Fortschritt
  // statt nur 0 % / 100 %.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      emit({ type: "progress", processed: 0, total });

      let processed = 0;
      for (const row of parsed.rows) {
        try {
          // Schulzuordnung bestimmen (Reihenfolge):
          //  1. Persistenter Alias (manuelle Zuordnungsliste) – greift auch
          //     für weitere Lehrkräfte derselben Schule.
          //  2. Automatisches, tolerantes Matching gegen die Bestandsaufnahme.
          //  3. Sonst: kein Treffer → Konflikt (bzw. Platzhalter ohne Schule).
          const noSchool = row.schoolName.trim() === "";
          const importKey = noSchool ? "" : schoolMatchKey(row.schoolName);
          const existingAlias = importKey ? aliasMap.get(importKey) : undefined;
          let canonical: string | null;
          let aliasId: string | null;
          if (existingAlias) {
            canonical = existingAlias.canonical;
            aliasId = existingAlias.id;
          } else if (!noSchool) {
            canonical = matchRegisteredSchool(row.schoolName, registeredSchools);
            // Auch automatische Treffer als Alias festhalten – so sind ALLE
            // Verbindungen in der Zuordnungsliste sichtbar und rückgängig.
            aliasId = canonical
              ? await ensureAutoAlias(admin, importKey, row.schoolName.trim(), canonical, aliasMap)
              : null;
          } else {
            canonical = null;
            aliasId = null;
          }
          const schoolId = await upsertSchool(
            admin,
            row,
            noSchool && !canonical ? NO_SCHOOL_NAME : canonical
          );
          const personId = await upsertPerson(admin, row, schoolId);

          // Manuell zugewiesene Schule schützen: Hat die Person für diese
          // Schulung eine GESPERRTE Anmeldung (school_locked, via „Schule
          // zuweisen"), bleibt ihre Schule + Konfliktentscheidung beim
          // Re-Import unverändert – nur Workshops/Batch werden aktualisiert.
          const { data: lockedReg } = await admin
            .from("registrations")
            .select("id, school_locked")
            .eq("event_id", event.id)
            .eq("person_id", personId)
            .maybeSingle();

          // Kein Bestandsaufnahme-Treffer (Schule nicht registriert ODER gar
          // keine Schule angegeben)? → Person wird trotzdem direkt angemeldet
          // (erscheint unter dem Termin), aber als offener Konflikt markiert.
          // „Ablehnen" entfernt die Anmeldung wieder, „Zulassen" behält sie,
          // „Schule zuweisen" ordnet sie einer registrierten Schule zu.
          if (lockedReg?.school_locked) {
            const fields: Record<string, unknown> = { import_batch_id: batchId };
            if (row.workshops !== null) fields.workshops = row.workshops;
            await admin
              .from("registrations")
              .update(fields)
              .eq("id", lockedReg.id);
            counts.updated++;
          } else if (!canonical) {
            unregisteredRows.push({
              name: [row.lastName, row.firstName].filter(Boolean).join(", "),
              school: noSchool ? "— keine Schule angegeben —" : row.schoolName.trim(),
            });
            const recorded = await recordConflict(admin, {
              batchId,
              eventId: event.id,
              schoolId,
              personId,
              role: event.audience,
              reason: noSchool
                ? "Keine Schule angegeben – bitte im Dashboard eine Schule zuweisen"
                : "Schule nicht bei DigiKI registriert (Bestandsaufnahme fehlt) – Teilnahme eigentlich nicht möglich",
              payload: { ...row, kurs_nr: event.kurs_nr },
            });
            if (recorded === "skipped_rejected") {
              // Bewusst abgelehnt → nicht (wieder) anmelden.
              counts.skipped++;
            } else {
              // Anmeldung anlegen/aktualisieren (Quote umgehen – der
              // Schul-Status ist der entscheidende Punkt, nicht die Quote).
              await registerOverride(admin, {
                eventId: event.id,
                schoolId,
                personId,
                role: event.audience,
                workshops: row.workshops,
                batchId,
              });
              if (recorded === "skipped_approved") counts.updated++;
              else counts.conflicts++;
            }
          } else {
            const result = await upsertRegistration(admin, {
              row,
              eventId: event.id,
              kursNr: event.kurs_nr,
              audience: event.audience,
              schoolId,
              personId,
              batchId,
              aliasId,
            });
            counts[result]++;
            if (result === "skipped") {
              skippedRows.push({
                row: row.row,
                reason: `${row.lastName}, ${row.firstName}: Konflikt wurde zuvor abgelehnt – übersprungen`,
              });
            }
          }
        } catch (err) {
          counts.errors++;
          const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
          errorMessages.push(
            `Zeile ${row.row} (${row.lastName}, ${row.firstName}): ${msg}`
          );
        }
        processed++;
        if (processed === total || processed % step === 0) {
          emit({ type: "progress", processed, total });
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
        emit({
          type: "error",
          error:
            "Import-Batch konnte nicht aktualisiert werden – bitte erneut versuchen.",
        });
        controller.close();
        return;
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

      emit({ type: "result", result });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Hält einen automatischen Schul-Treffer als Alias fest (sichtbar in der
 * Zuordnungsliste, rückgängig machbar). Überschreibt KEINE bestehenden
 * (insb. manuellen) Aliase – `ignoreDuplicates`. Cached im aliasMap, damit
 * weitere Zeilen derselben Schule keinen erneuten Upsert auslösen.
 */
async function ensureAutoAlias(
  admin: SupabaseClient,
  key: string,
  label: string,
  canonical: string,
  cache: Map<string, { id: string; canonical: string }>
): Promise<string | null> {
  const cached = cache.get(key);
  if (cached) return cached.id;
  const { data: ins } = await admin
    .from("school_aliases")
    .upsert(
      { alias_key: key, alias_label: label, canonical_name: canonical, is_auto: true },
      { onConflict: "alias_key", ignoreDuplicates: true }
    )
    .select("id");
  let id = (ins?.[0]?.id as string | undefined) ?? undefined;
  if (!id) {
    const { data: ex } = await admin
      .from("school_aliases")
      .select("id")
      .eq("alias_key", key)
      .maybeSingle();
    id = ex?.id;
  }
  if (id) cache.set(key, { id, canonical });
  return id ?? null;
}

/**
 * Schule per normalisiertem Namen upserten. Felder werden nur
 * überschrieben, wenn die Datei sie liefert (educa-Export hat z. B.
 * keine Adresse und soll NLC-Adressdaten nicht löschen).
 */
async function upsertSchool(
  admin: SupabaseClient,
  row: ParsedRow,
  canonicalName?: string | null
): Promise<string> {
  // Bei erkannter Registrierung den Bestandsaufnahme-Namen verwenden, sonst
  // den Namen aus der Importdatei.
  const displayName = (canonicalName ?? row.schoolName).replace(/\s+$/, "");
  const key = schoolKeyFromName(displayName);
  const name = displayName;

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
    aliasId: string | null;
  }
): Promise<"new" | "updated" | "conflicts" | "skipped"> {
  const { row, eventId, kursNr, audience, schoolId, personId, batchId, aliasId } = args;

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
    alias_id: aliasId,
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
          alias_id: aliasId,
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
  // Zuvor abgelehnt → Entscheidung respektieren, nicht (wieder) anmelden.
  if (recorded === "skipped_rejected") return "skipped";
  // Person trotz Quotenüberschreitung direkt anmelden (Override), damit sie
  // unter dem Termin erscheint – in der Teilnehmerliste mit Quoten-Hinweis.
  // „Ablehnen" entfernt die Anmeldung wieder, „Trotz Quote zulassen" behält
  // sie und schließt den Konflikt.
  await registerOverride(admin, {
    eventId,
    schoolId,
    personId,
    role: audience,
    workshops: row.workshops,
    batchId,
  });
  return recorded === "skipped_approved" ? "updated" : "conflicts";
}

/**
 * Meldet eine Person direkt an und umgeht dabei die Quote (quota_override).
 * Für Teilnehmende nicht registrierter Schulen: Sie sollen unter dem Termin
 * erscheinen, werden aber separat als Konflikt geführt.
 */
async function registerOverride(
  admin: SupabaseClient,
  args: {
    eventId: string;
    schoolId: string;
    personId: string;
    role: "teacher" | "leadership";
    workshops: string | null;
    batchId: string;
  }
): Promise<void> {
  const { eventId, schoolId, personId, role, workshops, batchId } = args;
  const { data: existing } = await admin
    .from("registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("person_id", personId)
    .maybeSingle();

  const fields: Record<string, unknown> = {
    school_id: schoolId,
    quota_override: true,
    status: "registered",
    import_batch_id: batchId,
  };
  if (workshops !== null) fields.workshops = workshops;

  const { error } = existing
    ? await admin.from("registrations").update(fields).eq("id", existing.id)
    : await admin.from("registrations").insert({
        event_id: eventId,
        school_id: schoolId,
        person_id: personId,
        role,
        status: "registered",
        quota_override: true,
        workshops,
        import_batch_id: batchId,
      });
  if (error) throw new Error(`Anmeldung konnte nicht angelegt werden: ${error.message}`);
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
): Promise<"recorded" | "skipped_rejected" | "skipped_approved"> {
  // Bestehende Konflikt-Entscheidung für dieselbe Person/Schulung prüfen.
  const { data: prior } = await admin
    .from("import_conflicts")
    .select("id, status")
    .eq("event_id", conflict.eventId)
    .eq("person_id", conflict.personId)
    .in("status", ["open", "rejected", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Bereits abgelehnt → Entscheidung respektieren, keinen neuen offenen
  // Konflikt anlegen (Idempotenz bei Re-Import).
  if (prior?.status === "rejected") {
    return "skipped_rejected";
  }
  // Bereits zugelassen → nicht erneut als Konflikt öffnen.
  if (prior?.status === "approved") {
    return "skipped_approved";
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
