import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
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
          <p className="text-lg text-white/70">
            Melden Sie sich an, um auf die Best-Practice-Datenbank zuzugreifen.
          </p>
        </div>
      </section>

      {/* Login Form */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="hidden lg:block">
              <Image
                src="/images/icons/istockphoto-1360857826-1024x1024.jpg"
                alt="Kinder lernen mit digitalen Tools"
                width={500}
                height={400}
                className="rounded-2xl shadow-lg object-cover w-full h-[400px]"
              />
              <p className="mt-4 text-sm text-text-light text-center">
                Digitale Tools und KI im Grundschulunterricht entdecken
              </p>
            </div>
            <div className="max-w-md mx-auto w-full">
              <Suspense fallback={
                <div className="bg-white rounded-xl p-8 shadow-sm border border-border text-center text-text-light">
                  Wird geladen...
                </div>
              }>
                <LoginForm />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
