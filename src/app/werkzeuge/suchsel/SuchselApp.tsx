"use client";

import { useCallback, useMemo, useState } from "react";
import { Printer, RotateCw, Wand2, Eye, EyeOff } from "lucide-react";

type Direction = { dx: number; dy: number; name: string };

const DIRECTIONS: Direction[] = [
  { dx: 1, dy: 0, name: "→" },
  { dx: 0, dy: 1, name: "↓" },
  { dx: 1, dy: 1, name: "↘" },
  { dx: 1, dy: -1, name: "↗" },
  { dx: -1, dy: 0, name: "←" },
  { dx: 0, dy: -1, name: "↑" },
  { dx: -1, dy: -1, name: "↖" },
  { dx: -1, dy: 1, name: "↙" },
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function normalizeWord(w: string): string {
  return w
    .toUpperCase()
    .replace(/Ä/g, "AE")
    .replace(/Ö/g, "OE")
    .replace(/Ü/g, "UE")
    .replace(/ß/g, "SS")
    .replace(/[^A-Z]/g, "");
}

interface PlacedWord {
  word: string;
  row: number;
  col: number;
  direction: Direction;
}

interface GenerationResult {
  grid: string[][];
  placedWords: PlacedWord[];
  unplaced: string[];
}

function tryPlace(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dir: Direction
): boolean {
  const size = grid.length;
  for (let i = 0; i < word.length; i++) {
    const r = row + dir.dy * i;
    const c = col + dir.dx * i;
    if (r < 0 || c < 0 || r >= size || c >= size) return false;
    const cell = grid[r][c];
    if (cell !== "" && cell !== word[i]) return false;
  }
  return true;
}

function placeWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dir: Direction
) {
  for (let i = 0; i < word.length; i++) {
    grid[row + dir.dy * i][col + dir.dx * i] = word[i];
  }
}

function generateSuchsel(
  words: string[],
  size: number,
  allowDiagonal: boolean,
  allowReverse: boolean
): GenerationResult {
  const allowedDirs = DIRECTIONS.filter((d) => {
    if (!allowDiagonal && Math.abs(d.dx) === 1 && Math.abs(d.dy) === 1) return false;
    if (!allowReverse && (d.dx < 0 || d.dy < 0)) return false;
    return true;
  });

  const grid: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "")
  );
  const placed: PlacedWord[] = [];
  const unplaced: string[] = [];

  // Längste Wörter zuerst (bessere Erfolgsquote)
  const sorted = [...words].sort((a, b) => b.length - a.length);

  for (const word of sorted) {
    if (word.length > size) {
      unplaced.push(word);
      continue;
    }
    let success = false;
    // Bis zu 80 Versuche pro Wort
    for (let attempt = 0; attempt < 80 && !success; attempt++) {
      const dir = allowedDirs[Math.floor(Math.random() * allowedDirs.length)];
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);
      if (tryPlace(grid, word, row, col, dir)) {
        placeWord(grid, word, row, col, dir);
        placed.push({ word, row, col, direction: dir });
        success = true;
      }
    }
    if (!success) unplaced.push(word);
  }

  // Leere Zellen zufällig füllen
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
    }
  }

  return { grid, placedWords: placed, unplaced };
}

