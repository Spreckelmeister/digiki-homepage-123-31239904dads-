import * as XLSX from "xlsx";

// Excel-Parser für die zwei bekannten Export-Formate:
//
// Format "nlc" (z. B. "DiGiKI Gruppe1.xlsx"):
//   MT_NACHN | MT_VORN | MT_EMAIL | SH_NAME1 | SH_STRASSE | SH_PLZ | SH_ST_NAMEL | SH_FON
//
// Format "educa" (z. B. "educa__10_06_2026.xlsx"):
//   Vorname | Nachname | Schule | Schulform | Workshops
//   (enthält KEINE E-Mail – Personen werden über Name + Schule gematcht)

export type ExcelFormat = "nlc" | "educa";

export interface ParsedRow {
  /** 1-basierte Zeilennummer in der Excel-Datei (inkl. Kopfzeile). */
  row: number;
  firstName: string;
  lastName: string;
  email: string | null;
  schoolName: string;
  schoolStreet: string | null;
  schoolPlz: string | null;
  schoolCity: string | null;
  schoolPhone: string | null;
  schoolType: string | null;
  workshops: string | null;
}

export interface ParseResult {
  format: ExcelFormat;
  rows: ParsedRow[];
  skipped: { row: number; reason: string }[];
}

/**
 * Obergrenze für Datenzeilen pro Datei. Reale KOS-Exporte haben
 * wenige Dutzend Zeilen; ein deutlich höheres Limit fängt versehentlich
 * riesige Dateien ab, bevor sie tausende DB-Roundtrips auslösen.
 */
export const MAX_ROWS_PER_FILE = 5000;

/** Whitespace bereinigen (auch NBSP aus Excel-Exporten). */
function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalisierung für Matching-Schlüssel: lowercase + Whitespace
 * bereinigt. Umlaute bleiben erhalten – beide Export-Formate stammen
 * aus denselben Quellsystemen und schreiben Namen identisch.
 */
export function normalizeKey(value: string): string {
  return clean(value).toLowerCase();
}

/** Schulname → stabiler Schlüssel (Excel-Exporte haben keine Schulnummer). */
export function schoolKeyFromName(name: string): string {
  return normalizeKey(name).replace(/[.,;]+$/, "").trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function parseEmail(value: unknown): string | null {
  const email = clean(value).toLowerCase();
  return EMAIL_RE.test(email) ? email : null;
}

/** Werte wie "-", "–" oder "" als "nicht vorhanden" behandeln. */
function emptyish(value: string): boolean {
  return value === "" || /^[-–—/]+$/.test(value);
}

type HeaderMap = Record<string, number>;

function buildHeaderMap(headerRow: unknown[]): HeaderMap {
  const map: HeaderMap = {};
  headerRow.forEach((cell, idx) => {
    const key = normalizeKey(String(cell ?? ""));
    if (key && !(key in map)) map[key] = idx;
  });
  return map;
}

function detectFormat(headers: HeaderMap): ExcelFormat | null {
  if ("mt_nachn" in headers && "mt_vorn" in headers) return "nlc";
  if ("vorname" in headers && "nachname" in headers && "schule" in headers)
    return "educa";
  return null;
}

function cell(row: unknown[], headers: HeaderMap, name: string): string {
  const idx = headers[name];
  return idx === undefined ? "" : clean(row[idx]);
}

function orNull(value: string): string | null {
  return emptyish(value) ? null : value;
}

/**
 * Parst eine Excel-Datei (alle Tabellenblätter mit erkennbarer
 * Kopfzeile). Wirft einen Fehler mit verständlicher Meldung, wenn
 * kein Blatt einem bekannten Format entspricht.
 */
export function parseRegistrationFile(buffer: Buffer | ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  let format: ExcelFormat | null = null;
  const rows: ParsedRow[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
    });
    // Format anhand der Kopfzeile erkennen, auch wenn das Blatt keine
    // Datenzeilen hat – sonst meldet ein leerer (aber gültiger) Export
    // fälschlich "Unbekanntes Dateiformat".
    if (matrix.length < 1) continue;

    const headers = buildHeaderMap(matrix[0]);
    const sheetFormat = detectFormat(headers);
    if (!sheetFormat) continue;
    format = format ?? sheetFormat;

    for (let i = 1; i < matrix.length; i++) {
      const raw = matrix[i];
      const rowNumber = i + 1;

      if (rows.length >= MAX_ROWS_PER_FILE) {
        throw new Error(
          `Datei enthält mehr als ${MAX_ROWS_PER_FILE} Datenzeilen – bitte in kleinere Dateien aufteilen.`
        );
      }

      const firstName =
        sheetFormat === "nlc"
          ? cell(raw, headers, "mt_vorn")
          : cell(raw, headers, "vorname");
      const lastName =
        sheetFormat === "nlc"
          ? cell(raw, headers, "mt_nachn")
          : cell(raw, headers, "nachname");
      const schoolName =
        sheetFormat === "nlc"
          ? cell(raw, headers, "sh_name1")
          : cell(raw, headers, "schule");

      // Komplett leere Zeilen still überspringen
      if (!firstName && !lastName && emptyish(schoolName)) continue;

      if (!lastName && !firstName) {
        skipped.push({ row: rowNumber, reason: "Kein Name angegeben" });
        continue;
      }
      if (emptyish(schoolName)) {
        skipped.push({
          row: rowNumber,
          reason: `Keine Schule angegeben (${lastName || firstName}) – ohne Schule kann keine Quote geprüft werden`,
        });
        continue;
      }

      if (sheetFormat === "nlc") {
        rows.push({
          row: rowNumber,
          firstName,
          lastName,
          email: parseEmail(cell(raw, headers, "mt_email")),
          schoolName,
          schoolStreet: orNull(cell(raw, headers, "sh_strasse")),
          schoolPlz: orNull(cell(raw, headers, "sh_plz")),
          schoolCity: orNull(cell(raw, headers, "sh_st_namel")),
          schoolPhone: orNull(cell(raw, headers, "sh_fon")),
          schoolType: null,
          workshops: null,
        });
      } else {
        rows.push({
          row: rowNumber,
          firstName,
          lastName,
          email: null,
          schoolName,
          schoolStreet: null,
          schoolPlz: null,
          schoolCity: null,
          schoolPhone: null,
          schoolType: orNull(cell(raw, headers, "schulform")),
          workshops: orNull(cell(raw, headers, "workshops")),
        });
      }
    }
  }

  if (!format) {
    throw new Error(
      "Unbekanntes Dateiformat: Es wurde keine Kopfzeile mit den erwarteten Spalten gefunden " +
        "(erwartet: MT_NACHN/MT_VORN/… oder Vorname/Nachname/Schule)."
    );
  }

  return { format, rows, skipped };
}
