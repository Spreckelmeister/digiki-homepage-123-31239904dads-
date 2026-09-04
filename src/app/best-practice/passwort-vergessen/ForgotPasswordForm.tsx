"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeOtpCode } from "@/lib/auth/verifySignInCode";
import CodeVerifyBox from "@/components/auth/CodeVerifyBox";

const NIBIS_PATTERN = /\.nibis\.de\s*$/i;

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const isNibis = useMemo(() => NIBIS_PATTERN.test(email.trim()), [email]);

  async function requestCode(): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await fetch("/api/auth/request-recovery-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // 429 = kürzlich schon angefordert → trotzdem zur Eingabe weiter.
      if (res.ok || res.status === 429) return { ok: true };
      if (res.status === 503) {
        return {
          ok: false,
          error:
            "Der Code-Versand ist im Moment leider nicht möglich. Bitte melden Sie sich über das Kontaktformular auf der Startseite.",
        };
      }
      return {
        ok: false,
        error: "Der Code konnte nicht angefordert werden. Bitte versuchen Sie es erneut.",
      };
    } catch {
      return { ok: false, error: "Netzwerkfehler. Bitte versuchen Sie es erneut." };
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    const result = await requestCode();
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // Immer weiter zur Code-Eingabe – ob ein Konto existiert, wird nicht verraten.
    setStep("code");
  }

  if (step === "code") {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-border">
        <h2 className="text-lg font-semibold text-primary mb-4">
          Code eingeben
        </h2>
        <CodeVerifyBox
          idPrefix="recovery"
          submitLabel="Weiter zum neuen Passwort"
          loadingLabel="Wird geprüft …"
          autoFocus
          startCooldownOnMount
          description={
            <>
              Falls ein Konto mit dieser Adresse existiert, haben wir einen
              8-stelligen Code an{" "}
              <strong className="text-text">{email}</strong> gesendet. Bitte
              prüfen Sie auch Ihren Spam-Ordner.
              {info && <span className="mt-1 block">{info}</span>}
            </>
          }
          onVerify={async (code) => {
            const supabase = createClient();
            const { error: verifyError } = await supabase.auth.verifyOtp({
              email: email.trim().toLowerCase(),
              token: normalizeOtpCode(code),
              type: "recovery",
            });
            if (!verifyError) {
              // Recovery-Session steht → neues Passwort festlegen.
              router.push("/best-practice/passwort-zuruecksetzen");
              return { ok: true };
            }
            const msg = verifyError.message.toLowerCase();
            if (msg.includes("expired")) {
              return {
                ok: false,
                error:
                  "Der Code ist abgelaufen. Bitte fordern Sie mit „Code erneut senden“ einen neuen an.",
              };
            }
            return {
              ok: false,
              error:
                "Der Code ist nicht korrekt oder wurde bereits verwendet. Bitte prüfen Sie Ihre Eingabe – es gilt immer der Code aus der neuesten E-Mail.",
            };
          }}
          onResend={requestCode}
        />
        <div className="mt-5 space-y-2 text-center text-sm text-text-light">
          <p>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError("");
                setInfo("");
              }}
              className="text-primary underline hover:text-primary/80"
            >
              Andere E-Mail-Adresse verwenden
            </button>
          </p>
          <p>
            <Link
              href="/best-practice/login"
              className="text-primary underline hover:text-primary/80"
            >
              Zurück zur Anmeldung
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border border-border">
      <p className="text-sm text-text-light mb-6">
        Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen 8-stelligen
        Code, mit dem Sie hier direkt ein neues Passwort festlegen können.
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
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
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors"
            placeholder="ihre.email@schule.de"
          />
          {isNibis && (
            <p className="mt-2 flex items-start gap-2 text-sm text-red-700" role="alert">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                An NIBIS-Adressen (<code className="font-mono text-xs">@*.nibis.de</code>) können aktuell
                keine Mails zugestellt werden. Bitte melden Sie sich für das Zurücksetzen des Passworts über das{" "}
                <a
                  href="/#kontakt"
                  className="underline hover:text-red-900"
                >
                  Kontaktformular
                </a>{" "}
                – nennen Sie dort am besten eine erreichbare Telefonnummer oder
                Ausweich-Adresse.
              </span>
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-text hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <Mail className="w-5 h-5" aria-hidden="true" />
          {loading ? "Wird gesendet..." : "Code anfordern"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-text-light">
        <Link
          href="/best-practice/login"
          className="text-primary underline hover:text-primary/80"
        >
          Zurück zur Anmeldung
        </Link>
      </div>
    </div>
  );
}
