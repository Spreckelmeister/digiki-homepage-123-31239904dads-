"use client";

import { useCallback, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Upload,
  FilePlus2,
  Scissors,
  Download,
  X,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";

type Mode = "merge" | "split";

interface MergeFile {
  id: string;
  file: File;
  pageCount: number;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Parst einen Seitenbereichs-String wie "1-3, 5, 7-9" zu einer 0-basierten
 * Index-Liste, dedupliziert und begrenzt auf totalPages.
 */
function parsePageRange(input: string, totalPages: number): number[] {
  const out = new Set<number>();
  for (const part of input.split(",")) {
    const p = part.trim();
    if (!p) continue;
    const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      if (!isNaN(a) && !isNaN(b)) {
        const lo = Math.max(1, Math.min(a, b));
        const hi = Math.min(totalPages, Math.max(a, b));
        for (let i = lo; i <= hi; i++) out.add(i - 1);
      }
    } else {
      const n = parseInt(p, 10);
      if (!isNaN(n) && n >= 1 && n <= totalPages) out.add(n - 1);
    }
  }
  return [...out].sort((a, b) => a - b);
}

export default function PdfTools() {
  const [mode, setMode] = useState<Mode>("merge");

  // ── Merge ──
  const [files, setFiles] = useState<MergeFile[]>([]);
  const [mergeBusy, setMergeBusy] = useState(false);
  const mergeInputRef = useRef<HTMLInputElement>(null);

  // ── Split ──
  const [splitFile, setSplitFile] = useState<{ file: File; pages: number } | null>(null);
  const [splitRange, setSplitRange] = useState("");
  const [splitBusy, setSplitBusy] = useState(false);
  const splitInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string>("");

  const addMergeFiles = useCallback(async (list: FileList | File[]) => {
    setError("");
    const pdfs = Array.from(list).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    const entries: MergeFile[] = [];
    for (const f of pdfs) {
      try {
        const bytes = await f.arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        entries.push({
          id: crypto.randomUUID(),
          file: f,
          pageCount: doc.getPageCount(),
        });
      } catch {
        setError(
          `Datei „${f.name}" konnte nicht geladen werden (verschlüsselt oder beschädigt?).`
        );
      }
    }
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const moveFile = useCallback((id: string, delta: -1 | 1) => {
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + delta;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  const mergePdfs = useCallback(async () => {
    if (files.length === 0) return;
    setMergeBusy(true);
    setError("");
    try {
      const merged = await PDFDocument.create();
      for (const entry of files) {
        const bytes = await entry.file.arrayBuffer();
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      const output = await merged.save();
      const blob = new Blob([output as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "zusammengefuegt.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF-Zusammenfügen fehlgeschlagen.");
    } finally {
      setMergeBusy(false);
    }
  }, [files]);

  const selectSplitFile = useCallback(async (list: FileList | File[]) => {
    setError("");
    const f = Array.from(list).find(
      (x) => x.type === "application/pdf" || x.name.toLowerCase().endsWith(".pdf")
    );
    if (!f) return;
    try {
      const bytes = await f.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      setSplitFile({ file: f, pages: doc.getPageCount() });
      setSplitRange(`1-${doc.getPageCount()}`);
    } catch {
      setError(`Datei „${f.name}" konnte nicht geladen werden.`);
      setSplitFile(null);
    }
  }, []);

  const runSplit = useCallback(async () => {
    if (!splitFile) return;
    const indices = parsePageRange(splitRange, splitFile.pages);
    if (indices.length === 0) {
      setError("Bitte geben Sie einen gültigen Seitenbereich ein (z. B. 1-3, 5).");
      return;
    }
    setSplitBusy(true);
    setError("");
    try {
      const bytes = await splitFile.file.arrayBuffer();
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, indices);
      pages.forEach((p) => out.addPage(p));
      const output = await out.save();
      const blob = new Blob([output as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = splitFile.file.name.replace(/\.pdf$/i, "");
      a.download = `${baseName}-auszug.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seiten extrahieren fehlgeschlagen.");
    } finally {
      setSplitBusy(false);
    }
  }, [splitFile, splitRange]);

  return (
    <div className="space-y-8">
      {/* Modus-Umschalter */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-white border border-border rounded-lg max-w-lg">
        <button
          type="button"
          onClick={() => setMode("merge")}
          aria-pressed={mode === "merge"}
          className={`rounded-md px-4 py-2.5 text-sm font-bold transition-colors ${
            mode === "merge" ? "bg-primary text-white shadow-sm" : "text-text-light hover:text-primary"
          }`}
        >
          <FilePlus2 className="inline h-4 w-4 mr-1.5" aria-hidden="true" />
          Zusammenfügen
        </button>
        <button
          type="button"
          onClick={() => setMode("split")}
          aria-pressed={mode === "split"}
          className={`rounded-md px-4 py-2.5 text-sm font-bold transition-colors ${
            mode === "split" ? "bg-primary text-white shadow-sm" : "text-text-light hover:text-primary"
          }`}
        >
          <Scissors className="inline h-4 w-4 mr-1.5" aria-hidden="true" />
          Seiten extrahieren
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 text-red-800 p-4 text-sm">
          {error}
        </div>
      )}

      {mode === "merge" ? (
        <>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) addMergeFiles(e.dataTransfer.files);
            }}
            onClick={() => mergeInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                mergeInputRef.current?.click();
              }
            }}
            className="rounded-2xl border-2 border-dashed border-border bg-white p-8 md:p-12 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all"
          >
            <input
              ref={mergeInputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) addMergeFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Upload className="h-8 w-8 text-primary" aria-hidden="true" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-bold text-text mb-1">
              PDFs hierher ziehen oder klicken
            </p>
            <p className="text-sm text-text-light">
              Werden in der Reihenfolge zusammengefügt, in der sie hier
              erscheinen – Sie können sie danach noch umsortieren.
            </p>
          </div>

          {files.length > 0 && (
            <div className="rounded-xl bg-white border border-border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <p className="text-sm font-bold text-text">
                  {files.length} Datei{files.length !== 1 && "en"} · Gesamtseiten:{" "}
                  <span className="tabular-nums">
                    {files.reduce((n, f) => n + f.pageCount, 0)}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="text-xs text-text-light hover:text-red-700 transition-colors"
                >
                  Alle entfernen
                </button>
              </div>
              <ul className="divide-y divide-border">
                {files.map((f, i) => (
                  <li key={f.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="font-mono text-xs text-text-light tabular-nums w-6 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text truncate">{f.file.name}</p>
                      <p className="text-xs text-text-light font-mono">
                        {f.pageCount} Seiten · {formatBytes(f.file.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveFile(f.id, -1)}
                        disabled={i === 0}
                        aria-label="Nach oben"
                        className="p-1.5 text-text-light hover:text-primary disabled:opacity-30 transition-colors"
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFile(f.id, 1)}
                        disabled={i === files.length - 1}
                        aria-label="Nach unten"
                        className="p-1.5 text-text-light hover:text-primary disabled:opacity-30 transition-colors"
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        aria-label="Entfernen"
                        className="p-1.5 text-text-light hover:text-red-700 transition-colors"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={mergePdfs}
            disabled={files.length === 0 || mergeBusy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            {mergeBusy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Wird erstellt…
              </>
            ) : (
              <>
                <Download className="h-5 w-5" aria-hidden="true" />
                PDF zusammenfügen &amp; herunterladen
              </>
            )}
          </button>
        </>
      ) : (
        <>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) selectSplitFile(e.dataTransfer.files);
            }}
            onClick={() => splitInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                splitInputRef.current?.click();
              }
            }}
            className="rounded-2xl border-2 border-dashed border-border bg-white p-8 md:p-12 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all"
          >
            <input
              ref={splitInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) selectSplitFile(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Scissors className="h-8 w-8 text-primary" aria-hidden="true" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-bold text-text mb-1">
              {splitFile ? splitFile.file.name : "PDF hierher ziehen oder klicken"}
            </p>
            <p className="text-sm text-text-light">
              {splitFile
                ? `${splitFile.pages} Seiten · ${formatBytes(splitFile.file.size)}`
                : "Eine PDF-Datei auswählen, aus der Sie einen Seitenbereich exportieren möchten."}
            </p>
          </div>

          {splitFile && (
            <div className="rounded-xl bg-white border border-border p-5 md:p-6 space-y-4">
              <div>
                <label
                  htmlFor="split-range"
                  className="block text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-2"
                >
                  Seitenbereich
                </label>
                <input
                  id="split-range"
                  type="text"
                  value={splitRange}
                  onChange={(e) => setSplitRange(e.target.value)}
                  placeholder="z. B. 1-3, 5, 7-9"
                  className="w-full rounded-lg border border-border bg-white px-4 py-3 text-base font-mono focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
                />
                <p className="mt-1.5 text-xs text-text-light">
                  Einzelne Seiten mit Komma, Bereiche mit Bindestrich. Das
                  Dokument hat <strong>{splitFile.pages}</strong> Seiten.
                </p>
              </div>
              <button
                type="button"
                onClick={runSplit}
                disabled={splitBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                {splitBusy ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    Wird erstellt…
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" aria-hidden="true" />
                    Ausgewählte Seiten als PDF herunterladen
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4 text-xs text-text leading-relaxed">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          <strong>Datenschutz:</strong> Alle PDFs werden ausschließlich{" "}
          <strong>im Arbeitsspeicher Ihres Browsers</strong> verarbeitet.
          Nichts wird auf einen Server geladen. Sensible Dokumente wie
          Klassenarbeiten oder Gutachten bleiben bei Ihnen.
        </p>
      </div>
    </div>
  );
}
