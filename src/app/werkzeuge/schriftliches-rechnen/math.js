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

// ---------------- Subtraktion (Abziehverfahren mit Erweitern) ----------------
// „3 − 8 geht nicht → 13 − 8 = 5, Übertrag 1“. Der Übertrag wird klein UNTER
// die nächste untere Zahl (Subtrahend) geschrieben.
function buildSub(a, b) {
  const A = String(a), B = String(b);
  const W = Math.max(A.length, B.length);
  const da = A.padStart(W, "0").split("").map(Number);
  const db = B.padStart(W, "0").split("").map(Number);
  const cols = 1 + W;
  const colOf = (p) => cols - 1 - p;
  const cells = [], rules = [], steps = [];
  // Zeilen: 0 = Minuend (oben), 1 = Subtrahend (unten) + „−“, Strich r2, 2 = Ergebnis
  for (let p = 0; p < W; p++) { const i = W - 1 - p; cells.push({ r: 0, c: colOf(p), ch: String(da[i]), kind: "op", step: 0 }); }
  for (let p = 0; p < W; p++) { const i = W - 1 - p; cells.push({ r: 1, c: colOf(p), ch: String(db[i]), kind: "op", step: 0 }); }
  cells.push({ r: 1, c: 0, ch: "−", kind: "oper", step: 0 });
  rules.push({ r: 2, c0: 0, c1: cols - 1, step: 0 });
  let step = 1, borrow = 0;
  for (let p = 0; p < W; p++) {
    const i = W - 1 - p;
    const carryIn = borrow;
    const effSub = db[i] + carryIn;           // untere Zahl + evtl. Übertrag
    const m = da[i];
    const col = colOf(p);
    const subTxt = carryIn > 0 ? `${db[i]} + 1 = ${effSub}` : `${effSub}`;
    const fcol = { r0: 0, r1: 2, c0: col, c1: col };
    if (m >= effSub) {
      // passt – ein Schritt
      const diff = m - effSub;
      cells.push({ r: 2, c: col, ch: String(diff), kind: "res", step });
      const inTxt = carryIn > 0 ? ` (untere Zahl: ${subTxt})` : "";
      steps.push({ text: `${PLACE[p]}: ${m} − ${effSub}${inTxt} = ${diff}. Schreibe ${diff}.`, focus: fcol });
      step++;
      borrow = 0;
    } else {
      // geht nicht → 3 Schritte
      const diff = m + 10 - effSub;
      const inTxt = carryIn > 0 ? ` (untere Zahl ist ${subTxt})` : "";
      steps.push({ text: `${PLACE[p]}: ${m} − ${effSub}${inTxt} geht nicht – ${m} ist kleiner als ${effSub}.`, focus: fcol });
      step++;
      cells.push({ r: 2, c: col, ch: String(diff), kind: "res", step });
      steps.push({ text: `Wir holen uns 10 dazu: ${m + 10} − ${effSub} = ${diff}. Schreibe ${diff}.`, focus: fcol });
      step++;
      // Übertrag 1 klein unter die nächste untere Zahl
      if (p + 1 < W) cells.push({ r: 1, c: colOf(p + 1), ch: "1", kind: "subborrow", step });
      steps.push({ text: `Dafür merken wir uns 1 Übertrag und schreiben ihn klein unter die nächste untere Zahl.`, focus: { r0: 1, r1: 1, c0: colOf(p + 1), c1: colOf(p + 1) } });
      step++;
      borrow = 1;
    }
  }
  return { op: "−", a: A, b: B, result: String(Number(a) - Number(b)), cols, rows: 3, cells, rules, steps };
}

