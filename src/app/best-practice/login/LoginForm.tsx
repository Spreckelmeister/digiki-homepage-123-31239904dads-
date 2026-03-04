"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/best-practice/datenbank";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
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
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
            placeholder="Ihr Passwort"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <LogIn className="w-5 h-5" aria-hidden="true" />
          {loading ? "Wird angemeldet..." : "Anmelden"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-text-light">
        <p>
          Noch kein Konto?{" "}
          <Link
            href="/best-practice/registrieren"
            className="text-primary-light underline hover:text-primary"
          >
            Jetzt registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
