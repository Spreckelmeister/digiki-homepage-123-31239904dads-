"use client";

import { Lock, ShieldCheck } from "lucide-react";

interface LockedFieldDisplayProps {
  htmlFor: string;
  label: string;
  value: string;
  source: "konto" | "bestandsaufnahme";
  hint?: React.ReactNode;
  /** Optional: monospaced Anzeige (z.B. für E-Mail-Adressen). */
  mono?: boolean;
}

/**
 * Zeigt ein Eingabefeld als „gesperrt" an – statt eines bearbeitbaren
 * Inputs erscheint der Wert in einer eigenen Karte mit Lock-Icon und
 * einem Badge, das die Quelle benennt („Aus Konto" / „Aus Bestandsaufnahme").
 *
 * Ein verstecktes <input> sorgt dafür, dass der Wert bei nativer
 * Form-Submission weiterhin mitgesendet wird (falls jemand das nutzt).
 */
export default function LockedFieldDisplay({
  htmlFor,
  label,
  value,
  source,
  hint,
  mono,
}: LockedFieldDisplayProps) {
  const sourceLabel =
    source === "konto" ? "Aus Konto" : "Aus Bestandsaufnahme";
  const badgeClass =
    source === "konto"
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-primary-light/30 bg-primary-light/10 text-primary";

  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-text"
      >
        {label}
      </label>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-bg px-4 py-3">
        <span
          aria-hidden="true"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
        >
          <Lock className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm font-medium text-text ${
              mono ? "font-mono" : ""
            }`}
          >
            {value}
          </p>
        </div>
        <span
          title={
            source === "konto"
              ? "Aus angemeldetem Konto übernommen"
              : "Aus Ihrer Bestandsaufnahme übernommen"
          }
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
        >
          <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" />
          {sourceLabel}
        </span>
      </div>
      <input id={htmlFor} type="hidden" value={value} readOnly />
      {hint && <p className="mt-1.5 text-xs text-text-light">{hint}</p>}
    </div>
  );
}
