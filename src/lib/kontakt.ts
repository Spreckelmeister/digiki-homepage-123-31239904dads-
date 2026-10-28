/**
 * Gemeinsame Konstanten für das Kontaktformular – genutzt vom öffentlichen
 * Formular (ContactForm), der Server-Route /api/kontakt und dem
 * Admin-Tab „Kontakt".
 */

import type { ContactRequestStatus } from "@/lib/types";

/** Auswahl „Ihr Anliegen" – wird als Klartext gespeichert.
 *  „Sonstiges" ist zugleich der Standardwert (Auffangkategorie). */
export const CONTACT_TOPICS = [
  "Schulungen & Termine",
  "Tool-Lizenzen",
  "Studentische Unterstützung",
  "Bestandsaufnahme & Konto",
  "Best-Practice-Datenbank",
  "Sonstiges",
] as const;

export const CONTACT_TOPIC_DEFAULT = "Sonstiges";

export const MAX_MESSAGE_LENGTH = 5000;

export const CONTACT_STATUS_META: Record<
  ContactRequestStatus,
  { label: string; badgeClass: string }
> = {
  neu: { label: "Neu", badgeClass: "bg-yellow-100 text-yellow-700" },
  in_bearbeitung: {
    label: "In Bearbeitung",
    badgeClass: "bg-blue-100 text-blue-700",
  },
  beantwortet: { label: "Beantwortet", badgeClass: "bg-green-100 text-green-700" },
};

/** Schlüssel in `app_settings` für die Weiterleitungs-Adresse(n). */
export const CONTACT_FORWARD_SETTING_KEY = "contact_forward_to";

const FORWARD_EMAIL_REGEX = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** Zerlegt eine Komma-/Semikolon-/Zeilen-getrennte Adressliste.
 *  Gibt gültige Adressen (dedupliziert, klein) und ungültige Einträge zurück. */
export function parseForwardRecipients(raw: string): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const part of raw.split(/[,;\n]/)) {
    const a = part.trim().toLowerCase();
    if (!a) continue;
    if (!FORWARD_EMAIL_REGEX.test(a)) invalid.push(a);
    else if (!valid.includes(a)) valid.push(a);
  }
  return { valid, invalid };
}
