"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Send, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import FormSuccess from "./FormSuccess";
import { useHoneypot } from "./useHoneypot";
import {
  useSchoolAutocomplete,
  type SchoolSuggestion,
} from "./useSchoolAutocomplete";

// ─── Helper: toggle item in array with optional max ──────────────────────────
function toggle(arr: string[], val: string, max?: number): string[] {
  if (arr.includes(val)) return arr.filter((v) => v !== val);
  if (max !== undefined && arr.length >= max) return arr;
  return [...arr, val];
}

// ─── Step metadata ────────────────────────────────────────────────────────────
const STEPS = [
  { label: "Allgemeine Angaben",      short: "A",  icon: "🏫" },
  { label: "Technische Ausstattung",  short: "B",  icon: "💻" },
  { label: "Stand Digitalisierung",   short: "C",  icon: "📊" },
  { label: "Künstliche Intelligenz",  short: "D",  icon: "🤖" },
  { label: "Fortbildungsbedarf",      short: "E",  icon: "🎓" },
  { label: "Best Practices",          short: "F",  icon: "⭐" },
  { label: "Unterstützungsbedarf",    short: "G",  icon: "🛠️" },
  { label: "Offene Rückmeldung",      short: "H",  icon: "💬" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-8">
      {/* Mobile: step counter */}
      <div className="flex items-center justify-between mb-3 sm:hidden">
        <span className="text-sm font-semibold text-primary">
          {STEPS[step].icon} {STEPS[step].label}
        </span>
        <span className="text-xs text-text-light font-medium bg-border px-2 py-0.5 rounded-full">
          {step + 1} / {STEPS.length}
        </span>
      </div>

      {/* Desktop: dots */}
      <div className="hidden sm:flex items-center gap-1 mb-3">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 transition-all duration-300 ${
                i < step
                  ? "bg-primary text-white"
                  : i === step
                  ? "bg-accent text-white ring-4 ring-accent/20 scale-110"
                  : "bg-border text-text-light"
              }`}
              title={s.label}
            >
              {i < step ? <Check className="w-4 h-4" /> : s.short}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-1 rounded transition-all duration-500 ${
                  i < step ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Bar */}
      <div className="w-full bg-border rounded-full h-1.5">
        <div
          className="bg-gradient-to-r from-primary to-accent h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <p className="hidden sm:block mt-2 text-xs text-text-light text-right">
        Abschnitt {step + 1} von {STEPS.length}: {STEPS[step].label}
      </p>
    </div>
  );
}

function SectionHeading({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
      <span className="text-2xl" aria-hidden="true">{icon}</span>
      <h2 className="text-xl font-bold text-primary">{title}</h2>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="text-sm font-semibold text-text mb-3 leading-relaxed">
      {children}
      {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
    </p>
  );
}

function RadioGroup({
  name, value, onChange, options,
}: {
  name: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150 ${
            value === opt
              ? "border-accent bg-accent/5 text-text font-medium"
              : "border-border bg-white hover:border-primary/40 hover:bg-bg"
          }`}
        >
          <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
            value === opt ? "border-accent" : "border-border"
          }`}>
            {value === opt && <div className="w-2 h-2 rounded-full bg-accent" />}
          </div>
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="sr-only"
          />
          <span className="text-sm">{opt}</span>
        </label>
      ))}
    </div>
  );
}

function CheckboxGroup({
  values, onChange, options, max,
}: {
  values: string[]; onChange: (v: string[]) => void; options: string[]; max?: number;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const checked = values.includes(opt);
        const disabled = !checked && max !== undefined && values.length >= max;
        return (
          <label
            key={opt}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150 ${
              checked
                ? "border-accent bg-accent/5 text-text font-medium"
                : disabled
                ? "border-border bg-border/30 opacity-50 cursor-not-allowed"
                : "border-border bg-white hover:border-primary/40 hover:bg-bg"
            }`}
          >
            <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
              checked ? "border-accent bg-accent" : "border-border"
            }`}>
              {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(toggle(values, opt, max))}
              className="sr-only"
            />
            <span className="text-sm">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}

function OtherInput({
  value, onChange, placeholder = "Bitte angeben",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-2 w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors bg-white"
    />
  );
}

function RatingRow({
  name, value, onChange, labelLeft, labelRight,
}: {
  name: string; value: number; onChange: (v: number) => void; labelLeft: string; labelRight: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs text-text-light mb-3">
        <span>{labelLeft}</span>
        <span>{labelRight}</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 py-3 rounded-lg border-2 text-sm font-bold transition-all duration-150 ${
              value === n
                ? "border-accent bg-accent text-white shadow-sm scale-105"
                : "border-border bg-white text-text-light hover:border-accent/50 hover:text-text"
            }`}
            aria-label={`${n} von 5`}
            aria-pressed={value === n}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextInput({
  id, value, onChange, placeholder, type = "text", min,
}: {
  id: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; min?: number;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      min={min}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors bg-white"
    />
  );
}

