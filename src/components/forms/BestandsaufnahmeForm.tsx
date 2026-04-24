"use client";

import { useState, useRef, useEffect, useMemo, useTransition, memo } from "react";
import Link from "next/link";
import { Send, ChevronRight, ChevronLeft, Check, Eye, EyeOff, AlertTriangle } from "lucide-react";
import FormSuccess from "./FormSuccess";
import { useHoneypot } from "./useHoneypot";
import { useIsAdmin } from "@/lib/useIsAdmin";
import {
  useSchoolAutocomplete,
  type SchoolSuggestion,
} from "./useSchoolAutocomplete";

// Modul-Level: einmal kompiliert, nicht pro Keystroke neu.
const NIBIS_PATTERN = /\.nibis\.de\s*$/i;

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
  { label: "Account anlegen",         short: "🔐", icon: "🔐" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({
  step,
  steps = STEPS,
  onStepClick,
}: {
  step: number;
  steps?: typeof STEPS;
  onStepClick?: (i: number) => void;
}) {
  return (
    <nav aria-label="Formular-Fortschritt" className="mb-8">
      {/* Mobile: dropdown in edit mode, counter otherwise */}
      <div className="flex items-center justify-between mb-3 sm:hidden">
        {onStepClick ? (
          <select
            value={step}
            onChange={(e) => onStepClick(Number(e.target.value))}
            aria-label="Zu Abschnitt springen"
            className="text-sm font-semibold text-primary bg-transparent border-none outline-none cursor-pointer"
          >
            {steps.map((s, i) => (
              <option key={i} value={i}>
                {s.icon} {s.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm font-semibold text-primary" aria-current="step">
            {steps[step].icon} {steps[step].label}
          </span>
        )}
        <span className="text-xs text-text-light font-medium bg-border px-2 py-0.5 rounded-full">
          <span className="sr-only">Abschnitt </span>
          {step + 1} <span aria-hidden="true">/</span><span className="sr-only"> von </span> {steps.length}
        </span>
      </div>

      {/* Desktop: dots */}
      <ol className="hidden sm:flex items-center gap-1 mb-3 list-none p-0">
        {steps.map((s, i) => {
          const isCurrent = i === step;
          const isDone = i < step;
          const stateLabel = isCurrent
            ? "aktueller Abschnitt"
            : isDone
            ? "abgeschlossen"
            : "ausstehend";
          const dot = (
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 transition-all duration-300 ${
                isDone
                  ? "bg-primary text-white"
                  : isCurrent
                  ? "bg-accent text-text ring-4 ring-accent/20 scale-110"
                  : "bg-border text-text-light"
              } ${onStepClick ? "cursor-pointer hover:opacity-80" : ""}`}
              title={s.label}
            >
              {isDone ? <Check className="w-4 h-4" aria-hidden="true" /> : <span aria-hidden="true">{s.short}</span>}
              <span className="sr-only">{`Schritt ${i + 1}: ${s.label} – ${stateLabel}`}</span>
            </div>
          );
          return (
            <li key={i} className="flex items-center flex-1 last:flex-none">
              {onStepClick ? (
                <button
                  type="button"
                  onClick={() => onStepClick(i)}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Zu Schritt ${i + 1} springen: ${s.label} (${stateLabel})`}
                  className="shrink-0 rounded-full"
                >
                  {dot}
                </button>
              ) : (
                <div aria-current={isCurrent ? "step" : undefined} className="shrink-0">
                  {dot}
                </div>
              )}
              {i < steps.length - 1 && (
                <div
                  aria-hidden="true"
                  className={`h-0.5 flex-1 mx-1 rounded transition-all duration-500 ${
                    i < step ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Bar */}
      <div className="w-full bg-border rounded-full h-1.5">
        <div
          className="bg-gradient-to-r from-primary to-accent h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>

      <p className="hidden sm:block mt-2 text-xs text-text-light text-right">
        Abschnitt {step + 1} von {steps.length}: {steps[step].label}
      </p>
    </nav>
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

// `htmlFor` verbindet das Label mit einem einzelnen Input-Feld (BITV/WCAG 1.3.1).
// Ohne htmlFor wird ein <p> gerendert – geeignet für Radio-/Checkbox-Gruppen,
// bei denen jedes Option-Label sich selbst mit seinem Input verbindet.
function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  const className = "block text-sm font-semibold text-text mb-3 leading-relaxed";
  const content = (
    <>
      {children}
      {required && (
        <>
          <span className="text-red-600 ml-1" aria-hidden="true">*</span>
          <span className="sr-only"> (erforderlich)</span>
        </>
      )}
    </>
  );
  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className={className}>
        {content}
      </label>
    );
  }
  return <p className={className}>{content}</p>;
}

const RadioGroup = memo(function RadioGroup({
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
});

const CheckboxGroup = memo(function CheckboxGroup({
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
});

function OtherInput({
  value, onChange, placeholder = "Bitte angeben",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type="text"
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-2 w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors bg-white"
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
                ? "border-accent bg-accent text-text shadow-sm scale-105"
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
  id, value, onChange, placeholder, type = "text", min, required, autoFocus, autoComplete,
}: {
  id: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; min?: number; required?: boolean; autoFocus?: boolean; autoComplete?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      min={min}
      required={required}
      autoFocus={autoFocus}
      autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors bg-white"
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
      className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors bg-white resize-y"
    />
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BestandsaufnahmeData {
  id: string;
  school_name: string;
  school_location: string | null;
  student_count: string | null;
  teacher_count: string | null;
  is_startchancen_school: string | null;
  daz_share: string | null;
  respondent_role: string | null;
  respondent_role_other: string | null;
  devices: string[];
  devices_other: string | null;
  tablet_count: string | null;
  wlan_rating: number | null;
  infrastructure: string[];
  infrastructure_other: string | null;
  challenges: string[];
  challenges_other: string | null;
  support_satisfaction: number | null;
  digitization_level: number | null;
  tools_used: string[];
  tools_used_other: string | null;
  usage_frequency: string | null;
  diagnostic_tools: string[];
  diagnostic_tools_other: string | null;
  media_concept: string | null;
  media_responsible: string | null;
  ai_usage: string | null;
  ai_purposes: string[];
  ai_purposes_other: string | null;
  ai_tools_used: string[];
  ai_tools_other: string | null;
  ai_competence: number | null;
  ai_concerns: string[];
  ai_concerns_other: string | null;
  ai_trainings: string[];
  ai_trainings_other: string | null;
  training_needs: string[];
  training_needs_other: string | null;
  training_format: string[];
  training_times: string[];
  participation_count: string | null;
  pioneer_interest: string | null;
  has_best_practice: string | null;
  best_practice_description: string | null;
  share_practice: string | null;
  support_needs: string[];
  software_licenses: string[];
  software_licenses_other: string | null;
  student_support: string | null;
  time_for_tools: string | null;
  project_wishes: string | null;
  additional_notes: string | null;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BestandsaufnahmeForm({
  editMode = false,
  initialData,
  recordId,
}: {
  editMode?: boolean;
  initialData?: BestandsaufnahmeData;
  recordId?: string;
}) {
  const { isSpam, HoneypotField } = useHoneypot();

  // Navigation. `isPending` könnte man zur Zeit für eine Ladeanzeige nutzen;
  // hier reicht der Transition-Wrapper, um den Klick sofort reagieren zu lassen,
  // während React den nächsten Step asynchron rendert.
  const [, startStepTransition] = useTransition();
  const [step, setStep] = useState(0);

  // ── Teil A ──────────────────────────────────────────────────────────────────
  const [schoolName, setSchoolName] = useState(initialData?.school_name ?? "");

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
  const [schoolLocation, setSchoolLocation] = useState(initialData?.school_location ?? "");
  const [studentCount, setStudentCount] = useState(initialData?.student_count ?? "");
  const [teacherCount, setTeacherCount] = useState(initialData?.teacher_count ?? "");
  const [isStartchancen, setIsStartchancen] = useState(initialData?.is_startchancen_school ?? "");
  const [dazShare, setDazShare] = useState(initialData?.daz_share ?? "");
  const [respondentRole, setRespondentRole] = useState(initialData?.respondent_role ?? "");
  const [respondentRoleOther, setRespondentRoleOther] = useState(initialData?.respondent_role_other ?? "");

  // ── Teil B ──────────────────────────────────────────────────────────────────
  const [devices, setDevices] = useState<string[]>(initialData?.devices ?? []);
  const [devicesOther, setDevicesOther] = useState(initialData?.devices_other ?? "");
  const [tabletCount, setTabletCount] = useState(initialData?.tablet_count ?? "");
  const [wlanRating, setWlanRating] = useState(initialData?.wlan_rating ?? 0);
  const [infrastructure, setInfrastructure] = useState<string[]>(initialData?.infrastructure ?? []);
  const [infrastructureOther, setInfrastructureOther] = useState(initialData?.infrastructure_other ?? "");
  const [challenges, setChallenges] = useState<string[]>(initialData?.challenges ?? []);
  const [challengesOther, setChallengesOther] = useState(initialData?.challenges_other ?? "");
  const [supportSatisfaction, setSupportSatisfaction] = useState(initialData?.support_satisfaction ?? 0);

  // ── Teil C ──────────────────────────────────────────────────────────────────
  const [digitizationLevel, setDigitizationLevel] = useState(initialData?.digitization_level ?? 0);
  const [toolsUsed, setToolsUsed] = useState<string[]>(initialData?.tools_used ?? []);
  const [toolsUsedOther, setToolsUsedOther] = useState(initialData?.tools_used_other ?? "");
  const [usageFrequency, setUsageFrequency] = useState(initialData?.usage_frequency ?? "");
  const [diagnosticTools, setDiagnosticTools] = useState<string[]>(initialData?.diagnostic_tools ?? []);
  const [diagnosticToolsOther, setDiagnosticToolsOther] = useState(initialData?.diagnostic_tools_other ?? "");
  const [mediaConcept, setMediaConcept] = useState(initialData?.media_concept ?? "");
  const [mediaResponsible, setMediaResponsible] = useState(initialData?.media_responsible ?? "");

  // ── Teil D ──────────────────────────────────────────────────────────────────
  const [aiUsage, setAiUsage] = useState(initialData?.ai_usage ?? "");
  const [aiPurposes, setAiPurposes] = useState<string[]>(initialData?.ai_purposes ?? []);
  const [aiPurposesOther, setAiPurposesOther] = useState(initialData?.ai_purposes_other ?? "");
  const [aiToolsUsed, setAiToolsUsed] = useState<string[]>(initialData?.ai_tools_used ?? []);
  const [aiToolsOther, setAiToolsOther] = useState(initialData?.ai_tools_other ?? "");
  const [aiCompetence, setAiCompetence] = useState(initialData?.ai_competence ?? 0);
  const [aiConcerns, setAiConcerns] = useState<string[]>(initialData?.ai_concerns ?? []);
  const [aiConcernsOther, setAiConcernsOther] = useState(initialData?.ai_concerns_other ?? "");
  const [aiTrainings, setAiTrainings] = useState<string[]>(initialData?.ai_trainings ?? []);
  const [aiTrainingsOther, setAiTrainingsOther] = useState(initialData?.ai_trainings_other ?? "");

  // ── Teil E ──────────────────────────────────────────────────────────────────
  const [trainingNeeds, setTrainingNeeds] = useState<string[]>(initialData?.training_needs ?? []);
  const [trainingNeedsOther, setTrainingNeedsOther] = useState(initialData?.training_needs_other ?? "");
  const [trainingFormat, setTrainingFormat] = useState<string[]>(initialData?.training_format ?? []);
  const [trainingTimes, setTrainingTimes] = useState<string[]>(initialData?.training_times ?? []);
  const [participationCount, setParticipationCount] = useState(initialData?.participation_count ?? "");
  const [pioneerInterest, setPioneerInterest] = useState(initialData?.pioneer_interest ?? "");

  // ── Teil F ──────────────────────────────────────────────────────────────────
  const [hasBestPractice, setHasBestPractice] = useState(initialData?.has_best_practice ?? "");
  const [bestPracticeDescription, setBestPracticeDescription] = useState(initialData?.best_practice_description ?? "");
  const [sharePractice, setSharePractice] = useState(initialData?.share_practice ?? "");

  // ── Teil G ──────────────────────────────────────────────────────────────────
  const [supportNeeds, setSupportNeeds] = useState<string[]>(initialData?.support_needs ?? []);
  const [softwareLicenses, setSoftwareLicenses] = useState<string[]>(initialData?.software_licenses ?? []);
  const [softwareLicensesOther, setSoftwareLicensesOther] = useState(initialData?.software_licenses_other ?? "");
  const [studentSupport, setStudentSupport] = useState(initialData?.student_support ?? "");
  const [timeForTools, setTimeForTools] = useState(initialData?.time_for_tools ?? "");

  // ── Teil H ──────────────────────────────────────────────────────────────────
  const [projectWishes, setProjectWishes] = useState(initialData?.project_wishes ?? "");
  const [additionalNotes, setAdditionalNotes] = useState(initialData?.additional_notes ?? "");

  // ── Account-Daten (Login für Best-Practice-Datenbank) ────────────────────────
  const [contactPerson, setContactPerson] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Passwort-Checkliste nur neu berechnen, wenn das Passwort sich ändert –
  // nicht bei jedem Render anderer Felder im Formular.
  const passwordChecks = useMemo(
    () =>
      password.length === 0
        ? null
        : [
            { ok: password.length >= 8,          label: "Mindestens 8 Zeichen" },
            { ok: /[A-Z]/.test(password),        label: "Großbuchstabe (A–Z)" },
            { ok: /[0-9]/.test(password),        label: "Zahl (0–9)" },
            { ok: /[^A-Za-z0-9]/.test(password), label: "Sonderzeichen (!@#…)" },
          ],
    [password]
  );

  // ── Einwilligungen ──────────────────────────────────────────────────────────
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [truthConsent, setTruthConsent] = useState(false);

  const [stepError, setStepError] = useState("");
  const [errorFocusId, setErrorFocusId] = useState<string | null>(null);
  const errorAlertRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const isAdmin = useIsAdmin();

  // Intent-Flag: echte Submit-Versuche (Klick auf den Einreichen-Button)
  const submitIntentRef = useRef(false);

  // Fehlermeldung beim Wechsel des Steps immer zurücksetzen, damit keine
  // späte Fehlermeldung aus einem asynchronen Submit auf einem neuen Step
  // sichtbar bleibt.
  useEffect(() => {
    setStepError("");
    setErrorFocusId(null);
    submitIntentRef.current = false;
  }, [step]);

  // Bei neuer Fehlermeldung: zum Seitenanfang scrollen UND Fokus setzen.
  // Vorzugsweise auf das konkrete Feld (wenn eine ID bekannt ist), sonst auf
  // das Alert-Element selbst – Screenreader lesen die Meldung dann vor und
  // Tastatur-Nutzer landen direkt an der relevanten Stelle.
  useEffect(() => {
    if (!stepError || typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Im nächsten Frame fokussieren, damit der Alert-Block gerendert ist.
    const id = window.setTimeout(() => {
      if (errorFocusId) {
        const el = document.getElementById(errorFocusId) as HTMLElement | null;
        if (el) {
          el.focus({ preventScroll: true });
          return;
        }
      }
      errorAlertRef.current?.focus({ preventScroll: true });
    }, 60);
    return () => window.clearTimeout(id);
  }, [stepError, errorFocusId]);

  // Beim Erreichen des Account-Steps gezielt das Ansprechpartner-Feld fokussieren.
  // Der Browser versucht sonst per Autofill auf das Telefon-Feld zu springen –
  // daher mehrfach versuchen, um gegen verzögertes Autofill zu gewinnen.
  useEffect(() => {
    if (step !== 8 || editMode) return;
    const tryFocus = () => {
      const el = document.getElementById("contactPerson") as HTMLInputElement | null;
      if (el) el.focus();
    };
    tryFocus();
    const t1 = setTimeout(tryFocus, 50);
    const t2 = setTimeout(tryFocus, 200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [step, editMode]);

  // KI is "actively used" if the answer mentions "Ja"
  const kiAktivGenutzt = aiUsage.startsWith("Ja");

  // ─── Step validation ────────────────────────────────────────────────────────
  // Gibt die Fehlermeldung und ggf. eine Feld-ID zurück, auf die fokussiert
  // werden soll. Leerer Message bedeutet: alles ok.
  function validateStep(s: number): { message: string; focusId?: string } {
    const err = (message: string, focusId?: string) => ({ message, focusId });
    switch (s) {
      case 0: // Teil A
        if (!schoolName.trim()) return err("Bitte geben Sie den Namen der Schule an (Frage 1).", "schoolName");
        if (!schoolLocation) return err("Bitte wählen Sie den Schulstandort (Frage 2).");
        if (!studentCount) return err("Bitte wählen Sie die Schüleranzahl (Frage 3).");
        if (!teacherCount) return err("Bitte geben Sie die Anzahl der Lehrkräfte an (Frage 4).", "teacherCount");
        if (!isStartchancen) return err("Bitte beantworten Sie die Startchancen-Frage (Frage 5).");
        if (!dazShare) return err("Bitte wählen Sie den DaZ-Anteil (Frage 6).");
        if (!respondentRole) return err("Bitte geben Sie an, wer die Umfrage ausfüllt (Frage 7).");
        if (respondentRole === "Sonstiges" && !respondentRoleOther.trim()) {
          return err("Bitte spezifizieren Sie die Rolle unter 'Sonstiges' (Frage 7).");
        }
        break;
      case 1: // Teil B
        if (devices.length === 0) return err("Bitte wählen Sie mindestens ein Endgerät (Frage 8).");
        if (devices.includes("Sonstiges") && !devicesOther.trim()) {
          return err("Bitte geben Sie an, welches sonstige Endgerät (Frage 8).");
        }
        if (!tabletCount) return err("Bitte geben Sie die Tablet-Anzahl an (Frage 9).");
        if (!wlanRating) return err("Bitte bewerten Sie die WLAN-Abdeckung (Frage 10).");
        if (infrastructure.length === 0) return err("Bitte wählen Sie die digitale Infrastruktur (Frage 11).");
        if (infrastructure.includes("Sonstiges") && !infrastructureOther.trim()) {
          return err("Bitte geben Sie an, welche sonstige Infrastruktur (Frage 11).");
        }
        if (challenges.length === 0) return err("Bitte wählen Sie mindestens eine Herausforderung (Frage 12).");
        if (challenges.includes("Sonstiges") && !challengesOther.trim()) {
          return err("Bitte geben Sie die sonstige Herausforderung an (Frage 12).");
        }
        if (!supportSatisfaction) return err("Bitte bewerten Sie den technischen Support (Frage 13).");
        break;
      case 2: // Teil C
        if (!digitizationLevel) return err("Bitte schätzen Sie den Digitalisierungsgrad ein (Frage 14).");
        if (toolsUsed.length === 0) return err("Bitte wählen Sie mindestens ein digitales Tool (Frage 15).");
        if (toolsUsed.includes("Sonstiges") && !toolsUsedOther.trim()) {
          return err("Bitte geben Sie das sonstige Tool an (Frage 15).");
        }
        if (!usageFrequency) return err("Bitte geben Sie die Einsatzhäufigkeit an (Frage 16).");
        if (diagnosticTools.length === 0) return err("Bitte beantworten Sie Frage 17 (Diagnostik-Tools).");
        if (diagnosticTools.includes("Sonstiges") && !diagnosticToolsOther.trim()) {
          return err("Bitte geben Sie das sonstige Diagnostik-Tool an (Frage 17).");
        }
        if (!mediaConcept) return err("Bitte beantworten Sie Frage 18 (Medienkonzept).");
        if (!mediaResponsible) return err("Bitte beantworten Sie Frage 19 (Medienbeauftragte Person).");
        break;
      case 3: // Teil D
        if (!aiUsage) return err("Bitte beantworten Sie Frage 20 (KI-Nutzung).");
        if (kiAktivGenutzt) {
          if (aiPurposes.length === 0) return err("Bitte wählen Sie mindestens einen KI-Zweck (Frage 21).");
          if (aiPurposes.includes("Sonstiges") && !aiPurposesOther.trim()) {
            return err("Bitte geben Sie den sonstigen KI-Zweck an (Frage 21).");
          }
          if (aiToolsUsed.length === 0) return err("Bitte wählen Sie mindestens ein KI-Tool (Frage 22).");
          if (aiToolsUsed.includes("Sonstiges") && !aiToolsOther.trim()) {
            return err("Bitte geben Sie das sonstige KI-Tool an (Frage 22).");
          }
        }
        if (!aiCompetence) return err("Bitte schätzen Sie das KI-Kompetenzniveau ein (Frage 23).");
        if (aiConcerns.length === 0) return err("Bitte wählen Sie mindestens eine Bedenken-Option (Frage 24).");
        if (aiConcerns.includes("Sonstiges") && !aiConcernsOther.trim()) {
          return err("Bitte geben Sie die sonstige Bedenken-Option an (Frage 24).");
        }
        if (aiTrainings.length === 0) return err("Bitte beantworten Sie Frage 25 (KI-Fortbildungen).");
        if (aiTrainings.includes("Sonstiges") && !aiTrainingsOther.trim()) {
          return err("Bitte geben Sie die sonstige KI-Fortbildung an (Frage 25).");
        }
        break;
      case 4: // Teil E
        if (trainingNeeds.length === 0) return err("Bitte wählen Sie mindestens einen Fortbildungsbedarf (Frage 26).");
        if (trainingNeeds.includes("Sonstiges") && !trainingNeedsOther.trim()) {
          return err("Bitte geben Sie den sonstigen Fortbildungsbedarf an (Frage 26).");
        }
        if (trainingFormat.length === 0) return err("Bitte wählen Sie ein Schulungsformat (Frage 27).");
        if (trainingTimes.length === 0) return err("Bitte wählen Sie die Fortbildungszeiten (Frage 28).");
        if (!participationCount) return err("Bitte geben Sie die voraussichtliche Teilnehmerzahl an (Frage 29).");
        if (!pioneerInterest) return err("Bitte beantworten Sie Frage 30 (Vorreiter-Schule).");
        break;
      case 5: // Teil F
        if (!hasBestPractice) return err("Bitte beantworten Sie Frage 31 (Best-Practice-Beispiele).");
        if (hasBestPractice === "Ja" && !bestPracticeDescription.trim()) {
          return err("Bitte beschreiben Sie das Best-Practice-Beispiel (Frage 32).", "bestPracticeDescription");
        }
        if (!sharePractice) return err("Bitte beantworten Sie Frage 33 (Erfahrungen teilen).");
        break;
      case 6: // Teil G
        if (supportNeeds.length === 0) return err("Bitte wählen Sie mindestens eine Unterstützungsart (Frage 34).");
        if (softwareLicenses.length === 0) return err("Bitte wählen Sie die Software-Lizenzen (Frage 35).");
        if (softwareLicenses.includes("Sonstiges") && !softwareLicensesOther.trim()) {
          return err("Bitte geben Sie die sonstige Software-Lizenz an (Frage 35).");
        }
        if (!studentSupport) return err("Bitte beantworten Sie Frage 36 (studentische Unterstützung).");
        if (!timeForTools) return err("Bitte beantworten Sie Frage 37 (Zeit für Tools).");
        break;
      case 7: // Teil H – Fragen 38 + 39 optional, aber Einwilligungen sind Pflicht
        if (!privacyConsent) return err("Bitte stimmen Sie der Datenschutzerklärung zu.");
        if (!truthConsent) return err("Bitte bestätigen Sie die Richtigkeit Ihrer Angaben.");
        break;
      case 8: // Account
        if (!contactPerson.trim()) return err("Bitte geben Sie den Namen des Ansprechpartners an.", "contactPerson");
        if (!principalName.trim()) return err("Bitte geben Sie den Namen der Schulleitung an.", "principalName");
        if (!contactEmail.trim() || !contactEmail.includes("@")) return err("Bitte geben Sie eine gültige E-Mail-Adresse an.", "contactEmail");
        if (!contactPhone.trim()) return err("Bitte geben Sie eine Telefonnummer an.", "contactPhone");
        if (password.length < 8) return err("Das Passwort muss mindestens 8 Zeichen lang sein.", "password");
        if (password !== passwordConfirm) return err("Die Passwörter stimmen nicht überein.", "passwordConfirm");
        break;
    }
    return { message: "" };
  }

  function handleNext() {
    const result = validateStep(step);
    if (result.message) {
      setErrorFocusId(result.focusId ?? null);
      setStepError(result.message);
      return;
    }
    setStepError("");
    setErrorFocusId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Step-Wechsel als Transition → Click bleibt sofort responsiv,
    // React rendert den (umfangreichen) nächsten Abschnitt im Hintergrund.
    startStepTransition(() => setStep((s) => s + 1));
  }

  function handleBack() {
    setStepError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    startStepTransition(() => setStep((s) => s - 1));
  }

  // ─── lastStep: in editMode skip step 8 (account creation) ─────────────────
  const lastStep = editMode ? 7 : 8;
  const visibleSteps = editMode ? STEPS.slice(0, 8) : STEPS;

  // ─── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Wenn Nutzer in einem Textfeld auf Enter drückt, soll das nicht das Formular
    // vorzeitig abschicken, sondern wie "Weiter" wirken.
    // Nur echte Submit-Button-Klicks dürfen hier durchgehen. Der Button setzt
    // submitIntentRef auf true (onClick), das wird hier geprüft und direkt
    // wieder zurückgesetzt, damit ein zweiter (unerwünschter) Submit nicht
    // durchläuft.
    const hadIntent = submitIntentRef.current;
    submitIntentRef.current = false;
    if (!hadIntent) return;

    if (step !== lastStep) return;

    setStepError("");

    if (isSpam) { setSuccess(true); return; }

    // Pflichtfelder auf dem letzten Step prüfen – verhindert generische Fehler
    // und gibt dem Nutzer eine klare Meldung.
    if (!editMode) {
      const finalErr = validateStep(lastStep);
      if (finalErr.message) {
        setErrorFocusId(finalErr.focusId ?? null);
        setStepError(finalErr.message);
        return;
      }
    }

    if (!privacyConsent || !truthConsent) {
      setErrorFocusId(null);
      setStepError("Bitte bestätigen Sie die Datenschutzerklärung und die Richtigkeit Ihrer Angaben.");
      return;
    }

    setLoading(true);

    // ── Edit mode: update existing record ──────────────────────────────────
    if (editMode && recordId) {
      const res = await fetch("/api/update-bestandsaufnahme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          schoolName,
          schoolLocation,
          studentCount,
          teacherCount: teacherCount || null,
          isStartchancen,
          dazShare,
          respondentRole: respondentRole || null,
          devices,
          devicesOther: devicesOther || null,
          tabletCount: tabletCount || null,
          wlanRating: wlanRating || null,
          infrastructure,
          infrastructureOther: infrastructureOther || null,
          challenges,
          challengesOther: challengesOther || null,
          supportSatisfaction: supportSatisfaction || null,
          digitizationLevel: digitizationLevel || null,
          toolsUsed,
          toolsUsedOther: toolsUsedOther || null,
          usageFrequency: usageFrequency || null,
          diagnosticTools,
          mediaConcept: mediaConcept || null,
          mediaResponsible: mediaResponsible || null,
          aiUsage: aiUsage || null,
          aiPurposes,
          aiPurposesOther: aiPurposesOther || null,
          aiToolsUsed,
          aiToolsOther: aiToolsOther || null,
          aiCompetence: aiCompetence || null,
          aiConcerns,
          aiConcernsOther: aiConcernsOther || null,
          aiTrainings,
          aiTrainingsOther: aiTrainingsOther || null,
          trainingNeeds,
          trainingNeedsOther: trainingNeedsOther || null,
          trainingFormat,
          trainingTimes,
          participationCount: participationCount || null,
          pioneerInterest: pioneerInterest || null,
          hasBestPractice: hasBestPractice || null,
          bestPracticeDescription: bestPracticeDescription || null,
          sharePractice: sharePractice || null,
          supportNeeds,
          softwareLicenses,
          softwareLicensesOther: softwareLicensesOther || null,
          studentSupport: studentSupport || null,
          timeForTools: timeForTools || null,
          projectWishes: projectWishes || null,
          additionalNotes: additionalNotes || null,
        }),
      });
      setLoading(false);
      if (!res.ok) {
        setErrorFocusId(null);
        setStepError("Beim Speichern ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.");
        return;
      }
      setSuccess(true);
      return;
    }

    // Account-Anlage + Bestandsaufnahme + Bestätigungsmail laufen jetzt
    // vollständig serverseitig. Client ruft nie mehr supabase.auth.signUp() –
    // so können Accounts nur noch über den Bestandsaufnahme-Flow entstehen.
    const res = await fetch("/api/register-bestandsaufnahme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: contactEmail,
        password,
        contactEmail,
        contactPerson,
        principalName,
        contactPhone: contactPhone || null,
        schoolName,
        schoolLocation,
        studentCount,
        teacherCount: teacherCount || null,
        isStartchancen,
        dazShare,
        respondentRole: respondentRole || null,
        respondentRoleOther: respondentRoleOther || null,
        devices,
        devicesOther: devicesOther || null,
        tabletCount: tabletCount || null,
        wlanRating: wlanRating || null,
        infrastructure,
        infrastructureOther: infrastructureOther || null,
        challenges,
        challengesOther: challengesOther || null,
        supportSatisfaction: supportSatisfaction || null,
        digitizationLevel: digitizationLevel || null,
        toolsUsed,
        toolsUsedOther: toolsUsedOther || null,
        usageFrequency: usageFrequency || null,
        diagnosticTools,
        diagnosticToolsOther: diagnosticToolsOther || null,
        mediaConcept: mediaConcept || null,
        mediaResponsible: mediaResponsible || null,
        aiUsage: aiUsage || null,
        aiPurposes,
        aiPurposesOther: aiPurposesOther || null,
        aiToolsUsed,
        aiToolsOther: aiToolsOther || null,
        aiCompetence: aiCompetence || null,
        aiConcerns,
        aiConcernsOther: aiConcernsOther || null,
        aiTrainings,
        aiTrainingsOther: aiTrainingsOther || null,
        trainingNeeds,
        trainingNeedsOther: trainingNeedsOther || null,
        trainingFormat,
        trainingTimes,
        participationCount: participationCount || null,
        pioneerInterest: pioneerInterest || null,
        hasBestPractice: hasBestPractice || null,
        bestPracticeDescription: bestPracticeDescription || null,
        sharePractice: sharePractice || null,
        supportNeeds,
        softwareLicenses,
        softwareLicensesOther: softwareLicensesOther || null,
        studentSupport: studentSupport || null,
        timeForTools: timeForTools || null,
        projectWishes: projectWishes || null,
        additionalNotes: additionalNotes || null,
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}) as Record<string, unknown>);
      const errorCode = typeof payload.error === "string" ? payload.error : "";
      const serverFocusId = typeof payload.focusId === "string" ? payload.focusId : null;

      if (res.status === 409 && errorCode === "email_already_registered") {
        setErrorFocusId(serverFocusId ?? "contactEmail");
        setStepError(
          "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich direkt an oder nutzen Sie 'Passwort vergessen'."
        );
      } else if (errorCode === "weak_password") {
        setErrorFocusId(serverFocusId ?? "password");
        setStepError(
          "Das Passwort erfüllt nicht alle Anforderungen (mind. 8 Zeichen, Großbuchstabe, Zahl, Sonderzeichen)."
        );
      } else if (errorCode === "invalid_email") {
        setErrorFocusId(serverFocusId ?? "contactEmail");
        setStepError("Bitte geben Sie eine gültige E-Mail-Adresse an.");
      } else if (errorCode === "missing_field") {
        setErrorFocusId(serverFocusId ?? null);
        setStepError(
          "Einige Pflichtfelder fehlen noch. Bitte prüfen Sie die vorherigen Abschnitte."
        );
      } else if (res.status === 429) {
        setErrorFocusId(null);
        setStepError(
          "Zu viele Anfragen. Bitte warten Sie eine Minute und versuchen Sie es erneut."
        );
      } else {
        console.error("Register error:", res.status, errorCode);
        setErrorFocusId(null);
        setStepError(
          "Beim Einreichen ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
        );
      }
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  // isAdmin kann null (loading), true oder false sein. Früher wurde bei null
  // `null` returnt → CLS-Problem, weil Form-Inhalt erst nach Auth-Check aufpoppt.
  // Jetzt: nur bei true (bestätigter Admin) den Blocker zeigen. Loading + Nicht-Admin
  // rendern beide die Form → keine Layout-Verschiebung bei Hydration.
  if (!editMode && isAdmin === true) return (
    <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-6 py-8 text-center text-sm text-yellow-800">
      Admin-Accounts können die Bestandsaufnahme nicht nutzen.
    </div>
  );

  if (success) {
    return editMode ? (
      <div className="rounded-xl bg-green-50 border border-green-200 px-6 py-8 text-center">
        <p className="text-2xl mb-2">✅</p>
        <h2 className="text-xl font-bold text-green-800 mb-2">Änderungen gespeichert!</h2>
        <p className="text-sm text-green-700">Ihre Bestandsaufnahme wurde erfolgreich aktualisiert.</p>
        <a href="/best-practice/datenbank" className="mt-4 inline-block text-sm text-primary underline hover:text-primary-light transition-colors">
          Zurück zur Datenbank
        </a>
      </div>
    ) : (
      <FormSuccess
        title="Vielen Dank für Ihre Teilnahme!"
        message="Ihre Bestandsaufnahme wurde übermittelt und Ihr DigiKI-Account wurde angelegt. Bitte prüfen Sie Ihr E-Mail-Postfach und klicken Sie auf den Bestätigungslink von Supabase, um Ihren Account zu aktivieren."
        submittedEmail={contactEmail}
      />
    );
  }

  return (
    <div>
      {HoneypotField}
      <ProgressBar
        step={step}
        steps={visibleSteps}
        onStepClick={editMode ? (i) => { setStepError(""); window.scrollTo({ top: 0, behavior: "smooth" }); startStepTransition(() => setStep(i)); } : undefined}
      />

      {/* Error banner */}
      {stepError && (
        <div
          ref={errorAlertRef}
          role="alert"
          tabIndex={-1}
          className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
        >
          <span className="shrink-0 mt-0.5" aria-hidden="true">⚠️</span>
          <span>{stepError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="min-h-[640px]">
        {/* ══════════════════════════════════════════════════════════════════
            STEP 0 – Teil A: Allgemeine Angaben
        ══════════════════════════════════════════════════════════════════ */}
        {step === 0 && (
          <div className="space-y-7">
            <SectionHeading icon="🏫" title="Teil A: Allgemeine Angaben" />

            <div className="relative">
              <FieldLabel required htmlFor="schoolName">1. Name der Schule</FieldLabel>
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
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors bg-white"
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
              <FieldLabel required htmlFor="teacherCount">4. Anzahl der Lehrkräfte (inkl. Teilzeit)</FieldLabel>
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent-strong">Nur bei KI-Nutzung</p>

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
                    {aiPurposes.includes("Sonstiges") && (
                      <OtherInput value={aiPurposesOther} onChange={setAiPurposesOther} />
                    )}
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
                  <span className="ml-2 inline-block bg-accent text-text text-xs px-2 py-0.5 rounded-full font-normal">
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
              {trainingNeeds.includes("Sonstiges") && (
                <OtherInput value={trainingNeedsOther} onChange={setTrainingNeedsOther} />
              )}
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
              <FieldLabel htmlFor="participationCount">29. Wie viele Lehrkräfte würden voraussichtlich an den DigiKI-Schulungen teilnehmen?</FieldLabel>
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
                <p className="text-xs font-semibold uppercase tracking-wide text-accent-strong mb-4">Nur bei Ja</p>
                <FieldLabel htmlFor="bestPracticeDescription">32. Falls ja, beschreiben Sie bitte kurz (Fach, Tool, Ergebnis):</FieldLabel>
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
                  <span className="ml-2 inline-block bg-accent text-text text-xs px-2 py-0.5 rounded-full font-normal">
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
              <FieldLabel htmlFor="projectWishes">38. Was wünschen Sie sich konkret vom Projekt DigiKI?</FieldLabel>
              <TextArea id="projectWishes" value={projectWishes} onChange={setProjectWishes}
                placeholder="Ihre Wünsche und Erwartungen..." />
            </div>

            <div>
              <FieldLabel htmlFor="additionalNotes">39. Gibt es weitere Anmerkungen, Wünsche oder Bedenken?</FieldLabel>
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

        {/* ══════════════════════════════════════════════════════════════════
            STEP 8 – Account anlegen
        ══════════════════════════════════════════════════════════════════ */}
        {step === 8 && (
          <div className="space-y-7">
            <SectionHeading icon="🔐" title="Account für die Best-Practice-Datenbank" />

            <p className="text-sm text-text-light leading-relaxed">
              Mit diesen Angaben wird automatisch ein Login für die DigiKI Best-Practice-Datenbank angelegt.
              Sie erhalten nach dem Absenden eine Bestätigungs-E-Mail – erst danach ist der Account aktiv.
            </p>

            <div
              role="note"
              className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-semibold">
                  Hinweis zu NIBIS-Adressen (<code className="font-mono text-xs">@*.nibis.de</code>)
                </p>
                <p className="leading-relaxed">
                  Der niedersächsische Bildungsserver blockiert derzeit automatisierte Bestätigungsmails unseres Projekts.
                  Eine Zustellung an Adressen wie <code className="font-mono text-xs">schulleitung@xxxxx.nibis.de</code> ist
                  aktuell <strong>nicht möglich</strong>. Bitte nutzen Sie für die Registrierung eine andere
                  dienstliche oder private E-Mail-Adresse. Bei Fragen:{" "}
                  <a
                    href="mailto:krafft@osnabrueck.de"
                    className="underline hover:text-amber-950"
                  >
                    krafft@osnabrueck.de
                  </a>
                  .
                </p>
              </div>
            </div>

            <div>
              <FieldLabel required htmlFor="contactPerson">Name des Ansprechpartners / der Ansprechpartnerin</FieldLabel>
              <TextInput id="contactPerson" value={contactPerson} onChange={setContactPerson}
                placeholder="z. B. Maria Mustermann" autoFocus autoComplete="name" />
            </div>

            <div>
              <FieldLabel required htmlFor="principalName">Name der Schulleitung</FieldLabel>
              <TextInput id="principalName" value={principalName} onChange={setPrincipalName}
                placeholder="z. B. Thomas Müller" />
            </div>

            <div>
              <FieldLabel required htmlFor="contactEmail">E-Mail-Adresse (wird als Login verwendet)</FieldLabel>
              <TextInput id="contactEmail" type="email" value={contactEmail} onChange={setContactEmail}
                placeholder="ihre.email@schule.de" autoComplete="email" />
              {NIBIS_PATTERN.test(contactEmail.trim()) && (
                <p className="mt-2 flex items-start gap-2 text-sm text-red-700" role="alert">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    An NIBIS-Adressen (<code className="font-mono text-xs">@*.nibis.de</code>) können aktuell
                    keine Bestätigungsmails zugestellt werden. Bitte verwenden Sie eine andere E-Mail-Adresse.
                  </span>
                </p>
              )}
            </div>

            <div>
              <FieldLabel required htmlFor="contactPhone">Telefonnummer</FieldLabel>
              <TextInput id="contactPhone" type="tel" value={contactPhone} onChange={setContactPhone}
                placeholder="z. B. 0541 12345" required autoComplete="tel" />
            </div>

            <div>
              <FieldLabel required htmlFor="password">Passwort</FieldLabel>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sicheres Passwort wählen"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-border px-4 py-3 pr-11 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-text transition-colors"
                  aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordChecks && (
                <ul className="mt-2 space-y-1">
                  {passwordChecks.map(({ ok, label }) => (
                    <li key={label} className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-600" : "text-text-light"}`}>
                      <Check className={`w-3.5 h-3.5 shrink-0 ${ok ? "opacity-100" : "opacity-20"}`} strokeWidth={3} />
                      {label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <FieldLabel required htmlFor="passwordConfirm">Passwort bestätigen</FieldLabel>
              <div className="relative">
                <input
                  id="passwordConfirm"
                  type={showPassword ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Passwort wiederholen"
                  autoComplete="new-password"
                  aria-invalid={!!(passwordConfirm && password !== passwordConfirm)}
                  aria-describedby={
                    passwordConfirm && password !== passwordConfirm
                      ? "passwordConfirm-error"
                      : undefined
                  }
                  className={`w-full rounded-lg border px-4 py-3 pr-11 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors bg-white ${
                    passwordConfirm && password !== passwordConfirm
                      ? "border-red-400"
                      : "border-border"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-text transition-colors"
                  aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordConfirm && password !== passwordConfirm && (
                <p id="passwordConfirm-error" role="alert" className="mt-1 text-xs text-red-600">
                  Die Passwörter stimmen nicht überein.
                </p>
              )}
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

          {step < lastStep ? (
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
              onClick={() => { submitIntentRef.current = true; }}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-text hover:bg-accent-hover transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              {loading ? "Wird übermittelt…" : editMode ? "Änderungen speichern" : "Bestandsaufnahme einreichen"}
            </button>
          )}
        </div>

        <p className="mt-3 text-xs text-text-light">* Pflichtfelder</p>
      </form>
    </div>
  );
}

