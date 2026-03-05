import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ToolLicenseForm from "@/components/forms/ToolLicenseForm";

export const metadata: Metadata = {
  title: "Antrag: Tool-Lizenzen - DigiKI",
  description:
    "Beantragen Sie kostenlose Tool-Lizenzen für Ihre Grundschule im Rahmen des DigiKI-Projekts.",
};

export default function AntragToolLizenzenPage() {
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
            Antrag: Kostenlose Tool-Lizenzen
          </h1>
          <p className="text-lg text-white/70 mt-2">
            Beantragen Sie stiftungsfinanzierte Lizenzen für DSGVO-konforme
            Lern-Tools.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <ToolLicenseForm />
        </div>
      </section>
    </>
  );
}
