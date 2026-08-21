import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import AdminNav from "@/components/best-practice/AdminNav";
import BackButton from "@/components/BackButton";
import ApplicationDetail, {
  FieldDisplay,
  CheckDisplay,
} from "@/components/best-practice/ApplicationDetail";
import {
  labelFor,
  TRAINING_PARTICIPATION_OPTIONS,
  SUPPORT_AREA_OPTIONS,
  SCOPE_PRESET_OPTIONS,
} from "@/lib/applications/hilfskraefteOptions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications_student_assistants")
    .select("school_name")
    .eq("id", id)
    .single();

  if (!data) return { title: "Nicht gefunden", robots: { index: false, follow: false } };
  return { title: `Antrag: ${data.school_name} - Admin`, robots: { index: false, follow: false } };
}

export default async function HilfskraefteDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: app } = await supabase
    .from("applications_student_assistants")
    .select("*")
    .eq("id", id)
    .single();

  if (!app) notFound();

  // Neues Antragsmodell (punktuelle Unterstützung) trägt immer scope_preset;
  // Alt-Blöcke werden nur gezeigt, wenn sie Daten enthalten.
  const isNewShape = Boolean(app.scope_preset);
  const hasLegacySupport =
    app.support_technical_setup ||
    app.support_onboarding ||
    app.support_tech_support ||
    app.support_material_creation ||
    app.support_classroom ||
    app.support_other;
  const hasLegacyZeitraum = Boolean(
    app.duration ||
      app.hours_per_week ||
      app.preferred_days ||
      (!isNewShape && app.start_date)
  );

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <BackButton
                fallbackHref="/best-practice/admin/antraege"
                fallbackLabel="Zurück zu Anträge"
                className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors mb-4"
              />
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Antrag: Studentische Hilfskräfte
              </h1>
              <p className="text-lg text-white/70 mt-1">{app.school_name}</p>
              <AdminNav />
            </div>
            <div className="flex flex-col items-stretch gap-3 md:items-end">
              <AuthStatus initialProfile={profile} />
              <Link
                href={`/best-practice/admin/antraege/hilfskraefte/${app.id}/bearbeiten`}
                className="group inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-text shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-md"
              >
                <Pencil
                  className="h-4 w-4 transition-transform group-hover:rotate-12"
                  aria-hidden="true"
                />
                Antrag bearbeiten
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Detail */}
      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <ApplicationDetail
            id={app.id}
            table="applications_student_assistants"
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

            {/* Voraussetzungen (neues Antragsmodell) */}
            {(app.training_participation || app.internal_attempt) && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
                <h2 className="text-lg font-semibold text-primary mb-4">
                  Voraussetzungen
                </h2>
                <dl className="grid grid-cols-1 gap-4">
                  <FieldDisplay
                    label="Schulungsteilnahme"
                    value={
                      labelFor(
                        TRAINING_PARTICIPATION_OPTIONS,
                        app.training_participation
                      ) ?? app.training_participation
                    }
                  />
                </dl>
                {app.training_details && (
                  <div className="mt-4 p-3 bg-bg rounded-lg">
                    <p className="text-xs font-medium text-text-light uppercase tracking-wider mb-1">
                      Angemeldete Schulungen bei Antragstellung
                    </p>
                    <p className="text-sm text-text whitespace-pre-wrap">
                      {app.training_details}
                    </p>
                  </div>
                )}
                {app.internal_attempt && (
                  <div className="mt-4 p-3 bg-bg rounded-lg">
                    <p className="text-xs font-medium text-text-light uppercase tracking-wider mb-1">
                      Schulintern bereits versucht
                    </p>
                    <p className="text-sm text-text whitespace-pre-wrap">
                      {app.internal_attempt}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Konkrete Hürde (neues Antragsmodell) */}
            {app.support_area && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
                <h2 className="text-lg font-semibold text-primary mb-4">
                  Konkrete Hürde
                </h2>
                <dl className="grid grid-cols-1 gap-4">
                  <FieldDisplay
                    label="Bereich"
                    value={
                      labelFor(SUPPORT_AREA_OPTIONS, app.support_area) ??
                      app.support_area
                    }
                  />
                </dl>
                {app.support_explanation && (
                  <div className="mt-4 p-3 bg-bg rounded-lg">
                    <p className="text-xs font-medium text-text-light uppercase tracking-wider mb-1">
                      Beschreibung der Hürde
                    </p>
                    <p className="text-sm text-text whitespace-pre-wrap">
                      {app.support_explanation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Umfang & Termin (neues Antragsmodell) */}
            {isNewShape && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
                <h2 className="text-lg font-semibold text-primary mb-4">
                  Umfang &amp; Termin
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldDisplay
                    label="Gewünschter Umfang"
                    value={
                      labelFor(SCOPE_PRESET_OPTIONS, app.scope_preset) ??
                      app.scope_preset
                    }
                  />
                  <FieldDisplay
                    label="Frühester Wunschtermin"
                    value={app.start_date}
                  />
                </dl>
              </div>
            )}

            {/* Gewünschte Unterstützung (Altantrag) */}
            {(!isNewShape || hasLegacySupport) && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
                <h2 className="text-lg font-semibold text-primary mb-4">
                  Gewünschte Unterstützung{isNewShape ? " (Altantrag)" : ""}
                </h2>
                <div className="space-y-2">
                  <CheckDisplay
                    label="Technische Einrichtung von Tools und Geräten"
                    checked={app.support_technical_setup}
                  />
                  <CheckDisplay
                    label="Ersteinweisung / Onboarding von Lehrkräften"
                    checked={app.support_onboarding}
                  />
                  <CheckDisplay
                    label="Technischer Support und Fehlerbehebung"
                    checked={app.support_tech_support}
                  />
                  <CheckDisplay
                    label="Unterstützung bei der Materialerstellung"
                    checked={app.support_material_creation}
                  />
                  <CheckDisplay
                    label="Begleitung im Unterricht bei der Tool-Nutzung"
                    checked={app.support_classroom}
                  />
                  <CheckDisplay
                    label="Sonstiges"
                    checked={app.support_other}
                  />
                </div>
                {app.support_explanation && !app.support_area && (
                  <div className="mt-4 p-3 bg-bg rounded-lg">
                    <p className="text-xs font-medium text-text-light uppercase tracking-wider mb-1">
                      Erläuterung
                    </p>
                    <p className="text-sm text-text whitespace-pre-wrap">
                      {app.support_explanation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Zeitraum (Altantrag) */}
            {hasLegacyZeitraum && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
                <h2 className="text-lg font-semibold text-primary mb-4">
                  Gewünschter Zeitraum &amp; Umfang
                  {isNewShape ? " (Altantrag)" : ""}
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldDisplay
                    label="Beginn"
                    value={isNewShape ? null : app.start_date}
                  />
                  <FieldDisplay label="Dauer" value={app.duration} />
                  <FieldDisplay
                    label="Stunden/Woche"
                    value={app.hours_per_week}
                  />
                  <FieldDisplay
                    label="Bevorzugte Tage"
                    value={app.preferred_days}
                  />
                </dl>
              </div>
            )}

            {/* Technische Voraussetzungen (Altantrag) */}
            {!isNewShape && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
                <h2 className="text-lg font-semibold text-primary mb-4">
                  Technische Voraussetzungen
                </h2>
                <div className="space-y-2">
                  <CheckDisplay label="WLAN verfügbar" checked={app.has_wifi} />
                  <CheckDisplay
                    label={`Tablets/Laptops vorhanden${app.device_count ? ` (${app.device_count} Geräte)` : ""}`}
                    checked={app.has_devices}
                  />
                  <CheckDisplay
                    label="Interaktive Displays / Smartboards"
                    checked={app.has_interactive_displays}
                  />
                  <CheckDisplay
                    label="Schulserver / Schulnetzwerk"
                    checked={app.has_school_server}
                  />
                </div>
              </div>
            )}

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
