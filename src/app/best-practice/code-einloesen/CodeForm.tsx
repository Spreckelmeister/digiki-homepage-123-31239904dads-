"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signup" | "recovery" | "email_change";

const MODE_LABELS: Record<Mode, string> = {
  signup: "E-Mail bestätigen",
  recovery: "Passwort zurücksetzen",
  email_change: "E-Mail ändern",
};

const MODE_REDIRECTS: Record<Mode, string> = {
  signup: "/best-practice/datenbank",
  recovery: "/best-practice/passwort-zuruecksetzen",
  email_change: "/best-practice/konto",
};

function parseMode(value: string | null): Mode {
  if (value === "recovery") return "recovery";
  if (value === "email_change") return "email_change";
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
    const supabase = createClient();
    const primaryType: Mode = mode;
    const fallbackTypes: Mode[] = (
      ["signup", "recovery", "email_change"] as Mode[]
    ).filter((t) => t !== primaryType);

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
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-border text-center" role="status" aria-live="polite">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-7 w-7 text-green-600" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-primary mb-2">
          {mode === "recovery"
            ? "Code bestätigt"
            : mode === "email_change"
              ? "Neue E-Mail-Adresse bestätigt"
              : "E-Mail-Adresse bestätigt"}
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
      <div className="flex flex-col sm:flex-row gap-1 mb-6 p-1 bg-bg rounded-lg">
        {(["signup", "recovery", "email_change"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => selectMode(m)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === m
                ? "bg-white text-primary shadow-sm"
                : "text-text-light hover:text-primary"
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
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
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
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
            className="w-full rounded-lg border border-border px-4 py-3 text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
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
