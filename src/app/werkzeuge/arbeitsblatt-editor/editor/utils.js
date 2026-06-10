/* ============================================================
   Utilities: syllabify (DE heuristic), math generators, clipart
   ============================================================ */

// ---- German syllabification (heuristic) ----
// Manuelle Trennung hat IMMER Vorrang: Lehrer kann · oder | an die richtige Stelle setzen.
function syllabify(word) {
  if (/[·|]/.test(word)) return word.split(/[·|]/).filter(s => s.length > 0);
  const core = word.match(/^[\wäöüÄÖÜß]+$/u) ? word : null;
  if (!core || word.length < 3) return [word];
  const V = c => "aeiouäöüyAEIOUÄÖÜY".includes(c);
  const digraphs = ["sch", "ch", "ck", "ph", "th", "ng", "qu"];
  const lw = word.toLowerCase();
  let units = [];
  for (let i = 0; i < word.length;) {
    let m = digraphs.find(d => lw.substr(i, d.length) === d);
    if (m) { units.push({ s: word.substr(i, m.length), v: false }); i += m.length; }
    else { units.push({ s: word[i], v: V(word[i]) }); i++; }
  }
  // merge vowel runs into nuclei
  let merged = [];
  for (const u of units) {
    const last = merged[merged.length - 1];
    if (u.v && last && last.v) last.s += u.s; else merged.push({ ...u });
  }
  const nuclei = merged.map((u, i) => (u.v ? i : -1)).filter(i => i >= 0);
  if (nuclei.length <= 1) return [word];
  const bounds = new Set();
  for (let n = 0; n < nuclei.length - 1; n++) {
    const a = nuclei[n], b = nuclei[n + 1], cons = b - a - 1;
    bounds.add(cons <= 0 ? b : b - 1);
  }
  let syl = [], cur = "";
  for (let i = 0; i < merged.length; i++) {
    if (bounds.has(i) && cur) { syl.push(cur); cur = ""; }
    cur += merged[i].s;
  }
  if (cur) syl.push(cur);
  return syl;
}

