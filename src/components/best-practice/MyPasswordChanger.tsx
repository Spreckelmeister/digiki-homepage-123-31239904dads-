"use client";

import { useState } from "react";
import { KeyRound, Check, X, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  email: string;
}

const PW_RULES = [
  { label: "Mindestens 8 Zeichen", test: (p: string) => p.length >= 8 },
  { label: "Großbuchstabe (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Kleinbuchstabe (a–z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "Ziffer (0–9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "Sonderzeichen (!@#$… etc.)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function isPasswordValid(p: string) {
  return PW_RULES.every((r) => r.test(p));
}

export default function MyPasswordChanger({ email }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const canSubmit =
    currentPassword.length > 0 &&
    isPasswordValid(newPassword) &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setMessage(null);

    const supabase = createClient();

    // 1) aktuelles Passwort prüfen via signInWithPassword
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (reauthError) {
      setSaving(false);
      setMessage({
        type: "err",
        text: "Das aktuelle Passwort ist nicht korrekt.",
      });
      return;
    }

    // 2) neues Passwort setzen
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setSaving(false);
    if (updateError) {
      setMessage({ type: "err", text: updateError.message });
      return;
    }

    setMessage({
      type: "ok",
      text: "Passwort erfolgreich geändert. Ihre Sitzung bleibt aktiv.",
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  const inputClass =
    "w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors";

  return (
    <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-border">
      <h2 className="text-lg font-semibold text-primary mb-5 flex items-center gap-2">
        <KeyRound className="w-5 h-5" aria-hidden="true" />
        Passwort ändern
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Aktuelles Passwort
          </label>
          <div className="relative">
            <input
              id="currentPassword"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass + " pr-11"}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              aria-label={showCurrent ? "Passwort verbergen" : "Passwort anzeigen"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-text-light hover:text-primary"
            >
              {showCurrent ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Neues Passwort
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass + " pr-11"}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              aria-label={showNew ? "Passwort verbergen" : "Passwort anzeigen"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-text-light hover:text-primary"
            >
              {showNew ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {newPassword.length > 0 && (
            <ul className="mt-2.5 space-y-1">
              {PW_RULES.map((rule) => {
                const ok = rule.test(newPassword);
                return (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-2 text-xs ${
                      ok ? "text-green-600" : "text-text-light"
                    }`}
                  >
                    {ok ? (
                      <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <X
                        className="w-3.5 h-3.5 shrink-0 text-red-400"
                        aria-hidden="true"
                      />
                    )}
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Neues Passwort wiederholen
          </label>
          <input
            id="confirmPassword"
            type={showNew ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
            aria-invalid={
              confirmPassword.length > 0 && confirmPassword !== newPassword
            }
            aria-describedby={
              confirmPassword.length > 0 && confirmPassword !== newPassword
                ? "confirmPassword-error"
                : undefined
            }
          />
          {confirmPassword.length > 0 && confirmPassword !== newPassword && (
            <p
              id="confirmPassword-error"
              role="alert"
              className="mt-2 text-sm text-red-700"
            >
              Die Passwörter stimmen nicht überein.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-text hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <KeyRound className="w-4 h-4" aria-hidden="true" />
            {saving ? "Wird geändert..." : "Passwort ändern"}
          </button>

          {message && (
            <p
              className={`text-sm ${
                message.type === "ok" ? "text-green-700" : "text-red-700"
              }`}
              role="status"
            >
              {message.text}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
