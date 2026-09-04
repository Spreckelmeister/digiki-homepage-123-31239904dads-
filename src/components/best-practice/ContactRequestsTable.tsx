"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Search, X } from "lucide-react";
import type { ContactRequestStatus } from "@/lib/types";
import { CONTACT_STATUS_META } from "@/lib/kontakt";

/** Zeilen des Admin-Tabs „Kontakt" – Liste aller Kontaktanfragen. */

export interface ContactRequestRow {
  id: string;
  name: string;
  email: string;
  school_name: string | null;
  topic: string | null;
  message: string;
  status: ContactRequestStatus;
  created_at: string;
}

const FMT_DAY = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const FMT_DAY_LONG = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const STATUS_ORDER: ContactRequestStatus[] = [
  "neu",
  "in_bearbeitung",
  "beantwortet",
];

function StatusBadge({ status }: { status: ContactRequestStatus }) {
  const meta = CONTACT_STATUS_META[status] ?? CONTACT_STATUS_META.neu;
  return (
    <span
      className={`inline-flex text-xs px-2 py-0.5 rounded-full ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

export default function ContactRequestsTable({
  requests,
}: {
  requests: ContactRequestRow[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactRequestStatus | "">(
    "",
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.name, r.email, r.school_name ?? "", r.topic ?? "", r.message]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [requests, query, statusFilter]);

  const isFiltered = query.trim() !== "" || statusFilter !== "";

  return (
    <div className="space-y-4">
      {/* ── Such- und Filter-Leiste ───────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <label
          htmlFor="kontakt-search"
          className="mb-2 block text-sm font-medium text-text"
        >
          Anfrage suchen
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light"
            aria-hidden="true"
          />
          <input
            id="kontakt-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, E-Mail, Schule oder Nachrichtentext"
            spellCheck={false}
            autoComplete="off"
            className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition-colors focus:border-accent-strong focus:ring-2 focus:ring-accent-strong"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Suche zurücksetzen"
              className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-text-light transition-colors hover:bg-bg hover:text-primary"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {STATUS_ORDER.map((s) => {
            const isActive = statusFilter === s;
            const count = requests.filter((r) => r.status === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(isActive ? "" : s)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-all ${
                  isActive
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-border bg-white text-text-light hover:border-primary/40 hover:text-primary"
                }`}
              >
                {CONTACT_STATUS_META[s].label}
                <span
                  className={`inline-flex items-center justify-center rounded-full px-1.5 py-0 text-[10px] font-bold tabular-nums ${
                    isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-text-light">
          <strong className="text-text tabular-nums">{filtered.length}</strong>{" "}
          {filtered.length === 1 ? "Anfrage" : "Anfragen"} angezeigt
          {isFiltered && <> · von {requests.length} gesamt</>}
        </p>
      </div>

      {/* ── Tabelle / Karten ─────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-white py-16 text-center text-text-light">
          {isFiltered
            ? "Keine Anfrage erfüllt die aktuellen Such-/Filterkriterien."
            : "Noch keine Kontaktanfragen eingegangen."}
        </div>
      ) : (
        <div className="min-h-[300px] overflow-visible rounded-xl border border-border bg-white shadow-sm">
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Absender:in
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Schule
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Anliegen
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Datum
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-bg/50">
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm font-medium text-text">{r.name}</p>
                      <p className="text-xs text-text-light">{r.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-light align-top">
                      {r.school_name || "–"}
                    </td>
                    <td className="max-w-[280px] px-4 py-3 align-top">
                      {r.topic && (
                        <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {r.topic}
                        </span>
                      )}
                      <p className="mt-1 truncate text-xs text-text-light">
                        {r.message}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-text-light align-top whitespace-nowrap">
                      {FMT_DAY.format(new Date(r.created_at))}
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <Link
                        href={`/best-practice/admin/kontakt/${r.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        Ansehen
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="divide-y divide-border md:hidden">
            {filtered.map((r) => (
              <div key={r.id} className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-text">{r.name}</h3>
                  <StatusBadge status={r.status} />
                </div>
                {r.topic && (
                  <span className="mb-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {r.topic}
                  </span>
                )}
                <p className="mb-2 line-clamp-2 text-xs text-text-light">
                  {r.message}
                </p>
                <p className="mb-3 text-xs text-text-light">
                  {r.school_name ? `${r.school_name} · ` : ""}
                  {FMT_DAY_LONG.format(new Date(r.created_at))}
                </p>
                <Link
                  href={`/best-practice/admin/kontakt/${r.id}`}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Ansehen
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