// ---- Math generators ----
function genRows(opts) {
  // opts: { op, max, count, withResult }
  const { op = "+", max = 20, count = 8, withResult = false } = opts || {};
  const out = [];
  for (let i = 0; i < count; i++) {
    let a, b, res;
    if (op === "+") { a = rint(1, max - 1); b = rint(1, max - a); res = a + b; }
    else if (op === "-") { a = rint(2, max); b = rint(1, a - 1); res = a - b; }
    else if (op === "×") { const t = max <= 20 ? 5 : 10; a = rint(1, t); b = rint(1, t); res = a * b; }
    else { res = rint(1, 10); b = rint(1, 10); a = res * b; }
    out.push({ a, b, res, op });
  }
  return out;
}
function genWall(base, op) {
  // base: array of bottom row; returns rows bottom..top.
  // op: "+" Summe · "-" Differenz (|a-b|, immer ≥0) · "×" Produkt der Nachbarn
  const f = op === "×" ? (a, b) => a * b : op === "-" ? (a, b) => Math.abs(a - b) : (a, b) => a + b;
  const rows = [base.slice()];
  let cur = base.slice();
  while (cur.length > 1) {
    const next = [];
    for (let i = 0; i < cur.length - 1; i++) next.push(f(cur[i], cur[i + 1]));
    rows.push(next); cur = next;
  }
  return rows; // rows[0] = bottom (widest)
}
function rint(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

// ---- Clipart (simple, friendly placeholder art) ----
const CLIP_LABELS = {
  igel: "Igel", apfel: "Apfel", sonne: "Sonne", baum: "Baum", fisch: "Fisch",
  blume: "Blume", stern: "Stern", herz: "Herz", haus: "Haus", katze: "Katze",
  hund: "Hund", ball: "Ball", auto: "Auto", wolke: "Wolke", mond: "Mond",
  ente: "Ente", maus: "Maus", banane: "Banane", pilz: "Pilz", schnecke: "Schnecke",
  stift: "Stift", buch: "Buch", schere: "Schere", eis: "Eis", vogel: "Vogel",
  schmetterling: "Schmetterling", marienkaefer: "Marienkäfer", erdbeere: "Erdbeere",
  karotte: "Karotte", brot: "Brot", ananas: "Ananas", eule: "Eule",
};
function clipartSvg(name) {
  const A = {
    igel:  '<ellipse cx="34" cy="42" rx="22" ry="15" fill="#B07B4F"/><path d="M14 40 Q12 22 22 26 M20 36 Q20 18 30 24 M28 33 Q30 16 40 24 M37 34 Q42 18 50 27 M46 38 Q54 26 56 36" stroke="#6B4A2B" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="50" cy="44" r="9" fill="#D9A36B"/><circle cx="53" cy="42" r="1.8" fill="#2b2b2b"/><circle cx="58" cy="45" r="2" fill="#2b2b2b"/>',
    apfel: '<path d="M32 20 Q34 12 40 12" stroke="#6B4A2B" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M40 14 q8-6 14 0" fill="#3E9B4F"/><path d="M32 22 C16 22 14 48 32 54 C50 48 48 22 32 22Z" fill="#E2483B"/><ellipse cx="26" cy="32" rx="4" ry="7" fill="#fff" opacity=".35"/>',
    sonne: '<circle cx="32" cy="32" r="14" fill="#F6C544"/><g stroke="#F6A623" stroke-width="3.4" stroke-linecap="round"><path d="M32 8v6M32 50v6M8 32h6M50 32h6M15 15l4 4M45 45l4 4M49 15l-4 4M19 45l-4 4"/></g>',
    baum:  '<rect x="29" y="38" width="7" height="18" rx="2" fill="#8B5E3C"/><circle cx="32" cy="28" r="16" fill="#4FA85B"/><circle cx="22" cy="32" r="10" fill="#5EB96A"/><circle cx="42" cy="32" r="10" fill="#3E9651"/>',
    fisch: '<path d="M44 32 L58 22 L56 42Z" fill="#F08A3C"/><ellipse cx="28" cy="32" rx="20" ry="13" fill="#39A7D8"/><circle cx="18" cy="29" r="2.4" fill="#fff"/><circle cx="17.5" cy="29" r="1.2" fill="#222"/><path d="M30 26 q4 6 0 12 M38 27 q3 5 0 10" stroke="#1E7CA8" stroke-width="2" fill="none"/>',
    blume: '<rect x="30" y="34" width="4" height="22" fill="#3E9651"/><path d="M32 40q-12 2-14-6" stroke="#3E9651" stroke-width="3" fill="none"/><g fill="#E86A9A"><circle cx="32" cy="22" r="8"/><circle cx="22" cy="28" r="8"/><circle cx="42" cy="28" r="8"/><circle cx="26" cy="38" r="8"/><circle cx="38" cy="38" r="8"/></g><circle cx="32" cy="30" r="7" fill="#F6C544"/>',
    stern: '<path d="M32 8l6.8 14.5L54 24.4 43 35.2 45.7 51 32 43.4 18.3 51 21 35.2 10 24.4l15.2-1.9Z" fill="#F6C544" stroke="#E8A11A" stroke-width="2" stroke-linejoin="round"/>',
    herz:  '<path d="M32 52C12 38 14 18 26 18c5 0 6 4 6 4s1-4 6-4c12 0 14 20-6 34Z" fill="#E2483B"/>',
    haus:  '<path d="M12 30 32 12 52 30Z" fill="#E2483B"/><rect x="18" y="30" width="28" height="22" fill="#F2D9A8"/><rect x="28" y="38" width="9" height="14" fill="#8B5E3C"/><rect x="35" y="33" width="7" height="7" fill="#7EC4E8"/>',
    katze: '<path d="M16 22 18 10 28 18Z" fill="#9A9A9A"/><path d="M48 22 46 10 36 18Z" fill="#9A9A9A"/><circle cx="32" cy="34" r="18" fill="#9A9A9A"/><circle cx="25" cy="32" r="2.4" fill="#222"/><circle cx="39" cy="32" r="2.4" fill="#222"/><path d="M30 40q2 2 4 0" stroke="#222" stroke-width="2" fill="none"/><path d="M22 38h-9M22 41h-9M42 38h9M42 41h9" stroke="#555" stroke-width="1.4"/>',
    wolke: '<g fill="#BFE0F2"><circle cx="24" cy="34" r="11"/><circle cx="38" cy="34" r="13"/><circle cx="46" cy="38" r="9"/><rect x="20" y="34" width="30" height="12" rx="6"/></g>',
    mond:  '<path d="M36 8 a24 24 0 1 0 0 48 a30 30 0 0 1 0 -48 z" fill="#F6D24B" stroke="#E8B71E" stroke-width="1.5"/><circle cx="29" cy="22" r="2" fill="#E2A91A" opacity=".5"/><circle cx="24" cy="34" r="2.6" fill="#E2A91A" opacity=".5"/><circle cx="31" cy="42" r="1.6" fill="#E2A91A" opacity=".5"/><path d="M52 14l1.5 4.3 4.3 1.5-4.3 1.5L52 29l-1.5-4.2-4.3-1.5 4.3-1.5Z" fill="#F6C544"/>',
    ball:  '<circle cx="32" cy="32" r="18" fill="#fff" stroke="#222" stroke-width="2"/><path d="M32 16l6 8-3 9h-6l-3-9Z" fill="#222"/><path d="M50 30l-7 5M14 30l7 5M32 50v-8" stroke="#222" stroke-width="2"/>',
    auto:  '<rect x="10" y="30" width="44" height="14" rx="4" fill="#E2483B"/><path d="M18 30l6-8h14l8 8Z" fill="#EE7A6E"/><circle cx="22" cy="46" r="5" fill="#333"/><circle cx="44" cy="46" r="5" fill="#333"/>',
    ente:  '<ellipse cx="30" cy="38" rx="16" ry="12" fill="#F6C544"/><circle cx="44" cy="28" r="9" fill="#F6C544"/><circle cx="46" cy="26" r="1.8" fill="#222"/><path d="M52 28h8q-2 5-8 3Z" fill="#F08A3C"/>',
    maus:  '<circle cx="24" cy="24" r="8" fill="#B7B7C2"/><circle cx="40" cy="24" r="8" fill="#B7B7C2"/><circle cx="32" cy="36" r="15" fill="#B7B7C2"/><circle cx="28" cy="34" r="2" fill="#222"/><circle cx="36" cy="34" r="2" fill="#222"/><circle cx="32" cy="40" r="2.5" fill="#E86A9A"/>',
    banane:'<path d="M16 26q4 26 30 26q10 0 14-6q-8 4-18-2T22 24Z" fill="#F6C544" stroke="#E0A91A" stroke-width="1.5"/>',
    pilz:  '<rect x="27" y="34" width="10" height="18" rx="3" fill="#F2E9D8"/><path d="M14 34a18 12 0 0 1 36 0Z" fill="#E2483B"/><circle cx="24" cy="28" r="2.4" fill="#fff"/><circle cx="36" cy="26" r="3" fill="#fff"/><circle cx="42" cy="31" r="2" fill="#fff"/>',
    schnecke:'<path d="M44 46H16q-4-22 14-22 12 0 12 11 0 8-8 8-5 0-5-5 0-3 3-3" fill="none" stroke="#B07B4F" stroke-width="5" stroke-linecap="round"/><path d="M44 46q8 0 9-8" stroke="#8B5E3C" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="52" cy="34" r="1.6" fill="#222"/>',
    stift: '<g transform="rotate(32 32 32)"><rect x="26" y="12" width="12" height="32" fill="#F6C544"/><rect x="26" y="12" width="12" height="6" fill="#E2483B"/><path d="M26 44 L32 56 L38 44 Z" fill="#F2D9A8"/><path d="M30 50 L32 56 L34 50 Z" fill="#333"/></g>',
    buch:  '<path d="M32 16 C24 12 14 12 10 14 V48 C14 46 24 46 32 50 Z" fill="#39A7D8"/><path d="M32 16 C40 12 50 12 54 14 V48 C50 46 40 46 32 50 Z" fill="#2E86C1"/><path d="M32 16 V50" stroke="#1B5E8A" stroke-width="2"/><path d="M16 22 h10 M16 28 h10 M38 22 h10 M38 28 h10" stroke="#fff" stroke-width="1.4" opacity=".7"/>',
    schere:'<circle cx="20" cy="44" r="6" fill="none" stroke="#E2483B" stroke-width="3"/><circle cx="32" cy="44" r="6" fill="none" stroke="#E2483B" stroke-width="3"/><path d="M24 40 L52 16" stroke="#9AA5B1" stroke-width="3.5" stroke-linecap="round"/><path d="M28 40 L52 24" stroke="#C2CCD6" stroke-width="3.5" stroke-linecap="round"/><circle cx="27" cy="40" r="2" fill="#666"/>',
    eis:   '<path d="M24 30 L40 30 L32 56 Z" fill="#D9A36B"/><path d="M28 36 l8 6 M30 42 l5 4" stroke="#B0814E" stroke-width="1.2"/><circle cx="27" cy="26" r="8" fill="#F4A0B8"/><circle cx="37" cy="26" r="8" fill="#F6C544"/><circle cx="32" cy="19" r="8" fill="#9ED49A"/>',
    vogel: '<ellipse cx="29" cy="35" rx="14" ry="11" fill="#39A7D8"/><circle cx="40" cy="28" r="8" fill="#39A7D8"/><circle cx="42" cy="26" r="1.7" fill="#222"/><path d="M48 28 L57 26 L48 32 Z" fill="#F08A3C"/><path d="M20 35 q9 7 16 0" fill="#1E7CA8"/><path d="M27 45 l-2 6 M33 46 l1 6" stroke="#F08A3C" stroke-width="2" stroke-linecap="round"/>',
    schmetterling:'<rect x="31" y="18" width="2.4" height="28" rx="1.2" fill="#4A2E1A"/><ellipse cx="22" cy="25" rx="11" ry="12" fill="#E86A9A"/><ellipse cx="42" cy="25" rx="11" ry="12" fill="#E86A9A"/><ellipse cx="24" cy="42" rx="8" ry="9" fill="#F6A0C0"/><ellipse cx="40" cy="42" rx="8" ry="9" fill="#F6A0C0"/><circle cx="22" cy="24" r="3" fill="#fff"/><circle cx="42" cy="24" r="3" fill="#fff"/><path d="M32 18 q-4-6-8-7 M32 18 q4-6 8-7" stroke="#4A2E1A" stroke-width="1.6" fill="none"/>',
    marienkaefer:'<ellipse cx="32" cy="37" rx="16" ry="14" fill="#E2483B"/><path d="M32 23 V51" stroke="#222" stroke-width="2"/><path d="M16 33 a16 14 0 0 1 32 0Z" fill="#222"/><circle cx="24" cy="36" r="2.4" fill="#222"/><circle cx="40" cy="36" r="2.4" fill="#222"/><circle cx="26" cy="45" r="2" fill="#222"/><circle cx="38" cy="45" r="2" fill="#222"/><circle cx="22" cy="22" r="2" fill="#222"/><circle cx="42" cy="22" r="2" fill="#222"/>',
    erdbeere:'<path d="M32 20 C18 20 16 36 32 55 C48 36 46 20 32 20Z" fill="#E2483B"/><path d="M23 21 q9-8 18 0 q-9 5-18 0Z" fill="#3E9B4F"/><g fill="#F6E08A"><circle cx="28" cy="32" r="1.4"/><circle cx="36" cy="32" r="1.4"/><circle cx="32" cy="38" r="1.4"/><circle cx="26" cy="40" r="1.4"/><circle cx="38" cy="40" r="1.4"/><circle cx="32" cy="46" r="1.4"/></g>',
    karotte:'<path d="M29 23 L39 23 L34 56 Z" fill="#E8821A"/><path d="M31 30 h6 M31 38 h5" stroke="#C96C0E" stroke-width="1.4"/><path d="M30 23 q-7-9-2-15 M34 23 q-1-12 3-15 M38 23 q6-9 11-12" stroke="#3E9B4F" stroke-width="3" fill="none" stroke-linecap="round"/>',
    brot:  '<path d="M12 40 q2-18 20-18 t20 18 q0 7-20 7 t-20-7Z" fill="#D9A36B" stroke="#B0814E" stroke-width="1.6"/><path d="M22 28 l-3 9 M30 25 l-3 11 M38 25 l-3 11 M46 28 l-3 9" stroke="#B0814E" stroke-width="1.5" stroke-linecap="round"/>',
    ananas:'<ellipse cx="32" cy="41" rx="13" ry="16" fill="#F6C544"/><path d="M25 33 l14 14 M39 33 l-14 14" stroke="#D9A015" stroke-width="1.3"/><path d="M32 26 q-9-7-5-17 M32 26 q9-7 5-17 M32 24 V8" stroke="#3E9B4F" stroke-width="3.4" fill="none" stroke-linecap="round"/>',
    eule:  '<ellipse cx="32" cy="36" rx="16" ry="18" fill="#8B5E3C"/><path d="M17 22 l7 7 M47 22 l-7 7" stroke="#8B5E3C" stroke-width="4" stroke-linecap="round"/><circle cx="25" cy="29" r="7" fill="#fff"/><circle cx="39" cy="29" r="7" fill="#fff"/><circle cx="25" cy="29" r="3" fill="#222"/><circle cx="39" cy="29" r="3" fill="#222"/><path d="M29 34 L32 39 L35 34 Z" fill="#F08A3C"/><path d="M24 50 l4 4 M40 50 l-4 4" stroke="#6B4A2B" stroke-width="3" stroke-linecap="round"/>',
  };
  const body = A[name] || '<rect x="14" y="16" width="36" height="32" rx="4" fill="#E6EEF0" stroke="#B9C7CC" stroke-width="2"/><path d="m18 44 9-9 6 5 6-6 7 7" stroke="#9DB0B6" stroke-width="2.4" fill="none"/><circle cx="26" cy="27" r="3.2" fill="#C7D3D7"/>';
  return `<svg viewBox="0 0 64 64" width="100%" height="100%">${body}</svg>`;
}

// ---- Rechendreieck: 3 Ecken -> 3 Seiten (op verknüpft je zwei Ecken) ----
// +: Summe · -: |Differenz| · ×: Produkt · ÷: wie × erzeugt (Umkehraufgabe: Seiten gegeben, Ecken gesucht)
function genTriangle(max = 20, op) {
  const o = op || "+";
  if (o === "×" || o === "÷") {
    const t = max <= 20 ? 5 : 9;
    const a = rint(2, t), b = rint(2, t), c = rint(2, t);
    return { corners: [a, b, c], sides: [a * b, b * c, a * c], op: o };
  }
  if (o === "-") {
    const a = rint(2, max), b = rint(1, max), c = rint(1, max);
    return { corners: [a, b, c], sides: [Math.abs(a - b), Math.abs(b - c), Math.abs(a - c)], op: "-" };
  }
  const h = Math.max(2, Math.floor(max / 2));
  const a = rint(1, h), b = rint(1, h), c = rint(1, h);
  return { corners: [a, b, c], sides: [a + b, b + c, a + c], op: "+" }; // sides: AB, BC, CA
}

// ---- Wörtersuchsel (word search) ----
function genWordsearch(words, size = 10) {
  const N = size;
  const grid = Array.from({ length: N }, () => Array(N).fill(null));
  const placements = [];
  const dirs = [[0, 1], [1, 0], [1, 1]]; // →, ↓, ↘
  const clean = words.map(w => w.toUpperCase().replace(/[^A-ZÄÖÜ]/g, "")).filter(w => w.length <= N).slice(0, 18);
  for (const w of clean) {
    let placed = false;
    for (let tries = 0; tries < 120 && !placed; tries++) {
      const [dr, dc] = dirs[rint(0, dirs.length - 1)];
      const r0 = rint(0, N - 1 - dr * (w.length - 1));
      const c0 = rint(0, N - 1 - dc * (w.length - 1));
      let ok = true;
      for (let i = 0; i < w.length; i++) {
        const ch = grid[r0 + dr * i][c0 + dc * i];
        if (ch && ch !== w[i]) { ok = false; break; }
      }
      if (!ok) continue;
      const cells = [];
      for (let i = 0; i < w.length; i++) { grid[r0 + dr * i][c0 + dc * i] = w[i]; cells.push([r0 + dr * i, c0 + dc * i]); }
      placements.push({ word: w, cells }); placed = true;
    }
  }
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) grid[r][c] = A[rint(0, 25)];
  return { grid, placements, size: N };
}

