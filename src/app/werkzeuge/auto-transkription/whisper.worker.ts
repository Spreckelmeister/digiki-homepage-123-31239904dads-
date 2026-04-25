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
    const mod = (await import(
      "@xenova/transformers"
    )) as unknown as TransformersModule;
    mod.env.allowLocalModels = false;
    // Single-Thread WASM – läuft auch ohne SharedArrayBuffer-Header.
    if (mod.env.backends?.onnx?.wasm) {
      mod.env.backends.onnx.wasm.numThreads = 1;
    }
    const t = await mod.pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny",
      {
        progress_callback: (p) => {
          (self as unknown as DedicatedWorkerGlobalScope).postMessage({
            type: "load-progress",
            data: p,
          });
        },
      }
    );
    return t;
  })();
  return transcriberPromise;
}

self.addEventListener("message", async (e: MessageEvent<WorkerRequest>) => {
  const ctx = self as unknown as DedicatedWorkerGlobalScope;
  const msg = e.data;
  try {
    if (msg.type === "init") {
      await ensurePipeline();
      ctx.postMessage({ type: "ready" });
      return;
    }
    if (msg.type === "transcribe") {
      if (!msg.audio || msg.audio.length === 0) {
        throw new Error("Keine Audio-Daten erhalten.");
      }
      
      const transcriber = await ensurePipeline();
      ctx.postMessage({ type: "ready" });
      ctx.postMessage({ type: "transcribing" });
      
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
        // Fallback ohne language-spezifische Parameter
        console.warn("Retry ohne language-Parameter", transErr);
        result = await transcriber(msg.audio, {
          task: "transcribe",
          chunk_length_s: 30,
          stride_length_s: 5,
          return_timestamps: false,
        });
      }
      
      if (!result) {
        throw new Error("Transkription hat kein Ergebnis zurückgegeben.");
      }
      
      const transcript = typeof result.text === "string" 
        ? result.text.trim() 
        : typeof result === "string"
        ? (result as string).trim()
        : JSON.stringify(result);
        
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
