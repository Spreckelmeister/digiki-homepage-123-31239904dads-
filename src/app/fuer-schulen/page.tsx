import type { Metadata } from "next";
import Link from "next/link";
import { Check, PenLine, ArrowRight, Laptop, Users2, BookOpen, Clock } from "lucide-react";
import Accordion from "@/components/Accordion";
import StatCounter from "@/components/StatCounter";
import { FAQPageJsonLd } from "@/components/JsonLd";
import ContactSection from "@/components/ContactSection";
import ProtectedImage from "@/components/ProtectedImage";
import { projectData, participationOptions, faqItems } from "@/data/project";
import { blobImages } from "@/data/images.generated";

export const metadata: Metadata = {
  title: "Kostenlose Fortbildung Digitalisierung & KI für Grundschulen",
  description:
    "Machen Sie Ihre Grundschule fit für die digitale Zukunft. Kostenlose Schulungen, Tool-Lizenzen und Begleitung für alle Grundschulen in Stadt und Landkreis Osnabrück.",
  openGraph: {
    title: "Kostenlose Fortbildung Digitalisierung & KI für Grundschulen | DigiKI Osnabrück",
    description:
      "Machen Sie Ihre Grundschule fit für die digitale Zukunft. Kostenlose Schulungen, Tool-Lizenzen und Begleitung.",
  },
};

