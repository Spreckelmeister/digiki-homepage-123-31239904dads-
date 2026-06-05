/**
 * Erzeugt einen ausführlichen, KI-freundlichen Markdown-Bericht aus den
 * aggregierten Bestandsaufnahme-Daten. Saubere Hierarchie, klare Tabellen
 * und absolute Zahlen – damit ein LLM die Daten ohne Kontextverlust
 * weiterverarbeiten kann.
 */
import type { Bucket, Totals, Average } from "./aggregations";

export interface ReportData {
  generatedAt: Date;
  lastSubmission: Date | null;
  totals: Totals;
  duplicatesSkipped: number;
  averages: {
    wlan: Average;
    support: Average;
    digitization: Average;
    aiCompetence: Average;
  };
  ratings: {
    digitization: Bucket[];
    support: Bucket[];
  };
  multi: {
    devices: Bucket[];
    infrastructure: Bucket[];
    challenges: Bucket[];
    tools: Bucket[];
    diagnostics: Bucket[];
    aiPurposes: Bucket[];
    aiTools: Bucket[];
    aiConcerns: Bucket[];
    aiTrainings: Bucket[];
    trainingNeeds: Bucket[];
    trainingFormat: Bucket[];
    trainingTimes: Bucket[];
    supportNeeds: Bucket[];
    licenses: Bucket[];
  };
  single: {
    usageFrequency: Bucket[];
    mediaConcept: Bucket[];
    mediaResponsible: Bucket[];
    aiUsage: Bucket[];
    pioneerInterest: Bucket[];
  };
}

