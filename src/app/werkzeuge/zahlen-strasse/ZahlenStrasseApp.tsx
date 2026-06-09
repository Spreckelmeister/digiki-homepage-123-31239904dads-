"use client";

import { useEffect, useRef, useState } from "react";
import { ZS_CSS } from "./styles";
import { initZahlenStrasse } from "./game";

/**
 * Hostet das Vanilla-JS-Canvas-Spiel „Zahlen-Straße". Die Spiellogik
 * (Zeichnen, Prüfen, Fortschritt) läuft imperativ über initZahlenStrasse()
 * auf dem Scope-Element – React rendert nur die Hülle einmalig.
 */
export default function ZahlenStrasseApp() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cleanup = initZahlenStrasse(root);
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  // „Vollbild" bewusst als CSS-Overlay (fixe Position), NICHT über die
  // Fullscreen-API: iPadOS beendet echtes Vollbild sonst per Wischgeste
  // (z. B. beim Malen mit dem Apple Pencil). So ist der Modus ausschließlich
  // über den Button beendbar. Solange aktiv, wird der Seiten-Scroll gesperrt.
  useEffect(() => {
    if (!fullscreen) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [fullscreen]);

  const toggleFullscreen = () => setFullscreen((v) => !v);

  return (
    <div className={"zs-scope" + (fullscreen ? " zs-fullscreen" : "")} ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: ZS_CSS }} />

      <button
        type="button"
        className="zs-fs"
        onClick={toggleFullscreen}
        aria-pressed={fullscreen}
        aria-label={fullscreen ? "Vollbild verlassen" : "Vollbild"}
      >
        {fullscreen ? "⤡ Beenden" : "⛶ Vollbild"}
      </button>

      <p className="sub">Fahre nach – bleib auf der Straße! 🚗</p>

      <div className="app">
        <div className="zs-tabs" id="modeTabs" role="tablist" aria-label="Übungsart" />

        <div className="topbar">
          <div className="prog">
            <div className="prog-track">
              <div className="prog-fill" id="progFill" />
            </div>
            <span className="prog-text" id="progText" aria-live="polite">
              0/10 gemeistert
            </span>
          </div>
          <button
            className="reset-all"
            id="btnResetAll"
            type="button"
            title="Fortschritt löschen und für ein neues Kind neu starten"
          >
            🧒 Neues Kind
          </button>
        </div>

        <div className="picker" id="picker" role="group" aria-label="Zahl auswählen" />

        <div className="stage">
          <canvas id="cv" aria-label="Zeichenfläche zum Nachfahren der Zahl" />
        </div>

        <div className="controls">
          <button className="btn btn-ghost" id="btnClear" type="button">
            ↺ Nochmal
          </button>
          <button className="btn btn-ghost" id="btnShow" type="button">
            👀 Zeig mir
          </button>
          <button className="btn btn-go" id="btnCheck" type="button">
            ✓ Prüfen
          </button>
        </div>

        <div className="tol">
          <div className="tol-row">
            <span className="tol-label">Genauigkeit</span>
            <input
              type="range"
              id="tol"
              min="6"
              max="18"
              step="1"
              defaultValue="12"
              aria-label="Erlaubte Abweichung einstellen"
            />
          </div>
          <div className="tol-ends">
            <span>leichter (breite Straße)</span>
            <span>genauer (schmal)</span>
          </div>
        </div>

        <p className="help">
          Oben umschalten zwischen <strong>Zahlen</strong>, <strong>Großbuchstaben (ABC)</strong>{" "}
          und <strong>Kleinbuchstaben (abc)</strong> – jeder Bereich hat seinen eigenen
          Fortschritt. Für die Lehrkraft: Der Regler legt die Start-Breite der Straße
          fest. Nach „✓ Prüfen" färbt sich das Feld: 🟥 viel daneben · 🟨 fast · 🟩
          richtig. Jedes „Perfekt" macht die Straße eine Stufe schmaler (●●●) – nach
          drei Stufen ist das Zeichen gemeistert ✓ und oben abgehakt. „Neues Kind"
          setzt den Fortschritt zurück.
        </p>
      </div>

      <div className="toast" id="toast" role="status" aria-live="polite">
        <div className="stars" id="stars" />
        <div className="msg" id="toastMsg" />
        <div className="hint" id="toastHint" />
      </div>
      <div className="confetti-layer" id="conf" />
    </div>
  );
}