export default function FuerSchulenPage() {
  const initialFaqCount = 4;

  return (
    <>
      <FAQPageJsonLd items={faqItems} />
      {/* Hero */}
      <section className="bg-primary py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                Machen Sie Ihre Grundschule fit für die digitale Zukunft
              </h1>
              <p className="text-lg text-white/70 max-w-3xl mb-8">
                Kostenlose Schulungen, Tool-Lizenzen und individuelle Begleitung –
                für alle Grundschulen in Stadt und Landkreis Osnabrück.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href={projectData.surveyUrl}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-text hover:bg-accent-hover transition-colors"
                >
                  Jetzt Bestandsaufnahme starten
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  href="#teilnahme"
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-white/30 bg-white/10 px-6 py-3 font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  Teilnahmeoptionen ansehen
                </Link>
              </div>
            </div>
            <div className="hidden lg:block" style={{ aspectRatio: "500 / 300" }}>
              <ProtectedImage
                src={blobImages["istock-teacher-supports-students"]}
                alt="Lehrkraft unterstützt Schüler an Computern im Unterricht"
                width={500}
                height={300}
                className="rounded-2xl shadow-2xl object-cover w-full h-full"
                priority
                fetchPriority="high"
                sizes="(max-width: 1024px) 0vw, 500px"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Bestandsaufnahme – prominenter Banner direkt unter Hero */}
      <section className="bg-accent/10 border-y border-accent/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-lg font-semibold text-primary">
                Erster Schritt: Online-Bestandsaufnahme ausfüllen
              </p>
              <p className="text-sm text-text-light">
                Kurzer Fragebogen (ca. 10 Min.) – damit wir die Angebote auf Ihre Schule zuschneiden können.
              </p>
            </div>
            <Link
              href={projectData.surveyUrl}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-text hover:bg-accent-hover transition-colors shrink-0"
            >
              Zur Bestandsaufnahme
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Teilnahmemöglichkeiten */}
      <section
        id="teilnahme"
        className="py-16 md:py-24"
        aria-labelledby="participation-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              id="participation-heading"
              className="text-2xl md:text-3xl font-bold text-primary mb-4"
            >
              Teilnahmemöglichkeiten
            </h2>
            <p className="text-lg text-text-light max-w-2xl mx-auto">
              Wählen Sie das Format, das am besten zu Ihrer Schule passt.
              Alle Angebote sind kostenlos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {participationOptions.map((option) => (
              <div
                key={option.title}
                className={`relative bg-white rounded-xl p-6 shadow-sm border-2 transition-shadow hover:shadow-md ${
                  option.featured
                    ? "border-accent"
                    : "border-border"
                }`}
              >
                {option.featured && (
                  <div className="absolute -top-3 left-6 bg-accent text-text text-xs font-bold px-3 py-1 rounded-full">
                    Empfohlen
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-primary">
                    {option.title}
                  </h3>
                  <p className="text-sm text-accent-strong font-medium">
                    {option.subtitle}
                  </p>
                </div>
                <p className="text-sm text-text-light mb-6">
                  {option.description}
                </p>
                <ul className="space-y-2 mb-6">
                  {option.highlights.map((highlight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check
                        className="w-4 h-4 text-accent-strong mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={option.ctaHref ?? "#kontakt"}
                  className={`block text-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    option.disabled
                      ? "opacity-50 cursor-not-allowed pointer-events-none"
                      : option.featured
                      ? "bg-accent text-text hover:bg-accent-hover"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  {option.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-white py-12 border-y border-border" aria-label="Projekt in Zahlen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCounter value="50+" label="Grundschulen" description="eingeladen" />
            <StatCounter value="300+" label="Lehrkräfte" description="werden geschult" />
            <StatCounter value="100%" label="Kostenlos" description="für Schulen" />
            <StatCounter value="18" label="Monate" description="Begleitung" />
          </div>
        </div>
      </section>

      {/* Motivations-Bild: Studentische Unterstützung */}
      <section className="py-16 md:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="rounded-2xl overflow-hidden shadow-lg" style={{ aspectRatio: "600 / 400" }}>
              <ProtectedImage
                src={blobImages["istock-teacher-student-highfive"]}
                alt="Lehrerin und Schülerin feiern gemeinsam einen Lernerfolg"
                width={600}
                height={400}
                className="w-full h-full object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-primary mb-4">
                Sie sind nicht allein
              </h2>
              <p className="text-lg text-text-light leading-relaxed mb-4">
                Studentische Hilfskräfte unterstützen Sie direkt an Ihrer Schule – bei
                der Einrichtung von Tools, bei technischen Fragen und bei der
                Materialerstellung.
              </p>
              <p className="text-lg text-text-light leading-relaxed">
                So können Sie sich auf das konzentrieren, was Sie am besten können:
                Ihre Schülerinnen und Schüler begleiten und fördern.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* So funktioniert's */}
      <section className="py-16 md:py-24" aria-labelledby="process-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            id="process-heading"
            className="text-2xl md:text-3xl font-bold text-primary text-center mb-12"
          >
            So funktioniert die Teilnahme
          </h2>
          <div className="max-w-4xl mx-auto">
            {/* Mobile: vertikale Liste, Desktop: 2-Spalten-Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {[
                {
                  step: 1,
                  title: "Online-Bestandsaufnahme ausfüllen",
                  description:
                    "Füllen Sie den kurzen Fragebogen aus, damit wir die Angebote auf die Bedarfe Ihrer Schule zuschneiden können.",
                },
                {
                  step: 2,
                  title: "Schulungsformat wählen",
                  description:
                    "Entscheiden Sie sich für die Intensivschulung, das Early-Adopter-Programm oder einzelne KOS-Fortbildungen.",
                },
                {
                  step: 3,
                  title: "An Schulung teilnehmen",
                  description:
                    "Nehmen Sie an der gewählten Schulung teil und lernen Sie praxisnah den Einsatz digitaler Tools und KI im Unterricht.",
                },
                {
                  step: 4,
                  title: "Tool-Lizenzen beantragen",
                  description:
                    "Beantragen Sie stiftungsfinanzierte Lizenzen für adaptive Lernplattformen für Ihre Schule.",
                },
                {
                  step: 5,
                  title: "Im Unterricht erproben",
                  description:
                    "Setzen Sie die Werkzeuge im eigenen Unterricht ein – mit optionaler studentischer Unterstützung.",
                },
                {
                  step: 6,
                  title: "Erfahrungen teilen",
                  description:
                    "Dokumentieren Sie Ihre Erfahrungen als Best Practice und teilen Sie sie mit anderen Schulen.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex items-start gap-4 bg-white rounded-xl p-5 shadow-sm border border-border"
                >
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-text font-bold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-text-light">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Online-Formulare */}
      <section
        id="downloads"
        className="py-16 md:py-24 bg-white"
        aria-labelledby="downloads-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              id="downloads-heading"
              className="text-2xl md:text-3xl font-bold text-primary mb-4"
            >
              Online beantragen
            </h2>
            <p className="text-lg text-text-light max-w-2xl mx-auto">
              Alle Anträge und Formulare direkt online ausfüllen – schnell und unkompliziert.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/fuer-schulen/antrag-tool-lizenzen"
              className="group bg-white rounded-xl p-6 shadow-sm border border-border border-t-4 border-t-primary hover:shadow-md transition-shadow"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Laptop className="h-8 w-8 text-primary" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2 group-hover:text-accent transition-colors">
                Kostenlose Tool-Lizenzen
              </h3>
              <p className="text-sm text-text-light mb-3">
                DSGVO-konforme Lern-Tools für Ihre Schule beantragen – finanziert durch Stiftungen.
              </p>
              <p className="inline-flex items-center gap-1 text-xs text-text-light/70 mb-4">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                Bearbeitungszeit ca. 5 Min.
              </p>
              <span className="flex items-center gap-1.5 text-sm font-medium text-accent-strong">
                <PenLine className="w-4 h-4" aria-hidden="true" />
                Online ausfüllen
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </span>
            </Link>

            <Link
              href="/fuer-schulen/antrag-hilfskraefte"
              className="group bg-white rounded-xl p-6 shadow-sm border border-border border-t-4 border-t-[#00cabe] hover:shadow-md transition-shadow"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#00cabe]/10">
                <Users2 className="h-8 w-8 text-[#00cabe]" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2 group-hover:text-accent transition-colors">
                Studentische Hilfskräfte
              </h3>
              <p className="text-sm text-text-light mb-3">
                Kostenlose Unterstützung bei der Einrichtung digitaler Tools und technischem Support.
              </p>
              <p className="inline-flex items-center gap-1 text-xs text-text-light/70 mb-4">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                Bearbeitungszeit ca. 5 Min.
              </p>
              <span className="flex items-center gap-1.5 text-sm font-medium text-accent-strong">
                <PenLine className="w-4 h-4" aria-hidden="true" />
                Online ausfüllen
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </span>
            </Link>

            <Link
              href="/best-practice/einreichen"
              className="group bg-white rounded-xl p-6 shadow-sm border border-border border-t-4 border-t-[#E8A838] hover:shadow-md transition-shadow"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#E8A838]/10">
                <BookOpen className="h-8 w-8 text-[#E8A838]" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2 group-hover:text-accent transition-colors">
                Best Practice einreichen
              </h3>
              <p className="text-sm text-text-light mb-3">
                Dokumentieren Sie Ihre Unterrichtserfahrungen mit digitalen Tools und teilen Sie sie mit anderen.
              </p>
              <p className="inline-flex items-center gap-1 text-xs text-text-light/70 mb-4">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                Bearbeitungszeit ca. 10 Min.
              </p>
              <span className="flex items-center gap-1.5 text-sm font-medium text-accent-strong">
                <PenLine className="w-4 h-4" aria-hidden="true" />
                Online ausfüllen
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ – erste 4 offen, Rest hinter Button */}
      <section className="py-16 md:py-24" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2
              id="faq-heading"
              className="text-2xl md:text-3xl font-bold text-primary text-center mb-12"
            >
              Häufig gestellte Fragen
            </h2>
            <Accordion items={faqItems.slice(0, initialFaqCount)} />
            {faqItems.length > initialFaqCount && (
              <FaqExpander items={faqItems.slice(initialFaqCount)} />
            )}
          </div>
        </div>
      </section>

      <ContactSection />
    </>
  );
}

/* Client-Komponente für den FAQ-Expander */
function FaqExpander({ items }: { items: typeof faqItems }) {
  "use client";
  // Da die Seite ein Server-Component ist, muss der Expander
  // als separate Client-Komponente ausgelagert werden.
  // Wir verwenden hier einen einfachen <details>-Ansatz, der ohne JS funktioniert.
  return (
    <details className="mt-4 group">
      <summary className="cursor-pointer list-none text-center">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-accent transition-colors px-4 py-2 rounded-lg border border-border hover:border-accent/30">
          Weitere {items.length} Fragen anzeigen
          <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </summary>
      <div className="mt-3">
        <Accordion items={items} />
      </div>
    </details>
  );
}
