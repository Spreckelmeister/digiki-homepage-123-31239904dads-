"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// Bewusst eigenständige Bestätigungsseite: Der Token wird NUR beim
// echten Button-Klick eingelöst, niemals beim Laden der Seite. So
// können automatische Link-Scanner (Schul-/Firmennetzwerke), die die
// URL bloß per GET vorab aufrufen, den Einmal-Token nicht verbrauchen.

const VALID_TYPES: EmailOtpType[] = [
  "signup",
  "recovery",
  "email_change",
  "magiclink",
  "email",
];

const TYPE_LABELS: Partial<Record<EmailOtpType, string>> = {
  signup: "E-Mail-Adresse bestätigen",
  recovery: "Passwort zurücksetzen",
  email_change: "Neue E-Mail-Adresse bestätigen",
  magiclink: "Anmeldung bestätigen",
  email: "E-Mail-Adresse bestätigen",
};

const DEFAULT_NEXT: Partial<Record<EmailOtpType, string>> = {
  signup: "/best-practice/login?confirmed=true",
  recovery: "/best-practice/passwort-zuruecksetzen",
  email_change: "/best-practice/konto",
  magiclink: "/best-practice/datenbank",
  email: "/best-practice/datenbank",
};

/** Nur sichere, relative Pfade zulassen (kein Open-Redirect). */
function safeNext(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  try {
    const parsed = new URL(raw, "http://localhost");
    if (parsed.pathname.startsWith("/") && !parsed.pathname.startsWith("//")) {
      return parsed.pathname + parsed.search;
    }
  } catch {
    /* fällt durch zum Fallback */
  }
  return fallback;
}

export default function ConfirmForm() {
  const router = useRouter();
  const params = useSearchParams();

  const tokenHash = params.get("token_hash");
  const rawType = params.get("type");
  const type = useMemo<EmailOtpType | null>(
    () => (VALID_TYPES.includes(rawType as EmailOtpType) ? (rawType as EmailOtpType) : null),
    [rawType]
  );
  const next = useMemo(
    () => safeNext(params.get("next"), type ? DEFAULT_NEXT[type] ?? "/best-practice/datenbank" : "/best-practice/datenbank"),
    [params, type]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [done, setDone] = useState(false);
  // Schützt vor Doppel-Einlösung: Ein zweiter (schneller) Klick würde sonst den
  // bereits verbrauchten Einmal-Token erneut prüfen → „ungültig".
  const submittingRef = useRef(false);

  const linkBroken = !tokenHash || !type;

  async function handleConfirm() {
    if (linkBroken || loading || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");
    setErrorDetail("");

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash!,
      type: type!,
    });

    if (verifyError) {
      const msg = verifyError.message.toLowerCase();
      if (msg.includes("expired") || msg.includes("invalid") || msg.includes("not found")) {
        setError(
          "Dieser Bestätigungslink ist nicht mehr gültig. Bitte fordern Sie einen neuen an – oder nutzen Sie den 8-stelligen Code aus der E-Mail."
        );
      } else {
        setError("Die Bestätigung ist fehlgeschlagen. Bitte versuchen Sie es erneut.");
      }
      // Technische Original-Meldung von Supabase – hilft beim Support/Debugging.
      setErrorDetail(`${verifyError.message} (Typ: ${type})`);
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    setDone(true);
    // Kurze Erfolgsmeldung, dann weiter zum Ziel.
    setTimeout(() => router.push(next), 1000);
  }

  if (done) {
    return (
      <div
        className="rounded-xl border border-border bg-white p-8 text-center shadow-sm"
        role="status"
        aria-live="polite"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-7 w-7 text-green-600" aria-hidden="true" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-primary">Bestätigt</h2>
        <p className="text-sm text-text-light">
          Sie werden in einem Moment weitergeleitet …
        </p>
      </div>
    );
  }

  if (linkBroken) {
    return (
      <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Dieser Link ist unvollständig oder ungültig. Bitte öffnen Sie den
          Link direkt aus der E-Mail – oder geben Sie den 8-stelligen Code
          manuell ein.
        </div>
        <Link
          href="/best-practice/code-einloesen"
          className="mt-4 inline-block text-sm font-medium text-primary underline hover:text-primary/80"
        >
          Zur Code-Eingabe
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>
      <h2 className="text-center text-lg font-semibold text-primary">
        {TYPE_LABELS[type!] ?? "Bestätigen"}
      </h2>
      <p className="mt-2 text-center text-sm leading-relaxed text-text-light">
        Aus Sicherheitsgründen schließen Sie den Vorgang bitte mit einem Klick
        ab. So bleibt Ihr Bestätigungscode auch in Schul- und Firmennetzwerken
        gültig.
      </p>

      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          {errorDetail && (
            <span className="mt-2 block text-xs text-red-500/80">
              Technischer Hinweis: {errorDetail}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={loading}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-text transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        {loading ? "Wird bestätigt …" : "Jetzt bestätigen"}
      </button>

      <p className="mt-5 text-center text-sm text-text-light">
        Funktioniert das nicht?{" "}
        <Link
          href={`/best-practice/code-einloesen${type === "recovery" ? "?type=recovery" : type === "email_change" ? "?type=email_change" : "?type=signup"}`}
          className="font-medium text-primary underline hover:text-primary/80"
        >
          8-stelligen Code eingeben
        </Link>
      </p>
    </div>
  );
}
