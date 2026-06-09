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
  Scissors,
  Mic,
  ScanText,
  Wand2,
  Captions,
  FlaskConical,
  GraduationCap,
  Network,
  CalendarClock,
  Cloud,
  NotebookPen,
} from "lucide-react";
import ContactSection from "@/components/ContactSection";
import AdminOnly from "@/components/AdminOnly";

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
  /** Tool unterstützt server-backed Online-Modus (mit DigiKI-Konto) */
  cloudOption?: boolean;
  /** Internes Tool: nur für angemeldete Best-Practice-Admins sichtbar (noch nicht veröffentlicht) */
  adminOnly?: boolean;
}

interface Category {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  body: string;
  tools: Tool[];
  experimental?: boolean;
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
        href: "/werkzeuge/arbeitsblatt-editor",
        eyebrow: "WZ-018",
        icon: <NotebookPen className="h-7 w-7 text-primary" {...iconProps} />,
        title: "Arbeitsblatt-Editor",
        description:
          "Differenzierte Arbeitsblätter bauen – Silbentext, Lückentext, Rechenpäckchen, Schreiblinien, Suchsel. Druckfertig, mit Lösungsblatt und optionalem KI-Assistenten.",
        available: true,
        adminOnly: true,
      },
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
    id: "organisation",
    index: "03",
    eyebrow: "Schulorganisation",
    title: "Planung",
    body: "Pädagogische Klassenbildung und Schuljahresplanung – als geteilte Klassenliste verbunden mit den anderen Werkzeugen.",
    tools: [
      {
        href: "/werkzeuge/klassenverteilung",
        eyebrow: "WZ-016",
        icon: <Network className="h-7 w-7 text-primary" {...iconProps} />,
        title: "Klassenverteilung",
        description:
          "Schüler*innen pädagogisch sinnvoll auf parallele Klassen verteilen. Lokale Bedienung weiterhin möglich – für die neue Klassenbildung mit Eltern-Wünschen wird die Online-Anmeldung empfohlen.",
        available: true,
        cloudOption: true,
      },
      {
        href: "/werkzeuge/schulleitungs-cockpit",
        eyebrow: "WZ-017",
        icon: <CalendarClock className="h-7 w-7 text-primary" {...iconProps} />,
        title: "Schulleitungs-Cockpit",
        description:
          "Termine, Pflichttermine Niedersachsen, Brückentage und Ferien-/Feiertags-Konflikte in einer Ansicht. iCal-Export.",
        available: true,
      },
    ],
  },
  {
    id: "multimedia",
    index: "04",
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
  {
    id: "lokale-ki",
    index: "05",
    eyebrow: "Edge-AI · Experimentell",
    title: "Lokale KI",
    body: "Sprachmodelle, Bild-KI und Whisper – alles läuft direkt in Ihrem Browser auf CPU oder GPU. Kein Server, kein Login, keine Daten verlassen das Gerät.",
    experimental: true,
    tools: [
      {
        href: "/werkzeuge/bild-verbesserer",
        eyebrow: "WZ-010",
        icon: <Sparkles className="h-7 w-7 text-primary" {...iconProps} />,
        title: "KI-Bild-Verbesserer",
        description:
          "Verdoppelt die Auflösung verpixelter Schul-Scans oder Fotos – ein neuronales Netz auf Ihrer Grafikkarte.",
        available: true,
      },
      {
        href: "/werkzeuge/hintergrund-entfernen",
        eyebrow: "WZ-011",
        icon: <Scissors className="h-7 w-7 text-primary" {...iconProps} />,
        title: "Hintergrund-Entferner",
        description:
          "Stellt Personen automatisch frei (transparenter Hintergrund) – ideal für Steckbriefe oder Klassenfotos.",
        available: true,
      },
      {
        href: "/werkzeuge/auto-transkription",
        eyebrow: "WZ-012",
        icon: <Mic className="h-7 w-7 text-primary" {...iconProps} />,
        title: "Diktiergerät & Transkription",
        description:
          "Sprachnotiz aufnehmen oder Audio-Datei laden – Whisper tippt auf Deutsch ab. Komplett offline-fähig.",
        available: true,
      },
      {
        href: "/werkzeuge/arbeitsblatt-scanner",
        eyebrow: "WZ-013",
        icon: <ScanText className="h-7 w-7 text-primary" {...iconProps} />,
        title: "Arbeitsblatt-Scanner",
        description:
          "Foto vom Arbeitsblatt oder Tafelbild – die KI erkennt deutschen Text und macht ihn bearbeitbar.",
        available: true,
      },
      {
        href: "/werkzeuge/text-differenzierer",
        eyebrow: "WZ-014",
        icon: <Wand2 className="h-7 w-7 text-primary" {...iconProps} />,
        title: "KI-Text-Differenzierer",
        description:
          "Texte vereinfachen, zusammenfassen oder Verständnisfragen erstellen – Sprachmodell läuft auf Ihrer GPU.",
        available: true,
      },
      {
        href: "/werkzeuge/video-untertitel",
        eyebrow: "WZ-015",
        icon: <Captions className="h-7 w-7 text-primary" {...iconProps} />,
        title: "Video-Untertitel",
        description:
          "Generiert .vtt-Untertitel für Schul-Videos automatisch – FFmpeg + Whisper, beides im Browser.",
        available: true,
      },
    ],
  },
];

