import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  getBestandsaufnahmePrefill,
  getLockedFieldsFromPrefill,
} from "@/lib/bestandsaufnahme/getPrefill";
import ToolLicenseForm from "@/components/forms/ToolLicenseForm";
import BackButton from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Antrag bearbeiten – DigiKI",
};

// Kein Caching – Prefill aus der BSA soll auch hier immer aktuell sein.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ToolLizenzenBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/best-practice/login");
  }

  const { data: rpcData } = await supabase.rpc("get_my_submissions_full");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = rpcData as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record = result?.tool_apps?.find((app: any) => app.id === id) ?? null;

  if (!record || record.status !== "neu") {
    redirect("/best-practice/datenbank");
  }

  // BSA-Prefill + Locked-Felder, damit das Bearbeiten dieselben Komfort-
  // Features hat wie das ursprüngliche Einreichen (Schulname/Schulleitung/
  // Ansprechperson/Telefon aus der BSA gesperrt, E-Mail aus dem Konto).
  const prefill = await getBestandsaufnahmePrefill();
  const lockedFromBSA = getLockedFieldsFromPrefill(prefill);

  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <BackButton
            fallbackHref="/best-practice/datenbank"
            fallbackLabel="Zurück zu meinen Einreichungen"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors mb-4"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Antrag bearbeiten – Tool-Lizenzen
          </h1>
          <p className="text-lg text-white/70 mt-2">
            Aktualisieren Sie Ihre Angaben. Die Änderungen werden sofort gespeichert.
          </p>
        </div>
      </section>

      <section className="bg-bg py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <ToolLicenseForm
            editMode
            initialData={record}
            recordId={record.id}
            lockedEmail={user.email ?? ""}
            prefillFromBSA={prefill}
            lockedFromBSA={lockedFromBSA}
          />
        </div>
      </section>
    </>
  );
}
