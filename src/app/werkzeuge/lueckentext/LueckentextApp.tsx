"use client";

import { useCallback, useMemo, useState } from "react";
import { Printer, RotateCcw, Wand2 } from "lucide-react";

type Token =
  | { type: "word"; value: string; index: number }
  | { type: "space"; value: string }
  | { type: "newline" };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let wordIndex = 0;
  const lines = text.split(/\r?\n/);
  lines.forEach((line, li) => {
    const parts = line.split(/(\s+)/);
    parts.forEach((p) => {
      if (p.length === 0) return;
      if (/^\s+$/.test(p)) {
        tokens.push({ type: "space", value: p });
      } else {
        tokens.push({ type: "word", value: p, index: wordIndex++ });
      }
    });
    if (li < lines.length - 1) tokens.push({ type: "newline" });
  });
  return tokens;
}

export default function LueckentextApp() {
  const [title, setTitle] = useState("Lückentext");
  const [rawText, setRawText] = useState(
    "Die Sonne scheint durch die großen Fenster des Klassenzimmers. Anna öffnet ihr Heft und beginnt, die Aufgaben zu lesen. Ihre beste Freundin Clara sitzt neben ihr und hilft ihr, schwierige Wörter zu verstehen."
  );
  const [blanked, setBlanked] = useState<Set<number>>(new Set());
  const [showSolution, setShowSolution] = useState(false);
  // Wortspeicher (Wortliste zum Ausfüllen) – standardmäßig an, da die Kinder
  // ohne ihn nicht wissen, welche Wörter in die Lücken gehören.
  const [showWordBank, setShowWordBank] = useState(true);

  const tokens = useMemo(() => tokenize(rawText), [rawText]);
  const wordCount = tokens.filter((t) => t.type === "word").length;

  // Wörter der Lücken als Hilfe-Liste: Satzzeichen entfernt, alphabetisch
  // sortiert (verrät dadurch nicht die Reihenfolge der Lücken).
  const wordBank = useMemo(() => {
    const stripped = Array.from(blanked)
      .map(
        (idx) =>
          tokens.find(
            (t): t is Extract<Token, { type: "word" }> =>
              t.type === "word" && t.index === idx
          )?.value ?? ""
      )
      .map((v) => v.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
      .filter(Boolean);
    return stripped.sort((a, b) => a.localeCompare(b, "de"));
  }, [blanked, tokens]);

  const toggleWord = useCallback((index: number) => {
    setBlanked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const blankEveryNth = useCallback(
    (n: number) => {
      if (n < 2) return;
      const next = new Set<number>();
      tokens.forEach((t) => {
        if (t.type === "word" && (t.index + 1) % n === 0) {
          next.add(t.index);
        }
      });
      setBlanked(next);
    },
    [tokens]
  );

  const clearAll = useCallback(() => setBlanked(new Set()), []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 lg:gap-10 print:block">
      {/* Sidebar */}
      <aside className="space-y-6 print:hidden">
        <div>
          <label
            htmlFor="lt-title"
            className="block text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-2"
          >
            Titel des Arbeitsblatts
          </label>
          <input
            id="lt-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="lt-text"
            className="block text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-2"
          >
            Text
          </label>
          <textarea
            id="lt-text"
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setBlanked(new Set());
            }}
            rows={10}
            className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors resize-y"
          />
          <p className="mt-1.5 text-xs text-text-light">
            {wordCount} Wörter · {blanked.size} Lücke{blanked.size !== 1 && "n"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
              Automatisch
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[3, 5, 7].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => blankEveryNth(n)}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-bold text-text hover:border-primary/40 transition-colors"
              >
                jedes {n}.
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={clearAll}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-light hover:text-text transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Alle Lücken entfernen
          </button>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-border bg-white p-4">
          <input
            type="checkbox"
            checked={showWordBank}
            onChange={(e) => setShowWordBank(e.target.checked)}
            className="mt-0.5 accent-primary"
          />
          <span className="text-sm text-text">
            <strong>Wortspeicher</strong> auf dem Arbeitsblatt anzeigen – die Wortliste
            zum Einsetzen für die Kinder
          </span>
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-border bg-white p-4">
          <input
            type="checkbox"
            checked={showSolution}
            onChange={(e) => setShowSolution(e.target.checked)}
            className="mt-0.5 accent-primary"
          />
          <span className="text-sm text-text">
            <strong>Lösungsblatt</strong> beim Drucken mit anhängen
          </span>
        </label>

        <button
          type="button"
          onClick={() => window.print()}
          disabled={wordCount === 0}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Arbeitsblatt drucken
        </button>

        <p className="text-xs text-text-light leading-relaxed">
          <strong>Tipp:</strong> Klicken Sie im Vorschau-Text rechts auf
          einzelne Wörter, um sie zur Lücke zu machen. Ein erneuter Klick
          stellt das Wort wieder her.
        </p>
      </aside>

      {/* Vorschau / Druck-Ansicht */}
      <div className="print-area">
        <article className="bg-white rounded-xl border border-border shadow-sm p-8 md:p-12 print:border-0 print:shadow-none print:p-0">
          <header className="mb-8 pb-4 border-b border-border">
            <h2 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
              {title || "Lückentext"}
            </h2>
            <p className="mt-2 text-sm text-text-light">
              Name: ____________________________ &nbsp;&nbsp; Klasse: __________ &nbsp;&nbsp;
              Datum: __________
            </p>
          </header>
          {showWordBank && wordBank.length > 0 && (
            <div className="mb-6 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-5 py-4 print:bg-transparent break-inside-avoid">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-2.5">
                Wortspeicher
              </p>
              <p className="flex flex-wrap gap-x-5 gap-y-1.5 text-lg font-semibold text-text">
                {wordBank.map((w, i) => (
                  <span key={i}>{w}</span>
                ))}
              </p>
            </div>
          )}
          <div className="text-lg leading-relaxed text-text max-w-prose">
            {tokens.map((t, i) => {
              if (t.type === "space") return <span key={i}>{t.value}</span>;
              if (t.type === "newline") return <br key={i} />;
              const isBlank = blanked.has(t.index);
              if (isBlank) {
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleWord(t.index)}
                    className="inline-block min-w-[5rem] px-2 mx-0.5 border-b-2 border-text text-transparent hover:bg-primary/5 transition-colors align-baseline"
                    aria-label={`Lücke – Lösung: ${t.value}. Klicken zum Wiederherstellen.`}
                  >
                    {t.value}
                  </button>
                );
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleWord(t.index)}
                  className="inline rounded hover:bg-accent/15 focus:outline-none focus:bg-accent/20 transition-colors text-left"
                  aria-label={`Wort „${t.value}" – klicken um zur Lücke zu machen`}
                >
                  {t.value}
                </button>
              );
            })}
          </div>
        </article>

        {showSolution && blanked.size > 0 && (
          <article className="mt-8 print:mt-0 print:break-before-page bg-white rounded-xl border border-border shadow-sm p-8 md:p-12 print:border-0 print:shadow-none print:p-0">
            <header className="mb-6 pb-3 border-b border-border">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-strong mb-1">
                Lösungsblatt
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                {title || "Lückentext"} – Lösung
              </h2>
            </header>
            <ol className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-text">
              {Array.from(blanked)
                .sort((a, b) => a - b)
                .map((idx) => {
                  const tok = tokens.find(
                    (t): t is Extract<Token, { type: "word" }> =>
                      t.type === "word" && t.index === idx
                  );
                  return (
                    <li key={idx} className="flex items-baseline gap-2 text-sm">
                      <span className="font-mono text-xs text-text-light tabular-nums w-6 shrink-0">
                        {idx + 1}.
                      </span>
                      <span className="font-bold">{tok?.value}</span>
                    </li>
                  );
                })}
            </ol>
          </article>
        )}
      </div>

      <style>{`
        @media print {
          @page { margin: 16mm; }
          html, body { background: #fff !important; }
          body > header, body > footer, .skip-link { display: none !important; }
        }
      `}</style>
    </div>
  );
}
