import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Download, Check, FileText, PenLine, Mail, Phone, MapPin, Quote, ArrowRight } from "lucide-react";
import Accordion from "@/components/Accordion";
import { FAQPageJsonLd } from "@/components/JsonLd";
import { projectData, participationOptions, faqItems } from "@/data/project";

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
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-hover transition-colors"
                >
                  Jetzt Bestandsaufnahme starten
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  href="#teilnahme"
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-6 py-3 font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  Teilnahmeoptionen ansehen
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <Image
                src="/images/icons/pexels-rdne-8499534.webp"
                alt="Grundschulkinder lernen mit digitalen Medien im Unterricht"
                width={500}
                height={350}
                className="rounded-2xl shadow-2xl object-cover w-full h-[300px]"
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
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-hover transition-colors shrink-0"
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
                  <div className="absolute -top-3 left-6 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">
                    Empfohlen
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-primary">
                    {option.title}
                  </h3>
                  <p className="text-sm text-accent font-medium">
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
                        className="w-4 h-4 text-accent mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="#kontakt"
                  className={`block text-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    option.featured
                      ? "bg-accent text-white hover:bg-accent-hover"
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
      <section className="py-12 md:py-16 bg-primary/5" aria-labelledby="social-proof-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 id="social-proof-heading" className="sr-only">Stimmen und Zahlen</h2>

          {/* Statistiken */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-accent">50+</p>
              <p className="text-sm text-text-light mt-1">Grundschulen eingeladen</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-accent">300+</p>
              <p className="text-sm text-text-light mt-1">Lehrkräfte werden geschult</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-accent">100%</p>
              <p className="text-sm text-text-light mt-1">kostenlos für Schulen</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-accent">18</p>
              <p className="text-sm text-text-light mt-1">Monate Begleitung</p>
            </div>
          </div>

          {/* Zitat */}
          <div className="max-w-3xl mx-auto bg-white rounded-xl p-8 shadow-sm border border-border">
            <Quote className="w-8 h-8 text-accent/30 mb-4" aria-hidden="true" />
            <blockquote className="text-lg text-text leading-relaxed mb-4">
              &bdquo;Unser Ziel ist es, dass jede Grundschule in Osnabrück von der Digitalisierung profitiert –
              unabhängig von Größe oder Vorerfahrung. Mit DigiKI schaffen wir die Grundlage dafür.&ldquo;
            </blockquote>
            <footer className="text-sm text-text-light">
              <span className="font-semibold text-primary">{projectData.projectLead}</span>
              {" – "}
              {projectData.projectLeadRole}
            </footer>
          </div>
        </div>
      </section>

      {/* Motivations-Bild: Studentische Unterstützung */}
      <section className="py-16 md:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="/images/icons/pexels-pavel-danilyuk-8423046.webp"
                alt="Individuelle Lernbegleitung im Grundschulunterricht mit digitalen Hilfen"
                width={600}
                height={400}
                className="w-full h-auto object-cover"
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
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold shrink-0">
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

      {/* Downloads */}
      <section
        className="py-16 md:py-24 bg-white"
        aria-labelledby="downloads-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            id="downloads-heading"
            className="text-2xl md:text-3xl font-bold text-primary text-center mb-12"
          >
            Downloads &amp; Materialien
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                title: "Antrag Tool-Lizenzen",
                description: "Formular zur Beantragung stiftungsfinanzierter Tool-Lizenzen für adaptive Lernplattformen.",
                format: "DOCX",
                downloadHref: "/downloads/Antrag_Tool_Lizenzen_DigiKI.docx",
                formHref: "/fuer-schulen/antrag-tool-lizenzen",
              },
              {
                title: "Antrag Studentische Hilfskräfte",
                description: "Formular zur Beantragung studentischer Unterstützung bei der Einrichtung digitaler Tools.",
                format: "DOCX",
                downloadHref: "/downloads/Antrag_Studentische_Hilfskraefte_DigiKI.docx",
                formHref: "/fuer-schulen/antrag-hilfskraefte",
              },
              {
                title: "Best-Practice-Vorlage",
                description: "Strukturierte Vorlage zur Dokumentation Ihrer Unterrichtserfahrungen mit digitalen Tools.",
                format: "DOCX",
                downloadHref: "/downloads/Best-Practice-Vorlage-Grundschule.docx",
                formHref: "/best-practice/einreichen",
              },
            ].map((doc) => (
              <div
                key={doc.title}
                className="bg-bg rounded-xl p-6 border border-border hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText
                      className="w-5 h-5 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">
                      {doc.title}
                    </h3>
                    <span className="text-xs text-text-light font-medium uppercase">{doc.format}</span>
                  </div>
                </div>
                <p className="text-sm text-text-light mb-4">
                  {doc.description}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={doc.formHref}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-accent hover:bg-accent-hover px-4 py-2 rounded-lg transition-colors"
                  >
                    <PenLine className="w-4 h-4" aria-hidden="true" />
                    Online ausfüllen
                  </Link>
                  <a
                    href={doc.downloadHref}
                    download
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-light hover:text-primary border border-border hover:border-primary/30 px-4 py-2 rounded-lg transition-colors"
                    title={`${doc.title} herunterladen (${doc.format})`}
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    Herunterladen
                  </a>
                </div>
              </div>
            ))}
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

      {/* Kontakt – mit Formular-Elementen und Kontaktdaten */}
      <section
        id="kontakt"
        className="py-16 md:py-24 bg-primary"
        aria-labelledby="contact-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Linke Seite: Text + Kontaktdaten */}
            <div>
              <h2
                id="contact-heading"
                className="text-2xl md:text-3xl font-bold text-white mb-4"
              >
                Interesse? Sprechen Sie uns an!
              </h2>
              <p className="text-lg text-white/70 mb-8">
                Wir beraten Sie gerne persönlich zu den Teilnahmemöglichkeiten und
                finden gemeinsam das passende Format für Ihre Schule.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3 text-white/90">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">E-Mail</p>
                    <a
                      href={`mailto:${projectData.contactEmail}`}
                      className="hover:text-white transition-colors"
                    >
                      {projectData.contactEmail}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-white/90">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Adresse</p>
                    <p>{projectData.projectLeadAddress}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rechte Seite: Ansprechpartner + CTA-Karte */}
            <div className="bg-white/10 rounded-xl p-8">
              <h3 className="text-lg font-semibold text-white mb-1">
                Ihr Ansprechpartner
              </h3>
              <p className="text-white/70 mb-6">{projectData.projectLeadRole}</p>

              <p className="text-2xl font-bold text-white mb-6">
                {projectData.projectLead}
              </p>

              <div className="space-y-3">
                <a
                  href={`mailto:${projectData.contactEmail}?subject=Interesse an DigiKI-Teilnahme`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-hover transition-colors"
                >
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  E-Mail schreiben
                </a>
                <Link
                  href={projectData.surveyUrl}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-6 py-3 font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  Zur Bestandsaufnahme
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
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
