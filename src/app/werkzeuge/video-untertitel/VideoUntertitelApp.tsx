"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  Captions,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Cpu,
  Film,
  Download,
  RotateCcw,
  ClipboardCopy,
  Check,
  Sparkles,
  Volume2,
  Type,
  ArrowRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// SETUP – einmalig im Projekt installieren:
//   npm i @ffmpeg/ffmpeg @ffmpeg/util @ffmpeg/core @huggingface/transformers
//
// FFmpeg.wasm wird hier als Single-Thread-Build (@ffmpeg/core, NICHT core-mt)
// von der eigenen Domain (public/ffmpeg-core/) ausgeliefert → keine CDN-Risiken
// (CORS, Tracking-Blocker, Rate-Limits) und läuft ohne SharedArrayBuffer/COEP.
// Die Dateien werden via scripts/copy-ffmpeg-core.mjs aus node_modules kopiert.
// Whisper läuft im Worker; max. Datei-Größe: 100 MB.
// ─────────────────────────────────────────────────────────────────────────────

const FFMPEG_BASE = "/ffmpeg-core";
const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

// ─── Typen für lazy-importierte Module ───────────────────────────────────────

interface FFmpegInstance {
  load: (opts: {
    coreURL?: string;
    wasmURL?: string;
    workerURL?: string;
    classWorkerURL?: string;
  }) => Promise<boolean>;
  on: (event: "log" | "progress", cb: (data: unknown) => void) => void;
  writeFile: (path: string, data: Uint8Array) => Promise<boolean>;
  readFile: (path: string) => Promise<Uint8Array | string>;
  exec: (args: string[]) => Promise<number>;
  deleteFile?: (path: string) => Promise<boolean>;
  terminate?: () => void;
}

type FFmpegCtor = new () => FFmpegInstance;

interface FFmpegModule {
  FFmpeg: FFmpegCtor;
}

interface FFmpegUtilModule {
  fetchFile: (input: File | Blob | string) => Promise<Uint8Array>;
  toBlobURL: (url: string, mimeType: string) => Promise<string>;
}

interface FFmpegProgressData {
  progress: number;
  time: number;
}

// ─── Worker-Nachrichten ──────────────────────────────────────────────────────

interface WorkerProgressData {
  status: "initiate" | "download" | "progress" | "done" | "ready";
  name?: string;
  file?: string;
  loaded?: number;
  total?: number;
  progress?: number;
}

interface VttChunk {
  text: string;
  timestamp: [number | null, number | null];
}

type WorkerMessage =
  | { type: "load-progress"; data: WorkerProgressData }
  | { type: "ready" }
  | { type: "transcribing" }
  | { type: "result"; text: string; chunks: VttChunk[] }
  | { type: "error"; message: string };

// ─── State machine ───────────────────────────────────────────────────────────

type Phase =
  | "checking"
  | "blocked"
  | "idle"
  | "ready"
  | "loading-ffmpeg"
  | "extracting"
  | "decoding"
  | "loading-model"
  | "transcribing"
  | "done"
  | "error";

type SubState = "pending" | "active" | "done" | "error";

interface HardwareReport {
  worker: boolean;
  wasm: boolean;
  audioContext: boolean;
}

