/**
 * Gemeinsame Filter-/Such-Logik für die Bestandsaufnahme-Admin-Tabelle
 * UND den Markdown-Sammel-Export. Damit garantiert, dass der Download
 * exakt das liefert, was in der UI gerade gefiltert sichtbar ist.
 */

export type FilterId =
  | "best-practice-teilen"
  | "best-practice-vorhanden"
  | "vorreiter"
  | "studentische-hilfe"
  | "ki-im-einsatz"
  | "stadt"
  | "land"
  | "not-confirmed";

/** Minimale Zeile, die wir für die Filter brauchen. */
export type FilterableRow = {
  id: string;
  user_id?: string | null;
  school_name: string | null;
  school_location: string | null;
  share_practice: string | null;
  pioneer_interest: string | null;
  has_best_practice: string | null;
  student_support: string | null;
  ai_usage: string | null;
};

/** Kontext für Filter, die über die reine Row hinausgehen –
 *  z.B. „E-Mail nicht bestätigt" benötigt einen Lookup ins auth.users. */
export type FilterContext = {
  emailConfirmedMap?: Map<string, string | null>;
};

export type FilterTone = "default" | "attention";

export type FilterDef = {
  id: FilterId;
  label: string;
  hint: string;
  tone: FilterTone;
  match: (row: FilterableRow, ctx: FilterContext) => boolean;
};

export const FILTERS: FilterDef[] = [
  {
    id: "best-practice-teilen",
    label: "Best-Practice teilbar",
    hint: "Schulen, die ihre Erfahrungen weitergeben möchten",
    tone: "default",
    match: (r) => (r.share_practice ?? "").toLowerCase().startsWith("ja"),
  },
  {
    id: "vorreiter",
    label: "Interesse Vorreiter",
    hint: "Schulen mit Interesse, Pilotschule zu werden",
    tone: "default",
    match: (r) => (r.pioneer_interest ?? "").toLowerCase().startsWith("ja"),
  },
  {
    id: "best-practice-vorhanden",
    label: "Hat Best-Practice",
    hint: "Schulen, die bereits gelungene Beispiele haben",
    tone: "default",
    match: (r) => (r.has_best_practice ?? "").toLowerCase().startsWith("ja"),
  },
  {
    id: "studentische-hilfe",
    label: "Studentische Hilfe gewünscht",
    hint: "Schulen, die studentische Unterstützung möchten",
    tone: "default",
    match: (r) => (r.student_support ?? "").toLowerCase().startsWith("ja"),
  },
  {
    id: "ki-im-einsatz",
    label: "KI bereits im Einsatz",
    hint: "Schulen, in denen mindestens einzelne Lehrkräfte KI nutzen",
    tone: "default",
    match: (r) => (r.ai_usage ?? "").toLowerCase().startsWith("ja"),
  },
  {
    id: "stadt",
    label: "Stadt Osnabrück",
    hint: "Nur Schulen aus der Stadt Osnabrück",
    tone: "default",
    match: (r) => r.school_location === "Stadt Osnabrück",
  },
  {
    id: "land",
    label: "Landkreis Osnabrück",
    hint: "Nur Schulen aus dem Landkreis Osnabrück",
    tone: "default",
    match: (r) => r.school_location === "Landkreis Osnabrück",
  },
  {
    id: "not-confirmed",
    label: "E-Mail noch nicht bestätigt",
    hint:
      "Schulen, deren Account noch auf die E-Mail-Bestätigung wartet – ideal zum Abarbeiten",
    tone: "attention",
    match: (r, ctx) => {
      if (!r.user_id) return false;
      if (!ctx.emailConfirmedMap) return false;
      // null im Map = User existiert, aber email_confirmed_at ist null
      // undefined = User nicht im Map (z.B. gelöscht) → konservativ NICHT matchen
      if (!ctx.emailConfirmedMap.has(r.user_id)) return false;
      const confirmedAt = ctx.emailConfirmedMap.get(r.user_id);
      return confirmedAt === null;
    },
  },
];

// ════════ SQL-LIKE Matching ═════════════════════════════════════════════

function sqlLikeToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const converted = escaped.replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp("^" + converted + "$", "i");
}

export function matchSqlLike(value: string, pattern: string): boolean {
  const p = pattern.trim();
  if (!p) return true;
  if (!p.includes("%") && !p.includes("_")) {
    return value.toLowerCase().includes(p.toLowerCase());
  }
  try {
    return sqlLikeToRegex(p).test(value);
  } catch {
    return false;
  }
}

// ════════ Schul-Namens-Normalisierung & Gruppierung ═════════════════════

export function normalizeSchoolKey(name: string | null): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export type SchoolGroup<T extends FilterableRow & { created_at: string }> = {
  key: string;
  schoolName: string;
  versions: T[];
  latest: T;
};

/** Gruppiert eingegangene Bestandsaufnahmen nach normalisiertem Schulnamen.
 *  Erwartet Zeilen, die bereits nach created_at DESC sortiert sind, sodass
 *  die jüngste Version pro Schule der erste Eintrag wird. */
export function groupBySchool<
  T extends FilterableRow & { created_at: string },
>(rows: T[]): SchoolGroup<T>[] {
  const map = new Map<string, SchoolGroup<T>>();
  for (const row of rows) {
    const key = normalizeSchoolKey(row.school_name);
    if (!key) {
      // Zeilen ohne Schulnamen: eigener Eintrag
      map.set(`__no-name-${row.id}`, {
        key: row.id,
        schoolName: "(ohne Namen)",
        versions: [row],
        latest: row,
      });
      continue;
    }
    const existing = map.get(key);
    if (existing) {
      existing.versions.push(row);
    } else {
      map.set(key, {
        key,
        schoolName: row.school_name ?? "(ohne Namen)",
        versions: [row],
        latest: row,
      });
    }
  }
  return Array.from(map.values());
}

// ════════ Kombiniertes Filtern + Suchen ═════════════════════════════════

export type FilterState = {
  query: string;
  activeFilters: Set<FilterId>;
};

/** Wendet Suchtext + aktive Filter (mit UND-Verknüpfung) auf die Gruppen
 *  an. „latest" einer Gruppe ist die Referenz für Kriterien-Filter. */
export function applyFilters<
  T extends FilterableRow & { created_at: string },
>(
  groups: SchoolGroup<T>[],
  state: FilterState,
  ctx: FilterContext,
): SchoolGroup<T>[] {
  const activeDefs = FILTERS.filter((f) => state.activeFilters.has(f.id));
  return groups.filter((g) => {
    if (!matchSqlLike(g.schoolName, state.query)) return false;
    for (const f of activeDefs) {
      if (!f.match(g.latest, ctx)) return false;
    }
    return true;
  });
}

/** Parst URL-Search-Params zu einem FilterState. */
export function parseFilterParams(searchParams: URLSearchParams): FilterState {
  const query = searchParams.get("q") ?? "";
  const raw = searchParams.get("filters") ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is FilterId =>
      FILTERS.some((f) => f.id === s),
    );
  return { query, activeFilters: new Set(ids) };
}

/** Serialisiert einen FilterState zurück in URL-Params (für Download-Links). */
export function serializeFilterParams(state: FilterState): string {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set("q", state.query.trim());
  if (state.activeFilters.size > 0) {
    params.set("filters", Array.from(state.activeFilters).join(","));
  }
  return params.toString();
}
