"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  id: string;
  initialStatus: string;
  adminNotes: string;
}

export default function BestandsaufnahmeStatusManager({
  id,
  initialStatus,
  adminNotes: initialNotes,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [adminNotes, setAdminNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const { error } = await supabase
      .from("bestandsaufnahme_responses")
      .update({
        status,
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors";

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
      <h2 className="text-lg font-semibold text-primary mb-4">
        Bearbeitungsstatus
      </h2>
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
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass + " bg-white"}
          >
            <option value="neu">Neu</option>
            <option value="gelesen">Gelesen</option>
            <option value="archiviert">Archiviert</option>
          </select>
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
          placeholder="Interne Anmerkungen zur Bestandsaufnahme..."
        />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Save className="w-4 h-4" aria-hidden="true" />
        {saving ? "Wird gespeichert..." : saved ? "Gespeichert ✓" : "Speichern"}
      </button>
    </div>
  );
}
