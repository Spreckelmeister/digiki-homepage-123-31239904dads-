// Schulleitungs-Cockpit: Daten-Layer.
// Termine, Pflichttermin-Katalog (Niedersachsen), Feiertage / Ferien
// (statisches Dataset für 2025–2027), Konflikt-Erkennung,
// iCal-Export, Quick-Add-Parser (deutsch).

// ════════ TYPEN ════════════════════════════════════════════════════════

export type TerminCategory =
  | "eltern"
  | "konferenz"
  | "pflicht"
  | "unterricht"
  | "schulentw"
  | "sonstiges";

export interface Termin {
  id: string;
  titel: string;
  datum: string; // ISO YYYY-MM-DD
  uhrzeit?: string; // HH:MM
  ort?: string;
  notiz?: string;
  kategorie: TerminCategory;
  pflicht?: boolean;
  /** ID des verknüpften Klassenrosters (optional) */
  rosterId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CockpitData {
  termine: Termin[];
  schuljahr: string; // z. B. "2025/26"
}

export const CATEGORIES: { id: TerminCategory; label: string; color: string; bg: string }[] =
  [
    { id: "eltern", label: "Eltern", color: "#3d6fa8", bg: "#e7eef8" },
    { id: "konferenz", label: "Konferenzen", color: "#7a4e9c", bg: "#f0e8f6" },
    { id: "pflicht", label: "Pflichttermin", color: "#b0463a", bg: "#fbe3df" },
    { id: "unterricht", label: "Unterricht", color: "#2f7a4f", bg: "#dff0e5" },
    { id: "schulentw", label: "Schulentwicklung", color: "#c87d2b", bg: "#fcefd6" },
    { id: "sonstiges", label: "Sonstiges", color: "#6b7a80", bg: "#eef0f2" },
  ];

export function categoryStyle(cat: TerminCategory) {
  return CATEGORIES.find((c) => c.id === cat) ?? CATEGORIES[5];
}

// ════════ STORAGE =====================================================

export const COCKPIT_STORAGE_KEY = "digiki.werkzeuge.cockpit.v1";

export function loadCockpit(): CockpitData {
  if (typeof window === "undefined")
    return { termine: [], schuljahr: currentSchuljahr() };
  try {
    const raw = window.localStorage.getItem(COCKPIT_STORAGE_KEY);
    if (!raw) return { termine: [], schuljahr: currentSchuljahr() };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object")
      return { termine: [], schuljahr: currentSchuljahr() };
    const termineRaw = Array.isArray(parsed.termine) ? parsed.termine : [];
    const termine: Termin[] = termineRaw
      .filter((t: unknown) => t && typeof t === "object")
      .map((t: Record<string, unknown>) => ({
        id: String(t.id ?? uuid()),
        titel: String(t.titel ?? "Ohne Titel"),
        datum: String(t.datum ?? isoDate(new Date())),
        uhrzeit: typeof t.uhrzeit === "string" ? t.uhrzeit : undefined,
        ort: typeof t.ort === "string" ? t.ort : undefined,
        notiz: typeof t.notiz === "string" ? t.notiz : undefined,
        kategorie: validCategory(t.kategorie),
        pflicht: t.pflicht === true,
        rosterId: typeof t.rosterId === "string" ? t.rosterId : undefined,
        createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
        updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : Date.now(),
      }));
    return {
      termine,
      schuljahr: typeof parsed.schuljahr === "string" ? parsed.schuljahr : currentSchuljahr(),
    };
  } catch {
    return { termine: [], schuljahr: currentSchuljahr() };
  }
}

export function saveCockpit(data: CockpitData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COCKPIT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* noop */
  }
}

function validCategory(c: unknown): TerminCategory {
  if (typeof c === "string" && CATEGORIES.some((x) => x.id === c))
    return c as TerminCategory;
  return "sonstiges";
}

