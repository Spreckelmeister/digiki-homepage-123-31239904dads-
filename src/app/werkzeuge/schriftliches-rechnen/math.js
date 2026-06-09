/* ============================================================
   Schriftliches Rechnen — Rechen-Engine
   buildSolution(op, a, b) liefert ein animierbares Schritt-Raster:
   { op, a, b, result, cols, rows, cells[], rules[], steps[] }
   - cells:  { r, c, ch, kind, sup?, step }   (kind steuert das Styling)
   - rules:  { r, c0, c1, step }               (waagerechte Linie über Zeile r)
   - steps:  { text, focus:{r0,r1,c0,c1}|null } (Erklärung + Hervorhebung)
   Spalte 0 ist für das Operatorzeichen reserviert, Ziffern rechtsbündig.
   ============================================================ */

const PLACE = ["Einer", "Zehner", "Hunderter", "Tausender", "Zehntausender", "Hunderttausender", "Millionen"];
const digitsOf = (n) => String(n).split("").map((d) => +d);

// ---------------- Addition ----------------
function buildAdd(a, b) {
  const A = String(a), B = String(b);
  const W = Math.max(A.length, B.length);
  const da = A.padStart(W, "0").split("").map(Number);
  const db = B.padStart(W, "0").split("").map(Number);
  const res = []; const carry = new Array(W + 1).fill(0);
  for (let p = 0; p < W; p++) {
    const i = W - 1 - p;
    const s = da[i] + db[i] + carry[p];
    res[p] = s % 10; carry[p + 1] = Math.floor(s / 10);
  }
  const finalCarry = carry[W];
  const digitCols = W + (finalCarry ? 1 : 0);
  const cols = 1 + digitCols;          // col 0 = Operator
  const colOf = (p) => cols - 1 - p;   // p=0 → Einer ganz rechts
  const cells = [], rules = [], steps = [];
  for (let p = 0; p < W; p++) { const i = W - 1 - p; cells.push({ r: 1, c: colOf(p), ch: String(da[i]), kind: "op", step: 0 }); }
  for (let p = 0; p < W; p++) { const i = W - 1 - p; cells.push({ r: 2, c: colOf(p), ch: String(db[i]), kind: "op", step: 0 }); }
  cells.push({ r: 2, c: 0, ch: "+", kind: "oper", step: 0 });
  rules.push({ r: 3, c0: 0, c1: cols - 1, step: 0 });
  let step = 1;
  for (let p = 0; p < W; p++) {
    const i = W - 1 - p;
    const s = da[i] + db[i] + carry[p];
    cells.push({ r: 3, c: colOf(p), ch: String(res[p]), kind: "res", step });
    if (carry[p + 1] > 0) cells.push({ r: 0, c: colOf(p + 1), ch: String(carry[p + 1]), kind: "carry", sup: true, step });
    const inTxt = carry[p] > 0 ? ` + ${carry[p]} (Übertrag)` : "";
    const outTxt = carry[p + 1] > 0 ? ` Schreibe ${res[p]}, merke ${carry[p + 1]}.` : ` Schreibe ${res[p]}.`;
    steps.push({ text: `${PLACE[p]}: ${da[i]} + ${db[i]}${inTxt} = ${s}.${outTxt}`, focus: { r0: 0, r1: 3, c0: colOf(p), c1: colOf(p) } });
    step++;
  }
  if (finalCarry) {
    cells.push({ r: 3, c: colOf(W), ch: String(finalCarry), kind: "res", step });
    steps.push({ text: `Der letzte Übertrag ${finalCarry} kommt ganz nach vorne.`, focus: { r0: 0, r1: 3, c0: colOf(W), c1: colOf(W) } });
    step++;
  }
  return { op: "+", a: A, b: B, result: String(Number(a) + Number(b)), cols, rows: 4, cells, rules, steps };
}

