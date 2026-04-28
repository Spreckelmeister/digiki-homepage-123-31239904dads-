// Optionslisten aus dem Bestandsaufnahme-Fragebogen
// (siehe src/components/forms/BestandsaufnahmeForm.tsx).
// Werden für die Auswertung benötigt, um konsistente Reihenfolgen
// und Labels in den Charts darzustellen.

export const STUDENT_COUNT_OPTIONS = [
  "unter 150",
  "150–300",
  "300–450",
  "über 450",
] as const;

export const DAZ_OPTIONS = [
  "Unter 10 %",
  "10–25 %",
  "25–50 %",
  "Über 50 %",
  "Kann ich nicht einschätzen",
] as const;

export const RESPONDENT_ROLE_OPTIONS = [
  "Schulleitung",
  "IT-Beauftragte/r",
  "Medienbeauftragte/r",
  "Sonstiges",
] as const;

export const DEVICE_OPTIONS = [
  "iPads/Tablets",
  "Laptops/Notebooks",
  "Desktop-PCs",
  "Interaktive Displays/Smartboards",
  "Dokumentenkameras",
  "Roboter (z. B. Calliope, Bee-Bot)",
  "Sonstiges",
] as const;

export const TABLET_COUNT_OPTIONS = [
  "Keine",
  "1–10",
  "11–20",
  "21–30",
  "Mehr als 30",
  "1:1-Ausstattung (jedes Kind ein Gerät)",
] as const;

export const INFRASTRUCTURE_OPTIONS = [
  "IServ",
  "Microsoft 365 / Teams",
  "Google Workspace",
  "Schulserver (lokal)",
  "Schul-Cloud Niedersachsen",
  "Sonstiges",
] as const;

export const CHALLENGE_OPTIONS = [
  "Einrichtung/Konfiguration der Geräte dauert zu lange",
  "Zu wenig verfügbare Geräte für den Unterricht",
  "WLAN ist instabil oder nicht flächendeckend",
  "Software-Updates und Wartung binden zu viel Zeit",
  "Fehlender oder langsamer technischer Support",
  "Keine Entlastungsstunden für digitale Koordination",
  "Mangelnde Kompatibilität zwischen Geräten/Systemen",
  "Unklare Zuständigkeiten (Schul-IT, Schulträger, Medienzentrum)",
  "Datenschutzanforderungen erschweren den Tool-Einsatz",
  "Fehlende Fortbildungsmöglichkeiten",
  "Zeitmangel im Kollegium für die Einarbeitung",
  "Skepsis/Widerstand im Kollegium",
  "Sonstiges",
] as const;

export const TOOL_OPTIONS = [
  "Anton App",
  "Antolin",
  "Worksheet Crafter",
  "BookCreator",
  "LearningApps",
  "Onilo",
  "Leseo",
  "Matific",
  "bettermarks",
  "Mathegym",
  "Sofatutor",
  "Padlet",
  "Kahoot",
  "H5P",
  "Sonstiges",
] as const;

export const USAGE_FREQUENCY_OPTIONS = [
  "Täglich",
  "Mehrmals pro Woche",
  "Einmal pro Woche",
  "Mehrmals im Monat",
  "Selten/gar nicht",
] as const;

export const DIAGNOSTIC_OPTIONS = [
  "ILeA digital",
  "ELFE II digital",
  "Levumi",
  "Quop",
  "Nein, keine digitale Diagnostik",
  "Sonstiges",
] as const;

export const MEDIA_CONCEPT_OPTIONS = [
  "Ja, aktuell (< 2 Jahre alt)",
  "Ja, aber veraltet",
  "Nein, in Arbeit",
  "Nein",
] as const;

export const MEDIA_RESPONSIBLE_OPTIONS = [
  "Ja, mit Entlastungsstunden",
  "Ja, ohne Entlastungsstunden",
  "Nein",
] as const;

export const AI_USAGE_OPTIONS = [
  "Ja, mehrere Lehrkräfte regelmäßig",
  "Ja, einzelne Lehrkräfte gelegentlich",
  "Nein, aber Interesse vorhanden",
  "Nein, kein Interesse",
  "Unsicher",
] as const;

export const AI_PURPOSE_OPTIONS = [
  "Unterrichtsvorbereitung (Arbeitsblätter, Aufgaben)",
  "Differenzierung/Individualisierung",
  "Textübersetzung/Leichte Sprache",
  "Elternkommunikation",
  "Verwaltungsaufgaben (Protokolle, Berichte)",
  "Förderplanung",
  "Recherche/Fortbildung",
  "Sonstiges",
] as const;

