import { NextRequest, NextResponse } from "next/server";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";
import { schoolMatchKey } from "@/lib/schulungen/parse";
import { getSchoolTrainings } from "@/lib/schulungen/getSchoolTrainings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stellvertreter-Modus der Antragsformulare (nur Admin + Schulungsteam):
 *
 *   GET /api/schulungen/school-picker
 *     → Liste aller verifizierten Schulen für die Auswahl (mit Suche im
 *       Client). Quelle sind die von Menschen geprüfte Zuordnungsliste
 *       (`school_aliases`, kanonische Namen) und die importierten Schulen
 *       (`schools`, bringen Ort/PLZ mit) – dedupliziert über denselben
 *       Schlüssel, den auch das Schulungs-Matching nutzt.
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

  // ── Modus 2: Schulungsprüfung für die gewählte Schule ────────────────
  if (school !== null) {
    const trimmed = school.trim();
    if (!trimmed || trimmed.length > 200) {
      return NextResponse.json({ error: "Ungültiger Schulname" }, { status: 400 });
    }
    const trainings = await getSchoolTrainings(trimmed);
    return NextResponse.json({ trainings });
  }

  // ── Modus 1: Liste der verifizierten Schulen ─────────────────────────
  const admin = createServiceClient();
  const [aliasRes, schoolsRes] = await Promise.all([
    admin.from("school_aliases").select("canonical_name"),
    admin.from("schools").select("name, city, plz"),
  ]);
  if (aliasRes.error || schoolsRes.error) {
    return NextResponse.json(
      { error: (aliasRes.error ?? schoolsRes.error)?.message ?? "Fehler" },
      { status: 500 },
    );
  }

  const byKey = new Map<
    string,
    { name: string; city: string | null; plz: string | null }
  >();

  // Geprüfte kanonische Namen zuerst – sie gewinnen bei gleichem Schlüssel.
  for (const row of (aliasRes.data ?? []) as Array<{
    canonical_name: string | null;
  }>) {
    const name = row.canonical_name?.trim();
    if (!name) continue;
    const key = schoolMatchKey(name);
    if (key && !byKey.has(key)) {
      byKey.set(key, { name, city: null, plz: null });
    }
  }

  // Importierte Schulen ergänzen (liefern Ort/PLZ für die Anzeige).
  for (const row of (schoolsRes.data ?? []) as Array<{
    name: string | null;
    city: string | null;
    plz: string | null;
  }>) {
    const name = row.name?.trim();
    if (!name) continue;
    const key = schoolMatchKey(name);
    if (!key) continue;
    const existing = byKey.get(key);
    if (existing) {
      existing.city ??= row.city;
      existing.plz ??= row.plz;
    } else {
      byKey.set(key, { name, city: row.city, plz: row.plz });
    }
  }

  const schools = Array.from(byKey.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "de"),
  );

  return NextResponse.json({ schools });
}
