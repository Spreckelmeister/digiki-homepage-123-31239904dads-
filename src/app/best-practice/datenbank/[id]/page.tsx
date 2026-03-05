import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, BookOpen, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import MarkdownContent from "@/components/best-practice/MarkdownContent";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("best_practices")
    .select("title, summary")
    .eq("id", id)
    .eq("published", true)
    .single();

  if (!data) return { title: "Nicht gefunden" };

  return {
    title: data.title,
    description: data.summary,
  };
}

export default async function BestPracticeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: practice } = await supabase
    .from("best_practices")
    .select("*, profiles(full_name), best_practice_categories(categories(*))")
    .eq("id", id)
    .eq("published", true)
    .single();

  if (!practice) notFound();

  const categories =
    practice.best_practice_categories?.map(
      (bpc: { categories: { id: string; name: string; slug: string } }) =>
        bpc.categories
    ) || [];

  const formattedDate = new Date(practice.created_at).toLocaleDateString(
    "de-DE",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <Link
                href="/best-practice/datenbank"
                className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Zurück zur Datenbank
              </Link>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                {practice.title}
              </h1>
            </div>
            <AuthStatus />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Metadata */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-border mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin
                  className="w-4 h-4 text-primary flex-shrink-0"
                  aria-hidden="true"
                />
                <span className="text-text-light">{practice.school_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen
                  className="w-4 h-4 text-primary flex-shrink-0"
                  aria-hidden="true"
                />
                <span className="text-text-light">
                  {practice.subject} &middot; Klasse {practice.grade_level}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar
                  className="w-4 h-4 text-primary flex-shrink-0"
                  aria-hidden="true"
                />
                <span className="text-text-light">{formattedDate}</span>
              </div>
              {practice.profiles && (
                <div className="text-text-light">
                  Von {practice.profiles.full_name}
                </div>
              )}
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map((cat: { id: string; name: string }) => (
                <span
                  key={cat.id}
                  className="inline-flex bg-primary/10 text-primary text-sm px-3 py-1 rounded-full"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          )}

          {/* Tools Used */}
          {practice.tools_used && practice.tools_used.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-8">
              <Wrench
                className="w-4 h-4 text-accent flex-shrink-0"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-text">
                Eingesetzte Tools:
              </span>
              {practice.tools_used.map((tool: string) => (
                <span
                  key={tool}
                  className="inline-flex bg-accent/10 text-accent text-sm px-2.5 py-0.5 rounded-full"
                >
                  {tool}
                </span>
              ))}
            </div>
          )}

          {/* Summary */}
          <div className="bg-bg rounded-xl p-6 mb-8">
            <p className="text-text-light leading-relaxed italic">
              {practice.summary}
            </p>
          </div>

          {/* Main Content */}
          <MarkdownContent content={practice.content} />

          {/* Back Link */}
          <div className="mt-12 pt-8 border-t border-border">
            <Link
              href="/best-practice/datenbank"
              className="inline-flex items-center gap-2 text-primary-light hover:text-primary transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Zurück zur Datenbank
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
