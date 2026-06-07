/**
 * Erzeugt KI-freundliche Markdown-Berichte aus den Bestandsaufnahme-Daten.
 * Drei Varianten:
 *  - aggregierter Dashboard-Bericht (generateMarkdownReport)
 *  - einzelne Schule mit allen Antworten (generateSingleBestandsaufnahmeMarkdown)
 *  - Sammel-Bericht aller Schulen (generateAllBestandsaufnahmenMarkdown)
 *
 * Saubere Hierarchie, klare Tabellen, absolute Zahlen – damit ein LLM
 * die Daten ohne Kontextverlust weiterverarbeiten kann.
 */
import type {
  Bucket,
  Totals,
  Average,
  BestandsaufnahmeRow,
} from "./aggregations";

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

// ═══════════════════════════════════════════════════════════════════════
// Einzelne Bestandsaufnahme: ALLE Antworten einer Schule als Markdown
// ═══════════════════════════════════════════════════════════════════════

function listOrDash(values: string[] | null | undefined, other?: string | null): string {
  const arr = [...(values ?? []), ...(other ? [`Sonstiges: ${other}`] : [])];
  if (arr.length === 0) return "_keine Angabe_";
  return arr.map((v) => `- ${v}`).join("\n");
}

function valOrDash(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "_keine Angabe_";
  return String(v);
}

function rating(v: number | null | undefined): string {
  if (v === null || v === undefined) return "_keine Angabe_";
  return `${v} / 5`;
}

