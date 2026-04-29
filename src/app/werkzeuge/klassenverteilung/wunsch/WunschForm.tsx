"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Heart,
  Ban,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Mail,
  Copy,
  Check,
  ArrowRight,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import QRCode from "qrcode";
import {
  type WunschPayload,
  type WunschResult,
  decodePayload,
  encodeResult,
} from "@/lib/werkzeuge/wunschShare";

type Stage = "loading" | "noPayload" | "form" | "done";

export default function WunschForm() {
  const [stage, setStage] = useState<Stage>("loading");
  const [payload, setPayload] = useState<WunschPayload | null>(null);
  const [wishes, setWishes] = useState<string[]>([]);
  const [noGo, setNoGo] = useState<string[]>([]);
  const [resultCode, setResultCode] = useState("");
  const [resultQr, setResultQr] = useState("");
  const [copied, setCopied] = useState(false);

  // ── Payload aus URL-Hash lesen (Hash geht NICHT an den Server) ────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash.startsWith("#p=")) {
      setStage("noPayload");
      return;
    }
    const data = decodeURIComponent(hash.slice(3));
    const decoded = decodePayload(data);
    if (!decoded) {
      setStage("noPayload");
      return;
    }
    setPayload(decoded);
    setStage("form");
  }, []);

  const self = useMemo(
    () => payload?.n.find((s) => s.id === payload?.s),
    [payload]
  );
  const others = useMemo(
    () => payload?.n.filter((s) => s.id !== payload?.s) ?? [],
    [payload]
  );

  const toggleWish = (id: string) => {
    setWishes((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (payload && p.length >= payload.mw) return p;
      return [...p, id];
    });
    setNoGo((p) => p.filter((x) => x !== id));
  };
  const toggleNoGo = (id: string) => {
    setNoGo((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
    );
    setWishes((p) => p.filter((x) => x !== id));
  };

  const handleSubmit = async () => {
    if (!payload) return;
    const result: WunschResult = {
      v: 1,
      s: payload.s,
      w: wishes,
      ng: noGo,
    };
    const code = encodeResult(result);
    setResultCode(code);
    try {
      const dataUrl = await QRCode.toDataURL(code, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 360,
      });
      setResultQr(dataUrl);
    } catch {
      setResultQr("");
    }
    setStage("done");
  };

  const reset = () => {
    setWishes([]);
    setNoGo([]);
    setResultCode("");
    setResultQr("");
    setStage("form");
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(resultCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  // ── States ──────────────────────────────────────────────────────────

  if (stage === "loading") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <p className="text-text-light">Lade…</p>
      </div>
    );
  }

  if (stage === "noPayload") {
    return (
      <div className="min-h-screen bg-bg px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl bg-white border border-border p-6 shadow-sm">
          <AlertTriangle
            className="h-8 w-8 text-amber-600 mb-3"
            aria-hidden="true"
          />
          <h1 className="text-xl font-bold text-primary mb-2">
            Kein Wunschzettel-Code gefunden
          </h1>
          <p className="text-sm text-text-light leading-relaxed">
            Diese Seite wird mit dem QR-Code auf dem Eltern-Formular Ihrer
            Schule geöffnet. Bitte scannen Sie den QR-Code mit der
            Smartphone-Kamera oder öffnen Sie den auf dem Formular gedruckten
            Link.
          </p>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="min-h-screen bg-bg px-4 py-8">
        <div className="mx-auto max-w-md space-y-5">
          <div className="rounded-2xl bg-white border border-border shadow-sm p-6 text-center">
            <CheckCircle2
              className="h-10 w-10 text-emerald-600 mx-auto mb-3"
              aria-hidden="true"
            />
            <h1 className="text-xl font-bold text-primary mb-1">
              Wünsche gespeichert
            </h1>
            <p className="text-sm text-text-light leading-relaxed">
              Geben Sie der Lehrkraft jetzt diesen Code zurück. Drei Wege –
              wählen Sie einen:
            </p>
          </div>

          {/* 1) QR zum Scannen */}
          {resultQr && (
            <div className="rounded-2xl bg-white border-2 border-primary p-5 text-center">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-3">
                <span className="rounded-full bg-primary text-white text-[10px] h-5 w-5 inline-flex items-center justify-center">
                  1
                </span>
                Lehrkraft scannt diesen Code
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resultQr}
                alt="Wunsch-Rückgabe-Code"
                width={360}
                height={360}
                className="w-full max-w-[280px] mx-auto"
              />
            </div>
          )}

          {/* 2) Per E-Mail */}
          <div className="rounded-2xl bg-white border border-border p-5">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-2">
              <span className="rounded-full bg-bg border border-border text-primary text-[10px] h-5 w-5 inline-flex items-center justify-center">
                2
              </span>
              Oder per E-Mail
            </p>
            <a
              href={buildMailto(self?.name ?? "", payload?.c, resultCode)}
              className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-primary text-white px-4 py-3 text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              E-Mail an die Lehrkraft öffnen
            </a>
          </div>

          {/* 3) Manueller Code */}
          <div className="rounded-2xl bg-white border border-border p-5">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-2">
              <span className="rounded-full bg-bg border border-border text-primary text-[10px] h-5 w-5 inline-flex items-center justify-center">
                3
              </span>
              Oder Code abschreiben / kopieren
            </p>
            <textarea
              value={resultCode}
              readOnly
              rows={4}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-lg border border-border bg-bg/40 px-3 py-2 text-xs font-mono break-all"
            />
            <button
              type="button"
              onClick={copyCode}
              className="mt-2 inline-flex items-center justify-center gap-1.5 w-full rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-bg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  Kopiert
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  In Zwischenablage kopieren
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg border border-dashed border-border bg-white/40 px-4 py-2 text-xs text-text-light hover:bg-bg transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Wünsche noch einmal anpassen
          </button>

          <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-text leading-relaxed">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              Ihre Eingabe wurde nirgendwo hochgeladen. Der Code enthält die
              Wünsche und wird nur dann von der Lehrkraft gelesen, wenn Sie
              ihn aktiv weitergeben.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // stage === "form"
  if (!payload || !self) return null;
  return (
    <div className="min-h-screen bg-bg pb-32">
      {/* Hero */}
      <div className="bg-primary text-white px-4 pt-8 pb-6">
        <div className="mx-auto max-w-md">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-2">
            <Smartphone className="h-3 w-3" aria-hidden="true" />
            Wunschzettel · Online
          </p>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight">
            Mit wem möchte
            <br />
            <span className="text-accent">{self.name}</span>
            <br />
            in eine Klasse?
          </h1>
          {payload.c && (
            <p className="text-xs text-white/70 mt-3">
              Klassenliste: <strong>{payload.c}</strong>
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 -mt-4 space-y-5">
        {/* Wünsche */}
        <section className="rounded-2xl bg-white border-2 border-emerald-300 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="inline-flex items-center gap-2 text-base font-bold text-emerald-800">
              <Heart className="h-5 w-5" aria-hidden="true" />
              Wunschkinder
            </h2>
            <span className="font-mono text-xs tabular-nums text-emerald-700">
              {wishes.length} / {payload.mw}
            </span>
          </div>
          <p className="text-xs text-text-light mb-4 leading-relaxed">
            Tippen Sie max. <strong>{payload.mw}</strong> Kinder an, mit denen{" "}
            {self.name} gerne in einer Klasse wäre.
          </p>
          <ul className="space-y-1.5">
            {others.map((s) => {
              const isW = wishes.includes(s.id);
              const isN = noGo.includes(s.id);
              const disabled = !isW && wishes.length >= payload.mw;
              return (
                <li key={"w-" + s.id}>
                  <button
                    type="button"
                    onClick={() => toggleWish(s.id)}
                    disabled={disabled || isN}
                    className={`w-full flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                      isW
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : isN
                          ? "bg-red-50 text-text-light/50 border-red-100 cursor-not-allowed"
                          : disabled
                            ? "bg-bg/40 text-text-light/50 border-border cursor-not-allowed"
                            : "bg-white border-border hover:border-emerald-400 hover:bg-emerald-50"
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-md shrink-0 ${
                        isW
                          ? "bg-white text-emerald-600"
                          : "border-2 border-current"
                      }`}
                      aria-hidden="true"
                    >
                      {isW && <Check className="h-4 w-4" />}
                    </span>
                    <span className="flex-1 text-sm font-bold">{s.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* NoGo */}
        <section className="rounded-2xl bg-white border-2 border-red-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="inline-flex items-center gap-2 text-base font-bold text-red-800">
              <Ban className="h-5 w-5" aria-hidden="true" />
              Lieber nicht zusammen
            </h2>
            <span className="font-mono text-xs tabular-nums text-red-700">
              {noGo.length}
            </span>
          </div>
          <p className="text-xs text-text-light mb-4 leading-relaxed">
            <strong>Optional.</strong> Falls es Kinder gibt, mit denen{" "}
            {self.name} ausdrücklich <em>nicht</em> in einer Klasse sein
            sollte, hier antippen.
          </p>
          <ul className="space-y-1.5">
            {others.map((s) => {
              const isN = noGo.includes(s.id);
              const isW = wishes.includes(s.id);
              return (
                <li key={"n-" + s.id}>
                  <button
                    type="button"
                    onClick={() => toggleNoGo(s.id)}
                    disabled={isW}
                    className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      isN
                        ? "bg-red-600 text-white border-red-600"
                        : isW
                          ? "bg-emerald-50 text-text-light/50 border-emerald-100 cursor-not-allowed"
                          : "bg-white border-border hover:border-red-400 hover:bg-red-50"
                    }`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-md shrink-0 ${
                        isN
                          ? "bg-white text-red-600"
                          : "border-2 border-current"
                      }`}
                      aria-hidden="true"
                    >
                      {isN && <Check className="h-3 w-3" />}
                    </span>
                    <span className="flex-1 text-sm">{s.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-text leading-relaxed">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong>Datenschutz:</strong> Ihre Auswahl wird nirgendwo
            hochgeladen. Sie erzeugen am Ende einen kleinen Code, den Sie der
            Lehrkraft zurückgeben (per QR, E-Mail oder Abtippen).
          </p>
        </div>
      </div>

      {/* Sticky-Submit unten */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-border shadow-lg p-3 z-50">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-text px-4 py-4 text-base font-bold hover:bg-accent-hover transition-colors"
          >
            Fertig – Code erstellen
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <p className="text-[10px] text-text-light text-center mt-1.5">
            {wishes.length} Wunsch{wishes.length === 1 ? "" : "kinder"}
            {noGo.length > 0 && ` · ${noGo.length} NoGo`}
          </p>
        </div>
      </div>
    </div>
  );
}

function buildMailto(studentName: string, klasse: string | undefined, code: string): string {
  const subject = `Wunschzettel ${studentName}${klasse ? " · " + klasse : ""}`;
  const body = [
    `Wünsche für: ${studentName}`,
    klasse ? `Klassenliste: ${klasse}` : null,
    "",
    "Bitte diesen Code in das Klassenverteilungs-Tool einfügen:",
    "",
    code,
  ]
    .filter(Boolean)
    .join("\n");
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
