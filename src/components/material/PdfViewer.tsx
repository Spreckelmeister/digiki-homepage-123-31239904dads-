"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * PDF-Ansicht ohne Browser-Leiste (kein Download-/Druck-Knopf): Die Seiten
 * werden mit pdf.js auf Canvas gezeichnet – erst dann, wenn sie in den
 * sichtbaren Bereich kommen. Funktioniert so auch auf iPads, die PDFs im
 * iframe nur einseitig zeigen.
 */
export default function PdfViewer({ url, title }: { url: string; title: string }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [ratio, setRatio] = useState(1.414);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        // Worker als statische Datei (scripts/copy-ffmpeg-core.mjs).
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.mjs";
        loaded = await pdfjs.getDocument({ url }).promise;
        const first = await loaded.getPage(1);
        const vp = first.getViewport({ scale: 1 });
        if (cancelled) {
          void loaded.loadingTask.destroy();
          return;
        }
        setRatio(vp.height / vp.width);
        setDoc(loaded);
      } catch (e) {
        console.error("[PdfViewer]", e);
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      void loaded?.loadingTask.destroy();
    };
  }, [url]);

  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-border bg-white p-8 text-text-light">
        Das Dokument konnte nicht geladen werden. Bitte laden Sie die Seite neu.
      </p>
    );
  }
  if (!doc) return <p className="text-text-light">Dokument wird geladen …</p>;

  return (
    <div
      role="document"
      aria-label={title}
      onContextMenu={(e) => e.preventDefault()}
      className="space-y-4 select-none"
    >
      {Array.from({ length: doc.numPages }, (_, i) => (
        <PdfPage key={i} doc={doc} pageNumber={i + 1} ratio={ratio} total={doc.numPages} />
      ))}
    </div>
  );
}

function PdfPage({
  doc,
  pageNumber,
  ratio,
  total,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  ratio: number;
  total: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [pageRatio, setPageRatio] = useState(ratio);

  // Erst zeichnen, wenn die Seite (fast) im Bild ist.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "800px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    let cancelled = false;
    let task: { cancel: () => void } | null = null;
    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      setPageRatio(base.height / base.width);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({
        scale: (wrap.clientWidth / base.width) * dpr,
      });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const renderTask = page.render({ canvas, viewport });
      task = renderTask;
      await renderTask.promise.catch(() => {
        /* abgebrochen */
      });
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, doc, pageNumber]);

  return (
    <div
      ref={wrapRef}
      className="mx-auto w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-white shadow-sm"
      style={{ aspectRatio: `1 / ${pageRatio}` }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Seite ${pageNumber} von ${total}`}
        className="block h-full w-full"
      />
    </div>
  );
}
