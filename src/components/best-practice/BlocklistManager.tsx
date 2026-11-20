"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Entry {
  id: string;
  email: string | null;
  school_name: string;
  reason: string;
  created_at: string;
}

/**
 * Sperrliste des Förderprogramms: Schulen, die ein Admin entfernt hat und
 * die sich nicht neu registrieren können. Sperren lassen sich hier aufheben.
 */
export default function BlocklistManager({ entries }: { entries: Entry[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (entries.length === 0) return null;

  async function unblock(entry: Entry) {
    if (
      !window.confirm(
        `Sperre für „${entry.school_name || entry.email}“ aufheben? Eine Registrierung ist danach wieder möglich.`,
      )
    ) {
      return;
    }
    setBusyId(entry.id);
    setError(null);
    const supabase = createClient();
    const { error: delError } = await supabase
      .from("program_blocklist")
      .delete()
      .eq("id", entry.id);
    setBusyId(null);
    if (delError) {
      setError("Die Sperre konnte nicht aufgehoben werden.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-10 bg-white rounded-xl p-6 shadow-sm border border-border">
      <h2 className="text-lg font-semibold text-primary mb-1 flex items-center gap-2">
        <Ban className="w-5 h-5" aria-hidden="true" />
        Sperrliste ({entries.length})
      </h2>
      <p className="text-sm text-text-light mb-4">
        Aus dem Förderprogramm entfernte Schulen. Gesperrt sind jeweils die
        E-Mail-Adresse und der Schulname – eine neue Registrierung wird
        abgelehnt.
      </p>
      {error && (
        <p className="text-sm text-red-700 mb-3" role="alert">
          {error}
        </p>
      )}
      <ul className="divide-y divide-border">
        {entries.map((e) => (
          <li
            key={e.id}
            className="py-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">
                {e.school_name || "—"}
                {e.email && (
                  <span className="ml-2 font-mono font-normal text-text-light break-all">
                    {e.email}
                  </span>
                )}
              </p>
              <p className="text-sm text-text-light whitespace-pre-wrap">
                {e.reason}
              </p>
              <p className="text-xs text-text-light mt-0.5">
                Gesperrt am{" "}
                {new Date(e.created_at).toLocaleDateString("de-DE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => unblock(e)}
              disabled={busyId === e.id}
              className="shrink-0 self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-bg transition-colors disabled:opacity-50"
            >
              {busyId === e.id ? "Wird aufgehoben …" : "Sperre aufheben"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
