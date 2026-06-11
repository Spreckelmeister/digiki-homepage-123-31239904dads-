import type { Metadata } from "next";
import { Suspense } from "react";
import ConfirmForm from "./ConfirmForm";

export const metadata: Metadata = {
  title: "Bestätigen – DigiKI",
  description: "Schließen Sie Ihre Bestätigung mit einem Klick ab.",
  robots: { index: false, follow: false },
};

export default function BestaetigenPage() {
  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">
            Bestätigung abschließen
          </h1>
          <p className="text-lg text-white/70">
            Nur noch ein Klick – Ihr Link ist gleich bestätigt.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <Suspense
            fallback={
              <div className="rounded-xl border border-border bg-white p-8 text-center text-text-light shadow-sm">
                Wird geladen …
              </div>
            }
          >
            <ConfirmForm />
          </Suspense>
        </div>
      </section>
    </>
  );
}