// ---------------- Multiplikation (schriftlich, mit Stellenwert-Teilprodukten) ----------------
// Layout wie im Heft: beide Faktoren nebeneinander, Strich, dann Teilprodukte
// „mit den Nullen“ (z. B. 458·9 → 3600, 450, 72), Strich, dann spaltenweise Summe.
function buildMul(a, b) {
  const A = String(a), B = String(b);
  // Multiplikand = mehr Stellen (wird nach Stellenwert zerlegt); Multiplikator = die andere Zahl
  const mc = A.length >= B.length ? A : B;
  const ml = A.length >= B.length ? Number(b) : Number(a);
  const mlStr = String(ml);
  const D = mc.split("").map(Number);
  const Llen = mc.length;
  const product = Number(a) * Number(b);
  // Teilprodukte: pro Stelle des Multiplikanden (höchste zuerst), Stelle·Multiplikator
  const partials = [];
  for (let idx = 0; idx < Llen; idx++) {
    const d = D[idx];
    const p = Llen - 1 - idx;            // Stellen-Exponent (0 = Einer)
    if (d === 0) continue;               // 0-Teilprodukt überspringen
    partials.push({ d, p, factor: d * Math.pow(10, p), val: d * Math.pow(10, p) * ml });
  }
  const single = partials.length <= 1;
  let R = String(product).length;
  for (const pp of partials) R = Math.max(R, String(pp.val).length);
  const leftW = mlStr.length + 1;        // Multiplikator-Ziffern + „·“
  const cols = leftW + R;
  const Rcol = (place) => cols - 1 - place;   // place 0 = Einer ganz rechts
  const cells = [], rules = [], steps = [];
  const PLACE2 = ["Einer", "Zehner", "Hunderter", "Tausender", "Zehntausender", "Hunderttausender", "Millionen"];
  // Faktorzeile (r=1): Multiplikator links, „·“, Multiplikand rechtsbündig im R-Block
  for (let i = 0; i < mlStr.length; i++) cells.push({ r: 1, c: i, ch: mlStr[i], kind: "op", step: 0 });
  cells.push({ r: 1, c: mlStr.length, ch: "·", kind: "oper", step: 0 });
  for (let i = 0; i < Llen; i++) { const place = Llen - 1 - i; cells.push({ r: 1, c: Rcol(place), ch: String(D[i]), kind: "op", step: 0 }); }
  rules.push({ r: 2, c0: leftW, c1: cols - 1, step: 0 });
  let step = 1, row = 2;
  partials.forEach((pp) => {
    const vs = String(pp.val);
    for (let t = 0; t < vs.length; t++) { const place = vs.length - 1 - t; cells.push({ r: row, c: Rcol(place), ch: vs[t], kind: single ? "res" : "partial", step }); }
    const placeTxt = pp.p > 0 ? ` (${pp.d} ${PLACE2[pp.p]})` : "";
    const zerosTxt = pp.p > 0 ? ` Die ${pp.p === 1 ? "Null" : pp.p + " Nullen"} mitschreiben.` : "";
    steps.push({ text: `${pp.factor} · ${ml} = ${pp.val}${placeTxt}.${zerosTxt}`, focus: { r0: row, r1: row, c0: Rcol(vs.length - 1), c1: Rcol(0) } });
    row++; step++;
  });
  if (!single) {
    const sumRule = step;
    rules.push({ r: row, c0: leftW, c1: cols - 1, step: sumRule });
    const colVals = new Array(R).fill(0);
    partials.forEach((pp) => { const vs = String(pp.val).split("").map(Number); vs.slice().reverse().forEach((d, q) => { colVals[q] += d; }); });
    const resRow = row;
    cells.push({ r: resRow, c: 0, ch: "+", kind: "oper", step: sumRule });
    let carry = 0;
    for (let p = 0; p < R; p++) {
      const s = colVals[p] + carry;
      const digit = s % 10, cout = Math.floor(s / 10);
      cells.push({ r: resRow, c: Rcol(p), ch: String(digit), kind: "res", step });
      if (cout > 0) cells.push({ r: 0, c: Rcol(p + 1), ch: String(cout), kind: "carry", sup: true, step });
      const ds = partials.map((pp) => { const vs = String(pp.val); const q = vs.length - 1 - p; return q >= 0 ? +vs[q] : 0; });
      const addStr = ds.join(" + ") + (carry > 0 ? ` + ${carry}` : "");
      const outTxt = cout > 0 ? ` Schreibe ${digit}, merke ${cout}.` : ` Schreibe ${digit}.`;
      steps.push({ text: `${PLACE2[p]} addieren: ${addStr} = ${s}.${outTxt}`, focus: { r0: 0, r1: resRow, c0: Rcol(p), c1: Rcol(p) } });
      carry = cout; step++;
    }
    row = resRow + 1;
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
  // Lange Division – jede Ziffer in vier Einzelschritten:
  // bestimmen → multiplizieren → subtrahieren → herunterholen
  let rem = 0; let r = 1; let step = 1;
  const qChars = [];
  for (let i = 0; i < La; i++) {
    const cur = rem * 10 + da[i];
    const qd = Math.floor(cur / B);
    // Führende Null: Abschnitt noch zu klein → nächste Ziffer dazunehmen
    if (qd === 0 && qChars.length === 0 && i < La - 1) {
      steps.push({ text: `${cur} : ${B} geht noch nicht – ${cur} ist kleiner als ${B}. Wir nehmen die nächste Ziffer dazu.`, focus: { r0: 0, r1: 0, c0: 0, c1: i + 1 } });
      rem = cur; step++; continue;
    }
    const prod = qd * B;
    const prodStr = String(prod);
    const prodCol0 = i - (prodStr.length - 1);

    // Schritt A: Wie oft passt der Divisor? → Quotientenziffer
    qChars.push(qd);
    const qc = qCol0 + qChars.length - 1;
    cells.push({ r: 0, c: qc, ch: String(qd), kind: "quot", step });
    steps.push({ text: `Wie oft passt ${B} in ${cur}? ${qd}-mal. Schreibe die ${qd} ins Ergebnis.`, focus: { r0: 0, r1: 0, c0: qc, c1: qc } });
    step++;

    // Schritt B: Multiplizieren – Produkt darunter schreiben
    for (let t = 0; t < prodStr.length; t++) cells.push({ r, c: i - (prodStr.length - 1 - t), ch: prodStr[t], kind: "aux", step });
    steps.push({ text: `${qd} · ${B} = ${prod}. Schreibe ${prod} unter die ${cur}.`, focus: { r0: r, r1: r, c0: prodCol0, c1: i } });
    step++;

    // Schritt C: Subtrahieren – Strich ziehen und Rest ausrechnen
    const newRem = cur - prod;
    const remStr = String(newRem);
    const remRow = r + 1;
    rules.push({ r: remRow, c0: prodCol0, c1: i, step });
    for (let t = 0; t < remStr.length; t++) cells.push({ r: remRow, c: i - (remStr.length - 1 - t), ch: remStr[t], kind: "aux", step });
    steps.push({ text: `Ziehe ab: ${cur} − ${prod} = ${newRem}.`, focus: { r0: r, r1: remRow, c0: prodCol0, c1: i } });
    step++;

    // Schritt D: nächste Ziffer herunterholen
    if (i < La - 1) {
      cells.push({ r: remRow, c: i + 1, ch: String(da[i + 1]), kind: "auxdown", step });
      const next = newRem * 10 + da[i + 1];
      steps.push({ text: `Hole die ${da[i + 1]} herunter. Weiter geht es mit ${next} : ${B}.`, focus: { r0: remRow, r1: remRow, c0: i - remStr.length + 1, c1: i + 1 } });
      step++;
    }
    rem = newRem;
    r = remRow + 1;
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
