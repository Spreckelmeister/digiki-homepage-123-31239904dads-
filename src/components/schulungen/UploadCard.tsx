"use client";

import { useId, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import type {
  ImportFileResult,
  TrainingEvent,
} from "@/lib/schulungen/types";

interface SelectedFile {
  key: string;
  file: File;
  eventId: string;
  /** true, wenn die Schulung automatisch über den Dateinamen erkannt wurde. */
  auto: boolean;
}

function normAlnum(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Versucht, eine Datei anhand der KOS-Nummer (oder NLC-ID) im Dateinamen
 * genau einer Schulung zuzuordnen – z. B. „KOS.2638.166.xlsx",
 * „KOS 2638 166 (2).xlsx" oder „2638.166.xlsx". Gibt nur bei einem
 * eindeutigen Treffer eine Event-ID zurück, sonst "" (manuelle Auswahl).
 */
function matchEventByFilename(filename: string, events: TrainingEvent[]): string {
  const base = filename.replace(/\.[^.]+$/, "");
  const fn = normAlnum(base); // "kos26381664"
  const fnDigits = base.replace(/\D/g, ""); // "26381664"
  const hits = events.filter((e) => {
    const k = normAlnum(e.kurs_nr || "");
    const kDigits = (e.kurs_nr || "").replace(/\D/g, "");
    const nlc = (e.nlc_event_id || "").replace(/\D/g, "");
    if (k && fn.includes(k)) return true;
    if (kDigits.length >= 6 && fnDigits.includes(kDigits)) return true;
    if (nlc.length >= 4 && fnDigits.includes(nlc)) return true;
    return false;
  });
  return hits.length === 1 ? hits[0].id : "";
}

interface FileOutcome {
  name: string;
  ok: boolean;
  message?: string;
  summary?: ImportFileResult["file"];
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso + "T00:00:00"));
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Excel-Mehrfachimport: Dateien auswählen, jede Datei einer Schulung
 * zuordnen, Import mit einem Klick. Die Dateien werden sequentiell
 * hochgeladen (gleicher Batch), damit der Fortschritt echt ist.
 */
export default function UploadCard({
  events,
  onImported,
}: {
  events: TrainingEvent[];
  onImported: () => Promise<void> | void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  // Fortschritt INNERHALB der gerade laufenden Datei (0…1) – für einen
  // flüssigen Balken auch bei nur einer Datei.
  const [fileFraction, setFileFraction] = useState(0);
  const [outcomes, setOutcomes] = useState<FileOutcome[]>([]);
  const [batchTotals, setBatchTotals] = useState<
    ImportFileResult["batch_totals"] | null
  >(null);

  const teacherEvents = events.filter((e) => e.audience === "teacher");
  const leadershipEvents = events.filter((e) => e.audience === "leadership");

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list).filter((f) =>
      /\.(xlsx|xls|csv)$/i.test(f.name)
    );
    setSelected((prev) => {
      const known = new Set(prev.map((s) => `${s.file.name}|${s.file.size}`));
      const fresh = incoming
        .filter((f) => !known.has(`${f.name}|${f.size}`))
        .map((file) => {
          const matched = matchEventByFilename(file.name, events);
          return {
            key: `${file.name}|${file.size}|${file.lastModified}`,
            file,
            eventId: matched,
            auto: !!matched,
          };
        });
      return [...prev, ...fresh];
    });
    setOutcomes([]);
    setBatchTotals(null);
  }

  function setEventId(key: string, eventId: string) {
    setSelected((prev) =>
      prev.map((s) => (s.key === key ? { ...s, eventId, auto: false } : s))
    );
  }

  function applyToAll(eventId: string) {
    if (!eventId) return;
    setSelected((prev) => prev.map((s) => ({ ...s, eventId, auto: false })));
  }

  function removeFile(key: string) {
    setSelected((prev) => prev.filter((s) => s.key !== key));
  }

  const allAssigned =
    selected.length > 0 && selected.every((s) => s.eventId !== "");

  async function startImport() {
    if (!allAssigned || importing) return;
    setImporting(true);
    setOutcomes([]);
    setBatchTotals(null);
    setProgress({ done: 0, total: selected.length });
    setFileFraction(0);

    let batchId = "";
    const results: FileOutcome[] = [];

    for (const item of selected) {
      setFileFraction(0);
      try {
        const form = new FormData();
        form.append("file", item.file);
        form.append("eventId", item.eventId);
        if (batchId) form.append("batchId", batchId);

        const res = await fetch("/api/schulungen/import", {
          method: "POST",
          body: form,
        });

        if (!res.ok || !res.body) {
          // Validierungsfehler kommen als JSON (mit Status) zurück.
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          results.push({
            name: item.file.name,
            ok: false,
            message: body?.error ?? "Import fehlgeschlagen",
          });
        } else {
          // Erfolgsfall: NDJSON-Stream mit Live-Fortschritt lesen.
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let fileResult: ImportFileResult | null = null;
          let streamError: string | null = null;

          // Eine NDJSON-Zeile parsen (reine Funktion, kein Seiteneffekt –
          // die Zuweisungen erfolgen im Lese-Scope, damit TS die Typen
          // korrekt erkennt).
          const parseLine = (
            line: string
          ):
            | {
                type?: string;
                processed?: number;
                total?: number;
                result?: ImportFileResult;
                error?: string;
              }
            | null => {
            const trimmed = line.trim();
            if (!trimmed) return null;
            try {
              return JSON.parse(trimmed);
            } catch {
              return null;
            }
          };

          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let nl: number;
            while ((nl = buffer.indexOf("\n")) >= 0) {
              const msg = parseLine(buffer.slice(0, nl));
              buffer = buffer.slice(nl + 1);
              if (!msg) continue;
              if (msg.type === "progress" && msg.total && msg.total > 0) {
                setFileFraction(Math.min(1, (msg.processed ?? 0) / msg.total));
              } else if (msg.type === "result" && msg.result) {
                fileResult = msg.result;
              } else if (msg.type === "error") {
                streamError = msg.error ?? "Import fehlgeschlagen";
              }
            }
          }
          // Rest-Puffer (letzte Zeile ohne abschließendes \n).
          const last = parseLine(buffer);
          if (last?.type === "result" && last.result) {
            fileResult = last.result;
          } else if (last?.type === "error") {
            streamError = last.error ?? "Import fehlgeschlagen";
          }

          if (fileResult) {
            batchId = fileResult.batch_id;
            setBatchTotals(fileResult.batch_totals);
            results.push({
              name: item.file.name,
              ok: true,
              summary: fileResult.file,
            });
          } else {
            results.push({
              name: item.file.name,
              ok: false,
              message: streamError ?? "Import fehlgeschlagen",
            });
          }
        }
      } catch {
        results.push({
          name: item.file.name,
          ok: false,
          message: "Netzwerkfehler – Datei wurde nicht importiert",
        });
      }
      setOutcomes([...results]);
      setProgress((p) => ({ ...p, done: p.done + 1 }));
      setFileFraction(0);
    }

    // Nur erfolgreich importierte Dateien aus der Auswahl entfernen –
    // fehlgeschlagene bleiben inkl. Schulungs-Zuordnung für einen
    // direkten erneuten Versuch erhalten.
    const failedNames = new Set(results.filter((r) => !r.ok).map((r) => r.name));
    setSelected((prev) => prev.filter((s) => failedNames.has(s.file.name)));
    if (inputRef.current) inputRef.current.value = "";
    setImporting(false);
    await onImported();
  }

  // Gesamtfortschritt = abgeschlossene Dateien + Anteil der laufenden Datei.
  const percent =
    progress.total === 0
      ? 0
      : Math.min(
          100,
          Math.round(((progress.done + fileFraction) / progress.total) * 100)
        );

  return (
    <section
      aria-labelledby="upload-heading"
      className="rounded-2xl border border-border bg-white p-5 shadow-sm md:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="upload-heading" className="text-base font-bold text-text">
          Excel-Mehrfachimport
        </h2>
        <span className="text-xs text-text-light">
          .xlsx, .xls, .csv · mehrere Dateien möglich
        </span>
      </div>

      {/* Dropzone */}
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`mt-4 block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors has-[:focus-visible]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 ${
          dragActive
            ? "border-primary-light bg-primary-light/10"
            : "border-border bg-bg hover:border-primary-light/60 hover:bg-primary-light/5"
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
          }}
        />
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UploadCloud className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-semibold text-text">
          Excel-Dateien hier ablegen oder auswählen
        </p>
        <p className="mt-1 text-xs text-text-light">
          Heißt die Datei wie die KOS-Nummer (z. B. „KOS.2638.166.xlsx"), wird die
          Schulung automatisch zugeordnet – sonst einfach unten auswählen.
        </p>
      </label>

      {/* Datei-Liste mit Schulungs-Zuordnung */}
      {selected.length > 0 && (
        <ul className="mt-4 space-y-3" aria-label="Ausgewählte Dateien">
          {selected.map((item, index) => (
            <li
              key={item.key}
              className="rounded-xl border border-border bg-bg/60 p-3"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-text-light">
                    {formatSize(item.file.size)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label
                      className="sr-only"
                      htmlFor={`${inputId}-event-${index}`}
                    >
                      Schulung für {item.file.name}
                    </label>
                    <select
                      id={`${inputId}-event-${index}`}
                      value={item.eventId}
                      onChange={(e) => setEventId(item.key, e.target.value)}
                      className="w-full max-w-md rounded-lg border border-border bg-white px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-auto"
                    >
                      <option value="">Schulung zuordnen …</option>
                      <optgroup label="Lehrkräfte">
                        {teacherEvents.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.kurs_nr} · {formatDate(e.start_date)}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Schulleitungen">
                        {leadershipEvents.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.kurs_nr} · {formatDate(e.start_date)}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    {item.auto && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        automatisch erkannt
                      </span>
                    )}
                    {selected.length > 1 && item.eventId && (
                      <button
                        type="button"
                        onClick={() => applyToAll(item.eventId)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Für alle Dateien übernehmen
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(item.key)}
                  className="rounded-lg p-1.5 text-text-light transition-colors hover:bg-red-50 hover:text-red-700"
                  aria-label={`${item.file.name} entfernen`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Aktion */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={startImport}
          disabled={!allAssigned || importing}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {importing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
          )}
          {importing
            ? `Importiere … (${progress.done}/${progress.total})`
            : "Import für alle ausgewählten Dateien starten"}
        </button>
        <p className="text-xs text-text-light">
          Bestehende Anmeldungen werden aktualisiert (Upsert) – es entstehen
          keine Dubletten.
        </p>
      </div>

      {selected.length > 0 && !allAssigned && (
        <p className="mt-2 text-xs font-medium text-accent-text">
          Bitte ordnen Sie jeder Datei eine Schulung zu, bevor der Import
          startet.
        </p>
      )}

      {/* Fortschritt + Ergebnis */}
      <div aria-live="polite">
        {(importing || outcomes.length > 0) && (
          <div className="mt-5 space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-text">
                Import-Fortschritt
              </span>
              <span className="tabular-nums text-text-light">{percent} %</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Import-Fortschritt"
              className="h-2 w-full overflow-hidden rounded-full bg-border"
            >
              <div
                className="h-2 rounded-full bg-primary transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>

            {batchTotals && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ResultChip label="Zeilen" value={batchTotals.rows_total} tone="neutral" />
                <ResultChip label="Neu" value={batchTotals.rows_new} tone="green" />
                <ResultChip label="Updates" value={batchTotals.rows_updated} tone="blue" />
                <ResultChip label="Konflikte" value={batchTotals.rows_conflict} tone="warn" />
              </div>
            )}

            <ul className="space-y-1.5">
              {outcomes.map((o) => (
                <li key={o.name} className="text-xs">
                  <div className="flex items-center gap-2">
                    {o.ok ? (
                      <CheckCircle2
                        className="h-3.5 w-3.5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                    ) : (
                      <X
                        className="h-3.5 w-3.5 shrink-0 text-red-600"
                        aria-hidden="true"
                      />
                    )}
                    <span className="font-medium text-text">{o.name}</span>
                    {o.ok && o.summary ? (
                      <span className="text-text-light">
                        {o.summary.rows} Zeilen · {o.summary.new} neu ·{" "}
                        {o.summary.updated} aktualisiert ·{" "}
                        {o.summary.conflicts} Konflikte
                      </span>
                    ) : (
                      <span className="text-red-700">{o.message}</span>
                    )}
                  </div>
                  {o.ok &&
                    o.summary &&
                    (o.summary.skipped.length > 0 ||
                      o.summary.error_messages.length > 0) && (
                      <details className="ml-5 mt-1 text-text-light">
                        <summary className="cursor-pointer font-medium">
                          {o.summary.skipped.length +
                            o.summary.error_messages.length}{" "}
                          Zeile(n) übersprungen
                        </summary>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                          {o.summary.skipped.map((s) => (
                            <li key={`s-${s.row}`}>
                              Zeile {s.row}: {s.reason}
                            </li>
                          ))}
                          {o.summary.error_messages.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  {o.ok && o.summary && o.summary.unregistered > 0 && (
                    <details className="ml-5 mt-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-red-800">
                      <summary className="flex cursor-pointer items-center gap-1.5 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {o.summary.unregistered} Teilnehmende von nicht
                        registrierten Schulen
                      </summary>
                      <p className="mt-1 text-[11px] text-red-700">
                        Diese Schulen haben die Bestandsaufnahme nicht ausgefüllt
                        und sind eigentlich nicht teilnahmeberechtigt:
                      </p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4">
                        {o.summary.unregistered_rows.map((u, ui) => (
                          <li key={`u-${ui}`}>
                            <span className="font-medium">{u.name}</span> ·{" "}
                            {u.school}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function ResultChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "green" | "blue" | "warn";
}) {
  const tones: Record<string, string> = {
    neutral: "border-border bg-bg text-text",
    green: "border-primary-light/40 bg-primary-light/10 text-primary",
    blue: "border-primary/20 bg-primary/5 text-primary",
    warn: "border-accent/40 bg-accent/10 text-accent-text",
  };
  return (
    <div className={`rounded-lg border px-3 py-2 ${tones[tone]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide">
        {label}
      </div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}