// ════════ HELPERS ═════════════════════════════════════════════════════

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateDE(iso: string): string {
  const d = parseIso(iso);
  return d.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShortDE(iso: string): string {
  const d = parseIso(iso);
  return d.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
  });
}

export const WEEKDAYS_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export function currentSchuljahr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  // Schuljahr beginnt grob im August
  if (m >= 7) return `${y}/${String((y + 1) % 100).padStart(2, "0")}`;
  return `${y - 1}/${String(y % 100).padStart(2, "0")}`;
}

export function getSchuljahrRange(schuljahr: string): { from: string; to: string } {
  const [y1] = schuljahr.split("/");
  const y1n = parseInt(y1, 10);
  return { from: `${y1n}-08-01`, to: `${y1n + 1}-07-31` };
}

// ════════ FEIERTAGE & FERIEN — NI ═════════════════════════════════════
// Curated static dataset für Niedersachsen.
// Quelle: Kultusministerium Niedersachsen; aktualisierbar in dieser Datei.

interface Feiertag {
  date: string; // ISO
  name: string;
}

interface Ferien {
  startDate: string; // ISO
  endDate: string; // ISO inkl.
  name: string;
}

export const FEIERTAGE_NI: Feiertag[] = [
  // 2025
  { date: "2025-01-01", name: "Neujahr" },
  { date: "2025-04-18", name: "Karfreitag" },
  { date: "2025-04-21", name: "Ostermontag" },
  { date: "2025-05-01", name: "Tag der Arbeit" },
  { date: "2025-05-29", name: "Christi Himmelfahrt" },
  { date: "2025-06-09", name: "Pfingstmontag" },
  { date: "2025-10-03", name: "Tag der Deutschen Einheit" },
  { date: "2025-10-31", name: "Reformationstag" },
  { date: "2025-12-25", name: "1. Weihnachtsfeiertag" },
  { date: "2025-12-26", name: "2. Weihnachtsfeiertag" },
  // 2026
  { date: "2026-01-01", name: "Neujahr" },
  { date: "2026-04-03", name: "Karfreitag" },
  { date: "2026-04-06", name: "Ostermontag" },
  { date: "2026-05-01", name: "Tag der Arbeit" },
  { date: "2026-05-14", name: "Christi Himmelfahrt" },
  { date: "2026-05-25", name: "Pfingstmontag" },
  { date: "2026-10-03", name: "Tag der Deutschen Einheit" },
  { date: "2026-10-31", name: "Reformationstag" },
  { date: "2026-12-25", name: "1. Weihnachtsfeiertag" },
  { date: "2026-12-26", name: "2. Weihnachtsfeiertag" },
  // 2027
  { date: "2027-01-01", name: "Neujahr" },
  { date: "2027-03-26", name: "Karfreitag" },
  { date: "2027-03-29", name: "Ostermontag" },
  { date: "2027-05-01", name: "Tag der Arbeit" },
  { date: "2027-05-06", name: "Christi Himmelfahrt" },
  { date: "2027-05-17", name: "Pfingstmontag" },
  { date: "2027-10-03", name: "Tag der Deutschen Einheit" },
  { date: "2027-10-31", name: "Reformationstag" },
  { date: "2027-12-25", name: "1. Weihnachtsfeiertag" },
  { date: "2027-12-26", name: "2. Weihnachtsfeiertag" },
];

