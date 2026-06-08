import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Pencil, ShieldAlert } from "lucide-react";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import StudentAssistantForm from "@/components/forms/StudentAssistantForm";
import AuthStatus from "@/components/best-practice/AuthStatus";
import AdminNav from "@/components/best-practice/AdminNav";
import BackButton from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Antrag bearbeiten (Admin) – Hilfskräfte",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  neu: "Neu",
  in_bearbeitung: "In Bearbeitung",
  genehmigt: "Genehmigt",
  abgelehnt: "Abgelehnt",
};

export default async function AdminHilfskraefteBearbeitenPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth + Admin-Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/best-practice/login");
  }
  const profile = await getCurrentProfile();
  if (profile?.role?.toLowerCase() !== "admin") {
    redirect("/best-practice/datenbank");
  }

  // Datensatz via Service-Role laden (umgeht RLS)
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    notFound();
  }
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: record } = await admin
    .from("applications_student_assistants")
    .select("*")
    .eq("id", id)
    .single();

  if (!record) notFound();

  const statusLabel = STATUS_LABEL[record.status] ?? record.status;
  const isNonNeuStatus = record.status !== "neu";

  return (
    <>
      {/* Hero – editorial wie die anderen Admin-Seiten */}
      <section className="relative overflow-hidden bg-primary py-10 md:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #ffffff 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, #ffffff 0 1px, transparent 1px 28px)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-32 h-72 w-72 rounded-full bg-primary-light/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <BackButton
                fallbackHref={`/best-practice/admin/antraege/hilfskraefte/${id}`}
                fallbackLabel="Zurück zum Antrag"
                className="inline-flex items-center gap-1 text-sm text-white/70 transition-colors hover:text-white"
              />
              <p className="mt-6 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
                <Pencil className="h-3 w-3" aria-hidden="true" />
                Admin · Antrag bearbeiten
              </p>
              <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-white md:text-3xl">
                Studentische Hilfskräfte
              </h1>
              <p className="mt-1 text-sm text-white/70">
                {record.school_name}
              </p>
              <AdminNav />
            </div>
            <AuthStatus initialProfile={profile} />
          </div>
        </div>
      </section>

      {/* Status-Warnung wenn Antrag nicht mehr "neu" ist */}
      <section className="bg-bg pt-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {isNonNeuStatus && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-xl border border-accent-strong/30 bg-accent/10 p-4 text-sm text-text shadow-sm"
            >
              <ShieldAlert
                className="mt-0.5 h-5 w-5 shrink-0 text-accent-strong"
                aria-hidden="true"
              />
              <div>
                <p className="font-bold text-accent-strong">
                  Antrag mit Status „{statusLabel}"
                </p>
                <p className="mt-0.5 text-text-light">
                  Sie bearbeiten als Admin einen Antrag, der nicht mehr im
                  Status „Neu" ist. Änderungen werden direkt gespeichert –
                  bitte mit Bedacht, da die Schule den Antrag bereits
                  abgeschlossen geglaubt hat.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Form */}
      <section className="bg-bg pb-10 md:pb-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <StudentAssistantForm
            editMode
            initialData={record}
            recordId={record.id}
          />
        </div>
      </section>
    </>
  );
}
