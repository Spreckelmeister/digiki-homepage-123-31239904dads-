// Schulungsmaterial (Migration 038): gemeinsame Konstanten und Typen
// für Server und Browser.

/** Privater Supabase-Storage-Bucket. */
export const MATERIAL_BUCKET = "schulungsmaterial";

export type MaterialKind = "video" | "audio" | "pdf" | "image";

export interface MaterialItem {
  id: string;
  title: string;
  description: string;
  kind: MaterialKind;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  original_name: string;
  sort_order: number;
  uploaded: boolean;
  published: boolean;
  published_at: string | null;
  created_at: string;
}

/**
 * Zugelassen sind nur Dateien, die sich im Browser ANSEHEN lassen –
 * das Material wird nicht zum Download angeboten. Office-Dateien
 * (PowerPoint, Word) bitte vorher als PDF speichern.
 */
const KIND_BY_MIME: Record<string, MaterialKind> = {
  "video/mp4": "video",
  "video/webm": "video",
  "audio/mpeg": "audio",
  "audio/mp4": "audio",
  "audio/wav": "audio",
  "audio/x-wav": "audio",
  "audio/ogg": "audio",
  "application/pdf": "pdf",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
};

export function kindFromMime(mime: string): MaterialKind | null {
  return KIND_BY_MIME[mime.toLowerCase()] ?? null;
}

/** Wert für das accept-Attribut des Datei-Felds. */
export const MATERIAL_ACCEPT = Object.keys(KIND_BY_MIME).join(",");

export const KIND_LABEL: Record<MaterialKind, string> = {
  video: "Video",
  audio: "Audio",
  pdf: "PDF",
  image: "Bild",
};

export function formatSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1).replace(".", ",")} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Normalisiert eine Domain-Eingabe („@Gmail.com " → „gmail.com"). */
export function normalizeDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^.*@/, "").replace(/^\.+|\.+$/g, "");
}
