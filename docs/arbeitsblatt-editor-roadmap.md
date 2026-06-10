# Roadmap – Arbeitsblatt-Editor (DigiKI Osnabrück)

> Gap-Analyse gegenüber Worksheet Crafter, neu priorisiert nach dem Leitprinzip
> **„iPad-first & einfach"**. Stand: Juni 2026.

---

## 0. Leitprinzip (gilt für jede Entscheidung)

**Der Editor muss komplett auf dem iPad bedienbar bleiben – einfach, intuitiv,
ohne Einarbeitung.** Wir wollen *nicht* Worksheet Crafter klonen. WC ist eine
Profi-Desktop-Software mit Lernkurve; unser Ziel ist das Gegenteil: eine
Lehrkraft soll auf dem Tablet in wenigen Minuten ein fertiges, gutes
Arbeitsblatt haben.

Jedes neue Feature wird an drei Fragen gemessen:

1. **Funktioniert es mit dem Finger / Apple Pencil?** (große Tap-Ziele, kein
   Hover, kein präzises Ziehen nötig)
2. **Versteht es eine Lehrkraft ohne Anleitung?**
3. **Bleibt der Baustein-Stapel die einfachste Form?** (hinzufügen → einstellen
   → fertig)

Wenn ein WC-Feature nur mit Komplexität zu haben ist, lassen wir es weg oder
bauen eine vereinfachte, „auto-magische" Variante.

---

## 1. Bewusste Nicht-Ziele (was wir absichtlich NICHT bauen)

Diese WC-Funktionen verschlechtern auf dem iPad die Bedienbarkeit und werden
**gestrichen** – das ist eine Stärke, kein Mangel:

- ❌ **Freies Platzieren / DTP-Canvas** (Objekte frei ziehen, drehen, Ebenen,
  gruppieren). Auf Touch fummelig und fehleranfällig. Unser vertikaler
  Baustein-Stapel bleibt das Kernmodell – er ist fingerfreundlich und erzeugt
  automatisch sauberes Layout.
- ❌ **Pixelgenaue Werkzeuge** (Lineale, Hilfslinien, Einrasten, freie Formen
  mit Ankerpunkten).
- ❌ **Überladene Profi-Workflows** (Formeleditor, Hyperlinks, Whiteboard-Modus,
  Export nach Word). Nische, hohe Komplexität, geringer Nutzen für unsere
  Zielgruppe.
- ❌ **Großer Schriften-Zoo**. Wir bieten *kuratiert* wenige, dafür die
  richtigen Schriften (siehe Phase 1), statt 15 Varianten zur Auswahl.

Stattdessen investieren wir in **Auto-Magie**: Differenzierung, KI-Assistent,
automatische Arbeitsaufträge, „Aufgaben würfeln" – die Software nimmt der
Lehrkraft Arbeit ab, statt ihr Werkzeuge in die Hand zu geben.

---

## 2. Architektur-Hinweis (warum neue Bausteine günstig sind)

Unser Editor ist genau für additive Bausteine gebaut. Ein neues Aufgabenformat
braucht meist nur Eingriffe an vier Stellen:

| Stelle | Datei | Aufgabe |
|---|---|---|
| Palette | `editor/data.js` → `PALETTE` | Eintrag in linke Leiste |
| Default | `editor/App.jsx` → `makeBlock()` | Start-Inhalt des Bausteins |
| Renderer | `editor/blocks.jsx` → `Block()` | Darstellung auf dem Blatt |
| Eigenschaften | `editor/rightrail.jsx` → `BlockProps()` | Einstellungen (Touch-Controls) |
| ggf. Logik | `editor/utils.js` | Generatoren (z. B. `genWall`, `genWordsearch`) |
| ggf. KI | `editor/ki.jsx` → `schemaPrompt()` + `normalizeBlocks()` | KI darf den Baustein erzeugen |

Die fertigen Touch-Controls (`Stepper`, `Segmented`, `Toggle`, `Section`) in
`rightrail.jsx` sind bereits groß und fingerfreundlich – jedes neue Feld nutzt
sie wieder.

---

## 3. Phasen-Roadmap

### Phase 1 – Kernlücken mit höchstem pädagogischem Wert
*Diese drei Dinge fehlen am schmerzhaftesten und passen perfekt zum
einfachen, Touch-orientierten Modell.*

