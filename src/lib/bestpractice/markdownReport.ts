/**
 * Markdown-Generatoren für Best-Practice-Beiträge.
 * KI-freundliches Format: klare Hierarchie, tabellarische Metadaten,
 * Vorlage-Daten strukturiert ausgegeben.
 */

import type { BestPractice, VorlageData } from "@/lib/types";

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

const PUBLICATION_CONSENT_LABEL: Record<string, string> = {
  ja_alles: "Ja, alles darf veröffentlicht werden",
  ja_anonym: "Ja, anonymisiert veröffentlichbar",
  nein: "Nein, nur intern",
};

function val(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "_keine Angabe_";
  return String(v);
}

function rating(v: number | null | undefined): string {
  if (v === null || v === undefined) return "_keine Angabe_";
  return `${v} / 5`;
}

function freeText(v: string | null | undefined): string {
  if (!v || !v.trim()) return "_keine Angabe_";
  return v
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function listJoin(values: string[] | null | undefined): string {
  if (!values || values.length === 0) return "_keine_";
  return values.join(", ");
}

function vorlageSection(v: VorlageData): string {
  return `
## Strukturierte Vorlage

- **Ort:** ${val(v.location)}
- **Datum:** ${v.date ? FMT_DATE_LONG.format(new Date(v.date)) : "_keine Angabe_"}
- **Zeitraum:** ${val(v.timeframe)}

### Ausgangslage
${freeText(v.ausgangslage)}

### Ziel
${freeText(v.ziel)}

### Vorbereitung
${freeText(v.vorbereitung)}

### Ablauf
${freeText(v.ablauf)}

### Erfahrungen — was gut lief
${freeText(v.erfahrungen_positiv)}

### Erfahrungen — was schwierig war
${freeText(v.erfahrungen_negativ)}

### Verbesserungsideen
${freeText(v.verbesserungen)}

### Bewertungen
- **Umsetzbarkeit:** ${rating(v.rating_implementation)}
- **Schüler:innen-Reaktion:** ${rating(v.rating_student_adaptation)}
- **Empfehlung an andere:** ${rating(v.rating_recommendation)}

### Tipps für andere
${freeText(v.tipps)}

### Links & Ressourcen
${freeText(v.links)}

### Veröffentlichungs-Einwilligung
${PUBLICATION_CONSENT_LABEL[v.publication_consent] ?? val(v.publication_consent)}
`;
}

// ════════ Einzelner Beitrag ══════════════════════════════════════════════

export function generateBestPracticeMarkdown(p: BestPractice): string {
  const categories =
    p.best_practice_categories
      ?.map((c) => c.categories?.name)
      .filter((n): n is string => Boolean(n))
      .join(", ") || "_keine_";

  const authorName = p.profiles?.full_name || val(p.contact_person);

  return `# Best Practice — ${val(p.title)}

| Metadatum | Wert |
|---|---|
| **Schule** | ${val(p.school_name)} |
| **Fach** | ${val(p.subject)} |
| **Klassenstufe** | ${val(p.grade_level)} |
| **Kategorien** | ${categories} |
| **Status** | ${p.published ? "Veröffentlicht" : "Entwurf"} |
| **Eingereicht** | ${FMT_DATE_ISO.format(new Date(p.created_at))} |
| **Zuletzt bearbeitet** | ${FMT_DATE_ISO.format(new Date(p.updated_at))} |
| **Beitrags-ID** | \`${p.id}\` |
| **Autor:in** | ${authorName} |
| **Kontakt-E-Mail** | ${val(p.contact_email)} |

## Eingesetzte Tools

${listJoin(p.tools_used)}

## Zusammenfassung

${freeText(p.summary)}

## Inhalt

${p.content && p.content.trim() ? p.content : "_kein Inhalt vorhanden_"}

${p.vorlage_data ? vorlageSection(p.vorlage_data) : ""}
---
_Eingereicht ${FMT_DATE_ISO.format(new Date(p.created_at))}, zuletzt bearbeitet ${FMT_DATE_ISO.format(new Date(p.updated_at))}._
`;
}

// ════════ Sammel-Export ══════════════════════════════════════════════════

export function generateAllBestPracticesMarkdown(params: {
  generatedAt: Date;
  practices: BestPractice[];
  isFiltered: boolean;
}): string {
  const { generatedAt, practices, isFiltered } = params;

  const publishedCount = practices.filter((p) => p.published).length;
  const draftCount = practices.length - publishedCount;
  const withVorlage = practices.filter((p) => p.vorlage_data).length;

  const header = `# Best Practices — Sammel-Export${isFiltered ? " (gefiltert)" : ""}

> **KI-freundliches Format.** Dieser Sammel-Bericht enthält alle${isFiltered ? " durch die aktuelle Filterung sichtbaren" : ""} Best-Practice-Beiträge inkl. Vorlagen-Daten.

| Metadatum | Wert |
|---|---|
| **Generiert am** | ${FMT_DATE_ISO.format(generatedAt)} |
| **Beiträge gesamt** | ${practices.length} |
| **Veröffentlicht** | ${publishedCount} |
| **Entwürfe** | ${draftCount} |
| **Aus Vorlage** | ${withVorlage} |

---
`;

  const blocks = practices.map((p) => generateBestPracticeMarkdown(p));
  return header + blocks.join("\n---\n");
}
