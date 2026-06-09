/* ============================================================
   Schriftliches Rechnen — scoped styles (.sr-scope)
   Ästhetik: kariertes Rechenheft (Karopapier), DigiKI-Türkis/Gold.
   Ziffern in Kästchen, Überträge als kleine hochgestellte Zahlen,
   aktuelle Spalte sanft hervorgehoben, „handschriftliches“ Einblenden.
   ============================================================ */

export const SR_CSS = `
.sr-scope {
  --ink:#16302E; --muted:#5A716E; --line:#DCE8E6;
  --teal:#006363; --teal-light:#00cabe; --gold:#E8A838; --gold-deep:#B9851E;
  --paper:#FBFDFB; --karo:rgba(0,99,99,.12);
  --bg-top:#EBF5F3; --bg-bot:#F5F9F9;
  --sr-cell: clamp(34px, 8.2vw, 62px);
  --soft:#CBDCDA;

  position: relative;
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  color: var(--ink);
  background: radial-gradient(120% 80% at 50% -10%, rgba(0,202,190,.10), transparent 60%), linear-gradient(170deg, var(--bg-top), var(--bg-bot));
  border: 1px solid #D5E5E2; border-radius: 26px;
  box-shadow: 0 8px 30px rgba(20,58,55,.08);
  padding: 22px 18px 26px;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.sr-scope *, .sr-scope *::before, .sr-scope *::after { box-sizing: border-box; }
.sr-scope .sr-inner { width: 100%; max-width: 920px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; }

/* Kopf: Titelzeile + Vollbild */
.sr-scope .sr-lead { font-size: clamp(.95rem,2.8vw,1.08rem); color: var(--muted); font-weight: 500; text-align: center; margin: 0; }

/* Reiter (Operationen) */
.sr-scope .sr-tabs { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; background:#fff; border-radius:16px; padding:5px; box-shadow:0 4px 0 var(--soft); }
.sr-scope .sr-tab { font-family: inherit; font-weight: 700; font-size: clamp(.82rem,2.6vw,1rem); border:none; border-radius:12px; padding:11px 6px; cursor:pointer; background:transparent; color:var(--ink); display:inline-flex; align-items:center; justify-content:center; gap:7px; transition: background .15s, color .15s; }
.sr-scope .sr-tab .sr-op { font-weight:800; font-size:1.15em; }
.sr-scope .sr-tab.active { background: var(--teal); color:#fff; }
.sr-scope .sr-tab:focus-visible { outline: 3px solid var(--teal); outline-offset:2px; }

/* Beispiel-Auswahl + eigene Eingabe */
.sr-scope .sr-setup { display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:8px; }
.sr-scope .sr-chip { font-family:inherit; font-weight:600; font-size:.92rem; border:1px solid var(--line); background:#fff; color:var(--ink); border-radius:999px; padding:7px 14px; cursor:pointer; transition: border-color .14s, background .14s, color .14s; font-variant-numeric: tabular-nums; }
.sr-scope .sr-chip:hover { border-color: var(--teal-light); }
.sr-scope .sr-chip.active { background: var(--teal); border-color: var(--teal); color:#fff; }
.sr-scope .sr-custom { display:inline-flex; align-items:center; gap:6px; background:#fff; border:1px solid var(--line); border-radius:12px; padding:5px 8px; }
.sr-scope .sr-custom input { width: 84px; border:none; outline:none; font:inherit; font-weight:700; font-size:1rem; text-align:center; color:var(--ink); font-variant-numeric: tabular-nums; background:transparent; }
.sr-scope .sr-custom .sr-op2 { font-weight:800; color: var(--teal); font-size:1.1rem; }
.sr-scope .sr-go { font-family:inherit; font-weight:700; font-size:.9rem; border:none; border-radius:10px; padding:8px 12px; cursor:pointer; background:var(--teal); color:#fff; }
.sr-scope .sr-go:active { transform: translateY(1px); }
.sr-scope .sr-err { color:#C0392B; font-size:.85rem; font-weight:600; width:100%; text-align:center; }

/* Bühne mit dem Karopapier */
.sr-scope .sr-stage { position: relative; background: var(--paper); border-radius: 18px; box-shadow: inset 0 0 0 1px var(--line), 0 6px 22px rgba(20,58,55,.07);
  padding: 26px 18px; overflow: auto; display:flex; align-items:flex-start; justify-content:center; min-height: 280px; }

/* Das Heftblatt (Karo) – Grid mit Ziffern-Kästchen */
.sr-scope .sr-paper { position: relative;
  background-color: transparent;
  background-image: repeating-linear-gradient(0deg, var(--karo) 0 1px, transparent 1px var(--sr-cell)), repeating-linear-gradient(90deg, var(--karo) 0 1px, transparent 1px var(--sr-cell));
  background-size: var(--sr-cell) var(--sr-cell);
  display: grid; grid-auto-rows: var(--sr-cell);
  border-radius: 6px; padding: 0;
}
.sr-scope .sr-cell { display:flex; align-items:center; justify-content:center;
  font-variant-numeric: tabular-nums lining-nums; font-weight: 700;
  font-size: calc(var(--sr-cell) * 0.62); line-height: 1; color: var(--ink); position: relative; z-index: 2; }
.sr-scope .sr-cell.k-oper, .sr-scope .sr-cell.k-sym { color: var(--muted); font-weight: 700; }
.sr-scope .sr-cell.k-res, .sr-scope .sr-cell.k-quot { color: var(--teal); font-weight: 800; }
.sr-scope .sr-cell.k-aux { color: var(--muted); font-weight: 700; }
.sr-scope .sr-cell.k-auxdown { color: var(--teal-light); font-weight: 800; }
.sr-scope .sr-cell.k-carry, .sr-scope .sr-cell.k-borrow {
  align-items: flex-start; justify-content: center; padding-top: 2px;
  font-size: calc(var(--sr-cell) * 0.34); color: var(--gold-deep); font-weight: 800;
}
/* Subtraktions-Übertrag: klein UNTEN am Subtrahenden */
.sr-scope .sr-cell.k-subborrow {
  align-items: flex-end; justify-content: center; padding-bottom: 1px;
  font-size: calc(var(--sr-cell) * 0.32); color: var(--gold-deep); font-weight: 800; line-height: 1;
}
/* „Schreib“-Einblendung der frisch erscheinenden Ziffer */
.sr-scope .sr-cell.appear { animation: sr-write .55s cubic-bezier(.2,.9,.3,1.2) both; }
@keyframes sr-write {
  0%   { opacity:0; transform: translateY(6px) scale(.6) rotate(-4deg); }
  60%  { opacity:1; transform: translateY(0) scale(1.08) rotate(1deg); }
  100% { opacity:1; transform: none; }
}

/* Rechen-Striche */
.sr-scope .sr-rule { z-index: 3; align-self: start; height: 0; border-top: 3px solid var(--ink); border-radius: 3px; transform-origin: left center; animation: sr-rule .4s ease both; }
@keyframes sr-rule { from { transform: scaleX(0); } to { transform: scaleX(1); } }

/* Gleitende Spalten-/Bereichs-Hervorhebung */
.sr-scope .sr-focus { position:absolute; z-index:1; border-radius: 8px; background: rgba(232,168,56,.16); box-shadow: inset 0 0 0 2px rgba(232,168,56,.5);
  transition: left .4s cubic-bezier(.2,.8,.2,1), top .4s cubic-bezier(.2,.8,.2,1), width .4s cubic-bezier(.2,.8,.2,1), height .4s cubic-bezier(.2,.8,.2,1), opacity .25s; pointer-events:none; }

/* Erklär-Karte */
.sr-scope .sr-explain { display:flex; align-items:center; gap:12px; background:#fff; border:1px solid var(--line); border-left: 5px solid var(--teal); border-radius: 14px; padding: 14px 16px; min-height: 60px; box-shadow: 0 4px 14px rgba(20,58,55,.06); }
.sr-scope .sr-explain .sr-badge { flex:none; width:34px; height:34px; border-radius:10px; background: var(--teal); color:#fff; font-weight:800; display:flex; align-items:center; justify-content:center; font-size:.95rem; }
.sr-scope .sr-explain .sr-etext { font-size: clamp(.98rem,2.7vw,1.12rem); font-weight:600; line-height:1.4; }
.sr-scope .sr-explain.sr-fade { animation: sr-efade .3s ease both; }
@keyframes sr-efade { from { opacity:.3; transform: translateY(4px);} to { opacity:1; transform:none; } }

/* Fortschritt */
.sr-scope .sr-steps-track { height:8px; border-radius:999px; background:#E3EDEB; overflow:hidden; }
.sr-scope .sr-steps-fill { height:100%; background: linear-gradient(90deg, var(--teal), var(--teal-light)); border-radius:999px; transition: width .4s cubic-bezier(.2,.9,.3,1.2); }

/* Steuerleiste */
.sr-scope .sr-controls { display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:10px; }
.sr-scope .sr-btn { font-family:inherit; font-weight:700; font-size:1rem; border:none; border-radius:14px; padding:12px 18px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; background:#fff; color:var(--ink); box-shadow:0 4px 0 var(--soft); transition: transform .08s, box-shadow .08s, filter .12s; }
.sr-scope .sr-btn:active { transform: translateY(3px); box-shadow:0 1px 0 var(--soft); }
.sr-scope .sr-btn:focus-visible { outline:3px solid var(--teal); outline-offset:2px; }
.sr-scope .sr-btn:disabled { opacity:.4; cursor:default; }
.sr-scope .sr-btn-play { background: var(--teal); color:#fff; box-shadow:0 4px 0 #00403e; min-width: 150px; justify-content:center; }
.sr-scope .sr-btn-play:active { box-shadow:0 1px 0 #00403e; }
.sr-scope .sr-icon-btn { padding:12px; min-width:48px; justify-content:center; }
.sr-scope .sr-speed { display:inline-flex; align-items:center; gap:6px; font-size:.85rem; color:var(--muted); font-weight:600; }
.sr-scope .sr-speed select { font:inherit; font-weight:700; border:1px solid var(--line); border-radius:10px; padding:8px 8px; background:#fff; color:var(--ink); }

/* Vollbild + Arbeitsblatt-Knöpfe oben rechts */
.sr-scope .sr-top-actions { position:absolute; top:14px; right:14px; display:flex; gap:8px; z-index:20; }
.sr-scope .sr-mini { font-family:inherit; font-weight:700; font-size:.85rem; border:none; border-radius:12px; padding:9px 12px; cursor:pointer; background:#fff; color:var(--muted); box-shadow:0 3px 0 var(--soft); display:inline-flex; align-items:center; gap:6px; }
.sr-scope .sr-mini:active { transform: translateY(2px); box-shadow:0 1px 0 var(--soft); }
.sr-scope .sr-mini.sr-accent { background: var(--gold); color:#3A2A06; box-shadow:0 3px 0 var(--gold-deep); }
.sr-scope .sr-mini:focus-visible { outline:3px solid var(--teal); outline-offset:2px; }

/* „Vollbild“ als CSS-Overlay (kein OS-Vollbild → kein versehentliches Wisch-Beenden) */
.sr-scope.sr-fullscreen { position: fixed; inset:0; z-index:9999; width:100vw; height:100vh; height:100dvh; max-height:100dvh; border-radius:0; border:none; box-shadow:none; overflow:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; padding: 26px 18px; }
.sr-scope.sr-fullscreen .sr-inner { max-width: 1100px; }
.sr-scope.sr-fullscreen { --sr-cell: clamp(40px, 6vw, 78px); }

@media (prefers-reduced-motion: reduce) {
  .sr-scope .sr-cell.appear, .sr-scope .sr-rule, .sr-scope .sr-explain.sr-fade { animation: none; }
  .sr-scope .sr-focus, .sr-scope .sr-steps-fill { transition: none; }
}

/* ============================================================
   Arbeitsblatt (Druck): nur das Übungsblatt zeigen
   ============================================================ */
.sr-scope .sr-worksheet { display: none; }
@media print {
  @page { size: A4; margin: 14mm; }
  html, body { background:#fff !important; min-height:0 !important; height:auto !important; }
  body > header, body > footer, .skip-link, .fixed { display:none !important; }
  /* Tool-UI ausblenden, nur das Arbeitsblatt drucken */
  body .sr-scope > *:not(.sr-worksheet) { display:none !important; }
  body .sr-scope { position:static !important; padding:0 !important; border:none !important; box-shadow:none !important; background:#fff !important; overflow:visible !important; }
  /* print-color-adjust: exact → das Karo (Hintergrund) wird wirklich gedruckt */
  body .sr-scope .sr-worksheet { display:block !important; color:#111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* Getrennte Downloads: je nach Modus NUR Aufgaben ODER NUR Lösungen drucken */
  body .sr-scope .sr-worksheet.print-tasks .sr-ws-solpage { display:none !important; }
  body .sr-scope .sr-worksheet.print-solutions .sr-ws-taskpage { display:none !important; }
}

/* Sichtbar nur während des Drucks – Aufbau des Arbeitsblatts */
.sr-ws-head { display:flex; align-items:flex-end; justify-content:space-between; border-bottom:2px solid #111; padding-bottom:8px; margin-bottom:6px; }
.sr-ws-title { font-size:20px; font-weight:800; margin:0; }
.sr-ws-sub { font-size:12px; color:#444; }
.sr-ws-name { font-size:12px; color:#333; }
.sr-ws-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:14px 18px; margin-top:14px; }
.sr-ws-item { break-inside: avoid; border:1px solid #ccc; border-radius:8px; padding:10px 12px 14px; }
.sr-ws-num { font-size:11px; color:#777; font-weight:700; }
.sr-ws-task { font-size:20px; font-weight:700; font-variant-numeric: tabular-nums; margin:4px 0 6px; }
/* Kariertes Arbeitsfeld (für die schriftliche Rechnung). Wird per
   print-color-adjust auch wirklich gedruckt. */
.sr-ws-karo {
  height:128px; border-radius:6px;
  background-color:#fff;
  background-image: repeating-linear-gradient(0deg,#bcd2cf 0 1px,transparent 1px 24px), repeating-linear-gradient(90deg,#bcd2cf 0 1px,transparent 1px 24px);
  background-size:24px 24px; border:1.5px solid #9fbab6;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.sr-ws-foot { margin-top:14px; font-size:11px; color:#666; display:flex; justify-content:space-between; }
.sr-ws-sol { columns: 3; font-size:13px; font-variant-numeric: tabular-nums; }
.sr-ws-sol div { break-inside: avoid; padding:3px 0; }
`;
