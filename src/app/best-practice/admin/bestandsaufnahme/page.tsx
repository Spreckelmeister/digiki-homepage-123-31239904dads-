import type { Metadata } from "next";
import Link from "next/link";
import { BarChart2, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import AdminNav from "@/components/best-practice/AdminNav";

export const metadata: Metadata = {
  title: "Bestandsaufnahme – Admin",
  description: "Eingegangene Bestandsaufnahmen verwalten.",
  robots: { index: false, follow: false },
};

export default async function BestandsaufnahmeAdminPage() {
  const supabase = await createClient();

  const { data: responses } = await supabase
    .from("bestandsaufnahme_responses")
    .select(
      "id, school_name, school_location, student_count, respondent_role, status, created_at"
    )
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
            <AuthStatus />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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

          {rows.length === 0 ? (
            <div className="text-center py-16 text-text-light bg-white rounded-xl border border-border">
              Noch keine Bestandsaufnahmen eingegangen.
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-bg">
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                        Schule
                      </th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                        Standort
                      </th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                        Schüler/innen
                      </th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                        Ausfüllende Person
                      </th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                        Status
                      </th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                        Datum
                      </th>
                      <th className="py-3 px-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-bg transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-text">
                          {row.school_name}
                        </td>
                        <td className="py-3 px-4 text-sm text-text-light">
                          {row.school_location}
                        </td>
                        <td className="py-3 px-4 text-sm text-text-light">
                          {row.student_count}
                        </td>
                        <td className="py-3 px-4 text-sm text-text-light">
                          {row.respondent_role || "–"}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="py-3 px-4 text-sm text-text-light whitespace-nowrap">
                          {new Date(row.created_at).toLocaleDateString(
                            "de-DE",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/best-practice/admin/bestandsaufnahme/${row.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            Ansehen
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {rows.map((row) => (
                  <div key={row.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-text">
                        {row.school_name}
                      </p>
                      <StatusBadge status={row.status} />
                    </div>
                    <p className="text-xs text-text-light mb-1">
                      {row.school_location} · {row.student_count} Schüler/innen
                    </p>
                    <p className="text-xs text-text-light mb-3">
                      {new Date(row.created_at).toLocaleDateString("de-DE", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <Link
                      href={`/best-practice/admin/bestandsaufnahme/${row.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      Ansehen
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    neu: { label: "Neu", class: "bg-accent/10 text-accent" },
    gelesen: { label: "Gelesen", class: "bg-green-100 text-green-700" },
    archiviert: { label: "Archiviert", class: "bg-gray-100 text-gray-500" },
  };
  const s = map[status] ?? { label: status, class: "bg-gray-100 text-gray-500" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.class}`}
    >
      {s.label}
    </span>
  );
}
