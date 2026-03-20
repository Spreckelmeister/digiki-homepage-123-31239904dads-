import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import BestandsaufnahmeForm, {
  type BestandsaufnahmeData,
} from "@/components/forms/BestandsaufnahmeForm";

export const metadata: Metadata = {
  title: "Bestandsaufnahme bearbeiten – DigiKI",
};

export default async function BestandsaufnahmeBearbeitenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/best-practice/login");
  }

  const { data: rpcData } = await supabase.rpc("get_my_bestandsaufnahme");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record = (rpcData as any) as (BestandsaufnahmeData & { id: string }) | null;

  if (!record) {
    redirect("/bestandsaufnahme");
  }

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Bestandsaufnahme bearbeiten
          </h1>
          <p className="text-text-light">
            Aktualisieren Sie Ihre Angaben jederzeit. Die Änderungen werden sofort gespeichert.
          </p>
        </div>
        <BestandsaufnahmeForm
          editMode
          initialData={record}
          recordId={record.id}
        />
      </div>
    </section>
  );
}
