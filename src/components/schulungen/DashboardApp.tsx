"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  School,
  Users,
} from "lucide-react";
import type {
  ConflictItem,
  OverviewResponse,
} from "@/lib/schulungen/types";
import UploadCard from "./UploadCard";
import SchoolsPanel from "./SchoolsPanel";
import ConflictsTable from "./ConflictsTable";
import EventsTable from "./EventsTable";
import AccessPanel from "./AccessPanel";
import DangerZone from "./DangerZone";

export default function DashboardApp({ isAdmin }: { isAdmin: boolean }) {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [conflictsError, setConflictsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [overviewRes, conflictsRes] = await Promise.all([
        fetch("/api/schulungen/overview"),
        fetch("/api/schulungen/conflicts?status=open"),
      ]);
      if (!overviewRes.ok) {
        const body = await overviewRes.json().catch(() => null);
        throw new Error(body?.error ?? "Daten konnten nicht geladen werden");
      }
      setOverview((await overviewRes.json()) as OverviewResponse);
      if (conflictsRes.ok) {
        const body = (await conflictsRes.json()) as { conflicts: ConflictItem[] };
        setConflicts(body.conflicts);
        setConflictsError(null);
      } else {
        const body = await conflictsRes.json().catch(() => null);
        setConflictsError(body?.error ?? "Konflikte konnten nicht geladen werden");
      }
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Daten konnten nicht geladen werden"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = overview?.stats;
  const schoolsValue =
    loading || !stats
      ? "–"
      : `${stats.schools_registered}/${stats.schools_total}`;

  return (
    <main className="bg-bg pb-16">
      <div className="mx-auto max-w-7xl space-y-6 px-4 pt-8 sm:px-6 lg:px-8">
        {/* Stat-Karten */}
        <section
          aria-label="Kennzahlen"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatCard
            icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
            label="Schulungen"
            value={loading ? "–" : String(stats?.events_total ?? 0)}
            hint="Termine gesamt"
          />
          <StatCard
            icon={<Users className="h-4 w-4" aria-hidden="true" />}
            label="Anmeldungen"
            value={loading ? "–" : String(stats?.registrations_total ?? 0)}
            hint="aktiv"
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
            label="Offene Konflikte"
            value={loading ? "–" : String(stats?.conflicts_open ?? 0)}
            hint={stats && stats.conflicts_open > 0 ? "bitte prüfen" : "alles klar"}
            tone={stats && stats.conflicts_open > 0 ? "warn" : "default"}
          />
          {/* Akzent-Karte: angemeldete Schulen */}
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-light p-5 text-white shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
              <School className="h-4 w-4" aria-hidden="true" />
              Schulen angemeldet
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums">
                {schoolsValue}
              </span>
              <span className="text-xs text-white/80">
                {!loading && stats && stats.schools_total > 0
                  ? `${stats.schools_total - stats.schools_registered} offen`
                  : "von berechtigt"}
              </span>
            </div>
          </div>
        </section>

        {loadError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {loadError}
          </div>
        )}

        {/* Import (volle Breite) */}
        <UploadCard events={overview?.events ?? []} onImported={refresh} />

        {/* Konflikte */}
        <ConflictsTable
          conflicts={conflicts}
          onResolved={refresh}
          loading={loading}
          error={conflictsError}
        />

        {/* Alle Schulen + Quoten (volle Breite, Raster) */}
        <SchoolsPanel schools={overview?.schools ?? []} loading={loading} />

        {/* Alle Schulungen */}
        <EventsTable events={overview?.events ?? []} loading={loading} />

        {/* Admin-Bereich: Zugriff verwalten + Daten zurücksetzen */}
        {isAdmin && (
          <>
            <AccessPanel />
            <DangerZone onReset={refresh} />
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${
            tone === "warn"
              ? "bg-accent/15 text-accent-text"
              : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={`text-3xl font-bold tabular-nums ${
            tone === "warn" ? "text-accent-text" : "text-primary"
          }`}
        >
          {value}
        </span>
        <span className="text-xs text-text-light">{hint}</span>
      </div>
    </div>
  );
}
