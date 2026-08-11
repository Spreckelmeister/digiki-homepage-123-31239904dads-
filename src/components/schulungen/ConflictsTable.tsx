"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  School,
  Search,
  ShieldAlert,
} from "lucide-react";
import {
  ROLE_LABELS,
  type ConflictItem,
  type ParticipantRole,
  type SchoolParticipation,
} from "@/lib/schulungen/types";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso + "T00:00:00"));
}

/**
 * Offene Import-Konflikte (Quotenverletzungen). Aktionen:
 * - Ablehnen: Konflikt schließen, keine Anmeldung anlegen.
 * - Trotz Quote zulassen: Anmeldung mit Override anlegen.
 */
/**
 * Durchsuchbares Auswahl-Popover für die manuelle Schul-Zuweisung. Zeigt nur
 * Schulen mit freiem Pensum für die Rolle; Suche nach Name/Ort. Das Popover
 * wird `fixed` positioniert, damit es nicht vom Tabellen-Overflow abgeschnitten
 * wird.
 */
export function AssignPicker({
  schools,
  role,
  disabled,
  onPick,
  label,
}: {
  schools: SchoolParticipation[];
  role: ParticipantRole;
  disabled: boolean;
  onPick: (name: string) => void;
  /** Button-Beschriftung (z. B. aktuelle Schule im Bearbeiten-Modus). */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const reposition = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(260, Math.min(320, r.width));
    setCoords({
      top: r.bottom + 4,
      left: Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8)),
      width,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    const onScroll = () => reposition();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, reposition]);

  const limitLabel = role === "leadership" ? "Leitung" : "Lehrkräfte";
  const q = query.trim().toLowerCase();
  const filtered = q
    ? schools.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.city ?? "").toLowerCase().includes(q)
      )
    : schools;
  const noFree = schools.length === 0;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled || noFree}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex w-full items-center justify-between gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="inline-flex items-center gap-1.5 truncate">
          <School className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          {noFree ? "Keine Schule frei" : label ?? "Schule zuweisen …"}
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-text-light transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && coords && (
        <div
          ref={panelRef}
          role="listbox"
          aria-label={`Schule zuweisen (${ROLE_LABELS[role] ?? role})`}
          style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width }}
          className="z-50 overflow-hidden rounded-xl border border-border bg-white text-left shadow-xl"
        >
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-light"
                aria-hidden="true"
              />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Schule suchen …"
                aria-label="Schule suchen"
                className="w-full rounded-md border border-border bg-bg py-1.5 pl-8 pr-2.5 text-xs text-text placeholder:text-text-light focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-xs text-text-light">Keine Schule gefunden.</li>
            ) : (
              filtered.map((s) => {
                const used = role === "leadership" ? s.leadership_used : s.teachers_used;
                const limit = role === "leadership" ? s.leadership_limit : s.teacher_limit;
                return (
                  <li key={s.school_key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => {
                        onPick(s.name);
                        setOpen(false);
                        setQuery("");
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors hover:bg-primary/5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium text-text">
                          {s.name}
                        </span>
                        {s.city && (
                          <span className="block truncate text-[10px] text-text-light">
                            {s.city}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-text-light">
                        {used}/{limit} {limitLabel}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </>
  );
}

/**
 * Alle registrierten Schulen (Bestandsaufnahme) – bewusst AUCH volle: beim
 * Bearbeiten einer Anmeldung darf die Quote per Bestätigung überschritten
 * werden; die Auslastung (used/limit) wird je Eintrag angezeigt.
 */
export function registeredSchools(
  schools: SchoolParticipation[]
): SchoolParticipation[] {
  return schools
    .filter((s) => s.in_bestandsaufnahme)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Schulen, die für die Rolle noch Platz im Pensum haben. */
function freeSchoolsFor(
  schools: SchoolParticipation[],
  role: ParticipantRole
): SchoolParticipation[] {
  return schools
    .filter(
      (s) =>
        s.in_bestandsaufnahme &&
        (role === "leadership"
          ? s.leadership_used < s.leadership_limit
          : s.teachers_used < s.teacher_limit)
    )
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export default function ConflictsTable({
  conflicts,
  onResolved,
  schools = [],
  loading = false,
  error = null,
  readOnly = false,
}: {
  conflicts: ConflictItem[];
  onResolved: () => Promise<void> | void;
  /** Registrierte Schulen inkl. Quotennutzung – Quelle für die Zuweisung. */
  schools?: SchoolParticipation[];
  loading?: boolean;
  error?: string | null;
  /** Wenn true: Nur anzeigen, keine Aktions-Buttons (für schulungsteam). */
  readOnly?: boolean;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Freie Schulen je Rolle einmal vorberechnen (für die Dropdowns).
  const freeByRole = useMemo(
    () => ({
      teacher: freeSchoolsFor(schools, "teacher"),
      leadership: freeSchoolsFor(schools, "leadership"),
    }),
    [schools]
  );

  async function post(url: string, payload: object, busyKey: string) {
    setBusyId(busyKey);
    setActionError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Aktion fehlgeschlagen");
      }
      await onResolved();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Aktion fehlgeschlagen"
      );
    } finally {
      setBusyId(null);
    }
  }

  const send = (payload: object, busyKey: string) =>
    post("/api/schulungen/conflicts/resolve", payload, busyKey);

  const resolve = (conflictId: string, action: "reject" | "approve") =>
    send({ conflictId, action }, conflictId);

  const resolveAll = (action: "reject" | "approve") =>
    send({ all: true, action }, "__all__");

  const assign = (conflictId: string, schoolName: string) =>
    post("/api/schulungen/conflicts/assign", { conflictId, schoolName }, conflictId);

  return (
    <section
      aria-labelledby="conflicts-heading"
      className="rounded-2xl border border-border bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 md:px-6">
        <h2 id="conflicts-heading" className="min-w-0">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="flex items-center gap-2 text-left text-base font-bold text-text"
          >
            <ShieldAlert className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
            Offene Konflikte
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-text-light transition-transform ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </h2>
        {!loading && !error && (
          <div className="flex items-center gap-2">
            {conflicts.length > 0 && !readOnly && (
              <>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => resolveAll("reject")}
                  className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-text transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Alle ablehnen
                </button>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => resolveAll("approve")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyId === "__all__" && (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  )}
                  Alle zulassen
                </button>
              </>
            )}
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-accent-text">
              {conflicts.length}
            </span>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border">

      {actionError && (
        <div
          role="alert"
          className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 md:mx-6"
        >
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="px-5 py-8 text-sm text-text-light md:px-6">
          Lade Konflikte …
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mx-5 my-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 md:mx-6"
        >
          Konflikte konnten nicht geladen werden: {error}
        </div>
      ) : conflicts.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-8 md:px-6">
          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="text-sm text-text-light">
            Keine offenen Konflikte – alle Anmeldungen liegen innerhalb der
            Quoten.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto px-5 py-4 md:px-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-text-light">
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Schule
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Teilnehmende
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Rolle
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Schulung
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Grund
                </th>
                {!readOnly && (
                  <th scope="col" className="py-2 pl-4 text-right font-semibold">
                    Aktion
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {conflicts.map((c) => {
                // Schul-Konflikt (Schule nicht registriert ODER keine Schule
                // angegeben) vs. Quoten-Konflikt – unterschiedlich einfärben.
                // Nur Schul-Konflikte bekommen den Zuweisungs-Picker.
                const reasonLc = (c.reason || "").toLowerCase();
                const schoolIssue =
                  reasonLc.includes("registriert") || reasonLc.includes("keine schule");
                return (
                <tr key={c.id} className={`align-top ${schoolIssue ? "bg-red-50/50" : ""}`}>
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-text">
                      {c.school?.name ?? "–"}
                    </div>
                    {c.school?.city && (
                      <div className="text-[11px] text-text-light">
                        {c.school.city}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-text">
                      {c.person
                        ? `${c.person.last_name}, ${c.person.first_name}`
                        : "–"}
                    </div>
                    {c.person?.email && (
                      <div className="text-[11px] text-text-light">
                        {c.person.email}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex whitespace-nowrap rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold text-text">
                      {ROLE_LABELS[c.role] ?? c.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-medium text-text">
                      {c.event?.kurs_nr ?? "–"}
                    </div>
                    {c.event?.start_date && (
                      <div className="text-[11px] text-text-light">
                        {formatDate(c.event.start_date)}
                      </div>
                    )}
                  </td>
                  <td className="max-w-xs py-3 pr-4">
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium leading-snug ${
                        schoolIssue
                          ? "bg-red-100 text-red-700"
                          : "bg-accent/10 text-accent-text"
                      }`}
                    >
                      {c.reason}
                    </span>
                  </td>
                  {!readOnly && (
                  <td className="py-3 pl-4 text-right">
                    <div className="inline-flex flex-col items-stretch gap-1.5">
                      {schoolIssue && (
                        <AssignPicker
                          schools={freeByRole[c.role] ?? []}
                          role={c.role}
                          disabled={busyId !== null}
                          onPick={(name) => assign(c.id, name)}
                        />
                      )}
                      <div className="flex items-stretch gap-1.5">
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => resolve(c.id, "reject")}
                          className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Ablehnen
                        </button>
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => resolve(c.id, "approve")}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busyId === c.id && (
                            <Loader2
                              className="h-3 w-3 animate-spin"
                              aria-hidden="true"
                            />
                          )}
                          {schoolIssue ? "Trotzdem zulassen" : "Trotz Quote zulassen"}
                        </button>
                      </div>
                    </div>
                  </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
        </div>
      )}
    </section>
  );
}