export default function SuchselApp() {
  const [title, setTitle] = useState("Suchsel");
  const [rawWords, setRawWords] = useState(
    "Baum\nHund\nBuch\nRegen\nSonne\nMond\nMaus\nApfel"
  );
  const [size, setSize] = useState(12);
  const [allowDiagonal, setAllowDiagonal] = useState(true);
  const [allowReverse, setAllowReverse] = useState(false);
  const [seed, setSeed] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  const words = useMemo(
    () =>
      rawWords
        .split(/[\n,;]+/)
        .map((w) => normalizeWord(w))
        .filter((w) => w.length >= 2),
    [rawWords]
  );

  const result = useMemo(
    () => generateSuchsel(words, size, allowDiagonal, allowReverse),
    // seed ist bewusst Teil der dependencies, damit „Neu generieren" neu rollt
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [words, size, allowDiagonal, allowReverse, seed]
  );

  const isSolutionCell = useCallback(
    (r: number, c: number): boolean => {
      return result.placedWords.some((p) => {
        for (let i = 0; i < p.word.length; i++) {
          if (
            p.row + p.direction.dy * i === r &&
            p.col + p.direction.dx * i === c
          ) {
            return true;
          }
        }
        return false;
      });
    },
    [result]
  );

  const hasWords = words.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 lg:gap-10 print:block">
      {/* Sidebar */}
      <aside className="space-y-5 print:hidden">
        <div>
          <label htmlFor="ss-title" className="block text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-2">
            Titel
          </label>
          <input
            id="ss-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
          />
        </div>
        <div>
          <label htmlFor="ss-words" className="block text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-2">
            Wörter (eines pro Zeile)
          </label>
          <textarea
            id="ss-words"
            value={rawWords}
            onChange={(e) => setRawWords(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm font-mono placeholder:font-sans focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none resize-y"
          />
          <p className="mt-1.5 text-xs text-text-light">
            Umlaute werden automatisch umgesetzt (Ä→AE, ß→SS). Mindestens 2
            Buchstaben pro Wort.
          </p>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label htmlFor="ss-size" className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
              Rastergröße
            </label>
            <span className="text-xs font-mono text-text tabular-nums">
              {size}×{size}
            </span>
          </div>
          <input
            id="ss-size"
            type="range"
            min={8}
            max={20}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <div className="rounded-lg border border-border bg-white p-4 space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={allowDiagonal}
              onChange={(e) => setAllowDiagonal(e.target.checked)}
              className="mt-0.5 accent-primary"
            />
            <span className="text-sm text-text">
              Diagonal erlaubt
              <span className="block text-xs text-text-light">↘ ↗ ↙ ↖</span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={allowReverse}
              onChange={(e) => setAllowReverse(e.target.checked)}
              className="mt-0.5 accent-primary"
            />
            <span className="text-sm text-text">
              Rückwärts erlaubt
              <span className="block text-xs text-text-light">
                Erhöht den Schwierigkeitsgrad
              </span>
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => setSeed((s) => s + 1)}
          disabled={!hasWords}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-text hover:bg-accent-hover transition-colors disabled:opacity-40"
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Neu generieren
        </button>

        <button
          type="button"
          onClick={() => setShowSolution((v) => !v)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-bold text-text hover:border-primary/40 transition-colors"
          aria-pressed={showSolution}
        >
          {showSolution ? (
            <>
              <EyeOff className="h-4 w-4" aria-hidden="true" />
              Lösung verbergen
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" aria-hidden="true" />
              Lösung zeigen
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          disabled={!hasWords}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Drucken
        </button>

        {result.unplaced.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-bold mb-1">Nicht platziert:</p>
            <p className="font-mono">{result.unplaced.join(", ")}</p>
            <p className="mt-1.5">Versuchen Sie ein größeres Raster.</p>
          </div>
        )}
      </aside>

      {/* Ausgabe */}
      <div className="print-area">
        <article className="bg-white rounded-xl border border-border shadow-sm p-6 md:p-10 print:border-0 print:shadow-none print:p-0">
          <header className="mb-6 pb-3 border-b border-border">
            <h2 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
              {title || "Suchsel"}
            </h2>
            <p className="mt-2 text-sm text-text-light">
              Name: ____________________ &nbsp;&nbsp; Klasse: ______ &nbsp;&nbsp;
              Datum: __________
            </p>
          </header>

          {hasWords ? (
            <>
              <div
                className="mx-auto grid gap-0 font-mono font-bold bg-white border-2 border-text"
                style={{
                  gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
                  maxWidth: "min(100%, 560px)",
                  aspectRatio: "1 / 1",
                }}
                role="presentation"
              >
                {result.grid.map((row, r) =>
                  row.map((cell, c) => {
                    const highlight = showSolution && isSolutionCell(r, c);
                    return (
                      <div
                        key={`${r}-${c}`}
                        className={`flex items-center justify-center border border-border text-[clamp(0.75rem,2.2vw,1.25rem)] select-none ${
                          highlight
                            ? "bg-accent/30 text-primary"
                            : "text-text"
                        }`}
                      >
                        {cell}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-2">
                  Finde folgende Wörter
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text">
                  {result.placedWords.map((p) => (
                    <span key={p.word} className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-strong" />
                      {p.word}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-center py-14 text-text-light">
              Geben Sie links mindestens ein Wort ein.
            </p>
          )}
        </article>
      </div>

      <style>{`
        @media print {
          @page { margin: 14mm; }
          html, body { background: #fff !important; }
          body > header, body > footer, .skip-link { display: none !important; }
        }
      `}</style>
    </div>
  );
}
