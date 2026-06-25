import { ArrowUpRight, CalendarDays, GraduationCap, Info, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { TrainingEvent } from "@/lib/schulungen/types";

// Wochentag (Mi.) + großer Tag + Monatsname – scannbar, ähnlich zu
// Event-Cards aus Eventbrite/Lu.ma. Bewusst mit Intl statt fixer Lookup-
// Tabelle, damit Übersetzungen / Locale-Wechsel später trivial sind.
function formatDateParts(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const weekday = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
  }).format(d);
  const day = d.getDate();
  const month = new Intl.DateTimeFormat("de-DE", { month: "long" }).format(d);
  const year = d.getFullYear();
  return { weekday, day, month, year };
}

function TerminRow({ termin }: { termin: TrainingEvent }) {
  const { weekday, day, month, year } = formatDateParts(termin.start_date || "");
  const hasLink = !!termin.anmeldung_url;

  let deadlinePast = false;
  let deadlineFormatted = "";
  if (termin.registration_deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dlDate = new Date(termin.registration_deadline + "T00:00:00");
    deadlinePast = today > dlDate;
    deadlineFormatted = new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(dlDate);
  }

  return (
    <li className="group flex items-center gap-4 border-t border-border/70 py-4 first:border-t-0 first:pt-0 last:pb-0">
      {/* Datum-Cluster */}
      <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-bg px-2 py-2 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-light">
          {weekday.replace(".", "")}
        </span>
        <span className="text-2xl font-bold leading-none text-primary tabular-nums">
          {day}
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-text-light">
          {month.slice(0, 3)} {year}
        </span>
      </div>

      {/* Beschreibung */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text">
          {day}. {month} {year}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <p className="font-mono text-[12px] text-text-light">
            {termin.kurs_nr}
          </p>
          {termin.registration_deadline && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                deadlinePast
                  ? "bg-red-50 text-red-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              Anmeldeschluss: {deadlineFormatted}
            </span>
          )}
        </div>
      </div>

      {/* Anmelde-Link */}
      {hasLink ? (
        <a
          href={termin.anmeldung_url!}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            deadlinePast || termin.registration_deadline
              ? "border-border bg-bg text-text hover:border-border-strong hover:bg-bg-alt"
              : "border-primary/30 bg-white text-primary hover:border-primary hover:bg-primary/5"
          }`}
          aria-label={`Zum NLC-Eintrag für ${termin.kurs_nr} am ${day}. ${month} ${year}`}
        >
          {deadlinePast || termin.registration_deadline ? "Zum NLC-Eintrag" : "Anmelden"}
          <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
        </a>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text-light">
          Demnächst
        </span>
      )}
    </li>
  );
}

interface ZielgruppeCardProps {
  icon: React.ReactNode;
  accent: string;
  accentSoft: string;
  eyebrow: string;
  title: string;
  description: string;
  termine: TrainingEvent[];
}

function ZielgruppeCard({
  icon,
  accent,
  accentSoft,
  eyebrow,
  title,
  description,
  termine,
}: ZielgruppeCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <header
        className="flex items-start gap-4 px-6 py-5"
        style={{ backgroundColor: accentSoft }}
      >
        <span
          aria-hidden="true"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm"
          style={{ color: accent }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ color: accent }}
          >
            {eyebrow} · {termine.length} Termine
          </p>
          <h3 className="mt-1 text-xl font-bold text-text leading-tight">
            {title}
          </h3>
          <p className="mt-1 text-sm text-text-light leading-snug">
            {description}
          </p>
        </div>
      </header>
      <ul className="divide-y-0 px-6 py-4">
        {termine.length === 0 ? (
          <li className="py-4 text-sm text-text-light text-center">
            Aktuell keine Termine veröffentlicht.
          </li>
        ) : (
          termine.map((t) => (
            <TerminRow key={t.id} termin={t} />
          ))
        )}
      </ul>
    </article>
  );
}

export default async function KosFortbildungenSection() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("training_events")
    .select("*")
    .order("start_date", { ascending: true });

  const safeEvents = (events || []) as TrainingEvent[];

  const schulleitung = safeEvents.filter((e) => e.audience === "leadership");
  const lehrkraefte = safeEvents.filter((e) => e.audience === "teacher");

  return (
    <section
      id="kos-fortbildungen"
      className="bg-white py-16 md:py-24"
      aria-labelledby="kos-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Editorial-Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-accent-strong">
            Schulungen über das Kompetenzzentrum Osnabrück
          </p>
          <h2
            id="kos-heading"
            className="mt-3 text-2xl md:text-3xl font-bold text-primary"
          >
            KOS-Fortbildungstermine
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-text-light">
            Die ersten Termine sind bereits online – manche schon ausgebucht.
            Hier finden Sie die aktuelle Übersicht aller DigiKI-Schulungen,
            sortiert nach Zielgruppe.
          </p>
        </div>

        {/* Hinweis-Box: Teilnahme-Regeln */}
        <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-primary-light/30 bg-primary-light/5 p-5 md:p-6">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
            >
              <Info className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                Wer kann teilnehmen?
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-text">
                Jede Schule, die die <strong>Bestandsaufnahme</strong> ausgefüllt
                hat, kann aktuell <strong>zwei Lehrkräfte und eine Person aus
                der Schulleitung</strong> zu den Fortbildungen entsenden. Bitte
                achten Sie bei der Anmeldung auf die jeweilige Zielgruppe.
              </p>
            </div>
          </div>
        </div>

        {/* Termin-Karten */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-2">
          <ZielgruppeCard
            icon={<GraduationCap className="h-5 w-5" />}
            accent="#006363"
            accentSoft="#EBF8F7"
            eyebrow="Schulleitungen"
            title="Schulungen für Schulleitungen"
            description="Strategische Einbindung von Digitalisierung und KI in den Schulalltag."
            termine={schulleitung}
          />
          <ZielgruppeCard
            icon={<Users className="h-5 w-5" />}
            accent="#AB7A0E"
            accentSoft="#FBF4E5"
            eyebrow="Lehrkräfte"
            title="Schulungen für Lehrkräfte"
            description="Praxisnaher Einsatz digitaler Tools und KI im Unterricht."
            termine={lehrkraefte}
          />
        </div>

        {/* Outro: Inhalte + weitere Termine */}
        <div className="mx-auto mt-10 max-w-4xl rounded-xl border border-border bg-bg/50 p-5 text-sm text-text-light md:p-6">
          <div className="flex items-start gap-3">
            <CalendarDays
              className="mt-0.5 h-4 w-4 shrink-0 text-text-light"
              aria-hidden="true"
            />
            <p className="leading-relaxed">
              <strong className="text-text">Weitere Termine folgen Anfang 2027.</strong>{" "}
              Die Inhalte werden derzeit gemeinsam mit{" "}
              <span className="font-medium text-text">Inlingua</span> mit
              Hochdruck abgestimmt und ausgearbeitet – die Teilnahme wird sich
              für Sie wirklich lohnen.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
