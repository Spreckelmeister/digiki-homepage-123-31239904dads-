// Namens-Match für die Übernahme von Eltern-Anmeldungen.
// Eltern tippen Wunschnamen frei ein. Diese Helfer berechnen
// Vorschläge, die die Lehrkraft prüft (kein automatisches Eintragen
// bei niedriger Confidence, keine "stillen" Drops).

export interface NameSuggestion {
  id: string;
  name: string;
  /** 0..1 Confidence-Score */
  score: number;
}

/** Normalisiert: Trim, lower, Diakritika weg, ß→ss, Punkte raus. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[\.,_/\\]/g, " ")
    .replace(/[^a-z0-9 \-']/g, "")
    .replace(/\s+/g, " ");
}

function tokenize(s: string): string[] {
  return normalizeName(s).split(" ").filter(Boolean);
}

/** Standard Levenshtein-Distanz, iterativ. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1);
  for (let i = 0; i <= b.length; i++) v0[i] = i;
  const v1 = new Array(b.length + 1);
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v0[b.length];
}

function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  const max = Math.max(a.length, b.length);
  return 1 - dist / max;
}

/**
 * Berechnet einen Score 0..1 dafür, wie wahrscheinlich `query`
 * dasselbe Kind meint wie `candidate`.
 *
 * Heuristik:
 *  - Exakt nach Normalisierung → 1.0
 *  - Ein-Token vs. Ein-Token → Levenshtein-basierte Similarity
 *  - Mehr-Token: Vorname-Match wichtig, Nachname/Initial gewichtet
 *  - Fehlt der Vorname-Match (Sim < 0.7) → 0 (kein Treffer)
 */
export function nameMatchScore(query: string, candidate: string): number {
  const q = normalizeName(query);
  const c = normalizeName(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1;

  const qToks = tokenize(query);
  const cToks = tokenize(candidate);
  if (qToks.length === 0 || cToks.length === 0) return 0;

  // Beide einzelne Tokens (z. B. "Anna" vs "Anna" oder "Anna" vs "Anne")
  if (qToks.length === 1 && cToks.length === 1) {
    const sim = similarity(qToks[0], cToks[0]);
    return sim >= 0.75 ? sim * 0.9 : 0;
  }

  const qFirst = qToks[0];
  const cFirst = cToks[0];
  const qLast = qToks[qToks.length - 1];
  const cLast = cToks[cToks.length - 1];

  // Einseitig nur einer Token (z. B. "Anna" vs "Anna Schmidt")
  if (qToks.length === 1 || cToks.length === 1) {
    const single = qToks.length === 1 ? qFirst : cFirst;
    const firstSim = Math.max(similarity(single, cFirst), similarity(single, qFirst));
    if (firstSim < 0.85) return 0;
    return firstSim * 0.7; // ohne Nachname unsicher
  }

  // Vorname
  let firstSim: number;
  if (qFirst === cFirst) firstSim = 1;
  else firstSim = similarity(qFirst, cFirst);
  if (firstSim < 0.75) return 0;

  // Nachname: gleich? Initial? Sim?
  let lastSim: number;
  if (qLast === cLast) lastSim = 1;
  else if (qLast.length === 1 && cLast.startsWith(qLast)) lastSim = 0.9;
  else if (cLast.length === 1 && qLast.startsWith(cLast)) lastSim = 0.9;
  else lastSim = similarity(qLast, cLast);

  const score = firstSim * 0.55 + lastSim * 0.45;
  return score >= 0.7 ? score : 0;
}

/**
 * Findet exakten Match (nach Normalisierung).
 * Sicher genug, um automatisch zu übernehmen.
 */
export function exactNameMatch(
  query: string,
  candidates: { id: string; name: string }[]
): { id: string; name: string } | null {
  const q = normalizeName(query);
  if (!q) return null;
  for (const c of candidates) {
    if (normalizeName(c.name) === q) return c;
  }
  return null;
}

/**
 * Findet die Top-N besten Vorschläge oberhalb der Schwelle.
 * Diese sind NICHT zum automatischen Übernehmen gedacht – die Lehrkraft
 * muss bestätigen.
 */
export function findNameMatches(
  query: string,
  candidates: { id: string; name: string }[],
  threshold = 0.7,
  maxResults = 3
): NameSuggestion[] {
  const out: NameSuggestion[] = [];
  for (const c of candidates) {
    const score = nameMatchScore(query, c.name);
    if (score >= threshold) {
      out.push({ id: c.id, name: c.name, score });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, maxResults);
}
