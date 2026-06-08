"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarRange,
  CheckCheck,
  HeartHandshake,
  Info,
  Lightbulb,
  ListChecks,
  Send,
  Sparkles,
  Star,
  Target,
  Wrench,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { VorlageData } from "@/lib/types";
import RatingScale from "./RatingScale";
import FormSuccess from "./FormSuccess";
import FormSection from "./FormSection";
import LockedFieldDisplay from "./LockedFieldDisplay";
import { useHoneypot } from "./useHoneypot";
import { useIsAdmin } from "@/lib/useIsAdmin";

const RATING_IMPLEMENTATION = [
  "Sehr einfach – sofort einsetzbar",
  "Einfach – wenig Vorbereitung",
  "Mittel – etwas Einarbeitung nötig",
  "Aufwendig – viel Vorbereitung nötig",
];

const RATING_STUDENTS = [
  "Super – schnell selbstständig",
  "Gut – nach kurzer Einführung",
  "Okay – manche brauchten viel Hilfe",
  "Schwierig – überforderte viele",
];

const RATING_RECOMMENDATION = [
  "Ja, uneingeschränkt",
  "Ja, mit Einschränkungen",
  "Eher nicht",
  "Nein",
];

interface BestPracticePrefill {
  school_name?: string;
  contact_person?: string;
}

