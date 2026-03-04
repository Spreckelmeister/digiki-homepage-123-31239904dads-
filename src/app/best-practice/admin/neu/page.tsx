import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BestPracticeForm from "@/components/best-practice/BestPracticeForm";

export const metadata: Metadata = {
  title: "Neuer Beitrag - Best Practice Admin",
};

export default function NeuPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/best-practice/admin"
            className="inline-flex items-center gap-1 text-sm text-blue-200 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Zurück zum Admin-Bereich
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Neuer Best-Practice-Beitrag
          </h1>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <BestPracticeForm />
        </div>
      </section>
    </>
  );
}
