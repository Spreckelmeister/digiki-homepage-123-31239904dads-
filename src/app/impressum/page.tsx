import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum",
  description:
    "Impressum der DigiKI-Projektwebsite. Angaben gemäß § 5 TMG: Stadt Osnabrück, Bildungskoordination.",
};

export default function ImpressumPage() {
  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Impressum
          </h1>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-border space-y-8">
            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                Angaben gemäß § 5 TMG
              </h2>
              <address className="not-italic text-text-light leading-relaxed">
                <p className="font-semibold text-text">Stadt Osnabrück</p>
                <p>Fachbereich Bildung</p>
                <p>Projekt DigiKI</p>
                <p className="mt-2">Kai Krafft</p>
                <p>Bildungskoordinator</p>
                <p className="mt-2">Bierstraße 20</p>
                <p>49074 Osnabrück</p>
              </address>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">Kontakt</h2>
              <p className="text-text-light">
                E-Mail:{" "}
                <a
                  href="mailto:krafft@osnabrueck.de"
                  className="text-primary-light underline hover:text-primary"
                >
                  krafft@osnabrueck.de
                </a>
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
              </h2>
              <p className="text-text-light">
                Kai Krafft
                <br />
                Stadt Osnabrück
                <br />
                Bierstraße 20
                <br />
                49074 Osnabrück
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                Haftung für Inhalte
              </h2>
              <p className="text-text-light leading-relaxed">
                Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene
                Inhalte auf diesen Seiten nach den allgemeinen Gesetzen
                verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
                Diensteanbieter jedoch nicht verpflichtet, übermittelte oder
                gespeicherte fremde Informationen zu überwachen oder nach
                Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
                hinweisen. Verpflichtungen zur Entfernung oder Sperrung der
                Nutzung von Informationen nach den allgemeinen Gesetzen bleiben
                hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst
                ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung
                möglich. Bei Bekanntwerden von entsprechenden
                Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                Haftung für Links
              </h2>
              <p className="text-text-light leading-relaxed">
                Unser Angebot enthält Links zu externen Websites Dritter, auf
                deren Inhalte wir keinen Einfluss haben. Deshalb können wir für
                diese fremden Inhalte auch keine Gewähr übernehmen. Für die
                Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
                oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten
                wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße
                überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der
                Verlinkung nicht erkennbar. Eine permanente inhaltliche
                Kontrolle der verlinkten Seiten ist jedoch ohne konkrete
                Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
                Bekanntwerden von Rechtsverletzungen werden wir derartige Links
                umgehend entfernen.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                Urheberrecht
              </h2>
              <p className="text-text-light leading-relaxed">
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf
                diesen Seiten unterliegen dem deutschen Urheberrecht. Beiträge
                Dritter sind als solche gekennzeichnet. Die Vervielfältigung,
                Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb
                der Grenzen des Urheberrechtes bedürfen der schriftlichen
                Zustimmung des jeweiligen Autors bzw. Erstellers.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
