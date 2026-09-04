/**
 * Client-sichere NLC-Helfer (keine Server-Imports!) – genutzt vom
 * AddEventModal im Browser und von der Server-Logik in nlcSync.ts.
 */

/** NLC-Veranstaltungs-ID: bevorzugt aus der Spalte, sonst aus dem Link. */
export function extractNlcEventId(ev: {
  nlc_event_id?: string | null;
  anmeldung_url?: string | null;
}): string | null {
  const direct = (ev.nlc_event_id ?? "").trim();
  if (/^\d+$/.test(direct)) return direct;
  const match = (ev.anmeldung_url ?? "").match(/\/event\/(\d+)/);
  return match ? match[1] : null;
}

/** Vorschlagswerte für das Anlegen einer Schulung aus dem NLC-Eintrag. */
export interface NlcEventSuggestion {
  kursNr: string | null;
  title: string | null;
  /** Erster Schulungstag (YYYY-MM-DD) – mehrtägige Durchgänge zählen ab Tag 1. */
  startDate: string | null;
  audience: "teacher" | "leadership" | null;
  deadline: string | null;
}