export const AI_TOOL_OPTIONS = [
  "ChatGPT",
  "Claude (Anthropic)",
  "Google Gemini",
  "Microsoft Copilot",
  "Fobizz KI-Assistenz",
  "DeepL",
  "Canva AI",
  "Telli",
  "Sonstiges",
] as const;

export const AI_CONCERN_OPTIONS = [
  "Datenschutz/DSGVO",
  "Urheberrecht",
  "Qualität/Zuverlässigkeit der Ergebnisse",
  "Fehlende Kompetenzen",
  "Zeitmangel für Einarbeitung",
  "Pädagogische Bedenken (z. B. Bildschirmzeit)",
  "Technische Hürden",
  "AI-Act / Rechtsunsicherheit",
  "Keine Bedenken",
  "Sonstiges",
] as const;

export const AI_TRAINING_OPTIONS = [
  "Ja, über Fobizz",
  "Ja, über das KOS",
  "Ja, über andere Anbieter",
  "Nein, aber Interesse",
  "Nein, kein Interesse",
  "Sonstiges",
] as const;

export const TRAINING_NEED_OPTIONS = [
  "KI-Grundlagen und Einsatzmöglichkeiten",
  "Rechtssicherer KI-Einsatz (DSGVO, AI-Act)",
  "KI für Unterrichtsvorbereitung und Materialerstellung",
  "Digitale Förderdiagnostik",
  "Adaptive Lernplattformen (Mathe/Deutsch)",
  "Sprachförderung/DaZ mit digitalen Tools",
  "Digitale Produktion (Videos, Podcasts)",
  "Making & Coding (3D-Druck, Robotik, Scratch)",
  "Interaktive Displays effektiv nutzen",
  "Tablets im Unterricht einsetzen",
  "Medienkonzeptentwicklung",
  "Change Management / Digitale Schulentwicklung",
  "Sonstiges",
] as const;

export const TRAINING_FORMAT_OPTIONS = [
  "Ganztägige Präsenzschulungen (extern)",
  "Halbtägige Workshops",
  "Schulinterne Fortbildungen (SchiLF)",
  "Online-Schulungen (synchron)",
  "Online-Selbstlernkurse (asynchron)",
  "Peer-Learning (Austausch mit anderen Schulen)",
  "Individuelle Begleitung vor Ort (z. B. durch Studierende)",
] as const;

export const TRAINING_TIME_OPTIONS = [
  "Während der Unterrichtszeit (mit Vertretung)",
  "Nachmittags (nach Unterrichtsschluss)",
  "An Studientagen",
  "In den Ferien",
  "Samstags",
] as const;

export const PIONEER_INTEREST_OPTIONS = [
  "Ja, sehr gerne",
  "Ja, unter bestimmten Voraussetzungen",
  "Nein, wir möchten erst die Schulungen abwarten",
] as const;

export const SUPPORT_NEED_OPTIONS = [
  "Finanzierung von Software-Lizenzen",
  "Studentische Hilfskräfte für technischen Support",
  "Praxisnahe Fortbildungen",
  "Entlastungsstunden für digitale Koordination",
  "Bessere technische Infrastruktur (WLAN, Geräte)",
  "Best-Practice-Materialien und Vorlagen",
  "Regelmäßiger Austausch mit anderen Schulen",
  "Individuelle Beratung / Coaching",
] as const;

export const SOFTWARE_LICENSE_OPTIONS = [
  "Adaptive Mathe-Plattform (z. B. Matific, bettermarks)",
  "Leseförderung (z. B. Antolin Plus, Leseo, Onilo)",
  "DaZ/LRS-Förderung (z. B. Deutschfuchs, Meister Cody)",
  "Materialerstellung (z. B. Worksheet Crafter, BookCreator)",
  "KI-Assistenz (z. B. Fobizz, SchulKI)",
  "Sonstiges",
] as const;

export const STUDENT_SUPPORT_OPTIONS = [
  "Ja, für technische Einrichtung",
  "Ja, für Unterrichtsbegleitung",
  "Ja, für beides",
  "Nein, aktuell kein Bedarf",
] as const;

export const TIME_FOR_TOOLS_OPTIONS = [
  "Regelmäßig (mehrmals pro Woche)",
  "Wöchentlich (feste Zeiten)",
  "Gelegentlich (nach Bedarf)",
  "Aktuell kaum möglich",
] as const;

export const HAS_BEST_PRACTICE_OPTIONS = ["Ja", "Nein"] as const;

export const SHARE_PRACTICE_OPTIONS = [
  "Ja, sehr gerne",
  "Ja, unter bestimmten Voraussetzungen",
  "Nein, aktuell nicht",
  "Vielleicht später",
] as const;