export default function BestPracticeVorlageForm({
  lockedEmail,
  prefillFromBSA,
  lockedFromBSA,
}: {
  lockedEmail?: string;
  prefillFromBSA?: BestPracticePrefill | null;
  lockedFromBSA?: string[];
} = {}) {
  const isAdmin = useIsAdmin();
  const { isSpam, HoneypotField } = useHoneypot();

  // 1. Kontext
  const [schoolName, setSchoolName] = useState(
    prefillFromBSA?.school_name ?? "",
  );
  const [location, setLocation] = useState("");
  const [contactPerson, setContactPerson] = useState(
    prefillFromBSA?.contact_person ?? "",
  );
  const [contactEmail, setContactEmail] = useState(lockedEmail ?? "");
  const [date, setDate] = useState("");
  const isEmailLocked = Boolean(lockedEmail);
  const lockedFields = new Set(lockedFromBSA ?? []);
  // Lock nur anzeigen, wenn das Feld wirklich einen Wert hat – sonst
  // fallback auf editierbares Input, damit der Nutzer nicht festhängt.
  const isSchoolNameLocked =
    lockedFields.has("school_name") && schoolName.trim().length > 0;
  const isContactPersonLocked =
    lockedFields.has("contact_person") && contactPerson.trim().length > 0;
  const anyBSALocked = isSchoolNameLocked || isContactPersonLocked;

  // 2. Projekt auf einen Blick
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("1-4");
  const [timeframe, setTimeframe] = useState("");
  const [toolUsed, setToolUsed] = useState("");

  // 3. Warum dieses Projekt?
  const [ausgangslage, setAusgangslage] = useState("");
  const [ziel, setZiel] = useState("");

  // 4. Durchführung
  const [vorbereitung, setVorbereitung] = useState("");
  const [ablauf, setAblauf] = useState("");

  // 5. Erfahrungen
  const [erfahrungenPositiv, setErfahrungenPositiv] = useState("");
  const [erfahrungenNegativ, setErfahrungenNegativ] = useState("");
  const [verbesserungen, setVerbesserungen] = useState("");

  // 6. Schnellbewertung
  const [ratingImplementation, setRatingImplementation] = useState(0);
  const [ratingStudents, setRatingStudents] = useState(0);
  const [ratingRecommendation, setRatingRecommendation] = useState(0);

  // 7. Tipps
  const [tipps, setTipps] = useState("");
  const [links, setLinks] = useState("");

  // 8. Einverständnis
  const [consent, setConsent] = useState<
    "ja_alles" | "ja_anonym" | "nein" | ""
  >("");

  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [truthConsent, setTruthConsent] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function buildMarkdownContent(): string {
    const sections: string[] = [];

    if (vorbereitung) {
      sections.push(`## Vorbereitung\n\n${vorbereitung}`);
    }
    if (ablauf) {
      sections.push(`## Ablauf im Unterricht\n\n${ablauf}`);
    }
    if (erfahrungenPositiv || erfahrungenNegativ || verbesserungen) {
      let exp = "## Erfahrungen\n";
      if (erfahrungenPositiv)
        exp += `\n### Das hat gut geklappt\n\n${erfahrungenPositiv}\n`;
      if (erfahrungenNegativ)
        exp += `\n### Das war schwierig\n\n${erfahrungenNegativ}\n`;
      if (verbesserungen)
        exp += `\n### Das würden wir anders machen\n\n${verbesserungen}\n`;
      sections.push(exp);
    }
    if (ratingImplementation || ratingStudents || ratingRecommendation) {
      let ratings = "## Bewertung\n\n";
      if (ratingImplementation)
        ratings += `- **Umsetzung:** ${RATING_IMPLEMENTATION[ratingImplementation - 1]}\n`;
      if (ratingStudents)
        ratings += `- **Akzeptanz bei Kindern:** ${RATING_STUDENTS[ratingStudents - 1]}\n`;
      if (ratingRecommendation)
        ratings += `- **Weiterempfehlung:** ${RATING_RECOMMENDATION[ratingRecommendation - 1]}\n`;
      sections.push(ratings);
    }
    if (tipps) {
      sections.push(`## Tipps für andere Grundschulen\n\n${tipps}`);
    }
    if (links) {
      sections.push(`## Hilfreiche Links & Materialien\n\n${links}`);
    }

    return sections.join("\n\n");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isSpam) {
      setSuccess(true);
      return;
    }
    if (!consent) {
      setError("Bitte wählen Sie eine Option zur Veröffentlichung aus.");
      return;
    }
    if (!ratingImplementation || !ratingStudents || !ratingRecommendation) {
      setError("Bitte füllen Sie alle drei Schnellbewertungen aus.");
      return;
    }
    if (!privacyConsent || !truthConsent) {
      setError(
        "Bitte bestätigen Sie die Datenschutzerklärung und die Richtigkeit Ihrer Angaben.",
      );
      return;
    }

    setLoading(true);

    const vorlageData: VorlageData = {
      location,
      date,
      timeframe,
      ausgangslage,
      ziel,
      vorbereitung,
      ablauf,
      erfahrungen_positiv: erfahrungenPositiv,
      erfahrungen_negativ: erfahrungenNegativ,
      verbesserungen,
      rating_implementation: ratingImplementation,
      rating_student_adaptation: ratingStudents,
      rating_recommendation: ratingRecommendation,
      tipps,
      links,
      publication_consent: consent as VorlageData["publication_consent"],
    };

    const summary = [
      ausgangslage ? `**Ausgangslage:** ${ausgangslage}` : "",
      ziel ? `**Ziel:** ${ziel}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const content = buildMarkdownContent();
    const supabase = createClient();

    const { error: insertError } = await supabase
      .from("best_practices")
      .insert({
        title,
        school_name: schoolName,
        subject,
        grade_level: gradeLevel,
        tools_used: toolUsed
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        summary: summary || title,
        content,
        published: false,
        author_id: null,
        contact_person: contactPerson,
        contact_email: contactEmail,
        vorlage_data: vorlageData,
      });

    if (insertError) {
      console.error("Insert error:", insertError.message);
      setError(
        "Beim Einreichen ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-white px-4 py-3 text-sm outline-none transition-all focus:border-accent-strong focus:ring-2 focus:ring-accent-strong placeholder:text-text-light/55";

  if (isAdmin === null) return null;
  if (isAdmin === true)
    return (
      <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-6 py-8 text-center text-sm text-yellow-800">
        Admin-Accounts können keine Einreichungen vornehmen.
      </div>
    );

  if (success) {
    return (
      <FormSuccess
        title="Vielen Dank für Ihren Beitrag!"
        message="Ihre Best-Practice-Dokumentation wurde erfolgreich eingereicht. Unser Team prüft den Beitrag und veröffentlicht ihn in der Datenbank."
        submittedEmail={contactEmail}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {HoneypotField}

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
            <p className="font-bold">Beitrag konnte nicht eingereicht werden</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Intro-Karte – Onboarding mit Editorial-Stil */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-white p-6 shadow-sm md:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary-light/15 blur-3xl"
        />
        <div className="relative flex items-start gap-5">
          <span
            aria-hidden="true"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
          >
            <Sparkles className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-accent-strong">
              In etwa 15 Minuten
            </p>
            <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-text-light">
              Erzählen Sie kurz und konkret, was bei Ihnen gut funktioniert hat
              – andere Schulen profitieren direkt davon. Pflichtfelder sind mit
              * markiert; alles andere ist optional.
            </p>
          </div>
        </div>
      </div>

      {/* ════════ §1 KONTEXT ════════ */}
      <FormSection
        index="01"
        eyebrow="Kontext"
        title="Wer reicht den Beitrag ein?"
        body="Diese Angaben helfen uns, Ihren Beitrag richtig zuzuordnen. Schule und Ansprechperson übernehmen wir – sofern vorhanden – automatisch aus Ihrer Bestandsaufnahme."
        icon={<Info className="h-3 w-3" />}
      >
        {anyBSALocked && (
          <div className="flex items-start gap-4 rounded-xl border border-primary-light/30 bg-primary-light/5 p-5">
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <Info className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                Aus Ihrer Bestandsaufnahme übernommen
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-text-light">
                Felder mit „Aus Bestandsaufnahme" sind gesperrt, damit Ihre
                Angaben über alle Einreichungen konsistent bleiben. Änderungen
                können Sie jederzeit selbst in Ihrer{" "}
                <Link
                  href="/best-practice/meine-bestandsaufnahme/bearbeiten"
                  className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Bestandsaufnahme aktualisieren
                </Link>
                &nbsp;– von dort werden die Werte hier automatisch übernommen.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {isSchoolNameLocked ? (
            <LockedFieldDisplay
              htmlFor="bp_school_name"
              label="Schulname *"
              value={schoolName}
              source="bestandsaufnahme"
            />
          ) : (
            <div>
              <label
                htmlFor="bp_school_name"
                className="mb-1.5 block text-sm font-medium text-text"
              >
                Schulname *
              </label>
              <input
                id="bp_school_name"
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className={inputClass}
                placeholder="z.B. Grundschule Eversburg"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="bp_location"
              className="mb-1.5 block text-sm font-medium text-text"
            >
              Ort
            </label>
            <input
              id="bp_location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputClass}
              placeholder="z.B. Osnabrück"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {isContactPersonLocked ? (
            <LockedFieldDisplay
              htmlFor="bp_contact"
              label="Kontaktperson *"
              value={contactPerson}
              source="bestandsaufnahme"
            />
          ) : (
            <div>
              <label
                htmlFor="bp_contact"
                className="mb-1.5 block text-sm font-medium text-text"
              >
                Kontaktperson (Vor- und Nachname) *
              </label>
              <input
                id="bp_contact"
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          {isEmailLocked ? (
            <LockedFieldDisplay
              htmlFor="bp_email"
              label="E-Mail *"
              value={contactEmail}
              source="konto"
              mono
              hint={
                <>
                  Wird aus Ihrem Konto übernommen. Änderbar unter{" "}
                  <Link
                    href="/best-practice/konto"
                    className="underline underline-offset-2 hover:text-primary transition-colors"
                  >
                    Mein Konto
                  </Link>
                  .
                </>
              }
            />
          ) : (
            <div>
              <label
                htmlFor="bp_email"
                className="mb-1.5 block text-sm font-medium text-text"
              >
                E-Mail *
              </label>
              <input
                id="bp_email"
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={inputClass}
                placeholder="name@schule.de"
              />
            </div>
          )}
        </div>

        <div className="max-w-[250px]">
          <label
            htmlFor="bp_date"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Datum
          </label>
          <input
            id="bp_date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </FormSection>

      {/* ════════ §2 PROJEKT AUF EINEN BLICK ════════ */}
      <FormSection
        index="02"
        eyebrow="Projekt"
        title="Worum geht es?"
        body="Kurze Zusammenfassung, damit andere sofort verstehen, was Sie gemacht haben."
        icon={<Target className="h-3 w-3" />}
      >
        <div>
          <label
            htmlFor="bp_title"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Projekttitel *
          </label>
          <input
            id="bp_title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="z.B. Leseförderung mit KI-Vorlesehilfe"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="bp_subject"
              className="mb-1.5 block text-sm font-medium text-text"
            >
              Fach / Fächer *
            </label>
            <input
              id="bp_subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputClass}
              placeholder="z.B. Deutsch, Sachunterricht"
            />
          </div>
          <div>
            <label
              htmlFor="bp_grade"
              className="mb-1.5 block text-sm font-medium text-text"
            >
              Klasse
            </label>
            <div className="flex gap-1.5 rounded-lg border border-border bg-bg p-1">
              {[
                { value: "1-2", label: "1–2" },
                { value: "3-4", label: "3–4" },
                { value: "1-4", label: "alle" },
              ].map((g) => {
                const active = gradeLevel === g.value;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGradeLevel(g.value)}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-all ${
                      active
                        ? "bg-white text-primary shadow-sm"
                        : "text-text-light hover:text-primary"
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="bp_timeframe"
              className="mb-1.5 block text-sm font-medium text-text"
            >
              Zeitraum
            </label>
            <input
              id="bp_timeframe"
              type="text"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className={inputClass}
              placeholder="z.B. November 2025 – Januar 2026"
            />
          </div>
          <div>
            <label
              htmlFor="bp_tool"
              className="mb-1.5 block text-sm font-medium text-text"
            >
              <span className="inline-flex items-center gap-1.5">
                <Wrench
                  className="h-3.5 w-3.5 text-primary"
                  aria-hidden="true"
                />
                Eingesetztes Tool *
              </span>
            </label>
            <input
              id="bp_tool"
              type="text"
              required
              value={toolUsed}
              onChange={(e) => setToolUsed(e.target.value)}
              className={inputClass}
              placeholder="z.B. Antolin, Fiete.ai, Book Creator"
            />
          </div>
        </div>
      </FormSection>

      {/* ════════ §3 WARUM ════════ */}
      <FormSection
        index="03"
        eyebrow="Motivation"
        title="Warum dieses Projekt?"
        body="Was war die Ausgangssituation und welches Ziel hatten Sie sich gesteckt? Das hilft anderen Schulen einzuordnen, ob Ihr Ansatz auch für sie passt."
        icon={<Lightbulb className="h-3 w-3" />}
      >
        <div>
          <label
            htmlFor="bp_ausgangslage"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Ausgangslage – Was war die Herausforderung? *
          </label>
          <textarea
            id="bp_ausgangslage"
            required
            rows={3}
            value={ausgangslage}
            onChange={(e) => setAusgangslage(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="z.B. unterschiedliche Leseniveaus, wenig Motivation …"
          />
        </div>
        <div>
          <label
            htmlFor="bp_ziel"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Ziel – Was wollten Sie erreichen? *
          </label>
          <textarea
            id="bp_ziel"
            required
            rows={3}
            value={ziel}
            onChange={(e) => setZiel(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="z.B. individuelles Üben, Kinder motivieren, Lehrkraft entlasten …"
          />
        </div>
      </FormSection>

      {/* ════════ §4 DURCHFÜHRUNG ════════ */}
      <FormSection
        index="04"
        eyebrow="Durchführung"
        title="So haben wir es gemacht"
        body="Beschreiben Sie kurz, was vorab nötig war und wie eine typische Unterrichtsstunde aussah."
        icon={<CalendarRange className="h-3 w-3" />}
      >
        <div>
          <label
            htmlFor="bp_vorbereitung"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Vorbereitung – Was musste vorab organisiert werden?
          </label>
          <textarea
            id="bp_vorbereitung"
            rows={3}
            value={vorbereitung}
            onChange={(e) => setVorbereitung(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="Geräte, Zugänge, Regeln für die Kinder …"
          />
        </div>
        <div>
          <label
            htmlFor="bp_ablauf"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Ablauf im Unterricht – Wie lief eine typische Stunde ab?
          </label>
          <textarea
            id="bp_ablauf"
            rows={4}
            value={ablauf}
            onChange={(e) => setAblauf(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="Beschreiben Sie eine typische Unterrichtsstunde mit dem Tool …"
          />
        </div>
      </FormSection>

      {/* ════════ §5 ERFAHRUNGEN ════════ */}
      <FormSection
        index="05"
        eyebrow="Erfahrungen"
        title="Was haben wir gelernt?"
        body="Ehrlich und konkret – auch (und vor allem) das, was nicht so gut lief, ist für andere wertvoll."
        icon={<HeartHandshake className="h-3 w-3" />}
      >
        <div>
          <label
            htmlFor="bp_positiv"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Das hat gut geklappt
          </label>
          <textarea
            id="bp_positiv"
            rows={3}
            value={erfahrungenPositiv}
            onChange={(e) => setErfahrungenPositiv(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="Positive Erfahrungen, Reaktionen der Kinder …"
          />
        </div>
        <div>
          <label
            htmlFor="bp_negativ"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Das war schwierig
          </label>
          <textarea
            id="bp_negativ"
            rows={3}
            value={erfahrungenNegativ}
            onChange={(e) => setErfahrungenNegativ(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="Technik-Probleme, Kinder brauchten viel Hilfe …"
          />
        </div>
        <div>
          <label
            htmlFor="bp_verbesserungen"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Das würden wir beim nächsten Mal anders machen
          </label>
          <textarea
            id="bp_verbesserungen"
            rows={3}
            value={verbesserungen}
            onChange={(e) => setVerbesserungen(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="Verbesserungsideen, Tipps für die nächste Runde …"
          />
        </div>
      </FormSection>

      {/* ════════ §6 BEWERTUNG ════════ */}
      <FormSection
        index="06"
        eyebrow="Schnellbewertung"
        title="Wie war's unterm Strich?"
        body="Drei kurze Klick-Bewertungen – das macht Ihren Beitrag in der Datenbank sofort vergleichbar mit anderen."
        icon={<Star className="h-3 w-3" />}
      >
        <RatingScale
          label="Wie einfach war die Umsetzung?"
          options={RATING_IMPLEMENTATION}
          value={ratingImplementation}
          onChange={setRatingImplementation}
        />
        <RatingScale
          label="Wie kamen die Kinder damit zurecht?"
          options={RATING_STUDENTS}
          value={ratingStudents}
          onChange={setRatingStudents}
        />
        <RatingScale
          label="Würden Sie das Tool weiterempfehlen?"
          options={RATING_RECOMMENDATION}
          value={ratingRecommendation}
          onChange={setRatingRecommendation}
        />
      </FormSection>

      {/* ════════ §7 TIPPS ════════ */}
      <FormSection
        index="07"
        eyebrow="Tipps"
        title="Was geben Sie anderen mit?"
        body="Top-Tipps und nützliche Links sind für andere Grundschulen Gold wert."
        icon={<ListChecks className="h-3 w-3" />}
      >
        <div>
          <label
            htmlFor="bp_tipps"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Ihre Top-Tipps
          </label>
          <textarea
            id="bp_tipps"
            rows={4}
            value={tipps}
            onChange={(e) => setTipps(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="Was würden Sie anderen Grundschulen empfehlen?"
          />
        </div>
        <div>
          <label
            htmlFor="bp_links"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Hilfreiche Links / Materialien (optional)
          </label>
          <textarea
            id="bp_links"
            rows={2}
            value={links}
            onChange={(e) => setLinks(e.target.value)}
            className={inputClass + " resize-y"}
            placeholder="z.B. Links zu Erklärvideos, Arbeitsblättern, Anleitungen …"
          />
        </div>
      </FormSection>

      {/* ════════ §8 VERÖFFENTLICHUNG ════════ */}
      <FormSection
        index="08"
        eyebrow="Veröffentlichung"
        title="Wie soll's weitergehen?"
        body="Sie entscheiden, ob und wie wir Ihre Best Practice in der öffentlichen Datenbank zeigen dürfen."
        icon={<CheckCheck className="h-3 w-3" />}
      >
        <div className="space-y-2">
          {[
            {
              value: "ja_alles",
              title: "Ja, mit allen Angaben",
              hint: "Schulname und Kontaktperson dürfen veröffentlicht werden.",
            },
            {
              value: "ja_anonym",
              title: "Ja, aber anonymisiert",
              hint: "Ohne Schulname und Kontaktperson – nur der Inhalt wird gezeigt.",
            },
            {
              value: "nein",
              title: "Nur intern",
              hint: "Nicht in der öffentlichen Datenbank, nur fürs Projekt-Team.",
            },
          ].map((opt) => {
            const active = consent === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                  active
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-white hover:border-primary/30 hover:bg-bg"
                }`}
              >
                <input
                  type="radio"
                  name="consent"
                  value={opt.value}
                  checked={active}
                  onChange={() =>
                    setConsent(opt.value as "ja_alles" | "ja_anonym" | "nein")
                  }
                  className="mt-0.5 h-4 w-4 text-primary focus:ring-accent-strong"
                />
                <span>
                  <span className="block text-sm font-semibold text-text">
                    {opt.title}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-text-light">
                    {opt.hint}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={privacyConsent}
              onChange={(e) => setPrivacyConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent-strong"
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
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={truthConsent}
              onChange={(e) => setTruthConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent-strong"
            />
            <span className="text-sm text-text">
              Ich bestätige, dass alle gemachten Angaben der Wahrheit
              entsprechen. *
            </span>
          </label>
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
          {loading ? "Wird eingereicht …" : "Best Practice einreichen"}
        </button>
        <p className="text-xs text-text-light">* Pflichtfelder.</p>
      </div>
    </form>
  );
}
