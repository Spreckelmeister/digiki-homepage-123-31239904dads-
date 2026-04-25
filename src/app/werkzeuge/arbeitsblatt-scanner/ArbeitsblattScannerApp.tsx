"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  ScanText,
  Download,
  RotateCcw,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Cpu,
  ImageIcon,
  ClipboardCopy,
  Check,
  Sparkles,
  ArrowRight,
  Camera,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// SETUP – einmalig im Projekt installieren:
//   npm i tesseract.js
// Sprachpaket "deu" (~ 14 MB) wird beim ersten Lauf vom Tesseract-CDN
// geladen und im Browser-Cache (IndexedDB) gehalten.
// ─────────────────────────────────────────────────────────────────────────────

interface TesseractWorker {
  recognize: (image: File | Blob | string | HTMLImageElement) => Promise<{
    data: { text: string; confidence?: number };
  }>;
  terminate: () => Promise<void>;
}

interface TesseractLogMessage {
  status: string;
  progress?: number;
  workerId?: string;
  jobId?: string;
}

interface TesseractModule {
  createWorker: (
    lang: string | string[],
    oem?: number,
    options?: {
      logger?: (m: TesseractLogMessage) => void;
      errorHandler?: (e: unknown) => void;
    }
  ) => Promise<TesseractWorker>;
}

type Phase =
  | "checking"
  | "blocked"
  | "idle"
  | "ready"
  | "loading-engine"
  | "loading-language"
  | "recognizing"
  | "done"
  | "error";

interface HardwareReport {
  worker: boolean;
  wasm: boolean;
}

