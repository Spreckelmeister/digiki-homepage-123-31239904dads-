import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ExternalLink, User } from "lucide-react";
import StatCounter from "@/components/StatCounter";
import FeatureCard from "@/components/FeatureCard";
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
            backgroundImage: "radial-gradient(circle at 25% 50%, #00cabe 0%, transparent 50%), radial-gradient(circle at 75% 50%, #E8A838 0%, transparent 50%)",
          }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Digitale Kompetenz &amp; KI für{" "}
                <span className="text-teal">Grundschulen</span>
              </h1>
              <p className="text-lg md:text-xl text-teal/70 mb-8 leading-relaxed">
                {projectData.claim}. Kostenlose Schulungen, Tool-Lizenzen und
                Begleitung für alle interessierten Grundschulen.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href={projectData.surveyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-white hover:bg-accent-hover transition-colors"
                >
                  Jetzt teilnehmen
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </a>
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
                <Image
                  src="/images/hero/hero-klassenzimmer.jpg"
                  alt="Lehrerin unterstützt einen Schüler beim Lernen im Klassenzimmer"
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover"
                  priority
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="/images/icons/kinder-laptops-klassenzimmer.jpg"
                alt="Lehrerin begleitet Kinder beim Arbeiten an Laptops im Klassenzimmer"
                width={600}
                height={400}
                className="w-full h-auto object-cover"
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
        </div>
      </section>

      {/* Features */}
      <section
        className="py-16 md:py-24 bg-white"
        aria-labelledby="features-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
        </div>
      </section>

      {/* Aktuelles */}
      <section className="py-16 md:py-24" aria-labelledby="news-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              id="news-heading"
              className="text-3xl md:text-4xl font-bold text-primary mb-4"
            >
              Aktuelles
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {newsItems.map((item) => (
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
        </div>
      </section>

      {/* Partner & Förderer */}
      <section
        className="py-16 md:py-24 bg-white"
        aria-labelledby="partners-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Projektbeteiligte */}
          <div className="mb-16">
            <h2
              id="partners-heading"
              className="text-2xl font-bold text-primary text-center mb-8"
            >
              Projektbeteiligte
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {partners.map((partner) => (
                <a
                  key={partner.name}
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-3 p-4 bg-bg rounded-xl border border-border hover:shadow-md hover:border-teal/30 transition-all"
                >
                  <div className="h-14 w-full flex items-center justify-center">
                    {partner.logo ? (
                      <Image
                        src={partner.logo}
                        alt={`Logo ${partner.name}`}
                        width={140}
                        height={56}
                        className="max-h-12 w-auto object-contain"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-primary/40">
                        {partner.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-text-light font-medium text-center leading-tight">
                    {partner.name}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Förderer */}
          <div>
            <h2 className="text-2xl font-bold text-primary text-center mb-8">
              Gefördert durch
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {funders.map((funder) => {
                const Wrapper = funder.url !== "#" ? "a" : "div";
                const linkProps = funder.url !== "#" ? { href: funder.url, target: "_blank" as const, rel: "noopener noreferrer" } : {};
                return (
                  <Wrapper
                    key={funder.name}
                    {...linkProps}
                    className="flex flex-col items-center justify-center gap-3 p-4 bg-bg rounded-xl border border-border hover:shadow-md hover:border-teal/30 transition-all"
                  >
                    <div className="h-16 w-full flex items-center justify-center">
                      {funder.logo ? (
                        <Image
                          src={funder.logo}
                          alt={`Logo ${funder.name}`}
                          width={160}
                          height={64}
                          className={`${funder.logoClassName || "max-h-12"} w-auto object-contain`}
                        />
                      ) : (
                        <User className="w-8 h-8 text-teal" aria-hidden="true" />
                      )}
                    </div>
                    <span className="text-xs text-text-light font-medium text-center leading-tight">
                      {funder.name}
                    </span>
                  </Wrapper>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary" aria-labelledby="cta-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2
            id="cta-heading"
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            Ihre Schule ist dabei?
          </h2>
          <p className="text-lg text-teal/70 mb-8 max-w-2xl mx-auto">
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
        </div>
      </section>
    </>
  );
}
