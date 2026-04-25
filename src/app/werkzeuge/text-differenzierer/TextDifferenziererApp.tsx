"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Wand2,
  Sparkles,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Cpu,
  Square,
  RotateCcw,
  ClipboardCopy,
  Check,
  ArrowDownToLine,
  ArrowUpFromLine,
  List,
  HelpCircle,
  Layers,
  Download,
  HardDrive,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// SETUP – einmalig im Projekt installieren:
//   npm i @mlc-ai/web-llm
// Modell „gemma-2-2b-it-q4f32_1-MLC" (~ 1,4 GB) wird beim ersten Lauf in den
// Browser geladen und in IndexedDB / OPFS gecached. Beim zweiten Mal Sekunden.
// ─────────────────────────────────────────────────────────────────────────────

const MODEL_ID = "gemma-2-2b-it-q4f32_1-MLC";
const MODEL_LABEL = "Gemma-2 · 2B · q4f32";

interface InitProgressReport {
  progress: number;
  timeElapsed: number;
  text: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CompletionChunkChoice {
  delta?: { content?: string };
  finish_reason?: string | null;
}
interface CompletionChunk {
  choices: CompletionChunkChoice[];
  usage?: { extra?: { decode_tokens_per_s?: number } } | null;
}

interface MLCEngine {
  chat: {
    completions: {
      create: (opts: {
        messages: ChatMessage[];
        stream: true;
        temperature?: number;
        max_tokens?: number;
        stream_options?: { include_usage?: boolean };
      }) => Promise<AsyncIterable<CompletionChunk>>;
    };
  };
  interruptGenerate: () => void;
  unload?: () => Promise<void>;
}

interface WebLLMModule {
  CreateMLCEngine: (
    modelId: string,
    opts: {
      initProgressCallback?: (r: InitProgressReport) => void;
    }
  ) => Promise<MLCEngine>;
}

type Phase =
  | "checking"
  | "blocked"
  | "idle"
  | "loading-model"
  | "generating"
  | "done"
  | "stopped"
  | "error";

// ─── Hardware-Anforderungen ──────────────────────────────────────────────────
// Schwellen auf realistisches Minimum für integrierte Intel-GPUs (Iris Xe,
// Iris Plus, Arc-integrated) sowie Apple M-Series und AMD-iGPUs. Gemma-2-2B-Q4
// ist in viele kleine Tensoren zerlegt; der größte einzelne Tensor liegt bei
// ~80–150 MB, daher reicht 512 MB pro Buffer/Binding mit deutlicher Reserve.
// Höhere Schwellen (z. B. 1 GB) schließen sonst auch Hardware aus, die das
// Modell problemlos lädt (insbesondere ältere Iris Xe melden ihren Buffer-
// Maximum als 512 MB statt 2 GB). Mobile GPUs werden bereits separat über
// `isMobileClass` gefiltert.
const HW_MIN_GPU_BUFFER_BYTES = 1 << 29; // 512 MB
const HW_MIN_GPU_STORAGE_BINDING_BYTES = 1 << 29; // 512 MB
const HW_MIN_DEVICE_MEMORY_GB = 8; // navigator.deviceMemory cappt bei 8
const HW_MIN_CPU_CORES = 4;

interface HardwareReport {
  webgpu: boolean;
  gpuMaxBufferSize: number; // 0 falls kein Adapter
  gpuMaxStorageBindingSize: number; // 0 falls kein Adapter
  gpuVendor: string | null;
  gpuArchitecture: string | null;
  deviceMemoryGB: number | null;
  cpuCores: number | null;
  // Mobile/Tablet-Erkennung: selbst wenn GPU-Limits formell reichen, kollabieren
  // mobile GPUs (Mali, Adreno) unter LLM-Last regelmäßig (Thermal-Throttling,
  // Driver-Resets, "device lost") – deshalb hier separater Hard-Block.
  isMobileClass: boolean;
}

interface HardwareCheck {
  id: "deviceClass" | "webgpu" | "gpuBuffer" | "gpuStorage" | "memory" | "cpu";
  label: string;
  ok: boolean;
  detail: string;
  required: string;
}

function detectMobileClass(): boolean {
  if (typeof navigator === "undefined") return false;

  // 1. Modern: User-Agent Client Hints (Chromium 90+, kein Spoofing-Risiko)
  type UADataLike = { mobile?: boolean; platform?: string };
  const navUaData = (navigator as Navigator & { userAgentData?: UADataLike })
    .userAgentData;
  if (navUaData) {
    if (navUaData.mobile === true) return true;
    if (typeof navUaData.platform === "string") {
      const p = navUaData.platform.toLowerCase();
      if (p.includes("android") || p.includes("ios") || p === "harmonyos") {
        return true;
      }
    }
  }

  // 2. Fallback: User-Agent String (Firefox, Safari, ältere Browser)
  const ua = navigator.userAgent || "";
  if (
    /Android|iPhone|iPad|iPod|HarmonyOS|webOS|Opera Mini|IEMobile|BB10/i.test(
      ua
    )
  ) {
    return true;
  }

  // 3. Tablet-Heuristik: Touch-only + kleiner Viewport
  const noFinePointer =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    !window.matchMedia("(any-pointer: fine)").matches;
  const touchOnly =
    noFinePointer &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 0;
  if (touchOnly) return true;

  return false;
}

async function probeHardware(): Promise<HardwareReport> {
  type GPUAdapterLite = {
    limits: { maxBufferSize: number; maxStorageBufferBindingSize: number };
    info?: { vendor?: string; architecture?: string };
  };
  // `as unknown as` weil eine reine Intersection mit `Navigator` die globalen
  // WebGPU-Typen aus lib.dom.d.ts nicht überschreibt – `adapter` würde dann als
  // standard `GPUAdapter` typisiert, der in TS 5.9 noch kein `info` kennt.
  const navWithGpu = navigator as unknown as {
    gpu?: { requestAdapter: () => Promise<GPUAdapterLite | null> };
  };

  const isMobileClass = detectMobileClass();

  let webgpu = false;
  let gpuMaxBufferSize = 0;
  let gpuMaxStorageBindingSize = 0;
  let gpuVendor: string | null = null;
  let gpuArchitecture: string | null = null;

  // Auf Mobilgeräten überspringen wir den `requestAdapter()`-Aufruf komplett –
  // er kann auf manchen Treibern (Mali, Adreno) selbst schon einen Driver-Reset
  // auslösen ("device lost", "external instance reference no longer exists"),
  // bevor das Modell überhaupt geladen wird.
  if (!isMobileClass && navWithGpu.gpu) {
    try {
      const adapter = await navWithGpu.gpu.requestAdapter();
      if (adapter) {
        webgpu = true;
        try {
          gpuMaxBufferSize = adapter.limits.maxBufferSize ?? 0;
          gpuMaxStorageBindingSize =
            adapter.limits.maxStorageBufferBindingSize ?? 0;
          gpuVendor = adapter.info?.vendor ?? null;
          gpuArchitecture = adapter.info?.architecture ?? null;
        } catch {
          /* limits not readable on this driver */
        }
      }
    } catch {
      webgpu = false;
    }
  }

  const navWithMem = navigator as Navigator & { deviceMemory?: number };
  const deviceMemoryGB =
    typeof navWithMem.deviceMemory === "number"
      ? navWithMem.deviceMemory
      : null;

  const cpuCores =
    typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : null;

  return {
    webgpu,
    gpuMaxBufferSize,
    gpuMaxStorageBindingSize,
    gpuVendor,
    gpuArchitecture,
    deviceMemoryGB,
    cpuCores,
    isMobileClass,
  };
}

function fmtGB(bytes: number): string {
  if (bytes <= 0) return "—";
  return `${(bytes / (1 << 30)).toFixed(2)} GB`;
}

function evaluateHardware(hw: HardwareReport): {
  ok: boolean;
  checks: HardwareCheck[];
} {
  const checks: HardwareCheck[] = [
    {
      id: "deviceClass",
      label: "Geräteklasse",
      ok: !hw.isMobileClass,
      detail: hw.isMobileClass
        ? "Smartphone oder Tablet erkannt – mobile GPUs (Mali, Adreno, Apple A-Series) brechen unter LLM-Last regelmäßig ab (Driver-Reset, Thermal-Throttling)"
        : "Desktop / Laptop",
      required: "PC oder Laptop",
    },
    {
      id: "webgpu",
      label: "WebGPU",
      ok: hw.webgpu,
      detail: hw.isMobileClass
        ? "nicht geprüft – Mobilgerät erkannt"
        : hw.webgpu
        ? `aktiv${hw.gpuVendor ? ` · ${hw.gpuVendor}` : ""}${
            hw.gpuArchitecture ? ` · ${hw.gpuArchitecture}` : ""
          }`
        : "Kein WebGPU-Adapter erreichbar",
      required: "Browser mit aktivem WebGPU-Adapter",
    },
    {
      id: "gpuBuffer",
      label: "GPU-Buffer",
      ok: hw.gpuMaxBufferSize >= HW_MIN_GPU_BUFFER_BYTES,
      detail: hw.isMobileClass
        ? "nicht geprüft – Mobilgerät erkannt"
        : hw.gpuMaxBufferSize
        ? `max. ${fmtGB(hw.gpuMaxBufferSize)} pro Buffer`
        : "Unbekannt – kein GPU-Adapter",
      required: `≥ ${fmtGB(HW_MIN_GPU_BUFFER_BYTES)}`,
    },
    {
      id: "gpuStorage",
      label: "GPU-Storage",
      ok: hw.gpuMaxStorageBindingSize >= HW_MIN_GPU_STORAGE_BINDING_BYTES,
      detail: hw.isMobileClass
        ? "nicht geprüft – Mobilgerät erkannt"
        : hw.gpuMaxStorageBindingSize
        ? `max. ${fmtGB(hw.gpuMaxStorageBindingSize)} pro Storage-Binding`
        : "Unbekannt – kein GPU-Adapter",
      required: `≥ ${fmtGB(HW_MIN_GPU_STORAGE_BINDING_BYTES)}`,
    },
    {
      id: "memory",
      label: "Arbeitsspeicher",
      // null behandeln wir tolerant: ältere/restriktive Browser melden nichts.
      // GPU-Limits oben filtern in der Regel schon zuverlässig schwache Geräte.
      ok:
        hw.deviceMemoryGB === null ||
        hw.deviceMemoryGB >= HW_MIN_DEVICE_MEMORY_GB,
      detail:
        hw.deviceMemoryGB === null
          ? "vom Browser nicht gemeldet"
          : `${hw.deviceMemoryGB} GB${
              hw.deviceMemoryGB >= HW_MIN_DEVICE_MEMORY_GB
                ? ""
                : " (zu wenig für 1,4 GB Modell + Browser + System)"
            }`,
      required: `≥ ${HW_MIN_DEVICE_MEMORY_GB} GB`,
    },
    {
      id: "cpu",
      label: "CPU-Kerne",
      ok: hw.cpuCores === null || hw.cpuCores >= HW_MIN_CPU_CORES,
      detail:
        hw.cpuCores === null
          ? "vom Browser nicht gemeldet"
          : `${hw.cpuCores} logische Kerne`,
      required: `≥ ${HW_MIN_CPU_CORES}`,
    },
  ];
  return { ok: checks.every((c) => c.ok), checks };
}

interface Action {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  system: string;
  userTemplate: (text: string) => string;
}

const ACTIONS: Action[] = [
  {
    id: "vereinfachen",
    label: "Vereinfachen",
    hint: "Für jüngere Klassen",
    icon: <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />,
    system:
      "Du bist eine Lehrer-Assistenz für eine deutsche Grundschule. Vereinfache den vorgelegten Text für Schülerinnen und Schüler einer 3. Klasse: nutze kurze Sätze, vermeide Fachwörter, behalte alle Kernaussagen bei. Antworte ausschließlich mit dem vereinfachten Text – keine Vorrede, keine Kommentare.",
    userTemplate: (t) => `Bitte vereinfachen:\n\n${t}`,
  },
  {
    id: "zusammenfassen",
    label: "Zusammenfassen",
    hint: "3–4 Sätze",
    icon: <Layers className="h-4 w-4" aria-hidden="true" />,
    system:
      "Du bist eine Lehrer-Assistenz. Fasse den vorgelegten Text in 3 bis 4 vollständigen Sätzen zusammen, sprachlich auf Grundschul-Niveau. Antworte ausschließlich mit der Zusammenfassung.",
    userTemplate: (t) => `Bitte zusammenfassen:\n\n${t}`,
  },
  {
    id: "anspruchsvoller",
    label: "Anspruchsvoller",
    hint: "Wortschatz erweitern",
    icon: <ArrowUpFromLine className="h-4 w-4" aria-hidden="true" />,
    system:
      "Du bist eine Lehrer-Assistenz. Schreibe den vorgelegten Text mit etwas anspruchsvollerem Wortschatz und etwas mehr Detail um – geeignet für leistungsstarke Grundschulkinder (4. Klasse). Behalte alle Kernaussagen. Antworte ausschließlich mit dem überarbeiteten Text.",
    userTemplate: (t) => `Bitte anspruchsvoller machen:\n\n${t}`,
  },
  {
    id: "stichpunkte",
    label: "Stichpunkte",
    hint: "Übersichtliche Liste",
    icon: <List className="h-4 w-4" aria-hidden="true" />,
    system:
      "Du bist eine Lehrer-Assistenz. Wandle den vorgelegten Text in eine übersichtliche Stichpunkt-Liste auf Grundschul-Niveau um. Verwende kurze, klare Bullet Points (mit '- '). Antworte ausschließlich mit der Liste.",
    userTemplate: (t) => `Bitte in Stichpunkte umwandeln:\n\n${t}`,
  },
  {
    id: "fragen",
    label: "Verständnisfragen",
    hint: "5 Fragen zum Text",
    icon: <HelpCircle className="h-4 w-4" aria-hidden="true" />,
    system:
      "Du bist eine Lehrer-Assistenz. Erstelle genau 5 nummerierte Verständnisfragen zum vorgelegten Text, die für eine Grundschulklasse geeignet sind. Antworte ausschließlich mit den nummerierten Fragen.",
    userTemplate: (t) => `Erstelle Verständnisfragen zu folgendem Text:\n\n${t}`,
  },
];

export default function TextDifferenziererApp() {
  const [hw, setHw] = useState<HardwareReport | null>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [errorMsg, setErrorMsg] = useState("");

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStatus, setLoadStatus] = useState("");
  const [modelReady, setModelReady] = useState(false);
  const [tps, setTps] = useState<number | null>(null);

