"use client";

import { useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import SchoolInfoFields from "./SchoolInfoFields";
import FormSuccess from "./FormSuccess";
import { useHoneypot } from "./useHoneypot";
import { useIsAdmin } from "@/lib/useIsAdmin";

interface StudentAppData {
  id: string;
  school_name: string;
  school_street: string | null;
  school_plz: string | null;
  school_city: string | null;
  principal_name: string | null;
  contact_person: string;
  phone: string | null;
  email: string;
  teacher_count: number | null;
  student_count: number | null;
  support_technical_setup: boolean;
  support_onboarding: boolean;
  support_tech_support: boolean;
  support_material_creation: boolean;
  support_classroom: boolean;
  support_other: boolean;
  support_explanation: string | null;
  start_date: string | null;
  duration: string | null;
  hours_per_week: string | null;
  preferred_days: string | null;
  has_wifi: boolean;
  has_devices: boolean;
  device_count: number | null;
  has_interactive_displays: boolean;
  has_school_server: boolean;
}

export default function StudentAssistantForm({
  editMode = false,
  initialData,
  recordId,
}: {
  editMode?: boolean;
  initialData?: StudentAppData;
  recordId?: string;
}) {
  const isAdmin = useIsAdmin();
  const { isSpam, HoneypotField } = useHoneypot();
  const [schoolInfo, setSchoolInfo] = useState({
    school_name:    initialData?.school_name    ?? "",
    school_street:  initialData?.school_street  ?? "",
    school_plz:     initialData?.school_plz     ?? "",
    school_city:    initialData?.school_city     ?? "",
    principal_name: initialData?.principal_name ?? "",
    contact_person: initialData?.contact_person ?? "",
    phone:          initialData?.phone          ?? "",
    email:          initialData?.email          ?? "",
    teacher_count:  initialData?.teacher_count != null ? String(initialData.teacher_count) : "",
    student_count:  initialData?.student_count != null ? String(initialData.student_count) : "",
  });

  // Gewünschte Unterstützung
  const [supportTechnicalSetup, setSupportTechnicalSetup] = useState(initialData?.support_technical_setup ?? false);
  const [supportOnboarding, setSupportOnboarding] = useState(initialData?.support_onboarding ?? false);
  const [supportTechSupport, setSupportTechSupport] = useState(initialData?.support_tech_support ?? false);
  const [supportMaterialCreation, setSupportMaterialCreation] = useState(initialData?.support_material_creation ?? false);
  const [supportClassroom, setSupportClassroom] = useState(initialData?.support_classroom ?? false);
  const [supportOther, setSupportOther] = useState(initialData?.support_other ?? false);
  const [supportExplanation, setSupportExplanation] = useState(initialData?.support_explanation ?? "");

  // Zeitraum & Umfang
  const [startDate, setStartDate] = useState(initialData?.start_date ?? "");
  const [duration, setDuration] = useState(initialData?.duration ?? "");
  const [hoursPerWeek, setHoursPerWeek] = useState(initialData?.hours_per_week ?? "");
  const [preferredDays, setPreferredDays] = useState(initialData?.preferred_days ?? "");

  // Technische Voraussetzungen
  const [hasWifi, setHasWifi] = useState(initialData?.has_wifi ?? false);
  const [hasDevices, setHasDevices] = useState(initialData?.has_devices ?? false);
  const [deviceCount, setDeviceCount] = useState(initialData?.device_count != null ? String(initialData.device_count) : "");
  const [hasInteractiveDisplays, setHasInteractiveDisplays] = useState(initialData?.has_interactive_displays ?? false);
  const [hasSchoolServer, setHasSchoolServer] = useState(initialData?.has_school_server ?? false);

  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [truthConsent, setTruthConsent] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailFailed, setEmailFailed] = useState(false);

  function handleSchoolInfoChange(field: string, value: string) {
    setSchoolInfo((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (editMode) {
      setLoading(true);
      const res = await fetch("/api/update-student-app", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          school_name:              schoolInfo.school_name,
          school_street:            schoolInfo.school_street || null,
          school_plz:               schoolInfo.school_plz || null,
          school_city:              schoolInfo.school_city || null,
          principal_name:           schoolInfo.principal_name || null,
          contact_person:           schoolInfo.contact_person,
          phone:                    schoolInfo.phone || null,
          email:                    schoolInfo.email,
          teacher_count:            schoolInfo.teacher_count ? parseInt(schoolInfo.teacher_count) : null,
          student_count:            schoolInfo.student_count ? parseInt(schoolInfo.student_count) : null,
          support_technical_setup:  supportTechnicalSetup,
          support_onboarding:       supportOnboarding,
          support_tech_support:     supportTechSupport,
          support_material_creation: supportMaterialCreation,
          support_classroom:        supportClassroom,
          support_other:            supportOther,
          support_explanation:      supportExplanation || null,
          start_date:               startDate || null,
          duration:                 duration || null,
          hours_per_week:           hoursPerWeek || null,
          preferred_days:           preferredDays || null,
          has_wifi:                 hasWifi,
          has_devices:              hasDevices,
          device_count:             hasDevices && deviceCount ? parseInt(deviceCount) : null,
          has_interactive_displays: hasInteractiveDisplays,
          has_school_server:        hasSchoolServer,
        }),
      });
      setLoading(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Beim Speichern ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.");
        return;
      }
      setSuccess(true);
      return;
    }

    if (isSpam) {
      setSuccess(true);
      return;
    }

    if (!privacyConsent || !truthConsent) {
      setError("Bitte bestätigen Sie die Datenschutzerklärung und die Richtigkeit Ihrer Angaben.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error: insertError } = await supabase
      .from("applications_student_assistants")
      .insert({
        school_name: schoolInfo.school_name,
        school_street: schoolInfo.school_street,
        school_plz: schoolInfo.school_plz,
        school_city: schoolInfo.school_city,
        principal_name: schoolInfo.principal_name,
        contact_person: schoolInfo.contact_person,
        phone: schoolInfo.phone,
        email: schoolInfo.email,
        teacher_count: schoolInfo.teacher_count
          ? parseInt(schoolInfo.teacher_count)
          : null,
        student_count: schoolInfo.student_count
          ? parseInt(schoolInfo.student_count)
          : null,
        support_technical_setup: supportTechnicalSetup,
        support_onboarding: supportOnboarding,
        support_tech_support: supportTechSupport,
        support_material_creation: supportMaterialCreation,
        support_classroom: supportClassroom,
        support_other: supportOther,
        support_explanation: supportExplanation || null,
        start_date: startDate || null,
        duration: duration || null,
        hours_per_week: hoursPerWeek || null,
        preferred_days: preferredDays || null,
        has_wifi: hasWifi,
        has_devices: hasDevices,
        device_count: hasDevices && deviceCount ? parseInt(deviceCount) : null,
        has_interactive_displays: hasInteractiveDisplays,
        has_school_server: hasSchoolServer,
      });

    if (insertError) {
      console.error("Insert error:", insertError.message);
      setError("Beim Einreichen ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.");
      setLoading(false);
      return;
    }

    // Send confirmation email and notify user on failure
    try {
      const res = await fetch("/api/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "student_assistant",
          email: schoolInfo.email,
          school_name: schoolInfo.school_name,
          contact_person: schoolInfo.contact_person,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) setEmailFailed(true);
    } catch {
      setEmailFailed(true);
    }

    setSuccess(true);
    setLoading(false);
  }

  const inputClass =
    "w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors";

  const checkboxLabel = "flex items-center gap-3 cursor-pointer";
  const checkboxInput =
    "w-4 h-4 rounded border-border text-accent focus:ring-accent-strong";

  if (isAdmin === null) return null;
  if (isAdmin === true) return (
    <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-6 py-8 text-center text-sm text-yellow-800">
      Admin-Accounts können keine Anträge einreichen.
    </div>
  );

  if (success) {
    if (editMode) {
      return (
        <div className="rounded-xl bg-green-50 border border-green-200 px-6 py-8 text-center space-y-4">
          <p className="text-lg font-semibold text-green-800">Änderungen gespeichert!</p>
          <Link
            href="/best-practice/datenbank"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Zur Datenbank
          </Link>
        </div>
      );
    }
    return (
      <>
        {emailFailed && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
              <h2 className="text-lg font-semibold text-primary">
                Bestätigungsmail nicht zugestellt
              </h2>
              <p className="text-sm text-text leading-relaxed">
                Ihr Antrag wurde erfolgreich eingereicht – leider konnte die
                Bestätigungs-E-Mail nicht versendet werden. Bitte informieren
                Sie Kai Krafft direkt über das Kontaktformular.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setEmailFailed(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-border text-text hover:bg-bg transition-colors"
                >
                  Schließen
                </button>
                <a
                  href="/fuer-schulen#kontakt"
                  className="px-4 py-2 text-sm rounded-lg bg-accent text-text font-semibold hover:bg-accent-hover transition-colors"
                >
                  Zum Kontakt
                </a>
              </div>
            </div>
          </div>
        )}
        <FormSuccess
          title="Antrag erfolgreich eingereicht!"
          message="Vielen Dank für Ihren Antrag. Wir prüfen Ihre Angaben und melden uns zeitnah bei Ihnen."
          submittedEmail={schoolInfo.email}
        />
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {!editMode && HoneypotField}
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {!editMode && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-sm text-text-light">
          Im Rahmen des Projekts DigiKI können Grundschulen in Stadt und Landkreis
          Osnabrück kostenlos studentische Hilfskräfte beantragen, die bei der
          Einrichtung digitaler Tools, technischem Support und der
          Materialerstellung unterstützen.
        </div>
      )}

      {/* 1. Schulinfo */}
      <SchoolInfoFields
        values={schoolInfo}
        onChange={handleSchoolInfoChange}
        inputClass={inputClass}
      />

      {/* 2. Gewünschte Unterstützung */}
      <fieldset>
        <legend className="text-lg font-semibold text-primary mb-4">
          2. Gewünschte Unterstützung
        </legend>
        <p className="text-sm text-text-light mb-4">
          Bitte kreuzen Sie die gewünschten Tätigkeitsbereiche an:
        </p>
        <div className="space-y-3">
          <label className={checkboxLabel}>
            <input
              type="checkbox"
              checked={supportTechnicalSetup}
              onChange={(e) => setSupportTechnicalSetup(e.target.checked)}
              className={checkboxInput}
            />
            <span className="text-sm text-text">
              Technische Einrichtung von Tools und Geräten
            </span>
          </label>
          <label className={checkboxLabel}>
            <input
              type="checkbox"
              checked={supportOnboarding}
              onChange={(e) => setSupportOnboarding(e.target.checked)}
              className={checkboxInput}
            />
            <span className="text-sm text-text">
              Ersteinweisung / Onboarding von Lehrkräften
            </span>
          </label>
          <label className={checkboxLabel}>
            <input
              type="checkbox"
              checked={supportTechSupport}
              onChange={(e) => setSupportTechSupport(e.target.checked)}
              className={checkboxInput}
            />
            <span className="text-sm text-text">
              Technischer Support und Fehlerbehebung
            </span>
          </label>
          <label className={checkboxLabel}>
            <input
              type="checkbox"
              checked={supportMaterialCreation}
              onChange={(e) => setSupportMaterialCreation(e.target.checked)}
              className={checkboxInput}
            />
            <span className="text-sm text-text">
              Unterstützung bei der Materialerstellung
            </span>
          </label>
          <label className={checkboxLabel}>
            <input
              type="checkbox"
              checked={supportClassroom}
              onChange={(e) => setSupportClassroom(e.target.checked)}
              className={checkboxInput}
            />
            <span className="text-sm text-text">
              Begleitung im Unterricht bei der Tool-Nutzung
            </span>
          </label>
          <label className={checkboxLabel}>
            <input
              type="checkbox"
              checked={supportOther}
              onChange={(e) => setSupportOther(e.target.checked)}
              className={checkboxInput}
            />
            <span className="text-sm text-text">
              Sonstiges (bitte unten erläutern)
            </span>
          </label>
        </div>
        <div className="mt-4">
          <label
            htmlFor="support_explanation"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Erläuterung / konkreter Bedarf
          </label>
          <textarea
            id="support_explanation"
            rows={3}
            value={supportExplanation}
            onChange={(e) => setSupportExplanation(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="Beschreiben Sie Ihren konkreten Bedarf..."
          />
        </div>
      </fieldset>

      {/* 3. Zeitraum & Umfang */}
      <fieldset>
        <legend className="text-lg font-semibold text-primary mb-4">
          3. Gewünschter Zeitraum &amp; Umfang
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="start_date"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Gewünschter Beginn
            </label>
            <input
              id="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="duration"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Gewünschte Dauer
            </label>
            <input
              id="duration"
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={inputClass}
              placeholder="z.B. 3 Monate"
            />
          </div>
          <div>
            <label
              htmlFor="hours_per_week"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Stunden pro Woche
            </label>
            <input
              id="hours_per_week"
              type="text"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(e.target.value)}
              className={inputClass}
              placeholder="z.B. 5–10 Std."
            />
          </div>
          <div>
            <label
              htmlFor="preferred_days"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Bevorzugte Tage
            </label>
            <input
              id="preferred_days"
              type="text"
              value={preferredDays}
              onChange={(e) => setPreferredDays(e.target.value)}
              className={inputClass}
              placeholder="z.B. Di + Do"
            />
          </div>
        </div>
      </fieldset>

      {/* 4. Technische Voraussetzungen */}
      <fieldset>
        <legend className="text-lg font-semibold text-primary mb-4">
          4. Technische Voraussetzungen an der Schule
        </legend>
        <p className="text-sm text-text-light mb-4">
          Bitte geben Sie an, welche Ausstattung vorhanden ist:
        </p>
        <div className="space-y-3">
          <label className={checkboxLabel}>
            <input
              type="checkbox"
              checked={hasWifi}
              onChange={(e) => setHasWifi(e.target.checked)}
              className={checkboxInput}
            />
            <span className="text-sm text-text">
              WLAN für Lehrkräfte und Schüler/innen verfügbar
            </span>
          </label>
          <div>
            <label className={checkboxLabel}>
              <input
                type="checkbox"
                checked={hasDevices}
                onChange={(e) => setHasDevices(e.target.checked)}
                className={checkboxInput}
              />
              <span className="text-sm text-text">
                Tablets / Laptops vorhanden
              </span>
            </label>
            {hasDevices && (
              <div className="ml-7 mt-2">
                <input
                  type="number"
                  min="0"
                  value={deviceCount}
                  onChange={(e) => setDeviceCount(e.target.value)}
                  className={inputClass + " max-w-[200px]"}
                  placeholder="Anzahl Geräte"
                />
              </div>
            )}
          </div>
          <label className={checkboxLabel}>
            <input
              type="checkbox"
              checked={hasInteractiveDisplays}
              onChange={(e) => setHasInteractiveDisplays(e.target.checked)}
              className={checkboxInput}
            />
            <span className="text-sm text-text">
              Interaktive Displays / Smartboards vorhanden
            </span>
          </label>
          <label className={checkboxLabel}>
            <input
              type="checkbox"
              checked={hasSchoolServer}
              onChange={(e) => setHasSchoolServer(e.target.checked)}
              className={checkboxInput}
            />
            <span className="text-sm text-text">
              Schulserver / Schulnetzwerk vorhanden
            </span>
          </label>
        </div>
      </fieldset>

      {/* Einwilligungen – nur im normalen Modus */}
      {!editMode && (
        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold text-primary mb-4">
            Einwilligungen
          </legend>
          <label className={checkboxLabel}>
            <input
              type="checkbox"
              required
              checked={privacyConsent}
              onChange={(e) => setPrivacyConsent(e.target.checked)}
              className={checkboxInput}
            />
            <span className="text-sm text-text">
              Ich stimme der Verarbeitung meiner Daten gemäß der{" "}
              <Link
                href="/datenschutz"
                target="_blank"
                className="underline text-primary hover:text-primary/80"
              >
                Datenschutzerklärung
              </Link>{" "}
              zu. *
            </span>
          </label>
          <label className={checkboxLabel}>
            <input
              type="checkbox"
              required
              checked={truthConsent}
              onChange={(e) => setTruthConsent(e.target.checked)}
              className={checkboxInput}
            />
            <span className="text-sm text-text">
              Ich bestätige, dass alle gemachten Angaben der Wahrheit entsprechen. *
            </span>
          </label>
        </fieldset>
      )}

      {/* Submit */}
      <div className="pt-4 border-t border-border">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-text hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <Send className="w-5 h-5" aria-hidden="true" />
          {loading
            ? (editMode ? "Wird gespeichert..." : "Wird eingereicht...")
            : (editMode ? "Änderungen speichern" : "Antrag einreichen")}
        </button>
        {!editMode && (
          <p className="mt-3 text-xs text-text-light">
            * Pflichtfelder.
          </p>
        )}
      </div>
    </form>
  );
}
