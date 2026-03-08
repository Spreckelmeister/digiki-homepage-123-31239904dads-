import type { Metadata } from "next";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Neues Passwort festlegen – Best Practice",
  description: "Legen Sie ein neues Passwort für Ihr DigiKI-Konto fest.",
};

export default function PasswortZuruecksetzenPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Neues Passwort festlegen
          </h1>
          <p className="text-lg text-white/70">
            Wählen Sie ein neues Passwort für Ihr Konto.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
          <ResetPasswordForm />
        </div>
      </section>
    </>
  );
}
