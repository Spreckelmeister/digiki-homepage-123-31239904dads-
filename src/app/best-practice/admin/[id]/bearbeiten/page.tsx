import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BestPracticeForm from "@/components/best-practice/BestPracticeForm";
import BackButton from "@/components/BackButton";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("best_practices")
    .select("title")
    .eq("id", id)
    .single();

  return {
    title: data ? `${data.title} bearbeiten` : "Beitrag bearbeiten",
    robots: { index: false, follow: false },
  };
}

export default async function BearbeitenPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: practice } = await supabase
    .from("best_practices")
    .select("*, profiles(full_name), best_practice_categories(categories(*))")
    .eq("id", id)
    .single();

  if (!practice) notFound();

  return (
    <>
      {/* Hero – schlankere Variante der neu-Seite, gleiche Designsprache */}
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
          <BackButton
            fallbackHref="/best-practice/admin"
            fallbackLabel="Zurück zum Admin-Bereich"
            className="inline-flex items-center gap-1 text-sm text-white/70 transition-colors hover:text-white"
          />
          <div className="mt-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
              Best Practice · Bearbeiten
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
              {practice.title}
            </h1>
            <p className="mt-2 text-sm text-white/70">
              {practice.school_name}
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="bg-bg py-10 md:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <BestPracticeForm initialData={practice} />
        </div>
      </section>
    </>
  );
}
