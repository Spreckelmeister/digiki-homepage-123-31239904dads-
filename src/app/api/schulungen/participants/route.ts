import { NextRequest, NextResponse } from "next/server";
import {
  requireSchulungenAccess,
  createServiceClient,
  isQuotaError,
  resolveSchool,
} from "@/lib/schulungen/server";
import {
  normalizeKey,
  schoolMatchKey,
  schoolKeyMatches,
  buildRegisteredSchools,
  isRegisteredSchool,
  NO_SCHOOL_NAME,
} from "@/lib/schulungen/parse";
import type { EventParticipant, ParticipantRole } from "@/lib/schulungen/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

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
  const [{ data, error }, bestandRes, conflictRes] = await Promise.all([
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
    // Bestandsaufnahme-Schulen (registriert) inkl. Kontakt-E-Mail (Fallback).
    admin
      .from("bestandsaufnahme_responses")
      .select("school_name, contact_email"),
    // Konflikte dieser Schulung (offen + zugelassen) – um Über-Quote-
    // Anmeldungen zu erkennen (Grund enthält „Quote") und zu unterscheiden,
    // ob sie noch oben bearbeitet werden müssen (offen) oder schon
    // entschieden sind (zugelassen).
    admin
      .from("import_conflicts")
      .select("person_id, status, reason")
      .eq("event_id", eventId)
      .in("status", ["open", "approved"]),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Tolerante Erkennung der registrierten Schulen + Mapping auf die
  // Schul-Account-E-Mail (für den Fallback). Schultyp-Wörter werden ignoriert.
  const bestandRows = (bestandRes.data ?? []) as Array<{
    school_name: string | null;
    contact_email: string | null;
  }>;
  const registeredSchools = buildRegisteredSchools(
    bestandRows.map((c) => c.school_name)
  );
  const schoolEmail = new Map<string, string>(); // matchKey → contact_email
  for (const c of bestandRows) {
    if (!c.school_name || /test|admin/i.test(c.school_name)) continue;
    const key = schoolMatchKey(c.school_name);
    if (key && c.contact_email && !schoolEmail.has(key)) {
      schoolEmail.set(key, c.contact_email);
    }
  }
  // Quoten-Konflikte je Person: Wert = true, wenn (noch) offen. Nur Konflikte,
  // deren Grund „Quote" enthält (Schul-Konflikte werden hier ignoriert – die
  // werden über school_registered abgebildet).
  const quotaConflict = new Map<string, boolean>();
  for (const c of (conflictRes.data ?? []) as Array<{
    person_id: string | null;
    status: string;
    reason: string | null;
  }>) {
    if (!c.person_id || !/quote/i.test(c.reason ?? "")) continue;
    const open = c.status === "open";
    quotaConflict.set(c.person_id, (quotaConflict.get(c.person_id) ?? false) || open);
  }

  // Schul-Account-E-Mail für einen Schulnamen finden (exakt oder enthalten).
  const lookupSchoolEmail = (name: string | null | undefined): string | null => {
    if (!name) return null;
    const k = schoolMatchKey(name);
    for (const [mk, email] of schoolEmail) {
      if (schoolKeyMatches(k, mk)) return email;
    }
    return null;
  };

  const participants: EventParticipant[] = ((data ?? []) as unknown as Row[]).map(
    (r) => {
      const isReg = isRegisteredSchool(r.school?.name ?? "", registeredSchools);
      const ownEmail = r.person?.email ?? null;
      // Ohne eigene E-Mail + Schule registriert → Schul-Account-E-Mail.
      const fallback = !ownEmail && isReg ? lookupSchoolEmail(r.school?.name) : null;
      // Über der Quote = registrierte Schule MIT einem Quoten-Konflikt
      // (offen oder zugelassen). Auf den Konflikt-Grund gestützt, nicht auf
      // das (klebrige) Override-Flag – so erscheint eine ehemals nicht
      // erkannte, jetzt registrierte Schule NICHT fälschlich als „über Quote".
      const personId = r.person?.id ?? "";
      const schoolMissing = r.school?.name === NO_SCHOOL_NAME;
      const quotaWarning = isReg && quotaConflict.has(personId);
      return {
        person_id: personId,
        first_name: r.person?.first_name ?? "",
        last_name: r.person?.last_name ?? "",
        email: ownEmail ?? fallback,
        school_name: schoolMissing ? null : r.school?.name ?? null,
        school_city: r.school?.city ?? null,
        role: r.role,
        school_registered: isReg,
        school_missing: schoolMissing,
        quota_warning: quotaWarning,
        // Quoten-Konflikt noch offen → muss oben erst entschieden werden.
        quota_pending: quotaWarning && quotaConflict.get(personId) === true,
        email_via_school: !ownEmail && !!fallback,
      };
    }
  );

  // Sortierung: nach Schule, dann Nachname – ergibt eine saubere Übersicht.
  participants.sort(
    (a, b) =>
      (a.school_name ?? "").localeCompare(b.school_name ?? "", "de") ||
      a.last_name.localeCompare(b.last_name, "de")
  );

  return NextResponse.json({ participants });
}

type PatchBody = {
  event_id?: unknown;
  person_id?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  /** null oder "" = E-Mail entfernen. */
  email?: unknown;
  role?: unknown;
  /** Name der Zielschule (aus dem Schul-Picker). */
  school_name?: unknown;
  /** Zweiter Versuch nach Quota-Bestätigung („Trotzdem speichern"). */
  override?: unknown;
};

/**
 * PATCH – Eine Anmeldung direkt in der Teilnehmerliste bearbeiten
 * (Name, E-Mail, Schule, Rolle). Nur Admins.
 *
 * Quoten-Ablauf: Ein Schul-/Rollenwechsel läuft zunächst als normales
 * UPDATE, damit der Trigger enforce_school_quota prüft. Schlägt er mit
 * QUOTA_EXCEEDED fehl → 409 { quota: true }. Bestätigt der Admin
 * („override": true), wird die Anmeldung per Delete+Insert mit
 * quota_override neu angelegt – der UPDATE-Pfad des Triggers würde ein
 * mitgesendetes Override bei Schul-/Rollenwechsel zwingend zurücksetzen,
 * der INSERT-Pfad respektiert es (Migration 019).
 *
 * Bearbeitete Personendaten werden mit persons.edit_locked = true
 * markiert, damit ein Excel-Re-Import sie nicht überschreibt
 * (Migration 029); ein Schulwechsel setzt registrations.school_locked.
 */
export async function PATCH(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auth = await requireSchulungenAccess({ adminOnly: true });
  if (!auth.ok) return auth.response;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const eventId = typeof body.event_id === "string" ? body.event_id : "";
  const personId = typeof body.person_id === "string" ? body.person_id : "";
  if (!eventId || !personId) {
    return NextResponse.json(
      { error: "event_id und person_id sind erforderlich." },
      { status: 400 }
    );
  }

  const firstName =
    typeof body.first_name === "string" ? body.first_name.trim() : undefined;
  const lastName =
    typeof body.last_name === "string" ? body.last_name.trim() : undefined;
  if (lastName !== undefined && !lastName) {
    return NextResponse.json(
      { error: "Der Nachname darf nicht leer sein." },
      { status: 400 }
    );
  }

  // E-Mail: "" oder null = entfernen; sonst validieren + kleinschreiben
  // (konsistent mit dem Unique-Index auf lower(email) und dem Import).
  let email: string | null | undefined;
  if (body.email !== undefined) {
    const raw = typeof body.email === "string" ? body.email.trim() : "";
    if (!raw) {
      email = null;
    } else if (!/^\S+@\S+\.\S+$/.test(raw)) {
      return NextResponse.json(
        { error: "Bitte geben Sie eine gültige E-Mail-Adresse an." },
        { status: 400 }
      );
    } else {
      email = raw.toLowerCase();
    }
  }

  const role =
    body.role === "teacher" || body.role === "leadership"
      ? (body.role as ParticipantRole)
      : undefined;
  if (body.role !== undefined && !role) {
    return NextResponse.json({ error: "Ungültige Rolle." }, { status: 400 });
  }

  const schoolName =
    typeof body.school_name === "string" ? body.school_name.trim() : "";
  const override = body.override === true;

  const admin = createServiceClient();

  const { data: reg } = await admin
    .from("registrations")
    .select(
      "id, school_id, role, status, quota_override, workshops, school_locked, alias_id, import_batch_id"
    )
    .eq("event_id", eventId)
    .eq("person_id", personId)
    .maybeSingle();
  if (!reg) {
    return NextResponse.json(
      { error: "Anmeldung nicht gefunden." },
      { status: 404 }
    );
  }

  const { data: person } = await admin
    .from("persons")
    .select("id, first_name, last_name, email, school_id, edit_locked")
    .eq("id", personId)
    .maybeSingle();
  if (!person) {
    return NextResponse.json(
      { error: "Person nicht gefunden." },
      { status: 404 }
    );
  }

  // ── 1. Anmeldung (Schule/Rolle) zuerst ändern ────────────────
  // So bleibt ein Quoten-409 ohne Seiteneffekte auf die Personendaten.
  let targetSchoolId = reg.school_id as string;
  if (schoolName) {
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
  }
  const schoolChanged = targetSchoolId !== reg.school_id;
  const newRole = role ?? (reg.role as ParticipantRole);
  const roleChanged = newRole !== reg.role;

  const newFirst = firstName ?? (person.first_name as string);
  const newLast = lastName ?? (person.last_name as string);
  const firstNorm = normalizeKey(newFirst);
  const lastNorm = normalizeKey(newLast);

  // ── Zusammenführung (Merge) ──────────────────────────────────
  // Existiert bereits eine ANDERE Person mit diesem Namen an der Ziel-
  // schule (oder an der eigenen Schule der Person, dort würde sonst
  // UNIQUE(school_id, last_norm, first_norm) den Namen blockieren), wird
  // die Anmeldung auf die vorhandene Person umgezogen statt eine Dublette
  // zu erzeugen bzw. mit einem Fehler abzubrechen.
  let mergeTarget: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  } | null = null;
  {
    const { data: candidates } = await admin
      .from("persons")
      .select("id, first_name, last_name, email, school_id")
      .eq("last_norm", lastNorm)
      .eq("first_norm", firstNorm)
      .neq("id", person.id);
    const pool = candidates ?? [];
    mergeTarget =
      pool.find((c) => c.school_id === targetSchoolId) ??
      pool.find((c) => c.school_id === person.school_id) ??
      null;
  }
  if (mergeTarget) {
    // Ist die vorhandene Person schon in DIESER Schulung? Dann gäbe es
    // zwei identische Zeilen – das muss der Admin über Löschen klären.
    const { data: dupReg } = await admin
      .from("registrations")
      .select("id")
      .eq("event_id", eventId)
      .eq("person_id", mergeTarget.id)
      .maybeSingle();
    if (dupReg) {
      return NextResponse.json(
        {
          error: `„${mergeTarget.first_name} ${mergeTarget.last_name}" ist für diese Schulung bereits angemeldet. Entfernen Sie stattdessen die doppelte Zeile über den Papierkorb.`,
        },
        { status: 409 }
      );
    }
  }
  const effectivePersonId = mergeTarget?.id ?? (person.id as string);
  const personChanged = effectivePersonId !== person.id;
  // Konflikt-Zeilen können an der alten wie an der neuen Person hängen.
  const affectedPersonIds = personChanged
    ? [person.id as string, effectivePersonId]
    : [person.id as string];

  if (schoolChanged || roleChanged || personChanged) {
    // Ein manuell gewählte Schule soll den Re-Import überleben; die alte
    // Alias-Zuordnung passt nach einem Schulwechsel nicht mehr.
    const regFields = {
      school_id: targetSchoolId,
      person_id: effectivePersonId,
      role: newRole,
      school_locked: schoolChanged ? true : (reg.school_locked as boolean),
      alias_id: schoolChanged ? null : (reg.alias_id as string | null),
    };

    if (!override) {
      const { error } = await admin
        .from("registrations")
        .update(regFields)
        .eq("id", reg.id);
      if (error) {
        if (isQuotaError(error.message)) {
          const m = error.message.match(/(\d+)\s*\/\s*(\d+)/);
          const usage = m ? ` (${m[1]}/${m[2]} Plätze belegt)` : "";
          return NextResponse.json(
            {
              quota: true,
              error:
                newRole === "leadership"
                  ? `Die gewählte Schule hat ihr Kontingent für die Schulleitung bereits ausgeschöpft${usage}.`
                  : `Die gewählte Schule hat ihr Kontingent für Lehrkräfte bereits ausgeschöpft${usage}.`,
            },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: `Änderung fehlgeschlagen: ${error.message}` },
          { status: 500 }
        );
      }

      // Die Person steht jetzt regulär innerhalb der Quote → veraltete
      // Quoten-Markierungen entfernen (rejected-Historie bleibt erhalten).
      await admin
        .from("import_conflicts")
        .delete()
        .eq("event_id", eventId)
        .in("person_id", affectedPersonIds)
        .eq("status", "open");
      await admin
        .from("import_conflicts")
        .delete()
        .eq("event_id", eventId)
        .in("person_id", affectedPersonIds)
        .eq("status", "approved")
        .ilike("reason", "%quote%");
    } else {
      // Delete+Insert: Der INSERT-Pfad des Triggers respektiert
      // quota_override (der UPDATE-Pfad setzt es bei Schul-/Rollenwechsel
      // zwingend zurück). Muster: aliases-Route.
      const { error: delErr } = await admin
        .from("registrations")
        .delete()
        .eq("id", reg.id);
      if (delErr) {
        return NextResponse.json(
          { error: `Änderung fehlgeschlagen: ${delErr.message}` },
          { status: 500 }
        );
      }
      const { error: insErr } = await admin.from("registrations").insert({
        event_id: eventId,
        status: "registered",
        quota_override: true,
        workshops: reg.workshops,
        import_batch_id: reg.import_batch_id,
        ...regFields,
      });
      if (insErr) {
        // Original wiederherstellen, damit die Anmeldung nicht verloren geht.
        await admin.from("registrations").insert({
          event_id: eventId,
          person_id: personId,
          school_id: reg.school_id,
          role: reg.role,
          status: reg.status,
          quota_override: reg.quota_override,
          workshops: reg.workshops,
          import_batch_id: reg.import_batch_id,
          school_locked: reg.school_locked,
          alias_id: reg.alias_id,
        });
        return NextResponse.json(
          { error: `Änderung fehlgeschlagen: ${insErr.message}` },
          { status: 500 }
        );
      }

      // Quoten-Markierung (gelbe Zeile) speist sich aus import_conflicts –
      // Override daher als zugelassenen Quoten-Konflikt dokumentieren.
      const overrideReason =
        "Quote überschritten – vom Admin beim Bearbeiten trotz Quote zugelassen";
      const { data: openConflicts } = await admin
        .from("import_conflicts")
        .select("id")
        .eq("event_id", eventId)
        .in("person_id", affectedPersonIds)
        .eq("status", "open")
        .limit(1);
      const openConflict = openConflicts?.[0];
      if (openConflict) {
        await admin
          .from("import_conflicts")
          .update({
            status: "approved",
            reason: overrideReason,
            person_id: effectivePersonId,
            school_id: targetSchoolId,
            role: newRole,
            resolved_by: auth.userId,
            resolved_at: new Date().toISOString(),
          })
          .eq("id", openConflict.id);
      } else {
        await admin.from("import_conflicts").insert({
          event_id: eventId,
          person_id: effectivePersonId,
          school_id: targetSchoolId,
          role: newRole,
          reason: overrideReason,
          status: "approved",
          import_batch_id: reg.import_batch_id,
          resolved_by: auth.userId,
          resolved_at: new Date().toISOString(),
        });
      }
    }
  }

  // ── 2. Personendaten (Name/E-Mail) ───────────────────────────
  // Bei einer Zusammenführung landen die Änderungen auf der VORHANDENEN
  // Person (die Anmeldung zeigt jetzt auf sie).
  const editTarget = mergeTarget ?? {
    id: person.id as string,
    first_name: person.first_name as string,
    last_name: person.last_name as string,
    email: person.email as string | null,
  };
  const personUpdate: Record<string, unknown> = {};

  if (
    newFirst !== editTarget.first_name ||
    newLast !== editTarget.last_name
  ) {
    personUpdate.first_name = newFirst;
    personUpdate.last_name = newLast;
    personUpdate.first_norm = firstNorm;
    personUpdate.last_norm = lastNorm;
  }

  if (email !== undefined && email !== (editTarget.email ?? null)) {
    personUpdate.email = email;
  }

  if (Object.keys(personUpdate).length > 0) {
    // persons.school_id wird BEWUSST NICHT geändert (Re-Import-Matching
    // bleibt stabil, keine Dubletten – wie bei der Schul-Zuweisung).
    personUpdate.edit_locked = true;
    const { error } = await admin
      .from("persons")
      .update(personUpdate)
      .eq("id", editTarget.id);
    if (error) {
      if (/duplicate key|unique/i.test(error.message)) {
        return NextResponse.json(
          {
            error: personUpdate.email
              ? "Diese E-Mail-Adresse ist bereits einer anderen Person zugeordnet."
              : "Eine Person mit diesem Namen ist an dieser Schule bereits erfasst.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Änderung fehlgeschlagen: ${error.message}` },
        { status: 500 }
      );
    }
  }

  // ── 3. Aufräumen nach Zusammenführung ────────────────────────
  // Konflikte der alten Person zu dieser Schulung sind hinfällig; hängt
  // die Personen-Dublette an keiner weiteren Anmeldung mehr, wird sie
  // gelöscht (verhindert erneute Dubletten beim nächsten Import).
  if (personChanged) {
    await admin
      .from("import_conflicts")
      .delete()
      .eq("event_id", eventId)
      .eq("person_id", person.id);
    const { count } = await admin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("person_id", person.id);
    if (!count) {
      await admin.from("persons").delete().eq("id", person.id);
    }
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE – Einen einzelnen Teilnehmenden aus einer Schulung entfernen.
 *
 * Body (JSON):
 *   event_id: string
 *   person_id: string
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireSchulungenAccess({ adminOnly: true });
  if (!auth.ok) return auth.response;

  let body: { event_id?: string; person_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const { event_id, person_id } = body;
  if (!event_id || !person_id) {
    return NextResponse.json(
      { error: "event_id und person_id sind erforderlich." },
      { status: 400 }
    );
  }

  const admin = createServiceClient();

  // Zugehörige Konflikte löschen
  await admin
    .from("import_conflicts")
    .delete()
    .eq("event_id", event_id)
    .eq("person_id", person_id);

  // Anmeldung löschen
  const { error } = await admin
    .from("registrations")
    .delete()
    .eq("event_id", event_id)
    .eq("person_id", person_id);

  if (error) {
    return NextResponse.json(
      { error: `Teilnehmer konnte nicht entfernt werden: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true });
}
