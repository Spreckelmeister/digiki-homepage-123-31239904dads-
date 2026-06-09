import React from "react";
import { Icon } from "./icons";

/* ============================================================
   Top bar — brand, document title, actions
   ============================================================ */
function BrandMark() {
  // Offizielles DigiKI-Osnabrück-Logo (v5), inline – skaliert auf Kopfleistenhöhe.
  return (
    <svg viewBox="12 44 394 162" height="42" style={{ display: "block", userSelect: "none" }} aria-label="DigiKI Osnabrück">
      <defs>
        <linearGradient id="dkiPill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#35C4BA" />
          <stop offset="100%" stopColor="#28B5AB" />
        </linearGradient>
      </defs>
      <rect x="215" y="58" width="148" height="96" rx="48" fill="url(#dkiPill)" />
      <text x="20" y="140" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="95" fill="#1E293B">D</text>
      <rect x="95" y="88" width="20" height="48" rx="2" fill="#1E293B" />
      <circle cx="105" cy="70" r="2.5" fill="#35C4BA" />
      <path d="M97,62 A11,11 0 0,1 113,62" fill="none" stroke="#35C4BA" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M93,55 A17,17 0 0,1 117,55" fill="none" stroke="#35C4BA" strokeWidth="2.5" strokeLinecap="round" />
      <text x="118" y="140" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="95" fill="#1E293B">g</text>
      <rect x="183" y="88" width="20" height="48" rx="2" fill="#1E293B" />
      <rect x="181" y="54" width="24" height="24" rx="3.5" fill="#35C4BA" />
      <rect x="186" y="59" width="14" height="14" rx="1.5" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.55" />
      <line x1="188" y1="54" x2="188" y2="49" stroke="#35C4BA" strokeWidth="2" strokeLinecap="round" />
      <line x1="198" y1="54" x2="198" y2="49" stroke="#35C4BA" strokeWidth="2" strokeLinecap="round" />
      <line x1="188" y1="78" x2="188" y2="83" stroke="#35C4BA" strokeWidth="2" strokeLinecap="round" />
      <line x1="198" y1="78" x2="198" y2="83" stroke="#35C4BA" strokeWidth="2" strokeLinecap="round" />
      <line x1="181" y1="61" x2="176" y2="61" stroke="#35C4BA" strokeWidth="2" strokeLinecap="round" />
      <line x1="181" y1="71" x2="176" y2="71" stroke="#35C4BA" strokeWidth="2" strokeLinecap="round" />
      <line x1="205" y1="61" x2="210" y2="61" stroke="#35C4BA" strokeWidth="2" strokeLinecap="round" />
      <line x1="205" y1="71" x2="210" y2="71" stroke="#35C4BA" strokeWidth="2" strokeLinecap="round" />
      <text x="289" y="140" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="95" fill="#FFFFFF" letterSpacing="-2" textAnchor="middle">KI</text>
      <text x="289" y="192" fontFamily="Arial, Helvetica, sans-serif" fontWeight="600" fontSize="26" fill="#E8921A" textAnchor="middle" letterSpacing="6">OSNABRÜCK</text>
    </svg>
  );
}

