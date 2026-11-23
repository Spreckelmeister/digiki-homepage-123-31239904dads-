import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MaterialRegisterForm from "@/components/material/MaterialRegisterForm";

export const metadata: Metadata = {
  title: "Zugang zum Schulungsmaterial - DigiKI",
  description:
    "Legen Sie für Ihre Schule einen Zugang zum DigiKI-Schulungsmaterial an.",
  alternates: { canonical: "/schulungsmaterial/registrieren" },
};

export default async function MaterialRegistrierenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/schulungsmaterial");

  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Zugang zum Schulungsmaterial
          </h1>
          <p className="text-lg text-white/70 max-w-3xl">
            Legen Sie für Ihre Schule einen Zugang an. Eine Bestandsaufnahme
            ist dafür nicht nötig.
          </p>
        </div>
      </section>

      <section className="bg-bg py-12 md:py-16">
        <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
          <MaterialRegisterForm />
        </div>
      </section>
    </>
  );
}