#### 1.1 Selbstkontrolle-Feld ⭐ Top-Priorität
WC-Alleinstellungsmerkmal: Kinder arbeiten selbstständig. Unser Lösungs-System
existiert schon (`doc.showSolutions`, `data-answer`-Attribute) – wir bauen
darauf auf.

- **Was:** Ein neuer Baustein, der die Lösungszahlen ausgewählter Aufgaben-Felder
  ungeordnet anzeigt (klassische „Rechenschlange"/„Lösungsband"). Kind rechnet,
  hakt gefundene Ergebnisse ab.
- **iPad-Einfachheit:** Beim Einfügen erscheint „Welche Aufgaben sollen geprüft
  werden?" mit antippbaren Mini-Karten der vorhandenen Rechen-Bausteine – kein
  Verlinken per Hand, kein Ziehen.
- **Form:** Start mit einer schlichten Variante (Zahlenband im Rahmen). Deko-Formen
  (Igel/Auto/Stern wie WC) optional später.
- **Technik:** Lösungs-Sammler über vorhandene `data-answer`-Werte; automatische
  Aktualisierung beim „Neue Aufgaben würfeln".

#### 1.2 Nachspur- & Konturschriften + Schreibrichtung
Ohne echte Nachspur-Schrift ist der Editor für Klasse 1/2 (Schreibenlernen)
nicht konkurrenzfähig.

- **Was:** Pro Schreibschrift eine **hohle (Kontur)** und **gepunktete** Variante
  zum Nachspuren; optional Schreibrichtungs-Pfeile (Grundschrift).
- **Wo es wirkt:** `lines`-Baustein (Vorgabewort) und neuer „Wörter
  nachspuren"-Modus.
- **iPad-Einfachheit:** Nur ein zusätzlicher Umschalter „Nachspuren: aus / hohl /
  gepunktet" im bestehenden `FontPicker`. Keine neue Oberfläche.
- **Technik:** Web-Fonts mit Outline/Dotted-Schnitten einbinden (CSP/Font-Hosting
  beachten); Fallback per `-webkit-text-stroke` für Kontur.

#### 1.3 Schriften-Auswahl gezielt erweitern (kuratiert)
- Ergänzen: **Vereinfachte Ausgangsschrift (VA)**, **Lateinische
  Ausgangsschrift (LA)**, **OpenDyslexic** (Barrierefreiheit – passt zum
  Projektauftrag!).
- Bewusst **nicht** alle WC-Schriften – nur die in Niedersachsen/bundesweit
  relevanten. Auswahl bleibt übersichtlich (4–6 statt 15).

---

### Phase 2 – Mathe-Felder (je ein additiver Baustein)
*Hoher Nutzen, geringe UX-Komplexität – passt 1:1 ins Baustein-Modell. Jedes
Feld ist „einfügen → würfeln/einstellen → fertig".*

Sortiert nach Aufwand/Nutzen (oben = zuerst):

1. **Zehner-/Zwanziger-/Hunderterfeld** (Punktefelder) – rein darstellend,
   einfacher Generator. Sehr gefragt in Kl. 1/2.
2. **Hundertertafel** (1–100-Gitter, Felder ausblendbar als Lücke) – analog zu
   bestehender Tabelle.
3. **Zahlenhaus / Zerlegungshaus** (Zahlzerlegung) – kleiner Baustein, Klassiker.
4. **Geld- & Größenrechnen** – Münz-/Scheinbilder + Einheiten (€, m, cm, kg, l);
   nutzt vorhandenen `matharow`-Mechanismus mit neuen Einheiten.
5. **Schriftliche Rechenverfahren** (halbschriftlich + schriftlich +/−/×/÷).
   *Vorarbeit vorhanden:* Logik existiert bereits in
   `zahlen-strasse_Krafft.html` – muss in einen Editor-Baustein überführt werden.
6. **Pfeilbild / Operatorfeld**, **Zahlenkette**, **Magisches Quadrat**,
   **Rechentabelle** (mit Auto-Rechnung) – jeweils klein.
7. Später / optional: **Bruchrechenkreis**, **Geobrett**, **Rechenrad**,
   **Malifant** (eher Kür).

