import { NextResponse } from "next/server";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";
import {
  buildRegisteredSchools,
  matchRegisteredSchool,
  schoolMatchKey,
} from "@/lib/schulungen/parse";
import type {
  OverviewResponse,
  TrainingEvent,
  SchoolParticipation,
} from "@/lib/schulungen/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liefert alle Dashboard-Daten (Stats, Schulungen, Quoten, Batches). */
export async function GET() {
  const auth = await requireSchulungenAccess();
  if (!auth.ok) return auth.response;

  const admin = createServiceClient();

  const [
    eventsRes,
    regCountsRes,
    bestandRes,
    regsRes,
    batchesRes,
    conflictsCountRes,
    registrationsCountRes,
  ] = await Promise.all([
    admin
      .from("training_events")
      .select("id, kurs_nr, nlc_event_id, title, audience, start_date, end_date, location, anmeldung_url, registration_deadline")
      .order("start_date", { ascending: true }),
    admin
      .from("registrations")
      .select("event_id")
      .eq("status", "registered"),
    // Teilnahmeberechtigte Schulen (Bestandsaufnahme).
    admin
      .from("bestandsaufnahme_responses")
      .select("school_name, school_location"),
    // Aktive Anmeldungen inkl. Schule + Person → Quoten in JS (gleiche
    // tolerante Logik wie Import/Konflikt, daher konsistent).
    admin
      .from("registrations")
      .select("role, person_id, school:schools (name, city, plz)")
      .eq("status", "registered")
      .limit(5000),
    admin
      .from("import_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("import_conflicts")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    admin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("status", "registered"),
  ]);

  const countsByEvent = new Map<string, number>();
  for (const r of regCountsRes.data ?? []) {
    countsByEvent.set(r.event_id, (countsByEvent.get(r.event_id) ?? 0) + 1);
  }

  const events: TrainingEvent[] = (eventsRes.data ?? []).map((e) => ({
    ...e,
    registration_count: countsByEvent.get(e.id) ?? 0,
  }));

  const schools = buildSchoolParticipation(
    (bestandRes.data ?? []) as Array<{
      school_name: string | null;
      school_location: string | null;
    }>,
    (regsRes.data ?? []) as unknown as RegRow[]
  );
  // "Teilnahmeberechtigt" = aus der Bestandsaufnahme. Importierte
  // Schulen ohne Bestandsaufnahme zählen nicht zur Soll-Menge.
  const eligible = schools.filter((s) => s.in_bestandsaufnahme);

  // schulungsteam (nicht-Admin) sieht nur „Alle Schulungen" → die
  // detaillierten Schul-/Quoten- und Import-Daten werden nicht ausgeliefert.
  const response: OverviewResponse = {
    stats: {
      events_total: events.length,
      registrations_total: registrationsCountRes.count ?? 0,
      conflicts_open: conflictsCountRes.count ?? 0,
      schools_total: eligible.length,
      schools_registered: eligible.filter((s) => s.has_registered).length,
    },
    events,
    schools,
    recent_batches: auth.isAdmin ? batchesRes.data ?? [] : [],
    is_admin: auth.isAdmin,
  };

  return NextResponse.json(response);
}

type RegRow = {
  role: "teacher" | "leadership";
  person_id: string | null;
  school: { name: string | null; city: string | null; plz: string | null } | null;
};

type Agg = {
  name: string;
  city: string | null;
  plz: string | null;
  in_bestand: boolean;
  teacher: Set<string>;
  leadership: Set<string>;
};

/**
 * Berechnet die Schul-Übersicht (Soll = Bestandsaufnahme, Ist = Anmeldungen)
 * mit derselben toleranten Logik wie Import/Konflikt. Dadurch fällt eine
 * importierte Schule mit der passenden Bestandsaufnahme-Schule zusammen –
 * auch bei abweichender Schreibweise – und das Panel bleibt nach manuellen
 * Zuweisungen sofort konsistent.
 */
function buildSchoolParticipation(
  bestandRows: Array<{ school_name: string | null; school_location: string | null }>,
  regs: RegRow[]
): SchoolParticipation[] {
  const registeredSchools = buildRegisteredSchools(
    bestandRows.map((b) => b.school_name)
  );
  const bestandCity = new Map<string, string | null>();
  for (const b of bestandRows) {
    if (!b.school_name || /test|admin/i.test(b.school_name)) continue;
    const nm = b.school_name.trim();
    if (!bestandCity.has(nm)) bestandCity.set(nm, b.school_location ?? null);
  }
  const keyByName = new Map(registeredSchools.map((r) => [r.name, r.key]));

  const groups = new Map<string, Agg>();
  // Alle berechtigten Schulen vorbelegen, damit auch Schulen ohne Anmeldung
  // („offen") erscheinen.
  for (const r of registeredSchools) {
    groups.set(r.key, {
      name: r.name,
      city: bestandCity.get(r.name) ?? null,
      plz: null,
      in_bestand: true,
      teacher: new Set(),
      leadership: new Set(),
    });
  }

  for (const reg of regs) {
    const personId = reg.person_id;
    if (!personId) continue;
    const schoolName = reg.school?.name ?? "";
    const canonical = matchRegisteredSchool(schoolName, registeredSchools);
    let agg: Agg | undefined;
    if (canonical) {
      agg = groups.get(keyByName.get(canonical) ?? "");
      // Adresse aus dem Import ergänzen, falls in der Bestandsaufnahme fehlt.
      if (agg) {
        if (!agg.plz && reg.school?.plz) agg.plz = reg.school.plz;
        if (!agg.city && reg.school?.city) agg.city = reg.school.city;
      }
    } else {
      const mk = schoolMatchKey(schoolName) || schoolName.toLowerCase();
      const key = `nb:${mk}`;
      agg = groups.get(key);
      if (!agg) {
        agg = {
          name: schoolName || "(unbekannt)",
          city: reg.school?.city ?? null,
          plz: reg.school?.plz ?? null,
          in_bestand: false,
          teacher: new Set(),
          leadership: new Set(),
        };
        groups.set(key, agg);
      }
    }
    if (!agg) continue;
    if (reg.role === "leadership") agg.leadership.add(personId);
    else agg.teacher.add(personId);
  }

  return [...groups.entries()]
    .map(([key, g]) => ({
      school_id: null,
      school_key: key,
      name: g.name,
      city: g.city,
      plz: g.plz,
      teachers_used: g.teacher.size,
      leadership_used: g.leadership.size,
      teacher_limit: 2,
      leadership_limit: 1,
      in_bestandsaufnahme: g.in_bestand,
      has_registered: g.teacher.size + g.leadership.size > 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}
