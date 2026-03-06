import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import BestPracticeForm from "@/components/best-practice/BestPracticeForm";

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
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/best-practice/admin"
            className="inline-flex items-center gap-1 text-sm text-blue-200 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Zurück zum Admin-Bereich
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Beitrag bearbeiten
          </h1>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <BestPracticeForm initialData={practice} />
        </div>
      </section>
    </>
  );
}