**Zahlenraum:** `matharow` auf größere Räume (bis 1.000.000) und einfache
Kommazahlen erweitern – nur neue Optionen im bestehenden `Segmented`.

---

### Phase 3 – Deutsch-Werkzeuge (leichtgewichtig)
*Meist reine Text-Transformationen → ideal für „auto-magisch", kein neues
Bedienkonzept.*

1. **Schüttelwörter / Sätze schütteln / Wörterschlange** – ein Baustein mit
   Modus-Umschalter; Lehrkraft tippt Wörter/Satz, Rest passiert automatisch.
2. **Selbstlaut-Hervorhebung** – Erweiterung des Silben-Bausteins (zusätzlicher
   Modus), nutzt vorhandene `syllabify`-Logik.
3. **Groß-/Kleinschreibung-Umwandlung** – Option im Text-/Lückentext-Baustein.
4. **Sach- & Lesetext-Vorrat** – kleine kuratierte Sammlung als Schnell-Einfügen
   (kein 1.200-Texte-Anspruch wie WC; lieber 30–50 gute, projektbezogene Texte).
   Gut über den **KI-Assistenten** abdeckbar (Text on demand statt riesige DB).

---

### Phase 4 – Inhalte & Verbreitung
*Steigert den Nutzwert ohne den Editor zu verkomplizieren.*

1. **Clipart-Bibliothek ausbauen** – von 32 auf mehrere hundert kuratierte,
   einheitliche SVGs (Kategorien, Suche existiert schon in `leftrail.jsx`).
   Optional Pixabay-/Openclipart-Anbindung als „mehr Bilder"-Button.
2. **Mehr Vorlagen** – von 5 auf 20–30 fertige Arbeitsblätter (nur Daten in
   `buildTemplate` / `TEMPLATES`). Größter Nutzen pro Aufwand.
3. **Vorlagen teilen (leichte Tauschbörse)** – Export/Import gibt es schon
   (JSON). Eine simple Galerie zum Teilen (ohne Marktplatz/Bezahlung) wäre der
   nächste Schritt, passt zum öffentlichen Bildungsprojekt.

---

### Phase 5 – Interaktiv & digitale Selbstkontrolle (Worksheet-Go!-Idee, vereinfacht)
*Wir haben bereits den interaktiven HTML-Export – darauf aufbauen statt eigene
App bauen.*

1. **Selbstkontrolle in den HTML-Export** integrieren: ausgefüllte Antworten mit
   `data-answer` direkt im Browser prüfen („richtig/falsch"-Feedback, grün/rot).
   Kein App-Store nötig, läuft auf jedem iPad im Browser.
2. **QR-Code zum Arbeitsblatt** – Lehrkraft druckt Blatt, QR führt zur
   interaktiven Online-Version. Niedrigschwellig.
3. *Optional, groß:* Sprechtext/Audio am Arbeitsblatt (Aufnahme + Wiedergabe im
   HTML-Export) – nur wenn Bedarf da ist.

---

## 4. Kurz-Empfehlung für den Start

Reihenfolge mit dem besten Verhältnis aus Nutzen, Einfachheit und iPad-Tauglichkeit:

1. **Selbstkontrolle-Feld** (Phase 1.1) – größter pädagogischer Hebel, baut auf
   Vorhandenem auf.
2. **Nachspur-/Konturschriften** (Phase 1.2) – macht den Editor für Kl. 1/2
   ernsthaft nutzbar.
3. **Zehner-/Zwanziger-/Hunderterfeld + Hundertertafel** (Phase 2) – schnelle,
   sehr gefragte Wins.
4. **Mehr Vorlagen** (Phase 4.2) – minimaler Aufwand, sofort sichtbarer Mehrwert.

Alles bleibt im bestehenden, fingerfreundlichen Baustein-Modell – kein Umbau auf
ein komplexes Canvas-System.

---

### Quellen
- Worksheet Crafter – So funktioniert's: https://worksheetcrafter.com/de/produkt/so-funktionierts
- Worksheet Crafter – Selbstkontrolle: https://worksheetcrafter.com/de/vorschau-selbstkontrolle/
- Worksheet Crafter – Schriftliche Rechenverfahren: https://getschoolcraft.com/usermanual/de/hid_prg_fields_writtenmethods.html
