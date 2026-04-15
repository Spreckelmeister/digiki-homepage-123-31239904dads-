"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ClipboardList, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { BestandsaufnahmeData } from "@/components/forms/BestandsaufnahmeForm";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Admin-style sub-components ────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-bg transition-colors"
      >
        <h3 className="text-base font-semibold text-primary">{title}</h3>
        {open ? (
          <ChevronUp className="w-4 h-4 text-text-light shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-light shrink-0" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-border pt-4">
          {children}
        </div>
      )}
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
      <dt className="text-xs font-medium text-text-light uppercase tracking-wider mb-1.5">
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface BestandsaufnahmeRecord extends BestandsaufnahmeData {
  contact_person: string | null;
  principal_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  respondent_role_other: string | null;
  diagnostic_tools_other: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MyBestandsaufnahme() {
  const [data, setData] = useState<BestandsaufnahmeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: userData }) => {
      if (!userData.user) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();
      if (profile?.role === "admin") {
        setLoading(false);
        return;
      }
      setIsLoggedIn(true);
      const { data: rpcData } = await supabase.rpc("get_my_bestandsaufnahme");
      if (rpcData) {
        setData(rpcData as BestandsaufnahmeRecord);
      }
      setLoading(false);
    });
  }, []);

  if (!isLoggedIn || loading) return null;

  const r = data;

  return (
    <div className="mt-16 border-t border-border pt-12">
      {/* Header – always visible, clickable to toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 mb-0 text-left group"
      >
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-primary" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-primary">Meine Bestandsaufnahme</h2>
        </div>
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronUp className="w-5 h-5 text-text-light group-hover:text-primary transition-colors" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-light group-hover:text-primary transition-colors" aria-hidden="true" />
          )}
        </div>
      </button>

      {open && r && (
        <div className="mt-4 mb-4 flex justify-end">
          <Link
            href="/best-practice/meine-bestandsaufnahme/bearbeiten"
            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white transition-all"
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
            Bearbeiten
          </Link>
        </div>
      )}

      {open && !r && (
        <div className="mt-6 rounded-xl bg-bg border border-border px-6 py-8 text-center text-sm text-text-light">
          <p className="mb-3">Sie haben noch keine Bestandsaufnahme eingereicht.</p>
          <Link
            href="/bestandsaufnahme"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-all"
          >
            Bestandsaufnahme ausfüllen
          </Link>
        </div>
      )}

      {open && r && (
        <div className="space-y-3 mt-6">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="text-sm font-semibold text-text">{r.school_name}</span>
            <span className="inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
              {r.status === "neu" ? "Eingegangen" : r.status}
            </span>
            <span className="text-xs text-text-light">
              Eingereicht am {formatDate(r.created_at)}
              {r.updated_at && r.updated_at !== r.created_at &&
                ` · Aktualisiert am ${formatDate(r.updated_at)}`}
            </span>
          </div>

          {/* Kontakt – always open */}
          <Section title="👤 Kontaktdaten" defaultOpen>
            <Grid>
              <Field label="Ansprechperson" value={r.contact_person} />
              <Field label="Schulleitung" value={r.principal_name} />
              <Field label="E-Mail" value={r.contact_email} />
              <Field label="Telefon" value={r.contact_phone} />
            </Grid>
          </Section>

          {/* Teil A */}
          <Section title="🏫 Teil A: Allgemeine Angaben">
            <Grid>
              <Field label="Name der Schule" value={r.school_name} />
              <Field label="Schulstandort" value={r.school_location} />
              <Field label="Anzahl Schüler/innen" value={r.student_count} />
              <Field label="Anzahl Lehrkräfte" value={r.teacher_count} />
              <Field label="Startchancen-Schule" value={r.is_startchancen_school} />
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
              <Field label="WLAN-Bewertung" value={r.wlan_rating ? `${r.wlan_rating} / 5` : null} />
              <FieldList label="Digitale Infrastruktur" values={r.infrastructure} other={r.infrastructure_other} />
              <FieldList label="Herausforderungen" values={r.challenges} other={r.challenges_other} wide />
              <Field label="Zufriedenheit tech. Support" value={r.support_satisfaction ? `${r.support_satisfaction} / 5` : null} />
            </Grid>
          </Section>

          {/* Teil C */}
          <Section title="📊 Teil C: Aktueller Stand der Digitalisierung">
            <Grid>
              <Field label="Digitalisierungsgrad" value={r.digitization_level ? `${r.digitization_level} / 5` : null} />
              <FieldList label="Digitale Tools im Einsatz" values={r.tools_used} other={r.tools_used_other} wide />
              <Field label="Nutzungshäufigkeit" value={r.usage_frequency} />
              <FieldList label="Diagnostik-Tools" values={r.diagnostic_tools} other={r.diagnostic_tools_other} />
              <Field label="Medienkonzept" value={r.media_concept} />
              <Field label="Medienbeauftragte/r" value={r.media_responsible} />
            </Grid>
          </Section>

          {/* Teil D */}
          <Section title="🤖 Teil D: Künstliche Intelligenz">
            <Grid>
              <Field label="KI-Nutzung im Kollegium" value={r.ai_usage} wide />
              <FieldList label="KI wofür genutzt" values={r.ai_purposes} wide />
              <FieldList label="Konkrete KI-Tools" values={r.ai_tools_used} other={r.ai_tools_other} />
              <Field label="KI-Kompetenzniveau" value={r.ai_competence ? `${r.ai_competence} / 5` : null} />
              <FieldList label="Bedenken gegenüber KI" values={r.ai_concerns} other={r.ai_concerns_other} wide />
              <FieldList label="KI-Fortbildungen besucht" values={r.ai_trainings} other={r.ai_trainings_other} />
            </Grid>
          </Section>

          {/* Teil E */}
          <Section title="🎓 Teil E: Fortbildungsbedarf">
            <Grid>
              <FieldList label="Fortbildungsbedarf (max. 5)" values={r.training_needs} wide />
              {r.training_needs_other && (
                <Field label="Sonstiger Fortbildungsbedarf" value={r.training_needs_other} wide />
              )}
              <FieldList label="Bevorzugte Formate" values={r.training_format} wide />
              <FieldList label="Geeignete Zeiten" values={r.training_times} />
              <Field label="Erwartete Teilnehmerzahl" value={r.participation_count} />
              <Field label="Interesse Vorreiter-Schule" value={r.pioneer_interest} wide />
            </Grid>
          </Section>

          {/* Teil F */}
          <Section title="⭐ Teil F: Best Practices">
            <Grid>
              <Field label="Gelungene Beispiele vorhanden" value={r.has_best_practice} />
              <Field label="Bereitschaft zur Weitergabe" value={r.share_practice} wide />
              {r.best_practice_description && (
                <div className="sm:col-span-2">
                  <TextBlock label="Beschreibung" value={r.best_practice_description} />
                </div>
              )}
            </Grid>
          </Section>

          {/* Teil G */}
          <Section title="🛠️ Teil G: Unterstützungsbedarf">
            <Grid>
              <FieldList label="Gewünschte Unterstützung (max. 3)" values={r.support_needs} wide />
              <FieldList label="Gewünschte Software-Lizenzen" values={r.software_licenses} other={r.software_licenses_other} wide />
              <Field label="Studentische Unterstützung" value={r.student_support} />
              <Field label="Zeit für Tools" value={r.time_for_tools} />
            </Grid>
          </Section>

          {/* Teil H */}
          {(r.project_wishes || r.additional_notes) && (
            <Section title="💬 Teil H: Offene Rückmeldung">
              <div className="space-y-4">
                <TextBlock label="Wünsche an das Projekt DigiKI" value={r.project_wishes} />
                <TextBlock label="Weitere Anmerkungen" value={r.additional_notes} />
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

