import { NextRequest, NextResponse } from "next/server";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";
import {
  buildRegisteredSchools,
  matchRegisteredSchool,
  schoolMatchKey,
} from "@/lib/schulungen/parse";
import { getSchoolTrainings } from "@/lib/schulungen/getSchoolTrainings";
import { getPrefillForSchool } from "@/lib/bestandsaufnahme/getPrefill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stellvertreter-Modus der Antragsformulare (nur Admin + Schulungsteam):
 *
 *   GET /api/schulungen/school-picker
 *     → Liste ALLER wählbaren Schulen (mit Suche im Client). Quellen:
 *       1. die von Menschen geprüfte Zuordnungsliste (`school_aliases`,
 *          kanonische Namen – gewinnen bei Gleichstand),
 *       2. die importierten Schulen des Schulungsdashboards (`schools`,
 *          bringen Ort/PLZ mit),
 *       3. alle bei DigiKI angemeldeten Schulen aus der Bestandsaufnahme –
 *          auch OHNE Schulungsanmeldung, denn genau für diese Schulen gibt
 *          es den Überspringen-Haken bei der Schulungsprüfung.
 *       Dedupliziert über denselben Schlüssel, den auch das
 *       Schulungs-Matching nutzt.
 *
 *   GET /api/schulungen/school-picker?school=<Name>
 *     → Schulungsanmeldungen der gewählten Schule, mit exakt derselben
 *       Logik wie beim Schul-Konto (`getSchoolTrainings`). So prüft der
 *       Stellvertreter-Antrag dieselbe Voraussetzung wie der eigene.
 */
export async function GET(request: NextRequest) {
  const auth = await requireSchulungenAccess();
  if (!auth.ok) return auth.response;

  const school = request.nextUrl.searchParams.get("school");

  // ── Modus 2: Schulungsprüfung + Vorbefüllung für die gewählte Schule ─
  if (school !== null) {
    const trimmed = school.trim();
    if (!trimmed || trimmed.length > 200) {
      return NextResponse.json({ error: "Ungültiger Schulname" }, { status: 400 });
    }
    const [trainings, prefill] = await Promise.all([
      getSchoolTrainings(trimmed),
      // Bestandsaufnahme + Adresse/Schülerzahl der Schule – damit der
      // Stellvertreter nichts abtippen muss, was schon vorliegt.
      getPrefillForSchool(trimmed).catch((e) => {
        console.error("[school-picker] prefill error:", e);
        return null;
      }),
    ]);
    return NextResponse.json({ trainings, prefill });
  }

  // ── Modus 1: Liste aller wählbaren Schulen ───────────────────────────
  const admin = createServiceClient();
  const [aliasRes, schoolsRes, bsaRes] = await Promise.all([
    admin.from("school_aliases").select("alias_key, canonical_name"),
    admin.from("schools").select("name, street, city, plz"),
    admin.from("bestandsaufnahme_responses").select("school_name"),
  ]);
  if (aliasRes.error || schoolsRes.error || bsaRes.error) {
    return NextResponse.json(
      {
        error:
          (aliasRes.error ?? schoolsRes.error ?? bsaRes.error)?.message ??
          "Fehler",
      },
      { status: 500 },
    );
  }

  const byKey = new Map<
    string,
    {
      name: string;
      street: string | null;
      city: string | null;
      plz: string | null;
    }
  >();

  const aliasRows = (aliasRes.data ?? []) as Array<{
    alias_key: string;
    canonical_name: string | null;
  }>;
  const aliasByKey = new Map(
    aliasRows
      .filter((a) => a.canonical_name?.trim())
      .map((a) => [a.alias_key, a.canonical_name!.trim()]),
  );

  // Geprüfte kanonische Namen zuerst – sie gewinnen bei gleichem Schlüssel.
  for (const canonical of aliasByKey.values()) {
    const key = schoolMatchKey(canonical);
    if (key && !byKey.has(key)) {
      byKey.set(key, { name: canonical, street: null, city: null, plz: null });
    }
  }

  // Importierte Schulen ergänzen (liefern Ort/PLZ für die Anzeige).
  for (const row of (schoolsRes.data ?? []) as Array<{
    name: string | null;
    street: string | null;
    city: string | null;
    plz: string | null;
  }>) {
    const name = row.name?.trim();
    if (!name) continue;
    const key = schoolMatchKey(name);
    if (!key) continue;
    const existing = byKey.get(key);
    if (existing) {
      existing.street ??= row.street;
      existing.city ??= row.city;
      existing.plz ??= row.plz;
    } else {
      byKey.set(key, { name, street: row.street, city: row.city, plz: row.plz });
    }
  }

  // Bei DigiKI angemeldete Schulen (Bestandsaufnahme) ergänzen – auch ohne
  // Schulungsanmeldung wählbar; die Prüfung lässt sich dann überspringen.
  // Abweichende Schreibweisen laufen über Zuordnungsliste + Auto-Matching
  // auf denselben Eintrag zusammen wie bei der Schulungsprüfung.
  const bsaNames = (
    (bsaRes.data ?? []) as Array<{ school_name: string | null }>
  ).map((r) => r.school_name);
  const registeredSchools = buildRegisteredSchools(bsaNames);
  for (const raw of bsaNames) {
    const name = raw?.trim();
    if (!name) continue;
    const nameKey = schoolMatchKey(name);
    const canonical =
      (nameKey ? aliasByKey.get(nameKey) : undefined) ??
      matchRegisteredSchool(name, registeredSchools) ??
      name;
    const key = schoolMatchKey(canonical);
    if (key && !byKey.has(key)) {
      byKey.set(key, { name: canonical, street: null, city: null, plz: null });
    }
  }

  const schools = Array.from(byKey.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "de"),
  );

  return NextResponse.json({ schools });
}
