"use client";

import { useEffect, useRef } from "react";
import { Maximize2 } from "lucide-react";
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
 */
export default function HtmlViewer({
  id,
  title,
  progress,
}: {
  id: string;
  title: string;
  progress: MaterialProgress;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);

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
    <div>
      <div className="mb-3 flex justify-end">
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
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
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
        className="block h-[80vh] min-h-[480px] w-full rounded-xl border border-border bg-white shadow-sm"
      />
    </div>
  );
}