function freeText(v: string | null | undefined): string {
  if (!v || !v.trim()) return "_keine Angabe_";
  // In einem Blockquote, damit Mehrzeilentexte sich klar abheben.
  return v
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

export function generateSingleBestandsaufnahmeMarkdown(
  r: BestandsaufnahmeRow,
  opts: { allVersions?: BestandsaufnahmeRow[]; index?: number } = {},
): string {
  const title = r.school_name ?? "(ohne Schulnamen)";
  const submittedAt = FMT_DATE_ISO.format(new Date(r.created_at));

  const versionsBlock =
    opts.allVersions && opts.allVersions.length > 1
      ? `
> **Hinweis:** Diese Schule hat **${opts.allVersions.length} Bestandsaufnahmen** eingereicht.
> Die hier gezeigten Antworten stammen vom ${submittedAt} (Einreichung-ID \`${r.id}\`).
> Weitere Versionen: ${opts.allVersions
          .filter((v) => v.id !== r.id)
          .map((v) => FMT_DATE_ISO.format(new Date(v.created_at)))
          .join(", ")}.
`
      : "";

  return `# Bestandsaufnahme — ${title}

| Metadatum | Wert |
|---|---|
| **Einreichung** | ${submittedAt} |
| **Einreichung-ID** | \`${r.id}\` |
| **Status (intern)** | ${valOrDash(r.status)} |
| **Schul-Standort** | ${valOrDash(r.school_location)} |
| **Ausfüllende Person** | ${valOrDash(r.contact_person)} |
| **Funktion** | ${r.respondent_role === "Sonstiges" && r.respondent_role_other ? `Sonstiges: ${r.respondent_role_other}` : valOrDash(r.respondent_role)} |
| **Schulleitung** | ${valOrDash(r.principal_name)} |
| **Kontakt** | ${valOrDash(r.contact_email)}${r.contact_phone ? ` · ${r.contact_phone}` : ""} |
${versionsBlock}
## Teil A — Allgemeine Angaben

- **Name der Schule:** ${valOrDash(r.school_name)}
- **Standort:** ${valOrDash(r.school_location)}
- **Anzahl Schüler/innen:** ${valOrDash(r.student_count)}
- **Anzahl Lehrkräfte:** ${valOrDash(r.teacher_count)}
- **Startchancen-Schule:** ${valOrDash(r.is_startchancen_school)}
- **DaZ-Anteil:** ${valOrDash(r.daz_share)}

## Teil B — Technische Ausstattung

**Verfügbare Endgeräte**
${listOrDash(r.devices, r.devices_other)}

- **Tablets / iPads (Anzahl):** ${valOrDash(r.tablet_count)}
- **WLAN-Bewertung:** ${rating(r.wlan_rating)}
- **Zufriedenheit Tech-Support:** ${rating(r.support_satisfaction)}

**Digitale Infrastruktur**
${listOrDash(r.infrastructure, r.infrastructure_other)}

**Herausforderungen**
${listOrDash(r.challenges, r.challenges_other)}

## Teil C — Aktueller Stand der Digitalisierung

- **Digitalisierungsgrad (Selbsteinschätzung):** ${rating(r.digitization_level)}
- **Nutzungshäufigkeit digitaler Medien:** ${valOrDash(r.usage_frequency)}
- **Medienkonzept:** ${valOrDash(r.media_concept)}
- **Medienverantwortliche/r:** ${valOrDash(r.media_responsible)}

**Digitale Tools im Einsatz**
${listOrDash(r.tools_used, r.tools_used_other)}

**Digitale Förderdiagnostik**
${listOrDash(r.diagnostic_tools, r.diagnostic_tools_other)}

## Teil D — Künstliche Intelligenz

- **KI-Nutzung im Kollegium:** ${valOrDash(r.ai_usage)}
- **KI-Kompetenzniveau:** ${rating(r.ai_competence)}

**KI wofür genutzt**
${listOrDash(r.ai_purposes, r.ai_purposes_other)}

**Konkrete KI-Tools**
${listOrDash(r.ai_tools_used, r.ai_tools_other)}

**Bedenken gegenüber KI**
${listOrDash(r.ai_concerns, r.ai_concerns_other)}

**Bisherige KI-Fortbildungen**
${listOrDash(r.ai_trainings, r.ai_trainings_other)}

## Teil E — Fortbildungsbedarf

**Top-Themen (max. 5)**
${listOrDash(r.training_needs, r.training_needs_other)}

**Bevorzugte Formate**
${listOrDash(r.training_format)}

**Geeignete Zeiten**
${listOrDash(r.training_times)}

- **Erwartete Teilnehmerzahl:** ${valOrDash(r.participation_count)}
- **Interesse Vorreiter-Schule:** ${valOrDash(r.pioneer_interest)}

## Teil F — Best Practices

- **Gelungene Beispiele vorhanden:** ${valOrDash(r.has_best_practice)}
- **Bereitschaft zur Weitergabe:** ${valOrDash(r.share_practice)}

**Beschreibung**
${freeText(r.best_practice_description)}

## Teil G — Unterstützungsbedarf

**Gewünschte Unterstützung (max. 3)**
${listOrDash(r.support_needs)}

**Gewünschte Software-Lizenzen**
${listOrDash(r.software_licenses, r.software_licenses_other)}

- **Studentische Unterstützung:** ${valOrDash(r.student_support)}
- **Zeit für Tools:** ${valOrDash(r.time_for_tools)}

## Teil H — Offene Rückmeldung

**Wünsche an das Projekt DigiKI**
${freeText(r.project_wishes)}

**Weitere Anmerkungen**
${freeText(r.additional_notes)}

${r.admin_notes ? `\n## Interne Admin-Notizen\n${freeText(r.admin_notes)}\n` : ""}
---
_Eingereicht ${submittedAt}${opts.index !== undefined ? ` · Schule ${opts.index + 1}` : ""}._
`;
}

// ═══════════════════════════════════════════════════════════════════════
// Alle Bestandsaufnahmen als Sammel-Markdown – jede Schule mit Vollexport
// ═══════════════════════════════════════════════════════════════════════

export function generateAllBestandsaufnahmenMarkdown(params: {
  generatedAt: Date;
  uniqueSchools: BestandsaufnahmeRow[];
  duplicatesByKey: Map<string, BestandsaufnahmeRow[]>;
}): string {
  const { generatedAt, uniqueSchools, duplicatesByKey } = params;
  const totalSubmissions = Array.from(duplicatesByKey.values()).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );

  const stadt = uniqueSchools.filter((s) => s.school_location === "Stadt Osnabrück").length;
  const land = uniqueSchools.filter((s) => s.school_location === "Landkreis Osnabrück").length;

  const header = `# Bestandsaufnahmen — Sammel-Export (alle Schulen)

> **KI-freundliches Format.** Dieser Sammel-Bericht enthält die vollständigen
> Antworten ALLER teilnehmenden Schulen. Mehrfacheinreichungen derselben
> Schule sind als Versionen gruppiert – pro Schule erscheint jeweils die
> jüngste Antwort als Hauptblock, ältere Versionen werden nur referenziert.

| Metadatum | Wert |
|---|---|
| **Generiert am** | ${FMT_DATE_ISO.format(generatedAt)} |
| **Schulen gesamt (eindeutig)** | ${uniqueSchools.length} |
| **Stadt Osnabrück** | ${stadt} |
| **Landkreis Osnabrück** | ${land} |
| **Eingegangene Einreichungen** | ${totalSubmissions} |
| **Mehrfacheinreichungen** | ${totalSubmissions - uniqueSchools.length} |

---
`;

  const schoolBlocks = uniqueSchools.map((row, i) => {
    const key = (row.school_name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    const allVersions = duplicatesByKey.get(key) ?? [row];
    return generateSingleBestandsaufnahmeMarkdown(row, {
      allVersions,
      index: i,
    });
  });

  return header + schoolBlocks.join("\n---\n");
}
