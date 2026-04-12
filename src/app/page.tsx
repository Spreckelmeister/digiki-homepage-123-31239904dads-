import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ExternalLink, User, PenLine, Users2, BookOpen, Laptop, CalendarDays, Quote, Clock } from "lucide-react";
import StatCounter from "@/components/StatCounter";
import FeatureCard from "@/components/FeatureCard";
import ContactSection from "@/components/ContactSection";
import AnimatedSection from "@/components/AnimatedSection";
import CountdownBadge from "@/components/CountdownBadge";
import ProtectedImage from "@/components/ProtectedImage";
import { blobImages } from "@/data/images.generated";
import {
  projectData,
  stats,
  features,
  partners,
  funders,
  newsItems,
} from "@/data/project";

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-primary overflow-hidden">
        {/* Hintergrund-Muster */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 25% 50%, var(--color-teal) 0%, transparent 50%), radial-gradient(circle at 75% 50%, var(--color-accent) 0%, transparent 50%)",
          }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <CountdownBadge />
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Digitale Kompetenz &amp; KI für{" "}
                <span className="text-teal">Grundschulen</span>
              </h1>
              <p className="text-lg text-white/85 max-w-3xl mb-8">
                {projectData.claim}. Kostenlose Schulungen, Tool-Lizenzen und
                Begleitung für alle interessierten Grundschulen.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={projectData.surveyUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-white hover:bg-accent-hover transition-colors"
                >
                  Jetzt teilnehmen
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </Link>
                <Link
                  href="/ueber-das-projekt"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-6 py-3 text-lg font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  Mehr erfahren
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <ProtectedImage
                  src={blobImages["istock-kids-laptop-teacher"]}
                  alt="Grundschulkinder arbeiten mit Laptops im Unterricht, begleitet von ihrer Lehrkraft"
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover"
                  priority
                  sizes="(max-width: 1024px) 0vw, (max-width: 1280px) 50vw, 600px"
                />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 ring-inset" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistiken */}
      <section className="bg-white py-12 border-b border-border" aria-label="Projekt in Zahlen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <StatCounter
                key={stat.label}
                value={stat.value}
                label={stat.label}
                description={stat.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Projektvorstellung */}
      <section className="py-16 md:py-24" aria-labelledby="vision-heading">
        <AnimatedSection className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <ProtectedImage
                src={blobImages["istock-kids-raise-hands"]}
                alt="Begeisterte Grundschulkinder melden sich im Unterricht"
                width={600}
                height={400}
                className="w-full h-auto object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div>
              <h2
                id="vision-heading"
                className="text-3xl md:text-4xl font-bold text-primary mb-4"
              >
                Unsere Vision
              </h2>
              <p className="text-lg text-text-light leading-relaxed mb-4">
                DigiKI ist ein 18-monatiges Projekt, das alle interessierten
                Grundschulen in der Stadt und dem Landkreis Osnabrück zu digitaler
                Kompetenz und zum sachgerechten Umgang mit KI befähigen soll.
              </p>
              <p className="text-lg text-text-light leading-relaxed">
                Dabei geht es nicht darum, den Unterricht zu digitalisieren – sondern
                Lehrkräfte zu entlasten und ihnen mehr Zeit für das zu geben, was
                wirklich zählt: die individuelle Förderung ihrer Schülerinnen und
                Schüler.
              </p>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Zitat */}
      <section className="py-16 md:py-24 bg-white" aria-label="Zitat">
        <AnimatedSection className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto bg-white rounded-xl p-8 shadow-sm border border-border">
            <Quote className="w-8 h-8 text-accent/30 mb-4" aria-hidden="true" />
            <blockquote className="text-lg text-text leading-relaxed mb-4">
              &bdquo;Unser Leitsatz: Pädagogik vor Technik. DigiKI digitalisiert nicht den
              Unterricht, sondern entlastet Lehrkräfte – mit KI-Werkzeugen, die
              binnendifferenzierten Unterricht und Sprachförderung bei DaZ-Kindern
              ermöglichen. So bleibt mehr Zeit für das, was wirklich zählt: die Kinder.&ldquo;
            </blockquote>
            <footer className="text-sm text-text-light">
              <span className="font-semibold text-primary">{projectData.projectLead}</span>
              {" – "}
              {projectData.projectLeadRole}
            </footer>
          </div>
        </AnimatedSection>
      </section>

      {/* Features */}
      <section
        className="py-16 md:py-24 bg-white"
        aria-labelledby="features-heading"
      >
        <AnimatedSection className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              id="features-heading"
              className="text-3xl md:text-4xl font-bold text-primary mb-4"
            >
              Das Besondere an DigiKI
            </h2>
            <p className="text-lg text-text-light max-w-2xl mx-auto">
              Ein ganzheitliches Konzept für die digitale Transformation an
              Grundschulen.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
              />
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* Online-Formulare */}
      <section
        className="py-16 md:py-24 bg-white"
        aria-labelledby="forms-heading"
      >
        <AnimatedSection className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              id="forms-heading"
              className="text-3xl md:text-4xl font-bold text-primary mb-4"
            >
              Jetzt online beantragen
            </h2>
            <p className="text-lg text-text-light max-w-2xl mx-auto">
              Alle Anträge und Formulare direkt online ausfüllen – schnell und
              unkompliziert.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/fuer-schulen/antrag-tool-lizenzen"
              className="group bg-white rounded-xl p-6 shadow-sm border border-border border-t-4 border-t-primary hover:shadow-md transition-shadow"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Laptop
                  className="h-8 w-8 text-primary"
                  aria-hidden="true"
                />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2 group-hover:text-accent transition-colors">
                Kostenlose Tool-Lizenzen
              </h3>
              <p className="text-sm text-text-light mb-3">
                DSGVO-konforme Lern-Tools für Ihre Schule beantragen –
                finanziert durch Stiftungen.
              </p>
              <p className="inline-flex items-center gap-1 text-xs text-text-light/70 mb-4">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                Bearbeitungszeit ca. 5 Min.
              </p>
              <span className="flex items-center gap-1.5 text-sm font-medium text-accent">
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
                <Users2
                  className="h-8 w-8 text-[#00cabe]"
                  aria-hidden="true"
                />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2 group-hover:text-accent transition-colors">
                Studentische Hilfskräfte
              </h3>
              <p className="text-sm text-text-light mb-3">
                Kostenlose Unterstützung bei der Einrichtung digitaler
                Tools und technischem Support.
              </p>
              <p className="inline-flex items-center gap-1 text-xs text-text-light/70 mb-4">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                Bearbeitungszeit ca. 5 Min.
              </p>
              <span className="flex items-center gap-1.5 text-sm font-medium text-accent">
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
                <BookOpen
                  className="h-8 w-8 text-[#E8A838]"
                  aria-hidden="true"
                />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2 group-hover:text-accent transition-colors">
                Best Practice einreichen
              </h3>
              <p className="text-sm text-text-light mb-3">
                Dokumentieren Sie Ihre Unterrichtserfahrungen mit digitalen
                Tools und teilen Sie sie mit anderen.
              </p>
              <p className="inline-flex items-center gap-1 text-xs text-text-light/70 mb-4">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                Bearbeitungszeit ca. 10 Min.
              </p>
              <span className="flex items-center gap-1.5 text-sm font-medium text-accent">
                <PenLine className="w-4 h-4" aria-hidden="true" />
                Online ausfüllen
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* Aktuelles */}
      <section className="py-16 md:py-24" aria-labelledby="news-heading">
        <AnimatedSection className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              id="news-heading"
              className="text-3xl md:text-4xl font-bold text-primary mb-4"
            >
              Aktuelles
            </h2>
          </div>
          {/* Event-Karten direkt unter der Überschrift */}
          {newsItems.filter((i) => i.type === "event").map((item) => (
            <article
              key={item.id}
              className="mb-8 rounded-xl overflow-hidden shadow-sm border border-border"
            >
              {/* Header */}
              <div className="bg-primary px-6 py-5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide bg-white/15 text-white rounded-full px-3 py-1 mb-3">
                  <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
                  Offene Informationsveranstaltung
                </span>
                <h3 className="text-xl font-bold text-white">{item.title}</h3>
              </div>

              {/* Termine */}
              {"dates" in item && item.dates && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
                  {item.dates.map((d) => (
                    <div
                      key={d.label}
                      className="bg-white p-6"
                    >
                      <p className="font-bold text-primary text-lg">{d.label}</p>
                      <p className="text-text-light mb-4">{d.time}</p>
                      <div className="mb-4">
                        <a
                          href={d.joinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-accent text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-accent-hover transition-colors"
                        >
                          Per Teams teilnehmen
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </a>
                      </div>
                      <p className="text-xs text-text-light leading-relaxed">
                        ID: {d.meetingId} · Passcode: {d.passcode}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}

          {/* Reguläre News */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...newsItems]
              .filter((i) => i.type !== "event")
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 3)
              .map((item) => (
                <article
                  key={item.id}
                  className="bg-white rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow"
                >
                  <time
                    dateTime={item.date}
                    className="text-sm text-teal font-medium"
                  >
                    {new Date(item.date).toLocaleDateString("de-DE", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                  <h3 className="text-lg font-semibold text-primary mt-2 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-text-light">{item.summary}</p>
                </article>
              ))}
          </div>
        </AnimatedSection>
      </section>

      {/* Partner & Förderer */}
      <section
        className="py-16 md:py-24 bg-white"
        aria-labelledby="partners-heading"
      >
        <AnimatedSection className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Projektbeteiligte */}
          <div className="mb-16">
            <h2
              id="partners-heading"
              className="text-3xl md:text-4xl font-bold text-primary text-center mb-10"
            >
              Projektbeteiligte
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
              {partners.map((partner) => (
                <a
                  key={partner.name}
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={partner.name}
                  className="relative w-[140px] h-[60px] transition-all duration-200 hover:scale-105 hover:drop-shadow-md"
                >
                  {partner.logo ? (
                    <Image
                      src={partner.logo}
                      alt={`Logo ${partner.name}`}
                      fill
                      className="object-contain"
                      sizes="140px"
                    />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-sm font-semibold text-primary/60">
                      {partner.name}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Trennlinie */}
          <div className="border-t border-border mb-16" />

          {/* Förderer */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-primary text-center mb-10">
              Gefördert durch
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center items-center">
              {funders.map((funder) => {
                const inner = funder.logo ? (
                  <div
                    key={funder.name}
                    className="relative w-[140px] h-[60px]"
                    title={funder.name}
                  >
                    <Image
                      src={funder.logo}
                      alt={`Logo ${funder.name}`}
                      fill
                      className="object-contain"
                      sizes="140px"
                    />
                  </div>
                ) : (
                  <div
                    key={funder.name}
                    className="flex flex-col items-center justify-center gap-1.5 w-[140px] h-[60px]"
                  >
                    <User className="w-7 h-7 text-primary/40" aria-hidden="true" />
                    <span className="text-xs font-semibold text-text-light text-center leading-tight">
                      {funder.name}
                    </span>
                  </div>
                );

                return funder.url !== "#" ? (
                  <a
                    key={funder.name}
                    href={funder.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-all duration-200 hover:scale-105 hover:drop-shadow-md"
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={funder.name} className="transition-all duration-200 hover:scale-105 hover:drop-shadow-md">
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary" aria-labelledby="cta-heading">
        <AnimatedSection className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2
            id="cta-heading"
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            Ihre Schule ist dabei?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Starten Sie jetzt mit der Online-Bestandsaufnahme und sichern Sie
            sich einen Platz in den Intensivschulungen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={projectData.surveyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              Zur Bestandsaufnahme
              <ExternalLink className="w-5 h-5" aria-hidden="true" />
            </a>
            <Link
              href="/fuer-schulen"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-6 py-3 text-lg font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Alle Teilnahmeoptionen
            </Link>
          </div>
        </AnimatedSection>
      </section>

      <ContactSection />
    </>
  );
}
