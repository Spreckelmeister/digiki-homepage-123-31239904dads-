/* ============================================================
   DigiKI Osnabrück — sample data, fonts, templates, clipart
   Plain JS — assigns window.DKI
   ============================================================ */
  // School fonts offered in the editor
  const FONTS = [
    { id: "grundschrift", label: "Grundschrift",        css: "font-grundschrift", note: "Druckschrift, Standard",      sample: "Anna" },
    { id: "druck",        label: "Fibel Druck",          css: "font-druck",        note: "klare Fibelschrift",         sample: "Anna" },
    { id: "schreib",      label: "Schulausgangsschrift", css: "font-schreib",      note: "verbundene Schreibschrift",  sample: "Anna" },
  ];

  // Syllable color schemes
  const SYL_SCHEMES = [
    { id: "blaurot",  label: "Blau · Rot",   colors: ["var(--syl-blue)", "var(--syl-red)"] },
    { id: "blaugrun", label: "Blau · Grün",  colors: ["var(--syl-blue)", "var(--syl-green)"] },
    { id: "lilaoran", label: "Lila · Orange",colors: ["var(--syl-purple)", "var(--orange)"] },
    { id: "grau",     label: "Bögen (grau)", colors: ["#334155", "#334155"], arcs: true },
  ];

  // Clipart library (simple inline SVG emoji-style — placeholder art)
  const CLIPART = [
    "igel","apfel","sonne","baum","fisch","blume","stern","herz","haus","katze",
    "hund","ball","auto","wolke","mond","ente","maus","banane","pilz","schnecke",
    "stift","buch","schere","eis","vogel","schmetterling","marienkaefer","erdbeere",
    "karotte","brot","ananas","eule"
  ];

  // Block palette grouped
  const PALETTE = [
    { group: "Text & Sprache", items: [
      { type: "title",    label: "Überschrift",   icon: "title",  desc: "Titelzeile" },
      { type: "task",     label: "Arbeitsauftrag", icon: "task",  desc: "Aufgabe mit Symbol" },
      { type: "syllable", label: "Silbentext",    icon: "syllable", desc: "zweifarbige Silben", hot: true },
      { type: "reading",  label: "Lesetext",      icon: "reading", desc: "Fließtext zum Lesen" },
      { type: "cloze",    label: "Lückentext",    icon: "cloze",   desc: "Wörter einsetzen" },
      { type: "mc",       label: "Ankreuzen",     icon: "mc",      desc: "Multiple-Choice" },
      { type: "match",    label: "Zuordnen",      icon: "match",   desc: "Paare verbinden" },
      { type: "wordsearch", label: "Wörtersuchsel", icon: "wordsearch", desc: "Wörter finden", hot: true },
      { type: "lines",    label: "Schreiblinien", icon: "lines",   desc: "Lineatur, auch zum Nachspuren" },
      { type: "table",    label: "Tabelle",       icon: "table",   desc: "Zeilen & Spalten" },
    ]},
    { group: "Mathematik", items: [
      { type: "matharow", label: "Rechenpäckchen", icon: "math",  desc: "Aufgabenreihen", hot: true },
      { type: "mathwall", label: "Rechenmauer",    icon: "wall",  desc: "Zahlenpyramide" },
      { type: "mathtri",  label: "Rechendreieck",  icon: "mathtri", desc: "Ecken & Seiten" },
      { type: "numline",  label: "Zahlenstrahl",   icon: "numline", desc: "Markierungen & Sprünge", hot: true },
      { type: "dotfield", label: "Punktefeld",     icon: "dotfield", desc: "Zehner-, Zwanziger-, Hunderterfeld" },
      { type: "hundredchart", label: "Hundertertafel", icon: "hundred", desc: "Zahlen 1–100, Felder ausblendbar" },
      { type: "numhouse", label: "Zahlenhaus",     icon: "numhouse", desc: "Zahlen zerlegen" },
      { type: "unitcalc", label: "Geld & Größen",  icon: "unit", desc: "Rechnen & Umrechnen mit Einheiten", hot: true },
      { type: "moneycount", label: "Geld zählen",  icon: "coins", desc: "Münzen & Scheine zusammenzählen", hot: true },
      { type: "writtenmath", label: "Schriftlich rechnen", icon: "written", desc: "Plus, Minus, Mal, Geteilt" },
      { type: "chain",    label: "Rechenkette",     icon: "chain",    desc: "Pfeilrechnen" },
      { type: "net",      label: "Rechennetz",      icon: "net",      desc: "Pfeile: rechts & runter" },
      { type: "rechenrad", label: "Rechenrad",      icon: "rechenrad", desc: "Zahlenscheibe" },
      { type: "malkreuz", label: "Malkreuz",        icon: "malkreuz", desc: "halbschriftlich malnehmen" },
      { type: "times",    label: "Einmaleins-Tafel", icon: "times",   desc: "Malfolgen-Gitter" },
      { type: "placevalue", label: "Stellenwerttafel", icon: "placevalue", desc: "H · Z · E" },
      { type: "fraction", label: "Brüche",          icon: "fraction", desc: "Pizza & Balken", hot: true },
      { type: "sach",     label: "Sachaufgabe",     icon: "sach",     desc: "Frage · Rechnung · Antwort" },
      { type: "clock",    label: "Uhrzeit",        icon: "clock", desc: "Uhr ablesen" },
      { type: "selfcheck", label: "Selbstkontrolle", icon: "selfcheck", desc: "Lösungen zum Selbst-Prüfen", hot: true },
    ]},
    { group: "Medien", items: [
      { type: "image",    label: "Bild / Clipart", icon: "image", desc: "mehrere, beschriften, zählen" },
      { type: "imagelabel", label: "Bild beschriften", icon: "imagelabel", desc: "Teile eines Bildes benennen", hot: true },
      { type: "name",     label: "Namensfeld",     icon: "name",  desc: "Name & Datum" },
      { type: "divider",  label: "Trennlinie",     icon: "divider", desc: "Linie / Schneidelinie" },
    ]},
  ];

  // Templates (each = list of block specs)
  const TEMPLATES = [
    { id: "silben-igel", title: "Silben-Lesen: Der Igel", tag: "Deutsch · Kl. 1", accent: "var(--teal)",
      preview: ["name","title","syllable","image","cloze"] },
    { id: "mathe-zr20",  title: "Rechnen bis 20", tag: "Mathe · Kl. 1", accent: "var(--orange)",
      preview: ["name","title","matharow","mathwall"] },
    { id: "mathe-strahl", title: "Rechnen am Zahlenstrahl", tag: "Mathe · Kl. 1", accent: "var(--teal)",
      preview: ["name","task","numline","numline","matharow"] },
    { id: "leseblatt",   title: "Leseblatt: Im Herbst", tag: "Deutsch · Kl. 2", accent: "var(--syl-purple)",
      preview: ["name","title","reading","cloze","lines"] },
    { id: "rechenmauer", title: "Rechenmauern-Training", tag: "Mathe · Kl. 2", accent: "var(--syl-green)",
      preview: ["name","title","mathwall","mathwall"] },
  ];

  // Default starter worksheet (array of blocks)
  let _id = 0; const nid = () => "b" + (++_id);
  const bumpId = (blocks) => { (blocks || []).forEach(b => { const n = parseInt(String(b.id).replace(/\D/g, ""), 10); if (!isNaN(n) && n > _id) _id = n; }); };
  const DEFAULT_DOC = {
    title: "Der Igel im Herbst",
    subject: "Deutsch · Klasse 1",
    blocks: [
      { id: nid(), type: "name", show: { name: true, date: true, klasse: false } },
      { id: nid(), type: "title", text: "Der Igel im Herbst", align: "center", size: 30 },
      { id: nid(), type: "image", art: "igel", size: 120, align: "center", caption: "der Igel" },
      { id: nid(), type: "syllable", scheme: "blaurot", font: "grundschrift", size: 26,
        text: "Im Herbst sucht der Igel ein Versteck. Er frisst noch viele Würmer und Schnecken. Dann schläft der Igel den ganzen Winter." },
      { id: nid(), type: "cloze", font: "grundschrift", size: 20,
        text: "Der __Igel__ sammelt __Blätter__ für sein __Nest__. Im Winter hält er __Winterschlaf__." },
      { id: nid(), type: "lines", count: 3, variant: "haus", height: 28 },
    ],
  };

  // Sachaufgaben-Bibliothek (für den Baustein „Sachaufgabe")
  const SACH = [
    { level: "leicht", text: "Lena hat 12 Äpfel. Sie verschenkt 5 Äpfel an ihre Freunde. Wie viele Äpfel hat Lena noch?", calc: "12 − 5 = 7", av: "Lena hat noch", az: "7", an: "Äpfel." },
    { level: "leicht", text: "Auf dem Schulhof spielen 8 Kinder. 6 Kinder kommen dazu. Wie viele Kinder spielen jetzt auf dem Schulhof?", calc: "8 + 6 = 14", av: "Jetzt spielen", az: "14", an: "Kinder auf dem Schulhof." },
    { level: "leicht", text: "Tim hat 3 Tüten mit je 5 Murmeln. Wie viele Murmeln hat Tim?", calc: "3 · 5 = 15", av: "Tim hat", az: "15", an: "Murmeln." },
    { level: "mittel", text: "Ein Buch hat 64 Seiten. Mia hat schon 37 Seiten gelesen. Wie viele Seiten muss sie noch lesen?", calc: "64 − 37 = 27", av: "Mia muss noch", az: "27", an: "Seiten lesen." },
    { level: "mittel", text: "Im Bus sitzen 23 Fahrgäste. An der Haltestelle steigen 9 Fahrgäste aus und 14 ein. Wie viele Fahrgäste sind jetzt im Bus?", calc: "23 − 9 + 14 = 28", av: "Im Bus sind jetzt", az: "28", an: "Fahrgäste." },
    { level: "mittel", text: "Eine Klasse sammelt 4 Wochen lang jede Woche 25 Pfandflaschen. Wie viele Flaschen sind es insgesamt?", calc: "4 · 25 = 100", av: "Es sind insgesamt", az: "100", an: "Flaschen." },
    { level: "schwer", text: "Ein Bäcker backt am Morgen 240 Brötchen. Bis zum Mittag verkauft er 168 Brötchen. Wie viele Brötchen sind noch da?", calc: "240 − 168 = 72", av: "Es sind noch", az: "72", an: "Brötchen da." },
    { level: "schwer", text: "Familie Berg fährt 3 Stunden mit dem Auto. In jeder Stunde schafft sie 85 Kilometer. Wie weit fährt die Familie?", calc: "3 · 85 = 255", av: "Die Familie fährt", az: "255", an: "Kilometer." },
    { level: "schwer", text: "Eine Eintrittskarte für den Zoo kostet für Kinder 4 €. Die Klasse 4a hat 26 Kinder. Wie viel kosten alle Karten zusammen?", calc: "26 · 4 = 104", av: "Alle Karten kosten zusammen", az: "104", an: "€." },
  ];

  export const DKI = { FONTS, SYL_SCHEMES, CLIPART, PALETTE, TEMPLATES, DEFAULT_DOC, SACH, nid, bumpId };