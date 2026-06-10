import React from "react";
import { DKI } from "./data";
import { DKU } from "./utils";
import { Icon } from "./icons";

/* ============================================================
   KI-Assistent — prompt → generated worksheet
   Mit eigenem API-Schlüssel: echte KI (Anthropic/OpenAI).
   Ohne Schlüssel: Offline-Vorlagen-Generator (Heuristik).
   Hinweis: bewusst KEINE async/await (Babel-Standalone → regenerator).
   ============================================================ */
  const { nid } = DKI;
  const { rint, genWall, genWordsearch, genTriangle, genHouse, genChartBlanks, genUnitItems, genWrittenItems, genChain, genFractions, genMul, genNetStart, genRad, genGridBlanks } = DKU;

  // ---- Offline-Vorlagen (Fallback ohne Schlüssel) ----
  const TOPICS = {
    igel:   { art: "igel",  noun: "Igel",  text: "Der Igel lebt im Wald und auf der Wiese. Im Herbst frisst er viele Würmer und Käfer. Wenn es kalt wird, sucht der Igel ein warmes Versteck aus Blättern. Dort hält er seinen Winterschlaf." },
    herbst: { art: "baum",  noun: "Herbst",text: "Im Herbst werden die Blätter bunt. Sie fallen von den Bäumen auf den Boden. Der Wind weht stark und es wird kälter. Viele Tiere sammeln jetzt Futter für den Winter." },
    apfel:  { art: "apfel", noun: "Apfel", text: "Der Apfel wächst am Baum. Im Sommer ist er noch grün und klein. Im Herbst wird er rot und süß. Dann können wir die Äpfel pflücken und essen." },
    sonne:  { art: "sonne", noun: "Sonne", text: "Die Sonne scheint am Himmel. Sie gibt uns Licht und Wärme. Am Morgen geht die Sonne auf. Am Abend geht sie wieder unter." },
    fisch:  { art: "fisch", noun: "Fisch", text: "Der Fisch lebt im Wasser. Er schwimmt mit seinen Flossen. Fische atmen unter Wasser mit ihren Kiemen. Manche Fische sind ganz bunt." },
    katze:  { art: "katze", noun: "Katze", text: "Die Katze ist ein beliebtes Haustier. Sie hat weiche Pfoten und scharfe Krallen. Katzen schlafen gern in der Sonne. Wenn sie sich freuen, schnurren sie." },
  };
  const FALLBACK = { art: "stern", noun: "Thema", text: "Lies den Text aufmerksam durch. Achte auf die Silben in den Wörtern. Unterstreiche die Nomen mit einem blauen Stift. Male zu jedem Satz ein passendes Bild." };

  const EXAMPLES = [
    "Lese-Arbeitsblatt über den Igel mit Silben, Klasse 1",
    "Rechenmauern und Plusaufgaben bis 20",
    "Lückentext zum Herbst mit Wortspeicher",
    "Mathe-Mix bis 100 mit Differenzierung",
  ];

  function classify(p) {
    const s = p.toLowerCase();
    const math = /(rechn|mathe|plus|minus|mal|geteilt|zahl|mauer|aufgab|\+|bis \d)/.test(s);
    let max = 20; const m = s.match(/bis\s*(\d{1,3})/); if (m) max = Math.min(100, +m[1]);
    let kl = 1; const k = s.match(/klasse\s*(\d)/); if (k) kl = +k[1];
    let topic = FALLBACK, key = null;
    for (const t in TOPICS) if (s.includes(t)) { topic = TOPICS[t]; key = t; break; }
    if (!key) { for (const t of ["herbst", "winter", "frühling", "sommer", "tier", "wald"]) if (s.includes(t)) { topic = TOPICS.herbst; break; } }
    return { math, max, kl, topic };
  }

  function generate(prompt, level) {
    const { math, max, kl, topic } = classify(prompt);
    const blocks = [{ id: nid(), type: "name", show: { name: true, date: true, klasse: kl >= 2 } }];
    const easy = level === "leicht", hard = level === "schwer";
    if (math) {
      blocks.push({ id: nid(), type: "title", text: `Rechnen bis ${max}`, align: "center", size: 30 });
      blocks.push({ id: nid(), type: "task", num: 1, icon: "pencil", color: "teal", font: "druck", size: 18, text: "Rechne die Aufgaben aus." });
      if (max <= 20) blocks.push({ id: nid(), type: "numline", min: 0, max, step: 1, labelEvery: 1, blanks: [rint(2, max - 2), rint(2, max - 2)], marks: [] });
      blocks.push({ id: nid(), type: "matharow", op: "+", mode: easy ? "normal" : "missing", max, count: easy ? 6 : hard ? 12 : 8, cols: 2, size: 24,
        items: Array.from({ length: easy ? 6 : hard ? 12 : 8 }, () => { const a = rint(1, max - 1), b = rint(1, max - a); return { a, b, res: a + b, op: "+", hide: Math.random() < 0.5 ? "a" : "b" }; }) });
      if (!easy) blocks.push({ id: nid(), type: "matharow", op: "-", max, count: hard ? 8 : 6, cols: 2, size: 24,
        items: Array.from({ length: hard ? 8 : 6 }, () => { const a = rint(2, max), b = rint(1, a - 1); return { a, b, res: a - b, op: "-" }; }) });
      if (hard) blocks.push({ id: nid(), type: "mathtri", max, op: "+", data: genTriangle(max, "+") });
      blocks.push({ id: nid(), type: "mathwall", op: "+", base: hard ? [rint(2, 12), rint(2, 12), rint(2, 12), rint(2, 12)] : [rint(2, 9), rint(2, 9), rint(2, 9)], hideTop: true, size: 20 });
      return { title: `Rechnen bis ${max}`, subject: `Mathematik · Klasse ${kl}`, level, blocks };
    }
    blocks.push({ id: nid(), type: "title", text: topic.noun === "Thema" ? "Mein Arbeitsblatt" : `Der ${topic.noun}`, align: "center", size: 30 });
    blocks.push({ id: nid(), type: "image", items: [{ art: topic.art, word: topic.noun !== "Thema" ? topic.noun : "" }], cols: 1, size: 120, align: "center", mode: "label", font: "grundschrift" });
    blocks.push({ id: nid(), type: "syllable", scheme: "blaurot", font: "grundschrift", size: easy ? 28 : 24,
      text: easy ? topic.text.split(". ").slice(0, 2).join(". ") + "." : topic.text });
    const words = topic.text.split(" ");
    const clozeText = words.map((w, i) => (i > 1 && i % 6 === 0 && /^[A-Za-zäöü]{4,}$/.test(w) ? `__${w.replace(/[.,]/g, "")}__` : w)).join(" ");
    blocks.push({ id: nid(), type: "cloze", font: "grundschrift", size: 20, bank: !hard, text: clozeText });
    const nouns = [...new Set(topic.text.replace(/[.,]/g, "").split(" ").filter(w => /^[A-ZÄÖÜ][a-zäöü]{3,7}$/.test(w)))].slice(0, 5);
    if (nouns.length >= 3) blocks.push({ id: nid(), type: "wordsearch", words: nouns.map(n => n.toUpperCase()), grid: genWordsearch(nouns.map(n => n.toUpperCase()), 10) });
    if (!easy) blocks.push({ id: nid(), type: "lines", count: hard ? 4 : 2, variant: hard ? "dreilinien" : "haus", height: 28 });
    return { title: topic.noun === "Thema" ? "Mein Arbeitsblatt" : `Der ${topic.noun}`, subject: `Deutsch · Klasse ${kl}`, level, blocks };
  }

  // ---- Echte-KI-Anbindung ----
  function genItems(op, max, count, mode) {
    return Array.from({ length: count }, () => {
      if (mode === "compare") { const a = rint(1, max), b = rint(1, max); return { a, b, cmp: a < b ? "<" : a > b ? ">" : "=" }; }
      let it;
      if (op === "+") { const a = rint(1, max - 1), b = rint(1, max - a); it = { a, b, res: a + b, op }; }
      else if (op === "-") { const a = rint(2, max), b = rint(1, a - 1); it = { a, b, res: a - b, op }; }
      else if (op === "×") { const t = max <= 20 ? 5 : max <= 100 ? 10 : 20; const a = rint(1, t), b = rint(1, t); it = { a, b, res: a * b, op }; }
      else { const b = rint(2, 9), res = rint(2, 9); it = { a: b * res, b, res, op: "÷" }; }
      if (mode === "missing") it.hide = Math.random() < 0.5 ? "a" : "b";
      return it;
    });
  }

  // Von der KI gelieferte Blöcke robust machen (IDs + generierte Inhalte ergänzen)
  function normalizeBlocks(blocks) {
    const out = [];
    (Array.isArray(blocks) ? blocks : []).forEach(b => {
      if (!b || !b.type) return;
      const nb = Object.assign({}, b, { id: nid() });
      try {
        if (nb.type === "matharow") {
          nb.op = nb.op || "+"; nb.mode = nb.mode || "normal";
          nb.max = Math.min(1000, Math.max(10, +nb.max || 20));
          nb.count = Math.min(20, Math.max(2, +nb.count || 8));
          nb.cols = nb.cols || 2; nb.size = nb.size || 24;
          if (!Array.isArray(nb.items) || !nb.items.length) nb.items = genItems(nb.op, nb.max, nb.count, nb.mode);
        } else if (nb.type === "wordsearch") {
          const words = (nb.words || []).map(w => String(w).toUpperCase().replace(/[^A-ZÄÖÜ]/g, "")).filter(Boolean);
          nb.words = words.length ? words : ["IGEL", "BAUM", "NEST"];
          nb.grid = genWordsearch(nb.words, (nb.grid && nb.grid.size) || Math.max(10, Math.min(16, nb.words.length + 6)));
        } else if (nb.type === "mathtri") {
          nb.op = nb.op || "+"; nb.max = +nb.max || 20; nb.data = genTriangle(nb.max, nb.op);
        } else if (nb.type === "mathwall") {
          nb.op = nb.op || "+"; nb.hideTop = nb.hideTop !== false; nb.size = nb.size || 20;
          if (!Array.isArray(nb.base) || nb.base.length < 2) nb.base = [rint(2, 9), rint(2, 9), rint(2, 9)];
          nb.base = nb.base.slice(0, 5).map(v => Math.max(0, +v || 0));
        } else if (nb.type === "numline") {
          nb.min = +nb.min || 0; nb.max = +nb.max || 20; nb.step = +nb.step || 1; nb.labelEvery = nb.labelEvery || 1;
          nb.blanks = Array.isArray(nb.blanks) ? nb.blanks : []; nb.marks = Array.isArray(nb.marks) ? nb.marks : [];
        } else if (nb.type === "clock") {
          if (!Array.isArray(nb.clocks) || !nb.clocks.length) nb.clocks = [{ h: nb.h || 3, m: nb.m || 0 }];
          nb.cols = nb.cols || nb.clocks.length;
        } else if (nb.type === "image") {
          if (!Array.isArray(nb.items) || !nb.items.length) nb.items = [{ art: nb.art || "stern", word: nb.caption || "" }];
          nb.cols = nb.cols || Math.min(4, nb.items.length); nb.size = nb.size || 110; nb.mode = nb.mode || "plain"; nb.frame = nb.frame !== false;
        } else if (nb.type === "table") {
          const cells = Array.isArray(nb.cells) ? nb.cells : [["", "", ""], ["", "", ""]];
          nb.cells = cells; nb.rows = nb.rows || cells.length; nb.cols = nb.cols || (cells[0] ? cells[0].length : 3);
          nb.header = nb.header !== false; nb.size = nb.size || 16; nb.rowH = nb.rowH || 34; nb.font = nb.font || "druck";
        } else if (nb.type === "lines") {
          nb.count = nb.count || 4; nb.variant = nb.variant || "haus"; nb.height = nb.height || 28;
        } else if (nb.type === "mc") {
          nb.options = Array.isArray(nb.options) ? nb.options : ["A", "B", "C"]; nb.answer = +nb.answer || 0; nb.size = nb.size || 19; nb.font = nb.font || "druck";
        } else if (nb.type === "match") {
          nb.pairs = Array.isArray(nb.pairs) ? nb.pairs : [["A", "1"], ["B", "2"]]; nb._shuffle = nb.pairs.map((_, i) => i).sort(() => Math.random() - 0.5); nb.size = nb.size || 19; nb.font = nb.font || "druck";
        } else if (nb.type === "task") {
          nb.icon = nb.icon || "pencil"; nb.color = nb.color || "teal"; nb.font = nb.font || "druck"; nb.size = nb.size || 18;
        } else if (nb.type === "dotfield") {
          nb.field = ["zehn", "zwanzig", "hundert"].includes(nb.field) ? nb.field : "zwanzig";
          const cap = nb.field === "zehn" ? 10 : nb.field === "hundert" ? 100 : 20;
          nb.value = Math.max(0, Math.min(cap, +nb.value || 0)); nb.size = nb.size || 26;
        } else if (nb.type === "hundredchart") {
          nb.blanks = Array.isArray(nb.blanks) ? nb.blanks.map(Number).filter(n => n >= 1 && n <= 100) : genChartBlanks(10);
        } else if (nb.type === "numhouse") {
          nb.target = Math.max(2, Math.min(100, +nb.target || 10));
          nb.count = Math.max(2, Math.min(12, +nb.count || 6));
          nb.blank = ["a", "b", "mix"].includes(nb.blank) ? nb.blank : "mix";
          if (!Array.isArray(nb.rows) || !nb.rows.length || !nb.rows.every(r => r && typeof r.a === "number")) nb.rows = genHouse(nb.target, nb.count, nb.blank);
        } else if (nb.type === "unitcalc") {
          nb.kind = ["geld", "laenge", "gewicht", "volumen"].includes(nb.kind) ? nb.kind : "geld";
          nb.mode = nb.mode === "umrechnen" ? "umrechnen" : "rechnen";
          nb.op = nb.op === "-" ? "-" : "+";
          nb.max = Math.min(1000, Math.max(5, +nb.max || 20));
          nb.count = Math.min(20, Math.max(2, +nb.count || 8));
          nb.cols = nb.cols || 2; nb.size = nb.size || 22;
          if (!Array.isArray(nb.items) || !nb.items.length) nb.items = genUnitItems(nb.kind, nb.mode, nb.op, nb.max, nb.count);
        } else if (nb.type === "writtenmath") {
          nb.op = ["+", "-", "×", "÷"].includes(nb.op) ? nb.op : "+";
          nb.digits = Math.min(4, Math.max(2, +nb.digits || 3));
          nb.count = Math.min(12, Math.max(1, +nb.count || 4));
          nb.cols = nb.cols || 2;
          nb.mdigits = nb.mdigits === 2 ? 2 : 1;
          if (!Array.isArray(nb.items) || !nb.items.length) nb.items = genWrittenItems(nb.op, nb.digits, nb.count, nb.mdigits);
          nb.size = nb.size || 26;
        } else if (nb.type === "chain") {
          nb.max = Math.min(1000, Math.max(10, +nb.max || 20));
          nb.count = Math.min(8, Math.max(1, +nb.count || 3));
          nb.start = Math.min(nb.max, Math.max(0, +nb.start || rint(2, Math.floor(nb.max / 4))));
          nb.ops = Array.isArray(nb.ops) && nb.ops.length ? nb.ops.filter(o => ["+", "-", "×"].includes(o)) : ["+", "-"];
          if (!nb.ops.length) nb.ops = ["+", "-"];
          nb.steps = genChain(nb.start, nb.count, nb.max, nb.ops);
        } else if (nb.type === "fraction") {
          nb.shape = nb.shape === "bar" ? "bar" : "pie";
          nb.ask = nb.ask === "shade" ? "shade" : "name";
          nb.count = Math.min(6, Math.max(1, +nb.count || 3));
          nb.maxDen = Math.min(12, Math.max(2, +nb.maxDen || 8));
          nb.cols = nb.count; nb.items = genFractions(nb.count, nb.maxDen);
        } else if (nb.type === "malkreuz") {
          if (!(+nb.a > 1 && +nb.b > 1)) { const m = genMul(false); nb.a = m.a; nb.b = m.b; }
          else { nb.a = Math.round(+nb.a); nb.b = Math.round(+nb.b); }
        } else if (nb.type === "net") {
          nb.cols = Math.min(4, Math.max(2, +nb.cols || 3));
          nb.max = Math.min(1000, Math.max(10, +nb.max || 100));
          nb.hop = ["+", "-", "×"].includes(nb.hop) ? nb.hop : "+";
          nb.vop = ["+", "-", "×"].includes(nb.vop) ? nb.vop : "+";
          nb.hn = Math.max(1, +nb.hn || 2); nb.vn = Math.max(1, +nb.vn || 10);
          nb.start = genNetStart(nb.cols, nb.hop, nb.hn, nb.vop, nb.vn, nb.max);
        } else if (nb.type === "placevalue") {
          nb.places = Math.min(5, Math.max(1, +nb.places || 3));
          nb.numbers = (Array.isArray(nb.numbers) ? nb.numbers : []).map(n => Math.abs(Math.round(+n || 0))).filter(n => n > 0).slice(0, 8);
          if (!nb.numbers.length) nb.numbers = [234, 408, 96];
        } else if (nb.type === "rechenrad") {
          nb.op = ["+", "-", "×"].includes(nb.op) ? nb.op : "+";
          nb.n = Math.max(1, +nb.n || 3);
          nb.count = Math.min(8, Math.max(3, +nb.count || 6));
          nb.max = Math.min(1000, Math.max(10, +nb.max || 20));
          nb.inner = genRad(nb.op, nb.n, nb.count, nb.max);
        } else if (nb.type === "sach") {
          nb.font = nb.font || "druck"; nb.size = nb.size || 19;
          nb.text = String(nb.text || "Sachaufgabe"); nb.az = String(nb.az != null ? nb.az : "");
          nb.av = String(nb.av || "Es sind"); nb.an = String(nb.an || "");
        } else if (nb.type === "times") {
          nb.rows = Math.min(12, Math.max(1, +nb.rows || 10));
          nb.cols = Math.min(12, Math.max(1, +nb.cols || 10));
          nb.blanksN = Math.min(nb.rows * nb.cols, Math.max(0, +nb.blanksN || 16));
          nb.blanks = genGridBlanks(nb.blanksN, nb.rows * nb.cols);
        } else if (nb.type === "imagelabel") {
          nb.points = Array.isArray(nb.points) ? nb.points.filter(p => p && Number.isFinite(+p.x) && Number.isFinite(+p.y)).map(p => ({ x: +p.x, y: +p.y, word: String(p.word || "") })) : [];
          if (!nb.src && !nb.art) nb.art = null;
          nb.size = nb.size || 320; nb.font = nb.font || "grundschrift";
        } else if (nb.type === "selfcheck") {
          nb.shape = nb.shape === "schlange" ? "schlange" : "band";
          nb.size = nb.size || 22;
          nb.decoys = Math.max(0, Math.min(6, +nb.decoys || 0));
          if (nb.sources != null && !Array.isArray(nb.sources)) delete nb.sources; // null/undefiniert = automatisch alle
        }
      } catch (e) {}
      out.push(nb);
    });
    return out.length ? out : [{ id: nid(), type: "title", text: "Mein Arbeitsblatt", align: "center", size: 30 }];
  }

  function schemaPrompt(level) {
    return [
      "Du bist Assistent für eine deutsche Grundschullehrkraft und erstellst ein Arbeitsblatt.",
      "Antworte AUSSCHLIESSLICH mit einem JSON-Objekt, ohne Markdown, ohne Erklärtext.",
      'Format: {"title": "...", "subject": "Fach · Klasse N", "level": "' + level + '", "blocks": [ ... ]}.',
      "Sinnvolle Reihenfolge: zuerst ein name-Block, dann ein title-Block, dann 3-6 Aufgaben-Blöcke. Inhalte auf Deutsch, kindgerecht für die genannte Klasse.",
      "Mögliche Block-Typen und Felder (nur diese verwenden):",
      '- {"type":"name"}  Namensfeld',
      '- {"type":"title","text":"...","size":30}',
      '- {"type":"task","text":"Arbeitsauftrag","icon":"pencil|scissors|crayons|ruler|speak|ear|eye|bulb","num":1}',
      '- {"type":"syllable","text":"Satz in Silbenschrift"} — bei falscher Trennung · setzen, z.B. "Sa·la·man·der"',
      '- {"type":"reading","text":"Zeile1\\nZeile2","numbers":true}',
      '- {"type":"cloze","text":"Der __Hund__ läuft.","bank":true}  Lücken mit __wort__ markieren',
      '- {"type":"mc","q":"Frage?","options":["A","B","C"],"answer":0}',
      '- {"type":"match","pairs":[["Hund","wau"],["Katze","miau"]]}',
      '- {"type":"wordsearch","words":["IGEL","BAUM","NEST"]}  Gitter wird automatisch erzeugt',
      '- {"type":"lines","count":4,"variant":"haus|vierlinien|dreilinien|grundlinie|karo","word":"optionales Vorgabewort"}',
      '- {"type":"table","header":true,"cells":[["Sp1","Sp2"],["",""]]}',
      '- {"type":"image","items":[{"art":"igel"}],"cols":3,"mode":"plain|label|count|story"}  Clipart-Namen: igel,apfel,sonne,baum,fisch,blume,stern,herz,haus,katze,hund,ball,auto,wolke,mond,ente,maus,banane,pilz,schnecke,stift,buch,schere,eis,vogel,schmetterling,marienkaefer,erdbeere,karotte,brot,ananas,eule',
      '- {"type":"matharow","op":"+|-|×|÷","mode":"normal|missing|compare","max":20,"count":8}  Aufgaben automatisch',
      '- {"type":"mathwall","op":"+|-|×","base":[2,5,3]}',
      '- {"type":"mathtri","op":"+|-|×|÷","max":20}',
      '- {"type":"numline","min":0,"max":20,"step":1,"blanks":[3,7],"marks":[{"at":12,"type":"box"}]}',
      '- {"type":"dotfield","field":"zehn|zwanzig|hundert","value":14}  Punktefeld (Zehner-/Zwanziger-/Hunderterfeld); Kinder schreiben die Anzahl',
      '- {"type":"hundredchart","blanks":[4,17,28]}  Hundertertafel 1-100 mit ausgeblendeten Feldern',
      '- {"type":"numhouse","target":10,"count":6,"blank":"mix"}  Zahlenhaus: Zerlegung der Zielzahl (blank: a|b|mix)',
      '- {"type":"unitcalc","kind":"geld|laenge|gewicht|volumen","mode":"rechnen|umrechnen","op":"+|-","max":20,"count":8}  Rechnen/Umrechnen mit Geld & Größen',
      '- {"type":"writtenmath","op":"+|-|×|÷","digits":3,"count":4,"mdigits":1}  Schriftliche Rechenverfahren (count = Anzahl; mdigits = Stellen des Multiplikators bei ×; ÷ = einstelliger Divisor, geht auf)',
      '- {"type":"chain","start":5,"count":3,"max":20,"ops":["+","-"]}  Rechenkette (Pfeilrechnen) automatisch',
      '- {"type":"net","cols":3,"hop":"×","hn":2,"vop":"+","vn":10,"max":100}  Rechennetz (Pfeile rechts & runter) automatisch',
      '- {"type":"rechenrad","op":"+|-|×","n":4,"count":6,"max":100}  Rechenrad automatisch',
      '- {"type":"malkreuz","a":14,"b":13}  Malkreuz (halbschriftlich multiplizieren)',
      '- {"type":"times","rows":10,"cols":10,"blanksN":16}  Einmaleins-Tafel automatisch',
      '- {"type":"placevalue","places":3,"numbers":[234,408,96]}  Stellenwerttafel',
      '- {"type":"fraction","shape":"pie|bar","ask":"name|shade","count":3,"maxDen":8}  Brüche automatisch',
      '- {"type":"sach","text":"Sachaufgabe mit Frage?","calc":"12 − 5 = 7","av":"Lena hat noch","az":"7","an":"Äpfel."}  Sachaufgabe: az = geprüfte Zahl im Antwortsatz',
      '- {"type":"clock","clocks":[{"h":3,"m":0},{"h":7,"m":30}],"cols":2}',
      '- {"type":"selfcheck","shape":"band"}  Selbstkontrolle-Feld: sammelt automatisch die Ergebnisse aller Rechen-Aufgaben auf dem Blatt zum Abhaken. Am besten als letzten Block nach den Rechenaufgaben einfügen. shape "band" oder "schlange".',
      '- {"type":"divider","variant":"scissors"}',
    ].join("\n");
  }

  function callAI(prompt, level, cfg) {
    const sys = schemaPrompt(level);
    let req;
    if (cfg.provider === "openai") {
      req = fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", "authorization": "Bearer " + cfg.key },
        body: JSON.stringify({ model: cfg.model || "gpt-4o-mini", temperature: 0.6, messages: [{ role: "system", content: sys }, { role: "user", content: prompt }] }),
      }).then(r => r.ok ? r.json() : r.text().then(t => { throw new Error("OpenAI " + r.status + ": " + t.slice(0, 160)); }))
        .then(j => (j.choices && j.choices[0] && j.choices[0].message.content) || "");
    } else {
      req = fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": cfg.key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: cfg.model || "claude-haiku-4-5", max_tokens: 2200, system: sys, messages: [{ role: "user", content: prompt }] }),
      }).then(r => r.ok ? r.json() : r.text().then(t => { throw new Error("Anthropic " + r.status + ": " + t.slice(0, 160)); }))
        .then(j => (j.content || []).map(c => c.text || "").join(""));
    }
    return req.then(text => {
      const m = text && text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Die KI hat keine verwertbare Antwort geliefert.");
      const data = JSON.parse(m[0]);
      return { title: data.title || "Mein Arbeitsblatt", subject: data.subject || "", level: data.level || level, blocks: normalizeBlocks(data.blocks) };
    });
  }

  function KIModal({ onClose, onApply, level }) {
    const [prompt, setPrompt] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const [step, setStep] = React.useState(0);
    const [err, setErr] = React.useState("");
    const [cfg, setCfg] = React.useState(() => { try { return JSON.parse(localStorage.getItem("digiki.ai") || "{}"); } catch (e) { return {}; } });
    const [showCfg, setShowCfg] = React.useState(false);
    const steps = ["Thema wird analysiert…", "Aufgaben werden erstellt…", "Silben & Layout werden gesetzt…", "Fertig!"];
    const hasKey = !!(cfg.key && cfg.key.trim());
    const provider = cfg.provider || "anthropic";
    const MODELS = provider === "openai"
      ? [["gpt-4o-mini", "GPT-4o mini", "schnell & günstig"], ["gpt-4o", "GPT-4o", "ausgewogen"]]
      : [["claude-haiku-4-5", "Haiku 4.5", "schnell & günstig"], ["claude-sonnet-4-6", "Sonnet 4.6", "ausgewogen"], ["claude-opus-4-8", "Opus 4.8", "beste Qualität"]];
    const defModel = provider === "openai" ? "gpt-4o-mini" : "claude-haiku-4-5";
    const curModel = (cfg.model && cfg.model.trim()) || defModel;
    const saveCfg = (patch) => { const c = { ...cfg, ...patch }; setCfg(c); try { localStorage.setItem("digiki.ai", JSON.stringify(c)); } catch (e) {} };

    const run = () => {
      if (!prompt.trim() || busy) return;
      setErr(""); setBusy(true); setStep(0);
      if (hasKey) {
        callAI(prompt, level, { provider, key: cfg.key.trim(), model: curModel })
          .then(d => onApply(d))
          .catch(e => { setBusy(false); setErr(String((e && e.message) || e)); });
        return;
      }
      let i = 0;
      const tick = setInterval(() => { i++; setStep(i); if (i >= steps.length - 1) { clearInterval(tick); setTimeout(() => onApply(generate(prompt, level)), 420); } }, 620);
    };

    const inStyle = { width: "100%", border: "1px solid var(--line)", borderRadius: 9, padding: "8px 10px", font: "inherit", fontSize: 13, outline: "none", marginTop: 4 };

    return (
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", backdropFilter: "blur(3px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", animation: "fade .18s ease" }}>
        <div onClick={e => e.stopPropagation()} className="pop" style={{ width: 560, maxWidth: "92vw", maxHeight: "92vh", overflowY: "auto", background: "#fff", borderRadius: 20, boxShadow: "var(--shadow-lg)" }}>
          <div style={{ padding: "18px 22px", background: "linear-gradient(110deg,#2BB6AC,#178B82 60%,#E8921A 160%)", color: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="sparkle" size={22} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800 }}>KI-Assistent</div>
              <div style={{ fontSize: 12.5, opacity: .9 }}>{hasKey ? "Echte KI aktiv – beschreibe ein beliebiges Arbeitsblatt." : "Beschreibe dein Arbeitsblatt – es wird aus Vorlagen gebaut."}</div>
            </div>
            <button className="icon-btn" style={{ color: "#fff" }} onClick={onClose}><Icon name="close" size={20} /></button>
          </div>

          {busy ? (
            hasKey ? (
              <div style={{ padding: "40px 26px", textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Die KI erstellt dein Arbeitsblatt…</div>
                <div className="ki-dots" style={{ margin: "16px auto 0" }} />
              </div>
            ) : (
              <div style={{ padding: "34px 26px 38px" }}>
                {steps.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", opacity: i <= step ? 1 : .35, transition: "opacity .3s" }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
                      background: i < step ? "var(--teal)" : i === step ? "var(--teal-50)" : "var(--bg-rail)", color: i < step ? "#fff" : "var(--teal-700)", border: i === step ? "2px solid var(--teal)" : "none" }}>
                      {i < step ? <Icon name="check" size={15} /> : <span style={{ fontSize: 12, fontWeight: 700 }}>{i + 1}</span>}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{s}</span>
                    {i === step && i < steps.length - 1 && <span className="ki-dots" style={{ marginLeft: "auto" }} />}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div style={{ padding: 22 }}>
              <textarea autoFocus value={prompt} onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
                placeholder="z. B. „Lese-Arbeitsblatt über den Igel mit Silbentext und Lückentext für Klasse 1″"
                rows={3} style={{ width: "100%", border: "1.5px solid var(--line)", borderRadius: 13, padding: "13px 15px", font: "inherit", fontSize: 14.5, lineHeight: 1.5, resize: "none", outline: "none", color: "var(--ink)" }}
                onFocus={e => e.target.style.borderColor = "var(--teal)"} onBlur={e => e.target.style.borderColor = "var(--line)"} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 13 }}>
                {EXAMPLES.map(ex => (
                  <button key={ex} onClick={() => setPrompt(ex)} style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", background: "var(--bg-rail)", border: "1px solid var(--line)", borderRadius: 999, padding: "6px 12px", cursor: "pointer" }}>
                    <Icon name="bulb" size={13} style={{ verticalAlign: "-2px", marginRight: 4, color: "var(--orange)" }} />{ex}
                  </button>
                ))}
              </div>

              {err && <div style={{ marginTop: 14, padding: "9px 12px", borderRadius: 10, background: "#FDECEC", color: "#B42318", fontSize: 12.5, lineHeight: 1.5 }}>{err}</div>}

              {/* KI-Verbindung */}
              <div style={{ marginTop: 16, border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
                <button onClick={() => setShowCfg(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 13px", background: "var(--bg-rail)", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: hasKey ? "var(--lvl-1)" : "var(--muted-2)" }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)" }}>{hasKey ? "Echte KI verbunden (" + (provider === "openai" ? "OpenAI" : "Anthropic") + ")" : "Echte KI verbinden (optional)"}</span>
                  <span style={{ marginLeft: "auto", color: "var(--muted)" }}><Icon name={showCfg ? "chevdown" : "chevright"} size={16} /></span>
                </button>
                {showCfg && (
                  <div style={{ padding: "12px 13px" }}>
                    <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.5 }}>Mit eigenem API-Schlüssel erstellt echte KI Arbeitsblätter zu beliebigen Themen. Der Schlüssel wird <b>nur lokal in diesem Browser</b> gespeichert. <b style={{ color: "var(--ink-soft)" }}>Datenschutz:</b> In diesem Modus wird Ihr eingegebener Text direkt an den gewählten Anbieter (Anthropic bzw. OpenAI, Server ggf. in den USA) gesendet – bitte <b>keine personenbezogenen Daten</b> (z. B. Schülernamen) eingeben. Ohne Schlüssel bleibt alles lokal auf Ihrem Gerät.</p>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted-2)", margin: "2px 2px 5px" }}>Anbieter</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[["anthropic", "Anthropic (Claude)"], ["openai", "OpenAI (ChatGPT)"]].map(([v, l]) => (
                        <button key={v} onClick={() => saveCfg({ provider: v, model: "" })} style={{ flex: 1, padding: "7px 6px", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 700,
                          border: "1.5px solid " + (provider === v ? "var(--teal)" : "var(--line)"), background: provider === v ? "var(--teal-50)" : "#fff", color: provider === v ? "var(--teal-700)" : "var(--ink-soft)" }}>{l}</button>
                      ))}
                    </div>
                    <input type="password" value={cfg.key || ""} onChange={e => saveCfg({ key: e.target.value })} placeholder={provider === "openai" ? "OpenAI API-Schlüssel (sk-…)" : "Anthropic API-Schlüssel (sk-ant-…)"} style={inStyle} autoComplete="off" />
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted-2)", margin: "12px 2px 5px" }}>Modell</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {MODELS.map(([id, label, hint]) => (
                        <button key={id} onClick={() => saveCfg({ model: id })} style={{ padding: "7px 9px", textAlign: "left", borderRadius: 9, cursor: "pointer",
                          border: "1.5px solid " + (curModel === id ? "var(--teal)" : "var(--line)"), background: curModel === id ? "var(--teal-50)" : "#fff" }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{label}</div>
                          <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{hint}</div>
                        </button>
                      ))}
                    </div>
                    <input value={cfg.model || ""} onChange={e => saveCfg({ model: e.target.value })} placeholder={"oder eigenes Modell (Standard: " + defModel + ")"} style={inStyle} />
                    {hasKey && <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 9px", marginTop: 9 }} onClick={() => saveCfg({ key: "" })}>Schlüssel entfernen</button>}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Niveau: <b style={{ color: "var(--ink-soft)", textTransform: "capitalize" }}>{level}</b></div>
                <div className="spacer" />
                <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
                <button className="btn-ai btn" disabled={!prompt.trim()} onClick={run} style={{ opacity: prompt.trim() ? 1 : .5 }}><Icon name="sparkle" size={17} /> {hasKey ? "Mit KI erstellen" : "Erstellen"}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  export { KIModal };
