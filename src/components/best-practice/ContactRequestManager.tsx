"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ContactRequestStatus } from "@/lib/types";
import { CONTACT_STATUS_META } from "@/lib/kontakt";

/**
 * Bearbeitungs-Karte einer Kontaktanfrage (Admin): Status + interne
 * Notizen speichern, Antwort per eigenem E-Mail-Programm starten.
 * Pendant zu ApplicationDetail, aber mit dem Kontakt-Statusmodell
 * (neu → in Bearbeitung → beantwortet).
 */

const STATUS_ORDER: ContactRequestStatus[] = [
  "neu",
  "in_bearbeitung",
  "beantwortet",
];

export default function ContactRequestManager({
  id,
  status: initialStatus,
  adminNotes: initialNotes,
  email,
  topic,
}: {
  id: string;
  status: ContactRequestStatus;
  adminNotes: string | null;
  email: string;
  topic: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ContactRequestStatus>(initialStatus);
  const [adminNotes, setAdminNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("contact_requests")
      .update({
        status,
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setSaving(false);

    if (updateError) {
      setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  }

  const replyHref = `mailto:${email}?subject=${encodeURIComponent(
    `Re: Ihre Anfrage an das DigiKI-Team${topic ? ` (${topic})` : ""}`,
  )}`;

  const inputClass =
    "w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors";
  const badge = CONTACT_STATUS_META[status] ?? CONTACT_STATUS_META.neu;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
      <h2 className="text-lg font-semibold text-primary mb-4">Bearbeitung</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ContactRequestStatus)}
            className={inputClass + " bg-white"}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {CONTACT_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <span
            className={`inline-flex text-xs px-2 py-0.5 rounded-full ${badge.badgeClass}`}
          >
            {badge.label}
          </span>
        </div>
      </div>
      <div className="mb-4">
        <label
          htmlFor="admin_notes"
          className="block text-sm font-medium text-text mb-1.5"
        >
          Interne Notizen
        </label>
        <textarea
          id="admin_notes"
          rows={3}
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          className={inputClass + " resize-y"}
          placeholder="Notizen zur Anfrage (nur für Admins sichtbar) …"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-text hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" aria-hidden="true" />
          {saving ? "Wird gespeichert …" : "Speichern"}
        </button>
        <a
          href={replyHref}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          <Mail className="w-4 h-4" aria-hidden="true" />
          Per E-Mail antworten
        </a>
        {saved && <span className="text-sm text-green-600">Gespeichert!</span>}
        {error && (
          <span role="alert" className="text-sm text-red-700">
            {error}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs text-text-light">
        Die Antwort senden Sie über Ihr eigenes E-Mail-Programm. Setzen Sie den
        Status danach auf „Beantwortet", damit die Übersicht aktuell bleibt.
      </p>
    </div>
  );
}
