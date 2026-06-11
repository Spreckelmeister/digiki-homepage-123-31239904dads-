"use client";
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { DKI } from "./data";
import { DKU } from "./utils";
import { Block } from "./blocks";
import { Icon } from "./icons";
import { TopBar } from "./topbar";
import { LeftRail } from "./leftrail";
import { RightRail } from "./rightrail";
import { KIModal } from "./ki";
import { EDITOR_CSS } from "./styles";

// useLayoutEffect ohne SSR-Warnung (der Editor läuft nur clientseitig)
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ============================================================
   Main app — state, history, canvas, assembly
   ============================================================ */

// flatten palette to look up meta by type
const META = {};
DKI.PALETTE.forEach(g => g.items.forEach(it => { META[it.type] = it; }));
META.name = META.name || { label: "Namensfeld", icon: "name" };

function genMath(op, max, count, mode) {
  const { rint } = DKU;
  return Array.from({ length: count }, () => {
    if (mode === "compare") { const a = rint(1, max), b = rint(1, max); return { a, b, cmp: a < b ? "<" : a > b ? ">" : "=" }; }
    let it;
    if (op === "+") { const a = rint(1, max - 1), b = rint(1, max - a); it = { a, b, res: a + b, op }; }
    else if (op === "-") { const a = rint(2, max), b = rint(1, a - 1); it = { a, b, res: a - b, op }; }
    else if (op === "×") { const t = max <= 20 ? 5 : max <= 100 ? 10 : 20; const a = rint(1, t), b = rint(1, t); it = { a, b, res: a * b, op }; }
    else { const b = rint(2, 9), res = rint(2, 9); it = { a: b * res, b, res, op }; }
    if (mode === "missing") it.hide = Math.random() < 0.5 ? "a" : "b";
    return it;
  });
}

function frameStyle(kind) {
  switch (kind) {
    case "solid":  return { border: "2px solid var(--ink-soft)" };
    case "dashed": return { border: "2px dashed var(--muted)" };
    case "round":  return { border: "3px solid var(--teal)", borderRadius: 20 };
    case "kids":   return { border: "5px dashed var(--orange)", borderRadius: 16 };
    default:       return {};
  }
}

