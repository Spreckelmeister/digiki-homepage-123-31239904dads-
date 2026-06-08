"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  ClipboardCheck,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ToolSelection } from "@/lib/types";
import SchoolInfoFields from "./SchoolInfoFields";
import FormSuccess from "./FormSuccess";
import FormSection from "./FormSection";
import { useHoneypot } from "./useHoneypot";
import { useIsAdmin } from "@/lib/useIsAdmin";

const TOOL_CATEGORIES = [
  "Sprachförderung & Lesen",
  "Mathematik",
  "Diagnostik",
  "Differenzierung & Übung",
];

function createInitialToolSelections(): ToolSelection[] {
  return TOOL_CATEGORIES.map((category) => ({
    category,
    tools: [
      { name: "", license_count: 0 },
      { name: "", license_count: 0 },
      { name: "", license_count: 0 },
    ],
  }));
}

interface ToolAppData {
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
  tool_selections: Array<{ category: string; tools: Array<{ name: string; license_count: number }> }>;
  additional_tools: string | null;
  grade_levels: string | null;
  subjects: string | null;
  start_date: string | null;
  usage_description: string | null;
  privacy_concept_exists: boolean;
  parental_consent: boolean;
  it_infrastructure_meets_requirements: boolean;
}

interface BestandsaufnahmePrefill {
  school_name?: string;
  principal_name?: string;
  contact_person?: string;
  phone?: string;
  teacher_count?: string;
}

