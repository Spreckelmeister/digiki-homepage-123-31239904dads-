"use client";

import { useEffect, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import {
  OTP_CODE_PATTERN,
  normalizeOtpCode,
} from "@/lib/auth/verifySignInCode";

/**
 * Wiederverwendbare Inline-Code-Eingabe („Code statt Link").
 *
 * Bewusst KEIN <form>-Element: Die Box wird u.a. innerhalb bestehender
 * Formulare gerendert (z.B. Konto-Seite) – verschachtelte Formulare sind
 * ungültiges HTML. Enter im Eingabefeld löst die Prüfung trotzdem aus.
 */
interface CodeVerifyBoxProps {
  /** Eindeutiger Präfix für die Input-IDs (pro Einbauort verschieden). */
  idPrefix: string;
  label?: string;
  submitLabel: string;
  loadingLabel: string;
  /** Prüft den Code; bei ok übernimmt der Aufrufer die Weiterleitung. */
  onVerify: (
    code: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Fordert einen neuen Code an (weglassen = kein Resend-Button). */
  onResend?: () => Promise<{ ok: true } | { ok: false; error: string }>;
  resendCooldownS?: number;
  /** Countdown direkt beim Einblenden starten (Code wurde gerade gesendet). */
  startCooldownOnMount?: boolean;
  autoFocus?: boolean;
  /** Roter Bestätigen-Button (Konto-Löschung). */
  destructive?: boolean;
  /** Beschreibung/Status oberhalb des Eingabefelds. */
  description?: React.ReactNode;
}

export default function CodeVerifyBox({
  idPrefix,
  label = "8-stelliger Code",
  submitLabel,
  loadingLabel,
  onVerify,
  onResend,
  resendCooldownS = 60,
  startCooldownOnMount = false,
  autoFocus = false,
  destructive = false,
  description,
}: CodeVerifyBoxProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldownLeft, setCooldownLeft] = useState(
    startCooldownOnMount ? resendCooldownS : 0
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = setInterval(() => {
      setCooldownLeft((s) => (s > 1 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownLeft]);

  async function handleVerify() {
    if (loading) return;
    setError("");
    setInfo("");

    const clean = normalizeOtpCode(code);
    if (!OTP_CODE_PATTERN.test(clean)) {
      setError("Bitte geben Sie den 8-stelligen Code aus der E-Mail ein.");
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    const result = await onVerify(clean);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      inputRef.current?.focus();
      return;
    }
    // Erfolg: Aufrufer leitet weiter; Button bleibt bis dahin deaktiviert.
  }

  async function handleResend() {
    if (!onResend || resending || cooldownLeft > 0) return;
    setError("");
    setInfo("");
    setResending(true);
    const result = await onResend();
    setResending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCode("");
    setCooldownLeft(resendCooldownS);
    setInfo(
      "Neuer Code gesendet. Es gilt immer der Code aus der neuesten E-Mail."
    );
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-4">
      {description && (
        <div
          role="status"
          aria-live="polite"
          className="text-sm text-text-light leading-relaxed"
        >
          {description}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {info && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {info}
        </div>
      )}

      <div>
        <label
          htmlFor={`${idPrefix}-code`}
          className="block text-sm font-medium text-text mb-1.5"
        >
          {label}
        </label>
        <input
          ref={inputRef}
          id={`${idPrefix}-code`}
          type="text"
          inputMode="text"
          maxLength={12}
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleVerify();
            }
          }}
          className="w-full rounded-lg border border-border px-4 py-3 text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors"
          placeholder="12345678"
        />
      </div>

      <button
        type="button"
        onClick={handleVerify}
        disabled={loading}
        className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-semibold transition-colors disabled:opacity-50 ${
          destructive
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-accent text-text hover:bg-accent-hover"
        }`}
      >
        <KeyRound className="w-5 h-5" aria-hidden="true" />
        {loading ? loadingLabel : submitLabel}
      </button>

      {onResend && (
        <p className="text-center text-sm text-text-light">
          Keine E-Mail erhalten?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldownLeft > 0}
            className="font-medium text-primary underline hover:text-primary/80 disabled:no-underline disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {resending
              ? "Wird gesendet …"
              : cooldownLeft > 0
                ? `Code erneut senden (${cooldownLeft} s)`
                : "Code erneut senden"}
          </button>
        </p>
      )}
    </div>
  );
}
