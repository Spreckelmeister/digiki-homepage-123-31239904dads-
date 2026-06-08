"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileText,
  Hash,
  Pencil,
  Save,
  Send,
  Sparkles,
  Tag,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { BestPractice, Category } from "@/lib/types";

interface BestPracticeFormProps {
  initialData?: BestPractice;
}

const TITLE_MAX = 120;
const SUMMARY_MAX = 320;

// ════════ UI-Helfer ══════════════════════════════════════════════════════

function FormSection({
  index,
  eyebrow,
  title,
  body,
  icon,
  children,
}: {
  index: string;
  eyebrow: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
      <header className="grid grid-cols-1 gap-6 md:grid-cols-[auto_1fr] md:gap-8">
        <div className="flex items-baseline gap-3 md:flex-col md:items-start md:gap-2">
          <span
            aria-hidden="true"
            className="select-none font-mono text-5xl font-bold leading-none tracking-tighter text-primary/15 tabular-nums md:text-6xl"
          >
            {index}
          </span>
          <span className="hidden h-0.5 w-8 bg-accent-strong md:block" />
        </div>
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.22em] text-accent-strong">
            <span aria-hidden="true">{icon}</span>
            {eyebrow}
          </p>
          <h2 className="mt-1.5 text-xl font-bold leading-tight tracking-tight text-primary md:text-2xl">
            {title}
          </h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-light">
            {body}
          </p>
        </div>
      </header>
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-[auto_1fr] md:gap-8">
        {/* Linke Spalte als Spacer für Section-Number-Alignment */}
        <span aria-hidden="true" className="hidden md:block md:w-[60px]" />
        <div className="space-y-5">{children}</div>
      </div>
    </section>
  );
}

function FieldLabel({
  htmlFor,
  children,
  hint,
  counter,
}: {
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
  counter?: string;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-text">
        {children}
        {hint && (
          <span className="ml-2 text-[11px] font-normal text-text-light">
            {hint}
          </span>
        )}
      </label>
      {counter && (
        <span className="text-[11px] font-mono tabular-nums text-text-light">
          {counter}
        </span>
      )}
    </div>
  );
}

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-white px-4 py-3 text-sm outline-none transition-all focus:border-accent-strong focus:ring-2 focus:ring-accent-strong placeholder:text-text-light/55";

// ════════ Haupt-Component ════════════════════════════════════════════════

