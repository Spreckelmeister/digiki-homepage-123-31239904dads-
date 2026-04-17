import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Barrierefreiheit",
  description:
    "Erklärung zur Barrierefreiheit der DigiKI-Projektwebsite gemäß § 12b BGG-NI.",
};

export default function BarrierefreiheitPage() {
  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Erklärung zur Barrierefreiheit
          </h1>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-border space-y-8">
            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                Stand der Barrierefreiheit
              </h2>
              <p className="text-text-light leading-relaxed">
                Die Stadt Osnabrück ist bemüht, die Projektwebsite
                www.digiki-os.de im Einklang mit dem Niedersächsischen
                Behindertengleichstellungsgesetz (NBGG) und der
                Barrierefreie-Informationstechnik-Verordnung (BITV 2.0)
                barrierefrei zugänglich zu machen.
              </p>
              <p className="text-text-light leading-relaxed mt-4">
                Diese Erklärung zur Barrierefreiheit gilt für die unter
                www.digiki-os.de veröffentlichte Projektwebsite.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                Bekannte Einschränkungen
              </h2>
              <p className="text-text-light leading-relaxed">
                Die Website befindet sich derzeit noch im Aufbau. Eine
                vollständige Prüfung der Barrierefreiheit nach WCAG 2.1 steht
                noch aus. Wir arbeiten kontinuierlich daran, die
                Barrierefreiheit zu verbessern.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                Feedback und Kontakt
              </h2>
              <p className="text-text-light leading-relaxed">
                Wenn Sie Barrieren auf unserer Website feststellen oder
                Informationen in einem barrierefreien Format benötigen, wenden
                Sie sich bitte an uns:
              </p>
              <address className="mt-4 text-text-light not-italic leading-relaxed">
                <p className="font-semibold text-primary">Kai Krafft</p>
                <p>Bildungskoordinator im Fachbereich 40-3 Bildung</p>
                <p>Stadt Osnabrück</p>
                <p>Bierstraße 20, 49074 Osnabrück</p>
                <p className="mt-2">
                  E-Mail:{" "}
                  <a
                    href="mailto:krafft@osnabrueck.de"
                    className="text-accent hover:underline"
                  >
                    krafft@osnabrueck.de
                  </a>
                </p>
              </address>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                Durchsetzungsverfahren
              </h2>
              <p className="text-text-light leading-relaxed">
                Sollten Sie nach einer Kontaktaufnahme keine zufriedenstellende
                Lösung erhalten, können Sie sich an die zuständige Stelle des
                Landes Niedersachsen wenden:
              </p>
              <address className="mt-4 text-text-light not-italic leading-relaxed">
                <p className="font-semibold text-primary">
                  Landesbeauftragte für Menschen mit Behinderungen
                </p>
                <p>Niedersächsisches Ministerium für Soziales, Arbeit,</p>
                <p>Gesundheit und Gleichstellung</p>
                <p>Hannah-Arendt-Platz 2, 30159 Hannover</p>
                <p className="mt-2">
                  Telefon: 0511 120-4006
                </p>
                <p className="mt-1">
                  E-Mail:{" "}
                  <a
                    href="mailto:behindertenbeauftragte@ms.niedersachsen.de"
                    className="text-accent hover:underline"
                  >
                    behindertenbeauftragte@ms.niedersachsen.de
                  </a>
                </p>
              </address>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
