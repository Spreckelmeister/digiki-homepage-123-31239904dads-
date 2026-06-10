import React from "react";
import { DKI } from "./data";
import { DKU } from "./utils";
import { Icon } from "./icons";

/* ============================================================
   Left rail — Bausteine / Vorlagen / Bilder
   ============================================================ */
function LeftRail({ onAdd, onTemplate, onClipart }) {
  const [tab, setTab] = React.useState("blocks");
  const [q, setQ] = React.useState("");
  // Baustein-Gruppen einzeln ein-/ausklappbar – standardmäßig alle eingeklappt.
  const [openGroups, setOpenGroups] = React.useState({});
  const { PALETTE, TEMPLATES, CLIPART } = DKI;
  const { CLIP_LABELS, clipartSvg } = DKU;

  const tabs = [
    { id: "blocks", label: "Bausteine", icon: "layers" },
    { id: "templates", label: "Vorlagen", icon: "grid" },
    { id: "images", label: "Bilder", icon: "image" },
  ];

  return (
    <aside style={{ background: "#fff", borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, padding: 8, borderBottom: "1px solid var(--line)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 4px",
                     border: "none", borderRadius: 10, cursor: "pointer", fontSize: 11.5, fontWeight: 700,
                     background: tab === t.id ? "var(--teal-50)" : "transparent",
                     color: tab === t.id ? "var(--teal-700)" : "var(--muted)" }}>
            <Icon name={t.icon} size={18} /> {t.label}
          </button>
        ))}
      </div>

      <div className="scroll" style={{ overflowY: "auto", padding: "12px 12px 28px", flex: 1 }}>
        {tab === "blocks" && PALETTE.map(grp => {
          const open = !!openGroups[grp.group];
          return (
          <div key={grp.group} style={{ marginBottom: 6 }}>
            <button onClick={() => setOpenGroups(s => ({ ...s, [grp.group]: !s[grp.group] }))}
              aria-expanded={open}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "8px 4px", margin: "0 0 2px",
                       border: "none", background: "transparent", cursor: "pointer", textAlign: "left", borderRadius: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-rail)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <Icon name={open ? "chevdown" : "chevright"} size={15} style={{ color: "var(--muted-2)", flex: "none" }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted-2)" }}>{grp.group}</span>
              <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: "var(--muted)", background: "var(--bg-rail)", borderRadius: 999, padding: "1px 7px" }}>{grp.items.length}</span>
            </button>
            {open && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {grp.items.map(it => (
                <button key={it.type} onClick={() => onAdd(it.type)} className="palette-card"
                  style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", textAlign: "left",
                           border: "1px solid var(--line)", borderRadius: 11, background: "#fff", transition: "all .14s ease", position: "relative" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 9, flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
                                 background: it.hot ? "linear-gradient(135deg,var(--teal-50),var(--teal-100))" : "var(--bg-rail)",
                                 color: it.hot ? "var(--teal-700)" : "var(--ink-soft)" }}>
                    <Icon name={it.icon} size={19} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                      {it.label}
                      {it.hot && <span style={{ fontSize: 9, fontWeight: 800, color: "var(--orange)", background: "var(--orange-50)", padding: "1px 5px", borderRadius: 5, letterSpacing: ".04em" }}>BELIEBT</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{it.desc}</div>
                  </span>
                  <span className="palette-plus" style={{ marginLeft: "auto", color: "var(--teal)", opacity: 0, transition: "opacity .14s" }}><Icon name="plus" size={17} /></span>
                </button>
              ))}
            </div>
            )}
          </div>
          );
        })}

        {tab === "templates" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 2px 4px", lineHeight: 1.5 }}>Fertige Arbeitsblätter — ein Klick lädt alle Bausteine.</p>
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => onTemplate(t.id)}
                style={{ display: "flex", gap: 11, padding: 10, textAlign: "left", border: "1px solid var(--line)", borderRadius: 12, background: "#fff", cursor: "pointer", transition: "all .14s ease" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ width: 46, height: 60, borderRadius: 6, flex: "none", background: "#fff", border: "1px solid var(--line)", padding: 5, display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
                  {t.preview.slice(0, 5).map((p, i) => (
                    <div key={i} style={{ height: i === 1 ? 6 : 4, borderRadius: 2, background: i === 1 ? t.accent : "var(--line)", width: p === "image" ? "55%" : "100%", opacity: i === 1 ? 1 : .8 }} />
                  ))}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>{t.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{t.tag}</div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 11.5, fontWeight: 700, color: t.accent }}>
                    Öffnen <Icon name="chevright" size={13} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === "images" && (
          <div>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-2)" }}><Icon name="search" size={16} /></span>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Clipart suchen…"
                style={{ width: "100%", padding: "9px 10px 9px 32px", border: "1px solid var(--line)", borderRadius: 10, font: "inherit", fontSize: 13, outline: "none" }}
                onFocus={e => e.target.style.borderColor = "var(--teal)"} onBlur={e => e.target.style.borderColor = "var(--line)"} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {CLIPART.filter(c => CLIP_LABELS[c].toLowerCase().includes(q.toLowerCase())).map(c => (
                <button key={c} onClick={() => onClipart(c)} data-tip={CLIP_LABELS[c]}
                  style={{ aspectRatio: "1", border: "1px solid var(--line)", borderRadius: 11, background: "var(--bg-rail)", padding: 7, cursor: "pointer", transition: "all .14s ease" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.background = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "var(--bg-rail)"; }}
                  dangerouslySetInnerHTML={{ __html: clipartSvg(c) }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
export { LeftRail };
