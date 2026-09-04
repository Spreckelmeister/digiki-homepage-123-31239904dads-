"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, X } from "lucide-react";
import type { NlcSyncSummary } from "@/lib/schulungen/types";

/**
 * Admin-Knopf „Mit NLC abgleichen": stößt den Sofort-Abgleich der
 * Anmeldeschlüsse an (POST /api/schulungen/nlc-sync) und zeigt das
 * Ergebnis als kleines Panel unter dem Knopf. Zusätzlich läuft der
 * Abgleich täglich automatisch per Vercel-Cron.
 */

function formatDeadline(iso: string | null): string {
  if (!iso) return "leer";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso + "T00:00:00"));
}

export default function NlcSyncButton({
  onSynced,
  label = "Mit NLC abgleichen",
}: {
  onSynced?: () => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<NlcSyncSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/schulungen/nlc-sync", { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "Der NLC-Abgleich ist fehlgeschlagen.");
      }
      setResult(body as NlcSyncSummary);
      onSynced?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Der NLC-Abgleich ist fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }

  const showPanel = result !== null || error !== null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleSync}
        disabled={busy}
        title="Anmeldeschlüsse jetzt aus dem Niedersächsischen LernCenter (nlc.info) auslesen"
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-primary shadow-sm transition-colors hover:bg-primary/5 disabled:opacity-60 md:px-3 md:text-xs"
      >
        {busy ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
        )}
        {busy ? "Gleiche ab …" : label}
      </button>

      {showPanel && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[88vw] rounded-xl border border-border bg-white p-4 text-left shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-bold text-text">
              {error ? (
                <AlertTriangle
                  className="h-4 w-4 shrink-0 text-red-600"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-green-600"
                  aria-hidden="true"
                />
              )}
              NLC-Abgleich
            </p>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setError(null);
              }}
              aria-label="Ergebnis schließen"
              className="rounded-md p-1 text-text-light transition-colors hover:bg-bg hover:text-text"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {error ? (
            <p role="alert" className="mt-2 text-xs text-red-800">
              {error}
            </p>
          ) : result ? (
            <div role="status" className="mt-2 space-y-2 text-xs text-text">
              <p>
                <strong>{result.updated.length}</strong>{" "}
                {result.updated.length === 1 ? "Frist" : "Fristen"} aktualisiert ·{" "}
                {result.unchanged} unverändert · {result.skipped.length} ohne
                NLC-Link · {result.failed.length}{" "}
                {result.failed.length === 1 ? "Fehler" : "Fehler"}
              </p>
              {result.updated.length > 0 && (
                <ul className="space-y-0.5 rounded-lg bg-green-50 px-2.5 py-2 text-[11px] text-green-900">
                  {result.updated.slice(0, 8).map((u) => (
                    <li key={u.kurs_nr} className="font-mono">
                      {u.kurs_nr}: {formatDeadline(u.from)} →{" "}
                      <strong>{formatDeadline(u.to)}</strong>
                    </li>
                  ))}
                  {result.updated.length > 8 && (
                    <li>… und {result.updated.length - 8} weitere</li>
                  )}
                </ul>
              )}
              {result.failed.length > 0 && (
                <ul className="space-y-0.5 rounded-lg bg-red-50 px-2.5 py-2 text-[11px] text-red-800">
                  {result.failed.slice(0, 4).map((f) => (
                    <li key={f.kurs_nr}>
                      <span className="font-mono">{f.kurs_nr}</span>: {f.error}
                    </li>
                  ))}
                  {result.failed.length > 4 && (
                    <li>… und {result.failed.length - 4} weitere</li>
                  )}
                </ul>
              )}
              {(result.autoArchived?.length ?? 0) > 0 && (
                <p className="text-[11px] text-text-light">
                  {result.autoArchived!.length}{" "}
                  {result.autoArchived!.length === 1 ? "Termin" : "Termine"}{" "}
                  automatisch ins Archiv verschoben (älter als 10 Tage).
                </p>
              )}
              {result.skipped.length > 0 && (
                <p className="text-[11px] text-text-light">
                  Ohne NLC-Link:{" "}
                  <span className="font-mono">
                    {result.skipped.slice(0, 5).join(", ")}
                  </span>
                  {result.skipped.length > 5 &&
                    ` … +${result.skipped.length - 5}`}{" "}
                  – Link im Termin hinterlegen, dann klappt der Abgleich.
                </p>
              )}
              <p className="text-[11px] text-text-light">
                Läuft zusätzlich einmal täglich automatisch.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
