import type { Metadata } from "next";
import { Suspense } from "react";
import CodeForm from "./CodeForm";

export const metadata: Metadata = {
  title: "Code einlösen",
  description:
    "Geben Sie den 8-stelligen Bestätigungscode aus der DigiKI-E-Mail ein.",
  robots: { index: false, follow: false },
};

export default function CodeEinloesenPage() {
  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Bestätigungscode eingeben
          </h1>
          <p className="text-lg text-white/70">
            Falls der Bestätigungs-Link in der E-Mail nicht funktioniert, geben
            Sie hier den 6-stelligen Code ein.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <Suspense
            fallback={
              <div className="bg-white rounded-xl p-8 shadow-sm border border-border text-center text-text-light">
                Wird geladen...
              </div>
            }
          >
            <CodeForm />
          </Suspense>
        </div>
      </section>
    </>
  );
}
