"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Download,
  Eye,
  Layers,
  Search,
  X,
} from "lucide-react";

type Row = {
  id: string;
  school_name: string | null;
  school_location: string | null;
  student_count: string | number | null;
  respondent_role: string | null;
  status: string;
  created_at: string;
  // Filter-relevante Felder
  share_practice: string | null;
  pioneer_interest: string | null;
  has_best_practice: string | null;
  student_support: string | null;
  ai_usage: string | null;
};

type Group = {
  key: string;
  schoolName: string;
  versions: Row[]; // sortiert DESC, [0] = jüngste
  latest: Row;
};

// ════════ SQL-LIKE Matcher ═══════════════════════════════════════════════

function sqlLikeToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const converted = escaped.replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp("^" + converted + "$", "i");
}

function matchSqlLike(value: string, pattern: string): boolean {
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

// ════════ Vorauswahlen / Filter-Chips ════════════════════════════════════

type FilterId =
  | "best-practice-teilen"
  | "best-practice-vorhanden"
  | "vorreiter"
  | "studentische-hilfe"
  | "ki-im-einsatz"
  | "stadt"
  | "land";

type FilterDef = {
  id: FilterId;
  label: string;
  hint: string;
  match: (row: Row) => boolean;
};

const FILTERS: FilterDef[] = [
  {
    id: "best-practice-teilen",
    label: "Best-Practice teilbar",
    hint: "Schulen, die ihre Erfahrungen weitergeben möchten",
    match: (r) => (r.share_practice ?? "").toLowerCase().startsWith("ja"),
  },
  {
    id: "vorreiter",
    label: "Interesse Vorreiter",
    hint: "Schulen mit Interesse, Pilotschule zu werden",
    match: (r) => (r.pioneer_interest ?? "").toLowerCase().startsWith("ja"),
  },
  {
    id: "best-practice-vorhanden",
    label: "Hat Best-Practice",
    hint: "Schulen, die bereits gelungene Beispiele haben",
    match: (r) => (r.has_best_practice ?? "").toLowerCase().startsWith("ja"),
  },
  {
    id: "studentische-hilfe",
    label: "Studentische Hilfe gewünscht",
    hint: "Schulen, die studentische Unterstützung möchten",
    match: (r) => (r.student_support ?? "").toLowerCase().startsWith("ja"),
  },
  {
    id: "ki-im-einsatz",
    label: "KI bereits im Einsatz",
    hint: "Schulen, in denen mindestens einzelne Lehrkräfte KI nutzen",
    match: (r) => (r.ai_usage ?? "").toLowerCase().startsWith("ja"),
  },
  {
    id: "stadt",
    label: "Stadt Osnabrück",
    hint: "Nur Schulen aus der Stadt Osnabrück",
    match: (r) => r.school_location === "Stadt Osnabrück",
  },
  {
    id: "land",
    label: "Landkreis Osnabrück",
    hint: "Nur Schulen aus dem Landkreis Osnabrück",
    match: (r) => r.school_location === "Landkreis Osnabrück",
  },
];

// ════════ Gruppierung nach Schul-Name ════════════════════════════════════

function normalizeKey(name: string | null): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function groupRows(rows: Row[]): Group[] {
  const map = new Map<string, Group>();
  for (const row of rows) {
    const key = normalizeKey(row.school_name);
    if (!key) {
      // Zeilen ohne Schulnamen bekommen einen eindeutigen Key (eigener Eintrag)
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
      // versions sind durch Vorsortierung DESC bereits korrekt, latest bleibt
    } else {
      map.set(key, {
        key,
        schoolName: row.school_name!,
        versions: [row],
        latest: row,
      });
    }
  }
  return Array.from(map.values());
}

// ════════ UI ═════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    neu: { label: "Neu", class: "bg-accent/10 text-accent-strong" },
    gelesen: { label: "Gelesen", class: "bg-green-100 text-green-700" },
    archiviert: { label: "Archiviert", class: "bg-gray-100 text-gray-500" },
  };
  const s = map[status] ?? {
    label: status,
    class: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.class}`}
    >
      {s.label}
    </span>
  );
}

const FMT_DAY = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const FMT_DAY_LONG = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const FMT_DAY_TIME = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// Versions-Dropdown – kompakter Selector mit Liste der Einreichungen
function VersionPicker({
  group,
  selectedId,
  onSelect,
}: {
  group: Group;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (group.versions.length <= 1) return null;

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        <Layers className="h-3 w-3" aria-hidden="true" />
        {group.versions.length} Einreichungen
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={`Einreichungen von ${group.schoolName}`}
          className="absolute left-0 top-full z-30 mt-1.5 w-72 overflow-hidden rounded-lg border border-border bg-white shadow-lg"
        >
          <div className="border-b border-border bg-bg px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-light">
              Version auswählen
            </p>
            <p className="mt-0.5 text-[11px] text-text-light">
              Die jüngste Einreichung ist Standard.
            </p>
          </div>
          <ul className="max-h-72 overflow-auto">
            {group.versions.map((v, i) => {
              const isSelected = v.id === selectedId;
              const isLatest = i === 0;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelect(v.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-[12px] transition-colors hover:bg-bg ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                        isSelected ? "bg-primary" : "bg-border"
                      }`}
                    />
                    <span className="flex-1">
                      <span className="block font-semibold text-text">
                        {FMT_DAY_TIME.format(new Date(v.created_at))}
                      </span>
                      <span className="block text-[10.5px] text-text-light">
                        {isLatest ? "Jüngste Einreichung" : "Ältere Version"}
                        {" · "}
                        Status: {v.status}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ════════ Hauptkomponente ════════════════════════════════════════════════

export default function BestandsaufnahmeAdminTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<FilterId>>(new Set());
  // Pro Gruppe: ID der gerade ausgewählten Version (Default = latest)
  const [selectedByKey, setSelectedByKey] = useState<Map<string, string>>(
    () => new Map(),
  );

  // Gruppen aus den Roh-Zeilen (memoisiert)
  const groups = useMemo(() => groupRows(rows), [rows]);

  const filtered = useMemo(() => {
    const filters = FILTERS.filter((f) => activeFilters.has(f.id));
    return groups.filter((g) => {
      // Schulname-Match (gilt für die Gruppe, nicht für einzelne Versionen)
      if (!matchSqlLike(g.schoolName, query)) return false;
      // Kriterien-Filter: die JÜNGSTE Version muss matchen (sonst wären
      // alte Status falsch). Falls anders gewünscht, hier auf any() umstellen.
      for (const f of filters) {
        if (!f.match(g.latest)) return false;
      }
      return true;
    });
  }, [groups, query, activeFilters]);

  const hasWildcards = query.includes("%") || query.includes("_");
  const totalUnique = groups.length;
  const totalSubmissions = rows.length;
  const dedupedCount = totalSubmissions - totalUnique;
  const matchCount = filtered.length;

  function toggleFilter(id: FilterId) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getSelectedRow(g: Group): Row {
    const id = selectedByKey.get(g.key);
    return g.versions.find((v) => v.id === id) ?? g.latest;
  }

  function setSelected(key: string, id: string) {
    setSelectedByKey((prev) => {
      const next = new Map(prev);
      next.set(key, id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* ── Such- und Filter-Leiste ───────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label
              htmlFor="bestandsaufnahme-search"
              className="mb-2 block text-sm font-medium text-text"
            >
              Schule suchen
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light"
                aria-hidden="true"
              />
              <input
                id="bestandsaufnahme-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="z.B. Stüve  ·  %schule  ·  GS_%"
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition-colors focus:border-accent-strong focus:ring-2 focus:ring-accent-strong"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Suche zurücksetzen"
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-text-light transition-colors hover:bg-bg hover:text-primary"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* All-Markdown-Download – ankert visuell an der Suchleiste */}
          <a
            href="/api/admin/bestandsaufnahme/export-all-markdown"
            download
            className="group inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition-all hover:-translate-y-0.5 hover:bg-primary/10 hover:shadow-sm"
            title="Alle Bestandsaufnahmen als Sammel-Markdown herunterladen"
          >
            <Download
              className="h-4 w-4 transition-transform group-hover:translate-y-0.5"
              aria-hidden="true"
            />
            Alle als Markdown
          </a>
        </div>

        {/* Filter-Chips */}
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
            Vorauswahl filtern nach
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => {
              const isActive = activeFilters.has(f.id);
              const matches = groups.filter(
                (g) =>
                  matchSqlLike(g.schoolName, query) &&
                  // andere bereits aktive Filter auch berücksichtigen
                  FILTERS.filter((x) => activeFilters.has(x.id) && x.id !== f.id).every(
                    (x) => x.match(g.latest),
                  ) &&
                  f.match(g.latest),
              ).length;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFilter(f.id)}
                  title={f.hint}
                  aria-pressed={isActive}
                  className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-all ${
                    isActive
                      ? "border-primary bg-primary text-white shadow-sm"
                      : "border-border bg-white text-text-light hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {f.label}
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-1.5 py-0 text-[10px] font-bold tabular-nums ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {matches}
                  </span>
                </button>
              );
            })}
            {activeFilters.size > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilters(new Set())}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] text-text-light hover:text-primary"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Filter zurücksetzen
              </button>
            )}
          </div>
        </div>

        {/* Status-Zeile */}
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-light">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-primary"
            />
            <strong className="text-text tabular-nums">{matchCount}</strong>{" "}
            {matchCount === 1 ? "Schule" : "Schulen"} angezeigt
            {(query || activeFilters.size > 0) && (
              <span className="text-text-light/70">
                {" "}
                · von {totalUnique} eindeutigen
              </span>
            )}
          </span>
          {dedupedCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3 w-3" aria-hidden="true" />
              {dedupedCount} Mehrfacheinreichung{dedupedCount === 1 ? "" : "en"} gruppiert
            </span>
          )}
          {query && (
            <span>
              · Suche im {hasWildcards ? "SQL-LIKE" : "Enthält"}-Modus
            </span>
          )}
        </p>

        <p className="mt-2 text-xs text-text-light">
          Tipp: <code className="rounded bg-bg px-1 py-0.5 font-mono">%</code>{" "}
          steht für beliebig viele Zeichen,{" "}
          <code className="rounded bg-bg px-1 py-0.5 font-mono">_</code> für
          genau eines (SQL-LIKE). Mehrere Filter werden mit UND verknüpft.
        </p>
      </div>

      {/* ── Tabelle / Karten ─────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-white py-16 text-center text-text-light">
          {query || activeFilters.size > 0
            ? "Keine Schule erfüllt die aktuellen Such-/Filterkriterien."
            : "Noch keine Bestandsaufnahmen eingegangen."}
        </div>
      ) : (
        <div className="min-h-[400px] overflow-visible rounded-xl border border-border bg-white shadow-sm">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Schule
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Standort
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Schüler/innen
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Datum
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Aktionen</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((g) => {
                  const selected = getSelectedRow(g);
                  return (
                    <tr key={g.key} className="transition-colors hover:bg-bg/50">
                      <td className="px-4 py-3 align-top">
                        <p className="text-sm font-medium text-text">
                          {g.schoolName}
                        </p>
                        {g.versions.length > 1 && (
                          <div className="mt-1.5">
                            <VersionPicker
                              group={g}
                              selectedId={selected.id}
                              onSelect={(id) => setSelected(g.key, id)}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-light align-top">
                        {selected.school_location}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-light align-top">
                        {selected.student_count}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <StatusBadge status={selected.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-text-light align-top">
                        {FMT_DAY.format(new Date(selected.created_at))}
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <div className="inline-flex items-center gap-1.5">
                          <a
                            href={`/api/admin/bestandsaufnahme/${selected.id}/export-markdown`}
                            download
                            title="Diese Bestandsaufnahme als Markdown"
                            aria-label="Als Markdown herunterladen"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-text-light transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                          <Link
                            href={`/best-practice/admin/bestandsaufnahme/${selected.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            Ansehen
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-border md:hidden">
            {filtered.map((g) => {
              const selected = getSelectedRow(g);
              return (
                <div key={g.key} className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">
                        {g.schoolName}
                      </p>
                      {g.versions.length > 1 && (
                        <div className="mt-1.5">
                          <VersionPicker
                            group={g}
                            selectedId={selected.id}
                            onSelect={(id) => setSelected(g.key, id)}
                          />
                        </div>
                      )}
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>
                  <p className="mb-1 text-xs text-text-light">
                    {selected.school_location} · {selected.student_count}{" "}
                    Schüler/innen
                  </p>
                  <p className="mb-3 text-xs text-text-light">
                    {FMT_DAY_LONG.format(new Date(selected.created_at))}
                  </p>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/best-practice/admin/bestandsaufnahme/${selected.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      Ansehen
                    </Link>
                    <a
                      href={`/api/admin/bestandsaufnahme/${selected.id}/export-markdown`}
                      download
                      title="Als Markdown"
                      aria-label="Als Markdown herunterladen"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-text-light transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
