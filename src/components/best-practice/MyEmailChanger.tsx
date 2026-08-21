"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeOtpCode } from "@/lib/auth/verifySignInCode";
import CodeVerifyBox from "@/components/auth/CodeVerifyBox";

// Modul-Level: einmal kompiliert, nicht pro Keystroke neu.
const NIBIS_PATTERN = /\.nibis\.de\s*$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  currentEmail: string;
}

/**
 * E-Mail-Änderung mit Inline-Code („Code statt Link"): Nach dem Absenden
 * verschickt Supabase eine Mail mit einem 8-stelligen Code an die neue
 * Adresse; der Code wird direkt hier eingegeben. Ist im Supabase-Dashboard
 * „Secure email change" aktiv, kommt zusätzlich ein Code an die bisherige
 * Adresse – auch dieser Fall wird hier abgedeckt (zwei Runden).
 */
export default function MyEmailChanger({ currentEmail }: Props) {
  const router = useRouter();
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"form" | "confirm" | "done">("form");
  const [pendingEmail, setPendingEmail] = useState("");
  const [confirmInfo, setConfirmInfo] = useState("");
  // Remount-Schlüssel für die Code-Box (zweite Runde bei „Secure email change").
  const [codeRound, setCodeRound] = useState(0);

  const trimmed = newEmail.trim();
  const { isNibis, isSameAsCurrent, canSubmit } = useMemo(() => {
    const nibis = NIBIS_PATTERN.test(trimmed);
    const valid = EMAIL_PATTERN.test(trimmed) && trimmed.length <= 200;
    const same = trimmed.toLowerCase() === currentEmail.toLowerCase();
    return {
      isNibis: nibis,
      isSameAsCurrent: same,
      canSubmit: valid && !same && !nibis,
    };
  }, [trimmed, currentEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      email: trimmed,
    });

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setPendingEmail(trimmed);
    setConfirmInfo("");
    setCodeRound(0);
    setPhase("confirm");
  }

  async function verifyChangeCode(
    code: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = createClient();
    const token = normalizeOtpCode(code);

    const first = await supabase.auth.verifyOtp({
      email: pendingEmail.toLowerCase(),
      token,
      type: "email_change",
    });

    if (first.error) {
      const msg = first.error.message.toLowerCase();
      if (msg.includes("expired")) {
        return {
          ok: false,
          error:
            "Der Code ist abgelaufen. Bitte fordern Sie mit „Code erneut senden“ einen neuen an.",
        };
      }
      // „Secure email change": Der Code könnte zur BISHERIGEN Adresse gehören.
      const second = await supabase.auth.verifyOtp({
        email: currentEmail.toLowerCase(),
        token,
        type: "email_change",
      });
      if (second.error) {
        const msg2 = second.error.message.toLowerCase();
        if (msg2.includes("expired")) {
          return {
            ok: false,
            error:
              "Der Code ist abgelaufen. Bitte fordern Sie mit „Code erneut senden“ einen neuen an.",
          };
        }
        return {
          ok: false,
          error:
            "Der Code ist nicht korrekt oder wurde bereits verwendet. Es gilt immer der Code aus der neuesten E-Mail.",
        };
      }
    }

    // Ein Verify war erfolgreich → prüfen, ob die Änderung komplett ist oder
    // (bei „Secure email change") noch ein zweiter Code offen steht.
    const { data } = await supabase.auth.getUser();
    if (data.user?.new_email) {
      setCodeRound((r) => r + 1);
      setConfirmInfo(
        "Fast geschafft: Aus Sicherheitsgründen haben wir auch an Ihre bisherige Adresse einen Code gesendet – bitte geben Sie diesen ebenfalls ein."
      );
      return { ok: true };
    }

    setPhase("done");
    router.refresh();
    return { ok: true };
  }

  return (
    <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-border">
      <h2 className="text-lg font-semibold text-primary mb-1 flex items-center gap-2">
        <Mail className="w-5 h-5" aria-hidden="true" />
        E-Mail-Adresse ändern
      </h2>
      <p className="text-sm text-text-light mb-5">
        Aktuelle E-Mail:{" "}
        <span className="font-mono text-text">{currentEmail}</span>
      </p>

      {phase === "done" ? (
        <div
          className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800"
          role="status"
          aria-live="polite"
        >
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Ihre E-Mail-Adresse wurde geändert. Ab sofort melden Sie sich mit{" "}
              <strong>{pendingEmail}</strong> an. Ihr Passwort bleibt
              unverändert.
            </span>
          </p>
        </div>
      ) : phase === "confirm" ? (
        <div className="space-y-4">
          <CodeVerifyBox
            key={codeRound}
            idPrefix={`email-change-${codeRound}`}
            submitLabel="Code bestätigen"
            loadingLabel="Wird geprüft …"
            autoFocus
            startCooldownOnMount
            description={
              confirmInfo ? (
                <span className="text-text">{confirmInfo}</span>
              ) : (
                <>
                  Wir haben einen Bestätigungscode an{" "}
                  <strong className="text-text">{pendingEmail}</strong>{" "}
                  gesendet. Geben Sie ihn hier ein, um die Änderung
                  abzuschließen. Bis dahin bleibt Ihre bisherige Adresse aktiv.
                </>
              )
            }
            onVerify={verifyChangeCode}
            onResend={async () => {
              const supabase = createClient();
              const { error: resendError } = await supabase.auth.updateUser({
                email: pendingEmail,
              });
              if (resendError) {
                return { ok: false, error: resendError.message };
              }
              return { ok: true };
            }}
          />
          <p className="text-center text-sm text-text-light">
            <button
              type="button"
              onClick={() => {
                setPhase("form");
                setConfirmInfo("");
              }}
              className="text-primary underline hover:text-primary/80"
            >
              Andere Adresse verwenden
            </button>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}
          <div>
            <label
              htmlFor="newEmail"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Neue E-Mail-Adresse
            </label>
            <input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="neue.email@beispiel.de"
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors"
            />
            {isNibis && (
              <p
                className="mt-2 flex items-start gap-2 text-sm text-red-700"
                role="alert"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  An NIBIS-Adressen (<code className="font-mono text-xs">@*.nibis.de</code>)
                  können aktuell keine Bestätigungsmails zugestellt werden. Bitte eine
                  andere Adresse wählen.
                </span>
              </p>
            )}
            {isSameAsCurrent && trimmed.length > 0 && (
              <p className="mt-2 text-sm text-text-light">
                Das ist bereits Ihre aktuelle Adresse.
              </p>
            )}
          </div>

          <div className="rounded-lg bg-bg border border-border p-4 text-sm text-text-light leading-relaxed">
            <p className="font-medium text-text mb-1">Hinweis zum Ablauf</p>
            <p>
              Nach dem Absenden erhalten Sie an die neue Adresse eine E-Mail mit
              einem 8-stelligen Code. Erst wenn Sie den Code hier eingeben, wird
              die neue E-Mail als Login aktiv – bis dahin bleibt Ihre bisherige
              Adresse gültig. Das Passwort bleibt unverändert.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-text hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail className="w-4 h-4" aria-hidden="true" />
              {saving ? "Wird gesendet..." : "Code anfordern"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
