"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Download, Pencil, Search, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { BestPractice } from "@/lib/types";
import {
  BEST_PRACTICE_FILTERS,
  type BestPracticeFilterId,
  type BestPracticeFilterRow,
  applyBestPracticeFilters,
  matchSqlLike,
  serializeBestPracticeFilterParams,
} from "@/lib/bestpractice/filters";

interface AdminTableProps {
  practices: BestPractice[];
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

function toFilterRow(p: BestPractice): BestPracticeFilterRow {
  return {
    id: p.id,
    title: p.title ?? "",
    school_name: p.school_name ?? "",
    subject: p.subject ?? null,
    grade_level: p.grade_level ?? null,
    published: Boolean(p.published),
    has_vorlage: Boolean(p.vorlage_data),
    created_at: p.created_at,
  };
}

export default function AdminTable({ practices }: AdminTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<BestPracticeFilterId>>(
    new Set(),
  );

  // Vorab in Filter-Rows transformieren (memoisiert)
  const filterRows = useMemo(() => practices.map(toFilterRow), [practices]);
  const filteredRows = useMemo(
    () => applyBestPracticeFilters(filterRows, { query, activeFilters }),
    [filterRows, query, activeFilters],
  );
  const filteredIds = useMemo(
    () => new Set(filteredRows.map((r) => r.id)),
    [filteredRows],
  );
  const filtered = useMemo(
    () => practices.filter((p) => filteredIds.has(p.id)),
    [practices, filteredIds],
  );

  const hasWildcards = query.includes("%") || query.includes("_");
  const isFiltered = query.trim() !== "" || activeFilters.size > 0;
  const matchCount = filtered.length;

  function toggleFilter(id: BestPracticeFilterId) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(id: string, title: string) {
    if (
      !confirm(
        `"${title}" wirklich löschen? Dies kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return;
    }
    const supabase = createClient();
    await supabase
      .from("best_practice_categories")
      .delete()
      .eq("best_practice_id", id);
    await supabase.from("best_practices").delete().eq("id", id);
    router.refresh();
  }

  const downloadQuery = serializeBestPracticeFilterParams({
    query,
    activeFilters,
  });
  const downloadUrl =
    `/api/admin/bestpractice/export-all-markdown` +
    (downloadQuery ? `?${downloadQuery}` : "");

  return (
    <div className="space-y-4">
      {/* ── Such- und Filter-Leiste ───────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label
              htmlFor="bp-search"
              className="mb-2 block text-sm font-medium text-text"
            >
              Best-Practice suchen
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light"
                aria-hidden="true"
              />
              <input
                id="bp-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Titel, Schule, Fach oder Klasse · %deutsch%"
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

          <a
            href={downloadUrl}
            download
            title={
              isFiltered
                ? `Aktuell gefilterte ${matchCount} Beiträge als Sammel-Markdown`
                : "Alle Beiträge als Sammel-Markdown"
            }
            className={`group inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-sm ${
              isFiltered
                ? "border-accent-strong/30 bg-accent/10 text-accent-strong hover:bg-accent/15"
                : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
            }`}
          >
            <Download
              className="h-4 w-4 transition-transform group-hover:translate-y-0.5"
              aria-hidden="true"
            />
            {isFiltered ? (
              <>
                <span className="tabular-nums">{matchCount}</span>{" "}
                gefilterte als Markdown
              </>
            ) : (
              <>Alle als Markdown</>
            )}
          </a>
        </div>

        {/* Filter-Chips */}
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
            Vorauswahl filtern nach
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {BEST_PRACTICE_FILTERS.map((f) => {
              const isActive = activeFilters.has(f.id);
              const matches = filterRows.filter(
                (r) =>
                  (matchSqlLike(r.title ?? "", query) ||
                    matchSqlLike(r.school_name ?? "", query) ||
                    matchSqlLike(r.subject ?? "", query) ||
                    matchSqlLike(r.grade_level ?? "", query)) &&
                  BEST_PRACTICE_FILTERS.filter(
                    (x) => activeFilters.has(x.id) && x.id !== f.id,
                  ).every((x) => x.match(r)) &&
                  f.match(r),
              ).length;

              const isAttention = f.tone === "attention";
              const activeClasses = isAttention
                ? "border-accent-strong bg-accent-strong text-white shadow-sm"
                : "border-primary bg-primary text-white shadow-sm";
              const inactiveClasses = isAttention
                ? "border-accent-strong/35 bg-accent/5 text-accent-strong hover:border-accent-strong hover:bg-accent/10"
                : "border-border bg-white text-text-light hover:border-primary/40 hover:text-primary";
              const badgeActive = "bg-white/20 text-white";
              const badgeInactive = isAttention
                ? "bg-accent-strong/15 text-accent-strong"
                : "bg-primary/10 text-primary";

              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFilter(f.id)}
                  title={f.hint}
                  aria-pressed={isActive}
                  className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-all ${
                    isActive ? activeClasses : inactiveClasses
                  }`}
                >
                  {isAttention && (
                    <AlertCircle
                      className="h-3 w-3 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  {f.label}
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-1.5 py-0 text-[10px] font-bold tabular-nums ${
                      isActive ? badgeActive : badgeInactive
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
            {matchCount === 1 ? "Beitrag" : "Beiträge"} angezeigt
            {isFiltered && (
              <span className="text-text-light/70">
                {" "}
                · von {practices.length} gesamt
              </span>
            )}
          </span>
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
          genau eines (SQL-LIKE). Such-Felder: Titel, Schule, Fach, Klasse.
          Der Download oben rechts berücksichtigt die aktuelle Auswahl.
        </p>
      </div>

      {/* ── Tabelle / Karten ─────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-white py-16 text-center text-text-light">
          {isFiltered
            ? "Kein Beitrag erfüllt die aktuellen Such-/Filterkriterien."
            : "Noch keine Best-Practice-Beiträge vorhanden."}
        </div>
      ) : (
        <div className="min-h-[300px] overflow-visible rounded-xl border border-border bg-white shadow-sm">
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Titel
                  </th>
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
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Datum
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-bg/50">
                    <td className="px-4 py-3 text-sm font-medium text-text align-top">
                      <div className="flex items-center gap-2">
                        <span>{p.title}</span>
                        {p.vorlage_data && (
                          <span
                            title="Beitrag aus strukturierter Vorlage"
                            className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider text-primary"
                          >
                            Vorlage
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-light align-top">
                      {p.school_name}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {p.published ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Veröffentlicht
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                          Entwurf
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-light align-top whitespace-nowrap">
                      {FMT_DAY.format(new Date(p.created_at))}
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="inline-flex items-center gap-1.5">
                        <a
                          href={`/api/admin/bestpractice/${p.id}/export-markdown`}
                          download
                          title="Diesen Beitrag als Markdown"
                          aria-label="Als Markdown herunterladen"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-text-light transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                        >
                          <Download
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </a>
                        <Link
                          href={`/best-practice/admin/${p.id}/bearbeiten`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                        >
                          <Pencil
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Bearbeiten
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.title)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                        >
                          <Trash2
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="divide-y divide-border md:hidden">
            {filtered.map((p) => (
              <div key={p.id} className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-text">
                        {p.title}
                      </h3>
                      {p.vorlage_data && (
                        <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider text-primary">
                          Vorlage
                        </span>
                      )}
                    </div>
                  </div>
                  {p.published ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 shrink-0">
                      Veröffentlicht
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 shrink-0">
                      Entwurf
                    </span>
                  )}
                </div>
                <p className="mb-3 text-xs text-text-light">
                  {p.school_name} · {FMT_DAY_LONG.format(new Date(p.created_at))}
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/best-practice/admin/${p.id}/bearbeiten`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Bearbeiten
                  </Link>
                  <a
                    href={`/api/admin/bestpractice/${p.id}/export-markdown`}
                    download
                    title="Als Markdown"
                    aria-label="Als Markdown herunterladen"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-text-light transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id, p.title)}
                    title="Beitrag löschen"
                    aria-label="Beitrag löschen"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
