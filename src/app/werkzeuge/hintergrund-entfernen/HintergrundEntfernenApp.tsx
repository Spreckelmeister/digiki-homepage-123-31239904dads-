"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  Scissors,
  Download,
  RotateCcw,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Cpu,
  ImageIcon,
  ArrowRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// SETUP – einmalig im Projekt installieren:
//   npm i @mediapipe/selfie_segmentation
// Modell- und WASM-Dateien werden zur Laufzeit von jsDelivr nachgeladen
// (statische Modell-Dateien, keine Nutzerdaten verlassen das Gerät).
// ─────────────────────────────────────────────────────────────────────────────

interface SelfieResults {
  image: CanvasImageSource;
  segmentationMask: CanvasImageSource;
}

interface SelfieSegmentationInstance {
  setOptions: (opts: { modelSelection?: 0 | 1; selfieMode?: boolean }) => void;
  onResults: (cb: (r: SelfieResults) => void) => void;
  send: (input: { image: CanvasImageSource }) => Promise<void>;
  close: () => Promise<void>;
}

type SelfieSegmentationCtor = new (config: {
  locateFile: (file: string) => string;
}) => SelfieSegmentationInstance;

type Phase =
  | "checking"
  | "blocked"
  | "idle"
  | "ready"
  | "loading-model"
  | "processing"
  | "done"
  | "error";

interface HardwareReport {
  wasm: boolean;
  canvas: boolean;
}

