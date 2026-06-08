"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Download, Eye, Search, X } from "lucide-react";
import type { ApplicationStatus } from "@/lib/types";
import ApplicationStatusBadge from "./ApplicationStatusBadge";
import {
  APPLICATION_FILTERS,
  type ApplicationFilterId,
  type ApplicationFilterRow,
  applyApplicationFilters,
  matchSqlLike,
  serializeApplicationFilterParams,
} from "@/lib/applications/filters";

interface ApplicationRow extends ApplicationFilterRow {
  status: ApplicationStatus;
}

interface ApplicationsTableProps {
  applications: ApplicationRow[];
}

function getTypeLabel(type: string) {
  return type === "hilfskraefte" ? "Stud. Hilfskräfte" : "Tool-Lizenzen";
}

function getTypeBadgeClass(type: string) {
  return type === "hilfskraefte"
    ? "bg-purple-100 text-purple-700"
    : "bg-teal-dark/10 text-teal-dark";
}

function getDetailHref(type: string, id: string) {
  return type === "hilfskraefte"
    ? `/best-practice/admin/antraege/hilfskraefte/${id}`
    : `/best-practice/admin/antraege/tool-lizenzen/${id}`;
}

function getExportHref(type: string, id: string) {
  return `/api/admin/antraege/${type}/${id}/export-markdown`;
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

export default function ApplicationsTable({
  applications,
}: ApplicationsTableProps) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<ApplicationFilterId>>(
    new Set(),
  );

  const filtered = useMemo(
    () => applyApplicationFilters(applications, { query, activeFilters }),
    [applications, query, activeFilters],
  );

  const hasWildcards = query.includes("%") || query.includes("_");
  const isFiltered = query.trim() !== "" || activeFilters.size > 0;
  const matchCount = filtered.length;

  function toggleFilter(id: ApplicationFilterId) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const downloadQuery = serializeApplicationFilterParams({
    query,
    activeFilters,
  });
  const downloadUrl =
    `/api/admin/antraege/export-all-markdown` +
    (downloadQuery ? `?${downloadQuery}` : "");

  return (
    <div className="space-y-4">
      {/* ── Such- und Filter-Leiste ───────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label
              htmlFor="antraege-search"
              className="mb-2 block text-sm font-medium text-text"
            >
              Antrag suchen
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light"
                aria-hidden="true"
              />
              <input
                id="antraege-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Schule, Ansprechpartner oder E-Mail · %lehrkraft%"
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
                ? `Aktuell gefilterte ${matchCount} Anträge als Sammel-Markdown`
                : "Alle Anträge als Sammel-Markdown"
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
            {APPLICATION_FILTERS.map((f) => {
              const isActive = activeFilters.has(f.id);
              const matches = applications.filter(
                (r) =>
                  (matchSqlLike(r.school_name ?? "", query) ||
                    matchSqlLike(r.contact_person ?? "", query) ||
                    matchSqlLike(r.email ?? "", query)) &&
                  APPLICATION_FILTERS.filter(
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
            {matchCount === 1 ? "Antrag" : "Anträge"} angezeigt
            {isFiltered && (
              <span className="text-text-light/70">
                {" "}
                · von {applications.length} gesamt
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
          genau eines (SQL-LIKE). Such-Felder: Schulname, Ansprechpartner,
          E-Mail. Der Download oben rechts berücksichtigt die aktuelle Auswahl.
        </p>
      </div>

      {/* ── Tabelle / Karten ─────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-white py-16 text-center text-text-light">
          {isFiltered
            ? "Kein Antrag erfüllt die aktuellen Such-/Filterkriterien."
            : "Noch keine Anträge eingegangen."}
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
                    Schule
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Typ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Kontakt
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
                {filtered.map((app) => (
                  <tr
                    key={`${app.type}-${app.id}`}
                    className="transition-colors hover:bg-bg/50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-text align-top">
                      {app.school_name}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex text-xs px-2 py-0.5 rounded-full ${getTypeBadgeClass(app.type)}`}
                      >
                        {getTypeLabel(app.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-light align-top">
                      {app.contact_person}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <ApplicationStatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-text-light align-top whitespace-nowrap">
                      {FMT_DAY.format(new Date(app.created_at))}
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="inline-flex items-center gap-1.5">
                        <a
                          href={getExportHref(app.type, app.id)}
                          download
                          title="Diesen Antrag als Markdown"
                          aria-label="Als Markdown herunterladen"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-text-light transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                        >
                          <Download
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </a>
                        <Link
                          href={getDetailHref(app.type, app.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                        >
                          <Eye
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Ansehen
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="divide-y divide-border md:hidden">
            {filtered.map((app) => (
              <div key={`${app.type}-${app.id}`} className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-text">
                    {app.school_name}
                  </h3>
                  <ApplicationStatusBadge status={app.status} />
                </div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex text-xs px-2 py-0.5 rounded-full ${getTypeBadgeClass(app.type)}`}
                  >
                    {getTypeLabel(app.type)}
                  </span>
                </div>
                <p className="mb-3 text-xs text-text-light">
                  {app.contact_person} ·{" "}
                  {FMT_DAY_LONG.format(new Date(app.created_at))}
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    href={getDetailHref(app.type, app.id)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    Ansehen
                  </Link>
                  <a
                    href={getExportHref(app.type, app.id)}
                    download
                    title="Als Markdown"
                    aria-label="Als Markdown herunterladen"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-text-light transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
