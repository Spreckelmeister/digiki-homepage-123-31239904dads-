"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, UserX } from "lucide-react";

const REASON_MIN = 10;
const REASON_MAX = 1000;

interface Props {
  id: string;
  schoolName: string;
  /** Adresse(n), an die die Benachrichtigung geht – nur zur Anzeige. */
  email: string | null;
  hasAccount: boolean;
}

/**
 * „Schule aus dem Förderprogramm entfernen": Grund eingeben, bestätigen –
 * danach sind Bestandsaufnahme, Anträge und Login-Konto gelöscht und die
 * Schule hat eine Mail mit dem Grund erhalten.
 */
export default function SchoolRemover({ id, schoolName, email, hasAccount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ mailSent: boolean; recipients: string[] } | null>(
    null,
  );

  const trimmed = reason.trim();
  const canSubmit =
    trimmed.length >= REASON_MIN && confirmed && /^\d{6}$/.test(code) && !busy;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bestandsaufnahme/${id}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: trimmed, code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Entfernen fehlgeschlagen.");
        setCode("");
        return;
      }
      if (json.mailSent) {
        router.push("/best-practice/admin/bestandsaufnahme");
        router.refresh();
        return;
      }
      // Gelöscht, aber Mail nicht zugestellt → Admin muss selbst schreiben.
      setDone({ mailSent: false, recipients: json.recipients ?? [] });
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-red-200" role="alert">
        <h2 className="text-lg font-semibold text-red-700 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          Schule entfernt – Mail nicht versendet
        </h2>
        <p className="text-sm text-text mb-3">
          Bestandsaufnahme und Login-Konto von <strong>{schoolName}</strong> sind
          gelöscht, die Benachrichtigung konnte aber nicht zugestellt werden.
          Bitte informieren Sie die Schule selbst
          {done.recipients.length > 0 && (
            <>
              {" "}
              (<span className="font-mono break-all">{done.recipients.join(", ")}</span>)
            </>
          )}
          .
        </p>
        <p className="text-sm text-text whitespace-pre-wrap p-3 bg-bg rounded-lg mb-4">
          {trimmed}
        </p>
        <a
          href="/best-practice/admin/bestandsaufnahme"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Zur Übersicht
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-red-200">
      <h2 className="text-lg font-semibold text-red-700 mb-1 flex items-center gap-2">
        <UserX className="w-5 h-5" aria-hidden="true" />
        Schule aus dem Förderprogramm entfernen
      </h2>
      <p className="text-sm text-text-light mb-4">
        Zum Beispiel, wenn die Schule außerhalb des Einzugsbereichs liegt. Löscht
        die Bestandsaufnahme, die Anträge{hasAccount ? " und das Login-Konto" : ""} –
        die Schule erhält eine E-Mail mit Ihrem Grund.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
        >
          <UserX className="w-4 h-4" aria-hidden="true" />
          Schule entfernen …
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="removeReason"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Grund (steht so in der E-Mail an die Schule)
            </label>
            <p className="text-sm text-text-light mb-1.5">
              „… leider wurde Ihre Schule aus dem Förderprogramm DigiKI entfernt, weil:“
            </p>
            <textarea
              id="removeReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={REASON_MAX}
              required
              placeholder="Ihre Schule liegt außerhalb des Einzugsbereichs des Projekts (Stadt Osnabrück)."
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors"
            />
            <p className="mt-1 text-xs text-text-light">
              {trimmed.length < REASON_MIN
                ? `Mindestens ${REASON_MIN} Zeichen.`
                : `${trimmed.length} / ${REASON_MAX} Zeichen`}
              {email && (
                <>
                  {" · "}Mail geht an <span className="font-mono break-all">{email}</span>
                </>
              )}
            </p>
          </div>

          <label className="flex items-start gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>
              Ich möchte <strong>{schoolName}</strong> endgültig entfernen. Das
              lässt sich nicht rückgängig machen.
            </span>
          </label>

          <div>
            <label
              htmlFor="removeCode"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Bestätigung mit dem zweiten Faktor
            </label>
            <input
              id="removeCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="w-40 rounded-lg border border-border px-4 py-3 text-sm font-mono tracking-widest focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors"
            />
            <p className="mt-1 text-xs text-text-light">
              Aktueller 6-stelliger Code aus Ihrer Authenticator-App.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserX className="w-4 h-4" aria-hidden="true" />
              {busy ? "Wird entfernt …" : "Entfernen und E-Mail senden"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmed(false);
                setCode("");
                setError(null);
              }}
              disabled={busy}
              className="text-sm font-medium text-text-light hover:text-text transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