function makeBlock(type, level) {
  const { nid } = DKI;
  const easy = level === "leicht", hard = level === "schwer";
  const base = { id: nid(), type };
  switch (type) {
    case "title":    return { ...base, text: "Neue Überschrift", align: "center", size: 30 };
    case "syllable": return { ...base, text: "Lies den Text in Silben. Im Wald lebt ein kleiner Igel.", scheme: "blaurot", font: "grundschrift", size: 26 };
    case "cloze":    return { ...base, text: "Der __Hund__ läuft über die __Wiese__.", font: "grundschrift", size: 20, bank: true };
    case "reading":  return { ...base, text: "Schreibe hier deinen Lesetext.\nJeder Satz kommt in eine neue Zeile.", font: "druck", size: 18, numbers: false, align: "left" };
    case "lines":    return { ...base, count: 3, height: 28, variant: "haus", startDot: false };
    case "name":     return { ...base, show: { name: true, date: true, klasse: false } };
    case "image":    return { ...base, items: [{ art: "apfel", word: "Apfel" }], cols: 1, size: 110, align: "center", mode: "label", num: 3, gap: 26, frame: true, font: "grundschrift" };
    case "matharow": { const max = 20, count = easy ? 6 : hard ? 12 : 8; return { ...base, op: "+", mode: "normal", max, count, cols: 2, size: 24, showResult: false, items: genMath("+", max, count, "normal") }; }
    case "mathwall": return { ...base, base: hard ? [4, 6, 3, 5] : [2, 5, 3], op: "+", hideTop: true, size: 20 };
    case "numline":  return { ...base, min: 0, max: 20, step: 1, labelEvery: 1, blanks: [], marks: [{ at: 8, type: "point", color: "teal", label: "" }] };
    case "mc":       return { ...base, font: "druck", size: 19, q: "Welches Tier hält Winterschlaf?", options: ["Der Igel", "Der Hund", "Die Katze"], answer: 0 };
    case "match":    return { ...base, font: "druck", size: 19, pairs: [["Hund", "wau"], ["Katze", "miau"], ["Kuh", "muh"], ["Ente", "quak"]], _shuffle: [2, 0, 3, 1] };
    case "wordsearch": return { ...base, words: ["IGEL", "BAUM", "BLATT", "WALD", "NEST"], grid: DKU.genWordsearch(["IGEL", "BAUM", "BLATT", "WALD", "NEST"], 10) };
    case "mathtri":  return { ...base, max: 20, op: "+", data: DKU.genTriangle(easy ? 10 : 20, "+") };
    case "clock":    { const mk = () => ({ h: DKU.rint(1, 12), m: [0, 15, 30, 45][DKU.rint(0, easy ? 1 : 3)] }); return { ...base, clocks: [mk()], cols: 1 }; }
    case "dotfield": { const field = easy ? "zehn" : "zwanzig"; const cap = field === "zehn" ? 10 : 20; return { ...base, field, value: DKU.rint(easy ? 3 : 6, cap - 1), showNumber: false, size: 26 }; }
    case "hundredchart": { const n = easy ? 6 : hard ? 14 : 10; return { ...base, blanks: DKU.genChartBlanks(n) }; }
    case "numhouse": { const target = easy ? 10 : hard ? 20 : 12; const count = easy ? 5 : hard ? 8 : 6; return { ...base, target, count, blank: "mix", size: 22, rows: DKU.genHouse(target, count, "mix") }; }
    case "unitcalc": { const count = easy ? 6 : hard ? 12 : 8; return { ...base, kind: "geld", mode: "rechnen", op: "+", max: 20, count, cols: 2, size: 22, showResult: false, items: DKU.genUnitItems("geld", "rechnen", "+", 20, count) }; }
    case "moneycount": { const max = easy ? 2 : hard ? 20 : 10; const pieces = easy ? 3 : hard ? 6 : 4; const count = easy ? 3 : hard ? 6 : 4; const withBills = max >= 10 && !easy; return { ...base, mode: "zaehlen", max, pieces, withBills, count, cols: 1, size: 24, showResult: false, items: DKU.genMoneyItems(max, pieces, withBills, count) }; }
    case "writtenmath": { const dg = easy ? 2 : hard ? 4 : 3; const count = easy ? 2 : hard ? 6 : 4; return { ...base, op: "+", digits: dg, mdigits: 1, count, cols: 2, carries: true, partials: true, size: 26, items: DKU.genWrittenItems("+", dg, count, 1) }; }
    case "chain":    { const max = easy ? 20 : 100, count = easy ? 2 : hard ? 4 : 3, start = DKU.rint(2, Math.max(3, Math.floor(max / 4))); return { ...base, start, count, max, ops: ["+", "-"], steps: DKU.genChain(start, count, max, ["+", "-"]) }; }
    case "fraction": { const count = easy ? 2 : hard ? 4 : 3, maxDen = easy ? 6 : hard ? 12 : 8; return { ...base, shape: "pie", ask: "name", count, maxDen, cols: count, items: DKU.genFractions(count, maxDen) }; }
    case "malkreuz": { const mb = DKU.genMul(!!hard); return { ...base, a: mb.a, b: mb.b }; }
    case "net":      { const hop = easy ? "+" : "×", hn = easy ? 2 : DKU.rint(2, 3), vop = "+", vn = easy ? 5 : 10, cols = 3, max = easy ? 20 : hard ? 1000 : 100; return { ...base, cols, hop, hn, vop, vn, max, start: DKU.genNetStart(cols, hop, hn, vop, vn, max) }; }
    case "placevalue": return { ...base, places: hard ? 4 : 3, numbers: hard ? [3456, 2807, 1290] : [234, 408, 96] };
    case "rechenrad": { const op = hard ? "×" : "+", n = op === "×" ? DKU.rint(2, 9) : DKU.rint(2, 5), count = easy ? 4 : 6, max = easy ? 20 : op === "×" ? 100 : 50; return { ...base, op, n, count, max, inner: DKU.genRad(op, n, count, max) }; }
    case "sach":     { const pool = DKI.SACH.filter(s => s.level === (easy ? "leicht" : hard ? "schwer" : "mittel")); const s = pool[DKU.rint(0, pool.length - 1)] || DKI.SACH[0]; return { ...base, font: "druck", size: 19, text: s.text, calc: s.calc, av: s.av, az: s.az, an: s.an }; }
    case "times":    { const rows = easy ? 5 : 10, cols = easy ? 5 : 10, blanksN = easy ? 6 : hard ? 40 : 18; return { ...base, rows, cols, blanksN, blanks: DKU.genGridBlanks(blanksN, rows * cols) }; }
    case "imagelabel": return { ...base, src: null, art: null, points: [], size: 320, bank: false, font: "grundschrift" };
    case "table":    return { ...base, rows: 3, cols: 3, header: true, size: 16, rowH: 34, font: "druck", cells: [["Spalte 1", "Spalte 2", "Spalte 3"], ["", "", ""], ["", "", ""]] };
    case "task":     return { ...base, num: 1, icon: "pencil", color: "teal", font: "druck", size: 18, text: "Schreibe hier deinen Arbeitsauftrag." };
    case "selfcheck": return { ...base, shape: "band", size: 22, decoys: 0 }; // sources undefiniert = automatisch alle Rechen-Aufgaben
    case "divider":  return { ...base, variant: "scissors", space: 30 };
    case "pagebreak": return { ...base };
    default:         return base;
  }
}

