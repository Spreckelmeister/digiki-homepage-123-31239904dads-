"use client";

import Link from "next/link";
import { AlertCircle, ArrowUpRight, Lock, ShieldCheck } from "lucide-react";

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
 * Zeigt ein Eingabefeld als „gesperrt" an – als kleine Info-Karte mit
 * klarer visueller Hierarchie:
 *   Zeile 1 (Meta):   kleines Lock + Quell-Badge
 *   Zeile 2 (Wert):   groß, semibold, scannbarer Hauptinhalt
 *   Zeile 3 (Aktion): dezenter „in BSA/Konto bearbeiten"-Link
 *
 * Damit ist der WERT der Star – nicht das Lock-Icon oder das Badge.
 */
export default function LockedFieldDisplay({
  htmlFor,
  label,
  value,
  source,
  hint,
  mono,
}: LockedFieldDisplayProps) {
  const isEmpty = !value || !value.trim();
  const sourceLabel =
    source === "konto" ? "Aus Konto" : "Aus Bestandsaufnahme";
  // Mappt die snake_case-IDs der Formulare auf die camelCase-Anchor-Namen
  // im Bestandsaufnahme-Formular, damit der "Bearbeiten"-Link direkt
  // zum richtigen Eingabefeld scrollen kann.
  const bsaAnchorMap: Record<string, string> = {
    school_name: "schoolName",
    principal_name: "principalName",
    contact_person: "contactPerson",
    phone: "contactPhone",
    teacher_count: "teacherCount",
  };
  const bsaAnchor = bsaAnchorMap[htmlFor];
  const editHref =
    source === "konto"
      ? "/best-practice/konto"
      : bsaAnchor
        ? `/best-practice/meine-bestandsaufnahme/bearbeiten?focus=${bsaAnchor}`
        : "/best-practice/meine-bestandsaufnahme/bearbeiten";
  const editLabel =
    source === "konto"
      ? "in Konto-Einstellungen bearbeiten"
      : "in Bestandsaufnahme bearbeiten";

  // ── Edge-Case: kein Wert vorhanden ──────────────────────────────
  if (isEmpty) {
    return (
      <div>
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-sm font-medium text-text"
        >
          {label}
        </label>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700"
            >
              <AlertCircle className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">
                Noch nicht in Bestandsaufnahme angegeben
              </p>
              <p className="mt-0.5 text-[13px] text-amber-800">
                Sie können den Wert in einem Klick nachtragen.
              </p>
              <Link
                href={editHref}
                className="mt-3 inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
              >
                Jetzt in Bestandsaufnahme nachtragen
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
        <input id={htmlFor} type="hidden" value="" readOnly />
      </div>
    );
  }

  // ── Normaler Fall: Wert vorhanden ───────────────────────────────
  const sourceMeta =
    source === "konto"
      ? {
          dotClass: "bg-emerald-500",
          textClass: "text-emerald-700",
          tooltip: "Aus angemeldetem Konto übernommen",
        }
      : {
          dotClass: "bg-primary",
          textClass: "text-primary",
          tooltip: "Aus Ihrer Bestandsaufnahme übernommen",
        };

  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-text"
      >
        {label}
      </label>
      <div className="group relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-bg to-primary-light/[0.04] shadow-sm transition-all hover:border-primary/25 hover:shadow-md">
        {/* Zeile 1: Quell-Indikator + Lock-Icon */}
        <div className="flex items-center justify-between px-4 pt-3">
          <span
            title={sourceMeta.tooltip}
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${sourceMeta.textClass}`}
          >
            <span
              aria-hidden="true"
              className={`inline-block h-1.5 w-1.5 rounded-full ${sourceMeta.dotClass}`}
            />
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            {sourceLabel}
          </span>
          <span
            aria-hidden="true"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/8 text-primary/70"
          >
            <Lock className="h-3 w-3" />
          </span>
        </div>

        {/* Zeile 2: Der WERT – prominent, groß, klar */}
        <div className="px-4 pb-3 pt-1.5">
          <p
            className={`break-words text-lg font-semibold leading-snug text-text ${
              mono ? "font-mono text-base" : ""
            }`}
          >
            {value}
          </p>
        </div>

        {/* Zeile 3: dezenter Edit-Link */}
        <Link
          href={editHref}
          className="flex items-center justify-end gap-1 border-t border-primary/10 bg-white/60 px-4 py-2 text-[11px] font-medium text-text-light transition-colors hover:bg-white hover:text-primary"
        >
          <span>{editLabel}</span>
          <ArrowUpRight
            className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
      <input id={htmlFor} type="hidden" value={value} readOnly />
      {hint && <p className="mt-1.5 text-xs text-text-light">{hint}</p>}
    </div>
  );
}
