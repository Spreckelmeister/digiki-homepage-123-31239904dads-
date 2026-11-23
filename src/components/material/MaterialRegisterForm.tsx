"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import InlineSignupConfirm from "@/components/forms/InlineSignupConfirm";
import { useHoneypot } from "@/components/forms/useHoneypot";

const ERRORS: Record<string, string> = {
  private_email:
    "Bitte verwenden Sie die dienstliche E-Mail-Adresse Ihrer Schule. Private Adressen (z. B. Gmail, GMX, Web.de) sind nicht zugelassen.",
  nibis_email:
    "An NIBIS-Adressen (@*.nibis.de) können aktuell keine Bestätigungsmails zugestellt werden. Bitte verwenden Sie eine andere dienstliche Adresse.",
  invalid_email: "Bitte geben Sie eine gültige E-Mail-Adresse an.",
  missing_field: "Bitte füllen Sie alle Felder aus.",
  consent_missing: "Bitte stimmen Sie der Datenschutzerklärung zu.",
  school_exists:
    "Für Ihre Schule gibt es bereits ein Konto. Bitte melden Sie sich damit an – je Schule ist ein Konto vorgesehen.",
  email_already_registered:
    "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich direkt an.",
  program_blocked:
    "Für diese Schule bzw. E-Mail-Adresse ist keine Registrierung möglich. Bei Fragen nutzen Sie bitte das Kontaktformular.",
  rate_limited: "Bitte warten Sie eine Minute und versuchen Sie es dann erneut.",
  mail_unavailable:
    "Die Registrierung ist im Moment nicht möglich. Bitte versuchen Sie es später erneut.",
  not_available:
    "Die Registrierung ist im Moment nicht möglich. Bitte versuchen Sie es später erneut.",
};

const inputClass =
  "w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors";
const labelClass = "block text-sm font-medium text-text mb-1.5";

export default function MaterialRegisterForm() {
  const [schoolName, setSchoolName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLoginLink, setShowLoginLink] = useState(false);
  const [done, setDone] = useState(false);
  const { isSpam, HoneypotField } = useHoneypot();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setShowLoginLink(false);
    setLoading(true);
    try {
      const res = await fetch("/api/register-schulungsmaterial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName,
          contactName,
          email,
          privacyConsent,
          website_url: isSpam ? "x" : "",
        }),
      });
      if (res.ok) {
        setDone(true);
        return;
      }
      const payload = await res.json().catch(() => ({}) as Record<string, unknown>);
      const code = typeof payload.error === "string" ? payload.error : "";
      setError(
        ERRORS[code] ??
          "Die Registrierung ist fehlgeschlagen. Bitte versuchen Sie es erneut."
      );
      setShowLoginLink(code === "school_exists" || code === "email_already_registered");
      if (typeof payload.focusId === "string") {
        document.getElementById(payload.focusId)?.focus();
      }
    } catch {
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-border">
        <h2 className="text-xl font-bold text-text mb-4">
          Zugang angelegt
        </h2>
        <InlineSignupConfirm
          email={email.trim().toLowerCase()}
          targetHref="/schulungsmaterial"
          targetLabel="Zum Schulungsmaterial"
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border border-border">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm"
          >
            {error}
            {showLoginLink && (
              <>
                {" "}
                <Link href="/best-practice/login" className="underline font-medium">
                  Zur Anmeldung
                </Link>
              </>
            )}
          </div>
        )}
        {HoneypotField}

        <div>
          <label htmlFor="schoolName" className={labelClass}>
            Name der Schule
          </label>
          <input
            id="schoolName"
            type="text"
            required
            maxLength={200}
            autoComplete="organization"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="contactName" className={labelClass}>
            Ansprechperson (Vor- und Nachname)
          </label>
          <input
            id="contactName"
            type="text"
            required
            maxLength={200}
            autoComplete="name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Dienstliche E-Mail-Adresse der Schule
          </label>
          <input
            id="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            placeholder="verwaltung@ihre-schule.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby="email-hint"
            className={inputClass}
          />
          <p id="email-hint" className="mt-1.5 text-xs text-text-light">
            Mit dieser Adresse melden Sie sich an. Private Adressen
            (z.&nbsp;B. Gmail, GMX, Web.de) sind nicht zugelassen. Je Schule
            ist ein Konto vorgesehen.
          </p>
        </div>

        <label className="flex items-start gap-3 text-sm text-text">
          <input
            type="checkbox"
            checked={privacyConsent}
            onChange={(e) => setPrivacyConsent(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-border"
          />
          <span>
            Ich habe die{" "}
            <Link
              href="/datenschutz"
              target="_blank"
              className="text-primary underline hover:text-primary/80"
            >
              Datenschutzerklärung
            </Link>{" "}
            gelesen und stimme der Verarbeitung meiner Angaben für den Zugang
            zum Schulungsmaterial zu.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <UserPlus className="w-4 h-4" aria-hidden="true" />
          {loading ? "Wird angelegt …" : "Zugang anlegen"}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-border text-center text-sm text-text-light space-y-2">
        <p>
          Schon ein Konto?{" "}
          <Link
            href="/best-practice/login?redirect=/schulungsmaterial"
            className="text-primary underline hover:text-primary/80"
          >
            Anmelden
          </Link>
        </p>
        <p>
          Ihre Schule möchte am Förderprogramm teilnehmen?{" "}
          <Link
            href="/bestandsaufnahme"
            className="text-primary underline hover:text-primary/80"
          >
            Bestandsaufnahme ausfüllen
          </Link>
        </p>
      </div>
    </div>
  );
}
