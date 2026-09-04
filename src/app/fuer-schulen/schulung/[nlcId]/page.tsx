import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock,
  GraduationCap,
  Info,
  MapPin,
  Target,
  Users,
} from "lucide-react";
import { createServiceClient } from "@/lib/schulungen/server";
import {
  fetchNlcEventDetails,
  gruppeTitle,
  pickDeadline,
  type NlcAppointment,
  type NlcAppointmentLocation,
  type NlcEventPayload,
} from "@/lib/schulungen/nlcSync";
import type { TrainingEvent } from "@/lib/schulungen/types";

/**
 * Öffentliche Detailseite eines Schulungstermins: zeigt alle öffentlichen
 * Angaben aus der NLC-Ausschreibung (Termine, Ort, Beschreibung, Ziele,
 * Zielgruppe, Anmeldeschluss) schön aufbereitet – Quelle ist dieselbe
 * NLC-JSON-API, die auch der tägliche Fristen-Abgleich nutzt.
 *
 * Erreichbar nur für Termine, die im Dashboard existieren und nicht
 * archiviert sind (kein offener Proxy für beliebige NLC-Events).
 */

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ nlcId: string }>;
}

// ── NLC-HTML sicher in Text-Absätze umwandeln (kein innerHTML!) ──────────
function htmlToParagraphs(html: string | null | undefined): string[] {
  if (!html) return [];
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|tr|ul|ol)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<(br|hr)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—");
  return text
    .split(/\n{2,}/)
    .map((p) => p.replace(/[ \t]+/g, " ").replace(/\n /g, "\n").trim())
    .filter(Boolean);
}

// ── Absätze in gestaltbare Blöcke gliedern ──────────────────────────────
// Die NLC-Beschreibung ist eine lange Textwand; hier wird sie in Hinweis-
// Box, Zwischenüberschriften, Listen und Absätze zerlegt. Rechtliche
// Passagen wandern gesammelt in einen aufklappbaren Bereich, die im Text
// wiederholte Terminaufzählung entfällt (steht oben als Karte).
type TextBlock =
  | { kind: "note"; text: string }
  | { kind: "tip"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "list"; lead: string | null; items: string[] }
  | { kind: "para"; text: string };

const LEGAL_RE =
  /(Teilnahmebedingungen|NSchG|§§|Genehmigung der Dienststelle|dienstrechtlich|Ersatzschulen|Weitergabe Ihrer Anmeldedaten)/i;

function splitContent(paras: string[]): {
  blocks: TextBlock[];
  legal: string[];
} {
  const blocks: TextBlock[] = [];
  const legal: string[] = [];
  const isBullet = (l: string) => /^[-•–]\s+/.test(l);

  for (const p of paras) {
    // Doppelte Terminaufzählung („Die Veranstaltung besteht aus 3
    // Terminen: 07.09.…") überspringen – die Tage stehen oben als Karte.
    if (/^Die Veranstaltung besteht aus \d+ Termin/i.test(p)) continue;
    if (LEGAL_RE.test(p)) {
      legal.push(p);
      continue;
    }
    const note = p.match(/^\+{2,}\s*([\s\S]+?)\s*\+{2,}$/);
    if (note) {
      blocks.push({ kind: "note", text: note[1].trim() });
      continue;
    }
    if (/^Empfohlen wird/i.test(p)) {
      blocks.push({ kind: "tip", text: p });
      continue;
    }
    const lines = p.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.some(isBullet)) {
      const leadLines: string[] = [];
      const items: string[] = [];
      for (const l of lines) {
        if (isBullet(l)) items.push(l.replace(/^[-•–]\s+/, ""));
        else if (items.length === 0) leadLines.push(l);
        else items.push(l);
      }
      blocks.push({
        kind: "list",
        lead: leadLines.join(" ") || null,
        items,
      });
      continue;
    }
    if (!p.includes("\n") && p.length <= 60 && /:$/.test(p)) {
      blocks.push({ kind: "heading", text: p.replace(/:$/, "") });
      continue;
    }
    blocks.push({ kind: "para", text: p });
  }
  return { blocks, legal };
}

