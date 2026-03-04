import type { Metadata } from "next";
import Image from "next/image";
import Timeline from "@/components/Timeline";
import { timelinePhases } from "@/data/project";
import { BookOpen, Target, Lightbulb, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "Über das Projekt",
  description:
    "Erfahren Sie alles über das DigiKI-Projekt: Ziele, Zeitplan, Projektphasen und den Schwerpunkt auf Sprachförderung und Mehrsprachigkeit.",
};

export default function UeberDasProjektPage() {
  return (
    <>
      {/* Header */}
      <section className="bg-primary py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                Über das Projekt
              </h1>
              <p className="text-lg text-teal/70 max-w-3xl">
                DigiKI ist ein 18-monatiges Projekt, das alle interessierten
                Grundschulen in Stadt und Landkreis Osnabrück zu digitaler Kompetenz
                und sachgerechtem Umgang mit KI befähigen soll.
              </p>
            </div>
            <div className="hidden lg:block">
              <Image
                src="/images/icons/istockphoto-500537221-1024x1024.jpg"
                alt="Lehrkräfte-Team in einer Grundschule"
                width={500}
                height={350}
                className="rounded-2xl shadow-2xl object-cover w-full h-[300px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Projektbeschreibung */}
      <section className="py-16 md:py-24" aria-labelledby="about-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2
                id="about-heading"
                className="text-2xl md:text-3xl font-bold text-primary mb-6"
              >
                Warum DigiKI?
              </h2>
              <div className="prose max-w-none text-text-light leading-relaxed space-y-4">
                <p>
                  Die Digitalisierung verändert unsere Gesellschaft grundlegend –
                  und macht auch vor den Schulen nicht halt. Künstliche
                  Intelligenz bietet enorme Chancen für individualisiertes Lernen,
                  Sprachförderung und die Entlastung von Lehrkräften. Gleichzeitig
                  braucht es Wissen und Kompetenz, um diese Werkzeuge sinnvoll und
                  verantwortungsbewusst einzusetzen.
                </p>
                <p>
                  DigiKI setzt genau hier an: Das Projekt bietet Grundschulen in
                  der Region Osnabrück ein umfassendes Programm aus Schulungen,
                  Tool-Bereitstellung und Begleitung, um den Einstieg in die
                  digitale und KI-gestützte Bildung zu erleichtern.
                </p>
                <p>
                  Koordiniert wird das Projekt von der Stadt Osnabrück
                  (Projektleiter: Kai Krafft, Bildungskoordinator). Die
                  Finanzierung erfolgt durch die Friedel &amp; Gisela
                  Bohnenkamp-Stiftung, die Fromm-Stiftung, die Stiftung
                  Stahlwerk Georgsmarienhütte und Herrn Hellmann als privaten
                  Förderer.
                </p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="/images/icons/istockphoto-1435661952-1024x1024.jpg"
                alt="Kinder halten gemeinsam eine Weltkugel in die Höhe"
                width={500}
                height={400}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Ziele */}
      <section
        className="py-16 md:py-24 bg-white"
        aria-labelledby="goals-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            id="goals-heading"
            className="text-2xl md:text-3xl font-bold text-primary text-center mb-12"
          >
            Unsere Ziele
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen
                  className="w-7 h-7 text-primary"
                  aria-hidden="true"
                />
              </div>
              <h3 className="font-semibold text-primary mb-2">
                Qualifizierung
              </h3>
              <p className="text-sm text-text-light">
                300+ Lehrkräfte in digitalen Kompetenzen und KI-Einsatz schulen
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Target
                  className="w-7 h-7 text-primary"
                  aria-hidden="true"
                />
              </div>
              <h3 className="font-semibold text-primary mb-2">Praxisnähe</h3>
              <p className="text-sm text-text-light">
                Tools direkt im Unterricht erproben mit studentischer
                Unterstützung
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lightbulb
                  className="w-7 h-7 text-primary"
                  aria-hidden="true"
                />
              </div>
              <h3 className="font-semibold text-primary mb-2">
                Best Practices
              </h3>
              <p className="text-sm text-text-light">
                Erfolgreiche Beispiele dokumentieren und zwischen Schulen teilen
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Heart
                  className="w-7 h-7 text-primary"
                  aria-hidden="true"
                />
              </div>
              <h3 className="font-semibold text-primary mb-2">
                Sprachförderung
              </h3>
              <p className="text-sm text-text-light">
                KI-gestützte Werkzeuge für DaZ und Mehrsprachigkeit einsetzen
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Schwerpunkt Sprachförderung */}
      <section className="py-16 md:py-24" aria-labelledby="language-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-border">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                <div className="lg:col-span-3">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Heart
                        className="w-6 h-6 text-accent"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h2
                        id="language-heading"
                        className="text-2xl md:text-3xl font-bold text-primary mb-2"
                      >
                        Schwerpunkt: Sprachförderung &amp; Mehrsprachigkeit
                      </h2>
                      <p className="text-accent font-medium">
                        Ein besonderes Anliegen von DigiKI
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4 text-text-light leading-relaxed">
                    <p>
                      In der Region Osnabrück wachsen viele Kinder mehrsprachig auf
                      oder lernen Deutsch als Zweitsprache (DaZ). KI-gestützte
                      Werkzeuge können hier besonders wirkungsvoll unterstützen:
                    </p>
                    <ul className="space-y-2 ml-4">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                        Adaptive Lernplattformen passen sich dem individuellen
                        Sprachstand an
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                        KI-basierte Diagnostik erkennt Förderbedarfe frühzeitig
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                        Mehrsprachige Lernumgebungen unterstützen den
                        Spracherwerb
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                        Lehrkräfte werden entlastet und können gezielter fördern
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="rounded-xl overflow-hidden shadow-md">
                    <Image
                      src="/images/icons/sprachfoerderung-daz.jpg"
                      alt="Lehrerin begleitet einen Schüler individuell beim Lernen mit einem Tablet"
                      width={400}
                      height={280}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section
        className="py-16 md:py-24 bg-white"
        aria-labelledby="timeline-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              id="timeline-heading"
              className="text-2xl md:text-3xl font-bold text-primary mb-4"
            >
              Projektphasen im Überblick
            </h2>
            <p className="text-lg text-text-light max-w-2xl mx-auto">
              18 Monate – 6 Phasen – von der Bestandsaufnahme bis zum
              Abschluss-Fachtag
            </p>
          </div>
          <Timeline phases={timelinePhases} />
        </div>
      </section>

      {/* Budget & Förderung */}
      <section className="py-16 md:py-24" aria-labelledby="budget-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2
              id="budget-heading"
              className="text-2xl md:text-3xl font-bold text-primary text-center mb-12"
            >
              Förderung &amp; Finanzierung
            </h2>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-border">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center mb-8">
                <div className="lg:col-span-2 text-center lg:text-left">
                  <div className="text-4xl font-bold text-accent mb-2">
                    240.000 &euro;
                  </div>
                  <p className="text-text-light">
                    Gesamtbudget – finanziert durch Stiftungen und private Förderer
                  </p>
                </div>
                <div className="hidden lg:block rounded-xl overflow-hidden">
                  <Image
                    src="/images/icons/tool-lizenz.jpg"
                    alt="Digitale Analyse und Datenmanagement"
                    width={300}
                    height={200}
                    className="w-full h-[150px] object-cover"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  "Schulungen & Qualifizierung der Lehrkräfte",
                  "Lizenzen für adaptive Lernplattformen",
                  "Studentische Unterstützung an den Schulen",
                  "Koordination & Projektmanagement",
                  "Abschluss-Fachtag & Veranstaltungen",
                  "Materialien & Dokumentation",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 p-3 bg-bg rounded-lg"
                  >
                    <span className="w-2 h-2 rounded-full bg-teal shrink-0" />
                    <span className="text-sm text-text">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-sm text-text-light text-center">
                  Gefördert durch die Friedel &amp; Gisela Bohnenkamp-Stiftung,
                  die Fromm-Stiftung, die Stiftung Stahlwerk Georgsmarienhütte
                  und Herrn Hellmann.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
