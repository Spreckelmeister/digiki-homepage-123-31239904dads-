import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Erklärung zur Barrierefreiheit",
  description:
    "Erklärung zur Barrierefreiheit der DigiKI-Projektwebsite gemäß § 12b Niedersächsischem Behindertengleichstellungsgesetz (NBGG) und BITV 2.0.",
  alternates: { canonical: "/barrierefreiheit" },
};

export default function BarrierefreiheitPage() {
  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Erklärung zur Barrierefreiheit
          </h1>
          <p className="text-lg text-white/90 mt-2 max-w-3xl">
            nach § 12b Niedersächsisches Behindertengleichstellungsgesetz (NBGG)
            und Barrierefreie-Informationstechnik-Verordnung 2.0 (BITV 2.0)
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-border space-y-10">

            {/* 1. Geltungsbereich */}
            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                1. Geltungsbereich
              </h2>
              <p className="text-text-light leading-relaxed mb-3">
                Die Stadt Osnabrück ist als Trägerin des Projekts
                „DigiKI Osnabrück – Digitalisierung &amp; Künstliche Intelligenz
                an Grundschulen" bemüht, ihre Webseite im Einklang mit den
                Bestimmungen des <strong>§ 12b Niedersächsisches
                Behindertengleichstellungsgesetz (NBGG)</strong> und der{" "}
                <strong>Barrierefreien-Informationstechnik-Verordnung
                (BITV 2.0)</strong> – Umsetzung der EU-Richtlinie 2016/2102 –
                barrierefrei zugänglich zu machen.
              </p>
              <p className="text-text-light leading-relaxed">
                Diese Erklärung gilt für die Website{" "}
                <strong>www.digiki-os.de</strong> sowie alle darunter
                erreichbaren Unterseiten.
              </p>
            </div>

            {/* 2. Stand der Vereinbarkeit */}
            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                2. Stand der Vereinbarkeit mit den Anforderungen
              </h2>
              <p className="text-text-light leading-relaxed mb-3">
                Die Website ist aufgrund der nachfolgend aufgeführten
                Unvereinbarkeiten <strong>teilweise vereinbar</strong> mit den
                Anforderungen der BITV 2.0 bzw. den Erfolgskriterien der
                Web Content Accessibility Guidelines (WCAG) 2.1 auf
                Konformitätsstufe AA.
              </p>
              <p className="text-text-light leading-relaxed">
                Es werden kontinuierlich Maßnahmen zur Verbesserung der
                Barrierefreiheit durchgeführt.
              </p>
            </div>

            {/* 3. Nicht barrierefreie Inhalte */}
            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                3. Nicht barrierefreie Inhalte
              </h2>

              <h3 className="text-lg font-semibold text-text mt-4 mb-2">
                a) Noch nicht vollständig barrierefrei
              </h3>
              <ul className="list-disc ml-6 text-text-light leading-relaxed space-y-2 mb-4">
                <li>
                  Eine <strong>umfassende externe Prüfung</strong> der
                  Webseite nach dem BITV-Prüfverfahren durch eine anerkannte
                  Prüfstelle ist derzeit noch nicht erfolgt; sie ist für das
                  Jahr 2026 vorgesehen. Bis dahin stützen wir uns auf
                  interne Selbstbewertungen mittels automatisierter
                  Prüfwerkzeuge und manueller Stichproben.
                </li>
                <li>
                  Nutzer-generierte Inhalte aus der{" "}
                  <strong>Best-Practice-Datenbank</strong> (von Lehrkräften
                  eingereichte Unterrichtsbeispiele) werden redaktionell
                  geprüft, können aber im Einzelfall Texte ohne
                  Absatz-Sprachauszeichnung für anderssprachige Zitate oder
                  Abbildungen ohne ausführliche Alternativtexte enthalten.
                  Auf Anfrage liefern wir barrierefreie Alternativen.
                </li>
                <li>
                  Einzelne technische Fachbegriffe in anderen Sprachen
                  (z.&thinsp;B. „Best Practice", „Tool", „KI") sind im
                  Quelltext derzeit nicht mit{" "}
                  <code className="font-mono text-sm">lang</code>-Attributen
                  gekennzeichnet.
                </li>
              </ul>

              <h3 className="text-lg font-semibold text-text mt-6 mb-2">
                b) Inhalte, die nicht in den Anwendungsbereich fallen
              </h3>
              <ul className="list-disc ml-6 text-text-light leading-relaxed space-y-2">
                <li>
                  <strong>Eingebettete Drittanbieter-Inhalte:</strong>{" "}
                  Verlinkte Microsoft-Teams-Konferenzen für
                  Informationsveranstaltungen werden auf Microsoft-Servern
                  bereitgestellt. Ihre Barrierefreiheit liegt außerhalb
                  unseres Einflussbereichs und unterliegt der{" "}
                  <a
                    href="https://www.microsoft.com/de-de/accessibility"
                    className="text-primary underline hover:text-primary/80"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Barrierefreiheitserklärung von Microsoft
                  </a>
                  .
                </li>
                <li>
                  Die Registrierungs- und Login-Formulare für den
                  Best-Practice-Bereich nutzen den
                  Authentifizierungs-Dienst <strong>Supabase Auth</strong>.
                  Die dort versendeten E-Mails folgen unseren angepassten
                  HTML-Templates und sind bemüht, barrierefrei zu sein.
                </li>
                <li>
                  Archivierte, zeitlich abgeschlossene Informationen (z.&thinsp;B.
                  vergangene Veranstaltungstermine) unterliegen nach BITV 2.0
                  ggf. dem Bestandsschutz und werden nicht rückwirkend
                  angepasst.
                </li>
              </ul>
            </div>

            {/* 4. Umgesetzte Maßnahmen */}
            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                4. Umgesetzte Maßnahmen zur Barrierefreiheit
              </h2>
              <p className="text-text-light leading-relaxed mb-3">
                Folgende technische und gestalterische Maßnahmen unterstützen
                die Barrierefreiheit dieser Website:
              </p>
              <ul className="list-disc ml-6 text-text-light leading-relaxed space-y-1.5">
                <li>
                  Semantisches HTML5 mit klarer Gliederung durch Landmarken
                  (<code className="font-mono text-sm">header</code>,{" "}
                  <code className="font-mono text-sm">nav</code>,{" "}
                  <code className="font-mono text-sm">main</code>,{" "}
                  <code className="font-mono text-sm">footer</code>)
                </li>
                <li>
                  <strong>Skip-Link</strong> zum direkten Sprung zum Hauptinhalt
                  bei Tastaturbedienung
                </li>
                <li>
                  Durchgängig <strong>sichtbare Fokus-Indikatoren</strong>{" "}
                  (3&thinsp;px farblich abgehobene Umrandung) für alle
                  interaktiven Elemente
                </li>
                <li>
                  Respektierung der Benutzer-Einstellung{" "}
                  <code className="font-mono text-sm">
                    prefers-reduced-motion
                  </code>{" "}
                  – Animationen werden deaktiviert, wenn im Betriebssystem
                  „Bewegung reduzieren" aktiviert ist
                </li>
                <li>
                  Alle Formulare mit{" "}
                  <code className="font-mono text-sm">label</code>-Zuordnung,{" "}
                  <code className="font-mono text-sm">autocomplete</code>{" "}
                  für gängige Felder (E-Mail, Passwort, Name, Telefon) und
                  Fehlermeldungen mit{" "}
                  <code className="font-mono text-sm">role="alert"</code>
                </li>
                <li>
                  Modale Dialoge mit Fokus-Trapping,
                  <code className="font-mono text-sm"> role="dialog"</code>,
                  ESC-Taste zum Schließen und Rückführung des Fokus zum
                  Auslöser
                </li>
                <li>
                  <strong>ARIA-Live-Regionen</strong> für dynamische
                  Statusänderungen nach Formular-Übermittlung
                </li>
                <li>
                  Navigation mit{" "}
                  <code className="font-mono text-sm">aria-current="page"</code>{" "}
                  zur Kennzeichnung der aktuellen Seite
                </li>
                <li>
                  Farbkontraste entsprechend WCAG 2.1 AA (Verhältnis
                  mindestens 4,5:1 für Fließtext, 3:1 für große Schrift)
                </li>
                <li>
                  Responsives Layout, das bis zu 200&thinsp;% Zoom ohne
                  Informationsverlust skaliert
                </li>
                <li>
                  Aussagekräftige Alt-Texte für inhaltstragende Bilder;
                  dekorative Bilder mit{" "}
                  <code className="font-mono text-sm">aria-hidden</code>
                </li>
                <li>
                  Seitenweites{" "}
                  <code className="font-mono text-sm">lang="de"</code>-Attribut
                </li>
              </ul>
            </div>

            {/* 5. Erstellung dieser Erklärung */}
            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                5. Erstellung dieser Erklärung
              </h2>
              <p className="text-text-light leading-relaxed mb-3">
                Diese Erklärung wurde am{" "}
                <strong>22. April 2026</strong> erstellt und zuletzt am{" "}
                <strong>22. April 2026</strong> überprüft.
              </p>
              <p className="text-text-light leading-relaxed">
                Die Erklärung basiert auf einer{" "}
                <strong>Selbstbewertung</strong> mittels automatisierter
                Werkzeuge (Google Lighthouse Accessibility, accessibilitychecker.org,
                Browser-DevTools Accessibility Tree) sowie manuellen Stichproben
                für Tastaturbedienung und Screenreader-Ausgabe. Eine formale
                Prüfung durch eine externe Stelle ist für 2026 geplant.
              </p>
            </div>

            {/* 6. Feedback */}
            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                6. Feedback und Kontaktangaben
              </h2>
              <p className="text-text-light leading-relaxed mb-4">
                Sind Ihnen Mängel beim barrierefreien Zugang zu Inhalten
                dieser Website aufgefallen? Benötigen Sie Informationen in einem
                barrierefreien Format? Wir freuen uns über Rückmeldungen und
                nehmen Ihr Anliegen ernst. Bitte wenden Sie sich an:
              </p>
              <address className="text-text-light not-italic leading-relaxed bg-bg rounded-lg border border-border p-5 break-words">
                <p className="font-semibold text-primary">Kai Krafft</p>
                <p>Bildungskoordinator im Fachbereich 40-3 Bildung</p>
                <p>Stadt Osnabrück</p>
                <p>Bierstraße 20, 49074 Osnabrück</p>
                <p className="mt-3">
                  E-Mail:{" "}
                  <a
                    href="mailto:krafft@osnabrueck.de"
                    className="text-primary underline hover:text-primary/80 break-all"
                  >
                    krafft@osnabrueck.de
                  </a>
                </p>
              </address>
              <p className="text-text-light leading-relaxed mt-4">
                Wir bemühen uns, gemeldete Barrieren zeitnah zu beheben. Bitte
                geben Sie in Ihrer Nachricht möglichst die konkrete Seite oder
                Funktion an, bei der die Barriere aufgetreten ist, sowie nach
                Möglichkeit die von Ihnen genutzte Unterstützungstechnologie
                (z.&thinsp;B. Screenreader, Vergrößerungssoftware).
              </p>
            </div>

            {/* 7. Durchsetzungsverfahren */}
            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                7. Schlichtungsverfahren
              </h2>
              <p className="text-text-light leading-relaxed mb-4">
                Wenn auch nach Ihrem Feedback an die oben genannten
                Kontaktpersonen keine zufriedenstellende Lösung gefunden wurde,
                können Sie sich nach § 12c NBGG an die Schlichtungsstelle beim
                Landesbeauftragten für Menschen mit Behinderungen in
                Niedersachsen wenden. Die Schlichtungsstelle hat die Aufgabe,
                bei Konflikten zwischen Menschen mit Behinderungen und
                öffentlichen Stellen des Landes eine gütliche Einigung
                herbeizuführen. Das Schlichtungsverfahren ist kostenlos.
              </p>
              <address className="text-text-light not-italic leading-relaxed bg-bg rounded-lg border border-border p-5 break-words">
                <p className="font-semibold text-primary">
                  Landesbeauftragter für Menschen mit Behinderungen in
                  Niedersachsen – Schlichtungsstelle
                </p>
                <p>Niedersächsisches Ministerium für Soziales, Arbeit,</p>
                <p>Gesundheit und Gleichstellung</p>
                <p>Hannah-Arendt-Platz 2</p>
                <p>30159 Hannover</p>
                <p className="mt-3">Telefon: 0511 120-4006</p>
                <p className="mt-1">
                  E-Mail:{" "}
                  <a
                    href="mailto:behindertenbeauftragte@ms.niedersachsen.de"
                    className="text-primary underline hover:text-primary/80 break-all"
                  >
                    behindertenbeauftragte@ms.niedersachsen.de
                  </a>
                </p>
                <p className="mt-1">
                  Web:{" "}
                  <a
                    href="https://www.behindertenbeauftragte.niedersachsen.de"
                    className="text-primary underline hover:text-primary/80 break-all"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    www.behindertenbeauftragte.niedersachsen.de
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
