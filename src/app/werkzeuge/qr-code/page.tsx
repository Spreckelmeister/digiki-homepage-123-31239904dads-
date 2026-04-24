import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, QrCode } from "lucide-react";
import QrCodeGenerator from "./QrCodeGenerator";

export const metadata: Metadata = {
  title: "QR-Code-Generator",
  description:
    "Einfacher, werbefreier QR-Code-Generator für Lehrkräfte. Link eintippen, QR-Code herunterladen oder direkt drucken – robust für den Klassenraum.",
  alternates: { canonical: "/werkzeuge/qr-code" },
  openGraph: {
    title: "QR-Code-Generator – Werkzeug für Lehrkräfte",
    description:
      "Einfacher, werbefreier QR-Code-Generator für Lehrkräfte. Link eintippen, QR-Code herunterladen oder direkt drucken.",
  },
};

export default function QrCodePage() {
  return (
    <>
      {/* ── Kompakter Werkstatt-Hero ─────────────────────────────────── */}
      <section className="relative bg-primary py-10 md:py-16 overflow-hidden print:hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #ffffff 0 1px, transparent 1px 32px), repeating-linear-gradient(90deg, #ffffff 0 1px, transparent 1px 32px)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-accent/15 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/werkzeuge"
            className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors mb-5"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Alle Werkzeuge
          </Link>

          <div className="flex items-start gap-4 md:gap-6">
            <div
              aria-hidden="true"
              className="hidden sm:flex h-14 w-14 md:h-16 md:w-16 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/20 mt-1"
            >
              <QrCode
                className="h-7 w-7 md:h-8 md:w-8 text-accent"
                aria-hidden="true"
                strokeWidth={1.5}
              />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent/90 mb-2 font-mono">
                WZ-001
              </p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-[1.1] tracking-tight">
                QR-Code-Generator
              </h1>
              <p className="text-base md:text-lg text-white/85 max-w-2xl leading-relaxed">
                Link eintippen, QR-Code sofort erhalten. Hohe Fehlerkorrektur
                für Klassenraum-Einsatz, Download als PNG oder SVG, direkt
                druckbar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Werkstatt-Fläche ─────────────────────────────────────────── */}
      <section className="py-10 md:py-16 bg-bg print:py-0 print:bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 print:px-0 print:max-w-none">
          <QrCodeGenerator />
        </div>
      </section>
    </>
  );
}
