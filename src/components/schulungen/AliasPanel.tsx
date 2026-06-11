"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Link2, Loader2, Search, Trash2 } from "lucide-react";

type Alias = {
  id: string;
  alias_key: string;
  alias_label: string;
  canonical_name: string;
  created_at: string;
  usage: number;
};

/**
 * Persistente Schul-Zuordnungen (Aliase): „Import-Schulname → registrierte
 * Schule". Wird beim Import automatisch angewendet und überlebt das
 * Zurücksetzen der Daten. Entfernen macht die Zuordnung samt Folgen rückgängig.
 */
export default function AliasPanel({
  onChanged,
}: {
  onChanged?: () => void | Promise<void>;
}) {
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/schulungen/aliases", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Laden");
      setAliases(data.aliases ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(a: Alias) {
    const ok = window.confirm(
      `Zuordnung entfernen?\n\n„${a.alias_label}" → „${a.canonical_name}"\n\n` +
        `${a.usage} Anmeldung(en) werden zurückgesetzt und – falls die Schule ` +
        `nicht automatisch erkannt wird – wieder als Konflikt angezeigt.`
    );
    if (!ok) return;
    setBusyId(a.id);
    setError(null);
    try {
      const res = await fetch("/api/schulungen/aliases", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Entfernen fehlgeschlagen");
      await load();
      await onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Entfernen fehlgeschlagen");
    } finally {
      setBusyId(null);
    }
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? aliases.filter(
        (a) =>
          a.alias_label.toLowerCase().includes(q) ||
          a.canonical_name.toLowerCase().includes(q)
      )
    : aliases;

  return (
    <section
      aria-labelledby="aliases-heading"
      className="rounded-2xl border border-border bg-white shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div>
          <h2
            id="aliases-heading"
            className="flex items-center gap-2 text-base font-bold text-text"
          >
            <Link2 className="h-4 w-4 text-primary" aria-hidden="true" />
            Gespeicherte Schul-Zuordnungen
          </h2>
          <p className="mt-1 text-xs text-text-light">
            Werden beim Import automatisch angewendet und bleiben auch nach dem
            Zurücksetzen erhalten. Entfernen macht die Zuordnung rückgängig.
          </p>
        </div>
        {aliases.length > 0 && (
          <div className="relative w-full sm:w-56">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zuordnung suchen …"
              aria-label="Zuordnung suchen"
              className="w-full rounded-lg border border-border bg-bg py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-light focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 md:mx-6"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="px-5 py-8 text-sm text-text-light md:px-6">
          Lade Zuordnungen …
        </div>
      ) : aliases.length === 0 ? (
        <div className="px-5 py-8 text-sm text-text-light md:px-6">
          Noch keine gespeicherten Zuordnungen. Sie entstehen automatisch, wenn
          Sie oben in einem Konflikt „Schule zuweisen" nutzen.
        </div>
      ) : visible.length === 0 ? (
        <div className="px-5 py-8 text-sm text-text-light md:px-6">
          Keine Zuordnung gefunden.
        </div>
      ) : (
        <ul className="divide-y divide-border/60 px-5 py-2 md:px-6">
          {visible.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3"
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="truncate font-medium text-text">
                  {a.alias_label}
                </span>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-text-light"
                  aria-hidden="true"
                />
                <span className="truncate font-semibold text-primary">
                  {a.canonical_name}
                </span>
              </div>
              <span className="shrink-0 rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold tabular-nums text-text-light">
                {a.usage} {a.usage === 1 ? "Anmeldung" : "Anmeldungen"}
              </span>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => remove(a)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-text transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyId === a.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Entfernen
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
