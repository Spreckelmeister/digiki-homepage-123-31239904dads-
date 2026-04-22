"use client";

import { useMemo, useState } from "react";
import { Mail, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Modul-Level: einmal kompiliert, nicht pro Keystroke neu.
const NIBIS_PATTERN = /\.nibis\.de\s*$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  currentEmail: string;
}

export default function MyEmailChanger({ currentEmail }: Props) {
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const trimmed = newEmail.trim();
  const { isNibis, isSameAsCurrent, canSubmit } = useMemo(() => {
    const nibis = NIBIS_PATTERN.test(trimmed);
    const valid = EMAIL_PATTERN.test(trimmed) && trimmed.length <= 200;
    const same = trimmed.toLowerCase() === currentEmail.toLowerCase();
    return {
      isNibis: nibis,
      isSameAsCurrent: same,
      canSubmit: valid && !same && !nibis,
    };
  }, [trimmed, currentEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email: trimmed });

    setSaving(false);
    if (error) {
      setMessage({ type: "err", text: error.message });
      return;
    }
    setMessage({
      type: "ok",
      text: `Bestätigungsmail an ${trimmed} gesendet. Die E-Mail-Adresse wird nach Klick auf den Bestätigungslink aktiv.`,
    });
    setNewEmail("");
  }

  return (
    <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-border">
      <h2 className="text-lg font-semibold text-primary mb-1 flex items-center gap-2">
        <Mail className="w-5 h-5" aria-hidden="true" />
        E-Mail-Adresse ändern
      </h2>
      <p className="text-sm text-text-light mb-5">
        Aktuelle E-Mail:{" "}
        <span className="font-mono text-text">{currentEmail}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="newEmail"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Neue E-Mail-Adresse
          </label>
          <input
            id="newEmail"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="neue.email@beispiel.de"
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
          />
          {isNibis && (
            <p
              className="mt-2 flex items-start gap-2 text-sm text-red-700"
              role="alert"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                An NIBIS-Adressen (<code className="font-mono text-xs">@*.nibis.de</code>)
                können aktuell keine Bestätigungsmails zugestellt werden. Bitte eine
                andere Adresse wählen.
              </span>
            </p>
          )}
          {isSameAsCurrent && trimmed.length > 0 && (
            <p className="mt-2 text-sm text-text-light">
              Das ist bereits Ihre aktuelle Adresse.
            </p>
          )}
        </div>

        <div className="rounded-lg bg-bg border border-border p-4 text-sm text-text-light leading-relaxed">
          <p className="font-medium text-text mb-1">Hinweis zum Ablauf</p>
          <p>
            Nach dem Absenden erhalten Sie an die neue Adresse eine Bestätigungsmail.
            Erst wenn Sie den Link darin anklicken, wird die neue E-Mail als Login aktiv –
            bis dahin bleibt Ihre bisherige Adresse gültig. Das Passwort bleibt unverändert.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-text hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail className="w-4 h-4" aria-hidden="true" />
            {saving ? "Wird aktualisiert..." : "Bestätigungsmail senden"}
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
