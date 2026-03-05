"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ApplicationStatus } from "@/lib/types";
import ApplicationStatusBadge from "./ApplicationStatusBadge";

interface FieldDisplayProps {
  label: string;
  value: string | number | null | undefined;
}

function FieldDisplay({ label, value }: FieldDisplayProps) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-xs font-medium text-text-light uppercase tracking-wider">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-text">{String(value)}</dd>
    </div>
  );
}

function CheckDisplay({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-4 h-4 rounded flex items-center justify-center text-xs ${
          checked
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-400"
        }`}
      >
        {checked ? "✓" : "–"}
      </span>
      <span className="text-sm text-text">{label}</span>
    </div>
  );
}

interface ApplicationDetailProps {
  id: string;
  table: string;
  status: ApplicationStatus;
  adminNotes: string | null;
  children: React.ReactNode;
}

export default function ApplicationDetail({
  id,
  table,
  status: initialStatus,
  adminNotes: initialNotes,
  children,
}: ApplicationDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ApplicationStatus>(initialStatus);
  const [adminNotes, setAdminNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const supabase = createClient();
    const { error } = await supabase
      .from(table)
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
    <div className="space-y-8">
      {/* Status Management */}
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
              onChange={(e) =>
                setStatus(e.target.value as ApplicationStatus)
              }
              className={inputClass + " bg-white"}
            >
              <option value="neu">Neu</option>
              <option value="in_bearbeitung">In Bearbeitung</option>
              <option value="genehmigt">Genehmigt</option>
              <option value="abgelehnt">Abgelehnt</option>
            </select>
          </div>
          <div className="flex items-end">
            <ApplicationStatusBadge status={status} />
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
            placeholder="Notizen zum Antrag (nur für Admins sichtbar)..."
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            {saving ? "Wird gespeichert..." : "Status speichern"}
          </button>
          {saved && (
            <span className="text-sm text-green-600">Gespeichert!</span>
          )}
        </div>
      </div>

      {/* Application Details (passed as children) */}
      {children}
    </div>
  );
}

// Re-export helpers for use in detail pages
export { FieldDisplay, CheckDisplay };
