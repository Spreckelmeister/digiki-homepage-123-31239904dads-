"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, KeyRound, LogOut, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  authenticatePasskey,
  getMfaState,
  MfaError,
  passkeysSupported,
  registerPasskey,
  removeFactor,
  startTotpEnrollment,
  verifyTotp,
  type MfaFactor,
} from "@/lib/mfa";

/**
 * Zwei-Faktor-Oberfläche für Admins:
 * - TwoFactorGate: Seite nach dem Login (Bestätigen oder erstmalig einrichten)
 * - TwoFactorManager: Karte im Konto (Faktoren hinzufügen/entfernen)
 */

const inputClass =
  "w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors";
const primaryBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-text hover:bg-accent-hover transition-colors disabled:opacity-50";
const secondaryBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-50";

function errText(err: unknown): string {
  return err instanceof MfaError ? err.message : "Das hat leider nicht geklappt. Bitte erneut versuchen.";
}

function Alert({ text }: { text: string }) {
  return (
    <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
      {text}
    </div>
  );
}

/** 6-stelliges Code-Feld für die Authenticator-App. */
function TotpCodeForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (code: string) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit(code);
    } catch (err) {
      setError(errText(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handle} className="space-y-3">
      <label htmlFor="totp-code" className="block text-sm font-medium text-text">
        6-stelliger Code aus der App
      </label>
      <input
        id="totp-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        className={inputClass + " text-center text-lg tracking-[0.4em] font-mono"}
        placeholder="000000"
        autoFocus
      />
      {error && <Alert text={error} />}
      <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
        <KeyRound className="w-4 h-4" aria-hidden="true" />
        {busy ? "Wird geprüft …" : submitLabel}
      </button>
    </form>
  );
}

/** Einrichtung der Authenticator-App: QR-Code + Bestätigungscode. */
function TotpSetup({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [enrollment, setEnrollment] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    startTotpEnrollment(createClient())
      .then(setEnrollment)
      .catch((err) => setError(errText(err)));
  }, []);

  if (error) {
    return (
      <div className="space-y-3">
        <Alert text={error} />
        <button type="button" onClick={onCancel} className={secondaryBtn}>
          Zurück
        </button>
      </div>
    );
  }
  if (!enrollment) return <p className="text-sm text-text-light">Wird vorbereitet …</p>;

  return (
    <div className="space-y-4">
      <ol className="list-decimal pl-5 space-y-1 text-sm text-text">
        <li>Authenticator-App öffnen (z. B. Google Authenticator, Microsoft Authenticator, 2FAS).</li>
        <li>Diesen QR-Code scannen.</li>
        <li>Den angezeigten 6-stelligen Code unten eingeben.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element -- data:-URL von Supabase */}
      <img
        src={enrollment.qrCode}
        alt="QR-Code zur Einrichtung der Authenticator-App"
        width={180}
        height={180}
        className="mx-auto rounded-lg border border-border bg-white p-2"
      />
      <details className="text-sm text-text-light">
        <summary className="cursor-pointer">QR-Code lässt sich nicht scannen?</summary>
        <p className="mt-2">
          Schlüssel manuell eingeben:{" "}
          <code className="break-all rounded bg-bg px-1.5 py-0.5 font-mono text-text">{enrollment.secret}</code>
        </p>
      </details>
      <TotpCodeForm
        submitLabel="Einrichtung abschließen"
        onSubmit={async (code) => {
          await verifyTotp(createClient(), enrollment.factorId, code);
          onDone();
        }}
      />
      <button type="button" onClick={onCancel} className="w-full text-sm text-text-light underline hover:text-primary">
        Abbrechen
      </button>
    </div>
  );
}

