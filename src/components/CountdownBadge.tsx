"use client";

import { useState, useEffect } from "react";
import { CalendarDays, CheckCircle2, X } from "lucide-react";

const TARGET_DATE = new Date("2026-04-15T00:00:00");

function getDaysUntil(target: Date): number {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function CountdownBadge() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDaysLeft(getDaysUntil(TARGET_DATE));

    const interval = setInterval(() => {
      setDaysLeft(getDaysUntil(TARGET_DATE));
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  if (dismissed || daysLeft === null) return null;

  const hasStarted = daysLeft <= 0;

  return (
    <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-sm text-white">
      {hasStarted ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-teal" aria-hidden="true" />
          <span className="font-medium">Projekt gestartet!</span>
        </>
      ) : (
        <>
          <CalendarDays className="w-4 h-4 text-teal" aria-hidden="true" />
          <span className="font-medium">
            Start in {daysLeft} {daysLeft === 1 ? "Tag" : "Tagen"}
          </span>
        </>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="ml-1 rounded-full p-0.5 hover:bg-white/20 transition-colors"
        aria-label="Countdown-Hinweis schließen"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