interface ModelFile {
  name: string;
  loaded: number;
  total: number;
  done: boolean;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function probeHardware(): HardwareReport {
  return {
    worker: typeof Worker !== "undefined",
    wasm: typeof WebAssembly !== "undefined",
    audioContext:
      typeof window !== "undefined" &&
      (typeof window.AudioContext !== "undefined" ||
        typeof (window as unknown as { webkitAudioContext?: unknown })
          .webkitAudioContext !== "undefined"),
  };
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function fmtTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function vttTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms
    .toString()
    .padStart(3, "0")}`;
}

function chunksToVtt(chunks: VttChunk[]): string {
  let vtt = "WEBVTT\n\n";
  let cueIndex = 1;
  let lastEnd = 0;
  for (const c of chunks) {
    if (!c.timestamp) continue;
    const startRaw = c.timestamp[0];
    const endRaw = c.timestamp[1];
    if (startRaw == null) continue;
    // Whisper kann "null" als End-Timestamp liefern, wenn die letzte Phrase
    // nicht abgeschlossen wurde – dann nutzen wir Start + 2 s als Fallback.
    const start = Math.max(lastEnd, startRaw);
    const end = endRaw != null ? Math.max(start + 0.1, endRaw) : start + 2;
    const text = (c.text || "").trim();
    if (!text) continue;
    vtt += `${cueIndex}\n${vttTime(start)} --> ${vttTime(end)}\n${text}\n\n`;
    cueIndex++;
    lastEnd = end;
  }
  return vtt;
}

async function audioBlobToFloat32(
  data: Uint8Array,
  targetRate = 16000
): Promise<Float32Array> {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const tmp = new Ctx();
  // ArrayBuffer-Kopie nötig, weil decodeAudioData ihn detached
  const slice = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength
  );
  const decoded = await tmp.decodeAudioData(slice as ArrayBuffer);
  await tmp.close();
  const offline = new OfflineAudioContext(
    1,
    Math.max(1, Math.ceil(decoded.duration * targetRate)),
    targetRate
  );
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

// ─── Komponente ──────────────────────────────────────────────────────────────

export default function VideoUntertitelApp() {
  const [hw, setHw] = useState<HardwareReport | null>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [erroredStep, setErroredStep] = useState<"ffmpeg" | "whisper" | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const [ffmpegProgress, setFfmpegProgress] = useState(0);
  const [modelFiles, setModelFiles] = useState<Map<string, ModelFile>>(
    new Map()
  );

  const [vtt, setVtt] = useState("");
  const [chunks, setChunks] = useState<VttChunk[]>([]);
  const [copied, setCopied] = useState(false);

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ffmpegRef = useRef<FFmpegInstance | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // ── Hardware-Check ─────────────────────────────────────────────────
  useEffect(() => {
    const report = probeHardware();
    setHw(report);
    const ok = report.worker && report.wasm && report.audioContext;
    setPhase(ok ? "idle" : "blocked");
  }, []);

  // ── Whisper-Worker initialisieren ─────────────────────────────────
  useEffect(() => {
    if (phase === "blocked" || phase === "checking") return;
    const w = new Worker(
      new URL("./whisper-vtt.worker.ts", import.meta.url),
      { type: "module" }
    );
    w.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;
      if (msg.type === "load-progress") {
        const p = msg.data;
        if (!p.file) return;
        setModelFiles((prev) => {
          const next = new Map(prev);
          const existing = next.get(p.file!) || {
            name: p.file!,
            loaded: 0,
            total: 0,
            done: false,
          };
          if (p.status === "progress") {
            existing.loaded = p.loaded ?? existing.loaded;
            existing.total = p.total ?? existing.total;
          } else if (p.status === "done") {
            existing.done = true;
            existing.loaded = existing.total || existing.loaded;
          } else if (p.status === "initiate" || p.status === "download") {
            existing.loaded = 0;
            existing.total = p.total ?? existing.total;
          }
          next.set(p.file!, existing);
          return next;
        });
      } else if (msg.type === "transcribing") {
        setPhase("transcribing");
      } else if (msg.type === "result") {
        setChunks(msg.chunks);
        setVtt(chunksToVtt(msg.chunks));
        setPhase("done");
      } else if (msg.type === "error") {
        setErroredStep("whisper");
        setErrorMsg(msg.message);
        setPhase("error");
      }
    };
    workerRef.current = w;
    return () => {
      w.terminate();
      workerRef.current = null;
    };
  }, [phase === "blocked" || phase === "checking"]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      ffmpegRef.current?.terminate?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Datei akzeptieren ──────────────────────────────────────────────
  const acceptFile = useCallback(
    (f: File) => {
      if (
        !f.type.startsWith("video/") &&
        !f.type.startsWith("audio/") &&
        !f.name.match(/\.(mp4|mov|webm|mkv|m4v|avi|mp3|wav|m4a|ogg)$/i)
      ) {
        setErrorMsg("Bitte eine Video- oder Audio-Datei wählen.");
        return;
      }
      if (f.size > MAX_FILE_BYTES) {
        setErrorMsg(
          `Datei ist zu groß (${fmtBytes(f.size)}). Maximum sind 100 MB.`
        );
        return;
      }
      setErrorMsg("");
      setErroredStep(null);
      setVtt("");
      setChunks([]);
      setFfmpegProgress(0);

      if (videoUrl) URL.revokeObjectURL(videoUrl);
      const url = URL.createObjectURL(f);
      setVideoUrl(url);
      setFile(f);
      setPhase("ready");
    },
    [videoUrl]
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

  // ── Pipeline: FFmpeg → Whisper ────────────────────────────────────
  const generateSubtitles = useCallback(async () => {
    if (!file || !hw || !workerRef.current) return;
    setErrorMsg("");
    setErroredStep(null);
    setVtt("");
    setChunks([]);
    setFfmpegProgress(0);

    let audioData: Uint8Array;

    // ─── PHASE 1: FFmpeg laden + Audio extrahieren ───
    try {
      if (!ffmpegRef.current) {
        setPhase("loading-ffmpeg");
        try {
          const [ffmpegMod, utilMod] = (await Promise.all([
            import("@ffmpeg/ffmpeg"),
            import("@ffmpeg/util"),
          ])) as unknown as [FFmpegModule, FFmpegUtilModule];
          const ff = new ffmpegMod.FFmpeg();
          ff.on("progress", (data: unknown) => {
            const d = data as FFmpegProgressData;
            if (typeof d?.progress === "number") {
              setFfmpegProgress(
                Math.min(100, Math.max(0, Math.round(d.progress * 100)))
              );
            }
          });
          
          try {
            await ff.load({
              // classWorkerURL lädt den FFmpeg-Worker direkt aus public/,
              // umgeht damit den Bundler (Turbopack/Webpack scheitert sonst
              // an `await import(_coreURL)` mit dynamischer Blob-URL).
              // Vollqualifizierte URL nötig, weil der UMD-Build von
              // @ffmpeg/ffmpeg `import.meta.url` als `file:///Users/focus/...`
              // hardcoded hat – ein relativer Pfad würde gegen diese Basis
              // aufgelöst und ergäbe `file:///ffmpeg-worker/worker.js`.
              classWorkerURL: new URL(
                "/ffmpeg-worker/worker.js",
                window.location.origin
              ).href,
              coreURL: await utilMod.toBlobURL(
                `${FFMPEG_BASE}/ffmpeg-core.js`,
                "text/javascript"
              ),
              wasmURL: await utilMod.toBlobURL(
                `${FFMPEG_BASE}/ffmpeg-core.wasm`,
                "application/wasm"
              ),
            });
          } catch (loadErr) {
            const err = loadErr as Error;
            console.error("[FFmpeg Load]", err);
            if (err?.message?.includes("NetworkError") || err?.message?.includes("fetch")) {
              throw new Error(
                "FFmpeg-Dateien konnten nicht heruntergeladen werden. Überprüfen Sie Ihre Internetverbindung."
              );
            }
            throw new Error(`FFmpeg konnte nicht initialisiert werden: ${err?.message || JSON.stringify(err)}`);
          }
          
          ffmpegRef.current = ff;
        } catch (importErr) {
          const err = importErr as Error;
          console.error("[FFmpeg Import]", err);
          throw new Error(`FFmpeg-Fehler: ${err?.message || JSON.stringify(err) || "Unbekannter Fehler"}`);
        }
      }

      setPhase("extracting");
      const ff = ffmpegRef.current!;
      const utilMod = (await import("@ffmpeg/util")) as unknown as FFmpegUtilModule;
      const inputName = "input" + (file.name.match(/\.[^.]+$/)?.[0] || ".mp4");
      const outputName = "audio.wav";
      await ff.writeFile(inputName, await utilMod.fetchFile(file));
      await ff.exec([
        "-i",
        inputName,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-acodec",
        "pcm_s16le",
        outputName,
      ]);
      const out = await ff.readFile(outputName);
      audioData =
        typeof out === "string" ? new TextEncoder().encode(out) : out;
      await ff.deleteFile?.(inputName).catch(() => {});
      await ff.deleteFile?.(outputName).catch(() => {});
      setFfmpegProgress(100);
    } catch (e) {
      const err = e as Error;
      console.error("[VideoUntertitel/FFmpeg]", err);
      setErroredStep("ffmpeg");
      setErrorMsg(err?.message || "Audio konnte nicht extrahiert werden.");
      setPhase("error");
      return;
    }

    // ─── PHASE 2: Decode + Whisper ───
    try {
      setPhase("decoding");
      const pcm = await audioBlobToFloat32(audioData, 16000);
      // `getChannelData` gibt einen Float32Array-View auf den internen Puffer
      // des AudioBuffers zurück. Den direkt zu transferieren detached den
      // AudioBuffer und kann in manchen Engines zu Folgefehlern führen –
      // deshalb erst kopieren, dann transferieren.
      const pcmCopy = new Float32Array(pcm);
      const allDone =
        modelFiles.size > 0 &&
        Array.from(modelFiles.values()).every((m) => m.done);
      setPhase(allDone ? "transcribing" : "loading-model");
      workerRef.current.postMessage(
        { type: "transcribe", audio: pcmCopy },
        [pcmCopy.buffer]
      );
    } catch (e) {
      const err = e as Error;
      console.error("[VideoUntertitel/Decode]", err);
      setErroredStep("whisper");
      setErrorMsg(
        "Audio konnte nicht dekodiert werden. " +
          (err?.message ? `(${err.message})` : "")
      );
      setPhase("error");
    }
  }, [file, hw, modelFiles]);

  // ── Reset ──────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(null);
    setVideoUrl(null);
    setVtt("");
    setChunks([]);
    setFfmpegProgress(0);
    setErrorMsg("");
    setErroredStep(null);
    setPhase("idle");
  }, [videoUrl]);

  const copyVtt = useCallback(async () => {
    if (!vtt) return;
    try {
      await navigator.clipboard.writeText(vtt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }, [vtt]);

  const downloadVtt = useCallback(() => {
    if (!vtt || !file) return;
    const blob = new Blob([vtt], { type: "text/vtt;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name = file.name.replace(/\.[^.]+$/, "");
    a.download = `${name}.vtt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [vtt, file]);

  // ── Subtask-States für Phase-Indikator ────────────────────────────
  const ffmpegState: SubState =
    erroredStep === "ffmpeg"
      ? "error"
      : phase === "loading-ffmpeg" || phase === "extracting"
      ? "active"
      : phase === "decoding" ||
        phase === "loading-model" ||
        phase === "transcribing" ||
        phase === "done"
      ? "done"
      : "pending";

  const whisperState: SubState =
    erroredStep === "whisper"
      ? "error"
      : phase === "decoding" ||
        phase === "loading-model" ||
        phase === "transcribing"
      ? "active"
      : phase === "done"
      ? "done"
      : "pending";

  // Aggregierte Modell-Download-Werte
  const totalLoaded = Array.from(modelFiles.values()).reduce(
    (n, m) => n + m.loaded,
    0
  );
  const totalSize = Array.from(modelFiles.values()).reduce(
    (n, m) => n + (m.total || 0),
    0
  );
  const overallPct =
    totalSize > 0
      ? Math.min(100, Math.round((totalLoaded / totalSize) * 100))
      : 0;

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
    phase === "loading-ffmpeg" ||
    phase === "extracting" ||
    phase === "decoding" ||
    phase === "loading-model" ||
    phase === "transcribing";

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
          aria-label="Video zum Untertiteln auswählen"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*,.mp4,.mov,.webm,.mkv,.m4v,.mp3,.wav,.m4a"
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
            Video hierher ziehen oder klicken
          </p>
          <p className="text-sm text-text-light">
            MP4 · MOV · WEBM · MKV · max. <strong>100 MB</strong>
          </p>
          {errorMsg && (
            <p className="mt-3 text-sm text-red-700">{errorMsg}</p>
          )}
        </div>
      )}

      {/* ── Stage ─────────────────────────────────────────────────── */}
      {file && videoUrl && hw && (
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
                  FFmpeg · WASM (single-thread)
                </span>
                <span>+ Whisper-Tiny · DE</span>
              </div>
            </div>

            {/* Datei-Info & Video-Vorschau */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 mb-6 items-center rounded-xl border border-white/10 bg-black/30 p-4">
              <video
                src={videoUrl}
                controls
                className="w-full max-w-[200px] rounded-lg bg-black aspect-video object-contain border border-white/10"
                aria-label="Vorschau des hochgeladenen Videos"
              />
              <div className="min-w-0">
                <p className="font-bold text-white truncate flex items-center gap-2">
                  <Film
                    className="h-4 w-4 shrink-0 text-emerald-300"
                    aria-hidden="true"
                  />
                  {file.name}
                </p>
                <p className="text-xs text-white/50 font-mono mt-1">
                  {fmtBytes(file.size)}
                </p>
              </div>
            </div>

            {/* Phasen-Indikator */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <PhaseCard
                step={1}
                title="Audio extrahieren"
                subtitle="FFmpeg.wasm"
                icon={<Volume2 className="h-4 w-4" aria-hidden="true" />}
                state={ffmpegState}
                progress={
                  ffmpegState === "active" || ffmpegState === "done"
                    ? ffmpegProgress
                    : null
                }
                hint={
                  ffmpegState === "active"
                    ? phase === "loading-ffmpeg"
                      ? "FFmpeg wird geladen …"
                      : `Extrahiere Audio · ${ffmpegProgress} %`
                    : ffmpegState === "done"
                    ? "16-kHz-Mono-WAV bereit"
                    : ffmpegState === "error"
                    ? "Fehlgeschlagen"
                    : "wartet"
                }
              />
              <PhaseCard
                step={2}
                title="Transkription"
                subtitle="Whisper-Tiny / Web Worker"
                icon={<Type className="h-4 w-4" aria-hidden="true" />}
                state={whisperState}
                progress={
                  phase === "loading-model" ? overallPct : null
                }
                hint={
                  whisperState === "active"
                    ? phase === "decoding"
                      ? "Audio dekodieren …"
                      : phase === "loading-model"
                      ? `Modell wird geladen · ${overallPct} %`
                      : "Transkribiere mit Zeitmarken …"
                    : whisperState === "done"
                    ? `${chunks.length} Untertitel-Segmente`
                    : whisperState === "error"
                    ? "Fehlgeschlagen"
                    : "wartet"
                }
              />
            </div>

            {/* Modell-Download (Detail-Liste während loading-model) */}
            {phase === "loading-model" && modelFiles.size > 0 && (
              <div className="mb-6 rounded-xl border border-white/10 bg-black/30 p-4">
                <ul className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {Array.from(modelFiles.values()).map((m) => (
                    <li
                      key={m.name}
                      className="flex items-center justify-between text-[11px] font-mono text-white/50"
                    >
                      <span className="truncate flex items-center gap-2">
                        {m.done ? (
                          <Check
                            className="h-3 w-3 text-emerald-400"
                            aria-hidden="true"
                          />
                        ) : (
                          <span className="h-3 w-3 inline-block rounded-full border border-white/20" />
                        )}
                        {m.name}
                      </span>
                      <span className="tabular-nums shrink-0">
                        {m.total
                          ? `${fmtBytes(m.loaded)} / ${fmtBytes(m.total)}`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] text-white/40 leading-relaxed">
                  Einmaliger Download · ca. 40 MB · wird im Browser gespeichert.
                </p>
              </div>
            )}

            {/* Error */}
            {phase === "error" && errorMsg && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                <AlertCircle
                  className="h-4 w-4 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <div className="font-bold mb-0.5">
                    {erroredStep === "ffmpeg"
                      ? "Audio-Extraktion fehlgeschlagen"
                      : "Transkription fehlgeschlagen"}
                  </div>
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            {/* VTT-Output */}
            {phase === "done" && vtt && (
              <div
                className="rounded-xl border border-emerald-400/40 bg-black/60 overflow-hidden"
                style={{ boxShadow: "0 0 40px rgba(16,185,129,0.2)" }}
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-black/40">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-emerald-300 inline-flex items-center gap-1.5">
                    <Captions className="h-3 w-3" aria-hidden="true" />
                    Untertitel · WebVTT
                  </span>
                  <span className="text-[10px] font-mono text-white/40 tabular-nums">
                    {chunks.length} Segmente · {fmtBytes(vtt.length)}
                  </span>
                </div>
                <pre
                  className="p-4 text-[12px] leading-relaxed font-mono overflow-auto max-h-[420px] whitespace-pre-wrap"
                  aria-label="Generierter VTT-Code"
                >
                  {vtt.split("\n").map((line, i) => {
                    let cls = "text-white/85";
                    if (line === "WEBVTT") cls = "text-emerald-300 font-bold";
                    else if (/-->/.test(line)) cls = "text-cyan-300";
                    else if (/^\d+$/.test(line)) cls = "text-white/40";
                    return (
                      <div key={i} className={cls}>
                        {line || " "}
                      </div>
                    );
                  })}
                </pre>
              </div>
            )}

            {/* Aktions-Leiste */}
            <div className="mt-7 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={reset}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Neue Datei
              </button>
              {phase === "done" && vtt ? (
                <>
                  <button
                    type="button"
                    onClick={copyVtt}
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
                    onClick={downloadVtt}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-white/90 transition-colors"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    .vtt herunterladen
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={generateSubtitles}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? (
                    <>
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Läuft …
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      Untertitel generieren
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
          <strong>Datenschutz:</strong> Audio-Extraktion (FFmpeg) und
          Transkription (Whisper) laufen ausschließlich{" "}
          <strong>lokal in Ihrem Browser</strong>. Das Video verlässt Ihr
          Gerät nicht. Lediglich die FFmpeg- und Whisper-Programmteile werden
          beim ersten Mal von einem öffentlichen CDN geladen – Ihr Video wird
          dabei nicht übertragen.
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
      return "Datei geladen";
    case "loading-ffmpeg":
      return "FFmpeg wird geladen";
    case "extracting":
      return "Audio extrahieren";
    case "decoding":
      return "Audio dekodieren";
    case "loading-model":
      return "Whisper-Modell laden";
    case "transcribing":
      return "Transkription läuft";
    case "done":
      return "Untertitel fertig";
    case "error":
      return "Fehler";
    default:
      return "—";
  }
}

function PhaseCard({
  step,
  title,
  subtitle,
  icon,
  state,
  progress,
  hint,
}: {
  step: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  state: SubState;
  progress: number | null;
  hint: string;
}) {
  const borderClass =
    state === "done"
      ? "border-emerald-400/40"
      : state === "active"
      ? "border-emerald-400/60"
      : state === "error"
      ? "border-red-500/40"
      : "border-white/10";
  const stepBg =
    state === "done" || state === "active"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/40"
      : state === "error"
      ? "bg-red-500/15 text-red-300 border-red-400/40"
      : "bg-white/5 text-white/50 border-white/15";
  const dotColor =
    state === "active"
      ? "bg-emerald-400 animate-pulse"
      : state === "done"
      ? "bg-emerald-400"
      : state === "error"
      ? "bg-red-400"
      : "bg-white/30";
  return (
    <div
      className={`relative rounded-xl bg-black/30 border ${borderClass} p-4 transition-shadow duration-500`}
      style={{
        boxShadow:
          state === "active"
            ? "0 0 30px rgba(16,185,129,0.15)"
            : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border font-mono font-bold text-sm ${stepBg}`}
        >
          {state === "done" ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            step
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/60 font-mono inline-flex items-center gap-1.5"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
              {subtitle}
            </span>
          </div>
          <p className="font-bold text-white inline-flex items-center gap-2">
            <span className="text-emerald-300/80">{icon}</span>
            {title}
          </p>
          <p className="text-[11px] text-white/50 font-mono mt-1.5 truncate">
            {hint}
          </p>
          {progress !== null && state === "active" && (
            <div className="mt-2 h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-[width] duration-200"
                style={{ width: `${Math.max(2, progress)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HardwareBlocked({ hw }: { hw: HardwareReport }) {
  const checks: { ok: boolean; label: string; detail: string }[] = [
    {
      ok: hw.worker,
      label: "Web Worker",
      detail: hw.worker ? "Verfügbar" : "Nicht verfügbar",
    },
    {
      ok: hw.wasm,
      label: "WebAssembly",
      detail: hw.wasm ? "Verfügbar" : "Nicht verfügbar",
    },
    {
      ok: hw.audioContext,
      label: "Web Audio (Decoder)",
      detail: hw.audioContext ? "Verfügbar" : "Nicht verfügbar",
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
          Dieses Gerät unterstützt die lokale Untertitelung nicht.
        </h2>
        <p className="max-w-md text-sm text-white/70 leading-relaxed mb-8">
          Die Untertitel-Pipeline benötigt Web Worker, WebAssembly und Web
          Audio – beides läuft direkt im Browser, ohne Internet-Verbindung.
          Bitte versuchen Sie es auf einem aktuelleren Gerät oder mit einem
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
