/**
 * NLC-Abgleich: liest den Anmeldeschluss der KOS-Schulungen automatisch
 * aus dem Niedersächsischen LernCenter (nlc.info) aus.
 *
 * Die NLC-Veranstaltungsseiten sind eine React-SPA (HTML nicht parsebar),
 * aber die App nutzt eine öffentliche JSON-API, die auch serverseitig
 * ohne Cookies/Turnstile funktioniert:
 *   GET https://nlc.info/api/v1/public/events/<id>/details
 * → payload.event.appointments[].maxDateApplication (lokale Zeit) ist der
 *   Anmeldeschluss je Termin; relevantMaxDate (UTC) der Fallback.
 *
 * NLC ist die Quelle der Wahrheit: Ein abweichender Handeintrag wird beim
 * Abgleich überschrieben (die Stadt ändert die Fristen häufig – genau
 * dieses Nachpflegen soll entfallen). Fetch-Fehler lassen die Zeile
 * unangetastet; deadline_synced_at zeigt den letzten erfolgreichen Stand.
 */

import { createServiceClient } from "@/lib/schulungen/server";
import type { NlcSyncSummary } from "@/lib/schulungen/types";
import {
  extractNlcEventId,
  type NlcEventSuggestion,
} from "@/lib/schulungen/nlcShared";

// Client-sichere Helfer weiterreichen, damit bestehende Server-Importe
// (events-Route, overview) unverändert aus diesem Modul ziehen können.
export { extractNlcEventId };
export type { NlcEventSuggestion };

const NLC_API_BASE = "https://nlc.info/api/v1/public/events";
const FETCH_TIMEOUT_MS = 8000;
/** Höflich gegenüber NLC/Cloudflare: nie mehr als 5 Abrufe parallel. */
const BATCH_SIZE = 5;
/** Gleicher User-Agent-Stil wie die Nominatim-Aufrufe (school-search). */
const USER_AGENT = "DigiKI-Homepage/1.0 (krafft@osnabrueck.de)";
/** So viele Tage nach dem Termin wandert eine Schulung automatisch ins Archiv. */
export const ARCHIVE_AFTER_DAYS = 10;

/**
 * Automatisches Aufräumen: Termine, deren Datum länger als
 * ARCHIVE_AFTER_DAYS zurückliegt, ins Archiv verschieben (archived_at).
 * Anmeldungen bleiben unangetastet – die Schulungsprüfung der
 * Antragsformulare braucht sie weiterhin. Läuft beim täglichen Cron,
 * beim Admin-Abgleich und bei jedem Dashboard-Aufruf (idempotent).
 * Fehler (z.B. Spalte aus Migration 034 fehlt noch) werden nur geloggt.
 */
export async function archivePastEvents(
  client?: ReturnType<typeof createServiceClient>,
): Promise<string[]> {
  try {
    const admin = client ?? createServiceClient();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ARCHIVE_AFTER_DAYS);
    const cutoffStr = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Berlin",
    }).format(cutoff);

    const { data, error } = await admin
      .from("training_events")
      .update({ archived_at: new Date().toISOString() })
      .is("archived_at", null)
      .not("start_date", "is", null)
      .lt("start_date", cutoffStr)
      .select("kurs_nr");

    if (error) {
      console.error("[archivePastEvents]", error.message);
      return [];
    }
    const archived = ((data ?? []) as { kurs_nr: string }[]).map(
      (e) => e.kurs_nr,
    );
    if (archived.length > 0) {
      console.log("[archivePastEvents] ins Archiv:", archived.join(", "));
    }
    return archived;
  } catch (err) {
    console.error("[archivePastEvents]", err);
    return [];
  }
}

interface NlcAppointment {
  start?: string | null;
  maxDateApplication?: string | null;
}

export interface NlcEventPayload {
  appointments?: NlcAppointment[];
  relevantMaxDate?: string | null;
  title?: string | null;
  /** Bei KOS-Ausschreibungen die exakte KOS-Nummer (z.B. "KOS.2638.166"). */
  identifier?: string | null;
  /** Zielgruppen-Freitext (z.B. "SL der Grundschule …"). */
  addressee?: string | null;
  startFirstAppointment?: string | null;
}

/** "2026-08-25 23:59:59" (lokal) → "2026-08-25"; sonst null. */
function localDatePart(value: string | null | undefined): string | null {
  const m = (value ?? "").match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/** UTC-ISO → Kalendertag in Europe/Berlin (sv-SE liefert YYYY-MM-DD). */
function berlinDatePart(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
  }).format(d);
}

/**
 * Anmeldeschluss aus den NLC-Daten wählen: Termin mit passendem Startdatum,
 * sonst der erste Termin mit Frist; Fallback relevantMaxDate. In der Praxis
 * teilen alle Termine eines DigiKI-Events (3-Tages-Seminar) dieselbe Frist.
 */
export function pickDeadline(
  event: NlcEventPayload,
  startDate: string | null,
): string | null {
  const withDeadline = (event.appointments ?? []).filter((a) =>
    localDatePart(a.maxDateApplication),
  );
  const matching = startDate
    ? withDeadline.find((a) => localDatePart(a.start) === startDate)
    : undefined;
  const chosen = matching ?? withDeadline[0];
  if (chosen) return localDatePart(chosen.maxDateApplication);
  return berlinDatePart(event.relevantMaxDate);
}

