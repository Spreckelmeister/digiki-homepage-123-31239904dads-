import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BestPracticeVorlageForm from "@/components/forms/BestPracticeVorlageForm";

export const metadata: Metadata = {
  title: "Best Practice einreichen - DigiKI",
  description:
    "Dokumentieren Sie Ihre Unterrichtserfahrungen mit digitalen Tools und KI und teilen Sie sie mit anderen Grundschulen.",
};

export default function BestPracticeEinreichenPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/best-practice"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Zurück zu Best Practice
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Best Practice einreichen
          </h1>
          <p className="text-lg text-white/70 mt-2">
            Dokumentieren Sie Ihre Unterrichtserfahrungen mit digitalen Tools
            und KI.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <BestPracticeVorlageForm />
        </div>
      </section>
    </>
  );
}
