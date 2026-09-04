/**
 * Gemeinsame Konstanten für das Kontaktformular – genutzt vom öffentlichen
 * Formular (ContactForm), der Server-Route /api/kontakt und dem
 * Admin-Tab „Kontakt".
 */

import type { ContactRequestStatus } from "@/lib/types";

/** Auswahl „Ihr Anliegen" – wird als Klartext gespeichert. */
export const CONTACT_TOPICS = [
  "Allgemeine Anfrage",
  "Schulungen & Termine",
  "Tool-Lizenzen",
  "Studentische Unterstützung",
  "Bestandsaufnahme & Konto",
  "Best-Practice-Datenbank",
  "Sonstiges",
] as const;

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