function buildTemplate(id) {
  const { nid } = DKI;
  const N = () => ({ id: nid(), type: "name", show: { name: true, date: true, klasse: false } });
  if (id === "silben-igel") return { title: "Silben-Lesen: Der Igel", subject: "Deutsch · Klasse 1", level: "mittel", blocks: [
    N(), { id: nid(), type: "title", text: "Der Igel", align: "center", size: 32 },
    { id: nid(), type: "image", art: "igel", size: 130, align: "center", caption: "der Igel" },
    { id: nid(), type: "syllable", scheme: "blaurot", font: "grundschrift", size: 26, text: "Der Igel hat viele Stacheln. Er sucht im Herbst nach Futter. Dann hält er einen langen Winterschlaf." },
    { id: nid(), type: "cloze", font: "grundschrift", size: 20, bank: true, text: "Der __Igel__ frisst gern __Würmer__. Im Winter hält er __Winterschlaf__." },
    { id: nid(), type: "lines", count: 3, height: 28, variant: "haus" } ] };
  if (id === "mathe-zr20") return { title: "Rechnen bis 20", subject: "Mathematik · Klasse 1", level: "mittel", blocks: [
    N(), { id: nid(), type: "title", text: "Rechnen bis 20", align: "center", size: 30 },
    { id: nid(), type: "matharow", op: "+", max: 20, count: 8, cols: 2, size: 24, showResult: false, items: genMath("+", 20, 8) },
    { id: nid(), type: "matharow", op: "-", max: 20, count: 8, cols: 2, size: 24, showResult: false, items: genMath("-", 20, 8) },
    { id: nid(), type: "mathwall", base: [3, 5, 4], hideTop: true, size: 20 } ] };
  if (id === "mathe-strahl") return { title: "Rechnen am Zahlenstrahl", subject: "Mathematik · Klasse 1", level: "mittel", blocks: [
    N(), { id: nid(), type: "title", text: "Rechnen am Zahlenstrahl", align: "center", size: 30 },
    { id: nid(), type: "task", num: 1, icon: "pencil", color: "teal", font: "druck", size: 18, text: "Trage die fehlenden Zahlen am Zahlenstrahl ein." },
    { id: nid(), type: "numline", min: 0, max: 20, step: 1, labelEvery: 1, blanks: [3, 7, 14, 18], marks: [] },
    { id: nid(), type: "task", num: 2, icon: "pencil", color: "orange", font: "druck", size: 18, text: "Welche Aufgabe zeigen die Sprünge? Schreibe sie auf." },
    { id: nid(), type: "numline", min: 0, max: 20, step: 1, labelEvery: 1, blanks: [], marks: [{ from: 2, to: 6, type: "jump", color: "orange", label: "+4" }, { from: 6, to: 13, type: "jump", color: "teal", label: "+7" }] },
    { id: nid(), type: "matharow", op: "+", mode: "missing", max: 20, count: 6, cols: 2, size: 24, showResult: false, items: genMath("+", 20, 6, "missing") },
    { id: nid(), type: "lines", count: 2, variant: "grundlinie", height: 28 } ] };
  if (id === "leseblatt") return { title: "Leseblatt: Im Herbst", subject: "Deutsch · Klasse 2", level: "mittel", blocks: [
    N(), { id: nid(), type: "title", text: "Im Herbst", align: "center", size: 30 },
    { id: nid(), type: "reading", font: "druck", size: 18, numbers: true, text: "Der Herbst ist da. Die Blätter werden bunt und fallen von den Bäumen.\nDie Tiere sammeln Futter für den Winter. Bald wird es kalt." },
    { id: nid(), type: "cloze", font: "grundschrift", size: 20, bank: true, text: "Im Herbst werden die __Blätter__ bunt. Die Tiere sammeln __Futter__." },
    { id: nid(), type: "lines", count: 4, height: 26, variant: "dreilinien" } ] };
  if (id === "rechenmauer") return { title: "Rechenmauern", subject: "Mathematik · Klasse 2", level: "schwer", blocks: [
    N(), { id: nid(), type: "title", text: "Rechenmauern", align: "center", size: 30 },
    { id: nid(), type: "mathwall", base: [4, 6, 3, 5], hideTop: true, size: 20 },
    { id: nid(), type: "mathwall", base: [7, 2, 8, 4], hideTop: true, size: 20 } ] };
  return null;
}

