"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SR_CSS } from "./styles";
// math.js ist bewusst untypisiert (eigene Rechen-Engine).
import { buildSolution } from "./math";

type Op = "+" | "−" | "·" | ":";

const OPS: { op: Op; name: string }[] = [
  { op: "+", name: "Addition" },
  { op: "−", name: "Subtraktion" },
  { op: "·", name: "Multiplikation" },
  { op: ":", name: "Division" },
];

const EXAMPLES: Record<Op, [number, number][]> = {
  "+": [[367, 558], [4825, 1396], [28, 57]],
  "−": [[623, 358], [5002, 1847], [84, 29]],
  "·": [[458, 9], [34, 27], [256, 7]],
  ":": [[156, 4], [7384, 6], [945, 7]],
};

const SPEEDS = [
  { label: "Sehr langsam", ms: 4200 },
  { label: "Langsam", ms: 3000 },
  { label: "Normal", ms: 2100 },
  { label: "Zügig", ms: 1300 },
];

const rint = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;

// Übungsaufgaben für das Arbeitsblatt erzeugen (passend zur Operation)
function genProblem(op: Op): [number, number] {
  if (op === "+") return [rint(120, 8999), rint(120, 8999)];
  if (op === "−") { const a = rint(300, 9899); const b = rint(120, a - 50); return [a, b]; }
  if (op === "·") return [rint(13, 199), rint(3, 29)];
  // Division: meist glatt, manchmal mit Rest
  const b = rint(2, 9); const q = rint(14, 320); const extra = Math.random() < 0.4 ? rint(0, b - 1) : 0;
  return [b * q + extra, b];
}