// ---- Zahlenhaus (Zerlegungshaus): Zerlegungen einer Zielzahl ----
function genHouse(target, count, blank) {
  const T = Math.max(2, target | 0);
  const pool = []; for (let a = 0; a <= T; a++) pool.push(a);
  const n = Math.min(count || 6, pool.length);
  const pick = [];
  for (let i = 0; i < n; i++) pick.push(pool.splice(rint(0, pool.length - 1), 1)[0]);
  return pick.map(a => ({ a, b: T - a, hide: blank === "a" ? "a" : blank === "b" ? "b" : (Math.random() < 0.5 ? "a" : "b") }));
}
// ---- Hundertertafel: zufällige Lücken (1..100) ----
function genChartBlanks(count) {
  const pool = []; for (let i = 1; i <= 100; i++) pool.push(i);
  const out = [];
  const n = Math.min(Math.max(0, count | 0), 100);
  for (let i = 0; i < n; i++) out.push(pool.splice(rint(0, pool.length - 1), 1)[0]);
  return out.sort((a, b) => a - b);
}

// ---- Geld- & Größenrechnen ----
// rechnen: a ± b in einer Einheit (Geld in Cent, intern). umrechnen: Größe in
// die nächste Einheit (z. B. 3 m = 300 cm). Ergebnisse sind exakt/ganzzahlig.
function genUnitCalc(kind, op, max) {
  if (kind === "geld") {
    const cents = () => rint(1, Math.max(2, max)) * 100 + rint(0, 9) * 10; // ganze € + Zehner-Cent
    let aC = cents(), bC = cents();
    if (op === "-" && bC > aC) { const t = aC; aC = bC; bC = t; }
    return { mode: "rechnen", a: aC, b: bC, res: op === "-" ? aC - bC : aC + bC, op, unit: "€", money: true };
  }
  const unit = kind === "laenge" ? "cm" : kind === "gewicht" ? "g" : "ml";
  let a = rint(1, max), b = rint(1, max);
  if (op === "-" && b > a) { const t = a; a = b; b = t; }
  return { mode: "rechnen", a, b, res: op === "-" ? a - b : a + b, op, unit, money: false };
}
function genConvert(kind) {
  if (kind === "geld") { const v = rint(1, 20); return { mode: "umrechnen", val: v, fromUnit: "€", toUnit: "ct", res: v * 100, money: false }; }
  let pair;
  if (kind === "laenge") pair = [["cm", "mm", 10, 30], ["m", "cm", 100, 9], ["km", "m", 1000, 9]][rint(0, 2)];
  else if (kind === "gewicht") pair = ["kg", "g", 1000, 9];
  else pair = ["l", "ml", 1000, 9];
  const [from, to, factor, hi] = pair;
  const v = rint(1, hi);
  return { mode: "umrechnen", val: v, fromUnit: from, toUnit: to, res: v * factor, money: false };
}
function genUnitItems(kind, mode, op, max, count) {
  const out = [];
  for (let i = 0; i < (count || 8); i++) out.push(mode === "umrechnen" ? genConvert(kind) : genUnitCalc(kind, op || "+", max || 20));
  return out;
}

