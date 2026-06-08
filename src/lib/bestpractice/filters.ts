/**
 * Such-/Filter-Logik für die Best-Practice-Admin-Tabelle und den
 * Markdown-Sammel-Export.
 */

export type BestPracticeFilterRow = {
  id: string;
  title: string;
  school_name: string;
  subject: string | null;
  grade_level: string | null;
  published: boolean;
  has_vorlage: boolean;
  created_at: string;
};

export type BestPracticeFilterId =
  | "published"
  | "draft"
  | "has-vorlage"
  | "no-vorlage";

export type FilterTone = "default" | "attention";

export type BestPracticeFilterDef = {
  id: BestPracticeFilterId;
  label: string;
  hint: string;
  tone: FilterTone;
  match: (row: BestPracticeFilterRow) => boolean;
};

export const BEST_PRACTICE_FILTERS: BestPracticeFilterDef[] = [
  {
    id: "published",
    label: "Veröffentlicht",
    hint: "Beiträge, die öffentlich sichtbar sind",
    tone: "default",
    match: (r) => r.published === true,
  },
  {
    id: "draft",
    label: "Entwurf",
    hint: "Beiträge, die noch nicht veröffentlicht wurden",
    tone: "attention",
    match: (r) => r.published === false,
  },
  {
    id: "has-vorlage",
    label: "Aus Vorlage",
    hint: "Beiträge, die über das strukturierte Vorlagen-Formular eingereicht wurden",
    tone: "default",
    match: (r) => r.has_vorlage === true,
  },
  {
    id: "no-vorlage",
    label: "Freitext-Beitrag",
    hint: "Beiträge, die als reiner Freitext angelegt wurden",
    tone: "default",
    match: (r) => r.has_vorlage === false,
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

// ════════ State + Anwendung ═════════════════════════════════════════════

export type BestPracticeFilterState = {
  query: string;
  activeFilters: Set<BestPracticeFilterId>;
};

function matchSearch(row: BestPracticeFilterRow, query: string): boolean {
  const p = query.trim();
  if (!p) return true;
  return (
    matchSqlLike(row.title ?? "", p) ||
    matchSqlLike(row.school_name ?? "", p) ||
    matchSqlLike(row.subject ?? "", p) ||
    matchSqlLike(row.grade_level ?? "", p)
  );
}

export function applyBestPracticeFilters<T extends BestPracticeFilterRow>(
  rows: T[],
  state: BestPracticeFilterState,
): T[] {
  const activeDefs = BEST_PRACTICE_FILTERS.filter((f) =>
    state.activeFilters.has(f.id),
  );
  return rows.filter((r) => {
    if (!matchSearch(r, state.query)) return false;
    for (const f of activeDefs) {
      if (!f.match(r)) return false;
    }
    return true;
  });
}

export function parseBestPracticeFilterParams(
  searchParams: URLSearchParams,
): BestPracticeFilterState {
  const query = searchParams.get("q") ?? "";
  const raw = searchParams.get("filters") ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is BestPracticeFilterId =>
      BEST_PRACTICE_FILTERS.some((f) => f.id === s),
    );
  return { query, activeFilters: new Set(ids) };
}

export function serializeBestPracticeFilterParams(
  state: BestPracticeFilterState,
): string {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set("q", state.query.trim());
  if (state.activeFilters.size > 0) {
    params.set("filters", Array.from(state.activeFilters).join(","));
  }
  return params.toString();
}
