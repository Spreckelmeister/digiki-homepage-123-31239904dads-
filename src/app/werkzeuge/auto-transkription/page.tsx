import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Auto-Transkription – Wartung",
  description:
    "Auto-Transkription ist derzeit in Wartung. Bitte verwenden Sie andere verfügbare Werkzeuge.",
  alternates: { canonical: "/werkzeuge/auto-transkription" },
};

export default function Page() {
  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Diktiergerät & Transkription
          </h1>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-border">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                <span className="text-2xl">⚙️</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text mb-2">
                  Derzeit in Wartung
                </h2>
                <p className="text-text-light leading-relaxed">
                  Das Auto-Transkription Tool wird momentan überarbeitet. Wir arbeiten daran, die Spracherkennung zuverlässiger zu machen und in Kürze neu zur Verfügung zu stellen.
                </p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-text-light mb-3">
                <strong>Alternative Werkzeuge:</strong>
              </p>
              <ul className="space-y-2 text-sm text-text-light">
                <li>
                  • <strong>Arbeitsblatt-Scanner:</strong> Text aus Bildern und PDFs extrahieren
                </li>
                <li>
                  • <strong>Video-Untertitel:</strong> Automatische Untertitel für Videos erstellen
                </li>
                <li>
                  • <strong>Text-Differenzierer:</strong> Komplexe Texte vereinfachen
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <a
                href="/werkzeuge"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
              >
                ← Zurück zu allen Werkzeugen
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
