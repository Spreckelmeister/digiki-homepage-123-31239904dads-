import Link from "next/link";
import { Info } from "lucide-react";

/**
 * Hinweis für Konten ohne Bestandsaufnahme (nur Schulungsmaterial,
 * Migration 038): Anträge und Best-Practice-Einreichungen stehen nur
 * Schulen im Förderprogramm offen.
 */
export default function ProgrammOnlyNotice({ what }: { what: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-bold text-text mb-3">
        <Info className="w-5 h-5 text-primary" aria-hidden="true" />
        Nur für Schulen im Förderprogramm
      </h2>
      <p className="text-text-light leading-relaxed mb-6">
        {what} Ihr Konto wurde nur für das Schulungsmaterial angelegt – eine
        Bestandsaufnahme liegt für Ihre Schule nicht vor. Wenn Ihre Schule am
        Förderprogramm teilnehmen möchte, füllen Sie bitte die Bestandsaufnahme
        aus. Sie wird Ihrem bestehenden Konto zugeordnet.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/bestandsaufnahme"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Bestandsaufnahme ausfüllen
        </Link>
        <Link
          href="/schulungsmaterial"
          className="inline-flex items-center justify-center rounded-lg border border-primary px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
        >
          Zum Schulungsmaterial
        </Link>
      </div>
    </div>
  );
}
