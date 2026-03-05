"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { VorlageData } from "@/lib/types";
import RatingScale from "./RatingScale";
import FormSuccess from "./FormSuccess";
import { useHoneypot } from "./useHoneypot";

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

export default function BestPracticeVorlageForm() {
  const { isSpam, HoneypotField } = useHoneypot();
  // 1. Allgemeine Angaben
  const [schoolName, setSchoolName] = useState("");
  const [location, setLocation] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [date, setDate] = useState("");

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
      setError(
        "Bitte wählen Sie eine Option zur Veröffentlichung aus."
      );
      return;
    }

    if (!ratingImplementation || !ratingStudents || !ratingRecommendation) {
      setError("Bitte füllen Sie alle drei Schnellbewertungen aus.");
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
      setError("Fehler beim Einreichen: " + insertError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  const inputClass =
    "w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors";

  if (success) {
    return (
      <FormSuccess
        title="Vielen Dank für Ihren Beitrag!"
        message="Ihre Best-Practice-Dokumentation wurde erfolgreich eingereicht. Unser Team prüft den Beitrag und veröffentlicht ihn in der Datenbank."
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
        Bitte füllen Sie diese Vorlage möglichst vollständig aus, damit andere
        Grundschulen von Ihren Erfahrungen profitieren können.
      </div>

      {/* 1. Allgemeine Angaben */}
      <fieldset>
        <legend className="text-lg font-semibold text-primary mb-4">
          1. Allgemeine Angaben
        </legend>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="bp_school_name"
                className="block text-sm font-medium text-text mb-1.5"
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
            <div>
              <label
                htmlFor="bp_location"
                className="block text-sm font-medium text-text mb-1.5"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="bp_contact"
                className="block text-sm font-medium text-text mb-1.5"
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
            <div>
              <label
                htmlFor="bp_email"
                className="block text-sm font-medium text-text mb-1.5"
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
          </div>
          <div className="max-w-[250px]">
            <label
              htmlFor="bp_date"
              className="block text-sm font-medium text-text mb-1.5"
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
        </div>
      </fieldset>

      {/* 2. Projekt auf einen Blick */}
      <fieldset>
        <legend className="text-lg font-semibold text-primary mb-4">
          2. Das Projekt auf einen Blick
        </legend>
        <p className="text-sm text-text-light mb-4">
          Kurze Zusammenfassung, damit andere sofort verstehen, worum es geht.
        </p>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="bp_title"
              className="block text-sm font-medium text-text mb-1.5"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="bp_subject"
                className="block text-sm font-medium text-text mb-1.5"
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
                className="block text-sm font-medium text-text mb-1.5"
              >
                Klasse
              </label>
              <select
                id="bp_grade"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className={inputClass + " bg-white"}
              >
                <option value="1-2">Klasse 1-2</option>
                <option value="3-4">Klasse 3-4</option>
                <option value="1-4">Klasse 1-4 (jahrgangsübergreifend)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="bp_timeframe"
                className="block text-sm font-medium text-text mb-1.5"
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
                className="block text-sm font-medium text-text mb-1.5"
              >
                Eingesetztes Tool *
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
        </div>
      </fieldset>

      {/* 3. Warum dieses Projekt? */}
      <fieldset>
        <legend className="text-lg font-semibold text-primary mb-4">
          3. Warum dieses Projekt?
        </legend>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="bp_ausgangslage"
              className="block text-sm font-medium text-text mb-1.5"
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
              placeholder="z.B. unterschiedliche Leseniveaus, wenig Motivation ..."
            />
          </div>
          <div>
            <label
              htmlFor="bp_ziel"
              className="block text-sm font-medium text-text mb-1.5"
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
              placeholder="z.B. individuelles Üben, Kinder motivieren, Lehrkraft entlasten ..."
            />
          </div>
        </div>
      </fieldset>

      {/* 4. Durchführung */}
      <fieldset>
        <legend className="text-lg font-semibold text-primary mb-4">
          4. So haben wir es gemacht
        </legend>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="bp_vorbereitung"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Vorbereitung – Was musste vorab organisiert werden?
            </label>
            <textarea
              id="bp_vorbereitung"
              rows={3}
              value={vorbereitung}
              onChange={(e) => setVorbereitung(e.target.value)}
              className={inputClass + " resize-y"}
              placeholder="Geräte, Zugänge, Regeln für die Kinder ..."
            />
          </div>
          <div>
            <label
              htmlFor="bp_ablauf"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Ablauf im Unterricht – Wie lief eine typische Stunde ab?
            </label>
            <textarea
              id="bp_ablauf"
              rows={4}
              value={ablauf}
              onChange={(e) => setAblauf(e.target.value)}
              className={inputClass + " resize-y"}
              placeholder="Beschreiben Sie eine typische Unterrichtsstunde mit dem Tool..."
            />
          </div>
        </div>
      </fieldset>

      {/* 5. Erfahrungen */}
      <fieldset>
        <legend className="text-lg font-semibold text-primary mb-4">
          5. Unsere Erfahrungen
        </legend>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="bp_positiv"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Das hat gut geklappt
            </label>
            <textarea
              id="bp_positiv"
              rows={3}
              value={erfahrungenPositiv}
              onChange={(e) => setErfahrungenPositiv(e.target.value)}
              className={inputClass + " resize-y"}
              placeholder="Positive Erfahrungen, Reaktionen der Kinder ..."
            />
          </div>
          <div>
            <label
              htmlFor="bp_negativ"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Das war schwierig
            </label>
            <textarea
              id="bp_negativ"
              rows={3}
              value={erfahrungenNegativ}
              onChange={(e) => setErfahrungenNegativ(e.target.value)}
              className={inputClass + " resize-y"}
              placeholder="Technik-Probleme, Kinder brauchten viel Hilfe ..."
            />
          </div>
          <div>
            <label
              htmlFor="bp_verbesserungen"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Das würden wir beim nächsten Mal anders machen
            </label>
            <textarea
              id="bp_verbesserungen"
              rows={3}
              value={verbesserungen}
              onChange={(e) => setVerbesserungen(e.target.value)}
              className={inputClass + " resize-y"}
              placeholder="Verbesserungsideen, Tipps ..."
            />
          </div>
        </div>
      </fieldset>

      {/* 6. Schnellbewertung */}
      <fieldset>
        <legend className="text-lg font-semibold text-primary mb-4">
          6. Schnellbewertung
        </legend>
        <p className="text-sm text-text-light mb-4">
          Einfach anklicken.
        </p>
        <div className="space-y-6">
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
        </div>
      </fieldset>

      {/* 7. Tipps */}
      <fieldset>
        <legend className="text-lg font-semibold text-primary mb-4">
          7. Tipps für andere Grundschulen
        </legend>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="bp_tipps"
              className="block text-sm font-medium text-text mb-1.5"
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
              className="block text-sm font-medium text-text mb-1.5"
            >
              Hilfreiche Links / Materialien (optional)
            </label>
            <textarea
              id="bp_links"
              rows={2}
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              className={inputClass + " resize-y"}
              placeholder="z.B. Links zu Erklärvideos, Arbeitsblättern, Anleitungen ..."
            />
          </div>
        </div>
      </fieldset>

      {/* 8. Einverständnis */}
      <fieldset>
        <legend className="text-lg font-semibold text-primary mb-4">
          8. Einverständnis zur Veröffentlichung
        </legend>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="consent"
              value="ja_alles"
              checked={consent === "ja_alles"}
              onChange={() => setConsent("ja_alles")}
              className="w-4 h-4 text-accent focus:ring-accent"
            />
            <span className="text-sm text-text">
              Ja, diese Best Practice darf veröffentlicht werden.
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="consent"
              value="ja_anonym"
              checked={consent === "ja_anonym"}
              onChange={() => setConsent("ja_anonym")}
              className="w-4 h-4 text-accent focus:ring-accent"
            />
            <span className="text-sm text-text">
              Ja, aber nur anonymisiert (ohne Schulname / Kontaktperson).
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="consent"
              value="nein"
              checked={consent === "nein"}
              onChange={() => setConsent("nein")}
              className="w-4 h-4 text-accent focus:ring-accent"
            />
            <span className="text-sm text-text">
              Nein, nur zur internen Nutzung.
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
          {loading ? "Wird eingereicht..." : "Best Practice einreichen"}
        </button>
        <p className="mt-3 text-xs text-text-light">
          Mit dem Absenden bestätigen Sie die Richtigkeit Ihrer Angaben.
        </p>
      </div>
    </form>
  );
}
