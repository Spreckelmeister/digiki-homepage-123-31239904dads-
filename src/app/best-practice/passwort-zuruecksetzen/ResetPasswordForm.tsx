"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PW_RULES = [
  { label: "Mindestens 8 Zeichen",          test: (p: string) => p.length >= 8 },
  { label: "Großbuchstabe (A–Z)",           test: (p: string) => /[A-Z]/.test(p) },
  { label: "Kleinbuchstabe (a–z)",          test: (p: string) => /[a-z]/.test(p) },
  { label: "Ziffer (0–9)",                  test: (p: string) => /[0-9]/.test(p) },
  { label: "Sonderzeichen (!@#$… etc.)",    test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function isPasswordValid(p: string) {
  return PW_RULES.every((r) => r.test(p));
}

export default function ResetPasswordForm() {
  const router = useRouter();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timer if component unmounts before redirect fires
  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isPasswordValid(password)) {
      setError("Das Passwort erfüllt nicht alle Anforderungen.");
      return;
    }
    if (password !== confirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(
        "Das Passwort konnte nicht gesetzt werden. Bitte fordern Sie einen neuen Link an."
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    // Redirect to login after short delay
    redirectTimer.current = setTimeout(() => router.push("/best-practice/login"), 3000);
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-border text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <KeyRound className="h-7 w-7 text-green-600" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-primary mb-2">
          Passwort erfolgreich geändert
        </h2>
        <p className="text-sm text-text-light">
          Sie werden in wenigen Sekunden zur Anmeldeseite weitergeleitet.
        </p>
      </div>
    );
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
            htmlFor="password"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Neues Passwort
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
            placeholder="Sicheres Passwort wählen"
          />
          {password.length > 0 && (
            <ul className="mt-2.5 space-y-1">
              {PW_RULES.map((rule) => {
                const ok = rule.test(password);
                return (
                  <li key={rule.label} className={`flex items-center gap-2 text-xs ${ok ? "text-green-600" : "text-text-light"}`}>
                    {ok
                      ? <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      : <X className="w-3.5 h-3.5 shrink-0 text-red-400" aria-hidden="true" />}
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <label
            htmlFor="confirm"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Passwort bestätigen
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
            placeholder="Passwort wiederholen"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <KeyRound className="w-5 h-5" aria-hidden="true" />
          {loading ? "Wird gespeichert..." : "Neues Passwort speichern"}
        </button>
      </form>
    </div>
  );
}