  const [copied, setCopied] = useState(false);

  const engineRef = useRef<MLCEngine | null>(null);
  const enginePromiseRef = useRef<Promise<MLCEngine> | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);

  // ── Hardware-Check ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const report = await probeHardware();
      if (cancelled) return;
      setHw(report);
      const { ok } = evaluateHardware(report);
      setPhase(ok ? "idle" : "blocked");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      try {
        engineRef.current?.interruptGenerate();
      } catch {
        /* ignore */
      }
      engineRef.current?.unload?.().catch(() => {});
    };
  }, []);

  // ── Auto-Scroll Output ────────────────────────────────────────────
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  async function ensureEngine(): Promise<MLCEngine> {
    if (engineRef.current) return engineRef.current;
    if (enginePromiseRef.current) return enginePromiseRef.current;
    setPhase("loading-model");
    setLoadProgress(0);
    setLoadStatus("Initialisiere WebGPU …");

    enginePromiseRef.current = (async () => {
      try {
        const mod = (await import("@mlc-ai/web-llm")) as unknown as WebLLMModule;
        const engine = await mod.CreateMLCEngine(MODEL_ID, {
          initProgressCallback: (r) => {
            setLoadProgress(Math.min(100, Math.round((r.progress || 0) * 100)));
            setLoadStatus(r.text || "Modell wird geladen …");
          },
        });
        engineRef.current = engine;
        setModelReady(true);
        return engine;
      } catch (e) {
        const err = e as Error;
        console.error("[WebLLM Init Error]", err);
        
        let userMsg = "Modell konnte nicht geladen werden. ";
        if (err?.message?.includes("NetworkError") || err?.message?.includes("fetch")) {
          userMsg += "Netzwerkfehler – überprüfen Sie Ihre Internetverbindung.";
        } else if (err?.message?.includes("WebGPU")) {
          userMsg += "WebGPU wird nicht unterstützt.";
        } else if (err?.message?.includes("memory") || err?.message?.includes("Memory")) {
          userMsg += "Nicht genug Arbeitsspeicher verfügbar.";
        } else if (err?.message) {
          userMsg += `(${err.message})`;
        }
        
        throw new Error(userMsg);
      }
    })();
    try {
      const engine = await enginePromiseRef.current;
      return engine;
    } finally {
      enginePromiseRef.current = null;
    }
  }

  // ── Generieren ─────────────────────────────────────────────────────
  const generate = useCallback(
    async (action: Action) => {
      if (!input.trim() || !hw) return;
      setErrorMsg("");
      setOutput("");
      setActiveActionId(action.id);
      setTps(null);

      try {
        const engine = await ensureEngine();
        setPhase("generating");

        const messages: ChatMessage[] = [
          { role: "system", content: action.system },
          { role: "user", content: action.userTemplate(input.trim()) },
        ];

        const stream = await engine.chat.completions.create({
          messages,
          stream: true,
          temperature: 0.5,
          max_tokens: 800,
          stream_options: { include_usage: true },
        });

        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content || "";
          if (delta) {
            setOutput((prev) => prev + delta);
          }
          const t = chunk.usage?.extra?.decode_tokens_per_s;
          if (typeof t === "number") setTps(Math.round(t));
        }

        setPhase((p) => (p === "stopped" ? "stopped" : "done"));
      } catch (e) {
        const err = e as Error;
        console.error("[TextDifferenzierer]", err);
        // "interrupt" werfen wir absichtlich – nicht als Fehler werten
        if (err?.message?.toLowerCase().includes("interrupt")) {
          setPhase("stopped");
          return;
        }
        const errMsg = err?.message || "Unbekannter Fehler";
        setErrorMsg(errMsg);
        setPhase("error");
      }
    },
    [input, hw]
  );

  const stopGeneration = useCallback(() => {
    try {
      engineRef.current?.interruptGenerate();
      setPhase("stopped");
    } catch {
      /* ignore */
    }
  }, []);

  const reset = useCallback(() => {
    try {
      engineRef.current?.interruptGenerate();
    } catch {
      /* ignore */
    }
    setOutput("");
    setActiveActionId(null);
    setErrorMsg("");
    setTps(null);
    setPhase(modelReady ? "idle" : "idle");
  }, [modelReady]);

  const copyOutput = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }, [output]);

  const downloadTxt = useCallback(() => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `text-differenziert-${
      activeActionId || "ausgabe"
    }-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [output, activeActionId]);

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
    return (
      <HardwareBlocked
        hw={hw}
        onOverride={hw.isMobileClass ? undefined : () => setPhase("idle")}
      />
    );
  }

  const generating = phase === "generating";
  const loadingModel = phase === "loading-model";

  return (
    <div className="space-y-8">
      {/* ── Setup-Banner (vor dem ersten Modell-Download) ─────────── */}
      {!modelReady && phase === "idle" && (
        <div className="rounded-2xl bg-gradient-to-br from-primary to-teal-dark text-white p-5 md:p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 border border-white/20">
              <HardDrive className="h-6 w-6 text-accent" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent/90 mb-1 font-mono">
                Einmaliger Setup-Download
              </p>
              <p className="text-base md:text-lg font-bold leading-snug">
                Beim ersten Klick wird das Sprachmodell ({MODEL_LABEL}) einmalig
                in Ihren Browser geladen.
              </p>
              <p className="mt-1.5 text-sm text-white/80 leading-relaxed">
                Größe ca. <strong>1,4 GB</strong>. Danach läuft alles offline
                und sofort. Empfohlen: stabile WLAN-Verbindung beim Erstaufruf.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Stage ─────────────────────────────────────────────────── */}
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
                  generating || loadingModel
                    ? "bg-emerald-400 animate-pulse"
                    : phase === "done"
                    ? "bg-emerald-400"
                    : phase === "error"
                    ? "bg-red-400"
                    : phase === "stopped"
                    ? "bg-amber-400"
                    : "bg-white/40"
                }`}
              />
              {phaseLabel(phase)}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <Cpu className="h-3 w-3" aria-hidden="true" />
                WebGPU
              </span>
              <span>{MODEL_LABEL}</span>
              {tps !== null && (
                <span className="tabular-nums text-emerald-300">
                  {tps} tok/s
                </span>
              )}
            </div>
          </div>

          {/* Modell-Download (prominent) */}
          {loadingModel && (
            <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Loader2
                  className="h-5 w-5 animate-spin text-emerald-400"
                  aria-hidden="true"
                />
                <span className="text-sm font-bold text-white">
                  Modell wird vorbereitet
                </span>
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-mono text-white/60 mb-1.5">
                  <span className="truncate pr-2">{loadStatus || "…"}</span>
                  <span className="tabular-nums shrink-0">
                    {loadProgress} %
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-[width] duration-200"
                    style={{ width: `${Math.max(2, loadProgress)}%` }}
                  />
                </div>
              </div>
              <p className="mt-3 text-[10px] text-white/50 leading-relaxed">
                Einmaliger Download · ca. 1,4 GB · wird in IndexedDB gespeichert
                und ist beim nächsten Mal sofort da.
              </p>
            </div>
          )}

          {/* Split-Screen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
            {/* Eingabe */}
            <div className="relative rounded-xl bg-black/40 border border-white/15 overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-black/40">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-white/70 inline-flex items-center gap-1.5">
                  <Wand2 className="h-3 w-3" aria-hidden="true" />
                  Originaltext
                </span>
                <span className="text-[10px] font-mono text-white/40 tabular-nums">
                  {input.length} Zeichen ·{" "}
                  {input.split(/\s+/).filter(Boolean).length} Wörter
                </span>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hier den Originaltext einfügen … (z. B. ein Sachtext aus dem Schulbuch)"
                rows={12}
                className="w-full bg-transparent p-4 text-sm md:text-base leading-relaxed text-white placeholder-white/40 focus:outline-none resize-y font-sans min-h-[280px]"
                aria-label="Originaltext eingeben"
                disabled={generating}
              />
            </div>

            {/* Ausgabe */}
            <div
              className={`relative rounded-xl bg-black/40 border ${
                output ? "border-emerald-400/40" : "border-white/15"
              } overflow-hidden transition-shadow duration-500`}
              style={{
                boxShadow: output
                  ? "0 0 40px rgba(16,185,129,0.2)"
                  : undefined,
              }}
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-black/40">
                <span
                  className={`text-[10px] font-mono font-bold uppercase tracking-[0.22em] inline-flex items-center gap-1.5 ${
                    output ? "text-emerald-300" : "text-white/70"
                  }`}
                >
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {activeActionId
                    ? ACTIONS.find((a) => a.id === activeActionId)?.label ||
                      "Ergebnis"
                    : "Ergebnis"}
                </span>
                <span className="text-[10px] font-mono text-white/40 tabular-nums">
                  {output
                    ? `${output.split(/\s+/).filter(Boolean).length} Wörter`
                    : "—"}
                </span>
              </div>
              <div
                ref={outputRef}
                className="p-4 text-sm md:text-base leading-relaxed text-white whitespace-pre-wrap min-h-[280px] max-h-[480px] overflow-y-auto"
                aria-live="polite"
                aria-busy={generating}
              >
                {output ? (
                  <>
                    {output}
                    {generating && (
                      <span
                        aria-hidden="true"
                        className="ml-0.5 inline-block w-2 h-4 align-middle bg-emerald-400 animate-pulse"
                      />
                    )}
                  </>
                ) : generating || loadingModel ? (
                  <div className="flex items-center justify-center h-full text-white/40 px-2">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <Loader2
                        className="h-8 w-8 animate-spin text-emerald-400"
                        aria-hidden="true"
                      />
                      <span className="text-xs font-mono uppercase tracking-[0.2em] text-white/70">
                        {loadingModel
                          ? "Modell wird geladen"
                          : "KI denkt nach …"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-white/40 px-2">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <Sparkles
                        className="h-8 w-8 text-emerald-400/70"
                        aria-hidden="true"
                        strokeWidth={1.5}
                      />
                      <span className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">
                        Aktion unten wählen
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Aktions-Chips */}
          <div className="mt-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/50 font-mono mb-3">
              Aktion wählen
            </p>
            <div className="flex flex-wrap gap-2">
              {ACTIONS.map((a) => {
                const isActive = activeActionId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => generate(a)}
                    disabled={generating || loadingModel || !input.trim()}
                    aria-pressed={isActive}
                    className={`group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isActive && (generating || phase === "done")
                        ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                        : "border-white/15 bg-white/5 text-white hover:border-emerald-400/40 hover:bg-emerald-500/10"
                    }`}
                  >
                    <span
                      className={`${
                        isActive ? "text-emerald-300" : "text-white/70 group-hover:text-emerald-300"
                      } transition-colors`}
                    >
                      {a.icon}
                    </span>
                    <span>{a.label}</span>
                    <span className="text-[10px] font-mono font-normal text-white/40 hidden sm:inline">
                      · {a.hint}
                    </span>
                  </button>
                );
              })}
            </div>
            {!input.trim() && (
              <p className="mt-3 text-[11px] text-white/40">
                Bitte erst einen Text einfügen.
              </p>
            )}
          </div>

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
              disabled={generating || loadingModel}
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Ergebnis zurücksetzen
            </button>
            {generating && (
              <button
                type="button"
                onClick={stopGeneration}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors"
              >
                <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                Stoppen
              </button>
            )}
            {output && !generating && (
              <>
                <button
                  type="button"
                  onClick={copyOutput}
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
        </div>
      </div>

      {/* ── Datenschutz ───────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4 text-xs text-text leading-relaxed">
        <ShieldCheck
          className="h-4 w-4 text-primary shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <p>
          <strong>Datenschutz:</strong> Das Sprachmodell läuft komplett auf
          Ihrer <strong>GPU im Browser</strong> (WebGPU). Weder der eingefügte
          Text noch die Ergebnisse werden an einen Server gesendet. Die
          Modell-Datei wird beim ersten Mal von einem öffentlichen CDN geladen
          und in Ihrem Browser gespeichert.
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
    case "loading-model":
      return "Modell wird geladen";
    case "generating":
      return "KI generiert";
    case "done":
      return "Fertig";
    case "stopped":
      return "Gestoppt";
    case "error":
      return "Fehler";
    default:
      return "—";
  }
}

function HardwareBlocked({
  hw,
  onOverride,
}: {
  hw: HardwareReport;
  onOverride?: () => void;
}) {
  const { checks } = evaluateHardware(hw);
  const failingCount = checks.filter((c) => !c.ok).length;

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
          Hardware-Anforderungen nicht erfüllt
        </p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
          Dieses Gerät reicht für das lokale KI-Sprachmodell leider nicht aus.
        </h2>
        <p className="max-w-xl text-sm text-white/70 leading-relaxed mb-8">
          Der Text-Differenzierer lädt ein <strong className="text-white">1,4&nbsp;GB
          großes Sprachmodell</strong> direkt in Ihren Browser und führt es auf
          Ihrer GPU aus. Das funktioniert zuverlässig auf <strong className="text-white">PCs
          und Laptops mit dedizierter Grafikkarte</strong> oder modernen
          integrierten GPUs. <strong className="text-white">Smartphones, Tablets
          und ältere PCs</strong> erfüllen die Anforderungen meist nicht – das
          Modell würde während der Antwort einfrieren oder den Browser zum
          Absturz bringen.
        </p>

        <div className="w-full max-w-xl">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/50 font-mono">
              Hardware-Check
            </span>
            <span className="text-[10px] font-mono text-white/50 tabular-nums">
              {checks.length - failingCount} / {checks.length} ok
            </span>
          </div>
          <ul className="space-y-2 text-left">
            {checks.map((c) => (
              <li
                key={c.id}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                  c.ok
                    ? "border-emerald-500/25 bg-emerald-500/5"
                    : "border-red-500/30 bg-red-500/10"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                    c.ok ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <span className="font-bold text-white">{c.label}</span>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-[0.18em] ${
                        c.ok ? "text-emerald-300" : "text-red-300"
                      }`}
                    >
                      {c.ok ? "ok" : "zu schwach"}
                    </span>
                  </div>
                  <div className="text-xs text-white/70 font-mono mt-0.5">
                    {c.detail}
                  </div>
                  <div className="text-[11px] text-white/40 font-mono mt-0.5">
                    Benötigt: {c.required}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[11px] text-white/50 leading-relaxed">
            Tipp: Nutzen Sie einen aktuellen <strong className="text-white">Chrome,
            Edge oder Firefox 141+</strong> auf einem PC oder Laptop. Andere
            KI-Werkzeuge (z.B. Hintergrund-Entferner, Auto-Transkription,
            Arbeitsblatt-Scanner) laufen mit deutlich geringerer Hardware und
            funktionieren auch auf Tablets und Smartphones.
          </p>

          {onOverride && (
            <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 text-left">
              <p className="text-[11px] text-white/60 leading-relaxed mb-3">
                <strong className="text-white">Trotzdem versuchen:</strong>{" "}
                Manche Browser melden GPU-Limits konservativ, obwohl die
                Hardware mehr kann. Wenn Sie ein modernes Notebook mit
                ausreichend RAM haben, können Sie das Laden des Modells
                erzwingen. Bei zu schwacher GPU bricht der Browser oder Tab
                anschließend ggf. ab – Ihre Eingaben gehen dann verloren.
              </p>
              <button
                type="button"
                onClick={onOverride}
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition-colors"
              >
                Hardware-Check ignorieren und trotzdem laden
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