export default function SchriftlichesRechnenApp() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [op, setOp] = useState<Op>("+");
  const [pair, setPair] = useState<[number, number]>(EXAMPLES["+"][0]);
  const [customA, setCustomA] = useState("");
  const [customB, setCustomB] = useState("");
  const [err, setErr] = useState("");
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(3000);
  const [fullscreen, setFullscreen] = useState(false);
  const [ws, setWs] = useState<{ a: number; b: number; r: string }[] | null>(null);

  const sol = useMemo(() => buildSolution(op, pair[0], pair[1]), [op, pair]);
  const N = sol.steps.length;

  // Bei neuer Aufgabe: zurück auf Anfang
  useEffect(() => { setPhase(0); setPlaying(false); }, [sol]);

  // Auto-Abspielen
  useEffect(() => {
    if (!playing) return;
    if (phase >= N) { setPlaying(false); return; }
    const t = setTimeout(() => setPhase((p) => Math.min(N, p + 1)), speed);
    return () => clearTimeout(t);
  }, [playing, phase, N, speed]);

  // „Vollbild“ als CSS-Overlay – Seiten-Scroll sperren
  useEffect(() => {
    if (!fullscreen) return;
    const pb = document.body.style.overflow, ph = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden"; document.documentElement.style.overflow = "hidden";
    return () => { document.body.style.overflow = pb; document.documentElement.style.overflow = ph; };
  }, [fullscreen]);

  const focus = phase >= 1 ? sol.steps[phase - 1].focus : null;
  const explainText = phase === 0
    ? "Schau dir die Aufgabe an. Tippe auf ▶ Abspielen – dann rechnen wir Schritt für Schritt."
    : phase >= N
      ? `Fertig! ${sol.a} ${op} ${sol.b} = ${sol.result}.`
      : sol.steps[phase - 1].text;

  const pickOp = (o: Op) => { setOp(o); setPair(EXAMPLES[o][0]); setErr(""); };
  const showCustom = () => {
    const a = parseInt(customA, 10), b = parseInt(customB, 10);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) { setErr("Bitte zwei ganze Zahlen eingeben."); return; }
    if (String(a).length > 6 || String(b).length > 6) { setErr("Bitte höchstens 6-stellige Zahlen."); return; }
    if (op === ":" && b === 0) { setErr("Durch 0 kann man nicht teilen."); return; }
    if (op === "·" && (a === 0 || b === 0)) { setErr("Bitte Zahlen größer als 0."); return; }
    setErr(""); setPair([a, b]);
  };

  const atEnd = phase >= N;
  const playPause = () => { if (atEnd) { setPhase(0); setPlaying(true); } else setPlaying((p) => !p); };

  const downloadWorksheet = () => {
    const problems = Array.from({ length: 9 }, () => {
      const [a, b] = genProblem(op);
      return { a, b, r: buildSolution(op, a, b).result };
    });
    setWs(problems);
    setTimeout(() => window.print(), 60);
  };

  const toggleFs = () => setFullscreen((v) => !v);

  const cell = "var(--sr-cell)";
  const opName = OPS.find((o) => o.op === op)?.name || "";

  return (
    <div className={"sr-scope" + (fullscreen ? " sr-fullscreen" : "")} ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: SR_CSS }} />

      <div className="sr-top-actions">
        <button type="button" className="sr-mini sr-accent" onClick={downloadWorksheet}
          aria-label="Als Arbeitsblatt herunterladen / drucken">📄 Arbeitsblatt</button>
        <button type="button" className="sr-mini" onClick={toggleFs}
          aria-pressed={fullscreen} aria-label={fullscreen ? "Vollbild verlassen" : "Vollbild"}>
          {fullscreen ? "⤡ Beenden" : "⛶ Vollbild"}
        </button>
      </div>

      <div className="sr-inner">
        <p className="sr-lead">Schritt für Schritt schriftlich rechnen – wie an der Tafel ✏️</p>

        {/* Operation wählen */}
        <div className="sr-tabs" role="tablist" aria-label="Rechenart">
          {OPS.map((o) => (
            <button key={o.op} type="button" role="tab" aria-selected={op === o.op}
              className={"sr-tab" + (op === o.op ? " active" : "")} onClick={() => pickOp(o.op)}>
              <span className="sr-op">{o.op}</span> <span>{o.name}</span>
            </button>
          ))}
        </div>

        {/* Beispiel-Auswahl + eigene Aufgabe */}
        <div className="sr-setup">
          {EXAMPLES[op].map(([a, b], i) => (
            <button key={i} type="button"
              className={"sr-chip" + (pair[0] === a && pair[1] === b ? " active" : "")}
              onClick={() => { setPair([a, b]); setErr(""); }}>
              {a} {op} {b}
            </button>
          ))}
          <span className="sr-custom">
            <input inputMode="numeric" pattern="[0-9]*" placeholder="Zahl" value={customA}
              onChange={(e) => setCustomA(e.target.value.replace(/[^0-9]/g, ""))} aria-label="Erste Zahl" />
            <span className="sr-op2">{op}</span>
            <input inputMode="numeric" pattern="[0-9]*" placeholder="Zahl" value={customB}
              onChange={(e) => setCustomB(e.target.value.replace(/[^0-9]/g, ""))} aria-label="Zweite Zahl" />
          </span>
          <button type="button" className="sr-go" onClick={showCustom}>Zeigen</button>
          {err && <span className="sr-err">{err}</span>}
        </div>

        {/* Bühne: Karopapier */}
        <div className="sr-stage">
          <div className="sr-paper" style={{
            gridTemplateColumns: `repeat(${sol.cols}, ${cell})`,
            gridTemplateRows: `repeat(${sol.rows}, ${cell})`,
            width: `calc(${cell} * ${sol.cols})`,
          }}>
            <div className="sr-focus" style={{
              left: `calc(${cell} * ${focus ? focus.c0 : 0})`,
              top: `calc(${cell} * ${focus ? focus.r0 : 0})`,
              width: `calc(${cell} * ${focus ? focus.c1 - focus.c0 + 1 : 0})`,
              height: `calc(${cell} * ${focus ? focus.r1 - focus.r0 + 1 : 0})`,
              opacity: focus ? 1 : 0,
            }} aria-hidden="true" />

            {sol.rules.filter((ru) => ru.step <= phase).map((ru, i) => (
              <div key={"ru" + i} className="sr-rule"
                style={{ gridColumn: `${ru.c0 + 1} / ${ru.c1 + 2}`, gridRow: ru.r + 1, alignSelf: "start" }} />
            ))}

            {sol.cells.filter((c: { kind: string; step: number }) => c.kind !== "noop" && c.step <= phase).map(
              (c: { r: number; c: number; ch: string; kind: string; step: number }, i: number) => (
                <div key={c.r + "-" + c.c + "-" + i}
                  className={"sr-cell k-" + c.kind + (c.step === phase && phase > 0 ? " appear" : "")}
                  style={{ gridColumn: c.c + 1, gridRow: c.r + 1 }}>
                  {c.ch}
                </div>
              )
            )}
          </div>
        </div>

        {/* Erklärung */}
        <div className="sr-explain sr-fade" key={phase} role="status" aria-live="polite">
          <span className="sr-badge">{phase === 0 ? "?" : phase >= N ? "✓" : phase}</span>
          <span className="sr-etext">{explainText}</span>
        </div>

        {/* Fortschritt */}
        <div className="sr-steps-track" aria-hidden="true">
          <div className="sr-steps-fill" style={{ width: `${N ? (phase / N) * 100 : 0}%` }} />
        </div>

        {/* Steuerung */}
        <div className="sr-controls">
          <button type="button" className="sr-btn sr-icon-btn" onClick={() => { setPhase(0); setPlaying(false); }}
            disabled={phase === 0} aria-label="Von vorne">⟲</button>
          <button type="button" className="sr-btn sr-icon-btn" onClick={() => { setPlaying(false); setPhase((p) => Math.max(0, p - 1)); }}
            disabled={phase === 0} aria-label="Ein Schritt zurück">◀</button>
          <button type="button" className="sr-btn sr-btn-play" onClick={playPause}>
            {playing ? "❚❚ Pause" : atEnd ? "↻ Nochmal" : "▶ Abspielen"}
          </button>
          <button type="button" className="sr-btn sr-icon-btn" onClick={() => { setPlaying(false); setPhase((p) => Math.min(N, p + 1)); }}
            disabled={atEnd} aria-label="Ein Schritt weiter">▶</button>
          <span className="sr-speed">
            Tempo
            <select value={speed} onChange={(e) => setSpeed(+e.target.value)} aria-label="Abspiel-Tempo">
              {SPEEDS.map((s) => <option key={s.ms} value={s.ms}>{s.label}</option>)}
            </select>
          </span>
        </div>
      </div>

      {/* Arbeitsblatt – nur im Druck sichtbar */}
      <div className="sr-worksheet" aria-hidden="true">
        <div className="sr-ws-head">
          <div>
            <p className="sr-ws-title">Schriftliches Rechnen – {opName}</p>
            <p className="sr-ws-sub">Rechne schriftlich. Schreibe sauber in die Kästchen.</p>
          </div>
          <p className="sr-ws-name">Name: ______________________ &nbsp; Datum: __________</p>
        </div>
        <div className="sr-ws-grid">
          {(ws || []).map((p, i) => (
            <div className="sr-ws-item" key={i}>
              <span className="sr-ws-num">Aufgabe {i + 1}</span>
              <div className="sr-ws-task">{p.a} {op} {p.b} =</div>
              <div className="sr-ws-karo" />
            </div>
          ))}
        </div>
        <div className="sr-ws-foot">
          <span>DigiKI Osnabrück · Schriftliches Rechnen</span>
          <span>www.digiki-os.de/werkzeuge</span>
        </div>

        <div className="sr-ws-solpage">
          <div className="sr-ws-head">
            <p className="sr-ws-title">Lösungen – {opName}</p>
            <p className="sr-ws-name">nur für die Lehrkraft</p>
          </div>
          <div className="sr-ws-sol">
            {(ws || []).map((p, i) => (
              <div key={i}>{i + 1}.&nbsp; {p.a} {op} {p.b} = <strong>{p.r}</strong></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
