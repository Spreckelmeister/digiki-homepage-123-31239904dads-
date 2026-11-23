"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MailX, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeDomain } from "@/lib/material/shared";

/**
 * Gesperrte E-Mail-Domains für Schulkonten (Migration 038): private
 * Postfächer wie gmail.com. Gilt für beide Registrierungen und für jede
 * Änderung der Adresse – nicht rückwirkend für bestehende Konten.
 */
export default function BlockedDomainsManager({
  domains,
  unavailable,
}: {
  domains: string[];
  unavailable: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    const domain = normalizeDomain(value);
    setError("");
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
      setError("Bitte eine Domain angeben, z. B. beispiel.de.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: insertError } = await supabase
      .from("blocked_email_domains")
      .upsert({ domain, created_by: user?.id ?? null });
    setBusy(false);
    if (insertError) {
      setError("Die Domain konnte nicht gespeichert werden.");
      return;
    }
    setValue("");
    router.refresh();
  }

  async function remove(domain: string) {
    if (!window.confirm(`„${domain}“ wieder zulassen?`)) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("blocked_email_domains")
      .delete()
      .eq("domain", domain);
    setBusy(false);
    if (deleteError) {
      setError("Die Domain konnte nicht entfernt werden.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-primary mb-1 flex items-center gap-2">
        <MailX className="w-5 h-5" aria-hidden="true" />
        Gesperrte E-Mail-Domains ({domains.length})
      </h2>
      <p className="text-sm text-text-light mb-4">
        {unavailable
          ? "Nicht verfügbar – bitte zuerst Migration 038 im Supabase SQL Editor ausführen."
          : "Mit Adressen dieser Domains kann sich keine Schule registrieren (weder über die Bestandsaufnahme noch nur für das Schulungsmaterial) und keine Schule ihre Adresse darauf ändern. Bestehende Konten bleiben unberührt."}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row mb-4">
        <label htmlFor="blocked-domain" className="sr-only">
          Domain sperren
        </label>
        <input
          id="blocked-domain"
          type="text"
          autoComplete="off"
          value={value}
          disabled={unavailable}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="beispiel.de"
          className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors disabled:bg-bg disabled:opacity-60"
        />
        <button
          type="button"
          onClick={add}
          disabled={busy || unavailable}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-text hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Sperren
        </button>
      </div>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <details>
        <summary className="cursor-pointer text-sm font-medium text-primary">
          Liste anzeigen
        </summary>
        <ul className="mt-3 flex flex-wrap gap-2">
          {domains.map((domain) => (
            <li
              key={domain}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-bg py-1 pl-3 pr-1 text-sm text-text"
            >
              {domain}
              <button
                type="button"
                onClick={() => remove(domain)}
                disabled={busy}
                aria-label={`${domain} wieder zulassen`}
                className="rounded-full p-1 text-text-light hover:bg-white hover:text-red-700 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