/** Rohdaten eines NLC-Events abrufen (öffentliche JSON-API). Wirft bei Fehlern. */
export async function fetchNlcEventDetails(
  nlcEventId: string,
): Promise<NlcEventPayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${NLC_API_BASE}/${nlcEventId}/details`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`NLC antwortete mit HTTP ${res.status}`);
    }
    const body = (await res.json()) as {
      payload?: { event?: NlcEventPayload };
    };
    const event = body?.payload?.event;
    if (!event) {
      throw new Error("NLC-Antwort ohne Veranstaltungsdaten");
    }
    return event;
  } finally {
    clearTimeout(timeout);
  }
}

/** Ein NLC-Event abrufen und den Anmeldeschluss extrahieren. Wirft bei Fehlern. */
export async function fetchNlcDeadline(
  nlcEventId: string,
  startDate: string | null,
): Promise<string | null> {
  const event = await fetchNlcEventDetails(nlcEventId);
  return pickDeadline(event, startDate);
}

/**
 * Vorschlagswerte für das Anlege-Modal aus einem NLC-Event ableiten:
 * KOS-Nummer (identifier), Titel, erster Schulungstag, Zielgruppe
 * (Text-Heuristik über addressee + Titel) und Anmeldeschluss.
 */
export function extractEventSuggestion(
  event: NlcEventPayload,
): NlcEventSuggestion {
  const startDate =
    localDatePart(event.startFirstAppointment) ??
    ((event.appointments ?? [])
      .map((a) => localDatePart(a.start))
      .filter((d): d is string => d !== null)
      .sort()[0] ??
      null);

  // „SL der Grundschule …" / „(… nur für SL!)" → Schulleitungen;
  // „Lehrkräfte …" → Lehrkräfte; sonst unentschieden (Radio bleibt).
  const audienceText = `${event.addressee ?? ""} ${event.title ?? ""}`.toLowerCase();
  let audience: "teacher" | "leadership" | null = null;
  if (
    /schulleit/.test(audienceText) ||
    /(^|[^a-zäöüß])sl($|[^a-zäöüß])/.test(audienceText)
  ) {
    audience = "leadership";
  } else if (/lehrkr/.test(audienceText)) {
    audience = "teacher";
  }

  return {
    kursNr: (event.identifier ?? "").trim() || null,
    title: (event.title ?? "").trim() || null,
    startDate,
    audience,
    deadline: pickDeadline(event, startDate),
  };
}

type SyncableEvent = {
  id: string;
  kurs_nr: string;
  nlc_event_id: string | null;
  anmeldung_url: string | null;
  start_date: string | null;
  registration_deadline: string | null;
};

/**
 * Alle kommenden Schulungen mit NLC abgleichen. Wird vom täglichen
 * Vercel-Cron und vom Admin-Knopf im Schulungsdashboard aufgerufen.
 */
export async function syncNlcDeadlines(): Promise<NlcSyncSummary> {
  const admin = createServiceClient();

  // Zuerst aufräumen: Lange vergangene Termine ins Archiv – sie fallen
  // damit auch gleich aus der folgenden Abgleich-Auswahl heraus.
  const autoArchived = await archivePastEvents(admin);

  const todayStr = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
  }).format(new Date());

  const { data, error } = await admin
    .from("training_events")
    .select("*")
    .or(`start_date.is.null,start_date.gte.${todayStr}`)
    .order("start_date", { ascending: true });

  if (error) {
    throw new Error(`Schulungen konnten nicht geladen werden: ${error.message}`);
  }

  // Archivierte Termine nicht mehr abgleichen (JS-Filter, damit der Code
  // auch ohne die Spalte aus Migration 034 läuft).
  const events = (
    (data ?? []) as (SyncableEvent & { archived_at?: string | null })[]
  ).filter((e) => !e.archived_at);
  const summary: NlcSyncSummary = {
    checked: events.length,
    updated: [],
    unchanged: 0,
    skipped: [],
    failed: [],
    autoArchived,
    syncedAt: new Date().toISOString(),
  };

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (ev) => {
        const nlcId = extractNlcEventId(ev);
        if (!nlcId) {
          summary.skipped.push(ev.kurs_nr);
          return;
        }
        try {
          const deadline = await fetchNlcDeadline(nlcId, ev.start_date);
          const updates: Record<string, string> = {
            deadline_synced_at: summary.syncedAt,
          };
          // ID aus dem Link in die Spalte übernehmen (Dashboard-POST
          // setzte sie früher nie).
          if (!ev.nlc_event_id) updates.nlc_event_id = nlcId;
          // Kein Schluss bei NLC hinterlegt → bestehenden Wert behalten
          // (nie einen Handeintrag mit "nichts" überschreiben).
          const changed =
            deadline !== null && deadline !== ev.registration_deadline;
          if (changed) updates.registration_deadline = deadline!;

          const { error: updateError } = await admin
            .from("training_events")
            .update(updates)
            .eq("id", ev.id);
          if (updateError) {
            summary.failed.push({
              kurs_nr: ev.kurs_nr,
              error: updateError.message,
            });
            return;
          }
          if (changed) {
            summary.updated.push({
              kurs_nr: ev.kurs_nr,
              from: ev.registration_deadline,
              to: deadline!,
            });
          } else {
            summary.unchanged += 1;
          }
        } catch (err) {
          summary.failed.push({
            kurs_nr: ev.kurs_nr,
            error:
              err instanceof Error && err.name === "AbortError"
                ? "Zeitüberschreitung beim NLC-Abruf"
                : err instanceof Error
                  ? err.message
                  : "Unbekannter Fehler",
          });
        }
      }),
    );
  }

  return summary;
}
