import type { Metadata } from "next";
import Link from "next/link";
import { BarChart2, LineChart, ArrowRight } from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import AdminNav from "@/components/best-practice/AdminNav";
import BestandsaufnahmeAdminTable from "@/components/best-practice/BestandsaufnahmeAdminTable";

export const metadata: Metadata = {
  title: "Bestandsaufnahme – Admin",
  description: "Eingegangene Bestandsaufnahmen verwalten.",
  robots: { index: false, follow: false },
};

export default async function BestandsaufnahmeAdminPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: responses } = await supabase
    .from("bestandsaufnahme_responses")
    .select(
      "id, school_name, school_location, student_count, respondent_role, status, created_at"
    )
    .not("school_name", "ilike", "%test%")
    .not("school_name", "ilike", "%admin%")
    .order("created_at", { ascending: false });

  const rows = responses || [];
  const neuCount = rows.filter((r) => r.status === "neu").length;
  const gelesenCount = rows.filter((r) => r.status === "gelesen").length;

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
                Eingegangene Bestandsaufnahmen verwalten.
              </p>
              <AdminNav />
            </div>
            <AuthStatus initialProfile={profile} />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* CTA: Live-Auswertung */}
          {rows.length > 0 && (
            <Link
              href="/best-practice/admin/bestandsaufnahme/auswertung"
              className="group relative block mb-8 overflow-hidden rounded-xl bg-primary text-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, #ffffff 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, #ffffff 0 1px, transparent 1px 24px)",
                }}
              />
              <div className="relative flex items-center gap-5 p-5 md:p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 border border-white/15 shrink-0">
                  <LineChart className="h-6 w-6 text-accent" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-1 inline-flex items-center gap-2">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    Live · {rows.length} Antwort{rows.length === 1 ? "" : "en"}
                  </p>
                  <p className="text-base md:text-lg font-bold leading-tight">
                    Auswertung & Charts ansehen
                  </p>
                  <p className="text-sm text-white/70 mt-0.5 hidden sm:block">
                    Echtzeit-Dashboard mit Stadt/Landkreis-Vergleich,
                    KI-Nutzung und Fortbildungsbedarfen.
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-white transition-all group-hover:gap-3">
                  Öffnen
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </Link>
          )}

          <div className="flex flex-wrap gap-6 mb-8">
            <div className="flex items-center gap-2 text-sm text-text-light">
              <BarChart2 className="w-4 h-4" aria-hidden="true" />
              <span>
                <strong className="text-text">{rows.length}</strong> Gesamt
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-light">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span>
                <strong className="text-text">{neuCount}</strong> Neu
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-light">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>
                <strong className="text-text">{gelesenCount}</strong> Gelesen
              </span>
            </div>
          </div>

          <BestandsaufnahmeAdminTable rows={rows} />
        </div>
      </section>
    </>
  );
}
