/**
 * Aus dem Bestandsaufnahme-Feld „Ansprechperson (Name, Funktion)" die reinen
 * Namen extrahieren – Funktionen/Rollen werden entfernt, mehrere Personen mit
 * „ & " verbunden (z. B. „Karoline Negraßus, Schulleitung   Guido Pankoke,
 * Konrektor" → „Karoline Negraßus & Guido Pankoke").
 *
 * Wird nur für ANZEIGE-/ANREDE-Namen (profiles.full_name, Auth-Display-Name)
 * verwendet. Die vollständige Originalangabe bleibt separat erhalten
 * (bestandsaufnahme_responses.contact_person) und geht NICHT verloren.
 */

// Stämme typischer Funktions-/Rollenbezeichnungen (case-insensitive).
// Bewusst KEIN bloßes „it" (würde sonst Namen wie „Britta" treffen) – die
// IT-Funktion ist über „beauftragt"/„koordinat" abgedeckt.
const ROLE_RE =
  /(schulleit|konrektor|rektor|direktor|lehr(?:er|erin|kraft|amt)?|p[äa]dagog|erzieher|sekretari|beauftragt|koordinat|stellv|fachleit|abteilungsleit|leitung|f[öo]rder|sonderp[äa]d|didakti)/i;

export function extractContactNames(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  // An Kommas, mehrfach-Leerzeichen sowie „und"/„&"/„/" trennen.
  const chunks = s
    .split(/\s*,\s*|\s{2,}|\s*[/&]\s*|\s+\bund\b\s+/i)
    .map((c) => c.trim())
    .filter(Boolean);
  const names = chunks.filter((c) => !ROLE_RE.test(c));
  const picked = names.length ? names : chunks; // Fallback: nichts erkannt → alles behalten
  // Duplikate (z. B. doppelte Namen) entfernen, mit „ & " verbinden.
  const seen = new Set<string>();
  const unique = picked.filter((n) => {
    const k = n.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return unique.join(" & ");
}

/** Name + Funktion zur Anzeige-Angabe „Name, Funktion" zusammensetzen. */
export function combineContactPerson(
  name: string | null | undefined,
  func: string | null | undefined,
): string {
  const n = String(name ?? "").trim();
  const f = String(func ?? "").trim();
  return f ? `${n}, ${f}` : n;
}

/**
 * Eine bestehende „Name, Funktion"-Angabe für die Bearbeitung wieder in Name +
 * Funktion zerlegen (Best-Effort: alles vor dem ersten Komma = Name).
 */
export function splitContactPerson(raw: string | null | undefined): {
  name: string;
  func: string;
} {
  const s = String(raw ?? "").trim();
  const i = s.indexOf(",");
  if (i < 0) return { name: s, func: "" };
  return { name: s.slice(0, i).trim(), func: s.slice(i + 1).trim() };
}