function probeHardware(): HardwareReport {
  return {
    worker: typeof Worker !== "undefined",
    wasm: typeof WebAssembly !== "undefined",
  };
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function statusToPhase(status: string): Phase | null {
  if (status.includes("loading tesseract") || status.includes("initializing tesseract"))
    return "loading-engine";
  if (status.includes("loading language") || status.includes("loaded language"))
    return "loading-language";
  if (status.includes("recognizing")) return "recognizing";
  return null;
}

function statusToLabel(status: string): string {
  if (status.includes("loading tesseract")) return "OCR-Engine wird geladen";
  if (status.includes("initializing tesseract")) return "OCR-Engine wird initialisiert";
  if (status.includes("loading language")) return "Deutsches Sprachpaket wird geladen";
  if (status.includes("initialized api")) return "API bereit";
  if (status.includes("initializing api")) return "API wird initialisiert";
  if (status.includes("recognizing")) return "Text wird erkannt";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function ArbeitsblattScannerApp() {
  const [hw, setHw] = useState<HardwareReport | null>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [errorMsg, setErrorMsg] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(
    null
  );

  const [progress, setProgress] = useState(0);
  const [statusLabel, setStatusLabel] = useState("");
  const [text, setText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const [isDragOver, setIsDragOver] = useState(false);
  // Touch-Primär-Geräte (Smartphone, Tablet) bekommen zusätzlich einen
  // direkten Kamera-Knopf. `pointer: coarse` matcht zuverlässig auf Mobil-
  // und Tablet-Browsern; Laptops mit Touchscreen melden weiter `pointer:
  // fine` und sehen das Desktop-Drop-Layout.
  const [isTouchPrimary, setIsTouchPrimary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<TesseractWorker | null>(null);

  // ── Hardware-Check ─────────────────────────────────────────────────
  useEffect(() => {
    const report = probeHardware();
    setHw(report);
    setPhase(report.worker && report.wasm ? "idle" : "blocked");
  }, []);

  // ── Touch-Primary-Erkennung ────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouchPrimary(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // ── Cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      workerRef.current?.terminate().catch(() => {});
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
      setText("");
      setConfidence(null);
      setProgress(0);
      setStatusLabel("");

      if (imageUrl) URL.revokeObjectURL(imageUrl);
      const url = URL.createObjectURL(f);
      setImageUrl(url);
      setFile(f);
      setPhase("ready");

      try {
        const bm = await createImageBitmap(f);
        setImageDims({ w: bm.width, h: bm.height });
        bm.close?.();
      } catch {
        setImageDims(null);
      }
    },
    [imageUrl]
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

  // ── OCR starten ────────────────────────────────────────────────────
  const runOcr = useCallback(async () => {
    if (!file || !hw) return;
    setErrorMsg("");
    setText("");
    setConfidence(null);
    setProgress(0);
    try {
      if (!workerRef.current) {
        setPhase("loading-engine");
        setStatusLabel("OCR-Engine wird geladen");
        try {
          const mod = (await import("tesseract.js")) as unknown as TesseractModule;
          console.log("[ArbeitsblattScanner] Initialisiere Tesseract Worker mit Diagnose...");
          console.log("[ArbeitsblattScanner] Tesseract.js Version:", (mod as any).version || "unbekannt");
          
          // Interceptiere fetch um zu sehen, welche URLs geladen werden
          const originalFetch = window.fetch;
          (window as any).fetch = function(input: any, init?: any) {
            console.log("[ArbeitsblattScanner/Fetch]", input);
            return originalFetch(input, init);
          };
          
          // Versuche Worker mit defaultem CDN zu initialisieren
          const initPromise = mod.createWorker("deu", 1, {
            logger: (m) => {
              console.log("[ArbeitsblattScanner/Logger]", m.status, `${m.progress ? Math.round(m.progress * 100) : 0}%`);
              const next = statusToPhase(m.status);
              if (next) setPhase(next);
              setStatusLabel(statusToLabel(m.status));
              if (typeof m.progress === "number") {
                setProgress(Math.min(100, Math.round(m.progress * 100)));
              }
            },
            errorHandler: (e: unknown) => {
              const err = e as Error;
              const msg = err?.message || String(e);
              console.error("[ArbeitsblattScanner/WorkerError]", msg, e);
            },
          });

          // 30 Sekunden Timeout für Worker-Initialisierung (Sprachpaket-Download)
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Sprachpaket-Download hat zu lange gedauert (> 30s). Netzwerk könnte zu langsam sein.")),
              30000
            )
          );

          workerRef.current = await Promise.race([initPromise, timeoutPromise]);
          console.log("[ArbeitsblattScanner] Worker erfolgreich initialisiert");
          
          // Stelle originalem fetch wieder her
          (window as any).fetch = originalFetch;
        } catch (initErr) {
          // Stelle originalem fetch wieder her
          (window as any).fetch = window.fetch;
          
          const err = initErr as Error;
          const errMsg = (err?.message || String(initErr)).toLowerCase();
          console.error("[ArbeitsblattScanner/Init] Full Error:", err);
          console.error("[ArbeitsblattScanner/Init] Error name:", (err as any)?.name);
          console.error("[ArbeitsblattScanner/Init] Error cause:", (err as any)?.cause);
          
          // Bessere Fehlerdiagnose mit mehreren Patterns (case-insensitive)
          if (
            errMsg.includes("networkerror") ||
            errMsg.includes("network error") ||
            errMsg.includes("fetch") ||
            errMsg.includes("network") ||
            errMsg.includes("cors") ||
            errMsg.includes("failed to fetch") ||
            (err as any)?.name === "NetworkError"
          ) {
            throw new Error(
              "Das deutsche Sprachpaket konnte nicht heruntergeladen werden (Netzwerkfehler). Überprüfen Sie die Internetverbindung oder versuchen Sie es später erneut."
            );
          }
          if (errMsg.includes("timeout") || errMsg.includes("zu lange")) {
            throw new Error(
              "Sprachpaket-Download hat zu lange gedauert. Ihre Internetverbindung könnte langsam sein – versuchen Sie es später erneut."
            );
          }
          if (errMsg.includes("securityerror")) {
            throw new Error(
              "Sicherheitsfehler: Tesseract konnte nicht initialisiert werden."
            );
          }
          // Fallback: show the actual error message we got
          throw new Error(
            (err?.message || String(initErr)) || "Tesseract konnte nicht initialisiert werden."
          );
        }
      }

      setPhase("recognizing");
      setStatusLabel("Text wird erkannt");
      setProgress(0);
      console.log("[ArbeitsblattScanner] Starte Texterkennung...");

      const result = await workerRef.current.recognize(file);
      setText((result.data.text || "").trim());
      if (typeof result.data.confidence === "number") {
        setConfidence(Math.round(result.data.confidence));
      }
      setProgress(100);
      setPhase("done");
      console.log("[ArbeitsblattScanner] Texterkennung erfolgreich abgeschlossen");
    } catch (e) {
      const err = e as Error;
      console.error("[ArbeitsblattScanner/Error]", err?.message || String(e));
      setErrorMsg(err?.message || 
        "Bei der Texterkennung ist ein Fehler aufgetreten. Versuchen Sie ein " +
        "anderes Bild oder laden Sie die Seite neu."
      );
      setPhase("error");
    }
  }, [file, hw]);

  const reset = useCallback(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setFile(null);
    setImageUrl(null);
    setImageDims(null);
    setText("");
    setConfidence(null);
    setProgress(0);
    setStatusLabel("");
    setPhase("idle");
    setErrorMsg("");
  }, [imageUrl]);

  const copyText = useCallback(async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }, [text]);

  const downloadTxt = useCallback(() => {
    if (!text || !file) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name = file.name.replace(/\.[^.]+$/, "");
    a.download = `${name}-text.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [text, file]);

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

  const busy =
    phase === "loading-engine" ||
    phase === "loading-language" ||
    phase === "recognizing";

  return (
    <div className="space-y-8">
      {/* ── Drop-Zone / Mobile-CTAs ───────────────────────────────── */}
      {!file && (
        <div className="space-y-3">
          {/* Hidden inputs – beide Pfade triggern denselben acceptFile-Flow */}
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
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            // capture="environment" öffnet auf Smartphones direkt die
            // Rück-Kamera. Auf Desktops ignoriert der Browser das Attribut
            // und zeigt den normalen Datei-Dialog.
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) acceptFile(f);
              e.target.value = "";
            }}
          />

          {isTouchPrimary ? (
            <>
              {/* Primär: Kamera */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="group relative w-full rounded-2xl border-2 border-primary bg-primary text-white p-6 md:p-7 text-left shadow-sm hover:bg-primary/95 active:scale-[0.99] transition-all"
                aria-label="Arbeitsblatt mit der Kamera fotografieren"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 border border-white/25">
                    <Camera
                      className="h-7 w-7 text-white"
                      aria-hidden="true"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base md:text-lg font-bold leading-snug">
                      Mit Kamera fotografieren
                    </p>
                    <p className="text-xs md:text-sm text-white/85 leading-relaxed mt-0.5">
                      Direkt scannen · Empfohlen für unterwegs
                    </p>
                  </div>
                  <ArrowRight
                    className="h-5 w-5 text-white/80 shrink-0 group-hover:translate-x-0.5 transition-transform"
                    aria-hidden="true"
                  />
                </div>
              </button>

              {/* Sekundär: Galerie */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative w-full rounded-2xl border-2 border-border bg-white p-5 md:p-6 text-left hover:border-primary/40 hover:bg-primary/[0.02] active:scale-[0.99] transition-all"
                aria-label="Foto aus der Galerie auswählen"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <ImageIcon
                      className="h-6 w-6 text-primary"
                      aria-hidden="true"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-text leading-snug">
                      Aus Galerie wählen
                    </p>
                    <p className="text-xs text-text-light leading-relaxed mt-0.5">
                      Bereits aufgenommenes Foto · JPG, PNG, WEBP
                    </p>
                  </div>
                </div>
              </button>

              <p className="text-xs text-text-light text-center pt-2 leading-relaxed">
                Tipp: <strong>gute Beleuchtung</strong>, gerades Foto und das
                Blatt formatfüllend ablichten – damit erkennt die Texterkennung
                am zuverlässigsten.
              </p>

              {errorMsg && (
                <p className="text-sm text-red-700 text-center">{errorMsg}</p>
              )}
            </>
          ) : (
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
              aria-label="Bild zum Scannen auswählen"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Upload
                  className="h-8 w-8 text-primary"
                  aria-hidden="true"
                  strokeWidth={1.5}
                />
              </div>
              <p className="text-lg md:text-xl font-bold text-text mb-1">
                Foto vom Arbeitsblatt hierher ziehen oder klicken
              </p>
              <p className="text-sm text-text-light">
                Funktioniert am besten mit <strong>guter Beleuchtung</strong>{" "}
                und geradem Foto · JPG, PNG oder WEBP
              </p>
              {errorMsg && (
                <p className="mt-3 text-sm text-red-700">{errorMsg}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Stage ─────────────────────────────────────────────────── */}
      {file && imageUrl && hw && (
        <div className="relative rounded-2xl bg-slate-950 text-white shadow-xl overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-700"
            style={{
              background:
                phase === "done"
                  ? "radial-gradient(ellipse at 75% 0%, rgba(16,185,129,0.22) 0%, transparent 55%)"
                  : "radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.12) 0%, transparent 55%)",
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
                  Tesseract · WASM
                </span>
                <span>Sprache: deu</span>
                {confidence !== null && (
                  <span className="tabular-nums">
                    Konfidenz · {confidence} %
                  </span>
                )}
              </div>
            </div>

            {/* Split-Screen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
              {/* Linkes Panel: Bild */}
              <figure className="relative rounded-xl bg-black/40 border border-white/15 overflow-hidden">
                <figcaption className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-black/40">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-white/70 inline-flex items-center gap-1.5">
                    <ImageIcon className="h-3 w-3" aria-hidden="true" />
                    Vorlage
                  </span>
                  <span className="text-[10px] font-mono text-white/40 tabular-nums">
                    {imageDims
                      ? `${imageDims.w} × ${imageDims.h} · ${fmtBytes(file.size)}`
                      : fmtBytes(file.size)}
                  </span>
                </figcaption>
                <div className="relative w-full aspect-[4/3] bg-black/50 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Hochgeladenes Arbeitsblatt"
                    className="block max-w-full max-h-full object-contain"
                  />
                  {phase === "recognizing" && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 h-12 bg-gradient-to-b from-emerald-400/40 via-emerald-400/10 to-transparent"
                      style={{
                        top: `${progress}%`,
                        transition: "top 200ms linear",
                      }}
                    />
                  )}
                </div>
              </figure>

              {/* Rechtes Panel: Text */}
              <div
                className={`relative rounded-xl bg-black/40 border ${
                  text
                    ? "border-emerald-400/40"
                    : "border-white/15"
                } overflow-hidden transition-shadow duration-500`}
                style={{
                  boxShadow: text
                    ? "0 0 40px rgba(16,185,129,0.2)"
                    : undefined,
                }}
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-black/40">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-[0.22em] inline-flex items-center gap-1.5 ${
                      text ? "text-emerald-300" : "text-white/70"
                    }`}
                  >
                    <ScanText className="h-3 w-3" aria-hidden="true" />
                    Erkannter Text
                  </span>
                  <span className="text-[10px] font-mono text-white/40 tabular-nums">
                    {text ? `${text.split(/\s+/).filter(Boolean).length} Wörter` : "—"}
                  </span>
                </div>
                <div className="relative aspect-[4/3] w-full">
                  {text ? (
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="absolute inset-0 w-full h-full resize-none bg-transparent p-4 text-sm md:text-base leading-relaxed text-white placeholder-white/40 focus:outline-none font-sans"
                      spellCheck
                      aria-label="Erkannter Text (bearbeitbar)"
                    />
                  ) : busy ? (
                    <div className="absolute inset-0 flex items-center justify-center px-6">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <Loader2
                          className="h-8 w-8 animate-spin text-emerald-400"
                          aria-hidden="true"
                        />
                        <span className="text-xs font-mono uppercase tracking-[0.2em] text-white/70">
                          {statusLabel || phaseLabel(phase)}
                        </span>
                        {phase === "recognizing" && (
                          <span className="text-[10px] font-mono text-white/40 tabular-nums">
                            {progress} %
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center px-6">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <Sparkles
                          className="h-8 w-8 text-emerald-400/70"
                          aria-hidden="true"
                          strokeWidth={1.5}
                        />
                        <span className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">
                          Klick auf „Text erkennen“
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress-Balken */}
            {busy && (
              <div className="mt-6">
                <div
                  className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-[width] duration-150"
                    style={{ width: `${Math.max(2, progress)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] font-mono text-white/50">
                  <span>{statusLabel || "Verarbeite …"}</span>
                  <span className="tabular-nums">{progress} %</span>
                </div>
                {phase === "loading-language" && (
                  <p className="mt-2 text-[10px] text-white/40 leading-relaxed">
                    Sprachpaket „deu" (~ 14 MB) wird einmalig heruntergeladen
                    und im Browser zwischengespeichert.
                  </p>
                )}
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

              {phase === "done" && text ? (
                <>
                  <button
                    type="button"
                    onClick={copyText}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition-colors"
                  >
                    {copied ? (
                      <Check
                        className="h-4 w-4 text-emerald-300"
                        aria-hidden="true"
                      />
                    ) : (
                      <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
                    )}
                    {copied ? "Kopiert" : "Kopieren"}
                  </button>
                  <button
                    type="button"
                    onClick={downloadTxt}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-white/90 transition-colors"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Als .txt
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={runOcr}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? (
                    <>
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Analysiere …
                    </>
                  ) : (
                    <>
                      <ScanText className="h-4 w-4" aria-hidden="true" />
                      Text erkennen
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Datenschutz ───────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4 text-xs text-text leading-relaxed">
        <ShieldCheck
          className="h-4 w-4 text-primary shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <p>
          <strong>Datenschutz:</strong> Die Texterkennung läuft in einem
          internen Web Worker <strong>direkt in Ihrem Browser</strong>{" "}
          (Tesseract.js / WebAssembly). Das Bild verlässt Ihr Gerät nicht.
          Lediglich das deutsche Sprachpaket wird beim ersten Mal von einem
          öffentlichen CDN geladen – Ihr Foto wird dabei nicht übertragen.
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
    case "loading-engine":
      return "Engine wird geladen";
    case "loading-language":
      return "Sprachpaket wird geladen";
    case "recognizing":
      return "KI erkennt Text";
    case "done":
      return "Fertig";
    case "error":
      return "Fehler";
    default:
      return "—";
  }
}

function HardwareBlocked({ hw }: { hw: HardwareReport }) {
  const checks: { ok: boolean; label: string; detail: string }[] = [
    {
      ok: hw.worker,
      label: "Web Worker",
      detail: hw.worker
        ? "Verfügbar"
        : "Nicht verfügbar – Tesseract benötigt Worker für die OCR-Engine",
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
          Dieses Gerät unterstützt die lokale OCR nicht.
        </h2>
        <p className="max-w-md text-sm text-white/70 leading-relaxed mb-8">
          Der Arbeitsblatt-Scanner benötigt Web Worker und WebAssembly – beides
          läuft direkt im Browser, ohne Internet-Verbindung. Bitte versuchen
          Sie es auf einem aktuelleren Gerät oder mit einem aktualisierten
          Browser (Chrome, Edge oder Firefox).
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
