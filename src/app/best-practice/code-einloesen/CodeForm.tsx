"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signup" | "recovery";

export default function CodeForm() {
  const router = useRouter();
  const params = useSearchParams();

  const initialMode: Mode =
    params.get("type") === "recovery" ? "recovery" : "signup";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMode(params.get("type") === "recovery" ? "recovery" : "signup");
  }, [params]);

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
    const fallbackType: Mode = mode === "recovery" ? "signup" : "recovery";

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
        router.push(
          primaryType === "recovery"
            ? "/best-practice/passwort-zuruecksetzen"
            : "/best-practice/datenbank",
        );
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

    // Prüfen, ob der Code zum anderen Typ passt (Nutzer hat den Modus verwechselt).
    if (msg.includes("invalid") || msg.includes("not found") || msg.includes("token")) {
      const { error: fallbackError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: cleanToken,
        type: fallbackType,
      });

      if (!fallbackError) {
        const typLabel = fallbackType === "recovery" ? "Passwort zurücksetzen" : "E-Mail bestätigen";
        setError(
          `Hinweis: Sie haben den Code für „${typLabel}" eingegeben, nicht für „${primaryType === "recovery" ? "Passwort zurücksetzen" : "E-Mail bestätigen"}". Sie werden trotzdem richtig weitergeleitet …`,
        );
        setSuccess(true);
        setLoading(false);
        setTimeout(() => {
          router.push(
            fallbackType === "recovery"
              ? "/best-practice/passwort-zuruecksetzen"
              : "/best-practice/datenbank",
          );
        }, 1800);
        return;
      }

      // Auch Fallback fehlgeschlagen → Code oder Email falsch
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
      <div className="bg-white rounded-xl p-8 shadow-sm border border-border text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-7 w-7 text-green-600" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-primary mb-2">
          {mode === "recovery"
            ? "Code bestätigt"
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
      <div className="flex gap-2 mb-6 p-1 bg-bg rounded-lg">
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "signup"
              ? "bg-white text-primary shadow-sm"
              : "text-text-light hover:text-primary"
          }`}
        >
          E-Mail bestätigen
        </button>
        <button
          type="button"
          onClick={() => setMode("recovery")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "recovery"
              ? "bg-white text-primary shadow-sm"
              : "text-text-light hover:text-primary"
          }`}
        >
          Passwort zurücksetzen
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
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
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <KeyRound className="w-5 h-5" aria-hidden="true" />
          {loading ? "Wird verifiziert..." : "Code bestätigen"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-text-light">
        <Link
          href="/best-practice/login"
          className="text-primary-light underline hover:text-primary"
        >
          Zurück zur Anmeldung
        </Link>
      </div>
    </div>
  );
}
