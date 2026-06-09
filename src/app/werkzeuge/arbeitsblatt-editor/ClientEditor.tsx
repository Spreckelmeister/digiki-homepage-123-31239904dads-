"use client";

import dynamic from "next/dynamic";

/**
 * Der Arbeitsblatt-Editor ist eine reine Browser-App (localStorage, window,
 * contentEditable, Drag&Drop). Deshalb laden wir ihn ausschließlich client-
 * seitig (ssr: false) – das vermeidet Hydration-/SSR-Probleme und hält die
 * schwere Editor-Logik aus dem Server-Bundle heraus.
 */
const ArbeitsblattEditor = dynamic(() => import("./editor/App"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-[clamp(560px,82vh,940px)] w-full items-center justify-center rounded-[18px] border border-border bg-white"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 text-text-light">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        <span className="text-sm font-medium">Editor wird geladen …</span>
      </div>
    </div>
  ),
});

export default function ClientEditor() {
  return <ArbeitsblattEditor />;
}
