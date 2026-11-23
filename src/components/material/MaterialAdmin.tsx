"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  KIND_LABEL,
  MATERIAL_ACCEPT,
  MATERIAL_BUCKET,
  formatSize,
  kindFromMime,
  mimeOfFile,
  type MaterialItem,
} from "@/lib/material/shared";

/**
 * Admin › Schulungsmaterial: einzelne Dateien hochladen, ansehen und
 * freischalten. Neu hochgeladenes Material ist zunächst ein Entwurf –
 * Schulen sehen es erst nach „Freischalten".
 */
export default function MaterialAdmin({ items }: { items: MaterialItem[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!file || !title.trim()) {
      setError("Bitte Titel und Datei angeben.");
      return;
    }
    const mimeType = mimeOfFile(file.name, file.type);
    if (!kindFromMime(mimeType)) {
      setError(
        "Dieser Dateityp lässt sich nicht im Browser ansehen. Möglich sind HTML-Dateien, Video (MP4, WebM), Audio, PDF und Bilder – Präsentationen bitte als PDF speichern."
      );
      return;
    }

    setUploading(true);
    let createdId: string | null = null;
    try {
      const res = await fetch("/api/admin/schulungsmaterial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          fileName: file.name,
          mimeType,
          size: file.size,
        }),
      });
      const payload = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (!res.ok) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "Anlegen fehlgeschlagen."
        );
      }
      createdId = payload.id as string;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(MATERIAL_BUCKET)
        .uploadToSignedUrl(payload.path as string, payload.token as string, file, {
          contentType: mimeType,
        });
      if (uploadError) {
        throw new Error(
          `Der Upload ist fehlgeschlagen (${uploadError.message}). Bei sehr großen Dateien bitte das Größenlimit im Supabase-Projekt prüfen.`
        );
      }

      const { error: doneError } = await supabase
        .from("schulungsmaterial")
        .update({ uploaded: true })
        .eq("id", createdId);
      if (doneError) throw new Error("Der Upload konnte nicht abgeschlossen werden.");

      setTitle("");
      setDescription("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setInfo("Hochgeladen. Bitte ansehen und anschließend freischalten.");
      router.refresh();
    } catch (err) {
      // Halbfertigen Eintrag wieder entfernen.
      if (createdId) {
        await fetch(`/api/admin/schulungsmaterial/${createdId}`, {
          method: "DELETE",
        }).catch(() => undefined);
      }
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function setPublished(item: MaterialItem, published: boolean) {
    setBusyId(item.id);
    setError("");
    setInfo("");
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("schulungsmaterial")
      .update({
        published,
        published_at: published ? new Date().toISOString() : null,
      })
      .eq("id", item.id);
    setBusyId(null);
    if (updateError) {
      setError("Die Änderung konnte nicht gespeichert werden.");
      return;
    }
    router.refresh();
  }

  async function saveOrder(item: MaterialItem, value: string) {
    const sortOrder = Number.parseInt(value, 10);
    if (!Number.isFinite(sortOrder) || sortOrder === item.sort_order) return;
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("schulungsmaterial")
      .update({ sort_order: sortOrder })
      .eq("id", item.id);
    if (updateError) {
      setError("Die Reihenfolge konnte nicht gespeichert werden.");
      return;
    }
    router.refresh();
  }

  async function remove(item: MaterialItem) {
    if (
      !window.confirm(
        `„${item.title}“ endgültig löschen? Die Datei wird dabei ebenfalls gelöscht.`
      )
    ) {
      return;
    }
    setBusyId(item.id);
    setError("");
    setInfo("");
    const res = await fetch(`/api/admin/schulungsmaterial/${item.id}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (!res.ok) {
      setError("Das Material konnte nicht gelöscht werden.");
      return;
    }
    router.refresh();
  }

  const inputClass =
    "w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors";

  return (
    <div className="space-y-8">
      {/* Upload */}
      <form
        onSubmit={handleUpload}
        className="rounded-xl border border-border bg-white p-6 shadow-sm space-y-4"
      >
        <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
          <Upload className="w-5 h-5" aria-hidden="true" />
          Material hochladen
        </h2>
        <div>
          <label htmlFor="material-title" className="block text-sm font-medium text-text mb-1.5">
            Titel
          </label>
          <input
            id="material-title"
            type="text"
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="material-description" className="block text-sm font-medium text-text mb-1.5">
            Beschreibung (optional)
          </label>
          <textarea
            id="material-description"
            rows={3}
            maxLength={4000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="material-file" className="block text-sm font-medium text-text mb-1.5">
            Datei
          </label>
          <input
            id="material-file"
            ref={fileRef}
            type="file"
            accept={MATERIAL_ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            aria-describedby="material-file-hint"
            className="block w-full text-sm text-text file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary"
          />
          <p id="material-file-hint" className="mt-1.5 text-xs text-text-light">
            HTML-Datei, Video (MP4, WebM), Audio, PDF oder Bild. Eine
            HTML-Datei muss alles enthalten, was sie braucht (Skripte, Stile
            und Bilder eingebettet) – sie darf aus Sicherheitsgründen nichts
            aus dem Internet nachladen. Das Material wird Schulen
            nur zur Ansicht gezeigt, nicht zum Download – Präsentationen
            deshalb bitte als PDF speichern.
            {file && <> Gewählt: {file.name} ({formatSize(file.size)}).</>}
          </p>
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-text hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <Upload className="w-4 h-4" aria-hidden="true" />
          {uploading ? "Wird hochgeladen – bitte Seite offen lassen …" : "Hochladen (als Entwurf)"}
        </button>
      </form>

      {info && (
        <p role="status" className="text-sm text-green-700">
          {info}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Liste */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Schulungsmaterial</caption>
          <thead className="bg-bg text-left text-text-light">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Reihenfolge</th>
              <th scope="col" className="px-4 py-3 font-medium">Titel</th>
              <th scope="col" className="px-4 py-3 font-medium">Art</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-text-light">
                  Noch kein Material hochgeladen.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    defaultValue={item.sort_order}
                    aria-label={`Reihenfolge für ${item.title}`}
                    onBlur={(e) => saveOrder(item, e.target.value)}
                    className="w-20 rounded-lg border border-border px-2 py-1.5 text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-text">{item.title}</span>
                  <span className="block text-xs text-text-light">
                    {item.original_name} · {formatSize(item.size_bytes)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{KIND_LABEL[item.kind]}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {!item.uploaded ? (
                    <span className="rounded bg-red-50 px-2 py-0.5 text-red-700">
                      Upload unvollständig
                    </span>
                  ) : item.published ? (
                    <span className="rounded bg-green-50 px-2 py-0.5 text-green-800">
                      Freigeschaltet
                    </span>
                  ) : (
                    <span className="rounded bg-yellow-50 px-2 py-0.5 text-yellow-900">
                      Entwurf
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {item.uploaded && (
                      <Link
                        href={`/schulungsmaterial/${item.id}`}
                        className="text-primary underline hover:text-primary/80"
                      >
                        Ansehen
                      </Link>
                    )}
                    {item.uploaded && (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => setPublished(item, !item.published)}
                        className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80 disabled:opacity-50"
                      >
                        {item.published ? (
                          <>
                            <EyeOff className="w-4 h-4" aria-hidden="true" />
                            Zurückziehen
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" aria-hidden="true" />
                            Freischalten
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => remove(item)}
                      className="inline-flex items-center gap-1 text-red-700 hover:text-red-800 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
