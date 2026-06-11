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
    { group: "Deutschunterricht", items: [
      { type: "syllable", label: "Silbentext",    icon: "syllable", desc: "Silben oder Selbstlaute färben", hot: true },
      { type: "reading",  label: "Lesetext",      icon: "reading", desc: "Fließtext zum Lesen" },
      { type: "cloze",    label: "Lückentext",    icon: "cloze",   desc: "Wörter einsetzen" },
      { type: "wordplay", label: "Wörter & Sätze", icon: "wordplay", desc: "Schütteln, Wörterschlange, Großschreibung", hot: true },
      { type: "wordsearch", label: "Wörtersuchsel", icon: "wordsearch", desc: "Wörter finden", hot: true },
      { type: "lines",    label: "Schreiblinien", icon: "lines",   desc: "Lineatur, auch zum Nachspuren" },
    ]},
    { group: "Allgemein", items: [
      { type: "title",    label: "Überschrift",   icon: "title",  desc: "Titelzeile" },
      { type: "task",     label: "Arbeitsauftrag", icon: "task",  desc: "Aufgabe mit Symbol" },
      { type: "mc",       label: "Ankreuzen",     icon: "mc",      desc: "Multiple-Choice" },
      { type: "match",    label: "Zuordnen",      icon: "match",   desc: "Paare verbinden" },
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

  // Lese- & Sachtext-Vorrat (für den Baustein „Lesetext") – kuratiert,
  // grundschulgerecht und sachlich korrekt. Kategorien + Klassenstufe.
  const READING_TEXTS = [
    // ── Tiere ──
    { cat: "Tiere", level: "1", title: "Der Igel", text: "Der Igel hat ungefähr 8000 Stacheln. Wenn er Angst hat, rollt er sich zu einer Kugel zusammen. So schützt er sich vor Feinden. Am liebsten frisst der Igel Käfer, Würmer und Schnecken. Im Winter hält er Winterschlaf." },
    { cat: "Tiere", level: "1", title: "Der Marienkäfer", text: "Der Marienkäfer ist rot und hat schwarze Punkte. Er kann seine Flügel ausbreiten und fliegen. Marienkäfer fressen kleine Blattläuse. Darum freuen sich die Gärtner über sie." },
    { cat: "Tiere", level: "1", title: "Die Schnecke", text: "Die Schnecke trägt ihr Haus auf dem Rücken. Sie kriecht ganz langsam über den Boden. Mit ihren zwei Fühlern tastet sie den Weg. Wenn es zu trocken ist, zieht sie sich in ihr Haus zurück." },
    { cat: "Tiere", level: "1", title: "Die Ente", text: "Die Ente schwimmt gern auf dem Teich. Zwischen ihren Zehen hat sie Schwimmhäute. Damit paddelt sie durch das Wasser. Die Ente ruft laut: quak, quak." },
    { cat: "Tiere", level: "2", title: "Die Biene", text: "Bienen leben in einem großen Volk zusammen. Die Königin legt die Eier. Die Arbeiterinnen sammeln Nektar aus den Blüten und machen daraus Honig. Bienen sind sehr wichtig, weil sie die Blüten bestäuben." },
    { cat: "Tiere", level: "2", title: "Das Eichhörnchen", text: "Das Eichhörnchen klettert flink auf die Bäume. Im Herbst sammelt es Nüsse und vergräbt sie im Boden. Im Winter findet es nicht alle Verstecke wieder. Aus den vergessenen Nüssen wachsen später neue Bäume." },
    { cat: "Tiere", level: "2", title: "Der Maulwurf", text: "Der Maulwurf lebt unter der Erde. Mit seinen breiten Pfoten gräbt er lange Gänge. Er ist fast blind, aber er hört und riecht ausgezeichnet. Am liebsten frisst er Regenwürmer." },
    { cat: "Tiere", level: "2", title: "Vom Ei zum Schmetterling", text: "Aus einem winzigen Ei schlüpft eine Raupe. Die Raupe frisst viele Blätter und wird immer dicker. Dann verpuppt sie sich. Nach einiger Zeit schlüpft aus der Puppe ein bunter Schmetterling." },
    // ── Jahreszeiten & Natur ──
    { cat: "Jahreszeiten & Natur", level: "1", title: "Der Herbst", text: "Im Herbst werden die Blätter bunt. Sie fallen von den Bäumen auf den Boden. Der Wind weht stark und es regnet oft. Viele Tiere sammeln jetzt Futter für den Winter." },
    { cat: "Jahreszeiten & Natur", level: "1", title: "Der Frühling", text: "Im Frühling wird es wieder wärmer. Die ersten Blumen blühen auf der Wiese. Die Vögel bauen Nester und singen. Viele Tiere bekommen jetzt ihre Jungen." },
    { cat: "Jahreszeiten & Natur", level: "1", title: "Der Winter", text: "Im Winter ist es kalt. Manchmal fällt Schnee und alles wird weiß. Die Kinder bauen einen Schneemann und rodeln den Hügel hinunter. Viele Tiere halten jetzt Winterschlaf." },
    { cat: "Jahreszeiten & Natur", level: "2", title: "Der Apfelbaum im Jahr", text: "Im Frühling blüht der Apfelbaum weiß und rosa. Die Bienen bestäuben die Blüten. Im Sommer wachsen aus den Blüten kleine grüne Äpfel. Im Herbst sind die Äpfel reif und werden geerntet." },
    { cat: "Jahreszeiten & Natur", level: "2", title: "Der Löwenzahn", text: "Der Löwenzahn blüht leuchtend gelb. Später wird aus der Blüte eine Pusteblume. Wenn der Wind darüber weht, fliegen die kleinen Samen davon. An neuen Stellen wächst dann wieder Löwenzahn." },
    { cat: "Jahreszeiten & Natur", level: "2", title: "Der Wald", text: "Im Wald wachsen viele Bäume dicht beieinander. Die Bäume geben uns frische Luft. Im Wald leben Rehe, Füchse, Eichhörnchen und viele Vögel. Wir sollten leise sein, damit wir die Tiere nicht stören." },
    // ── Sachwissen ──
    { cat: "Sachwissen", level: "2", title: "Die Sonne", text: "Die Sonne ist ein riesiger, heißer Stern. Sie spendet uns Licht und Wärme. Ohne die Sonne könnten Pflanzen, Tiere und Menschen nicht leben. Weil sich die Erde einmal am Tag um sich selbst dreht, wird es Tag und Nacht." },
    { cat: "Sachwissen", level: "2", title: "Das Wasser", text: "Wasser ist für alle Lebewesen wichtig. Es kann flüssig sein, als Eis ganz fest und als Dampf in der Luft. Wir trinken Wasser und brauchen es zum Waschen und Kochen. Darum sollten wir sparsam mit Wasser umgehen." },
    { cat: "Sachwissen", level: "2", title: "Die vier Jahreszeiten", text: "Ein Jahr hat vier Jahreszeiten: Frühling, Sommer, Herbst und Winter. Jede Jahreszeit dauert etwa drei Monate. Im Sommer ist es warm und die Tage sind lang. Im Winter ist es kalt und die Tage sind kurz." },
    { cat: "Sachwissen", level: "2", title: "Gesunde Zähne", text: "Mit den Zähnen beißen und kauen wir unser Essen. Damit die Zähne gesund bleiben, putzen wir sie zweimal am Tag. Zu viel Süßes ist schlecht für die Zähne. Einmal im Jahr gehen wir zur Zahnärztin oder zum Zahnarzt." },
    { cat: "Sachwissen", level: "2", title: "Der Regenwurm", text: "Der Regenwurm lebt in der Erde. Er gräbt viele Gänge und lockert dabei den Boden. Das ist gut für die Pflanzen. Der Regenwurm hat keine Augen, aber er spürt mit seiner Haut, ob es hell oder dunkel ist." },
    { cat: "Sachwissen", level: "1", title: "Die Feuerwehr", text: "Die Feuerwehr hilft, wenn es brennt. Die Feuerwehrleute löschen das Feuer mit viel Wasser. Sie tragen feste Kleidung und einen Helm. Den Notruf der Feuerwehr erreichst du unter der Nummer 112." },
    { cat: "Sachwissen", level: "2", title: "Gesundes Frühstück", text: "Ein gutes Frühstück gibt uns Kraft für den Tag. Obst, Vollkornbrot und Milch sind gesund. Süße Getränke sollten wir nur selten trinken. Mit einem guten Frühstück können wir in der Schule besser lernen." },
    // ── Geschichten ──
    { cat: "Geschichten", level: "1", title: "Anna und der Hund", text: "Anna geht am Nachmittag in den Park. Dort trifft sie einen kleinen Hund. Der Hund hat sich verlaufen und ist ganz allein. Anna bringt ihn zu seinem Besitzer zurück. Alle freuen sich sehr." },
    { cat: "Geschichten", level: "1", title: "Pauls erster Schultag", text: "Heute ist Pauls erster Schultag. Er trägt eine große, bunte Schultüte. In der Schule lernt er viele neue Kinder kennen. Am Ende des Tages ist Paul müde, aber sehr glücklich." },
    { cat: "Geschichten", level: "2", title: "Im Schwimmbad", text: "Lisa und Tom gehen zusammen ins Schwimmbad. Tom springt mutig vom kleinen Brett ins Wasser. Lisa übt das Schwimmen mit ihren Schwimmflügeln. Nach einer Stunde essen die beiden ein leckeres Eis." },
    { cat: "Geschichten", level: "2", title: "Das verlorene Kuscheltier", text: "Mia kann ihren Teddy nicht finden. Sie sucht im ganzen Haus nach ihm. Endlich entdeckt sie ihn unter dem Bett. Glücklich nimmt sie ihren Teddy wieder in den Arm." },
  ];

  export const DKI = { FONTS, SYL_SCHEMES, CLIPART, PALETTE, TEMPLATES, DEFAULT_DOC, SACH, READING_TEXTS, nid, bumpId };