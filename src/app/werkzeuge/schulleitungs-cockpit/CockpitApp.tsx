"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus,
  CalendarDays,
  Sparkles,
  Filter,
  Trash2,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  Download,
  ListChecks,
  Sunrise,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Network,
  Printer,
} from "lucide-react";
import {
  type CockpitData,
  type Termin,
  type TerminCategory,
  CATEGORIES,
  PFLICHTTERMINE_NI,
  categoryStyle,
  checkKonflikte,
  currentSchuljahr,
  exportIcal,
  findBrueckentage,
  formatDateDE,
  formatDateShortDE,
  getSchuljahrRange,
  isFeiertag,
  isFerientag,
  isoDate,
  loadCockpit,
  parseIso,
  parseQuickAdd,
  saveCockpit,
  uuid,
} from "@/lib/werkzeuge/cockpit";
import {
  type ClassRoster,
  loadRosters,
  subscribeRosters,
} from "@/lib/werkzeuge/classRosters";

const TODAY_KEY = isoDate(new Date());

type View = "liste" | "monat" | "pflicht" | "bruecken";

export default function CockpitApp() {
  const [data, setData] = useState<CockpitData>({ termine: [], schuljahr: currentSchuljahr() });
  const [view, setView] = useState<View>("liste");
  const [filterCat, setFilterCat] = useState<TerminCategory | "alle">("alle");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quickInput, setQuickInput] = useState("");
  const [quickPreview, setQuickPreview] = useState<ReturnType<typeof parseQuickAdd> | null>(null);
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [monthCursor, setMonthCursor] = useState<{ y: number; m: number }>(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });
  const importRef = useRef<HTMLInputElement>(null);

  // ── Persistenz ────────────────────────────────────────────────────
  useEffect(() => {
    setData(loadCockpit());
    setRosters(loadRosters());
    const unsub = subscribeRosters(() => setRosters(loadRosters()));
    return unsub;
  }, []);

  useEffect(() => {
    if (data.termine.length > 0 || data.schuljahr !== currentSchuljahr()) {
      saveCockpit(data);
    }
  }, [data]);

  // ── Quick-Add Live-Preview ───────────────────────────────────────
  useEffect(() => {
    if (!quickInput.trim()) {
      setQuickPreview(null);
      return;
    }
    setQuickPreview(parseQuickAdd(quickInput));
  }, [quickInput]);

  const addTermin = useCallback((titel: string, datum: string, opts: Partial<Termin> = {}) => {
    const t: Termin = {
      id: uuid(),
      titel: titel.trim() || "Ohne Titel",
      datum,
      kategorie: opts.kategorie ?? "sonstiges",
      uhrzeit: opts.uhrzeit,
      ort: opts.ort,
      notiz: opts.notiz,
      pflicht: opts.pflicht,
      rosterId: opts.rosterId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setData((d) => ({ ...d, termine: [...d.termine, t] }));
    return t;
  }, []);

  const updateTermin = useCallback((id: string, patch: Partial<Termin>) => {
    setData((d) => ({
      ...d,
      termine: d.termine.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t
      ),
    }));
  }, []);

  const removeTermin = useCallback((id: string) => {
    setData((d) => ({ ...d, termine: d.termine.filter((t) => t.id !== id) }));
  }, []);

  const handleQuickAdd = useCallback(() => {
    if (!quickInput.trim() || !quickPreview?.datum) return;
    addTermin(quickPreview.titel, quickPreview.datum, {
      uhrzeit: quickPreview.uhrzeit ?? undefined,
      kategorie: quickPreview.kategorie ?? "sonstiges",
    });
    setQuickInput("");
    setQuickPreview(null);
  }, [quickInput, quickPreview, addTermin]);

  // ── Export / Import ───────────────────────────────────────────────
  const downloadIcal = useCallback(() => {
    const ics = exportIcal(data.termine);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schulleitung_${data.schuljahr.replace("/", "-")}_${TODAY_KEY}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data.termine, data.schuljahr]);

  const downloadJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cockpit_${TODAY_KEY}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const importJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result ?? "{}"));
        if (parsed && Array.isArray(parsed.termine)) {
          setData({
            termine: parsed.termine,
            schuljahr:
              typeof parsed.schuljahr === "string"
                ? parsed.schuljahr
                : currentSchuljahr(),
          });
        }
      } catch {
        alert("Datei konnte nicht gelesen werden.");
      }
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  // ── Pflichttermine importieren ───────────────────────────────────
  const importPflicht = useCallback(
    (selected: { id: string; datum: string }[]) => {
      const tpls = PFLICHTTERMINE_NI;
      let count = 0;
      for (const sel of selected) {
        const tpl = tpls.find((t) => t.id === sel.id);
        if (!tpl) continue;
        const exists = data.termine.some(
          (t) => t.titel === tpl.titel && t.datum === sel.datum
        );
        if (exists) continue;
        addTermin(tpl.titel, sel.datum, {
          kategorie: tpl.kategorie,
          notiz: tpl.notiz,
          pflicht: true,
        });
        count++;
      }
      if (count > 0) {
        // kleine Rückmeldung
        // (Toast könnte hier angezeigt werden)
      }
    },
    [addTermin, data.termine]
  );

  // ── Filter & Sortierung ──────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.termine
      .filter((t) => filterCat === "alle" || t.kategorie === filterCat)
      .filter(
        (t) =>
          q === "" ||
          t.titel.toLowerCase().includes(q) ||
          (t.notiz?.toLowerCase().includes(q) ?? false) ||
          (t.ort?.toLowerCase().includes(q) ?? false)
      )
      .sort((a, b) => a.datum.localeCompare(b.datum));
  }, [data.termine, filterCat, search]);

  const upcoming = useMemo(
    () => filtered.filter((t) => t.datum >= TODAY_KEY).slice(0, 50),
    [filtered]
  );
  const past = useMemo(
    () => filtered.filter((t) => t.datum < TODAY_KEY).slice(-30),
    [filtered]
  );

  // ── Übersichts-Kennzahlen ────────────────────────────────────────
  const sjRange = getSchuljahrRange(data.schuljahr);
  const inSchuljahr = data.termine.filter(
    (t) => t.datum >= sjRange.from && t.datum <= sjRange.to
  );
  const pflichtCount = inSchuljahr.filter((t) => t.pflicht).length;
  const naechster = upcoming[0];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6 xl:gap-10">
      {/* ╭─────── SIDEBAR ─────────╮ */}
      <aside className="space-y-5 print:hidden">
        {/* Schuljahr */}
        <div className="rounded-xl bg-white border border-border p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-2">
            Schuljahr
          </p>
          <select
            value={data.schuljahr}
            onChange={(e) => setData((d) => ({ ...d, schuljahr: e.target.value }))}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
          >
            <option>2025/26</option>
            <option>2026/27</option>
            <option>2027/28</option>
          </select>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <KpiTile label="Termine" value={String(inSchuljahr.length)} />
            <KpiTile label="Pflicht" value={String(pflichtCount)} accent="warn" />
          </div>
          {naechster && (
            <div className="mt-3 rounded-lg bg-accent/5 border border-accent/20 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent-strong mb-1">
                Nächster
              </p>
              <p className="text-sm font-bold text-text leading-tight">
                {naechster.titel}
              </p>
              <p className="text-[11px] text-text-light mt-0.5">
                {formatDateDE(naechster.datum)}
                {naechster.uhrzeit && ` · ${naechster.uhrzeit} Uhr`}
              </p>
            </div>
          )}
        </div>

        {/* Ansichten */}
        <nav aria-label="Ansichten" className="rounded-xl bg-white border border-border p-2 shadow-sm">
          <ol className="space-y-1">
            <NavLink
              icon={<CalendarDays className="h-4 w-4" />}
              label="Termin-Liste"
              active={view === "liste"}
              onClick={() => setView("liste")}
            />
            <NavLink
              icon={<Filter className="h-4 w-4" />}
              label="Monatsansicht"
              active={view === "monat"}
              onClick={() => setView("monat")}
            />
            <NavLink
              icon={<ListChecks className="h-4 w-4" />}
              label="Pflichttermine NI"
              active={view === "pflicht"}
              onClick={() => setView("pflicht")}
            />
            <NavLink
              icon={<Sunrise className="h-4 w-4" />}
              label="Brückentage"
              active={view === "bruecken"}
              onClick={() => setView("bruecken")}
            />
          </ol>
        </nav>

        {/* Daten */}
        <div className="rounded-xl bg-white border border-border p-4 shadow-sm space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
            Daten
          </p>
          <button
            type="button"
            onClick={downloadIcal}
            disabled={data.termine.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white px-3 py-2 text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            iCal-Export (.ics)
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={downloadJson}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-white px-2 py-1.5 text-[11px] font-bold text-text hover:bg-bg transition-colors"
            >
              JSON
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-white px-2 py-1.5 text-[11px] font-bold text-text hover:bg-bg transition-colors"
            >
              Laden
            </button>
          </div>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              if (e.target) e.target.value = "";
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold text-text hover:bg-bg transition-colors"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Drucken
          </button>
        </div>

        {/* Roster-Verknüpfung */}
        {rosters.length > 0 && (
          <div className="rounded-xl bg-white border border-border p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-2">
              Verknüpfte Klassen
            </p>
            <p className="text-xs text-text-light leading-relaxed mb-2">
              {rosters.length} Klassen aus dem Klassenlisten-Store stehen für
              Termine zur Verfügung.
            </p>
            <Link
              href="/werkzeuge/klassenverteilung"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
            >
              <Network className="h-3.5 w-3.5" aria-hidden="true" />
              Klassen pflegen
            </Link>
          </div>
        )}

        <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-text leading-relaxed">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            Alle Termine bleiben lokal in diesem Browser. Datenexport jederzeit
            via iCal oder JSON möglich.
          </p>
        </div>
      </aside>

      {/* ╭─────── HAUPTINHALT ───────╮ */}
      <main className="min-w-0 space-y-6">
        {/* Quick-Add */}
        <div className="rounded-xl bg-white border border-border p-4 md:p-5 shadow-sm print:hidden">
          <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-2">
            Schnell-Termin
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="z. B. Elternabend Klasse 3a am 14.5. um 18 Uhr"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuickAdd();
              }}
              className="flex-1 rounded-lg border border-border bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={!quickPreview?.datum}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-text hover:bg-accent-hover transition-colors disabled:opacity-40 sm:shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Hinzufügen
            </button>
          </div>
          {quickInput && quickPreview && (
            <div
              className={`mt-2.5 rounded-lg border px-3 py-2 text-xs ${
                quickPreview.datum
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-amber-300 bg-amber-50 text-amber-900"
              }`}
            >
              {quickPreview.datum ? (
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    <strong>{quickPreview.titel}</strong> am{" "}
                    <strong>{formatDateDE(quickPreview.datum)}</strong>
                    {quickPreview.uhrzeit && (
                      <>
                        {" "}
                        um <strong>{quickPreview.uhrzeit} Uhr</strong>
                      </>
                    )}
                  </span>
                  {quickPreview.kategorie && (
                    <span
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{
                        backgroundColor: categoryStyle(quickPreview.kategorie).bg,
                        color: categoryStyle(quickPreview.kategorie).color,
                      }}
                      title="Automatisch erkannt – kann nach dem Anlegen geändert werden"
                    >
                      → {categoryStyle(quickPreview.kategorie).label}
                    </span>
                  )}
                </div>
              ) : (
                <span>
                  <AlertTriangle className="inline h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Kein Datum erkannt – bitte z. B. „14.5." oder „nächsten
                  Donnerstag" angeben.
                </span>
              )}
            </div>
          )}
          <p className="mt-2 text-[11px] text-text-light leading-relaxed">
            Versteht: <code>14.5.2026</code>, <code>2026-05-14</code>,
            <code> heute</code>, <code>morgen</code>,
            <code> nächsten Donnerstag</code>, <code>14 Uhr</code>,
            <code> 18:30</code>.
          </p>
        </div>

        {/* Filter-Leiste */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute top-1/2 -translate-y-1/2 left-3 h-4 w-4 text-text-light"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Termine durchsuchen…"
              className="w-full rounded-lg border border-border bg-white pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <CatChip
              label="Alle"
              active={filterCat === "alle"}
              onClick={() => setFilterCat("alle")}
            />
            {CATEGORIES.map((c) => (
              <CatChip
                key={c.id}
                label={c.label}
                color={c.color}
                bg={c.bg}
                active={filterCat === c.id}
                onClick={() => setFilterCat(c.id)}
              />
            ))}
          </div>
        </div>

        {/* Ansichts-Container */}
        {view === "liste" && (
          <ListenAnsicht
            upcoming={upcoming}
            past={past}
            allTermine={data.termine}
            editingId={editingId}
            setEditingId={setEditingId}
            updateTermin={updateTermin}
            removeTermin={removeTermin}
            rosters={rosters}
          />
        )}
        {view === "monat" && (
          <MonatsAnsicht
            cursor={monthCursor}
            setCursor={setMonthCursor}
            termine={filtered}
            allTermine={data.termine}
          />
        )}
        {view === "pflicht" && (
          <PflichtAnsicht
            schuljahr={data.schuljahr}
            existing={data.termine}
            onImport={importPflicht}
          />
        )}
        {view === "bruecken" && <BrueckenAnsicht schuljahr={data.schuljahr} addTermin={addTermin} />}
      </main>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// LISTENANSICHT
// ════════════════════════════════════════════════════════════════════════

function ListenAnsicht({
  upcoming,
  past,
  allTermine,
  editingId,
  setEditingId,
  updateTermin,
  removeTermin,
  rosters,
}: {
  upcoming: Termin[];
  past: Termin[];
  allTermine: Termin[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  updateTermin: (id: string, patch: Partial<Termin>) => void;
  removeTermin: (id: string) => void;
  rosters: ClassRoster[];
}) {
  // Gruppiere nach Monat
  const grouped = useMemo(() => {
    const m = new Map<string, Termin[]>();
    for (const t of upcoming) {
      const d = parseIso(t.datum);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(t);
    }
    return Array.from(m.entries());
  }, [upcoming]);

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-white/40 p-12 text-center">
        <CalendarDays className="h-10 w-10 text-text-light mx-auto mb-3" aria-hidden="true" />
        <p className="text-sm text-text-light">
          Noch keine Termine erfasst – legen Sie oben einen ersten Schnell-Termin
          an oder importieren Sie Pflichttermine über die linke Navigation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map(([key, list]) => {
        const [y, mIdx] = key.split("-");
        const date = new Date(parseInt(y), parseInt(mIdx) - 1, 1);
        return (
          <section key={key}>
            <h2 className="flex items-baseline gap-3 mb-3 pb-2 border-b-2 border-primary/15">
              <span className="font-mono text-xs text-text-light tabular-nums">
                {String(parseInt(mIdx)).padStart(2, "0")}/{y}
              </span>
              <span className="text-base font-bold text-primary">
                {date.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
              </span>
              <span className="ml-auto text-xs text-text-light tabular-nums">
                {list.length} Termine
              </span>
            </h2>
            <ul className="space-y-2">
              {list.map((t) => (
                <TerminRow
                  key={t.id}
                  termin={t}
                  allTermine={allTermine}
                  isEditing={editingId === t.id}
                  setEditing={(b) => setEditingId(b ? t.id : null)}
                  onUpdate={(p) => updateTermin(t.id, p)}
                  onRemove={() => removeTermin(t.id)}
                  rosters={rosters}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {past.length > 0 && (
        <section className="opacity-60">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-light mb-3">
            Vergangene Termine ({past.length})
          </h2>
          <ul className="space-y-1">
            {past.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-lg bg-white border border-border px-3 py-2 text-sm"
              >
                <span className="font-mono text-[11px] text-text-light tabular-nums shrink-0">
                  {formatDateShortDE(t.datum)}
                </span>
                <span className="flex-1 truncate text-text-light">{t.titel}</span>
                <button
                  type="button"
                  onClick={() => removeTermin(t.id)}
                  aria-label={`${t.titel} löschen`}
                  className="text-text-light/60 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TerminRow({
  termin,
  allTermine,
  isEditing,
  setEditing,
  onUpdate,
  onRemove,
  rosters,
}: {
  termin: Termin;
  allTermine: Termin[];
  isEditing: boolean;
  setEditing: (b: boolean) => void;
  onUpdate: (patch: Partial<Termin>) => void;
  onRemove: () => void;
  rosters: ClassRoster[];
}) {
  const cat = categoryStyle(termin.kategorie);
  const konflikte = useMemo(
    () => checkKonflikte(termin.datum, allTermine, termin.id),
    [termin.datum, termin.id, allTermine]
  );
  const dt = parseIso(termin.datum);
  const dow = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][dt.getDay()];
  const day = dt.getDate();

  return (
    <li
      className={`rounded-xl bg-white border shadow-sm overflow-hidden transition-shadow ${
        konflikte.some((k) => k.art !== "haeufung")
          ? "border-amber-300"
          : "border-border"
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        <div className="flex flex-col items-center justify-center w-12 shrink-0">
          <span className="font-mono text-[10px] uppercase text-text-light tabular-nums">
            {dow}
          </span>
          <span className="text-2xl font-bold text-primary leading-none tabular-nums">
            {day}
          </span>
          {termin.uhrzeit && (
            <span className="font-mono text-[10px] text-text-light tabular-nums">
              {termin.uhrzeit}
            </span>
          )}
        </div>
        <div
          className="w-1 self-stretch rounded-full"
          style={{ backgroundColor: cat.color }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-text">
              {termin.titel}
              {termin.pflicht && (
                <span className="ml-2 inline-block rounded-full bg-red-100 text-red-800 text-[9px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5">
                  Pflicht
                </span>
              )}
            </p>
            <span
              className="text-[10px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: cat.bg, color: cat.color }}
            >
              {cat.label}
            </span>
          </div>
          {(termin.ort || termin.notiz) && (
            <p className="text-xs text-text-light mt-0.5 truncate">
              {termin.ort && <span>📍 {termin.ort}</span>}
              {termin.ort && termin.notiz && " · "}
              {termin.notiz}
            </p>
          )}
          {konflikte.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {konflikte.map((k, i) => (
                <span
                  key={i}
                  className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    k.art === "feiertag"
                      ? "bg-red-100 text-red-800"
                      : k.art === "ferien"
                        ? "bg-amber-100 text-amber-800"
                        : k.art === "wochenende"
                          ? "bg-violet-100 text-violet-800"
                          : "bg-bg text-text-light"
                  }`}
                  title={k.text}
                >
                  ⚠ {k.text}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing(!isEditing)}
          aria-label={isEditing ? "Bearbeitung schließen" : "Termin bearbeiten"}
          className="text-text-light hover:text-primary p-1"
        >
          <Edit3 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Termin löschen"
          className="text-text-light hover:text-red-700 p-1"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {isEditing && (
        <div className="border-t border-border p-3 bg-bg/30 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Field label="Titel">
            <input
              type="text"
              value={termin.titel}
              onChange={(e) => onUpdate({ titel: e.target.value })}
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </Field>
          <Field label="Datum">
            <input
              type="date"
              value={termin.datum}
              onChange={(e) => onUpdate({ datum: e.target.value })}
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </Field>
          <Field label="Uhrzeit">
            <input
              type="time"
              value={termin.uhrzeit ?? ""}
              onChange={(e) => onUpdate({ uhrzeit: e.target.value || undefined })}
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </Field>
          <Field label="Ort">
            <input
              type="text"
              value={termin.ort ?? ""}
              onChange={(e) => onUpdate({ ort: e.target.value || undefined })}
              placeholder="z. B. Aula"
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </Field>
          <Field label="Kategorie">
            <select
              value={termin.kategorie}
              onChange={(e) => onUpdate({ kategorie: e.target.value as TerminCategory })}
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          {rosters.length > 0 && (
            <Field label="Klasse zuordnen (optional)">
              <select
                value={termin.rosterId ?? ""}
                onChange={(e) =>
                  onUpdate({ rosterId: e.target.value || undefined })
                }
                className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
              >
                <option value="">— keine —</option>
                {rosters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.students.length})
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div className="sm:col-span-2">
            <Field label="Notiz">
              <textarea
                value={termin.notiz ?? ""}
                onChange={(e) => onUpdate({ notiz: e.target.value || undefined })}
                rows={2}
                placeholder="z. B. Tagesordnung, Material, Verantwortliche"
                className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none resize-y"
              />
            </Field>
          </div>
        </div>
      )}
    </li>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-text-light">
      {label}
      <div className="mt-1 normal-case tracking-normal font-normal">
        {children}
      </div>
    </label>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MONATS-ANSICHT
// ════════════════════════════════════════════════════════════════════════

function MonatsAnsicht({
  cursor,
  setCursor,
  termine,
}: {
  cursor: { y: number; m: number };
  setCursor: (c: { y: number; m: number }) => void;
  termine: Termin[];
  allTermine: Termin[];
}) {
  const monthName = new Date(cursor.y, cursor.m, 1).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
  // Cells for calendar grid
  const first = new Date(cursor.y, cursor.m, 1);
  const dow = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: { iso: string | null; day: number; outOfMonth: boolean }[] = [];
  // Padding-Tage am Anfang
  for (let i = 0; i < dow; i++) {
    const d = new Date(cursor.y, cursor.m, 1 - (dow - i));
    cells.push({ iso: isoDate(d), day: d.getDate(), outOfMonth: true });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ iso: isoDate(new Date(cursor.y, cursor.m, i)), day: i, outOfMonth: false });
  }
  // Padding am Ende auf 6 Reihen × 7 Tage = 42
  while (cells.length < 42) {
    const idx = cells.length - dow - daysInMonth + 1;
    const d = new Date(cursor.y, cursor.m + 1, idx);
    cells.push({ iso: isoDate(d), day: d.getDate(), outOfMonth: true });
  }

  const goPrev = () =>
    setCursor(cursor.m === 0 ? { y: cursor.y - 1, m: 11 } : { y: cursor.y, m: cursor.m - 1 });
  const goNext = () =>
    setCursor(cursor.m === 11 ? { y: cursor.y + 1, m: 0 } : { y: cursor.y, m: cursor.m + 1 });

  return (
    <div className="rounded-xl bg-white border border-border shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-lg border border-border bg-white p-2 hover:bg-bg transition-colors"
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <h3 className="text-base font-bold text-primary">{monthName}</h3>
        <button
          type="button"
          onClick={goNext}
          className="rounded-lg border border-border bg-white p-2 hover:bg-bg transition-colors"
          aria-label="Nächster Monat"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-7 border-b border-border bg-bg/30">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
          <div
            key={d}
            className="text-center font-mono text-[10px] uppercase tracking-[0.15em] text-text-light py-2"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-border">
        {cells.map((c, i) => {
          if (!c.iso) return <div key={i} className="min-h-24" />;
          const dayTermine = termine.filter((t) => t.datum === c.iso);
          const ft = isFeiertag(c.iso);
          const fer = isFerientag(c.iso);
          const isToday = c.iso === TODAY_KEY;
          return (
            <div
              key={i}
              className={`min-h-24 p-1.5 text-xs relative overflow-hidden ${
                c.outOfMonth
                  ? "bg-bg/20 text-text-light/40"
                  : ft
                    ? "bg-red-50/60"
                    : fer
                      ? "bg-amber-50/40"
                      : "bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`font-mono tabular-nums ${
                    isToday
                      ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-text font-bold"
                      : "text-text-light"
                  }`}
                >
                  {c.day}
                </span>
              </div>
              {ft && !c.outOfMonth && (
                <span className="block text-[9px] text-red-700 font-bold truncate">
                  {ft.name}
                </span>
              )}
              {fer && !ft && !c.outOfMonth && (
                <span className="block text-[9px] text-amber-800 truncate">
                  {fer.name}
                </span>
              )}
              <ul className="mt-0.5 space-y-0.5">
                {dayTermine.slice(0, 3).map((t) => {
                  const cat = categoryStyle(t.kategorie);
                  return (
                    <li
                      key={t.id}
                      className="text-[10px] truncate font-medium rounded px-1"
                      style={{ backgroundColor: cat.bg, color: cat.color }}
                      title={t.titel}
                    >
                      {t.uhrzeit && <span className="font-mono">{t.uhrzeit} </span>}
                      {t.titel}
                    </li>
                  );
                })}
                {dayTermine.length > 3 && (
                  <li className="text-[9px] text-text-light">
                    +{dayTermine.length - 3} weitere
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// PFLICHTTERMINE-ANSICHT
// ════════════════════════════════════════════════════════════════════════

function PflichtAnsicht({
  schuljahr,
  existing,
  onImport,
}: {
  schuljahr: string;
  existing: Termin[];
  onImport: (selected: { id: string; datum: string }[]) => void;
}) {
  const computed = useMemo(
    () =>
      PFLICHTTERMINE_NI.map((tpl) => ({
        tpl,
        datum: tpl.computeDate(schuljahr),
      })).filter((x): x is { tpl: typeof PFLICHTTERMINE_NI[number]; datum: string } => x.datum !== null),
    [schuljahr]
  );
  const [selected, setSelected] = useState<Set<string>>(() => {
    const all = new Set<string>();
    computed.forEach(({ tpl }) => all.add(tpl.id));
    return all;
  });

  const toggle = (id: string) => {
    setSelected((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const doImport = () => {
    onImport(
      computed
        .filter(({ tpl }) => selected.has(tpl.id))
        .map(({ tpl, datum }) => ({ id: tpl.id, datum }))
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-border p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <ListChecks className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <h3 className="text-base font-bold text-primary">
              Pflichttermine Niedersachsen · Schuljahr {schuljahr}
            </h3>
            <p className="text-xs text-text-light mt-1 leading-relaxed">
              Berechnete Termine für Grundschulen in Niedersachsen –
              Schuljahresbeginn, Einschulung, Halbjahres-/Endjahreszeugnisse,
              VERA-3, Konferenzen, Elternabend. Termine sind Richtwerte und
              müssen schulintern bestätigt werden.
            </p>
          </div>
          <button
            type="button"
            onClick={doImport}
            disabled={selected.size === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-text hover:bg-accent-hover transition-colors disabled:opacity-40 shrink-0"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {selected.size} übernehmen
          </button>
        </div>
      </div>
      <ul className="space-y-2">
        {computed.map(({ tpl, datum }) => {
          const isExisting = existing.some(
            (t) => t.titel === tpl.titel && t.datum === datum
          );
          const cat = categoryStyle(tpl.kategorie);
          const isSel = selected.has(tpl.id);
          return (
            <li
              key={tpl.id}
              className={`rounded-xl border p-4 flex items-center gap-3 transition-colors ${
                isExisting
                  ? "bg-bg border-border opacity-60"
                  : isSel
                    ? "bg-white border-accent-strong/40"
                    : "bg-white border-border"
              }`}
            >
              <input
                type="checkbox"
                checked={isSel && !isExisting}
                disabled={isExisting}
                onChange={() => toggle(tpl.id)}
                className="h-4 w-4 accent-primary"
              />
              <div className="flex flex-col items-center justify-center w-14 shrink-0">
                <span className="font-mono text-[10px] uppercase text-text-light">
                  {parseIso(datum).toLocaleDateString("de-DE", { weekday: "short" })}
                </span>
                <span className="text-xl font-bold text-primary leading-none tabular-nums">
                  {parseIso(datum).getDate()}.
                </span>
                <span className="font-mono text-[10px] text-text-light">
                  {parseIso(datum).toLocaleDateString("de-DE", { month: "short" })}
                </span>
              </div>
              <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: cat.color }} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-text">{tpl.titel}</p>
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: cat.bg, color: cat.color }}
                  >
                    {cat.label}
                  </span>
                  {isExisting && (
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      bereits importiert
                    </span>
                  )}
                </div>
                {tpl.notiz && (
                  <p className="text-xs text-text-light mt-1">{tpl.notiz}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// BRÜCKENTAGE-ANSICHT
// ════════════════════════════════════════════════════════════════════════

function BrueckenAnsicht({
  schuljahr,
  addTermin,
}: {
  schuljahr: string;
  addTermin: (titel: string, datum: string, opts?: Partial<Termin>) => void;
}) {
  const range = getSchuljahrRange(schuljahr);
  const bruecken = useMemo(() => findBrueckentage(range.from, range.to), [range.from, range.to]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-border p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <Sunrise className="h-5 w-5 text-accent-strong shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="text-base font-bold text-primary">
              Brückentage · Schuljahr {schuljahr}
            </h3>
            <p className="text-xs text-text-light mt-1 leading-relaxed">
              Werktage, die zwischen einem Feiertag und einem Wochenende
              liegen – häufig sinnvoll für ganztägige Konferenzen,
              SchiLF-Tage oder als bewegliche Ferientage.
            </p>
          </div>
        </div>
      </div>
      {bruecken.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-white/40 p-8 text-center text-sm text-text-light">
          Keine Brückentage in diesem Schuljahr gefunden.
        </div>
      ) : (
        <ul className="space-y-2">
          {bruecken.map((b, i) => {
            const ft = isFeiertag(b.feiertagDatum);
            const dt = parseIso(b.datum);
            return (
              <li
                key={i}
                className="rounded-xl bg-white border border-border p-4 flex items-center gap-3"
              >
                <div className="flex flex-col items-center justify-center w-14 shrink-0">
                  <span className="font-mono text-[10px] uppercase text-text-light">
                    {dt.toLocaleDateString("de-DE", { weekday: "short" })}
                  </span>
                  <span className="text-xl font-bold text-primary leading-none tabular-nums">
                    {dt.getDate()}.
                  </span>
                  <span className="font-mono text-[10px] text-text-light">
                    {dt.toLocaleDateString("de-DE", { month: "short", year: "2-digit" })}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-text">
                    Brückentag {b.position === "vor" ? "vor" : "nach"} {b.anlass}
                  </p>
                  <p className="text-xs text-text-light mt-0.5">
                    {ft ? `Feiertag ${ft.name} am ${formatDateDE(b.feiertagDatum)}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    addTermin(`Brückentag (${b.anlass})`, b.datum, {
                      kategorie: "schulentw",
                      notiz: `Vorschlag: SchiLF/Konferenz am Brückentag.`,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Termin anlegen
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Reusable UI
// ════════════════════════════════════════════════════════════════════════

function NavLink({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
          active ? "bg-primary text-white" : "hover:bg-primary/5 text-text"
        }`}
      >
        {icon}
        {label}
      </button>
    </li>
  );
}

function KpiTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "warn" | "good";
}) {
  const cls =
    accent === "warn" ? "text-red-700" : accent === "good" ? "text-emerald-700" : "text-primary";
  return (
    <div className="rounded-lg bg-bg/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.15em] text-text-light">{label}</p>
      <p className={`font-bold text-lg tabular-nums leading-none mt-1 ${cls}`}>
        {value}
      </p>
    </div>
  );
}

function CatChip({
  label,
  color,
  bg,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  bg?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors border ${
        active
          ? "border-transparent shadow-sm"
          : "border-border bg-white text-text-light hover:bg-bg"
      }`}
      style={
        active
          ? {
              backgroundColor: bg ?? "var(--color-primary)",
              color: color ?? "#ffffff",
            }
          : undefined
      }
    >
      {label}
    </button>
  );
}