// ---- Schriftliche Rechenverfahren (+, −, ×): Zahlen wählen ----
// mdigits = Stellen des Multiplikators bei × (1 = einstellig, 2 = zweistellig);
// innerhalb eines Blocks immer gleich → einheitliches Layout (eine bzw. zwei Linien).
function genWritten(op, digits, mdigits) {
  const d = Math.max(2, Math.min(4, digits || 3));
  const rnum = (k) => rint(Math.pow(10, k - 1), Math.pow(10, k) - 1);
  if (op === "-") { let a = rnum(d), b = rnum(d); if (b > a) { const t = a; a = b; b = t; } return { op: "-", a, b, res: a - b }; }
  if (op === "×") { const a = rnum(d), b = (mdigits === 2) ? rint(11, 99) : rint(2, 9); return { op: "×", a, b, res: a * b }; }
  if (op === "÷") { const b = rint(2, 9); let q = rnum(d); if (q % 10 === 0) q += rint(1, 9); return { op: "÷", a: b * q, b, res: q }; } // einstelliger Divisor, geht auf
  const a = rnum(d), b = rnum(d); return { op: "+", a, b, res: a + b };
}
function genWrittenItems(op, digits, count, mdigits) {
  const out = [];
  for (let i = 0; i < Math.max(1, count || 1); i++) { const g = genWritten(op, digits, mdigits); out.push({ a: g.a, b: g.b, res: g.res }); }
  return out;
}

