import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lightbulb, Sparkles, Users } from "lucide-react";
import BestPracticeForm from "@/components/best-practice/BestPracticeForm";

export const metadata: Metadata = {
  title: "Neuer Beitrag - Best Practice Admin",
  robots: { index: false, follow: false },
};

export default function NeuPage() {
  return (
    <>
      {/* ─────────────── HERO ─────────────── */}
      <section className="relative overflow-hidden bg-primary py-10 md:py-14">
        {/* Subtiles Raster-Muster */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #ffffff 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, #ffffff 0 1px, transparent 1px 28px)",
          }}
        />
        {/* Atmosphärischer Glow rechts oben */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-32 h-80 w-80 rounded-full bg-primary-light/20 blur-3xl"
        />
        {/* Akzent-Glow links unten */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full opacity-[0.18] blur-3xl"
          style={{ background: "var(--color-accent)" }}
        />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/best-practice/admin"
            className="inline-flex items-center gap-1 text-sm text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Zurück zum Admin-Bereich
          </Link>

          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
                Best Practice · Neu anlegen
              </p>
              <h1 className="mt-2 text-3xl font-bold leading-[1.05] tracking-tight text-white md:text-5xl">
                Wissen teilen,
                <br />
                <span className="text-accent">das wirklich weiterhilft.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
                Halten Sie ein gelungenes Beispiel aus dem Unterricht fest –
                kurz, konkret und übertragbar. Andere Schulen lernen daraus, was
                in der Praxis funktioniert, statt nur über Theorie zu reden.
              </p>
            </div>

            {/* Mini-Stat-Karten als visueller Anker */}
            <div className="flex flex-row gap-3 md:flex-col">
              <HeroMicroCard
                icon={<Lightbulb className="h-4 w-4 text-accent" />}
                title="Praxisnah"
                hint="echte Erfahrungen statt Theorie"
              />
              <HeroMicroCard
                icon={<Users className="h-4 w-4 text-primary-light" />}
                title="Für Kolleg:innen"
                hint="andere Schulen profitieren direkt"
              />
              <HeroMicroCard
                icon={<Sparkles className="h-4 w-4 text-accent" />}
                title="Inspirierend"
                hint="zeigen, was möglich ist"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── FORM ─────────────── */}
      <section className="bg-bg py-10 md:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <BestPracticeForm />
        </div>
      </section>
    </>
  );
}

function HeroMicroCard({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex min-w-[140px] items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-bold leading-tight text-white">
          {title}
        </p>
        <p className="text-[10.5px] leading-snug text-white/65">{hint}</p>
      </div>
    </div>
  );
}