export default function BestPracticeForm({
  initialData,
}: BestPracticeFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [title, setTitle] = useState(initialData?.title || "");
  const [schoolName, setSchoolName] = useState(initialData?.school_name || "");
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [gradeLevel, setGradeLevel] = useState(
    initialData?.grade_level || "1-4",
  );
  const [toolsUsed, setToolsUsed] = useState(
    initialData?.tools_used?.join(", ") || "",
  );
  const [summary, setSummary] = useState(initialData?.summary || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialData?.best_practice_categories?.map((bpc) => bpc.categories.id) ||
      [],
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [submittingMode, setSubmittingMode] = useState<
    null | "draft" | "publish"
  >(null);

  useEffect(() => {
    async function loadCategories() {
      const supabase = createClient();
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (data) setCategories(data);
    }
    loadCategories();
  }, []);

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  const currentlyPublished = initialData?.published ?? false;

  async function submit(publish: boolean) {
    setError("");
    setSubmittingMode(publish ? "publish" : "draft");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Nicht angemeldet.");
      setSubmittingMode(null);
      return;
    }

    const tools = toolsUsed
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const practiceData = {
      title,
      school_name: schoolName,
      subject,
      grade_level: gradeLevel,
      tools_used: tools,
      summary,
      content,
      published: publish,
      author_id: user.id,
    };

    let practiceId: string;

    if (isEditing && initialData) {
      const { error: updateError } = await supabase
        .from("best_practices")
        .update(practiceData)
        .eq("id", initialData.id);

      if (updateError) {
        setError("Fehler beim Speichern: " + updateError.message);
        setSubmittingMode(null);
        return;
      }
      practiceId = initialData.id;
      await supabase
        .from("best_practice_categories")
        .delete()
        .eq("best_practice_id", practiceId);
    } else {
      const { data: newPractice, error: insertError } = await supabase
        .from("best_practices")
        .insert(practiceData)
        .select("id")
        .single();

      if (insertError || !newPractice) {
        setError(
          "Fehler beim Erstellen: " + (insertError?.message || "Unbekannt"),
        );
        setSubmittingMode(null);
        return;
      }
      practiceId = newPractice.id;
    }

    if (selectedCategories.length > 0) {
      await supabase.from("best_practice_categories").insert(
        selectedCategories.map((catId) => ({
          best_practice_id: practiceId,
          category_id: catId,
        })),
      );
    }

    router.push("/best-practice/admin");
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent) {
    // Default-Submit (Enter im Titel etc.) speichert als Entwurf
    e.preventDefault();
    if (submittingMode) return;
    submit(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm"
        >
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="font-bold">Speichern nicht möglich</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ════════ §1 STECKBRIEF ════════ */}
      <FormSection
        index="01"
        eyebrow="Steckbrief"
        title="Worum geht es?"
        body="Ein klarer Titel und die Schule, an der das Beispiel umgesetzt wurde – damit andere Lehrkräfte den Kontext sofort einordnen können."
        icon={<Sparkles className="h-3 w-3" />}
      >
        <div>
          <FieldLabel
            htmlFor="title"
            counter={`${title.length} / ${TITLE_MAX}`}
          >
            Titel
          </FieldLabel>
          <input
            id="title"
            type="text"
            required
            maxLength={TITLE_MAX}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={INPUT_CLASS}
            placeholder="z.B. KI-gestützte Leseförderung in Klasse 2"
          />
        </div>

        <div>
          <FieldLabel htmlFor="schoolName">Schule</FieldLabel>
          <input
            id="schoolName"
            type="text"
            required
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className={INPUT_CLASS}
            placeholder="Grundschule Beispielstadt"
          />
        </div>
      </FormSection>

      {/* ════════ §2 EINORDNUNG ════════ */}
      <FormSection
        index="02"
        eyebrow="Einordnung"
        title="Wo passt es hin?"
        body="Fach, Klassenstufe, eingesetzte Tools und Kategorien helfen anderen Schulen, Ihr Beispiel zu finden, wenn sie nach etwas Bestimmtem suchen."
        icon={<Tag className="h-3 w-3" />}
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="subject">Fach</FieldLabel>
            <input
              id="subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={INPUT_CLASS}
              placeholder="Deutsch, Mathematik, Sachunterricht …"
            />
          </div>
          <div>
            <FieldLabel htmlFor="gradeLevel">Klassenstufe</FieldLabel>
            <div className="flex gap-1.5 rounded-lg border border-border bg-bg p-1">
              {[
                { value: "1-2", label: "1–2" },
                { value: "3-4", label: "3–4" },
                { value: "1-4", label: "alle" },
              ].map((g) => {
                const active = gradeLevel === g.value;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGradeLevel(g.value)}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-all ${
                      active
                        ? "bg-white text-primary shadow-sm"
                        : "text-text-light hover:text-primary"
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <FieldLabel
            htmlFor="toolsUsed"
            hint="kommagetrennt – z.B. Anton, ChatGPT, Fiete"
          >
            Eingesetzte Tools
          </FieldLabel>
          <input
            id="toolsUsed"
            type="text"
            value={toolsUsed}
            onChange={(e) => setToolsUsed(e.target.value)}
            className={INPUT_CLASS}
            placeholder="Anton, ChatGPT, Fiete"
          />
        </div>

        <div>
          <FieldLabel htmlFor="categories">
            Kategorien
            {selectedCategories.length > 0 && (
              <span className="ml-2 inline-flex rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary">
                {selectedCategories.length} ausgewählt
              </span>
            )}
          </FieldLabel>
          <div id="categories" className="flex flex-wrap gap-2">
            {categories.length === 0 ? (
              <p className="text-xs text-text-light">
                Kategorien werden geladen …
              </p>
            ) : (
              categories.map((cat) => {
                const active = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    aria-pressed={active}
                    className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
                      active
                        ? "border-primary bg-primary text-white shadow-sm"
                        : "border-border bg-white text-text-light hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    {active && (
                      <CheckCircle2
                        className="h-3 w-3 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    {cat.name}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </FormSection>

      {/* ════════ §3 INHALT ════════ */}
      <FormSection
        index="03"
        eyebrow="Inhalt"
        title="Was ist passiert?"
        body="Eine Kurzbeschreibung für den Vorschau-Karten-Text plus den ausführlichen Bericht. Markdown wird im Volltext gerendert – kurze Absätze und Überschriften machen den Text scanbar."
        icon={<FileText className="h-3 w-3" />}
      >
        <div>
          <FieldLabel
            htmlFor="summary"
            counter={`${summary.length} / ${SUMMARY_MAX}`}
            hint="erscheint in der Vorschau-Karte"
          >
            Kurzbeschreibung
          </FieldLabel>
          <textarea
            id="summary"
            required
            rows={3}
            maxLength={SUMMARY_MAX}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className={`${INPUT_CLASS} resize-y`}
            placeholder="Zwei, drei Sätze zur Übersicht – worum geht es, was ist das Ergebnis?"
          />
        </div>

        <div>
          <FieldLabel
            htmlFor="content"
            hint="Markdown wird unterstützt"
          >
            Ausführlicher Bericht
          </FieldLabel>
          {/* Markdown-Spickzettel direkt überm Editor */}
          <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-t-lg border border-b-0 border-border bg-bg px-3 py-1.5 text-[11px] text-text-light">
            <Hash className="h-3 w-3" aria-hidden="true" />
            <code className="font-mono">## Überschrift</code>
            <span className="text-text-light/40">·</span>
            <code className="font-mono">**fett**</code>
            <span className="text-text-light/40">·</span>
            <code className="font-mono">*kursiv*</code>
            <span className="text-text-light/40">·</span>
            <code className="font-mono">- Liste</code>
            <span className="text-text-light/40">·</span>
            <code className="font-mono">[Link](url)</code>
          </div>
          <textarea
            id="content"
            required
            rows={18}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`${INPUT_CLASS} min-h-[360px] resize-y rounded-t-none font-mono text-[12.5px] leading-relaxed`}
            placeholder={`## Ausgangslage\nIn unserer 2. Klasse hatten wir das Problem, dass …\n\n## Ablauf\n1. …\n2. …\n\n## Was hat funktioniert\n- …`}
          />
        </div>
      </FormSection>

      {/* ════════ §4 SICHTBARKEIT ════════ */}
      <FormSection
        index="04"
        eyebrow="Sichtbarkeit"
        title="Wie soll's weitergehen?"
        body="Entwürfe bleiben nur für das Admin-Team sichtbar. Veröffentlichte Beiträge erscheinen sofort in der öffentlichen Best-Practice-Datenbank für alle Lehrkräfte."
        icon={<Eye className="h-3 w-3" />}
      >
        {isEditing && (
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-1.5 text-[12px] text-text-light">
            <span
              aria-hidden="true"
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                currentlyPublished ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            Aktueller Status:{" "}
            <strong
              className={
                currentlyPublished ? "text-emerald-700" : "text-amber-700"
              }
            >
              {currentlyPublished ? "Veröffentlicht" : "Entwurf"}
            </strong>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          {/* Entwurf-Pfad: Outline */}
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={submittingMode !== null}
            className="group inline-flex items-center justify-center gap-2 rounded-lg border-2 border-primary/30 bg-white px-5 py-3 text-sm font-bold text-primary transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/5 hover:shadow-sm disabled:cursor-wait disabled:opacity-50"
          >
            <Save
              className={`h-4 w-4 ${submittingMode === "draft" ? "animate-pulse" : ""}`}
              aria-hidden="true"
            />
            {submittingMode === "draft"
              ? "Wird gespeichert …"
              : isEditing && !currentlyPublished
                ? "Entwurf aktualisieren"
                : isEditing && currentlyPublished
                  ? "Als Entwurf zurücknehmen"
                  : "Als Entwurf speichern"}
          </button>

          {/* Veröffentlichen-Pfad: Accent-Gold, Hauptaktion */}
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={submittingMode !== null}
            className="group inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-bold text-text shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-md disabled:cursor-wait disabled:opacity-50"
          >
            <Send
              className={`h-4 w-4 ${
                submittingMode === "publish"
                  ? "animate-pulse"
                  : "transition-transform group-hover:translate-x-0.5"
              }`}
              aria-hidden="true"
            />
            {submittingMode === "publish"
              ? "Wird veröffentlicht …"
              : isEditing && currentlyPublished
                ? "Änderungen veröffentlichen"
                : "Veröffentlichen"}
          </button>

          <span className="flex-1" />

          {/* Abbrechen rechts, dezent */}
          <button
            type="button"
            onClick={() => router.push("/best-practice/admin")}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-3 text-sm font-medium text-text-light transition-colors hover:bg-bg hover:text-primary"
          >
            Abbrechen
          </button>
        </div>

        {!isEditing && (
          <p className="flex items-start gap-2 pt-1 text-[11.5px] leading-relaxed text-text-light">
            <Pencil className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            Sie können einen veröffentlichten Beitrag später jederzeit
            bearbeiten oder wieder in den Entwurfs-Status zurücknehmen.
          </p>
        )}
      </FormSection>
    </form>
  );
}
