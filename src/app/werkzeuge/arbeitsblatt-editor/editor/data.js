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
      { type: "clock",    label: "Uhrzeit",        icon: "clock", desc: "Uhr ablesen" },
    ]},
    { group: "Medien", items: [
      { type: "image",    label: "Bild / Clipart", icon: "image", desc: "mehrere, beschriften, zählen" },
      { type: "name",     label: "Namensfeld",     icon: "name",  desc: "Name & Datum" },
      { type: "divider",  label: "Trennlinie",     icon: "divider", desc: "Linie / Schneidelinie" },
      { type: "pagebreak", label: "Seitenumbruch",  icon: "pagebreak", desc: "erzwingt neue Druckseite" },
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

  export const DKI = { FONTS, SYL_SCHEMES, CLIPART, PALETTE, TEMPLATES, DEFAULT_DOC, nid, bumpId };