"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

const CONFIRM_WORD = "LÖSCHEN";

/**
 * Admin-only: Setzt alle Teilnahme-/Importdaten zurück. Bewusst mit
 * mehrstufiger Sicherung (Aufklappen + Tippbestätigung), damit das
 * nicht versehentlich passiert. Die Schulungstermine bleiben erhalten.
 */
export default function DangerZone({
  onReset,
}: {
  onReset: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  async function handleReset() {
    if (confirm !== CONFIRM_WORD || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/schulungen/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: CONFIRM_WORD }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Zurücksetzen fehlgeschlagen");
      setResult({
        tone: "ok",
        text: "Alle Teilnahme- und Importdaten wurden gelöscht. Die Schulungstermine sind erhalten geblieben.",
      });
      setConfirm("");
      setOpen(false);
      await onReset();
    } catch (err) {
      setResult({
        tone: "error",
        text: err instanceof Error ? err.message : "Zurücksetzen fehlgeschlagen",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="danger-heading"
      className="rounded-2xl border border-red-200 bg-red-50/40 p-5 shadow-sm md:p-6"
    >
      <h2
        id="danger-heading"
        className="flex items-center gap-2 text-base font-bold text-red-800"
      >
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        Daten zurücksetzen
      </h2>
      <p className="mt-1 text-xs text-red-900/80">
        Löscht <strong>alle Anmeldungen, Personen, Schulen, Import-Batches und
        Konflikte</strong> – also wer an welcher Schulung teilnimmt. Die
        Schulungstermine selbst bleiben erhalten. Dieser Schritt kann nicht
        rückgängig gemacht werden.
      </p>

      <div aria-live="polite">
        {result && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              result.tone === "ok"
                ? "bg-primary/5 text-primary"
                : "border border-red-300 bg-white text-red-800"
            }`}
          >
            {result.text}
          </p>
        )}
      </div>

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setResult(null);
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Alle Teilnahmedaten löschen …
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-red-300 bg-white p-4">
          <label
            htmlFor="reset-confirm"
            className="block text-sm font-medium text-red-900"
          >
            Tippen Sie zur Bestätigung{" "}
            <span className="font-mono font-bold">{CONFIRM_WORD}</span>:
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="reset-confirm"
              type="text"
              autoComplete="off"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="flex-1 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-text focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <button
              type="button"
              disabled={confirm !== CONFIRM_WORD || busy}
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              Endgültig löschen
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setConfirm("");
              }}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-text-light transition-colors hover:bg-bg disabled:opacity-50"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
