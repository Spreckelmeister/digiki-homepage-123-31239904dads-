"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Vor dem Öffnen einer Unterlage: Regeln anzeigen und bestätigen lassen.
 * Die Unterlage selbst (children) wird erst danach geladen. Die Bestätigung
 * gilt, bis der Browser geschlossen wird (je Konto).
 */
export default function MaterialGate({
  accountKey,
  title,
  rules,
  children,
}: {
  /** Unterscheidet Konten am selben Gerät. */
  accountKey: string;
  title: string;
  /** Die Regeln (MaterialRules) – als fertiger Inhalt vom Server. */
  rules: ReactNode;
  children: ReactNode;
}) {
  const storageKey = `digiki-material-regeln-v1:${accountKey}`;
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === "1") setAccepted(true);
    } catch {
      // Ohne Speicher wird bei jedem Öffnen gefragt.
    }
  }, [storageKey]);

  if (accepted) return <>{children}</>;

  return (
    <section className="bg-bg py-10 md:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/schulungsmaterial"
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-light hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Zurück zum Schulungsmaterial
        </Link>
        <h1 className="mb-6 text-2xl font-bold text-text md:text-3xl">{title}</h1>
        {rules}
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem(storageKey, "1");
            } catch {
              // siehe oben
            }
            setAccepted(true);
          }}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-base font-semibold text-white hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors sm:w-auto"
        >
          Einverstanden – Unterlage öffnen
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="mt-3 text-sm text-text-light">
          Mit dem Öffnen bestätigen Sie, die Regeln gelesen zu haben und einzuhalten.
        </p>
      </div>
    </section>
  );
}
