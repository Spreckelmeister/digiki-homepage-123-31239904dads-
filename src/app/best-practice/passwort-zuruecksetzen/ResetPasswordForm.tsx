"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.");
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
    setTimeout(() => router.push("/best-practice/login"), 3000);
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
            placeholder="Mindestens 8 Zeichen"
          />
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
