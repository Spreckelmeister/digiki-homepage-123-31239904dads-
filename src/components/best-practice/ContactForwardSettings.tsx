"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Forward, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  CONTACT_FORWARD_SETTING_KEY,
  parseForwardRecipients,
} from "@/lib/kontakt";

/**
 * Admin-Einstellung im Tab „Kontakt": an welche Adresse(n) neue
 * Kontaktanfragen zusätzlich per E-Mail weitergeleitet werden.
 * Gespeichert in `app_settings` (Migration 035); leer = aus.
 */

export default function ContactForwardSettings({
  initialValue,
  fromEnv,
  unavailable,
}: {
  initialValue: string;
  /** Kein Datenbank-Eintrag – angezeigter Wert stammt aus der Env. */
  fromEnv: boolean;
  /** Tabelle fehlt (Migration 035 noch nicht ausgeführt). */
  unavailable: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaved(false);
    setError("");

    const { valid, invalid } = parseForwardRecipients(value);
    if (invalid.length > 0) {
      setError(`Ungültige Adresse: ${invalid.join(", ")}`);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: upsertError } = await supabase.from("app_settings").upsert({
      key: CONTACT_FORWARD_SETTING_KEY,
      value: valid.join(", "),
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    });
    setSaving(false);

    if (upsertError) {
      setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
      return;
    }
    setValue(valid.join(", "));
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  }

  const inputClass =
    "w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors";

  return (
    <div className="mb-4 rounded-xl border border-border bg-white p-4 shadow-sm">
      <label
        htmlFor="kontakt-forward"
        className="mb-2 flex items-center gap-2 text-sm font-medium text-text"
      >
        <Forward className="w-4 h-4 text-text-light" aria-hidden="true" />
        Neue Anfragen weiterleiten an
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="kontakt-forward"
          type="text"
          inputMode="email"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          disabled={unavailable}
          placeholder="name@beispiel.de, weitere@beispiel.de"
          aria-describedby="kontakt-forward-hint"
          className={inputClass + " disabled:bg-bg disabled:opacity-60"}
        />
        <button
          onClick={handleSave}
          disabled={saving || unavailable}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-text hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" aria-hidden="true" />
          {saving ? "Wird gespeichert …" : "Speichern"}
        </button>
      </div>
      <p id="kontakt-forward-hint" className="mt-2 text-xs text-text-light">
        {unavailable
          ? "Einstellung nicht verfügbar – bitte zuerst Migration 035 im Supabase SQL Editor ausführen."
          : "Mehrere Adressen mit Komma trennen. Leer lassen, um die Weiterleitung abzuschalten. Antworten auf die Weiterleitung gehen direkt an die anfragende Person."}
        {fromEnv && !unavailable && value && (
          <> Aktuell aus der Server-Konfiguration übernommen.</>
        )}
      </p>
      {saved && (
        <p role="status" className="mt-2 text-sm text-green-600">
          Gespeichert!
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
