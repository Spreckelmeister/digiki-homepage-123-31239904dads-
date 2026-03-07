import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, Info } from "lucide-react";
import BestandsaufnahmeForm from "@/components/forms/BestandsaufnahmeForm";

export const metadata: Metadata = {
  title: "Bestandsaufnahme Digitalisierung & KI – DigiKI",
  description:
    "Online-Bestandsaufnahme zur Erfassung des Ist-Zustands, der Bedarfe und Best Practices der Digitalisierung an Ihrer Grundschule. Ca. 15 Minuten.",
  robots: { index: false },
};

export default function BestandsaufnahmePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/fuer-schulen"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Zurück zu Für Schulen
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Bestandsaufnahme Digitalisierung & KI
          </h1>
          <p className="text-lg text-white/70 mt-2 max-w-2xl">
            Online-Fragebogen zur Erfassung des Ist-Zustands und der Bedarfe
            an Ihrer Grundschule – damit wir das Angebot optimal auf Ihre
            Schule zuschneiden können.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/60">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4" aria-hidden="true" />
              Ca. 15 Minuten
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Info className="w-4 h-4" aria-hidden="true" />
              39 Fragen in 8 Abschnitten
            </span>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <BestandsaufnahmeForm />
        </div>
      </section>
    </>
  );
}
