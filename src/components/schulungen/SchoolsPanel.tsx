"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  CircleSlash,
  GraduationCap,
  Loader2,
  Mail,
  Phone,
  School,
  Search,
  Users,
  X,
} from "lucide-react";
import type { SchoolParticipation } from "@/lib/schulungen/types";
import { ROLE_LABELS } from "@/lib/schulungen/types";

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
  const [expanded, setExpanded] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolParticipation | null>(null);

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
      className="rounded-2xl border border-border bg-white shadow-sm"
    >
      <h2 id="schools-heading" className="px-5 py-4 md:px-6">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="flex items-center gap-2 text-left text-base font-bold text-text"
        >
          Schulen &amp; Quoten
          <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-bold tabular-nums text-text-light">
            {counts.eligibleRegistered}/{counts.eligibleTotal}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-text-light transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </h2>

      {expanded && (
        <div className="border-t border-border p-5 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-xs text-text-light">
              {counts.eligibleRegistered} von {counts.eligibleTotal}{" "}
              teilnahmeberechtigten Schulen angemeldet · max. 2 Lehrkräfte und 1
              Schulleitung je Schule (global).
            </p>
            <div className="relative w-full sm:w-64 sm:shrink-0">
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
            <SchoolCard
              key={school.school_key}
              school={school}
              onSelect={setSelectedSchool}
            />
          ))}
        </ul>
      )}
        </div>
      )}

      {selectedSchool && (
        <SchoolDetailDialog
          school={selectedSchool}
          onClose={() => setSelectedSchool(null)}
        />
      )}
    </section>
  );
}

