"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  GraduationCap,
  Hash,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Users,
  X,
} from "lucide-react";

import type { TrainingEvent } from "@/lib/schulungen/types";
import {
  extractNlcEventId,
  type NlcEventSuggestion,
} from "@/lib/schulungen/nlcShared";

/**
 * Modal zum Anlegen oder Bearbeiten einer KOS-Schulung.
 * Nur für Admins sichtbar (Caller prüft isAdmin).
 */
export default function AddEventModal({
  eventToEdit,
  onCreated,
  onClose,
}: {
  eventToEdit?: TrainingEvent;
  onCreated: () => void;
  onClose: () => void;
}) {
  const [kursNr, setKursNr] = useState(eventToEdit?.kurs_nr ?? "");
  const [startDate, setStartDate] = useState(eventToEdit?.start_date ?? "");
  const [audience, setAudience] = useState<"teacher" | "leadership">(
    eventToEdit?.audience ?? "teacher"
  );
  const [title, setTitle] = useState(
    eventToEdit?.title &&
      !eventToEdit.title.startsWith("KOS-Fortbildung ")
      ? eventToEdit.title
      : ""
  );
  const [anmeldungUrl, setAnmeldungUrl] = useState(eventToEdit?.anmeldung_url ?? "");
  const [registrationDeadline, setRegistrationDeadline] = useState(eventToEdit?.registration_deadline ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [nlcLoading, setNlcLoading] = useState(false);
  const [nlcStatus, setNlcStatus] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const kursRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  // Beim Bearbeiten nicht ungefragt neu abrufen: Die ID des gespeicherten
  // Links gilt als bereits "geladen"; der Übernehmen-Knopf erzwingt es.
  const lastFetchedId = useRef<string | null>(
    extractNlcEventId({ anmeldung_url: eventToEdit?.anmeldung_url ?? "" })
  );

  // Autofokus: beim Anlegen auf den Anmeldelink (Schritt 1),
  // beim Bearbeiten wie bisher auf die KOS-Nummer.
  useEffect(() => {
    if (eventToEdit) kursRef.current?.focus();
    else linkRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchFromNlc(link: string, force = false) {
    const nlcId = extractNlcEventId({ anmeldung_url: link, nlc_event_id: link });
    if (!nlcId) {
      if (force) {
        setNlcStatus({
          kind: "error",
          text: "Kein NLC-Link erkannt – erwartet wird z.B. https://nlc.info/app/edb/event/55355.",
        });
      }
      return;
    }
    if (!force && lastFetchedId.current === nlcId) return;
    lastFetchedId.current = nlcId;
    setNlcLoading(true);
    setNlcStatus(null);
    try {
      const res = await fetch(
        `/api/schulungen/nlc-event?link=${encodeURIComponent(link)}`
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "NLC-Daten konnten nicht geladen werden.");
      }
      const sug = body.suggestion as NlcEventSuggestion;
      if (sug.kursNr) setKursNr(sug.kursNr);
      if (sug.startDate) setStartDate(sug.startDate);
      if (sug.audience) setAudience(sug.audience);
      if (sug.title) setTitle(sug.title);
      if (sug.deadline) setRegistrationDeadline(sug.deadline);
      setNlcStatus({
        kind: "ok",
        text: "Daten von NLC übernommen – bitte kurz prüfen und bei Bedarf anpassen.",
      });
    } catch (err) {
      setNlcStatus({
        kind: "error",
        text:
          (err instanceof Error
            ? err.message
            : "NLC-Daten konnten nicht geladen werden.") +
          " Die Felder lassen sich ganz normal manuell ausfüllen.",
      });
    } finally {
      setNlcLoading(false);
    }
  }

  // Auto-Abruf, sobald der eingegebene Link eine NLC-ID enthält
  // (entprellt, damit beim Tippen keine halben IDs abgefragt werden).
  useEffect(() => {
    const nlcId = extractNlcEventId({
      anmeldung_url: anmeldungUrl,
      nlc_event_id: anmeldungUrl,
    });
    if (!nlcId || lastFetchedId.current === nlcId) return;
    const t = setTimeout(() => fetchFromNlc(anmeldungUrl), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anmeldungUrl]);

  // Esc schließt das Modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const isEdit = !!eventToEdit;
      const url = "/api/schulungen/events";
      const method = isEdit ? "PATCH" : "POST";
      const bodyPayload: any = {
        kurs_nr: kursNr.trim(),
        start_date: startDate,
        audience,
        title: title.trim() || undefined,
        anmeldung_url: anmeldungUrl.trim() || undefined,
        registration_deadline: registrationDeadline || undefined,
      };
      if (isEdit) {
        bodyPayload.id = eventToEdit.id;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? `Schulung konnte nicht ${isEdit ? "aktualisiert" : "angelegt"} werden.`);
      }

      setSuccess(true);
      setTimeout(() => {
        onCreated();
        onClose();
      }, 800);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Schulung konnte nicht angelegt werden."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Neue Schulung anlegen"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg animate-[modalIn_0.25s_cubic-bezier(0.16,1,0.3,1)_both] rounded-2xl bg-white shadow-2xl"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light text-white">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-bold text-text">
                {eventToEdit ? "Schulung bearbeiten" : "Neue Schulung anlegen"}
              </h2>
              <p className="text-xs text-text-light">
                {eventToEdit ? "Details der KOS-Fortbildung ändern" : "KOS-Fortbildung zum Dashboard hinzufügen"}
              </p>
            </div>
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

        {/* ── Formular ── */}
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {/* Schritt 1: Anmeldelink – füllt den Rest automatisch */}
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
            <label
              htmlFor="add-event-url"
              className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary"
            >
              <Link2 className="h-3 w-3" aria-hidden="true" />
              Anmeldelink (NLC) zuerst
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={linkRef}
                  id="add-event-url"
                  type="url"
                  autoComplete="off"
                  placeholder="https://nlc.info/app/edb/event/…"
                  value={anmeldungUrl}
                  onChange={(e) => setAnmeldungUrl(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 pr-9 text-sm text-text placeholder:text-text-light/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {nlcLoading && (
                  <Loader2
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary"
                    aria-hidden="true"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => fetchFromNlc(anmeldungUrl, true)}
                disabled={nlcLoading}
                title="Daten jetzt (erneut) von NLC übernehmen"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 bg-white px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Übernehmen
              </button>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-text-light">
              Link einfügen – KOS-Nummer, erster Schulungstag, Zielgruppe,
              Titel und Anmeldeschluss füllen sich automatisch und bleiben
              anpassbar.
            </p>
            <div aria-live="polite">
              {nlcStatus && (
                <p
                  className={`mt-2 rounded-lg px-3 py-2 text-xs ${
                    nlcStatus.kind === "ok"
                      ? "bg-white font-semibold text-primary"
                      : "border border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {nlcStatus.kind === "ok" ? "✓ " : ""}
                  {nlcStatus.text}
                </p>
              )}
            </div>
          </div>

          {/* KOS-Nummer */}
          <div>
            <label
              htmlFor="add-event-kurs-nr"
              className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light"
            >
              <Hash className="h-3 w-3" aria-hidden="true" />
              KOS-Nummer
            </label>
            <input
              ref={kursRef}
              id="add-event-kurs-nr"
              type="text"
              required
              autoComplete="off"
              placeholder="z.B. 26.45-2601"
              value={kursNr}
              onChange={(e) => setKursNr(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 font-mono text-sm text-text placeholder:font-sans placeholder:text-text-light/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Datum */}
          <div>
            <label
              htmlFor="add-event-date"
              className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light"
            >
              <CalendarDays className="h-3 w-3" aria-hidden="true" />
              Erster Schulungstag
            </label>
            <input
              id="add-event-date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Zielgruppe */}
          <fieldset>
            <legend className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
              <Users className="h-3 w-3" aria-hidden="true" />
              Zielgruppe
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all ${
                  audience === "teacher"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-white hover:border-primary/30"
                }`}
              >
                <input
                  type="radio"
                  name="audience"
                  value="teacher"
                  checked={audience === "teacher"}
                  onChange={() => setAudience("teacher")}
                  className="sr-only"
                />
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                    audience === "teacher"
                      ? "bg-primary/15 text-primary"
                      : "bg-bg text-text-light"
                  }`}
                >
                  <Users className="h-4 w-4" aria-hidden="true" />
                </span>
                <span
                  className={`text-sm font-semibold ${
                    audience === "teacher" ? "text-primary" : "text-text"
                  }`}
                >
                  Lehrkräfte
                </span>
              </label>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all ${
                  audience === "leadership"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-white hover:border-primary/30"
                }`}
              >
                <input
                  type="radio"
                  name="audience"
                  value="leadership"
                  checked={audience === "leadership"}
                  onChange={() => setAudience("leadership")}
                  className="sr-only"
                />
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                    audience === "leadership"
                      ? "bg-primary/15 text-primary"
                      : "bg-bg text-text-light"
                  }`}
                >
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                </span>
                <span
                  className={`text-sm font-semibold ${
                    audience === "leadership" ? "text-primary" : "text-text"
                  }`}
                >
                  Schulleitungen
                </span>
              </label>
            </div>
          </fieldset>

          {/* Titel (optional) */}
          <div>
            <label
              htmlFor="add-event-title"
              className="mb-1.5 flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
                Titel
              </span>
              <span className="text-[10px] font-medium text-text-light/60">
                optional
              </span>
            </label>
            <input
              id="add-event-title"
              type="text"
              autoComplete="off"
              placeholder={
                audience === "leadership"
                  ? "KOS-Fortbildung Schulleitungen"
                  : "KOS-Fortbildung Lehrkräfte"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text-light/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Anmeldeschluss (optional) */}
          <div>
            <label
              htmlFor="add-event-deadline"
              className="mb-1.5 flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
                Anmeldeschluss
              </span>
              <span className="text-[10px] font-medium text-text-light/60">
                optional
              </span>
            </label>
            <input
              id="add-event-deadline"
              type="date"
              value={registrationDeadline}
              onChange={(e) => setRegistrationDeadline(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Feedback */}
          <div aria-live="polite">
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
                ✓ Schulung wurde erfolgreich {eventToEdit ? "aktualisiert" : "angelegt"}!
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-semibold text-text-light transition-colors hover:bg-bg disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={busy || success}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-light px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              {eventToEdit ? "Speichern" : "Schulung anlegen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
