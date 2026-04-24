"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  Volume2,
  VolumeX,
} from "lucide-react";

const PRESETS = [
  { label: "1 min", seconds: 60 },
  { label: "3 min", seconds: 180 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "15 min", seconds: 900 },
  { label: "20 min", seconds: 1200 },
  { label: "30 min", seconds: 1800 },
  { label: "45 min", seconds: 2700 },
];

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  if (mm >= 60) {
    const hh = Math.floor(mm / 60);
    const mmRest = mm % 60;
    return `${String(hh).padStart(2, "0")}:${String(mmRest).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/**
 * Spielt einen dezenten 3-Ton-Gong ab (komplett via Web Audio API,
 * kein externes Asset). Bewusst weich, nicht schrill.
 */
function playEndChime(volume = 0.4) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);

    const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
    notes.forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(1, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.0);
      osc.connect(gain).connect(master);
      osc.start(start);
      osc.stop(start + 1.05);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {
    /* Audio-Context blockiert (z. B. keine User-Interaktion): ignorieren */
  }
}

export default function TimerApp() {
  const [duration, setDuration] = useState(600); // initial Preset
  const [remaining, setRemaining] = useState(600);
  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const endAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Ablauf-Tick via requestAnimationFrame (glatt, kein Drift)
  useEffect(() => {
    if (!running) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const tick = () => {
      if (endAtRef.current === null) return;
      const diff = (endAtRef.current - Date.now()) / 1000;
      if (diff <= 0) {
        setRemaining(0);
        setRunning(false);
        endAtRef.current = null;
        if (soundOn) playEndChime();
        return;
      }
      setRemaining(diff);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [running, soundOn]);

  // Bei Duration-Änderung (wenn nicht laufend): remaining angleichen
  useEffect(() => {
    if (!running) setRemaining(duration);
  }, [duration, running]);

  const start = useCallback(() => {
    if (remaining <= 0) return;
    endAtRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  }, [remaining]);

  const pause = useCallback(() => {
    setRunning(false);
    endAtRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    endAtRef.current = null;
    setRemaining(duration);
  }, [duration]);

  const adjust = useCallback(
    (delta: number) => {
      const base = running ? remaining : duration;
      const next = Math.max(5, Math.min(60 * 60 * 6, Math.round(base) + delta));
      if (running) {
        setRemaining(next);
        endAtRef.current = Date.now() + next * 1000;
      } else {
        setDuration(next);
      }
    },
    [running, remaining, duration]
  );

  const applyPreset = useCallback((seconds: number) => {
    setRunning(false);
    endAtRef.current = null;
    setDuration(seconds);
    setRemaining(seconds);
  }, []);

  // Tastatur-Shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        running ? pause() : start();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        reset();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, pause, start, reset]);

  // Fullscreen-API
  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const progress = duration > 0 ? 1 - remaining / duration : 0;
  const isFinished = remaining <= 0 && !running;
  const urgent = running && remaining <= 10 && remaining > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-10">
      {/* Stage */}
      <div
        ref={stageRef}
        className={`relative rounded-2xl bg-primary text-white shadow-xl overflow-hidden ${
          fullscreen ? "fixed inset-0 rounded-none z-50 flex items-center justify-center" : ""
        }`}
      >
        {/* Progress-Ring-Hintergrund */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #ffffff 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #ffffff 0 1px, transparent 1px 40px)",
          }}
        />
        {/* Fortschrittsbalken unten */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-1.5 bg-accent transition-[width] duration-150"
          style={{ width: `${progress * 100}%` }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center py-20 md:py-28 px-6">
          {/* Status-Label */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em]">
            <span
              aria-hidden="true"
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                isFinished
                  ? "bg-accent animate-pulse"
                  : running
                  ? "bg-green-400 animate-pulse"
                  : "bg-white/60"
              }`}
            />
            {isFinished ? "Zeit abgelaufen" : running ? "läuft" : "bereit"}
          </div>

          {/* Zifferblatt */}
          <div
            className={`font-bold tabular-nums tracking-tight leading-none select-none transition-colors ${
              urgent ? "text-accent" : "text-white"
            }`}
            style={{
              fontVariantNumeric: "tabular-nums",
              fontSize: "clamp(6rem, 22vw, 22rem)",
            }}
            aria-live="off"
          >
            {formatTime(remaining)}
          </div>

          {/* Aktionen */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={running ? pause : start}
              disabled={remaining <= 0 && !running}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-bold text-text hover:bg-accent-hover transition-colors disabled:opacity-40"
              aria-label={running ? "Pause (Leertaste)" : "Start (Leertaste)"}
            >
              {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {running ? "Pause" : isFinished ? "Neu starten" : "Start"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/20 transition-colors"
              aria-label="Zurücksetzen (R)"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/20 transition-colors"
              aria-label="Vollbild ein/aus (F)"
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {fullscreen ? "Vollbild aus" : "Vollbild"}
            </button>
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/20 transition-colors"
              aria-label={soundOn ? "Ton aus" : "Ton an"}
              aria-pressed={soundOn}
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {soundOn ? "Ton an" : "Ton aus"}
            </button>
          </div>

          {/* Feinjustierung */}
          <div className="mt-6 flex items-center gap-2 text-sm text-white/70">
            <button
              type="button"
              onClick={() => adjust(-30)}
              className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 hover:bg-white/10 transition-colors"
            >
              <Minus className="h-3 w-3" />
              30 s
            </button>
            <button
              type="button"
              onClick={() => adjust(-60)}
              className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 hover:bg-white/10 transition-colors"
            >
              <Minus className="h-3 w-3" />
              1 min
            </button>
            <button
              type="button"
              onClick={() => adjust(60)}
              className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 hover:bg-white/10 transition-colors"
            >
              <Plus className="h-3 w-3" />
              1 min
            </button>
            <button
              type="button"
              onClick={() => adjust(300)}
              className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 hover:bg-white/10 transition-colors"
            >
              <Plus className="h-3 w-3" />
              5 min
            </button>
          </div>

          {fullscreen && (
            <p className="mt-10 text-[11px] font-mono uppercase tracking-[0.2em] text-white/40">
              Leertaste · Start/Pause &nbsp;·&nbsp; R · Reset &nbsp;·&nbsp; F · Vollbild aus
            </p>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-3">
            Dauer wählen
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => {
              const active = duration === p.seconds;
              return (
                <button
                  key={p.seconds}
                  type="button"
                  onClick={() => applyPreset(p.seconds)}
                  aria-pressed={active}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-bold transition-all ${
                    active
                      ? "border-primary bg-primary text-white shadow-sm"
                      : "border-border bg-white text-text hover:border-primary/40"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg bg-white border border-border p-4 text-xs text-text-light leading-relaxed">
          <p className="font-bold text-text mb-1.5">Tastatur-Shortcuts</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono">
            <dt className="text-text">Leertaste</dt>
            <dd>Start / Pause</dd>
            <dt className="text-text">R</dt>
            <dd>Reset</dd>
            <dt className="text-text">F</dt>
            <dd>Vollbild ein / aus</dd>
          </dl>
        </div>
      </aside>
    </div>
  );
}
