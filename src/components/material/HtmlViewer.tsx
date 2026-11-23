"use client";

import { useRef } from "react";
import { Maximize2 } from "lucide-react";

/**
 * Zeigt Schulungsmaterial vom Typ HTML in einem abgeschotteten Rahmen.
 * Der Inhalt kommt von /schulungsmaterial/inhalt/[id] und läuft dort ohne
 * Zugriff auf unsere Seite (siehe Route). `sandbox` hier ist der zweite
 * Riegel – bewusst OHNE allow-same-origin.
 */
export default function HtmlViewer({ id, title }: { id: string; title: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => frameRef.current?.requestFullscreen?.()}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
        >
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
          Vollbild
        </button>
      </div>
      <iframe
        ref={frameRef}
        src={`/schulungsmaterial/inhalt/${id}`}
        title={title}
        sandbox="allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        allow="fullscreen"
        className="block h-[80vh] min-h-[480px] w-full rounded-xl border border-border bg-white shadow-sm"
      />
    </div>
  );
}