function TextArea({
  id, value, onChange, placeholder, rows = 4,
}: {
  id: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors bg-white resize-y"
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BestandsaufnahmeForm() {
  const { isSpam, HoneypotField } = useHoneypot();

  // Navigation
  const [step, setStep] = useState(0);

  // ── Teil A ──────────────────────────────────────────────────────────────────
  const [schoolName, setSchoolName] = useState("");

  // School name autocomplete
  const {
    suggestions: schoolSuggestions,
    isLoading: schoolLoading,
    clearSuggestions: clearSchoolSuggestions,
  } = useSchoolAutocomplete(schoolName);
  const [showSchoolSuggestions, setShowSchoolSuggestions] = useState(false);
  const schoolBlurRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleSelectSchool(s: SchoolSuggestion) {
    setSchoolName(s.name || s.display_name.split(",")[0].trim());
    // Auto-fill Schulstandort from Nominatim county/city data
    if (s.county.toLowerCase().includes("landkreis osnabrück")) {
      setSchoolLocation("Landkreis Osnabrück");
    } else if (
      s.city.toLowerCase() === "osnabrück" ||
      s.county.toLowerCase() === "osnabrück"
    ) {
      setSchoolLocation("Stadt Osnabrück");
    }
    clearSchoolSuggestions();
    setShowSchoolSuggestions(false);
  }
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

  const [stepError, setStepError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // KI is "actively used" if the answer mentions "Ja"
  const kiAktivGenutzt = aiUsage.startsWith("Ja");

  // ─── Step validation ────────────────────────────────────────────────────────
  function validateStep(s: number): string {
    switch (s) {
      case 0:
        if (!schoolName.trim()) return "Bitte geben Sie den Namen der Schule an.";
        if (!schoolLocation) return "Bitte wählen Sie den Schulstandort.";
        if (!studentCount) return "Bitte wählen Sie die Schüleranzahl.";
        if (!teacherCount) return "Bitte geben Sie die Anzahl der Lehrkräfte an.";
        if (!isStartchancen) return "Bitte beantworten Sie die Startchancen-Frage.";
        if (!dazShare) return "Bitte wählen Sie den DaZ-Anteil.";
        break;
    }
    return "";
  }

  function handleNext() {
    const err = validateStep(step);
    if (err) { setStepError(err); return; }
    setStepError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStepError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStep((s) => s - 1);
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStepError("");

    if (isSpam) { setSuccess(true); return; }

    if (!privacyConsent || !truthConsent) {
      setStepError("Bitte bestätigen Sie die Datenschutzerklärung und die Richtigkeit Ihrer Angaben.");
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
        respondent_role: respondentRole || null,
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
      setStepError("Beim Einreichen ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <FormSuccess
        title="Vielen Dank für Ihre Teilnahme!"
        message="Ihre Antworten wurden erfolgreich übermittelt. Wir melden uns zeitnah bei Ihnen."
      />
    );
  }

  return (
    <div>
      {HoneypotField}
      <ProgressBar step={step} />

      {/* Error banner */}
      {stepError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span>{stepError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ══════════════════════════════════════════════════════════════════
            STEP 0 – Teil A: Allgemeine Angaben
        ══════════════════════════════════════════════════════════════════ */}
        {step === 0 && (
          <div className="space-y-7">
            <SectionHeading icon="🏫" title="Teil A: Allgemeine Angaben" />

            <div className="relative">
              <FieldLabel required>1. Name der Schule</FieldLabel>
              <input
                id="schoolName"
                type="text"
                required
                autoComplete="off"
                value={schoolName}
                onChange={(e) => {
                  setSchoolName(e.target.value);
                  setShowSchoolSuggestions(true);
                }}
                onFocus={() => setShowSchoolSuggestions(true)}
                onBlur={() => {
                  schoolBlurRef.current = setTimeout(
                    () => setShowSchoolSuggestions(false),
                    200
                  );
                }}
                placeholder="z. B. Grundschule Musterstadt"
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors bg-white"
              />
              {showSchoolSuggestions && schoolSuggestions.length > 0 && (
                <ul className="absolute z-20 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {schoolSuggestions.map((s, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onMouseDown={() => {
                          if (schoolBlurRef.current) clearTimeout(schoolBlurRef.current);
                        }}
                        onClick={() => handleSelectSchool(s)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 transition-colors border-b border-border last:border-0"
                      >
                        <span className="font-medium text-text">{s.name || s.display_name.split(",")[0]}</span>
                        <span className="text-text-light block text-xs mt-0.5">
                          {[s.street, s.plz, s.city].filter(Boolean).join(", ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {schoolLoading && showSchoolSuggestions && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-border rounded-lg shadow-sm px-4 py-2.5 text-sm text-text-light">
                  Suche Schulen…
                </div>
              )}
            </div>

            <div>
              <FieldLabel required>2. Schulstandort</FieldLabel>
              <RadioGroup name="schoolLocation" value={schoolLocation} onChange={setSchoolLocation}
                options={["Stadt Osnabrück", "Landkreis Osnabrück"]} />
            </div>

            <div>
              <FieldLabel required>3. Anzahl der Schüler*innen</FieldLabel>
              <RadioGroup name="studentCount" value={studentCount} onChange={setStudentCount}
                options={["unter 150", "150–300", "300–450", "über 450"]} />
            </div>

            <div>
              <FieldLabel required>4. Anzahl der Lehrkräfte (inkl. Teilzeit)</FieldLabel>
              <TextInput id="teacherCount" type="number" value={teacherCount} onChange={setTeacherCount} min={1} placeholder="z. B. 18" />
            </div>

            <div>
              <FieldLabel required>5. Ist Ihre Schule eine Startchancen-Schule?</FieldLabel>
              <RadioGroup name="isStartchancen" value={isStartchancen} onChange={setIsStartchancen}
                options={["Ja", "Nein"]} />
            </div>

            <div>
              <FieldLabel required>6. Wie hoch ist der Anteil der Kinder mit DaZ-Bedarf (Deutsch als Zweitsprache) an Ihrer Schule?</FieldLabel>
              <RadioGroup name="dazShare" value={dazShare} onChange={setDazShare}
                options={["Unter 10 %", "10–25 %", "25–50 %", "Über 50 %", "Kann ich nicht einschätzen"]} />
            </div>

            <div>
              <FieldLabel>7. Wer füllt diese Umfrage aus?</FieldLabel>
              <RadioGroup name="respondentRole" value={respondentRole} onChange={setRespondentRole}
                options={["Schulleitung", "IT-Beauftragte/r", "Medienbeauftragte/r", "Sonstiges"]} />
              {respondentRole === "Sonstiges" && (
                <OtherInput value={respondentRoleOther} onChange={setRespondentRoleOther} />
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 1 – Teil B: Technische Ausstattung
        ══════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-7">
            <SectionHeading icon="💻" title="Teil B: Technische Ausstattung & Infrastruktur" />

            <div>
              <FieldLabel>8. Welche digitalen Endgeräte stehen für den Unterricht zur Verfügung? <span className="font-normal text-text-light">(Mehrfachauswahl)</span></FieldLabel>
              <CheckboxGroup values={devices} onChange={setDevices}
                options={["iPads/Tablets", "Laptops/Notebooks", "Desktop-PCs", "Interaktive Displays/Smartboards", "Dokumentenkameras", "Roboter (z. B. Calliope, Bee-Bot)", "Sonstiges"]} />
              {devices.includes("Sonstiges") && (
                <OtherInput value={devicesOther} onChange={setDevicesOther} />
              )}
            </div>

            <div>
              <FieldLabel>9. Wie viele Tablets/iPads stehen für den Unterricht zur Verfügung?</FieldLabel>
              <RadioGroup name="tabletCount" value={tabletCount} onChange={setTabletCount}
                options={["Keine", "1–10", "11–20", "21–30", "Mehr als 30", "1:1-Ausstattung (jedes Kind ein Gerät)"]} />
            </div>

            <div>
              <FieldLabel>10. Wie bewerten Sie die WLAN-Abdeckung in Ihrer Schule?</FieldLabel>
              <RatingRow name="wlanRating" value={wlanRating} onChange={setWlanRating}
                labelLeft="1 = sehr schlecht" labelRight="5 = sehr gut" />
            </div>

            <div>
              <FieldLabel>11. Welche digitale Infrastruktur nutzen Sie? <span className="font-normal text-text-light">(Mehrfachauswahl)</span></FieldLabel>
              <CheckboxGroup values={infrastructure} onChange={setInfrastructure}
                options={["IServ", "Microsoft 365 / Teams", "Google Workspace", "Schulserver (lokal)", "Schul-Cloud Niedersachsen", "Sonstiges"]} />
              {infrastructure.includes("Sonstiges") && (
                <OtherInput value={infrastructureOther} onChange={setInfrastructureOther} />
              )}
            </div>

            <div>
              <FieldLabel>12. Welche Herausforderungen erleben Sie aktuell bei der Digitalisierung? <span className="font-normal text-text-light">(Mehrfachauswahl)</span></FieldLabel>
              <CheckboxGroup values={challenges} onChange={setChallenges}
                options={[
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
                  "Sonstiges",
                ]} />
              {challenges.includes("Sonstiges") && (
                <OtherInput value={challengesOther} onChange={setChallengesOther} />
              )}
            </div>

            <div>
              <FieldLabel>13. Wie zufrieden sind Sie mit dem technischen Support für Ihre Schule?</FieldLabel>
              <RatingRow name="supportSatisfaction" value={supportSatisfaction} onChange={setSupportSatisfaction}
                labelLeft="1 = sehr unzufrieden" labelRight="5 = sehr zufrieden" />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2 – Teil C: Aktueller Stand der Digitalisierung
        ══════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-7">
            <SectionHeading icon="📊" title="Teil C: Aktueller Stand der Digitalisierung" />

            <div>
              <FieldLabel>14. Wie würden Sie den Digitalisierungsgrad Ihrer Schule insgesamt einschätzen?</FieldLabel>
              <RatingRow name="digitizationLevel" value={digitizationLevel} onChange={setDigitizationLevel}
                labelLeft="1 = am Anfang" labelRight="5 = sehr fortgeschritten" />
            </div>

            <div>
              <FieldLabel>15. Welche digitalen Tools/Plattformen werden bereits im Unterricht eingesetzt? <span className="font-normal text-text-light">(Mehrfachauswahl)</span></FieldLabel>
              <CheckboxGroup values={toolsUsed} onChange={setToolsUsed}
                options={["Anton App", "Antolin", "Worksheet Crafter", "BookCreator", "LearningApps", "Onilo", "Leseo", "Matific", "bettermarks", "Mathegym", "Sofatutor", "Padlet", "Kahoot", "H5P", "Sonstiges"]} />
              {toolsUsed.includes("Sonstiges") && (
                <OtherInput value={toolsUsedOther} onChange={setToolsUsedOther} />
              )}
            </div>

            <div>
              <FieldLabel>16. Wie häufig setzen Lehrkräfte an Ihrer Schule digitale Medien im Unterricht ein?</FieldLabel>
              <RadioGroup name="usageFrequency" value={usageFrequency} onChange={setUsageFrequency}
                options={["Täglich", "Mehrmals pro Woche", "Einmal pro Woche", "Mehrmals im Monat", "Selten/gar nicht"]} />
            </div>

            <div>
              <FieldLabel>17. Nutzen Sie digitale Diagnostik-Tools? <span className="font-normal text-text-light">(Mehrfachauswahl)</span></FieldLabel>
              <CheckboxGroup values={diagnosticTools} onChange={setDiagnosticTools}
                options={["ILeA digital", "ELFE II digital", "Levumi", "Quop", "Nein, keine digitale Diagnostik", "Sonstiges"]} />
              {diagnosticTools.includes("Sonstiges") && (
                <OtherInput value={diagnosticToolsOther} onChange={setDiagnosticToolsOther} />
              )}
            </div>

            <div>
              <FieldLabel>18. Haben Sie ein aktuelles Medienkonzept?</FieldLabel>
              <RadioGroup name="mediaConcept" value={mediaConcept} onChange={setMediaConcept}
                options={["Ja, aktuell (< 2 Jahre alt)", "Ja, aber veraltet", "Nein, in Arbeit", "Nein"]} />
            </div>

            <div>
              <FieldLabel>19. Gibt es an Ihrer Schule eine medienbeauftragte Person?</FieldLabel>
              <RadioGroup name="mediaResponsible" value={mediaResponsible} onChange={setMediaResponsible}
                options={["Ja, mit Entlastungsstunden", "Ja, ohne Entlastungsstunden", "Nein"]} />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 3 – Teil D: Künstliche Intelligenz
        ══════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-7">
            <SectionHeading icon="🤖" title="Teil D: Künstliche Intelligenz (KI)" />

            <div>
              <FieldLabel>20. Nutzen Lehrkräfte an Ihrer Schule bereits KI-Tools? <span className="font-normal text-text-light">(z. B. ChatGPT, Claude, Gemini, Copilot)</span></FieldLabel>
              <RadioGroup name="aiUsage" value={aiUsage} onChange={setAiUsage}
                options={["Ja, mehrere Lehrkräfte regelmäßig", "Ja, einzelne Lehrkräfte gelegentlich", "Nein, aber Interesse vorhanden", "Nein, kein Interesse", "Unsicher"]} />
            </div>

            {/* Q21 + Q22 only visible when KI is actively used */}
            {kiAktivGenutzt && (
              <>
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 space-y-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">Nur bei KI-Nutzung</p>

                  <div>
                    <FieldLabel>21. Falls KI genutzt wird – wofür? <span className="font-normal text-text-light">(Mehrfachauswahl)</span></FieldLabel>
                    <CheckboxGroup values={aiPurposes} onChange={setAiPurposes}
                      options={[
                        "Unterrichtsvorbereitung (Arbeitsblätter, Aufgaben)",
                        "Differenzierung/Individualisierung",
                        "Textübersetzung/Leichte Sprache",
                        "Elternkommunikation",
                        "Verwaltungsaufgaben (Protokolle, Berichte)",
                        "Förderplanung",
                        "Recherche/Fortbildung",
                        "Sonstiges",
                      ]} />
                  </div>

                  <div>
                    <FieldLabel>22. Welche KI-Tools werden konkret genutzt? <span className="font-normal text-text-light">(Mehrfachauswahl)</span></FieldLabel>
                    <CheckboxGroup values={aiToolsUsed} onChange={setAiToolsUsed}
                      options={["ChatGPT", "Claude (Anthropic)", "Google Gemini", "Microsoft Copilot", "Fobizz KI-Assistenz", "DeepL", "Canva AI", "Telli", "Sonstiges"]} />
                    {aiToolsUsed.includes("Sonstiges") && (
                      <OtherInput value={aiToolsOther} onChange={setAiToolsOther} />
                    )}
                  </div>
                </div>
              </>
            )}

            <div>
              <FieldLabel>23. Wie schätzen Sie das KI-Kompetenzniveau im Kollegium insgesamt ein?</FieldLabel>
              <RatingRow name="aiCompetence" value={aiCompetence} onChange={setAiCompetence}
                labelLeft="1 = keine Kenntnisse" labelRight="5 = sehr kompetent" />
            </div>

            <div>
              <FieldLabel>24. Welche Bedenken bestehen im Kollegium gegenüber KI? <span className="font-normal text-text-light">(Mehrfachauswahl)</span></FieldLabel>
              <CheckboxGroup values={aiConcerns} onChange={setAiConcerns}
                options={[
                  "Datenschutz/DSGVO",
                  "Urheberrecht",
                  "Qualität/Zuverlässigkeit der Ergebnisse",
                  "Fehlende Kompetenzen",
                  "Zeitmangel für Einarbeitung",
                  "Pädagogische Bedenken (z. B. Bildschirmzeit)",
                  "Technische Hürden",
                  "AI-Act / Rechtsunsicherheit",
                  "Keine Bedenken",
                  "Sonstiges",
                ]} />
              {aiConcerns.includes("Sonstiges") && (
                <OtherInput value={aiConcernsOther} onChange={setAiConcernsOther} />
              )}
            </div>

            <div>
              <FieldLabel>25. Hat Ihre Schule bereits an KI-bezogenen Fortbildungen teilgenommen? <span className="font-normal text-text-light">(Mehrfachauswahl)</span></FieldLabel>
              <CheckboxGroup values={aiTrainings} onChange={setAiTrainings}
                options={["Ja, über Fobizz", "Ja, über das KOS", "Ja, über andere Anbieter", "Nein, aber Interesse", "Nein, kein Interesse", "Sonstiges"]} />
              {aiTrainings.includes("Sonstiges") && (
                <OtherInput value={aiTrainingsOther} onChange={setAiTrainingsOther} />
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 4 – Teil E: Fortbildungsbedarf
        ══════════════════════════════════════════════════════════════════ */}
        {step === 4 && (
          <div className="space-y-7">
            <SectionHeading icon="🎓" title="Teil E: Fortbildungsbedarf & Wünsche" />

            <div>
              <FieldLabel>
                26. In welchen Bereichen besteht der größte Fortbildungsbedarf?{" "}
                <span className="font-normal text-text-light">(max. 5 Auswahlen)</span>
                {trainingNeeds.length > 0 && (
                  <span className="ml-2 inline-block bg-accent text-white text-xs px-2 py-0.5 rounded-full font-normal">
                    {trainingNeeds.length}/5
                  </span>
                )}
              </FieldLabel>
              <CheckboxGroup values={trainingNeeds} onChange={setTrainingNeeds} max={5}
                options={[
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
                ]} />
            </div>

            <div>
              <FieldLabel>27. Welches Schulungsformat bevorzugen Sie? <span className="font-normal text-text-light">(Mehrfachauswahl)</span></FieldLabel>
              <CheckboxGroup values={trainingFormat} onChange={setTrainingFormat}
                options={[
                  "Ganztägige Präsenzschulungen (extern)",
                  "Halbtägige Workshops",
                  "Schulinterne Fortbildungen (SchiLF)",
                  "Online-Schulungen (synchron)",
                  "Online-Selbstlernkurse (asynchron)",
                  "Peer-Learning (Austausch mit anderen Schulen)",
                  "Individuelle Begleitung vor Ort (z. B. durch Studierende)",
                ]} />
            </div>

            <div>
              <FieldLabel>28. Zu welchen Zeiten können Lehrkräfte an Fortbildungen teilnehmen? <span className="font-normal text-text-light">(Mehrfachauswahl)</span></FieldLabel>
              <CheckboxGroup values={trainingTimes} onChange={setTrainingTimes}
                options={[
                  "Während der Unterrichtszeit (mit Vertretung)",
                  "Nachmittags (nach Unterrichtsschluss)",
                  "An Studientagen",
                  "In den Ferien",
                  "Samstags",
                ]} />
            </div>

            <div>
              <FieldLabel>29. Wie viele Lehrkräfte würden voraussichtlich an den DigiKI-Schulungen teilnehmen?</FieldLabel>
              <TextInput id="participationCount" type="number" value={participationCount} onChange={setParticipationCount} min={0} placeholder="z. B. 10" />
            </div>

            <div>
              <FieldLabel>30. Hätte Ihre Schule Interesse, als „Vorreiter-Schule" frühzeitig mit der Erprobung digitaler Tools zu beginnen (ab Monat 4)?</FieldLabel>
              <RadioGroup name="pioneerInterest" value={pioneerInterest} onChange={setPioneerInterest}
                options={[
                  "Ja, sehr gerne",
                  "Ja, unter bestimmten Voraussetzungen",
                  "Nein, wir möchten erst die Schulungen abwarten",
                ]} />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 5 – Teil F: Best Practices
        ══════════════════════════════════════════════════════════════════ */}
        {step === 5 && (
          <div className="space-y-7">
            <SectionHeading icon="⭐" title="Teil F: Best Practices & Erfolgsgeschichten" />

            <div>
              <FieldLabel>31. Gibt es an Ihrer Schule besonders gelungene Beispiele für den Einsatz digitaler Medien oder KI?</FieldLabel>
              <RadioGroup name="hasBestPractice" value={hasBestPractice} onChange={setHasBestPractice}
                options={["Ja", "Nein"]} />
            </div>

            {/* Q32 only visible when Q31 = "Ja" */}
            {hasBestPractice === "Ja" && (
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-4">Nur bei Ja</p>
                <FieldLabel>32. Falls ja, beschreiben Sie bitte kurz (Fach, Tool, Ergebnis):</FieldLabel>
                <TextArea
                  id="bestPracticeDescription"
                  value={bestPracticeDescription}
                  onChange={setBestPracticeDescription}
                  placeholder="z. B. Mathematikunterricht mit Matific in Klasse 3 – die Kinder lernten eigenständig."
                />
              </div>
            )}

            <div>
              <FieldLabel>33. Wären Sie bereit, Ihre Erfahrungen als Best-Practice-Schule mit anderen Schulen zu teilen?</FieldLabel>
              <RadioGroup name="sharePractice" value={sharePractice} onChange={setSharePractice}
                options={[
                  "Ja, sehr gerne",
                  "Ja, unter bestimmten Voraussetzungen",
                  "Nein, aktuell nicht",
                  "Vielleicht später",
                ]} />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 6 – Teil G: Unterstützungsbedarf
        ══════════════════════════════════════════════════════════════════ */}
        {step === 6 && (
          <div className="space-y-7">
            <SectionHeading icon="🛠️" title="Teil G: Unterstützungsbedarf & Ressourcen" />

            <div>
              <FieldLabel>
                34. Welche Unterstützung würde Ihrer Schule am meisten helfen?{" "}
                <span className="font-normal text-text-light">(max. 3 Auswahlen)</span>
                {supportNeeds.length > 0 && (
                  <span className="ml-2 inline-block bg-accent text-white text-xs px-2 py-0.5 rounded-full font-normal">
                    {supportNeeds.length}/3
                  </span>
                )}
              </FieldLabel>
              <CheckboxGroup values={supportNeeds} onChange={setSupportNeeds} max={3}
                options={[
                  "Finanzierung von Software-Lizenzen",
                  "Studentische Hilfskräfte für technischen Support",
                  "Praxisnahe Fortbildungen",
                  "Entlastungsstunden für digitale Koordination",
                  "Bessere technische Infrastruktur (WLAN, Geräte)",
                  "Best-Practice-Materialien und Vorlagen",
                  "Regelmäßiger Austausch mit anderen Schulen",
                  "Individuelle Beratung / Coaching",
                ]} />
            </div>

            <div>
              <FieldLabel>35. Welche Software-Lizenzen würden Sie sich für Ihre Schule wünschen? <span className="font-normal text-text-light">(Mehrfachauswahl)</span></FieldLabel>
              <CheckboxGroup values={softwareLicenses} onChange={setSoftwareLicenses}
                options={[
                  "Adaptive Mathe-Plattform (z. B. Matific, bettermarks)",
                  "Leseförderung (z. B. Antolin Plus, Leseo, Onilo)",
                  "DaZ/LRS-Förderung (z. B. Deutschfuchs, Meister Cody)",
                  "Materialerstellung (z. B. Worksheet Crafter, BookCreator)",
                  "KI-Assistenz (z. B. Fobizz, SchulKI)",
                  "Sonstiges",
                ]} />
              {softwareLicenses.includes("Sonstiges") && (
                <OtherInput value={softwareLicensesOther} onChange={setSoftwareLicensesOther} />
              )}
            </div>

            <div>
              <FieldLabel>36. Hätten Sie Interesse an studentischer Unterstützung?</FieldLabel>
              <RadioGroup name="studentSupport" value={studentSupport} onChange={setStudentSupport}
                options={[
                  "Ja, für technische Einrichtung",
                  "Ja, für Unterrichtsbegleitung",
                  "Ja, für beides",
                  "Nein, aktuell kein Bedarf",
                ]} />
            </div>

            <div>
              <FieldLabel>37. Wie viel Zeit könnten Sie realistisch für die Erprobung digitaler Tools im Schulalltag einplanen?</FieldLabel>
              <RadioGroup name="timeForTools" value={timeForTools} onChange={setTimeForTools}
                options={[
                  "Regelmäßig (mehrmals pro Woche)",
                  "Wöchentlich (feste Zeiten)",
                  "Gelegentlich (nach Bedarf)",
                  "Aktuell kaum möglich",
                ]} />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 7 – Teil H: Offene Rückmeldung + Einwilligungen
        ══════════════════════════════════════════════════════════════════ */}
        {step === 7 && (
          <div className="space-y-7">
            <SectionHeading icon="💬" title="Teil H: Offene Rückmeldung" />

            <div>
              <FieldLabel>38. Was wünschen Sie sich konkret vom Projekt DigiKI?</FieldLabel>
              <TextArea id="projectWishes" value={projectWishes} onChange={setProjectWishes}
                placeholder="Ihre Wünsche und Erwartungen..." />
            </div>

            <div>
              <FieldLabel>39. Gibt es weitere Anmerkungen, Wünsche oder Bedenken?</FieldLabel>
              <TextArea id="additionalNotes" value={additionalNotes} onChange={setAdditionalNotes}
                placeholder="Sonstige Anmerkungen..." />
            </div>

            {/* Einwilligungen */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
              <p className="text-sm font-bold text-primary">Einwilligungen *</p>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                  privacyConsent ? "border-primary bg-primary" : "border-border group-hover:border-primary/50"
                }`}>
                  {privacyConsent && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <input type="checkbox" required checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)} className="sr-only" />
                <span className="text-sm text-text">
                  Ich stimme der Verarbeitung meiner Daten gemäß der{" "}
                  <Link href="/datenschutz" target="_blank"
                    className="underline text-primary hover:text-primary-light transition-colors">
                    Datenschutzerklärung
                  </Link>{" "}zu. *
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                  truthConsent ? "border-primary bg-primary" : "border-border group-hover:border-primary/50"
                }`}>
                  {truthConsent && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <input type="checkbox" required checked={truthConsent}
                  onChange={(e) => setTruthConsent(e.target.checked)} className="sr-only" />
                <span className="text-sm text-text">
                  Ich bestätige, dass alle gemachten Angaben der Wahrheit entsprechen. *
                </span>
              </label>
            </div>
          </div>
        )}

        {/* ── Navigation buttons ──────────────────────────────────────────────── */}
        <div className={`mt-10 pt-6 border-t border-border flex ${step > 0 ? "justify-between" : "justify-end"}`}>
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-medium text-text hover:bg-bg hover:border-primary/40 transition-all"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              Zurück
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-all"
            >
              Weiter
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              {loading ? "Wird übermittelt…" : "Bestandsaufnahme einreichen"}
            </button>
          )}
        </div>

        <p className="mt-3 text-xs text-text-light">* Pflichtfelder</p>
      </form>
    </div>
  );
}

