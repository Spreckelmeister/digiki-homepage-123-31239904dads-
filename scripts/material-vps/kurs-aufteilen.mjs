#!/usr/bin/env node
// Teilt eine Kurs-Sammeldatei (eine HTML-Datei, die alle Einheiten enthält)
// in eine kleine Startseite und je eine Datei pro Einheit auf. So lädt der
// Browser nur, was gerade angesehen wird, statt die ganze Datei (zig MB).
//
//   node --experimental-strip-types scripts/material-vps/kurs-aufteilen.mjs <kurs.html> <zielordner>
//
// Ergebnis:  <zielordner>/index.html  und  <zielordner>/einheiten/<nr>.html
// Der Zielordner kommt auf den Material-Server nach
//   /srv/digiki/material/dateien/<ordner>/
// (siehe server/einrichten.sh). Der Eintrag in der Datenbank trägt dann als
// storage_path „vps:<ordner>".
//
// Erwartetes Format der Sammeldatei: Die Einheiten stehen am Dateiende als
//   <script type="application/json" id="m-<nr>">"…HTML als JSON-Text…"</script>
// und die Startseite öffnet sie über openUnit() als blob:-Rahmen. Passt die
// Datei nicht dazu, bricht das Skript ab, statt etwas Halbes zu erzeugen.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [quelle, ziel] = process.argv.slice(2);
if (!quelle || !ziel) {
  console.error("Aufruf: kurs-aufteilen.mjs <kurs.html> <zielordner>");
  process.exit(2);
}

const hier = dirname(fileURLToPath(import.meta.url));
const { STORAGE_SHIM } = await import(
  resolve(hier, "../../src/lib/material/storageShim.ts")
);

function abbruch(text) {
  console.error("Abbruch: " + text);
  process.exit(1);
}

/** Ersetzt genau eine Fundstelle – sonst passt die Datei nicht zum Format. */
function ersetzeEinmal(text, alt, neu, was) {
  const teile = text.split(alt);
  if (teile.length !== 2) abbruch(`${was}: ${teile.length - 1} Fundstellen statt einer.`);
  return teile.join(neu);
}

/** Fügt den Speicher-Ersatz direkt hinter <head> ein. */
function mitSpeicherErsatz(html, was) {
  const tag = html.match(/<head[^>]*>/i) ?? html.match(/<html[^>]*>/i);
  if (!tag) abbruch(`${was}: kein <head> gefunden.`);
  const stelle = tag.index + tag[0].length;
  return html.slice(0, stelle) + STORAGE_SHIM + html.slice(stelle);
}

let start = readFileSync(quelle, "utf8");

// 1. Einheiten herauslösen
const einheiten = [];
start = start.replace(
  /<script type="application\/json" id="m-([0-9a-z-]+)">([\s\S]*?)<\/script>\n?/g,
  (_, nr, json) => {
    einheiten.push({ nr, html: JSON.parse(json) });
    return "";
  }
);
if (einheiten.length === 0) abbruch("keine Einheiten gefunden.");

// 2. Startseite: Einheit als eigene Datei laden statt aus der Sammeldatei
start = ersetzeEinmal(
  start,
  `    // Die Einheiten stehen am Dateiende; solange die Datei noch geladen wird, kurz warten
    if (!document.getElementById('m-' + u.id) || document.readyState === 'loading') {
      return document.addEventListener('DOMContentLoaded', mount, {once: true});
    }
    const html = JSON.parse(document.getElementById('m-' + u.id).textContent);
    blobUrl = URL.createObjectURL(new Blob([html], {type: 'text/html'}));
`,
  "    // Jede Einheit ist eine eigene Datei und wird erst beim Öffnen geladen\n",
  "Ladeteil in openUnit()"
);
start = ersetzeEinmal(
  start,
  "f.src = blobUrl;",
  "f.src = 'einheiten/' + u.id + '.html';",
  "Rahmen-Adresse in openUnit()"
);
start = mitSpeicherErsatz(start, "Startseite");

// 3. Schreiben
rmSync(ziel, { recursive: true, force: true });
mkdirSync(join(ziel, "einheiten"), { recursive: true });
writeFileSync(join(ziel, "index.html"), start);
const mb = (n) => (n / 1024 / 1024).toFixed(1).replace(".", ",") + " MB";
console.log(`index.html  ${mb(Buffer.byteLength(start))}`);
let summe = Buffer.byteLength(start);
for (const { nr, html } of einheiten) {
  const datei = mitSpeicherErsatz(html, `Einheit ${nr}`);
  writeFileSync(join(ziel, "einheiten", `${nr}.html`), datei);
  summe += Buffer.byteLength(datei);
  console.log(`einheiten/${nr}.html  ${mb(Buffer.byteLength(datei))}`);
}
console.log(`${einheiten.length} Einheiten, zusammen ${mb(summe)} → ${ziel}`);