// Interne (adminOnly) Werkzeuge zählen nicht zur öffentlichen Anzahl.
const totalTools = categories.reduce(
  (n, c) => n + c.tools.filter((t) => !t.adminOnly).length,
  0,
);

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
      {/* ── Hero mit Werkstatt-Blueprint ──────────────────────────────── */}
      <section className="relative bg-primary py-16 md:py-24 overflow-hidden">
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
          className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-accent/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary-light/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white mb-6">
            <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
            DigiKI · Werkzeuge
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-5 leading-[1.05] tracking-tight">
            Kleine Helfer, die
            <br />
            <span className="text-accent">sofort funktionieren.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/85 max-w-2xl leading-relaxed">
            Werbefreie Online-Werkzeuge für den Unterrichtsalltag. Keine
            Anmeldung, keine Cookies, keine versteckten Kosten – entstanden
            aus den Bedarfen der Lehrkräfte im Projekt.
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {principles.map((p) => (
              <div
                key={p.title}
                className="flex items-start gap-3 rounded-lg bg-white/5 border border-white/10 p-4"
              >
                <div className="shrink-0 text-accent mt-0.5">{p.icon}</div>
                <div>
                  <p className="text-sm font-bold text-white mb-0.5">{p.title}</p>
                  <p className="text-xs text-white/75 leading-relaxed">{p.body}</p>
                </div>
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
                <span className="tabular-nums">
                  [ {String(categories.length).padStart(2, "0")} × ]
                </span>
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
                      className={`font-bold text-7xl md:text-8xl leading-none tabular-nums tracking-tighter select-none ${
                        cat.experimental ? "text-accent-strong/20" : "text-primary/15"
                      }`}
                    >
                      {cat.index}
                    </span>
                    <span
                      className={`hidden md:block w-12 h-0.5 ${
                        cat.experimental ? "bg-accent" : "bg-accent-strong"
                      }`}
                    />
                  </div>
                  <div className="md:pt-3">
                    <p
                      className={`text-[11px] font-bold uppercase tracking-[0.2em] mb-2 inline-flex items-center gap-2 ${
                        cat.experimental ? "text-accent-strong" : "text-text-light"
                      }`}
                    >
                      {cat.experimental && (
                        <FlaskConical
                          className="h-3.5 w-3.5"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      )}
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

                {cat.experimental && (
                  <div
                    role="note"
                    aria-label="Hinweis: Experimentelle Werkzeuge"
                    className="relative mb-12 overflow-hidden rounded-2xl border-2 border-accent-strong/30 bg-white shadow-md"
                  >
                    {/* Diagonale Warnstreifen oben */}
                    <div
                      aria-hidden="true"
                      className="h-2.5"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(135deg, #AB7A0E 0 14px, #E8A838 14px 28px)",
                      }}
                    />

                    {/* Subtiles Raster im Hintergrund */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 opacity-[0.05]"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(0deg, #AB7A0E 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, #AB7A0E 0 1px, transparent 1px 24px)",
                      }}
                    />

                    <div className="relative grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 lg:gap-10 p-6 md:p-8">
                      {/* Icon-Spalte */}
                      <div className="flex items-start gap-4 lg:flex-col lg:items-center lg:gap-3">
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-strong text-white shrink-0 shadow-lg shadow-accent/40">
                          <FlaskConical
                            className="h-8 w-8"
                            strokeWidth={1.6}
                            aria-hidden="true"
                          />
                          <span
                            aria-hidden="true"
                            className="absolute -top-1 -right-1 flex h-3.5 w-3.5"
                          >
                            <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 motion-safe:animate-ping" />
                            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-accent ring-2 ring-white" />
                          </span>
                        </div>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent-strong whitespace-nowrap">
                          LAB · 05
                        </span>
                      </div>

                      {/* Inhalt */}
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-strong mb-2.5 inline-flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="inline-block h-1.5 w-1.5 rounded-full bg-accent-strong"
                          />
                          Experimentell · zum Ausprobieren gedacht
                        </p>
                        <h4 className="text-xl md:text-2xl font-bold text-primary mb-3 leading-tight tracking-tight">
                          Kleine, lokale Modelle – ein Vorgeschmack, kein Produktiv-Werkzeug.
                        </h4>
                        <p className="text-sm md:text-base text-text/90 leading-relaxed mb-3">
                          Diese KI-Werkzeuge laufen direkt in Ihrem Browser auf
                          CPU oder GPU. Das ist datensparsam und kostenlos –
                          aber nur mit{" "}
                          <strong className="font-semibold text-text">
                            kleinen Modellen
                          </strong>{" "}
                          möglich, die je nach Aufgabe spürbar fehleranfälliger
                          sind als die großen Cloud-Modelle. Bitte als
                          Spielwiese verstehen, nicht als Verlass-Werkzeug für
                          den Klassenraum.
                        </p>
                        <p className="text-sm md:text-base text-text-light leading-relaxed">
                          Den souveränen Umgang mit den{" "}
                          <strong className="font-semibold text-primary">
                            großen, leistungsstarken und zuverlässigen Modellen
                          </strong>{" "}
                          vermitteln wir Ihnen praxisnah in unseren
                          DigiKI-Schulungen.
                        </p>
                      </div>

                      {/* CTA-Spalte */}
                      <div className="flex flex-col items-start justify-end gap-3 lg:border-l-2 lg:border-dashed lg:border-accent-strong/25 lg:pl-8">
                        <Link
                          href="/fuer-schulen"
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-[gap,background-color] hover:bg-primary/90 hover:gap-3"
                        >
                          <GraduationCap
                            className="h-4 w-4"
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                          Zu den Schulungen
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <p className="text-[11px] text-text-light leading-relaxed max-w-[14rem]">
                          Praxisnaher Einstieg in die großen, zuverlässigen
                          KI-Modelle – kostenfrei für Grundschulen.
                        </p>
                      </div>
                    </div>

                    {/* Diagonale Warnstreifen unten – dezent */}
                    <div
                      aria-hidden="true"
                      className="h-1 opacity-60"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(135deg, #AB7A0E 0 10px, transparent 10px 20px)",
                      }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {cat.tools.map((tool, toolIndex) => {
                    const card = (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      className="tool-card group relative bg-white rounded-xl border border-border shadow-sm overflow-hidden transition-[transform,box-shadow] duration-300 hover:shadow-xl hover:-translate-y-1"
                      style={{
                        // Gesamt-Stagger ≤ 240 ms, damit die Animation spätestens
                        // ≤ 500 ms nach Load fertig ist – reduziert INP-Interferenz
                        // mit frühen Klicks.
                        animationDelay: `${Math.min(catIndex * 30 + toolIndex * 20, 240)}ms`,
                      }}
                    >
                      {/* Wachsende Akzent-Leiste oben */}
                      <div
                        aria-hidden="true"
                        className="relative h-1 bg-border overflow-hidden"
                      >
                        <span
                          className={`absolute inset-y-0 left-0 w-1/3 transition-all duration-500 group-hover:w-full ${
                            cat.experimental
                              ? "bg-gradient-to-r from-accent-strong to-accent group-hover:from-accent-strong group-hover:via-primary group-hover:to-accent"
                              : "bg-gradient-to-r from-primary to-primary-light group-hover:from-primary group-hover:via-accent-strong group-hover:to-primary"
                          }`}
                        />
                      </div>

                      <div className="p-6">
                        <div className="flex items-center justify-between mb-5">
                          <div
                            className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors ${
                              cat.experimental
                                ? "bg-accent/15 group-hover:bg-accent/25"
                                : "bg-primary/10 group-hover:bg-primary/15"
                            }`}
                          >
                            {tool.icon}
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            {cat.experimental && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-accent-strong px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white shadow-sm"
                                title="Experimentell – kleines lokales Modell"
                              >
                                <FlaskConical
                                  className="h-2.5 w-2.5"
                                  strokeWidth={2.6}
                                  aria-hidden="true"
                                />
                                Exp.
                              </span>
                            )}
                            {tool.cloudOption && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white shadow-sm"
                                title="Online-Modus mit DigiKI-Konto verfügbar – lokal weiterhin nutzbar"
                              >
                                <Cloud
                                  className="h-2.5 w-2.5"
                                  strokeWidth={2.4}
                                  aria-hidden="true"
                                />
                                Online empfohlen
                              </span>
                            )}
                            <span className="text-[10px] font-mono font-bold text-text-light/70 tabular-nums">
                              {tool.eyebrow}
                            </span>
                          </div>
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
                    );
                    // Interne Werkzeuge nur für angemeldete Admins anzeigen.
                    return tool.adminOnly ? (
                      <AdminOnly key={tool.href}>{card}</AdminOnly>
                    ) : (
                      card
                    );
                  })}
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

      {/* ── Why-Block ──────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20" aria-labelledby="why-heading">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl bg-white border border-border p-8 md:p-12 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-strong mb-3">
              Woher kommt das?
            </p>
            <h2
              id="why-heading"
              className="text-2xl md:text-3xl font-bold text-primary mb-4 leading-tight"
            >
              Entstanden aus echtem Bedarf.
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

      {/* Stagger-Reveal: kurz & billig (nur opacity + transform → GPU-only).
          Kein dauerhaftes `will-change` – das ließ alle 15 Karten als
          dedizierte Compositor-Layer leben und verschlechterte INP für den
          ersten Klick. Nach `forwards` ist die Karte ohnehin im Endzustand. */}
      <style>{`
        @keyframes tool-card-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tool-card {
          animation: tool-card-in 280ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .tool-card { animation: none; }
        }
      `}</style>

      <ContactSection />
    </>
  );
}
