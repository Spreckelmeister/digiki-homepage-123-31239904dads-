/* ============================================================
   Zahlen-Straße — scoped styles.
   Alle Regeln unter `.zs-scope`, damit der verspielte Kinder-Look
   nicht ins DigiKI-Layout ausläuft. Fredoka wird selbst gehostet
   (CSP: font-src 'self'). Bewusst kindgerechte Ästhetik – Zielnutzer
   sind Grundschulkinder am Tablet/Smartboard.
   ============================================================ */

export const ZS_CSS = `
@font-face {
  font-family: 'Fredoka'; font-style: normal; font-weight: 400 700; font-display: swap;
  src: url('/fonts/zahlen-strasse/fredoka-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Fredoka'; font-style: normal; font-weight: 400 700; font-display: swap;
  src: url('/fonts/zahlen-strasse/fredoka-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

.zs-scope {
  /* Spielerische Palette (mit DigiKI harmonierend: Türkis-Grün + Warmton) */
  --bg-top:#EAF2FF; --bg-bot:#F7FBFF;
  --ink:#1D2D44; --road:#DCE7F2; --center:#A3B6CC;
  --good:#1FAE8E; --bad:#E8505B;
  --accent:#FF8C42; --accent-dark:#F06D1F; --gold:#FFC53D;
  --card:#FFFFFF; --shadow:0 10px 30px rgba(29,45,68,.12);

  position: relative;
  font-family: "Fredoka", system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--ink);
  background: linear-gradient(170deg, var(--bg-top), var(--bg-bot));
  border: 1px solid #D8E4F2;
  border-radius: 26px;
  box-shadow: 0 8px 30px rgba(29,45,68,.08);
  display: flex; flex-direction: column; align-items: center;
  padding: 26px 16px 30px;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.zs-scope *, .zs-scope *::before, .zs-scope *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

.zs-scope .sub { font-size: clamp(.95rem, 3vw, 1.1rem); color: #5a6b82; margin: 0 0 4px; font-weight: 500; text-align: center; }

.zs-scope .app { width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: 14px; margin-top: 6px; }

/* Zahlen-Auswahl */
.zs-scope .picker { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.zs-scope .num-btn {
  position: relative; overflow: visible;
  font-family: inherit; font-weight: 600; font-size: clamp(1.1rem, 5vw, 1.5rem);
  border: none; border-radius: 16px; padding: 12px 0; cursor: pointer;
  background: #fff; color: var(--ink); box-shadow: 0 4px 0 #cdd9e8;
  transition: transform .08s, box-shadow .08s, background .15s;
}
.zs-scope .num-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #cdd9e8; }
.zs-scope .num-btn.active { background: var(--accent); color: #fff; box-shadow: 0 4px 0 var(--accent-dark); }
.zs-scope .num-btn:focus-visible { outline: 3px solid #3a86ff; outline-offset: 2px; }
.zs-scope .num-btn .nf { display: block; line-height: 1; }
.zs-scope .num-btn.s-red:not(.active) { background: #FFE9EC; box-shadow: 0 4px 0 #F3B6BD; }
.zs-scope .num-btn.s-yellow:not(.active) { background: #FFF2CF; box-shadow: 0 4px 0 #EBCB7B; }
.zs-scope .num-btn.s-green:not(.active) { background: #DFF6EE; box-shadow: 0 4px 0 #97DFC9; }
.zs-scope .num-btn.mastered:not(.active) { background: #C9F0E2; box-shadow: 0 4px 0 #6FD0B4; }
.zs-scope .num-btn .chk {
  position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 50%;
  background: var(--good); color: #fff; font-size: .78rem; font-weight: 700; line-height: 20px; text-align: center;
  box-shadow: 0 2px 5px rgba(31,174,142,.45); display: none;
}
.zs-scope .num-btn.mastered .chk { display: block; }
.zs-scope .num-btn .pips { position: absolute; left: 0; right: 0; bottom: 4px; display: flex; gap: 3px; justify-content: center; pointer-events: none; }
.zs-scope .num-btn .pips i { width: 5px; height: 5px; border-radius: 50%; background: rgba(29,45,68,.20); }
.zs-scope .num-btn .pips i.on { background: var(--good); }
.zs-scope .num-btn.active .pips i { background: rgba(255,255,255,.5); }
.zs-scope .num-btn.active .pips i.on { background: #fff; }

/* Spielfeld */
.zs-scope .stage {
  position: relative; width: 100%;
  height: clamp(290px, 54vh, 460px);
  background: var(--card); border-radius: 24px; box-shadow: var(--shadow);
  overflow: hidden;
}
.zs-scope canvas { display: block; width: 100%; height: 100%; touch-action: none; }

/* Bedienleiste */
.zs-scope .controls { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.zs-scope .btn {
  font-family: inherit; font-weight: 600; font-size: 1.05rem;
  border: none; border-radius: 16px; padding: 13px 18px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 8px; flex: 1 1 auto; justify-content: center;
  transition: transform .08s, box-shadow .08s, filter .12s; min-width: 120px;
}
.zs-scope .btn:active { transform: translateY(3px); }
.zs-scope .btn:focus-visible { outline: 3px solid #3a86ff; outline-offset: 2px; }
.zs-scope .btn-ghost { background: #fff; color: var(--ink); box-shadow: 0 4px 0 #cdd9e8; }
.zs-scope .btn-ghost:active { box-shadow: 0 1px 0 #cdd9e8; }
.zs-scope .btn-go { background: var(--good); color: #fff; box-shadow: 0 4px 0 #16806a; }
.zs-scope .btn-go:active { box-shadow: 0 1px 0 #16806a; }

/* Genauigkeits-Regler */
.zs-scope .tol { background: #fff; border-radius: 18px; padding: 12px 16px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 6px; }
.zs-scope .tol-row { display: flex; align-items: center; gap: 12px; }
.zs-scope .tol-label { font-weight: 600; white-space: nowrap; }
.zs-scope .tol-ends { display: flex; justify-content: space-between; font-size: .85rem; color: #6b7b91; font-weight: 500; }
.zs-scope input[type=range] { flex: 1; accent-color: var(--accent); height: 26px; }

/* Ergebnis-Karte (Toast) */
.zs-scope .toast {
  position: fixed; left: 50%; bottom: 22px;
  transform: translateX(-50%) translateY(160%);
  background: var(--card); border-radius: 22px; box-shadow: var(--shadow);
  padding: 16px 22px; text-align: center; max-width: 90vw; width: 360px;
  transition: transform .35s cubic-bezier(.2,.9,.3,1.2); z-index: 30;
}
.zs-scope .toast.show { transform: translateX(-50%) translateY(0); }
.zs-scope .toast .stars { font-size: 2rem; letter-spacing: .15em; margin-bottom: 4px; }
.zs-scope .toast .star-on { color: var(--gold); }
.zs-scope .toast .star-off { color: #dde5ee; }
.zs-scope .toast .msg { font-weight: 600; font-size: 1.15rem; margin: 2px 0 4px; }
.zs-scope .toast .hint { font-size: .95rem; color: #5a6b82; font-weight: 500; }

.zs-scope .confetti-layer { position: fixed; inset: 0; pointer-events: none; z-index: 40; overflow: hidden; }
.zs-scope .conf { position: absolute; font-size: 1.4rem; will-change: transform, opacity; }
@keyframes zs-pop {
  0%   { transform: translateY(0) rotate(0) scale(.4); opacity: 1; }
  100% { transform: translateY(var(--fy)) translateX(var(--fx)) rotate(var(--fr)) scale(1); opacity: 0; }
}

.zs-scope .help { font-size: .85rem; color: #7587a0; text-align: center; max-width: 520px; margin-top: 2px; font-weight: 500; }

/* Fortschritts-Leiste */
.zs-scope .topbar { display: flex; align-items: center; gap: 10px; width: 100%; max-width: 520px; }
.zs-scope .prog { flex: 1; display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.zs-scope .prog-track { height: 10px; border-radius: 999px; background: #E3EAF4; overflow: hidden; box-shadow: inset 0 1px 2px rgba(29,45,68,.12); }
.zs-scope .prog-fill { height: 100%; width: 0; border-radius: 999px; background: linear-gradient(90deg, var(--good), #37C9A8); transition: width .45s cubic-bezier(.2,.9,.3,1.2); }
.zs-scope .prog-text { font-size: .82rem; font-weight: 600; color: #5a6b82; }
.zs-scope .reset-all {
  font-family: inherit; font-weight: 600; font-size: .85rem;
  border: none; border-radius: 12px; padding: 9px 12px; cursor: pointer; white-space: nowrap;
  background: #fff; color: #5a6b82; box-shadow: 0 3px 0 #cdd9e8; transition: transform .08s, box-shadow .08s;
}
.zs-scope .reset-all:active { transform: translateY(2px); box-shadow: 0 1px 0 #cdd9e8; }
.zs-scope .reset-all:focus-visible { outline: 3px solid #3a86ff; outline-offset: 2px; }

/* Vollbild-Schalter (oben rechts) – ideal fürs Smartboard/Tablet */
.zs-scope .zs-fs {
  position: absolute; top: 14px; right: 14px; z-index: 20;
  font-family: inherit; font-weight: 600; font-size: .85rem;
  border: none; border-radius: 12px; padding: 9px 12px; cursor: pointer;
  background: #fff; color: #5a6b82; box-shadow: 0 3px 0 #cdd9e8;
  display: inline-flex; align-items: center; gap: 6px;
  transition: transform .08s, box-shadow .08s;
}
.zs-scope .zs-fs:active { transform: translateY(2px); box-shadow: 0 1px 0 #cdd9e8; }
.zs-scope .zs-fs:focus-visible { outline: 3px solid #3a86ff; outline-offset: 2px; }

/* Vollbild: Spielfläche füllt den Bildschirm, vertikal zentriert */
.zs-scope:fullscreen { border-radius: 0; border: none; box-shadow: none; justify-content: center; min-height: 100vh; padding: 26px 16px; }
.zs-scope:-webkit-full-screen { border-radius: 0; border: none; box-shadow: none; justify-content: center; min-height: 100vh; padding: 26px 16px; }

@media (prefers-reduced-motion: reduce) {
  .zs-scope .btn, .zs-scope .num-btn, .zs-scope .toast, .zs-scope .prog-fill, .zs-scope .reset-all, .zs-scope .zs-fs { transition: none; }
}
`;
