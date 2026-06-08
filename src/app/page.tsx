import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ExternalLink, User, PenLine, Users2, BookOpen, Laptop, Quote, Clock } from "lucide-react";
import StatCounter from "@/components/StatCounter";
import FeatureCard from "@/components/FeatureCard";
import ContactSection from "@/components/ContactSection";
import AnimatedSection from "@/components/AnimatedSection";
import { En } from "@/components/Lang";
// JSON-LD für Info-Veranstaltung – nach 8. Mai 2026 deaktiviert.
// Bei neuer Veranstaltung: Termin in src/components/JsonLd.tsx
// (events-Array in EventsJsonLd) aktualisieren und diesen Import
// sowie die Verwendung unten wieder einkommentieren.
// import { EventsJsonLd } from "@/components/JsonLd";
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
import { createClient } from "@/lib/supabase/server";

// Statistik-Zahlen werden alle 10 Min neu aus der DB geholt – frisch genug
// für eine Live-Anzeige, ohne den Cache pro Request zu sprengen.
export const revalidate = 600;

async function getParticipatingSchoolCount(): Promise<number | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("count_participating_schools");
    if (error || typeof data !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const liveSchoolCount = await getParticipatingSchoolCount();
  // Wenn die RPC verfügbar ist UND eine sinnvolle Zahl liefert, zeigen wir
  // die Live-Zahl. Sonst Fallback auf den projektweit hinterlegten Wert.
  const dynamicStats = stats.map((s) =>
    s.label === "Grundschulen" && liveSchoolCount && liveSchoolCount > 0
      ? { ...s, value: String(liveSchoolCount), description: "teilnehmend" }
      : s,
  );
  return (
    <>
      {/* <EventsJsonLd /> */}
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
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Digitale Kompetenz &amp;{" "}
                <abbr
                  title="Künstliche Intelligenz"
                  className="no-underline"
                >
                  KI
                </abbr>{" "}
                für{" "}
                <span className="text-teal">Grundschulen</span>
              </h1>
              <p className="text-lg text-white/85 max-w-3xl mb-8">
                {projectData.claim}. Kostenlose Schulungen, Tool-Lizenzen und
                Begleitung für alle interessierten Grundschulen.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={projectData.surveyUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-text hover:bg-accent-hover transition-colors"
                >
                  Jetzt teilnehmen
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </Link>
                <Link
                  href="/ueber-das-projekt"
                  aria-label="Mehr über das DigiKI-Projekt erfahren"
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
                  fetchPriority="high"
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
            {dynamicStats.map((stat) => (
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
            <div className="rounded-2xl overflow-hidden shadow-lg max-w-sm mx-auto lg:max-w-none">
              <ProtectedImage
                src={blobImages["istock-kids-raise-hands"]}
                alt="Begeisterte Grundschulkinder melden sich im Unterricht"
                width={600}
                height={400}
                className="w-full h-auto object-cover"
                sizes="(max-width: 640px) 384px, (max-width: 1024px) 50vw, 600px"
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
              binnendifferenzierten Unterricht und individuelle Förderung ermöglichen.
              So bleibt mehr Zeit für das, was wirklich zählt: die Kinder.&ldquo;
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
              <h3 className="text-lg font-semibold text-primary mb-2 group-hover:text-accent-strong transition-colors">
                Kostenlose Tool-Lizenzen
              </h3>
              <p className="text-sm text-text-light mb-3">
                DSGVO-konforme Lern-Tools für Ihre Schule beantragen –
                finanziert durch Stiftungen.
              </p>
              <p className="inline-flex items-center gap-1 text-xs text-text-light mb-4">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                Bearbeitungszeit ca. 5 Min.
              </p>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:underline">
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
              <h3 className="text-lg font-semibold text-primary mb-2 group-hover:text-accent-strong transition-colors">
                Studentische Hilfskräfte
              </h3>
              <p className="text-sm text-text-light mb-3">
                Kostenlose Unterstützung bei der Einrichtung digitaler
                Tools und technischem Support.
              </p>
              <p className="inline-flex items-center gap-1 text-xs text-text-light mb-4">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                Bearbeitungszeit ca. 5 Min.
              </p>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:underline">
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
              <h3 className="text-lg font-semibold text-primary mb-2 group-hover:text-accent-strong transition-colors">
                <En>Best Practice</En> einreichen
              </h3>
              <p className="text-sm text-text-light mb-3">
                Dokumentieren Sie Ihre Unterrichtserfahrungen mit digitalen
                Tools und teilen Sie sie mit anderen.
              </p>
              <p className="inline-flex items-center gap-1 text-xs text-text-light mb-4">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                Bearbeitungszeit ca. 10 Min.
              </p>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:underline">
                <PenLine className="w-4 h-4" aria-hidden="true" />
                Online ausfüllen
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* Aktuelles */}
      <section id="aktuelles" className="py-16 md:py-24 scroll-mt-24" aria-labelledby="news-heading">
        <AnimatedSection className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              id="news-heading"
              className="text-3xl md:text-4xl font-bold text-primary mb-4"
            >
              Aktuelles
            </h2>
          </div>
          {/* Event-Karten direkt unter der Überschrift –
              nach 8. Mai 2026 deaktiviert. Bei neuer Veranstaltung:
              passenden Eintrag in src/data/project.ts (newsItems mit
              type: "event") wieder ergänzen, dann unten `false` durch
              `true` ersetzen. */}
          {false && newsItems.filter((i) => i.type === "event").map((item) => {
            const dates = "dates" in item && item.dates ? item.dates : [];
            const cols =
              dates.length === 1
                ? "grid-cols-1"
                : "grid-cols-1 md:grid-cols-2";

            return (
              <article
                key={item.id}
                className="mb-8 overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
              >
                {/* Header – dunkles Primary mit weichem Türkis-Lichtschein */}
                <div className="relative isolate overflow-hidden bg-primary px-6 py-6 sm:px-8 sm:py-7">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                  >
                    <div
                      className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl"
                      style={{ background: "var(--color-primary-light)" }}
                    />
                  </div>
                  <div className="relative">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.12] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white ring-1 ring-inset ring-white/10">
                      <span
                        className="relative flex h-1.5 w-1.5"
                        aria-hidden="true"
                      >
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                      </span>
                      Offene Informationsveranstaltung
                    </span>
                    <h3 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-white sm:text-[26px]">
                      {item.title}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
                      {item.summary}
                    </p>
                  </div>
                </div>

                {/* Termine */}
                {dates.length > 0 && (
                  <div className={`grid gap-px bg-border ${cols}`}>
                    {dates.map((d) => {
                      const [weekday, datePart] = d.label.split(",");
                      const timeNumber = d.time.replace(" Uhr", "");
                      return (
                        <div
                          key={d.label}
                          className="bg-white p-6 sm:p-8"
                        >
                          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                            {/* Datum-„Stub" */}
                            <div className="border-b border-border pb-6 sm:min-w-[180px] sm:border-b-0 sm:border-r sm:pb-0 sm:pr-8">
                              <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-primary">
                                {weekday?.trim()}
                              </p>
                              <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-text">
                                {datePart?.trim() ?? d.label}
                              </p>
                              <div className="mt-5 flex items-baseline gap-2">
                                <Clock
                                  className="h-4 w-4 self-center text-primary-light"
                                  aria-hidden="true"
                                />
                                <span className="text-3xl font-bold leading-none tabular-nums text-primary">
                                  {timeNumber}
                                </span>
                                <span className="text-sm text-text-light">
                                  Uhr
                                </span>
                              </div>
                              <p className="mt-1.5 text-xs text-text-light">
                                per Microsoft Teams
                              </p>
                            </div>

                            {/* Aktion + Zugangsdaten */}
                            <div className="flex flex-1 flex-col gap-4">
                              <a
                                href={d.joinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Per Teams teilnehmen – ${d.label}, ${d.time}`}
                                className="group inline-flex w-fit items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-text shadow-sm transition-all hover:bg-accent-hover hover:shadow-md"
                              >
                                Per Teams teilnehmen
                                <ExternalLink
                                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                                  aria-hidden="true"
                                />
                              </a>

                              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border border-border bg-bg px-4 py-3">
                                <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-light">
                                  Meeting-ID
                                </dt>
                                <dd className="font-mono text-xs tabular-nums text-text">
                                  {d.meetingId}
                                </dd>
                                <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-light">
                                  Passcode
                                </dt>
                                <dd className="font-mono text-xs text-text">
                                  {d.passcode}
                                </dd>
                              </dl>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}

          {/* Reguläre News */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...newsItems]
              .filter((i) => i.type !== "event")
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 3)
              .map((item) => {
                const isPast = new Date(item.date) < new Date();
                return (
                  <article
                    key={item.id}
                    className={`rounded-xl p-6 shadow-sm border transition-shadow hover:shadow-md ${
                      isPast
                        ? "bg-bg border-border/60"
                        : "bg-white border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <time
                        dateTime={item.date}
                        className={`text-sm font-medium ${isPast ? "text-text-light" : "text-primary"}`}
                      >
                        {new Date(item.date).toLocaleDateString("de-DE", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </time>
                      {isPast && (
                        <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">
                          Gestartet
                        </span>
                      )}
                    </div>
                    <h3 className={`text-lg font-semibold mt-2 mb-2 ${isPast ? "text-text-light" : "text-primary"}`}>
                      {item.title}
                    </h3>
                    <p className="text-sm text-text-light">{item.summary}</p>
                  </article>
                );
              })}
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
          <div id="projektbeteiligte" className="mb-16 scroll-mt-24">
            <h2
              id="partners-heading"
              className="text-3xl md:text-4xl font-bold text-primary text-center mb-10"
            >
              Projektbeteiligte
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
              {partners.map((partner) => {
                // Partner mit tightSpacing rücken auf Desktop näher ans vorherige Logo
                // (z.B. Stadt + Landkreis Osnabrück als thematische Einheit).
                const tightShift =
                  "tightSpacing" in partner && partner.tightSpacing
                    ? "md:-ml-8"
                    : "";
                return (
                  <a
                    key={partner.name}
                    href={partner.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={partner.name}
                    className={`relative w-[140px] h-[60px] transition-all duration-200 hover:scale-105 hover:drop-shadow-md ${tightShift}`.trim()}
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
                );
              })}
            </div>
          </div>

          {/* Trennlinie */}
          <div className="border-t border-border mb-16" />

          {/* Förderer */}
          <div id="foerderer" className="scroll-mt-24">
            <h2 className="text-3xl md:text-4xl font-bold text-primary text-center mb-10">
              Gefördert durch
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
              {funders.map((funder) => {
                const caption = "caption" in funder && funder.caption
                  ? funder.caption
                  : null;

                const inner = funder.logo ? (
                  <div
                    key={funder.name}
                    className="flex flex-col items-center gap-1"
                    title={funder.name}
                  >
                    <div className="relative w-[140px] h-[60px]">
                      <Image
                        src={funder.logo}
                        alt={
                          "logoAlt" in funder && funder.logoAlt
                            ? funder.logoAlt
                            : `Logo ${funder.name}`
                        }
                        fill
                        className="object-contain"
                        sizes="140px"
                      />
                    </div>
                    {caption && (
                      <span className="text-xs font-medium text-text-light">
                        {caption}
                      </span>
                    )}
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

                // Privater Förderer: auf Desktop dichter ans vorherige Logo rücken,
                // um visuell die Zugehörigkeit zur Privatperson-Kategorie zu signalisieren.
                const tightShift =
                  "tightSpacing" in funder && funder.tightSpacing
                    ? "md:-ml-10"
                    : "";

                return funder.url !== "#" ? (
                  <a
                    key={funder.name}
                    href={funder.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${tightShift} transition-all duration-200 hover:scale-105 hover:drop-shadow-md`.trim()}
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={funder.name} className={`${tightShift} transition-all duration-200 hover:scale-105 hover:drop-shadow-md`.trim()}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kurze, dezentere Trennlinie für die Attributionsebene */}
          <div className="mx-auto w-20 border-t border-border/70 my-14" />

          {/* Durchgeführt von – bewusst kleinere Hierarchie als Projektbeteiligte & Förderer */}
          <div id="projekttraegerschaft" className="flex flex-col items-center gap-4 scroll-mt-24">
            <p className="text-xs uppercase tracking-[0.25em] text-primary font-medium">
              Projektträgerschaft
            </p>
            <a
              href="https://www.hausdesstiftens.org/foerderfonds/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Haus des Stiftens (externer Link)"
              className="opacity-80 transition-all duration-200 hover:opacity-100 hover:scale-105 hover:drop-shadow-md"
            >
              <div className="relative w-[120px] h-[48px]">
                <Image
                  src="/images/logos/HdS_Logo_2017.png"
                  alt="Logo Haus des Stiftens"
                  fill
                  className="object-contain"
                  sizes="120px"
                />
              </div>
            </a>
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
              aria-label="Zur Bestandsaufnahme (öffnet in neuem Tab)"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-text hover:bg-accent-hover transition-colors"
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
