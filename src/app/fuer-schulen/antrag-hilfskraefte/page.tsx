import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StudentAssistantForm from "@/components/forms/StudentAssistantForm";

export const metadata: Metadata = {
  title: "Antrag: Studentische Hilfskräfte - DigiKI",
  description:
    "Beantragen Sie studentische Unterstützung bei der Einrichtung digitaler Tools an Ihrer Grundschule.",
};

export default function AntragHilfskraeftePage() {
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
            Antrag: Studentische Hilfskräfte
          </h1>
          <p className="text-lg text-white/70 mt-2">
            Beantragen Sie kostenlose studentische Unterstützung bei der
            Einrichtung digitaler Tools.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <StudentAssistantForm />
        </div>
      </section>
    </>
  );
}
