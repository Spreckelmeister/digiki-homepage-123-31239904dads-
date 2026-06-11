"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowUpRight, Loader2, Mail, Users, X } from "lucide-react";
import {
  ROLE_LABELS,
  type EventParticipant,
  type TrainingEvent,
} from "@/lib/schulungen/types";

function dateParts(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return {
    weekday: new Intl.DateTimeFormat("de-DE", { weekday: "short" })
      .format(d)
      .replace(".", ""),
    day: d.getDate(),
    month: new Intl.DateTimeFormat("de-DE", { month: "short" })
      .format(d)
      .replace(".", ""),
    year: d.getFullYear(),
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso + "T00:00:00"));
}

/**
 * Alle KOS-Schulungen mit Anmeldezahl. Klick auf eine Schulung öffnet die
 * Teilnehmer-Übersicht (Name · Schule · E-Mail).
 */
export default function EventsTable({
  events,
  loading,
}: {
  events: TrainingEvent[];
  loading: boolean;
}) {
  const [openEvent, setOpenEvent] = useState<TrainingEvent | null>(null);

  const groups: { label: string; items: TrainingEvent[] }[] = [
    { label: "Lehrkräfte", items: events.filter((e) => e.audience === "teacher") },
    {
      label: "Schulleitungen",
      items: events.filter((e) => e.audience === "leadership"),
    },
  ];

  return (
    <section
      aria-labelledby="events-heading"
      className="rounded-2xl border border-border bg-white p-5 shadow-sm md:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="events-heading" className="text-base font-bold text-text">
          Alle Schulungen
        </h2>
        <a
          href="https://www.digiki-os.de/fuer-schulen#kos-fortbildungen"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Termine auf der Website
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
      <p className="mt-1 text-xs text-text-light">
        Auf eine Schulung tippen, um die Teilnehmenden zu sehen.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-text-light">Lade Schulungen …</p>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {groups.map((group) => (
            <div key={group.label}>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-text">
                {group.label} · {group.items.length}{" "}
                {group.items.length === 1 ? "Termin" : "Termine"}
              </h3>
              <ul className="mt-2 divide-y divide-border/60">
                {group.items.map((event) => {
                  const parts = dateParts(event.start_date);
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => setOpenEvent(event)}
                        className="flex w-full items-center gap-3 rounded-lg py-2.5 pr-1 text-left transition-colors hover:bg-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-bg px-1.5 py-1.5 text-center">
                          {parts ? (
                            <>
                              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-light">
                                {parts.weekday}
                              </span>
                              <span className="text-lg font-bold leading-none text-primary tabular-nums">
                                {parts.day}
                              </span>
                              <span className="text-[9px] font-medium uppercase text-text-light">
                                {parts.month} {parts.year}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-text-light">–</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs text-text">
                            {event.kurs_nr}
                          </p>
                          <p className="truncate text-[11px] text-text-light">
                            {event.title}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${
                            (event.registration_count ?? 0) > 0
                              ? "bg-primary/10 text-primary"
                              : "bg-bg text-text-light"
                          }`}
                        >
                          {event.registration_count ?? 0} Anm.
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {openEvent && (
        <ParticipantsModal
          event={openEvent}
          onClose={() => setOpenEvent(null)}
        />
      )}
    </section>
  );
}

function ParticipantsModal({
  event,
  onClose,
}: {
  event: TrainingEvent;
  onClose: () => void;
}) {
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/schulungen/participants?event_id=${encodeURIComponent(event.id)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "Teilnehmende konnten nicht geladen werden");
        return body.participants as EventParticipant[];
      })
      .then((list) => {
        if (active) setParticipants(list);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Fehler beim Laden");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [event.id]);

  // Esc schließt das Modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function copyEmails() {
    // Dedupe (Schul-Account-E-Mails können bei mehreren Personen gleich sein).
    const seen = new Set<string>();
    const list: string[] = [];
    participants.forEach((p) => {
      if (!p.email) return;
      const k = p.email.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        list.push(p.email);
      }
    });
    if (list.length) navigator.clipboard?.writeText(list.join("; ")).catch(() => {});
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Teilnehmende ${event.kurs_nr}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
      >
        {/* Kopf */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 md:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="font-mono text-sm font-semibold text-text">
                {event.kurs_nr}
              </p>
              <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold text-text-light">
                {event.audience === "leadership" ? "Schulleitung" : "Lehrkräfte"}
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-text-light">
              {event.title}
              {event.start_date ? ` · ${formatDate(event.start_date)}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="shrink-0 rounded-lg p-1.5 text-text-light transition-colors hover:bg-bg hover:text-text"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Inhalt */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6">
          {loading ? (
            <p className="flex items-center gap-2 py-8 text-sm text-text-light">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Lade Teilnehmende …
            </p>
          ) : error ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : participants.length === 0 ? (
            <p className="py-8 text-sm text-text-light">
              Für diese Schulung sind noch keine Teilnehmenden angemeldet.
            </p>
          ) : (
            <>
              {(() => {
                const missing = participants.filter((p) => p.school_missing).length;
                const unreg = participants.filter(
                  (p) => !p.school_registered && !p.school_missing
                ).length;
                if (missing + unreg === 0) return null;
                return (
                  <div
                    role="alert"
                    className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      {unreg > 0 && (
                        <>
                          <strong>
                            {unreg} Teilnehmende von nicht registrierten Schulen
                          </strong>{" "}
                          (rot markiert). Diese Schulen haben die Bestandsaufnahme
                          nicht ausgefüllt und sind eigentlich nicht
                          teilnahmeberechtigt.{" "}
                        </>
                      )}
                      {missing > 0 && (
                        <>
                          <strong>
                            {missing} Teilnehmende ohne Schulangabe
                          </strong>{" "}
                          (rot markiert) – bitte oben im Konflikt eine Schule
                          zuweisen.
                        </>
                      )}
                    </span>
                  </div>
                );
              })()}
              {(() => {
                const quotaParts = participants.filter(
                  (p) => p.quota_warning && p.school_registered
                );
                if (quotaParts.length === 0) return null;
                const pendingCount = quotaParts.filter((p) => p.quota_pending).length;
                return (
                  <div
                    role="alert"
                    className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      <strong>
                        {quotaParts.length} Teilnehmende über der Schul-Quote
                      </strong>{" "}
                      (gelb markiert). Die Schule hat ihr Kontingent (max. 2
                      Lehrkräfte / 1 Schulleitung) bereits ausgeschöpft.{" "}
                      {pendingCount > 0 ? (
                        <>
                          Bitte {pendingCount === quotaParts.length ? "" : `${pendingCount} davon `}
                          oben unter „Offene Konflikte" entscheiden (Ablehnen oder
                          Trotz Quote zulassen).
                        </>
                      ) : (
                        <>Die Anmeldung wurde bereits zugelassen.</>
                      )}
                    </span>
                  </div>
                );
              })()}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-text-light">
                      <th scope="col" className="py-2 pr-4 font-semibold">Name</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Schule</th>
                      <th scope="col" className="py-2 font-semibold">E-Mail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {participants.map((p, i) => {
                      // Priorität: nicht registrierte Schule (rot) vor
                      // Quotenüberschreitung (gelb).
                      const quota = p.quota_warning && p.school_registered;
                      const rowBg = !p.school_registered
                        ? "bg-red-50/70"
                        : quota
                          ? "bg-amber-50/70"
                          : "";
                      const nameColor = !p.school_registered
                        ? "text-red-800"
                        : quota
                          ? "text-amber-900"
                          : "text-text";
                      return (
                      <tr
                        key={`${p.person_id}-${i}`}
                        className={`align-top ${rowBg}`}
                      >
                        <td className="py-2.5 pr-4">
                          <span className={`font-semibold ${nameColor}`}>
                            {p.last_name}
                            {p.first_name ? `, ${p.first_name}` : ""}
                          </span>
                          <span className="ml-2 rounded-full bg-bg px-1.5 py-0.5 text-[10px] font-medium text-text-light">
                            {ROLE_LABELS[p.role] ?? p.role}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={!p.school_registered ? "font-medium text-red-800" : quota ? "font-medium text-amber-900" : "text-text"}>
                            {p.school_name ?? (p.school_missing ? "—" : "–")}
                          </span>
                          {p.school_city && !p.school_missing && (
                            <span className="block text-[11px] text-text-light">
                              {p.school_city}
                            </span>
                          )}
                          {p.school_missing ? (
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                              <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                              Keine Schule angegeben
                            </span>
                          ) : !p.school_registered ? (
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                              <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                              Schule nicht registriert
                            </span>
                          ) : quota ? (
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                              {p.quota_pending
                                ? "Über Quote – bitte oben bearbeiten"
                                : "Über Quote – zugelassen"}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5">
                          {p.email ? (
                            <>
                              <a
                                href={`mailto:${p.email}`}
                                className="break-all text-primary hover:underline"
                              >
                                {p.email}
                              </a>
                              {p.email_via_school && (
                                <span className="mt-0.5 block text-[10px] font-medium text-text-light">
                                  Schul-Account (keine eigene E-Mail)
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-text-light">–</span>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Fuß */}
        {!loading && !error && participants.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 md:px-6">
            <span className="text-xs text-text-light">
              {participants.length}{" "}
              {participants.length === 1 ? "Teilnehmende:r" : "Teilnehmende"} ·{" "}
              {participants.filter((p) => p.email).length} mit E-Mail
            </span>
            <button
              type="button"
              onClick={copyEmails}
              disabled={participants.every((p) => !p.email)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              E-Mail-Adressen kopieren
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
