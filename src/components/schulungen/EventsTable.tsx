"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  ChevronDown,
  Loader2,
  Mail,
  PenLine,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  ROLE_LABELS,
  type ConflictItem,
  type EventParticipant,
  type SchoolParticipation,
  type TrainingEvent,
} from "@/lib/schulungen/types";
import AddEventModal from "./AddEventModal";
import NlcSyncButton from "./NlcSyncButton";
import { AssignPicker, registeredSchools } from "./ConflictsTable";
import { useParticipantEdit } from "./useParticipantEdit";

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

/** Anmeldeschluss einer Schulung: formatiert + abgelaufen-Flag. */
function deadlineInfo(ev: TrainingEvent) {
  if (!ev.registration_deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(ev.registration_deadline + "T00:00:00");
  return { past: today > dl, formatted: formatDate(ev.registration_deadline) };
}

/**
 * Alle KOS-Schulungen mit Anmeldezahl. Klick auf eine Schulung öffnet die
 * Teilnehmer-Übersicht (Name · Schule · E-Mail).
 *
 * Admins sehen zusätzlich einen „+ Schulung"-Button sowie pro Schulung
 * einen Löschen-Button.
 */
export default function EventsTable({
  events,
  archivedEvents = [],
  conflicts = [],
  loading,
  isAdmin = false,
  onChanged,
  schools = [],
}: {
  events: TrainingEvent[];
  /** Archivierte Termine – über den Archiv-Knopf einsehbar. */
  archivedEvents?: TrainingEvent[];
  conflicts?: ConflictItem[];
  loading: boolean;
  isAdmin?: boolean;
  onChanged?: () => void;
  /** Registrierte Schulen inkl. Quotennutzung – für das Bearbeiten. */
  schools?: SchoolParticipation[];
}) {
  const [openEvent, setOpenEvent] = useState<TrainingEvent | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TrainingEvent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const conflictsByEvent = new Map<string, number>();
  for (const c of conflicts) {
    if (c.event?.id) {
      conflictsByEvent.set(c.event.id, (conflictsByEvent.get(c.event.id) ?? 0) + 1);
    }
  }

  // Archiv-Ansicht zeigt dieselbe Liste, nur mit den archivierten Terminen.
  const source = showArchive ? archivedEvents : events;
  const groups: { label: string; items: TrainingEvent[] }[] = [
    { label: "Lehrkräfte", items: source.filter((e) => e.audience === "teacher") },
    {
      label: "Schulleitungen",
      items: source.filter((e) => e.audience === "leadership"),
    },
  ];

  async function handleDelete(eventId: string) {
    setDeletingId(eventId);
    setDeleteError(null);
    try {
      const res = await fetch("/api/schulungen/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "Schulung konnte nicht gelöscht werden.");
      }
      setConfirmDeleteId(null);
      onChanged?.();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Schulung konnte nicht gelöscht werden."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRestore(eventId: string) {
    setRestoringId(eventId);
    setDeleteError(null);
    try {
      const res = await fetch("/api/schulungen/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventId, archived: false }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "Wiederherstellen fehlgeschlagen.");
      }
      onChanged?.();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Wiederherstellen fehlgeschlagen."
      );
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <section
      aria-labelledby="events-heading"
      className="rounded-2xl border border-border bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 md:px-6">
        <h2 id="events-heading" className="min-w-0">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="flex items-center gap-2 text-left text-base font-bold text-text"
          >
            {showArchive ? "Archiv" : "Alle Schulungen"}
            <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-bold tabular-nums text-text-light">
              {source.length}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-text-light transition-transform ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowArchive((v) => !v);
              setExpanded(true);
              setConfirmDeleteId(null);
              setDeleteError(null);
            }}
            aria-pressed={showArchive}
            title="Archivierte Termine ansehen (Anmeldedaten bleiben erhalten)"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              showArchive
                ? "border-primary bg-primary text-white shadow-sm"
                : "border-border bg-white text-text-light hover:border-primary/40 hover:text-primary"
            }`}
          >
            <Archive className="h-3 w-3" aria-hidden="true" />
            {showArchive ? "Zurück zu Aktuell" : `Archiv (${archivedEvents.length})`}
          </button>
          {isAdmin && <NlcSyncButton onSynced={onChanged} />}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-primary-light px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              Schulung hinzufügen
            </button>
          )}
          <a
            href="https://www.digiki-os.de/fuer-schulen#kos-fortbildungen"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Termine auf der Website
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-5 md:p-6">
          <p className="text-xs text-text-light">
            {showArchive
              ? "Archiv: Termine, die länger als 10 Tage vorbei sind oder manuell archiviert wurden – Anmeldedaten und Antragsprüfung bleiben erhalten. Auf eine Schulung tippen, um die Teilnehmenden zu sehen."
              : "Auf eine Schulung tippen, um die Teilnehmenden zu sehen."}
          </p>

          {showArchive && !loading && archivedEvents.length === 0 && (
            <p className="mt-4 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-light">
              Das Archiv ist leer.
            </p>
          )}

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
                  const dl = deadlineInfo(event);
                  return (
                    <li key={event.id} className="group/event relative">
                      <button
                        type="button"
                        onClick={() => setOpenEvent(event)}
                        className={`flex w-full items-center gap-3 rounded-lg py-2.5 pr-1 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                          conflictsByEvent.has(event.id)
                            ? "hover:bg-amber-50/60"
                            : "hover:bg-bg"
                        }`}
                      >
                        <div
                          className={`flex w-14 shrink-0 flex-col items-center rounded-lg px-1.5 py-1.5 text-center ${
                            conflictsByEvent.has(event.id) ? "bg-amber-50" : "bg-bg"
                          }`}
                        >
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
                          {dl && (
                            <p
                              className={`mt-0.5 text-[10px] font-semibold ${
                                dl.past ? "text-red-600" : "text-amber-700"
                              }`}
                            >
                              Anmeldeschluss {dl.formatted}
                              {dl.past ? " · abgelaufen" : ""}
                              {event.deadline_synced_at && (
                                <span
                                  className="ml-1 font-normal text-text-light"
                                  title={`Zuletzt mit NLC abgeglichen: ${new Date(event.deadline_synced_at).toLocaleString("de-DE")}`}
                                >
                                  · NLC ✓
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${
                              (event.registration_count ?? 0) > 0
                                ? "bg-primary/10 text-primary"
                                : "bg-bg text-text-light"
                            }`}
                          >
                            {event.registration_count ?? 0} Anm.
                          </span>
                          {conflictsByEvent.has(event.id) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                              {conflictsByEvent.get(event.id)}{" "}
                              {(conflictsByEvent.get(event.id) ?? 0) === 1
                                ? "Konflikt"
                                : "Konflikte"}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Admin: Bearbeiten + Löschen/Wiederherstellen */}
                      {isAdmin && showArchive && (
                        <div className="absolute -right-1 -top-1 flex items-center gap-1 opacity-0 transition-opacity group-hover/event:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingEvent(event);
                              setShowAddModal(true);
                            }}
                            className="rounded-lg bg-white p-1.5 text-text-light shadow-sm transition-colors hover:bg-bg hover:text-primary"
                            aria-label="Schulung bearbeiten"
                          >
                            <PenLine className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            disabled={restoringId === event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(event.id);
                            }}
                            className="rounded-lg bg-white p-1.5 text-text-light shadow-sm transition-colors hover:bg-green-50 hover:text-green-700 disabled:opacity-50"
                            aria-label="Aus dem Archiv wiederherstellen"
                            title="Aus dem Archiv wiederherstellen"
                          >
                            {restoringId === event.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      )}
                      {isAdmin && !showArchive && (
                        <div className="absolute -right-1 -top-1">
                          {confirmDeleteId === event.id ? (
                            <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2 py-1.5 shadow-lg animate-[modalIn_0.15s_ease-out_both]">
                              <span className="text-[11px] text-red-800">
                                {(event.registration_count ?? 0) > 0 ? (
                                  <>
                                    Archivieren?
                                    <span className="font-semibold">
                                      {" "}{event.registration_count} Anm. bleiben erhalten
                                    </span>
                                  </>
                                ) : (
                                  <>Löschen?</>
                                )}
                              </span>
                              <button
                                type="button"
                                disabled={deletingId === event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(event.id);
                                }}
                                className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                {deletingId === event.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                ) : (
                                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                                )}
                                Ja
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(null);
                                  setDeleteError(null);
                                }}
                                className="rounded-md border border-border px-2 py-1 text-[10px] font-bold text-text-light hover:bg-bg"
                              >
                                Nein
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/event:opacity-100">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingEvent(event);
                                  setShowAddModal(true);
                                }}
                                className="rounded-lg bg-white p-1.5 text-text-light shadow-sm transition-colors hover:bg-bg hover:text-primary"
                                aria-label="Schulung bearbeiten"
                              >
                                <PenLine className="h-4 w-4" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(event.id);
                                }}
                                className="rounded-lg bg-white p-1.5 text-text-light shadow-sm transition-colors hover:bg-red-50 hover:text-red-600"
                                aria-label="Schulung löschen"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
              ))}
            </div>
          )}

          {/* Delete error */}
          {deleteError && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {deleteError}
            </p>
          )}
        </div>
      )}

      {openEvent && (
        <ParticipantsModal
          event={openEvent}
          isAdmin={isAdmin}
          onClose={() => setOpenEvent(null)}
          onChanged={onChanged}
          schools={schools}
        />
      )}

      {showAddModal && (
        <AddEventModal
          eventToEdit={editingEvent || undefined}
          onCreated={() => {
            setEditingEvent(null);
            onChanged?.();
            setShowAddModal(false);
          }}
          onClose={() => {
            setEditingEvent(null);
            setShowAddModal(false);
          }}
        />
      )}
    </section>
  );
}

