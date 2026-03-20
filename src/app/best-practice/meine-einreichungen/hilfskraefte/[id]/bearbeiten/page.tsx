import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import StudentAssistantForm from "@/components/forms/StudentAssistantForm";

export const metadata: Metadata = {
  title: "Antrag bearbeiten – DigiKI",
};

export default async function HilfskraefteBearbeitenPage({
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
  const record = result?.student_apps?.find((app: any) => app.id === id) ?? null;

  if (!record || record.status !== "neu") {
    redirect("/best-practice/datenbank");
  }

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Antrag bearbeiten – Studentische Hilfskräfte
          </h1>
          <p className="text-text-light">
            Aktualisieren Sie Ihre Angaben jederzeit. Die Änderungen werden sofort gespeichert.
          </p>
        </div>
        <StudentAssistantForm
          editMode
          initialData={record}
          recordId={record.id}
        />
      </div>
    </section>
  );
}
