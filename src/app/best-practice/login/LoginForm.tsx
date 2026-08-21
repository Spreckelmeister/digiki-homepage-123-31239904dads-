"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { verifySignInCode } from "@/lib/auth/verifySignInCode";
import CodeVerifyBox from "@/components/auth/CodeVerifyBox";

const CALLBACK_ERRORS: Record<string, string> = {
  "link-abgelaufen":
    "Der Link ist abgelaufen. Bitte melden Sie sich einfach per Code an – wir senden Ihnen dafür automatisch einen neuen.",
};

const CALLBACK_SUCCESS: Record<string, string> = {
  "confirmed": "Ihre E-Mail-Adresse wurde bestätigt. Sie können sich jetzt anmelden.",
};

const MODE_STORAGE_KEY = "digiki:login-mode";

type Mode = "otp" | "password";
type Step = "email" | "code";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/best-practice/datenbank";
  // Prevent open redirect: only allow relative paths starting with /
  const redirectTo =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/best-practice/datenbank";

  const callbackError = searchParams.get("error") ?? "";
  const callbackErrorMsg = CALLBACK_ERRORS[callbackError] ?? "";
  const callbackSuccessMsg = CALLBACK_SUCCESS[searchParams.get("confirmed") ? "confirmed" : ""] ?? "";

  const [mode, setMode] = useState<Mode>("otp");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  // true = beim Wechsel zu Schritt 2 wurde gerade ein Code verschickt
  const [codeSent, setCodeSent] = useState(false);
  // Passwort-Login scheiterte an unbestätigter E-Mail → Code-Weg anbieten
  const [notConfirmed, setNotConfirmed] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  // Zuletzt genutzten Anmeldeweg wiederherstellen (z.B. Admins → Passwort).
  useEffect(() => {
    try {
      if (localStorage.getItem(MODE_STORAGE_KEY) === "password") {
        setMode("password");
      }
    } catch {
      /* localStorage nicht verfügbar – Standard bleibt Code */
    }
  }, []);

  useEffect(() => {
    if (step === "email") emailInputRef.current?.focus();
  }, [step, mode]);

  /** Gemeinsamer Abschluss beider Anmeldewege (Rollen-Redirect). */
  async function finishLogin(user: User | null) {
    try {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
      /* ignorieren */
    }

    // Schulungsteam-Mitglieder landen direkt im Schulungs-Dashboard – nicht in
    // der Best-Practice-Datenbank (auf die sie keinen Zugriff haben). Schlägt
    // die Rollen-Abfrage fehl, fängt die Middleware das Confinement ohnehin ab.
    let target = redirectTo;
    if (user) {
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role?.toLowerCase() === "schulungsteam") {
        target = "/schulungsdashboard";
      }
    }

    router.push(target);
    router.refresh();
  }

  /** Fordert einen Anmeldecode an; steuert Schritt-/Modus-Wechsel selbst. */
  async function requestLoginCode(): Promise<boolean> {
    try {
      const res = await fetch("/api/auth/request-login-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setCodeSent(true);
        setStep("code");
        return true;
      }
      if (res.status === 429) {
        // Kürzlich schon angefordert → trotzdem zur Eingabe, Postfach prüfen.
        setCodeSent(true);
        setStep("code");
        setInfo(
          "Ein Code wurde bereits angefordert. Bitte prüfen Sie Ihr Postfach (auch den Spam-Ordner)."
        );
        return true;
      }
      if (res.status === 503) {
        setMode("password");
        setInfo(
          "Der Code-Versand ist im Moment leider nicht möglich. Bitte melden Sie sich mit Ihrem Passwort an."
        );
        return false;
      }
      setError("Der Code konnte nicht angefordert werden. Bitte versuchen Sie es erneut.");
      return false;
    } catch {
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      return false;
    }
  }

  async function handleOtpRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    await requestLoginCode();
    setLoading(false);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setNotConfirmed(false);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("not confirmed")) {
        // Selbstheilung: Code-Login bestätigt die Adresse automatisch.
        setNotConfirmed(true);
        setInfo(
          "Ihre E-Mail-Adresse ist noch nicht bestätigt. Kein Problem: Melden Sie sich einfach per Code an – damit wird Ihre Adresse automatisch bestätigt."
        );
      } else {
        setError(
          error.message === "Invalid login credentials"
            ? "E-Mail oder Passwort ist falsch."
            : "Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut."
        );
      }
      setLoading(false);
      return;
    }

    await finishLogin(data.user ?? null);
  }

  async function handleRequestCodeFromPasswordMode() {
    setError("");
    setInfo("");
    setLoading(true);
    setMode("otp");
    await requestLoginCode();
    setLoading(false);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStep("email");
    setError("");
    setInfo("");
    setNotConfirmed(false);
  }

  const inputClass =
    "w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors";

  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border border-border">
      {callbackSuccessMsg && (
        <div className="mb-5 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          {callbackSuccessMsg}
        </div>
      )}
      {callbackErrorMsg && (
        <div role="alert" className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {callbackErrorMsg}
        </div>
      )}

      {step === "code" ? (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-primary">
            Code eingeben
          </h2>
          <CodeVerifyBox
            idPrefix="login"
            submitLabel="Anmelden"
            loadingLabel="Wird geprüft …"
            autoFocus
            startCooldownOnMount={codeSent}
            description={
              codeSent ? (
                <>
                  Wir haben einen 8-stelligen Code an{" "}
                  <strong className="text-text">{email}</strong> gesendet.
                  Bitte prüfen Sie auch Ihren Spam-Ordner.
                  {info && <span className="mt-1 block">{info}</span>}
                </>
              ) : (
                <>
                  Geben Sie den 8-stelligen Code aus Ihrer DigiKI-E-Mail für{" "}
                  <strong className="text-text">{email}</strong> ein.
                </>
              )
            }
            onVerify={async (code) => {
              const supabase = createClient();
              const result = await verifySignInCode(supabase, email, code);
              if (result.ok) {
                await finishLogin(result.user);
                return { ok: true };
              }
              if (result.kind === "expired") {
                return {
                  ok: false,
                  error:
                    "Der Code ist abgelaufen. Bitte fordern Sie mit „Code erneut senden“ einen neuen an.",
                };
              }
              if (result.kind === "invalid") {
                return {
                  ok: false,
                  error:
                    "Der Code ist nicht korrekt oder wurde bereits verwendet. Es gilt immer der Code aus der neuesten E-Mail.",
                };
              }
              return {
                ok: false,
                error:
                  "Die Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
              };
            }}
            onResend={async () => {
              try {
                const res = await fetch("/api/auth/request-login-code", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
                });
                if (res.ok || res.status === 429) return { ok: true };
                return {
                  ok: false,
                  error:
                    "Der Code konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
                };
              } catch {
                return { ok: false, error: "Netzwerkfehler. Bitte versuchen Sie es erneut." };
              }
            }}
          />
          <p className="text-center text-sm text-text-light">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCodeSent(false);
                setError("");
                setInfo("");
              }}
              className="text-primary underline hover:text-primary/80"
            >
              Andere E-Mail-Adresse verwenden
            </button>
          </p>
        </div>
      ) : mode === "otp" ? (
        <form onSubmit={handleOtpRequestSubmit} className="space-y-5">
          <p className="text-sm text-text-light leading-relaxed">
            Melden Sie sich mit Ihrer E-Mail-Adresse an. Wir senden Ihnen einen
            8-stelligen Anmeldecode – ganz ohne Passwort.
          </p>

          {info && (
            <div role="status" className="bg-primary/5 border border-primary/20 text-text rounded-lg p-3 text-sm">
              {info}
            </div>
          )}
          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text mb-1.5"
            >
              E-Mail-Adresse
            </label>
            <input
              ref={emailInputRef}
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="ihre.email@schule.de"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-text hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            <Mail className="w-5 h-5" aria-hidden="true" />
            {loading ? "Code wird gesendet …" : "Weiter"}
          </button>

          <div className="space-y-2 text-center text-sm text-text-light">
            <p>
              <button
                type="button"
                onClick={() => switchMode("password")}
                className="inline-flex items-center gap-1.5 text-primary underline hover:text-primary/80"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                Mit Passwort anmelden
              </button>
            </p>
            <p>
              Sie haben bereits einen Code per E-Mail?{" "}
              <button
                type="button"
                onClick={() => {
                  if (!emailInputRef.current?.reportValidity()) return;
                  setError("");
                  setInfo("");
                  setCodeSent(false);
                  setStep("code");
                }}
                className="text-primary underline hover:text-primary/80"
              >
                Code eingeben
              </button>
            </p>
          </div>
        </form>
      ) : (
        <form onSubmit={handlePasswordSubmit} className="space-y-5">
          {info && (
            <div role="status" className="bg-primary/5 border border-primary/20 text-text rounded-lg p-3 text-sm">
              {info}
              {notConfirmed && (
                <button
                  type="button"
                  onClick={handleRequestCodeFromPasswordMode}
                  disabled={loading}
                  className="mt-2 inline-flex items-center gap-1.5 font-semibold text-primary underline hover:text-primary/80 disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" aria-hidden="true" />
                  Anmeldecode anfordern
                </button>
              )}
            </div>
          )}
          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text mb-1.5"
            >
              E-Mail-Adresse
            </label>
            <input
              ref={emailInputRef}
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="ihre.email@schule.de"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Passwort
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass + " pr-12"}
                placeholder="Ihr Passwort"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-text-light hover:text-primary transition-colors"
              >
                {showPassword
                  ? <EyeOff className="w-5 h-5" aria-hidden="true" />
                  : <Eye className="w-5 h-5" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-text hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            <LogIn className="w-5 h-5" aria-hidden="true" />
            {loading ? "Wird angemeldet..." : "Anmelden"}
          </button>

          <div className="space-y-2 text-center text-sm text-text-light">
            <p>
              <Link
                href="/best-practice/passwort-vergessen"
                className="text-primary underline hover:text-primary/80"
              >
                Passwort vergessen?
              </Link>
            </p>
            <p>
              <button
                type="button"
                onClick={() => switchMode("otp")}
                className="inline-flex items-center gap-1.5 text-primary underline hover:text-primary/80"
              >
                <KeyRound className="w-4 h-4" aria-hidden="true" />
                Ohne Passwort anmelden (Code per E-Mail)
              </button>
            </p>
          </div>
        </form>
      )}

      <div className="mt-6 pt-4 border-t border-border text-center text-sm text-text-light">
        <p>
          Noch kein Konto?{" "}
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
