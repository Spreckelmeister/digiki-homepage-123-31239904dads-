import type { Metadata } from "next";
import Link from "next/link";
import { Plus, FileText, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import AdminNav from "@/components/best-practice/AdminNav";
import AdminTable from "@/components/best-practice/AdminTable";

export const metadata: Metadata = {
  title: "Admin - Best Practice",
  description: "Best-Practice-Beiträge verwalten.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: practices } = await supabase
    .from("best_practices")
    .select("*, profiles(full_name), best_practice_categories(categories(*))")
    .order("created_at", { ascending: false });

  const allPractices = practices || [];
  const publishedCount = allPractices.filter((p) => p.published).length;
  const draftCount = allPractices.filter((p) => !p.published).length;

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Admin-Bereich
              </h1>
              <p className="text-lg text-white/70">
                Best-Practice-Beiträge verwalten.
              </p>
              <AdminNav />
            </div>
            <AuthStatus />
          </div>
        </div>
      </section>

      {/* Stats + Actions */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex gap-6">
              <div className="flex items-center gap-2 text-sm text-text-light">
                <FileText className="w-4 h-4" aria-hidden="true" />
                <span>
                  <strong className="text-text">{allPractices.length}</strong>{" "}
                  Gesamt
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-light">
                <Eye className="w-4 h-4 text-green-600" aria-hidden="true" />
                <span>
                  <strong className="text-text">{publishedCount}</strong>{" "}
                  Veröffentlicht
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-light">
                <EyeOff
                  className="w-4 h-4 text-yellow-600"
                  aria-hidden="true"
                />
                <span>
                  <strong className="text-text">{draftCount}</strong> Entwürfe
                </span>
              </div>
            </div>
            <Link
              href="/best-practice/admin/neu"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Neuer Beitrag
            </Link>
          </div>

          <AdminTable practices={allPractices} />
        </div>
      </section>
    </>
  );
}
