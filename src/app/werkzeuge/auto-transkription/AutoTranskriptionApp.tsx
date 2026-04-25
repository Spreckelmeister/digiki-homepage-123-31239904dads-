"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Upload,
  Square,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Cpu,
  FileAudio,
  Download,
  ClipboardCopy,
  RotateCcw,
  Check,
  Sparkles,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// SETUP – einmalig im Projekt installieren:
//   npm i @xenova/transformers
// Modell „Xenova/whisper-tiny" (~ 40 MB) wird beim ersten Klick einmalig vom
// Hugging-Face-CDN geladen und im Browser-Cache gehalten.
// ─────────────────────────────────────────────────────────────────────────────

type Phase =
  | "checking"
  | "blocked"
  | "idle"
  | "recording"
  | "captured"
  | "decoding"
  | "loading-model"
  | "transcribing"
  | "done"
  | "error";

type Mode = "mic" | "file";

interface HardwareReport {
  worker: boolean;
  wasm: boolean;
  mediaDevices: boolean;
  audioContext: boolean;
}

interface ModelFile {
  name: string;
  loaded: number;
  total: number;
  done: boolean;
}

interface WorkerProgressData {
  status: "initiate" | "download" | "progress" | "done" | "ready";
  name?: string;
  file?: string;
  loaded?: number;
  total?: number;
  progress?: number;
}

type WorkerMessage =
  | { type: "load-progress"; data: WorkerProgressData }
  | { type: "ready" }
  | { type: "transcribing" }
  | { type: "result"; text: string }
  | { type: "error"; message: string };