function TopBar({ doc, onTitle, undo, redo, canUndo, canRedo, zoom, setZoom, grid, setGrid, onOpenKI, onPrint, saved, solutions, onToggleSolutions, preview, setPreview, onNew, onOpen, onSave, onExportHTML, onToggleLeft, onToggleRight }) {
  return (
    <header className="abe-topbar" style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 56, padding: "8px 14px", background: "#fff", borderBottom: "1px solid var(--line)", zIndex: 30 }}>
      {/* Mobile/Tablet: Schubladen-Schalter (auf Desktop ausgeblendet) */}
      <button className="icon-btn abe-mobile-only" data-tip="Bausteine" aria-label="Bausteine öffnen" onClick={onToggleLeft} style={{ flex: "none" }}><Icon name="layers" size={19} /></button>

      {/* Document title */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
        <input value={doc.title} onChange={e => onTitle(e.target.value)}
               style={{ border: "1px solid transparent", borderRadius: 7, padding: "2px 7px", margin: "-2px -7px",
                        font: "inherit", fontWeight: 700, fontSize: 14.5, color: "var(--ink)", background: "transparent",
                        width: Math.min(320, Math.max(120, doc.title.length * 9 + 24)) }}
               onFocus={e => e.target.style.background = "var(--line-soft)"}
               onBlur={e => e.target.style.background = "transparent"} />
        <div style={{ fontSize: 11.5, color: "var(--muted)", paddingLeft: 1, marginTop: -1 }}>
          {doc.subject} · {saved ? "Gespeichert" : "Wird gespeichert…"}
        </div>
      </div>

      {/* File actions */}
      <div style={{ width: 1, height: 26, background: "var(--line)" }} />
      <div style={{ display: "flex", gap: 2 }}>
        <button className="icon-btn" data-tip="Neues Blatt" onClick={onNew}><Icon name="docnew" size={18} /></button>
        <button className="icon-btn" data-tip="Datei öffnen (.json)" onClick={onOpen}><Icon name="folder" size={18} /></button>
        <button className="icon-btn" data-tip="Als Datei speichern (.json)" onClick={onSave}><Icon name="save" size={18} /></button>
      </div>

      <div className="spacer" />

      {/* Undo / redo */}
      <div style={{ display: "flex", gap: 2 }}>
        <button className="icon-btn" data-tip="Rückgängig" disabled={!canUndo} onClick={undo}
                style={{ opacity: canUndo ? 1 : .35 }}><Icon name="undo" size={18} /></button>
        <button className="icon-btn" data-tip="Wiederholen" disabled={!canRedo} onClick={redo}
                style={{ opacity: canRedo ? 1 : .35 }}><Icon name="redo" size={18} /></button>
      </div>

      {/* Zoom */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, background: "var(--bg-rail)", borderRadius: 9, padding: 2 }}>
        <button className="icon-btn" data-tip="Verkleinern" onClick={() => setZoom(z => Math.max(.5, +(z - .1).toFixed(2)))}><Icon name="zoomout" size={17} /></button>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)", width: 42, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
        <button className="icon-btn" data-tip="Vergrößern" onClick={() => setZoom(z => Math.min(1.6, +(z + .1).toFixed(2)))}><Icon name="zoomin" size={17} /></button>
      </div>

      <button className={"icon-btn" + (grid ? " active" : "")} data-tip="Raster" onClick={() => setGrid(g => !g)}><Icon name="grid" size={17} /></button>

      <div style={{ width: 1, height: 26, background: "var(--line)" }} />

      {/* Lösungen toggle */}
      <button onClick={onToggleSolutions} data-tip="Antworten ein-/ausblenden"
        style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "1px solid " + (solutions ? "var(--sol)" : "var(--line)"),
          background: solutions ? "var(--sol)" : "#fff", color: solutions ? "#fff" : "var(--ink-soft)",
          borderRadius: 10, padding: "8px 12px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", transition: "all .14s ease" }}>
        <Icon name="key" size={16} /> Lösungen
      </button>

      <button className="icon-btn" data-tip="Schüler-Vorschau" onClick={() => setPreview(p => !p)}><Icon name="eye" size={18} /></button>

      <div style={{ width: 1, height: 26, background: "var(--line)" }} />

      <button className="btn" onClick={onExportHTML} data-tip="Als interaktives HTML zum Ausfüllen exportieren"><Icon name="share" size={16} /> Interaktiv</button>
      <button className="btn" onClick={onPrint} data-tip="Drucken oder als PDF speichern"><Icon name="print" size={17} /> Drucken / PDF</button>
      <button className="btn-ai btn" onClick={onOpenKI}><Icon name="sparkle" size={17} /> KI-Assistent</button>

      {/* Mobile/Tablet: Eigenschaften-Leiste öffnen (auf Desktop ausgeblendet) */}
      <div className="abe-mobile-only" style={{ width: 1, height: 26, background: "var(--line)", flex: "none" }} />
      <button className="icon-btn abe-mobile-only" data-tip="Eigenschaften" aria-label="Eigenschaften öffnen" onClick={onToggleRight} style={{ flex: "none" }}><Icon name="settings" size={19} /></button>
    </header>
  );
}
export { TopBar, BrandMark };
