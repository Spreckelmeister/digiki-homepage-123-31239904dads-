"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { SchoolQuotaUsage } from "@/lib/schulungen/types";

const PREVIEW_COUNT = 8;

/**
 * Quoten je Schule (global über alle Schulungen): max. 2 Lehrkräfte,
 * max. 1 Schulleitung. Vollste Schulen zuerst, damit Engpässe sofort
 * sichtbar sind.
 */
export default function QuotaPanel({
  quotas,
  loading,
}: {
  quotas: SchoolQuotaUsage[];
  loading: boolean;
}) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? quotas.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.city ?? "").toLowerCase().includes(q)
        )
      : quotas;
    return [...list].sort(
      (a, b) =>
        b.teachers_used +
          b.leadership_used -
          (a.teachers_used + a.leadership_used) || a.name.localeCompare(b.name)
    );
  }, [quotas, query]);

  const visible = showAll || query ? filtered : filtered.slice(0, PREVIEW_COUNT);

  return (
    <section
      aria-labelledby="quota-heading"
      className="rounded-2xl border border-border bg-white p-5 shadow-sm md:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="quota-heading" className="text-base font-bold text-text">
          Quoten je Schule
        </h2>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
          global
        </span>
      </div>
      <p className="mt-1 text-xs text-text-light">
        Max. 2 Lehrkräfte und 1 Schulleitung je Schule – über alle Schulungen
        hinweg.
      </p>

      <div className="relative mt-4">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Schule suchen …"
          aria-label="Schule suchen"
          className="w-full rounded-lg border border-border bg-bg py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-light focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <ul className="mt-4 space-y-3" aria-label="Schulen mit Quotennutzung">
        {loading && (
          <li className="rounded-xl border border-border bg-bg p-4 text-sm text-text-light">
            Lade Quoten …
          </li>
        )}
        {!loading && visible.length === 0 && (
          <li className="rounded-xl border border-border bg-bg p-4 text-sm text-text-light">
            {query
              ? "Keine Schule gefunden."
              : "Noch keine Schulen importiert – starten Sie den ersten Import über die Karte „Excel-Mehrfachimport“."}
          </li>
        )}
        {visible.map((school) => (
          <li
            key={school.school_id}
            className="rounded-xl border border-border bg-bg/60 p-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">
                  {school.name}
                </p>
                {school.city && (
                  <p className="text-[11px] text-text-light">
                    {school.plz ? `${school.plz} ` : ""}
                    {school.city}
                  </p>
                )}
              </div>
              <p className="shrink-0 text-right text-[11px] leading-relaxed text-text-light">
                Lehrkräfte{" "}
                <span
                  className={`font-bold tabular-nums ${
                    school.teachers_used >= school.teacher_limit
                      ? "text-accent-text"
                      : "text-text"
                  }`}
                >
                  {school.teachers_used}/{school.teacher_limit}
                </span>
                <br />
                Leitung{" "}
                <span
                  className={`font-bold tabular-nums ${
                    school.leadership_used >= school.leadership_limit
                      ? "text-accent-text"
                      : "text-text"
                  }`}
                >
                  {school.leadership_used}/{school.leadership_limit}
                </span>
              </p>
            </div>
            <div className="mt-2.5 space-y-1.5">
              <QuotaBar
                label="Lehrkräfte"
                used={school.teachers_used}
                limit={school.teacher_limit}
                color="bg-primary"
              />
              <QuotaBar
                label="Leitung"
                used={school.leadership_used}
                limit={school.leadership_limit}
                color="bg-primary-light"
              />
            </div>
          </li>
        ))}
      </ul>

      {!query && filtered.length > PREVIEW_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 text-xs font-semibold text-primary hover:underline"
        >
          {showAll
            ? "Weniger anzeigen"
            : `Alle ${filtered.length} Schulen anzeigen`}
        </button>
      )}
    </section>
  );
}

function QuotaBar({
  label,
  used,
  limit,
  color,
}: {
  label: string;
  used: number;
  limit: number;
  color: string;
}) {
  const percent = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[11px] text-text-light">{label}</span>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-white"
        role="img"
        aria-label={`${label}: ${used} von ${limit} Plätzen belegt`}
      >
        <div
          className={`h-1.5 rounded-full transition-all ${
            used > limit ? "bg-accent" : color
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
