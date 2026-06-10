"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, UserMinus, UserPlus } from "lucide-react";
import type { AccessUser } from "@/lib/schulungen/types";

/**
 * Zugriffsverwaltung (nur für Admins sichtbar): Personen mit der Rolle
 * "schulungsteam" können das Dashboard sehen, sind sonst aber normalen
 * Lehrkraft-Konten gleichgestellt.
 */
export default function AccessPanel() {
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/schulungen/access");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Zugriffsliste konnte nicht geladen werden");
      }
      const body = (await res.json()) as { users: AccessUser[] };
      setUsers(body.users);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Zugriffsliste konnte nicht geladen werden"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function mutate(targetEmail: string, action: "grant" | "revoke") {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/schulungen/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, action }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "Aktion fehlgeschlagen");
      }
      setMessage({
        tone: "ok",
        text:
          action === "grant"
            ? `${targetEmail} hat jetzt Zugriff auf das Dashboard.`
            : `Zugriff für ${targetEmail} wurde entfernt.`,
      });
      setEmail("");
      await load();
    } catch (err) {
      setMessage({
        tone: "error",
        text: err instanceof Error ? err.message : "Aktion fehlgeschlagen",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="access-heading"
      className="rounded-2xl border border-border bg-white p-5 shadow-sm md:p-6"
    >
      <h2
        id="access-heading"
        className="flex items-center gap-2 text-base font-bold text-text"
      >
        <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
        Dashboard-Zugriff verwalten
      </h2>
      <p className="mt-1 text-xs text-text-light">
        Eingeladene Personen erhalten die Rolle „Schulungsteam“ und sehen
        ausschließlich dieses Dashboard zusätzlich. Die Person benötigt ein
        bestehendes Konto (Registrierung über den Best-Practice-Bereich).
      </p>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) mutate(email.trim(), "grant");
        }}
      >
        <label htmlFor="access-email" className="sr-only">
          E-Mail-Adresse der einzuladenden Person
        </label>
        <input
          id="access-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@schule.de"
          className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-light focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden="true" />
          )}
          Zugriff erteilen
        </button>
      </form>

      <div aria-live="polite">
        {message && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              message.tone === "ok"
                ? "bg-primary/5 text-primary"
                : "border border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>

      <ul className="mt-4 divide-y divide-border/60" aria-label="Personen mit Dashboard-Zugriff">
        {loading && (
          <li className="py-3 text-sm text-text-light">Lade Zugriffsliste …</li>
        )}
        {!loading && loadError && (
          <li role="alert" className="py-3 text-sm text-red-700">
            {loadError}
          </li>
        )}
        {!loading && !loadError && users.length === 0 && (
          <li className="py-3 text-sm text-text-light">
            Bisher wurde niemand zusätzlich eingeladen.
          </li>
        )}
        {users.map((user) => (
          <li
            key={user.id}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">
                {user.full_name || user.email || "Unbekannt"}
              </p>
              <p className="truncate text-xs text-text-light">
                {[user.email, user.school].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button
              type="button"
              disabled={busy || !user.email}
              onClick={() => user.email && mutate(user.email, "revoke")}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
              Zugriff entziehen
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
