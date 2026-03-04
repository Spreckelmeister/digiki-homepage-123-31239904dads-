import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Anmelden - Best Practice",
  description: "Melden Sie sich an, um auf die Best-Practice-Datenbank zuzugreifen.",
};

export default function LoginPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Anmelden
          </h1>
          <p className="text-lg text-blue-200">
            Melden Sie sich an, um auf die Best-Practice-Datenbank zuzugreifen.
          </p>
        </div>
      </section>

      {/* Login Form */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <Suspense fallback={
            <div className="bg-white rounded-xl p-8 shadow-sm border border-border text-center text-text-light">
              Wird geladen...
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </>
  );
}
