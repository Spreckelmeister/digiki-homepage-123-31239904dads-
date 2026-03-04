import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Database, Search, BookOpen, LogIn } from "lucide-react";

export const metadata: Metadata = {
  title: "Best Practice",
  description:
    "Best-Practice-Datenbank für Lehrkräfte im DigiKI-Projekt. Erfolgreiche Unterrichtsbeispiele mit digitalen Tools und KI an Grundschulen.",
};

export default function BestPracticePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-16 md:py-20 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                Best-Practice-Datenbank
              </h1>
              <p className="text-lg text-blue-200 max-w-3xl mb-8">
                Entdecken Sie erfolgreiche Unterrichtsbeispiele mit digitalen Tools
                und KI aus Grundschulen in Osnabrück. Lernen Sie von den Erfahrungen
                anderer Lehrkräfte.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/best-practice/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-white hover:bg-accent-hover transition-colors"
                >
                  <LogIn className="w-5 h-5" aria-hidden="true" />
                  Anmelden
                </Link>
                <Link
                  href="/best-practice/registrieren"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-6 py-3 text-lg font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  Kostenlos registrieren
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <Image
                src="/images/icons/istockphoto-938509320-1024x1024.jpg"
                alt="Kind entdeckt digitale Technologie"
                width={500}
                height={400}
                className="rounded-2xl shadow-2xl object-cover w-full h-[350px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24" aria-labelledby="features-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              id="features-heading"
              className="text-2xl md:text-3xl font-bold text-primary mb-4"
            >
              Voneinander lernen
            </h2>
            <p className="text-lg text-text-light max-w-2xl mx-auto">
              Die Best-Practice-Datenbank sammelt erprobte Unterrichtsbeispiele
              aus dem DigiKI-Projekt.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-sm border border-border text-center overflow-hidden">
              <div className="relative h-40 w-full">
                <Image
                  src="/images/icons/istockphoto-860900294-1024x1024.jpg"
                  alt="Lehrerin erklärt Kindern digitale Inhalte am Laptop"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Search className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-primary mb-2">
                  Beispiele durchsuchen
                </h3>
                <p className="text-sm text-text-light">
                  Filtern Sie nach Fach, Klassenstufe oder Kategorie und finden
                  Sie passende Unterrichtsideen.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-border text-center overflow-hidden">
              <div className="relative h-40 w-full">
                <Image
                  src="/images/icons/istockphoto-1360857826-1024x1024.jpg"
                  alt="Kinder arbeiten mit Tablets und Robotik-Material"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Database className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-primary mb-2">
                  Praxiserprobte Inhalte
                </h3>
                <p className="text-sm text-text-light">
                  Alle Beiträge stammen aus dem DigiKI-Projekt und wurden im
                  Unterricht erprobt und dokumentiert.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-border text-center overflow-hidden">
              <div className="relative h-40 w-full">
                <Image
                  src="/images/icons/istockphoto-938509320-1024x1024.jpg"
                  alt="Kind staunt über digitale Technologie"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-primary mb-2">
                  Wachsende Sammlung
                </h3>
                <p className="text-sm text-text-light">
                  Die Datenbank wächst mit dem Projekt. Neue Beispiele kommen
                  laufend hinzu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-bg py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary mb-4">
            Jetzt Zugang erhalten
          </h2>
          <p className="text-lg text-text-light max-w-2xl mx-auto mb-8">
            Registrieren Sie sich kostenlos, um auf die Best-Practice-Datenbank
            zuzugreifen. Sie benötigen lediglich eine E-Mail-Adresse.
          </p>
          <Link
            href="/best-practice/registrieren"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-4 text-lg font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            Kostenlos registrieren
          </Link>
        </div>
      </section>
    </>
  );
}