function ParticipantsModal({
  event,
  isAdmin,
  onClose,
  onChanged,
  schools = [],
}: {
  event: TrainingEvent;
  isAdmin?: boolean;
  onClose: () => void;
  onChanged?: () => void;
  schools?: SchoolParticipation[];
}) {
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadParticipants = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/schulungen/participants?event_id=${encodeURIComponent(event.id)}`
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "Teilnehmende konnten nicht geladen werden");
      }
      setParticipants(body.participants as EventParticipant[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      if (initial) setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    loadParticipants(true);
  }, [loadParticipants]);

  const edit = useParticipantEdit(event.id, async () => {
    await loadParticipants();
    onChanged?.();
  });
  const pickableSchools = useMemo(() => registeredSchools(schools), [schools]);

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

  async function handleDeleteParticipant(personId: string) {
    if (!confirm("Möchtest du diese Person wirklich aus der Schulung entfernen?")) return;
    setDeletingId(personId);
    try {
      const res = await fetch("/api/schulungen/participants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.id, person_id: personId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Fehler beim Löschen");
      }
      setParticipants((prev) => prev.filter((p) => p.person_id !== personId));
      if (edit.editingId === personId) edit.cancelEdit();
      onChanged?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Person konnte nicht gelöscht werden.");
    } finally {
      setDeletingId(null);
    }
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
        className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl"
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
                      {isAdmin && <th scope="col" className="py-2 w-10"></th>}
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
                      <Fragment key={`${p.person_id}-${i}`}>
                      <tr className={`align-top ${rowBg}`}>
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
                        {isAdmin && (
                          <td className="whitespace-nowrap py-2.5 text-right align-middle">
                            <button
                              type="button"
                              onClick={() =>
                                edit.editingId === p.person_id
                                  ? edit.cancelEdit()
                                  : edit.startEdit(p)
                              }
                              disabled={deletingId === p.person_id}
                              className={`inline-flex rounded-lg p-1.5 transition-colors disabled:opacity-50 ${
                                edit.editingId === p.person_id
                                  ? "bg-primary/10 text-primary"
                                  : "text-text-light/50 hover:bg-bg hover:text-primary"
                              }`}
                              title="Anmeldung bearbeiten"
                              aria-label={`Anmeldung von ${p.first_name} ${p.last_name} bearbeiten`}
                              aria-expanded={edit.editingId === p.person_id}
                            >
                              <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteParticipant(p.person_id)}
                              disabled={deletingId === p.person_id}
                              className="inline-flex rounded-lg p-1.5 text-text-light/50 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="Person aus der Schulung entfernen"
                            >
                              {deletingId === p.person_id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                            </button>
                          </td>
                        )}
                      </tr>
                      {isAdmin && edit.editingId === p.person_id && edit.draft && (
                        <tr className="bg-primary/[0.03]">
                          <td colSpan={4} className="px-2 py-3">
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                edit.saveEdit();
                              }}
                              className="rounded-xl border border-primary/20 bg-white p-3 shadow-sm"
                            >
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <label className="block">
                                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-light">
                                    Vorname
                                  </span>
                                  <input
                                    type="text"
                                    value={edit.draft.first_name}
                                    onChange={(e) =>
                                      edit.updateDraft({ first_name: e.target.value })
                                    }
                                    className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  />
                                </label>
                                <label className="block">
                                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-light">
                                    Nachname
                                  </span>
                                  <input
                                    type="text"
                                    required
                                    value={edit.draft.last_name}
                                    onChange={(e) =>
                                      edit.updateDraft({ last_name: e.target.value })
                                    }
                                    className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  />
                                </label>
                                <label className="block">
                                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-light">
                                    E-Mail
                                  </span>
                                  <input
                                    type="email"
                                    value={edit.draft.email}
                                    onChange={(e) =>
                                      edit.updateDraft({ email: e.target.value })
                                    }
                                    placeholder="Keine eigene E-Mail"
                                    className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text placeholder:text-text-light focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  />
                                </label>
                                <label className="block">
                                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-light">
                                    Rolle
                                  </span>
                                  <select
                                    value={edit.draft.role}
                                    onChange={(e) =>
                                      edit.updateDraft({
                                        role: e.target.value as EventParticipant["role"],
                                      })
                                    }
                                    className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  >
                                    <option value="teacher">{ROLE_LABELS.teacher}</option>
                                    <option value="leadership">{ROLE_LABELS.leadership}</option>
                                  </select>
                                </label>
                                <div className="sm:col-span-2">
                                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-light">
                                    Schule
                                  </span>
                                  <AssignPicker
                                    schools={pickableSchools}
                                    role={edit.draft.role}
                                    disabled={edit.saving}
                                    label={edit.draft.school_name ?? "Schule wählen …"}
                                    onPick={(name) => edit.updateDraft({ school_name: name })}
                                  />
                                </div>
                              </div>

                              {edit.editError && (
                                <p
                                  role="alert"
                                  className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                                >
                                  {edit.editError}
                                </p>
                              )}

                              {edit.quotaConfirm ? (
                                <div
                                  role="alert"
                                  className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                                >
                                  <p className="text-sm text-amber-800">
                                    {edit.quotaConfirm} Möchten Sie die Anmeldung trotzdem
                                    speichern? Die Person wird dann als „Über Quote –
                                    zugelassen" markiert.
                                  </p>
                                  <div className="mt-2 flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={edit.saving}
                                      onClick={() => edit.saveEdit(true)}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {edit.saving && (
                                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                      )}
                                      Trotzdem speichern
                                    </button>
                                    <button
                                      type="button"
                                      disabled={edit.saving}
                                      onClick={edit.cancelEdit}
                                      className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-bg disabled:opacity-50"
                                    >
                                      Abbrechen
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-3 flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    disabled={edit.saving}
                                    onClick={edit.cancelEdit}
                                    className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-bg disabled:opacity-50"
                                  >
                                    Abbrechen
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={edit.saving}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {edit.saving && (
                                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                    )}
                                    Speichern
                                  </button>
                                </div>
                              )}
                            </form>
                          </td>
                        </tr>
                      )}
                      </Fragment>
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