// Ferien NI — Stand: KMK-Beschluss
export const FERIEN_NI: Ferien[] = [
  // Schuljahr 2025/26
  { name: "Herbstferien 2025", startDate: "2025-10-13", endDate: "2025-10-25" },
  { name: "Weihnachten 2025", startDate: "2025-12-22", endDate: "2026-01-05" },
  { name: "Halbjahr 2026", startDate: "2026-01-30", endDate: "2026-01-30" },
  { name: "Osterferien 2026", startDate: "2026-03-23", endDate: "2026-04-04" },
  { name: "Pfingstferien 2026", startDate: "2026-05-15", endDate: "2026-05-15" },
  { name: "Sommerferien 2026", startDate: "2026-07-02", endDate: "2026-08-12" },
  // Schuljahr 2026/27
  { name: "Herbstferien 2026", startDate: "2026-10-12", endDate: "2026-10-23" },
  { name: "Weihnachten 2026", startDate: "2026-12-23", endDate: "2027-01-08" },
  { name: "Halbjahr 2027", startDate: "2027-01-29", endDate: "2027-01-29" },
  { name: "Osterferien 2027", startDate: "2027-03-29", endDate: "2027-04-09" },
  { name: "Pfingstferien 2027", startDate: "2027-05-07", endDate: "2027-05-07" },
  { name: "Sommerferien 2027", startDate: "2027-07-22", endDate: "2027-09-01" },
];

export function isFeiertag(iso: string): Feiertag | null {
  return FEIERTAGE_NI.find((f) => f.date === iso) ?? null;
}

export function isFerientag(iso: string): Ferien | null {
  return (
    FERIEN_NI.find((f) => iso >= f.startDate && iso <= f.endDate) ?? null
  );
}

// ════════ KONFLIKT-ERKENNUNG ══════════════════════════════════════════

export interface Konflikt {
  art: "feiertag" | "ferien" | "wochenende" | "haeufung";
  text: string;
}

export function checkKonflikte(iso: string, alleTermine: Termin[], eigenerId?: string): Konflikt[] {
  const konflikte: Konflikt[] = [];
  const f = isFeiertag(iso);
  if (f) konflikte.push({ art: "feiertag", text: `Feiertag: ${f.name}` });
  const sf = isFerientag(iso);
  if (sf) konflikte.push({ art: "ferien", text: `Ferien: ${sf.name}` });
  const d = parseIso(iso);
  const dow = d.getDay();
  if (dow === 0 || dow === 6) {
    konflikte.push({ art: "wochenende", text: dow === 0 ? "Sonntag" : "Samstag" });
  }
  // Häufung: 2+ andere Termine am gleichen Tag
  const sameDay = alleTermine.filter((t) => t.id !== eigenerId && t.datum === iso);
  if (sameDay.length >= 2) {
    konflikte.push({
      art: "haeufung",
      text: `${sameDay.length} weitere Termine an diesem Tag`,
    });
  }
  return konflikte;
}

// ════════ BRÜCKENTAGE ═════════════════════════════════════════════════

export interface Brueckentag {
  datum: string; // ISO
  anlass: string;
  feiertagDatum: string;
  position: "vor" | "nach";
}

export function findBrueckentage(fromIso: string, toIso: string): Brueckentag[] {
  const out: Brueckentag[] = [];
  for (const f of FEIERTAGE_NI) {
    if (f.date < fromIso || f.date > toIso) continue;
    const d = parseIso(f.date);
    const dow = d.getDay();
    // Donnerstag → Freitag drücken
    if (dow === 4) {
      const br = new Date(d);
      br.setDate(d.getDate() + 1);
      out.push({
        datum: isoDate(br),
        anlass: f.name,
        feiertagDatum: f.date,
        position: "nach",
      });
    }
    // Dienstag → Montag drücken
    if (dow === 2) {
      const br = new Date(d);
      br.setDate(d.getDate() - 1);
      out.push({
        datum: isoDate(br),
        anlass: f.name,
        feiertagDatum: f.date,
        position: "vor",
      });
    }
  }
  out.sort((a, b) => a.datum.localeCompare(b.datum));
  return out;
}

// ════════ PFLICHTTERMINE NI (kuratierter Auszug) ══════════════════════

export interface PflichtterminTemplate {
  id: string;
  titel: string;
  kategorie: TerminCategory;
  /** Funktion, die für ein gegebenes Schuljahr ein ISO-Datum berechnet */
  computeDate: (schuljahr: string) => string | null;
  notiz?: string;
}

