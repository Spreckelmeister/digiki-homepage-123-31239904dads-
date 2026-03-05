import type { Metadata } from "next";
import { Suspense } from "react";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Registrieren - Best Practice",
  description: "Erstellen Sie ein Konto, um auf die Best-Practice-Datenbank zuzugreifen.",
};

export default function RegisterPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Registrieren
          </h1>
          <p className="text-lg text-white/70">
            Erstellen Sie ein Konto, um auf die Best-Practice-Datenbank
            zuzugreifen.
          </p>
        </div>
      </section>

      {/* Register Form */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <Suspense fallback={
            <div className="bg-white rounded-xl p-8 shadow-sm border border-border text-center text-text-light">
              Wird geladen...
            </div>
          }>
            <RegisterForm />
          </Suspense>
        </div>
      </section>
    </>
  );
}
