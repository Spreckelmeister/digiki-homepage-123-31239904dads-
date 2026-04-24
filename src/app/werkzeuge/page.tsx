import type { Metadata } from "next";
import Link from "next/link";
import {
  QrCode,
  ArrowRight,
  Wrench,
  Sparkles,
  ShieldCheck,
  WifiOff,
  Coins,
  Timer,
  Volume2,
  Shuffle,
  FileText,
  Grid3x3,
  TextCursorInput,
  Image as ImageIcon,
  AudioLines,
} from "lucide-react";
import ContactSection from "@/components/ContactSection";

export const metadata: Metadata = {
  title: "Werkzeuge",
  description:
    "Kleine, werbefreie Online-Werkzeuge für den Unterrichtsalltag an Grundschulen – Timer, Lärmampel, PDF-Tools, Bild-Kompressor und mehr. Alles lokal im Browser.",
  alternates: { canonical: "/werkzeuge" },
  openGraph: {
    title: "Werkzeuge für Lehrkräfte – DigiKI Osnabrück",
    description:
      "Werbefreie, einfache Online-Werkzeuge, die direkt im Klassenzimmer helfen – ohne Anmeldung, ohne Tracking, komplett lokal im Browser.",
  },
};

interface Tool {
  href: string;
  eyebrow: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  available: boolean;
}

interface Category {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  body: string;
  tools: Tool[];
}

const iconProps = { strokeWidth: 1.6, "aria-hidden": true as const };

const categories: Category[] = [
  {
    id: "klassenraum",
    index: "01",
    eyebrow: "Im Unterricht",
    title: "Klassenraum",
    body: "Für den direkten Einsatz am Smartboard oder Lehrer-Laptop im laufenden Unterricht.",
    tools: [
      {
        href: "/werkzeuge/qr-code",
        eyebrow: "WZ-001",
        icon: <QrCode className="h-7 w-7 text-primary" {...iconProps} />,
        title: "QR-Code-Generator",
        description:
          "Link eintippen, QR-Code sofort erhalten. Robust für den Klassenraum, direkt druckbar.",
        available: true,
      },
      {
        href: "/werkzeuge/timer",
        eyebrow: "WZ-002",
        icon: <Timer className="h-7 w-7 text-primary" {...iconProps} />,
        title: "Vollbild-Timer",
        description:
          "Großformatiger Countdown für Stillarbeit, Tests oder Pausen. Mit Vollbild, Ton und Preset-Dauern.",
        available: true,
      },
      {
        href: "/werkzeuge/laermampel",
        eyebrow: "WZ-003",
        icon: <Volume2 className="h-7 w-7 text-primary" {...iconProps} />,
        title: "Lärmampel",
        description:
          "Visualisiert die Lautstärke in der Klasse. Mikrofon-Daten bleiben komplett lokal im Browser.",
        available: true,
      },
      {
        href: "/werkzeuge/zufalls-auswahl",
        eyebrow: "WZ-004",
        icon: <Shuffle className="h-7 w-7 text-primary" {...iconProps} />,
        title: "Zufalls-Auswahl",
        description:
          "Namen aus der Klassenliste zufällig aufrufen oder in Gruppen einteilen. Listen bleiben auf Ihrem Gerät.",
        available: true,
      },
    ],
  },
  {
    id: "unterrichtsmaterial",
    index: "02",
    eyebrow: "Vorbereitung",
    title: "Material",
    body: "Arbeitsblätter erstellen, Rätsel generieren, PDFs anpassen – sensible Dokumente verlassen Ihr Gerät nie.",
    tools: [
      {
        href: "/werkzeuge/pdf",
        eyebrow: "WZ-005",
        icon: <FileText className="h-7 w-7 text-primary" {...iconProps} />,
        title: "PDF-Werkzeuge",
        description:
          "PDFs zusammenfügen oder einzelne Seiten extrahieren – rein lokal, keine Uploads auf fremde Server.",
        available: true,
      },
      {
        href: "/werkzeuge/suchsel",
        eyebrow: "WZ-006",
        icon: <Grid3x3 className="h-7 w-7 text-primary" {...iconProps} />,
        title: "Suchsel-Generator",
        description:
          "Wortgitter aus Ihren Vokabeln oder Begriffen – druckfertig, ohne Wasserzeichen, ohne Werbung.",
        available: true,
      },
      {
        href: "/werkzeuge/lueckentext",
        eyebrow: "WZ-007",
        icon: <TextCursorInput className="h-7 w-7 text-primary" {...iconProps} />,
        title: "Lückentext-Generator",
        description:
          "Wörter per Klick in Lücken verwandeln oder jedes n-te Wort entfernen. Arbeitsblatt + Lösung druckbar.",
        available: true,
      },
    ],
  },
  {
    id: "multimedia",
    index: "03",
    eyebrow: "Medien",
    title: "Multimedia",
    body: "Bilder und Audio bearbeiten, bevor sie ins LMS, ins Arbeitsblatt oder in die Präsentation kommen.",
    tools: [
      {
        href: "/werkzeuge/bild-komprimieren",
        eyebrow: "WZ-008",
        icon: <ImageIcon className="h-7 w-7 text-primary" {...iconProps} />,
        title: "Bilder komprimieren",
        description:
          "Fotos lokal verkleinern und komprimieren – ideal bevor sie ins Schul-LMS oder in ein Arbeitsblatt gehen.",
        available: true,
      },
      {
        href: "/werkzeuge/audio-trimmer",
        eyebrow: "WZ-009",
        icon: <AudioLines className="h-7 w-7 text-primary" {...iconProps} />,
        title: "Audio aufnehmen & trimmen",
        description:
          "Sprachnachricht aufnehmen oder MP3 zuschneiden – komplett im Browser, ohne Upload.",
        available: true,
      },
    ],
  },
];

