// Server-gerenderte Chart-Primitive für die Bestandsaufnahme-Auswertung.
// Kein Client-JS, kein Chart.js – alles Tailwind-Divs und Inline-SVG.
// Stadt = primary teal, Landkreis = primary-light türkis.

import type { Bucket, Totals } from "@/lib/bestandsaufnahme/aggregations";

// ── HBarGroup ───────────────────────────────────────────────────────────
// Horizontale Balken pro Option, Stadt und Landkreis als Doppelreihe.
// Werte werden als % der jeweiligen Stadt-/Landkreis-Gesamtzahl angezeigt,
// damit n=5 Stadt vs. n=15 Landkreis fair vergleichbar bleibt.

interface HBarGroupProps {
  buckets: Bucket[];
  totals: Totals;
  /** Sortierung: nach Gesamtzahl absteigend (default) oder Reihenfolge der Optionen */
  sort?: "byTotal" | "given";
  /** Maximale Anzahl Zeilen (z. B. Top-10) */
  limit?: number;
  /** Zeige nur Optionen, die mindestens einmal genannt wurden */
  hideEmpty?: boolean;
  /** Anzeigemodus: Anteil je Bezirk (default) oder absolute Zahlen */
  mode?: "percent" | "absolute";
}

export function HBarGroup({
  buckets,
  totals,
  sort = "byTotal",
  limit,
  hideEmpty = false,
  mode = "percent",
}: HBarGroupProps) {
  let data = buckets;
  if (hideEmpty) data = data.filter((b) => b.total > 0);
  if (sort === "byTotal")
    data = [...data].sort((a, b) => b.total - a.total);
  if (limit) data = data.slice(0, limit);

  if (data.length === 0) {
    return <EmptyMessage />;
  }

  // Skala: bei "percent" 0–100, bei "absolute" 0–maxCount
  const maxAbs = Math.max(...data.flatMap((b) => [b.stadt, b.land]), 1);

  const scale = (v: number, total: number): number => {
    if (mode === "percent") {
      return total > 0 ? (v / total) * 100 : 0;
    }
    return (v / maxAbs) * 100;
  };

  const formatCount = (v: number, total: number): string => {
    if (mode === "percent") {
      const pct = total > 0 ? Math.round((v / total) * 100) : 0;
      return `${pct} %`;
    }
    return String(v);
  };

  return (
    <ul className="space-y-3.5">
      {data.map((b) => (
        <li key={b.option}>
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <span className="text-[13px] text-text leading-snug">
              {b.option}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-text-light shrink-0">
              {b.stadt + b.land}
            </span>
          </div>
          <div className="space-y-1">
            <Row
              label="Stadt"
              value={b.stadt}
              total={totals.stadt}
              widthPct={scale(b.stadt, totals.stadt)}
              color="bg-primary"
              count={formatCount(b.stadt, totals.stadt)}
            />
            <Row
              label="Land"
              value={b.land}
              total={totals.land}
              widthPct={scale(b.land, totals.land)}
              color="bg-primary-light"
              count={formatCount(b.land, totals.land)}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Row({
  label,
  widthPct,
  color,
  count,
}: {
  label: string;
  value: number;
  total: number;
  widthPct: number;
  color: string;
  count: string;
}) {
  return (
    <div className="grid grid-cols-[2.25rem_1fr_2.75rem] items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-light/80">
        {label}
      </span>
      <div className="relative h-2 rounded-full bg-border/60 overflow-hidden">
        <span
          className={`absolute inset-y-0 left-0 ${color} rounded-full transition-[width] duration-700`}
          style={{ width: `${Math.max(widthPct, widthPct > 0 ? 1.5 : 0)}%` }}
        />
      </div>
      <span className="font-mono text-[11px] tabular-nums text-text-light text-right">
        {count}
      </span>
    </div>
  );
}

// ── VBar ────────────────────────────────────────────────────────────────
// Vertikale Säulen (z. B. Verteilung 1-5) mit Stadt- und Landkreis-Anteil
// nebeneinander.

interface VBarProps {
  buckets: Bucket[];
  totals: Totals;
  yLabel?: string;
}

export function VBar({ buckets, totals }: VBarProps) {
  const stadtPct = (b: Bucket) =>
    totals.stadt > 0 ? (b.stadt / totals.stadt) * 100 : 0;
  const landPct = (b: Bucket) =>
    totals.land > 0 ? (b.land / totals.land) * 100 : 0;
  const maxPct = Math.max(
    ...buckets.flatMap((b) => [stadtPct(b), landPct(b)]),
    10
  );

  if (buckets.every((b) => b.total === 0)) {
    return <EmptyMessage />;
  }

  return (
    <div>
      <div className="flex items-end gap-3 h-44 px-1 border-b border-border">
        {buckets.map((b) => {
          const sH = (stadtPct(b) / maxPct) * 100;
          const lH = (landPct(b) / maxPct) * 100;
          return (
            <div
              key={b.option}
              className="flex-1 flex items-end justify-center gap-1.5 h-full"
            >
              <div
                className="w-1/2 max-w-[28px] bg-primary rounded-t-sm relative group"
                style={{ height: `${Math.max(sH, b.stadt > 0 ? 2 : 0)}%` }}
              >
                {b.stadt > 0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[10px] tabular-nums text-primary">
                    {b.stadt}
                  </span>
                )}
              </div>
              <div
                className="w-1/2 max-w-[28px] bg-primary-light rounded-t-sm relative"
                style={{ height: `${Math.max(lH, b.land > 0 ? 2 : 0)}%` }}
              >
                {b.land > 0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[10px] tabular-nums text-primary-light">
                    {b.land}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 px-1 mt-1.5">
        {buckets.map((b) => (
          <div key={b.option} className="flex-1 text-center">
            <span className="font-mono text-[11px] text-text-light tabular-nums">
              {b.option}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Donut ───────────────────────────────────────────────────────────────
// SVG-Donut mit beliebig vielen Segmenten.

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <EmptyMessage />;

  const radius = 56;
  const stroke = 18;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg
        width={150}
        height={150}
        viewBox="0 0 150 150"
        className="shrink-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={75}
          cy={75}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={stroke}
          opacity={0.5}
        />
        {segments.map((seg, i) => {
          if (seg.value === 0) return null;
          const len = (seg.value / total) * circumference;
          const dasharray = `${len} ${circumference - len}`;
          const el = (
            <circle
              key={`${seg.label}-${i}`}
              cx={75}
              cy={75}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={dasharray}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="min-w-0">
        {(centerValue || centerLabel) && (
          <div className="mb-3">
            {centerValue && (
              <p className="font-bold text-2xl text-primary tabular-nums leading-none">
                {centerValue}
              </p>
            )}
            {centerLabel && (
              <p className="text-[11px] uppercase tracking-[0.1em] text-text-light mt-1">
                {centerLabel}
              </p>
            )}
          </div>
        )}
        <ul className="space-y-1.5">
          {segments
            .filter((s) => s.value > 0)
            .map((seg) => (
              <li
                key={seg.label}
                className="flex items-center gap-2 text-[12px] leading-snug"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-text">{seg.label}</span>
                <span className="ml-auto font-mono tabular-nums text-text-light">
                  {seg.value}
                </span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

// ── KPI ─────────────────────────────────────────────────────────────────

interface KPIProps {
  label: string;
  value: string | number;
  sub?: string;
  variant?: "default" | "stadt" | "land" | "warn" | "good";
}

const KPI_VARIANTS: Record<NonNullable<KPIProps["variant"]>, string> = {
  default: "border-l-border",
  stadt: "border-l-primary",
  land: "border-l-primary-light",
  warn: "border-l-red-500",
  good: "border-l-emerald-500",
};

export function KPI({ label, value, sub, variant = "default" }: KPIProps) {
  return (
    <div
      className={`relative bg-white rounded-xl border border-border border-l-4 p-5 shadow-sm overflow-hidden ${KPI_VARIANTS[variant]}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-light leading-snug">
        {label}
      </p>
      <p className="font-bold text-3xl md:text-[2.1rem] text-primary tabular-nums mt-2 leading-none tracking-tight">
        {value}
      </p>
      {sub && (
        <p className="text-[12px] text-text-light leading-snug mt-2">{sub}</p>
      )}
    </div>
  );
}

// ── Insight ─────────────────────────────────────────────────────────────

export function Insight({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: "info" | "warn" | "good";
}) {
  const map = {
    info: "border-accent-strong/60 bg-accent/5",
    warn: "border-red-400/60 bg-red-50",
    good: "border-emerald-400/60 bg-emerald-50",
  };
  return (
    <div
      className={`relative mt-5 rounded-xl border-l-4 ${map[variant]} px-5 py-4`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-strong mb-1.5">
        Erkenntnis
      </p>
      <div className="text-[13.5px] text-text leading-relaxed [&_strong]:text-text [&_strong]:font-semibold">
        {children}
      </div>
    </div>
  );
}

// ── Card (Sektions-Karte) ───────────────────────────────────────────────

export function Card({
  title,
  children,
  meta,
}: {
  title: string;
  children: React.ReactNode;
  meta?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-3 mb-5">
        <h3 className="text-[15px] font-bold text-primary leading-tight">
          {title}
        </h3>
        {meta && (
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-light shrink-0">
            {meta}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Legende ─────────────────────────────────────────────────────────────

export function Legend() {
  return (
    <div className="inline-flex items-center gap-5 text-[11px] text-text-light">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
        Stadt Osnabrück
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary-light" />
        Landkreis Osnabrück
      </span>
    </div>
  );
}

function EmptyMessage() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-bg/50 px-4 py-6 text-center">
      <p className="text-xs text-text-light">
        Noch keine Daten in dieser Kategorie.
      </p>
    </div>
  );
}
