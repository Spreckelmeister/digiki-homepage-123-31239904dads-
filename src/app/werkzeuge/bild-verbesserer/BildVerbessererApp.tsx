"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  Sparkles,
  Download,
  RotateCcw,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Cpu,
  Zap,
  ImageIcon,
  ArrowRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// SETUP – einmalig im Projekt installieren:
//   npm i @tensorflow/tfjs upscaler @upscalerjs/default-model
// Pakete werden beim ersten Klick auf "Bild verbessern" lazy geladen, damit
// die übrige Seite leichtgewichtig bleibt.
// ─────────────────────────────────────────────────────────────────────────────

type UpscaleProgress = (rate: number) => void;

interface UpscalerOptions {
  model?: unknown;
  patchSize?: number;
  padding?: number;
}

interface UpscalerInstance {
  upscale: (
    input: HTMLImageElement | string,
    opts: {
      output?: "base64" | "tensor";
      patchSize?: number;
      padding?: number;
      progress?: UpscaleProgress;
    }
  ) => Promise<string>;
  abort?: () => void;
  warmup?: (opts?: unknown) => Promise<void>;
  dispose?: () => Promise<void>;
}

type UpscalerCtor = new (opts: UpscalerOptions) => UpscalerInstance;

type Phase =
  | "checking"
  | "blocked"
  | "idle"
  | "ready"
  | "loading-model"
  | "upscaling"
  | "done"
  | "error";

interface HardwareReport {
  webgl: boolean;
  webglVersion: 1 | 2 | null;
  wasm: boolean;
  deviceMemoryGB: number | null;
  patchSize: 64 | 128;
}

