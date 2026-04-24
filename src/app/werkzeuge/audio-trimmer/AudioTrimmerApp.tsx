"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  Square,
  Upload,
  Play,
  Pause,
  Download,
  Scissors,
  ShieldCheck,
  Loader2,
  Trash2,
} from "lucide-react";

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  const ms = Math.floor((seconds - total) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${ms}`;
}

/**
 * Konvertiert einen AudioBuffer-Ausschnitt zu einem WAV-Blob (PCM 16bit).
 * WAV statt MP3, weil MP3-Encoding einen großen, gesondert zu ladenden
 * Encoder erfordert. Browser dekodieren MP3-Input trotzdem nativ.
 */
function encodeWav(audioBuffer: AudioBuffer, startSec: number, endSec: number): Blob {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const startSample = Math.floor(startSec * sampleRate);
  const endSample = Math.floor(endSec * sampleRate);
  const frameCount = Math.max(0, endSample - startSample);

  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < frameCount; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][startSample + i] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Berechnet für das Waveform ein Array von Peak-Paaren (min, max) pro Pixel-Spalte.
 */
function computePeaks(buffer: AudioBuffer, width: number): Array<[number, number]> {
  const channel = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(channel.length / width));
  const peaks: Array<[number, number]> = [];
  for (let i = 0; i < width; i++) {
    const start = i * step;
    const end = Math.min(channel.length, start + step);
    let min = 1;
    let max = -1;
    for (let j = start; j < end; j++) {
      const v = channel[j];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    peaks.push([min, max]);
  }
  return peaks;
}

export default function AudioTrimmerApp() {
  const [recording, setRecording] = useState(false);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordStartRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [sourceName, setSourceName] = useState<string>("");
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [playing, setPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playStartWallRef = useRef(0);
  const playStartOffsetRef = useRef(0);
  const [playheadSec, setPlayheadSec] = useState(0);
  const rafRef = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const [peaks, setPeaks] = useState<Array<[number, number]>>([]);

  // Aufnahme starten
  const startRecording = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (tickRef.current !== null) {
          cancelAnimationFrame(tickRef.current);
          tickRef.current = null;
        }
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await loadAudioFromBlob(blob, "aufnahme.webm");
      };
      rec.start();
      recorderRef.current = rec;
      recordStartRef.current = Date.now();
      setRecording(true);
      setRecordElapsed(0);
      const tick = () => {
        setRecordElapsed((Date.now() - recordStartRef.current) / 1000);
        tickRef.current = requestAnimationFrame(tick);
      };
      tickRef.current = requestAnimationFrame(tick);
    } catch (e) {
      const err = e as Error;
      if (err.name === "NotAllowedError") {
        setError("Mikrofon-Zugriff verweigert. Bitte in den Browser-Einstellungen erlauben.");
      } else {
        setError(err.message || "Aufnahme konnte nicht gestartet werden.");
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }, []);

  const loadAudioFromBlob = useCallback(async (blob: Blob, name: string) => {
    setLoading(true);
    setError("");
    try {
      if (!audioCtxRef.current) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const arr = await blob.arrayBuffer();
      const decoded = await audioCtxRef.current.decodeAudioData(arr.slice(0));
      setBuffer(decoded);
      setSourceName(name);
      setStart(0);
      setEnd(decoded.duration);
      setPlayheadSec(0);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Audio konnte nicht geladen werden: ${e.message}`
          : "Audio konnte nicht geladen werden."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Waveform-Peaks berechnen, wenn sich Buffer ändert
  useEffect(() => {
    if (!buffer || !waveformRef.current) {
      setPeaks([]);
      return;
    }
    const width = Math.max(200, Math.floor(waveformRef.current.clientWidth));
    setPeaks(computePeaks(buffer, width));
  }, [buffer]);

  // Playhead-Animation
  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const loop = () => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const elapsed = ctx.currentTime - playStartWallRef.current;
      const pos = playStartOffsetRef.current + elapsed;
      if (pos >= end) {
        setPlaying(false);
        setPlayheadSec(end);
        return;
      }
      setPlayheadSec(pos);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, end]);

  const play = useCallback(() => {
    if (!buffer || !audioCtxRef.current) return;
    if (playing) return;
    const ctx = audioCtxRef.current;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    const offset = Math.max(start, Math.min(playheadSec, end - 0.05));
    source.start(0, offset, end - offset);
    source.onended = () => {
      if (playSourceRef.current === source) {
        setPlaying(false);
        playSourceRef.current = null;
      }
    };
    playSourceRef.current = source;
    playStartWallRef.current = ctx.currentTime;
    playStartOffsetRef.current = offset;
    setPlaying(true);
  }, [buffer, start, end, playheadSec, playing]);

  const pause = useCallback(() => {
    playSourceRef.current?.stop();
    playSourceRef.current = null;
    setPlaying(false);
  }, []);

  const clearAudio = useCallback(() => {
    pause();
    setBuffer(null);
    setSourceName("");
    setStart(0);
    setEnd(0);
    setPeaks([]);
    setPlayheadSec(0);
  }, [pause]);

  const downloadTrimmed = useCallback(() => {
    if (!buffer) return;
    const blob = encodeWav(buffer, start, end);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const base = sourceName.replace(/\.[^.]+$/, "") || "ausschnitt";
    a.download = `${base}-zuschnitt.wav`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [buffer, start, end, sourceName]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      playSourceRef.current?.stop();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const duration = buffer?.duration ?? 0;
  const trimmedSeconds = Math.max(0, end - start);

  return (
    <div className="space-y-8">
      {/* Quelle wählen */}
      {!buffer && !recording && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <button
            type="button"
            onClick={startRecording}
            className="group rounded-2xl border-2 border-dashed border-border bg-white p-8 text-center hover:border-accent-strong/40 hover:bg-accent/5 transition-all"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 group-hover:bg-red-100 transition-colors">
              <Mic className="h-8 w-8 text-red-700" aria-hidden="true" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-bold text-text mb-1">Aufnehmen</p>
            <p className="text-sm text-text-light">
              Sprachnachricht über das Mikrofon aufzeichnen
            </p>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group rounded-2xl border-2 border-dashed border-border bg-white p-8 text-center hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <Upload className="h-8 w-8 text-primary" aria-hidden="true" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-bold text-text mb-1">MP3 / WAV hochladen</p>
            <p className="text-sm text-text-light">
              Audio-Datei zum Zuschneiden auswählen
            </p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadAudioFromBlob(f, f.name);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 text-red-800 p-4 text-sm">
          {error}
        </div>
      )}

      {/* Aufnahme läuft */}
      {recording && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 animate-pulse">
            <Mic className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-700 mb-2">
            Aufnahme läuft
          </p>
          <p className="text-5xl md:text-6xl font-bold text-text font-mono tabular-nums mb-6">
            {formatTime(recordElapsed)}
          </p>
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-base font-bold text-white hover:bg-red-700 transition-colors"
          >
            <Square className="h-5 w-5" aria-hidden="true" />
            Aufnahme beenden
          </button>
        </div>
      )}

      {/* Editor */}
      {buffer && !recording && (
        <div className="space-y-6">
          <div className="rounded-xl bg-white border border-border p-5 md:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-1">
                  Geladene Datei
                </p>
                <p className="text-sm font-bold text-text truncate">{sourceName}</p>
                <p className="text-xs font-mono text-text-light">
                  Länge: {formatTime(duration)} · Zuschnitt:{" "}
                  <strong className="text-primary">{formatTime(trimmedSeconds)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={clearAudio}
                className="inline-flex items-center gap-1 text-sm text-text-light hover:text-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Verwerfen
              </button>
            </div>

            {/* Waveform */}
            <div
              ref={waveformRef}
              className="relative h-32 md:h-40 bg-slate-900 rounded-lg overflow-hidden"
            >
              <svg
                viewBox={`0 0 ${peaks.length || 1} 100`}
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full"
              >
                {peaks.map((p, i) => {
                  const top = 50 - p[1] * 48;
                  const height = Math.max(1, (p[1] - p[0]) * 48);
                  return (
                    <rect
                      key={i}
                      x={i}
                      y={top}
                      width={1}
                      height={height}
                      className="fill-white/30"
                    />
                  );
                })}
              </svg>
              {/* Abgeschnittene Bereiche abdunkeln */}
              {duration > 0 && (
                <>
                  <div
                    className="absolute top-0 bottom-0 bg-black/60"
                    style={{ left: 0, width: `${(start / duration) * 100}%` }}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute top-0 bottom-0 bg-black/60"
                    style={{
                      right: 0,
                      width: `${((duration - end) / duration) * 100}%`,
                    }}
                    aria-hidden="true"
                  />
                  {/* Playhead */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-accent"
                    style={{
                      left: `${(Math.max(start, Math.min(playheadSec, end)) / duration) * 100}%`,
                    }}
                    aria-hidden="true"
                  />
                </>
              )}
            </div>

            {/* Start/End Slider */}
            <div className="mt-5 space-y-3">
              <div>
                <div className="flex justify-between text-xs font-mono text-text-light mb-1 tabular-nums">
                  <span>Start: {formatTime(start)}</span>
                  <span>{Math.round((start / duration) * 100)} %</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.01}
                  value={start}
                  onChange={(e) => {
                    const v = Math.min(Number(e.target.value), end - 0.1);
                    setStart(v);
                    if (playheadSec < v) setPlayheadSec(v);
                  }}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs font-mono text-text-light mb-1 tabular-nums">
                  <span>Ende: {formatTime(end)}</span>
                  <span>{Math.round((end / duration) * 100)} %</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.01}
                  value={end}
                  onChange={(e) => {
                    const v = Math.max(Number(e.target.value), start + 0.1);
                    setEnd(v);
                    if (playheadSec > v) setPlayheadSec(v);
                  }}
                  className="w-full accent-accent-strong"
                />
              </div>
            </div>

            {/* Aktionen */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={playing ? pause : play}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-bold text-text hover:border-primary/40 transition-colors"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? "Pause" : "Vorhören"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStart(0);
                  setEnd(duration);
                  setPlayheadSec(0);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-text hover:border-primary/40 transition-colors"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={downloadTrimmed}
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
              >
                <Scissors className="h-4 w-4" aria-hidden="true" />
                <Download className="h-4 w-4" aria-hidden="true" />
                Zuschnitt als WAV speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-text-light">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Audio wird dekodiert…
        </div>
      )}

      <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4 text-xs text-text leading-relaxed">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          <strong>Datenschutz:</strong> Aufnahmen und hochgeladene Audiodateien
          werden ausschließlich im Arbeitsspeicher Ihres Browsers verarbeitet.
          Wenn Sie die Seite schließen, sind die Daten weg.
        </p>
      </div>
    </div>
  );
}
