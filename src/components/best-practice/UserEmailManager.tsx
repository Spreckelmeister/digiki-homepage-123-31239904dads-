"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, AlertTriangle } from "lucide-react";

interface Props {
  userId: string;
  currentEmail: string;
}

export default function UserEmailManager({ userId, currentEmail }: Props) {
  const router = useRouter();
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const isNibis = /\.nibis\.de\s*$/i.test(newEmail.trim());
  const canSubmit =
    newEmail.trim().length > 0 &&
    newEmail.trim().toLowerCase() !== currentEmail.toLowerCase() &&
    !isNibis;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/change-user-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newEmail: newEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: json.error || "Aktualisierung fehlgeschlagen." });
        return;
      }
      setMessage({
        type: "ok",
        text: `E-Mail aktualisiert. ${newEmail.trim()} ist ab sofort die Login-Adresse. Eine Info-Mail wurde an die neue Adresse geschickt – der Nutzer kann sich direkt mit dem bisherigen Passwort anmelden.`,
      });
      setNewEmail("");
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "Netzwerkfehler." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
      <h2 className="text-lg font-semibold text-primary mb-1 flex items-center gap-2">
        <Mail className="w-5 h-5" aria-hidden="true" />
        Login-E-Mail ändern
      </h2>
      <p className="text-sm text-text-light mb-4">
        Aktuelle E-Mail: <span className="font-mono text-text">{currentEmail}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
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
                NIBIS-Adressen können keine Bestätigungsmails empfangen. Bitte eine
                andere Adresse wählen.
              </span>
            </p>
          )}
        </div>

        <p className="text-xs text-text-light leading-relaxed">
          Die neue Adresse wird direkt als verifiziert markiert (Admin-Override) – der Nutzer
          kann sich sofort mit der neuen Adresse und dem bisherigen Passwort anmelden.
          An die neue Adresse geht automatisch eine Info-Mail, dass das Admin-Team die
          Änderung vorgenommen hat.
        </p>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail className="w-4 h-4" aria-hidden="true" />
            {saving ? "Wird aktualisiert..." : "E-Mail ändern"}
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
