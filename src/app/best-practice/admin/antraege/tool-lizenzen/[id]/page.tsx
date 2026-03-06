import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import AdminNav from "@/components/best-practice/AdminNav";
import ApplicationDetail, {
  FieldDisplay,
  CheckDisplay,
} from "@/components/best-practice/ApplicationDetail";
import type { ToolSelection } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications_tool_licenses")
    .select("school_name")
    .eq("id", id)
    .single();

  if (!data) return { title: "Nicht gefunden" };
  return { title: `Antrag: ${data.school_name} - Admin` };
}

export default async function ToolLizenzenDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: app } = await supabase
    .from("applications_tool_licenses")
    .select("*")
    .eq("id", id)
    .single();

  if (!app) notFound();

  const toolSelections: ToolSelection[] = app.tool_selections || [];

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <Link
                href="/best-practice/admin/antraege"
                className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Zurück zu Anträge
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Antrag: Tool-Lizenzen
              </h1>
              <p className="text-lg text-white/70 mt-1">{app.school_name}</p>
              <AdminNav />
            </div>
            <AuthStatus />
          </div>
        </div>
      </section>

      {/* Detail */}
      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <ApplicationDetail
            id={app.id}
            table="applications_tool_licenses"
            status={app.status}
            adminNotes={app.admin_notes}
          >
            {/* Schulinfo */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
              <h2 className="text-lg font-semibold text-primary mb-4">
                Angaben zur Schule
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldDisplay label="Schule" value={app.school_name} />
                <FieldDisplay label="Adresse" value={`${app.school_street}, ${app.school_plz} ${app.school_city}`} />
                <FieldDisplay label="Schulleitung" value={app.principal_name} />
                <FieldDisplay
                  label="Ansprechperson"
                  value={app.contact_person}
                />
                <FieldDisplay label="Telefon" value={app.phone} />
                <FieldDisplay label="E-Mail" value={app.email} />
                <FieldDisplay
                  label="Lehrkräfte"
                  value={app.teacher_count}
                />
                <FieldDisplay
                  label="Schüler/innen"
                  value={app.student_count}
                />
              </dl>
            </div>

            {/* Tool-Auswahl */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
              <h2 className="text-lg font-semibold text-primary mb-4">
                Gewünschte Tool-Lizenzen
              </h2>
              {toolSelections.length > 0 ? (
                <div className="space-y-4">
                  {toolSelections.map((cat, i) => (
                    <div key={i}>
                      <h3 className="text-sm font-semibold text-text mb-2">
                        {cat.category}
                      </h3>
                      <div className="space-y-1">
                        {cat.tools.map((tool, ti) => (
                          <div
                            key={ti}
                            className="flex items-center justify-between bg-bg rounded-lg px-3 py-2 text-sm"
                          >
                            <span className="text-text">{tool.name}</span>
                            <span className="text-text-light">
                              {tool.license_count} Lizenzen
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-light">
                  Keine Tools ausgewählt.
                </p>
              )}
              {app.additional_tools && (
                <div className="mt-4 p-3 bg-bg rounded-lg">
                  <p className="text-xs font-medium text-text-light uppercase tracking-wider mb-1">
                    Weitere gewünschte Tools
                  </p>
                  <p className="text-sm text-text whitespace-pre-wrap">
                    {app.additional_tools}
                  </p>
                </div>
              )}
            </div>

            {/* Geplanter Einsatz */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
              <h2 className="text-lg font-semibold text-primary mb-4">
                Geplanter Einsatz
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldDisplay
                  label="Klassenstufen"
                  value={app.grade_levels}
                />
                <FieldDisplay label="Fächer" value={app.subjects} />
                <FieldDisplay label="Geplanter Beginn" value={app.start_date} />
              </dl>
              {app.usage_description && (
                <div className="mt-4 p-3 bg-bg rounded-lg">
                  <p className="text-xs font-medium text-text-light uppercase tracking-wider mb-1">
                    Beschreibung des geplanten Einsatzes
                  </p>
                  <p className="text-sm text-text whitespace-pre-wrap">
                    {app.usage_description}
                  </p>
                </div>
              )}
            </div>

            {/* Datenschutz */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
              <h2 className="text-lg font-semibold text-primary mb-4">
                Datenschutz
              </h2>
              <div className="space-y-2">
                <CheckDisplay
                  label="Aktuelles Datenschutzkonzept vorhanden"
                  checked={app.privacy_concept_exists}
                />
                <CheckDisplay
                  label="Einwilligung der Erziehungsberechtigten liegt vor/wird eingeholt"
                  checked={app.parental_consent}
                />
                <CheckDisplay
                  label="IT-Infrastruktur erfüllt Mindestanforderungen"
                  checked={app.it_infrastructure_meets_requirements}
                />
              </div>
            </div>

            {/* Metadata */}
            <div className="text-xs text-text-light">
              Eingereicht am{" "}
              {new Date(app.created_at).toLocaleDateString("de-DE", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </ApplicationDetail>
        </div>
      </section>
    </>
  );
}
