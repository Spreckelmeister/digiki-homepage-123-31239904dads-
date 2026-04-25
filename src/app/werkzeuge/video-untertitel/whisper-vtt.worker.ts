/// <reference lib="webworker" />

// ─────────────────────────────────────────────────────────────────────────────
// Whisper-Tiny Worker mit Timestamps für VTT-Untertitel
// SETUP: npm i @xenova/transformers
// Liefert pro Segment Start- und Endzeit zurück.
// ─────────────────────────────────────────────────────────────────────────────

type ProgressEntry = {
  status: "initiate" | "download" | "progress" | "done" | "ready";
  name?: string;
  file?: string;
  loaded?: number;
  total?: number;
  progress?: number;
};

export interface VttChunk {
  text: string;
  timestamp: [number | null, number | null];
}

interface TranscriberResult {
  text: string;
  chunks?: VttChunk[];
}

interface Transcriber {
  (
    audio: Float32Array,
    opts: Record<string, unknown>
  ): Promise<TranscriberResult>;
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

type WorkerRequest =
  | { type: "init" }
  | { type: "transcribe"; audio: Float32Array };

let transcriberPromise: Promise<Transcriber> | null = null;

async function ensurePipeline(): Promise<Transcriber> {
  if (transcriberPromise) return transcriberPromise;
  transcriberPromise = (async () => {
    const mod = (await import(
      "@xenova/transformers"
    )) as unknown as TransformersModule;
    mod.env.allowLocalModels = false;
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
      const transcriber = await ensurePipeline();
      ctx.postMessage({ type: "transcribing" });
      // chunk_length_s/stride_length_s nur einsetzen, wenn das Audio länger
      // als chunk_length_s ist – sonst wird der Long-Form-Pfad in
      // transformers.js v2 aktiviert und scheitert teils mit "can't convert
      // undefined to object" beim Zusammenfügen leerer Chunks.
      const audioSeconds = msg.audio.length / 16000;
      const opts: Record<string, unknown> = {
        language: "german",
        task: "transcribe",
        return_timestamps: true,
      };
      if (audioSeconds > 30) {
        opts.chunk_length_s = 30;
        opts.stride_length_s = 5;
      }
      const result = await transcriber(msg.audio, opts);
      ctx.postMessage({
        type: "result",
        text: (result?.text ?? "").trim(),
        chunks: result?.chunks ?? [],
      });
    }
  } catch (err) {
    const e = err as Error;
    ctx.postMessage({
      type: "error",
      message: `${e?.message || "Worker-Fehler"}${
        e?.stack ? `\n${e.stack.split("\n").slice(0, 4).join("\n")}` : ""
      }`,
    });
  }
});

export {};