/** Auswahl + Durchführung der Ersteinrichtung (Passkey oder App). */
function FactorSetup({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const [method, setMethod] = useState<"choose" | "totp">("choose");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [canPasskey, setCanPasskey] = useState(false);
  useEffect(() => setCanPasskey(passkeysSupported()), []);

  if (method === "totp") {
    return <TotpSetup onDone={onDone} onCancel={() => setMethod("choose")} />;
  }

  return (
    <div className="space-y-3">
      {canPasskey && (
        <button
          type="button"
          disabled={busy}
          className={primaryBtn}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await registerPasskey(createClient());
              onDone();
            } catch (err) {
              setError(errText(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Fingerprint className="w-4 h-4" aria-hidden="true" />
          {busy ? "Warte auf Passkey …" : "Passkey einrichten"}
        </button>
      )}
      <button type="button" disabled={busy} onClick={() => setMethod("totp")} className={secondaryBtn}>
        <Smartphone className="w-4 h-4" aria-hidden="true" />
        Authenticator-App einrichten
      </button>
      {canPasskey && (
        <p className="text-xs text-text-light">
          Ein Passkey nutzt Fingerabdruck, Gesichtserkennung oder die Geräte-PIN – ohne Codes abzutippen.
        </p>
      )}
      {error && <Alert text={error} />}
      {onCancel && (
        <button type="button" onClick={onCancel} className="w-full text-sm text-text-light underline hover:text-primary">
          Abbrechen
        </button>
      )}
    </div>
  );
}

function useMfaState() {
  const [factors, setFactors] = useState<MfaFactor[] | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const s = await getMfaState(createClient());
    setFactors(s.factors);
    setLevel(s.currentLevel);
    return s;
  }, []);
  return { factors, level, reload };
}

export function TwoFactorGate({ redirectTo, email }: { redirectTo: string; email: string }) {
  const router = useRouter();
  const { factors, level, reload } = useMfaState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const finish = useCallback(() => {
    router.replace(redirectTo);
    router.refresh();
  }, [router, redirectTo]);

  useEffect(() => {
    reload().catch(() => setError("Der Status konnte nicht geladen werden. Bitte Seite neu laden."));
  }, [reload]);

  useEffect(() => {
    if (level === "aal2") finish();
  }, [level, finish]);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/best-practice/login");
    router.refresh();
  }

  const passkeys = (factors ?? []).filter((f) => f.factor_type === "webauthn");
  const totp = (factors ?? []).find((f) => f.factor_type === "totp");

  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border border-border space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          {factors && factors.length === 0 ? "Zweiten Faktor einrichten" : "Anmeldung bestätigen"}
        </h2>
        <p className="mt-2 text-sm text-text-light">
          {factors && factors.length === 0
            ? "Für Admin-Konten ist ein zweiter Faktor Pflicht. Die Einrichtung dauert nur einmal etwa eine Minute."
            : "Ihr Konto hat Admin-Rechte. Bitte bestätigen Sie die Anmeldung mit Ihrem zweiten Faktor."}
          {email && (
            <span className="mt-1 block">
              Angemeldet als <strong className="text-text">{email}</strong>
            </span>
          )}
        </p>
      </div>

      {error && <Alert text={error} />}

      {factors === null ? (
        <p className="text-sm text-text-light">Wird geladen …</p>
      ) : factors.length === 0 ? (
        <FactorSetup onDone={finish} />
      ) : (
        <div className="space-y-4">
          {passkeys.map((f) => (
            <button
              key={f.id}
              type="button"
              disabled={busy}
              className={primaryBtn}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await authenticatePasskey(createClient(), f.id);
                  finish();
                } catch (err) {
                  setError(errText(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Fingerprint className="w-4 h-4" aria-hidden="true" />
              {busy ? "Warte auf Passkey …" : passkeys.length > 1 ? `Mit ${f.friendly_name} bestätigen` : "Mit Passkey bestätigen"}
            </button>
          ))}
          {passkeys.length > 0 && totp && (
            <p className="text-center text-xs uppercase tracking-wider text-text-light">oder</p>
          )}
          {totp && (
            <TotpCodeForm
              submitLabel="Bestätigen"
              onSubmit={async (code) => {
                await verifyTotp(createClient(), totp.id, code);
                finish();
              }}
            />
          )}
        </div>
      )}

      <p className="border-t border-border pt-4 text-center text-sm text-text-light">
        <button type="button" onClick={signOut} className="inline-flex items-center gap-1.5 underline hover:text-primary">
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Abmelden
        </button>
      </p>
    </div>
  );
}

export function TwoFactorManager() {
  const { factors, reload } = useMfaState();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    reload().catch(() => setError("Der Status konnte nicht geladen werden."));
  }, [reload]);

  const fmt = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-border">
      <h2 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5" aria-hidden="true" />
        Zwei-Faktor-Anmeldung
      </h2>
      <p className="text-sm text-text-light mb-5">
        Pflicht für Admin-Konten. Richten Sie die App am besten auf zwei Geräten ein (z. B. Handy und Tablet –
        einfach den QR-Code mit beiden scannen), damit Sie bei Verlust eines Geräts weiter Zugang haben.
      </p>

      {error && <div className="mb-4"><Alert text={error} /></div>}

      {factors === null ? (
        <p className="text-sm text-text-light">Wird geladen …</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border mb-5">
          {factors.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-3">
              {f.factor_type === "webauthn" ? (
                <Fingerprint className="w-5 h-5 shrink-0 text-primary" aria-hidden="true" />
              ) : (
                <Smartphone className="w-5 h-5 shrink-0 text-primary" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">
                  {f.friendly_name || (f.factor_type === "webauthn" ? "Passkey" : "Authenticator-App")}
                </p>
                <p className="text-xs text-text-light">eingerichtet am {fmt.format(new Date(f.created_at))}</p>
              </div>
              <button
                type="button"
                disabled={factors.length <= 1 || removing === f.id}
                title={factors.length <= 1 ? "Der letzte Faktor kann nicht entfernt werden." : "Entfernen"}
                aria-label={`${f.friendly_name || "Faktor"} entfernen`}
                className="rounded-lg p-2 text-text-light hover:bg-red-50 hover:text-red-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-light"
                onClick={async () => {
                  if (!confirm("Diesen Faktor wirklich entfernen?")) return;
                  setRemoving(f.id);
                  setError("");
                  try {
                    await removeFactor(createClient(), f.id);
                    await reload();
                  } catch (err) {
                    setError(errText(err));
                  } finally {
                    setRemoving(null);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <FactorSetup
          onDone={async () => {
            setAdding(false);
            await reload();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={secondaryBtn}>
          Weiteren Faktor hinzufügen
        </button>
      )}
    </div>
  );
}
