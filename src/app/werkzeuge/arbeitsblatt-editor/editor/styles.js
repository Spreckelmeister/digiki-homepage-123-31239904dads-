/* ============================================================
   DigiKI Osnabrück — Arbeitsblatt-Editor
   Scoped styles. Alle Editor-Regeln liegen unter `.abe-scope`,
   damit nichts in das globale Website-Layout ausläuft.
   Design-Tokens auf das DigiKI-Designsystem gemappt
   (primary #006363, türkis #00cabe, accent #E8A838).
   Worksheet-Schriften (Andika/Atkinson/Edu NSW) selbst gehostet.
   ============================================================ */

export const EDITOR_CSS = `
/* ---- Worksheet-Schriften (self-hosted, font-src 'self') ---- */
@font-face { font-family:'Andika'; font-style:normal; font-weight:400; font-display:swap;
  src:url('/fonts/arbeitsblatt/andika-400-latin.woff2') format('woff2');
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family:'Andika'; font-style:normal; font-weight:400; font-display:swap;
  src:url('/fonts/arbeitsblatt/andika-400-latinext.woff2') format('woff2');
  unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF; }
@font-face { font-family:'Andika'; font-style:normal; font-weight:700; font-display:swap;
  src:url('/fonts/arbeitsblatt/andika-700-latin.woff2') format('woff2');
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family:'Andika'; font-style:normal; font-weight:700; font-display:swap;
  src:url('/fonts/arbeitsblatt/andika-700-latinext.woff2') format('woff2');
  unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF; }
@font-face { font-family:'Atkinson Hyperlegible'; font-style:normal; font-weight:400; font-display:swap;
  src:url('/fonts/arbeitsblatt/atkinson-400-latin.woff2') format('woff2');
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family:'Atkinson Hyperlegible'; font-style:normal; font-weight:400; font-display:swap;
  src:url('/fonts/arbeitsblatt/atkinson-400-latinext.woff2') format('woff2');
  unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF; }
@font-face { font-family:'Atkinson Hyperlegible'; font-style:normal; font-weight:700; font-display:swap;
  src:url('/fonts/arbeitsblatt/atkinson-700-latin.woff2') format('woff2');
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family:'Atkinson Hyperlegible'; font-style:normal; font-weight:700; font-display:swap;
  src:url('/fonts/arbeitsblatt/atkinson-700-latinext.woff2') format('woff2');
  unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF; }
@font-face { font-family:'Edu NSW ACT Foundation'; font-style:normal; font-weight:400; font-display:swap;
  src:url('/fonts/arbeitsblatt/edunsw-400-latin.woff2') format('woff2');
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family:'Caveat'; font-style:normal; font-weight:400; font-display:swap;
  src:url('/fonts/arbeitsblatt/caveat-400-latin.woff2') format('woff2');
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family:'Caveat'; font-style:normal; font-weight:400; font-display:swap;
  src:url('/fonts/arbeitsblatt/caveat-400-latinext.woff2') format('woff2');
  unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF; }

/* ---- Token-Scope ---- */
.abe-scope {
  /* Brand → DigiKI */
  --teal:        #00cabe;   /* Osnabrück-Türkis – Akzente, Ränder, helle Tints */
  --teal-600:    #00b3a8;
  --teal-700:    #006363;   /* barrierefreies Dunkel-Türkis – Text & gefüllte Buttons */
  --teal-50:     #E6F7F6;
  --teal-100:    #C3ECEA;
  --ink:         #1A1A1A;
  --ink-soft:    #33474A;
  --orange:      #E8A838;   /* DigiKI Warmgelb */
  --orange-600:  #C8901F;
  --orange-50:   #FBF3E1;

  --paper:       #FFFFFF;
  --bg:          #F5F9F9;
  --bg-rail:     #F2F7F7;
  --line:        #DEE8E8;
  --line-soft:   #E9F1F1;
  --muted:       #5C6B6B;
  --muted-2:     #8DA0A0;

  --syl-blue:    #2563EB;
  --syl-red:     #DC2626;
  --syl-green:   #16A34A;
  --syl-purple:  #7C3AED;

  --sol:         #15803D;   /* Lösungs-Grün – AA-konform auf Weiß */

  --lvl-1:       #15803D;   /* Differenzierung – alle weiß-text-tauglich */
  --lvl-2:       #B07D12;
  --lvl-3:       #C0392B;

  --r-sm: 8px; --r: 12px; --r-lg: 18px; --r-xl: 26px;
  --shadow-sm: 0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.05);
  --shadow:    0 2px 6px rgba(15,23,42,.07), 0 8px 24px rgba(15,23,42,.08);
  --shadow-lg: 0 12px 40px rgba(15,23,42,.16);
  --shadow-paper: 0 1px 0 rgba(15,23,42,.04), 0 18px 50px rgba(30,41,59,.14);

  --ui: "Inter", system-ui, -apple-system, sans-serif;

  font-family: var(--ui);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.abe-scope *, .abe-scope *::before, .abe-scope *::after { box-sizing: border-box; }
.abe-scope button { font-family: inherit; cursor: pointer; }
.abe-scope ::selection { background: var(--teal-100); }

/* Worksheet-Inhaltsschriften */
.abe-scope .font-grundschrift { font-family: "Andika", "Inter", sans-serif; }
.abe-scope .font-druck        { font-family: "Atkinson Hyperlegible", "Andika", sans-serif; }
/* Verbundene Schreibschrift: Caveat ist eine echte verbundene Handschrift
   (gleichmäßige Verbindungen). Edu NSW (Foundation) ist unverbunden und
   erzeugt sonst komische Lücken – daher nur als Fallback. Verbindungs-
   Features (Kontextligaturen) aktiviert, kein zusätzliches Tracking. */
.abe-scope .font-schreib      { font-family: "Caveat", "Edu NSW ACT Foundation", cursive; letter-spacing: 0; font-kerning: normal; font-feature-settings: "calt" 1, "liga" 1, "clig" 1; }

/* Scrollbars */
.abe-scope .scroll::-webkit-scrollbar { width: 10px; height: 10px; }
.abe-scope .scroll::-webkit-scrollbar-thumb { background: #C3D2D2; border-radius: 20px; border: 2px solid transparent; background-clip: padding-box; }
.abe-scope .scroll::-webkit-scrollbar-thumb:hover { background: #9FB2B2; background-clip: padding-box; }
.abe-scope .scroll::-webkit-scrollbar-track { background: transparent; }

/* ---- App-Shell: gerahmte Karte mit gebundener Höhe (Standard-Rahmen) ---- */
.abe-scope .app {
  display: grid;
  grid-template-rows: auto 1fr;
  height: clamp(560px, 82vh, 940px);
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
  background: var(--paper);
  box-shadow: var(--shadow);
}
.abe-scope .app-body {
  display: grid;
  grid-template-columns: 264px 1fr 304px;
  min-height: 0;
  position: relative;
}

/* „Vollbild" als CSS-Overlay (kein OS-Vollbild) – nur per Button beendbar,
   keine versehentliche Wischgeste (Apple Pencil) beendet es. */
.abe-scope.abe-fullscreen {
  position: fixed; inset: 0; z-index: 9999;
  width: 100vw; height: 100vh; height: 100dvh;
  background: var(--bg); padding: 0; overflow: hidden;
}
.abe-scope.abe-fullscreen .app {
  height: 100vh; height: 100dvh;
  border: none; border-radius: 0; box-shadow: none;
}

/* Generic helpers */
.abe-scope .row { display: flex; align-items: center; }
.abe-scope .col { display: flex; flex-direction: column; }
.abe-scope .spacer { flex: 1; }
.abe-scope .chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; }

/* Buttons */
.abe-scope .btn {
  display: inline-flex; align-items: center; gap: 8px; justify-content: center;
  border: 1px solid var(--line); background: #fff; color: var(--ink);
  font-weight: 600; font-size: 13.5px; padding: 8px 14px; border-radius: 10px;
  transition: all .15s ease; white-space: nowrap;
}
.abe-scope .btn:hover { border-color: #C3D2D2; box-shadow: var(--shadow-sm); }
.abe-scope .btn:active { transform: translateY(1px); }
.abe-scope .btn:focus-visible { outline: 2px solid var(--teal-700); outline-offset: 2px; }
.abe-scope .btn-ghost { border-color: transparent; background: transparent; }
.abe-scope .btn-ghost:hover { background: var(--line-soft); box-shadow: none; }
.abe-scope .btn-primary {
  background: linear-gradient(180deg, #008981 0%, var(--teal-700) 100%);
  border-color: var(--teal-700); color: #fff;
  box-shadow: 0 1px 0 rgba(255,255,255,.18) inset, 0 2px 8px rgba(0,99,99,.30);
}
.abe-scope .btn-primary:hover { box-shadow: 0 1px 0 rgba(255,255,255,.18) inset, 0 4px 14px rgba(0,99,99,.40); border-color: #004f4f; }
.abe-scope .btn-ai {
  background: linear-gradient(110deg, #008981 0%, var(--teal-700) 62%, #9c6f12 150%);
  border-color: transparent; color: #fff;
  box-shadow: 0 2px 10px rgba(0,99,99,.34);
}
.abe-scope .btn-ai:hover { filter: brightness(1.06); box-shadow: 0 4px 16px rgba(0,99,99,.45); }
.abe-scope .icon-btn {
  width: 34px; height: 34px; padding: 0; border-radius: 9px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid transparent; background: transparent; color: var(--ink-soft);
  transition: all .14s ease;
}
.abe-scope .icon-btn:hover { background: var(--line-soft); color: var(--ink); }
.abe-scope .icon-btn.active { background: var(--teal-50); color: var(--teal-700); }
.abe-scope .icon-btn:focus-visible { outline: 2px solid var(--teal-700); outline-offset: 1px; }

/* Tooltip */
.abe-scope [data-tip] { position: relative; }
.abe-scope [data-tip]:hover::after {
  content: attr(data-tip);
  position: absolute; top: calc(100% + 8px); left: 50%; transform: translateX(-50%);
  background: var(--ink); color: #fff; font-size: 11.5px; font-weight: 600;
  padding: 5px 9px; border-radius: 7px; white-space: nowrap; z-index: 80; pointer-events: none;
  box-shadow: var(--shadow);
}

/* Animations */
@keyframes abe-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes abe-fade { from { opacity: 0; } to { opacity: 1; } }
.abe-scope .pop { animation: abe-pop .28s cubic-bezier(.16,1,.3,1) both; }

/* Palette cards */
.abe-scope .palette-card:hover { border-color: var(--teal) !important; background: var(--teal-50) !important; box-shadow: var(--shadow-sm); }
.abe-scope .palette-card:hover .palette-plus { opacity: 1 !important; }
.abe-scope .palette-card:active { transform: translateY(1px); }

/* Worksheet block hover */
.abe-scope .ws-block:hover { outline-color: var(--teal-100) !important; }

/* KI loading dots */
.abe-scope .ki-dots { width: 30px; height: 8px; display: inline-block;
  background: radial-gradient(circle 3px at 4px 50%, var(--teal-700) 90%, transparent) 0/12px 100% no-repeat,
              radial-gradient(circle 3px at 4px 50%, var(--teal-700) 90%, transparent) 9px/12px 100% no-repeat,
              radial-gradient(circle 3px at 4px 50%, var(--teal-700) 90%, transparent) 18px/12px 100% no-repeat;
  animation: abe-kidots 1s infinite; }
@keyframes abe-kidots { 0%{opacity:.3} 50%{opacity:1} 100%{opacity:.3} }

/* Preview / Schüleransicht */
.abe-scope .app.preview .app-body { grid-template-columns: 1fr !important; }
.abe-scope .app.preview .rail { display: none !important; }
.abe-scope .app.preview .block-toolbar { display: none !important; }
.abe-scope .app.preview .ws-block { outline: none !important; }
.abe-scope .app.preview .ws-block:hover { outline: none !important; }
.abe-scope .app.preview .canvas-area { padding-top: 30px; }

/* Solution banner */
.abe-scope .sol-banner {
  display: inline-flex; align-items: center; gap: 7px;
  background: var(--sol); color: #fff; font-size: 12px; font-weight: 700;
  padding: 5px 12px; border-radius: 999px; box-shadow: 0 2px 8px rgba(21,128,61,.30);
}

/* "Seite hinzufügen" – Karte unter dem Blatt */
.abe-scope .abe-addpage {
  display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  margin-top: 20px; padding: 15px 22px;
  border: 2px dashed var(--teal); border-radius: 14px;
  background: #fff; color: var(--teal-700);
  font-family: var(--ui); font-size: 14px; font-weight: 700;
  transition: background .15s ease, border-color .15s ease, box-shadow .15s ease, transform .1s ease;
}
.abe-scope .abe-addpage:hover { background: var(--teal-50); border-color: var(--teal-700); box-shadow: var(--shadow-sm); }
.abe-scope .abe-addpage:active { transform: translateY(1px); }
.abe-scope .abe-addpage:focus-visible { outline: 2px solid var(--teal-700); outline-offset: 2px; }

/* Seiten-Beschriftung & "Seite entfernen" (im Abstand über jedem Blatt) */
.abe-scope .page-sheet-meta {
  position: absolute; top: -27px; left: 2px;
  font-family: var(--ui); font-size: 12px; font-weight: 700;
  color: var(--muted); user-select: none; pointer-events: none;
}
.abe-scope .abe-removepage {
  position: absolute; top: -30px; right: 0;
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--ui); font-size: 12px; font-weight: 700;
  color: var(--muted); background: transparent; border: none;
  padding: 4px 8px; border-radius: 7px;
  transition: color .14s ease, background .14s ease;
}
.abe-scope .abe-removepage:hover { color: #fff; background: var(--syl-red); }
.abe-scope .abe-removepage:focus-visible { outline: 2px solid var(--teal-700); outline-offset: 2px; }

/* ---- Rails als Grid-Spalten (Desktop) ---- */
.abe-scope .rail { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
.abe-scope .rail > aside { flex: 1 1 auto; min-height: 0; width: 100%; }
.abe-scope .rail-backdrop { display: none; }

/* Mobile-Toggle-Buttons in der Topbar – nur schmal sichtbar */
.abe-scope .abe-mobile-only { display: none !important; }

/* ============================================================
   Responsive: Tablet & Handy → Seitenleisten werden Drawer
   ============================================================ */
@media (max-width: 1100px) {
  .abe-scope .app { height: clamp(520px, 86vh, 940px); }
  .abe-scope .app-body { grid-template-columns: 1fr; }
  .abe-scope .rail {
    position: absolute; top: 0; bottom: 0; z-index: 60;
    width: min(310px, 86vw);
    background: #fff;
    transition: transform .22s cubic-bezier(.16,1,.3,1);
    box-shadow: var(--shadow-lg);
  }
  .abe-scope .rail-left  { left: 0;  border-right: 1px solid var(--line);  transform: translateX(-105%); }
  .abe-scope .rail-right { right: 0; border-left: 1px solid var(--line);   transform: translateX(105%); }
  .abe-scope .rail.open { transform: none; }
  .abe-scope .rail-backdrop { display: block; position: absolute; inset: 0; background: rgba(15,23,42,.42); z-index: 55; animation: abe-fade .18s ease; }
  .abe-scope .abe-mobile-only { display: inline-flex !important; }
  .abe-scope header.abe-topbar { overflow-x: auto; -webkit-overflow-scrolling: touch; }
}

/* ============================================================
   Print: nur das Arbeitsblatt, ohne Website- & Editor-Chrome
   ============================================================ */
@media print {
  /* Falls im (CSS-)Vollbild gedruckt wird: Overlay-Positionierung aufheben. */
  .abe-scope.abe-fullscreen { position: static !important; height: auto !important; overflow: visible !important; }
  /* margin:0 → randloses A4; die Seiten-Ränder kommen aus dem Blatt-Padding
     selbst. Unterdrückt zugleich die Browser-Kopf-/Fußzeilen (URL, Datum). */
  @page { size: A4; margin: 0; }
  /* globale Fixed-Overlays (Cookie-Banner, Bewertungs-FAB …) ausblenden */
  .fixed { display: none !important; }
  .abe-scope .app { display: block !important; height: auto !important; border: none !important; box-shadow: none !important; border-radius: 0 !important; overflow: visible !important; }
  .abe-scope header.abe-topbar, .abe-scope .rail, .abe-scope .rail-backdrop, .abe-scope .block-toolbar, .abe-scope .abe-addpage, .abe-scope .page-sheet-meta, .abe-scope .abe-removepage { display: none !important; }
  .abe-scope .app-body { display: block !important; }
  .abe-scope .canvas-area { overflow: visible !important; padding: 0 !important; display: block !important; }
  .abe-scope .canvas-stack, .abe-scope .page-scale-wrap, .abe-scope .page-stack, .abe-scope .page-sheet-wrap { transform: none !important; width: auto !important; height: auto !important; min-height: 0 !important; display: block !important; gap: 0 !important; }
  /* Jedes Blatt = exakt eine A4-Seite in 1:1-Editor-Geometrie (WYSIWYG):
     794px Breite (=210mm), gleiches Padding, auf eine A4-Höhe geklemmt. */
  .abe-scope .ws-page {
    width: 794px !important;
    height: 1122px !important;
    min-height: 1122px !important;
    max-height: 1122px !important;
    padding: 54px 56px !important;
    margin: 0 auto !important;
    transform: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    overflow: hidden !important;
    background-image: none !important;
    break-inside: avoid;
  }
  /* Jedes weitere Blatt beginnt auf einer neuen Druckseite */
  .abe-scope .page-sheet-wrap:not(:first-child) .ws-page { break-before: page; page-break-before: always; }
  .abe-scope .ws-page.framed { padding: 54px 56px !important; }
  .abe-scope .ws-block { outline: none !important; margin: 0 0 8px !important; break-inside: avoid; }
  .abe-scope .ws-footer { break-inside: avoid; }
}

@media (prefers-reduced-motion: reduce) {
  .abe-scope .pop, .abe-scope .ki-dots, .abe-scope .rail, .abe-scope .rail-backdrop { animation: none !important; transition: none !important; }
}
`;
