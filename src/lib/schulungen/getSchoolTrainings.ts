import { createServiceClient } from "./server";
import {
  buildRegisteredSchools,
  matchRegisteredSchool,
  schoolMatchKey,
} from "./parse";

/** Eine Schulung, zu der die Schule angemeldet ist (bewusst OHNE Personendaten). */
export interface RegisteredTraining {
  id: string;
  kurs_nr: string;
  title: string;
  start_date: string | null;
  location: string | null;
  teacherCount: number;
  leadershipCount: number;
}

/**
 * Ermittelt serverseitig, zu welchen KOS-Schulungen die Schule des
 * eingeloggten Kontos angemeldet ist. Grundlage ist zuerst die im
 * Schulungsdashboard gepflegte, von Menschen geprüfte Zuordnungsliste
 * (`school_aliases` – der Import protokolliert dort JEDE Verbindung);
 * erst danach greift das tolerante Auto-Matching – dieselbe
 * Vorrangfolge wie beim Dashboard-Import und -Detail.
 *
 * Der Schulname MUSS serverseitig ermittelt werden (BSA/Profil) und
 * darf nie aus Client-Input stammen. Bei Fehlern → leere Liste; das
 * Formular zeigt dann den Kontakt-Ausweg.
 */
export async function getSchoolTrainings(
  schoolName: string | null | undefined
): Promise<RegisteredTraining[]> {
  if (!schoolName?.trim()) return [];
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error("[getSchoolTrainings] Service-Role-Key nicht konfiguriert");
    return [];
  }

  try {
    const admin = createServiceClient();

    // Bestandsaufnahme, geprüfte Zuordnungsliste und alle Schulen laden –
    // gleiche Datenbasis wie der Dashboard-Import.
    const [bestandRes, aliasRes, allSchoolsRes] = await Promise.all([
      admin.from("bestandsaufnahme_responses").select("school_name"),
      admin.from("school_aliases").select("alias_key, canonical_name"),
      admin.from("schools").select("id, name"),
    ]);

    const registeredSchools = buildRegisteredSchools(
      ((bestandRes.data ?? []) as Array<{ school_name: string | null }>).map(
        (b) => b.school_name
      )
    );

    const aliasRows = (aliasRes.data ?? []) as Array<{
      alias_key: string;
      canonical_name: string;
    }>;
    const aliasByKey = new Map(
      aliasRows.map((a) => [a.alias_key, a.canonical_name])
    );

    // Kanonischen Schulnamen bestimmen – Vorrang wie beim Import:
    // 1. persistenter, geprüfter Alias, 2. tolerantes Auto-Matching.
    const userKey = schoolMatchKey(schoolName);
    const canonicalName =
      (userKey ? aliasByKey.get(userKey) : undefined) ??
      matchRegisteredSchool(schoolName, registeredSchools) ??
      schoolName;

    // Alle Alias-Schlüssel, die (geprüft) auf diese Schule zeigen.
    const aliasKeysForSchool = new Set(
      aliasRows
        .filter((a) => a.canonical_name === canonicalName)
        .map((a) => a.alias_key)
    );

    // Alle schools-Zeilen (inkl. abweichender Import-Schreibweisen), die zu
    // dieser Schule gehören: zuerst über die Zuordnungsliste, dann wie
    // school-detail über das tolerante Matching.
    const matchingSchoolIds = (
      (allSchoolsRes.data ?? []) as Array<{ id: string; name: string | null }>
    )
      .filter((s) => {
        const name = s.name ?? "";
        if (!name) return false;
        const key = schoolMatchKey(name);
        if (key && aliasKeysForSchool.has(key)) return true;
        const m = matchRegisteredSchool(name, registeredSchools);
        return m === canonicalName || name === schoolName;
      })
      .map((s) => s.id);

    if (matchingSchoolIds.length === 0) return [];

    const { data: regs, error } = await admin
      .from("registrations")
      .select(
        `role,
         event:training_events (id, kurs_nr, title, start_date, location)`
      )
      .in("school_id", matchingSchoolIds)
      .eq("status", "registered");

    if (error) {
      console.error("[getSchoolTrainings]", error.message);
      return [];
    }

    // Je Event aggregieren: nur Titel/Termin + Anzahl je Rolle.
    const rows = (regs ?? []) as unknown as Array<{
      role: string;
      event: {
        id: string;
        kurs_nr: string;
        title: string;
        start_date: string | null;
        location: string | null;
      } | null;
    }>;

    const byEvent = new Map<string, RegisteredTraining>();
    for (const row of rows) {
      const ev = row.event;
      if (!ev) continue;
      let agg = byEvent.get(ev.id);
      if (!agg) {
        agg = {
          id: ev.id,
          kurs_nr: ev.kurs_nr,
          title: ev.title,
          start_date: ev.start_date,
          location: ev.location,
          teacherCount: 0,
          leadershipCount: 0,
        };
        byEvent.set(ev.id, agg);
      }
      if (row.role === "leadership") agg.leadershipCount += 1;
      else agg.teacherCount += 1;
    }

    return Array.from(byEvent.values()).sort((a, b) =>
      (a.start_date ?? "9999-12-31").localeCompare(b.start_date ?? "9999-12-31")
    );
  } catch (e) {
    console.error("[getSchoolTrainings]", e);
    return [];
  }
}
