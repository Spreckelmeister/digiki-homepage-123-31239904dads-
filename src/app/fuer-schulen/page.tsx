import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Download, Check, FileText } from "lucide-react";
import Accordion from "@/components/Accordion";
import { projectData, participationOptions, faqItems } from "@/data/project";

export const metadata: Metadata = {
  title: "Für Schulen",
  description:
    "Teilnahmeoptionen, Anmeldung, FAQ und Downloads für Grundschulen im DigiKI-Projekt. Kostenlose Schulungen, Tool-Lizenzen und Begleitung.",
};

export default function FuerSchulenPage() {
  return (
    <>
      {/* Header */}
      <section className="bg-primary py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Für Schulen
          </h1>
          <p className="text-lg text-blue-200 max-w-3xl">
            Alle Informationen zur Teilnahme an DigiKI – von der Anmeldung bis
            zur Umsetzung im Unterricht.
          </p>
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
                  href="/fuer-schulen#kontakt"
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

      {/* Bestandsaufnahme CTA */}
      <section className="py-16 md:py-24 bg-white" aria-labelledby="survey-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2
              id="survey-heading"
              className="text-2xl md:text-3xl font-bold text-primary mb-4"
            >
              Erster Schritt: Online-Bestandsaufnahme
            </h2>
            <p className="text-lg text-text-light mb-8">
              Helfen Sie uns, die Angebote passgenau zu gestalten. Der kurze
              Fragebogen (ca. 10 Minuten) erfasst den aktuellen Stand der
              digitalen Ausstattung und die Bedarfe Ihrer Schule.
            </p>
            <a
              href={projectData.surveyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-4 text-lg font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              Zur Online-Bestandsaufnahme
              <ExternalLink className="w-5 h-5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* Motivations-Bild */}
      <section className="py-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="/images/icons/studenten-unterstuetzung.jpg"
                alt="Junge Studierende arbeiten motiviert gemeinsam an einem Projekt"
                width={600}
                height={400}
                className="w-full h-auto object-cover"
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
            <div className="space-y-6">
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
                  className="flex items-start gap-4 bg-white rounded-xl p-6 shadow-sm border border-border"
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
                description: "Formular zur Beantragung stiftungsfinanzierter Tool-Lizenzen für adaptive Lernplattformen. Gesperrtes Word-Formular zum Ausfüllen.",
                format: "DOCX",
                href: "/downloads/Antrag_Tool_Lizenzen_DigiKI.docx",
              },
              {
                title: "Antrag Studentische Hilfskräfte",
                description: "Formular zur Beantragung studentischer Unterstützung bei der Einrichtung digitaler Tools, technischem Support und Materialerstellung. Gesperrtes Word-Formular zum Ausfüllen.",
                format: "DOCX",
                href: "/downloads/Antrag_Studentische_Hilfskraefte_DigiKI.docx",
              },
              {
                title: "Best-Practice-Vorlage",
                description: "Strukturierte Vorlage zur Dokumentation Ihrer Unterrichtserfahrungen mit digitalen Tools an Grundschulen. Gesperrtes Word-Formular zum Ausfüllen.",
                format: "DOCX",
                href: "/downloads/Best-Practice-Vorlage-Grundschule.docx",
              },
            ].map((doc) => (
              <div
                key={doc.title}
                className="bg-bg rounded-xl p-6 border border-border hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <FileText
                    className="w-8 h-8 text-primary shrink-0"
                    aria-hidden="true"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-primary mb-1">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-text-light mb-3">
                      {doc.description}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {doc.href ? (
                        <a
                          href={doc.href}
                          download
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-light hover:text-primary transition-colors"
                          title={`${doc.title} herunterladen (${doc.format})`}
                        >
                          <Download className="w-4 h-4" aria-hidden="true" />
                          {doc.format} herunterladen
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm text-text-light italic">
                          Demnächst verfügbar
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-text-light mt-8">
            Bei Fragen zu den Downloads wenden Sie sich bitte an{" "}
            <a
              href={`mailto:${projectData.contactEmail}`}
              className="text-primary-light underline hover:text-primary"
            >
              {projectData.contactEmail}
            </a>
            .
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2
              id="faq-heading"
              className="text-2xl md:text-3xl font-bold text-primary text-center mb-12"
            >
              Häufig gestellte Fragen
            </h2>
            <Accordion items={faqItems} />
          </div>
        </div>
      </section>

      {/* Kontakt */}
      <section
        id="kontakt"
        className="py-16 md:py-24 bg-primary"
        aria-labelledby="contact-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2
            id="contact-heading"
            className="text-2xl md:text-3xl font-bold text-white mb-4"
          >
            Noch Fragen?
          </h2>
          <p className="text-lg text-teal/70 mb-8 max-w-2xl mx-auto">
            Wir beraten Sie gerne persönlich zu den Teilnahmemöglichkeiten und
            finden gemeinsam das passende Format für Ihre Schule.
          </p>
          <div className="bg-white/10 rounded-xl p-8 max-w-md mx-auto">
            <p className="text-white font-semibold text-lg">
              {projectData.projectLead}
            </p>
            <p className="text-teal/70">{projectData.projectLeadRole}</p>
            <a
              href={`mailto:${projectData.contactEmail}`}
              className="inline-flex items-center gap-2 mt-4 rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              E-Mail schreiben
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