// ---- Neue Bausteine (aus ProV2): Generatoren ----
// Rechenkette: Folge von Operationen ab einer Startzahl
function genChain(start, count, max, ops) {
  const allow = (ops && ops.length) ? ops : ["+", "-"];
  let cur = start; const steps = [];
  for (let i = 0; i < count; i++) {
    let op = allow[rint(0, allow.length - 1)];
    if (op === "-" && cur < 2) op = "+";
    let n;
    if (op === "+") { n = rint(1, Math.max(1, max - cur)); cur += n; }
    else if (op === "-") { n = rint(1, Math.max(1, cur - 1)); cur -= n; }
    else { n = rint(2, 5); cur *= n; }
    steps.push({ op, n });
  }
  return steps;
}
// Brüche (Zähler m / Nenner n)
function genFractions(count, maxDen) {
  const md = Math.max(2, maxDen || 8); const out = [];
  for (let i = 0; i < (count || 3); i++) { const n = rint(2, md); const m = rint(1, Math.max(1, n - 1)); out.push({ n, m }); }
  return out;
}
// Malkreuz-Faktoren
function genMul(twoByTwo) {
  if (twoByTwo) return { a: rint(12, 49), b: rint(11, 29) };
  return { a: rint(11, 29), b: rint(3, 9) };
}
// Rechennetz: rechts hop/hn, runter vop/vn
function netApply(op, n, x) { return op === "+" ? x + n : op === "-" ? x - n : x * n; }
function genNetStart(cols, hop, hn, vop, vn, max) {
  const lim = max || 100;
  for (let t = 0; t < 250; t++) {
    const s = rint(1, Math.max(2, Math.floor(lim / 2)));
    let ok = true, v = s; const top = [s];
    for (let c = 1; c < (cols || 3); c++) { v = netApply(hop, hn, v); top.push(v); if (v < 0 || v > lim) { ok = false; break; } }
    if (ok) top.forEach(x => { const w = netApply(vop, vn, x); if (w < 0 || w > lim) ok = false; });
    if (ok) return s;
  }
  return 1;
}
// Rechenrad: innere Zahlen, auf die die Mittel-Rechnung angewendet wird
function genRad(op, n, count, max) {
  const o = op || "+"; const cnt = count || 5; const lim = max || 20; const N = Number.isFinite(n) ? n : 3;
  const set = new Set(); const out = []; let guard = 0;
  while (out.length < cnt && guard++ < 600) {
    let x;
    if (o === "×") x = rint(1, Math.max(2, Math.floor(lim / Math.max(2, N))));
    else if (o === "-") x = rint(N, lim);
    else x = rint(0, Math.max(1, lim - N));
    if (set.has(x)) continue; set.add(x); out.push(x);
  }
  return out;
}
// Einmaleins-Tafel: zufällige Lücken-Indizes
function genGridBlanks(count, total) {
  const set = new Set(); const c = Math.min(Math.max(0, count || 0), total);
  while (set.size < c) set.add(rint(0, total - 1));
  return [...set].sort((a, b) => a - b);
}

