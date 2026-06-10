"use client";

import { ArrowUpRight } from "lucide-react";
import type { TrainingEvent } from "@/lib/schulungen/types";

function dateParts(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return {
    weekday: new Intl.DateTimeFormat("de-DE", { weekday: "short" })
      .format(d)
      .replace(".", ""),
    day: d.getDate(),
    month: new Intl.DateTimeFormat("de-DE", { month: "short" })
      .format(d)
      .replace(".", ""),
    year: d.getFullYear(),
  };
}

/**
 * Alle KOS-Schulungen mit Anmeldezahl. Das Datum-Cluster greift das
 * Termin-Design der öffentlichen Seite (KosFortbildungenSection) auf.
 */
export default function EventsTable({
  events,
  loading,
}: {
  events: TrainingEvent[];
  loading: boolean;
}) {
  const groups: { label: string; items: TrainingEvent[] }[] = [
    {
      label: "Lehrkräfte",
      items: events.filter((e) => e.audience === "teacher"),
    },
    {
      label: "Schulleitungen",
      items: events.filter((e) => e.audience === "leadership"),
    },
  ];

  return (
    <section
      aria-labelledby="events-heading"
      className="rounded-2xl border border-border bg-white p-5 shadow-sm md:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="events-heading" className="text-base font-bold text-text">
          Alle Schulungen
        </h2>
        <a
          href="https://www.digiki-os.de/fuer-schulen#kos-fortbildungen"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Termine auf der Website
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-text-light">Lade Schulungen …</p>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {groups.map((group) => (
            <div key={group.label}>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-text">
                {group.label} · {group.items.length}{" "}
                {group.items.length === 1 ? "Termin" : "Termine"}
              </h3>
              <ul className="mt-2 divide-y divide-border/60">
                {group.items.map((event) => {
                  const parts = dateParts(event.start_date);
                  return (
                    <li
                      key={event.id}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-bg px-1.5 py-1.5 text-center">
                        {parts ? (
                          <>
                            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-light">
                              {parts.weekday}
                            </span>
                            <span className="text-lg font-bold leading-none text-primary tabular-nums">
                              {parts.day}
                            </span>
                            <span className="text-[9px] font-medium uppercase text-text-light">
                              {parts.month} {parts.year}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-text-light">–</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-text">
                          {event.kurs_nr}
                        </p>
                        <p className="truncate text-[11px] text-text-light">
                          {event.title}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${
                          (event.registration_count ?? 0) > 0
                            ? "bg-primary/10 text-primary"
                            : "bg-bg text-text-light"
                        }`}
                      >
                        {event.registration_count ?? 0} Anm.
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
