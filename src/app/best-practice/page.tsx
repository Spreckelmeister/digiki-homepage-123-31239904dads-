import type { Metadata } from "next";
import Link from "next/link";
import { Database, Search, BookOpen, LogIn, Clock, Sparkles } from "lucide-react";
import ContactSection from "@/components/ContactSection";
import ProtectedImage from "@/components/ProtectedImage";
import { blobImages } from "@/data/images.generated";

export const metadata: Metadata = {
  title: "Best Practice",
  description:
    "Best-Practice-Datenbank für Lehrkräfte im DigiKI-Projekt. Erfolgreiche Unterrichtsbeispiele mit digitalen Tools und KI an Grundschulen.",
  openGraph: {
    title: "Best-Practice-Datenbank – DigiKI Osnabrück",
    description:
      "Erfolgreiche Unterrichtsbeispiele mit digitalen Tools und KI an Grundschulen. Durchsuchen, lernen und eigene Erfahrungen teilen.",
  },
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
              <p className="text-lg text-white/90 max-w-3xl mb-8">
                Entdecken Sie erfolgreiche Unterrichtsbeispiele mit digitalen Tools
                und KI aus Grundschulen in Osnabrück. Lernen Sie von den Erfahrungen
                anderer Lehrkräfte.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/best-practice/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-text hover:bg-accent-hover transition-colors"
                >
                  <LogIn className="w-5 h-5" aria-hidden="true" />
                  Anmelden
                </Link>
                <div className="flex flex-col items-start gap-1">
                  <Link
                    href="/best-practice/registrieren"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-6 py-3 text-lg font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    Registrieren via Bestandsaufnahme
                  </Link>
                  <p className="text-xs text-white/90 px-1">
                    Die Registrierung erfolgt im Rahmen der Online-Bestandsaufnahme.
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <ProtectedImage
                src={blobImages["istock-team-motivation"]}
                alt="Lehrkräfte teilen Best-Practice-Erfahrungen und motivieren sich gegenseitig"
                width={500}
                height={400}
                className="rounded-2xl shadow-2xl object-cover w-full h-[350px]"
                priority
                fetchPriority="high"
                sizes="(max-width: 1024px) 0vw, 500px"
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
                <ProtectedImage
                  src="/images/icons/pexels-rdne-8499534.webp"
                  alt="Lehrerin begleitet Kinder beim Arbeiten an Laptops im Klassenzimmer"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
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
                <ProtectedImage
                  src={blobImages["istock-colleague-high-five"]}
                  alt="Kolleginnen und Kollegen freuen sich über erfolgreich erprobte Unterrichtsideen"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, 33vw"
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
                <ProtectedImage
                  src={blobImages["unsplash-team-unity"]}
                  alt="Wachsende Gemeinschaft von Lehrkräften, die Best-Practice-Beispiele teilen"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
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

      {/* Bald verfügbar */}
      <section className="bg-bg py-16 md:py-24" aria-labelledby="coming-soon-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2
              id="coming-soon-heading"
              className="text-2xl md:text-3xl font-bold text-primary mb-4"
            >
              Datenbank durchsuchen
            </h2>
            <p className="text-lg text-text-light max-w-2xl mx-auto">
              Hier finden Sie bald erprobte Unterrichtsbeispiele, die Sie nach
              Fach, Klassenstufe und Kategorie filtern können.
            </p>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-[#00cabe] p-[1px]">
            <div className="rounded-2xl bg-gradient-to-br from-primary/[0.03] via-[#00cabe]/[0.06] to-primary/[0.03] backdrop-blur-sm p-8 md:p-12">
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
                <div className="absolute top-6 left-8 w-20 h-20 rounded-full border-2 border-primary" />
                <div className="absolute top-12 right-12 w-32 h-32 rounded-full border-2 border-[#00cabe]" />
                <div className="absolute bottom-8 left-1/4 w-16 h-16 rounded-full border-2 border-primary" />
                <div className="absolute bottom-6 right-1/3 w-24 h-24 rounded-full border-2 border-[#00cabe]" />
              </div>

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-6 flex items-center justify-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#00cabe] shadow-lg">
                    <Clock className="h-7 w-7 text-white" aria-hidden="true" />
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#00cabe] to-primary shadow-lg">
                    <Sparkles className="h-7 w-7 text-white" aria-hidden="true" />
                  </div>
                </div>

                <span className="mb-4 inline-block rounded-full bg-gradient-to-r from-primary to-[#00cabe] px-5 py-1.5 text-sm font-semibold text-white tracking-wide">
                  Bald verfügbar
                </span>

                <h3 className="text-xl md:text-2xl font-bold text-primary mb-3">
                  Die Sammlung wird gerade aufgebaut
                </h3>
                <p className="text-text-light max-w-xl text-base md:text-lg leading-relaxed mb-6">
                  Die ersten Best-Practice-Beispiele werden ab Herbst 2026 hier
                  veröffentlicht. Lehrkräfte aus dem DigiKI-Projekt dokumentieren
                  derzeit ihre Unterrichtserfahrungen mit digitalen Tools und KI.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="flex items-center gap-2 rounded-lg bg-white/80 border border-primary/10 px-4 py-2.5 text-sm text-primary font-medium shadow-sm">
                    <Database className="h-4 w-4 text-[#00cabe]" aria-hidden="true" />
                    Praxisbeispiele aus 50+ Grundschulen
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/80 border border-primary/10 px-4 py-2.5 text-sm text-primary font-medium shadow-sm">
                    <Search className="h-4 w-4 text-[#00cabe]" aria-hidden="true" />
                    Filterbar nach Fach &amp; Klassenstufe
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary mb-4">
            Jetzt Zugang erhalten
          </h2>
          <p className="text-lg text-text-light max-w-2xl mx-auto mb-4">
            Die Registrierung für die Best-Practice-Datenbank erfolgt im Rahmen
            der Online-Bestandsaufnahme. So stellen wir sicher, dass die
            Bestandsaufnahme von der passenden Person an Ihrer Schule ausgefüllt
            wird – und Sie direkt danach Zugang erhalten.
          </p>
          <Link
            href="/best-practice/registrieren"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-4 text-lg font-semibold text-text hover:bg-accent-hover transition-colors"
          >
            Registrieren via Bestandsaufnahme
          </Link>
        </div>
      </section>

      <ContactSection />
    </>
  );
}