// ---- Selbstkontrolle: Lösungszahlen aus Aufgaben-Bausteinen einsammeln ----
// Welche Bausteine liefern prüfbare Zahlen-Lösungen?
const SC_ELIGIBLE = ["matharow", "mathwall", "mathtri", "numline", "dotfield", "hundredchart", "numhouse", "writtenmath", "chain", "net", "rechenrad", "malkreuz", "times", "placevalue", "sach"];
function collectSolutions(block) {
  const out = [];
  const push = v => { const n = +v; if (Number.isFinite(n)) out.push(n); };
  if (!block) return out;
  if (block.type === "matharow") {
    if (block.mode === "compare") return out;              // Vergleichszeichen sind keine Zahl
    (block.items || []).forEach(r => push(block.mode === "missing" ? (r.hide === "a" ? r.a : r.b) : r.res));
  } else if (block.type === "mathwall") {
    genWall(block.base || [], block.op).slice(1).forEach(row => row.forEach(push)); // berechnete Steine (ohne Basis)
  } else if (block.type === "mathtri") {
    const t = block.data || {};
    ((t.op || block.op) === "÷" ? (t.corners || []) : (t.sides || [])).forEach(push);
  } else if (block.type === "numline") {
    (block.blanks || []).forEach(push);
    (block.marks || []).forEach(m => { if (m.type === "box") push(m.at); });
  } else if (block.type === "dotfield") {
    push(block.value);                                     // gesuchte Anzahl
  } else if (block.type === "hundredchart") {
    (block.blanks || []).forEach(push);
  } else if (block.type === "numhouse") {
    (block.rows || []).forEach(r => push(r.hide === "a" ? r.a : r.b));
  } else if (block.type === "writtenmath") {
    (block.items && block.items.length ? block.items : (block.a != null ? [{ res: block.res }] : [])).forEach(it => push(it.res));
  } else if (block.type === "chain") {
    let cur = Number.isFinite(block.start) ? block.start : 0;
    (block.steps || []).forEach(s => { cur = s.op === "+" ? cur + s.n : s.op === "-" ? cur - s.n : s.op === "×" ? cur * s.n : Math.round(cur / s.n); push(cur); });
  } else if (block.type === "net") {
    const cols = Math.min(4, Math.max(2, block.cols || 3));
    const top = [Number.isFinite(block.start) ? block.start : 3];
    for (let c = 1; c < cols; c++) top.push(netApply(block.hop || "+", block.hn != null ? block.hn : 2, top[c - 1]));
    top.slice(1).forEach(push);                                   // berechnete obere Zellen
    top.forEach(x => push(netApply(block.vop || "+", block.vn != null ? block.vn : 10, x))); // untere Reihe
  } else if (block.type === "rechenrad") {
    const op = block.op || "+", n = Number.isFinite(block.n) ? block.n : 3;
    (block.inner || []).forEach(x => push(op === "+" ? x + n : op === "-" ? x - n : op === "×" ? x * n : x));
  } else if (block.type === "malkreuz") {
    push((block.a || 0) * (block.b || 0));                        // Endergebnis a · b
  } else if (block.type === "times") {
    const cols = Math.min(12, Math.max(1, block.cols || 10));
    (block.blanks || []).forEach(idx => { const r = Math.floor(idx / cols), c = idx % cols; push((r + 1) * (c + 1)); });
  } else if (block.type === "placevalue") {
    const places = Math.min(6, Math.max(1, block.places || 3));
    (block.numbers || []).forEach(num => String(Math.abs(Math.round(num))).padStart(places, "0").slice(-places).split("").forEach(d => push(d)));
  } else if (block.type === "sach") {
    push(block.az);
  }
  return out;
}
// Deterministisches Mischen (stabil über Re-Renders → kein Flackern)
function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = (seed >>> 0) || 1;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
// Plausible „Täuscher" (falsche Ergebnisse) – deterministisch aus dem Seed
function makeDecoys(nums, count, seed) {
  if (!count || !nums.length) return [];
  const real = new Set(nums), out = [];
  let s = (seed >>> 0) || 7; const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const offs = [1, -1, 2, -2, 3, -3, 10, -10];
  let guard = 0;
  while (out.length < count && guard++ < 300) {
    const base = nums[Math.floor(rnd() * nums.length)];
    const cand = base + offs[Math.floor(rnd() * offs.length)];
    if (cand >= 0 && !real.has(cand) && out.indexOf(cand) < 0) out.push(cand);
  }
  return out;
}

