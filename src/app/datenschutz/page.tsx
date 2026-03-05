import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutz",
};

export default function DatenschutzPage() {
  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Datenschutzerklärung
          </h1>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-border space-y-8">
            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                1. Datenschutz auf einen Blick
              </h2>
              <h3 className="text-lg font-semibold text-text mb-2">
                Allgemeine Hinweise
              </h3>
              <p className="text-text-light leading-relaxed">
                Die folgenden Hinweise geben einen einfachen Überblick darüber,
                was mit Ihren personenbezogenen Daten passiert, wenn Sie diese
                Website besuchen. Personenbezogene Daten sind alle Daten, mit
                denen Sie persönlich identifiziert werden können. Ausführliche
                Informationen zum Thema Datenschutz entnehmen Sie unserer unter
                diesem Text aufgeführten Datenschutzerklärung.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                2. Verantwortliche Stelle
              </h2>
              <p className="text-text-light leading-relaxed mb-2">
                Verantwortlich für die Datenverarbeitung auf dieser Website ist:
              </p>
              <address className="not-italic text-text-light leading-relaxed">
                <p className="font-semibold text-text">Stadt Osnabrück</p>
                <p>Kai Krafft – Bildungskoordinator</p>
                <p>Bierstraße 20</p>
                <p>49074 Osnabrück</p>
                <p className="mt-2">
                  E-Mail:{" "}
                  <a
                    href="mailto:krafft@osnabrueck.de"
                    className="text-primary-light underline"
                  >
                    krafft@osnabrueck.de
                  </a>
                </p>
              </address>
              <p className="text-text-light leading-relaxed mt-4">
                Verantwortliche Stelle ist die natürliche oder juristische
                Person, die allein oder gemeinsam mit anderen über die Zwecke
                und Mittel der Verarbeitung von personenbezogenen Daten
                entscheidet.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                3. Datenerfassung auf dieser Website
              </h2>
              <h3 className="text-lg font-semibold text-text mb-2">Cookies</h3>
              <p className="text-text-light leading-relaxed mb-4">
                Diese Website verwendet technisch notwendige Cookies, um die
                Funktionalität zu gewährleisten. Technisch notwendige Cookies
                werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO
                gespeichert. Der Websitebetreiber hat ein berechtigtes Interesse
                an der Speicherung von technisch notwendigen Cookies zur
                technisch fehlerfreien und optimierten Bereitstellung seiner
                Dienste. Sie können Ihren Browser so einstellen, dass Sie über
                das Setzen von Cookies informiert werden und Cookies nur im
                Einzelfall erlauben. Bei der Deaktivierung von Cookies kann die
                Funktionalität dieser Website eingeschränkt sein.
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Server-Log-Dateien
              </h3>
              <p className="text-text-light leading-relaxed mb-2">
                Der Provider dieser Seiten erhebt und speichert automatisch
                Informationen in sogenannten Server-Log-Dateien, die Ihr
                Browser automatisch übermittelt. Dies sind:
              </p>
              <ul className="list-disc ml-6 text-text-light space-y-1 mb-4">
                <li>Browsertyp und Browserversion</li>
                <li>Verwendetes Betriebssystem</li>
                <li>Referrer URL</li>
                <li>Hostname des zugreifenden Rechners</li>
                <li>Uhrzeit der Serveranfrage</li>
                <li>IP-Adresse</li>
              </ul>
              <p className="text-text-light leading-relaxed">
                Eine Zusammenführung dieser Daten mit anderen Datenquellen wird
                nicht vorgenommen. Die Erfassung dieser Daten erfolgt auf
                Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Der
                Websitebetreiber hat ein berechtigtes Interesse an der technisch
                fehlerfreien Darstellung und der Optimierung seiner Website –
                hierzu müssen die Server-Log-Files erfasst werden.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                4. Online-Formulare und Datenbank
              </h2>
              <p className="text-text-light leading-relaxed mb-4">
                Diese Website bietet Online-Formulare an, über die Schulen
                Anträge einreichen können (z.&thinsp;B. Tool-Lizenzen,
                studentische Hilfskräfte, Best-Practice-Dokumentationen). Die
                in den Formularen eingegebenen Daten werden über eine
                verschlüsselte Verbindung (HTTPS) an unseren
                Datenbank-Dienstleister Supabase übermittelt und dort
                gespeichert.
              </p>
              <h3 className="text-lg font-semibold text-text mb-2">
                Welche Daten werden erhoben?
              </h3>
              <ul className="list-disc ml-6 text-text-light space-y-1 mb-4">
                <li>Schulname und Schuladresse</li>
                <li>Name der Schulleitung und Kontaktperson</li>
                <li>E-Mail-Adresse und Telefonnummer</li>
                <li>Angaben zu Schülerzahl und Lehrkräften</li>
                <li>
                  Formularspezifische Angaben (z.&thinsp;B. gewünschte Tools,
                  Unterstützungsbereiche, Unterrichtserfahrungen)
                </li>
              </ul>
              <h3 className="text-lg font-semibold text-text mb-2">
                Zweck und Rechtsgrundlage
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Die Verarbeitung erfolgt zur Bearbeitung Ihres Antrags im
                Rahmen des DigiKI-Projekts auf Grundlage von Art. 6 Abs. 1
                lit. b DSGVO (Vertragserfüllung) bzw. Art. 6 Abs. 1 lit. a
                DSGVO (Einwilligung bei der Best-Practice-Veröffentlichung).
              </p>
              <h3 className="text-lg font-semibold text-text mb-2">
                Auftragsverarbeitung (Supabase)
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Die Daten werden bei Supabase Inc. gespeichert. Supabase
                verarbeitet die Daten ausschließlich in unserem Auftrag und
                gemäß unseren Weisungen. Die Server befinden sich in der EU
                (Frankfurt). Ein Auftragsverarbeitungsvertrag (AVV) gemäß
                Art. 28 DSGVO liegt vor.
              </p>
              <h3 className="text-lg font-semibold text-text mb-2">
                Speicherdauer
              </h3>
              <p className="text-text-light leading-relaxed">
                Die über die Formulare erhobenen Daten werden für die Dauer
                des DigiKI-Projekts gespeichert und nach Projektabschluss
                gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten
                bestehen.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                5. Externe Dienste und Links
              </h2>
              <p className="text-text-light leading-relaxed mb-4">
                Diese Website enthält Links zu externen Diensten, insbesondere:
              </p>
              <ul className="list-disc ml-6 text-text-light space-y-2 mb-4">
                <li>
                  <strong>Microsoft Forms</strong> für die
                  Online-Bestandsaufnahme. Für die Datenverarbeitung durch
                  Microsoft gelten die Datenschutzbestimmungen von Microsoft.
                </li>
              </ul>
              <p className="text-text-light leading-relaxed">
                Schriftarten werden lokal von dieser Website ausgeliefert
                (Self-Hosting). Es findet keine Verbindung zu externen
                Font-Servern statt.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                6. Ihre Rechte
              </h2>
              <p className="text-text-light leading-relaxed mb-4">
                Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen
                jederzeit das Recht auf unentgeltliche Auskunft über Ihre
                gespeicherten personenbezogenen Daten, deren Herkunft und
                Empfänger und den Zweck der Datenverarbeitung und ggf. ein
                Recht auf Berichtigung oder Löschung dieser Daten. Hierzu sowie
                zu weiteren Fragen zum Thema personenbezogene Daten können Sie
                sich jederzeit an uns wenden:
              </p>
              <p className="text-text-light">
                <a
                  href="mailto:krafft@osnabrueck.de"
                  className="text-primary-light underline"
                >
                  krafft@osnabrueck.de
                </a>
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                7. Recht auf Beschwerde
              </h2>
              <p className="text-text-light leading-relaxed">
                Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde
                über die Verarbeitung Ihrer personenbezogenen Daten zu
                beschweren. Die zuständige Aufsichtsbehörde ist die
                Landesbeauftragte für den Datenschutz Niedersachsen (LfD
                Niedersachsen), Prinzenstraße 5, 30159 Hannover.
              </p>
            </div>

            <div className="bg-teal/5 rounded-lg p-6 border border-teal/20">
              <p className="text-sm text-text-light">
                <strong className="text-text">Hinweis:</strong> Für eine
                vollständige DSGVO-Konformität empfehlen wir, diese
                Datenschutzerklärung durch den Datenschutzbeauftragten der Stadt
                Osnabrück prüfen und ggf. ergänzen zu lassen – insbesondere
                hinsichtlich des Hostings, etwaiger Analyse-Tools und der
                genauen Verarbeitungszwecke.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
