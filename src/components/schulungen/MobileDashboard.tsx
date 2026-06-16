"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Check,
  GraduationCap,
  Loader2,
  Mail,
  Phone,
  School,
  Settings,
  Users,
  X,
} from "lucide-react";
import type {
  ConflictItem,
  EventParticipant,
  OverviewResponse,
  SchoolParticipation,
  TrainingEvent,
} from "@/lib/schulungen/types";
import { ROLE_LABELS } from "@/lib/schulungen/types";
import UploadCard from "./UploadCard";
import AccessPanel from "./AccessPanel";
import DangerZone from "./DangerZone";

type Tab = "schulungen" | "konflikte" | "schulen" | "verwaltung";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dateParts(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return {
    weekday: new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(d).replace(".", ""),
    day: d.getDate(),
    month: new Intl.DateTimeFormat("de-DE", { month: "short" }).format(d).replace(".", ""),
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "–";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso + "T00:00:00"));
}

// ─── Participant Bottom Sheet ──────────────────────────────────────────────────
function ParticipantSheet({
  event,
  isAdmin,
  onClose,
}: {
  event: TrainingEvent;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/schulungen/participants?event_id=${encodeURIComponent(event.id)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok) throw new Error(body?.error ?? "Fehler");
        return body.participants as EventParticipant[];
      })
      .then((list) => { if (active) setParticipants(list); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Fehler"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [event.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function copyEmails() {
    const seen = new Set<string>();
    const list: string[] = [];
    participants.forEach((p) => {
      if (!p.email) return;
      const k = p.email.toLowerCase();
      if (!seen.has(k)) { seen.add(k); list.push(p.email); }
    });
    if (list.length) {
      navigator.clipboard?.writeText(list.join("; ")).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const dp = dateParts(event.start_date);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Teilnehmende ${event.kurs_nr}`}
      className="fixed inset-0 z-50 flex flex-col bg-black/50"
      onClick={onClose}
    >
      <div
        className="mt-auto flex max-h-[92vh] flex-col rounded-t-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="font-mono text-sm font-semibold text-text">{event.kurs_nr}</p>
              <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold text-text-light">
                {event.audience === "leadership" ? "Schulleitung" : "Lehrkräfte"}
              </span>
              {dp && (
                <span className="text-[11px] text-text-light">
                  {dp.weekday}, {dp.day}. {dp.month}
                </span>
              )}
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-text-light">{event.title}</p>
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

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-light">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Lade Teilnehmende …
            </div>
          ) : error ? (
            <p className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : participants.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-text-light">
              Noch keine Teilnehmenden angemeldet.
            </p>
          ) : (
            <ul className="divide-y divide-border/60 px-4">
              {participants.map((p, i) => {
                const quota = p.quota_warning && p.school_registered;
                const bg = !p.school_registered
                  ? "bg-red-50/60"
                  : quota
                    ? "bg-amber-50/60"
                    : "";
                return (
                  <li key={`${p.person_id}-${i}`} className={`py-3 ${bg}`}>
                    {/* Name + badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold leading-snug ${
                            !p.school_registered
                              ? "text-red-800"
                              : quota
                                ? "text-amber-900"
                                : "text-text"
                          }`}
                        >
                          {p.last_name}
                          {p.first_name ? `, ${p.first_name}` : ""}
                        </p>
                        <p className="text-[11px] text-text-light">
                          {ROLE_LABELS[p.role]}
                        </p>
                      </div>
                      {!p.school_registered && !p.school_missing && (
                        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                          Nicht registriert
                        </span>
                      )}
                      {quota && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          {p.quota_pending ? "Über Quote – offen" : "Über Quote"}
                        </span>
                      )}
                    </div>

                    {/* School */}
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                      <School
                        className="h-3 w-3 shrink-0 text-text-light"
                        aria-hidden="true"
                      />
                      <span
                        className={
                          !p.school_registered
                            ? "font-medium text-red-700"
                            : quota
                              ? "font-medium text-amber-800"
                              : "text-text-light"
                        }
                      >
                        {p.school_name ?? "–"}
                        {p.school_city ? ` · ${p.school_city}` : ""}
                      </span>
                    </div>

                    {/* Email */}
                    {p.email && (
                      <a
                        href={`mailto:${p.email}`}
                        className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {p.email}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && participants.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            <span className="text-xs text-text-light">
              {participants.length}{" "}
              {participants.length === 1 ? "Person" : "Personen"} ·{" "}
              {participants.filter((p) => p.email).length} mit E-Mail
            </span>
            <button
              type="button"
              onClick={copyEmails}
              disabled={participants.every((p) => !p.email)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-text transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
              ) : (
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? "Kopiert!" : "E-Mails kopieren"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Event List (Schulungen-Tab) ───────────────────────────────────────────────
function MobileEventsList({
  events,
  conflicts,
  loading,
  isAdmin,
}: {
  events: TrainingEvent[];
  conflicts: ConflictItem[];
  loading: boolean;
  isAdmin: boolean;
}) {
  const [openEvent, setOpenEvent] = useState<TrainingEvent | null>(null);

  const conflictsByEvent = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of conflicts) {
      if (c.event?.id) map.set(c.event.id, (map.get(c.event.id) ?? 0) + 1);
    }
    return map;
  }, [conflicts]);

  const groups = [
    { label: "Lehrkräfte", items: events.filter((e) => e.audience === "teacher") },
    { label: "Schulleitungen", items: events.filter((e) => e.audience === "leadership") },
  ];

  return (
    <>
      <div className="px-4 pb-4 pt-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-text-light">
            Schulung antippen, um die Teilnehmenden zu sehen.
          </p>
          <a
            href="https://www.digiki-os.de/fuer-schulen#kos-fortbildungen"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Website
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-light">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Lade Schulungen …
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-text">
                  {group.label} · {group.items.length}{" "}
                  {group.items.length === 1 ? "Termin" : "Termine"}
                </p>
                <ul className="space-y-2">
                  {group.items.map((event) => {
                    const dp = dateParts(event.start_date);
                    const count = event.registration_count ?? 0;
                    return (
                      <li key={event.id}>
                        <button
                          type="button"
                          onClick={() => setOpenEvent(event)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left shadow-sm transition-colors active:bg-bg ${
                            conflictsByEvent.has(event.id)
                              ? "border-amber-200 bg-amber-50/40"
                              : "border-border bg-white"
                          }`}
                        >
                          {/* Date chip */}
                          <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-bg px-1 py-1.5 text-center">
                            {dp ? (
                              <>
                                <span className="text-[9px] font-bold uppercase tracking-wide text-text-light">
                                  {dp.weekday}
                                </span>
                                <span className="text-base font-bold leading-none text-primary tabular-nums">
                                  {dp.day}
                                </span>
                                <span className="text-[9px] font-medium uppercase text-text-light">
                                  {dp.month}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-text-light">–</span>
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-xs font-semibold text-text">
                              {event.kurs_nr}
                            </p>
                            <p className="truncate text-[11px] text-text-light">
                              {event.title}
                            </p>
                          </div>

                          {/* Count + Konflikt-Badge */}
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${
                                count > 0
                                  ? "bg-primary/10 text-primary"
                                  : "bg-bg text-text-light"
                              }`}
                            >
                              {count} Anm.
                            </span>
                            {conflictsByEvent.has(event.id) && (
                              <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                                {conflictsByEvent.get(event.id)} Konflikt{(conflictsByEvent.get(event.id) ?? 0) > 1 ? "e" : ""}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {openEvent && (
        <ParticipantSheet
          event={openEvent}
          isAdmin={isAdmin}
          onClose={() => setOpenEvent(null)}
        />
      )}
    </>
  );
}

// ─── Conflict Card (Konflikte-Tab) ─────────────────────────────────────────────
function MobileConflictCard({
  conflict,
  schools,
  onResolved,
  readOnly = false,
}: {
  conflict: ConflictItem;
  schools: SchoolParticipation[];
  onResolved: () => void;
  readOnly?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [assignSchoolId, setAssignSchoolId] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const isQuota = conflict.reason.toLowerCase().includes("quote");
  const freeSchools = schools.filter((s) => {
    if (!s.school_id) return false;
    return conflict.role === "teacher"
      ? s.teacher_limit > s.teachers_used
      : s.leadership_limit > s.leadership_used;
  });

  async function resolve(action: "approve" | "reject") {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/schulungen/conflicts/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: conflict.id, action }),
      });
      if (!r.ok) {
        const b = await r.json().catch(() => null);
        throw new Error(b?.error ?? "Fehler");
      }
      onResolved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  }

  async function assign() {
    if (!assignSchoolId) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/schulungen/conflicts/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflict_id: conflict.id, school_id: assignSchoolId }),
      });
      if (!r.ok) {
        const b = await r.json().catch(() => null);
        throw new Error(b?.error ?? "Fehler");
      }
      onResolved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  }

  return (
    <div
      className={`rounded-xl border-2 bg-white p-4 shadow-sm ${
        isQuota ? "border-amber-200" : "border-red-200"
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">
            {conflict.person?.last_name}
            {conflict.person?.first_name ? `, ${conflict.person.first_name}` : ""}
          </p>
          <p className="text-[11px] text-text-light">{ROLE_LABELS[conflict.role]}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            isQuota ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"
          }`}
        >
          {isQuota ? "Über Quote" : "Schule nicht erkannt"}
        </span>
      </div>

      {/* Schulung */}
      {conflict.event && (
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-text-light">
          <CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="font-mono">{conflict.event.kurs_nr}</span>
          {conflict.event.start_date && (
            <span>· {formatDate(conflict.event.start_date)}</span>
          )}
        </div>
      )}

      {/* Schule */}
      {conflict.school && (
        <div className="flex items-center gap-1.5 text-[11px] text-text-light">
          <School className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>
            {conflict.school.name}
            {conflict.school.city ? ` · ${conflict.school.city}` : ""}
          </span>
        </div>
      )}

      {/* Vollständiger Konfliktgrund */}
      <div
        className={`mt-2 mb-3 rounded-md px-2.5 py-2 text-xs leading-snug ${
          isQuota ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-900"
        }`}
      >
        {conflict.reason}
      </div>

      {/* School picker + Aktions-Buttons nur für Admins */}
      {!readOnly && (
        <>
          {!isQuota && freeSchools.length > 0 && (
            <div className="mb-3 flex gap-2">
              <select
                value={assignSchoolId}
                onChange={(e) => setAssignSchoolId(e.target.value)}
                disabled={busy}
                className="flex-1 rounded-lg border border-border bg-bg px-2 py-2 text-xs text-text focus:border-primary focus:outline-none"
              >
                <option value="">Schule zuweisen …</option>
                {freeSchools.map((s) => (
                  <option key={s.school_key} value={s.school_id!}>
                    {s.name}
                    {s.city ? ` (${s.city})` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || !assignSchoolId}
                onClick={assign}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  "Zuweisen"
                )}
              </button>
            </div>
          )}

          {err && <p className="mb-2 text-xs text-red-700">{err}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => resolve("reject")}
              className="flex-1 rounded-lg border border-border px-3 py-2.5 text-xs font-semibold text-text-light transition-colors hover:border-red-300 hover:text-red-700 disabled:opacity-50"
            >
              Ablehnen
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => resolve("approve")}
              className="flex-1 rounded-lg bg-primary px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                "Zulassen"
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Quota bar helper ──────────────────────────────────────────────────────────
function QuotaBar({
  label,
  used,
  limit,
  over,
}: {
  label: string;
  used: number;
  limit: number;
  over: boolean;
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[11px]">
        <span className="text-text-light">{label}</span>
        <span className={`font-semibold tabular-nums ${over ? "text-red-700" : "text-text"}`}>
          {used}/{limit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-red-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── School Detail Sheet ───────────────────────────────────────────────────────
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

function SchoolDetailSheet({
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
      className="fixed inset-0 z-50 flex flex-col bg-black/50"
      onClick={onClose}
    >
      <div
        className="mt-auto flex max-h-[92vh] flex-col rounded-t-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <School className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="font-semibold text-text">{school.name}</p>
              {(tOver || lOver) && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                  Über Quote
                </span>
              )}
            </div>
            {school.city && (
              <p className="mt-0.5 text-xs text-text-light">{school.city}</p>
            )}
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

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-light">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Lade Details …
            </div>
          ) : error ? (
            <p className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : (
            <div className="space-y-5 px-4 py-4">

              {/* Kontaktinfo */}
              {data?.contact &&
                (data.contact.contact_person ||
                  data.contact.principal_name ||
                  data.contact.email ||
                  data.contact.phone) && (
                <div className="rounded-xl border border-border bg-bg p-3.5 space-y-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
                    Kontakt
                  </p>
                  {data.contact.contact_person && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-3.5 w-3.5 shrink-0 text-text-light" aria-hidden="true" />
                      <span className="text-text">{data.contact.contact_person}</span>
                    </div>
                  )}
                  {data.contact.principal_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <GraduationCap className="h-3.5 w-3.5 shrink-0 text-text-light" aria-hidden="true" />
                      <span className="text-text">{data.contact.principal_name}</span>
                      <span className="text-[11px] text-text-light">(Schulleitung)</span>
                    </div>
                  )}
                  {data.contact.email && (
                    <a
                      href={`mailto:${data.contact.email}`}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {data.contact.email}
                    </a>
                  )}
                  {data.contact.phone && (
                    <a
                      href={`tel:${data.contact.phone.replace(/\s/g, "")}`}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {data.contact.phone}
                    </a>
                  )}
                </div>
              )}

              {/* Angemeldete Personen */}
              <div>
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
                  Angemeldete Personen · {persons.length}
                </p>
                {persons.length === 0 ? (
                  <p className="text-sm text-text-light">Noch keine Anmeldungen.</p>
                ) : (
                  <ul className="space-y-2">
                    {persons.map((p) => {
                      const hasConflict = p.conflictReasons.length > 0;
                      return (
                        <li
                          key={p.person_id}
                          className={`rounded-xl border p-3 ${
                            hasConflict
                              ? "border-red-200 bg-red-50/40"
                              : "border-border bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p
                                className={`text-sm font-semibold ${
                                  hasConflict ? "text-red-800" : "text-text"
                                }`}
                              >
                                {p.last_name}
                                {p.first_name ? `, ${p.first_name}` : ""}
                              </p>
                              <p className="text-[11px] text-text-light">
                                {ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] ?? p.role}
                              </p>
                            </div>
                            {hasConflict && (
                              <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                Konflikt
                              </span>
                            )}
                          </div>

                          {/* Schulungen */}
                          <div className="mt-2 space-y-1">
                            {p.events.map((ev) => (
                              <div
                                key={ev.kurs_nr}
                                className="flex items-center gap-1.5 text-[11px] text-text-light"
                              >
                                <CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" />
                                <span className="font-mono font-semibold text-text">
                                  {ev.kurs_nr}
                                </span>
                                {ev.start_date && (
                                  <span>· {formatDate(ev.start_date)}</span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Konflikt-Gründe */}
                          {p.conflictReasons.map((reason, i) => (
                            <div
                              key={i}
                              className="mt-2 rounded-md bg-red-100 px-2.5 py-1.5 text-xs leading-snug text-red-800"
                            >
                              {reason}
                            </div>
                          ))}

                          {/* E-Mail */}
                          {p.email && (
                            <a
                              href={`mailto:${p.email}`}
                              className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline"
                            >
                              <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                              {p.email}
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Konflikte ohne zugehörige Anmeldung (abgelehnte o.ä.) */}
              {(() => {
                const personIds = new Set(persons.map((p) => p.person_id));
                const orphans = (data?.conflicts ?? []).filter(
                  (c) => c.person && !personIds.has(c.person.id)
                );
                if (orphans.length === 0) return null;
                return (
                  <div>
                    <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
                      Weitere offene Konflikte
                    </p>
                    <ul className="space-y-2">
                      {orphans.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-xl border border-red-200 bg-red-50/40 p-3"
                        >
                          <p className="text-sm font-semibold text-red-800">
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

// ─── Schools List (Schulen-Tab) ────────────────────────────────────────────────
function MobileSchoolsList({
  schools,
  loading,
  onSelect,
}: {
  schools: SchoolParticipation[];
  loading: boolean;
  onSelect: (school: SchoolParticipation) => void;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...schools]
      .filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          (s.city ?? "").toLowerCase().includes(q)
      )
      .sort(
        (a, b) =>
          Number(a.has_registered) - Number(b.has_registered) ||
          a.name.localeCompare(b.name, "de")
      );
  }, [schools, query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-light">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Lade …
      </div>
    );
  }

  const eligible = schools.filter((s) => s.in_bestandsaufnahme);
  const registered = eligible.filter((s) => s.has_registered).length;

  return (
    <div className="px-4 py-3">
      {/* Summary tiles */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-primary/5 p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-primary">{registered}</p>
          <p className="mt-0.5 text-[11px] text-text-light">Angemeldet</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-text-light">
            {eligible.length - registered}
          </p>
          <p className="mt-0.5 text-[11px] text-text-light">Ausstehend</p>
        </div>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Schule suchen …"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text placeholder:text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />

      {/* List */}
      <ul className="space-y-2">
        {visible.map((school) => {
          const tOver = school.teachers_used > school.teacher_limit;
          const lOver = school.leadership_used > school.leadership_limit;
          const over = tOver || lOver;
          return (
            <li key={school.school_key}>
              <button
                type="button"
                onClick={() => onSelect(school)}
                className={`w-full rounded-xl border p-3.5 text-left transition-colors active:brightness-95 ${
                  over
                    ? "border-red-200 bg-red-50/40"
                    : school.has_registered
                      ? "border-border bg-white"
                      : "border-dashed border-border/60 bg-bg/60"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${over ? "text-red-800" : "text-text"}`}
                    >
                      {school.name}
                    </p>
                    {school.city && (
                      <p className="text-[11px] text-text-light">{school.city}</p>
                    )}
                  </div>
                  {over && (
                    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      Über Quote
                    </span>
                  )}
                  {!school.has_registered && !over && (
                    <span className="shrink-0 rounded-full border border-border/60 bg-bg px-2 py-0.5 text-[10px] text-text-light">
                      Ausstehend
                    </span>
                  )}
                </div>
                {school.has_registered && (
                  <div className="mt-2 space-y-2">
                    <QuotaBar
                      label="Lehrkräfte"
                      used={school.teachers_used}
                      limit={school.teacher_limit}
                      over={tOver}
                    />
                    <QuotaBar
                      label="Schulleitung"
                      used={school.leadership_used}
                      limit={school.leadership_limit}
                      over={lOver}
                    />
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function MobileStatsBar({
  stats,
  loading,
}: {
  stats: OverviewResponse["stats"] | undefined;
  loading: boolean;
}) {
  const items = [
    {
      label: "Schulungen",
      value: loading ? "–" : String(stats?.events_total ?? 0),
      warn: false,
    },
    {
      label: "Anmeldungen",
      value: loading ? "–" : String(stats?.registrations_total ?? 0),
      warn: false,
    },
    {
      label: "Konflikte",
      value: loading ? "–" : String(stats?.conflicts_open ?? 0),
      warn: !loading && (stats?.conflicts_open ?? 0) > 0,
    },
    {
      label: "Schulen",
      value: loading
        ? "–"
        : `${stats?.schools_registered ?? 0}/${stats?.schools_total ?? 0}`,
      warn: false,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-px border-b border-border bg-border">
      {items.map((item) => (
        <div key={item.label} className="bg-white px-1 py-3 text-center">
          <p
            className={`text-lg font-bold tabular-nums leading-none ${
              item.warn ? "text-accent-text" : "text-primary"
            }`}
          >
            {item.value}
          </p>
          <p className="mt-0.5 text-[10px] text-text-light">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Bottom Tab Bar ────────────────────────────────────────────────────────────
function MobileTabBar({
  active,
  conflictCount,
  isAdmin,
  onChange,
}: {
  active: Tab;
  conflictCount: number;
  isAdmin: boolean;
  onChange: (t: Tab) => void;
}) {
  const allTabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "schulungen",
      label: "Schulungen",
      icon: <CalendarDays className="h-5 w-5" aria-hidden="true" />,
    },
    {
      key: "konflikte",
      label: "Konflikte",
      icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" />,
    },
    {
      key: "schulen",
      label: "Schulen",
      icon: <School className="h-5 w-5" aria-hidden="true" />,
    },
    {
      key: "verwaltung",
      label: "Verwaltung",
      icon: <Settings className="h-5 w-5" aria-hidden="true" />,
    },
  ];
  const tabs = isAdmin ? allTabs : allTabs.filter((t) => t.key !== "verwaltung");

  return (
    <nav
      aria-label="Dashboard-Navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white"
    >
      <div className={isAdmin ? "grid grid-cols-4" : "grid grid-cols-3"}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            aria-current={active === tab.key ? "page" : undefined}
            className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
              active === tab.key ? "text-primary" : "text-text-light"
            }`}
          >
            {tab.icon}
            {tab.label}
            {/* Conflict badge */}
            {tab.key === "konflikte" && conflictCount > 0 && (
              <span className="absolute right-[22%] top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {conflictCount > 9 ? "9+" : conflictCount}
              </span>
            )}
            {/* Active indicator */}
            {active === tab.key && (
              <span className="absolute inset-x-0 top-0 h-0.5 rounded-b-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export default function MobileDashboard({
  isAdmin,
  overview,
  conflicts,
  loading,
  loadError,
  conflictsError,
  onRefresh,
}: {
  isAdmin: boolean;
  overview: OverviewResponse | null;
  conflicts: ConflictItem[];
  loading: boolean;
  loadError: string | null;
  conflictsError: string | null;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<Tab>("schulungen");
  const [selectedSchool, setSelectedSchool] = useState<SchoolParticipation | null>(null);

  return (
    /* pb-20 = Platz für die fixierte Tab-Bar am unteren Bildschirmrand */
    <div className="min-h-screen bg-bg pb-20">
      {loadError && (
        <div
          role="alert"
          className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {loadError}
        </div>
      )}

      {/* Stat-Zeile ganz oben */}
      <MobileStatsBar stats={overview?.stats} loading={loading} />

      {/* ── Tab-Inhalte ── */}

      {tab === "schulungen" && (
        <MobileEventsList
          events={overview?.events ?? []}
          conflicts={conflicts}
          loading={loading}
          isAdmin={isAdmin}
        />
      )}

      {tab === "konflikte" && (
        <div className="space-y-3 px-4 py-3">
          {conflictsError && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {conflictsError}
            </p>
          )}
          {!loading && conflicts.length === 0 && !conflictsError && (
            <div className="rounded-xl border border-border bg-white p-8 text-center text-sm text-text-light">
              Keine offenen Konflikte – alles klar!
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-light">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Lade …
            </div>
          )}
          {conflicts.map((c) => (
            <MobileConflictCard
              key={c.id}
              conflict={c}
              schools={overview?.schools ?? []}
              onResolved={onRefresh}
              readOnly={!isAdmin}
            />
          ))}
        </div>
      )}

      {tab === "schulen" && (
        <MobileSchoolsList
          schools={overview?.schools ?? []}
          loading={loading}
          onSelect={setSelectedSchool}
        />
      )}

      {selectedSchool && (
        <SchoolDetailSheet
          school={selectedSchool}
          onClose={() => setSelectedSchool(null)}
        />
      )}

      {isAdmin && tab === "verwaltung" && (
        <div className="space-y-4 px-4 py-3">
          <UploadCard events={overview?.events ?? []} onImported={onRefresh} />
          <AccessPanel />
          <DangerZone onReset={onRefresh} />
        </div>
      )}

      {/* Fixierte Tab-Bar */}
      <MobileTabBar
        active={tab}
        conflictCount={overview?.stats?.conflicts_open ?? 0}
        isAdmin={isAdmin}
        onChange={setTab}
      />
    </div>
  );
}