function probeHardware(): HardwareReport {
  let webgl = false;
  let webglVersion: 1 | 2 | null = null;
  try {
    const c = document.createElement("canvas");
    if (c.getContext("webgl2")) {
      webgl = true;
      webglVersion = 2;
    } else if (
      c.getContext("webgl") ||
      c.getContext("experimental-webgl" as unknown as "webgl")
    ) {
      webgl = true;
      webglVersion = 1;
    }
  } catch {
    /* keine WebGL-Unterstützung */
  }
  const wasm = typeof WebAssembly !== "undefined";
  const navWithMem = navigator as Navigator & { deviceMemory?: number };
  const deviceMemoryGB =
    typeof navWithMem.deviceMemory === "number"
      ? navWithMem.deviceMemory
      : null;
  // RAM < 4 GB → kleinere Patches, sonst 128er Standard.
  const patchSize: 64 | 128 =
    deviceMemoryGB !== null && deviceMemoryGB < 4 ? 64 : 128;
  return { webgl, webglVersion, wasm, deviceMemoryGB, patchSize };
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function BildVerbessererApp() {
  // — Hardware-State
  const [hw, setHw] = useState<HardwareReport | null>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [errorMsg, setErrorMsg] = useState("");

  // — Bild-State
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [originalDims, setOriginalDims] =
    useState<{ w: number; h: number } | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upscalerRef = useRef<UpscalerInstance | null>(null);
  const imgElRef = useRef<HTMLImageElement | null>(null);

  // ── Hardware-Check beim Mount ───────────────────────────────────────
  useEffect(() => {
    const report = probeHardware();
    setHw(report);
    setPhase(report.webgl && report.wasm ? "idle" : "blocked");
  }, []);

  // ── Cleanup bei Unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      upscalerRef.current?.abort?.();
      upscalerRef.current?.dispose?.().catch(() => {});
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
      setProgress(0);
      setResultUrl(null);

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

  // ── Upscaling starten ──────────────────────────────────────────────
  const runUpscale = useCallback(async () => {
    if (!file || !hw || !imgElRef.current) return;
    setErrorMsg("");
    setProgress(0);

    try {
      // Lazy laden – erst beim ersten Klick wird tfjs in den Browser geholt.
      if (!upscalerRef.current) {
        setPhase("loading-model");
        const [upscalerMod, modelMod] = await Promise.all([
          import("upscaler") as unknown as Promise<{ default: UpscalerCtor }>,
          import("@upscalerjs/default-model") as unknown as Promise<{
            default: unknown;
          }>,
        ]);
        const Upscaler = upscalerMod.default;
        upscalerRef.current = new Upscaler({
          model: modelMod.default,
          patchSize: hw.patchSize,
          padding: 2,
        });
      }

      setPhase("upscaling");

      // Sicherstellen, dass das <img> wirklich dekodiert ist.
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

      const dataUrl = await upscalerRef.current.upscale(img, {
        output: "base64",
        patchSize: hw.patchSize,
        padding: 2,
        progress: (rate) => setProgress(Math.min(100, Math.round(rate * 100))),
      });

      setResultUrl(dataUrl);
      setProgress(100);
      setPhase("done");
    } catch (e) {
      const err = e as Error;
      console.error("[BildVerbesserer]", err);
      const technical = err?.message ? ` (${err.message})` : "";
      setErrorMsg(
        "Beim Verbessern ist ein Fehler aufgetreten. Versuchen Sie ein " +
          "kleineres Bild oder laden Sie die Seite neu." +
          technical
      );
      setPhase("error");
    }
  }, [file, hw]);

  // ── Reset ──────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    setFile(null);
    setOriginalUrl(null);
    setOriginalDims(null);
    setResultUrl(null);
    setProgress(0);
    setPhase("idle");
    setErrorMsg("");
  }, [originalUrl]);

  // ── Download ───────────────────────────────────────────────────────
  const downloadResult = useCallback(() => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    const name = file.name.replace(/\.[^.]+$/, "");
    a.download = `${name}-upscaled-2x.png`;
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

  const busy = phase === "upscaling" || phase === "loading-model";

  return (
    <div className="space-y-8">
      {/* ── Drop-Zone (nur wenn noch kein Bild geladen) ───────────── */}
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
          aria-label="Bild zum Verbessern auswählen"
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
            JPG, PNG oder WEBP · empfohlen ≤ 1500 × 1500 px für flüssige
            Verarbeitung
          </p>
          {errorMsg && (
            <p className="mt-3 text-sm text-red-700">{errorMsg}</p>
          )}
        </div>
      )}

      {/* ── Vergleichs-Stage (Original vs. Ergebnis) ──────────────── */}
      {file && originalUrl && hw && (
        <div className="relative rounded-2xl bg-slate-950 text-white shadow-xl overflow-hidden">
          {/* Atmosphärischer Glow */}
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
          {/* Blueprint-Raster */}
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
                  WebGL{hw.webglVersion ?? ""}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="h-3 w-3" aria-hidden="true" />
                  Patch {hw.patchSize}px
                </span>
                {hw.deviceMemoryGB !== null && (
                  <span className="tabular-nums">
                    {hw.deviceMemoryGB} GB RAM
                  </span>
                )}
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
                label={resultUrl ? "Verbessert · 2×" : "Ergebnis"}
                meta={
                  resultUrl && originalDims
                    ? `${originalDims.w * 2} × ${originalDims.h * 2}`
                    : phase === "upscaling"
                    ? "wird berechnet …"
                    : phase === "loading-model"
                    ? "Modell wird geladen …"
                    : "bereit"
                }
                accent="green"
                glow={Boolean(resultUrl)}
              >
                {resultUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resultUrl}
                    alt="Verbessertes Bild (2× Auflösung)"
                    className="block max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/40 px-6">
                    {busy ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2
                          className="h-8 w-8 animate-spin text-emerald-400"
                          aria-hidden="true"
                        />
                        <span className="text-xs font-mono uppercase tracking-[0.2em] text-white/70">
                          {phase === "loading-model"
                            ? "Modell laden"
                            : `${progress}%`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-center">
                        <Sparkles
                          className="h-8 w-8 text-emerald-400/70"
                          aria-hidden="true"
                          strokeWidth={1.5}
                        />
                        <span className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">
                          Klick auf „Bild verbessern“
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </ImagePanel>
            </div>

            {/* Progress-Balken */}
            {busy && (
              <div className="mt-6">
                <div
                  className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    phase === "loading-model" ? undefined : progress
                  }
                >
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-[width] duration-150"
                    style={{
                      width:
                        phase === "loading-model"
                          ? "8%"
                          : `${Math.max(2, progress)}%`,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] font-mono text-white/50">
                  <span>
                    {phase === "loading-model"
                      ? "Initialisiere neuronales Netz …"
                      : "Verarbeite Patches …"}
                  </span>
                  <span className="tabular-nums">
                    {phase === "loading-model" ? "—" : `${progress} %`}
                  </span>
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
                  PNG herunterladen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={runUpscale}
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
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      Bild verbessern
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Datenschutz-Hinweis ───────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4 text-xs text-text leading-relaxed">
        <ShieldCheck
          className="h-4 w-4 text-primary shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <p>
          <strong>Datenschutz:</strong> Das neuronale Netz läuft auf Ihrer
          Grafikkarte (WebGL) <strong>direkt im Browser</strong>. Das Bild
          verlässt Ihr Gerät nicht – es gibt weder Server-Upload noch
          Speicherung. Schließen Sie die Seite, sind alle Daten weg.
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
    case "upscaling":
      return "KI verarbeitet";
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
  glow = false,
  children,
}: {
  label: string;
  meta: string;
  accent: "white" | "green";
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
      {/* Karo-Hintergrund, falls Ergebnis Transparenz hat */}
      <div
        className="relative aspect-[4/3] w-full flex items-center justify-center"
        style={{
          backgroundImage:
            "linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.04) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.04) 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
        }}
      >
        {children}
      </div>
    </figure>
  );
}

function HardwareBlocked({ hw }: { hw: HardwareReport }) {
  const checks: { ok: boolean; label: string; detail: string }[] = [
    {
      ok: hw.webgl,
      label: "WebGL (GPU-Beschleunigung)",
      detail: hw.webgl
        ? `Verfügbar (Version ${hw.webglVersion})`
        : "Nicht verfügbar – ohne GPU kann das KI-Modell nicht laufen",
    },
    {
      ok: hw.wasm,
      label: "WebAssembly",
      detail: hw.wasm ? "Verfügbar" : "Nicht verfügbar",
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
          Der KI-Bild-Verbesserer benötigt eine moderne Grafikschnittstelle
          (WebGL) und WebAssembly – beides läuft direkt im Browser, ohne
          Internet-Verbindung. Bitte versuchen Sie es auf einem aktuelleren
          Gerät oder mit einem aktualisierten Browser (Chrome, Edge oder
          Firefox).
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
