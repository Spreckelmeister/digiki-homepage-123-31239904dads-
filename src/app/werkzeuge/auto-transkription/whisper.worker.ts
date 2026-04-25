/// <reference lib="webworker" />

// ─────────────────────────────────────────────────────────────────────────────
// Whisper-Tiny Web Worker
// SETUP: npm i @xenova/transformers
// Modell wird beim ersten Lauf von Hugging Face geladen und im Browser-Cache
// (IndexedDB) abgelegt – ab dem zweiten Lauf nahezu instant.
// ─────────────────────────────────────────────────────────────────────────────

type ProgressEntry = {
  status: "initiate" | "download" | "progress" | "done" | "ready";
  name?: string;
  file?: string;
  loaded?: number;
  total?: number;
  progress?: number;
  task?: string;
  model?: string;
};

type TranscribeRequest = {
  type: "transcribe";
  audio: Float32Array;
};

type InitRequest = { type: "init" };
type WorkerRequest = TranscribeRequest | InitRequest;

interface Transcriber {
  (
    audio: Float32Array,
    opts: Record<string, unknown>
  ): Promise<{ text: string }>;
}

type TransformersModule = {
  pipeline: (
    task: string,
    model: string,
    opts: { progress_callback?: (p: ProgressEntry) => void }
  ) => Promise<Transcriber>;
  env: {
    allowLocalModels: boolean;
    backends?: { onnx?: { wasm?: { numThreads?: number } } };
  };
};

let transcriberPromise: Promise<Transcriber> | null = null;

async function ensurePipeline(): Promise<Transcriber> {
  if (transcriberPromise) return transcriberPromise;
  
  transcriberPromise = (async () => {
    try {
      console.log("[Worker] Importing transformers...");
      // Direkter Import mit destructuring
      const transformers = await import("@xenova/transformers");
      
      console.log("[Worker] Raw import type:", typeof transformers);
      console.log("[Worker] Keys:", Object.keys(transformers).slice(0, 15));
      
      // Verschiedene mögliche Export-Wege
      let pipeline = transformers.pipeline || (transformers as any).default?.pipeline;
      let env = transformers.env || (transformers as any).default?.env;
      
      if (!pipeline) {
        // Fallback: Versuche auf default zuzugreifen
        const defaultExport = (transformers as any).default;
        if (defaultExport && typeof defaultExport === "object") {
          pipeline = defaultExport.pipeline;
          env = defaultExport.env;
        }
      }
      
      if (typeof pipeline !== "function") {
        throw new Error(
          `pipeline is not a function. Type: ${typeof pipeline}, ` +
          `Available: ${Object.keys(transformers).join(", ")}`
        );
      }
      
      console.log("[Worker] Setting environment...");
      if (env && typeof env === "object") {
        env.allowLocalModels = false;
        
        // Single-Thread WASM
        if (env.backends?.onnx?.wasm) {
          env.backends.onnx.wasm.numThreads = 1;
        }
      }
      
      console.log("[Worker] Loading Whisper model...");
      const transcriber = await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny",
        {
          progress_callback: (p: ProgressEntry) => {
            console.log("[Worker] Progress:", p.status, p.file || "");
            (self as unknown as DedicatedWorkerGlobalScope).postMessage({
              type: "load-progress",
              data: p,
            });
          },
        }
      );
      
      if (!transcriber || typeof transcriber !== "function") {
        throw new Error(
          `Pipeline returned invalid result: ${typeof transcriber}`
        );
      }
      
      console.log("[Worker] Pipeline ready!");
      return transcriber;
    } catch (err) {
      console.error("[Worker] Pipeline error:", err);
      transcriberPromise = null; // Reset für nächsten Retry
      throw err;
    }
  })();
  
  return transcriberPromise;
}

self.addEventListener("message", async (e: MessageEvent<WorkerRequest>) => {
  const ctx = self as unknown as DedicatedWorkerGlobalScope;
  const msg = e.data;
  
  try {
    console.log("[Worker] Message received:", msg.type);
    
    if (msg.type === "init") {
      console.log("[Worker] Init requested");
      await ensurePipeline();
      ctx.postMessage({ type: "ready" });
      return;
    }
    
    if (msg.type === "transcribe") {
      console.log("[Worker] Transcribe requested, audio length:", msg.audio?.length);
      
      if (!msg.audio || msg.audio.length === 0) {
        throw new Error("Keine Audio-Daten erhalten.");
      }
      
      const transcriber = await ensurePipeline();
      console.log("[Worker] Transcriber ready");
      
      ctx.postMessage({ type: "ready" });
      ctx.postMessage({ type: "transcribing" });
      
      console.log("[Worker] Starting transcription...");
      let result;
      
      try {
        result = await transcriber(msg.audio, {
          language: "de",
          task: "transcribe",
          chunk_length_s: 30,
          stride_length_s: 5,
          return_timestamps: false,
        });
      } catch (transErr) {
        console.warn("[Worker] Transcription error, retrying without language:", transErr);
        // Fallback ohne language-spezifische Parameter
        result = await transcriber(msg.audio, {
          task: "transcribe",
          chunk_length_s: 30,
          stride_length_s: 5,
          return_timestamps: false,
        });
      }
      
      console.log("[Worker] Transcription result:", result);
      
      if (!result) {
        throw new Error("Transkription hat kein Ergebnis zurückgegeben.");
      }
      
      const transcript = typeof result.text === "string" 
        ? result.text.trim() 
        : typeof result === "string"
        ? (result as string).trim()
        : JSON.stringify(result);
      
      console.log("[Worker] Sending transcript:", transcript.slice(0, 50));
      ctx.postMessage({
        type: "result",
        text: transcript,
      });
    }
  } catch (err) {
    const e = err as Error;
    console.error("[Worker Error]", e);
    ctx.postMessage({
      type: "error",
      message: e?.message || "Worker-Fehler bei der Transkription",
    });
  }
});

export {};
