/**
 * Gemeinsame Such-/Filter-Logik für die Anträge-Admin-Tabelle und den
 * Markdown-Sammel-Export.
 */

import type { ApplicationStatus } from "@/lib/types";

export type ApplicationType = "hilfskraefte" | "tool-lizenzen";

export type ApplicationFilterRow = {
  id: string;
  type: ApplicationType;
  school_name: string;
  contact_person: string;
  email: string;
  status: ApplicationStatus;
  created_at: string;
};

export type ApplicationFilterId =
  | "type-hilfskraefte"
  | "type-tool-lizenzen"
  | "status-neu"
  | "status-in-bearbeitung"
  | "status-genehmigt"
  | "status-abgelehnt";

export type FilterTone = "default" | "attention";

export type ApplicationFilterDef = {
  id: ApplicationFilterId;
  label: string;
  hint: string;
  tone: FilterTone;
  match: (row: ApplicationFilterRow) => boolean;
};

export const APPLICATION_FILTERS: ApplicationFilterDef[] = [
  {
    id: "type-hilfskraefte",
    label: "Stud. Hilfskräfte",
    hint: "Nur Anträge für studentische Hilfskräfte",
    tone: "default",
    match: (r) => r.type === "hilfskraefte",
  },
  {
    id: "type-tool-lizenzen",
    label: "Tool-Lizenzen",
    hint: "Nur Anträge für Tool-Lizenzen",
    tone: "default",
    match: (r) => r.type === "tool-lizenzen",
  },
  {
    id: "status-neu",
    label: "Neu",
    hint: "Unbearbeitete neue Anträge – ideal zum Abarbeiten",
    tone: "attention",
    match: (r) => r.status === "neu",
  },
  {
    id: "status-in-bearbeitung",
    label: "In Bearbeitung",
    hint: "Aktuell laufende Anträge",
    tone: "default",
    match: (r) => r.status === "in_bearbeitung",
  },
  {
    id: "status-genehmigt",
    label: "Genehmigt",
    hint: "Bereits genehmigte Anträge",
    tone: "default",
    match: (r) => r.status === "genehmigt",
  },
  {
    id: "status-abgelehnt",
    label: "Abgelehnt",
    hint: "Abgelehnte Anträge",
    tone: "default",
    match: (r) => r.status === "abgelehnt",
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

export type ApplicationFilterState = {
  query: string;
  activeFilters: Set<ApplicationFilterId>;
};

/** Sucht in Schulname, Ansprechpartner und E-Mail kombiniert. */
function matchSearch(row: ApplicationFilterRow, query: string): boolean {
  const p = query.trim();
  if (!p) return true;
  return (
    matchSqlLike(row.school_name ?? "", p) ||
    matchSqlLike(row.contact_person ?? "", p) ||
    matchSqlLike(row.email ?? "", p)
  );
}

export function applyApplicationFilters<T extends ApplicationFilterRow>(
  rows: T[],
  state: ApplicationFilterState,
): T[] {
  const activeDefs = APPLICATION_FILTERS.filter((f) =>
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

export function parseApplicationFilterParams(
  searchParams: URLSearchParams,
): ApplicationFilterState {
  const query = searchParams.get("q") ?? "";
  const raw = searchParams.get("filters") ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is ApplicationFilterId =>
      APPLICATION_FILTERS.some((f) => f.id === s),
    );
  return { query, activeFilters: new Set(ids) };
}

export function serializeApplicationFilterParams(
  state: ApplicationFilterState,
): string {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set("q", state.query.trim());
  if (state.activeFilters.size > 0) {
    params.set("filters", Array.from(state.activeFilters).join(","));
  }
  return params.toString();
}
