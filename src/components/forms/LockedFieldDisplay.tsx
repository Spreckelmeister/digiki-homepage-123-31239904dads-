"use client";

import Link from "next/link";
import { Lock, ShieldCheck, AlertCircle } from "lucide-react";

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
 * Edge case: kommt ein leerer Wert an (sollte durch die Prefill-Logik
 * vorher abgefangen werden, aber zur Sicherheit), zeigt die Karte einen
 * deutlich erkennbaren Hinweis mit Link zum Nachtragen.
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
  const isEmpty = !value || !value.trim();

  // Defensiver Fallback: wenn doch mal ein leeres Locked-Feld hier landet,
  // zeigen wir einen sichtbaren „Wert fehlt – jetzt nachtragen"-Hinweis
  // statt eines verwirrenden leeren Locks.
  if (isEmpty) {
    return (
      <div>
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-sm font-medium text-text"
        >
          {label}
        </label>
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700"
          >
            <AlertCircle className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-amber-900">
              In Ihrer Bestandsaufnahme noch nicht angegeben.
            </p>
            <p className="mt-0.5 text-[12px] text-amber-800">
              <Link
                href="/best-practice/meine-bestandsaufnahme/bearbeiten"
                className="underline underline-offset-2 hover:text-amber-900"
              >
                Jetzt in der Bestandsaufnahme nachtragen
              </Link>
            </p>
          </div>
        </div>
        <input id={htmlFor} type="hidden" value="" readOnly />
      </div>
    );
  }

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
