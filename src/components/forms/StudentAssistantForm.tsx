"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  HelpingHand,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import SchoolInfoFields from "./SchoolInfoFields";
import FormSuccess from "./FormSuccess";
import FormSection from "./FormSection";
import { useHoneypot } from "./useHoneypot";
import { useIsAdmin } from "@/lib/useIsAdmin";
import {
  SUPPORT_AREA_OPTIONS,
  SCOPE_PRESET_OPTIONS,
} from "@/lib/applications/hilfskraefteOptions";
import type { RegisteredTraining } from "@/lib/schulungen/getSchoolTrainings";
import type { BestandsaufnahmePrefill } from "@/lib/bestandsaufnahme/getPrefill";

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
  support_explanation: string | null;
  start_date: string | null;
  training_participation: string | null;
  training_details: string | null;
  internal_attempt: string | null;
  support_area: string | null;
  scope_preset: string | null;
}

function formatTrainingDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** „2 Lehrkräfte, 1 Schulleitung" – leer, wenn keine Zählung vorliegt. */
function roleCounts(t: RegisteredTraining): string {
  const parts: string[] = [];
  if (t.teacherCount > 0) {
    parts.push(t.teacherCount === 1 ? "1 Lehrkraft" : `${t.teacherCount} Lehrkräfte`);
  }
  if (t.leadershipCount > 0) {
    parts.push(
      t.leadershipCount === 1 ? "1 Schulleitung" : `${t.leadershipCount} Schulleitungen`
    );
  }
  return parts.join(", ");
}

/** Text-Schnappschuss der angezeigten Anmeldungen für die DB/Admin-Ansicht. */
function trainingsSnapshot(trainings: RegisteredTraining[]): string {
  return trainings
    .map((t) => {
      const date = t.start_date ? formatTrainingDate(t.start_date) : "Termin folgt";
      const counts = roleCounts(t);
      return `${t.title} (${date})${counts ? ` – ${counts}` : ""}`;
    })
    .join("; ");
}

/** Eintrag der verifizierten Schulliste im Stellvertreter-Modus. */
interface BehalfSchool {
  name: string;
  city: string | null;
  plz: string | null;
}

