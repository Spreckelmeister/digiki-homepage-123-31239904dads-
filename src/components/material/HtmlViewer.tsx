"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Maximize2 } from "lucide-react";
import {
  PROGRESS_MARKER,
  progressFrameName,
  sanitizeProgress,
  type MaterialProgress,
} from "@/lib/material/shared";

/**
 * Zeigt Schulungsmaterial vom Typ HTML in einem abgeschotteten Rahmen.
 * Der Inhalt kommt von /schulungsmaterial/inhalt/[id] und läuft dort ohne
 * Zugriff auf unsere Seite (siehe Route). `sandbox` hier ist der zweite
 * Riegel – bewusst OHNE allow-same-origin.
 *
 * Fortschritt: Die Lerneinheit bekommt ihren gespeicherten Stand über das
 * name-Attribut des Rahmens und meldet Änderungen per Nachricht zurück.
 * Gespeichert wird hier – mit der Anmeldung dieser Seite, an die die
 * Lerneinheit selbst nicht herankommt.
 *
 * Anzeige: Die Lerneinheit füllt immer das ganze Browserfenster (über Kopf-
 * und Fußbereich der Seite), mit einer schmalen Leiste zum Zurückgehen. Das
 * echte Bildschirm-Vollbild darf ein Browser nur nach einem Klick starten –
 * dafür bleibt der Knopf „Vollbild".
 */
export default function HtmlViewer({
  id,
  title,
  progress,
  preview = false,
}: {
  id: string;
  title: string;
  progress: MaterialProgress;
  /** Noch nicht freigeschaltet (Vorschau für Admins). */
  preview?: boolean;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Die Seite darunter soll nicht mitscrollen.
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, []);

  useEffect(() => {
    let pending: MaterialProgress | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = (keepalive = false) => {
      if (timer) clearTimeout(timer);
      timer = null;
      if (!pending) return;
      const data = pending;
      pending = null;
      // Scheitert das Speichern, läuft die Lerneinheit normal weiter – der
      // Stand gilt dann nur bis zum Schließen der Seite.
      void fetch("/api/schulungsmaterial/fortschritt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, data }),
        keepalive,
      }).catch(() => {});
    };

    const onMessage = (event: MessageEvent) => {
      // Nur Nachrichten aus genau diesem Rahmen.
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return;
      const message = event.data as { [PROGRESS_MARKER]?: unknown; type?: unknown; data?: unknown } | null;
      if (!message || message[PROGRESS_MARKER] !== 1 || message.type !== "storage") return;
      const data = sanitizeProgress(message.data);
      if (!data) return;
      pending = data;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => flush(), 800);
    };

    // Beim Verlassen der Seite den letzten Stand noch abschicken.
    const onHide = () => flush(true);

    window.addEventListener("message", onMessage);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("pagehide", onHide);
      flush(true);
    };
  }, [id]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white">
      <div className="flex flex-none items-center gap-3 bg-primary px-3 py-2 text-white sm:px-4">
        <Link
          href="/schulungsmaterial"
          className="inline-flex flex-none items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Zurück zum Schulungsmaterial</span>
          <span className="sm:hidden">Zurück</span>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">
          {title}
        </h1>
        {preview && (
          <p className="hidden flex-none rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-900 md:block">
            Vorschau – noch nicht freigeschaltet
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            const frame = frameRef.current;
            // iPhones kennen kein Vollbild für eingebettete Seiten – dort die
            // Lerneinheit in einem eigenen Tab öffnen (bleibt abgeschottet).
            // Dort gilt der Stand nur für diesen Tab: ohne umgebende Seite
            // kann nichts gespeichert werden.
            if (frame?.requestFullscreen && document.fullscreenEnabled) {
              void frame.requestFullscreen();
            } else {
              window.open(`/schulungsmaterial/inhalt/${id}`, "_blank", "noopener");
            }
          }}
          className="inline-flex flex-none items-center gap-2 rounded-lg border border-white/40 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white transition-colors"
        >
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
          Vollbild
        </button>
      </div>
      <iframe
        ref={frameRef}
        name={progressFrameName(progress)}
        src={`/schulungsmaterial/inhalt/${id}`}
        title={title}
        sandbox="allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        // clipboard-write: „Kopieren"-Knöpfe in den Lerneinheiten.
        allow="fullscreen; clipboard-write"
        className="block min-h-0 w-full flex-1 border-0 bg-white"
      />
    </div>
  );
}
