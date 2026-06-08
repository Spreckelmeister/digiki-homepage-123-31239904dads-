import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getBestandsaufnahmePrefill,
  getLockedFieldsFromPrefill,
} from "@/lib/bestandsaufnahme/getPrefill";
import StudentAssistantForm from "@/components/forms/StudentAssistantForm";
import BackButton from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Antrag: Studentische Hilfskräfte - DigiKI",
  description:
    "Beantragen Sie studentische Unterstützung bei der Einrichtung digitaler Tools an Ihrer Grundschule.",
  alternates: { canonical: "/fuer-schulen/antrag-hilfskraefte" },
};

// Kein Caching – Prefill aus der BSA soll immer aktuell sein.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_PATH = "/fuer-schulen/antrag-hilfskraefte";

export default async function AntragHilfskraeftePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/best-practice/login?redirect=${encodeURIComponent(PAGE_PATH)}`);
  }

  const prefill = await getBestandsaufnahmePrefill();
  const lockedFromBSA = getLockedFieldsFromPrefill(prefill);

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <BackButton
            fallbackHref="/best-practice/datenbank"
            fallbackLabel="Zurück zu meinen Einreichungen"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors mb-4"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Antrag: Studentische Hilfskräfte
          </h1>
          <p className="text-lg text-white/70 mt-2">
            Beantragen Sie kostenlose studentische Unterstützung bei der
            Einrichtung digitaler Tools.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="bg-bg py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <StudentAssistantForm
            lockedEmail={user.email ?? ""}
            prefillFromBSA={prefill}
            lockedFromBSA={lockedFromBSA}
          />
        </div>
      </section>
    </>
  );
}
