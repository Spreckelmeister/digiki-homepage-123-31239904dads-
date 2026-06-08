import type { Metadata } from "next";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import {
  Activity,
  Building2,
  Trees,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  GraduationCap,
  Database,
  Download,
  Layers,
} from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import AdminNav from "@/components/best-practice/AdminNav";
import {
  type BestandsaufnahmeRow,
  totals,
  average,
  countMulti,
  countSingle,
  countRating,
  dedupeBySchool,
} from "@/lib/bestandsaufnahme/aggregations";
import {
  AI_CONCERN_OPTIONS,
  AI_PURPOSE_OPTIONS,
  AI_TOOL_OPTIONS,
  AI_TRAINING_OPTIONS,
  AI_USAGE_OPTIONS,
  CHALLENGE_OPTIONS,
  DEVICE_OPTIONS,
  DIAGNOSTIC_OPTIONS,
  INFRASTRUCTURE_OPTIONS,
  MEDIA_CONCEPT_OPTIONS,
  MEDIA_RESPONSIBLE_OPTIONS,
  PIONEER_INTEREST_OPTIONS,
  SOFTWARE_LICENSE_OPTIONS,
  SUPPORT_NEED_OPTIONS,
  TOOL_OPTIONS,
  TRAINING_FORMAT_OPTIONS,
  TRAINING_NEED_OPTIONS,
  TRAINING_TIME_OPTIONS,
  USAGE_FREQUENCY_OPTIONS,
} from "@/lib/bestandsaufnahme/options";
import {
  Card,
  Donut,
  HBarGroup,
  Insight,
  KPI,
  Legend,
  VBar,
} from "@/components/best-practice/auswertung/Charts";

export const metadata: Metadata = {
  title: "Auswertung Bestandsaufnahme – Admin",
  description:
    "Live-Auswertung der eingegangenen Bestandsaufnahmen für Stadt und Landkreis Osnabrück.",
  robots: { index: false, follow: false },
};

// Immer frisch rendern – Daten kommen aus Supabase und sollen live sein.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const FMT_DATE = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const SECTIONS = [
  { id: "ueberblick", label: "Überblick", index: "01" },
  { id: "infrastruktur", label: "Infrastruktur", index: "02" },
  { id: "tools", label: "Tools", index: "03" },
  { id: "ki", label: "KI-Nutzung", index: "04" },
  { id: "fortbildung", label: "Fortbildung", index: "05" },
  { id: "schluss", label: "Schlussfolgerungen", index: "06" },
  { id: "claude", label: "Claude-Abdeckung", index: "07" },
  { id: "luecken", label: "Verbleibende Lücken", index: "08" },
];