// ---- Automatische Arbeitsaufträge (klar für Grundschulkinder) ----
function autoPrompt(b) {
  if (!b) return "";
  if (b.type === "matharow") {
    const m = b.mode || "normal";
    return m === "compare" ? "Vergleiche die Zahlen. Setze <, > oder = in das Kästchen."
      : m === "missing" ? "Welche Zahl fehlt? Trage sie in das Kästchen ein."
      : "Rechne die Aufgaben aus.";
  }
  if (b.type === "mathwall") {
    const o = b.op || "+";
    return o === "×" ? "Multipliziere immer die beiden Steine nebeneinander und schreibe das Ergebnis darüber."
      : o === "-" ? "Schreibe in jeden Stein den Unterschied (Differenz) der beiden Steine darunter."
      : "Addiere immer die beiden Steine nebeneinander und schreibe das Ergebnis darüber.";
  }
  if (b.type === "mathtri") {
    const o = b.op || "+";
    if (o === "÷") return "Die Seiten sind gegeben. Teile, um die fehlenden Ecken zu finden.";
    if (o === "×") return "Multipliziere die beiden Ecken einer Seite. Trage das Ergebnis an der Seite ein.";
    if (o === "-") return "Ziehe die kleinere von der größeren Ecke ab. Trage das Ergebnis an der Seite ein.";
    return "Addiere die beiden Ecken einer Seite. Trage das Ergebnis an der Seite ein.";
  }
  if (b.type === "numline") {
    if ((b.marks || []).some(m => m.type === "box")) return "Welche Zahl gehört in das ?-Feld? Trage sie ein.";
    if ((b.blanks || []).length) return "Trage die fehlenden Zahlen am Zahlenstrahl ein.";
    if ((b.marks || []).length) return "Schau dir die Markierungen am Zahlenstrahl genau an.";
    return "";
  }
  if (b.type === "dotfield") return "Wie viele Punkte sind es? Schreibe die Zahl in das Kästchen.";
  if (b.type === "hundredchart") return "Trage die fehlenden Zahlen in die Hundertertafel ein.";
  if (b.type === "numhouse") return "Zerlege die Zahl. Trage die fehlenden Zahlen in die Kästchen ein.";
  if (b.type === "unitcalc") return b.mode === "umrechnen" ? "Rechne in die andere Einheit um." : "Rechne mit den Größen. Vergiss die Einheit nicht.";
  if (b.type === "writtenmath") return "Rechne schriftlich. Vergiss die Überträge nicht.";
  if (b.type === "imagelabel") return "Beschrifte das Bild. Schreibe zu jeder Nummer das passende Wort.";
  if (b.type === "chain") return "Rechne der Reihe nach. Trage jedes Ergebnis in das nächste Kästchen ein.";
  if (b.type === "placevalue") return "Trage die Ziffern in die Stellenwerttafel ein (H = Hunderter, Z = Zehner, E = Einer).";
  if (b.type === "fraction") return b.ask === "shade" ? "Färbe den angegebenen Bruchteil farbig an." : "Welcher Bruch ist gefärbt? Schreibe ihn als Bruch auf.";
  if (b.type === "times") return "Fülle die fehlenden Felder in der Einmaleins-Tafel aus.";
  if (b.type === "malkreuz") return "Rechne mit dem Malkreuz: Multipliziere die Teile und trage die Teilprodukte und das Ergebnis ein.";
  if (b.type === "rechenrad") return "In der Mitte steht die Rechnung. Wende sie auf jede Zahl im inneren Ring an und schreibe das Ergebnis nach außen.";
  if (b.type === "sach") return "Lies die Sachaufgabe genau. Schreibe Rechnung und Antwort auf.";
  if (b.type === "net") return "Rechne mit den Pfeilen: nach rechts " + (b.hop || "+") + (b.hn != null ? b.hn : 2) + ", nach unten " + (b.vop || "+") + (b.vn != null ? b.vn : 10) + ".";
  if (b.type === "wordsearch") return "Finde alle Wörter und male sie farbig an. Sie stehen waagerecht, senkrecht und schräg.";
  if (b.type === "clock") {
    const n = (b.clocks || []).length || 1;
    return n > 1 ? "Wie spät ist es? Schreibe unter jede Uhr die Uhrzeit." : "Wie spät ist es? Schreibe die Uhrzeit auf.";
  }
  return "";
}
function promptText(b) { return b && b.prompt != null ? b.prompt : autoPrompt(b); }

export const DKU = { syllabify, genRows, genWall, genTriangle, genWordsearch, clipartSvg, CLIP_LABELS, rint, autoPrompt, promptText, SC_ELIGIBLE, collectSolutions, seededShuffle, makeDecoys, genHouse, genChartBlanks, genUnitItems, genWritten, genWrittenItems, genChain, genFractions, genMul, netApply, genNetStart, genRad, genGridBlanks };
