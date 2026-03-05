import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import BestPracticeList from "@/components/best-practice/BestPracticeList";

export const metadata: Metadata = {
  title: "Best-Practice-Datenbank",
  description: "Durchsuchen Sie erprobte Unterrichtsbeispiele mit digitalen Tools und KI an Grundschulen.",
};

export default async function DatenbankPage() {
  const supabase = await createClient();

  const { data: practices } = await supabase
    .from("best_practices")
    .select("*, profiles(full_name), best_practice_categories(categories(*))")
    .eq("published", true)
    .order("created_at", { ascending: false });

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Best-Practice-Datenbank
              </h1>
              <p className="text-lg text-white/70">
                Erprobte Unterrichtsbeispiele mit digitalen Tools und KI.
              </p>
            </div>
            <AuthStatus />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <BestPracticeList
            practices={practices || []}
            categories={categories || []}
          />
        </div>
      </section>
    </>
  );
}
