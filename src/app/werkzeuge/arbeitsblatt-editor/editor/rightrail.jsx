import React from "react";
import { DKI } from "./data";
import { DKU } from "./utils";
import { Icon } from "./icons";

/* ============================================================
   Right rail — properties + Differenzierung
   ============================================================ */
  const { FONTS, SYL_SCHEMES, CLIPART } = DKI;
  const { CLIP_LABELS, clipartSvg, SC_ELIGIBLE, collectSolutions } = DKU;

  // ---- reusable controls ----
  const Section = ({ title, children, right }) => (
    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line-soft)" }}>
      {title && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted-2)" }}>{title}</span>
        {right}
      </div>}
      {children}
    </div>
  );
  const Row = ({ label, children }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 600 }}>{label}</span>
      {children}
    </div>
  );
  const Segmented = ({ value, onChange, options }) => (
    <div style={{ display: "inline-flex", background: "var(--bg-rail)", borderRadius: 9, padding: 3, gap: 2 }}>
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} data-tip={o.tip}
          style={{ border: "none", background: value === o.v ? "#fff" : "transparent", color: value === o.v ? "var(--ink)" : "var(--muted)",
                   borderRadius: 7, padding: o.icon ? "5px 8px" : "5px 11px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                   boxShadow: value === o.v ? "var(--shadow-sm)" : "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
          {o.icon && <Icon name={o.icon} size={16} />}{o.label}
        </button>
      ))}
    </div>
  );
  // Zahl per +/- ODER direkter Eingabe (iPad: numerische Tastatur via inputMode).
  // Tippen wird in lokalem Text-State gehalten und erst bei Verlassen/Enter
  // geklemmt übernommen – so kann man das Feld zwischendurch leeren.
  function Stepper({ value, onChange, min = 0, max = 99, step = 1, suffix }) {
    const [txt, setTxt] = React.useState(String(value));
    React.useEffect(() => { setTxt(String(value)); }, [value]);
    const commit = (raw) => {
      let n = parseFloat(String(raw).replace(",", "."));
      if (!Number.isFinite(n)) n = value;
      n = +Math.max(min, Math.min(max, n)).toFixed(2);
      onChange(n); setTxt(String(n));
    };
    const bump = (d) => onChange(+Math.max(min, Math.min(max, +(value + d).toFixed(2))));
    return (
      <div style={{ display: "inline-flex", alignItems: "center", background: "var(--bg-rail)", borderRadius: 9, padding: 2 }}>
        <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => bump(-step)}><Icon name="minus" size={15} /></button>
        <div style={{ display: "inline-flex", alignItems: "baseline", justifyContent: "center", width: 46 }}>
          <input value={txt} inputMode="decimal" aria-label="Wert"
            onChange={e => setTxt(e.target.value.replace(/[^0-9.,\-]/g, ""))}
            onFocus={e => e.target.select()}
            onBlur={e => commit(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(e.currentTarget.value); e.currentTarget.blur(); } }}
            style={{ width: suffix ? 26 : 40, textAlign: "center", fontSize: 13, fontWeight: 700, border: "none", background: "transparent", outline: "none", color: "var(--ink)", font: "inherit", padding: 0 }} />
          {suffix && <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)" }}>{suffix}</span>}
        </div>
        <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => bump(step)}><Icon name="plus" size={15} /></button>
      </div>
    );
  }
  const Toggle = ({ value, onChange }) => (
    <button onClick={() => onChange(!value)} style={{ width: 40, height: 23, borderRadius: 999, border: "none", cursor: "pointer", position: "relative",
      background: value ? "var(--teal)" : "#CBD5E1", transition: "background .16s" }}>
      <span style={{ position: "absolute", top: 2, left: value ? 19 : 2, width: 19, height: 19, borderRadius: "50%", background: "#fff", transition: "left .16s", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} />
    </button>
  );
  const TextArea = ({ value, onChange, rows = 4, placeholder }) => (
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
      style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 11px", font: "inherit", fontSize: 13, lineHeight: 1.55, resize: "vertical", outline: "none", color: "var(--ink)" }}
      onFocus={e => e.target.style.borderColor = "var(--teal)"} onBlur={e => e.target.style.borderColor = "var(--line)"} />
  );

  function FontPicker({ value, onChange }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {FONTS.map(f => (
          <button key={f.id} onClick={() => onChange(f.id)}
            style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 12px", border: "1.5px solid " + (value === f.id ? "var(--teal)" : "var(--line)"),
                     borderRadius: 10, background: value === f.id ? "var(--teal-50)" : "#fff", cursor: "pointer", textAlign: "left" }}>
            <span className={f.css} style={{ fontSize: 22, width: 56, flex: "none", color: "var(--ink)", overflow: "hidden", whiteSpace: "nowrap" }}>{f.sample}</span>
            <span style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{f.label}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{f.note}</div>
            </span>
            {value === f.id && <span style={{ marginLeft: "auto", color: "var(--teal)" }}><Icon name="check" size={17} /></span>}
          </button>
        ))}
      </div>
    );
  }

  function SchemePicker({ value, onChange }) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
        {SYL_SCHEMES.map(s => (
          <button key={s.id} onClick={() => onChange(s.id)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", border: "1.5px solid " + (value === s.id ? "var(--teal)" : "var(--line)"),
                     borderRadius: 10, background: value === s.id ? "var(--teal-50)" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>
            <span style={{ display: "flex", gap: 3 }}>
              <b style={{ color: s.colors[0] }}>An</b><b style={{ color: s.colors[1] }}>na</b>
            </span>
          </button>
        ))}
      </div>
    );
  }

  const AlignSeg = ({ value, onChange }) => (
    <Segmented value={value || "left"} onChange={onChange} options={[
      { v: "left", icon: "align_left", tip: "Links" },
      { v: "center", icon: "align_center", tip: "Zentriert" },
      { v: "right", icon: "align_right", tip: "Rechts" },
    ]} />
  );

  // ---- per-block property editors ----
  function BlockProps({ block, patch, onPickImage, doc }) {
    const t = block.type;
    if (t === "title") return (<>
      <Section title="Text"><TextArea value={block.text} onChange={v => patch({ text: v })} rows={2} /></Section>
      <Section title="Format">
        <Row label="Ausrichtung"><AlignSeg value={block.align} onChange={v => patch({ align: v })} /></Row>
        <Row label="Größe"><Stepper value={block.size} min={16} max={56} step={2} onChange={v => patch({ size: v })} /></Row>
      </Section>
    </>);

    if (t === "syllable") {
      const insertSep = () => {
        const ta = document.activeElement;
        if (ta && ta.tagName === "TEXTAREA") {
          const s = ta.selectionStart, e = ta.selectionEnd, val = ta.value;
          patch({ text: val.slice(0, s) + "·" + val.slice(e) });
          requestAnimationFrame(() => { try { ta.focus(); ta.selectionStart = ta.selectionEnd = s + 1; } catch (_) {} });
        } else { patch({ text: (block.text || "") + "·" }); }
      };
      const symode = block.mode || "silben";
      return (<>
        <Section title="Hervorheben">
          <Segmented value={symode} onChange={v => patch({ mode: v })} options={[{ v: "silben", label: "Silben" }, { v: "selbstlaute", label: "Selbstlaute" }]} />
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "9px 2px 0", lineHeight: 1.5 }}>
            {symode === "selbstlaute" ? "Färbt nur die Selbstlaute (a, e, i, o, u und Umlaute)." : "Färbt die Silben abwechselnd zweifarbig."}
          </p>
        </Section>
        <Section title="Text">
          <TextArea value={block.text} onChange={v => patch({ text: v })} rows={5} placeholder="Text eingeben – Silben werden automatisch eingefärbt" />
          {symode === "silben" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 9px", flex: "none" }} onMouseDown={e => e.preventDefault()} onClick={insertSep}>· Silbe trennen</button>
              <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>Falsche Trennung? Setze · oder | an die richtige Stelle (z. B. Sa·la·man·der).</span>
            </div>
          )}
        </Section>
        <Section title={symode === "selbstlaute" ? "Farbe" : "Silben-Farben"}><SchemePicker value={block.scheme} onChange={v => patch({ scheme: v })} /></Section>
        <Section title="Schrift"><FontPicker value={block.font} onChange={v => patch({ font: v })} /></Section>
        <Section title="Größe"><Stepper value={block.size} min={16} max={44} step={2} onChange={v => patch({ size: v })} /></Section>
      </>);
    }

    if (t === "wordplay") {
      const wm = block.mode || "woerter";
      const PH = {
        woerter: "Ein Wort pro Zeile:\nIgel\nBaum\nWald",
        satz: "Ein Satz pro Zeile:\nDer Igel sucht ein Versteck.\nIm Winter hält er Winterschlaf.",
        schlange: "Wörter (werden aneinandergehängt):\nIgel Baum Wald Nest",
        gross: "Ein Satz pro Zeile (richtig geschrieben):\nDer Igel lebt im Wald.\nAnna liest ein Buch.",
      };
      return (<>
        <Section title="Übungstyp">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[["woerter", "Schüttelwörter"], ["satz", "Schüttelsätze"], ["schlange", "Wörterschlange"], ["gross", "Großschreibung"]].map(([v, l]) => (
              <button key={v} onClick={() => patch({ mode: v })}
                style={{ padding: "9px 6px", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                  border: "1.5px solid " + (wm === v ? "var(--teal)" : "var(--line)"), background: wm === v ? "var(--teal-50)" : "#fff", color: wm === v ? "var(--teal-700)" : "var(--ink-soft)" }}>{l}</button>
            ))}
          </div>
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "9px 2px 0", lineHeight: 1.5 }}>
            {wm === "satz" ? "Die Wörter jedes Satzes werden gemischt – die Kinder bringen sie in die richtige Reihenfolge."
              : wm === "schlange" ? "Die Wörter werden ohne Lücken aneinandergehängt – die Kinder trennen sie wieder."
              : wm === "gross" ? "Der Satz erscheint komplett klein – die Kinder schreiben ihn mit richtiger Groß-/Kleinschreibung ab."
              : "Die Buchstaben jedes Wortes werden gemischt – die Kinder finden das richtige Wort."}
          </p>
        </Section>
        <Section title="Text">
          <TextArea value={block.text} onChange={v => patch({ text: v })} rows={6} placeholder={PH[wm]} />
        </Section>
        {wm === "woerter" && <Section title="Spalten"><Row label="Spalten"><Stepper value={block.cols || 3} min={1} max={4} onChange={v => patch({ cols: v })} /></Row></Section>}
        <Section title="Schrift"><FontPicker value={block.font} onChange={v => patch({ font: v })} /></Section>
        <Section title="Größe"><Stepper value={block.size || 24} min={16} max={40} step={2} onChange={v => patch({ size: v })} /></Section>
        {(wm === "woerter" || wm === "satz") && (
          <Section><button className="btn" style={{ width: "100%" }} onClick={() => patch({ seed: Date.now() % 100000 })}><Icon name="redo" size={16} /> Neu mischen</button></Section>
        )}
      </>);
    }

    if (t === "cloze") {
      const segs = block.text.split(/(\s+)/);
      const wordCore = (seg) => {
        const lead = seg.match(/^[^\wäöüÄÖÜß]*/u)[0];
        const trail = seg.match(/[^\wäöüÄÖÜß]*$/u)[0];
        return { lead, trail, core: seg.slice(lead.length, seg.length - (trail.length || 0)) };
      };
      const toggleGap = (targetWi) => {
        let wi = -1;
        const out = segs.map(seg => {
          if (/^\s*$/.test(seg)) return seg;
          wi++;
          if (wi !== targetWi) return seg;
          const { lead, trail, core } = wordCore(seg);
          let nc = core;
          if (/^__.+__$/.test(core)) nc = core.slice(2, -2);
          else if (core.length) nc = "__" + core + "__";
          return lead + nc + trail;
        });
        patch({ text: out.join("") });
      };
      const chips = [];
      let wi = -1;
      segs.forEach(seg => {
        if (/^\s*$/.test(seg)) return;
        wi++;
        const { core } = wordCore(seg);
        const isGap = /^__.+__$/.test(core);
        const label = (isGap ? core.slice(2, -2) : core) || seg;
        if (label) chips.push({ i: wi, label, isGap });
      });
      const gapCount = chips.filter(c => c.isGap).length;
      return (<>
        <Section title="Text">
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.5 }}>Schreibe den ganzen Satz. Tippe darunter die Wörter an, die zur Lücke werden sollen.</p>
          <TextArea value={block.text} onChange={v => patch({ text: v })} rows={4} />
        </Section>
        <Section title="Lückenwörter antippen" right={<span style={{ fontSize: 11, fontWeight: 700, color: "var(--teal-700)", background: "var(--teal-50)", padding: "2px 8px", borderRadius: 999 }}>{gapCount}</span>}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {chips.map(c => (
              <button key={c.i} onClick={() => toggleGap(c.i)} data-tip={c.isGap ? "Wieder anzeigen" : "Zur Lücke machen"}
                style={{ fontSize: 13, fontWeight: 600, padding: "5px 10px", borderRadius: 8, cursor: "pointer",
                  border: "1.5px solid " + (c.isGap ? "var(--teal)" : "var(--line)"),
                  background: c.isGap ? "var(--teal)" : "#fff", color: c.isGap ? "#fff" : "var(--ink-soft)" }}>
                {c.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: "9px 2px 0", lineHeight: 1.45 }}>Grün markierte Wörter werden zur Lücke und erscheinen im Wortspeicher.</p>
        </Section>
        <Section title="Optionen">
          <Row label="Wortspeicher zeigen"><Toggle value={block.bank !== false} onChange={v => patch({ bank: v })} /></Row>
          <Row label="Lücke">
            <Segmented value={block.gapStyle || "line"} onChange={v => patch({ gapStyle: v })} options={[
              { v: "line", label: "Linie" }, { v: "letters", label: "Käst." }, { v: "first", label: "1. B." }]} />
          </Row>
        </Section>
        <Section title="Schrift"><FontPicker value={block.font} onChange={v => patch({ font: v })} /></Section>
      </>);
    }

    if (t === "reading") {
      const TEXTS = DKI.READING_TEXTS || [];
      const cats = [...new Set(TEXTS.map(x => x.cat))];
      return (<>
      <Section title="Text-Vorrat">
        <select value="" onChange={e => { const x = TEXTS[+e.target.value]; if (x) patch({ text: x.text }); }}
          style={{ width: "100%", border: "1.5px solid var(--teal)", background: "var(--teal-50)", color: "var(--teal-700)", borderRadius: 9, padding: "8px 10px", font: "inherit", fontSize: 12.5, fontWeight: 700, outline: "none", cursor: "pointer" }}>
          <option value="" disabled>📚 Lese- oder Sachtext wählen …</option>
          {cats.map(c => (
            <optgroup key={c} label={c}>
              {TEXTS.map((x, i) => x.cat === c ? <option key={i} value={i}>{"Kl. " + x.level + " · " + x.title}</option> : null)}
            </optgroup>
          ))}
        </select>
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "7px 2px 0", lineHeight: 1.45 }}>Fertigen Text einsetzen und nach Bedarf anpassen. Eigene Texte schreibst du einfach unten hinein.</p>
      </Section>
      <Section title="Text"><TextArea value={block.text} onChange={v => patch({ text: v })} rows={7} /></Section>
      <Section title="Optionen">
        <Row label="Zeilennummern"><Toggle value={!!block.numbers} onChange={v => patch({ numbers: v })} /></Row>
        <Row label="Ausrichtung"><AlignSeg value={block.align} onChange={v => patch({ align: v })} /></Row>
        <Row label="Größe"><Stepper value={block.size} min={14} max={32} step={1} onChange={v => patch({ size: v })} /></Row>
      </Section>
      <Section title="Schrift"><FontPicker value={block.font} onChange={v => patch({ font: v })} /></Section>
    </>);
    }

    if (t === "name") return (
      <Section title="Felder">
        <Row label="Name"><Toggle value={block.show?.name !== false} onChange={v => patch({ show: { ...block.show, name: v } })} /></Row>
        <Row label="Klasse"><Toggle value={!!block.show?.klasse} onChange={v => patch({ show: { ...block.show, klasse: v } })} /></Row>
        <Row label="Datum"><Toggle value={block.show?.date !== false} onChange={v => patch({ show: { ...block.show, date: v } })} /></Row>
      </Section>
    );

    if (t === "image") {
      const mode = block.mode || "plain";
      const items = (block.items && block.items.length) ? block.items : [{ art: block.art || "apfel", word: block.caption || "" }];
      const setItem = (i, p) => patch({ items: items.map((x, j) => j === i ? { ...x, ...p } : x) });
      const removeItem = (i) => { const a = items.filter((_, j) => j !== i); patch({ items: a.length ? a : [{ art: "apfel", word: "" }] }); };
      // Beim Hinzufügen automatisch nebeneinander anordnen (Spalten = Anzahl, max. 4)
      const addItem = (art) => { const ni = [...items, { art, word: CLIP_LABELS[art] }]; patch({ items: ni, cols: Math.min(4, ni.length) }); };
      const loadScaled = (file) => new Promise(res => {
        const r = new FileReader();
        r.onload = () => { const img = new Image(); img.onload = () => {
          const m = 260; let w = img.width, h = img.height; const sc = Math.min(1, m / Math.max(w, h));
          w = Math.round(w * sc); h = Math.round(h * sc);
          const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h);
          res({ src: c.toDataURL("image/png"), word: file.name.replace(/\.[^.]+$/, "").slice(0, 24) });
        }; img.src = r.result; };
        r.readAsDataURL(file);
      });
      const addUpload = () => {
        const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.multiple = true;
        inp.onchange = () => { const files = [...inp.files]; if (!files.length) return; Promise.all(files.map(loadScaled)).then(arr => { const ni = [...items, ...arr]; patch({ items: ni, cols: Math.min(4, ni.length) }); }); };
        inp.click();
      };
      const MotifGrid = ({ onPick, sel }) => (
        <div className="scroll" style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 4, maxHeight: 156, overflowY: "auto", padding: 2 }}>
          {CLIPART.map(c => (
            <button key={c} onClick={() => onPick(c)} data-tip={CLIP_LABELS[c]}
              style={{ aspectRatio: "1", padding: 3, borderRadius: 7, cursor: "pointer", background: sel === c ? "var(--teal-50)" : "var(--bg-rail)", border: "1.5px solid " + (sel === c ? "var(--teal)" : "transparent") }}
              dangerouslySetInnerHTML={{ __html: clipartSvg(c) }} />
          ))}
        </div>
      );

      const MODES = [
        { v: "plain", l: "Bild", d: "nur Illustration" },
        { v: "label", l: "Beschriften", d: "mit Schreiblinie" },
        { v: "count", l: "Zählen", d: "Anzahl eintragen" },
        { v: "story", l: "Geschichte", d: "nummerierte Folge" },
      ];
      const modeSel = (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          {MODES.map(o => (
            <button key={o.v} onClick={() => patch({ mode: o.v })}
              style={{ padding: "8px 9px", textAlign: "left", border: "1.5px solid " + (mode === o.v ? "var(--teal)" : "var(--line)"), borderRadius: 10, background: mode === o.v ? "var(--teal-50)" : "#fff", cursor: "pointer" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{o.l}</div>
              <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{o.d}</div>
            </button>
          ))}
        </div>
      );

      if (mode === "count") return (<>
        <Section title="Verwendung">
          {modeSel}
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "10px 2px 0", lineHeight: 1.5 }}>Das Motiv erscheint mehrfach – die Kinder zählen und tragen die Zahl ein.</p>
        </Section>
        <Section title="Motiv"><MotifGrid sel={items[0].art} onPick={c => patch({ items: [{ art: c, word: CLIP_LABELS[c] }] })} /></Section>
        <Section title="Einstellungen">
          <Row label="Anzahl"><Stepper value={block.num || 3} min={1} max={12} onChange={v => patch({ num: v })} /></Row>
          <Row label="Bildgröße"><Stepper value={block.size} min={40} max={120} step={10} onChange={v => patch({ size: v })} /></Row>
        </Section>
      </>);

      return (<>
        <Section title="Verwendung">
          {modeSel}
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "10px 2px 0", lineHeight: 1.5 }}>
            {mode === "label" ? "Mehrere Bilder nebeneinander – unter jedem eine Schreiblinie für das Wort."
              : mode === "story" ? "Bilder in nummerierten Feldern – ideal für Bildergeschichten und Reihenfolgen."
              : "Ein oder mehrere Bilder nebeneinander zur Illustration."}
          </p>
        </Section>
        <Section title="Bilder" right={<span style={{ fontSize: 11, fontWeight: 700, color: "var(--teal-700)", background: "var(--teal-50)", padding: "2px 8px", borderRadius: 999 }}>{items.length}</span>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: 6, border: "1px solid var(--line)", borderRadius: 10 }}>
                <div style={{ width: 34, height: 34, flex: "none", borderRadius: 7, overflow: "hidden", background: "var(--bg-rail)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {it.src ? <img src={it.src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ width: 30, height: 30 }} dangerouslySetInnerHTML={{ __html: clipartSvg(it.art) }} />}
                </div>
                <input value={it.word || ""} onChange={e => setItem(i, { word: e.target.value })} placeholder={mode === "label" ? "Lösungswort" : "Beschriftung"}
                  style={{ flex: 1, minWidth: 0, border: "1px solid var(--line)", borderRadius: 7, padding: "5px 8px", font: "inherit", fontSize: 12.5, outline: "none" }} />
                <button className="icon-btn" style={{ width: 26, height: 26 }} data-tip="Entfernen" onClick={() => removeItem(i)}><Icon name="close" size={14} /></button>
              </div>
            ))}
          </div>
          <button className="btn" style={{ width: "100%", marginTop: 9 }} onClick={addUpload}><Icon name="download" size={15} /> Eigenes Bild hochladen</button>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted-2)", margin: "14px 2px 7px" }}>Clipart hinzufügen</div>
          <MotifGrid onPick={c => addItem(c)} />
        </Section>
        <Section title="Layout">
          <Row label="Spalten (nebeneinander)"><Stepper value={block.cols || items.length} min={1} max={8} onChange={v => patch({ cols: v })} /></Row>
          <Row label="Bildgröße"><Stepper value={block.size} min={50} max={200} step={10} onChange={v => patch({ size: v })} /></Row>
          <Row label="Abstand"><Stepper value={Number.isFinite(block.gap) ? block.gap : 26} min={6} max={60} step={2} onChange={v => patch({ gap: v })} /></Row>
          <Row label="Rahmen um Bilder"><Toggle value={block.frame !== false} onChange={v => patch({ frame: v })} /></Row>
          <Row label="Ausrichtung"><AlignSeg value={block.align} onChange={v => patch({ align: v })} /></Row>
        </Section>
        {mode === "label" && <Section title="Schrift für das Wort"><FontPicker value={block.font || "grundschrift"} onChange={v => patch({ font: v })} /></Section>}
      </>);
    }

    if (t === "lines") {
      const LINEATUR = [
        { v: "haus", label: "Haus (Kl. 1)", desc: "4 Linien, farbig" },
        { v: "vierlinien", label: "4 Linien", desc: "klassisch" },
        { v: "dreilinien", label: "3 Linien", desc: "Kl. 2–3" },
        { v: "grundlinie", label: "Grundlinie", desc: "Kl. 4" },
        { v: "karo", label: "Karo", desc: "Kästchen" },
      ];
      const cur = block.variant || (block.style === "haus" ? "haus" : "vierlinien");
      const lineaturSvg = (v) => {
        const W = 76, ht = 46;
        const L = (y, o = {}) => `<line x1="6" y1="${y}" x2="${W - 6}" y2="${y}" stroke="${o.c || "#B7C3CD"}" stroke-width="${o.w || 1.4}" ${o.d ? 'stroke-dasharray="4 3"' : ""}/>`;
        if (v === "karo") {
          let s = ""; const sq = 8;
          for (let x = 6; x <= W - 6; x += sq) s += `<line x1="${x}" y1="9" x2="${x}" y2="37" stroke="#C2D8E8" stroke-width="1"/>`;
          for (let y = 9; y <= 37; y += sq) s += `<line x1="6" y1="${y}" x2="${W - 6}" y2="${y}" stroke="#C2D8E8" stroke-width="1"/>`;
          return `<svg viewBox="0 0 ${W} ${ht}" width="100%" height="32">${s}</svg>`;
        }
        let b = "";
        if (v === "haus") b += `<rect x="6" y="19" width="${W - 12}" height="10" fill="rgba(43,182,172,.16)"/>`;
        if (v === "haus" || v === "vierlinien") b += L(11) + L(19) + L(29, { c: "#334155", w: 2 }) + L(37);
        if (v === "dreilinien") b += L(12) + L(22, { d: true }) + L(32, { c: "#334155", w: 2 });
        if (v === "grundlinie") b += L(17, { c: "#334155", w: 2 }) + L(33, { c: "#334155", w: 2 });
        return `<svg viewBox="0 0 ${W} ${ht}" width="100%" height="32">${b}</svg>`;
      };
      return (<>
        <Section title="Lineatur">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {LINEATUR.map(o => (
              <button key={o.v} onClick={() => patch({ variant: o.v })}
                style={{ padding: "7px 8px 6px", border: "1.5px solid " + (cur === o.v ? "var(--teal)" : "var(--line)"),
                  borderRadius: 10, background: cur === o.v ? "var(--teal-50)" : "#fff", cursor: "pointer", textAlign: "left" }}>
                <div style={{ border: "1px solid var(--line-soft)", borderRadius: 6, padding: "3px 4px", background: "#fff", marginBottom: 5 }}
                  dangerouslySetInnerHTML={{ __html: lineaturSvg(o.v) }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{o.label}</div>
                <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{o.desc}</div>
              </button>
            ))}
          </div>
        </Section>
        <Section title="Format">
          <Row label={cur === "karo" ? "Reihen" : "Zeilen"}><Stepper value={block.count} min={1} max={14} onChange={v => patch({ count: v })} /></Row>
          <Row label={cur === "karo" ? "Kästchengröße" : "Zeilenhöhe"}><Stepper value={block.height} min={16} max={48} step={2} onChange={v => patch({ height: v })} /></Row>
          {cur === "haus" && <Row label="Schreibhaus zeigen"><Toggle value={!!block.haus} onChange={v => patch({ haus: v })} /></Row>}
          {cur !== "karo" && <Row label="Startpunkt"><Toggle value={!!block.startDot} onChange={v => patch({ startDot: v })} /></Row>}
        </Section>
        {cur !== "karo" && (<>
          <Section title="Vorgabe zum Nachspuren">
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.5 }}>Ein graues Wort sitzt auf der Linie – die Kinder spuren es nach. Leer lassen für leere Linien.</p>
            <input value={block.word || ""} onChange={e => patch({ word: e.target.value })} placeholder="z. B. Mama"
              style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 9px", font: "inherit", fontSize: 13, outline: "none" }} />
            {block.word && (
              <div style={{ marginTop: 11 }}>
                <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600, marginBottom: 6 }}>Nachspur-Stil</div>
                <Segmented value={block.trace || "grau"} onChange={v => patch({ trace: v })} options={[
                  { v: "grau", label: "Grau" }, { v: "hell", label: "Hell" }, { v: "kontur", label: "Kontur" }]} />
                <p style={{ fontSize: 11, color: "var(--muted)", margin: "7px 2px 0", lineHeight: 1.45 }}>„Kontur" zeigt hohle Buchstaben zum Nachfahren – ideal zum Schreibenlernen.</p>
              </div>
            )}
          </Section>
          {block.word && <Section title="Schrift"><FontPicker value={block.font || "schreib"} onChange={v => patch({ font: v })} /></Section>}
        </>)}
      </>);
    }

    if (t === "matharow") {
      const mode = block.mode || "normal";
      const MM = [["normal", "Normal"], ["missing", "Platzhalter"], ["compare", "Vergleichen"]];
      return (<>
        <Section title="Aufgabentyp">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {MM.map(([v, l]) => (
              <button key={v} onClick={() => patch({ mode: v, _regen: Date.now() })}
                style={{ padding: "8px 4px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 700,
                  border: "1.5px solid " + (mode === v ? "var(--teal)" : "var(--line)"),
                  background: mode === v ? "var(--teal-50)" : "#fff", color: mode === v ? "var(--teal-700)" : "var(--ink-soft)" }}>{l}</button>
            ))}
          </div>
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "9px 2px 0", lineHeight: 1.5 }}>
            {mode === "missing" ? "Ein Feld der Aufgabe bleibt leer und muss ergänzt werden."
              : mode === "compare" ? "Zwei Zahlen vergleichen – <, > oder = eintragen."
              : "Klassische Aufgaben – das Ergebnis wird eingetragen."}
          </p>
        </Section>
        {mode !== "compare" && (
          <Section title="Rechenart">
            <Segmented value={block.op} onChange={v => patch({ op: v, _regen: Date.now() })} options={[
              { v: "+", label: "+" }, { v: "-", label: "−" }, { v: "×", label: "×" }, { v: "÷", label: "÷" }]} />
          </Section>
        )}
        <Section title="Einstellungen">
          <Row label="Zahlenraum bis"><Segmented value={block.max} onChange={v => patch({ max: v, _regen: Date.now() })} options={[
            { v: 10, label: "10" }, { v: 20, label: "20" }, { v: 100, label: "100" }, { v: 1000, label: "1000" }]} /></Row>
          <Row label="Aufgaben"><Stepper value={block.count} min={1} max={30} onChange={v => patch({ count: v, _regen: Date.now() })} /></Row>
          <Row label="Spalten"><Stepper value={block.cols} min={1} max={3} onChange={v => patch({ cols: v })} /></Row>
          {mode === "normal" && <Row label="Ergebnisse zeigen"><Toggle value={!!block.showResult} onChange={v => patch({ showResult: v })} /></Row>}
        </Section>
        <Section><button className="btn" style={{ width: "100%" }} onClick={() => patch({ _regen: Date.now() })}><Icon name="redo" size={16} /> Neue Aufgaben würfeln</button></Section>
      </>);
    }

    if (t === "mathwall") { const wop = block.op || "+"; const wmax = wop === "×" ? 6 : 9; return (<>
      <Section title="Rechenart">
        <Segmented value={wop} onChange={v => patch({ op: v })} options={[
          { v: "+", label: "+" }, { v: "-", label: "−" }, { v: "×", label: "×" }]} />
        <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "9px 2px 0", lineHeight: 1.5 }}>
          {wop === "×" ? "Malmauer: Nachbarn werden multipliziert." : wop === "-" ? "Minusmauer: in jeden Stein kommt der Unterschied der beiden Steine darunter." : "Plusmauer: Nachbarn werden addiert."}
        </p>
      </Section>
      <Section title="Grundbausteine">
        <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 10px", lineHeight: 1.5 }}>Die untere Reihe – der Rest wird berechnet.</p>
        <div style={{ display: "flex", gap: 7 }}>
          {(block.base || []).map((v, i) => (
            <input key={i} type="number" value={v} onChange={e => { const b = [...block.base]; b[i] = +e.target.value || 0; patch({ base: b }); }}
              style={{ width: 52, textAlign: "center", border: "1.5px solid var(--teal)", borderRadius: 9, padding: "8px 4px", font: "inherit", fontSize: 15, fontWeight: 700, color: "var(--ink)", background: "var(--teal-50)", outline: "none" }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="btn btn-ghost" style={{ padding: "5px 9px", fontSize: 12 }} onClick={() => block.base.length < 5 && patch({ base: [...block.base, DKU.rint(1, wmax)] })}><Icon name="plus" size={14} /> breiter</button>
          <button className="btn btn-ghost" style={{ padding: "5px 9px", fontSize: 12 }} onClick={() => block.base.length > 2 && patch({ base: block.base.slice(0, -1) })}><Icon name="minus" size={14} /> schmaler</button>
        </div>
      </Section>
      <Section title="Optionen">
        <Row label="Spitze lösen lassen"><Toggle value={block.hideTop !== false} onChange={v => patch({ hideTop: v })} /></Row>
        <button className="btn" style={{ width: "100%", marginTop: 4 }} onClick={() => patch({ base: block.base.map(() => DKU.rint(1, wmax)) })}><Icon name="redo" size={16} /> Neue Mauer würfeln</button>
      </Section>
    </>); }

    if (t === "numline") {
      const min = block.min ?? 0, max = block.max ?? 20, step = block.step || 1;
      const marks = block.marks || [];
      const inStyle = { width: 58, border: "1px solid var(--line)", borderRadius: 7, padding: "5px 7px", font: "inherit", fontSize: 12.5, outline: "none", textAlign: "center" };
      const setMark = (i, p) => patch({ marks: marks.map((m, j) => j === i ? { ...m, ...p } : m) });
      const delMark = (i) => patch({ marks: marks.filter((_, j) => j !== i) });
      const mid = Math.round((min + max) / 2 / step) * step;
      const addMark = (type) => {
        const m = { point: { at: mid, type: "point", color: "teal", label: "" },
          flag: { at: mid, type: "flag", color: "red", label: "" },
          arrow: { at: mid, type: "arrow", from: min, color: "blue", label: "" },
          jump: { from: min, to: Math.min(max, min + step * 3), type: "jump", color: "orange", label: "" },
          box: { at: mid, type: "box", color: "purple", solOnly: true } }[type];
        patch({ marks: [...marks, m] });
      };
      const COLORS = [["teal", "#2BB6AC"], ["orange", "#E8921A"], ["red", "#DC2626"], ["blue", "#2563EB"], ["green", "#16A34A"], ["purple", "#7C3AED"]];
      const TYPES = [["point", "Punkt"], ["flag", "Fahne"], ["arrow", "Pfeil"], ["jump", "Sprung"], ["box", "?-Feld"]];
      const allTicks = []; for (let v = min; v <= max + 1e-6; v += step) allTicks.push(+v.toFixed(4));
      const parseNums = (s) => [...new Set(s.split(/[^0-9.\-]+/).map(Number).filter(n => Number.isFinite(n) && n >= min && n <= max))];
      const hint = { fontSize: 11.5, color: "var(--muted)", margin: "0 0 9px", lineHeight: 1.5 };
      return (<>
        <Section title="Bereich">
          <Row label="Von"><Stepper value={min} min={0} max={Math.max(0, max - step)} step={step} onChange={v => patch({ min: v })} /></Row>
          <Row label="Bis"><Stepper value={max} min={min + step} max={1000} step={step >= 10 ? step : 10} onChange={v => patch({ max: v })} /></Row>
          <Row label="Schritt"><Stepper value={step} min={1} max={100} onChange={v => patch({ step: v })} /></Row>
          <Row label="Beschriftung jede"><Stepper value={block.labelEvery || 1} min={1} max={10} onChange={v => patch({ labelEvery: v })} suffix="." /></Row>
        </Section>
        <Section title="Markierungen" right={<span style={{ fontSize: 11, fontWeight: 700, color: "var(--teal-700)", background: "var(--teal-50)", padding: "2px 8px", borderRadius: 999 }}>{marks.length}</span>}>
          <p style={hint}>Tipp: Du kannst auch direkt auf den Zahlenstrahl klicken, um einen Punkt zu setzen.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {marks.map((m, i) => (
              <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                  <select value={m.type || "point"} onChange={e => setMark(i, { type: e.target.value })}
                    style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 7, padding: "5px 7px", font: "inherit", fontSize: 12.5, outline: "none", background: "#fff" }}>
                    {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <button className="icon-btn" style={{ width: 26, height: 26 }} data-tip="Entfernen" onClick={() => delMark(i)}><Icon name="close" size={14} /></button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, fontSize: 12, color: "var(--ink-soft)" }}>
                  {m.type === "jump" ? (<>
                    <span>von</span><input type="number" value={m.from ?? min} onChange={e => setMark(i, { from: +e.target.value })} style={inStyle} />
                    <span>bis</span><input type="number" value={m.to ?? max} onChange={e => setMark(i, { to: +e.target.value })} style={inStyle} />
                  </>) : (<>
                    <span>Position</span><input type="number" value={m.at ?? mid} onChange={e => setMark(i, { at: +e.target.value })} style={inStyle} />
                  </>)}
                </div>
                {m.type !== "box" && <input value={m.label || ""} onChange={e => setMark(i, { label: e.target.value })} placeholder="Beschriftung (z. B. +3)"
                  style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 7, padding: "5px 8px", font: "inherit", fontSize: 12.5, outline: "none", marginBottom: 7 }} />}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {COLORS.map(([name, hex]) => (
                    <button key={name} onClick={() => setMark(i, { color: name })} title={name}
                      style={{ width: 20, height: 20, borderRadius: "50%", background: hex, cursor: "pointer", padding: 0,
                        border: (m.color || "teal") === name ? "2.5px solid var(--ink)" : "2.5px solid #fff", boxShadow: "0 0 0 1px var(--line)" }} />
                  ))}
                  <label style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--muted)", cursor: "pointer" }}>
                    <input type="checkbox" checked={!!m.solOnly} onChange={e => setMark(i, { solOnly: e.target.checked })} /> nur Lösung
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
            {TYPES.map(([v, l]) => (
              <button key={v} className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 9px" }} onClick={() => addMark(v)}><Icon name="plus" size={13} /> {l}</button>
            ))}
          </div>
        </Section>
        <Section title="Lücken (Zahlen ausblenden)">
          <p style={hint}>Diese Zahlen erscheinen als leeres Kästchen zum Eintragen – die Lösung zeigt die Zahl.</p>
          <input value={(block.blanks || []).join(", ")} onChange={e => patch({ blanks: parseNums(e.target.value) })} placeholder="z. B. 4, 12, 16"
            style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 9px", font: "inherit", fontSize: 13, outline: "none" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 9px" }} onClick={() => patch({ blanks: allTicks.filter((_, i) => i % 2 === 1) })}>Jede 2. ausblenden</button>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 9px" }} onClick={() => patch({ blanks: [] })}>Keine</button>
          </div>
        </Section>
      </>);
    }

    if (t === "mc") return (<>
      <Section title="Frage"><TextArea value={block.q} onChange={v => patch({ q: v })} rows={2} /></Section>
      <Section title="Antworten" right={<span style={{ fontSize: 11, color: "var(--muted)" }}>✓ = richtig</span>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {(block.options || []).map((o, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <button onClick={() => patch({ answer: i })} data-tip="Als richtig markieren"
                style={{ width: 26, height: 26, flex: "none", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1.5px solid " + (block.answer === i ? "var(--sol)" : "var(--line)"), background: block.answer === i ? "var(--sol)" : "#fff", color: "#fff" }}>
                {block.answer === i && <Icon name="check" size={15} stroke={2.6} />}
              </button>
              <input value={o} onChange={e => { const a = [...block.options]; a[i] = e.target.value; patch({ options: a }); }}
                style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 8, padding: "6px 9px", font: "inherit", fontSize: 13, outline: "none", minWidth: 0 }} />
              <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => { const a = block.options.filter((_, j) => j !== i); patch({ options: a, answer: Math.min(block.answer, a.length - 1) }); }}><Icon name="close" size={15} /></button>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12, padding: "5px 9px" }} onClick={() => patch({ options: [...block.options, "Neue Antwort"] })}><Icon name="plus" size={14} /> Antwort</button>
      </Section>
      <Section title="Schrift"><FontPicker value={block.font} onChange={v => patch({ font: v })} /></Section>
    </>);

    if (t === "match") return (<>
      <Section title="Paare" right={<span style={{ fontSize: 11, color: "var(--muted)" }}>links ↔ rechts</span>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {(block.pairs || []).map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input value={p[0]} onChange={e => { const a = block.pairs.map(x => [...x]); a[i][0] = e.target.value; patch({ pairs: a }); }}
                style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px", font: "inherit", fontSize: 13, outline: "none", minWidth: 0 }} />
              <Icon name="match" size={15} style={{ color: "var(--muted-2)", flex: "none" }} />
              <input value={p[1]} onChange={e => { const a = block.pairs.map(x => [...x]); a[i][1] = e.target.value; patch({ pairs: a }); }}
                style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px", font: "inherit", fontSize: 13, outline: "none", minWidth: 0 }} />
              <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => { const a = block.pairs.filter((_, j) => j !== i); patch({ pairs: a, _shuffle: a.map((_, j) => j) }); }}><Icon name="close" size={15} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 9px" }} onClick={() => { const a = [...block.pairs, ["", ""]]; patch({ pairs: a, _shuffle: a.map((_, j) => j) }); }}><Icon name="plus" size={14} /> Paar</button>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 9px" }} onClick={() => patch({ _shuffle: [...block.pairs.keys()].sort(() => Math.random() - 0.5) })}><Icon name="redo" size={14} /> Rechts mischen</button>
        </div>
      </Section>
      <Section title="Schrift"><FontPicker value={block.font} onChange={v => patch({ font: v })} /></Section>
    </>);

    if (t === "wordsearch") {
      const raw = block.wordsText != null ? block.wordsText : (block.words || []).join("\n");
      const parse = (s) => s.split("\n").map(w => w.trim()).filter(Boolean);
      const nWords = parse(raw).length;
      const applyWords = (s) => { const ws = parse(s); patch({ wordsText: s, words: ws, grid: DKU.genWordsearch(ws, block.grid?.size || 12) }); };
      const taStyle = { width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 11px", font: "inherit", fontSize: 13, lineHeight: 1.6, resize: "vertical", outline: "none", color: "var(--ink)" };
      return (<>
        <Section title="Suchwörter" right={<span style={{ fontSize: 11, fontWeight: 700, color: "var(--teal-700)", background: "var(--teal-50)", padding: "2px 8px", borderRadius: 999 }}>{nWords}</span>}>
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.5 }}>Ein Wort pro Zeile – einfach in einer neuen Zeile weitere Wörter ergänzen (bis zu 18). Waagerecht, senkrecht & diagonal.</p>
          <textarea value={raw} rows={8} placeholder={"IGEL\nBAUM\nBLATT\n…"} style={taStyle}
            onChange={e => patch({ wordsText: e.target.value })}
            onBlur={e => { e.target.style.borderColor = "var(--line)"; applyWords(e.target.value); }}
            onFocus={e => e.target.style.borderColor = "var(--teal)"} />
          <button className="btn" style={{ width: "100%", marginTop: 8 }} onMouseDown={e => e.preventDefault()} onClick={() => applyWords(raw)}><Icon name="check" size={15} /> Wörter übernehmen</button>
        </Section>
        <Section title="Gitter">
          <Row label="Größe"><Stepper value={block.grid?.size || 10} min={6} max={18} onChange={v => patch({ grid: DKU.genWordsearch(parse(raw), v) })} suffix="×" /></Row>
          <button className="btn btn-ghost" style={{ width: "100%", marginTop: 4 }} onClick={() => patch({ grid: DKU.genWordsearch(parse(raw), block.grid?.size || 12) })}><Icon name="redo" size={16} /> Neu anordnen</button>
        </Section>
      </>);
    }

    if (t === "mathtri") { const top = block.op || "+"; return (
      <>
        <Section title="Rechenart">
          <Segmented value={top} onChange={v => patch({ op: v })} options={[
            { v: "+", label: "+" }, { v: "-", label: "−" }, { v: "×", label: "×" }, { v: "÷", label: "÷" }]} />
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "9px 2px 0", lineHeight: 1.5 }}>
            {top === "÷" ? "Umkehrung: Die Seiten sind gegeben, die Ecken werden gesucht (teilen)."
              : top === "×" ? "Die Seite ist das Produkt der beiden Ecken."
              : top === "-" ? "Die Seite ist der Unterschied der beiden Ecken."
              : "Die Seite ist die Summe der beiden Ecken."}
          </p>
        </Section>
        <Section title="Einstellungen">
          <Row label="Zahlenraum bis"><Stepper value={block.max} min={10} max={100} step={10} onChange={v => patch({ max: v, _regen: Date.now() })} /></Row>
          <button className="btn" style={{ width: "100%", marginTop: 4 }} onClick={() => patch({ _regen: Date.now() })}><Icon name="redo" size={16} /> Neues Dreieck würfeln</button>
        </Section>
      </>
    ); }

    if (t === "clock") {
      const clocks = (block.clocks && block.clocks.length) ? block.clocks : [{ h: block.h ?? 3, m: block.m ?? 0 }];
      const setClock = (i, p) => patch({ clocks: clocks.map((c, j) => j === i ? { ...c, ...p } : c) });
      const addClock = () => patch({ clocks: [...clocks, { h: DKU.rint(1, 12), m: [0, 15, 30, 45][DKU.rint(0, 3)] }] });
      const delClock = (i) => { const a = clocks.filter((_, j) => j !== i); patch({ clocks: a.length ? a : [{ h: 3, m: 0 }] }); };
      return (<>
        <Section title="Uhren" right={<span style={{ fontSize: 11, fontWeight: 700, color: "var(--teal-700)", background: "var(--teal-50)", padding: "2px 8px", borderRadius: 999 }}>{clocks.length}</span>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {clocks.map((c, i) => (
              <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>Uhr {i + 1}</span>
                  {clocks.length > 1 && <button className="icon-btn" style={{ width: 26, height: 26 }} data-tip="Entfernen" onClick={() => delClock(i)}><Icon name="close" size={14} /></button>}
                </div>
                <Row label="Stunde"><Stepper value={c.h} min={1} max={12} onChange={v => setClock(i, { h: v })} /></Row>
                <Row label="Minute"><Segmented value={c.m} onChange={v => setClock(i, { m: v })} options={[{ v: 0, label: "00" }, { v: 15, label: "15" }, { v: 30, label: "30" }, { v: 45, label: "45" }]} /></Row>
              </div>
            ))}
          </div>
          <button className="btn" style={{ width: "100%", marginTop: 9 }} onClick={addClock}><Icon name="plus" size={15} /> Uhr hinzufügen</button>
        </Section>
        <Section title="Layout">
          <Row label="Spalten"><Stepper value={block.cols || clocks.length} min={1} max={6} onChange={v => patch({ cols: v })} /></Row>
          <button className="btn btn-ghost" style={{ width: "100%", marginTop: 4 }} onClick={() => patch({ _regen: Date.now() })}><Icon name="redo" size={16} /> Alle Zeiten würfeln</button>
        </Section>
      </>);
    }

    if (t === "table") return (<>
      <Section title="Tabelle">
        <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 10px", lineHeight: 1.5 }}>Klicke direkt in die Zellen auf dem Blatt, um sie zu beschriften.</p>
        <Row label="Zeilen"><Stepper value={block.rows || 2} min={1} max={12} onChange={v => patch({ rows: v })} /></Row>
        <Row label="Spalten"><Stepper value={block.cols || 2} min={1} max={8} onChange={v => patch({ cols: v })} /></Row>
        <Row label="Kopfzeile farbig"><Toggle value={!!block.header} onChange={v => patch({ header: v })} /></Row>
        <Row label="Zeilenhöhe"><Stepper value={block.rowH || 34} min={24} max={80} step={2} onChange={v => patch({ rowH: v })} /></Row>
        <Row label="Schriftgröße"><Stepper value={block.size || 16} min={12} max={28} onChange={v => patch({ size: v })} /></Row>
      </Section>
      <Section title="Schrift"><FontPicker value={block.font || "druck"} onChange={v => patch({ font: v })} /></Section>
    </>);

    if (t === "task") {
      const ICONS = ["pencil", "scissors", "crayons", "ruler", "speak", "ear", "eye", "bulb", "none"];
      const ILAB = { pencil: "Schreiben", scissors: "Schneiden", crayons: "Anmalen", ruler: "Messen", speak: "Erzählen", ear: "Hören", eye: "Schau", bulb: "Denk", none: "keins" };
      const COLORS = [["teal", "#2BB6AC"], ["orange", "#E8921A"], ["red", "#DC2626"], ["blue", "#2563EB"], ["green", "#16A34A"], ["purple", "#7C3AED"]];
      return (<>
        <Section title="Text">
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.5 }}>Der Text lässt sich auch direkt auf dem Blatt bearbeiten.</p>
          <TextArea value={block.text} onChange={v => patch({ text: v })} rows={3} />
        </Section>
        <Section title="Aufgaben-Nummer">
          <Row label="Nummer (leer = keine)"><input value={block.num ?? ""} onChange={e => patch({ num: e.target.value })} placeholder="1"
            style={{ width: 64, textAlign: "center", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px", font: "inherit", fontSize: 13, outline: "none" }} /></Row>
        </Section>
        <Section title="Symbol">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
            {ICONS.map(ic => (
              <button key={ic} onClick={() => patch({ icon: ic })}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 4px", borderRadius: 9, cursor: "pointer",
                  border: "1.5px solid " + ((block.icon || "pencil") === ic ? "var(--teal)" : "var(--line)"), background: (block.icon || "pencil") === ic ? "var(--teal-50)" : "#fff", color: "var(--ink-soft)" }}>
                {ic === "none" ? <span style={{ height: 22, display: "flex", alignItems: "center", fontSize: 11, color: "var(--muted)" }}>—</span> : <Icon name={ic} size={20} />}
                <span style={{ fontSize: 10, color: "var(--muted)" }}>{ILAB[ic]}</span>
              </button>
            ))}
          </div>
        </Section>
        <Section title="Farbe">
          <div style={{ display: "flex", gap: 8 }}>
            {COLORS.map(([name, hex]) => (
              <button key={name} onClick={() => patch({ color: name })} title={name}
                style={{ width: 26, height: 26, borderRadius: "50%", background: hex, cursor: "pointer", padding: 0,
                  border: (block.color || "teal") === name ? "2.5px solid var(--ink)" : "2.5px solid #fff", boxShadow: "0 0 0 1px var(--line)" }} />
            ))}
          </div>
        </Section>
        <Section title="Schrift"><FontPicker value={block.font || "druck"} onChange={v => patch({ font: v })} /></Section>
      </>);
    }

    if (t === "divider") {
      const V = [["scissors", "Schneidelinie"], ["dashed", "Gestrichelt"], ["dotted", "Gepunktet"], ["solid", "Linie"], ["space", "Nur Abstand"]];
      return (<>
        <Section title="Art">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {V.map(([v, l]) => (
              <button key={v} onClick={() => patch({ variant: v })}
                style={{ padding: "8px 9px", textAlign: "left", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                  border: "1.5px solid " + ((block.variant || "dashed") === v ? "var(--teal)" : "var(--line)"), background: (block.variant || "dashed") === v ? "var(--teal-50)" : "#fff", color: "var(--ink-soft)" }}>{l}</button>
            ))}
          </div>
        </Section>
        {(block.variant || "dashed") === "space" && (
          <Section title="Abstand"><Row label="Höhe"><Stepper value={block.space || 30} min={8} max={120} step={4} onChange={v => patch({ space: v })} /></Row></Section>
        )}
      </>);
    }

    if (t === "imagelabel") {
      const points = block.points || [];
      const setPoint = (i, p) => patch({ points: points.map((x, j) => j === i ? { ...x, ...p } : x) });
      const delPoint = (i) => patch({ points: points.filter((_, j) => j !== i) });
      const loadScaled = (file) => new Promise(res => {
        const r = new FileReader();
        r.onload = () => { const img = new Image(); img.onload = () => {
          const m = 560; let w = img.width, h = img.height; const sc = Math.min(1, m / Math.max(w, h));
          w = Math.round(w * sc); h = Math.round(h * sc);
          const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h);
          res(c.toDataURL("image/png"));
        }; img.src = r.result; };
        r.readAsDataURL(file);
      });
      const upload = () => {
        const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
        inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; loadScaled(f).then(src => patch({ src, art: null })); };
        inp.click();
      };
      return (<>
        <Section title="Bild">
          {(block.src || block.art) ? (<>
            <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 8, display: "flex", justifyContent: "center", background: "var(--bg-rail)" }}>
              {block.src ? <img src={block.src} alt="" style={{ maxWidth: "100%", maxHeight: 140, borderRadius: 6 }} /> : <div style={{ width: 120, height: 120 }} dangerouslySetInnerHTML={{ __html: clipartSvg(block.art) }} />}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn" style={{ flex: 1 }} onClick={upload}><Icon name="download" size={15} /> Ersetzen</button>
              <button className="btn btn-ghost" data-tip="Bild entfernen" onClick={() => patch({ src: null, art: null, points: [] })}><Icon name="trash" size={15} /></button>
            </div>
          </>) : (<>
            <button className="btn" style={{ width: "100%" }} onClick={upload}><Icon name="download" size={15} /> Bild hochladen</button>
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "9px 0 6px", lineHeight: 1.5 }}>… oder ein Clipart wählen:</p>
            <div className="scroll" style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 4, maxHeight: 120, overflowY: "auto", padding: 2 }}>
              {CLIPART.map(c => (
                <button key={c} onClick={() => patch({ art: c, src: null })} data-tip={CLIP_LABELS[c]}
                  style={{ aspectRatio: "1", padding: 3, borderRadius: 7, cursor: "pointer", background: "var(--bg-rail)", border: "1.5px solid transparent" }}
                  dangerouslySetInnerHTML={{ __html: clipartSvg(c) }} />
              ))}
            </div>
          </>)}
        </Section>
        {(block.src || block.art) && (
          <Section title="Beschriftungen" right={<span style={{ fontSize: 11, fontWeight: 700, color: "var(--teal-700)", background: "var(--teal-50)", padding: "2px 8px", borderRadius: 999 }}>{points.length}</span>}>
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 9px", lineHeight: 1.5 }}>Tippe auf dem Blatt direkt auf das Bild, um nummerierte Punkte zu setzen. Hier trägst du die Lösungswörter ein.</p>
            {points.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "center", padding: "10px 0" }}>Noch keine Punkte gesetzt.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {points.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 24, height: 24, flex: "none", borderRadius: "50%", background: "var(--teal-700)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ui)", fontWeight: 800, fontSize: 13 }}>{i + 1}</span>
                    <input value={p.word || ""} onChange={e => setPoint(i, { word: e.target.value })} placeholder="Lösungswort"
                      style={{ flex: 1, minWidth: 0, border: "1px solid var(--line)", borderRadius: 8, padding: "6px 9px", font: "inherit", fontSize: 13, outline: "none" }} />
                    <button className="icon-btn" style={{ width: 26, height: 26 }} data-tip="Punkt entfernen" onClick={() => delPoint(i)}><Icon name="close" size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}
        <Section title="Optionen">
          <Row label="Wortspeicher zeigen"><Toggle value={!!block.bank} onChange={v => patch({ bank: v })} /></Row>
          <Row label="Bildgröße"><Stepper value={block.size || 320} min={160} max={520} step={20} onChange={v => patch({ size: v })} /></Row>
        </Section>
        <Section title="Schrift"><FontPicker value={block.font || "grundschrift"} onChange={v => patch({ font: v })} /></Section>
      </>);
    }

    if (t === "writtenmath") {
      const op = block.op || "+";
      return (<>
        <Section title="Rechenart">
          <Segmented value={op} onChange={v => patch({ op: v, _regen: Date.now() })} options={[{ v: "+", label: "+" }, { v: "-", label: "−" }, { v: "×", label: "×" }, { v: "÷", label: "÷" }]} />
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "9px 2px 0", lineHeight: 1.5 }}>
            {op === "÷" ? "Schriftliche Division mit Abzieh-Schritten – im Lösungsblatt der komplette Rechenweg." : op === "×" ? "Schriftliche Multiplikation." : op === "-" ? "Schriftliche Subtraktion (Stellenwert)." : "Schriftliche Addition (Stellenwert)."}
          </p>
        </Section>
        {op === "×" && (
          <Section title="Multiplikator">
            <Segmented value={block.mdigits || 1} onChange={v => patch({ mdigits: v, _regen: Date.now() })} options={[{ v: 1, label: "einstellig" }, { v: 2, label: "zweistellig" }]} />
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "9px 2px 0", lineHeight: 1.5 }}>Zweistellig erzeugt Teilergebnisse (zwei Linien), einstellig eine Linie – im ganzen Block einheitlich.</p>
          </Section>
        )}
        <Section title="Zahlen">
          <Row label={op === "÷" ? "Stellen im Ergebnis" : "Stellen je Zahl"}><Stepper value={block.digits || 3} min={2} max={4} onChange={v => patch({ digits: v, _regen: Date.now() })} /></Row>
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "4px 2px 0", lineHeight: 1.5 }}>{op === "÷" ? "Bestimmt die Größe des Ergebnisses (Divisor ist einstellig, die Aufgabe geht auf)." : "2 = Zehner, 3 = Hunderter, 4 = Tausender."}</p>
        </Section>
        <Section title="Anzahl">
          <Row label="Aufgaben"><Stepper value={block.count || 1} min={1} max={12} onChange={v => patch({ count: v, _regen: Date.now() })} /></Row>
          <Row label="Spalten"><Stepper value={block.cols || 2} min={1} max={4} onChange={v => patch({ cols: v })} /></Row>
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "4px 2px 0", lineHeight: 1.5 }}>Mehrere Rechnungen gleichen Typs nebeneinander – spart Platz.</p>
        </Section>
        <Section title="Darstellung">
          {(op === "+" || op === "-") && <Row label="Übertrags-Zeile zeigen"><Toggle value={block.carries !== false} onChange={v => patch({ carries: v })} /></Row>}
          {op === "×" && (block.mdigits || 1) === 2 && <Row label="Teilergebnisse zeigen"><Toggle value={block.partials !== false} onChange={v => patch({ partials: v })} /></Row>}
          <Row label="Größe"><Stepper value={block.size || 26} min={18} max={40} step={2} onChange={v => patch({ size: v })} /></Row>
        </Section>
        <Section><button className="btn" style={{ width: "100%" }} onClick={() => patch({ _regen: Date.now() })}><Icon name="redo" size={16} /> Neue Aufgabe würfeln</button></Section>
      </>);
    }

    if (t === "unitcalc") {
      const kind = block.kind || "geld";
      const mode = block.mode || "rechnen";
      const KINDS = [["geld", "Geld"], ["laenge", "Länge"], ["gewicht", "Gewicht"], ["volumen", "Volumen"]];
      return (<>
        <Section title="Bereich">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {KINDS.map(([v, l]) => (
              <button key={v} onClick={() => patch({ kind: v, _regen: Date.now() })}
                style={{ padding: "9px 6px", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                  border: "1.5px solid " + (kind === v ? "var(--teal)" : "var(--line)"), background: kind === v ? "var(--teal-50)" : "#fff", color: kind === v ? "var(--teal-700)" : "var(--ink-soft)" }}>{l}</button>
            ))}
          </div>
        </Section>
        <Section title="Aufgabentyp">
          <Segmented value={mode} onChange={v => patch({ mode: v, _regen: Date.now() })} options={[{ v: "rechnen", label: "Rechnen" }, { v: "umrechnen", label: "Umrechnen" }]} />
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "9px 2px 0", lineHeight: 1.5 }}>
            {mode === "umrechnen" ? "Eine Größe in die andere Einheit umrechnen (z. B. 3 m = 300 cm)." : "Mit Größen rechnen (z. B. 350 g + 200 g)."}
          </p>
        </Section>
        {mode === "rechnen" && (
          <Section title="Rechenart">
            <Segmented value={block.op || "+"} onChange={v => patch({ op: v, _regen: Date.now() })} options={[{ v: "+", label: "+" }, { v: "-", label: "−" }]} />
          </Section>
        )}
        <Section title="Einstellungen">
          {mode === "rechnen" && <Row label={kind === "geld" ? "Bis … €" : "Zahlenraum bis"}><Stepper value={block.max || 20} min={kind === "geld" ? 5 : 10} max={kind === "geld" ? 100 : 1000} step={kind === "geld" ? 5 : 10} onChange={v => patch({ max: v, _regen: Date.now() })} /></Row>}
          <Row label="Aufgaben"><Stepper value={block.count || 8} min={1} max={30} onChange={v => patch({ count: v, _regen: Date.now() })} /></Row>
          <Row label="Spalten"><Stepper value={block.cols || 2} min={1} max={3} onChange={v => patch({ cols: v })} /></Row>
          <Row label="Größe"><Stepper value={block.size || 22} min={16} max={32} step={2} onChange={v => patch({ size: v })} /></Row>
          {mode === "rechnen" && <Row label="Ergebnisse zeigen"><Toggle value={!!block.showResult} onChange={v => patch({ showResult: v })} /></Row>}
        </Section>
        <Section><button className="btn" style={{ width: "100%" }} onClick={() => patch({ _regen: Date.now() })}><Icon name="redo" size={16} /> Neue Aufgaben würfeln</button></Section>
      </>);
    }

    if (t === "moneycount") {
      const mode = block.mode || "zaehlen";
      const max = block.max || 2;
      const MAXES = [[1, "1 €"], [2, "2 €"], [5, "5 €"], [10, "10 €"], [20, "20 €"], [100, "100 €"]];
      return (<>
        <Section title="Aufgabentyp">
          <Segmented value={mode} onChange={v => patch({ mode: v })} options={[{ v: "zaehlen", label: "Zählen" }, { v: "bezahlen", label: "Bezahlen" }]} />
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "9px 2px 0", lineHeight: 1.5 }}>
            {mode === "bezahlen"
              ? "Der Betrag ist vorgegeben – die Kinder malen die passenden Münzen/Scheine in das Feld. Im Lösungsblatt erscheint eine gültige Kombination."
              : "Münzen/Scheine sind abgebildet – die Kinder zählen zusammen und schreiben den Betrag."}
          </p>
        </Section>
        <Section title="Betrag bis">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {MAXES.map(([v, l]) => (
              <button key={v} onClick={() => patch({ max: v, withBills: v >= 5 ? block.withBills : false, _regen: Date.now() })}
                style={{ padding: "9px 6px", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                  border: "1.5px solid " + (max === v ? "var(--teal)" : "var(--line)"), background: max === v ? "var(--teal-50)" : "#fff", color: max === v ? "var(--teal-700)" : "var(--ink-soft)" }}>{l}</button>
            ))}
          </div>
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "9px 2px 0", lineHeight: 1.5 }}>Die Summe der Münzen/Scheine bleibt unter diesem Betrag.</p>
        </Section>
        <Section title="Aufgabe">
          <Row label="Münzen pro Aufgabe"><Stepper value={block.pieces || 3} min={2} max={8} onChange={v => patch({ pieces: v, _regen: Date.now() })} /></Row>
          {max >= 5 && <Row label="Auch Geldscheine"><Toggle value={!!block.withBills} onChange={v => patch({ withBills: v, _regen: Date.now() })} /></Row>}
        </Section>
        <Section title="Anzahl & Größe">
          <Row label="Aufgaben"><Stepper value={block.count || 4} min={1} max={12} onChange={v => patch({ count: v, _regen: Date.now() })} /></Row>
          <Row label="Spalten"><Stepper value={block.cols || 1} min={1} max={3} onChange={v => patch({ cols: v })} /></Row>
          <Row label="Münzgröße"><Stepper value={block.size || 24} min={16} max={34} step={2} onChange={v => patch({ size: v })} /></Row>
          <Row label="Lösung anzeigen"><Toggle value={!!block.showResult} onChange={v => patch({ showResult: v })} /></Row>
        </Section>
        <Section><button className="btn" style={{ width: "100%" }} onClick={() => patch({ _regen: Date.now() })}><Icon name="redo" size={16} /> Neue Aufgaben würfeln</button></Section>
      </>);
    }

    if (t === "chain") {
      const ops = block.ops || ["+", "-"];
      const toggleOp = (o) => { let n = ops.includes(o) ? ops.filter(x => x !== o) : [...ops, o]; if (!n.length) n = [o]; patch({ ops: n, _regen: Date.now() }); };
      return (<>
        <Section title="Rechenkette">
          <Row label="Startzahl"><Stepper value={block.start ?? 5} min={0} max={block.max || 20} onChange={v => patch({ start: v, _regen: Date.now() })} /></Row>
          <Row label="Schritte"><Stepper value={block.count || 3} min={1} max={8} onChange={v => patch({ count: v, _regen: Date.now() })} /></Row>
          <Row label="Zahlenraum bis"><Segmented value={block.max || 20} onChange={v => patch({ max: v, _regen: Date.now() })} options={[{ v: 20, label: "20" }, { v: 100, label: "100" }, { v: 1000, label: "1000" }]} /></Row>
          <Row label="Rechenarten">
            <div style={{ display: "flex", gap: 4 }}>
              {[["+", "+"], ["-", "−"], ["×", "×"]].map(([o, l]) => (
                <button key={o} onClick={() => toggleOp(o)} style={{ width: 32, height: 30, borderRadius: 8, cursor: "pointer", fontWeight: 800, fontSize: 14,
                  border: "1.5px solid " + (ops.includes(o) ? "var(--teal)" : "var(--line)"), background: ops.includes(o) ? "var(--teal-50)" : "#fff", color: ops.includes(o) ? "var(--teal-700)" : "var(--muted)" }}>{l}</button>
              ))}
            </div>
          </Row>
          <button className="btn" style={{ width: "100%", marginTop: 4 }} onClick={() => patch({ _regen: Date.now() })}><Icon name="redo" size={16} /> Neue Kette würfeln</button>
        </Section>
      </>);
    }

    if (t === "net") {
      const OpPick = ({ op, n, kop, kn }) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[["+", "+"], ["-", "−"], ["×", "×"]].map(([o, l]) => (
              <button key={o} onClick={() => patch({ [kop]: o })} style={{ width: 30, height: 28, borderRadius: 8, cursor: "pointer", fontWeight: 800, fontSize: 14,
                border: "1.5px solid " + ((op || "+") === o ? "var(--teal)" : "var(--line)"), background: (op || "+") === o ? "var(--teal-50)" : "#fff", color: (op || "+") === o ? "var(--teal-700)" : "var(--muted)" }}>{l}</button>
            ))}
          </div>
          <Stepper value={n} min={1} max={op === "×" ? 10 : 50} onChange={v => patch({ [kn]: v })} />
        </div>
      );
      return (<>
        <Section title="Rechennetz">
          <Row label="Spalten"><Stepper value={block.cols || 3} min={2} max={4} onChange={v => patch({ cols: v })} /></Row>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", margin: "2px 2px 6px" }}>Pfeil nach rechts →</div>
          <OpPick op={block.hop} n={block.hn != null ? block.hn : 2} kop="hop" kn="hn" />
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", margin: "12px 2px 6px" }}>Pfeil nach unten ↓</div>
          <OpPick op={block.vop} n={block.vn != null ? block.vn : 10} kop="vop" kn="vn" />
          <Row label="Zahlenraum bis"><Segmented value={block.max || 100} onChange={v => patch({ max: v })} options={[{ v: 20, label: "20" }, { v: 100, label: "100" }, { v: 1000, label: "1000" }]} /></Row>
          <button className="btn" style={{ width: "100%", marginTop: 10 }} onClick={() => patch({ _regen: Date.now() })}><Icon name="redo" size={16} /> Neue Startzahl</button>
        </Section>
      </>);
    }

    if (t === "rechenrad") return (<>
      <Section title="Rechenrad">
        <Row label="Rechenart"><Segmented value={block.op || "+"} onChange={v => patch({ op: v })} options={[{ v: "+", label: "+" }, { v: "-", label: "−" }, { v: "×", label: "×" }]} /></Row>
        <Row label="Zahl in der Mitte"><Stepper value={block.n ?? 3} min={1} max={(block.op === "×") ? 10 : 20} onChange={v => patch({ n: v })} /></Row>
        <Row label="Felder"><Stepper value={block.count || 5} min={3} max={8} onChange={v => patch({ count: v })} /></Row>
        <Row label="Zahlenraum bis"><Segmented value={block.max || 20} onChange={v => patch({ max: v })} options={[{ v: 20, label: "20" }, { v: 100, label: "100" }]} /></Row>
        <button className="btn" style={{ width: "100%" }} onClick={() => patch({ _regen: Date.now() })}><Icon name="redo" size={16} /> Neue Zahlen</button>
      </Section>
    </>);

    if (t === "malkreuz") return (<>
      <Section title="Malkreuz">
        <Row label="1. Faktor"><Stepper value={block.a || 14} min={2} max={999} onChange={v => patch({ a: v })} /></Row>
        <Row label="2. Faktor"><Stepper value={block.b || 13} min={2} max={99} onChange={v => patch({ b: v })} /></Row>
        <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 2px 10px", lineHeight: 1.5 }}>Die Faktoren werden in Hunderter/Zehner/Einer zerlegt; die Teilprodukte stehen im Kreuz. Ziffern erscheinen im Lösungsblatt.</p>
        <button className="btn" style={{ width: "100%" }} onClick={() => patch({ _regen: Date.now() })}><Icon name="redo" size={16} /> Neue Zahlen</button>
      </Section>
    </>);

    if (t === "times") {
      const total = (block.rows || 10) * (block.cols || 10);
      return (<>
        <Section title="Einmaleins-Tafel">
          <Row label="Zeilen"><Stepper value={block.rows || 10} min={1} max={12} onChange={v => patch({ rows: v })} /></Row>
          <Row label="Spalten"><Stepper value={block.cols || 10} min={1} max={12} onChange={v => patch({ cols: v })} /></Row>
          <Row label="Lücken (leer = füllen)"><Stepper value={block.blanksN != null ? block.blanksN : (block.blanks || []).length} min={0} max={total} onChange={v => patch({ blanksN: v })} /></Row>
          <button className="btn" style={{ width: "100%" }} onClick={() => patch({ _regen: Date.now() })}><Icon name="redo" size={16} /> Lücken neu verteilen</button>
        </Section>
      </>);
    }

    if (t === "placevalue") {
      const parseNums = (s) => s.split(/[^0-9]+/).map(Number).filter(n => Number.isFinite(n) && n > 0).slice(0, 8);
      return (<>
        <Section title="Stellenwerttafel">
          <Row label="Stellen"><Stepper value={block.places || 3} min={1} max={5} onChange={v => patch({ places: v })} /></Row>
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.5 }}>Spalten: HT · ZT · T · H · Z · E. Die Ziffern sind nur im Lösungsblatt sichtbar.</p>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", margin: "2px 2px 4px" }}>Zahlen (Komma-getrennt)</div>
          <input value={(block.numbers || []).join(", ")} onChange={e => patch({ numbers: parseNums(e.target.value) })} placeholder="z. B. 234, 408, 96"
            style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 9px", font: "inherit", fontSize: 13, outline: "none" }} />
        </Section>
      </>);
    }

    if (t === "fraction") return (<>
      <Section title="Brüche">
        <Row label="Darstellung"><Segmented value={block.shape || "pie"} onChange={v => patch({ shape: v })} options={[{ v: "pie", label: "Kreis" }, { v: "bar", label: "Balken" }]} /></Row>
        <Row label="Aufgabe"><Segmented value={block.ask || "name"} onChange={v => patch({ ask: v })} options={[{ v: "name", label: "benennen" }, { v: "shade", label: "färben" }]} /></Row>
        <Row label="Anzahl Bilder"><Stepper value={block.count || (block.items ? block.items.length : 3)} min={1} max={6} onChange={v => patch({ count: v })} /></Row>
        <Row label="größter Nenner"><Stepper value={block.maxDen || 8} min={2} max={12} onChange={v => patch({ maxDen: v })} /></Row>
        <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 2px 10px", lineHeight: 1.5 }}>„benennen": gefärbtes Bild → Bruch aufschreiben. „färben": Bruch ist vorgegeben → Bild anmalen (Lösung zeigt die Färbung).</p>
        <button className="btn" style={{ width: "100%" }} onClick={() => patch({ _regen: Date.now() })}><Icon name="redo" size={16} /> Neue Brüche</button>
      </Section>
    </>);

    if (t === "sach") {
      const SACH = DKI.SACH || [];
      return (<>
        <Section title="Sachaufgabe">
          <select value="" onChange={e => { const s = SACH[+e.target.value]; if (s) patch({ text: s.text, calc: s.calc, av: s.av, az: s.az, an: s.an }); }}
            style={{ width: "100%", border: "1.5px solid var(--teal)", background: "var(--teal-50)", color: "var(--teal-700)", borderRadius: 9, padding: "8px 10px", font: "inherit", fontSize: 12.5, fontWeight: 700, outline: "none", cursor: "pointer", marginBottom: 8 }}>
            <option value="" disabled>📚 Aufgabe aus Bibliothek wählen …</option>
            {SACH.map((s, i) => <option key={i} value={i}>{(s.level === "leicht" ? "★ " : s.level === "mittel" ? "★★ " : "★★★ ") + s.text.slice(0, 46)}…</option>)}
          </select>
          <TextArea value={block.text || ""} onChange={v => patch({ text: v })} rows={4} placeholder="Aufgabentext mit Frage" />
        </Section>
        <Section title="Antwortsatz (geprüft wird die Zahl)">
          <input value={block.av || ""} onChange={e => patch({ av: e.target.value })} placeholder="Satzanfang, z. B. Lena hat noch"
            style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 9px", font: "inherit", fontSize: 13, outline: "none", marginBottom: 6 }} />
          <div style={{ display: "flex", gap: 6 }}>
            <input value={block.az || ""} onChange={e => patch({ az: e.target.value })} placeholder="Zahl"
              style={{ width: 80, border: "1.5px solid var(--teal)", borderRadius: 8, padding: "7px 9px", font: "inherit", fontSize: 13, fontWeight: 700, outline: "none" }} />
            <input value={block.an || ""} onChange={e => patch({ an: e.target.value })} placeholder="Satzende, z. B. Äpfel."
              style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 8, padding: "7px 9px", font: "inherit", fontSize: 13, outline: "none" }} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", margin: "10px 2px 4px" }}>Rechnung (fürs Lösungsblatt)</div>
          <input value={block.calc || ""} onChange={e => patch({ calc: e.target.value })} placeholder="z. B. 12 − 5 = 7"
            style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 9px", font: "inherit", fontSize: 13, outline: "none" }} />
        </Section>
        <Section title="Schrift"><FontPicker value={block.font} onChange={v => patch({ font: v })} /></Section>
      </>);
    }

    if (t === "dotfield") {
      const field = block.field || "zwanzig";
      const cap = field === "zehn" ? 10 : field === "hundert" ? 100 : 20;
      return (<>
        <Section title="Feld">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[["zehn", "Zehner", "10"], ["zwanzig", "Zwanziger", "20"], ["hundert", "Hunderter", "100"]].map(([v, l, n]) => (
              <button key={v} onClick={() => patch({ field: v, value: Math.min(block.value || 0, v === "zehn" ? 10 : v === "hundert" ? 100 : 20) })}
                style={{ padding: "8px 4px", borderRadius: 10, cursor: "pointer", border: "1.5px solid " + (field === v ? "var(--teal)" : "var(--line)"), background: field === v ? "var(--teal-50)" : "#fff" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{l}</div>
                <div style={{ fontSize: 10.5, color: "var(--muted)" }}>bis {n}</div>
              </button>
            ))}
          </div>
        </Section>
        <Section title="Einstellungen">
          <Row label="Anzahl Punkte"><Stepper value={block.value || 0} min={0} max={cap} onChange={v => patch({ value: v })} /></Row>
          <Row label="Zahl anzeigen"><Toggle value={!!block.showNumber} onChange={v => patch({ showNumber: v })} /></Row>
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "4px 2px 0", lineHeight: 1.5 }}>Standardmäßig bleibt das Kästchen leer – die Kinder zählen und tragen die Zahl ein. Im Lösungsblatt erscheint sie automatisch.</p>
        </Section>
      </>);
    }

    if (t === "hundredchart") {
      const blanks = block.blanks || [];
      return (<>
        <Section title="Lücken" right={<span style={{ fontSize: 11, fontWeight: 700, color: "var(--teal-700)", background: "var(--teal-50)", padding: "2px 8px", borderRadius: 999 }}>{blanks.length}</span>}>
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 9px", lineHeight: 1.5 }}>Tippe direkt auf die Hundertertafel, um einzelne Felder auszublenden – oder würfle zufällige Lücken.</p>
          <Row label="Zufällige Lücken"><Stepper value={blanks.length} min={0} max={50} step={2} onChange={v => patch({ blanks: DKU.genChartBlanks(v) })} /></Row>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 9px" }} onClick={() => patch({ blanks: DKU.genChartBlanks(blanks.length || 10) })}><Icon name="redo" size={14} /> Neu würfeln</button>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 9px" }} onClick={() => patch({ blanks: [] })}>Keine</button>
          </div>
        </Section>
      </>);
    }

    if (t === "numhouse") {
      const blank = block.blank || "mix";
      return (<>
        <Section title="Zahlenhaus">
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 10px", lineHeight: 1.5 }}>Die Zahl im Dach wird zerlegt. Jede Zeile zeigt ein Zahlenpaar, das zusammen die Zielzahl ergibt.</p>
          <Row label="Zielzahl"><Stepper value={block.target || 10} min={2} max={20} onChange={v => patch({ target: v })} /></Row>
          <Row label="Zeilen"><Stepper value={block.count || 6} min={2} max={12} onChange={v => patch({ count: v })} /></Row>
        </Section>
        <Section title="Welche Zahl fehlt?">
          <Segmented value={blank} onChange={v => patch({ blank: v })} options={[
            { v: "a", label: "Links" }, { v: "b", label: "Rechts" }, { v: "mix", label: "Gemischt" }]} />
          <button className="btn" style={{ width: "100%", marginTop: 10 }} onClick={() => patch({ _regen: Date.now() })}><Icon name="redo" size={16} /> Neue Zerlegungen würfeln</button>
        </Section>
        <Section title="Größe"><Stepper value={block.size || 22} min={16} max={34} step={2} onChange={v => patch({ size: v })} /></Section>
      </>);
    }

    if (t === "selfcheck") {
      const META = {}; DKI.PALETTE.forEach(g => g.items.forEach(it => { META[it.type] = it; }));
      const eligible = ((doc && doc.blocks) || []).filter(b => SC_ELIGIBLE.includes(b.type));
      // Gleichartige Bausteine unterscheidbar machen: erster ohne Zahl, weitere „… 2", „… 3" …
      const typeTotals = {}; eligible.forEach(b => { typeTotals[b.type] = (typeTotals[b.type] || 0) + 1; });
      const typeIdx = {}; const labelById = {};
      eligible.forEach(b => {
        const m = META[b.type] || { label: b.type };
        typeIdx[b.type] = (typeIdx[b.type] || 0) + 1;
        labelById[b.id] = (typeTotals[b.type] > 1 && typeIdx[b.type] > 1) ? `${m.label} ${typeIdx[b.type]}` : m.label;
      });
      const allIds = eligible.map(b => b.id);
      const isAll = block.sources == null;
      const activeIds = isAll ? allIds : (block.sources || []).filter(id => allIds.includes(id));
      const toggle = (id) => {
        const next = activeIds.includes(id) ? activeIds.filter(x => x !== id) : [...activeIds, id];
        patch({ sources: next.length === allIds.length ? null : next }); // alle gewählt → wieder Auto-Modus
      };
      const total = eligible.reduce((s, b) => s + (activeIds.includes(b.id) ? collectSolutions(b).length : 0), 0);
      return (<>
        <Section title="Aufgaben prüfen" right={<span style={{ fontSize: 11, fontWeight: 700, color: "var(--sol)", background: "rgba(21,128,61,.1)", padding: "2px 8px", borderRadius: 999 }}>{total} {total === 1 ? "Lösung" : "Lösungen"}</span>}>
          {eligible.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>Es gibt noch keine Rechen-Aufgaben auf dem Blatt. Füge z. B. ein <b>Rechenpäckchen</b>, eine <b>Rechenmauer</b>, ein <b>Rechendreieck</b> oder einen <b>Zahlenstrahl</b> hinzu – ihre Lösungen erscheinen dann hier automatisch.</p>
          ) : (<>
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 9px", lineHeight: 1.5 }}>Tippe die Aufgaben an, deren Ergebnisse zum Abhaken erscheinen sollen.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {eligible.map(b => {
                const on = activeIds.includes(b.id);
                const m = META[b.type] || { label: b.type, icon: "math" };
                const n = collectSolutions(b).length;
                return (
                  <button key={b.id} onClick={() => toggle(b.id)}
                    style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", textAlign: "left", borderRadius: 11, cursor: "pointer",
                      border: "1.5px solid " + (on ? "var(--sol)" : "var(--line)"), background: on ? "rgba(21,128,61,.07)" : "#fff", transition: "all .12s ease" }}>
                    <span style={{ width: 32, height: 32, flex: "none", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                      background: on ? "var(--sol)" : "var(--bg-rail)", color: on ? "#fff" : "var(--ink-soft)" }}><Icon name={m.icon} size={17} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{labelById[b.id]}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{n} {n === 1 ? "Lösung" : "Lösungen"}</div>
                    </span>
                    <span style={{ width: 24, height: 24, flex: "none", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
                      border: "2px solid " + (on ? "var(--sol)" : "var(--line)"), background: on ? "var(--sol)" : "#fff", color: "#fff" }}>
                      {on && <Icon name="check" size={15} stroke={2.6} />}
                    </span>
                  </button>
                );
              })}
            </div>
            {isAll && <p style={{ fontSize: 11, color: "var(--muted)", margin: "9px 2px 0", lineHeight: 1.45 }}>Aktuell werden <b>alle</b> Aufgaben automatisch geprüft – auch neu hinzugefügte.</p>}
          </>)}
        </Section>
        <Section title="Darstellung">
          <Row label="Form"><Segmented value={block.shape || "band"} onChange={v => patch({ shape: v })} options={[
            { v: "band", label: "Band" }, { v: "schlange", label: "Schlange" }]} /></Row>
          <Row label="Zahlengröße"><Stepper value={block.size || 22} min={16} max={36} step={2} onChange={v => patch({ size: v })} /></Row>
        </Section>
        <Section title="Schwieriger machen">
          <Row label="Falsche Ergebnisse einstreuen"><Toggle value={!!block.decoys} onChange={v => patch({ decoys: v ? 3 : 0 })} /></Row>
          {!!block.decoys && <Row label="Anzahl"><Stepper value={block.decoys} min={1} max={6} onChange={v => patch({ decoys: v })} /></Row>}
          {!!block.decoys && <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 2px 0", lineHeight: 1.45 }}>Zusätzliche falsche Zahlen verhindern bloßes Abhaken. Im Lösungsblatt sind sie rot durchgestrichen.</p>}
        </Section>
      </>);
    }

    if (t === "pagebreak") return (
      <Section title="Seitenumbruch">
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "var(--muted)", fontSize: 12.5, lineHeight: 1.55 }}>
          <Icon name="pagebreak" size={16} style={{ color: "var(--orange)", flex: "none", marginTop: 1 }} />
          <span>Alles ab hier beginnt beim Drucken/PDF auf einer <b>neuen Seite</b>. Verschiebe diesen Baustein an die Stelle, an der die Seite umbrechen soll. Im Ausdruck ist die Linie unsichtbar.</span>
        </div>
      </Section>
    );

    return <Section><div style={{ fontSize: 13, color: "var(--muted)" }}>Keine Einstellungen.</div></Section>;
  }

  function RightRail({ doc, sel, patch, patchDoc, setLevel, onPickImage, blockMeta }) {
    return (
      <aside style={{ background: "#fff", borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/* Differentiation — always visible */}
        <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--line)", background: "linear-gradient(180deg,var(--teal-50),#fff)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
            <Icon name="level" size={16} style={{ color: "var(--teal-700)" }} />
            <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink)" }}>Differenzierung</span>
            <span data-tip="Passt Aufgaben & Hilfen automatisch an das Niveau an" style={{ marginLeft: "auto", color: "var(--muted-2)", cursor: "help" }}><Icon name="bulb" size={15} /></span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ v: "leicht", l: "Leicht", c: "var(--lvl-1)" }, { v: "mittel", l: "Mittel", c: "var(--lvl-2)" }, { v: "schwer", l: "Schwer", c: "var(--lvl-3)" }].map(o => (
              <button key={o.v} onClick={() => setLevel(o.v)}
                style={{ flex: 1, padding: "8px 4px", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                         border: "1.5px solid " + (doc.level === o.v ? o.c : "var(--line)"),
                         background: doc.level === o.v ? o.c : "#fff", color: doc.level === o.v ? "#fff" : "var(--ink-soft)" }}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div className="scroll" style={{ overflowY: "auto", flex: 1 }}>
          {sel ? (
            <div key={sel.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 16px 4px" }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--teal-50)", color: "var(--teal-700)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={blockMeta.icon} size={17} />
                </span>
                <span style={{ fontSize: 14.5, fontWeight: 800 }}>{blockMeta.label}</span>
              </div>
              {["matharow", "mathwall", "mathtri", "numline", "wordsearch", "wordplay", "clock", "dotfield", "hundredchart", "numhouse", "unitcalc", "moneycount", "writtenmath", "imagelabel", "chain", "net", "rechenrad", "malkreuz", "times", "placevalue", "fraction", "sach"].includes(sel.type) && (
                <Section title="Arbeitsauftrag">
                  <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 7px", lineHeight: 1.45 }}>Diese Anweisung steht über der Aufgabe. Leer lassen = ausblenden.</p>
                  <input value={sel.prompt != null ? sel.prompt : DKU.autoPrompt(sel)} onChange={e => patch({ prompt: e.target.value })}
                    style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 9px", font: "inherit", fontSize: 13, outline: "none" }} />
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 9px", marginTop: 7 }} onClick={() => patch({ prompt: null })}><Icon name="redo" size={13} /> Automatischer Text</button>
                </Section>
              )}
              <BlockProps block={sel} patch={patch} onPickImage={onPickImage} doc={doc} />
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 16px 4px" }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--teal-50)", color: "var(--teal-700)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="frame" size={17} /></span>
                <span style={{ fontSize: 14.5, fontWeight: 800 }}>Seite & Layout</span>
              </div>
              <Section title="Seitenrahmen">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  {[["none", "Kein"], ["solid", "Linie"], ["dashed", "Gestrichelt"], ["round", "Abgerundet"], ["kids", "Kindlich"]].map(([v, l]) => (
                    <button key={v} onClick={() => patchDoc && patchDoc({ frame: v })}
                      style={{ padding: "9px 8px", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                        border: "1.5px solid " + ((doc.frame || "none") === v ? "var(--teal)" : "var(--line)"), background: (doc.frame || "none") === v ? "var(--teal-50)" : "#fff", color: "var(--ink-soft)" }}>{l}</button>
                  ))}
                </div>
              </Section>
              <Section title="Fußzeile">
                <Row label="Fußzeile zeigen"><Toggle value={!!doc.footer} onChange={v => patchDoc && patchDoc({ footer: v })} /></Row>
                {doc.footer && <input value={doc.footerText || ""} onChange={e => patchDoc && patchDoc({ footerText: e.target.value })} placeholder="z. B. Grundschule Musterstadt · Frau Meier"
                  style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 9px", font: "inherit", fontSize: 13, outline: "none", marginTop: 2 }} />}
              </Section>
              <Section title="Seiten">
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "var(--muted)", fontSize: 12, lineHeight: 1.55 }}>
                  <Icon name="file" size={15} style={{ color: "var(--teal-700)", flex: "none", marginTop: 1 }} />
                  <span>Jedes Blatt entspricht einer A4-Druckseite. Mit „Seite hinzufügen" unter dem Blatt legst du beliebig viele Folgeseiten an.</span>
                </div>
              </Section>
              <Section>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "var(--muted)", fontSize: 12, lineHeight: 1.55 }}>
                  <Icon name="bulb" size={15} style={{ color: "var(--orange)", flex: "none", marginTop: 1 }} />
                  <span>Klicke einen Baustein auf dem Blatt an, um ihn zu bearbeiten – oder füge links einen neuen hinzu.</span>
                </div>
              </Section>
            </div>
          )}
        </div>
      </aside>
    );
  }
  export { RightRail };