// ---------------- Subtraktion (Ergänzungsverfahren / Auffülltechnik) ----------------
function buildSub(a, b) {
  const A = String(a), B = String(b);
  const W = Math.max(A.length, B.length);
  const da = A.padStart(W, "0").split("").map(Number);
  const db = B.padStart(W, "0").split("").map(Number);
  const res = []; let borrow = 0; const borrowAt = new Array(W + 1).fill(0);
  for (let p = 0; p < W; p++) {
    const i = W - 1 - p;
    const sub = db[i] + borrow;
    const m = da[i];
    let diff, bout;
    if (m >= sub) { diff = m - sub; bout = 0; }
    else { diff = m + 10 - sub; bout = 1; }
    res[p] = diff; borrow = bout; borrowAt[p + 1] = bout;
  }
  const cols = 1 + W;
  const colOf = (p) => cols - 1 - p;
  const cells = [], rules = [], steps = [];
  for (let p = 0; p < W; p++) { const i = W - 1 - p; cells.push({ r: 1, c: colOf(p), ch: String(da[i]), kind: "op", step: 0 }); }
  for (let p = 0; p < W; p++) { const i = W - 1 - p; cells.push({ r: 2, c: colOf(p), ch: String(db[i]), kind: "op", step: 0 }); }
  cells.push({ r: 2, c: 0, ch: "−", kind: "oper", step: 0 });
  rules.push({ r: 3, c0: 0, c1: cols - 1, step: 0 });
  let step = 1;
  for (let p = 0; p < W; p++) {
    const i = W - 1 - p;
    const carryIn = borrowAt[p];
    const sub = db[i] + carryIn;
    const m = da[i];
    const target = m >= sub ? m : m + 10;
    cells.push({ r: 3, c: colOf(p), ch: String(res[p]), kind: "res", step });
    if (borrowAt[p + 1] > 0) cells.push({ r: 0, c: colOf(p + 1), ch: "1", kind: "borrow", sup: true, step });
    const inTxt = carryIn > 0 ? ` (mit gemerkter 1: ${db[i]} + 1 = ${sub})` : "";
    const outTxt = borrowAt[p + 1] > 0 ? ` Schreibe ${res[p]}, merke 1.` : ` Schreibe ${res[p]}.`;
    steps.push({ text: `${PLACE[p]}: ${sub}${inTxt} plus ${res[p]} ist ${target}.${outTxt}`, focus: { r0: 0, r1: 3, c0: colOf(p), c1: colOf(p) } });
    step++;
  }
  return { op: "−", a: A, b: B, result: String(Number(a) - Number(b)), cols, rows: 4, cells, rules, steps };
}

// ---------------- Multiplikation ----------------
function buildMul(a, b) {
  const A = String(a), B = String(b);
  const da = A.split("").map(Number);
  const dbDigits = B.split("").map(Number);       // links→rechts
  const k = dbDigits.length;
  const product = Number(a) * Number(b);
  const PW = String(product).length;
  // Teilprodukte (pro b-Ziffer, von rechts), inkl. Linksverschiebung
  const partials = [];
  for (let j = 0; j < k; j++) {
    const bd = dbDigits[k - 1 - j];               // j=0 → Einerziffer von b
    const val = Number(a) * bd;
    partials.push({ bd, val, shift: j });
  }
  const multi = k > 1;
  // Spaltenbreite: so breit wie nötig (Produkt oder breitestes verschobenes Teilprodukt)
  let maxDigitCols = PW;
  for (const pp of partials) maxDigitCols = Math.max(maxDigitCols, String(pp.val).length + pp.shift);
  const cols = 1 + maxDigitCols;
  const colOf = (p) => cols - 1 - p;              // p=0 → ganz rechts
  const cells = [], rules = [], steps = [];
  // Faktoren
  for (let p = 0; p < A.length; p++) cells.push({ r: 1, c: colOf(A.length - 1 - p), ch: String(da[A.length - 1 - p]), kind: "op", step: 0 });
  // korrektur: einfacher rechtsbündig setzen
  cells.length = 0;
  da.forEach((d, idx) => cells.push({ r: 1, c: cols - A.length + idx, ch: String(d), kind: "op", step: 0 }));
  dbDigits.forEach((d, idx) => cells.push({ r: 2, c: cols - B.length + idx, ch: String(d), kind: "op", step: 0 }));
  cells.push({ r: 2, c: 0, ch: "·", kind: "oper", step: 0 });
  rules.push({ r: 3, c0: 0, c1: cols - 1, step: 0 });
  let step = 1;
  let row = 3;
  const partialRows = [];
  partials.forEach((pp, j) => {
    const pv = String(pp.val).split("").map(Number);
    const startP = pp.shift;                       // niedrigste Stelle dieses Teilprodukts
    // reveal Ziffern rechts→links
    pv.slice().reverse().forEach((d, q) => {
      cells.push({ r: row, c: colOf(startP + q), ch: String(d), kind: multi ? "partial" : "res", step });
    });
    const bd = pp.bd;
    const shiftTxt = pp.shift > 0 ? ` (${pp.shift} Stelle${pp.shift > 1 ? "n" : ""} nach links)` : "";
    steps.push({ text: `${A} · ${bd} = ${pp.val}${shiftTxt}.`, focus: { r0: row, r1: row, c0: colOf(startP + pv.length - 1), c1: colOf(startP) } });
    partialRows.push(row);
    row++; step++;
  });
  // Summe der Teilprodukte (nur bei mehrstelligem b)
  if (multi) {
    cells.push({ r: row - partials.length, c: 0, ch: "", kind: "noop", step: 0 }); // platzhalter
    rules.push({ r: row, c0: 0, c1: cols - 1, step });
    // Spaltenaddition der Teilprodukte
    const colVals = new Array(maxDigitCols).fill(0);
    partials.forEach((pp) => { const pv = String(pp.val).split("").map(Number); pv.slice().reverse().forEach((d, q) => { colVals[pp.shift + q] += d; }); });
    let carry = 0; const sumDigits = [];
    for (let p = 0; p < maxDigitCols; p++) { const s = colVals[p] + carry; sumDigits[p] = s % 10; carry = Math.floor(s / 10); }
    let cc = carry, extra = 0; const totalCols2 = maxDigitCols;
    const resRow = row;
    let s2 = step;
    for (let p = 0; p < totalCols2; p++) {
      cells.push({ r: resRow, c: colOf(p), ch: String(sumDigits[p]), kind: "res", step: s2 });
    }
    steps.push({ text: `Zum Schluss die Teilprodukte addieren: ${partials.map((p) => p.val * Math.pow(10, p.shift)).join(" + ")} = ${product}.`, focus: { r0: resRow, r1: resRow, c0: 1, c1: cols - 1 } });
    step = s2 + 1; row = resRow + 1;
  }
  return { op: "·", a: A, b: B, result: String(product), cols, rows: row, cells, rules, steps };
}