const FMT_DATETIME = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const FMT_DATE_ISO = new Intl.DateTimeFormat("sv-SE", {
  // sv-SE liefert YYYY-MM-DD HH:mm – ideal für maschinelle Verarbeitung.
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function pct(part: number, total: number): string {
  if (total <= 0) return "–";
  return `${Math.round((part / total) * 100)} %`;
}

function fmtAvg(v: number | null): string {
  return v === null ? "–" : v.toFixed(1);
}

/** Sortiert eine Bucket-Liste absteigend nach Gesamtzahl und filtert
 *  leere Optionen, sofern `dropEmpty` true ist. */
function prepare(
  buckets: Bucket[],
  opts: { dropEmpty?: boolean; limit?: number; sort?: boolean } = {},
): Bucket[] {
  let out = [...buckets];
  if (opts.sort !== false) out.sort((a, b) => b.total - a.total);
  if (opts.dropEmpty) out = out.filter((b) => b.total > 0);
  if (opts.limit !== undefined) out = out.slice(0, opts.limit);
  return out;
}

function table(
  buckets: Bucket[],
  totals: Totals,
  optionHeader: string,
): string {
  if (buckets.length === 0) return "_(keine Daten)_\n";
  const lines = [
    `| ${optionHeader} | Stadt | Land | Gesamt | Anteil |`,
    `|---|---:|---:|---:|---:|`,
  ];
  for (const b of buckets) {
    const share = totals.all > 0 ? `${Math.round((b.total / totals.all) * 100)} %` : "–";
    // Pipes in Optionen escapen, damit die Tabelle nicht zerbricht.
    const opt = b.option.replace(/\|/g, "\\|");
    lines.push(`| ${opt} | ${b.stadt} | ${b.land} | ${b.total} | ${share} |`);
  }
  return lines.join("\n") + "\n";
}

function ratingTable(buckets: Bucket[], totals: Totals): string {
  const lines = [
    `| Stufe | Stadt | Land | Gesamt | Anteil |`,
    `|---:|---:|---:|---:|---:|`,
  ];
  for (const b of buckets) {
    const share = totals.all > 0 ? `${Math.round((b.total / totals.all) * 100)} %` : "–";
    lines.push(`| ${b.option} | ${b.stadt} | ${b.land} | ${b.total} | ${share} |`);
  }
  return lines.join("\n") + "\n";
}

export function generateMarkdownReport(d: ReportData): string {
  const { totals: t, averages: avg, ratings, multi, single } = d;

  const noDigDiag =
    multi.diagnostics.find((b) => b.option === "Nein, keine digitale Diagnostik")
      ?.total ?? 0;
  const aiActive = single.aiUsage
    .filter(
      (b) =>
        b.option.startsWith("Ja, mehrere") || b.option.startsWith("Ja, einzelne"),
    )
    .reduce((s, b) => s + b.total, 0);
  const aiTrainedYes = multi.aiTrainings
    .filter((b) => b.option.startsWith("Ja"))
    .reduce((s, b) => s + b.total, 0);
  const aiTrainedNo = t.all - aiTrainedYes;
  const aiRegularStadt =
    single.aiUsage.find((b) => b.option.startsWith("Ja, mehrere"))?.stadt ?? 0;
  const aiRegularLand =
    single.aiUsage.find((b) => b.option.startsWith("Ja, mehrere"))?.land ?? 0;

  const header = `# Bestandsaufnahme — Auswertung DigiKI Osnabrück

> **KI-freundliches Format.** Dieser Bericht ist als Markdown strukturiert und
> kann ohne Vorverarbeitung an ein Sprachmodell übergeben werden. Tabellen
> enthalten absolute Zahlen für Stadt/Land/Gesamt und prozentuale Anteile.

| Metadatum | Wert |
|---|---|
| **Generiert am** | ${FMT_DATE_ISO.format(d.generatedAt)} |
| **Letzte Einreichung** | ${d.lastSubmission ? FMT_DATE_ISO.format(d.lastSubmission) : "–"} |
| **Schulen gesamt** | ${t.all} |
| **Stadt Osnabrück** | ${t.stadt} |
| **Landkreis Osnabrück** | ${t.land} |
| **Übersprungene Mehrfacheinreichungen** | ${d.duplicatesSkipped} |
| **Gefilterte Test-/Admin-Einträge** | wurden bei Abfrage exkludiert |
`;

  const overview = `
## §1 Überblick & zentrale Kennzahlen

- **Antworten gesamt:** ${t.all} (Stadt ${t.stadt}, Land ${t.land})
- **Ø Selbsteinschätzung Digitalisierungsgrad:** ${fmtAvg(avg.digitization.all)} / 5 (Stadt ${fmtAvg(avg.digitization.stadt)}, Land ${fmtAvg(avg.digitization.land)})
- **Ø WLAN-Bewertung:** ${fmtAvg(avg.wlan.all)} / 5 (Stadt ${fmtAvg(avg.wlan.stadt)}, Land ${fmtAvg(avg.wlan.land)})
- **Ø Technischer Support:** ${fmtAvg(avg.support.all)} / 5 (Stadt ${fmtAvg(avg.support.stadt)}, Land ${fmtAvg(avg.support.land)})
- **Ø KI-Kompetenz im Kollegium:** ${fmtAvg(avg.aiCompetence.all)} / 5 (Stadt ${fmtAvg(avg.aiCompetence.stadt)}, Land ${fmtAvg(avg.aiCompetence.land)})
- **Ohne KI-Fortbildung:** ${aiTrainedNo} / ${t.all} (${pct(aiTrainedNo, t.all)})
- **Ohne digitale Förderdiagnostik:** ${noDigDiag} / ${t.all} (${pct(noDigDiag, t.all)})

### Verteilung Digitalisierungsgrad (1–5)

${ratingTable(ratings.digitization, t)}

### Verteilung Tech-Support (1–5)

${ratingTable(ratings.support, t)}
`;

  const infrastructure = `
## §2 Infrastruktur

### Verfügbare Endgeräte

${table(prepare(multi.devices, { dropEmpty: true }), t, "Gerät")}

### Genutzte Plattformen / Infrastruktur

${table(prepare(multi.infrastructure, { dropEmpty: true }), t, "Plattform")}

### Größte Herausforderungen (Top 10)

${table(prepare(multi.challenges, { dropEmpty: true, limit: 10 }), t, "Herausforderung")}

### Medienkonzept-Stand

${table(prepare(single.mediaConcept, { sort: false }), t, "Status")}

### Medienverantwortliche/r

${table(prepare(single.mediaResponsible, { sort: false }), t, "Status")}
`;

  const tools = `
## §3 Tools im Einsatz

### Top-Tools (nach Nennungen)

${table(prepare(multi.tools, { dropEmpty: true, limit: 15 }), t, "Tool")}

### Nutzungshäufigkeit digitaler Medien

${table(prepare(single.usageFrequency, { sort: false }), t, "Häufigkeit")}

### Digitale Förderdiagnostik

${table(prepare(multi.diagnostics, { dropEmpty: true }), t, "Diagnostik-Tool")}
`;

  const ai = `
## §4 KI-Nutzung

- **Schulen mit KI-Nutzung (mind. einzelne Lehrkräfte):** ${aiActive} / ${t.all} (${pct(aiActive, t.all)})
- **Stadt – Mehrere LK nutzen regelmäßig KI:** ${aiRegularStadt} / ${t.stadt} (${pct(aiRegularStadt, t.stadt)})
- **Land – Mehrere LK nutzen regelmäßig KI:** ${aiRegularLand} / ${t.land} (${pct(aiRegularLand, t.land)})

### Verteilung KI-Nutzung

${table(prepare(single.aiUsage, { sort: false }), t, "KI-Nutzungsstatus")}

### Genutzte KI-Tools

${table(prepare(multi.aiTools, { dropEmpty: true }), t, "KI-Tool")}

### Wofür wird KI eingesetzt?

${table(prepare(multi.aiPurposes, { dropEmpty: true }), t, "Einsatzzweck")}

### Bedenken & Hürden beim KI-Einsatz

${table(prepare(multi.aiConcerns, { dropEmpty: true }), t, "Bedenken")}

### Bisherige KI-Fortbildungen

${table(prepare(multi.aiTrainings, { dropEmpty: true }), t, "Fortbildung")}
`;

  const training = `
## §5 Fortbildungs- und Unterstützungsbedarf

### Top-Themen für Fortbildungen (Top 10)

${table(prepare(multi.trainingNeeds, { dropEmpty: true, limit: 10 }), t, "Thema")}

### Bevorzugte Fortbildungsformate

${table(prepare(multi.trainingFormat, { dropEmpty: true }), t, "Format")}

### Bevorzugte Zeitfenster

${table(prepare(multi.trainingTimes, { dropEmpty: true }), t, "Zeit")}

### Konkrete Unterstützungsbedarfe

${table(prepare(multi.supportNeeds, { dropEmpty: true }), t, "Unterstützung")}

### Gewünschte Software-Lizenzen

${table(prepare(multi.licenses, { dropEmpty: true }), t, "Lizenz")}

### Interesse Vorreiter-Schule

${table(prepare(single.pioneerInterest, { sort: false }), t, "Interesse")}
`;

  const synthesis = `
## §6 Schlussfolgerungen (datenbasiert)

### Stadt Osnabrück (n = ${t.stadt})
- Förderdiagnostik gezielt aufbauen: Aktuell ohne digitale Diagnostik: ${noDigDiag} / ${t.all}
- KI-Kompetenz heben: Ø ${fmtAvg(avg.aiCompetence.stadt)} / 5
- Studentische Hilfskräfte über Kooperation HS/Uni Osnabrück
- Entlastungsstunden für Medienverantwortliche strukturell verankern

### Landkreis Osnabrück (n = ${t.land})
- Geräteausstattung & Wartung – Schulen mit dürftiger Hardware identifizieren
- WLAN-Reichweite: Ø ${fmtAvg(avg.wlan.land)} / 5
- Plattform-Heterogenität reduzieren (klare Trägerempfehlung)
- Praxisnahe SchiLF: KI-Grundlagen + Materialerstellung als Einstieg

### Querschnittsthemen (Stadt + Land)
- **Dringend:** Zeitressourcen, datenschutzkonforme KI-Lizenzen, digitale Diagnostik
- **Mittelfristig:** Medienkonzepte aktualisieren, Pilot-Schulen als Multiplikatoren
- **Quick Wins:** Lizenz-Sammeleinkauf, SchiLF-Reihe „KI im Unterrichtsalltag", Best-Practice-Werkstatt
- **Strategisch:** Gemeinsamer Digitalpakt Stadt × Landkreis, Anbindung HS/Uni Osnabrück
`;

  const claude = `
## §7 Claude-Abdeckung

Direkter Abgleich Top-Bedarfe ↔ Sprachmodell-Stärken (alle Quoten bezogen auf
n = ${t.all} Schulen):

| Bedarf | Nennungen | Anteil | Mit Claude? | Kursinhalte |
|---|---:|---:|---|---|
${[
  ["KI für Unterrichtsvorbereitung und Materialerstellung", "Arbeitsblätter, Aufgabenformate, Differenzierungsstufen, Lernziele, Wochenpläne"],
  ["KI-Grundlagen und Einsatzmöglichkeiten", "LLM-Grundlagen, Prompting, sinnvolle Anwendungsfälle, Halluzinations-Erkennung"],
  ["Sprachförderung/DaZ mit digitalen Tools", "Texte vereinfachen, mehrsprachige Elternbriefe, DaZ-Materialien, Bildbeschreibungen"],
  ["Rechtssicherer KI-Einsatz (DSGVO, AI-Act)", "Welche Daten dürfen rein? Anonymisierung, Auftragsverarbeitung, AI-Act für Schulen"],
  ["Change Management / Digitale Schulentwicklung", "SchiLF-Konzepte, Kollegiumskommunikation, Etappenpläne, Stakeholder-Mapping"],
  ["Medienkonzeptentwicklung", "Strukturvorlagen, Bestandsaufnahme strukturieren, Maßnahmenkatalog"],
]
  .map(([bedarf, inhalt]) => {
    const count =
      multi.trainingNeeds.find((b) => b.option === bedarf)?.total ?? 0;
    return `| ${bedarf} | ${count} | ${pct(count, t.all)} | Voll | ${inhalt} |`;
  })
  .join("\n")}
`;

  const gaps = `
## §8 Verbleibende Lücken (nicht / nur teilweise mit Claude)

**Hardware- & Tool-Didaktik** — Tablets im Unterricht, Klassenmanagement (Apple Classroom), interaktive Displays, adaptive Lernplattformen (Anton, bettermarks, Matific), Robotik/Coding (Calliope, Bee-Bot, Scratch).

**Spezialisierte Fachtools** — digitale Förderdiagnostik (Levumi, Quop, ELFE-Online), DaZ/LRS-Spezialprogramme (Deutschfuchs, Meister Cody), Leseförderung (Antolin Plus, Leseo, Onilo).

**Infrastruktur & Strukturmaßnahmen (Schulträger)** — Geräteausstattung, WLAN-Ausbau, Plattform-Konsolidierung (IServ vs. MS365 vs. Schul-Cloud), externer Wartungs-Dienstleister, Entlastungsstunden, zentral lizenzierte DSGVO-konforme KI.

**Menschliche Begleitung & Vernetzung** — studentische Hilfskräfte vor Ort (Kooperation HS/Uni), 1:1-Coaching, Best-Practice-Pool, Change-Management für Kollegium.

---
_Erzeugt am ${FMT_DATETIME.format(d.generatedAt)} aus den eingereichten Fragebögen. Mehrfacheinreichungen derselben Schule werden automatisch zusammengefasst – nur die jüngste Einreichung wird berücksichtigt._
`;

  return [
    header,
    overview,
    infrastructure,
    tools,
    ai,
    training,
    synthesis,
    claude,
    gaps,
  ].join("\n");
}