export default function App() {
  const LS_KEY = "digiki.worksheet.v1";
  const [doc, setDoc] = useState(() => {
    try { const s = localStorage.getItem(LS_KEY); if (s) { const d = JSON.parse(s); DKI.bumpId(d.blocks); return d; } } catch (e) {}
    return { ...DKI.DEFAULT_DOC, level: "mittel" };
  });
  const [selId, setSelId] = useState(null);
  const [zoom, setZoom] = useState(0.92);
  const [grid, setGrid] = useState(false);
  const [ki, setKi] = useState(false);
  const [saved, setSaved] = useState(true);
  const [preview, setPreview] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  // Mobile/Tablet: Seitenleisten als einklappbare Drawer
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const closeRails = () => { setLeftOpen(false); setRightOpen(false); };
  const hist = useRef({ past: [], future: [] });
  const pageRef = useRef(null);
  const canvasRef = useRef(null);
  const scopeRef = useRef(null);
  const stackRef = useRef(null);
  const blockEls = useRef(new Map());   // id -> DOM-Element (für Höhenmessung)
  const blockH = useRef(new Map());     // id -> gemessene Außenhöhe in px
  const [, setMeasureTick] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // ---- Vollbild: bewusst als CSS-Overlay (fixe Position), NICHT über die
  // Fullscreen-API. iPadOS beendet echtes Vollbild sonst per Wischgeste
  // (z. B. beim Schreiben mit dem Apple Pencil). So ist Vollbild nur über den
  // Button beendbar. Solange aktiv, wird der Seiten-Scroll gesperrt. ----
  const toggleFullscreen = () => setFullscreen(v => !v);
  useEffect(() => {
    if (!fullscreen) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [fullscreen]);

  // ---- Auf schmalen Geräten die A4-Seite initial einpassen ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window.innerWidth;
    if (w < 900) setZoom(z => Math.min(z, +Math.max(0.42, (w - 28) / 794).toFixed(2)));
  }, []);

  // ---- Wenn ein Baustein gewählt wird, auf Mobil die Eigenschaften öffnen ----
  useEffect(() => {
    if (selId && typeof window !== "undefined" && window.innerWidth <= 1100) {
      setRightOpen(true); setLeftOpen(false);
    }
  }, [selId]);

  // ---- history-aware commit ----
  const commit = useCallback((updater, pushHistory = true) => {
    setDoc(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (pushHistory) { hist.current.past.push(prev); if (hist.current.past.length > 50) hist.current.past.shift(); hist.current.future = []; }
      return next;
    });
    setSaved(false); setTimeout(() => setSaved(true), 700);
  }, []);

  // ---- autosave to localStorage ----
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(doc)); } catch (e) {} }, [doc]);

  const undo = () => { const h = hist.current; if (!h.past.length) return; setDoc(prev => { h.future.unshift(prev); return h.past.pop(); }); };
  const redo = () => { const h = hist.current; if (!h.future.length) return; setDoc(prev => { h.past.push(prev); return h.future.shift(); }); };
  // Höhe des (skalierten) Seitenstapels für den Wrapper – per ResizeObserver
  // statt per Dauer-Re-Render. Das frühere 400-ms-Intervall las offsetHeight
  // mitten im Render aus (erzwungenes Reflow) → auf iPad Safari sichtbares
  // „Flackern“ der Schrift. Jetzt wird nur bei echten Größenänderungen neu
  // gemessen.
  const [stackH, setStackH] = useState(1123);
  useEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    const update = () => setStackH(el.offsetHeight || 1123);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- Bausteinhöhen messen → Grundlage der automatischen Seitenaufteilung.
  // Höhen hängen nur von Inhalt & Breite ab (nicht von der Seite), daher genügt
  // eine Messung pro Inhaltsänderung; das Ergebnis steht stabil zur Verfügung. ----
  useIsoLayoutEffect(() => {
    let changed = false;
    blockEls.current.forEach((el, id) => {
      if (!el || !el.isConnected) return;
      const h = el.offsetHeight + 4; // vertikale Ränder (2px oben + 2px unten)
      const prev = blockH.current.get(id);
      if (prev === undefined || Math.abs(prev - h) > 1) { blockH.current.set(id, h); changed = true; }
    });
    if (changed) setMeasureTick(t => t + 1);
  }, [doc.blocks, zoom, doc.showSolutions, doc.footer, fontsReady]);

  // Worksheet-Schriften laden asynchron → nach dem Laden einmal neu messen,
  // damit die Seitenaufteilung mit der echten Texthöhe rechnet.
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts || !document.fonts.ready) return;
    let alive = true;
    document.fonts.ready.then(() => { if (alive) setFontsReady(true); });
    return () => { alive = false; };
  }, []);

  // ---- block ops ----
  const sel = doc.blocks.find(b => b.id === selId) || null;

  // Blöcke in echte Seiten aufteilen. "pagebreak"-Blöcke sind reine
  // (unsichtbare) Trenner zwischen den Blättern. Jede Seite kennt die ID
  // ihres voranstehenden Trenners, damit sie sich gezielt entfernen lässt.
  // A4-Seiten bilden: an manuellen „pagebreak"-Blöcken UND automatisch, sobald
  // die Bausteine die nutzbare Höhe einer Seite überschreiten (gemessene Höhen).
  const PAGE_USABLE = 990; // px nutzbare Inhaltshöhe (1123 − Ränder − Sicherheitsabstand)
  const pages = (() => {
    const out = [{ breakId: null, items: [], h: 0 }];
    doc.blocks.forEach((b, gi) => {
      if (b.type === "pagebreak") { out.push({ breakId: b.id, items: [], h: 0 }); return; }
      const bh = blockH.current.get(b.id) || 96; // Schätzung, bis gemessen
      let pg = out[out.length - 1];
      if (pg.items.length && pg.h + bh > PAGE_USABLE) { out.push({ breakId: null, auto: true, items: [], h: 0 }); pg = out[out.length - 1]; }
      pg.items.push({ b, gi });
      pg.h += bh;
    });
    out.forEach(p => { p.overflow = p.h > PAGE_USABLE; }); // einzelner Baustein zu groß für eine Seite
    return out;
  })();
  const removePage = (breakId) => { if (!breakId) return; commit(prev => ({ ...prev, blocks: prev.blocks.filter(b => b.id !== breakId) })); };
  const patch = (partial) => commit(prev => ({ ...prev, blocks: prev.blocks.map(b => {
    if (b.id !== selId) return b;
    let nb = { ...b, ...partial };
    if (partial._regen
        || (b.type === "matharow" && (partial.op || partial.max || partial.count || partial.mode))
        || (b.type === "mathtri" && (partial.op || partial.max))
        || (b.type === "numhouse" && (partial.target != null || partial.count != null || partial.blank != null))
        || (b.type === "unitcalc" && (partial.kind || partial.mode || partial.op || partial.max || partial.count))
        || (b.type === "moneycount" && (partial.max != null || partial.pieces != null || partial.withBills != null || partial.count != null))
        || (b.type === "writtenmath" && (partial.op || partial.digits || partial.count || partial.mdigits))
        || (b.type === "chain" && (partial.start != null || partial.count != null || partial.max != null || partial.ops != null))
        || (b.type === "fraction" && (partial.count != null || partial.maxDen != null))
        || (b.type === "times" && (partial.rows != null || partial.cols != null || partial.blanksN != null))
        || (b.type === "rechenrad" && (partial.op != null || partial.n != null || partial.count != null || partial.max != null))
        || (b.type === "net" && (partial.hop != null || partial.hn != null || partial.vop != null || partial.vn != null || partial.cols != null || partial.max != null))) {
      if (nb.type === "matharow") nb.items = genMath(nb.op, nb.max, nb.count, nb.mode);
      else if (nb.type === "wordsearch") nb.grid = DKU.genWordsearch(nb.words, nb.grid?.size || 10);
      else if (nb.type === "mathtri") nb.data = DKU.genTriangle(nb.max || 20, nb.op);
      else if (nb.type === "clock") nb.clocks = (nb.clocks && nb.clocks.length ? nb.clocks : [{ h: 3, m: 0 }]).map(() => ({ h: DKU.rint(1, 12), m: [0, 15, 30, 45][DKU.rint(0, 3)] }));
      else if (nb.type === "numhouse") nb.rows = DKU.genHouse(nb.target || 10, nb.count || 6, nb.blank || "mix");
      else if (nb.type === "unitcalc") nb.items = DKU.genUnitItems(nb.kind, nb.mode, nb.op, nb.max, nb.count);
      else if (nb.type === "moneycount") nb.items = DKU.genMoneyItems(nb.max, nb.pieces, nb.withBills, nb.count);
      else if (nb.type === "writtenmath") nb.items = DKU.genWrittenItems(nb.op, nb.digits, nb.count, nb.mdigits);
      else if (nb.type === "chain") nb.steps = DKU.genChain(Number.isFinite(nb.start) ? nb.start : 5, nb.count || 3, nb.max || 20, nb.ops || ["+", "-"]);
      else if (nb.type === "fraction") { nb.items = DKU.genFractions(nb.count || 3, nb.maxDen || 8); nb.cols = nb.count || nb.cols || nb.items.length; }
      else if (nb.type === "times") nb.blanks = DKU.genGridBlanks(nb.blanksN != null ? nb.blanksN : ((nb.blanks || []).length || 18), (nb.rows || 10) * (nb.cols || 10));
      else if (nb.type === "malkreuz") { const mb = DKU.genMul(nb.b >= 10); nb.a = mb.a; nb.b = mb.b; }
      else if (nb.type === "rechenrad") nb.inner = DKU.genRad(nb.op, nb.n, nb.count, nb.max);
      else if (nb.type === "net") nb.start = DKU.genNetStart(nb.cols, nb.hop, nb.hn, nb.vop, nb.vn, nb.max || 100);
      delete nb._regen;
    }
    if (partial.words && nb.type === "wordsearch") nb.grid = DKU.genWordsearch(nb.words, nb.grid?.size || 10);
    return nb;
  }) }));

  const addBlock = (type) => commit(prev => { const nb = makeBlock(type, prev.level); setTimeout(() => setSelId(nb.id), 0); return { ...prev, blocks: [...prev.blocks, nb] }; });
  // Hängt eine neue Folgeseite an (Seitenumbruch am Ende). Neue Bausteine
  // landen danach automatisch auf der neuen Seite – beliebig oft wiederholbar.
  const addPage = () => {
    commit(prev => ({ ...prev, blocks: [...prev.blocks, { id: DKI.nid(), type: "pagebreak" }] }));
    setSelId(null);
    setTimeout(() => { const c = canvasRef.current; if (c) c.scrollTo({ top: c.scrollHeight, behavior: "smooth" }); }, 60);
  };
  const addClipart = (art) => commit(prev => {
    // Ist ein Bild-Block ausgewählt? Dann Clipart dort einreihen (nebeneinander) statt neuen Block anzulegen.
    const cur = prev.blocks.find(b => b.id === selId);
    if (cur && cur.type === "image") {
      const items = (cur.items && cur.items.length) ? cur.items : [{ art: cur.art || "apfel", word: cur.caption || "" }];
      const ni = [...items, { art, word: DKU.CLIP_LABELS[art] }];
      return { ...prev, blocks: prev.blocks.map(b => b.id === selId ? { ...b, items: ni, cols: Math.min(4, ni.length) } : b) };
    }
    const nb = makeBlock("image", prev.level); nb.items = [{ art, word: DKU.CLIP_LABELS[art] }]; nb.mode = "label";
    setTimeout(() => setSelId(nb.id), 0);
    return { ...prev, blocks: [...prev.blocks, nb] };
  });
  const duplicate = (id) => commit(prev => { const i = prev.blocks.findIndex(b => b.id === id); const copy = { ...prev.blocks[i], id: DKI.nid() }; const arr = [...prev.blocks]; arr.splice(i + 1, 0, copy); setTimeout(() => setSelId(copy.id), 0); return { ...prev, blocks: arr }; });
  const remove = (id) => commit(prev => ({ ...prev, blocks: prev.blocks.filter(b => b.id !== id) })) || setSelId(null);
  const move = (id, dir) => commit(prev => { const i = prev.blocks.findIndex(b => b.id === id); const j = i + dir; if (j < 0 || j >= prev.blocks.length) return prev; const arr = [...prev.blocks]; [arr[i], arr[j]] = [arr[j], arr[i]]; return { ...prev, blocks: arr }; });
  const loadTemplate = (tid) => { const t = buildTemplate(tid); if (t) { commit(t); setSelId(null); } };
  const applyKI = (d) => { commit({ ...d }); setSelId(null); setKi(false); };

  // ---- file: save / open / new ----
  const onSave = () => {
    try {
      const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (doc.title || "arbeitsblatt").replace(/[^\wÀ-ɏ\- ]+/g, "").trim().replace(/\s+/g, "_").slice(0, 60) + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { alert("Speichern fehlgeschlagen."); }
  };
  const onOpen = () => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/json,.json";
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { try { const d = JSON.parse(r.result);
        if (d && Array.isArray(d.blocks)) { DKI.bumpId(d.blocks); commit(d); setSelId(null); }
        else alert("Das ist keine gültige Arbeitsblatt-Datei."); }
        catch (e) { alert("Die Datei konnte nicht gelesen werden."); } };
      r.readAsText(f);
    };
    inp.click();
  };
  const onNew = () => {
    if (!window.confirm("Neues, leeres Arbeitsblatt anlegen? Das aktuelle Blatt wird ersetzt (mit Rückgängig wiederherstellbar).")) return;
    commit({ title: "Neues Arbeitsblatt", subject: "Grundschule", level: doc.level || "mittel",
      blocks: [{ id: DKI.nid(), type: "name", show: { name: true, date: true, klasse: false } }] });
    setSelId(null);
  };

  // ---- export: eigenständiges, interaktives HTML (ausfüllbar + Lösungs-Umschalter) ----
  const exportInteractive = () => {
    if (!Block || !flushSync) { alert("Export wird von diesem Browser nicht unterstützt."); return; }
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const renderState = (showSolutions) => {
      const tmp = document.createElement("div");
      const root = createRoot(tmp);
      flushSync(() => root.render(
        React.createElement(React.Fragment, null,
          doc.blocks.map(b => React.createElement("div", { key: b.id, className: "ws-block" },
            React.createElement(Block, { block: b, doc: { ...doc, showSolutions } }))))
      ));
      const html = tmp.innerHTML;
      root.unmount();
      return html;
    };
    const solutionHTML = renderState(true);
    let studentHTML = renderState(false);
    try { // Antwort-Lücken in echte Eingabefelder umwandeln
      const d2 = new DOMParser().parseFromString("<div id='r'>" + studentHTML + "</div>", "text/html");
      d2.querySelectorAll("[data-answer]").forEach(el => {
        const ans = el.getAttribute("data-answer") || "";
        const inp = d2.createElement("input");
        inp.type = "text"; inp.className = "dki-fill"; inp.setAttribute("style", "width:" + Math.max(48, ans.length * 12 + 18) + "px");
        el.replaceWith(inp);
      });
      studentHTML = d2.getElementById("r").innerHTML;
    } catch (e) {}
    const FR = { solid: "2px solid #1A1A1A", dashed: "2px dashed #5C6B6B", round: "3px solid #00cabe", kids: "5px dashed #E8A838" };
    const frameCss = (doc.frame && FR[doc.frame]) ? ("border:" + FR[doc.frame] + ";border-radius:" + (doc.frame === "round" ? 20 : doc.frame === "kids" ? 16 : 6) + "px;") : "";
    const css = ':root{--teal:#00cabe;--teal-600:#00b3a8;--teal-700:#006363;--teal-50:#E6F7F6;--teal-100:#C3ECEA;--ink:#1A1A1A;--ink-soft:#33474A;--orange:#E8A838;--orange-600:#C8901F;--orange-50:#FBF3E1;--paper:#fff;--bg:#F5F9F9;--line:#DEE8E8;--line-soft:#E9F1F1;--muted:#5C6B6B;--muted-2:#8DA0A0;--syl-blue:#2563EB;--syl-red:#DC2626;--syl-green:#16A34A;--syl-purple:#7C3AED;--sol:#15803D;--lvl-1:#15803D;--lvl-2:#B07D12;--lvl-3:#C0392B;--ui:"Inter",system-ui,-apple-system,sans-serif}'
      + '*{box-sizing:border-box}body{margin:0;background:var(--bg);font-family:var(--ui);color:var(--ink);-webkit-print-color-adjust:exact;print-color-adjust:exact}'
      + '.font-grundschrift{font-family:"Andika",system-ui,sans-serif}.font-druck{font-family:"Atkinson Hyperlegible",system-ui,sans-serif}.font-schreib{font-family:"Edu NSW ACT Foundation","Comic Sans MS",cursive}'
      + '.dki-bar{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:12px;background:#fff;border-bottom:1px solid var(--line);padding:10px 16px}.dki-bar b{font-size:15px}.dki-bar .sub{color:var(--muted);font-size:12px}'
      + '.dki-btn{margin-left:auto;border:none;background:linear-gradient(180deg,#008981,var(--teal-700));color:#fff;font:700 14px var(--ui);padding:9px 16px;border-radius:10px;cursor:pointer}'
      + '.dki-wrap{max-width:840px;margin:22px auto;padding:0 12px}.dki-sheet{background:#fff;border-radius:6px;box-shadow:0 12px 40px rgba(15,23,42,.14);padding:48px 52px;' + frameCss + '}'
      + '.ws-block{margin:0 0 10px}'
      + '.dki-fill{border:none;border-bottom:2px solid var(--ink-soft);background:#FFFDEB;font:inherit;font-size:1em;text-align:center;outline:none;min-width:48px;padding:0 4px}.dki-fill:focus{border-bottom-color:var(--teal);background:#fff}'
      + '.sol-banner{display:inline-flex;align-items:center;gap:7px;background:var(--sol);color:#fff;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px}'
      + 'table{border-collapse:collapse}'
      + '@media print{.dki-bar{display:none}.dki-wrap{margin:0;max-width:none;padding:0}.dki-sheet{box-shadow:none;border-radius:0}@page{size:A4;margin:14mm}}';
    const html = '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(doc.title) + '</title><style>' + css + '</style></head><body>'
      + '<div class="dki-bar"><b>' + esc(doc.title) + '</b><span class="sub">' + esc(doc.subject || "") + '</span><button class="dki-btn" id="dki-tg" onclick="dkiToggle()">Lösungen anzeigen</button></div>'
      + '<div class="dki-wrap"><div class="dki-sheet" id="dki-aufgabe">' + studentHTML + '</div><div class="dki-sheet" id="dki-loesung" style="display:none">' + solutionHTML + '</div></div>'
      + '<scr' + 'ipt>function dkiToggle(){var s=document.getElementById("dki-loesung"),a=document.getElementById("dki-aufgabe"),b=document.getElementById("dki-tg");var on=s.style.display==="none";s.style.display=on?"block":"none";a.style.display=on?"none":"block";b.textContent=on?"Aufgabe anzeigen":"Lösungen anzeigen";}</scr' + 'ipt>'
      + '</body></html>';
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = (doc.title || "arbeitsblatt").replace(/[^\wÀ-ɏ\- ]+/g, "").trim().replace(/\s+/g, "_").slice(0, 60) + "_interaktiv.html";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const reorder = (from, to) => commit(prev => { if (from === to || to == null) return prev; const arr = [...prev.blocks]; const [m] = arr.splice(from, 1); arr.splice(to > from ? to - 1 : to, 0, m); return { ...prev, blocks: arr }; });

  const toggleSolutions = () => commit(p => ({ ...p, showSolutions: !p.showSolutions }), false);

  // ---- keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      const editing = tag === "input" || tag === "textarea" || e.target.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (editing) return;
      if (mod && e.key.toLowerCase() === "d" && selId) { e.preventDefault(); duplicate(selId); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && selId) { e.preventDefault(); remove(selId); return; }
      if (e.key === "Escape") { setSelId(null); setKi(false); setPreview(false); closeRails(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selId, ki]);

  // Druck: nur die Arbeitsblätter zeigen (Website- & Editor-Chrome per CSS
  // ausblenden). Jedes Blatt wird 1:1 in Editor-Geometrie auf genau eine
  // A4-Seite gedruckt – Editor-Seite N = PDF-Seite N (siehe @media print).
  const onPrint = () => {
    const body = document.body;
    body.classList.add("abe-printing");
    const done = () => body.classList.remove("abe-printing");
    window.addEventListener("afterprint", done, { once: true });
    window.print();
    setTimeout(done, 1500);
  };

  return (
    <div className={"abe-scope" + (fullscreen ? " abe-fullscreen" : "")} ref={scopeRef}>
      <style dangerouslySetInnerHTML={{ __html: EDITOR_CSS }} />
      <div className={"app" + (preview ? " preview" : "")}>
      <TopBar doc={doc} onTitle={v => commit(p => ({ ...p, title: v }), false)} undo={undo} redo={redo}
        canUndo={hist.current.past.length > 0} canRedo={hist.current.future.length > 0}
        zoom={zoom} setZoom={setZoom} grid={grid} setGrid={setGrid} onOpenKI={() => setKi(true)} onPrint={onPrint} saved={saved}
        solutions={!!doc.showSolutions} onToggleSolutions={toggleSolutions} preview={preview} setPreview={setPreview}
        onNew={onNew} onOpen={onOpen} onSave={onSave} onExportHTML={exportInteractive}
        onToggleLeft={() => { setLeftOpen(v => !v); setRightOpen(false); }}
        onToggleRight={() => { setRightOpen(v => !v); setLeftOpen(false); }}
        fullscreen={fullscreen} onToggleFullscreen={toggleFullscreen} />

      {preview && (
        <button onClick={() => setPreview(false)}
          style={{ position: "fixed", top: 14, right: 18, zIndex: 60, display: "inline-flex", alignItems: "center", gap: 8,
            background: "var(--ink)", color: "#fff", border: "none", borderRadius: 999, padding: "10px 18px", fontSize: 13.5, fontWeight: 700,
            boxShadow: "var(--shadow-lg)", cursor: "pointer" }}>
          <Icon name="close" size={17} /> Vorschau verlassen
        </button>
      )}

      <div className="app-body">
        <div className={"rail rail-left" + (leftOpen ? " open" : "")}>
          <LeftRail
            onAdd={(t) => { addBlock(t); closeRails(); }}
            onTemplate={(id) => { loadTemplate(id); closeRails(); }}
            onClipart={(a) => { addClipart(a); closeRails(); }} />
        </div>

        {/* Canvas */}
        <div ref={canvasRef} className="scroll canvas-area" onMouseDown={e => { const cl = e.target.classList; if (cl.contains("canvas-area") || cl.contains("canvas-stack") || cl.contains("page-scale-wrap") || cl.contains("page-stack")) setSelId(null); }}
          style={{ overflow: "auto", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px 90px" }}>
          <div className="canvas-stack" style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 794 * zoom, maxWidth: "100%", minHeight: "100%" }}>
            {/* Ein Transform skaliert den ganzen Seitenstapel; der Wrapper trägt die sichtbare (skalierte) Größe. */}
            <div className="page-scale-wrap" style={{ width: 794 * zoom, height: stackH * zoom, flexShrink: 0 }}>
              <div ref={stackRef} className="page-stack" style={{ width: 794, transform: `scale(${zoom})`, transformOrigin: "top left", display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
                {pages.map((pg, pi) => (
                  <div key={pi} className="page-sheet-wrap" style={{ position: "relative", width: 794, flexShrink: 0 }}>
                    <div className="page-sheet-meta">Seite {pi + 1} / {pages.length}</div>
                    {pg.breakId && !preview && (
                      <button type="button" className="abe-removepage" onClick={() => removePage(pg.breakId)}
                        data-tip="Diese Seite entfernen – der Inhalt rückt nach oben">
                        <Icon name="trash" size={14} /> Seite entfernen
                      </button>
                    )}
                    <div ref={pi === 0 ? pageRef : undefined} className={"ws-page" + (doc.frame && doc.frame !== "none" ? " framed" : "")} style={{ width: 794,
                      background: "#fff", height: 1123, position: "relative", borderRadius: 4, boxShadow: "var(--shadow-paper)", padding: "54px 56px",
                      backgroundImage: grid ? "linear-gradient(var(--line-soft) 1px,transparent 1px),linear-gradient(90deg,var(--line-soft) 1px,transparent 1px)" : "none",
                      backgroundSize: grid ? "28px 28px" : "auto", ...frameStyle(doc.frame) }}>
                      {pi === 0 && doc.showSolutions && (
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                          <span className="sol-banner"><Icon name="key" size={14} /> Lösungsblatt</span>
                        </div>
                      )}
                      {pg.items.map(({ b, gi }) => {
                        const isSel = b.id === selId;
                        return (
                          <div key={b.id} draggable
                            ref={el => { const m = blockEls.current; if (el) m.set(b.id, el); else m.delete(b.id); }}
                            onDragStart={e => { setDragIdx(gi); e.dataTransfer.effectAllowed = "move"; }}
                            onDragOver={e => { e.preventDefault(); setOverIdx(gi); }}
                            onDragEnd={() => { reorder(dragIdx, overIdx); setDragIdx(null); setOverIdx(null); }}
                            onMouseDown={e => { e.stopPropagation(); setSelId(b.id); }}
                            style={{ position: "relative", padding: "10px 12px", margin: "2px 0", borderRadius: 10, cursor: "default",
                              outline: isSel ? "2px solid var(--teal)" : "2px solid transparent", outlineOffset: 1,
                              boxShadow: dragIdx === gi ? "var(--shadow)" : "none", opacity: dragIdx === gi ? .5 : 1,
                              background: overIdx === gi && dragIdx !== null && dragIdx !== gi ? "var(--teal-50)" : "transparent",
                              transition: "background .12s, outline-color .12s" }}
                            className="ws-block">
                            {overIdx === gi && dragIdx !== null && dragIdx !== gi && <div style={{ position: "absolute", left: 0, right: 0, top: -3, height: 3, background: "var(--teal)", borderRadius: 3 }} />}
                            <Block block={b} doc={doc} onPatch={isSel ? patch : undefined} />

                            {isSel && (
                              <div className="block-toolbar" style={{ position: "absolute", top: -15, right: 10, display: "flex", gap: 1, background: "#fff", borderRadius: 9, padding: 3, boxShadow: "var(--shadow)", border: "1px solid var(--line)", zIndex: 20 }}>
                                <button className="icon-btn" style={{ width: 28, height: 28, cursor: "grab" }} data-tip="Ziehen zum Verschieben"><Icon name="drag" size={16} /></button>
                                <button className="icon-btn" style={{ width: 28, height: 28 }} data-tip="Nach oben" onClick={e => { e.stopPropagation(); move(b.id, -1); }}><Icon name="up" size={16} /></button>
                                <button className="icon-btn" style={{ width: 28, height: 28 }} data-tip="Nach unten" onClick={e => { e.stopPropagation(); move(b.id, 1); }}><Icon name="down" size={16} /></button>
                                <button className="icon-btn" style={{ width: 28, height: 28 }} data-tip="Duplizieren" onClick={e => { e.stopPropagation(); duplicate(b.id); }}><Icon name="copy" size={15} /></button>
                                <button className="icon-btn" style={{ width: 28, height: 28, color: "var(--syl-red)" }} data-tip="Löschen" onClick={e => { e.stopPropagation(); remove(b.id); }}><Icon name="trash" size={15} /></button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {pg.items.length === 0 && (
                        <div style={{ textAlign: "center", padding: "150px 20px", color: "var(--muted)" }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-soft)" }}>{pages.length === 1 ? "Leeres Blatt" : "Leere Seite " + (pi + 1)}</div>
                          <div style={{ fontSize: 13, marginTop: 6 }}>Füge links einen Baustein hinzu{pi === 0 ? " oder frag den KI-Assistenten." : "."}</div>
                        </div>
                      )}
                      {pi === pages.length - 1 && doc.footer && (
                        <div className="ws-footer" style={{ marginTop: 30, paddingTop: 8, borderTop: "1.5px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--ui)", fontSize: 11.5, color: "var(--muted)" }}>
                          <span>{doc.footerText || ""}</span>
                          <span style={{ fontWeight: 600 }}>{doc.title}</span>
                        </div>
                      )}
                      {pg.overflow && !preview && (
                        <div className="abe-overflow-warn" style={{ position: "absolute", left: -2, right: -2, bottom: -2, borderTop: "3px dashed var(--syl-red)", display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 5 }}>
                          <span style={{ transform: "translateY(-52%)", background: "var(--syl-red)", color: "#fff", fontFamily: "var(--ui)", fontSize: 11.5, fontWeight: 700, padding: "4px 11px", borderRadius: 999, whiteSpace: "nowrap", boxShadow: "var(--shadow-sm)" }}>⚠ Passt nicht auf die Seite — Baustein kleiner machen</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!preview && (
              <button type="button" className="abe-addpage" onClick={addPage}
                style={{ width: "100%" }}
                data-tip="Fügt ein neues, leeres Blatt hinzu">
                <Icon name="plus" size={18} /> Seite hinzufügen
              </button>
            )}
          </div>
        </div>

        <div className={"rail rail-right" + (rightOpen ? " open" : "")}>
          <RightRail doc={doc} sel={sel} patch={patch} patchDoc={p => commit(pp => ({ ...pp, ...p }))} setLevel={v => commit(p => ({ ...p, level: v }))} onPickImage={() => {}} blockMeta={sel ? (META[sel.type] || { label: sel.type, icon: "layers" }) : {}} />
        </div>

        {(leftOpen || rightOpen) && <div className="rail-backdrop" onClick={closeRails} aria-hidden="true" />}
      </div>

      {ki && <KIModal level={doc.level} onClose={() => setKi(false)} onApply={applyKI} />}
      </div>
    </div>
  );
}

