"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  ShieldCheck,
  Settings2,
  Maximize2,
  Minimize2,
} from "lucide-react";

type Status = "idle" | "requesting" | "running" | "denied" | "error";
type Level = "green" | "yellow" | "red";

export default function LaermampelApp() {
  const [status, setStatus] = useState<Status>("idle");
  const [level, setLevel] = useState<Level>("green");
  // Volume in dB-ähnlicher normalisierter Skala 0–100.
  const [volume, setVolume] = useState(0);
  const [peak, setPeak] = useState(0);

  // Schwellen konfigurierbar – sinnvolle Defaults für einen Klassenraum.
  const [greenMax, setGreenMax] = useState(35);
  const [yellowMax, setYellowMax] = useState(65);

  const [errorMsg, setErrorMsg] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    analyserRef.current = null;
    setStatus("idle");
    setVolume(0);
    setPeak(0);
    setLevel("green");
  }, []);

  const start = useCallback(async () => {
    setErrorMsg("");
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.fftSize);

      let peakDecay = 0;
      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(data);
        // RMS-Berechnung
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        // In 0–100 skalieren (empirisch an Klassenraum-Lautstärken angepasst)
        const scaled = Math.min(100, Math.max(0, rms * 220));

        setVolume(scaled);
        setPeak((p) => {
          peakDecay = p > scaled ? Math.max(scaled, p - 0.8) : scaled;
          return peakDecay;
        });

        setLevel((prevLevel) => {
          const next: Level =
            scaled < greenMax ? "green" : scaled < yellowMax ? "yellow" : "red";
          return next === prevLevel ? prevLevel : next;
        });

        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
      setStatus("running");
    } catch (e) {
      const err = e as Error;
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setStatus("denied");
        setErrorMsg(
          "Mikrofon-Zugriff wurde verweigert. Bitte erlauben Sie den Zugriff in den Browser-Einstellungen und versuchen Sie es erneut."
        );
      } else {
        setStatus("error");
        setErrorMsg(err.message || "Unbekannter Fehler.");
      }
    }
  }, [greenMax, yellowMax]);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const running = status === "running";

  const color =
    level === "green"
      ? { bg: "#16a34a", glow: "rgba(22,163,74,0.5)", label: "Ruhig" }
      : level === "yellow"
      ? { bg: "#D97706", glow: "rgba(217,119,6,0.5)", label: "Gesprächsvolumen" }
      : { bg: "#B91C1C", glow: "rgba(185,28,28,0.5)", label: "Zu laut" };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-10">
      {/* Ampel-Stage */}
      <div
        ref={stageRef}
        className={`relative rounded-2xl bg-slate-950 text-white shadow-xl overflow-hidden ${
          fullscreen ? "fixed inset-0 rounded-none z-50 flex items-center justify-center" : ""
        }`}
      >
        {/* Farb-Glow im Hintergrund */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-all duration-500"
          style={{
            background: running
              ? `radial-gradient(ellipse at center, ${color.glow} 0%, transparent 55%)`
              : "transparent",
          }}
        />
        {/* Raster */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #ffffff 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #ffffff 0 1px, transparent 1px 40px)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center py-14 md:py-20 px-6">
          {/* Statuszeile */}
          <div className="mb-8 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${
                running ? "bg-green-400 animate-pulse" : "bg-white/40"
              }`}
            />
            {running ? "Live" : status === "requesting" ? "Zugriff anfragen…" : "Bereit"}
          </div>

          {/* Ampel-Kreise */}
          <div className="flex flex-col items-center gap-5">
            {(["red", "yellow", "green"] as Level[]).map((l) => {
              const active = running && level === l;
              const bg =
                l === "red" ? "#B91C1C" : l === "yellow" ? "#D97706" : "#16a34a";
              return (
                <div
                  key={l}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: "clamp(5rem, 18vw, 11rem)",
                    height: "clamp(5rem, 18vw, 11rem)",
                    backgroundColor: active ? bg : "rgba(255,255,255,0.05)",
                    border: `2px solid ${active ? bg : "rgba(255,255,255,0.12)"}`,
                    boxShadow: active
                      ? `0 0 60px ${bg}, inset 0 0 30px rgba(255,255,255,0.15)`
                      : "none",
                  }}
                />
              );
            })}
          </div>

          {running && (
            <p
              className="mt-8 font-bold text-3xl md:text-4xl tracking-tight"
              style={{ color: color.bg }}
            >
              {color.label}
            </p>
          )}

          {/* Volume-Bar */}
          {running && (
            <div className="mt-8 w-full max-w-md">
              <div className="h-2 rounded-full bg-white/10 overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-100"
                  style={{ width: `${volume}%`, backgroundColor: color.bg }}
                />
                <div
                  aria-hidden="true"
                  className="absolute top-0 bottom-0 w-0.5 bg-white/80 transition-[left] duration-150"
                  style={{ left: `${peak}%` }}
                />
                {/* Schwellen-Marker */}
                <span
                  aria-hidden="true"
                  className="absolute top-0 bottom-0 w-px bg-white/20"
                  style={{ left: `${greenMax}%` }}
                />
                <span
                  aria-hidden="true"
                  className="absolute top-0 bottom-0 w-px bg-white/20"
                  style={{ left: `${yellowMax}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] font-mono text-white/40 tabular-nums">
                <span>0</span>
                <span>{Math.round(volume)} / Peak {Math.round(peak)}</span>
                <span>100</span>
              </div>
            </div>
          )}

          {status === "denied" && (
            <p className="mt-6 max-w-md text-center text-sm text-red-300 leading-relaxed">
              {errorMsg}
            </p>
          )}
          {status === "error" && (
            <p className="mt-6 max-w-md text-center text-sm text-red-300 leading-relaxed">
              {errorMsg}
            </p>
          )}

          {/* Aktionen */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {!running ? (
              <button
                type="button"
                onClick={start}
                disabled={status === "requesting"}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-bold text-text hover:bg-accent-hover transition-colors disabled:opacity-40"
              >
                <Mic className="h-5 w-5" />
                {status === "requesting" ? "Wird gestartet…" : "Mikrofon starten"}
              </button>
            ) : (
              <button
                type="button"
                onClick={stop}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 border-2 border-white/30 px-6 py-3 text-base font-bold text-white hover:bg-white/20 transition-colors"
              >
                <MicOff className="h-5 w-5" />
                Stoppen
              </button>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/20 transition-colors"
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {fullscreen ? "Vollbild aus" : "Vollbild"}
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="space-y-5">
        <div className="rounded-lg bg-white border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
              Schwellen
            </p>
          </div>
          <div className="space-y-4">
            <label className="block">
              <div className="flex justify-between text-xs text-text mb-1.5">
                <span>Grün bis</span>
                <span className="font-mono tabular-nums">{greenMax}</span>
              </div>
              <input
                type="range"
                min={10}
                max={yellowMax - 5}
                value={greenMax}
                onChange={(e) => setGreenMax(Number(e.target.value))}
                className="w-full accent-green-600"
              />
            </label>
            <label className="block">
              <div className="flex justify-between text-xs text-text mb-1.5">
                <span>Gelb bis</span>
                <span className="font-mono tabular-nums">{yellowMax}</span>
              </div>
              <input
                type="range"
                min={greenMax + 5}
                max={95}
                value={yellowMax}
                onChange={(e) => setYellowMax(Number(e.target.value))}
                className="w-full accent-amber-600"
              />
            </label>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4 text-xs text-text leading-relaxed">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong>Datenschutz:</strong> Der Browser liest den Mikrofon-Pegel
            aus, wertet ihn <strong>lokal</strong> aus und zeigt die Farbe
            an. Es werden weder Audiodaten gespeichert noch irgendwohin
            versendet.
          </p>
        </div>
      </aside>
    </div>
  );
}
