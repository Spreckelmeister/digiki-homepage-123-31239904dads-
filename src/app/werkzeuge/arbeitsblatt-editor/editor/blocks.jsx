import React from "react";
import { DKU } from "./utils";
import { DKI } from "./data";
import { Icon } from "./icons";

/* ============================================================
   Block renderers — the actual worksheet content
   Exposes Block({ block, doc, onPatch })
   ============================================================ */
  const { syllabify, genWall, clipartSvg, CLIP_LABELS } = DKU;

  const fontClass = id => (DKI.FONTS.find(f => f.id === id) || {}).css || "font-grundschrift";
  const schemeOf  = id => DKI.SYL_SCHEMES.find(s => s.id === id) || DKI.SYL_SCHEMES[0];

  // ---------- Syllable text ----------
  function Syllable({ block }) {
    const sch = schemeOf(block.scheme);
    const words = block.text.split(/(\s+)/); // keep whitespace tokens
    return (
      <div className={fontClass(block.font)}
           style={{ fontSize: block.size, lineHeight: 1.85, color: "var(--ink)", letterSpacing: ".2px" }}>
        {words.map((w, i) => {
          if (/^\s+$/.test(w)) return <span key={i}> </span>;
          const lead = w.match(/^[^\wäöüÄÖÜß]*/u)[0];
          const tail = w.match(/[^\wäöüÄÖÜß]*$/u)[0];
          const coreWord = w.slice(lead.length, w.length - (tail.length || 0));
          const syls = syllabify(coreWord);
          return (
            <span key={i} style={{ whiteSpace: "nowrap" }}>
              {lead}
              {syls.map((s, j) => {
                if (sch.arcs) {
                  return (
                    <span key={j} style={{ position: "relative", display: "inline-block", paddingBottom: 7 }}>
                      {s}
                      <svg viewBox="0 0 100 10" preserveAspectRatio="none"
                           style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 8 }}>
                        <path d="M2,2 Q50,11 98,2" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    </span>
                  );
                }
                return <span key={j} style={{ color: sch.colors[j % 2], fontWeight: 600 }}>{s}</span>;
              })}
              {tail}
            </span>
          );
        })}
      </div>
    );
  }

  // ---------- Cloze (Lückentext) ----------
  function Cloze({ block, solve }) {
    const parts = block.text.split(/(__[^_]+__)/g);
    const answers = [];
    parts.forEach(p => { const m = p.match(/^__([^_]+)__$/); if (m) answers.push(m[1]); });
    // Stabile, „zufällig" wirkende Reihenfolge des Wortspeichers (verhindert Flackern beim Neuzeichnen)
    const seed = String(block.id || "x").split("").reduce((a, ch) => a + ch.charCodeAt(0), 7);
    const bank = answers.map((w, i) => ({ w, k: ((i + 1) * 73 + seed * 17) % 1000 })).sort((a, b) => a.k - b.k).map(o => o.w);
    const gapStyle = block.gapStyle || "line";
    const sz = block.size;
    const renderGap = (word, key) => {
      if (solve) return <span key={key} style={{ display: "inline-block", minWidth: Math.max(60, word.length * sz * 0.55), borderBottom: "2px solid var(--sol)", margin: "0 4px", color: "var(--sol)", fontWeight: 700, textAlign: "center" }}>{word}</span>;
      if (gapStyle === "letters") return (
        <span key={key} data-answer={word} style={{ display: "inline-flex", gap: 5, margin: "0 5px", verticalAlign: "bottom" }}>
          {word.split("").map((ch, j) => <span key={j} style={{ display: "inline-block", width: sz * 0.6, borderBottom: "2px solid var(--ink-soft)", height: sz * 0.95 }} />)}
        </span>
      );
      if (gapStyle === "first") return (
        <span key={key} data-answer={word} style={{ display: "inline-block", minWidth: Math.max(60, word.length * sz * 0.55), borderBottom: "2px solid var(--ink-soft)", height: sz * 1.1, margin: "0 4px", textAlign: "left", color: "var(--ink-soft)", fontWeight: 600, paddingLeft: 3 }}>{word[0]}</span>
      );
      return <span key={key} data-answer={word} style={{ display: "inline-block", minWidth: Math.max(60, word.length * sz * 0.55), borderBottom: "2px solid var(--ink-soft)", height: sz * 1.1, margin: "0 4px" }} />;
    };
    return (
      <div className={fontClass(block.font)} style={{ fontSize: sz, lineHeight: 2.1, color: "var(--ink)" }}>
        {block.bank !== false && answers.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px", padding: "10px 14px", marginBottom: 14,
                        border: "2px dashed var(--teal)", borderRadius: 12, background: "var(--teal-50)",
                        fontSize: sz * 0.8 }}>
            <span style={{ fontWeight: 700, color: "var(--teal-700)", fontFamily: "var(--ui)", fontSize: 13, alignSelf: "center" }}>Wortspeicher:</span>
            {bank.map((b, i) => <span key={i} style={{ fontWeight: 600 }}>{b}</span>)}
          </div>
        )}
        {parts.map((p, i) => {
          const m = p.match(/^__([^_]+)__$/);
          if (m) return renderGap(m[1], i);
          return <span key={i}>{p}</span>;
        })}
      </div>
    );
  }

  // ---------- Reading text ----------
  function Reading({ block }) {
    const lines = block.text.split("\n");
    return (
      <div className={fontClass(block.font)} style={{ fontSize: block.size, lineHeight: 1.9, color: "var(--ink)", textAlign: block.align || "left" }}>
        {lines.map((ln, i) => (
          <p key={i} style={{ margin: "0 0 6px", display: "flex", gap: 12 }}>
            {block.numbers && <span style={{ color: "var(--muted-2)", fontFamily: "var(--ui)", fontSize: block.size * 0.7, minWidth: 22, textAlign: "right", userSelect: "none" }}>{i + 1}</span>}
            <span style={{ flex: 1 }}>{ln || "\u00a0"}</span>
          </p>
        ))}
      </div>
    );
  }

  // ---------- Title ----------
  function Title({ block, onPatch }) {
    return (
      <div
        contentEditable suppressContentEditableWarning
        onBlur={e => onPatch && onPatch({ text: e.currentTarget.textContent })}
        className={block.font ? fontClass(block.font) : ""}
        style={{ fontFamily: block.font ? undefined : "var(--ui)", fontWeight: 800, fontSize: block.size,
                 textAlign: block.align, color: "var(--ink)", outline: "none", letterSpacing: "-.01em" }}>
        {block.text}
      </div>
    );
  }

  // ---------- Name field ----------
  function NameField({ block }) {
    const f = block.show || {};
    const Field = ({ label }) => (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flex: 1 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink-soft)" }}>{label}:</span>
        <span style={{ flex: 1, borderBottom: "2px solid var(--line)", height: 18 }} />
      </div>
    );
    return (
      <div style={{ display: "flex", gap: 26, padding: "4px 2px 14px", borderBottom: "2px solid var(--line)", marginBottom: 4 }}>
        {f.name !== false && <Field label="Name" />}
        {f.klasse && <div style={{ width: 90, flex: "none" }}><Field label="Klasse" /></div>}
        {f.date !== false && <div style={{ width: 150, flex: "none" }}><Field label="Datum" /></div>}
      </div>
    );
  }

  // ---------- Image / clipart ----------
  function getItems(block) {
    if (Array.isArray(block.items) && block.items.length) return block.items;
    return [{ art: block.art || "apfel", src: block.src, word: block.caption || "" }];
  }

  function Pic({ it, s }) {
    if (it.src) return <img src={it.src} alt="" style={{ width: s, height: s, objectFit: "contain", display: "block" }} draggable="false" />;
    return <div style={{ width: s, height: s, flex: "none" }} dangerouslySetInnerHTML={{ __html: clipartSvg(it.art) }} />;
  }

  function ImageBlock({ block, solve }) {
    const al = block.align || "center";
    const justify = al === "center" ? "center" : al === "right" ? "flex-end" : "flex-start";
    const mode = block.mode || "plain";
    const items = getItems(block);
    const s = block.size || 110;

    // ----- Zählen: ein Motiv mehrfach -----
    if (mode === "count") {
      const n = block.num || 3;
      const cs = Math.min(s, 70);
      return (
        <div style={{ display: "flex", justifyContent: justify }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, border: "2px solid var(--line)", borderRadius: 16, padding: "14px 18px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 400 }}>
              {Array.from({ length: n }).map((_, i) => <Pic key={i} it={items[0]} s={cs} />)}
            </div>
            <div style={{ width: 1, height: cs, background: "var(--line)" }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "var(--ui)", fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>Wie viele?</span>
              <div style={{ width: 54, height: 54, borderRadius: 11, border: "2px solid var(--ink-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ui)", fontSize: 30, fontWeight: 800, color: solve ? "var(--sol)" : "transparent" }}>{n}</div>
            </div>
          </div>
        </div>
      );
    }

    // ----- Bild / Beschriften / Bildergeschichte: mehrere Motive nebeneinander -----
    const cols = block.cols || items.length || 1;
    const gap = Number.isFinite(block.gap) ? block.gap : 26;
    const framed = block.frame !== false;
    const story = mode === "story";
    const H = 22;
    return (
      <div style={{ display: "flex", justifyContent: justify }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, auto)`, gap: `${Math.round(gap * 0.7)}px ${gap}px`, justifyItems: "center" }}>
          {items.map((it, i) => {
            const word = it.word || CLIP_LABELS[it.art] || "";
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
                <div style={{ position: "relative", border: framed ? "2px solid var(--line)" : "none", borderRadius: 14, padding: framed ? 10 : 0, background: framed ? "#fff" : "transparent" }}>
                  {story && <span style={{ position: "absolute", top: -12, left: -12, width: 28, height: 28, borderRadius: "50%", background: "var(--teal)", color: "#fff", fontFamily: "var(--ui)", fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(43,182,172,.4)" }}>{i + 1}</span>}
                  <Pic it={it} s={s} />
                </div>
                {mode === "label" ? (
                  <div style={{ position: "relative", width: Math.max(120, s * 1.3), height: H * 2 }}>
                    <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.5, borderTop: "1.5px solid #B7C3CD" }} />
                    <div style={{ position: "absolute", left: 0, right: 0, top: H * 1.0, borderTop: "1.5px dashed #B7C3CD" }} />
                    <div style={{ position: "absolute", left: 0, right: 0, top: H * 1.5, borderTop: "2px solid var(--ink-soft)" }} />
                    {solve && <span className={fontClass(block.font || "grundschrift")} style={{ position: "absolute", left: 6, top: H * 0.3, fontSize: H, color: "var(--sol)", fontWeight: 700 }}>{word}</span>}
                  </div>
                ) : (it.word && <div className={fontClass(block.font || "grundschrift")} style={{ fontSize: 16, color: "var(--ink-soft)" }}>{it.word}</div>)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- Writing lines (Lineatur) ----------
  // ---------- Writing lines (Lineatur) ----------
  function Lines({ block }) {
    const H = block.height || 28;
    const variant = block.variant || (block.style === "haus" ? "haus" : "vierlinien");
    const count = block.count || 3;
    const thin = "1.5px solid #B7C3CD";
    const dashed = "1.5px dashed #B7C3CD";
    const base = "2px solid var(--ink-soft)";
    const band = "rgba(43,182,172,.08)";

    const StartDot = ({ top }) => block.startDot ? (
      <div style={{ position: "absolute", left: 1, top: top - 5, display: "flex", alignItems: "center", gap: 2 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--lvl-1)", boxShadow: "0 0 0 2px #fff" }} />
      </div>
    ) : null;

    if (variant === "karo") {
      const sq = Math.max(16, H);
      return (
        <div style={{ width: "100%", height: count * sq, border: "1px solid #C2D8E8",
          backgroundImage: "linear-gradient(#C2D8E8 1px, transparent 1px), linear-gradient(90deg, #C2D8E8 1px, transparent 1px)",
          backgroundSize: `${sq}px ${sq}px` }} />
      );
    }

    const rows = [];
    for (let i = 0; i < count; i++) {
      if (variant === "grundlinie") {
        rows.push(
          <div key={i} style={{ position: "relative", height: H * 2.0, marginBottom: 0 }}>
            {block.word && <span className={fontClass(block.font || "schreib")} style={{ position: "absolute", left: 6, top: 0, height: H * 1.3, display: "flex", alignItems: "flex-end", fontSize: H * 1.2, lineHeight: 1, color: "#C9D4DA", whiteSpace: "nowrap", pointerEvents: "none", paddingBottom: 1 }}>{block.word}</span>}
            <div style={{ position: "absolute", left: 0, right: 0, top: H * 1.3, borderTop: base }} />
            <StartDot top={H * 1.3} />
          </div>
        );
        continue;
      }
      if (variant === "dreilinien") {
        const asc = H, body = H, rowH = asc + body;
        rows.push(
          <div key={i} style={{ position: "relative", height: rowH, marginBottom: H * 1.3 }}>
            {block.word && <span className={fontClass(block.font || "schreib")} style={{ position: "absolute", left: 6, top: 0, height: asc + body, display: "flex", alignItems: "flex-end", fontSize: body * 1.4, lineHeight: 1, color: "#C9D4DA", whiteSpace: "nowrap", pointerEvents: "none", paddingBottom: 1 }}>{block.word}</span>}
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, borderTop: thin }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: asc, borderTop: dashed }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: asc + body, borderTop: base }} />
            <StartDot top={asc + body} />
          </div>
        );
        continue;
      }
      // haus & vierlinien — full 4-line Lineatur (Dach = Wohnung = Keller)
      const asc = H, body = H, desc = H, rowH = asc + body + desc;
      const showHouse = variant === "haus" && block.haus;
      const hw = Math.round(H * 0.95);
      const padL = showHouse ? hw + 14 : 0;
      rows.push(
        <div key={i} style={{ position: "relative", height: rowH, marginBottom: H }}>
          {showHouse && (
            <svg width={hw} height={rowH} viewBox={`0 0 ${hw} ${rowH}`} style={{ position: "absolute", left: 0, top: 0 }}>
              {/* Dach (über Dachboden/Oberlängen) */}
              <path d={`M1 ${asc} L${hw / 2} 2 L${hw - 1} ${asc} Z`} fill="#E8921A" opacity="0.9" />
              {/* Wohnung (Mittelband / Kleinbuchstaben) */}
              <rect x="3" y={asc} width={hw - 6} height={body} fill="rgba(43,182,172,.16)" stroke="#2BB6AC" strokeWidth="1.5" />
              <rect x={hw / 2 - 4} y={asc + body * 0.4} width="8" height="8" fill="none" stroke="#2BB6AC" strokeWidth="1.3" />
              {/* Keller (Unterlängen) */}
              <rect x="3" y={asc + body} width={hw - 6} height={desc} fill="rgba(100,116,139,.07)" stroke="#94A3B8" strokeWidth="1.2" strokeDasharray="3 2.5" />
            </svg>
          )}
          <div style={{ position: "absolute", left: padL, right: 0, top: 0, bottom: 0 }}>
            {variant === "haus" && <div style={{ position: "absolute", left: 0, right: 0, top: asc, height: body, background: band }} />}
            {block.word && <span className={fontClass(block.font || "schreib")} style={{ position: "absolute", left: 6, top: 0, height: asc + body, display: "flex", alignItems: "flex-end", fontSize: body * 1.5, lineHeight: 1, color: "#C9D4DA", whiteSpace: "nowrap", pointerEvents: "none", paddingBottom: 1 }}>{block.word}</span>}
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, borderTop: thin }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: asc, borderTop: thin }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: asc + body, borderTop: base }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: asc + body + desc, borderTop: thin }} />
            {block.startDot && <div style={{ position: "absolute", left: 1, top: asc + body - 5, width: 9, height: 9, borderRadius: "50%", background: "var(--lvl-1)", boxShadow: "0 0 0 2px #fff" }} />}
          </div>
        </div>
      );
    }
    return <div>{rows}</div>;
  }

  // ---------- Math rows (Rechenpäckchen) ----------
  function MathRows({ block, solve }) {
    const cols = block.cols || 2;
    const rows = block.items || [];
    const mode = block.mode || "normal";
    const show = solve || block.showResult;
    const sz = block.size || 24;
    const rowStyle = { display: "flex", alignItems: "center", gap: 8, fontSize: sz, fontFamily: "var(--ui)", fontWeight: 600, color: "var(--ink)" };
    const blank = (val, w) => (
      <span data-answer={val} style={{ display: "inline-block", width: w || 46, borderBottom: "2px solid var(--ink-soft)", height: sz * 0.9, textAlign: "center", fontWeight: 700, color: show ? "var(--sol)" : "transparent" }}>{val}</span>
    );
    const box = (val) => (
      <span data-answer={val} style={{ display: "inline-flex", width: sz * 1.5, height: sz * 1.5, border: "2px solid var(--ink-soft)", borderRadius: 8, alignItems: "center", justifyContent: "center", fontWeight: 800, color: show ? "var(--sol)" : "transparent" }}>{val}</span>
    );
    return (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "14px 40px" }}>
        {rows.map((r, i) => {
          if (mode === "compare") return (
            <div key={i} style={rowStyle}>
              <span style={{ minWidth: 22, textAlign: "right" }}>{r.a}</span>
              {box(r.cmp)}
              <span style={{ minWidth: 22 }}>{r.b}</span>
            </div>
          );
          const hideA = mode === "missing" && r.hide === "a";
          const hideB = mode === "missing" && r.hide === "b";
          return (
            <div key={i} style={rowStyle}>
              {hideA ? blank(r.a) : <span style={{ minWidth: 22, textAlign: "right" }}>{r.a}</span>}
              <span style={{ color: "var(--muted)" }}>{r.op}</span>
              {hideB ? blank(r.b) : <span style={{ minWidth: 22 }}>{r.b}</span>}
              <span style={{ color: "var(--muted)" }}>=</span>
              {mode === "missing" ? <span style={{ minWidth: 22, fontWeight: 700 }}>{r.res}</span> : blank(r.res)}
            </div>
          );
        })}
      </div>
    );
  }

  // ---------- Math wall (Rechenmauer) ----------
  function MathWall({ block, solve }) {
    const rows = genWall(block.base || [2, 5, 3], block.op); // bottom..top
    const cell = block.cell || 56;
    const display = [...rows].reverse(); // top first
    const hideTop = block.hideTop !== false;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {display.map((row, ri) => {
          const isTop = ri === 0;
          const isBottom = ri === display.length - 1;
          return (
            <div key={ri} style={{ display: "flex", gap: 6 }}>
              {row.map((v, ci) => {
                const reveal = solve || isBottom || !hideTop;
                return (
                  <div key={ci} style={{ width: cell, height: cell * 0.72, borderRadius: 9,
                    border: "2px solid " + (isTop ? "var(--orange)" : "var(--teal)"),
                    background: isTop ? "var(--orange-50)" : "var(--teal-50)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--ui)", fontWeight: 700, fontSize: (block.size || 22),
                    color: solve && !isBottom ? "var(--sol)" : "var(--ink)" }}>
                    {reveal ? v : ""}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  // ---------- Number line (Zahlenstrahl) ----------
  const NL_COLORS = { teal: "#2BB6AC", orange: "#E8921A", red: "#DC2626", blue: "#2563EB", green: "#16A34A", purple: "#7C3AED", ink: "#1E293B" };
  function NumLine({ block, solve, onPatch }) {
    const min = Number.isFinite(block.min) ? block.min : 0;
    const max = Number.isFinite(block.max) ? block.max : 20;
    const step = block.step || 1;
    const span = (max - min) || 1;
    const labelEvery = Math.max(1, block.labelEvery || 1);
    const blanks = block.blanks || [];
    const marks = block.marks || [];
    const col = c => NL_COLORS[c] || NL_COLORS.teal;

    const VBW = 1000, padL = 46, padR = 46, axisW = VBW - padL - padR;
    const axisY = 124, VBH = 196;
    const X = v => padL + ((v - min) / span) * axisW;
    const editable = !!onPatch && !solve;

    const nSteps = Math.max(1, Math.round(span / step));
    const ticks = [];
    for (let i = 0; i <= nSteps; i++) ticks.push(+(min + i * step).toFixed(4));
    const isBlank = v => blanks.some(b => Math.abs(b - v) < 1e-6);
    // ?-Feld an einer Tick-Position → Zahl darf nicht sichtbar sein (Antwort verstecken)
    const isBoxAt = v => marks.some(m => m.type === "box" && m.at != null && Math.abs(m.at - v) < 1e-6);

    const setMarks = (m) => onPatch && onPatch({ marks: m });
    const removeMark = (k) => setMarks(marks.filter((_, j) => j !== k));
    const onSvgClick = (e) => {
      if (!editable) return;
      const r = e.currentTarget.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * VBW;
      const py = ((e.clientY - r.top) / r.height) * VBH;
      if (Math.abs(py - axisY) > 40) return;            // only clicks near the axis
      let v = min + ((px - padL) / axisW) * span;
      v = +Math.max(min, Math.min(max, Math.round(v / step) * step)).toFixed(4);
      const m = [...marks];
      const idx = m.findIndex(x => (x.type === "point" || !x.type) && Math.abs(x.at - v) < 1e-6);
      if (idx >= 0) m.splice(idx, 1); else m.push({ at: v, type: "point", color: "teal", label: "" });
      setMarks(m);
    };

    const arrowHead = (x, y, dir, c) => {                // dir: 'r' | 'd'
      const s = 11;
      const d = dir === "d" ? `M${x - s * 0.8} ${y - s} L${x + s * 0.8} ${y - s} L${x} ${y} Z`
                            : `M${x - s} ${y - s * 0.8} L${x - s} ${y + s * 0.8} L${x} ${y} Z`;
      return <path d={d} fill={c} />;
    };

    const txt = (x, y, s, c, w, anchor) => ({ x, y, fontSize: s, fill: c, fontWeight: w || 700,
      textAnchor: anchor || "middle", style: { fontFamily: "var(--ui)" } });

    return (
      <div style={{ padding: "6px 2px 2px" }}>
        {editable && (
          <div style={{ fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: "var(--teal-700)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="target" size={14} /> Auf den Strahl klicken, um einen Punkt zu setzen · Markierung anklicken zum Entfernen
          </div>
        )}
        <svg viewBox={`0 0 ${VBW} ${VBH}`} width="100%" style={{ display: "block", cursor: editable ? "crosshair" : "default", overflow: "visible" }} onClick={onSvgClick}>
          {/* axis */}
          <line x1={padL} y1={axisY} x2={padL + axisW + 18} y2={axisY} stroke="var(--ink-soft)" strokeWidth="2.5" />
          {arrowHead(padL + axisW + 22, axisY, "r", "#334155")}

          {/* ticks + labels + blanks */}
          {ticks.map((v, i) => {
            const x = X(v);
            const major = (i % labelEvery === 0) || isBlank(v);
            return (
              <g key={"t" + i}>
                <line x1={x} y1={axisY} x2={x} y2={axisY + (major ? 15 : 9)} stroke="var(--ink-soft)" strokeWidth={major ? 2 : 1.4} />
                {isBlank(v) ? (
                  <g>
                    <rect x={x - 23} y={axisY + 24} width="46" height="36" rx="7" fill="#fff" stroke={solve ? "var(--sol)" : "var(--ink-soft)"} strokeWidth="2" strokeDasharray={solve ? "0" : "4 3"} />
                    {solve && <text {...txt(x, axisY + 49, 24, "var(--sol)", 800)}>{v}</text>}
                  </g>
                ) : (i % labelEvery === 0 && !isBoxAt(v) && (
                  <text {...txt(x, axisY + 46, 23, "var(--ink-soft)", 600)}>{v}</text>
                ))}
              </g>
            );
          })}

          {/* markers */}
          {marks.map((m, k) => {
            if (m.solOnly && !solve && m.type !== "box") return null;
            const c = col(m.color);
            const click = editable ? { onClick: (e) => { e.stopPropagation(); removeMark(k); }, style: { cursor: "pointer" } } : {};
            if (m.type === "jump") {
              const x1 = X(m.from ?? min), x2 = X(m.to ?? m.at ?? max);
              const mx = (x1 + x2) / 2, h = 44 + Math.min(46, Math.abs(x2 - x1) * 0.16);
              const topY = axisY - 7 - h;
              return (
                <g key={"m" + k} {...click}>
                  <path d={`M${x1} ${axisY - 7} Q ${mx} ${topY} ${x2} ${axisY - 7}`} fill="none" stroke={c} strokeWidth="3.2" />
                  {arrowHead(x2, axisY - 8, "d", c)}
                  {m.label !== "" && <text {...txt(mx, topY + 22, 22, c, 800)}>{m.label ?? (((m.to ?? 0) - (m.from ?? 0) >= 0 ? "+" : "") + ((m.to ?? 0) - (m.from ?? 0)))}</text>}
                </g>
              );
            }
            if (m.type === "arrow") {
              const x2 = X(m.at);
              return (
                <g key={"m" + k} {...click}>
                  <line x1={X(m.from ?? min)} y1={axisY} x2={x2 - 6} y2={axisY} stroke={c} strokeWidth="5" strokeLinecap="round" />
                  {arrowHead(x2 + 4, axisY, "r", c)}
                  {m.label ? <text {...txt(x2, axisY - 16, 21, c, 800)}>{m.label}</text> : null}
                </g>
              );
            }
            if (m.type === "flag") {
              const x = X(m.at), top = axisY - 52;
              return (
                <g key={"m" + k} {...click}>
                  <line x1={x} y1={axisY} x2={x} y2={top} stroke={c} strokeWidth="2.5" />
                  <path d={`M${x} ${top} L${x + 34} ${top + 9} L${x} ${top + 18} Z`} fill={c} />
                  {m.label ? <text {...txt(x + 12, top + 13, 16, "#fff", 800, "middle")}>{m.label}</text> : null}
                  <circle cx={x} cy={axisY} r="4.5" fill={c} />
                </g>
              );
            }
            if (m.type === "box") {
              const x = X(m.at);
              return (
                <g key={"m" + k} {...click}>
                  <line x1={x} y1={axisY} x2={x} y2={axisY - 28} stroke={c} strokeWidth="2" strokeDasharray="3 3" />
                  <rect x={x - 24} y={axisY - 70} width="48" height="42" rx="9" fill="#fff" stroke={c} strokeWidth="2.5" />
                  <text {...txt(x, axisY - 42, 24, solve ? "var(--sol)" : c, 800)}>{solve ? m.at : "?"}</text>
                </g>
              );
            }
            // default: point
            const x = X(m.at);
            return (
              <g key={"m" + k} {...click}>
                {m.label ? <text {...txt(x, axisY - 18, 21, c, 800)}>{m.label}</text> : null}
                <circle cx={x} cy={axisY} r="9.5" fill={c} stroke="#fff" strokeWidth="2.5" />
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // ---------- Multiple-Choice (Ankreuzen) ----------
  function MultipleChoice({ block, solve }) {
    const opts = block.options || [];
    return (
      <div className={fontClass(block.font || "druck")} style={{ fontSize: block.size || 19, color: "var(--ink)" }}>
        <div style={{ fontWeight: 700, marginBottom: 12, lineHeight: 1.4 }}>{block.q || "Frage?"}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {opts.map((o, i) => {
            const correct = solve && i === block.answer;
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ width: 24, height: 24, flex: "none", marginTop: 2, borderRadius: 6, border: "2px solid " + (correct ? "var(--sol)" : "var(--ink-soft)"),
                  display: "flex", alignItems: "center", justifyContent: "center", color: "var(--sol)" }}>
                  {correct && <Icon name="check" size={16} stroke={2.6} />}
                </span>
                <span style={{ flex: 1, fontWeight: correct ? 700 : 400, color: correct ? "var(--sol)" : "var(--ink)" }}>{o}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- Zuordnen (Match / verbinden) ----------
  function Match({ block, solve }) {
    const pairs = block.pairs || [];
    const left = pairs.map(p => p[0]);
    const right = (block._shuffle || pairs.map((_, i) => i)).map(i => pairs[i][1]);
    const order = block._shuffle || pairs.map((_, i) => i);
    const rowH = 46, padY = 6;
    const W = 360, dotL = 150, dotR = W - 150;
    return (
      <div className={fontClass(block.font || "druck")} style={{ fontSize: block.size || 19, color: "var(--ink)" }}>
        <div style={{ position: "relative", width: "100%", maxWidth: W + 80, margin: "0 auto" }}>
          {solve && (
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
              {left.map((_, li) => {
                const ri = order.indexOf(li);
                const y1 = padY + li * (rowH + padY) + rowH / 2;
                const y2 = padY + ri * (rowH + padY) + rowH / 2;
                return <line key={li} x1="33%" y1={y1} x2="67%" y2={y2} stroke="var(--sol)" strokeWidth="2.5" strokeLinecap="round" />;
              })}
            </svg>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "stretch", columnGap: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: padY }}>
              {left.map((l, i) => (
                <div key={i} style={{ height: rowH, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, paddingRight: 4 }}>
                  <span style={{ textAlign: "right" }}>{l}</span>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid var(--teal)", background: "#fff", flex: "none" }} />
                </div>
              ))}
            </div>
            <div style={{ width: 70 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: padY }}>
              {right.map((r, i) => (
                <div key={i} style={{ height: rowH, display: "flex", alignItems: "center", gap: 12, paddingLeft: 4 }}>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid var(--orange)", background: "#fff", flex: "none" }} />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Wörtersuchsel (word search) ----------
  function WordSearch({ block, solve }) {
    const g = block.grid || { grid: [], placements: [], size: 0 };
    const N = g.size || (g.grid && g.grid.length) || 0;
    const cell = Math.min(40, Math.max(26, 320 / (N || 1)));
    const solSet = new Set();
    if (solve) g.placements.forEach(p => p.cells.forEach(([r, c]) => solSet.add(r + "_" + c)));
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${N}, ${cell}px)`, gap: 0, width: "max-content", margin: "0 auto",
          border: "2px solid var(--ink-soft)", borderRadius: 8, overflow: "hidden" }}>
          {g.grid.map((row, r) => row.map((ch, c) => {
            const hit = solSet.has(r + "_" + c);
            return (
              <div key={r + "_" + c} style={{ width: cell, height: cell, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--ui)", fontWeight: 700, fontSize: cell * 0.5, color: hit ? "#fff" : "var(--ink)",
                background: hit ? "var(--sol)" : "#fff", borderRight: c < N - 1 ? "1px solid var(--line)" : "none", borderBottom: r < N - 1 ? "1px solid var(--line)" : "none" }}>
                {ch}
              </div>
            );
          }))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", justifyContent: "center", marginTop: 14 }}>
          {g.placements.map((p, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--ui)", fontWeight: 700, fontSize: 15, color: "var(--ink-soft)" }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, border: "2px solid var(--teal)" }} />{p.word}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Rechendreieck ----------
  function MathTri({ block, solve }) {
    const t = block.data || { corners: [2, 3, 4], sides: [5, 7, 6] };
    const op = t.op || block.op || "+";
    const inv = op === "÷";                        // Umkehrung: Seiten gegeben, Ecken gesucht
    const S = 230, cx = S / 2, cy = 26, bl = 30, br = S - 30, by = 196;
    const ccx = (cx + bl + br) / 3, ccy = (cy + by + by) / 3;
    const circle = (x, y, val) => (
      <g>
        <circle cx={x} cy={y} r="26" fill="var(--teal-50)" stroke="var(--teal)" strokeWidth="2.5" />
        <text x={x} y={y + 7} textAnchor="middle" fontFamily="var(--ui)" fontWeight="700" fontSize="22" fill={inv ? (solve ? "var(--sol)" : "transparent") : "var(--ink)"}>{val}</text>
      </g>
    );
    const sideBox = (x, y, val) => (
      <g>
        <rect x={x - 24} y={y - 17} width="48" height="34" rx="8" fill="#fff" stroke="var(--orange)" strokeWidth="2.5" />
        <text x={x} y={y + 7} textAnchor="middle" fontFamily="var(--ui)" fontWeight="700" fontSize="20" fill={inv ? "var(--ink)" : (solve ? "var(--sol)" : "transparent")}>{val}</text>
      </g>
    );
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg width={S} height="225" viewBox={`0 0 ${S} 225`}>
          <path d={`M${cx} ${cy} L${bl} ${by} L${br} ${by} Z`} fill="none" stroke="var(--line)" strokeWidth="2" />
          <text x={ccx} y={ccy + 8} textAnchor="middle" fontFamily="var(--ui)" fontWeight="800" fontSize="26" fill="#CBD5E1">{op}</text>
          {sideBox((cx + bl) / 2, (cy + by) / 2, t.sides[0])}
          {sideBox((bl + br) / 2, by, t.sides[1])}
          {sideBox((cx + br) / 2, (cy + by) / 2, t.sides[2])}
          {circle(cx, cy, t.corners[0])}
          {circle(bl, by, t.corners[1])}
          {circle(br, by, t.corners[2])}
        </svg>
      </div>
    );
  }

  // ---------- Uhrzeit (clock) — eine oder mehrere Uhren ----------
  function ClockFace({ h, m, solve }) {
    const R = 58, c = 66;
    const minA = (m / 60) * 360 - 90;
    const hourA = ((h % 12) / 12) * 360 + (m / 60) * 30 - 90;
    const pt = (ang, len) => [c + Math.cos(ang * Math.PI / 180) * len, c + Math.sin(ang * Math.PI / 180) * len];
    const [mx, my] = pt(minA, R * 0.78), [hx, hy] = pt(hourA, R * 0.52);
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <svg width="132" height="132" viewBox="0 0 132 132">
          <circle cx={c} cy={c} r={R} fill="#fff" stroke="var(--ink)" strokeWidth="3" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = i * 30 - 90, [x1, y1] = pt(a, R - 4), [x2, y2] = pt(a, R - 10);
            const [tx, ty] = pt(a, R - 22);
            return <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink-soft)" strokeWidth="2" />
              <text x={tx} y={ty + 4} textAnchor="middle" fontFamily="var(--ui)" fontWeight="700" fontSize="12" fill="var(--ink-soft)">{i === 0 ? 12 : i}</text>
            </g>;
          })}
          <line x1={c} y1={c} x2={hx} y2={hy} stroke="var(--ink)" strokeWidth="4.5" strokeLinecap="round" />
          <line x1={c} y1={c} x2={mx} y2={my} stroke="var(--teal-700)" strokeWidth="3" strokeLinecap="round" />
          <circle cx={c} cy={c} r="4.5" fill="var(--ink)" />
        </svg>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "2px solid var(--ink-soft)", paddingBottom: 3, width: 96 }}>
          <span style={{ fontFamily: "var(--ui)", fontSize: 19, fontWeight: 800, color: solve ? "var(--sol)" : "transparent" }}>{timeStr} Uhr</span>
        </div>
      </div>
    );
  }
  function Clock({ block, solve }) {
    const clocks = (block.clocks && block.clocks.length) ? block.clocks : [{ h: block.h ?? 3, m: block.m ?? 0 }];
    const cols = block.cols || clocks.length || 1;
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, auto)`, gap: "24px 30px", justifyItems: "center" }}>
          {clocks.map((cl, i) => <ClockFace key={i} h={cl.h} m={cl.m} solve={solve} />)}
        </div>
      </div>
    );
  }

  // ---------- Tabelle ----------
  function Table({ block, onPatch }) {
    const rows = Math.max(1, block.rows || 2), cols = Math.max(1, block.cols || 2);
    const cells = block.cells || [];
    const get = (r, c) => (cells[r] && cells[r][c] != null) ? cells[r][c] : "";
    const editable = !!onPatch;
    const setCell = (r, c, val) => {
      const nc = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => get(i, j)));
      nc[r][c] = val; onPatch({ cells: nc });
    };
    return (
      <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: block.font ? undefined : "var(--ui)", fontSize: block.size || 16 }}
             className={block.font ? fontClass(block.font) : ""}>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => {
                const head = block.header && r === 0;
                return (
                  <td key={c} contentEditable={editable} suppressContentEditableWarning
                    onBlur={e => editable && setCell(r, c, e.currentTarget.textContent)}
                    style={{ border: "1.5px solid var(--ink-soft)", padding: "8px 10px", height: block.rowH || 34, minWidth: 36,
                      background: head ? "var(--teal-50)" : "#fff", fontWeight: head ? 700 : 400, textAlign: "center",
                      color: "var(--ink)", outline: "none", verticalAlign: "middle" }}>
                    {get(r, c)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // ---------- Arbeitsauftrag ----------
  function TaskInstr({ block, onPatch }) {
    const c = NL_COLORS[block.color] || NL_COLORS.teal;
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "var(--bg-rail)", borderLeft: `4px solid ${c}`, borderRadius: 10, padding: "12px 14px" }}>
        {block.num != null && block.num !== "" && (
          <span style={{ flex: "none", width: 30, height: 30, borderRadius: "50%", background: c, color: "#fff", fontFamily: "var(--ui)", fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{block.num}</span>
        )}
        {block.icon && block.icon !== "none" && <span style={{ flex: "none", color: c, marginTop: 2 }}><Icon name={block.icon} size={24} /></span>}
        <div contentEditable={!!onPatch} suppressContentEditableWarning onBlur={e => onPatch && onPatch({ text: e.currentTarget.textContent })}
          className={fontClass(block.font || "druck")}
          style={{ flex: 1, fontSize: block.size || 18, color: "var(--ink)", outline: "none", lineHeight: 1.4, fontWeight: 600, paddingTop: 3 }}>
          {block.text}
        </div>
      </div>
    );
  }

  // ---------- Trennlinie / Abstand ----------
  function Divider({ block }) {
    const v = block.variant || "dashed";
    if (v === "space") return <div style={{ height: block.space || 30 }} />;
    const border = v === "solid" ? "2px solid var(--line)" : v === "dotted" ? "2px dotted var(--muted-2)" : "2px dashed var(--muted-2)";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", color: "var(--muted-2)" }}>
        {v === "scissors" && <span style={{ flex: "none", transform: "rotate(0deg)" }}><Icon name="scissors" size={19} /></span>}
        <div style={{ flex: 1, borderTop: border }} />
      </div>
    );
  }

  // ---------- Seitenumbruch (erzwingt beim Druck eine neue Seite) ----------
  function PageBreak() {
    return (
      <div className="pb-marker" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--orange)", padding: "3px 0" }}>
        <div style={{ flex: 1, borderTop: "2px dashed var(--orange)" }} />
        <span style={{ fontFamily: "var(--ui)", fontSize: 11.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}><Icon name="pagebreak" size={15} /> Seitenumbruch</span>
        <div style={{ flex: 1, borderTop: "2px dashed var(--orange)" }} />
      </div>
    );
  }

  // ---------- Arbeitsauftrag-Zeile (klar für Kinder, automatisch oder eigener Text) ----------
  function Prompt({ block }) {
    const t = (DKU.promptText ? DKU.promptText(block) : block.prompt) || "";
    if (!t || !t.trim()) return null;
    return (
      <div style={{ fontFamily: "var(--ui)", fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: "0 0 12px", display: "flex", alignItems: "flex-start", gap: 8, lineHeight: 1.4 }}>
        <span style={{ color: "var(--teal-700)", flex: "none", marginTop: 1 }}><Icon name="task" size={16} /></span>
        <span>{t}</span>
      </div>
    );
  }
  const withPrompt = (block, el) => <><Prompt block={block} />{el}</>;

  function Block({ block, doc, onPatch }) {
    const solve = !!(doc && doc.showSolutions);
    switch (block.type) {
      case "title":    return <Title block={block} onPatch={onPatch} />;
      case "syllable": return <Syllable block={block} />;
      case "cloze":    return <Cloze block={block} solve={solve} />;
      case "reading":  return <Reading block={block} />;
      case "mc":       return <MultipleChoice block={block} solve={solve} />;
      case "match":    return <Match block={block} solve={solve} />;
      case "name":     return <NameField block={block} />;
      case "image":    return <ImageBlock block={block} solve={solve} />;
      case "lines":    return <Lines block={block} />;
      case "matharow": return withPrompt(block, <MathRows block={block} solve={solve} />);
      case "mathwall": return withPrompt(block, <MathWall block={block} solve={solve} />);
      case "mathtri":  return withPrompt(block, <MathTri block={block} solve={solve} />);
      case "numline":  return withPrompt(block, <NumLine block={block} solve={solve} onPatch={onPatch} />);
      case "clock":    return withPrompt(block, <Clock block={block} solve={solve} />);
      case "wordsearch": return withPrompt(block, <WordSearch block={block} solve={solve} />);
      case "table":    return <Table block={block} onPatch={onPatch} />;
      case "task":     return <TaskInstr block={block} onPatch={onPatch} />;
      case "divider":  return <Divider block={block} />;
      case "pagebreak": return <PageBreak />;
      default:         return <div style={{ color: "var(--muted)" }}>Unbekannter Block</div>;
    }
  }

export { Block };
