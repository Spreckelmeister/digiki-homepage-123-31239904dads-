/// <reference lib="webworker" />

// ─────────────────────────────────────────────────────────────────────────────
// Whisper-Tiny Web Worker (Diktiergerät)
// SETUP: npm i @huggingface/transformers
// (v4 statt @xenova/transformers v2.17 – dort hatte Whisper bekannte
// Timestamp-Bugs.)
// Modell: onnx-community/whisper-tiny @ fp32 (Xenova-Repo hat kaputte
// MatMulNBits-Skalen; q4/q8 schlagen mit "Missing required scale: ..."
// fehl.) Modell wird beim ersten Lauf vom HF-CDN geladen und im
// CacheStorage des Browsers abgelegt – ab dem zweiten Lauf instant.
// ─────────────────────────────────────────────────────────────────────────────

type ProgressEntry = {
  status: "initiate" | "download" | "progress" | "done" | "ready";
  name?: string;
  file?: string;
  loaded?: number;
  total?: number;
  progress?: number;
};

type TranscribeRequest = {
  type: "transcribe";
  audio: Float32Array;
};

type InitRequest = { type: "init" };
type WorkerRequest = TranscribeRequest | InitRequest;

interface TranscriberResult {
  text: string;
}

interface Transcriber {
  (
    audio: Float32Array,
    opts: Record<string, unknown>
  ): Promise<TranscriberResult | TranscriberResult[]>;
}

type DType =
  | "fp32"
  | "fp16"
  | "q8"
  | "int8"
  | "uint8"
  | "q4"
  | "q4f16";

type TransformersModule = {
  pipeline: (
    task: string,
    model: string,
    opts: {
      progress_callback?: (p: ProgressEntry) => void;
      dtype?: DType | Record<string, DType>;
      device?: "cpu" | "wasm" | "webgpu";
    }
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
      const mod = (await import(
        "@huggingface/transformers"
      )) as unknown as TransformersModule;

      mod.env.allowLocalModels = false;
      if (mod.env.backends?.onnx?.wasm) {
        mod.env.backends.onnx.wasm.numThreads = 1;
      }

      const transcriber = await mod.pipeline(
        "automatic-speech-recognition",
        "onnx-community/whisper-tiny",
        {
          dtype: {
            encoder_model: "fp32",
            decoder_model_merged: "fp32",
          },
          device: "wasm",
          progress_callback: (p: ProgressEntry) => {
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

      return transcriber;
    } catch (err) {
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

      // chunk_length_s/stride_length_s nur ab > 30 s setzen – kürzeres Audio
      // braucht den Long-Form-Pfad nicht.
      const audioSeconds = msg.audio.length / 16000;
      const opts: Record<string, unknown> = {
        language: "german",
        task: "transcribe",
        return_timestamps: false,
      };
      if (audioSeconds > 30) {
        opts.chunk_length_s = 30;
        opts.stride_length_s = 5;
      }

      const result = await transcriber(msg.audio, opts);

      const single = Array.isArray(result) ? result[0] : result;
      const transcript =
        typeof single?.text === "string" ? single.text.trim() : "";

      ctx.postMessage({
        type: "result",
        text: transcript,
      });
    }
  } catch (err) {
    const e = err as Error;
    ctx.postMessage({
      type: "error",
      message: `${e?.message || "Worker-Fehler bei der Transkription"}${
        e?.stack ? `\n${e.stack.split("\n").slice(0, 4).join("\n")}` : ""
      }`,
    });
  }
});

export {};
