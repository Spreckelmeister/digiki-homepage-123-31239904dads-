import { NextRequest, NextResponse } from "next/server";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";
import {
  schoolMatchKey,
  schoolKeyMatches,
  buildRegisteredSchools,
  isRegisteredSchool,
  NO_SCHOOL_NAME,
} from "@/lib/schulungen/parse";
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

  // schulungsteam (nicht-Admin) sieht KEINE Warn-Annotationen (Überbuchung,
  // nicht registrierte Schule, keine Schule) – nur Name/Schule/E-Mail.
  const visible = auth.isAdmin
    ? participants
    : participants.map((p) => ({
        ...p,
        school_registered: true,
        school_missing: false,
        quota_warning: false,
        quota_pending: false,
      }));

  return NextResponse.json({ participants: visible });
}
