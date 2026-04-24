"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Download,
  Printer,
  Link2,
  Tag,
  ShieldCheck,
  Info,
} from "lucide-react";

/**
 * Error-Correction fest auf "H" (≈30 %). Für den Klassenraum ideal: Der
 * Code bleibt lesbar, auch wenn er leicht verknickt, angeschnitten oder
 * teilweise verdeckt ist. Kosten: ~10–15 % mehr Module pro Zeichen –
 * vernachlässigbar gegenüber der Robustheit.
 */
const ERROR_LEVEL = "H";
const QUIET_ZONE = 2; // Module

type PngResolution = "screen" | "print-a6" | "print-a4";

const RESOLUTIONS: Record<PngResolution, { width: number; label: string; hint: string }> = {
  screen: { width: 512, label: "Bildschirm", hint: "512 px · z. B. Beamer" },
  "print-a6": { width: 1200, label: "Aufkleber / A6", hint: "1200 px · scharf bis 10 cm" },
  "print-a4": { width: 2400, label: "Plakat / A4", hint: "2400 px · scharf bis 20 cm" },
};

export default function QrCodeGenerator() {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [resolution, setResolution] = useState<PngResolution>("print-a6");

  const [svgMarkup, setSvgMarkup] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [justGenerated, setJustGenerated] = useState(false);

  const svgWrapperRef = useRef<HTMLDivElement>(null);

  const trimmedUrl = url.trim();
  const hasContent = trimmedUrl.length > 0;

  // Live-SVG für die Vorschau mit 150 ms Debounce. Beim Tippen wird sonst
  // bei jedem Keystroke ein neuer QR-Code gerendert und ins DOM injiziert –
  // das blockt den Main-Thread und verschlechtert INP spürbar. 150 ms
  // wirken weiterhin wie Live-Feedback, sparen aber 90 % der Render-Runs.
  useEffect(() => {
    if (!hasContent) {
      setSvgMarkup("");
      setError("");
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      QRCode.toString(trimmedUrl, {
        type: "svg",
        errorCorrectionLevel: ERROR_LEVEL,
        margin: QUIET_ZONE,
        color: { dark: "#0A1A1A", light: "#FFFFFF" },
      })
        .then((svg) => {
          if (!active) return;
          setSvgMarkup(svg);
          setError("");
          setJustGenerated(true);
          window.setTimeout(() => {
            if (active) setJustGenerated(false);
          }, 320);
        })
        .catch((e: unknown) => {
          if (!active) return;
          const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
          if (msg.toLowerCase().includes("too big")) {
            setError(
              "Der Inhalt ist zu lang für einen robusten QR-Code. Bitte kürzen (z. B. mit einem URL-Shortener).",
            );
          } else {
            setError("QR-Code konnte nicht erzeugt werden.");
          }
          setSvgMarkup("");
        });
    }, 150);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [trimmedUrl, hasContent]);

  const moduleCount = useMemo(() => {
    // Aus dem SVG-Markup die Anzahl Module ermitteln (viewBox="0 0 N N").
    const match = svgMarkup.match(/viewBox="[^"]*\s(\d+)\s\d+"/);
    return match ? parseInt(match[1], 10) : 0;
  }, [svgMarkup]);

  const downloadPng = useCallback(async () => {
    if (!hasContent) return;
    const width = RESOLUTIONS[resolution].width;
    try {
      const dataUrl = await QRCode.toDataURL(trimmedUrl, {
        type: "image/png",
        errorCorrectionLevel: ERROR_LEVEL,
        margin: QUIET_ZONE,
        width,
        color: { dark: "#0A1A1A", light: "#FFFFFF" },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `qr-code${label ? "-" + slugify(label) : ""}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error("PNG-Download:", e);
    }
  }, [hasContent, resolution, trimmedUrl, label]);

  const downloadSvg = useCallback(() => {
    if (!hasContent || !svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `qr-code${label ? "-" + slugify(label) : ""}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }, [hasContent, svgMarkup, label]);

  const printCode = useCallback(() => {
    if (!hasContent) return;
    window.print();
  }, [hasContent]);

  return (
    <div className="qr-tool relative">
      {/* Dezentes technisches Raster im Hintergrund – „Werkstatt"-Akzent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] print:hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #006363 0 1px, transparent 1px 32px), repeating-linear-gradient(90deg, #006363 0 1px, transparent 1px 32px)",
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr] gap-8 lg:gap-12">
        {/* Controls */}
        <div className="space-y-6 print:hidden">
          <InputBlock
            id="qr-url"
            label="Link oder Text"
            hint="https://… oder beliebiger Text"
            icon={<Link2 className="h-4 w-4" aria-hidden="true" />}
            value={url}
            onChange={setUrl}
            placeholder="https://beispiel-schule.de/mathe-uebung"
            autoFocus
          />

          <InputBlock
            id="qr-label"
            label="Beschriftung (optional)"
            hint="Wird beim Drucken als Überschrift über den Code gesetzt"
            icon={<Tag className="h-4 w-4" aria-hidden="true" />}
            value={label}
            onChange={setLabel}
            placeholder="z. B. Mathe-Übung Klasse 3b"
          />

          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-light mb-3">
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              Download-Auflösung
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(RESOLUTIONS) as PngResolution[]).map((key) => {
                const r = RESOLUTIONS[key];
                const active = resolution === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setResolution(key)}
                    aria-pressed={active}
                    className={`rounded-lg border px-3 py-2.5 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-white hover:border-primary/40"
                    }`}
                  >
                    <div
                      className={`text-sm font-semibold ${
                        active ? "text-primary" : "text-text"
                      }`}
                    >
                      {r.label}
                    </div>
                    <div className="text-[11px] text-text-light font-mono mt-0.5">
                      {r.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aktionen */}
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="button"
              onClick={downloadPng}
              disabled={!hasContent}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Als PNG herunterladen
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={downloadSvg}
                disabled={!hasContent}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text hover:border-primary/40 hover:bg-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                SVG
              </button>
              <button
                type="button"
                onClick={printCode}
                disabled={!hasContent}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text hover:border-primary/40 hover:bg-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                Drucken
              </button>
            </div>
          </div>

          {/* Meta-Infos */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-start gap-3 text-xs text-text-light leading-relaxed">
              <ShieldCheck
                className="h-4 w-4 text-primary/70 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p>
                <strong className="text-text">Läuft komplett in Ihrem Browser.</strong>
                {" "}Kein Upload, kein Tracking, keine Werbung. Die Daten
                verlassen Ihr Gerät nicht.
              </p>
            </div>
          </div>
        </div>

        {/* Vorschau – „Werkschau"-Card */}
        <div className="relative">
          <div className="print-area bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_60px_-30px_rgba(15,23,42,0.25)] overflow-hidden">
            {/* Technische Header-Leiste */}
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border bg-gradient-to-b from-bg to-white print:hidden">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-text-light">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                Live-Vorschau
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-text-light">
                <span title="Error Correction Level H – bis ~30 % Schaden verkraftbar">
                  EC: H / 30 %
                </span>
                {moduleCount > 0 && (
                  <span className="tabular-nums" title="Modulanzahl (Rasterfeinheit)">
                    {moduleCount}×{moduleCount}
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-10 md:p-14">
              {/* Inhalt der Vorschau */}
              {!hasContent ? (
                <EmptyState />
              ) : error ? (
                <ErrorState message={error} />
              ) : (
                <div className="mx-auto max-w-md flex flex-col items-center">
                  {/* DigiKI-Logo: ausschließlich auf dem Ausdruck sichtbar,
                     damit die Bildschirm-Vorschau nicht doppelt brandet. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/logos/DigiKI_Logo_v5.svg"
                    alt=""
                    aria-hidden="true"
                    className="qr-print-logo hidden"
                  />
                  {label && (
                    <h2 className="qr-label text-center text-lg md:text-xl font-bold text-primary mb-6 break-words">
                      {label}
                    </h2>
                  )}
                  <div
                    ref={svgWrapperRef}
                    className={`qr-svg-wrap w-full aspect-square rounded-lg bg-white ring-1 ring-border overflow-hidden p-4 transition-opacity duration-200 ${
                      justGenerated ? "animate-qr-in" : ""
                    }`}
                    dangerouslySetInnerHTML={{ __html: svgMarkup }}
                  />
                  <p className="qr-caption mt-4 text-center text-xs font-mono text-text-light break-all max-w-full">
                    {trimmedUrl}
                  </p>
                </div>
              )}
            </div>

            {/* Tipp-Leiste */}
            <div className="px-6 py-4 border-t border-border bg-bg/50 print:hidden">
              <div className="flex items-start gap-3 text-xs text-text-light leading-relaxed">
                <Info className="h-4 w-4 text-primary/70 shrink-0 mt-0.5" aria-hidden="true" />
                <p>
                  <strong className="text-text">Tipp:</strong> Beim Ausdruck
                  mindestens <strong>3 × 3 cm</strong> groß wählen. Für
                  Wand-Aushänge in einer Klasse eher <strong>A5 oder A4</strong>{" "}
                  – dann erkennen Kinder den Code auch aus 3 m Entfernung. Der
                  weiße Rand rundherum ist Teil des Codes, bitte nicht
                  wegschneiden.
                </p>
              </div>
            </div>
          </div>

          {/* Ecken-Marken unter der Card für „technischen" Look */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-1.5 -left-1.5 h-6 w-6 border-t-2 border-l-2 border-primary/30 print:hidden"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-1.5 -right-1.5 h-6 w-6 border-t-2 border-r-2 border-primary/30 print:hidden"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-1.5 -left-1.5 h-6 w-6 border-b-2 border-l-2 border-primary/30 print:hidden"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-1.5 -right-1.5 h-6 w-6 border-b-2 border-r-2 border-primary/30 print:hidden"
          />
        </div>
      </div>

      {/* Scoped CSS: Animation + Print-Layout */}
      <style jsx global>{`
        @keyframes qr-in {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-qr-in {
          animation: qr-in 280ms cubic-bezier(0.22, 0.61, 0.36, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-qr-in {
            animation: none;
          }
        }
        .qr-svg-wrap svg {
          display: block;
          width: 100%;
          height: 100%;
          /* Das Library-SVG enthält Inline-Farben – wir lassen sie. */
        }

        /* ── Print-Layout ─────────────────────────────────────────────── */
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          html,
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            min-height: 0 !important;
            height: auto !important;
          }
          /* Seiten-Chrome konsequent ausblenden — inkl. fixer Overlays
             (Cookie-Banner o. ä.), die sonst eine zweite Seite verursachen. */
          body > header,
          body > footer,
          header[class*="sticky"],
          footer,
          .skip-link,
          body > div[class*="fixed"] {
            display: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          /* Wrapper-Paddings und Hintergrund-Grid weg, damit kein leerer
             Raum vor dem QR-Code entsteht. */
          .qr-tool {
            padding: 0 !important;
            margin: 0 !important;
          }
          .qr-tool > div {
            display: block !important;
          }
          .qr-tool .print-area {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            /* Harte Begrenzung: A4 (297 mm) − 2× @page-margin (15 mm). Falls
               doch mal etwas überläuft, wird es geschnitten statt auf eine
               zweite Seite umgebrochen. */
            max-height: 267mm !important;
            overflow: hidden !important;
            page-break-inside: avoid;
            break-inside: avoid;
            break-after: avoid;
          }
          .qr-tool .print-area > div {
            padding: 0 !important;
            margin: 0 !important;
          }
          .qr-tool .print-area .mx-auto {
            max-width: 100% !important;
          }
          /* Logo nur beim Drucken einblenden */
          .qr-tool .qr-print-logo {
            display: block !important;
            height: 18mm !important;
            width: auto !important;
            margin: 0 auto 8mm !important;
          }
          .qr-tool .qr-label {
            font-size: 18pt !important;
            margin: 0 auto 8mm !important;
          }
          .qr-tool .qr-svg-wrap {
            border: none !important;
            padding: 0 !important;
            width: 140mm !important;
            height: 140mm !important;
            max-width: 140mm !important;
            margin: 0 auto !important;
          }
          .qr-tool .qr-caption {
            margin-top: 6mm !important;
            font-size: 10pt !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ── Sub-Komponenten ─────────────────────────────────────────────────── */

function InputBlock({
  id,
  label,
  hint,
  icon,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-light mb-2"
      >
        <span className="text-primary/70">{icon}</span>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        spellCheck={false}
        autoComplete="off"
        className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-text font-mono placeholder:font-sans placeholder:text-text-light/70 focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors"
      />
      {hint && (
        <p className="mt-1.5 text-xs text-text-light">{hint}</p>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md flex flex-col items-center text-center py-8">
      <div
        aria-hidden="true"
        className="relative mb-6 flex h-28 w-28 items-center justify-center rounded-xl bg-bg border border-dashed border-border overflow-hidden"
      >
        {/* Dekorativer „leerer" QR-Rahmen */}
        <div className="absolute top-2 left-2 h-5 w-5 border-2 border-primary/30" />
        <div className="absolute top-2 right-2 h-5 w-5 border-2 border-primary/30" />
        <div className="absolute bottom-2 left-2 h-5 w-5 border-2 border-primary/30" />
        <div className="grid grid-cols-4 gap-1 opacity-40">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-[2px] ${
                [0, 3, 5, 6, 9, 10, 12, 15].includes(i)
                  ? "bg-primary/50"
                  : "bg-transparent"
              }`}
            />
          ))}
        </div>
      </div>
      <p className="text-sm font-semibold text-text mb-1">
        Noch keine Eingabe
      </p>
      <p className="text-sm text-text-light">
        Geben Sie links eine Webadresse oder einen Text ein – der QR-Code
        erscheint sofort.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md py-8 text-center">
      <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-50 text-red-700 mb-3">
        <Info className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-sm text-text leading-relaxed">{message}</p>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
