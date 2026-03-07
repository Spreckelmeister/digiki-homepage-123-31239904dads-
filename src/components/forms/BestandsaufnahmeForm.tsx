"use client";

import { useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import FormSuccess from "./FormSuccess";
import { useHoneypot } from "./useHoneypot";

// Helper: toggle item in array, respecting optional max
function toggle(arr: string[], val: string, max?: number): string[] {
  if (arr.includes(val)) return arr.filter((v) => v !== val);
  if (max !== undefined && arr.length >= max) return arr;
  return [...arr, val];
}

// Simple 1–5 rating row
function RatingRow({
  name,
  value,
  onChange,
  labelLeft,
  labelRight,
}: {
  name: string;
  value: number;
  onChange: (v: number) => void;
  labelLeft: string;
  labelRight: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-1">
      <span className="text-sm text-text-light">{labelLeft}</span>
      <div className="flex gap-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="w-4 h-4 text-accent focus:ring-accent"
            />
            <span className="text-xs text-text-light">{n}</span>
          </label>
        ))}
      </div>
      <span className="text-sm text-text-light">{labelRight}</span>
    </div>
  );
}

export default function BestandsaufnahmeForm() {
  const { isSpam, HoneypotField } = useHoneypot();

  // ── Teil A ──────────────────────────────────────────────────────────────────
  const [schoolName, setSchoolName] = useState("");
  const [schoolLocation, setSchoolLocation] = useState("");
  const [studentCount, setStudentCount] = useState("");
  const [teacherCount, setTeacherCount] = useState("");
  const [isStartchancen, setIsStartchancen] = useState("");
  const [dazShare, setDazShare] = useState("");
  const [respondentRole, setRespondentRole] = useState("");
  const [respondentRoleOther, setRespondentRoleOther] = useState("");

  // ── Teil B ──────────────────────────────────────────────────────────────────
  const [devices, setDevices] = useState<string[]>([]);
  const [devicesOther, setDevicesOther] = useState("");
  const [tabletCount, setTabletCount] = useState("");
  const [wlanRating, setWlanRating] = useState(0);
  const [infrastructure, setInfrastructure] = useState<string[]>([]);
  const [infrastructureOther, setInfrastructureOther] = useState("");
  const [challenges, setChallenges] = useState<string[]>([]);
  const [challengesOther, setChallengesOther] = useState("");
  const [supportSatisfaction, setSupportSatisfaction] = useState(0);

  // ── Teil C ──────────────────────────────────────────────────────────────────
  const [digitizationLevel, setDigitizationLevel] = useState(0);
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const [toolsUsedOther, setToolsUsedOther] = useState("");
  const [usageFrequency, setUsageFrequency] = useState("");
  const [diagnosticTools, setDiagnosticTools] = useState<string[]>([]);
  const [diagnosticToolsOther, setDiagnosticToolsOther] = useState("");
  const [mediaConcept, setMediaConcept] = useState("");
  const [mediaResponsible, setMediaResponsible] = useState("");

  // ── Teil D ──────────────────────────────────────────────────────────────────
  const [aiUsage, setAiUsage] = useState("");
  const [aiPurposes, setAiPurposes] = useState<string[]>([]);
  const [aiToolsUsed, setAiToolsUsed] = useState<string[]>([]);
  const [aiToolsOther, setAiToolsOther] = useState("");
  const [aiCompetence, setAiCompetence] = useState(0);
  const [aiConcerns, setAiConcerns] = useState<string[]>([]);
  const [aiConcernsOther, setAiConcernsOther] = useState("");
  const [aiTrainings, setAiTrainings] = useState<string[]>([]);
  const [aiTrainingsOther, setAiTrainingsOther] = useState("");

  // ── Teil E ──────────────────────────────────────────────────────────────────
  const [trainingNeeds, setTrainingNeeds] = useState<string[]>([]);
  const [trainingFormat, setTrainingFormat] = useState<string[]>([]);
  const [trainingTimes, setTrainingTimes] = useState<string[]>([]);
  const [participationCount, setParticipationCount] = useState("");
  const [pioneerInterest, setPioneerInterest] = useState("");

  // ── Teil F ──────────────────────────────────────────────────────────────────
  const [hasBestPractice, setHasBestPractice] = useState("");
  const [bestPracticeDescription, setBestPracticeDescription] = useState("");
  const [sharePractice, setSharePractice] = useState("");

  // ── Teil G ──────────────────────────────────────────────────────────────────
  const [supportNeeds, setSupportNeeds] = useState<string[]>([]);
  const [softwareLicenses, setSoftwareLicenses] = useState<string[]>([]);
  const [softwareLicensesOther, setSoftwareLicensesOther] = useState("");
  const [studentSupport, setStudentSupport] = useState("");
  const [timeForTools, setTimeForTools] = useState("");

  // ── Teil H ──────────────────────────────────────────────────────────────────
  const [projectWishes, setProjectWishes] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // ── Einwilligungen ──────────────────────────────────────────────────────────
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [truthConsent, setTruthConsent] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isSpam) {
      setSuccess(true);
      return;
    }

    if (!privacyConsent || !truthConsent) {
      setError(
        "Bitte bestätigen Sie die Datenschutzerklärung und die Richtigkeit Ihrer Angaben."
      );
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("bestandsaufnahme_responses")
      .insert({
        school_name: schoolName,
        school_location: schoolLocation,
        student_count: studentCount,
        teacher_count: teacherCount || null,
        is_startchancen_school: isStartchancen,
        daz_share: dazShare,
        respondent_role: respondentRole,
        respondent_role_other: respondentRoleOther || null,
        devices,
        devices_other: devicesOther || null,
        tablet_count: tabletCount || null,
        wlan_rating: wlanRating || null,
        infrastructure,
        infrastructure_other: infrastructureOther || null,
        challenges,
        challenges_other: challengesOther || null,
        support_satisfaction: supportSatisfaction || null,
        digitization_level: digitizationLevel || null,
        tools_used: toolsUsed,
        tools_used_other: toolsUsedOther || null,
        usage_frequency: usageFrequency || null,
        diagnostic_tools: diagnosticTools,
        diagnostic_tools_other: diagnosticToolsOther || null,
        media_concept: mediaConcept || null,
        media_responsible: mediaResponsible || null,
        ai_usage: aiUsage || null,
        ai_purposes: aiPurposes,
        ai_tools_used: aiToolsUsed,
        ai_tools_other: aiToolsOther || null,
        ai_competence: aiCompetence || null,
        ai_concerns: aiConcerns,
        ai_concerns_other: aiConcernsOther || null,
        ai_trainings: aiTrainings,
        ai_trainings_other: aiTrainingsOther || null,
        training_needs: trainingNeeds,
        training_format: trainingFormat,
        training_times: trainingTimes,
        participation_count: participationCount || null,
        pioneer_interest: pioneerInterest || null,
        has_best_practice: hasBestPractice || null,
        best_practice_description: bestPracticeDescription || null,
        share_practice: sharePractice || null,
        support_needs: supportNeeds,
        software_licenses: softwareLicenses,
        software_licenses_other: softwareLicensesOther || null,
        student_support: studentSupport || null,
        time_for_tools: timeForTools || null,
        project_wishes: projectWishes || null,
        additional_notes: additionalNotes || null,
      });

    if (insertError) {
      console.error("Insert error:", insertError.message);
      setError(
        "Beim Einreichen ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  const inputClass =
    "w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors";
  const cbLabel = "flex items-start gap-3 cursor-pointer";
  const cbInput =
    "mt-0.5 w-4 h-4 rounded border-border text-accent focus:ring-accent shrink-0";
  const radioLabel = "flex items-center gap-2 cursor-pointer";
  const radioInput = "w-4 h-4 text-accent focus:ring-accent";

  if (success) {
    return (
      <FormSuccess
        title="Vielen Dank für Ihre Teilnahme!"
        message="Ihre Antworten wurden erfolgreich übermittelt. Wir melden uns zeitnah bei Ihnen."
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      {HoneypotField}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* ── Teil A: Allgemeine Angaben ──────────────────────────────────────── */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-bold text-primary pb-2 border-b border-border w-full">
          🏫 Teil A: Allgemeine Angaben
        </legend>

        {/* 1. Name der Schule */}
        <div>
          <label
            htmlFor="schoolName"
            className="block text-sm font-medium text-text mb-1.5"
          >
            1. Name der Schule *
          </label>
          <input
            id="schoolName"
            type="text"
            required
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className={inputClass}
            placeholder="z. B. Grundschule Musterstadt"
          />
        </div>

        {/* 2. Schulstandort */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            2. Schulstandort *
          </legend>
          <div className="space-y-2">
            {["Stadt Osnabrück", "Landkreis Osnabrück"].map((opt) => (
              <label key={opt} className={radioLabel}>
                <input
                  type="radio"
                  name="schoolLocation"
                  value={opt}
                  required
                  checked={schoolLocation === opt}
                  onChange={() => setSchoolLocation(opt)}
                  className={radioInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 3. Schüleranzahl */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            3. Anzahl der Schüler*innen *
          </legend>
          <div className="space-y-2">
            {["unter 150", "150–300", "300–450", "über 450"].map((opt) => (
              <label key={opt} className={radioLabel}>
                <input
                  type="radio"
                  name="studentCount"
                  value={opt}
                  required
                  checked={studentCount === opt}
                  onChange={() => setStudentCount(opt)}
                  className={radioInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 4. Anzahl Lehrkräfte */}
        <div>
          <label
            htmlFor="teacherCount"
            className="block text-sm font-medium text-text mb-1.5"
          >
            4. Anzahl der Lehrkräfte (inkl. Teilzeit) *
          </label>
          <input
            id="teacherCount"
            type="number"
            required
            min={1}
            value={teacherCount}
            onChange={(e) => setTeacherCount(e.target.value)}
            className={inputClass}
            placeholder="z. B. 18"
          />
        </div>

        {/* 5. Startchancen-Schule */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            5. Ist Ihre Schule eine Startchancen-Schule? *
          </legend>
          <div className="space-y-2">
            {["Ja", "Nein"].map((opt) => (
              <label key={opt} className={radioLabel}>
                <input
                  type="radio"
                  name="isStartchancen"
                  value={opt}
                  required
                  checked={isStartchancen === opt}
                  onChange={() => setIsStartchancen(opt)}
                  className={radioInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 6. DaZ-Anteil */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            6. Wie hoch ist der Anteil der Kinder mit DaZ-Bedarf (Deutsch als
            Zweitsprache) an Ihrer Schule? *
          </legend>
          <div className="space-y-2">
            {[
              "Unter 10 %",
              "10–25 %",
              "25–50 %",
              "Über 50 %",
              "Kann ich nicht einschätzen",
            ].map((opt) => (
              <label key={opt} className={radioLabel}>
                <input
                  type="radio"
                  name="dazShare"
                  value={opt}
                  required
                  checked={dazShare === opt}
                  onChange={() => setDazShare(opt)}
                  className={radioInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 7. Wer füllt aus */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            7. Wer füllt diese Umfrage aus?
          </legend>
          <div className="space-y-2">
            {["Schulleitung", "IT-Beauftragte/r", "Medienbeauftragte/r"].map(
              (opt) => (
                <label key={opt} className={radioLabel}>
                  <input
                    type="radio"
                    name="respondentRole"
                    value={opt}
                    checked={respondentRole === opt}
                    onChange={() => setRespondentRole(opt)}
                    className={radioInput}
                  />
                  <span className="text-sm text-text">{opt}</span>
                </label>
              )
            )}
            <label className={radioLabel}>
              <input
                type="radio"
                name="respondentRole"
                value="Sonstiges"
                checked={respondentRole === "Sonstiges"}
                onChange={() => setRespondentRole("Sonstiges")}
                className={radioInput}
              />
              <span className="text-sm text-text">Sonstiges:</span>
            </label>
            {respondentRole === "Sonstiges" && (
              <input
                type="text"
                value={respondentRoleOther}
                onChange={(e) => setRespondentRoleOther(e.target.value)}
                className={inputClass + " ml-6"}
                placeholder="Bitte angeben"
              />
            )}
          </div>
        </fieldset>
      </fieldset>

      {/* ── Teil B: Technische Ausstattung ─────────────────────────────────── */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-bold text-primary pb-2 border-b border-border w-full">
          💻 Teil B: Technische Ausstattung &amp; Infrastruktur
        </legend>

        {/* 8. Geräte */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            8. Welche digitalen Endgeräte stehen für den Unterricht zur
            Verfügung? (Mehrfachauswahl)
          </legend>
          <div className="space-y-2">
            {[
              "iPads/Tablets",
              "Laptops/Notebooks",
              "Desktop-PCs",
              "Interaktive Displays/Smartboards",
              "Dokumentenkameras",
              "Roboter (z. B. Calliope, Bee-Bot)",
            ].map((opt) => (
              <label key={opt} className={cbLabel}>
                <input
                  type="checkbox"
                  checked={devices.includes(opt)}
                  onChange={() => setDevices(toggle(devices, opt))}
                  className={cbInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
            <label className={cbLabel}>
              <input
                type="checkbox"
                checked={devices.includes("Sonstiges")}
                onChange={() => setDevices(toggle(devices, "Sonstiges"))}
                className={cbInput}
              />
              <span className="text-sm text-text">Sonstiges:</span>
            </label>
            {devices.includes("Sonstiges") && (
              <input
                type="text"
                value={devicesOther}
                onChange={(e) => setDevicesOther(e.target.value)}
                className={inputClass + " ml-6"}
                placeholder="Bitte angeben"
              />
            )}
          </div>
        </fieldset>

        {/* 9. Tablet-Anzahl */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            9. Wie viele Tablets/iPads stehen für den Unterricht zur Verfügung?
          </legend>
          <div className="space-y-2">
            {[
              "Keine",
              "1–10",
              "11–20",
              "21–30",
              "Mehr als 30",
              "1:1-Ausstattung (jedes Kind ein Gerät)",
            ].map((opt) => (
              <label key={opt} className={radioLabel}>
                <input
                  type="radio"
                  name="tabletCount"
                  value={opt}
                  checked={tabletCount === opt}
                  onChange={() => setTabletCount(opt)}
                  className={radioInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 10. WLAN */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            10. Wie bewerten Sie die WLAN-Abdeckung in Ihrer Schule?
          </legend>
          <RatingRow
            name="wlanRating"
            value={wlanRating}
            onChange={setWlanRating}
            labelLeft="1 = sehr schlecht"
            labelRight="5 = sehr gut"
          />
        </fieldset>

        {/* 11. Infrastruktur */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            11. Welche digitale Infrastruktur nutzen Sie? (Mehrfachauswahl)
          </legend>
          <div className="space-y-2">
            {[
              "IServ",
              "Microsoft 365 / Teams",
              "Google Workspace",
              "Schulserver (lokal)",
              "Schul-Cloud Niedersachsen",
            ].map((opt) => (
              <label key={opt} className={cbLabel}>
                <input
                  type="checkbox"
                  checked={infrastructure.includes(opt)}
                  onChange={() =>
                    setInfrastructure(toggle(infrastructure, opt))
                  }
                  className={cbInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
            <label className={cbLabel}>
              <input
                type="checkbox"
                checked={infrastructure.includes("Sonstiges")}
                onChange={() =>
                  setInfrastructure(toggle(infrastructure, "Sonstiges"))
                }
                className={cbInput}
              />
              <span className="text-sm text-text">Sonstiges:</span>
            </label>
            {infrastructure.includes("Sonstiges") && (
              <input
                type="text"
                value={infrastructureOther}
                onChange={(e) => setInfrastructureOther(e.target.value)}
                className={inputClass + " ml-6"}
                placeholder="Bitte angeben"
              />
            )}
          </div>
        </fieldset>

        {/* 12. Herausforderungen */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            12. Welche Herausforderungen erleben Sie aktuell bei der
            Digitalisierung Ihrer Schule? (Mehrfachauswahl)
          </legend>
          <div className="space-y-2">
            {[
              "Einrichtung/Konfiguration der Geräte dauert zu lange",
              "Zu wenig verfügbare Geräte für den Unterricht",
              "WLAN ist instabil oder nicht flächendeckend",
              "Software-Updates und Wartung binden zu viel Zeit",
              "Fehlender oder langsamer technischer Support",
              "Keine Entlastungsstunden für digitale Koordination",
              "Mangelnde Kompatibilität zwischen Geräten/Systemen",
              "Unklare Zuständigkeiten (Schul-IT, Schulträger, Medienzentrum)",
              "Datenschutzanforderungen erschweren den Tool-Einsatz",
              "Fehlende Fortbildungsmöglichkeiten",
              "Zeitmangel im Kollegium für die Einarbeitung",
              "Skepsis/Widerstand im Kollegium",
            ].map((opt) => (
              <label key={opt} className={cbLabel}>
                <input
                  type="checkbox"
                  checked={challenges.includes(opt)}
                  onChange={() => setChallenges(toggle(challenges, opt))}
                  className={cbInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
            <label className={cbLabel}>
              <input
                type="checkbox"
                checked={challenges.includes("Sonstiges")}
                onChange={() => setChallenges(toggle(challenges, "Sonstiges"))}
                className={cbInput}
              />
              <span className="text-sm text-text">Sonstiges:</span>
            </label>
            {challenges.includes("Sonstiges") && (
              <input
                type="text"
                value={challengesOther}
                onChange={(e) => setChallengesOther(e.target.value)}
                className={inputClass + " ml-6"}
                placeholder="Bitte angeben"
              />
            )}
          </div>
        </fieldset>

        {/* 13. Support-Zufriedenheit */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            13. Wie zufrieden sind Sie mit dem technischen Support für Ihre
            Schule?
          </legend>
          <RatingRow
            name="supportSatisfaction"
            value={supportSatisfaction}
            onChange={setSupportSatisfaction}
            labelLeft="1 = sehr unzufrieden"
            labelRight="5 = sehr zufrieden"
          />
        </fieldset>
      </fieldset>

      {/* ── Teil C: Aktueller Stand der Digitalisierung ─────────────────────── */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-bold text-primary pb-2 border-b border-border w-full">
          📊 Teil C: Aktueller Stand der Digitalisierung
        </legend>

        {/* 14. Digitalisierungsgrad */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            14. Wie würden Sie den Digitalisierungsgrad Ihrer Schule insgesamt
            einschätzen?
          </legend>
          <RatingRow
            name="digitizationLevel"
            value={digitizationLevel}
            onChange={setDigitizationLevel}
            labelLeft="1 = am Anfang"
            labelRight="5 = sehr fortgeschritten"
          />
        </fieldset>

        {/* 15. Tools */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            15. Welche digitalen Tools/Plattformen werden bereits im Unterricht
            eingesetzt? (Mehrfachauswahl)
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              "Anton App",
              "Antolin",
              "Worksheet Crafter",
              "BookCreator",
              "LearningApps",
              "Onilo",
              "Leseo",
              "Matific",
              "bettermarks",
              "Mathegym",
              "Sofatutor",
              "Padlet",
              "Kahoot",
              "H5P",
            ].map((opt) => (
              <label key={opt} className={cbLabel}>
                <input
                  type="checkbox"
                  checked={toolsUsed.includes(opt)}
                  onChange={() => setToolsUsed(toggle(toolsUsed, opt))}
                  className={cbInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
          <div className="mt-2 space-y-2">
            <label className={cbLabel}>
              <input
                type="checkbox"
                checked={toolsUsed.includes("Sonstiges")}
                onChange={() => setToolsUsed(toggle(toolsUsed, "Sonstiges"))}
                className={cbInput}
              />
              <span className="text-sm text-text">Sonstiges:</span>
            </label>
            {toolsUsed.includes("Sonstiges") && (
              <input
                type="text"
                value={toolsUsedOther}
                onChange={(e) => setToolsUsedOther(e.target.value)}
                className={inputClass + " ml-6"}
                placeholder="Bitte angeben"
              />
            )}
          </div>
        </fieldset>

        {/* 16. Häufigkeit */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            16. Wie häufig setzen Lehrkräfte an Ihrer Schule digitale Medien im
            Unterricht ein?
          </legend>
          <div className="space-y-2">
            {[
              "Täglich",
              "Mehrmals pro Woche",
              "Einmal pro Woche",
              "Mehrmals im Monat",
              "Selten/gar nicht",
            ].map((opt) => (
              <label key={opt} className={radioLabel}>
                <input
                  type="radio"
                  name="usageFrequency"
                  value={opt}
                  checked={usageFrequency === opt}
                  onChange={() => setUsageFrequency(opt)}
                  className={radioInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 17. Diagnostik */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            17. Nutzen Sie digitale Diagnostik-Tools? (Mehrfachauswahl)
          </legend>
          <div className="space-y-2">
            {[
              "ILeA digital",
              "ELFE II digital",
              "Levumi",
              "Quop",
              "Nein, keine digitale Diagnostik",
            ].map((opt) => (
              <label key={opt} className={cbLabel}>
                <input
                  type="checkbox"
                  checked={diagnosticTools.includes(opt)}
                  onChange={() =>
                    setDiagnosticTools(toggle(diagnosticTools, opt))
                  }
                  className={cbInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
            <label className={cbLabel}>
              <input
                type="checkbox"
                checked={diagnosticTools.includes("Sonstiges")}
                onChange={() =>
                  setDiagnosticTools(toggle(diagnosticTools, "Sonstiges"))
                }
                className={cbInput}
              />
              <span className="text-sm text-text">Sonstiges:</span>
            </label>
            {diagnosticTools.includes("Sonstiges") && (
              <input
                type="text"
                value={diagnosticToolsOther}
                onChange={(e) => setDiagnosticToolsOther(e.target.value)}
                className={inputClass + " ml-6"}
                placeholder="Bitte angeben"
              />
            )}
          </div>
        </fieldset>

        {/* 18. Medienkonzept */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            18. Haben Sie ein aktuelles Medienkonzept?
          </legend>
          <div className="space-y-2">
            {[
              "Ja, aktuell (< 2 Jahre alt)",
              "Ja, aber veraltet",
              "Nein, in Arbeit",
              "Nein",
            ].map((opt) => (
              <label key={opt} className={radioLabel}>
                <input
                  type="radio"
                  name="mediaConcept"
                  value={opt}
                  checked={mediaConcept === opt}
                  onChange={() => setMediaConcept(opt)}
                  className={radioInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 19. Medienbeauftragte */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            19. Gibt es an Ihrer Schule eine medienbeauftragte Person?
          </legend>
          <div className="space-y-2">
            {[
              "Ja, mit Entlastungsstunden",
              "Ja, ohne Entlastungsstunden",
              "Nein",
            ].map((opt) => (
              <label key={opt} className={radioLabel}>
                <input
                  type="radio"
                  name="mediaResponsible"
                  value={opt}
                  checked={mediaResponsible === opt}
                  onChange={() => setMediaResponsible(opt)}
                  className={radioInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </fieldset>

      {/* ── Teil D: KI ──────────────────────────────────────────────────────── */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-bold text-primary pb-2 border-b border-border w-full">
          🤖 Teil D: Künstliche Intelligenz (KI)
        </legend>

        {/* 20. KI-Nutzung */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            20. Nutzen Lehrkräfte an Ihrer Schule bereits KI-Tools? (z. B.
            ChatGPT, Claude, Gemini, Copilot)
          </legend>
          <div className="space-y-2">
            {[
              "Ja, mehrere Lehrkräfte regelmäßig",
              "Ja, einzelne Lehrkräfte gelegentlich",
              "Nein, aber Interesse vorhanden",
              "Nein, kein Interesse",
              "Unsicher",
            ].map((opt) => (
              <label key={opt} className={radioLabel}>
                <input
                  type="radio"
                  name="aiUsage"
                  value={opt}
                  checked={aiUsage === opt}
                  onChange={() => setAiUsage(opt)}
                  className={radioInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 21. KI wofür */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            21. Falls KI genutzt wird – wofür? (Mehrfachauswahl)
          </legend>
          <div className="space-y-2">
            {[
              "Unterrichtsvorbereitung (Arbeitsblätter, Aufgaben)",
              "Differenzierung/Individualisierung",
              "Textübersetzung/Leichte Sprache",
              "Elternkommunikation",
              "Verwaltungsaufgaben (Protokolle, Berichte)",
              "Förderplanung",
              "Recherche/Fortbildung",
              "Sonstiges",
            ].map((opt) => (
              <label key={opt} className={cbLabel}>
                <input
                  type="checkbox"
                  checked={aiPurposes.includes(opt)}
                  onChange={() => setAiPurposes(toggle(aiPurposes, opt))}
                  className={cbInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 22. KI-Tools */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            22. Welche KI-Tools werden konkret genutzt? (Mehrfachauswahl)
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              "ChatGPT",
              "Claude (Anthropic)",
              "Google Gemini",
              "Microsoft Copilot",
              "Fobizz KI-Assistenz",
              "DeepL",
              "Canva AI",
              "Telli",
            ].map((opt) => (
              <label key={opt} className={cbLabel}>
                <input
                  type="checkbox"
                  checked={aiToolsUsed.includes(opt)}
                  onChange={() => setAiToolsUsed(toggle(aiToolsUsed, opt))}
                  className={cbInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
          <div className="mt-2 space-y-2">
            <label className={cbLabel}>
              <input
                type="checkbox"
                checked={aiToolsUsed.includes("Sonstiges")}
                onChange={() =>
                  setAiToolsUsed(toggle(aiToolsUsed, "Sonstiges"))
                }
                className={cbInput}
              />
              <span className="text-sm text-text">Sonstiges:</span>
            </label>
            {aiToolsUsed.includes("Sonstiges") && (
              <input
                type="text"
                value={aiToolsOther}
                onChange={(e) => setAiToolsOther(e.target.value)}
                className={inputClass + " ml-6"}
                placeholder="Bitte angeben"
              />
            )}
          </div>
        </fieldset>

        {/* 23. KI-Kompetenzniveau */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            23. Wie schätzen Sie das KI-Kompetenzniveau im Kollegium insgesamt
            ein?
          </legend>
          <RatingRow
            name="aiCompetence"
            value={aiCompetence}
            onChange={setAiCompetence}
            labelLeft="1 = keine Kenntnisse"
            labelRight="5 = sehr kompetent"
          />
        </fieldset>

        {/* 24. KI-Bedenken */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            24. Welche Bedenken bestehen im Kollegium gegenüber KI?
            (Mehrfachauswahl)
          </legend>
          <div className="space-y-2">
            {[
              "Datenschutz/DSGVO",
              "Urheberrecht",
              "Qualität/Zuverlässigkeit der Ergebnisse",
              "Fehlende Kompetenzen",
              "Zeitmangel für Einarbeitung",
              "Pädagogische Bedenken (z. B. Bildschirmzeit)",
              "Technische Hürden",
              "AI-Act / Rechtsunsicherheit",
              "Keine Bedenken",
            ].map((opt) => (
              <label key={opt} className={cbLabel}>
                <input
                  type="checkbox"
                  checked={aiConcerns.includes(opt)}
                  onChange={() => setAiConcerns(toggle(aiConcerns, opt))}
                  className={cbInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
            <label className={cbLabel}>
              <input
                type="checkbox"
                checked={aiConcerns.includes("Sonstiges")}
                onChange={() =>
                  setAiConcerns(toggle(aiConcerns, "Sonstiges"))
                }
                className={cbInput}
              />
              <span className="text-sm text-text">Sonstiges:</span>
            </label>
            {aiConcerns.includes("Sonstiges") && (
              <input
                type="text"
                value={aiConcernsOther}
                onChange={(e) => setAiConcernsOther(e.target.value)}
                className={inputClass + " ml-6"}
                placeholder="Bitte angeben"
              />
            )}
          </div>
        </fieldset>

        {/* 25. KI-Fortbildungen */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            25. Hat Ihre Schule bereits an KI-bezogenen Fortbildungen
            teilgenommen? (Mehrfachauswahl)
          </legend>
          <div className="space-y-2">
            {[
              "Ja, über Fobizz",
              "Ja, über das KOS",
              "Ja, über andere Anbieter",
              "Nein, aber Interesse",
              "Nein, kein Interesse",
            ].map((opt) => (
              <label key={opt} className={cbLabel}>
                <input
                  type="checkbox"
                  checked={aiTrainings.includes(opt)}
                  onChange={() => setAiTrainings(toggle(aiTrainings, opt))}
                  className={cbInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
            <label className={cbLabel}>
              <input
                type="checkbox"
                checked={aiTrainings.includes("Sonstiges")}
                onChange={() =>
                  setAiTrainings(toggle(aiTrainings, "Sonstiges"))
                }
                className={cbInput}
              />
              <span className="text-sm text-text">Sonstiges:</span>
            </label>
            {aiTrainings.includes("Sonstiges") && (
              <input
                type="text"
                value={aiTrainingsOther}
                onChange={(e) => setAiTrainingsOther(e.target.value)}
                className={inputClass + " ml-6"}
                placeholder="Bitte angeben"
              />
            )}
          </div>
        </fieldset>
      </fieldset>

      {/* ── Teil E: Fortbildungsbedarf ──────────────────────────────────────── */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-bold text-primary pb-2 border-b border-border w-full">
          🎓 Teil E: Fortbildungsbedarf &amp; Wünsche
        </legend>

        {/* 26. Fortbildungsbedarf */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            26. In welchen Bereichen besteht der größte Fortbildungsbedarf?{" "}
            <span className="font-normal text-text-light">(max. 5)</span>
            {trainingNeeds.length > 0 && (
              <span className="ml-2 text-accent font-normal">
                ({trainingNeeds.length}/5)
              </span>
            )}
          </legend>
          <div className="space-y-2">
            {[
              "KI-Grundlagen und Einsatzmöglichkeiten",
              "Rechtssicherer KI-Einsatz (DSGVO, AI-Act)",
              "KI für Unterrichtsvorbereitung und Materialerstellung",
              "Digitale Förderdiagnostik",
              "Adaptive Lernplattformen (Mathe/Deutsch)",
              "Sprachförderung/DaZ mit digitalen Tools",
              "Digitale Produktion (Videos, Podcasts)",
              "Making & Coding (3D-Druck, Robotik, Scratch)",
              "Interaktive Displays effektiv nutzen",
              "Tablets im Unterricht einsetzen",
              "Medienkonzeptentwicklung",
              "Change Management / Digitale Schulentwicklung",
              "Sonstiges",
            ].map((opt) => {
              const maxReached =
                !trainingNeeds.includes(opt) && trainingNeeds.length >= 5;
              return (
                <label key={opt} className={cbLabel}>
                  <input
                    type="checkbox"
                    checked={trainingNeeds.includes(opt)}
                    onChange={() =>
                      setTrainingNeeds(toggle(trainingNeeds, opt, 5))
                    }
                    className={cbInput}
                    disabled={maxReached}
                  />
                  <span
                    className={`text-sm ${maxReached ? "text-text-light" : "text-text"}`}
                  >
                    {opt}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* 27. Schulungsformat */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            27. Welches Schulungsformat bevorzugen Sie? (Mehrfachauswahl)
          </legend>
          <div className="space-y-2">
            {[
              "Ganztägige Präsenzschulungen (extern)",
              "Halbtägige Workshops",
              "Schulinterne Fortbildungen (SchiLF)",
              "Online-Schulungen (synchron)",
              "Online-Selbstlernkurse (asynchron)",
              "Peer-Learning (Austausch mit anderen Schulen)",
              "Individuelle Begleitung vor Ort (z. B. durch Studierende)",
            ].map((opt) => (
              <label key={opt} className={cbLabel}>
                <input
                  type="checkbox"
                  checked={trainingFormat.includes(opt)}
                  onChange={() =>
                    setTrainingFormat(toggle(trainingFormat, opt))
                  }
                  className={cbInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 28. Zeiten */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            28. Zu welchen Zeiten können Lehrkräfte an Fortbildungen
            teilnehmen? (Mehrfachauswahl)
          </legend>
          <div className="space-y-2">
            {[
              "Während der Unterrichtszeit (mit Vertretung)",
              "Nachmittags (nach Unterrichtsschluss)",
              "An Studientagen",
              "In den Ferien",
              "Samstags",
            ].map((opt) => (
              <label key={opt} className={cbLabel}>
                <input
                  type="checkbox"
                  checked={trainingTimes.includes(opt)}
                  onChange={() =>
                    setTrainingTimes(toggle(trainingTimes, opt))
                  }
                  className={cbInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 29. Teilnehmeranzahl */}
        <div>
          <label
            htmlFor="participationCount"
            className="block text-sm font-medium text-text mb-1.5"
          >
            29. Wie viele Lehrkräfte Ihrer Schule würden voraussichtlich an den
            DigiKI-Schulungen teilnehmen?
          </label>
          <input
            id="participationCount"
            type="number"
            min={0}
            value={participationCount}
            onChange={(e) => setParticipationCount(e.target.value)}
            className={inputClass}
            placeholder="z. B. 10"
          />
        </div>

        {/* 30. Vorreiter-Schule */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            30. Hätte Ihre Schule Interesse, als „Vorreiter-Schule" frühzeitig
            mit der Erprobung digitaler Tools zu beginnen (ab Monat 4)?
          </legend>
          <div className="space-y-2">
            {[
              "Ja, sehr gerne",
              "Ja, unter bestimmten Voraussetzungen",
              "Nein, wir möchten erst die Schulungen abwarten",
            ].map((opt) => (
              <label key={opt} className={radioLabel}>
                <input
                  type="radio"
                  name="pioneerInterest"
                  value={opt}
                  checked={pioneerInterest === opt}
                  onChange={() => setPioneerInterest(opt)}
                  className={radioInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </fieldset>

      {/* ── Teil F: Best Practices ──────────────────────────────────────────── */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-bold text-primary pb-2 border-b border-border w-full">
          ⭐ Teil F: Best Practices &amp; Erfolgsgeschichten
        </legend>

        {/* 31. Best Practice */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            31. Gibt es an Ihrer Schule besonders gelungene Beispiele für den
            Einsatz digitaler Medien oder KI?
          </legend>
          <div className="space-y-2">
            {["Ja", "Nein"].map((opt) => (
              <label key={opt} className={radioLabel}>
                <input
                  type="radio"
                  name="hasBestPractice"
                  value={opt}
                  checked={hasBestPractice === opt}
                  onChange={() => setHasBestPractice(opt)}
                  className={radioInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 32. Beschreibung (nur wenn Ja) */}
        {hasBestPractice === "Ja" && (
          <div>
            <label
              htmlFor="bestPracticeDescription"
              className="block text-sm font-medium text-text mb-1.5"
            >
              32. Falls ja, beschreiben Sie bitte kurz (Fach, Tool, Ergebnis):
            </label>
            <textarea
              id="bestPracticeDescription"
              rows={4}
              value={bestPracticeDescription}
              onChange={(e) => setBestPracticeDescription(e.target.value)}
              className={inputClass + " resize-y"}
              placeholder="z. B. Mathematikunterricht mit Matific in Klasse 3 – die Kinder lernten eigenständig."
            />
          </div>
        )}

        {/* 33. Teilen */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            33. Wären Sie bereit, Ihre Erfahrungen als Best-Practice-Schule mit
            anderen Schulen zu teilen?
          </legend>
          <div className="space-y-2">
            {[
              "Ja, sehr gerne",
              "Ja, unter bestimmten Voraussetzungen",
              "Nein, aktuell nicht",
              "Vielleicht später",
            ].map((opt) => (
              <label key={opt} className={radioLabel}>
                <input
                  type="radio"
                  name="sharePractice"
                  value={opt}
                  checked={sharePractice === opt}
                  onChange={() => setSharePractice(opt)}
                  className={radioInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </fieldset>

      {/* ── Teil G: Unterstützungsbedarf ────────────────────────────────────── */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-bold text-primary pb-2 border-b border-border w-full">
          🛠️ Teil G: Unterstützungsbedarf &amp; Ressourcen
        </legend>

        {/* 34. Unterstützung */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            34. Welche Unterstützung würde Ihrer Schule am meisten helfen?{" "}
            <span className="font-normal text-text-light">(max. 3)</span>
            {supportNeeds.length > 0 && (
              <span className="ml-2 text-accent font-normal">
                ({supportNeeds.length}/3)
              </span>
            )}
          </legend>
          <div className="space-y-2">
            {[
              "Finanzierung von Software-Lizenzen",
              "Studentische Hilfskräfte für technischen Support",
              "Praxisnahe Fortbildungen",
              "Entlastungsstunden für digitale Koordination",
              "Bessere technische Infrastruktur (WLAN, Geräte)",
              "Best-Practice-Materialien und Vorlagen",
              "Regelmäßiger Austausch mit anderen Schulen",
              "Individuelle Beratung / Coaching",
            ].map((opt) => {
              const maxReached =
                !supportNeeds.includes(opt) && supportNeeds.length >= 3;
              return (
                <label key={opt} className={cbLabel}>
                  <input
                    type="checkbox"
                    checked={supportNeeds.includes(opt)}
                    onChange={() =>
                      setSupportNeeds(toggle(supportNeeds, opt, 3))
                    }
                    className={cbInput}
                    disabled={maxReached}
                  />
                  <span
                    className={`text-sm ${maxReached ? "text-text-light" : "text-text"}`}
                  >
                    {opt}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* 35. Software-Lizenzen */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            35. Welche Software-Lizenzen würden Sie sich für Ihre Schule
            wünschen? (Mehrfachauswahl)
          </legend>
          <div className="space-y-2">
            {[
              "Adaptive Mathe-Plattform (z. B. Matific, bettermarks)",
              "Leseförderung (z. B. Antolin Plus, Leseo, Onilo)",
              "DaZ/LRS-Förderung (z. B. Deutschfuchs, Meister Cody)",
              "Materialerstellung (z. B. Worksheet Crafter, BookCreator)",
              "KI-Assistenz (z. B. Fobizz, SchulKI)",
            ].map((opt) => (
              <label key={opt} className={cbLabel}>
                <input
                  type="checkbox"
                  checked={softwareLicenses.includes(opt)}
                  onChange={() =>
                    setSoftwareLicenses(toggle(softwareLicenses, opt))
                  }
                  className={cbInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
            <label className={cbLabel}>
              <input
                type="checkbox"
                checked={softwareLicenses.includes("Sonstiges")}
                onChange={() =>
                  setSoftwareLicenses(toggle(softwareLicenses, "Sonstiges"))
                }
                className={cbInput}
              />
              <span className="text-sm text-text">Sonstiges:</span>
            </label>
            {softwareLicenses.includes("Sonstiges") && (
              <input
                type="text"
                value={softwareLicensesOther}
                onChange={(e) => setSoftwareLicensesOther(e.target.value)}
                className={inputClass + " ml-6"}
                placeholder="Bitte angeben"
              />
            )}
          </div>
        </fieldset>

        {/* 36. Studentische Unterstützung */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            36. Hätten Sie Interesse an studentischer Unterstützung?
          </legend>
          <div className="space-y-2">
            {[
              "Ja, für technische Einrichtung",
              "Ja, für Unterrichtsbegleitung",
              "Ja, für beides",
              "Nein, aktuell kein Bedarf",
            ].map((opt) => (
              <label key={opt} className={radioLabel}>
                <input
                  type="radio"
                  name="studentSupport"
                  value={opt}
                  checked={studentSupport === opt}
                  onChange={() => setStudentSupport(opt)}
                  className={radioInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 37. Zeit */}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">
            37. Wie viel Zeit könnten Sie realistisch für die Erprobung
            digitaler Tools im Schulalltag einplanen?
          </legend>
          <div className="space-y-2">
            {[
              "Regelmäßig (mehrmals pro Woche)",
              "Wöchentlich (feste Zeiten)",
              "Gelegentlich (nach Bedarf)",
              "Aktuell kaum möglich",
            ].map((opt) => (
              <label key={opt} className={radioLabel}>
                <input
                  type="radio"
                  name="timeForTools"
                  value={opt}
                  checked={timeForTools === opt}
                  onChange={() => setTimeForTools(opt)}
                  className={radioInput}
                />
                <span className="text-sm text-text">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </fieldset>

      {/* ── Teil H: Offene Rückmeldung ──────────────────────────────────────── */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-bold text-primary pb-2 border-b border-border w-full">
          💬 Teil H: Offene Rückmeldung
        </legend>

        {/* 38. Wünsche */}
        <div>
          <label
            htmlFor="projectWishes"
            className="block text-sm font-medium text-text mb-1.5"
          >
            38. Was wünschen Sie sich konkret vom Projekt DigiKI?
          </label>
          <textarea
            id="projectWishes"
            rows={4}
            value={projectWishes}
            onChange={(e) => setProjectWishes(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="Ihre Wünsche und Erwartungen..."
          />
        </div>

        {/* 39. Anmerkungen */}
        <div>
          <label
            htmlFor="additionalNotes"
            className="block text-sm font-medium text-text mb-1.5"
          >
            39. Gibt es weitere Anmerkungen, Wünsche oder Bedenken?
          </label>
          <textarea
            id="additionalNotes"
            rows={4}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="Sonstige Anmerkungen..."
          />
        </div>
      </fieldset>

      {/* ── Einwilligungen ──────────────────────────────────────────────────── */}
      <fieldset className="space-y-3">
        <legend className="text-xl font-bold text-primary pb-2 border-b border-border w-full mb-2">
          Einwilligungen
        </legend>
        <label className={cbLabel}>
          <input
            type="checkbox"
            required
            checked={privacyConsent}
            onChange={(e) => setPrivacyConsent(e.target.checked)}
            className={cbInput}
          />
          <span className="text-sm text-text">
            Ich stimme der Verarbeitung meiner Daten gemäß der{" "}
            <Link
              href="/datenschutz"
              target="_blank"
              className="underline text-primary-light hover:text-primary"
            >
              Datenschutzerklärung
            </Link>{" "}
            zu. *
          </span>
        </label>
        <label className={cbLabel}>
          <input
            type="checkbox"
            required
            checked={truthConsent}
            onChange={(e) => setTruthConsent(e.target.checked)}
            className={cbInput}
          />
          <span className="text-sm text-text">
            Ich bestätige, dass alle gemachten Angaben der Wahrheit
            entsprechen. *
          </span>
        </label>
      </fieldset>

      {/* ── Submit ─────────────────────────────────────────────────────────── */}
      <div className="pt-4 border-t border-border">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <Send className="w-5 h-5" aria-hidden="true" />
          {loading ? "Wird eingereicht..." : "Bestandsaufnahme einreichen"}
        </button>
        <p className="mt-3 text-xs text-text-light">* Pflichtfelder</p>
      </div>
    </form>
  );
}
