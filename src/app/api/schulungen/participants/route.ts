import { NextRequest, NextResponse } from "next/server";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";
import {
  schoolMatchKey,
  schoolKeyMatches,
  isRegisteredSchool,
} from "@/lib/schulungen/parse";
import type { EventParticipant, ParticipantRole } from "@/lib/schulungen/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  role: ParticipantRole;
  quota_override: boolean | null;
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
         quota_override,
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
    // Noch OFFENE Konflikte dieser Schulung – um zu unterscheiden, ob eine
    // Über-Quote-Anmeldung schon entschieden (zugelassen) wurde oder noch
    // oben bearbeitet werden muss.
    admin
      .from("import_conflicts")
      .select("person_id")
      .eq("event_id", eventId)
      .eq("status", "open"),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Tolerante Erkennung: registrierte Schul-Schlüssel + Mapping auf die
  // Schul-Account-E-Mail. Schultyp-Wörter werden ignoriert.
  const registeredKeys: string[] = [];
  const seenKey = new Set<string>();
  const schoolEmail = new Map<string, string>(); // matchKey → contact_email
  for (const c of (bestandRes.data ?? []) as Array<{
    school_name: string | null;
    contact_email: string | null;
  }>) {
    if (!c.school_name || /test|admin/i.test(c.school_name)) continue;
    const key = schoolMatchKey(c.school_name);
    if (!key) continue;
    if (!seenKey.has(key)) {
      seenKey.add(key);
      registeredKeys.push(key);
    }
    if (c.contact_email && !schoolEmail.has(key)) {
      schoolEmail.set(key, c.contact_email);
    }
  }
  // Personen mit noch offenem Konflikt für diese Schulung.
  const openConflictPersons = new Set<string>();
  for (const c of (conflictRes.data ?? []) as Array<{ person_id: string | null }>) {
    if (c.person_id) openConflictPersons.add(c.person_id);
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
      const isReg = isRegisteredSchool(r.school?.name ?? "", registeredKeys);
      const ownEmail = r.person?.email ?? null;
      // Ohne eigene E-Mail + Schule registriert → Schul-Account-E-Mail.
      const fallback = !ownEmail && isReg ? lookupSchoolEmail(r.school?.name) : null;
      // Registrierte Schule, aber per Override über der Quote zugelassen
      // → Quoten-Hinweis (bleibt auch nach „Trotz Quote zulassen", da das
      //   Override klebrig ist; verschwindet erst beim manuellen Umziehen).
      const quotaWarning = isReg && r.quota_override === true;
      const personId = r.person?.id ?? "";
      return {
        person_id: personId,
        first_name: r.person?.first_name ?? "",
        last_name: r.person?.last_name ?? "",
        email: ownEmail ?? fallback,
        school_name: r.school?.name ?? null,
        school_city: r.school?.city ?? null,
        role: r.role,
        school_registered: isReg,
        quota_warning: quotaWarning,
        // Noch offener Konflikt → muss oben erst entschieden werden.
        quota_pending: quotaWarning && openConflictPersons.has(personId),
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