const totalTools = categories.reduce((n, c) => n + c.tools.length, 0);

const principles = [
  {
    icon: <ShieldCheck className="h-5 w-5" {...iconProps} />,
    title: "Datensparsam",
    body: "Alles läuft in Ihrem Browser. Kein Upload, keine Server, kein Tracking.",
  },
  {
    icon: <WifiOff className="h-5 w-5" {...iconProps} />,
    title: "Offline-fähig",
    body: "Einmal geladen, funktioniert die Seite auch ohne aktive Verbindung.",
  },
  {
    icon: <Coins className="h-5 w-5" {...iconProps} />,
    title: "Werbefrei",
    body: "Keine Banner, keine Cookies von Dritten, keine Paywalls.",
  },
];

export default function WerkzeugePage() {
  return (
    <>
      {/* ╭─────────── HERO ──────────────────────────────────────────────── */}
      <section className="relative bg-primary pt-14 md:pt-20 pb-20 md:pb-28 overflow-hidden">
        {/* Blueprint-Raster */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #ffffff 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #ffffff 0 1px, transparent 1px 40px)",
          }}
        />
        {/* Ruler-Detail am rechten Rand */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0 right-6 hidden lg:flex flex-col justify-between py-6 opacity-30"
        >
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className={`block bg-white ${i % 4 === 0 ? "h-px w-6" : "h-px w-3"}`}
            />
          ))}
        </div>
        {/* Farb-Glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-accent/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-primary-light/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Eyebrow / Inventar-Zeile */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white">
              <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
              DigiKI · Werkzeuge
            </div>
            <div className="hidden md:flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.2em] text-white/60">
              <span>Inventar</span>
              <span className="text-white/20">/</span>
              <span className="text-accent tabular-nums">
                {String(totalTools).padStart(2, "0")} verfügbar
              </span>
            </div>
          </div>

          {/* Display-Headline mit Outline-Akzent */}
          <h1 className="font-bold text-white leading-[0.95] tracking-tight mb-8">
            <span className="block text-4xl md:text-6xl lg:text-7xl">
              Kleine Helfer,
            </span>
            <span
              className="block text-5xl md:text-7xl lg:text-[5.5rem] text-accent drop-shadow-[0_2px_20px_rgba(232,168,56,0.3)]"
              style={{ WebkitTextStroke: "0" }}
            >
              sofort einsatzbereit.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/85 max-w-2xl leading-relaxed">
            Werbefreie Online-Werkzeuge für den Unterrichtsalltag. Keine
            Anmeldung, keine Cookies, keine versteckten Kosten – entstanden
            aus den Bedarfen der Lehrkräfte im Projekt.
          </p>

          {/* Prinzipien als horizontale Streifen (nicht Card-Grid) */}
          <div className="mt-12 border-t border-white/15">
            {principles.map((p, i) => (
              <div
                key={p.title}
                className={`flex items-center gap-4 md:gap-6 py-4 md:py-5 ${
                  i < principles.length - 1 ? "border-b border-white/15" : ""
                }`}
              >
                <span className="font-mono text-[11px] text-white/50 tabular-nums w-8 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-accent shrink-0">{p.icon}</span>
                <p className="text-sm md:text-base text-white">
                  <strong className="font-bold">{p.title}.</strong>
                  <span className="ml-2 text-white/75">{p.body}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ╭─────────── TOOL-REGAL ──────────────────────────────────────── */}
      <section className="relative py-20 md:py-28 bg-bg" aria-labelledby="tools-heading">
        {/* Dezentes Raster */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, #006363 0 1px, transparent 1px 64px)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Sektions-Header */}
          <header className="flex items-end justify-between flex-wrap gap-6 mb-16 pb-6 border-b-2 border-primary/20">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-strong mb-3">
                Das Regal
              </p>
              <h2
                id="tools-heading"
                className="text-3xl md:text-5xl font-bold text-primary tracking-tight leading-none"
              >
                Verfügbare Werkzeuge
              </h2>
            </div>
            <div className="font-mono text-xs text-text-light space-y-1">
              <div className="flex items-center gap-3">
                <span className="tabular-nums">[ {totalTools} × ]</span>
                <span>AKTIV</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums">[ 03 × ]</span>
                <span>KATEGORIEN</span>
              </div>
            </div>
          </header>

          <div className="space-y-24">
            {categories.map((cat, catIndex) => (
              <div key={cat.id} className="relative">
                {/* Großer Index-Indikator */}
                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-12 mb-10">
                  <div className="flex md:flex-col md:justify-start items-baseline md:items-start gap-4 md:gap-2">
                    <span
                      aria-hidden="true"
                      className="font-bold text-7xl md:text-8xl text-primary/15 leading-none tabular-nums tracking-tighter select-none"
                    >
                      {cat.index}
                    </span>
                    <span className="hidden md:block w-12 h-0.5 bg-accent-strong" />
                  </div>
                  <div className="md:pt-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-light mb-2">
                      {cat.eyebrow}
                    </p>
                    <h3 className="text-2xl md:text-3xl font-bold text-primary mb-3 tracking-tight">
                      {cat.title}
                    </h3>
                    <p className="text-base text-text-light max-w-2xl leading-relaxed">
                      {cat.body}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {cat.tools.map((tool, toolIndex) => (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      className="tool-card group relative bg-white rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                      style={{
                        animationDelay: `${catIndex * 60 + toolIndex * 40}ms`,
                      }}
                    >
                      {/* Wachsende Akzent-Leiste oben */}
                      <div
                        aria-hidden="true"
                        className="relative h-1 bg-border overflow-hidden"
                      >
                        <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-primary to-primary-light transition-all duration-500 group-hover:w-full group-hover:from-primary group-hover:via-accent-strong group-hover:to-primary" />
                      </div>

                      <div className="p-6">
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                            {tool.icon}
                          </div>
                          <span className="text-[10px] font-mono font-bold text-text-light/70 tabular-nums">
                            {tool.eyebrow}
                          </span>
                        </div>
                        <h4 className="text-lg font-bold text-primary mb-2">
                          {tool.title}
                        </h4>
                        <p className="text-sm text-text-light leading-relaxed mb-5">
                          {tool.description}
                        </p>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-all group-hover:gap-3">
                          Öffnen
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </div>

                      {/* Hover-Ecken-Marker */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute top-2 right-2 h-3 w-3 border-t border-r border-primary/0 group-hover:border-accent-strong transition-colors duration-300"
                      />
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-primary/0 group-hover:border-accent-strong transition-colors duration-300"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {/* Platzhalter */}
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-12 mb-8">
                <div className="flex md:flex-col md:justify-start items-baseline md:items-start gap-4 md:gap-2">
                  <span
                    aria-hidden="true"
                    className="font-bold text-7xl md:text-8xl text-text-light/15 leading-none tabular-nums tracking-tighter select-none"
                  >
                    ··
                  </span>
                  <span className="hidden md:block w-12 h-0.5 bg-border" />
                </div>
                <div className="md:pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-light mb-2">
                    In Planung
                  </p>
                  <h3 className="text-2xl md:text-3xl font-bold text-text-light mb-3 tracking-tight">
                    Fehlt ein Werkzeug?
                  </h3>
                </div>
              </div>
              <div className="rounded-xl border-2 border-dashed border-border/80 bg-white/40 p-6 md:p-8 max-w-3xl">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-bg border border-dashed border-border shrink-0">
                    <Sparkles className="h-6 w-6 text-text-light" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm text-text-light leading-relaxed mb-3">
                      Haben Sie ein wiederkehrendes Problem im digitalen
                      Unterrichtsalltag, das sich mit einem kleinen lokalen
                      Werkzeug lösen ließe? Schreiben Sie uns – häufig gefragte
                      Werkzeuge landen hier als nächstes.
                    </p>
                    <Link
                      href="/ueber-das-projekt#kontakt"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      Vorschlag senden
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ╭─────────── WHY-BLOCK ──────────────────────────────────────── */}
      <section className="py-16 md:py-24" aria-labelledby="why-heading">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl bg-white border border-border p-8 md:p-12 shadow-sm overflow-hidden">
            {/* Dekoratives Ruler-Element */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-6 right-6 flex gap-1 opacity-30"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <span
                  key={i}
                  className={`block bg-accent-strong w-px ${i % 2 === 0 ? "h-4" : "h-2"}`}
                />
              ))}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-strong mb-3">
              Woher kommt das?
            </p>
            <h2
              id="why-heading"
              className="text-2xl md:text-3xl font-bold text-primary mb-4 leading-tight"
            >
              Entstanden aus echten Bedarfen.
            </h2>
            <p className="text-base md:text-lg text-text/90 leading-relaxed">
              Die Werkzeuge hier basieren auf konkreten Anfragen von Lehrkräften
              und Schulleitungen aus dem DigiKI-Projekt – typischerweise
              wiederkehrende technische Reibungspunkte im Unterrichtsalltag,
              für die es keine schlichte, werbefreie Lösung gab.
            </p>
            <p className="mt-4 text-base text-text-light leading-relaxed">
              Genau solche Bedarfe landen hier als kleines Werkzeug –
              schnörkellos, datensparsam, sofort einsatzbereit.
            </p>
          </div>
        </div>
      </section>

      {/* Staggered Reveal Animation (CSS-only, respects reduced motion) */}
      <style>{`
        @keyframes tool-card-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .tool-card {
          animation: tool-card-in 420ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .tool-card {
            animation: none;
          }
        }
      `}</style>

      <ContactSection />
    </>
  );
}
