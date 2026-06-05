// Aggregations-Utilities für die Bestandsaufnahme-Auswertung.
// Reine Funktionen ohne Seiten-Effekte – ausschließlich Server-Daten rein,
// vorberechnete Buckets raus. Werden im Server-Component der
// Auswertungs-Seite aufgerufen.

export interface BestandsaufnahmeRow {
  id: string;
  school_name: string | null;
  school_location: string | null;
  student_count: string | null;
  teacher_count: number | null;
  is_startchancen_school: string | null;
  daz_share: string | null;
  respondent_role: string | null;
  respondent_role_other: string | null;

  devices: string[] | null;
  devices_other: string | null;
  tablet_count: string | null;
  wlan_rating: number | null;
  infrastructure: string[] | null;
  infrastructure_other: string | null;
  challenges: string[] | null;
  challenges_other: string | null;
  support_satisfaction: number | null;

  digitization_level: number | null;
  tools_used: string[] | null;
  tools_used_other: string | null;
  usage_frequency: string | null;
  diagnostic_tools: string[] | null;
  diagnostic_tools_other: string | null;
  media_concept: string | null;
  media_responsible: string | null;

  ai_usage: string | null;
  ai_purposes: string[] | null;
  ai_purposes_other: string | null;
  ai_tools_used: string[] | null;
  ai_tools_other: string | null;
  ai_competence: number | null;
  ai_concerns: string[] | null;
  ai_concerns_other: string | null;
  ai_trainings: string[] | null;
  ai_trainings_other: string | null;

  training_needs: string[] | null;
  training_needs_other: string | null;
  training_format: string[] | null;
  training_times: string[] | null;
  participation_count: number | null;
  pioneer_interest: string | null;

  has_best_practice: string | null;
  best_practice_description: string | null;
  share_practice: string | null;

  support_needs: string[] | null;
  software_licenses: string[] | null;
  software_licenses_other: string | null;
  student_support: string | null;
  time_for_tools: string | null;

  created_at: string;
}

export const STADT = "Stadt Osnabrück";
export const LAND = "Landkreis Osnabrück";

export type Bucket = {
  option: string;
  stadt: number;
  land: number;
  total: number;
};

export type ArrayField =
  | "devices"
  | "infrastructure"
  | "challenges"
  | "tools_used"
  | "diagnostic_tools"
  | "ai_purposes"
  | "ai_tools_used"
  | "ai_concerns"
  | "ai_trainings"
  | "training_needs"
  | "training_format"
  | "training_times"
  | "support_needs"
  | "software_licenses";

export type SingleField =
  | "school_location"
  | "student_count"
  | "is_startchancen_school"
  | "daz_share"
  | "respondent_role"
  | "tablet_count"
  | "usage_frequency"
  | "media_concept"
  | "media_responsible"
  | "ai_usage"
  | "pioneer_interest"
  | "has_best_practice"
  | "share_practice"
  | "student_support"
  | "time_for_tools";

export type RatingField =
  | "wlan_rating"
  | "support_satisfaction"
  | "digitization_level"
  | "ai_competence";

export const isStadt = (row: BestandsaufnahmeRow) =>
  row.school_location === STADT;
export const isLand = (row: BestandsaufnahmeRow) =>
  row.school_location === LAND;

/** Zählt für jede Option, wie oft sie in einem Multi-Select-Feld vorkommt. */
export function countMulti(
  rows: BestandsaufnahmeRow[],
  field: ArrayField,
  options: readonly string[]
): Bucket[] {
  return options.map((option) => {
    let stadt = 0;
    let land = 0;
    for (const row of rows) {
      const value = row[field];
      if (!Array.isArray(value) || !value.includes(option)) continue;
      if (isStadt(row)) stadt++;
      else if (isLand(row)) land++;
    }
    return { option, stadt, land, total: stadt + land };
  });
}

/** Zählt die Verteilung über die Options eines Single-Select-Feldes. */
export function countSingle(
  rows: BestandsaufnahmeRow[],
  field: SingleField,
  options: readonly string[]
): Bucket[] {
  return options.map((option) => {
    let stadt = 0;
    let land = 0;
    for (const row of rows) {
      if (row[field] !== option) continue;
      if (isStadt(row)) stadt++;
      else if (isLand(row)) land++;
    }
    return { option, stadt, land, total: stadt + land };
  });
}

/** Zählt die Verteilung eines numerischen Rating-Feldes (1-5). */
export function countRating(
  rows: BestandsaufnahmeRow[],
  field: RatingField
): Bucket[] {
  const buckets: Bucket[] = [1, 2, 3, 4, 5].map((n) => ({
    option: String(n),
    stadt: 0,
    land: 0,
    total: 0,
  }));
  for (const row of rows) {
    const value = row[field];
    if (typeof value !== "number" || value < 1 || value > 5) continue;
    const b = buckets[value - 1];
    if (isStadt(row)) b.stadt++;
    else if (isLand(row)) b.land++;
    b.total = b.stadt + b.land;
  }
  return buckets;
}

export interface Average {
  all: number | null;
  stadt: number | null;
  land: number | null;
}

export function average(
  rows: BestandsaufnahmeRow[],
  field: RatingField
): Average {
  const all: number[] = [];
  const stadtArr: number[] = [];
  const landArr: number[] = [];
  for (const row of rows) {
    const value = row[field];
    if (typeof value !== "number") continue;
    all.push(value);
    if (isStadt(row)) stadtArr.push(value);
    else if (isLand(row)) landArr.push(value);
  }
  const mean = (a: number[]) =>
    a.length ? Math.round((a.reduce((s, n) => s + n, 0) / a.length) * 10) / 10 : null;
  return { all: mean(all), stadt: mean(stadtArr), land: mean(landArr) };
}

export interface Totals {
  all: number;
  stadt: number;
  land: number;
}

export function totals(rows: BestandsaufnahmeRow[]): Totals {
  let stadt = 0;
  let land = 0;
  for (const row of rows) {
    if (isStadt(row)) stadt++;
    else if (isLand(row)) land++;
  }
  return { all: rows.length, stadt, land };
}

/** Sortiert Buckets absteigend nach Gesamtzahl (Top-Listen). */
export function sortByTotal(buckets: Bucket[]): Bucket[] {
  return [...buckets].sort((a, b) => b.total - a.total);
}

/** Filtert leere Buckets heraus (nur Optionen, die mindestens einmal vorkommen). */
export function nonEmpty(buckets: Bucket[]): Bucket[] {
  return buckets.filter((b) => b.total > 0);
}

/**
 * Entfernt Mehrfach-Einreichungen derselben Schule. Erwartet Zeilen, die
 * bereits nach created_at DESC sortiert sind – dann gewinnt automatisch
 * die jüngste Einreichung pro Schule. Schulen ohne `school_name` werden
 * unverändert übernommen.
 *
 * Schul-Namen werden für den Vergleich getrimmt, lowergecased und
 * Mehrfach-Leerzeichen normalisiert. Damit zählen „GS Stüveschule" und
 * „gs  stüveschule  " als dieselbe Schule.
 */
export function dedupeBySchool<
  T extends { school_name: string | null },
>(rows: T[]): { unique: T[]; duplicates: number } {
  const seen = new Set<string>();
  const unique: T[] = [];
  let duplicates = 0;
  for (const row of rows) {
    const raw = (row.school_name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!raw) {
      unique.push(row);
      continue;
    }
    if (seen.has(raw)) {
      duplicates++;
      continue;
    }
    seen.add(raw);
    unique.push(row);
  }
  return { unique, duplicates };
}
