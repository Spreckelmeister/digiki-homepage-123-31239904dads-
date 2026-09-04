/**
 * Markdown-Generatoren für Anträge (Stud. Hilfskräfte + Tool-Lizenzen).
 * KI-freundliches Format: klare Hierarchie, tabellarische Metadaten,
 * Freitexte als Blockquotes.
 */

import type {
  ApplicationStudentAssistant,
  ApplicationToolLicense,
} from "@/lib/types";
import {
  labelFor,
  TRAINING_PARTICIPATION_OPTIONS,
  SUPPORT_AREA_OPTIONS,
  SCOPE_PRESET_OPTIONS,
} from "@/lib/applications/hilfskraefteOptions";

const FMT_DATE_ISO = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const FMT_DATE_LONG = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const STATUS_LABEL: Record<string, string> = {
  neu: "Neu",
  in_bearbeitung: "In Bearbeitung",
  genehmigt: "Genehmigt",
  abgelehnt: "Abgelehnt",
};

function val(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "_keine Angabe_";
  return String(v);
}

function bool(v: boolean | null | undefined): string {
  if (v === true) return "Ja";
  if (v === false) return "Nein";
  return "_keine Angabe_";
}

function freeText(v: string | null | undefined): string {
  if (!v || !v.trim()) return "_keine Angabe_";
  return v
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

// ════════ Stud. Hilfskräfte ══════════════════════════════════════════════

export function generateHilfskraefteMarkdown(
  r: ApplicationStudentAssistant,
): string {
  // Neues Antragsmodell (punktuelle Unterstützung, Migration 030) trägt
  // immer scope_preset; Alt-Anträge behalten ihre bisherigen Abschnitte.
  const isNewShape = Boolean(r.scope_preset || r.support_area);

  const supportItems: string[] = [];
  if (r.support_technical_setup) supportItems.push("Technische Einrichtung");
  if (r.support_onboarding) supportItems.push("Onboarding der Lehrkräfte");
  if (r.support_tech_support) supportItems.push("Laufender Tech-Support");
  if (r.support_material_creation) supportItems.push("Materialerstellung");
  if (r.support_classroom) supportItems.push("Begleitung im Unterricht");
  if (r.support_other) supportItems.push("Sonstiges");

  const voraussetzungenBlock =
    r.training_participation || r.internal_attempt
      ? `## Voraussetzungen

- **Schulungsteilnahme:** ${labelFor(TRAINING_PARTICIPATION_OPTIONS, r.training_participation) ?? val(r.training_participation)}
- **Angemeldete Schulungen (bei Antragstellung):** ${val(r.training_details)}

**Schulintern bereits versucht**
${freeText(r.internal_attempt)}

`
      : "";

  const anliegenBlock = r.support_area
    ? `## Konkrete Hürde

- **Bereich:** ${labelFor(SUPPORT_AREA_OPTIONS, r.support_area) ?? val(r.support_area)}

**Beschreibung**
${freeText(r.support_explanation)}

`
    : `## Gewünschte Unterstützung

${
  supportItems.length > 0
    ? supportItems.map((s) => `- ${s}`).join("\n")
    : "_keine Auswahl_"
}
${
  r.support_explanation
    ? `\n**Konkretisierung**\n${freeText(r.support_explanation)}\n`
    : ""
}
`;

  const rahmenBlock = isNewShape
    ? r.scope_preset || r.start_date
      ? `## Rahmen

- **Gewünschter Umfang:** ${labelFor(SCOPE_PRESET_OPTIONS, r.scope_preset) ?? val(r.scope_preset)}
- **Frühester Wunschtermin:** ${r.start_date ? FMT_DATE_LONG.format(new Date(r.start_date)) : "_keine Angabe_"}

`
      : `## Rahmen

- Umfang und Termin werden direkt in einer Videokonferenz mit der Schule geklärt (im Antrag bewusst nicht mehr erhoben).

`
    : `## Rahmen

- **Wunsch-Startdatum:** ${r.start_date ? FMT_DATE_LONG.format(new Date(r.start_date)) : "_keine Angabe_"}
- **Dauer:** ${val(r.duration)}
- **Stunden pro Woche:** ${val(r.hours_per_week)}
- **Bevorzugte Tage:** ${val(r.preferred_days)}

`;

  const infraBlock = isNewShape
    ? ""
    : `## Technische Voraussetzungen vor Ort

- **WLAN vorhanden:** ${bool(r.has_wifi)}
- **Endgeräte vorhanden:** ${bool(r.has_devices)}${r.device_count !== null ? ` (${r.device_count} Stück)` : ""}
- **Interaktive Displays:** ${bool(r.has_interactive_displays)}
- **Schulserver:** ${bool(r.has_school_server)}

`;

  return `# Antrag — Stud. Hilfskräfte: ${val(r.school_name)}

| Metadatum | Wert |
|---|---|
| **Antragstyp** | Studentische Hilfskräfte${isNewShape ? " (punktuelle Unterstützung)" : ""} |
| **Eingereicht** | ${FMT_DATE_ISO.format(new Date(r.created_at))} |
| **Antrags-ID** | \`${r.id}\` |
| **Status (intern)** | ${STATUS_LABEL[r.status] ?? r.status} |

## Schule

- **Name:** ${val(r.school_name)}
- **Adresse:** ${val(r.school_street)}, ${val(r.school_plz)} ${val(r.school_city)}
- **Schulleitung:** ${val(r.principal_name)}
- **Lehrkräfte (Anzahl):** ${val(r.teacher_count)}
- **Schüler/innen (Anzahl):** ${val(r.student_count)}

## Ansprechpartner:in

- **Name:** ${val(r.contact_person)}
- **E-Mail:** ${val(r.email)}
- **Telefon:** ${val(r.phone)}

${voraussetzungenBlock}${anliegenBlock}${rahmenBlock}${infraBlock}${r.admin_notes ? `## Interne Admin-Notizen\n${freeText(r.admin_notes)}\n\n` : ""}---
_Eingereicht am ${FMT_DATE_ISO.format(new Date(r.created_at))}._
`;
}

// ════════ Tool-Lizenzen ══════════════════════════════════════════════════

export function generateToolLizenzenMarkdown(
  r: ApplicationToolLicense,
): string {
  const toolBlocks = r.tool_selections
    .filter((s) => s.tools.length > 0)
    .map(
      (s) =>
        `### ${s.category}\n\n` +
        (s.tools.length === 0
          ? "_keine Auswahl_"
          : "| Tool | Lizenzen |\n|---|---:|\n" +
            s.tools
              .map((t) => `| ${t.name} | ${t.license_count} |`)
              .join("\n")),
    )
    .join("\n\n");

  const totalLicenses = r.tool_selections.reduce(
    (sum, s) => sum + s.tools.reduce((t, x) => t + x.license_count, 0),
    0,
  );

  return `# Antrag — Tool-Lizenzen: ${val(r.school_name)}

| Metadatum | Wert |
|---|---|
| **Antragstyp** | Tool-Lizenzen |
| **Eingereicht** | ${FMT_DATE_ISO.format(new Date(r.created_at))} |
| **Antrags-ID** | \`${r.id}\` |
| **Status (intern)** | ${STATUS_LABEL[r.status] ?? r.status} |
| **Lizenzen gesamt** | ${totalLicenses} |

## Schule

- **Name:** ${val(r.school_name)}
- **Adresse:** ${val(r.school_street)}, ${val(r.school_plz)} ${val(r.school_city)}
- **Schulleitung:** ${val(r.principal_name)}
- **Lehrkräfte (Anzahl):** ${val(r.teacher_count)}
- **Schüler/innen (Anzahl):** ${val(r.student_count)}

## Ansprechpartner:in

- **Name:** ${val(r.contact_person)}
- **E-Mail:** ${val(r.email)}
- **Telefon:** ${val(r.phone)}

## Schulung

- **Schulungsteilnahme:** ${labelFor(TRAINING_PARTICIPATION_OPTIONS, r.training_participation) ?? val(r.training_participation)}
${r.training_details ? `- **Anmeldungen bei Antragstellung:** ${r.training_details}` : ""}

## Beantragte Tools

${toolBlocks || "_keine Auswahl_"}

${
  r.additional_tools
    ? `\n**Sonstige gewünschte Tools**\n${freeText(r.additional_tools)}\n`
    : ""
}

## Einsatz

- **Klassenstufen:** ${val(r.grade_levels)}
- **Fächer:** ${val(r.subjects)}
- **Wunsch-Startdatum:** ${r.start_date ? FMT_DATE_LONG.format(new Date(r.start_date)) : "_keine Angabe_"}

${
  r.usage_description
    ? `\n**Geplanter Einsatz**\n${freeText(r.usage_description)}\n`
    : ""
}

## Voraussetzungen & Erklärungen

- **Datenschutzkonzept vorhanden:** ${bool(r.privacy_concept_exists)}
- **Elternliche Einwilligung eingeholt:** ${bool(r.parental_consent)}
- **IT-Infrastruktur erfüllt Anforderungen:** ${bool(r.it_infrastructure_meets_requirements)}

${r.admin_notes ? `\n## Interne Admin-Notizen\n${freeText(r.admin_notes)}\n` : ""}
---
_Eingereicht am ${FMT_DATE_ISO.format(new Date(r.created_at))}._
`;
}

// ════════ Sammel-Export ══════════════════════════════════════════════════

export type CombinedApplication =
  | ({ type: "hilfskraefte" } & ApplicationStudentAssistant)
  | ({ type: "tool-lizenzen" } & ApplicationToolLicense);

export function generateAllApplicationsMarkdown(params: {
  generatedAt: Date;
  applications: CombinedApplication[];
  isFiltered: boolean;
}): string {
  const { generatedAt, applications, isFiltered } = params;

  const counts = {
    hilfskraefte: applications.filter((a) => a.type === "hilfskraefte").length,
    toolLizenzen: applications.filter((a) => a.type === "tool-lizenzen").length,
    neu: applications.filter((a) => a.status === "neu").length,
    inBearbeitung: applications.filter((a) => a.status === "in_bearbeitung").length,
    genehmigt: applications.filter((a) => a.status === "genehmigt").length,
    abgelehnt: applications.filter((a) => a.status === "abgelehnt").length,
  };

  const header = `# Anträge — Sammel-Export${isFiltered ? " (gefiltert)" : ""}

> **KI-freundliches Format.** Dieser Sammel-Bericht enthält die
> vollständigen Daten aller${isFiltered ? " durch die aktuelle Filterung sichtbaren" : ""} Anträge.

| Metadatum | Wert |
|---|---|
| **Generiert am** | ${FMT_DATE_ISO.format(generatedAt)} |
| **Anträge gesamt** | ${applications.length} |
| **Stud. Hilfskräfte** | ${counts.hilfskraefte} |
| **Tool-Lizenzen** | ${counts.toolLizenzen} |
| **Status „Neu"** | ${counts.neu} |
| **Status „In Bearbeitung"** | ${counts.inBearbeitung} |
| **Status „Genehmigt"** | ${counts.genehmigt} |
| **Status „Abgelehnt"** | ${counts.abgelehnt} |

---
`;

  const blocks = applications.map((a) => {
    if (a.type === "hilfskraefte") {
      return generateHilfskraefteMarkdown(a);
    }
    return generateToolLizenzenMarkdown(a);
  });

  return header + blocks.join("\n---\n");
}
