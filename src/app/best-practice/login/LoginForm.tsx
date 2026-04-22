"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const CALLBACK_ERRORS: Record<string, string> = {
  "link-abgelaufen":
    "Der Link ist abgelaufen. Bitte fordern Sie einen neuen an.",
};

const CALLBACK_SUCCESS: Record<string, string> = {
  "confirmed": "Ihre E-Mail-Adresse wurde bestätigt. Sie können sich jetzt anmelden.",
};

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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "E-Mail oder Passwort ist falsch."
          : "Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut."
      );
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border border-border">
      <form onSubmit={handleSubmit} className="space-y-5">
        {callbackSuccessMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
            {callbackSuccessMsg}
          </div>
        )}
        {(callbackErrorMsg || error) && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {callbackErrorMsg || error}
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
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
      </form>

      <div className="mt-6 space-y-2 text-center text-sm text-text-light">
        <p>
          <Link
            href="/best-practice/passwort-vergessen"
            className="text-primary underline hover:text-primary/80"
          >
            Passwort vergessen?
          </Link>
        </p>
        <p>
          Noch kein Konto?{" "}
          <Link
            href="/bestandsaufnahme"
            className="text-primary underline hover:text-primary/80"
          >
            Bestandsaufnahme ausfüllen
          </Link>
        </p>
        <p className="pt-2 border-t border-border mt-4">
          Bestätigungs-Link aus der E-Mail funktioniert nicht?{" "}
          <Link
            href="/best-practice/code-einloesen"
            className="text-primary underline hover:text-primary/80"
          >
            8-stelligen Code eingeben
          </Link>
        </p>
      </div>
    </div>
  );
}