function SchoolCard({
  school,
  onSelect,
}: {
  school: SchoolParticipation;
  onSelect: (s: SchoolParticipation) => void;
}) {
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
    <li>
      <button
        type="button"
        onClick={() => onSelect(school)}
        className={`w-full rounded-xl border p-3.5 text-left transition-colors hover:brightness-[0.97] active:brightness-95 ${
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
      </button>
    </li>
  );
}

// ─── School Detail Dialog (Desktop) ───────────────────────────────────────────
type SchoolDetailData = {
  contact: {
    email: string | null;
    phone: string | null;
    contact_person: string | null;
    principal_name: string | null;
  } | null;
  registrations: Array<{
    role: string;
    person: { id: string; first_name: string; last_name: string; email: string | null } | null;
    event: { id: string; kurs_nr: string; title: string; start_date: string | null } | null;
  }>;
  conflicts: Array<{
    id: string;
    reason: string;
    role: string;
    person: { id: string; first_name: string; last_name: string; email: string | null } | null;
    event: { id: string; kurs_nr: string; title: string; start_date: string | null } | null;
  }>;
};

function formatDate(iso: string | null): string {
  if (!iso) return "–";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso + "T00:00:00"));
}

function SchoolDetailDialog({
  school,
  onClose,
}: {
  school: SchoolParticipation;
  onClose: () => void;
}) {
  const [data, setData] = useState<SchoolDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/schulungen/school-detail?name=${encodeURIComponent(school.name)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok) throw new Error(body?.error ?? "Fehler");
        return body as SchoolDetailData;
      })
      .then((d) => { if (active) setData(d); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Fehler"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [school.name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  type PersonEntry = {
    person_id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    role: string;
    events: Array<{ kurs_nr: string; title: string; start_date: string | null }>;
    conflictReasons: string[];
  };

  const persons = useMemo<PersonEntry[]>(() => {
    if (!data) return [];
    const map = new Map<string, PersonEntry>();
    for (const r of data.registrations) {
      if (!r.person) continue;
      const pid = r.person.id;
      if (!map.has(pid)) {
        map.set(pid, {
          person_id: pid,
          first_name: r.person.first_name,
          last_name: r.person.last_name,
          email: r.person.email,
          role: r.role,
          events: [],
          conflictReasons: [],
        });
      }
      if (r.event) map.get(pid)!.events.push(r.event);
    }
    for (const c of data.conflicts) {
      if (!c.person) continue;
      const pid = c.person.id;
      if (map.has(pid)) map.get(pid)!.conflictReasons.push(c.reason);
    }
    return [...map.values()].sort((a, b) =>
      a.last_name.localeCompare(b.last_name, "de")
    );
  }, [data]);

  const tOver = school.teachers_used > school.teacher_limit;
  const lOver = school.leadership_used > school.leadership_limit;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={school.name}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <School className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-text">{school.name}</h2>
                {(tOver || lOver) && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                    Über Quote
                  </span>
                )}
              </div>
              {school.city && (
                <p className="text-sm text-text-light">
                  {school.plz ? `${school.plz} ` : ""}
                  {school.city}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="shrink-0 rounded-lg p-1.5 text-text-light hover:bg-bg hover:text-text"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-light">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Lade Details …
            </div>
          ) : error ? (
            <p className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          ) : (
            <div className="p-6 space-y-6">

              {/* Kontaktinfo */}
              {data?.contact &&
                (data.contact.contact_person ||
                  data.contact.principal_name ||
                  data.contact.email ||
                  data.contact.phone) && (
                <div>
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
                    Kontakt
                  </h3>
                  <div className="rounded-xl border border-border bg-bg p-4 space-y-2.5">
                    {data.contact.contact_person && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <Users className="h-4 w-4 shrink-0 text-text-light" aria-hidden="true" />
                        <span className="text-text">{data.contact.contact_person}</span>
                        <span className="text-xs text-text-light">(Ansprechpartner)</span>
                      </div>
                    )}
                    {data.contact.principal_name && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <GraduationCap className="h-4 w-4 shrink-0 text-text-light" aria-hidden="true" />
                        <span className="text-text">{data.contact.principal_name}</span>
                        <span className="text-xs text-text-light">(Schulleitung)</span>
                      </div>
                    )}
                    {data.contact.email && (
                      <a
                        href={`mailto:${data.contact.email}`}
                        className="flex items-center gap-2.5 text-sm text-primary hover:underline"
                      >
                        <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {data.contact.email}
                      </a>
                    )}
                    {data.contact.phone && (
                      <a
                        href={`tel:${data.contact.phone.replace(/\s/g, "")}`}
                        className="flex items-center gap-2.5 text-sm text-primary hover:underline"
                      >
                        <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {data.contact.phone}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Angemeldete Personen */}
              <div>
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
                  Angemeldete Personen · {persons.length}
                </h3>
                {persons.length === 0 ? (
                  <p className="rounded-xl border border-border bg-bg px-4 py-6 text-center text-sm text-text-light">
                    Noch keine Anmeldungen für diese Schule.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {persons.map((p) => {
                      const hasConflict = p.conflictReasons.length > 0;
                      return (
                        <li
                          key={p.person_id}
                          className={`rounded-xl border p-4 ${
                            hasConflict
                              ? "border-red-200 bg-red-50/40"
                              : "border-border bg-bg/60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p
                                  className={`font-semibold ${
                                    hasConflict ? "text-red-800" : "text-text"
                                  }`}
                                >
                                  {p.last_name}
                                  {p.first_name ? `, ${p.first_name}` : ""}
                                </p>
                                <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold text-text-light">
                                  {ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] ?? p.role}
                                </span>
                                {hasConflict && (
                                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                                    Konflikt
                                  </span>
                                )}
                              </div>

                              {/* Schulungen */}
                              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                                {p.events.map((ev) => (
                                  <span
                                    key={ev.kurs_nr}
                                    className="flex items-center gap-1.5 text-xs text-text-light"
                                  >
                                    <CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" />
                                    <span className="font-mono font-semibold text-text">
                                      {ev.kurs_nr}
                                    </span>
                                    {ev.start_date && (
                                      <span>· {formatDate(ev.start_date)}</span>
                                    )}
                                  </span>
                                ))}
                              </div>

                              {/* Konflikt-Gründe */}
                              {p.conflictReasons.map((reason, i) => (
                                <div
                                  key={i}
                                  className="mt-2 rounded-md bg-red-100 px-3 py-1.5 text-xs leading-snug text-red-800"
                                >
                                  {reason}
                                </div>
                              ))}
                            </div>

                            {/* E-Mail */}
                            {p.email && (
                              <a
                                href={`mailto:${p.email}`}
                                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text hover:bg-bg"
                              >
                                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                                E-Mail
                              </a>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Weitere Konflikte ohne Anmeldung */}
              {(() => {
                const personIds = new Set(persons.map((p) => p.person_id));
                const orphans = (data?.conflicts ?? []).filter(
                  (c) => c.person && !personIds.has(c.person.id)
                );
                if (orphans.length === 0) return null;
                return (
                  <div>
                    <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
                      Weitere offene Konflikte
                    </h3>
                    <ul className="space-y-2">
                      {orphans.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-xl border border-red-200 bg-red-50/40 p-4"
                        >
                          <p className="font-semibold text-red-800">
                            {c.person?.last_name}
                            {c.person?.first_name ? `, ${c.person.first_name}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-red-700">{c.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

            </div>
          )}
        </div>
      </div>
    </div>
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
