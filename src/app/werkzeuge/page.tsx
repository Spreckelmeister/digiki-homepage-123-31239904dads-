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
} from "lucide-react";
import ContactSection from "@/components/ContactSection";

export const metadata: Metadata = {
  title: "Werkzeuge",
  description:
    "Kleine, werbefreie Online-Werkzeuge für den Unterrichtsalltag an Grundschulen – vom QR-Code-Generator bis zu weiteren Helfern.",
  alternates: { canonical: "/werkzeuge" },
  openGraph: {
    title: "Werkzeuge für Lehrkräfte – DigiKI Osnabrück",
    description:
      "Werbefreie, einfache Online-Werkzeuge, die direkt im Klassenzimmer helfen – ohne Anmeldung, ohne Tracking.",
  },
};

interface Tool {
  href: string;
  eyebrow: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: "primary" | "teal";
  available: boolean;
}

const tools: Tool[] = [
  {
    href: "/werkzeuge/qr-code",
    eyebrow: "WZ-001 · Scanner-Hilfe",
    icon: <QrCode className="h-7 w-7 text-primary" aria-hidden="true" strokeWidth={1.6} />,
    title: "QR-Code-Generator",
    description:
      "Link eintippen, QR-Code sofort erhalten – robust für den Klassenraum, direkt druckbar.",
    accentColor: "primary",
    available: true,
  },
];

const principles = [
  {
    icon: <ShieldCheck className="h-5 w-5" aria-hidden="true" strokeWidth={1.6} />,
    title: "Datensparsam",
    body: "Alles läuft in Ihrem Browser. Kein Upload, keine Server, kein Tracking.",
  },
  {
    icon: <WifiOff className="h-5 w-5" aria-hidden="true" strokeWidth={1.6} />,
    title: "Offline-fähig",
    body: "Einmal geladen, funktioniert die Seite auch ohne aktive Verbindung.",
  },
  {
    icon: <Coins className="h-5 w-5" aria-hidden="true" strokeWidth={1.6} />,
    title: "Werbefrei",
    body: "Keine Banner, keine Cookies von Dritten, keine Paywalls.",
  },
];

export default function WerkzeugePage() {
  return (
    <>
      {/* ── Hero mit Werkstatt-Blueprint ──────────────────────────────── */}
      <section className="relative bg-primary py-16 md:py-24 overflow-hidden">
        {/* Blueprint-Raster */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #ffffff 0 1px, transparent 1px 32px), repeating-linear-gradient(90deg, #ffffff 0 1px, transparent 1px 32px)",
          }}
        />
        {/* Akzent-Glow */}
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

          {/* Prinzipien-Leiste */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {principles.map((p) => (
              <div
                key={p.title}
                className="flex items-start gap-3 rounded-lg bg-white/5 border border-white/10 p-4"
              >
                <div className="shrink-0 text-accent mt-0.5">{p.icon}</div>
                <div>
                  <p className="text-sm font-bold text-white mb-0.5">{p.title}</p>
                  <p className="text-xs text-white/75 leading-relaxed">
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tool-Regal ─────────────────────────────────────────────────── */}
      <section
        className="relative py-16 md:py-24 bg-bg"
        aria-labelledby="tools-heading"
      >
        {/* Dezentes Raster */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, #006363 0 1px, transparent 1px 48px)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-light mb-2">
                Regal · Aktuell verfügbar
              </p>
              <h2
                id="tools-heading"
                className="text-2xl md:text-3xl font-bold text-primary"
              >
                Werkzeuge
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) =>
              tool.available ? (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group relative bg-white rounded-xl shadow-sm border border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
                >
                  {/* Obere Akzent-Leiste */}
                  <div
                    aria-hidden="true"
                    className="h-1 bg-gradient-to-r from-primary via-primary-light to-primary"
                  />
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                        {tool.icon}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-text-light/70 tabular-nums">
                        {tool.eyebrow}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-primary mb-2">
                      {tool.title}
                    </h3>
                    <p className="text-sm text-text-light leading-relaxed mb-5">
                      {tool.description}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                      Öffnen
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              ) : null
            )}

            {/* Platzhalter für kommende Werkzeuge */}
            <div className="relative rounded-xl border-2 border-dashed border-border/80 bg-white/40 p-6">
              <div
                aria-hidden="true"
                className="h-1 -mx-6 -mt-6 mb-5 bg-gradient-to-r from-transparent via-border to-transparent"
              />
              <div className="flex items-center justify-between mb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-bg border border-dashed border-border">
                  <Sparkles className="h-6 w-6 text-text-light" aria-hidden="true" />
                </div>
                <span className="text-[10px] font-mono font-bold text-text-light/70 tabular-nums">
                  WZ-???
                </span>
              </div>
              <h3 className="text-lg font-bold text-text mb-2">
                Weitere folgen
              </h3>
              <p className="text-sm text-text-light leading-relaxed mb-5">
                Haben Sie ein wiederkehrendes Problem im digitalen Unterrichts&shy;alltag?
                Häufig gefragte Werkzeuge landen hier als nächstes.
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
      </section>

      {/* ── Why-Block ──────────────────────────────────────────────────── */}
      <section
        className="py-16 md:py-20"
        aria-labelledby="why-heading"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl bg-white border border-border p-8 md:p-12 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-strong mb-3">
              Woher kommt das?
            </p>
            <h2
              id="why-heading"
              className="text-2xl md:text-3xl font-bold text-primary mb-4 leading-tight"
            >
              Entstanden aus echten Bedarfen.
            </h2>
            <blockquote className="relative pl-5 border-l-4 border-accent-strong text-base md:text-lg text-text/90 leading-relaxed italic">
              „Einige Lehrkräfte haben digitale Diagnosen getestet, sind aber
              immer wieder an technischen Hürden gescheitert – wie sollen 22
              Erstklässler sich auf eine Internetseite bewegen, wenn dem Lehrer
              nur unzuverlässige Freeware-Software zur QR-Code-Erstellung zur
              Verfügung steht?"
              <cite className="block not-italic text-sm text-text-light mt-4 font-sans">
                — Stimme einer Schulleitung aus dem DigiKI-Projekt
              </cite>
            </blockquote>
            <p className="mt-6 text-base text-text-light leading-relaxed">
              Genau solche wiederkehrenden Reibungspunkte landen hier als
              kleines Werkzeug – schnörkellos, werbefrei, sofort einsatzbereit.
            </p>
          </div>
        </div>
      </section>

      <ContactSection />
    </>
  );
}
