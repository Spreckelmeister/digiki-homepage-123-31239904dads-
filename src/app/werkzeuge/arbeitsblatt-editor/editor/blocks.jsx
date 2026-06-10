import React from "react";
import { DKU } from "./utils";
import { DKI } from "./data";
import { Icon } from "./icons";

/* ============================================================
   Block renderers — the actual worksheet content
   Exposes Block({ block, doc, onPatch })
   ============================================================ */
  const { syllabify, genWall, clipartSvg, CLIP_LABELS, SC_ELIGIBLE, collectSolutions, seededShuffle, makeDecoys } = DKU;

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
          <p key={i} style={{ margin: "0 0 6px", display: "flex", gap: 12, alignItems: "baseline" }}>
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
    // Nachspur-Stil des Vorgabeworts: grau (Standard) · hell · Kontur (hohl zum Nachfahren)
    const traceWord = block.trace === "kontur"
      ? { color: "transparent", WebkitTextStroke: "2px #B7C3CD" }
      : block.trace === "hell"
        ? { color: "#E3E9EC" }
        : { color: "#C9D4DA" };

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
            {block.word && <span className={fontClass(block.font || "schreib")} style={{ position: "absolute", left: 6, top: 0, height: H * 1.3, display: "flex", alignItems: "flex-end", fontSize: H * 1.2, lineHeight: 1, ...traceWord, whiteSpace: "nowrap", pointerEvents: "none", paddingBottom: 1 }}>{block.word}</span>}
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
            {block.word && <span className={fontClass(block.font || "schreib")} style={{ position: "absolute", left: 6, top: 0, height: asc + body, display: "flex", alignItems: "flex-end", fontSize: body * 1.4, lineHeight: 1, ...traceWord, whiteSpace: "nowrap", pointerEvents: "none", paddingBottom: 1 }}>{block.word}</span>}
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
            {block.word && <span className={fontClass(block.font || "schreib")} style={{ position: "absolute", left: 6, top: 0, height: asc + body, display: "flex", alignItems: "flex-end", fontSize: body * 1.5, lineHeight: 1, ...traceWord, whiteSpace: "nowrap", pointerEvents: "none", paddingBottom: 1 }}>{block.word}</span>}
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
      <span data-answer={val} style={{ display: "inline-flex", alignItems: "flex-end", justifyContent: "center", width: w || 46, height: sz * 1.15, lineHeight: 1, paddingBottom: 2, borderBottom: "2px solid var(--ink-soft)", textAlign: "center", fontWeight: 700, color: show ? "var(--sol)" : "transparent" }}>{val}</span>
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

  // ---------- Geld- & Größenrechnen ----------
  function UnitRows({ block, solve }) {
    const cols = block.cols || 2;
    const rows = block.items || [];
    const show = solve || block.showResult;
    const sz = block.size || 22;
    const money = (c) => (c / 100).toFixed(2).replace(".", ",");
    const fmt = (it, v) => it.money ? money(v) : String(v);
    const rowStyle = { display: "flex", alignItems: "center", gap: 7, fontSize: sz, fontFamily: "var(--ui)", fontWeight: 600, color: "var(--ink)", flexWrap: "wrap" };
    const blank = (val, unit) => (
      <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 5 }}>
        <span data-answer={val} style={{ display: "inline-flex", alignItems: "flex-end", justifyContent: "center", minWidth: sz * 2.2, height: sz * 1.15, paddingBottom: 2, borderBottom: "2px solid var(--ink-soft)", textAlign: "center", fontWeight: 700, color: show ? "var(--sol)" : "transparent" }}>{val}</span>
        {unit && <span style={{ fontWeight: 600 }}>{unit}</span>}
      </span>
    );
    return (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "14px 40px" }}>
        {rows.map((r, i) => r.mode === "umrechnen" ? (
          <div key={i} style={rowStyle}>
            <span>{fmt(r, r.val)}&nbsp;{r.fromUnit}</span>
            <span style={{ color: "var(--muted)" }}>=</span>
            {blank(fmt(r, r.res), r.toUnit)}
          </div>
        ) : (
          <div key={i} style={rowStyle}>
            <span>{fmt(r, r.a)}&nbsp;{r.unit}</span>
            <span style={{ color: "var(--muted)" }}>{r.op === "-" ? "−" : r.op}</span>
            <span>{fmt(r, r.b)}&nbsp;{r.unit}</span>
            <span style={{ color: "var(--muted)" }}>=</span>
            {blank(fmt(r, r.res), r.unit)}
          </div>
        ))}
      </div>
    );
  }

  // ---------- Schriftliche Rechenverfahren (+, −, ×) ----------
  // Eine einzelne Rechnung
  function OneWritten({ a, b, res, op, block, solve }) {
    const sz = block.size || 26;
    const cw = Math.round(sz * 0.82), rowH = Math.round(sz * 1.28);

    const Cell = ({ ch, kind }) => (
      <div style={{ width: cw, height: kind === "carry" ? Math.round(rowH * 0.62) : rowH, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--ui)", fontWeight: 700, fontSize: kind === "carry" ? Math.round(sz * 0.6) : sz,
        color: (kind === "answer" || kind === "carry") ? (solve ? "var(--sol)" : "transparent") : kind === "op" ? "var(--muted)" : "var(--ink)" }}>{ch}</div>
    );
    // Zeile aus expliziten Zellen: Array von {ch,kind} oder null (= Leerspalte)
    const Row = (cells, key) => (
      <div key={key} style={{ display: "flex", alignItems: "center" }}>
        {cells.map((c, i) => c ? <Cell key={i} ch={c.ch} kind={c.kind} /> : <div key={i} style={{ width: cw }} />)}
      </div>
    );
    // Zahl rechtsbündig in `total` Spalten, links um `shift` versetzt
    const numCells = (num, total, kind, shift = 0) => {
      const s = String(num).split(""); const pad = total - s.length - shift;
      return Array.from({ length: total }).map((_, i) => { const di = i - pad; return (di >= 0 && di < s.length) ? { ch: s[di], kind } : null; });
    };
    const Line = (W, lead = 0) => (
      <div style={{ display: "flex", margin: "2px 0" }}>
        {lead > 0 && <div style={{ width: lead * cw }} />}
        <div style={{ width: W * cw, borderTop: "2px solid var(--ink)" }} />
      </div>
    );

    // ----- Multiplikation: Faktoren NEBENEINANDER (a · b), Teilergebnisse versetzt darunter -----
    if (op === "×") {
      const La = String(a).length, Lb = String(b).length, Lr = String(res).length;
      const total = Math.max(La + 1 + Lb, Lr);
      const hs = [...String(a).split(""), "·", ...String(b).split("")];
      const hPad = total - hs.length;
      const head = Array.from({ length: total }).map((_, i) => { const di = i - hPad; return di >= 0 ? { ch: hs[di], kind: hs[di] === "·" ? "op" : "ink" } : null; });
      const showPartials = block.partials !== false && Lb > 1;
      return (
        <div style={{ display: "inline-flex", flexDirection: "column" }}>
          {Row(head, "h")}
          {Line(total)}
          {showPartials && Array.from({ length: Lb }).map((_, p) => Row(numCells(a * Number(String(b)[Lb - 1 - p]), total, "answer", p), "p" + p))}
          {showPartials && Line(total)}
          {Row(numCells(res, total, "answer"), "r")}
        </div>
      );
    }

    // ----- Addition / Subtraktion: Operanden UNTEREINANDER -----
    // Extra-Spalte links (W = dcols+1) für das Rechenzeichen, das immer DIREKT
    // links neben die zweite Zahl gesetzt wird (gleichmäßiger Abstand).
    const dcols = Math.max(String(a).length, String(b).length, String(res).length);
    const opSign = op === "-" ? "−" : "+";
    const rightCells = (num, kind, shift = 0) => [null, ...numCells(num, dcols, kind, shift)]; // Länge dcols+1
    const carryCells = () => {
      const A = String(a).padStart(dcols, "0").split("").map(Number), B = String(b).padStart(dcols, "0").split("").map(Number);
      const at = Array(dcols).fill(null); let c = 0;
      for (let i = dcols - 1; i >= 0; i--) {
        if (op === "+") { const s = A[i] + B[i] + c; c = s >= 10 ? 1 : 0; }
        else { c = A[i] < (B[i] + c) ? 1 : 0; }
        if (c === 1 && i - 1 >= 0) at[i - 1] = { ch: "1", kind: "carry" }; // Übertrag in die nächste Spalte links
      }
      return at;
    };
    const bRow = rightCells(b, "ink");
    bRow[dcols - String(b).length] = { ch: opSign, kind: "op" }; // direkt links neben die erste Ziffer von b
    const showCarry = block.carries !== false;
    return (
      <div style={{ display: "inline-flex", flexDirection: "column" }}>
        {Row(rightCells(a, "ink"), "a")}
        {Row(bRow, "b")}
        {showCarry && Row([null, ...carryCells()], "c")}
        {Line(dcols, 1)}
        {Row(rightCells(res, "answer"), "r")}
      </div>
    );
  }

  // Mehrere Rechnungen gleichen Typs in einem Raster
  function WrittenMath({ block, solve }) {
    const op = block.op || "+";
    const items = (block.items && block.items.length) ? block.items
      : (block.a != null ? [{ a: block.a, b: block.b, res: block.res }] : []); // Abwärtskompatibilität (Einzel-Block)
    const cols = Math.max(1, Math.min(block.cols || 2, items.length || 1));
    return (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, auto)`, gap: "30px 48px", justifyContent: "center", justifyItems: "center" }}>
        {items.map((it, i) => <OneWritten key={i} a={it.a} b={it.b} res={it.res} op={op} block={block} solve={solve} />)}
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

  // ---------- Punktefeld (Zehner-/Zwanziger-/Hunderterfeld) ----------
  function DotField({ block, solve }) {
    const field = block.field || "zwanzig";
    const cap = field === "zehn" ? 10 : field === "hundert" ? 100 : 20;
    const value = Math.max(0, Math.min(cap, +block.value || 0));
    const showN = solve || block.showNumber;
    const cols = field === "hundert" ? 10 : 5;
    const rows = cap / cols;
    const rowGroup = field === "hundert" ? 5 : 2;            // Lücke nach 5 Reihen (Hunderter) bzw. 2 (Zwanziger = zwei Zehnerfelder)
    const cell = field === "hundert" ? 22 : 34;
    const gap = Math.round(cell * 0.5);
    const r = cell * 0.30;
    const W = cols * cell + Math.floor((cols - 1) / 5) * gap;
    const H = rows * cell + Math.floor((rows - 1) / rowGroup) * gap;
    const dots = [];
    for (let i = 0; i < cap; i++) {
      const c = i % cols, rr = Math.floor(i / cols);
      const x = c * cell + Math.floor(c / 5) * gap + cell / 2;
      const y = rr * cell + Math.floor(rr / rowGroup) * gap + cell / 2;
      const filled = i < value;
      dots.push(<circle key={i} cx={x} cy={y} r={r}
        fill={filled ? "var(--teal)" : "#fff"} stroke={filled ? "var(--teal-700)" : "var(--ink-soft)"} strokeWidth={filled ? 1 : 1.6} />);
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>{dots}</svg>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 72, height: 50, borderRadius: 11, border: "2px solid var(--ink-soft)", fontFamily: "var(--ui)", fontSize: 28, fontWeight: 800, color: showN ? "var(--sol)" : "transparent" }}>{value}</div>
      </div>
    );
  }

  // ---------- Hundertertafel ----------
  function HundredChart({ block, solve, onPatch }) {
    const blanks = block.blanks || [];
    const bset = new Set(blanks);
    const editable = !!onPatch && !solve;
    const cell = 44;
    const toggle = (n) => { if (!editable) return; onPatch({ blanks: bset.has(n) ? blanks.filter(x => x !== n) : [...blanks, n].sort((a, b) => a - b) }); };
    const nums = []; for (let i = 1; i <= 100; i++) nums.push(i);
    return (
      <div>
        {editable && <div style={{ fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: "var(--teal-700)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><Icon name="target" size={14} /> Tippe Felder an, um sie als Lücke auszublenden.</div>}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(10, ${cell}px)`, width: "max-content", margin: "0 auto", border: "2px solid var(--ink-soft)", borderRadius: 8, overflow: "hidden" }}>
          {nums.map(n => {
            const blank = bset.has(n);
            const c = (n - 1) % 10, rr = Math.floor((n - 1) / 10);
            return (
              <div key={n} onClick={() => toggle(n)}
                style={{ height: cell, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ui)", fontSize: 16, fontWeight: 600,
                  borderRight: c < 9 ? "1px solid var(--line)" : "none", borderBottom: rr < 9 ? "1px solid var(--line)" : "none",
                  background: blank ? (solve ? "rgba(21,128,61,.08)" : "#FFFDEB") : "#fff",
                  color: blank ? (solve ? "var(--sol)" : "transparent") : "var(--ink)",
                  cursor: editable ? "pointer" : "default", userSelect: "none" }}>
                {n}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- Zahlenhaus (Zerlegungshaus) ----------
  function NumHouse({ block, solve }) {
    const target = block.target ?? 10;
    const rows = block.rows || [];
    const sz = block.size || 22;
    const W = 190;
    const Cell = ({ val, hidden }) => (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: sz * 1.95 }}>
        {hidden
          ? <span style={{ minWidth: sz * 1.7, height: sz * 1.5, padding: `0 ${Math.round(sz * 0.3)}px`, borderRadius: 8, border: "2px solid var(--ink-soft)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ui)", fontWeight: 800, fontSize: sz, color: solve ? "var(--sol)" : "transparent" }}>{val}</span>
          : <span style={{ fontFamily: "var(--ui)", fontWeight: 700, fontSize: sz, color: "var(--ink)" }}>{val}</span>}
      </div>
    );
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ width: W }}>
          <svg width={W} height={60} viewBox={`0 0 ${W} 60`} style={{ display: "block" }}>
            <path d={`M3 58 L${W / 2} 5 L${W - 3} 58 Z`} fill="var(--teal-50)" stroke="var(--teal)" strokeWidth="2.5" strokeLinejoin="round" />
            <text x={W / 2} y="48" textAnchor="middle" fontFamily="var(--ui)" fontWeight="800" fontSize="30" fill="var(--teal-700)">{target}</text>
          </svg>
          <div style={{ border: "2.5px solid var(--teal)", borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
            {rows.map((r, i) => (
              <div key={i} style={{ display: "flex", borderTop: i ? "1.5px solid var(--line)" : "none" }}>
                <Cell val={r.a} hidden={r.hide === "a"} />
                <div style={{ borderLeft: "1.5px dashed var(--line)" }} />
                <Cell val={r.b} hidden={r.hide === "b"} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Bild beschriften (Teile eines Bildes benennen) ----------
  function ImageLabel({ block, solve, onPatch }) {
    const points = block.points || [];
    const editable = !!onPatch && !solve;
    const w = block.size || 320;
    const hasImg = !!(block.src || block.art);
    const seed = String(block.id || "i").split("").reduce((a, c) => a + c.charCodeAt(0), 5);
    const words = points.map(p => p.word).filter(Boolean);

    if (!hasImg) {
      return (
        <div style={{ border: "2px dashed var(--line)", borderRadius: 14, padding: "30px 18px", textAlign: "center", fontFamily: "var(--ui)", color: "var(--muted)" }}>
          <span style={{ display: "inline-flex", width: 38, height: 38, borderRadius: 10, background: "var(--bg-rail)", color: "var(--teal-700)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}><Icon name="image" size={20} /></span>
          <div style={{ fontWeight: 700, color: "var(--ink-soft)", fontSize: 14 }}>Bild beschriften</div>
          <div style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.45 }}>Lade rechts ein Bild hoch (z. B. Pflanze, Körper). Dann tippe auf das Bild, um nummerierte Punkte zu setzen.</div>
        </div>
      );
    }

    const onImgClick = (e) => {
      if (!editable) return;
      const r = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      onPatch({ points: [...points, { x: +Math.min(1, Math.max(0, x)).toFixed(3), y: +Math.min(1, Math.max(0, y)).toFixed(3), word: "" }] });
    };
    const removePoint = (i) => onPatch && onPatch({ points: points.filter((_, j) => j !== i) });
    const bankWords = block.bank && words.length ? seededShuffle(words, seed) : null;

    return (
      <div>
        {bankWords && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px", padding: "10px 14px", marginBottom: 14, border: "2px dashed var(--teal)", borderRadius: 12, background: "var(--teal-50)" }}>
            <span style={{ fontWeight: 700, color: "var(--teal-700)", fontFamily: "var(--ui)", fontSize: 13, alignSelf: "center" }}>Wortspeicher:</span>
            {bankWords.map((b, i) => <span key={i} className={fontClass(block.font || "grundschrift")} style={{ fontWeight: 600, fontSize: 16 }}>{b}</span>)}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative", width: w, cursor: editable ? "crosshair" : "default" }} onClick={onImgClick}>
            {block.src
              ? <img src={block.src} alt="" draggable="false" style={{ width: "100%", display: "block", borderRadius: 8 }} />
              : <div style={{ width: w, height: w }} dangerouslySetInnerHTML={{ __html: clipartSvg(block.art) }} />}
            {points.map((p, i) => (
              <span key={i} onClick={editable ? (e) => { e.stopPropagation(); removePoint(i); } : undefined}
                style={{ position: "absolute", left: `${p.x * 100}%`, top: `${p.y * 100}%`, transform: "translate(-50%,-50%)",
                  width: 28, height: 28, borderRadius: "50%", background: "var(--teal-700)", color: "#fff",
                  border: "2.5px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--ui)", fontWeight: 800, fontSize: 14, cursor: editable ? "pointer" : "default" }}>{i + 1}</span>
            ))}
          </div>
        </div>
        {editable && <div style={{ textAlign: "center", fontFamily: "var(--ui)", fontSize: 12, color: "var(--teal-700)", marginTop: 6 }}><Icon name="target" size={13} style={{ verticalAlign: "-2px" }} /> Auf das Bild tippen setzt einen Punkt · Punkt antippen entfernt ihn</div>}
        {points.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "12px 22px", marginTop: 16 }}>
            {points.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-end", gap: 9 }}>
                <span style={{ width: 24, height: 24, flex: "none", borderRadius: "50%", background: "var(--teal-50)", color: "var(--teal-700)", border: "2px solid var(--teal)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ui)", fontWeight: 800, fontSize: 13 }}>{i + 1}</span>
                <span className={fontClass(block.font || "grundschrift")} style={{ flex: 1, borderBottom: "2px solid var(--ink-soft)", minHeight: 26, fontSize: 18, color: "var(--sol)", fontWeight: 700, paddingLeft: 4 }}>{solve ? p.word : " "}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------- Selbstkontrolle (Lösungsband / Zahlenschlange) ----------
  function SelfCheck({ block, doc, solve }) {
    const all = ((doc && doc.blocks) || []).filter(b => SC_ELIGIBLE.includes(b.type));
    // sources == null  →  automatisch ALLE Rechen-Aufgaben auf dem Blatt
    const sources = block.sources == null ? all : all.filter(b => block.sources.includes(b.id));
    let nums = [];
    sources.forEach(b => { nums = nums.concat(collectSolutions(b)); });
    const seed = String(block.id || "s").split("").reduce((a, c) => a + c.charCodeAt(0), 11);
    const decoys = makeDecoys(nums, block.decoys || 0, seed);
    const tokens = seededShuffle(nums.map(v => ({ v })).concat(decoys.map(v => ({ v, decoy: true }))), seed);
    const sz = block.size || 22;
    const heading = block.heading != null ? block.heading : "Selbstkontrolle";
    const shape = block.shape === "schlange" ? "schlange" : "band";

    const Head = () => (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--sol)", color: "#fff", flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="selfcheck" size={18} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 15, color: "var(--ink)" }}>{heading}</div>
          <div style={{ fontFamily: "var(--ui)", fontSize: 12, color: "var(--muted)" }}>Rechne und hake jedes gefundene Ergebnis ab.</div>
        </div>
      </div>
    );

    if (!tokens.length) {
      return (
        <div style={{ border: "2px dashed var(--line)", borderRadius: 14, padding: "20px 18px", textAlign: "center", fontFamily: "var(--ui)", color: "var(--muted)" }}>
          <span style={{ display: "inline-flex", width: 34, height: 34, borderRadius: "50%", background: "var(--bg-rail)", color: "var(--sol)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}><Icon name="selfcheck" size={19} /></span>
          <div style={{ fontWeight: 700, color: "var(--ink-soft)", fontSize: 14 }}>Noch keine Lösungen</div>
          <div style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.45 }}>Tippe rechts die Rechen-Aufgaben an, deren Ergebnisse hier zum Abhaken erscheinen sollen.</div>
        </div>
      );
    }

    const Pill = ({ t }) => {
      const isDecoy = solve && t.decoy;
      return (
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none",
          minWidth: sz * 2, height: sz * 1.8, padding: `0 ${Math.round(sz * 0.5)}px`, borderRadius: 12,
          border: "2px solid " + (isDecoy ? "var(--syl-red)" : "var(--sol)"), background: "#fff",
          fontFamily: "var(--ui)", fontWeight: 800, fontSize: sz, lineHeight: 1,
          color: isDecoy ? "var(--syl-red)" : "var(--ink)", textDecoration: isDecoy ? "line-through" : "none" }}>
          {t.v}
        </span>
      );
    };

    // Schlangenkopf mit Augen, Nasenlöchern und gespaltener Zunge (zeigt nach rechts)
    const SnakeHead = () => (
      <svg aria-hidden width={sz * 2.15} height={sz * 1.8} viewBox="0 0 44 38" style={{ flex: "none", display: "block", overflow: "visible" }}>
        <path d="M33 19 H41 M41 19 L45 16 M41 19 L45 22" stroke="var(--syl-red)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="20" cy="19" rx="17" ry="14" fill="var(--sol)" />
        <circle cx="15" cy="13" r="3.6" fill="#fff" />
        <circle cx="26" cy="13" r="3.6" fill="#fff" />
        <circle cx="15.6" cy="13.4" r="1.7" fill="#0b3d22" />
        <circle cx="26.6" cy="13.4" r="1.7" fill="#0b3d22" />
        <circle cx="32" cy="20.5" r="0.9" fill="#0b3d22" />
        <circle cx="32" cy="24" r="0.9" fill="#0b3d22" />
      </svg>
    );

    if (shape === "schlange") {
      // Serpentine (Boustrophedon): Zeilen wechseln die Richtung → es windet sich
      // wie eine echte Schlange. Kopf am Anfang, gleichmäßig, auch bei vielen Zahlen.
      const gap = Math.round(sz * 0.42);
      const headW = sz * 2.15;
      const perRow = Math.max(5, Math.floor((640 - headW) / (sz * 2 + gap)));
      const rows = [];
      for (let i = 0; i < tokens.length; i += perRow) rows.push(tokens.slice(i, i + perRow));
      return (
        <div>
          <Head />
          <div style={{ display: "flex", flexDirection: "column", gap: Math.round(sz * 0.5), paddingTop: 4 }}>
            {rows.map((row, ri) => {
              const disp = ri % 2 === 1 ? [...row].reverse() : row;  // ungerade Zeilen rückwärts → U-Wende
              return (
                <div key={ri} style={{ display: "flex", flexWrap: "nowrap", alignItems: "center", gap, justifyContent: ri % 2 === 1 ? "flex-end" : "flex-start" }}>
                  {ri === 0 && <SnakeHead />}
                  {disp.map((t, i) => <Pill key={i} t={t} />)}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div style={{ border: "2px dashed var(--sol)", background: "rgba(21,128,61,.06)", borderRadius: 16, padding: "14px 16px" }}>
        <Head />
        <div style={{ display: "flex", flexWrap: "wrap", gap: Math.round(sz * 0.5) }}>
          {tokens.map((t, i) => <Pill key={i} t={t} i={i} />)}
        </div>
      </div>
    );
  }

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
      case "unitcalc": return withPrompt(block, <UnitRows block={block} solve={solve} />);
      case "writtenmath": return withPrompt(block, <WrittenMath block={block} solve={solve} />);
      case "mathwall": return withPrompt(block, <MathWall block={block} solve={solve} />);
      case "mathtri":  return withPrompt(block, <MathTri block={block} solve={solve} />);
      case "numline":  return withPrompt(block, <NumLine block={block} solve={solve} onPatch={onPatch} />);
      case "clock":    return withPrompt(block, <Clock block={block} solve={solve} />);
      case "dotfield": return withPrompt(block, <DotField block={block} solve={solve} />);
      case "hundredchart": return withPrompt(block, <HundredChart block={block} solve={solve} onPatch={onPatch} />);
      case "numhouse": return withPrompt(block, <NumHouse block={block} solve={solve} />);
      case "imagelabel": return withPrompt(block, <ImageLabel block={block} solve={solve} onPatch={onPatch} />);
      case "wordsearch": return withPrompt(block, <WordSearch block={block} solve={solve} />);
      case "table":    return <Table block={block} onPatch={onPatch} />;
      case "task":     return <TaskInstr block={block} onPatch={onPatch} />;
      case "divider":  return <Divider block={block} />;
      case "selfcheck": return <SelfCheck block={block} doc={doc} solve={solve} />;
      case "pagebreak": return <PageBreak />;
      default:         return <div style={{ color: "var(--muted)" }}>Unbekannter Block</div>;
    }
  }

export { Block };
