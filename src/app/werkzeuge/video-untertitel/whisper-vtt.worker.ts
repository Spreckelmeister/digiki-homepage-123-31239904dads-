/// <reference lib="webworker" />

// ─────────────────────────────────────────────────────────────────────────────
// Whisper-Tiny Worker mit Timestamps für VTT-Untertitel
// SETUP: npm i @huggingface/transformers
// (Nachfolger von @xenova/transformers; v2.17 hatte Whisper-Timestamp-Bugs,
// die zu "can't convert undefined to object" geführt haben.)
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
    opts: {
      progress_callback?: (p: ProgressEntry) => void;
      dtype?: "fp32" | "fp16" | "q8" | "int8" | "uint8" | "q4" | "q4f16";
      device?: "cpu" | "wasm" | "webgpu";
    }
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
      "@huggingface/transformers"
    )) as unknown as TransformersModule;
    mod.env.allowLocalModels = false;
    if (mod.env.backends?.onnx?.wasm) {
      mod.env.backends.onnx.wasm.numThreads = 1;
    }
    // dtype:"q8" erzwingt die 8-Bit-Variante. Default in v4 ist "q4" für
    // Whisper-Tiny – die hat kaputte MatMulNBits-Skalen im Xenova-Repo
    // ("Missing required scale: model.decoder.embed_tokens.weight_merged_0_scale").
    const t = await mod.pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny",
      {
        dtype: "q8",
        device: "wasm",
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
      // chunk_length_s/stride_length_s nur ab > 30 s setzen – kürzeres Audio
      // braucht den Long-Form-Pfad nicht und der hat in der Vergangenheit
      // beim Zusammenfügen einzelner Chunks Probleme gemacht.
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