function probeHardware(): HardwareReport {
  return {
    worker: typeof Worker !== "undefined",
    wasm: typeof WebAssembly !== "undefined",
    mediaDevices:
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function",
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
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function audioBlobToFloat32(
  blob: Blob,
  targetRate = 16000
): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const tmp = new Ctx();
  const decoded = await tmp.decodeAudioData(arrayBuffer.slice(0));
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

export default function AutoTranskriptionApp() {
  const [hw, setHw] = useState<HardwareReport | null>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [errorMsg, setErrorMsg] = useState("");

  const [mode, setMode] = useState<Mode>("mic");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioName, setAudioName] = useState<string>("");
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micLevel, setMicLevel] = useState(0);

  const [modelFiles, setModelFiles] = useState<Map<string, ModelFile>>(
    new Map()
  );
  const [transcript, setTranscript] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const recStartRef = useRef<number>(0);
  const recTimerRef = useRef<number | null>(null);

  // ── Hardware-Check ─────────────────────────────────────────────────
  useEffect(() => {
    const report = probeHardware();
    setHw(report);
    const ok =
      report.worker &&
      report.wasm &&
      report.mediaDevices &&
      report.audioContext;
    setPhase(ok ? "idle" : "blocked");
  }, []);

  // ── Worker initialisieren ─────────────────────────────────────────
  useEffect(() => {
    if (phase === "blocked" || phase === "checking") return;
    const w = new Worker(new URL("./whisper.worker.ts", import.meta.url), {
      type: "module",
    });
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
      } else if (msg.type === "ready") {
        // Wechsel zu transcribing erst, wenn Audio gesendet wurde
      } else if (msg.type === "result") {
        setTranscript(msg.text);
        setPhase("done");
      } else if (msg.type === "error") {
        setErrorMsg(msg.message);
        setPhase("error");
      }
    };
    w.onerror = (err) => {
      console.error("[Worker Error Event]", err);
      setErrorMsg(`Worker-Fehler: ${err.message}`);
      setPhase("error");
    };
    workerRef.current = w;
    return () => {
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  // ── Cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopMicGraph();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopMicGraph() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (recTimerRef.current !== null) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

  // ── Aufnahme starten ───────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      streamRef.current = stream;

      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.fftSize);
      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        setMicLevel(Math.min(100, rms * 220));
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();

      const mr = new MediaRecorder(stream);
      recChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(recChunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        const dur = (Date.now() - recStartRef.current) / 1000;
        setAudioBlob(blob);
        setAudioName(`Aufnahme · ${fmtTime(dur)}`);
        setAudioDuration(dur);
        setPhase("captured");
        stopMicGraph();
      };
      recRef.current = mr;
      recStartRef.current = Date.now();
      setRecordSeconds(0);
      recTimerRef.current = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
      mr.start();
      setPhase("recording");
    } catch (e) {
      const err = e as Error;
      setErrorMsg(
        err.name === "NotAllowedError"
          ? "Mikrofon-Zugriff wurde verweigert. Bitte in den Browser-Einstellungen erlauben."
          : err.message || "Mikrofon konnte nicht gestartet werden."
      );
      setPhase("error");
      stopMicGraph();
    }
  }, []);

  const stopRecording = useCallback(() => {
    recRef.current?.stop();
  }, []);

  // ── Datei akzeptieren ──────────────────────────────────────────────
  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("audio/") && !f.name.match(/\.(mp3|wav|m4a|webm|ogg|flac|aac)$/i)) {
      setErrorMsg("Bitte eine Audio-Datei wählen (MP3, WAV, M4A, WEBM, OGG).");
      return;
    }
    setErrorMsg("");
    setAudioBlob(f);
    setAudioName(f.name);
    // Dauer ermitteln
    try {
      const tmpUrl = URL.createObjectURL(f);
      const audio = new Audio(tmpUrl);
      await new Promise<void>((res, rej) => {
        audio.onloadedmetadata = () => res();
        audio.onerror = () => rej();
      });
      setAudioDuration(audio.duration || 0);
      URL.revokeObjectURL(tmpUrl);
    } catch {
      setAudioDuration(0);
    }
    setPhase("captured");
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) acceptFile(f);
    },
    [acceptFile]
  );

  // ── Transkription starten ─────────────────────────────────────────
  const transcribe = useCallback(async () => {
    if (!audioBlob || !workerRef.current) return;
    setErrorMsg("");
    setTranscript("");
    setPhase("decoding");
    try {
      const pcm = await audioBlobToFloat32(audioBlob, 16000);
      // Modell-Status: noch nicht alle "done"? → loading-model, sonst transcribing
      const allDone =
        modelFiles.size > 0 &&
        Array.from(modelFiles.values()).every((m) => m.done);
      setPhase(allDone ? "transcribing" : "loading-model");
      workerRef.current.postMessage(
        { type: "transcribe", audio: pcm },
        [pcm.buffer]
      );
    } catch (e) {
      const err = e as Error;
      setErrorMsg(
        "Audio konnte nicht dekodiert werden. " +
          (err?.message ? `(${err.message})` : "")
      );
      setPhase("error");
    }
  }, [audioBlob, modelFiles]);

  // ── Reset ──────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setAudioBlob(null);
    setAudioName("");
    setAudioDuration(0);
    setTranscript("");
    setErrorMsg("");
    setRecordSeconds(0);
    setPhase("idle");
  }, []);

  // ── Kopieren ───────────────────────────────────────────────────────
  const copyText = useCallback(async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }, [transcript]);

  // ── Download .txt ──────────────────────────────────────────────────
  const downloadTxt = useCallback(() => {
    if (!transcript) return;
    const blob = new Blob([transcript], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transkription-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [transcript]);

  // ── Aggregierte Modell-Download-Werte ──────────────────────────────
  const totalLoaded = Array.from(modelFiles.values()).reduce(
    (n, m) => n + m.loaded,
    0
  );
  const totalSize = Array.from(modelFiles.values()).reduce(
    (n, m) => n + (m.total || 0),
    0
  );
  const overallPct =
    totalSize > 0 ? Math.min(100, Math.round((totalLoaded / totalSize) * 100)) : 0;

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

  const recording = phase === "recording";
  const busy =
    phase === "decoding" ||
    phase === "loading-model" ||
    phase === "transcribing";

  return (
    <div className="space-y-8">
      {/* ── Stage ─────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl bg-slate-950 text-white shadow-xl overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: recording
              ? "radial-gradient(ellipse at 50% 0%, rgba(248,113,113,0.16) 0%, transparent 55%)"
              : phase === "done"
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
                  recording
                    ? "bg-red-400 animate-pulse"
                    : busy
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
                Web Worker · WASM
              </span>
              <span>Whisper-Tiny · DE</span>
            </div>
          </div>

          {/* Tabs */}
          {phase === "idle" && (
            <div role="tablist" aria-label="Eingabe" className="mb-6 inline-flex rounded-full border border-white/15 bg-white/5 p-1">
              <TabButton
                active={mode === "mic"}
                onClick={() => setMode("mic")}
                icon={<Mic className="h-3.5 w-3.5" aria-hidden="true" />}
                label="Mikrofon"
              />
              <TabButton
                active={mode === "file"}
                onClick={() => setMode("file")}
                icon={<FileAudio className="h-3.5 w-3.5" aria-hidden="true" />}
                label="Datei"
              />
            </div>
          )}

          {/* IDLE: Eingabe-Modus */}
          {phase === "idle" && mode === "mic" && (
            <div className="rounded-xl border border-white/10 bg-black/30 p-8 md:p-12 text-center">
              <button
                type="button"
                onClick={startRecording}
                className="mx-auto inline-flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-[0_0_50px_rgba(16,185,129,0.35)]"
                aria-label="Aufnahme starten"
              >
                <Mic className="h-9 w-9 md:h-10 md:w-10" aria-hidden="true" />
              </button>
              <p className="mt-5 text-sm text-white/70 font-mono uppercase tracking-[0.2em]">
                Aufnahme starten
              </p>
              <p className="mt-1 text-xs text-white/40">
                Sprechen Sie deutlich – die KI tippt anschließend ab.
              </p>
            </div>
          )}

          {phase === "idle" && mode === "file" && (
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
              className={`rounded-xl border-2 border-dashed p-8 md:p-12 text-center cursor-pointer transition-all ${
                isDragOver
                  ? "border-emerald-400 bg-emerald-500/10"
                  : "border-white/15 bg-black/30 hover:border-white/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) acceptFile(f);
                  e.target.value = "";
                }}
              />
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                <Upload className="h-7 w-7 text-white/70" strokeWidth={1.5} aria-hidden="true" />
              </div>
              <p className="font-bold text-white">
                Audio-Datei hierher ziehen
              </p>
              <p className="mt-1 text-xs text-white/50 font-mono">
                MP3 · WAV · M4A · WEBM · OGG
              </p>
            </div>
          )}

          {/* RECORDING */}
          {recording && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-8 text-center">
              <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-red-500/15 border border-red-500/40">
                <Mic className="h-9 w-9 text-red-300" aria-hidden="true" />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full border-2 border-red-400/50 animate-ping"
                />
              </div>
              <p className="text-3xl md:text-4xl font-bold text-white tracking-tight tabular-nums">
                {fmtTime(recordSeconds)}
              </p>
              <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.2em] text-red-300">
                Live-Aufnahme
              </p>
              {/* Mikrofon-Pegel */}
              <div className="mx-auto mt-5 max-w-xs">
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-red-400 transition-[width] duration-100"
                    style={{ width: `${micLevel}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] font-mono text-white/40 tabular-nums">
                  Pegel · {Math.round(micLevel)}
                </div>
              </div>
              <button
                type="button"
                onClick={stopRecording}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-white/90 transition-colors"
              >
                <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                Aufnahme beenden
              </button>
            </div>
          )}

          {/* CAPTURED – ready to transcribe */}
          {phase === "captured" && audioBlob && (
            <div className="rounded-xl border border-white/10 bg-black/30 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <FileAudio
                    className="h-6 w-6 text-emerald-300"
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white truncate">{audioName}</p>
                  <p className="text-xs text-white/50 font-mono mt-0.5">
                    {audioDuration > 0 && `${fmtTime(audioDuration)} · `}
                    {fmtBytes(audioBlob.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={transcribe}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-colors"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Transkription starten
              </button>
            </div>
          )}

          {/* MODEL DOWNLOAD / DECODING / TRANSCRIBING */}
          {busy && (
            <div className="rounded-xl border border-white/10 bg-black/30 p-6 space-y-4">
              <div className="flex items-center gap-3 text-sm text-white/80">
                <Loader2
                  className="h-5 w-5 animate-spin text-emerald-400"
                  aria-hidden="true"
                />
                <span className="font-bold">
                  {phase === "decoding"
                    ? "Audio wird dekodiert …"
                    : phase === "loading-model"
                    ? "Whisper-Modell wird geladen …"
                    : "KI tippt ab …"}
                </span>
              </div>

              {phase === "loading-model" && (
                <>
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-white/60 mb-1.5">
                      <span>
                        {fmtBytes(totalLoaded)}
                        {totalSize > 0 && ` / ${fmtBytes(totalSize)}`}
                      </span>
                      <span className="tabular-nums">{overallPct} %</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-[width] duration-200"
                        style={{ width: `${Math.max(2, overallPct)}%` }}
                      />
                    </div>
                  </div>
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
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Einmaliger Download · ca. 40 MB · wird im Browser gespeichert
                    und ist beim nächsten Mal sofort da.
                  </p>
                </>
              )}

              {phase === "transcribing" && (
                <p className="text-[10px] font-mono text-white/40 leading-relaxed">
                  Whisper analysiert das Audio in 30-Sekunden-Chunks.
                </p>
              )}
            </div>
          )}

          {/* ERROR */}
          {phase === "error" && errorMsg && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 flex items-start gap-3">
              <AlertCircle
                className="h-4 w-4 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* RESULT */}
          {phase === "done" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-black/40 p-5 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-emerald-300 inline-flex items-center gap-1.5">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    Transkript
                  </span>
                  <span className="text-[10px] font-mono text-white/40 tabular-nums">
                    {transcript.split(/\s+/).filter(Boolean).length} Wörter
                  </span>
                </div>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={Math.min(16, Math.max(6, transcript.split("\n").length + 2))}
                  className="w-full bg-transparent text-base md:text-lg leading-relaxed text-white placeholder-white/40 focus:outline-none resize-y font-sans"
                  spellCheck
                  aria-label="Transkribierter Text (bearbeitbar)"
                />
              </div>
              <p className="text-[11px] text-white/50">
                Tipp: Sie können den Text direkt im Feld korrigieren, bevor Sie ihn kopieren oder herunterladen.
              </p>
            </div>
          )}

          {/* ACTIONS */}
          {(phase === "captured" || phase === "done" || phase === "error") && (
            <div className="mt-7 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition-colors"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Neu starten
              </button>
              {phase === "done" && (
                <>
                  <button
                    type="button"
                    onClick={copyText}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition-colors"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" />
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* Datenschutz */}
      <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4 text-xs text-text leading-relaxed">
        <ShieldCheck
          className="h-4 w-4 text-primary shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <p>
          <strong>Datenschutz:</strong> Mikrofon-Aufnahme und Audio-Datei
          werden ausschließlich <strong>lokal in Ihrem Browser</strong>{" "}
          verarbeitet (Whisper-Tiny in einem Web Worker). Es findet kein
          Server-Upload statt. Lediglich das Modell selbst wird einmalig vom
          Hugging-Face-CDN geladen und im Browser-Cache gehalten.
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
    case "recording":
      return "Aufnahme läuft";
    case "captured":
      return "Audio bereit";
    case "decoding":
      return "Audio dekodieren";
    case "loading-model":
      return "Modell wird geladen";
    case "transcribing":
      return "KI transkribiert";
    case "done":
      return "Fertig";
    case "error":
      return "Fehler";
    default:
      return "—";
  }
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] transition-colors ${
        active
          ? "bg-white text-slate-950"
          : "text-white/60 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
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
      ok: hw.mediaDevices,
      label: "Mikrofon-API",
      detail: hw.mediaDevices
        ? "Verfügbar"
        : "Nicht verfügbar – Datei-Upload würde noch funktionieren, ist aber gesperrt",
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
          <MicOff
            className="h-8 w-8 text-red-400"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-red-300 mb-2 font-mono">
          Hardware nicht ausreichend
        </p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
          Dieses Gerät unterstützt die lokale Transkription nicht.
        </h2>
        <p className="max-w-md text-sm text-white/70 leading-relaxed mb-8">
          Whisper benötigt Web Worker, WebAssembly und (für die Mikrofon-Aufnahme)
          die Mikrofon-API. Bitte versuchen Sie es auf einem aktuelleren Gerät
          oder mit einem aktualisierten Browser (Chrome, Edge oder Firefox).
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
