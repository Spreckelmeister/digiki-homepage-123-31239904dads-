import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen Schulungsmaterial - DigiKI",
  description:
    "Nutzungsbedingungen für das Schulungsmaterial von DigiKI: nur zur Ansicht, keine Kopien, Protokollierung der Zugriffe.",
  alternates: { canonical: "/schulungsmaterial/nutzungsbedingungen" },
};

const SECTIONS: { title: string; paragraphs: string[]; list?: string[] }[] = [
  {
    title: "1. Geltungsbereich",
    paragraphs: [
      "Diese Nutzungsbedingungen gelten für alle Unterlagen im Bereich „Schulungsmaterial“ dieser Website (Lerneinheiten, Videos, Audiodateien, Dokumente und Bilder). Mit dem Öffnen einer Unterlage erkennen Sie diese Bedingungen an.",
    ],
  },
  {
    title: "2. Wer das Material nutzen darf",
    paragraphs: [
      "Der Zugang wird einer Schule über ihr DigiKI-Konto eingeräumt. Nutzen dürfen das Material ausschließlich die Lehrkräfte und pädagogischen Mitarbeitenden dieser Schule, und zwar für ihre eigene Fortbildung.",
      "Die Zugangsdaten sind vertraulich zu behandeln. Sie dürfen nicht an Personen außerhalb der Schule weitergegeben werden.",
    ],
  },
  {
    title: "3. Nur zur Ansicht",
    paragraphs: [
      "Das Material ist urheberrechtlich geschützt. Es wird ausschließlich zur Ansicht im Browser bereitgestellt. Ein Recht zum Herunterladen, Vervielfältigen oder Weitergeben besteht nicht.",
      "Untersagt ist insbesondere:",
    ],
    list: [
      "das Kopieren, Speichern oder Herunterladen der Unterlagen oder von Teilen daraus,",
      "das Abfotografieren sowie das Anfertigen von Bildschirmfotos und Bildschirmaufnahmen,",
      "die Weitergabe von Unterlagen, Kopien, Links oder Zugangsdaten an Dritte,",
      "das Veröffentlichen der Unterlagen oder von Teilen daraus, auch in geschlossenen Gruppen oder Lernplattformen,",
      "das Umgehen technischer Schutzmaßnahmen und das automatisierte Abrufen der Unterlagen,",
      "das Verwenden der Unterlagen zum Training von KI-Systemen.",
    ],
  },
  {
    title: "4. Protokollierung der Zugriffe",
    paragraphs: [
      "Jeder Zugriff auf eine Unterlage wird protokolliert. Gespeichert werden das Konto, die geöffnete Unterlage bzw. Einheit und der Zeitpunkt. Aufrufe außerhalb der vorgesehenen Ansicht (zum Beispiel das direkte Öffnen eines Links) werden als solche vermerkt. IP-Adressen werden in diesem Protokoll nicht gespeichert.",
      "Das Protokoll dient dazu, eine unerlaubte Weitergabe nachvollziehen zu können. Die Einträge werden nach 90 Tagen gelöscht, soweit sie nicht zur Klärung eines konkreten Verstoßes weiter benötigt werden.",
    ],
  },
  {
    title: "5. Kennzeichnung der Unterlagen",
    paragraphs: [
      "Die Unterlagen werden beim Ausliefern mit dem abrufenden Konto gekennzeichnet – sichtbar (Name und Schule in der Ansicht) und unsichtbar (im Dokument und im Bild hinterlegte Kennung). Kopien, Bildschirmfotos und weitergegebene Links lassen sich dadurch dem Konto zuordnen, über das sie entstanden sind.",
    ],
  },
  {
    title: "6. Folgen bei Verstößen",
    paragraphs: [
      "Bei einem Verstoß gegen diese Bedingungen kann der Zugang der Schule zum Schulungsmaterial ohne Vorankündigung gesperrt werden. Die Geltendmachung weiterer Ansprüche, insbesondere auf Unterlassung und Schadensersatz, bleibt vorbehalten.",
    ],
  },
  {
    title: "7. Änderungen",
    paragraphs: [
      "Diese Bedingungen können angepasst werden. Es gilt die Fassung, die beim Öffnen einer Unterlage auf dieser Seite veröffentlicht ist.",
    ],
  },
];

export default function MaterialTermsPage() {
  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Nutzungsbedingungen für das Schulungsmaterial
          </h1>
          <p className="text-lg text-white/90 mt-2 max-w-3xl">
            Nur zur Ansicht für das Kollegium Ihrer Schule – Kopieren,
            Fotografieren und Weitergeben sind untersagt.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-border space-y-10">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="text-xl font-bold text-primary mb-4">{section.title}</h2>
                <div className="space-y-3 text-text leading-relaxed">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.list && (
                    <ul className="list-disc space-y-2 pl-6">
                      {section.list.map((entry) => (
                        <li key={entry}>{entry}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
            <p className="text-sm text-text-light">
              Stand: November 2026. Hinweise zur Verarbeitung personenbezogener
              Daten finden Sie in der{" "}
              <Link href="/datenschutz" className="text-primary underline underline-offset-2">
                Datenschutzerklärung
              </Link>
              .
            </p>
          </div>
          <p className="mt-8">
            <Link
              href="/schulungsmaterial"
              className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Zurück zum Schulungsmaterial
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