export default async function AuswertungPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: rawRows } = await supabase
    .from("bestandsaufnahme_responses")
    .select(
      // Nur die Felder, die für Aggregationen relevant sind. Wir holen
      // bewusst keine Freitexte, um Payload und Datenschutz-Footprint zu
      // minimieren.
      `
      id, school_name, school_location, student_count, teacher_count,
      is_startchancen_school, daz_share, respondent_role, respondent_role_other,
      devices, devices_other, tablet_count, wlan_rating,
      infrastructure, infrastructure_other,
      challenges, challenges_other, support_satisfaction,
      digitization_level, tools_used, tools_used_other, usage_frequency,
      diagnostic_tools, diagnostic_tools_other, media_concept, media_responsible,
      ai_usage, ai_purposes, ai_purposes_other, ai_tools_used, ai_tools_other,
      ai_competence, ai_concerns, ai_concerns_other, ai_trainings, ai_trainings_other,
      training_needs, training_needs_other, training_format, training_times,
      participation_count, pioneer_interest,
      has_best_practice, share_practice,
      support_needs, software_licenses, software_licenses_other,
      student_support, time_for_tools,
      created_at
      `
    )
    .not("school_name", "ilike", "%test%")
    .not("school_name", "ilike", "%admin%")
    .order("created_at", { ascending: false });

  const allRows = (rawRows ?? []) as BestandsaufnahmeRow[];
  // Mehrfacheinreichungen derselben Schule zusammenfassen – nur die
  // jüngste Einreichung gewinnt. Verhindert verzerrte Statistiken,
  // wenn Schulen die Bestandsaufnahme mehrfach abschicken.
  const { unique: rows, duplicates: duplicatesSkipped } = dedupeBySchool(allRows);
  const t = totals(rows);

  // Frühe Behandlung: Empty State wenn noch keine Daten vorliegen
  if (t.all === 0) {
    return <EmptyState profile={profile} />;
  }

  // ── Aggregationen vorberechnen ───────────────────────────────────────
  const avgWlan = average(rows, "wlan_rating");
  const avgSupport = average(rows, "support_satisfaction");
  const avgDigi = average(rows, "digitization_level");
  const avgAiComp = average(rows, "ai_competence");

  const digiDist = countRating(rows, "digitization_level");
  const supportDist = countRating(rows, "support_satisfaction");

  const devicesCount = countMulti(rows, "devices", DEVICE_OPTIONS);
  const infraCount = countMulti(rows, "infrastructure", INFRASTRUCTURE_OPTIONS);
  const challengesCount = countMulti(rows, "challenges", CHALLENGE_OPTIONS);
  const toolsCount = countMulti(rows, "tools_used", TOOL_OPTIONS);
  const diagCount = countMulti(rows, "diagnostic_tools", DIAGNOSTIC_OPTIONS);

  const usageDist = countSingle(rows, "usage_frequency", USAGE_FREQUENCY_OPTIONS);
  const mediaConceptDist = countSingle(rows, "media_concept", MEDIA_CONCEPT_OPTIONS);
  const mediaResponsibleDist = countSingle(
    rows,
    "media_responsible",
    MEDIA_RESPONSIBLE_OPTIONS
  );
  const aiUsageDist = countSingle(rows, "ai_usage", AI_USAGE_OPTIONS);
  const pioneerDist = countSingle(rows, "pioneer_interest", PIONEER_INTEREST_OPTIONS);

  const aiPurposeCount = countMulti(rows, "ai_purposes", AI_PURPOSE_OPTIONS);
  const aiToolsCount = countMulti(rows, "ai_tools_used", AI_TOOL_OPTIONS);
  const aiConcernsCount = countMulti(rows, "ai_concerns", AI_CONCERN_OPTIONS);
  const aiTrainingsCount = countMulti(rows, "ai_trainings", AI_TRAINING_OPTIONS);

  const trainingNeedsCount = countMulti(rows, "training_needs", TRAINING_NEED_OPTIONS);
  const trainingFormatCount = countMulti(
    rows,
    "training_format",
    TRAINING_FORMAT_OPTIONS
  );
  const trainingTimesCount = countMulti(
    rows,
    "training_times",
    TRAINING_TIME_OPTIONS
  );
  const supportNeedsCount = countMulti(rows, "support_needs", SUPPORT_NEED_OPTIONS);
  const licensesCount = countMulti(
    rows,
    "software_licenses",
    SOFTWARE_LICENSE_OPTIONS
  );

  // KI-spezifische Kennzahlen für die Headline-KPIs in §4
  const aiActiveTotal = aiUsageDist
    .filter((b) =>
      b.option.startsWith("Ja, mehrere") || b.option.startsWith("Ja, einzelne")
    )
    .reduce((s, b) => s + b.total, 0);
  const aiRegularStadt = aiUsageDist.find((b) =>
    b.option.startsWith("Ja, mehrere")
  )?.stadt ?? 0;
  const aiRegularLand = aiUsageDist.find((b) =>
    b.option.startsWith("Ja, mehrere")
  )?.land ?? 0;
  const aiTrainedYes = aiTrainingsCount
    .filter((b) => b.option.startsWith("Ja"))
    .reduce((s, b) => s + b.total, 0);
  const aiTrainedNo = t.all - aiTrainedYes;

  // Bestandsaufnahme-Kennzahlen für §1
  const noDigitalDiagnosticsCount = diagCount.find(
    (b) => b.option === "Nein, keine digitale Diagnostik"
  )?.total ?? 0;

  const lastSubmission = rows[0]?.created_at;

  return (
    <>
      {/* ─────────────── HERO ─────────────── */}
      <section className="relative bg-primary py-10 md:py-14 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #ffffff 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, #ffffff 0 1px, transparent 1px 28px)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-32 h-80 w-80 rounded-full bg-primary-light/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Top-Leiste: Back-Link + AuthStatus klar getrennt */}
          <div className="flex items-center justify-between gap-4">
            <BackButton
              fallbackHref="/best-practice/admin/bestandsaufnahme"
              fallbackLabel="Zurück zur Übersicht"
              className="flex w-fit items-center gap-1 text-sm text-white/70 hover:text-white transition-colors"
            />
            <AuthStatus initialProfile={profile} />
          </div>

          {/* Titelblock – Eyebrow, Headline, Live-Marker rechts */}
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
                Bestandsaufnahme · Auswertung
              </p>
              <h1 className="mt-2 text-3xl md:text-5xl font-bold text-white leading-[1.05] tracking-tight">
                {t.all} Schulen,
                <br />
                <span className="text-accent">eine Datenbasis</span>
              </h1>
            </div>

            {/* Live-Marker: rechts unten am Titel, eigenständige Block-Box –
                überlappt nichts mehr mit dem Back-Link. */}
            <div className="flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-white">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live · {t.all} Schule{t.all === 1 ? "" : "n"}
            </div>
          </div>

          {duplicatesSkipped > 0 && (
            <p className="mt-3 inline-flex items-center gap-2 text-[12px] text-white/65">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                <strong className="font-semibold text-white/85">
                  {duplicatesSkipped}{" "}
                  Mehrfacheinreichung{duplicatesSkipped === 1 ? "" : "en"}
                </strong>{" "}
                zusammengefasst – nur die jüngste Einreichung pro Schule fließt ein.
              </span>
            </p>
          )}

          <div className="mt-6">
            <AdminNav />
          </div>

          {/* Kompakte Headline-Zahlen */}
          <div className="relative mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            <HeroStat
              icon={<Database className="h-3.5 w-3.5" />}
              label="Schulen gesamt"
              value={t.all}
              accent="text-accent"
            />
            <HeroStat
              icon={<Building2 className="h-3.5 w-3.5" />}
              label="Stadt"
              value={t.stadt}
              accent="text-white"
            />
            <HeroStat
              icon={<Trees className="h-3.5 w-3.5" />}
              label="Landkreis"
              value={t.land}
              accent="text-white"
            />
            <HeroStat
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Ø KI-Kompetenz"
              value={avgAiComp.all !== null ? `${avgAiComp.all.toFixed(1)}` : "–"}
              sub="von 5"
              accent="text-accent"
            />
          </div>

          {/* Download-CTA – Markdown-Export für KI-gestützte Weiterverarbeitung */}
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 border border-white/15"
              >
                <Download className="h-4 w-4 text-accent" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
                  Export
                </p>
                <p className="text-sm text-white/85">
                  Vollständiger Bericht als Markdown – ideal als Input für ein KI-Modell.
                </p>
              </div>
            </div>
            <a
              href="/api/admin/bestandsaufnahme/export-markdown"
              download
              className="group inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-text shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-md"
            >
              <Download
                className="h-4 w-4 transition-transform group-hover:translate-y-0.5"
                aria-hidden="true"
              />
              Daten als Markdown herunterladen
            </a>
          </div>
        </div>
      </section>

      {/* ─────────────── STICKY SECTION-NAV ─────────────── */}
      <nav
        aria-label="Abschnittsnavigation"
        className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-border"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-2.5 -mx-1 px-1 scrollbar-thin">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium text-text-light hover:text-primary hover:bg-primary/5 transition-colors whitespace-nowrap"
              >
                <span className="font-mono text-[10px] tabular-nums text-text-light/60 group-hover:text-primary">
                  {s.index}
                </span>
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* ─────────────── BODY ─────────────── */}
      <main className="bg-bg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-20">

          {/* ════════ §1 ÜBERBLICK ════════ */}
          <SectionHeader
            id="ueberblick"
            index="01"
            eyebrow="Überblick"
            title="Stichprobe & zentrale Kennzahlen"
            body={
              `${t.all} Schule${t.all === 1 ? "" : "n"} · ${t.stadt} aus der Stadt Osnabrück · ${t.land} aus dem Landkreis.` +
              (duplicatesSkipped > 0
                ? ` ${duplicatesSkipped} Mehrfacheinreichung${duplicatesSkipped === 1 ? "" : "en"} wurden zusammengefasst – nur die jüngste Antwort pro Schule fließt ein.`
                : "") +
              " Die folgenden Auswertungen aktualisieren sich automatisch mit jeder neuen Einreichung."
            }
          />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPI label="Schulen" value={t.all} sub={`${t.stadt} Stadt · ${t.land} Land`} />
            <KPI
              label="Ø WLAN Stadt"
              value={avgWlan.stadt !== null ? `${avgWlan.stadt.toFixed(1)}` : "–"}
              sub="von 5"
              variant="stadt"
            />
            <KPI
              label="Ø WLAN Land"
              value={avgWlan.land !== null ? `${avgWlan.land.toFixed(1)}` : "–"}
              sub="von 5"
              variant="land"
            />
            <KPI
              label="Ø KI-Kompetenz"
              value={avgAiComp.all !== null ? `${avgAiComp.all.toFixed(1)}` : "–"}
              sub="von 5 (alle)"
              variant="warn"
            />
            <KPI
              label="Ohne KI-Fortbildung"
              value={`${aiTrainedNo}/${t.all}`}
              sub={pct(aiTrainedNo, t.all)}
            />
            <KPI
              label="Ohne digitale Diagnostik"
              value={`${noDigitalDiagnosticsCount}/${t.all}`}
              sub={pct(noDigitalDiagnosticsCount, t.all)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card
              title="Selbsteinschätzung Digitalisierungsgrad (1–5)"
              meta="Verteilung"
            >
              <div className="mb-3"><Legend /></div>
              <VBar buckets={digiDist} totals={t} />
              <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                <MiniStat label="Ø Stadt" value={fmtAvg(avgDigi.stadt)} accent="text-primary" />
                <MiniStat label="Ø Land" value={fmtAvg(avgDigi.land)} accent="text-primary-light" />
                <MiniStat label="Ø Gesamt" value={fmtAvg(avgDigi.all)} />
              </div>
            </Card>

            <Card
              title="Wahrnehmung des technischen Supports (1–5)"
              meta="Verteilung"
            >
              <div className="mb-3"><Legend /></div>
              <VBar buckets={supportDist} totals={t} />
              <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                <MiniStat label="Ø Stadt" value={fmtAvg(avgSupport.stadt)} accent="text-primary" />
                <MiniStat label="Ø Land" value={fmtAvg(avgSupport.land)} accent="text-primary-light" />
                <MiniStat label="Ø Gesamt" value={fmtAvg(avgSupport.all)} />
              </div>
            </Card>
          </div>

          <Insight>
            <strong>Aktuelle Beobachtung:</strong> Die Schulen schätzen ihren
            eigenen Digitalisierungsgrad im Schnitt mit{" "}
            <strong>{fmtAvg(avgDigi.all)} / 5</strong> ein – während die
            harten Infrastruktur-Indikatoren bei{" "}
            <strong>WLAN {fmtAvg(avgWlan.all)} / 5</strong> und{" "}
            <strong>Tech-Support {fmtAvg(avgSupport.all)} / 5</strong> liegen.
            Schulen mit besserer Infrastruktur identifizieren tendenziell mehr
            Lücken – die Selbstwahrnehmung wird dort kritischer.
          </Insight>

          {/* ════════ §2 INFRASTRUKTUR ════════ */}
          <SectionHeader
            id="infrastruktur"
            index="02"
            eyebrow="Infrastruktur"
            title="Geräte, Plattformen & Hindernisse"
            body="Was steht in den Schulen tatsächlich? Welche Plattformen sind im Einsatz – und wo klemmt es im Alltag?"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="Verfügbare Endgeräte" meta="Anteil je Bezirk">
              <HBarGroup
                buckets={devicesCount}
                totals={t}
                sort="byTotal"
                hideEmpty
              />
            </Card>
            <Card title="Genutzte Plattformen / Infrastruktur" meta="Anteil je Bezirk">
              <HBarGroup
                buckets={infraCount}
                totals={t}
                sort="byTotal"
                hideEmpty
              />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="Größte Herausforderungen" meta="Top 10 nach Nennungen">
              <HBarGroup
                buckets={challengesCount}
                totals={t}
                sort="byTotal"
                limit={10}
                mode="absolute"
                hideEmpty
              />
            </Card>
            <div className="space-y-5">
              <Card title="Stand des Medienkonzepts" meta="Verteilung">
                <Donut
                  segments={[
                    { label: "Aktuell (< 2 J)", value: bucketTotal(mediaConceptDist, "Ja, aktuell (< 2 Jahre alt)"), color: "#16a34a" },
                    { label: "Veraltet", value: bucketTotal(mediaConceptDist, "Ja, aber veraltet"), color: "#E8A838" },
                    { label: "In Arbeit", value: bucketTotal(mediaConceptDist, "Nein, in Arbeit"), color: "#94a3b8" },
                    { label: "Nein", value: bucketTotal(mediaConceptDist, "Nein"), color: "#dc2626" },
                  ]}
                  centerLabel="Schulen"
                  centerValue={String(t.all)}
                />
              </Card>
              <Card title="Medienverantwortliche/r" meta="Verteilung">
                <Donut
                  segments={[
                    { label: "Mit Entlastung", value: bucketTotal(mediaResponsibleDist, "Ja, mit Entlastungsstunden"), color: "#16a34a" },
                    { label: "Ohne Entlastung", value: bucketTotal(mediaResponsibleDist, "Ja, ohne Entlastungsstunden"), color: "#E8A838" },
                    { label: "Niemand", value: bucketTotal(mediaResponsibleDist, "Nein"), color: "#dc2626" },
                  ]}
                />
              </Card>
            </div>
          </div>

          <Insight>
            <strong>Kernbefund:</strong> Endgeräte sind weitgehend vorhanden –
            der Engpass ist meistens Zeit, Wartung oder Support. Der oben
            sichtbare Top-10-Block der Herausforderungen ist die
            verlässlichste Grundlage für strukturelle Maßnahmen des Trägers.
          </Insight>

          {/* ════════ §3 TOOLS ════════ */}
          <SectionHeader
            id="tools"
            index="03"
            eyebrow="Im Einsatz"
            title="Bereits genutzte Tools"
            body="Welche Software wird im Unterricht bereits verwendet, wie häufig wird sie eingesetzt, und wie steht es um digitale Förderdiagnostik?"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="Top-Tools" meta="Sortiert nach Nennungen">
              <HBarGroup
                buckets={toolsCount}
                totals={t}
                sort="byTotal"
                limit={10}
                hideEmpty
              />
            </Card>
            <div className="space-y-5">
              <Card title="Nutzungshäufigkeit digitaler Medien">
                <HBarGroup
                  buckets={usageDist}
                  totals={t}
                  sort="given"
                  mode="absolute"
                />
              </Card>
              <Card title="Digitale Förderdiagnostik im Einsatz">
                <HBarGroup
                  buckets={diagCount}
                  totals={t}
                  sort="byTotal"
                  hideEmpty
                />
              </Card>
            </div>
          </div>

          {/* ════════ §4 KI-NUTZUNG ════════ */}
          <SectionHeader
            id="ki"
            index="04"
            eyebrow="Künstliche Intelligenz"
            title="KI-Nutzung & Bedenken"
            body="Wer nutzt KI bereits regelmäßig? Welche Tools? Und wo liegen die größten Hürden?"
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI
              label="Schulen mit KI-Nutzung"
              value={`${aiActiveTotal}/${t.all}`}
              sub={`${pct(aiActiveTotal, t.all)} aktiv`}
            />
            <KPI
              label="Stadt regelmäßig"
              value={`${aiRegularStadt}/${t.stadt}`}
              variant="stadt"
              sub="Mehrere LK regelmäßig"
            />
            <KPI
              label="Land regelmäßig"
              value={`${aiRegularLand}/${t.land}`}
              variant="land"
              sub="Mehrere LK regelmäßig"
            />
            <KPI
              label="Ø KI-Kompetenz"
              value={fmtAvg(avgAiComp.all)}
              sub={`Stadt ${fmtAvg(avgAiComp.stadt)} · Land ${fmtAvg(avgAiComp.land)}`}
              variant="warn"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="Genutzte KI-Tools" meta="Absolut · Top genutzt">
              <HBarGroup
                buckets={aiToolsCount}
                totals={t}
                sort="byTotal"
                mode="absolute"
                hideEmpty
              />
            </Card>
            <Card title="Wofür wird KI eingesetzt?" meta="Mehrfachnennungen">
              <HBarGroup
                buckets={aiPurposeCount}
                totals={t}
                sort="byTotal"
                mode="absolute"
                hideEmpty
              />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="Bedenken & Hürden beim KI-Einsatz" meta="Mehrfachnennungen">
              <HBarGroup
                buckets={aiConcernsCount}
                totals={t}
                sort="byTotal"
                mode="absolute"
                hideEmpty
              />
            </Card>
            <div className="space-y-5">
              <Card title="Bisherige KI-Fortbildungen">
                <HBarGroup
                  buckets={aiTrainingsCount}
                  totals={t}
                  sort="byTotal"
                  hideEmpty
                />
              </Card>
              <Insight>
                <strong>{aiTrainedNo} von {t.all}</strong> Schulen haben noch
                keine KI-Fortbildung besucht – aber das Interesse ist
                vorhanden: Die Option "Nein, kein Interesse" wird selten
                gewählt.
              </Insight>
            </div>
          </div>

          {/* ════════ §5 FORTBILDUNGSBEDARF ════════ */}
          <SectionHeader
            id="fortbildung"
            index="05"
            eyebrow="Bedarf"
            title="Fortbildung & Unterstützung"
            body="Welche Themen werden besonders nachgefragt – und in welchen Formaten und Zeitfenstern lassen sich Fortbildungen realistisch umsetzen?"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="Top-Themen für Fortbildungen" meta="Top 10">
              <HBarGroup
                buckets={trainingNeedsCount}
                totals={t}
                sort="byTotal"
                limit={10}
                hideEmpty
              />
            </Card>
            <div className="space-y-5">
              <Card title="Bevorzugte Formate">
                <HBarGroup
                  buckets={trainingFormatCount}
                  totals={t}
                  sort="byTotal"
                  mode="absolute"
                  hideEmpty
                />
              </Card>
              <Card title="Bevorzugte Zeiten">
                <HBarGroup
                  buckets={trainingTimesCount}
                  totals={t}
                  sort="byTotal"
                  mode="absolute"
                  hideEmpty
                />
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="Konkrete Unterstützungsbedarfe" meta="Mehrfachnennungen">
              <HBarGroup
                buckets={supportNeedsCount}
                totals={t}
                sort="byTotal"
                hideEmpty
              />
            </Card>
            <Card title="Gewünschte Software-Lizenzen" meta="Mehrfachnennungen">
              <HBarGroup
                buckets={licensesCount}
                totals={t}
                sort="byTotal"
                hideEmpty
              />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="Interesse Vorreiter-Schule" meta="Verteilung">
              <HBarGroup
                buckets={pioneerDist}
                totals={t}
                sort="given"
                mode="absolute"
              />
            </Card>
            <Card title="Hürden – relativer Anteil" meta="je Bezirk">
              <HBarGroup
                buckets={challengesCount}
                totals={t}
                sort="byTotal"
                limit={6}
                hideEmpty
              />
            </Card>
          </div>

          {/* ════════ §6 SCHLUSSFOLGERUNGEN ════════ */}
          <SectionHeader
            id="schluss"
            index="06"
            eyebrow="Synthese"
            title="Schlussfolgerungen für Träger"
            body="Differenzierte Handlungsfelder für Stadt und Landkreis – sowie Querschnittsthemen, die beide Träger gemeinsam bedienen sollten."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Pillar
              icon={<Building2 className="h-5 w-5" />}
              title="Stadt Osnabrück"
              accent="primary"
              count={t.stadt}
              points={[
                { strong: "Förderdiagnostik priorisieren", text: "Lizenzpaket für DaZ/LRS-Tools (Deutschfuchs, Meister Cody, Levumi) zentral beschaffen." },
                { strong: "KI-Kompetenz aufbauen", text: "Aktuell niedrigste Selbsteinschätzung – Einstieg mit niederschwelligen Erfolgserlebnissen." },
                { strong: "Studentische Hilfskräfte", text: "1:1-Begleitung über Kooperation mit Hochschule/Universität Osnabrück." },
                { strong: "Entlastungsstunden", text: "Für Medienverantwortliche strukturell verankern." },
                { strong: "Change Management", text: "Skepsis im Kollegium adressieren – nicht nur Tools, sondern Haltung." },
              ]}
            />
            <Pillar
              icon={<Trees className="h-5 w-5" />}
              title="Landkreis Osnabrück"
              accent="primary-light"
              count={t.land}
              points={[
                { strong: "Geräteausstattung aufstocken", text: "Beschaffungsplan für Schulen mit unter 20 Tablets." },
                { strong: "Wartung & technischer Support", text: "Update-Zyklen aus Lehrkräftezeit ausgliedern – externer Dienstleister." },
                { strong: "WLAN-Reichweite", text: "Punktuelle Lücken priorisiert schließen." },
                { strong: "Plattform-Heterogenität reduzieren", text: "IServ + MS365 + Schulserver parallel – klare Trägerempfehlung." },
                { strong: "Praxisnahe SchiLF", text: "KI-Grundlagen + Materialerstellung als Einstieg." },
                { strong: "Best-Practice-Pool", text: "Erfahrungen sammeln und für andere Schulen aufbereiten." },
              ]}
            />
          </div>

          <h3 className="text-xl font-bold text-primary tracking-tight mt-10 mb-5">
            Querschnittsthemen für beide Träger
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ConclCard
              variant="urgent"
              icon={<AlertTriangle className="h-4 w-4" />}
              title="Dringend nachbessern"
              points={[
                "Zeitressourcen – Zeitmangel ist in nahezu allen Schulen das Top-Hindernis.",
                "Datenschutzkonforme KI – DSGVO-konforme Alternativen müssen zentral lizenziert werden.",
                "Digitale Förderdiagnostik – Lücke zwischen Bedarf und Einsatz schließen.",
              ]}
            />
            <ConclCard
              variant="med"
              icon={<Activity className="h-4 w-4" />}
              title="Mittelfristig aufbauen"
              points={[
                "Medienkonzepte aktualisieren – viele sind veraltet oder noch nicht erstellt.",
                "Pilot-/Pionierschulen identifizieren – grundsätzlich offene Schulen als Multiplikatoren.",
                "Studentische Hilfskräfte – Win-win mit Uni/HS Osnabrück.",
              ]}
            />
            <ConclCard
              variant="opp"
              icon={<CheckCircle2 className="h-4 w-4" />}
              title="Quick Wins"
              points={[
                "Lizenz-Sammeleinkauf für KI-Assistenz und adaptive Lernplattformen.",
                "Praxisnahe SchiLF-Reihe „KI im Unterrichtsalltag“ – einfacher Einstieg.",
                "Best-Practice-Werkstatt mit den Schulen, die bereits Praxis haben.",
              ]}
            />
            <ConclCard
              variant="opp"
              icon={<Lightbulb className="h-4 w-4" />}
              title="Strategisch verzahnen"
              points={[
                "Gemeinsamer Digitalpakt zwischen Stadt & Landkreis – Skaleneffekte bei Lizenzen.",
                "Anbindung an HS/Uni Osnabrück (Lehramt) – Praktikum + technischer Support koppeln.",
                "Iterative Wellen statt großer Wurf: KI-Grundlagen → Förderdiagnostik → Tablet-Didaktik.",
              ]}
            />
          </div>

          {/* ════════ §7 CLAUDE-ABDECKUNG ════════ */}
          <SectionHeader
            id="claude"
            index="07"
            eyebrow="Mapping"
            title="Was Claude in den Kursen abdecken kann"
            body="Direkter Abgleich zwischen den Top-Bedarfen aus der Bestandsaufnahme und den Stärken eines allgemeinen Sprachmodells."
          />

          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b-2 border-primary/15 bg-bg/60">
                    <th className="text-left py-3 px-4 font-semibold text-primary text-[12px] uppercase tracking-wider">
                      Bedarf
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-primary text-[12px] uppercase tracking-wider">
                      Live-Quote
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-primary text-[12px] uppercase tracking-wider">
                      Mit Claude?
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-primary text-[12px] uppercase tracking-wider">
                      Konkrete Kursinhalte
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <ClaudeRow
                    bedarf="KI für Unterrichtsvorbereitung & Materialerstellung"
                    quote={countOf(trainingNeedsCount, "KI für Unterrichtsvorbereitung und Materialerstellung")}
                    total={t.all}
                    inhalt="Arbeitsblätter, Aufgabenformate, Differenzierungsstufen, Lernziele, Wochenpläne"
                  />
                  <ClaudeRow
                    bedarf="KI-Grundlagen & Einsatzmöglichkeiten"
                    quote={countOf(trainingNeedsCount, "KI-Grundlagen und Einsatzmöglichkeiten")}
                    total={t.all}
                    inhalt="LLM-Grundlagen, Prompting, sinnvolle Anwendungsfälle, Halluzinations-Erkennung"
                  />
                  <ClaudeRow
                    bedarf="Sprachförderung/DaZ mit digitalen Tools"
                    quote={countOf(trainingNeedsCount, "Sprachförderung/DaZ mit digitalen Tools")}
                    total={t.all}
                    inhalt="Texte vereinfachen, mehrsprachige Elternbriefe, DaZ-Materialien, Bildbeschreibungen"
                  />
                  <ClaudeRow
                    bedarf="Rechtssicherer KI-Einsatz (DSGVO, AI-Act)"
                    quote={countOf(trainingNeedsCount, "Rechtssicherer KI-Einsatz (DSGVO, AI-Act)")}
                    total={t.all}
                    inhalt="Welche Daten dürfen rein? Anonymisierung, Auftragsverarbeitung, AI-Act für Schulen"
                  />
                  <ClaudeRow
                    bedarf="Change Management / Digitale Schulentwicklung"
                    quote={countOf(trainingNeedsCount, "Change Management / Digitale Schulentwicklung")}
                    total={t.all}
                    inhalt="SchiLF-Konzepte, Kollegiumskommunikation, Etappenpläne, Stakeholder-Mapping"
                  />
                  <ClaudeRow
                    bedarf="Medienkonzeptentwicklung"
                    quote={countOf(trainingNeedsCount, "Medienkonzeptentwicklung")}
                    total={t.all}
                    inhalt="Strukturvorlagen, Bestandsaufnahme strukturieren, Maßnahmenkatalog"
                  />
                </tbody>
              </table>
            </div>
          </div>

          <Insight>
            <strong>Faustregel:</strong> Praktisch alle textbasierten
            KI-Use-Cases der Bestandsaufnahme lassen sich direkt mit Claude
            unterrichten. Die Quoten oben sind die <em>aktuellen</em>
            Nachfragezahlen aus der Datenbank – sie aktualisieren sich
            automatisch mit jeder neuen Einreichung.
          </Insight>

          {/* ════════ §8 LÜCKEN ════════ */}
          <SectionHeader
            id="luecken"
            index="08"
            eyebrow="Jenseits Claude"
            title="Verbleibende Lücken"
            body="Themen, die im Bedarf stehen, aber nicht oder nur teilweise mit einem allgemeinen KI-Sprachmodell zu lösen sind."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GapCard
              icon={<Sparkles className="h-4 w-4" />}
              title="Hardware- & Tool-Didaktik"
              variant="other"
              points={[
                "Tablets im Unterricht einsetzen – iPad-Klassenmanagement, Apple Classroom.",
                "Interaktive Displays effektiv nutzen – herstellerabhängig.",
                "Adaptive Lernplattformen (Anton, bettermarks, Matific).",
                "Robotik/Coding (Calliope, Bee-Bot, Scratch).",
              ]}
            />
            <GapCard
              icon={<GraduationCap className="h-4 w-4" />}
              title="Spezialisierte Fachtools"
              variant="other"
              points={[
                "Digitale Förderdiagnostik (Levumi, Quop, ELFE-Online).",
                "DaZ/LRS-Spezialprogramme (Deutschfuchs, Meister Cody).",
                "Leseförderung (Antolin Plus, Leseo, Onilo).",
              ]}
            />
            <GapCard
              icon={<AlertTriangle className="h-4 w-4" />}
              title="Infrastruktur & Strukturmaßnahmen (Schulträger)"
              variant="infra"
              points={[
                "Geräteausstattung aufstocken – Beschaffungsoffensive.",
                "WLAN-Ausbau in einzelnen Schulen.",
                "Plattform-Konsolidierung (IServ vs. MS365 vs. Schul-Cloud).",
                "Wartung & technischer Support – externer Dienstleister.",
                "Entlastungsstunden für Medienverantwortliche.",
                "Datenschutzkonforme KI-Lizenzen zentral beschaffen.",
              ]}
            />
            <GapCard
              icon={<Lightbulb className="h-4 w-4" />}
              title="Menschliche Begleitung & Vernetzung"
              variant="other"
              points={[
                "Studentische Hilfskräfte vor Ort – Kooperation HS/Uni.",
                "Individuelles Coaching – 1:1-Begleitung durch Mentor:innen.",
                "Best-Practice-Pool & Peer-Austausch.",
                "Skepsis im Kollegium abbauen – Change Management.",
              ]}
            />
          </div>

          <Insight>
            <strong>Fazit:</strong> Claude eignet sich hervorragend für die
            textbasierte KI-Schulungslinie. Daneben braucht es zwingend
            (a) hardware-/tool-spezifische Didaktik, (b) Spezial-Schulungen
            für Förderdiagnostik & DaZ, (c) strukturelle Maßnahmen des
            Schulträgers und (d) menschliche Begleitformate.
          </Insight>

          <p className="text-[11px] text-text-light text-center pt-8 border-t border-border">
            Datenbasis · {t.all} Schule{t.all === 1 ? "" : "n"} ·
            {" "}
            {t.stadt} Stadt Osnabrück · {t.land} Landkreis Osnabrück ·
            {duplicatesSkipped > 0 && (
              <>
                {" "}
                {duplicatesSkipped} Mehrfacheinreichung
                {duplicatesSkipped === 1 ? "" : "en"} zusammengefasst ·
              </>
            )}
            {" "}letzte Einreichung am{" "}
            {lastSubmission ? FMT_DATE.format(new Date(lastSubmission)) : "–"} ·
            {" "}automatisch generiert aus den eingereichten Fragebögen
          </p>
        </div>
      </main>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Helper Components
// ═══════════════════════════════════════════════════════════════════════

function HeroStat({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">
      <div className="flex items-center gap-1.5 text-white/70 text-[10px] font-bold uppercase tracking-[0.18em]">
        {icon}
        {label}
      </div>
      <p className={`mt-1 font-bold text-2xl tabular-nums leading-none ${accent ?? "text-white"}`}>
        {value}
        {sub && <span className="text-[12px] font-normal text-white/60 ml-1.5">{sub}</span>}
      </p>
    </div>
  );
}

function SectionHeader({
  id,
  index,
  eyebrow,
  title,
  body,
}: {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <header id={id} className="scroll-mt-20 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-10">
      <div className="flex md:flex-col items-baseline md:items-start gap-3 md:gap-2">
        <span
          aria-hidden="true"
          className="font-bold text-6xl md:text-7xl text-primary/15 leading-none tabular-nums tracking-tighter select-none"
        >
          {index}
        </span>
        <span className="hidden md:block w-10 h-0.5 bg-accent-strong" />
      </div>
      <div className="md:pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-strong mb-2">
          {eyebrow}
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2.5 leading-tight tracking-tight">
          {title}
        </h2>
        <p className="text-[15px] text-text-light max-w-3xl leading-relaxed">
          {body}
        </p>
      </div>
    </header>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-md bg-bg px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-[0.1em] text-text-light">
        {label}
      </p>
      <p className={`font-mono font-bold text-sm tabular-nums ${accent ?? "text-text"}`}>
        {value}
      </p>
    </div>
  );
}

function Pillar({
  icon,
  title,
  accent,
  count,
  points,
}: {
  icon: React.ReactNode;
  title: string;
  accent: "primary" | "primary-light";
  count: number;
  points: { strong: string; text: string }[];
}) {
  const accentClass = accent === "primary" ? "text-primary" : "text-primary-light";
  const borderClass = accent === "primary" ? "border-t-primary" : "border-t-primary-light";
  return (
    <div className={`rounded-xl bg-white border border-border border-t-4 ${borderClass} shadow-sm p-6`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={accentClass}>{icon}</span>
        <h3 className={`text-lg font-bold ${accentClass}`}>{title}</h3>
        <span className="ml-auto font-mono text-[11px] tabular-nums text-text-light">
          n = {count}
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {points.map((p) => (
          <li key={p.strong} className="text-[13.5px] leading-relaxed">
            <strong className="text-text font-semibold">{p.strong}</strong>{" "}
            <span className="text-text-light">– {p.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConclCard({
  variant,
  icon,
  title,
  points,
}: {
  variant: "urgent" | "med" | "opp";
  icon: React.ReactNode;
  title: string;
  points: string[];
}) {
  const map = {
    urgent: "border-l-red-500 [&_h4]:text-red-700",
    med: "border-l-accent-strong [&_h4]:text-accent-strong",
    opp: "border-l-emerald-500 [&_h4]:text-emerald-700",
  };
  return (
    <div className={`rounded-xl bg-white border border-border border-l-4 ${map[variant]} p-5 shadow-sm`}>
      <h4 className="flex items-center gap-2 text-[14px] font-bold mb-2.5">
        {icon}
        {title}
      </h4>
      <ul className="space-y-1.5">
        {points.map((p) => (
          <li key={p} className="text-[13px] text-text-light leading-relaxed">
            • {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GapCard({
  icon,
  title,
  variant,
  points,
}: {
  icon: React.ReactNode;
  title: string;
  variant: "other" | "infra";
  points: string[];
}) {
  const badge =
    variant === "infra"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-accent/10 text-accent-strong border-accent/30";
  const badgeText =
    variant === "infra" ? "Politisch / strukturell" : "Andere Anbieter / Begleitung";
  return (
    <div className="rounded-xl bg-white border border-border shadow-sm p-5">
      <h4 className="flex items-center gap-2 text-[15px] font-bold text-primary mb-2">
        {icon}
        {title}
      </h4>
      <span
        className={`inline-block text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border ${badge} mb-3`}
      >
        {badgeText}
      </span>
      <ul className="space-y-1.5 mt-1">
        {points.map((p) => (
          <li key={p} className="text-[13px] text-text-light leading-relaxed">
            • {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ClaudeRow({
  bedarf,
  quote,
  total,
  inhalt,
}: {
  bedarf: string;
  quote: number;
  total: number;
  inhalt: string;
}) {
  const pctVal = total > 0 ? Math.round((quote / total) * 100) : 0;
  return (
    <tr className="border-b border-border/60 last:border-b-0 hover:bg-bg/40 transition-colors">
      <td className="py-3 px-4 text-text font-medium">{bedarf}</td>
      <td className="py-3 px-4 text-text-light tabular-nums whitespace-nowrap">
        {quote} / {total}{" "}
        <span className="text-text-light/60">({pctVal} %)</span>
      </td>
      <td className="py-3 px-4">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-semibold">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          Voll
        </span>
      </td>
      <td className="py-3 px-4 text-text-light text-[12.5px] leading-relaxed">
        {inhalt}
      </td>
    </tr>
  );
}

function EmptyState({ profile }: { profile: Awaited<ReturnType<typeof getCurrentProfile>> }) {
  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <BackButton
            fallbackHref="/best-practice/admin/bestandsaufnahme"
            fallbackLabel="Zurück zur Übersicht"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors mb-4"
          />
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Auswertung Bestandsaufnahme
              </h1>
              <p className="text-white/80 mt-2">
                Live-Auswertung der eingegangenen Fragebögen.
              </p>
              <AdminNav />
            </div>
            <AuthStatus initialProfile={profile} />
          </div>
        </div>
      </section>
      <section className="py-16">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <div className="rounded-2xl border-2 border-dashed border-border bg-white p-10">
            <Database className="h-10 w-10 text-text-light mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-bold text-primary mb-2">
              Noch keine Daten vorhanden
            </h2>
            <p className="text-text-light leading-relaxed mb-6">
              Sobald die ersten Schulen den Fragebogen eingereicht haben,
              erscheinen hier alle Auswertungen automatisch und in Echtzeit.
            </p>
            <Link
              href="/bestandsaufnahme"
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Fragebogen ansehen
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function pct(part: number, total: number): string {
  if (total === 0) return "–";
  return `${Math.round((part / total) * 100)} %`;
}

function fmtAvg(v: number | null): string {
  if (v === null) return "–";
  return v.toFixed(1);
}

function bucketTotal(
  buckets: { option: string; total: number }[],
  option: string
): number {
  return buckets.find((b) => b.option === option)?.total ?? 0;
}

function countOf(
  buckets: { option: string; total: number }[],
  option: string
): number {
  return buckets.find((b) => b.option === option)?.total ?? 0;
}
