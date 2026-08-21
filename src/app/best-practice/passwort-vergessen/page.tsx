import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Passwort vergessen – Best Practice",
  description:
    "Setzen Sie Ihr Passwort zurück. Wir schicken Ihnen einen Code per E-Mail.",
  robots: { index: false, follow: false },
};

export default function PastwortVergessenPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/best-practice/login"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Zurück zur Anmeldung
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Passwort vergessen
          </h1>
          <p className="text-lg text-white/70">
            Wir schicken Ihnen einen Code, mit dem Sie hier direkt ein neues
            Passwort festlegen können.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
          <ForgotPasswordForm />
        </div>
      </section>
    </>
  );
}
