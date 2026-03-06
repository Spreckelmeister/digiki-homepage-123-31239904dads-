"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import SchoolInfoFields from "./SchoolInfoFields";
import FormSuccess from "./FormSuccess";
import { useHoneypot } from "./useHoneypot";

export default function StudentAssistantForm() {
  const { isSpam, HoneypotField } = useHoneypot();
  const [schoolInfo, setSchoolInfo] = useState({
    school_name: "",
    school_street: "",
    school_plz: "",
    school_city: "",
    principal_name: "",
    contact_person: "",
    phone: "",
    email: "",
    teacher_count: "",
    student_count: "",
  });

  // Gewünschte Unterstützung
  const [supportTechnicalSetup, setSupportTechnicalSetup] = useState(false);
  const [supportOnboarding, setSupportOnboarding] = useState(false);
  const [supportTechSupport, setSupportTechSupport] = useState(false);
  const [supportMaterialCreation, setSupportMaterialCreation] = useState(false);
  const [supportClassroom, setSupportClassroom] = useState(false);
  const [supportOther, setSupportOther] = useState(false);
  const [supportExplanation, setSupportExplanation] = useState("");

  // Zeitraum & Umfang
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState("");
  const [preferredDays, setPreferredDays] = useState("");

  // Technische Voraussetzungen
  const [hasWifi, setHasWifi] = useState(false);
  const [hasDevices, setHasDevices] = useState(false);
  const [deviceCount, setDeviceCount] = useState("");
  const [hasInteractiveDisplays, setHasInteractiveDisplays] = useState(false);
  const [hasSchoolServer, setHasSchoolServer] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleSchoolInfoChange(field: string, value: string) {
    setSchoolInfo((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isSpam) {
      setSuccess(true);
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

    setSuccess(true);
    setLoading(false);
  }

  const inputClass =
    "w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors";

  const checkboxLabel = "flex items-center gap-3 cursor-pointer";
  const checkboxInput =
    "w-4 h-4 rounded border-border text-accent focus:ring-accent";

  if (success) {
    return (
      <FormSuccess
        title="Antrag erfolgreich eingereicht!"
        message="Vielen Dank für Ihren Antrag. Wir prüfen Ihre Angaben und melden uns zeitnah bei Ihnen."
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {HoneypotField}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-sm text-text-light">
        Im Rahmen des Projekts DigiKI können Grundschulen in Stadt und Landkreis
        Osnabrück kostenlos studentische Hilfskräfte beantragen, die bei der
        Einrichtung digitaler Tools, technischem Support und der
        Materialerstellung unterstützen.
      </div>

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

      {/* Submit */}
      <div className="pt-4 border-t border-border">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <Send className="w-5 h-5" aria-hidden="true" />
          {loading ? "Wird eingereicht..." : "Antrag einreichen"}
        </button>
        <p className="mt-3 text-xs text-text-light">
          Mit dem Absenden bestätigen Sie die Richtigkeit Ihrer Angaben.
        </p>
      </div>
    </form>
  );
}
