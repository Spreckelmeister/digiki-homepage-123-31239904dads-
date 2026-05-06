"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, X, ArrowRight } from "lucide-react";

const EVENT_ID = "2026-05-08";
const EVENT_END_ISO = "2026-05-08T13:00:00+02:00";
const STORAGE_KEY = `digiki-info-banner-${EVENT_ID}`;

export default function InfoEventBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (new Date() > new Date(EVENT_END_ISO)) return;
    if (localStorage.getItem(STORAGE_KEY) === "dismissed") return;
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
      className="relative bg-primary text-white print:hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2.5 pr-12 sm:pr-14">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
          <p className="flex items-start sm:items-center gap-2 leading-snug">
            <CalendarDays
              className="w-4 h-4 mt-0.5 sm:mt-0 shrink-0 text-accent"
              aria-hidden="true"
            />
            <span>
              <span className="font-semibold">Online-Infoveranstaltung:</span>{" "}
              Freitag, 8. Mai 2026 um 12:00 Uhr per Microsoft Teams.
            </span>
          </p>
          <Link
            href="/#aktuelles"
            className="inline-flex items-center gap-1.5 self-start sm:self-auto sm:ml-auto rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-text hover:bg-accent-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Zu den Details
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hinweis schließen"
        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-md p-1.5 text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </aside>
  );
}
