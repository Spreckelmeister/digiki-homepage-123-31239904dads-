import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getBestandsaufnahmePrefill,
  getLockedFieldsFromPrefill,
} from "@/lib/bestandsaufnahme/getPrefill";
import ToolLicenseForm from "@/components/forms/ToolLicenseForm";
import BackButton from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Antrag: Tool-Lizenzen - DigiKI",
  description:
    "Beantragen Sie kostenlose Tool-Lizenzen für Ihre Grundschule im Rahmen des DigiKI-Projekts.",
  alternates: { canonical: "/fuer-schulen/antrag-tool-lizenzen" },
};

const PAGE_PATH = "/fuer-schulen/antrag-tool-lizenzen";

export default async function AntragToolLizenzenPage() {
  // Auth-Guard: Einreichungen nur für angemeldete Nutzer:innen.
  // Beim Login wird hierher zurückgeleitet (?redirect=…).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/best-practice/login?redirect=${encodeURIComponent(PAGE_PATH)}`);
  }

  // Auto-fill aus der jüngsten Bestandsaufnahme dieser Schule – damit
  // Schulname, Schulleitung, Ansprechperson, Telefon und Lehrkräfte-Zahl
  // konsistent sind und nicht erneut eingegeben werden müssen.
  const prefill = await getBestandsaufnahmePrefill(user.id);
  const lockedFromBSA = getLockedFieldsFromPrefill(prefill);

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <BackButton
            fallbackHref="/fuer-schulen"
            fallbackLabel="Zurück zu Für Schulen"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors mb-4"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Antrag: Kostenlose Tool-Lizenzen
          </h1>
          <p className="text-lg text-white/70 mt-2">
            Beantragen Sie stiftungsfinanzierte Lizenzen für DSGVO-konforme
            Lern-Tools.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <ToolLicenseForm
            lockedEmail={user.email ?? ""}
            prefillFromBSA={prefill}
            lockedFromBSA={lockedFromBSA}
          />
        </div>
      </section>
    </>
  );
}
