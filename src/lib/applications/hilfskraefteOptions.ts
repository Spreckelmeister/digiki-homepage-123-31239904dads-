/**
 * Zentrale Optionslisten für den Hilfskräfte-Antrag (neues Modell
 * „punktuelle Unterstützung", Migration 030). In der DB werden die
 * stabilen `value`-Tokens gespeichert; die Labels hängen nur an der
 * Anzeige (Formular, Admin-Detail, Markdown-Export, MySubmissions).
 */

export interface HilfskraefteOption {
  value: string;
  label: string;
}

/** Automatisch abgeleitet aus den Schulungsdashboard-Daten. */
export const TRAINING_PARTICIPATION_OPTIONS = [
  { value: "teilgenommen", label: "Bereits an Schulung teilgenommen" },
  { value: "angemeldet", label: "Zu Schulung angemeldet" },
  // Nur im Stellvertreter-Modus möglich (Admin/Schulungsteam füllt für
  // eine Schule aus und überspringt die automatische Prüfung bewusst).
  {
    value: "pruefung_uebersprungen",
    label: "Schulungsprüfung übersprungen (durch Schulungsteam/Admin)",
  },
] as const;

/** Bereich der EINEN konkreten Hürde (Einfachauswahl). */
export const SUPPORT_AREA_OPTIONS = [
  {
    value: "technische_einrichtung",
    label: "Technische Einrichtung eines Tools",
  },
  {
    value: "technisches_problem",
    label: "Technisches Problem im laufenden Einsatz",
  },
  { value: "materialerstellung", label: "Materialerstellung mit KI-Tools" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

/** Fester Einsatzumfang statt Freitext-Dauer/Wochenstunden. */
export const SCOPE_PRESET_OPTIONS = [
  { value: "einzeltermin", label: "Einzeltermin (ca. 2–4 Stunden)" },
  { value: "zwei_bis_drei_termine", label: "2–3 Termine" },
] as const;

/** Label zum gespeicherten Token – null bei unbekanntem/leerem Wert. */
export function labelFor(
  options: ReadonlyArray<HilfskraefteOption>,
  value: string | null | undefined
): string | null {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? null;
}