function probeHardware(): HardwareReport {
  const wasm = typeof WebAssembly !== "undefined";
  let canvas = false;
  try {
    const c = document.createElement("canvas");
    canvas = !!c.getContext("2d");
  } catch {
    /* no canvas */
  }
  return { wasm, canvas };
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function HintergrundEntfernenApp() {
  const [hw, setHw] = useState<HardwareReport | null>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [errorMsg, setErrorMsg] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [originalDims, setOriginalDims] =
    useState<{ w: number; h: number } | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const segRef = useRef<SelfieSegmentationInstance | null>(null);
  const imgElRef = useRef<HTMLImageElement | null>(null);

  // ── Hardware-Check ─────────────────────────────────────────────────
  useEffect(() => {
    const report = probeHardware();
    setHw(report);
    setPhase(report.wasm && report.canvas ? "idle" : "blocked");
  }, []);

  // ── Cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      segRef.current?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Datei akzeptieren ──────────────────────────────────────────────
  const acceptFile = useCallback(
    async (f: File) => {
      if (!f.type.startsWith("image/")) {
        setErrorMsg("Bitte eine Bilddatei wählen (JPG, PNG oder WEBP).");
        return;
      }
      setErrorMsg("");
      setResultUrl(null);
      setResultBytes(null);

      if (originalUrl) URL.revokeObjectURL(originalUrl);
      const url = URL.createObjectURL(f);
      setOriginalUrl(url);
      setFile(f);
      setPhase("ready");

      try {
        const bm = await createImageBitmap(f);
        setOriginalDims({ w: bm.width, h: bm.height });
        bm.close?.();
      } catch {
        setOriginalDims(null);
      }
    },
    [originalUrl]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) acceptFile(f);
    },
    [acceptFile]
  );

  // ── Hintergrund entfernen ─────────────────────────────────────────
  const runSegmentation = useCallback(async () => {
    if (!file || !hw || !imgElRef.current) return;
    setErrorMsg("");

    try {
      // Lazy-Load von MediaPipe (paar 100 KB JS + WASM/Modell ~ 4 MB).
      if (!segRef.current) {
        setPhase("loading-model");
        const mod = (await import(
          "@mediapipe/selfie_segmentation"
        )) as unknown as { SelfieSegmentation: SelfieSegmentationCtor };
        const SelfieSegmentation = mod.SelfieSegmentation;
        const seg = new SelfieSegmentation({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
        });
        seg.setOptions({ modelSelection: 1 });
        segRef.current = seg;
      }

      setPhase("processing");

      const img = imgElRef.current;
      if (!img.complete || img.naturalWidth === 0) {
        await new Promise<void>((resolve, reject) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener(
            "error",
            () => reject(new Error("Bild konnte nicht geladen werden.")),
            { once: true }
          );
        });
      }

      const w = img.naturalWidth;
      const h = img.naturalHeight;

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const seg = segRef.current!;
        seg.onResults((results) => {
          try {
            const c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            const ctx = c.getContext("2d");
            if (!ctx) {
              reject(new Error("Canvas-Kontext nicht verfügbar."));
              return;
            }
            // 1. Maske einzeichnen (weiß = Person, schwarz/transparent = Hintergrund)
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(results.segmentationMask, 0, 0, w, h);
            // 2. Original nur dort einblenden, wo die Maske greift → Hintergrund wird transparent
            ctx.globalCompositeOperation = "source-in";
            ctx.drawImage(results.image, 0, 0, w, h);
            ctx.globalCompositeOperation = "source-over";
            resolve(c.toDataURL("image/png"));
          } catch (e) {
            reject(e);
          }
        });
        seg.send({ image: img }).catch(reject);
      });

      setResultUrl(dataUrl);
      // ungefähre Bytes-Größe der base64-PNG
      setResultBytes(Math.round((dataUrl.length * 3) / 4));
      setPhase("done");
    } catch (e) {
      const err = e as Error;
      console.error("[HintergrundEntfernen]", err);
      const technical = err?.message ? ` (${err.message})` : "";
      setErrorMsg(
        "Beim Freistellen ist ein Fehler aufgetreten. Bitte ein anderes Bild " +
          "versuchen oder die Seite neu laden." +
          technical
      );
      setPhase("error");
    }
  }, [file, hw]);

  const reset = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    setFile(null);
    setOriginalUrl(null);
    setOriginalDims(null);
    setResultUrl(null);
    setResultBytes(null);
    setPhase("idle");
    setErrorMsg("");
  }, [originalUrl]);

  const downloadResult = useCallback(() => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    const name = file.name.replace(/\.[^.]+$/, "");
    a.download = `${name}-freigestellt.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [resultUrl, file]);

  // ───────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────

  if (phase === "checking") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2
          className="h-6 w-6 animate-spin text-primary"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (phase === "blocked" && hw) {
    return <HardwareBlocked hw={hw} />;
  }

  const busy = phase === "processing" || phase === "loading-model";

  return (
    <div className="space-y-8">
      {/* ── Drop-Zone ─────────────────────────────────────────────── */}
      {!file && (
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
          aria-label="Bild zum Freistellen auswählen"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) acceptFile(f);
              e.target.value = "";
            }}
          />
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Upload
              className="h-8 w-8 text-primary"
              aria-hidden="true"
              strokeWidth={1.5}
            />
          </div>
          <p className="text-lg md:text-xl font-bold text-text mb-1">
            Bild hierher ziehen oder klicken
          </p>
          <p className="text-sm text-text-light">
            Funktioniert am besten mit <strong>Personen-Fotos</strong> · JPG,
            PNG oder WEBP
          </p>
          {errorMsg && (
            <p className="mt-3 text-sm text-red-700">{errorMsg}</p>
          )}
        </div>
      )}

      {/* ── Stage ─────────────────────────────────────────────────── */}
      {file && originalUrl && hw && (
        <div className="relative rounded-2xl bg-slate-950 text-white shadow-xl overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-700"
            style={{
              background:
                phase === "done"
                  ? "radial-gradient(ellipse at 75% 0%, rgba(16,185,129,0.25) 0%, transparent 55%)"
                  : "radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.14) 0%, transparent 55%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, #ffffff 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #ffffff 0 1px, transparent 1px 40px)",
            }}
          />

          <div className="relative z-10 p-5 md:p-8">
            {/* Status-Leiste */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white/70 font-mono">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    busy
                      ? "bg-emerald-400 animate-pulse"
                      : phase === "done"
                      ? "bg-emerald-400"
                      : phase === "error"
                      ? "bg-red-400"
                      : "bg-white/40"
                  }`}
                />
                {phaseLabel(phase)}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-white/60">
                <span className="inline-flex items-center gap-1.5">
                  <Cpu className="h-3 w-3" aria-hidden="true" />
                  WASM · MediaPipe
                </span>
                <span>Modell: Selfie Seg. (Landscape)</span>
              </div>
            </div>

            {/* Split-Screen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
              <ImagePanel
                label="Original"
                meta={
                  originalDims
                    ? `${originalDims.w} × ${originalDims.h} · ${fmtBytes(file.size)}`
                    : fmtBytes(file.size)
                }
                accent="white"
                checker={false}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgElRef}
                  src={originalUrl}
                  alt="Originalbild"
                  className="block max-w-full max-h-full object-contain"
                />
              </ImagePanel>

              <ImagePanel
                label={resultUrl ? "Freigestellt · PNG" : "Ergebnis"}
                meta={
                  resultUrl && resultBytes
                    ? `transparenter Hintergrund · ${fmtBytes(resultBytes)}`
                    : phase === "processing"
                    ? "Maske wird berechnet …"
                    : phase === "loading-model"
                    ? "Modell wird geladen …"
                    : "bereit"
                }
                accent="green"
                checker
                glow={Boolean(resultUrl)}
              >
                {resultUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resultUrl}
                    alt="Freigestellte Person mit transparentem Hintergrund"
                    className="block max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/50 px-6">
                    {busy ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2
                          className="h-8 w-8 animate-spin text-emerald-400"
                          aria-hidden="true"
                        />
                        <span className="text-xs font-mono uppercase tracking-[0.2em] text-white/70">
                          {phase === "loading-model"
                            ? "Modell laden"
                            : "Segmentiere"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-center">
                        <Scissors
                          className="h-8 w-8 text-emerald-400/70"
                          aria-hidden="true"
                          strokeWidth={1.5}
                        />
                        <span className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">
                          Klick auf „Hintergrund entfernen“
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </ImagePanel>
            </div>

            {/* Indeterminate Bar während des Ladens */}
            {busy && (
              <div className="mt-6">
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden relative">
                  <div className="h-full w-1/3 bg-gradient-to-r from-emerald-400 to-emerald-300 absolute animate-[bgrm-slide_1.4s_ease-in-out_infinite]" />
                </div>
                <div className="mt-1.5 text-[10px] font-mono text-white/50">
                  {phase === "loading-model"
                    ? "Lade Selfie-Segmentation-Modell von jsDelivr (~ 4 MB) …"
                    : "Berechne Personen-Maske …"}
                </div>
              </div>
            )}

            {/* Error */}
            {phase === "error" && errorMsg && (
              <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                <AlertCircle
                  className="h-4 w-4 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Aktions-Leiste */}
            <div className="mt-7 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition-colors"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Neues Bild
              </button>

              {resultUrl ? (
                <button
                  type="button"
                  onClick={downloadResult}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-white/90 transition-colors"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Transparentes PNG
                </button>
              ) : (
                <button
                  type="button"
                  onClick={runSegmentation}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? (
                    <>
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      {phase === "loading-model" ? "Lädt Modell …" : "Läuft …"}
                    </>
                  ) : (
                    <>
                      <Scissors className="h-4 w-4" aria-hidden="true" />
                      Hintergrund entfernen
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Indeterminate-Animation */}
          <style>{`
            @keyframes bgrm-slide {
              0%   { transform: translateX(-100%); }
              60%  { transform: translateX(280%); }
              100% { transform: translateX(280%); }
            }
            @media (prefers-reduced-motion: reduce) {
              .animate-\\[bgrm-slide_1\\.4s_ease-in-out_infinite\\] { animation: none; }
            }
          `}</style>
        </div>
      )}

      {/* ── Datenschutz ───────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4 text-xs text-text leading-relaxed">
        <ShieldCheck
          className="h-4 w-4 text-primary shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <p>
          <strong>Datenschutz:</strong> Die Personen-Erkennung läuft komplett{" "}
          <strong>lokal in Ihrem Browser</strong> (MediaPipe / WebAssembly).
          Das Bild verlässt Ihr Gerät nicht. Lediglich die Modell-Datei wird
          beim ersten Mal von einem öffentlichen CDN geladen – ohne dass Ihr
          Foto irgendwo hingesendet wird.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELFER-KOMPONENTEN
// ─────────────────────────────────────────────────────────────────────────────

function phaseLabel(p: Phase): string {
  switch (p) {
    case "idle":
      return "Bereit";
    case "ready":
      return "Bild geladen";
    case "loading-model":
      return "Modell wird geladen";
    case "processing":
      return "KI segmentiert";
    case "done":
      return "Fertig";
    case "error":
      return "Fehler";
    default:
      return "—";
  }
}

function ImagePanel({
  label,
  meta,
  accent,
  checker,
  glow = false,
  children,
}: {
  label: string;
  meta: string;
  accent: "white" | "green";
  checker: boolean;
  glow?: boolean;
  children: React.ReactNode;
}) {
  const accentBorder =
    accent === "green" ? "border-emerald-400/40" : "border-white/15";
  const accentText =
    accent === "green" ? "text-emerald-300" : "text-white/70";
  return (
    <figure
      className={`relative rounded-xl bg-black/40 border ${accentBorder} overflow-hidden transition-shadow duration-500`}
      style={{
        boxShadow: glow ? "0 0 40px rgba(16,185,129,0.2)" : undefined,
      }}
    >
      <figcaption className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-black/40">
        <span
          className={`text-[10px] font-mono font-bold uppercase tracking-[0.22em] ${accentText} inline-flex items-center gap-1.5`}
        >
          <ImageIcon className="h-3 w-3" aria-hidden="true" />
          {label}
        </span>
        <span className="text-[10px] font-mono text-white/40 tabular-nums">
          {meta}
        </span>
      </figcaption>
      <div
        className="relative aspect-[4/3] w-full flex items-center justify-center"
        style={
          checker
            ? {
                backgroundColor: "#ffffff",
                backgroundImage:
                  "linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)",
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0",
              }
            : undefined
        }
      >
        {children}
      </div>
    </figure>
  );
}

function HardwareBlocked({ hw }: { hw: HardwareReport }) {
  const checks: { ok: boolean; label: string; detail: string }[] = [
    {
      ok: hw.wasm,
      label: "WebAssembly",
      detail: hw.wasm
        ? "Verfügbar"
        : "Nicht verfügbar – ohne WASM kann das Segmentierungs-Modell nicht laufen",
    },
    {
      ok: hw.canvas,
      label: "Canvas 2D",
      detail: hw.canvas ? "Verfügbar" : "Nicht verfügbar",
    },
  ];
  return (
    <div className="relative rounded-2xl bg-slate-950 text-white shadow-xl overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.18) 0%, transparent 55%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #ffffff 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #ffffff 0 1px, transparent 1px 40px)",
        }}
      />
      <div className="relative z-10 px-6 py-12 md:py-16 flex flex-col items-center text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/30">
          <AlertCircle
            className="h-8 w-8 text-red-400"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-red-300 mb-2 font-mono">
          Hardware nicht ausreichend
        </p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
          Dieses Gerät unterstützt die lokale KI nicht.
        </h2>
        <p className="max-w-md text-sm text-white/70 leading-relaxed mb-8">
          Der Hintergrund-Entferner benötigt WebAssembly und Canvas-Unterstützung
          – beides läuft direkt im Browser, ohne Internet-Verbindung. Bitte
          versuchen Sie es auf einem aktuelleren Gerät oder mit einem
          aktualisierten Browser (Chrome, Edge oder Firefox).
        </p>
        <ul className="w-full max-w-sm space-y-2 text-left">
          {checks.map((i) => (
            <li
              key={i.label}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                i.ok
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-red-500/30 bg-red-500/10"
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                  i.ok ? "bg-emerald-400" : "bg-red-400"
                }`}
              />
              <div className="min-w-0">
                <div className="font-bold text-white">{i.label}</div>
                <div className="text-xs text-white/60 font-mono">
                  {i.detail}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