export default function StudentAssistantForm({
  editMode = false,
  initialData,
  recordId,
  lockedEmail,
  prefillFromBSA,
  lockedFromBSA,
  registeredTrainings,
  actingRole,
}: {
  editMode?: boolean;
  initialData?: StudentAppData;
  recordId?: string;
  /** Konto-E-Mail aus dem Server-Component. Wenn gesetzt, wird das
   *  E-Mail-Feld als gesperrte Anzeige gerendert. */
  lockedEmail?: string;
  /** Aus der jüngsten Bestandsaufnahme der Schule vor-ausgefüllte Felder. */
  prefillFromBSA?: BestandsaufnahmePrefill | null;
  /** Liste der Felder, die durch BSA-Prefill gesperrt werden. */
  lockedFromBSA?: string[];
  /** Serverseitig ermittelte Schulungsanmeldungen der Schule (nur Neuantrag).
   *  Leere Liste blockiert das Einreichen – Schulung ist Voraussetzung. */
  registeredTrainings?: RegisteredTraining[];
  /** Stellvertreter-Modus: Admin/Schulungsteam füllt den Antrag für eine
   *  Schule aus – mit Schulauswahl (verifizierte Liste), Schulungsprüfung
   *  gegen die gewählte Schule und bewusst überspringbarer Prüfung.
   *  Schul-Konten bekommen diese Rolle NIE (Serverseite entscheidet). */
  actingRole?: "admin" | "schulungsteam";
}) {
  const isAdmin = useIsAdmin();
  const { isSpam, HoneypotField } = useHoneypot();
  const actingForSchool = Boolean(actingRole) && !editMode;

  const [schoolInfo, setSchoolInfo] = useState({
    school_name:    initialData?.school_name    ?? prefillFromBSA?.school_name    ?? "",
    school_street:  initialData?.school_street  ?? prefillFromBSA?.school_street  ?? "",
    school_plz:     initialData?.school_plz     ?? prefillFromBSA?.school_plz     ?? "",
    school_city:    initialData?.school_city     ?? prefillFromBSA?.school_city    ?? "",
    principal_name: initialData?.principal_name ?? prefillFromBSA?.principal_name ?? "",
    contact_person: initialData?.contact_person ?? prefillFromBSA?.contact_person ?? "",
    phone:          initialData?.phone          ?? prefillFromBSA?.phone          ?? "",
    // Im Stellvertreter-Modus gehört die E-Mail der SCHULE ins Formular –
    // nicht die des ausfüllenden Kontos.
    email:          actingForSchool ? "" : lockedEmail ?? initialData?.email ?? "",
    teacher_count:  initialData?.teacher_count != null
      ? String(initialData.teacher_count)
      : prefillFromBSA?.teacher_count ?? "",
    student_count:  initialData?.student_count != null
      ? String(initialData.student_count)
      : prefillFromBSA?.student_count ?? "",
  });

  // ── Stellvertreter-Modus: Schulauswahl + Schulungsprüfung ────────────
  const [behalfSchools, setBehalfSchools] = useState<BehalfSchool[]>([]);
  const [behalfSchoolsLoading, setBehalfSchoolsLoading] = useState(false);
  const [behalfSearch, setBehalfSearch] = useState("");
  const [selectedBehalfSchool, setSelectedBehalfSchool] =
    useState<BehalfSchool | null>(null);
  const [behalfTrainings, setBehalfTrainings] = useState<
    RegisteredTraining[] | null
  >(null);
  const [behalfTrainingsLoading, setBehalfTrainingsLoading] = useState(false);
  const [skipTrainingCheck, setSkipTrainingCheck] = useState(false);

  useEffect(() => {
    if (!actingForSchool) return;
    let cancelled = false;
    (async () => {
      setBehalfSchoolsLoading(true);
      try {
        const res = await fetch("/api/schulungen/school-picker");
        const json = await res.json().catch(() => ({}));
        if (!cancelled) {
          setBehalfSchools(Array.isArray(json.schools) ? json.schools : []);
        }
      } catch {
        if (!cancelled) setBehalfSchools([]);
      } finally {
        if (!cancelled) setBehalfSchoolsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actingForSchool]);

  async function chooseBehalfSchool(school: BehalfSchool) {
    setSelectedBehalfSchool(school);
    setBehalfSearch("");
    setSkipTrainingCheck(false);
    // Adresse zurücksetzen: Sie gehört zur vorher gewählten Schule; der
    // OpenStreetMap-Vorschlag füllt sie für die neue Schule frisch aus.
    setSchoolInfo((prev) => ({
      ...prev,
      school_name: school.name,
      school_street: "",
      school_plz: "",
      school_city: "",
    }));
    setBehalfTrainings(null);
    setBehalfTrainingsLoading(true);
    try {
      const res = await fetch(
        `/api/schulungen/school-picker?school=${encodeURIComponent(school.name)}`,
      );
      const json = await res.json().catch(() => ({}));
      setBehalfTrainings(Array.isArray(json.trainings) ? json.trainings : []);
    } catch {
      setBehalfTrainings([]);
    } finally {
      setBehalfTrainingsLoading(false);
    }
  }

  function resetBehalfSchool() {
    setSelectedBehalfSchool(null);
    setBehalfTrainings(null);
    setSkipTrainingCheck(false);
    setSchoolInfo((prev) => ({
      ...prev,
      school_name: "",
      school_street: "",
      school_plz: "",
      school_city: "",
    }));
  }

  const behalfQuery = behalfSearch.trim().toLowerCase();
  const behalfMatches = behalfQuery
    ? behalfSchools.filter((s) => s.name.toLowerCase().includes(behalfQuery))
    : behalfSchools;
  const behalfShown = behalfMatches.slice(0, 12);
  const behalfRoleLabel = actingRole === "admin" ? "Admin" : "Schulungsteam";

  // Adresse/Schülerzahl stammen aus dem jüngsten früheren Antrag der Schule
  // (die BSA kennt sie nicht) – sie wandern in die Zusammenfassungs-Karte.
  const prefilledFromApplication =
    !editMode && !actingForSchool && prefillFromBSA
      ? [
          ...(prefillFromBSA.school_street &&
          prefillFromBSA.school_plz &&
          prefillFromBSA.school_city
            ? ["school_street", "school_plz", "school_city"]
            : []),
          ...(prefillFromBSA.student_count ? ["student_count"] : []),
        ]
      : [];

  // Voraussetzungen: Schulungsanmeldung kommt automatisch aus dem Server
  // (registeredTrainings); nur der schulinterne Versuch wird abgefragt.
  const [internalAttempt, setInternalAttempt] = useState(initialData?.internal_attempt ?? "");

  // Konkrete Hürde (Einfachauswahl + Beschreibung)
  const [supportArea, setSupportArea] = useState(initialData?.support_area ?? "");
  const [supportExplanation, setSupportExplanation] = useState(initialData?.support_explanation ?? "");

  // Umfang & Termin
  const [scopePreset, setScopePreset] = useState(initialData?.scope_preset ?? "");
  const [startDate, setStartDate] = useState(initialData?.start_date ?? "");

  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [truthConsent, setTruthConsent] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailFailed, setEmailFailed] = useState(false);

  const trainings = actingForSchool
    ? behalfTrainings ?? []
    : registeredTrainings ?? [];
  // Im Stellvertreter-Modus steht der Schulungsstatus erst fest, wenn eine
  // Schule gewählt UND die Prüfung geladen ist – vorher keine Boxen zeigen.
  const trainingStatusKnown =
    !actingForSchool ||
    (selectedBehalfSchool !== null &&
      !behalfTrainingsLoading &&
      behalfTrainings !== null);

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
          school_name:         schoolInfo.school_name,
          school_street:       schoolInfo.school_street || null,
          school_plz:          schoolInfo.school_plz || null,
          school_city:         schoolInfo.school_city || null,
          principal_name:      schoolInfo.principal_name || null,
          contact_person:      schoolInfo.contact_person,
          phone:               schoolInfo.phone || null,
          email:               schoolInfo.email,
          teacher_count:       schoolInfo.teacher_count ? parseInt(schoolInfo.teacher_count) : null,
          student_count:       schoolInfo.student_count ? parseInt(schoolInfo.student_count) : null,
          internal_attempt:    internalAttempt,
          support_area:        supportArea,
          support_explanation: supportExplanation || null,
          scope_preset:        scopePreset,
          start_date:          startDate || null,
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

    if (actingForSchool && !selectedBehalfSchool) {
      setError(
        "Bitte wählen Sie zuerst die Schule aus, für die Sie den Antrag ausfüllen."
      );
      return;
    }

    // Ohne Schulungsanmeldung keine studentische Unterstützung – die
    // Schulungen sind der erste Schritt des DigiKI-Wegs. Nur im
    // Stellvertreter-Modus (Admin/Schulungsteam) lässt sich die Prüfung
    // bewusst per Haken überspringen; Schul-Konten können das nie.
    if (trainings.length === 0 && !(actingForSchool && skipTrainingCheck)) {
      setError(
        actingForSchool
          ? "Für die gewählte Schule liegt keine Schulungsanmeldung vor. Prüfen Sie die Auswahl – oder überspringen Sie die Prüfung bewusst über den Haken im Abschnitt Voraussetzungen."
          : "Für Ihre Schule liegt noch keine Anmeldung zu einer DigiKI-Schulung vor. Bitte melden Sie zunächst Lehrkräfte über die KOS-Fortbildungen an – danach freuen wir uns über Ihren Antrag auf gezielte Unterstützung."
      );
      return;
    }

    if (!privacyConsent || !truthConsent) {
      setError("Bitte bestätigen Sie die Datenschutzerklärung und die Richtigkeit Ihrer Angaben.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const today = new Date().toISOString().slice(0, 10);
    const hasAttended = trainings.some((t) => t.start_date && t.start_date <= today);
    // Stellvertretend eingereichte Anträge deutlich kennzeichnen – der
    // Admin sieht in der Detailansicht sofort, wer ausgefüllt hat und ob
    // die Schulungsprüfung bewusst übersprungen wurde.
    const skippedCheck =
      actingForSchool && skipTrainingCheck && trainings.length === 0;
    const behalfPrefix = actingForSchool
      ? `[Stellvertretend ausgefüllt: ${behalfRoleLabel}] `
      : "";

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
        training_participation: skippedCheck
          ? "pruefung_uebersprungen"
          : hasAttended
            ? "teilgenommen"
            : "angemeldet",
        training_details: skippedCheck
          ? `${behalfPrefix}Schulungsprüfung bewusst übersprungen.`
          : `${behalfPrefix}${trainingsSnapshot(trainings)}`,
        internal_attempt: internalAttempt,
        support_area: supportArea,
        support_explanation: supportExplanation,
        scope_preset: scopePreset,
        start_date: startDate || null,
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
  const radioInput =
    "w-4 h-4 border-border text-accent focus:ring-accent-strong";
  const legendClass = "mb-3 text-sm font-medium text-text";

  if (isAdmin === null) return null;
  // Admins reichen keine EIGENEN neuen Anträge ein – im Stellvertreter-
  // Modus (Antrag FÜR eine Schule) ist das Einreichen aber ausdrücklich
  // erwünscht; Edit-Modus bleibt ebenfalls erlaubt.
  if (isAdmin === true && !editMode && !actingForSchool) return (
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
          message="Vielen Dank für Ihren Antrag. Wir prüfen, ob eine punktuelle Unterstützung möglich ist, und melden uns zeitnah bei Ihnen."
          submittedEmail={schoolInfo.email}
        />
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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

      {/* ════════ §1 SCHULE ════════ */}
      <FormSection
        index="01"
        eyebrow="Schule"
        title="Wer beantragt?"
        body={
          actingForSchool
            ? "Wählen Sie die Schule aus, für die Sie den Antrag stellvertretend ausfüllen. Die Schulungsprüfung läuft dann automatisch gegen diese Schule."
            : "Angaben zu Ihrer Schule und Kontaktdaten. Bereits aus Ihrer Bestandsaufnahme bekannte Werte werden automatisch übernommen."
        }
        icon={<Building2 className="h-3 w-3" />}
      >
        {actingForSchool && (
          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary-light/10 p-4">
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <UserCog className="h-4 w-4" />
            </span>
            <p className="text-sm leading-relaxed text-text">
              <strong className="font-bold">Stellvertreter-Modus:</strong> Sie
              füllen diesen Antrag als{" "}
              <strong className="font-semibold">{behalfRoleLabel}</strong> für
              eine Schule aus. Der Antrag wird entsprechend gekennzeichnet.
            </p>
          </div>
        )}

        {actingForSchool &&
          (selectedBehalfSchool ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <CheckCircle2
                  className="h-5 w-5 shrink-0 text-green-700"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-green-800">
                    Gewählte Schule
                  </p>
                  <p className="text-sm font-semibold text-green-900">
                    {selectedBehalfSchool.name}
                    {(selectedBehalfSchool.plz || selectedBehalfSchool.city) && (
                      <span className="ml-2 font-normal text-green-800">
                        {[selectedBehalfSchool.plz, selectedBehalfSchool.city]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetBehalfSchool}
                className="text-sm font-semibold text-green-800 underline underline-offset-2 hover:text-green-900"
              >
                Andere Schule wählen
              </button>
            </div>
          ) : (
            <div>
              <label
                htmlFor="behalf_school_search"
                className="mb-1.5 block text-sm font-medium text-text"
              >
                Schule auswählen *
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light"
                  aria-hidden="true"
                />
                <input
                  id="behalf_school_search"
                  type="text"
                  autoComplete="off"
                  value={behalfSearch}
                  onChange={(e) => setBehalfSearch(e.target.value)}
                  className={inputClass + " pl-11"}
                  placeholder="Schulname eingeben, z.B. Eversburg …"
                />
              </div>
              {behalfSchoolsLoading ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-text-light">
                  <RefreshCw
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                  Verifizierte Schulliste wird geladen …
                </p>
              ) : (
                <>
                  <ul className="mt-2 max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-white shadow-sm">
                    {behalfShown.map((s) => (
                      <li key={s.name}>
                        <button
                          type="button"
                          onClick={() => chooseBehalfSchool(s)}
                          className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-primary/5"
                        >
                          <span className="font-medium text-text">{s.name}</span>
                          {(s.plz || s.city) && (
                            <span className="mt-0.5 block text-xs text-text-light">
                              {[s.plz, s.city].filter(Boolean).join(" ")}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                    {behalfShown.length === 0 && (
                      <li className="px-4 py-3 text-sm text-text-light">
                        Keine Schule gefunden – prüfen Sie die Schreibweise.
                        Gelistet sind alle verifizierten Schulen aus dem
                        Schulungsdashboard.
                      </li>
                    )}
                  </ul>
                  {behalfMatches.length > behalfShown.length && (
                    <p className="mt-1.5 text-xs text-text-light">
                      {behalfShown.length} von {behalfMatches.length} Schulen
                      angezeigt – tippen Sie, um die Liste einzugrenzen.
                    </p>
                  )}
                </>
              )}
            </div>
          ))}

        {(!actingForSchool || selectedBehalfSchool) && (
          <SchoolInfoFields
            key={
              actingForSchool
                ? selectedBehalfSchool?.name ?? "keine-schule"
                : "eigenes-konto"
            }
            values={schoolInfo}
            onChange={handleSchoolInfoChange}
            inputClass={inputClass}
            lockedEmail={actingForSchool ? undefined : lockedEmail}
            lockedFromBestandsaufnahme={lockedFromBSA}
            prefilledFromApplication={prefilledFromApplication}
            hideSchoolName={actingForSchool}
            emailHint={
              actingForSchool
                ? "E-Mail-Adresse der Schule – an sie geht die Eingangsbestätigung."
                : undefined
            }
          />
        )}
      </FormSection>

      {/* ════════ §2 VORAUSSETZUNGEN ════════ */}
      <FormSection
        index="02"
        eyebrow="Voraussetzungen"
        title="Schulung & schulinterner Versuch"
        body="Studentische Unterstützung setzt auf den KOS-Fortbildungen auf: erst schulen, dann das Wissen im Kollegium weitergeben – und bei verbleibenden Hürden unterstützen wir gezielt. Ihre Schulungsanmeldungen werden automatisch erkannt."
        icon={<GraduationCap className="h-3 w-3" />}
      >
        {!editMode && actingForSchool && !selectedBehalfSchool && (
          <div className="rounded-xl border border-border bg-bg p-4 text-sm text-text-light">
            Bitte wählen Sie oben zuerst die Schule aus – ihre
            Schulungsanmeldungen werden dann automatisch geprüft.
          </div>
        )}

        {!editMode && actingForSchool && selectedBehalfSchool && behalfTrainingsLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-bg p-4 text-sm text-text-light">
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            Schulungsanmeldungen von {selectedBehalfSchool.name} werden geprüft …
          </div>
        )}

        {!editMode && trainingStatusKnown && trainings.length > 0 && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-green-700"
                aria-hidden="true"
              />
              <div className="text-sm text-green-900">
                <p className="font-bold">
                  {actingForSchool
                    ? "Die gewählte Schule ist zu folgenden Schulungen angemeldet:"
                    : "Ihre Schule ist zu folgenden Schulungen angemeldet:"}
                </p>
                <ul className="mt-2 space-y-1">
                  {trainings.map((t) => {
                    const counts = roleCounts(t);
                    return (
                      <li key={t.id}>
                        {t.title} –{" "}
                        {t.start_date
                          ? formatTrainingDate(t.start_date)
                          : "Termin folgt"}
                        {counts && (
                          <span className="text-green-800"> ({counts})</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-green-800">
                  Die Teilnehmenden geben ihr Wissen anschließend als
                  Multiplikatorinnen und Multiplikatoren im Kollegium weiter.
                </p>
              </div>
            </div>
          </div>
        )}

        {!editMode && trainingStatusKnown && trainings.length === 0 && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
                aria-hidden="true"
              />
              <div className="text-sm text-red-800">
                <p className="font-bold">
                  {actingForSchool
                    ? "Für die gewählte Schule liegt keine Anmeldung zu einer DigiKI-Schulung vor."
                    : "Für Ihre Schule liegt noch keine Anmeldung zu einer DigiKI-Schulung vor."}
                </p>
                {actingForSchool ? (
                  <p className="mt-1 leading-relaxed">
                    Prüfen Sie, ob die richtige Schule gewählt ist. Als{" "}
                    {behalfRoleLabel} können Sie die Prüfung unten bewusst
                    überspringen – der Antrag wird dann entsprechend
                    gekennzeichnet.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 leading-relaxed">
                      Die KOS-Fortbildungen sind die Voraussetzung für
                      studentische Unterstützung: Dort lernen Lehrkräfte Ihrer
                      Schule den Umgang mit den KI-Tools und geben ihr Wissen
                      anschließend im Kollegium weiter. Bitte melden Sie
                      zunächst Lehrkräfte an – danach freuen wir uns über Ihren
                      Antrag.
                    </p>
                    <Link
                      href="/fuer-schulen#kos-fortbildungen"
                      className="mt-2 inline-flex items-center gap-1.5 font-semibold text-red-800 underline hover:text-red-900"
                    >
                      Zu den KOS-Fortbildungsterminen
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <p className="mt-2 text-red-700">
                      Ihre Schule ist bereits angemeldet, wird hier aber nicht
                      angezeigt? Melden Sie sich kurz über das{" "}
                      <Link
                        href="/fuer-schulen#kontakt"
                        className="underline hover:text-red-900"
                      >
                        Kontaktformular
                      </Link>{" "}
                      – wir prüfen das.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Nur Stellvertreter-Modus: Prüfung bewusst überspringen. Schul-
            Konten sehen diesen Haken nie – für sie bleibt die Schulung
            zwingende Voraussetzung. */}
        {!editMode &&
          actingForSchool &&
          trainingStatusKnown &&
          trainings.length === 0 && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
              <input
                type="checkbox"
                checked={skipTrainingCheck}
                onChange={(e) => setSkipTrainingCheck(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-400 text-amber-700 focus:ring-amber-500"
              />
              <span className="text-[13px] leading-relaxed text-amber-900">
                <span className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  Schulungsprüfung überspringen und Antrag trotzdem einreichen
                </span>
                <span className="mt-0.5 block text-amber-800">
                  Nur für Schulungsteam und Admins. Der Antrag wird sichtbar als
                  „Schulungsprüfung übersprungen" gekennzeichnet.
                </span>
              </span>
            </label>
          )}

        {editMode && initialData?.training_details && (
          <div className="rounded-xl border border-border bg-bg p-4">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-text-light">
              Angemeldete Schulungen bei Antragstellung
            </p>
            <p className="text-sm text-text whitespace-pre-wrap">
              {initialData.training_details}
            </p>
          </div>
        )}

        <div>
          <label
            htmlFor="internal_attempt"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Was haben Sie bereits schulintern versucht? *
          </label>
          <textarea
            id="internal_attempt"
            rows={3}
            required
            value={internalAttempt}
            onChange={(e) => setInternalAttempt(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="z.B. geschulte Kolleginnen/Kollegen gefragt, gemeinsam ausprobiert, Anleitung des Anbieters durchgegangen …"
          />
        </div>
      </FormSection>

      {/* ════════ §3 KONKRETE HÜRDE ════════ */}
      <FormSection
        index="03"
        eyebrow="Ihr Anliegen"
        title="Wo genau hakt es?"
        body="Beschreiben Sie die eine konkrete Hürde, die sich schulintern nicht lösen ließ. Je klarer das Anliegen umrissen ist, desto besser können wir unterstützen."
        icon={<HelpingHand className="h-3 w-3" />}
      >
        <fieldset>
          <legend className={legendClass}>Um welchen Bereich geht es? *</legend>
          <div className="space-y-3">
            {SUPPORT_AREA_OPTIONS.map((option) => (
              <label key={option.value} className={checkboxLabel}>
                <input
                  type="radio"
                  name="support_area"
                  value={option.value}
                  required
                  checked={supportArea === option.value}
                  onChange={() => setSupportArea(option.value)}
                  className={radioInput}
                />
                <span className="text-sm text-text">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label
            htmlFor="support_explanation"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Beschreiben Sie die konkrete Hürde *
          </label>
          <textarea
            id="support_explanation"
            rows={4}
            required
            value={supportExplanation}
            onChange={(e) => setSupportExplanation(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="Was genau funktioniert nicht bzw. wobei kommen Sie nicht weiter? Was soll am Ende erreicht sein?"
          />
        </div>
        <p className="text-xs leading-relaxed text-text-light">
          Gut zu wissen: Ersteinweisungen und Fortbildungsinhalte decken die
          KOS-Schulungen ab, und eine dauerhafte Begleitung im Unterricht können
          wir mit Blick auf die vielen teilnehmenden Schulen nicht anbieten – so
          bleibt gezielte Unterstützung für alle Schulen möglich.
        </p>
      </FormSection>

      {/* ════════ §4 UMFANG & TERMIN ════════ */}
      <FormSection
        index="04"
        eyebrow="Umfang"
        title="Wie viel Unterstützung brauchen Sie?"
        body="Studentische Unterstützung ist punktuell angelegt – in der Praxis reicht meist ein einzelner Termin. Wählen Sie den Umfang, der zu Ihrer Hürde passt."
        icon={<CalendarClock className="h-3 w-3" />}
      >
        <fieldset>
          <legend className={legendClass}>Gewünschter Umfang *</legend>
          <div className="space-y-3">
            {SCOPE_PRESET_OPTIONS.map((option) => (
              <label key={option.value} className={checkboxLabel}>
                <input
                  type="radio"
                  name="scope_preset"
                  value={option.value}
                  required
                  checked={scopePreset === option.value}
                  onChange={() => setScopePreset(option.value)}
                  className={radioInput}
                />
                <span className="text-sm text-text">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label
            htmlFor="start_date"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Frühester Wunschtermin (optional)
          </label>
          <input
            id="start_date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass + " max-w-[240px]"}
          />
        </div>
      </FormSection>

      {/* ════════ §5 EINWILLIGUNGEN ════════ */}
      {!editMode && (
        <FormSection
          index="05"
          eyebrow="Einwilligungen"
          title="Datenschutz bestätigen"
          body="Damit wir Ihren Antrag rechtssicher bearbeiten können, brauchen wir kurz Ihre Bestätigung."
          icon={<ShieldCheck className="h-3 w-3" />}
        >
          <div className="space-y-3">
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
          </div>
        </FormSection>
      )}

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
