import type { Metadata } from "next";
import Link from "next/link";
import { Database, Search, BookOpen, LogIn, Clock } from "lucide-react";
import ContactSection from "@/components/ContactSection";
import ProtectedImage from "@/components/ProtectedImage";
import { En } from "@/components/Lang";
import { blobImages } from "@/data/images.generated";

export const metadata: Metadata = {
  title: "Best Practice",
  description:
    "Best-Practice-Datenbank für Lehrkräfte im DigiKI-Projekt. Erfolgreiche Unterrichtsbeispiele mit digitalen Tools und KI an Grundschulen.",
  alternates: { canonical: "/best-practice" },
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
                <En>Best-Practice</En>-Datenbank
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
              Die <En>Best-Practice</En>-Datenbank sammelt erprobte Unterrichtsbeispiele
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
                  quality={65}
                  sizes="(max-width: 768px) 50vw, 33vw"
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
                  quality={65}
                  sizes="(max-width: 768px) 50vw, 33vw"
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
                  quality={65}
                  sizes="(max-width: 768px) 50vw, 33vw"
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

          <div className="relative overflow-hidden rounded-2xl bg-primary shadow-xl">
            {/* Weiche Farb-Glows – setzen Tiefe, ohne vom Text abzulenken */}
            <div
              className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-primary-light/25 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative z-10 px-6 py-12 md:px-12 md:py-16 max-w-3xl mx-auto text-center">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-text">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Ab Herbst 2026
              </span>

              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                Die Sammlung wird gerade aufgebaut
              </h3>
              <p className="text-white/90 text-base md:text-lg leading-relaxed mb-8">
                Die ersten Best-Practice-Beispiele werden ab Herbst 2026 hier
                veröffentlicht. Lehrkräfte aus dem DigiKI-Projekt dokumentieren
                derzeit ihre Unterrichtserfahrungen mit digitalen Tools und KI.
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white">
                  <Database className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
                  Praxisbeispiele aus 50+ Grundschulen
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white">
                  <Search className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
                  Filterbar nach Fach &amp; Klassenstufe
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
