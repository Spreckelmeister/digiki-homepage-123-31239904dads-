"use client";

import { useCallback, useRef, useState } from "react";
import {
  Upload,
  Download,
  X,
  ImageIcon as LucideImage,
  ShieldCheck,
  Loader2,
  FileDown,
} from "lucide-react";

const MAX_WIDTH_PRESETS = [
  { value: 800, label: "Klein · 800 px", hint: "Mail, Dokumente" },
  { value: 1280, label: "Mittel · 1280 px", hint: "Moodle, IServ, Web" },
  { value: 1920, label: "Groß · 1920 px", hint: "HD-Präsentation" },
];

type Status = "pending" | "processing" | "done" | "error";

interface ProcessedImage {
  id: string;
  file: File;
  originalSize: number;
  previewUrl: string;
  resultBlob?: Blob;
  resultUrl?: string;
  resultSize?: number;
  width?: number;
  height?: number;
  resultWidth?: number;
  resultHeight?: number;
  status: Status;
  error?: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

async function processImage(
  file: File,
  maxWidth: number,
  quality: number
): Promise<{
  blob: Blob;
  url: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}> {
  const bitmap = await createImageBitmap(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;

  const scale = Math.min(1, maxWidth / originalWidth);
  const width = Math.round(originalWidth * scale);
  const height = Math.round(originalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas-Kontext nicht verfügbar");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) throw new Error("Export fehlgeschlagen");
  const url = URL.createObjectURL(blob);
  return { blob, url, width, height, originalWidth, originalHeight };
}

export default function BildKompressor() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [maxWidth, setMaxWidth] = useState(1280);
  const [quality, setQuality] = useState(0.82);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (fileArray.length === 0) return;

      const newEntries: ProcessedImage[] = fileArray.map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        originalSize: f.size,
        previewUrl: URL.createObjectURL(f),
        status: "processing",
      }));
      setImages((prev) => [...newEntries, ...prev]);

      // Sequenziell verarbeiten, damit Browser nicht einfriert.
      for (const entry of newEntries) {
        try {
          const result = await processImage(entry.file, maxWidth, quality);
          setImages((prev) =>
            prev.map((img) =>
              img.id === entry.id
                ? {
                    ...img,
                    status: "done",
                    resultBlob: result.blob,
                    resultUrl: result.url,
                    resultSize: result.blob.size,
                    width: result.originalWidth,
                    height: result.originalHeight,
                    resultWidth: result.width,
                    resultHeight: result.height,
                  }
                : img
            )
          );
        } catch (e) {
          setImages((prev) =>
            prev.map((img) =>
              img.id === entry.id
                ? {
                    ...img,
                    status: "error",
                    error: e instanceof Error ? e.message : "Fehler",
                  }
                : img
            )
          );
        }
      }
    },
    [maxWidth, quality]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const reprocessAll = useCallback(async () => {
    const current = images.filter((i) => i.status !== "error");
    setImages((prev) =>
      prev.map((i) => (i.status !== "error" ? { ...i, status: "processing" as const } : i))
    );
    for (const entry of current) {
      try {
        if (entry.resultUrl) URL.revokeObjectURL(entry.resultUrl);
        const result = await processImage(entry.file, maxWidth, quality);
        setImages((prev) =>
          prev.map((img) =>
            img.id === entry.id
              ? {
                  ...img,
                  status: "done",
                  resultBlob: result.blob,
                  resultUrl: result.url,
                  resultSize: result.blob.size,
                  resultWidth: result.width,
                  resultHeight: result.height,
                }
              : img
          )
        );
      } catch (e) {
        setImages((prev) =>
          prev.map((img) =>
            img.id === entry.id
              ? { ...img, status: "error", error: e instanceof Error ? e.message : "Fehler" }
              : img
          )
        );
      }
    }
  }, [images, maxWidth, quality]);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      if (target?.resultUrl) URL.revokeObjectURL(target.resultUrl);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const downloadOne = useCallback((img: ProcessedImage) => {
    if (!img.resultUrl) return;
    const a = document.createElement("a");
    a.href = img.resultUrl;
    const name = img.file.name.replace(/\.[^.]+$/, "");
    a.download = `${name}-komprimiert.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const downloadAll = useCallback(() => {
    images
      .filter((i) => i.status === "done" && i.resultUrl)
      .forEach((img, i) => {
        // Kleines Delay zwischen Downloads, einige Browser blocken Parallel-Downloads
        setTimeout(() => downloadOne(img), i * 200);
      });
  }, [images, downloadOne]);

  const doneImages = images.filter((i) => i.status === "done");
  const totalOriginal = doneImages.reduce((n, i) => n + i.originalSize, 0);
  const totalResult = doneImages.reduce((n, i) => n + (i.resultSize ?? 0), 0);
  const saving =
    totalOriginal > 0 ? 1 - totalResult / totalOriginal : 0;

  return (
    <div className="space-y-8">
      {/* Drop-Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`relative rounded-2xl border-2 border-dashed p-8 md:p-14 text-center cursor-pointer transition-all ${
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border bg-white hover:border-primary/40 hover:bg-primary/[0.02]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Upload className="h-8 w-8 text-primary" aria-hidden="true" strokeWidth={1.5} />
        </div>
        <p className="text-lg md:text-xl font-bold text-text mb-1">
          Bilder hierher ziehen oder klicken
        </p>
        <p className="text-sm text-text-light">
          Mehrere Bilder gleichzeitig möglich · JPG, PNG, WEBP, HEIC
        </p>
      </div>

      {/* Einstellungen */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-6 items-start rounded-xl bg-white border border-border p-5 md:p-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-2.5">
            Maximale Breite
          </p>
          <div className="grid grid-cols-3 gap-2">
            {MAX_WIDTH_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setMaxWidth(p.value)}
                aria-pressed={maxWidth === p.value}
                className={`rounded-lg border px-2 py-2 text-left transition-all ${
                  maxWidth === p.value
                    ? "border-primary bg-primary/5"
                    : "border-border bg-white hover:border-primary/40"
                }`}
              >
                <div className="text-xs font-bold text-text">{p.label}</div>
                <div className="text-[10px] text-text-light font-mono mt-0.5">
                  {p.hint}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
              Qualität (JPEG)
            </p>
            <span className="text-xs font-mono tabular-nums text-text">
              {Math.round(quality * 100)} %
            </span>
          </div>
          <input
            type="range"
            min={0.4}
            max={0.95}
            step={0.01}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] font-mono text-text-light/70 mt-1">
            <span>klein</span>
            <span>ausgewogen</span>
            <span>hoch</span>
          </div>
        </div>
        <button
          type="button"
          onClick={reprocessAll}
          disabled={images.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-bold text-text hover:border-primary/40 transition-colors disabled:opacity-40 self-end"
        >
          Erneut anwenden
        </button>
      </div>

      {/* Ergebnis-Leiste */}
      {doneImages.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl bg-primary text-white p-5 shadow-sm">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent/90 mb-1">
              Gesamt-Ersparnis
            </p>
            <p className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums">
              {Math.round(saving * 100)} %
            </p>
            <p className="text-xs text-white/75 mt-0.5 font-mono">
              {formatBytes(totalOriginal)} → {formatBytes(totalResult)}
            </p>
          </div>
          <button
            type="button"
            onClick={downloadAll}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-bold text-text hover:bg-accent-hover transition-colors"
          >
            <FileDown className="h-4 w-4" aria-hidden="true" />
            Alle herunterladen
          </button>
        </div>
      )}

      {/* Bilder-Liste */}
      {images.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((img) => (
            <li
              key={img.id}
              className="relative rounded-xl bg-white border border-border overflow-hidden shadow-sm"
            >
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute top-2 right-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-text-light hover:text-red-700 shadow-sm"
                aria-label="Entfernen"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="relative aspect-[16/9] bg-bg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.previewUrl}
                  alt={img.file.name}
                  className="w-full h-full object-cover"
                />
                {img.status === "processing" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <p className="text-sm font-bold text-text truncate" title={img.file.name}>
                  <LucideImage className="inline h-4 w-4 mr-1 text-text-light" aria-hidden="true" />
                  {img.file.name}
                </p>
                {img.status === "done" && img.resultSize !== undefined && (
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <div className="text-text-light">Original</div>
                      <div className="text-text">
                        {formatBytes(img.originalSize)}
                        {img.width && img.height && (
                          <span className="text-text-light">
                            {" · "}
                            {img.width}×{img.height}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-accent-strong">Komprimiert</div>
                      <div className="text-primary font-bold">
                        {formatBytes(img.resultSize)}
                        {img.resultWidth && img.resultHeight && (
                          <span className="text-text-light font-normal">
                            {" · "}
                            {img.resultWidth}×{img.resultHeight}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {img.status === "error" && (
                  <p className="text-xs text-red-700">{img.error}</p>
                )}
                {img.status === "done" && (
                  <button
                    type="button"
                    onClick={() => downloadOne(img)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary/90 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Herunterladen
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4 text-xs text-text leading-relaxed">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          <strong>Datenschutz:</strong> Die Bilder werden im Browser verarbeitet
          und niemals hochgeladen. Wenn Sie die Seite schließen, sind die
          Daten weg.
        </p>
      </div>
    </div>
  );
}
