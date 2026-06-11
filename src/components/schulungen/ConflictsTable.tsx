"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { ROLE_LABELS, type ConflictItem } from "@/lib/schulungen/types";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso + "T00:00:00"));
}

/**
 * Offene Import-Konflikte (Quotenverletzungen). Aktionen:
 * - Ablehnen: Konflikt schließen, keine Anmeldung anlegen.
 * - Trotz Quote zulassen: Anmeldung mit Override anlegen.
 */
export default function ConflictsTable({
  conflicts,
  onResolved,
  loading = false,
  error = null,
}: {
  conflicts: ConflictItem[];
  onResolved: () => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function send(payload: object, busyKey: string) {
    setBusyId(busyKey);
    setActionError(null);
    try {
      const res = await fetch("/api/schulungen/conflicts/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Aktion fehlgeschlagen");
      }
      await onResolved();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Aktion fehlgeschlagen"
      );
    } finally {
      setBusyId(null);
    }
  }

  const resolve = (conflictId: string, action: "reject" | "approve") =>
    send({ conflictId, action }, conflictId);

  const resolveAll = (action: "reject" | "approve") =>
    send({ all: true, action }, "__all__");

  return (
    <section
      aria-labelledby="conflicts-heading"
      className="rounded-2xl border border-border bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 md:px-6">
        <h2
          id="conflicts-heading"
          className="flex items-center gap-2 text-base font-bold text-text"
        >
          <ShieldAlert
            className="h-4 w-4 text-accent-text"
            aria-hidden="true"
          />
          Offene Konflikte
        </h2>
        {!loading && !error && (
          <div className="flex items-center gap-2">
            {conflicts.length > 0 && (
              <>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => resolveAll("reject")}
                  className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-text transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Alle ablehnen
                </button>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => resolveAll("approve")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyId === "__all__" && (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  )}
                  Alle zulassen
                </button>
              </>
            )}
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-accent-text">
              {conflicts.length}
            </span>
          </div>
        )}
      </div>

      {actionError && (
        <div
          role="alert"
          className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 md:mx-6"
        >
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="px-5 py-8 text-sm text-text-light md:px-6">
          Lade Konflikte …
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mx-5 my-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 md:mx-6"
        >
          Konflikte konnten nicht geladen werden: {error}
        </div>
      ) : conflicts.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-8 md:px-6">
          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="text-sm text-text-light">
            Keine offenen Konflikte – alle Anmeldungen liegen innerhalb der
            Quoten.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto px-5 py-4 md:px-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-text-light">
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Schule
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Teilnehmende
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Rolle
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Schulung
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Grund
                </th>
                <th scope="col" className="py-2 pl-4 text-right font-semibold">
                  Aktion
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {conflicts.map((c) => {
                // Schul-Konflikt (Schule nicht bei DigiKI registriert) vs.
                // Quoten-Konflikt – unterschiedlich einfärben.
                const schoolIssue = (c.reason || "")
                  .toLowerCase()
                  .includes("registriert");
                return (
                <tr key={c.id} className={`align-top ${schoolIssue ? "bg-red-50/50" : ""}`}>
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-text">
                      {c.school?.name ?? "–"}
                    </div>
                    {c.school?.city && (
                      <div className="text-[11px] text-text-light">
                        {c.school.city}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-text">
                      {c.person
                        ? `${c.person.last_name}, ${c.person.first_name}`
                        : "–"}
                    </div>
                    {c.person?.email && (
                      <div className="text-[11px] text-text-light">
                        {c.person.email}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex whitespace-nowrap rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold text-text">
                      {ROLE_LABELS[c.role] ?? c.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-medium text-text">
                      {c.event?.kurs_nr ?? "–"}
                    </div>
                    {c.event?.start_date && (
                      <div className="text-[11px] text-text-light">
                        {formatDate(c.event.start_date)}
                      </div>
                    )}
                  </td>
                  <td className="max-w-xs py-3 pr-4">
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium leading-snug ${
                        schoolIssue
                          ? "bg-red-100 text-red-700"
                          : "bg-accent/10 text-accent-text"
                      }`}
                    >
                      {c.reason}
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <div className="inline-flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => resolve(c.id, "reject")}
                        className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Ablehnen
                      </button>
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => resolve(c.id, "approve")}
                        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyId === c.id && (
                          <Loader2
                            className="h-3 w-3 animate-spin"
                            aria-hidden="true"
                          />
                        )}
                        {schoolIssue ? "Trotzdem zulassen" : "Trotz Quote zulassen"}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
