"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CircleSlash, Search } from "lucide-react";
import type { SchoolParticipation } from "@/lib/schulungen/types";

type Filter = "all" | "registered" | "pending";

/**
 * Übersicht ALLER teilnahmeberechtigten Schulen (aus der
 * Bestandsaufnahme) mit Quotennutzung. Macht sichtbar, welche Schulen
 * sich noch nicht angemeldet haben, damit man gezielt nachfassen kann.
 */
export default function SchoolsPanel({
  schools,
  loading,
}: {
  schools: SchoolParticipation[];
  loading: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Tab-Zähler passen exakt zu den jeweils gefilterten Listen.
  // "eligible*" (= aus der Bestandsaufnahme) speist die Kopfzeile, da
  // sich die Soll-/Ist-Aussage nur auf teilnahmeberechtigte Schulen
  // bezieht – importierte Schulen ohne Bestandsaufnahme zählen nicht.
  const counts = useMemo(() => {
    const eligible = schools.filter((s) => s.in_bestandsaufnahme);
    return {
      all: schools.length,
      registered: schools.filter((s) => s.has_registered).length,
      pending: eligible.filter((s) => !s.has_registered).length,
      eligibleTotal: eligible.length,
      eligibleRegistered: eligible.filter((s) => s.has_registered).length,
    };
  }, [schools]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = schools;
    if (filter === "registered") list = list.filter((s) => s.has_registered);
    if (filter === "pending")
      list = list.filter((s) => s.in_bestandsaufnahme && !s.has_registered);
    if (q)
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.city ?? "").toLowerCase().includes(q)
      );
    // Nicht-Angemeldete zuerst (fallen auf), dann nach Name.
    return [...list].sort(
      (a, b) =>
        Number(a.has_registered) - Number(b.has_registered) ||
        a.name.localeCompare(b.name, "de")
    );
  }, [schools, filter, query]);

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Alle", count: counts.all },
    { key: "registered", label: "Angemeldet", count: counts.registered },
    { key: "pending", label: "Noch nicht angemeldet", count: counts.pending },
  ];

  return (
    <section
      aria-labelledby="schools-heading"
      className="rounded-2xl border border-border bg-white p-5 shadow-sm md:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="schools-heading" className="text-base font-bold text-text">
            Schulen &amp; Quoten
          </h2>
          <p className="mt-1 text-xs text-text-light">
            {counts.eligibleRegistered} von {counts.eligibleTotal}{" "}
            teilnahmeberechtigten Schulen angemeldet · max. 2 Lehrkräfte und 1
            Schulleitung je Schule (global).
          </p>
        </div>
        <div className="relative w-full sm:w-64">
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
      </div>

      {/* Filter */}
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Schulen filtern">
        {tabs.map((tab) => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(tab.key)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-primary text-white"
                  : "bg-bg text-text-light hover:bg-primary/5 hover:text-primary"
              }`}
            >
              {tab.label}
              <span
                className={`tabular-nums ${
                  active ? "text-white/80" : "text-text-light"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Schul-Raster */}
      {loading ? (
        <p className="mt-5 text-sm text-text-light">Lade Schulen …</p>
      ) : visible.length === 0 ? (
        <p className="mt-5 rounded-xl border border-border bg-bg p-4 text-sm text-text-light">
          {query
            ? "Keine Schule gefunden."
            : filter === "pending"
              ? "Alle teilnahmeberechtigten Schulen haben sich angemeldet. 🎉"
              : "Noch keine Daten – starten Sie den Import über die Karte „Excel-Mehrfachimport“."}
        </p>
      ) : (
        <ul
          className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Schulen mit Quotennutzung"
        >
          {visible.map((school) => (
            <SchoolCard key={school.school_key} school={school} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SchoolCard({ school }: { school: SchoolParticipation }) {
  const pending = !school.has_registered;
  const notEligible = !school.in_bestandsaufnahme;
  // Über der Quote = mehr Anmeldungen als erlaubt (kommt durch
  // „Trotz Quote zulassen" / Override zustande). Schule rot markieren.
  const teacherOver = school.teachers_used > school.teacher_limit;
  const leadershipOver = school.leadership_used > school.leadership_limit;
  const overQuota = teacherOver || leadershipOver;

  // Zahl pro Rolle: rot bei Überschreitung, Akzent bei genau voll.
  const countClass = (used: number, limit: number) =>
    used > limit
      ? "text-red-700"
      : used >= limit
        ? "text-accent-text"
        : "text-text";

  return (
    <li
      className={`rounded-xl border p-3.5 ${
        overQuota
          ? "border-red-300 bg-red-50/60"
          : pending
            ? "border-dashed border-border bg-bg/40"
            : "border-border bg-bg/60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`truncate text-sm font-semibold ${overQuota ? "text-red-800" : "text-text"}`}>
            {school.name}
          </p>
          {school.city && (
            <p className="text-[11px] text-text-light">
              {school.plz ? `${school.plz} ` : ""}
              {school.city}
            </p>
          )}
          {overQuota && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
              <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
              Über Quote
            </span>
          )}
        </div>
        {pending ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-text">
            <CircleSlash className="h-3 w-3" aria-hidden="true" />
            offen
          </span>
        ) : (
          <p className="shrink-0 text-right text-[11px] leading-relaxed text-text-light">
            Lehrkräfte{" "}
            <span className={`font-bold tabular-nums ${countClass(school.teachers_used, school.teacher_limit)}`}>
              {school.teachers_used}/{school.teacher_limit}
            </span>
            <br />
            Leitung{" "}
            <span className={`font-bold tabular-nums ${countClass(school.leadership_used, school.leadership_limit)}`}>
              {school.leadership_used}/{school.leadership_limit}
            </span>
          </p>
        )}
      </div>

      {pending ? (
        <p className="mt-2 text-[11px] text-text-light">
          {notEligible
            ? "Nicht in der Bestandsaufnahme"
            : "Hat noch niemanden angemeldet"}
        </p>
      ) : (
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
      )}
    </li>
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
            used > limit ? "bg-red-500" : color
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
