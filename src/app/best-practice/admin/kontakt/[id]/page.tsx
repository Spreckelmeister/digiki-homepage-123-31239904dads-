import { notFound } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import AdminNav from "@/components/best-practice/AdminNav";
import BackButton from "@/components/BackButton";
import ContactRequestManager from "@/components/best-practice/ContactRequestManager";
import { FieldDisplay } from "@/components/best-practice/ApplicationDetail";
import type { ContactRequest } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

const FMT_DATE_TIME = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("contact_requests")
    .select("name")
    .eq("id", id)
    .single();

  if (!data)
    return { title: "Nicht gefunden", robots: { index: false, follow: false } };
  return {
    title: `Kontaktanfrage: ${data.name} - Admin`,
    robots: { index: false, follow: false },
  };
}

export default async function KontaktDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data } = await supabase
    .from("contact_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const req = data as ContactRequest;

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <BackButton
                fallbackHref="/best-practice/admin/kontakt"
                fallbackLabel="Zurück zu Kontaktanfragen"
                className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors mb-4"
              />
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Kontaktanfrage
              </h1>
              <p className="text-lg text-white/70 mt-1">
                {req.name}
                {req.school_name ? ` · ${req.school_name}` : ""}
              </p>
              <AdminNav />
            </div>
            <AuthStatus initialProfile={profile} />
          </div>
        </div>
      </section>

      {/* Detail */}
      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <ContactRequestManager
              id={req.id}
              status={req.status}
              adminNotes={req.admin_notes}
              email={req.email}
              topic={req.topic}
            />

            {/* Nachricht */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-primary">
                  Nachricht
                </h2>
                {req.topic && (
                  <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {req.topic}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text">
                {req.message}
              </p>
            </div>

            {/* Absender:in */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
              <h2 className="text-lg font-semibold text-primary mb-4">
                Absender:in
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldDisplay label="Name" value={req.name} />
                <div>
                  <dt className="text-xs font-medium text-text-light uppercase tracking-wider">
                    E-Mail
                  </dt>
                  <dd className="mt-1 text-sm text-text">
                    <a
                      href={`mailto:${req.email}`}
                      className="text-primary underline underline-offset-2 hover:text-primary/80 break-all"
                    >
                      {req.email}
                    </a>
                  </dd>
                </div>
                <FieldDisplay label="Schule" value={req.school_name} />
                <FieldDisplay
                  label="Eingegangen am"
                  value={FMT_DATE_TIME.format(new Date(req.created_at))}
                />
              </dl>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
