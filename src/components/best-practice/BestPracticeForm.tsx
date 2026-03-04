"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { BestPractice, Category } from "@/lib/types";

interface BestPracticeFormProps {
  initialData?: BestPractice;
}

export default function BestPracticeForm({
  initialData,
}: BestPracticeFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [title, setTitle] = useState(initialData?.title || "");
  const [schoolName, setSchoolName] = useState(
    initialData?.school_name || ""
  );
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [gradeLevel, setGradeLevel] = useState(
    initialData?.grade_level || "1-4"
  );
  const [toolsUsed, setToolsUsed] = useState(
    initialData?.tools_used?.join(", ") || ""
  );
  const [summary, setSummary] = useState(initialData?.summary || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [published, setPublished] = useState(
    initialData?.published ?? false
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialData?.best_practice_categories?.map(
      (bpc) => bpc.categories.id
    ) || []
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Nicht angemeldet.");
      setLoading(false);
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
      published,
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
        setLoading(false);
        return;
      }
      practiceId = initialData.id;

      // Remove old category links
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
          "Fehler beim Erstellen: " + (insertError?.message || "Unbekannt")
        );
        setLoading(false);
        return;
      }
      practiceId = newPractice.id;
    }

    // Insert category links
    if (selectedCategories.length > 0) {
      await supabase.from("best_practice_categories").insert(
        selectedCategories.map((catId) => ({
          best_practice_id: practiceId,
          category_id: catId,
        }))
      );
    }

    router.push("/best-practice/admin");
    router.refresh();
  }

  const inputClass =
    "w-full rounded-lg border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-text mb-1.5">
          Titel
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="z.B. KI-gestützte Leseförderung in Klasse 2"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="schoolName" className="block text-sm font-medium text-text mb-1.5">
            Schule
          </label>
          <input
            id="schoolName"
            type="text"
            required
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className={inputClass}
            placeholder="Grundschule Beispielstadt"
          />
        </div>
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-text mb-1.5">
            Fach
          </label>
          <input
            id="subject"
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputClass}
            placeholder="z.B. Deutsch, Mathematik, Sachunterricht"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="gradeLevel" className="block text-sm font-medium text-text mb-1.5">
            Klassenstufe
          </label>
          <select
            id="gradeLevel"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className={inputClass + " bg-white"}
          >
            <option value="1-2">Klasse 1-2</option>
            <option value="3-4">Klasse 3-4</option>
            <option value="1-4">Klasse 1-4</option>
          </select>
        </div>
        <div>
          <label htmlFor="toolsUsed" className="block text-sm font-medium text-text mb-1.5">
            Eingesetzte Tools (kommagetrennt)
          </label>
          <input
            id="toolsUsed"
            type="text"
            value={toolsUsed}
            onChange={(e) => setToolsUsed(e.target.value)}
            className={inputClass}
            placeholder="z.B. Anton, ChatGPT, Fiete"
          />
        </div>
      </div>

      {/* Categories */}
      <div>
        <p className="block text-sm font-medium text-text mb-2">Kategorien</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggleCategory(cat.id)}
              className={`inline-flex px-3 py-1.5 rounded-full text-sm transition-colors ${
                selectedCategories.includes(cat.id)
                  ? "bg-primary text-white"
                  : "bg-bg text-text-light border border-border hover:border-primary"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-text mb-1.5">
          Kurzbeschreibung
        </label>
        <textarea
          id="summary"
          required
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className={inputClass + " resize-y"}
          placeholder="Kurze Zusammenfassung des Best-Practice-Beispiels (2-3 Sätze)"
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-text mb-1.5">
          Inhalt (Markdown wird unterstützt)
        </label>
        <textarea
          id="content"
          required
          rows={15}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={inputClass + " resize-y min-h-[300px] font-mono text-xs"}
          placeholder="Ausführliche Beschreibung des Best-Practice-Beispiels. Markdown wird unterstützt: **fett**, *kursiv*, ## Überschriften, - Listen"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="published"
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
        />
        <label htmlFor="published" className="text-sm font-medium text-text">
          Veröffentlicht (sichtbar für Lehrkräfte)
        </label>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" aria-hidden="true" />
          {loading
            ? "Wird gespeichert..."
            : isEditing
            ? "Änderungen speichern"
            : "Beitrag erstellen"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/best-practice/admin")}
          className="inline-flex items-center rounded-lg border border-border px-6 py-3 text-lg font-medium text-text-light hover:bg-bg transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
