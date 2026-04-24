"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dice5,
  Users,
  Save,
  Trash2,
  Plus,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

const STORAGE_KEY = "digiki.werkzeuge.zufalls.lists.v1";

interface StoredList {
  id: string;
  name: string;
  names: string[];
  createdAt: number;
}

type Mode = "pick" | "groups";

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseNames(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
}

function loadLists(): StoredList[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is StoredList =>
        typeof l?.id === "string" &&
        typeof l?.name === "string" &&
        Array.isArray(l?.names)
    );
  } catch {
    return [];
  }
}

/**
 * Nimmt jede String-Eingabe entgegen (auch leer, mit Leerzeichen etc.) und
 * liefert eine garantiert gültige Zahl im Bereich [min, max] zurück. Falls
 * der Input ungültig ist, wird `fallback` verwendet.
 *
 * So kann der User auf Mobile frei tippen (das Feld darf leer sein während
 * er eine neue Zahl tippt) und die Validierung passiert erst bei der Aktion.
 */
function clampInt(raw: string, min: number, max: number, fallback: number): number {
  const n = parseInt(raw.trim(), 10);
  if (!Number.isFinite(n)) return Math.min(Math.max(fallback, min), max);
  return Math.min(Math.max(n, min), max);
}

export default function ZufallsAuswahlApp() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("pick");

  // Pick-Mode – als String, damit das Feld beim Tippen leer sein darf.
  const [pickCountInput, setPickCountInput] = useState("1");
  const [pickResult, setPickResult] = useState<string[]>([]);

  // Groups-Mode – ebenfalls als String.
  const [groupCountInput, setGroupCountInput] = useState("4");
  const [groups, setGroups] = useState<string[][]>([]);

  // Gespeicherte Listen
  const [stored, setStored] = useState<StoredList[]>([]);
  const [listName, setListName] = useState("");
  const listNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStored(loadLists());
  }, []);

  const persist = useCallback((next: StoredList[]) => {
    setStored(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* Quota voll o. ä. – ignorieren */
    }
  }, []);

  const names = useMemo(() => parseNames(input), [input]);
  const hasNames = names.length > 0;

  // Effektive (validierte) Werte für die Vorschau-Texte – werden aus dem
  // aktuellen Input-String abgeleitet und auf sinnvolle Grenzen geclampt.
  const effectivePickCount = clampInt(pickCountInput, 1, Math.max(1, names.length), 1);
  const effectiveGroupCount = clampInt(groupCountInput, 2, Math.max(2, names.length || 2), 2);

  const draw = useCallback(() => {
    if (!hasNames) return;
    const count = clampInt(pickCountInput, 1, names.length, 1);
    // Bei ungültiger Eingabe den Wert sichtbar korrigieren, damit klar ist,
    // was gezogen wurde.
    if (String(count) !== pickCountInput.trim()) {
      setPickCountInput(String(count));
    }
    setPickResult(shuffle(names).slice(0, count));
  }, [hasNames, pickCountInput, names]);

  const makeGroups = useCallback(() => {
    if (!hasNames) return;
    const count = clampInt(groupCountInput, 2, Math.max(2, names.length), 2);
    if (String(count) !== groupCountInput.trim()) {
      setGroupCountInput(String(count));
    }
    const shuffled = shuffle(names);
    const g: string[][] = Array.from({ length: count }, () => []);
    shuffled.forEach((n, i) => {
      g[i % count].push(n);
    });
    setGroups(g);
  }, [hasNames, names, groupCountInput]);

  const saveList = useCallback(() => {
    if (!hasNames || !listName.trim()) return;
    const next: StoredList = {
      id: crypto.randomUUID(),
      name: listName.trim(),
      names,
      createdAt: Date.now(),
    };
    persist([next, ...stored].slice(0, 20));
    setListName("");
  }, [hasNames, listName, names, persist, stored]);

  const loadList = useCallback((list: StoredList) => {
    setInput(list.names.join("\n"));
    setPickResult([]);
    setGroups([]);
  }, []);

  const deleteList = useCallback(
    (id: string) => {
      persist(stored.filter((l) => l.id !== id));
    },
    [persist, stored]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 lg:gap-10">
      {/* Sidebar: Namen + gespeicherte Listen */}
      <aside className="space-y-6">
        <div>
          <label
            htmlFor="zufall-names"
            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-2"
          >
            <Users className="h-4 w-4 text-primary/70" aria-hidden="true" />
            Namen eingeben
          </label>
          <textarea
            id="zufall-names"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
            placeholder={"Ein Name pro Zeile\n\nAnna\nBen\nClara\nDavid\nEmma"}
            className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm font-mono placeholder:font-sans placeholder:text-text-light/70 focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors resize-y"
          />
          <p className="mt-1.5 text-xs text-text-light">
            {hasNames ? (
              <>
                <strong className="text-text">{names.length}</strong> Name
                {names.length !== 1 && "n"} erkannt
              </>
            ) : (
              "Einzelne Namen getrennt durch Zeilenumbruch, Komma oder Semikolon."
            )}
          </p>
        </div>

        {/* Speichern */}
        <div className="rounded-lg bg-white border border-border p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
            Liste lokal speichern
          </p>
          <div className="flex gap-2">
            <input
              ref={listNameRef}
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="z. B. Klasse 3b"
              className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
            <button
              type="button"
              onClick={saveList}
              disabled={!hasNames || !listName.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only md:not-sr-only">Sichern</span>
            </button>
          </div>
          {stored.length > 0 && (
            <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-bg/50">
              {stored.map((l) => (
                <li key={l.id} className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => loadList(l)}
                    className="flex-1 text-left"
                  >
                    <div className="text-sm font-bold text-text">{l.name}</div>
                    <div className="text-xs text-text-light">
                      {l.names.length} Namen
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteList(l.id)}
                    className="p-1 text-text-light hover:text-red-700 transition-colors"
                    aria-label={`Liste ${l.name} löschen`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4 text-xs text-text leading-relaxed">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong>Lokal gespeichert:</strong> Listen liegen nur im{" "}
            <strong>Local Storage</strong> dieses Browsers auf diesem Gerät.
            Kein Server, kein Account, kein Sync.
          </p>
        </div>
      </aside>

      {/* Main: Aktion + Ergebnis */}
      <div className="space-y-6">
        {/* Modus-Auswahl */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-bg rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setMode("pick")}
            aria-pressed={mode === "pick"}
            className={`rounded-md px-3 py-2 text-sm font-bold transition-colors ${
              mode === "pick"
                ? "bg-white text-primary shadow-sm"
                : "text-text-light hover:text-primary"
            }`}
          >
            <Dice5 className="inline h-4 w-4 mr-1" aria-hidden="true" />
            Zufällig aufrufen
          </button>
          <button
            type="button"
            onClick={() => setMode("groups")}
            aria-pressed={mode === "groups"}
            className={`rounded-md px-3 py-2 text-sm font-bold transition-colors ${
              mode === "groups"
                ? "bg-white text-primary shadow-sm"
                : "text-text-light hover:text-primary"
            }`}
          >
            <Users className="inline h-4 w-4 mr-1" aria-hidden="true" />
            In Gruppen einteilen
          </button>
        </div>

        {mode === "pick" ? (
          <div className="rounded-xl bg-white border border-border shadow-sm">
            <div className="p-6 border-b border-border flex flex-wrap items-center gap-4">
              <label htmlFor="pick-count" className="text-sm font-bold text-text">
                Wie viele aufrufen?
              </label>
              <input
                id="pick-count"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pickCountInput}
                onChange={(e) => {
                  // Nur Ziffern zulassen, sonst alles akzeptieren (auch leer).
                  const cleaned = e.target.value.replace(/[^0-9]/g, "");
                  setPickCountInput(cleaned);
                }}
                className="w-20 rounded-lg border border-border bg-white px-3 py-2 text-sm font-mono tabular-nums text-center focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
              />
              <button
                type="button"
                onClick={draw}
                disabled={!hasNames}
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-text hover:bg-accent-hover transition-colors disabled:opacity-40"
              >
                <Dice5 className="h-4 w-4" aria-hidden="true" />
                Ziehen
              </button>
            </div>
            <div className="p-6">
              {pickResult.length === 0 ? (
                <p className="text-center py-14 text-sm text-text-light">
                  Klicken Sie auf <strong className="text-text">„Ziehen"</strong>, um
                  zufällig{" "}
                  {effectivePickCount === 1
                    ? "einen Namen"
                    : `${effectivePickCount} Namen`}{" "}
                  auszuwählen.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3 justify-center items-center py-8">
                  {pickResult.map((name, i) => (
                    <div
                      key={name + i}
                      className="rounded-xl bg-primary text-white px-6 py-4 shadow-lg"
                      style={{
                        animation: `pick-in 420ms ${i * 100}ms cubic-bezier(0.22,0.61,0.36,1) both`,
                      }}
                    >
                      <span className="block text-xs font-mono text-accent mb-0.5">
                        #{i + 1}
                      </span>
                      <span className="text-2xl md:text-3xl font-bold tracking-tight">
                        {name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-border shadow-sm">
            <div className="p-6 border-b border-border flex flex-wrap items-center gap-4">
              <label htmlFor="group-count" className="text-sm font-bold text-text">
                Anzahl Gruppen
              </label>
              <input
                id="group-count"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={groupCountInput}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9]/g, "");
                  setGroupCountInput(cleaned);
                }}
                className="w-20 rounded-lg border border-border bg-white px-3 py-2 text-sm font-mono tabular-nums text-center focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
              />
              <button
                type="button"
                onClick={makeGroups}
                disabled={!hasNames}
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-text hover:bg-accent-hover transition-colors disabled:opacity-40"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Neu einteilen
              </button>
            </div>
            <div className="p-6">
              {groups.length === 0 ? (
                <p className="text-center py-14 text-sm text-text-light">
                  Klicken Sie auf <strong className="text-text">„Neu einteilen"</strong>, um
                  die Namen zufällig in{" "}
                  <strong>{effectiveGroupCount} Gruppen</strong> aufzuteilen.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups.map((g, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border bg-bg/50 p-4"
                    >
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                          {i + 1}
                        </span>
                        <h3 className="text-sm font-bold text-primary">
                          Gruppe {i + 1}
                        </h3>
                        <span className="ml-auto text-xs font-mono text-text-light tabular-nums">
                          {g.length}
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {g.map((n, j) => (
                          <li key={n + j} className="flex items-center gap-2 text-sm text-text">
                            <Plus className="h-3 w-3 text-text-light shrink-0" aria-hidden="true" />
                            {n}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pick-in {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="animation: pick-in"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