/** "n-ter Wochentag in Monat" — z. B. erster Montag im September im Jahr y */
function nthWeekdayOfMonth(
  year: number,
  monthZeroBased: number,
  weekday: number,
  position: "first" | "second" | "third" | "fourth" | "last"
): Date {
  if (position === "last") {
    const last = new Date(year, monthZeroBased + 1, 0);
    const diff = (last.getDay() - weekday + 7) % 7;
    return new Date(year, monthZeroBased, last.getDate() - diff);
  }
  const posIdx = { first: 0, second: 1, third: 2, fourth: 3 }[position];
  const first = new Date(year, monthZeroBased, 1);
  const diff = (weekday - first.getDay() + 7) % 7;
  return new Date(year, monthZeroBased, 1 + diff + posIdx * 7);
}

export const PFLICHTTERMINE_NI: PflichtterminTemplate[] = [
  {
    id: "schuljahresbeginn",
    titel: "Schuljahresbeginn (1. Schultag)",
    kategorie: "pflicht",
    computeDate: (sj) => {
      // Erster Schultag = Tag nach Ende der Sommerferien des Vorjahres
      const [y1] = sj.split("/").map(Number);
      const sommerEnde = FERIEN_NI.find(
        (f) => f.name.startsWith("Sommerferien") && f.endDate.startsWith(String(y1))
      );
      if (!sommerEnde) return null;
      const d = parseIso(sommerEnde.endDate);
      d.setDate(d.getDate() + 1);
      // Wenn Wochenende, auf Montag schieben
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      return isoDate(d);
    },
    notiz: "Erste Gesamtkonferenz / Begrüßung Kollegium",
  },
  {
    id: "einschulung",
    titel: "Einschulung der 1. Klassen",
    kategorie: "pflicht",
    computeDate: (sj) => {
      // Samstag nach Schuljahresbeginn
      const [y1] = sj.split("/").map(Number);
      const sommer = FERIEN_NI.find(
        (f) => f.name.startsWith("Sommerferien") && f.endDate.startsWith(String(y1))
      );
      if (!sommer) return null;
      const d = parseIso(sommer.endDate);
      d.setDate(d.getDate() + 1);
      while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
      return isoDate(d);
    },
    notiz: "Üblicherweise Samstag nach Schuljahresbeginn",
  },
  {
    id: "halbjahreszeugnis",
    titel: "Ausgabe Halbjahreszeugnisse (Kl. 1–4)",
    kategorie: "pflicht",
    computeDate: (sj) => {
      const [, y2] = sj.split("/");
      const y2full = 2000 + parseInt(y2, 10);
      // Letzter Schultag vor den Halbjahresferien
      const halbjahr = FERIEN_NI.find(
        (f) =>
          f.name.startsWith("Halbjahr") && f.startDate.startsWith(String(y2full))
      );
      if (!halbjahr) return null;
      const d = parseIso(halbjahr.startDate);
      d.setDate(d.getDate() - 1);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
      return isoDate(d);
    },
  },
  {
    id: "endjahreszeugnis",
    titel: "Ausgabe Jahreszeugnisse",
    kategorie: "pflicht",
    computeDate: (sj) => {
      const [, y2] = sj.split("/");
      const y2full = 2000 + parseInt(y2, 10);
      const sommer = FERIEN_NI.find(
        (f) => f.name.startsWith("Sommerferien") && f.startDate.startsWith(String(y2full))
      );
      if (!sommer) return null;
      const d = parseIso(sommer.startDate);
      d.setDate(d.getDate() - 1);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
      return isoDate(d);
    },
  },
  {
    id: "vera-3",
    titel: "VERA-3 (Vergleichsarbeiten Klasse 3)",
    kategorie: "pflicht",
    computeDate: (sj) => {
      // Üblich Mai des zweiten Jahres
      const [, y2] = sj.split("/").map((s) => parseInt(s, 10));
      const y2full = 2000 + y2;
      const d = nthWeekdayOfMonth(y2full, 4, 2, "third"); // 3. Dienstag im Mai
      return isoDate(d);
    },
    notiz: "Nach Vorgabe IQB; Termin schulintern festlegen",
  },
  {
    id: "elternabend-erste",
    titel: "1. Elternabend nach Schuljahresbeginn",
    kategorie: "eltern",
    computeDate: (sj) => {
      const [y1] = sj.split("/").map(Number);
      // 4. Donnerstag im September
      const d = nthWeekdayOfMonth(y1, 8, 4, "third");
      return isoDate(d);
    },
  },
  {
    id: "schulkonferenz-1",
    titel: "1. Schulkonferenz",
    kategorie: "konferenz",
    computeDate: (sj) => {
      const [y1] = sj.split("/").map(Number);
      const d = nthWeekdayOfMonth(y1, 8, 3, "fourth"); // 4. Mittwoch im September
      return isoDate(d);
    },
  },
  {
    id: "schulkonferenz-2",
    titel: "2. Schulkonferenz",
    kategorie: "konferenz",
    computeDate: (sj) => {
      const [, y2] = sj.split("/").map((s) => parseInt(s, 10));
      const y2full = 2000 + y2;
      const d = nthWeekdayOfMonth(y2full, 2, 3, "second"); // 2. Mittwoch im März
      return isoDate(d);
    },
  },
  {
    id: "tag-d-offenen-tuer",
    titel: "Tag der offenen Tür",
    kategorie: "schulentw",
    computeDate: (sj) => {
      const [y1] = sj.split("/").map(Number);
      const d = nthWeekdayOfMonth(y1, 10, 6, "second"); // 2. Samstag im November
      return isoDate(d);
    },
    notiz: "Schulinterner Tag — Termin individuell anpassen",
  },
  {
    id: "anmeldung-eingangsstufe",
    titel: "Anmeldewoche Schulanfänger",
    kategorie: "schulentw",
    computeDate: (sj) => {
      const [, y2] = sj.split("/").map((s) => parseInt(s, 10));
      const y2full = 2000 + y2;
      // Ende April / Anfang Mai üblich
      const d = nthWeekdayOfMonth(y2full, 4, 1, "first"); // 1. Montag im Mai
      return isoDate(d);
    },
  },
];

