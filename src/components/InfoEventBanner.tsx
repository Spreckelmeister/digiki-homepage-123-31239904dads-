"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";

const EVENT_DATE_ISO = "2026-05-08T12:00:00+02:00";
const EVENT_END_ISO = "2026-05-08T13:00:00+02:00";
const STORAGE_KEY = "digiki-info-banner-2026-05-08";

function relativeLabel(daysUntil: number): string {
  if (daysUntil <= 0) return "Heute";
  if (daysUntil === 1) return "Morgen";
  if (daysUntil === 2) return "Übermorgen";
  return `in ${daysUntil} Tagen`;
}

export default function InfoEventBanner() {
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (new Date() > new Date(EVENT_END_ISO)) return;
    if (localStorage.getItem(STORAGE_KEY) === "dismissed") return;

    const now = new Date();
    const event = new Date(EVENT_DATE_ISO);
    // Auf Mitternacht des Eventtags abrunden, damit „Heute / Morgen" korrekt
    // ist – unabhängig von der Uhrzeit, zu der die Seite aufgerufen wird.
    const eventMidnight = new Date(event);
    eventMidnight.setHours(0, 0, 0, 0);
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    const days = Math.round(
      (eventMidnight.getTime() - todayMidnight.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    setCountdown(relativeLabel(days));
    setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      role="region"
      aria-label="Hinweis auf Online-Informationsveranstaltung"
      className="info-banner relative isolate overflow-hidden border-b border-primary/15 bg-bg print:hidden"
    >
      {/* Atmosphärische Akzente: weicher Türkis-Lichtschein rechts und ein dünner
          Trennstrich links – setzt eine editoriale "Kicker-Leiste"-Stimmung */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div
          className="absolute -top-16 right-[-4rem] h-40 w-[28rem] opacity-[0.10]"
          style={{
            background:
              "radial-gradient(closest-side, var(--color-primary-light), transparent)",
          }}
        />
        <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-primary-light via-primary to-primary/0" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pl-5 pr-12 sm:px-6 sm:pr-14 lg:px-8 lg:pl-10">
        <div className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-center sm:gap-5 sm:py-2">
          {/* Live-Indikator + Eyebrow */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span
              className="relative flex h-2 w-2 shrink-0"
              aria-hidden="true"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-light opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary">
              Offene Infoveranstaltung
            </span>
            {countdown && (
              <span className="rounded-full border border-primary/20 bg-white px-2 py-[1px] text-[10px] font-semibold tracking-wide text-primary">
                {countdown}
              </span>
            )}
          </div>

          {/* Vertikaler Trenner – nur Desktop */}
          <span
            aria-hidden="true"
            className="hidden h-3.5 w-px bg-primary/25 sm:block"
          />

          {/* Termin-Info */}
          <p className="text-[13px] leading-snug text-text sm:text-sm">
            <span className="font-semibold tabular-nums tracking-tight">
              Freitag, 8. Mai · 12:00 Uhr
            </span>
            <span className="text-text-light"> per Microsoft Teams</span>
          </p>

          {/* CTA – schiebt sich rechts ans Ende */}
          <Link
            href="/#aktuelles"
            className="group mt-0.5 inline-flex w-fit items-center gap-1.5 self-start text-[12.5px] font-bold tracking-wide text-primary transition-colors hover:text-accent-strong sm:ml-auto sm:mt-0 sm:self-auto"
          >
            <span className="border-b border-primary/40 pb-px transition-colors group-hover:border-accent-strong">
              Jetzt anmelden
            </span>
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>

      {/* Schließen */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hinweis schließen"
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-text-light transition-colors hover:bg-primary/10 hover:text-primary sm:top-1/2 sm:-translate-y-1/2"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </aside>
  );
}
