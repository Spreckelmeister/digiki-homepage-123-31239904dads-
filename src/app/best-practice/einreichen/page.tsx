import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getBestandsaufnahmePrefill,
  getLockedFieldsFromPrefill,
} from "@/lib/bestandsaufnahme/getPrefill";
import BestPracticeVorlageForm from "@/components/forms/BestPracticeVorlageForm";
import BackButton from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Best Practice einreichen - DigiKI",
  description:
    "Dokumentieren Sie Ihre Unterrichtserfahrungen mit digitalen Tools und KI und teilen Sie sie mit anderen Grundschulen.",
  alternates: { canonical: "/best-practice/einreichen" },
};

// Kein Caching – Prefill aus der BSA soll immer aktuell sein.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_PATH = "/best-practice/einreichen";

export default async function BestPracticeEinreichenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/best-practice/login?redirect=${encodeURIComponent(PAGE_PATH)}`);
  }

  // BSA-Prefill für Schulname + Kontaktperson – konsistent mit den
  // Antragsformularen.
  const prefill = await getBestandsaufnahmePrefill();
  const lockedFromBSA = getLockedFieldsFromPrefill(prefill);

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <BackButton
            fallbackHref="/best-practice"
            fallbackLabel="Zurück zu Best Practice"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors mb-4"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Best Practice einreichen
          </h1>
          <p className="text-lg text-white/70 mt-2">
            Dokumentieren Sie Ihre Unterrichtserfahrungen mit digitalen Tools
            und KI.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="bg-bg py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <BestPracticeVorlageForm
            lockedEmail={user.email ?? ""}
            prefillFromBSA={
              prefill
                ? {
                    school_name: prefill.school_name,
                    contact_person: prefill.contact_person,
                  }
                : null
            }
            lockedFromBSA={lockedFromBSA}
          />
        </div>
      </section>
    </>
  );
}