export default function ToolLicenseForm({
  editMode = false,
  initialData,
  recordId,
  lockedEmail,
  prefillFromBSA,
  lockedFromBSA,
}: {
  editMode?: boolean;
  initialData?: ToolAppData;
  recordId?: string;
  /** Vom Server-Component übergebene Konto-E-Mail. Wenn gesetzt, wird das
   *  E-Mail-Feld als gesperrte Anzeige gerendert. */
  lockedEmail?: string;
  /** Aus der jüngsten Bestandsaufnahme der Schule vor-ausgefüllte Felder. */
  prefillFromBSA?: BestandsaufnahmePrefill | null;
  /** Liste der Felder, die durch BSA-Prefill gesperrt werden. */
  lockedFromBSA?: string[];
}) {
  const isAdmin = useIsAdmin();
  const { isSpam, HoneypotField } = useHoneypot();
  const [schoolInfo, setSchoolInfo] = useState({
    // Beim NEU-Antrag haben Prefill-Werte Vorrang vor leer; im Edit-Modus
    // gewinnen initialData (gespeicherte Werte).
    school_name:    initialData?.school_name    ?? prefillFromBSA?.school_name    ?? "",
    school_street:  initialData?.school_street  ?? "",
    school_plz:     initialData?.school_plz     ?? "",
    school_city:    initialData?.school_city     ?? "",
    principal_name: initialData?.principal_name ?? prefillFromBSA?.principal_name ?? "",
    contact_person: initialData?.contact_person ?? prefillFromBSA?.contact_person ?? "",
    phone:          initialData?.phone          ?? prefillFromBSA?.phone          ?? "",
    email:          lockedEmail                 ?? initialData?.email             ?? "",
    teacher_count:  initialData?.teacher_count != null
      ? String(initialData.teacher_count)
      : prefillFromBSA?.teacher_count ?? "",
    student_count:  initialData?.student_count != null ? String(initialData.student_count) : "",
  });

  const [toolSelections, setToolSelections] = useState<ToolSelection[]>(() => {
    const stored = initialData?.tool_selections;
    if (!stored || stored.length === 0) return createInitialToolSelections();
    // Ensure each category has at least 3 tool rows
    return createInitialToolSelections().map((defaultCat) => {
      const match = stored.find((s) => s.category === defaultCat.category);
      if (!match) return defaultCat;
      const tools = [...match.tools];
      while (tools.length < 3) tools.push({ name: "", license_count: 0 });
      return { ...match, tools };
    });
  });
  const [additionalTools, setAdditionalTools] = useState(initialData?.additional_tools ?? "");

  // Geplanter Einsatz
  const [gradeLevels, setGradeLevels] = useState(initialData?.grade_levels ?? "");
  const [subjects, setSubjects] = useState(initialData?.subjects ?? "");
  const [startDate, setStartDate] = useState(initialData?.start_date ?? "");
  const [usageDescription, setUsageDescription] = useState(initialData?.usage_description ?? "");

  // Datenschutz
  const [privacyConcept, setPrivacyConcept] = useState(editMode ? (initialData?.privacy_concept_exists ?? true) : false);
  const [parentalConsent, setParentalConsent] = useState(editMode ? (initialData?.parental_consent ?? true) : false);
  const [itInfrastructure, setItInfrastructure] = useState(editMode ? (initialData?.it_infrastructure_meets_requirements ?? true) : false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [truthConsent, setTruthConsent] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailFailed, setEmailFailed] = useState(false);

  function handleSchoolInfoChange(field: string, value: string) {
    setSchoolInfo((prev) => ({ ...prev, [field]: value }));
  }

  function updateTool(
    categoryIndex: number,
    toolIndex: number,
    field: "name" | "license_count",
    value: string
  ) {
    setToolSelections((prev) => {
      const updated = prev.map((cat, ci) => {
        if (ci !== categoryIndex) return cat;
        return {
          ...cat,
          tools: cat.tools.map((tool, ti) => {
            if (ti !== toolIndex) return tool;
            return {
              ...tool,
              [field]:
                field === "license_count"
                  ? parseInt(value) || 0
                  : value,
            };
          }),
        };
      });
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (editMode) {
      setLoading(true);
      // Filter out empty tool entries before sending
      const filteredSelections = toolSelections
        .map((cat) => ({
          ...cat,
          tools: cat.tools.filter((t) => t.name.trim() !== ""),
        }))
        .filter((cat) => cat.tools.length > 0);

      const res = await fetch("/api/update-tool-app", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          school_name:                          schoolInfo.school_name,
          school_street:                        schoolInfo.school_street || null,
          school_plz:                           schoolInfo.school_plz || null,
          school_city:                          schoolInfo.school_city || null,
          principal_name:                       schoolInfo.principal_name || null,
          contact_person:                       schoolInfo.contact_person,
          phone:                                schoolInfo.phone || null,
          email:                                schoolInfo.email,
          teacher_count:                        schoolInfo.teacher_count ? parseInt(schoolInfo.teacher_count) : null,
          student_count:                        schoolInfo.student_count ? parseInt(schoolInfo.student_count) : null,
          tool_selections:                      filteredSelections,
          additional_tools:                     additionalTools || null,
          grade_levels:                         gradeLevels || null,
          subjects:                             subjects || null,
          start_date:                           startDate || null,
          usage_description:                    usageDescription || null,
          privacy_concept_exists:               privacyConcept,
          parental_consent:                     parentalConsent,
          it_infrastructure_meets_requirements: itInfrastructure,
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

    if (!privacyConcept || !parentalConsent || !itInfrastructure) {
      setError("Bitte bestätigen Sie alle Datenschutz-Angaben.");
      return;
    }

    if (!privacyConsent || !truthConsent) {
      setError("Bitte bestätigen Sie die Datenschutzerklärung und die Richtigkeit Ihrer Angaben.");
      return;
    }

    setLoading(true);

    // Filter out empty tool entries
    const filteredSelections = toolSelections
      .map((cat) => ({
        ...cat,
        tools: cat.tools.filter((t) => t.name.trim() !== ""),
      }))
      .filter((cat) => cat.tools.length > 0);

    const supabase = createClient();

    const { error: insertError } = await supabase
      .from("applications_tool_licenses")
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
        tool_selections: filteredSelections,
        additional_tools: additionalTools || null,
        grade_levels: gradeLevels || null,
        subjects: subjects || null,
        start_date: startDate || null,
        usage_description: usageDescription || null,
        privacy_concept_exists: privacyConcept,
        parental_consent: parentalConsent,
        it_infrastructure_meets_requirements: itInfrastructure,
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
          type: "tool_license",
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
  // Admins dürfen keine NEUEN Anträge einreichen, dürfen aber existierende
  // im Edit-Modus (z.B. aus dem Admin-Bereich) bearbeiten.
  if (isAdmin === true && !editMode) return (
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
          message="Vielen Dank für Ihren Lizenz-Antrag. Wir prüfen Ihre Angaben und melden uns zeitnah bei Ihnen."
          submittedEmail={schoolInfo.email}
        />
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!editMode && HoneypotField}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm"
        >
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="font-bold">Antrag konnte nicht gesendet werden</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {!editMode && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-white p-5 md:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary-light/15 blur-3xl"
          />
          <div className="relative flex items-start gap-4">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-strong">
                Kostenfrei für Grundschulen
              </p>
              <p className="mt-1 text-sm leading-relaxed text-text-light">
                Dank der Förderung durch die Stiftungen und Klaus Hellmann
                können Grundschulen in Stadt und Landkreis Osnabrück
                kostenlose Lizenzen für ausgewählte, DSGVO-konforme Lern-Tools
                beantragen. Alle Tools sind auf ihren pädagogischen Nutzen
                geprüft und auf die Bedürfnisse von Grundschulen abgestimmt.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ════════ §1 SCHULE ════════ */}
      <FormSection
        index="01"
        eyebrow="Schule"
        title="Wer beantragt?"
        body="Angaben zu Ihrer Schule und Kontaktdaten. Bereits aus Ihrer Bestandsaufnahme bekannte Werte werden automatisch übernommen."
        icon={<Building2 className="h-3 w-3" />}
      >
        <SchoolInfoFields
          values={schoolInfo}
          onChange={handleSchoolInfoChange}
          inputClass={inputClass}
          lockedEmail={lockedEmail}
          lockedFromBestandsaufnahme={lockedFromBSA}
        />
      </FormSection>

      {/* ════════ §2 TOOLS ════════ */}
      <FormSection
        index="02"
        eyebrow="Tool-Lizenzen"
        title="Was möchten Sie einsetzen?"
        body="Wählen Sie aus den geprüften, DSGVO-konformen Tools und geben Sie an, wie viele Lizenzen Sie pro Tool benötigen."
        icon={<ClipboardCheck className="h-3 w-3" />}
      >
        <div className="space-y-5">
          {toolSelections.map((category, catIndex) => (
            <div
              key={category.category}
              className="rounded-xl border border-border bg-bg p-4"
            >
              <h3 className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.tools.map((tool, toolIndex) => (
                  <div
                    key={toolIndex}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px]"
                  >
                    <input
                      type="text"
                      value={tool.name}
                      onChange={(e) =>
                        updateTool(catIndex, toolIndex, "name", e.target.value)
                      }
                      className={inputClass}
                      placeholder={`Tool ${toolIndex + 1} (Name)`}
                    />
                    <input
                      type="number"
                      min="0"
                      value={tool.license_count || ""}
                      onChange={(e) =>
                        updateTool(
                          catIndex,
                          toolIndex,
                          "license_count",
                          e.target.value,
                        )
                      }
                      className={inputClass}
                      placeholder="Anz. Lizenzen"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <label
            htmlFor="additional_tools"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Weitere gewünschte Tools
          </label>
          <textarea
            id="additional_tools"
            rows={2}
            value={additionalTools}
            onChange={(e) => setAdditionalTools(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="Falls Sie weitere Tools benötigen, die nicht aufgelistet sind …"
          />
        </div>
      </FormSection>

      {/* ════════ §3 EINSATZ ════════ */}
      <FormSection
        index="03"
        eyebrow="Einsatz"
        title="Wie soll's eingesetzt werden?"
        body="Damit wir den passenden Lizenz-Umfang und Schulungsbedarf einschätzen können – kurz angegeben, in welchen Klassen, Fächern und ab wann."
        icon={<Target className="h-3 w-3" />}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="grade_levels"
              className="mb-1.5 block text-sm font-medium text-text"
            >
              Klassenstufen
            </label>
            <input
              id="grade_levels"
              type="text"
              value={gradeLevels}
              onChange={(e) => setGradeLevels(e.target.value)}
              className={inputClass}
              placeholder="z.B. 1–4"
            />
          </div>
          <div>
            <label
              htmlFor="subjects"
              className="mb-1.5 block text-sm font-medium text-text"
            >
              Fächer / Bereiche
            </label>
            <input
              id="subjects"
              type="text"
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              className={inputClass}
              placeholder="z.B. Deutsch, DaZ, Mathe"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="start_date_tool"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Geplanter Beginn
          </label>
          <input
            id="start_date_tool"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass + " max-w-[250px]"}
          />
        </div>

        <div>
          <label
            htmlFor="usage_description"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Kurze Beschreibung des geplanten Einsatzes
          </label>
          <textarea
            id="usage_description"
            rows={4}
            value={usageDescription}
            onChange={(e) => setUsageDescription(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="Beschreiben Sie kurz, wie Sie die Tools im Unterricht einsetzen möchten …"
          />
        </div>
      </FormSection>

      {/* ════════ §4 DATENSCHUTZ ════════ */}
      <FormSection
        index="04"
        eyebrow="Datenschutz"
        title="Bestätigungen"
        body="Damit der Tool-Einsatz rechtssicher startet, brauchen wir noch ein paar Bestätigungen Ihrer Schule."
        icon={<ShieldCheck className="h-3 w-3" />}
      >
        <div className="space-y-3">
          <label className={checkboxLabel}>
            <input
              type="checkbox"
              checked={privacyConcept}
              onChange={(e) => setPrivacyConcept(e.target.checked)}
              className={checkboxInput}
            />
            <span className="text-sm text-text">
              Unsere Schule verfügt über ein aktuelles Datenschutzkonzept. *
            </span>
          </label>
          <label className={checkboxLabel}>
            <input
              type="checkbox"
              checked={parentalConsent}
              onChange={(e) => setParentalConsent(e.target.checked)}
              className={checkboxInput}
            />
            <span className="text-sm text-text">
              Die Einwilligung der Erziehungsberechtigten für die Nutzung
              digitaler Lernplattformen liegt vor bzw. wird eingeholt. *
            </span>
          </label>
          <label className={checkboxLabel}>
            <input
              type="checkbox"
              checked={itInfrastructure}
              onChange={(e) => setItInfrastructure(e.target.checked)}
              className={checkboxInput}
            />
            <span className="text-sm text-text">
              Die schulische IT-Infrastruktur erfüllt die Mindestanforderungen
              für den Tool-Einsatz. *
            </span>
          </label>
          {!editMode && (
            <>
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
                    className="text-primary underline hover:text-primary/80"
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
                  Ich bestätige, dass alle gemachten Angaben der Wahrheit
                  entsprechen. *
                </span>
              </label>
            </>
          )}
        </div>
      </FormSection>

      {/* ════════ Submit ════════ */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={loading}
          className="group inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-bold text-text shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-md disabled:cursor-wait disabled:opacity-50"
        >
          <Send
            className={`h-4 w-4 ${loading ? "animate-pulse" : "transition-transform group-hover:translate-x-0.5"}`}
            aria-hidden="true"
          />
          {loading
            ? editMode
              ? "Wird gespeichert …"
              : "Wird eingereicht …"
            : editMode
              ? "Änderungen speichern"
              : "Antrag einreichen"}
        </button>
        {!editMode && (
          <p className="text-xs text-text-light">* Pflichtfelder.</p>
        )}
      </div>
    </form>
  );
}
