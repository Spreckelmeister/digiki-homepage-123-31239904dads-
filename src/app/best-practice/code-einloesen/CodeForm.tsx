"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type OtpMode = "signup" | "recovery" | "email_change";
type Mode = OtpMode | "account_deletion";

const MODE_LABELS: Record<Mode, string> = {
  signup: "E-Mail bestätigen",
  recovery: "Passwort zurücksetzen",
  email_change: "E-Mail ändern",
  account_deletion: "Konto löschen",
};

const MODE_REDIRECTS: Record<Mode, string> = {
  signup: "/best-practice/datenbank",
  recovery: "/best-practice/passwort-zuruecksetzen",
  email_change: "/best-practice/konto",
  account_deletion: "/konto-geloescht?status=ok",
};

// Account-Löschung läuft nicht über Supabase's verifyOtp, sondern über unsere
// eigene API (stateless Token + DB-Lookup). Daher hier vom OTP-Fallback
// ausgeschlossen.
const OTP_MODES: OtpMode[] = ["signup", "recovery", "email_change"];

function parseMode(value: string | null): Mode {
  if (value === "recovery") return "recovery";
  if (value === "email_change") return "email_change";
  if (value === "account_deletion") return "account_deletion";
  return "signup";
}

export default function CodeForm() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const initialMode: Mode = parseMode(params.get("type"));

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMode(parseMode(params.get("type")));
  }, [params]);

  function selectMode(m: Mode) {
    setMode(m);
    const qs = new URLSearchParams(params.toString());
    qs.set("type", m);
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const cleanToken = token.replace(/\s+/g, "");
    if (!/^[A-Za-z0-9]{6,10}$/.test(cleanToken)) {
      setError("Bitte geben Sie den Code aus der E-Mail ein (8 Zeichen).");
      return;
    }

    setLoading(true);

    // Account-Löschung läuft über unsere eigene Route (nicht Supabase OTP),
    // weil der Token-Kontext ein anderer ist.
    if (mode === "account_deletion") {
      try {
        const res = await fetch("/api/account/confirm-delete-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), code: cleanToken }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            typeof json.error === "string"
              ? json.error
              : "Code konnte nicht eingelöst werden."
          );
          setLoading(false);
          return;
        }
        setSuccess(true);
        setLoading(false);
        setTimeout(() => {
          router.push(MODE_REDIRECTS.account_deletion);
        }, 1200);
      } catch {
        setError("Netzwerkfehler. Bitte erneut versuchen.");
        setLoading(false);
      }
      return;
    }

    const supabase = createClient();
    // An diesem Punkt ist mode garantiert ein OtpMode (account_deletion hat
    // bereits oben via return die Funktion verlassen).
    const primaryType = mode as OtpMode;
    const fallbackTypes: OtpMode[] = OTP_MODES.filter((t) => t !== primaryType);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: cleanToken,
      type: primaryType,
    });

    if (!verifyError) {
      // Primärer Modus hat funktioniert → normaler Redirect
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push(MODE_REDIRECTS[primaryType]);
      }, 1200);
      return;
    }

    console.error("Verify error (primary):", verifyError.message);
    const msg = verifyError.message.toLowerCase();

    // Bei abgelaufenem Code sofort abbrechen – kein Typ-Verwechsler-Fallback sinnvoll.
    if (msg.includes("expired")) {
      setError("Der Code ist abgelaufen. Bitte fordern Sie einen neuen Link an.");
      setLoading(false);
      return;
    }

    // Prüfen, ob der Code zu einem anderen Typ passt (Nutzer hat den Modus verwechselt).
    if (msg.includes("invalid") || msg.includes("not found") || msg.includes("token")) {
      for (const fallbackType of fallbackTypes) {
        const { error: fallbackError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: cleanToken,
          type: fallbackType,
        });

        if (!fallbackError) {
          setError(
            `Hinweis: Sie haben den Code für „${MODE_LABELS[fallbackType]}" eingegeben, nicht für „${MODE_LABELS[primaryType]}". Sie werden trotzdem richtig weitergeleitet …`,
          );
          setSuccess(true);
          setLoading(false);
          setTimeout(() => {
            router.push(MODE_REDIRECTS[fallbackType]);
          }, 1800);
          return;
        }
      }

      // Alle Fallbacks fehlgeschlagen → Code oder Email falsch
      setError(
        "Code oder E-Mail-Adresse passen nicht. Bitte prüfen Sie Ihre Eingabe (Groß-/Kleinschreibung, Leerzeichen) und dass Sie den aktuellsten Code aus der E-Mail verwenden.",
      );
      setLoading(false);
      return;
    }

    setError("Der Code konnte nicht verifiziert werden. Bitte versuchen Sie es erneut.");
    setLoading(false);
  }

  if (success) {
    const isDeletion = mode === "account_deletion";
    const title = isDeletion
      ? "Konto wird gelöscht"
      : mode === "recovery"
        ? "Code bestätigt"
        : mode === "email_change"
          ? "Neue E-Mail-Adresse bestätigt"
          : "E-Mail-Adresse bestätigt";
    return (
      <div
        className="bg-white rounded-xl p-8 shadow-sm border border-border text-center"
        role="status"
        aria-live="polite"
      >
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
            isDeletion ? "bg-slate-100" : "bg-green-100"
          }`}
        >
          <CheckCircle2
            className={`h-7 w-7 ${isDeletion ? "text-slate-700" : "text-green-600"}`}
            aria-hidden="true"
          />
        </div>
        <h2
          className={`text-lg font-semibold mb-2 ${
            isDeletion ? "text-slate-900" : "text-primary"
          }`}
        >
          {title}
        </h2>
        <p className="text-sm text-text-light">
          Sie werden in einem Moment weitergeleitet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border border-border">
      <p className="text-sm text-text-light mb-6 leading-relaxed">
        Manche Schul- und Firmen-Netzwerke scannen E-Mail-Links automatisch und
        machen sie dadurch ungültig. Als Alternative finden Sie in der E-Mail
        einen <strong>8-stelligen Code</strong>, den Sie hier eingeben können.
      </p>

      {/* Modus-Auswahl */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mb-6 p-1 bg-bg rounded-lg">
        {(
          ["signup", "recovery", "email_change", "account_deletion"] as Mode[]
        ).map((m) => {
          const isActive = mode === m;
          const isDestructive = m === "account_deletion";
          return (
            <button
              key={m}
              type="button"
              onClick={() => selectMode(m)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? isDestructive
                    ? "bg-white text-red-700 shadow-sm"
                    : "bg-white text-primary shadow-sm"
                  : "text-text-light hover:text-primary"
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="code-email"
            className="block text-sm font-medium text-text mb-1.5"
          >
            E-Mail-Adresse
          </label>
          <input
            id="code-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors"
            placeholder="ihre.email@schule.de"
          />
        </div>

        <div>
          <label
            htmlFor="code-token"
            className="block text-sm font-medium text-text mb-1.5"
          >
            8-stelliger Code
          </label>
          <input
            id="code-token"
            type="text"
            required
            inputMode="text"
            maxLength={12}
            autoComplete="one-time-code"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-3 text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors"
            placeholder="12345678"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-text hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <KeyRound className="w-5 h-5" aria-hidden="true" />
          {loading ? "Wird verifiziert..." : "Code bestätigen"}
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