/** Nackte URLs im Text klickbar machen (nur http/https, kein HTML). */
function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-primary underline underline-offset-2"
          >
            {part.replace(/^https?:\/\/(www\.)?/, "")}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}

function TextBlocks({ blocks }: { blocks: TextBlock[] }) {
  return (
    <div className="mt-4 space-y-4">
      {blocks.map((b, i) => {
        if (b.kind === "note") {
          return (
            <p
              key={i}
              className="flex items-start gap-2.5 rounded-xl border border-accent-strong/30 bg-accent/10 px-4 py-3 text-sm font-semibold leading-relaxed text-text"
            >
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-accent-strong"
                aria-hidden="true"
              />
              <span>
                <Linkify text={b.text} />
              </span>
            </p>
          );
        }
        if (b.kind === "tip") {
          return (
            <p
              key={i}
              className="whitespace-pre-line rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-text"
            >
              <Linkify text={b.text} />
            </p>
          );
        }
        if (b.kind === "heading") {
          return (
            <h3 key={i} className="pt-2 text-base font-bold text-text">
              {b.text}
            </h3>
          );
        }
        if (b.kind === "list") {
          return (
            <div key={i}>
              {b.lead && (
                <p className="mb-2 text-[15px] font-semibold text-text">
                  {b.lead}
                </p>
              )}
              <ul className="space-y-1.5">
                {b.items.map((item, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-2.5 text-[15px] leading-relaxed text-text"
                  >
                    <Check
                      className="mt-1 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span>
                      <Linkify text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        return (
          <p
            key={i}
            className="whitespace-pre-line text-[15px] leading-relaxed text-text"
          >
            <Linkify text={b.text} />
          </p>
        );
      })}
    </div>
  );
}

// ── Datums-/Zeit-/Ort-Helfer ─────────────────────────────────────────────
function formatNlcLocation(l: NlcAppointmentLocation): string | null {
  const name = (l.name ?? "").trim();
  if (!name) return null;
  const street = (l.street ?? "").trim();
  const cityLine = [(l.zipcode ?? "").trim(), (l.city ?? "").trim()]
    .filter(Boolean)
    .join(" ");
  return `${name}${street ? ` · ${street}` : ""}${cityLine ? `, ${cityLine}` : ""}`;
}

function apptParts(a: NlcAppointment) {
  const start = (a.start ?? "").match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  const end = (a.end ?? "").match(/[ T](\d{2}:\d{2})/);
  if (!start) return null;
  const d = new Date(start[1] + "T00:00:00");
  return {
    iso: start[1],
    weekday: new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(d),
    dateLong: new Intl.DateTimeFormat("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d),
    timeRange:
      start[2] && end ? `${start[2]}–${end[1]} Uhr` : start[2] ? `ab ${start[2]} Uhr` : null,
    locations: (a.locations ?? [])
      .map(formatNlcLocation)
      .filter((l): l is string => l !== null),
  };
}

function formatDateLong(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso + "T00:00:00"));
}

// ── Daten laden ──────────────────────────────────────────────────────────
async function getEventRow(nlcId: string): Promise<TrainingEvent | null> {
  if (!/^\d{1,10}$/.test(nlcId)) return null;
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }
  const admin = createServiceClient();
  const { data } = await admin
    .from("training_events")
    .select("*")
    .eq("nlc_event_id", nlcId)
    .maybeSingle();
  const row = (data ?? null) as TrainingEvent | null;
  if (!row || row.archived_at) return null;
  return row;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { nlcId } = await params;
  const row = await getEventRow(nlcId);
  if (!row) return { title: "Schulung nicht gefunden" };
  const audienceLabel =
    row.audience === "leadership" ? "Schulleitungen" : "Lehrkräfte";
  return {
    title: `${row.title} – KOS-Fortbildung für ${audienceLabel}`,
    description: `Alle Details zur 3-tägigen DigiKI-Schulung ${row.kurs_nr} für ${audienceLabel}: Termine, Ort, Inhalte und Anmeldung.`,
    alternates: { canonical: `/fuer-schulen/schulung/${nlcId}` },
  };
}

export default async function SchulungDetailPage({ params }: PageProps) {
  const { nlcId } = await params;
  const row = await getEventRow(nlcId);
  if (!row) notFound();

  let nlc: NlcEventPayload | null = null;
  try {
    nlc = await fetchNlcEventDetails(nlcId);
  } catch (err) {
    console.error("[schulung-detail] NLC nicht erreichbar:", err);
  }

  const audienceLabel =
    row.audience === "leadership" ? "Schulleitungen" : "Lehrkräfte";
  const AudienceIcon = row.audience === "leadership" ? GraduationCap : Users;
  const heading = (nlc ? gruppeTitle(nlc.title) : null) ?? row.title;

  const appointments = (nlc?.appointments ?? [])
    .map(apptParts)
    .filter((a): a is NonNullable<ReturnType<typeof apptParts>> => a !== null)
    .sort((a, b) => a.iso.localeCompare(b.iso));

  const deadline = nlc
    ? pickDeadline(nlc, row.start_date)
    : (row.registration_deadline ?? null);
  const deadlineLong = formatDateLong(deadline);
  let deadlinePast = false;
  if (deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlinePast = today > new Date(deadline + "T00:00:00");
  }

  // Veranstaltungsort: meist sind alle Tage am selben Ort → ein Block.
  // Unterscheiden sich die Orte je Tag, steht der Ort direkt am Termin.
  const uniqueLocations = Array.from(
    new Set(appointments.flatMap((a) => a.locations)),
  );
  const sameLocationEverywhere = uniqueLocations.length <= 1;

  const description = splitContent(htmlToParagraphs(nlc?.description));
  const objectives = splitContent(htmlToParagraphs(nlc?.objectives));
  const legalParas = [...description.legal, ...objectives.legal];
  const addresseeText = htmlToParagraphs(nlc?.addressee).join(" ");
  const hosts = Array.from(
    new Set(
      (nlc?.hosts ?? [])
        .map((h) => (h.name ?? "").trim())
        .filter(Boolean),
    ),
  );
  const maxAttendees = nlc?.maxAttendees ?? null;
  const registrationUrl =
    row.anmeldung_url ?? `https://nlc.info/app/edb/event/${nlcId}`;

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/fuer-schulen#kos-fortbildungen"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Alle Fortbildungstermine
          </Link>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.28em] text-accent">
            KOS-Fortbildung · {audienceLabel}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
            DigiKI-Schulung {heading}
          </h1>
          <p className="mt-2 font-mono text-sm text-white/70">{row.kurs_nr}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              3-tägige Schulung
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              <AudienceIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {audienceLabel}
            </span>
            {deadlineLong && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  deadlinePast
                    ? "bg-red-100 text-red-700"
                    : "bg-accent text-text"
                }`}
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Anmeldeschluss: {deadlineLong}
                {deadlinePast ? " (abgelaufen)" : ""}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
          {!nlc && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Die Details aus dem Niedersächsischen LernCenter konnten gerade
                nicht geladen werden. Alle Angaben finden Sie direkt im{" "}
                <a
                  href={registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  NLC-Eintrag
                </a>
                .
              </p>
            </div>
          )}

          {/* Termine */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
            <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
              Die drei Schulungstage
            </h2>
            <p className="mt-1 text-sm text-text-light">
              Die Anmeldung gilt für alle drei Termine gemeinsam.
            </p>
            <ol className="mt-4 space-y-3">
              {(appointments.length > 0
                ? appointments
                : row.start_date
                  ? [
                      {
                        iso: row.start_date,
                        weekday: new Intl.DateTimeFormat("de-DE", {
                          weekday: "long",
                        }).format(new Date(row.start_date + "T00:00:00")),
                        dateLong: formatDateLong(row.start_date)!,
                        timeRange: null,
                        locations: [] as string[],
                      },
                    ]
                  : []
              ).map((a, i) => (
                <li
                  key={a.iso + i}
                  className="flex items-center gap-4 rounded-xl border border-border bg-bg/50 px-4 py-3"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary"
                  >
                    {i + 1}.
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text">
                      {a.weekday}, {a.dateLong}
                    </p>
                    {a.timeRange && (
                      <p className="text-sm text-text-light">{a.timeRange}</p>
                    )}
                    {!sameLocationEverywhere && a.locations.length > 0 && (
                      <p className="mt-1 flex items-start gap-1 text-xs text-text-light">
                        <MapPin
                          className="mt-0.5 h-3 w-3 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        {a.locations.join(" / ")}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            {sameLocationEverywhere && uniqueLocations.length === 1 && (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-bg/60 px-4 py-3">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="text-sm text-text">
                  <p className="font-semibold">Veranstaltungsort (alle Termine)</p>
                  <p className="text-text-light">{uniqueLocations[0]}</p>
                </div>
              </div>
            )}
            {!sameLocationEverywhere && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Die Termine finden an unterschiedlichen Orten statt – bitte
                achten Sie auf die Ortsangabe am jeweiligen Tag.
              </p>
            )}
          </div>

          {/* Anmeldung / CTA */}
          <div className="rounded-2xl border border-primary/25 bg-primary-light/10 p-6 shadow-sm md:p-8">
            <h2 className="text-lg font-bold text-primary">Anmeldung</h2>
            <p className="mt-2 text-sm leading-relaxed text-text">
              Die Anmeldung läuft über das Niedersächsische LernCenter (NLC)
              mit Ihrem NLC-/VeDaB-Zugang.
              {deadlineLong && !deadlinePast && (
                <>
                  {" "}
                  Anmeldeschluss ist der{" "}
                  <strong>{deadlineLong}</strong>.
                </>
              )}
              {deadlinePast && (
                <>
                  {" "}
                  Der Anmeldeschluss ({deadlineLong}) ist bereits abgelaufen –
                  Nachmeldungen sind laut NLC nur möglich, wenn noch Plätze
                  frei sind.
                </>
              )}
              {maxAttendees !== null && maxAttendees >= 5 && (
                <> Es gibt maximal {maxAttendees} Plätze pro Durchgang.</>
              )}
            </p>
            <a
              href={registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-semibold text-text transition-colors hover:bg-accent-hover"
            >
              {deadlinePast ? "Zum NLC-Eintrag" : "Jetzt im NLC anmelden"}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          {/* Beschreibung */}
          {description.blocks.length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
              <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                <Info className="h-5 w-5" aria-hidden="true" />
                Worum geht es?
              </h2>
              <TextBlocks blocks={description.blocks} />
            </div>
          )}

          {/* Ziele */}
          {objectives.blocks.length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
              <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                <Target className="h-5 w-5" aria-hidden="true" />
                Ziele der Schulung
              </h2>
              <TextBlocks blocks={objectives.blocks} />
            </div>
          )}

          {/* Zielgruppe */}
          {addresseeText && (
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
              <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                <AudienceIcon className="h-5 w-5" aria-hidden="true" />
                Für wen ist die Schulung?
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-text">
                {addresseeText}
              </p>
            </div>
          )}

          {/* Rechtliches – eingeklappt, damit die Seite übersichtlich bleibt */}
          {legalParas.length > 0 && (
            <details className="rounded-2xl border border-border bg-bg/50 px-6 py-4">
              <summary className="cursor-pointer text-sm font-semibold text-text-light transition-colors hover:text-text">
                Teilnahmebedingungen &amp; rechtliche Hinweise
              </summary>
              <div className="mt-3 space-y-3">
                {legalParas.map((p, i) => (
                  <p
                    key={i}
                    className="whitespace-pre-line text-[13px] leading-relaxed text-text-light"
                  >
                    <Linkify text={p} />
                  </p>
                ))}
              </div>
            </details>
          )}

          {/* Quelle */}
          <p className="text-center text-xs leading-relaxed text-text-light">
            {hosts.length > 0 && (
              <>
                Veranstalter: {hosts.join(", ")}.
                <br />
              </>
            )}
            Alle Angaben stammen aus der offiziellen Ausschreibung im{" "}
            <a
              href={registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-primary"
            >
              Niedersächsischen LernCenter (NLC)
            </a>{" "}
            und werden stündlich aktualisiert.
          </p>
        </div>
      </section>
    </>
  );
}
