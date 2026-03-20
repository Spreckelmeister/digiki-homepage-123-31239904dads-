"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ClipboardList, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { BestandsaufnahmeData } from "@/components/forms/BestandsaufnahmeForm";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs font-semibold text-text">{label}: </span>
      <span className="text-xs text-text-light">{value}</span>
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-primary mb-1.5">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">{children}</div>
    </div>
  );
}

interface BestandsaufnahmeRecord extends BestandsaufnahmeData {
  contact_person: string | null;
  principal_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface FullResult {
  bestandsaufnahme: BestandsaufnahmeRecord[];
}

export default function MyBestandsaufnahme() {
  const [data, setData] = useState<BestandsaufnahmeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: userData }) => {
      if (!userData.user) {
        setLoading(false);
        return;
      }
      setIsLoggedIn(true);
      const { data: rpcData } = await supabase.rpc("get_my_submissions_full");
      const result = rpcData as FullResult | null;
      if (result?.bestandsaufnahme?.length) {
        setData(result.bestandsaufnahme[0]);
      }
      setLoading(false);
    });
  }, []);

  if (!isLoggedIn || loading) return null;

  return (
    <div className="mt-16 border-t border-border pt-12">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-primary" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-primary">Meine Bestandsaufnahme</h2>
        </div>
        {data && (
          <Link
            href="/best-practice/meine-bestandsaufnahme/bearbeiten"
            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white transition-all"
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
            Bearbeiten
          </Link>
        )}
      </div>

      {!data ? (
        <div className="rounded-xl bg-bg border border-border px-6 py-8 text-center text-sm text-text-light">
          <p className="mb-3">Sie haben noch keine Bestandsaufnahme eingereicht.</p>
          <Link
            href="/bestandsaufnahme"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-all"
          >
            Bestandsaufnahme ausfüllen
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="bg-white px-6 py-5 space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <p className="font-semibold text-text text-base">{data.school_name}</p>
                <p className="text-xs text-text-light mt-0.5">
                  Eingereicht am {formatDate(data.created_at)}
                  {data.updated_at !== data.created_at && ` · Aktualisiert am ${formatDate(data.updated_at)}`}
                </p>
              </div>
              <span className="inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 shrink-0 self-start">
                {data.status === "neu" ? "Eingegangen" : data.status}
              </span>
            </div>

            {/* Kontakt */}
            <SectionBlock title="Kontakt">
              <DetailField label="Ansprechperson" value={data.contact_person} />
              <DetailField label="Schulleitung" value={data.principal_name} />
              <DetailField label="E-Mail" value={data.contact_email} />
              <DetailField label="Telefon" value={data.contact_phone} />
            </SectionBlock>

            {/* Teil A */}
            <SectionBlock title="🏫 Allgemeine Angaben">
              <DetailField label="Schulstandort" value={data.school_location} />
              <DetailField label="Schüler/innen" value={data.student_count} />
              <DetailField label="Lehrkräfte" value={data.teacher_count} />
              <DetailField label="Startchancen-Schule" value={data.is_startchancen_school} />
              <DetailField label="DaZ-Anteil" value={data.daz_share} />
              <DetailField label="Ausfüllende Person" value={data.respondent_role} />
            </SectionBlock>

            {/* Teil B */}
            <SectionBlock title="💻 Technische Ausstattung">
              <DetailField label="Endgeräte" value={[...(data.devices ?? []), data.devices_other].filter(Boolean).join(", ")} />
              <DetailField label="Tablets/iPads" value={data.tablet_count} />
              <DetailField label="WLAN-Bewertung" value={data.wlan_rating ? `${data.wlan_rating} / 5` : null} />
              <DetailField label="Infrastruktur" value={[...(data.infrastructure ?? []), data.infrastructure_other].filter(Boolean).join(", ")} />
              <DetailField label="Herausforderungen" value={[...(data.challenges ?? []), data.challenges_other].filter(Boolean).join(", ")} />
              <DetailField label="Zufriedenheit Support" value={data.support_satisfaction ? `${data.support_satisfaction} / 5` : null} />
            </SectionBlock>

            {/* Teil C */}
            <SectionBlock title="📊 Stand Digitalisierung">
              <DetailField label="Digitalisierungsgrad" value={data.digitization_level ? `${data.digitization_level} / 5` : null} />
              <DetailField label="Tools im Einsatz" value={[...(data.tools_used ?? []), data.tools_used_other].filter(Boolean).join(", ")} />
              <DetailField label="Nutzungshäufigkeit" value={data.usage_frequency} />
              <DetailField label="Diagnostik-Tools" value={(data.diagnostic_tools ?? []).join(", ")} />
              <DetailField label="Medienkonzept" value={data.media_concept} />
              <DetailField label="Medienbeauftragte/r" value={data.media_responsible} />
            </SectionBlock>

            {/* Teil D */}
            <SectionBlock title="🤖 Künstliche Intelligenz">
              <DetailField label="KI-Nutzung" value={data.ai_usage} />
              <DetailField label="KI wofür" value={(data.ai_purposes ?? []).join(", ")} />
              <DetailField label="KI-Tools" value={[...(data.ai_tools_used ?? []), data.ai_tools_other].filter(Boolean).join(", ")} />
              <DetailField label="KI-Kompetenzniveau" value={data.ai_competence ? `${data.ai_competence} / 5` : null} />
              <DetailField label="Bedenken" value={[...(data.ai_concerns ?? []), data.ai_concerns_other].filter(Boolean).join(", ")} />
              <DetailField label="KI-Fortbildungen" value={[...(data.ai_trainings ?? []), data.ai_trainings_other].filter(Boolean).join(", ")} />
            </SectionBlock>

            {/* Teil E */}
            <SectionBlock title="🎓 Fortbildungsbedarf">
              <DetailField label="Bedarf" value={(data.training_needs ?? []).join(", ")} />
              <DetailField label="Formate" value={(data.training_format ?? []).join(", ")} />
              <DetailField label="Zeiten" value={(data.training_times ?? []).join(", ")} />
              <DetailField label="Erwartete Teilnehmer" value={data.participation_count} />
              <DetailField label="Vorreiter-Schule" value={data.pioneer_interest} />
            </SectionBlock>

            {/* Teil F */}
            <SectionBlock title="⭐ Best Practices">
              <DetailField label="Best Practice vorhanden" value={data.has_best_practice} />
              <DetailField label="Beschreibung" value={data.best_practice_description} />
              <DetailField label="Bereit zum Teilen" value={data.share_practice} />
            </SectionBlock>

            {/* Teil G */}
            <SectionBlock title="🛠️ Unterstützungsbedarf">
              <DetailField label="Unterstützung gewünscht" value={(data.support_needs ?? []).join(", ")} />
              <DetailField label="Software-Lizenzen" value={[...(data.software_licenses ?? []), data.software_licenses_other].filter(Boolean).join(", ")} />
              <DetailField label="Studentische Unterstützung" value={data.student_support} />
              <DetailField label="Zeit für Tools" value={data.time_for_tools} />
            </SectionBlock>

            {/* Teil H */}
            {(data.project_wishes || data.additional_notes) && (
              <SectionBlock title="💬 Offene Rückmeldung">
                <DetailField label="Wünsche ans Projekt" value={data.project_wishes} />
                <DetailField label="Weitere Anmerkungen" value={data.additional_notes} />
              </SectionBlock>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