// ════════ QUICK-ADD-PARSER ════════════════════════════════════════════

export interface QuickAddResult {
  titel: string;
  datum: string | null;
  uhrzeit: string | null;
}

const WOCHENTAG_MAP: Record<string, number> = {
  sonntag: 0,
  montag: 1,
  dienstag: 2,
  mittwoch: 3,
  donnerstag: 4,
  freitag: 5,
  samstag: 6,
};

export function parseQuickAdd(text: string, today: Date = new Date()): QuickAddResult {
  let datum: string | null = null;
  let uhrzeit: string | null = null;
  let titel = text.trim();

  // Uhrzeit
  const zeitRe = /\b(\d{1,2})[:.](\d{2})\s*(?:Uhr|h)?\b|\b(\d{1,2})\s*Uhr\b/i;
  const mZeit = titel.match(zeitRe);
  if (mZeit) {
    const h = parseInt(mZeit[1] || mZeit[3]);
    const m = parseInt(mZeit[2] || "0");
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      uhrzeit = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      titel = titel.replace(mZeit[0], "").trim();
    }
  }

  // Deutsches Datum DD.MM.[YYYY]
  const mDeutsch = titel.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})?\b/);
  // ISO YYYY-MM-DD
  const mIso = titel.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);

  if (mDeutsch) {
    const day = parseInt(mDeutsch[1]);
    const month = parseInt(mDeutsch[2]);
    let y = mDeutsch[3] ? parseInt(mDeutsch[3]) : today.getFullYear();
    if (y < 100) y += 2000;
    const test = new Date(y, month - 1, day);
    // Wenn ohne Jahr und das Datum ist schon vergangen → nächstes Jahr
    if (!mDeutsch[3] && test < today) {
      test.setFullYear(test.getFullYear() + 1);
    }
    datum = isoDate(test);
    titel = titel.replace(mDeutsch[0], "").trim();
  } else if (mIso) {
    datum = `${mIso[1]}-${mIso[2]}-${mIso[3]}`;
    titel = titel.replace(mIso[0], "").trim();
  } else {
    const lower = titel.toLowerCase();
    if (/\bheute\b/.test(lower)) {
      datum = isoDate(today);
      titel = titel.replace(/\bheute\b/i, "").trim();
    } else if (/\bmorgen\b/.test(lower)) {
      const t = new Date(today);
      t.setDate(t.getDate() + 1);
      datum = isoDate(t);
      titel = titel.replace(/\bmorgen\b/i, "").trim();
    } else if (/\bübermorgen\b/.test(lower)) {
      const t = new Date(today);
      t.setDate(t.getDate() + 2);
      datum = isoDate(t);
      titel = titel.replace(/\bübermorgen\b/i, "").trim();
    } else {
      const wtMatch = lower.match(
        /\b(?:nächsten?|kommenden|am)\s+(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/
      );
      if (wtMatch) {
        const target = WOCHENTAG_MAP[wtMatch[1]];
        const d = new Date(today);
        let addDays = (target - d.getDay() + 7) % 7;
        if (addDays === 0) addDays = 7;
        d.setDate(d.getDate() + addDays);
        datum = isoDate(d);
        titel = titel.replace(/\b(?:nächsten?|kommenden|am)\s+(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/i, "").trim();
      } else {
        // Plain Wochentag → der nächste solche Tag
        const wt = lower.match(
          /\b(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/
        );
        if (wt) {
          const target = WOCHENTAG_MAP[wt[1]];
          const d = new Date(today);
          let addDays = (target - d.getDay() + 7) % 7;
          if (addDays === 0) addDays = 7;
          d.setDate(d.getDate() + addDays);
          datum = isoDate(d);
          titel = titel.replace(/\b(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/i, "").trim();
        }
      }
    }
  }

  // Aufräumen
  titel = titel.replace(/\s+/g, " ").trim();
  if (!titel) titel = "Ohne Titel";

  return { titel, datum, uhrzeit };
}

// ════════ iCal-Export ═════════════════════════════════════════════════

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dtStamp(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeICS(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function exportIcal(termine: Termin[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DigiKI//Schulleitungs-Cockpit//DE",
    "CALSCALE:GREGORIAN",
  ];
  const stamp = dtStamp(new Date());
  for (const t of termine) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${t.id}@digiki-osnabrueck.de`);
    lines.push(`DTSTAMP:${stamp}`);
    const dt = t.datum.replace(/-/g, "");
    if (t.uhrzeit) {
      const [hh, mm] = t.uhrzeit.split(":");
      const start = `${dt}T${hh}${mm}00`;
      // Default-Dauer 1h
      const startDate = parseIso(t.datum);
      startDate.setHours(parseInt(hh, 10), parseInt(mm, 10) + 60);
      const eh = pad(startDate.getHours());
      const em = pad(startDate.getMinutes());
      const end = `${dt}T${eh}${em}00`;
      lines.push(`DTSTART:${start}`);
      lines.push(`DTEND:${end}`);
    } else {
      // All-Day
      lines.push(`DTSTART;VALUE=DATE:${dt}`);
      // DTEND ist exklusiv → +1 Tag
      const next = parseIso(t.datum);
      next.setDate(next.getDate() + 1);
      lines.push(`DTEND;VALUE=DATE:${isoDate(next).replace(/-/g, "")}`);
    }
    lines.push(`SUMMARY:${escapeICS(t.titel)}`);
    if (t.ort) lines.push(`LOCATION:${escapeICS(t.ort)}`);
    if (t.notiz) lines.push(`DESCRIPTION:${escapeICS(t.notiz)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
