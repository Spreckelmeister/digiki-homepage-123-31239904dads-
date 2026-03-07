import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import AdminNav from "@/components/best-practice/AdminNav";
import BestandsaufnahmeStatusManager from "@/components/best-practice/BestandsaufnahmeStatusManager";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("bestandsaufnahme_responses")
    .select("school_name")
    .eq("id", id)
    .single();
  if (!data)
    return {
      title: "Nicht gefunden",
      robots: { index: false, follow: false },
    };
  return {
    title: `Bestandsaufnahme: ${data.school_name} – Admin`,
    robots: { index: false, follow: false },
  };
}

export default async function BestandsaufnahmeDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: r } = await supabase
    .from("bestandsaufnahme_responses")
    .select("*")
    .eq("id", id)
    .single();

  if (!r) notFound();

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <Link
                href="/best-practice/admin/bestandsaufnahme"
                className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Zurück zur Übersicht
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Bestandsaufnahme
              </h1>
              <p className="text-lg text-white/70 mt-1">{r.school_name}</p>
              <AdminNav />
            </div>
            <AuthStatus />
          </div>
        </div>
      </section>

      {/* Detail */}
      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Status manager (client component) */}
          <BestandsaufnahmeStatusManager
            id={r.id}
            initialStatus={r.status}
            adminNotes={r.admin_notes ?? ""}
          />

          {/* Teil A */}
          <Section title="🏫 Teil A: Allgemeine Angaben">
            <Grid>
              <Field label="Name der Schule" value={r.school_name} />
              <Field label="Schulstandort" value={r.school_location} />
              <Field label="Anzahl Schüler/innen" value={r.student_count} />
              <Field label="Anzahl Lehrkräfte" value={r.teacher_count} />
              <Field
                label="Startchancen-Schule"
                value={r.is_startchancen_school}
              />
              <Field label="DaZ-Anteil" value={r.daz_share} />
              <Field
                label="Ausfüllende Person"
                value={
                  r.respondent_role === "Sonstiges" && r.respondent_role_other
                    ? `Sonstiges: ${r.respondent_role_other}`
                    : r.respondent_role
                }
              />
            </Grid>
          </Section>

          {/* Teil B */}
          <Section title="💻 Teil B: Technische Ausstattung">
            <Grid>
              <FieldList label="Endgeräte" values={r.devices} other={r.devices_other} />
              <Field label="Tablets/iPads (Anzahl)" value={r.tablet_count} />
              <Field
                label="WLAN-Bewertung"
                value={r.wlan_rating ? `${r.wlan_rating} / 5` : null}
              />
              <FieldList
                label="Digitale Infrastruktur"
                values={r.infrastructure}
                other={r.infrastructure_other}
              />
              <FieldList
                label="Herausforderungen"
                values={r.challenges}
                other={r.challenges_other}
                wide
              />
              <Field
                label="Zufriedenheit tech. Support"
                value={
                  r.support_satisfaction
                    ? `${r.support_satisfaction} / 5`
                    : null
                }
              />
            </Grid>
          </Section>

          {/* Teil C */}
          <Section title="📊 Teil C: Aktueller Stand der Digitalisierung">
            <Grid>
              <Field
                label="Digitalisierungsgrad"
                value={
                  r.digitization_level
                    ? `${r.digitization_level} / 5`
                    : null
                }
              />
              <FieldList
                label="Digitale Tools im Einsatz"
                values={r.tools_used}
                other={r.tools_used_other}
                wide
              />
              <Field
                label="Nutzungshäufigkeit"
                value={r.usage_frequency}
              />
              <FieldList
                label="Diagnostik-Tools"
                values={r.diagnostic_tools}
                other={r.diagnostic_tools_other}
              />
              <Field label="Medienkonzept" value={r.media_concept} />
              <Field
                label="Medienbeauftragte/r"
                value={r.media_responsible}
              />
            </Grid>
          </Section>

          {/* Teil D */}
          <Section title="🤖 Teil D: Künstliche Intelligenz">
            <Grid>
              <Field label="KI-Nutzung im Kollegium" value={r.ai_usage} />
              <FieldList label="KI wofür genutzt" values={r.ai_purposes} wide />
              <FieldList
                label="Konkrete KI-Tools"
                values={r.ai_tools_used}
                other={r.ai_tools_other}
              />
              <Field
                label="KI-Kompetenzniveau"
                value={
                  r.ai_competence ? `${r.ai_competence} / 5` : null
                }
              />
              <FieldList
                label="Bedenken gegenüber KI"
                values={r.ai_concerns}
                other={r.ai_concerns_other}
                wide
              />
              <FieldList
                label="KI-Fortbildungen besucht"
                values={r.ai_trainings}
                other={r.ai_trainings_other}
              />
            </Grid>
          </Section>

          {/* Teil E */}
          <Section title="🎓 Teil E: Fortbildungsbedarf">
            <Grid>
              <FieldList
                label="Fortbildungsbedarf (max. 5)"
                values={r.training_needs}
                wide
              />
              <FieldList
                label="Bevorzugte Formate"
                values={r.training_format}
                wide
              />
              <FieldList
                label="Geeignete Zeiten"
                values={r.training_times}
              />
              <Field
                label="Erwartete Teilnehmerzahl"
                value={r.participation_count}
              />
              <Field
                label="Interesse Vorreiter-Schule"
                value={r.pioneer_interest}
                wide
              />
            </Grid>
          </Section>

          {/* Teil F */}
          <Section title="⭐ Teil F: Best Practices">
            <Grid>
              <Field
                label="Gelungene Beispiele vorhanden"
                value={r.has_best_practice}
              />
              {r.best_practice_description && (
                <TextBlock
                  label="Beschreibung"
                  value={r.best_practice_description}
                />
              )}
              <Field
                label="Bereitschaft zur Weitergabe"
                value={r.share_practice}
                wide
              />
            </Grid>
          </Section>

          {/* Teil G */}
          <Section title="🛠️ Teil G: Unterstützungsbedarf">
            <Grid>
              <FieldList
                label="Gewünschte Unterstützung (max. 3)"
                values={r.support_needs}
                wide
              />
              <FieldList
                label="Gewünschte Software-Lizenzen"
                values={r.software_licenses}
                other={r.software_licenses_other}
                wide
              />
              <Field
                label="Studentische Unterstützung"
                value={r.student_support}
              />
              <Field label="Zeit für Tools" value={r.time_for_tools} />
            </Grid>
          </Section>

          {/* Teil H */}
          {(r.project_wishes || r.additional_notes) && (
            <Section title="💬 Teil H: Offene Rückmeldung">
              <div className="space-y-4">
                {r.project_wishes && (
                  <TextBlock
                    label="Wünsche an das Projekt DigiKI"
                    value={r.project_wishes}
                  />
                )}
                {r.additional_notes && (
                  <TextBlock
                    label="Weitere Anmerkungen"
                    value={r.additional_notes}
                  />
                )}
              </div>
            </Section>
          )}

          {/* Metadata */}
          <p className="text-xs text-text-light">
            Eingereicht am{" "}
            {new Date(r.created_at).toLocaleDateString("de-DE", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </section>
    </>
  );
}

// ── Helper UI components ────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
      <h2 className="text-lg font-semibold text-primary mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      {children}
    </dl>
  );
}

function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value: string | number | null | undefined;
  wide?: boolean;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium text-text-light uppercase tracking-wider">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-text">{String(value)}</dd>
    </div>
  );
}

function FieldList({
  label,
  values,
  other,
  wide,
}: {
  label: string;
  values: string[] | null | undefined;
  other?: string | null;
  wide?: boolean;
}) {
  const list = [
    ...(values ?? []),
    ...(other ? [`Sonstiges: ${other}`] : []),
  ];
  if (list.length === 0) return null;
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium text-text-light uppercase tracking-wider mb-1">
        {label}
      </dt>
      <dd>
        <ul className="flex flex-wrap gap-1.5">
          {list.map((v) => (
            <li
              key={v}
              className="inline-flex rounded-full bg-primary/5 px-2.5 py-0.5 text-xs text-primary"
            >
              {v}
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

function TextBlock({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-text-light uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-sm text-text whitespace-pre-wrap p-3 bg-bg rounded-lg">
        {value}
      </p>
    </div>
  );
}
