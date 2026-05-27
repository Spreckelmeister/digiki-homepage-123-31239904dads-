"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Search, X } from "lucide-react";

type Row = {
  id: string;
  school_name: string | null;
  school_location: string | null;
  student_count: string | number | null;
  respondent_role: string | null;
  status: string;
  created_at: string;
};

/** Wandelt ein SQL-LIKE-Pattern (% beliebig viele Zeichen, _ ein einzelnes
 *  Zeichen) in einen verankerten Regex um. Andere Regex-Sonderzeichen
 *  werden escaped, damit sie als Literal matchen. */
function sqlLikeToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const converted = escaped.replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp("^" + converted + "$", "i");
}

/** Matcht einen Wert gegen ein vom Nutzer eingegebenes Muster.
 *  - Leer → trifft immer
 *  - Ohne SQL-Wildcards → komfortabler „enthält"-Match (case-insensitive)
 *  - Mit % oder _ → strikte SQL-LIKE-Semantik (verankert) */
function matchSqlLike(value: string, pattern: string): boolean {
  const p = pattern.trim();
  if (!p) return true;
  if (!p.includes("%") && !p.includes("_")) {
    return value.toLowerCase().includes(p.toLowerCase());
  }
  try {
    return sqlLikeToRegex(p).test(value);
  } catch {
    return false;
  }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    neu: { label: "Neu", class: "bg-accent/10 text-accent-strong" },
    gelesen: { label: "Gelesen", class: "bg-green-100 text-green-700" },
    archiviert: { label: "Archiviert", class: "bg-gray-100 text-gray-500" },
  };
  const s = map[status] ?? {
    label: status,
    class: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.class}`}
    >
      {s.label}
    </span>
  );
}

export default function BestandsaufnahmeAdminTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => rows.filter((r) => matchSqlLike(r.school_name ?? "", query)),
    [rows, query],
  );

  const hasWildcards = query.includes("%") || query.includes("_");
  const matchCount = filtered.length;

  return (
    <div className="space-y-4">
      {/* Such-Leiste */}
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <label
          htmlFor="bestandsaufnahme-search"
          className="mb-2 block text-sm font-medium text-text"
        >
          Schule suchen
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light"
            aria-hidden="true"
          />
          <input
            id="bestandsaufnahme-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="z.B. Stüve  ·  %schule  ·  GS_%"
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
        <p className="mt-2 text-xs text-text-light">
          Tipp: <code className="rounded bg-bg px-1 py-0.5 font-mono">%</code> steht
          für beliebig viele Zeichen,{" "}
          <code className="rounded bg-bg px-1 py-0.5 font-mono">_</code> für
          genau eines (wie in SQL).
          {query && (
            <span className="ml-2 inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full bg-primary"
              />
              <span>
                {matchCount} {matchCount === 1 ? "Treffer" : "Treffer"}
                {hasWildcards ? " (SQL-LIKE)" : " (enthält)"}
              </span>
            </span>
          )}
        </p>
      </div>

      {/* Tabelle / Karten */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-white py-16 text-center text-text-light">
          {query
            ? "Keine Schule gefunden, die dem Muster entspricht."
            : "Noch keine Bestandsaufnahmen eingegangen."}
        </div>
      ) : (
        <div className="min-h-[400px] overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-bg">
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
                    Standort
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Schüler/innen
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-light"
                  >
                    Ausfüllende Person
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
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Aktionen</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-bg">
                    <td className="px-4 py-3 text-sm font-medium text-text">
                      {row.school_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-light">
                      {row.school_location}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-light">
                      {row.student_count}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-light">
                      {row.respondent_role || "–"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-text-light">
                      {new Date(row.created_at).toLocaleDateString("de-DE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/best-practice/admin/bestandsaufnahme/${row.id}`}
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

          {/* Mobile cards */}
          <div className="divide-y divide-border md:hidden">
            {filtered.map((row) => (
              <div key={row.id} className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-text">
                    {row.school_name}
                  </p>
                  <StatusBadge status={row.status} />
                </div>
                <p className="mb-1 text-xs text-text-light">
                  {row.school_location} · {row.student_count} Schüler/innen
                </p>
                <p className="mb-3 text-xs text-text-light">
                  {new Date(row.created_at).toLocaleDateString("de-DE", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <Link
                  href={`/best-practice/admin/bestandsaufnahme/${row.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
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