// ---------------- Division (schriftlich, lange Division) ----------------
function buildDiv(a, b) {
  const A = String(a); const B = Number(b);
  const da = A.split("").map(Number);
  const quotient = Math.floor(Number(a) / B);
  const remainder = Number(a) % B;
  // Spalten: Dividenden-Ziffern 0..La-1, dann " : b = q"
  const La = da.length;
  const cells = [], rules = [], steps = [];
  // Top-Zeile r=0: Dividend, ":", Divisor, "=", Quotient (Quotient erscheint schrittweise)
  for (let i = 0; i < La; i++) cells.push({ r: 0, c: i, ch: String(da[i]), kind: "op", step: 0 });
  let cx = La;
  cells.push({ r: 0, c: cx++, ch: ":", kind: "sym", step: 0 });
  const bStr = String(B);
  for (let i = 0; i < bStr.length; i++) cells.push({ r: 0, c: cx++, ch: bStr[i], kind: "op", step: 0 });
  cells.push({ r: 0, c: cx++, ch: "=", kind: "sym", step: 0 });
  const qCol0 = cx;                       // erste Quotientenspalte
  // Lange Division
  let rem = 0; let r = 1; let step = 1; let qIndex = 0;
  const qChars = [];
  for (let i = 0; i < La; i++) {
    const cur = rem * 10 + da[i];
    const qd = Math.floor(cur / B);
    // Quotientenziffer nur schreiben, wenn schon etwas „heruntergeholt“ wurde
    const writeQ = !(qd === 0 && qChars.length === 0 && i < La - 1);
    if (writeQ) {
      qChars.push(qd);
      cells.push({ r: 0, c: qCol0 + qChars.length - 1, ch: String(qd), kind: "quot", step });
    }
    if (qd === 0 && qChars.length === 0) {
      steps.push({ text: `${cur} : ${B} = 0 — wir holen die nächste Ziffer dazu.`, focus: { r0: 0, r1: 0, c0: i, c1: i } });
      rem = cur; step++; continue;
    }
    const prod = qd * B;
    // Schreibe das Produkt unter den aktuellen Abschnitt (rechtsbündig bei Spalte i)
    const prodStr = String(prod);
    for (let t = 0; t < prodStr.length; t++) {
      const col = i - (prodStr.length - 1 - t);
      cells.push({ r, c: col, ch: prodStr[t], kind: "aux", step });
    }
    rules.push({ r: r + 1, c0: Math.max(0, i - prodStr.length + 1), c1: i, step });
    const newRem = cur - prod;
    // Rest unter den Strich, an Spalte i (mit ggf. heruntergeholter nächster Ziffer)
    const remStr = String(newRem);
    let remRow = r + 1;
    for (let t = 0; t < remStr.length; t++) {
      const col = i - (remStr.length - 1 - t);
      cells.push({ r: remRow, c: col, ch: remStr[t], kind: "aux", step });
    }
    // nächste Ziffer herunterholen (anzeigen neben dem Rest)
    let downTxt = "";
    if (i < La - 1) {
      cells.push({ r: remRow, c: i + 1, ch: String(da[i + 1]), kind: "auxdown", step });
      downTxt = ` Hole die ${da[i + 1]} herunter.`;
    }
    steps.push({ text: `${cur} : ${B} = ${qd} (Rest ${newRem}). ${qd} · ${B} = ${prod}, ${cur} − ${prod} = ${newRem}.${downTxt}`, focus: { r0: r, r1: remRow, c0: Math.max(0, i - prodStr.length + 1), c1: i + (i < La - 1 ? 1 : 0) } });
    rem = newRem;
    r = remRow + 1; step++;
  }
  if (remainder > 0) {
    steps.push({ text: `Es bleibt ein Rest von ${remainder}.`, focus: null });
  }
  const cols = qCol0 + Math.max(1, qChars.length);
  return { op: ":", a: A, b: bStr, result: remainder ? `${quotient} R ${remainder}` : String(quotient), cols, rows: r + 1, cells, rules, steps, divider: true };
}

export function buildSolution(op, a, b) {
  const x = Math.trunc(Number(a)), y = Math.trunc(Number(b));
  if (op === "+") return buildAdd(x, y);
  if (op === "−" || op === "-") return buildSub(Math.max(x, y), Math.min(x, y));
  if (op === "·" || op === "*" || op === "x") return buildMul(x, y);
  if (op === ":" || op === "/" || op === "÷") return buildDiv(x, y);
  return buildAdd(x, y);
}
