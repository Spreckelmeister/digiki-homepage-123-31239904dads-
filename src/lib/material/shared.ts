// Schulungsmaterial (Migration 038): gemeinsame Konstanten und Typen
// für Server und Browser.

/** Privater Supabase-Storage-Bucket. */
export const MATERIAL_BUCKET = "schulungsmaterial";

/**
 * Großes HTML-Material liegt nicht im Bucket, sondern in Einheiten aufgeteilt
 * auf dem eigenen Server (scripts/material-vps). Der Eintrag trägt dann als
 * storage_path „vps:<ordner>".
 */
const VPS_PREFIX = "vps:";

/** Ordnername auf dem eigenen Server – oder null, wenn die Datei im Bucket liegt. */
export function vpsSlug(storagePath: string): string | null {
  if (!storagePath.startsWith(VPS_PREFIX)) return null;
  const slug = storagePath.slice(VPS_PREFIX.length);
  return /^[a-z0-9][a-z0-9-]{0,62}$/.test(slug) ? slug : null;
}

export type MaterialKind = "video" | "audio" | "pdf" | "image" | "html";

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
  // HTML-Lerneinheit: wird abgeschottet in einem Rahmen angezeigt.
  "text/html": "html",
};

/** Manche Browser melden für .html keinen Typ – dann nach Endung. */
export function mimeOfFile(name: string, type: string): string {
  if (type) return type.toLowerCase();
  return /\.html?$/i.test(name) ? "text/html" : "";
}

export function kindFromMime(mime: string): MaterialKind | null {
  return KIND_BY_MIME[mime.toLowerCase()] ?? null;
}

/** Wert für das accept-Attribut des Datei-Felds. */
export const MATERIAL_ACCEPT = [...Object.keys(KIND_BY_MIME), ".html", ".htm"].join(",");

export const KIND_LABEL: Record<MaterialKind, string> = {
  video: "Video",
  audio: "Audio",
  pdf: "PDF",
  image: "Bild",
  html: "Lerneinheit",
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

// ── Fortschritt in HTML-Lerneinheiten (Migration 043) ──────────────
// Die Lerneinheit läuft abgeschottet und kann selbst nichts speichern.
// Ihr „localStorage" ist ein Ersatz (siehe /schulungsmaterial/inhalt/[id]),
// der Änderungen an die umgebende Seite meldet; die legt sie je Konto ab.

import { PROGRESS_MARKER } from "./storageShim";

export { PROGRESS_MARKER };

export type MaterialProgress = Record<string, string>;

const PROGRESS_MAX_KEYS = 50;
const PROGRESS_MAX_KEY_LENGTH = 200;
const PROGRESS_MAX_BYTES = 32 * 1024;

/**
 * Prüft einen gemeldeten Stand. Er stammt aus fremdem Inhalt – angenommen
 * wird nur eine kleine Liste aus Text-Schlüsseln und Text-Werten.
 * `null` = nicht speichern.
 */
export function sanitizeProgress(input: unknown): MaterialProgress | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length > PROGRESS_MAX_KEYS) return null;
  const out: MaterialProgress = {};
  for (const [key, value] of entries) {
    if (!key || key.length > PROGRESS_MAX_KEY_LENGTH || typeof value !== "string") return null;
    out[key] = value;
  }
  if (new TextEncoder().encode(JSON.stringify(out)).length > PROGRESS_MAX_BYTES) return null;
  return out;
}

/**
 * Wert für das name-Attribut des Rahmens: Die Lerneinheit liest ihn beim
 * Start als window.name und hat ihren Stand damit sofort – ohne Wartezeit
 * und ohne dass er in der (zwischengespeicherten) Datei stehen müsste.
 */
export function progressFrameName(progress: MaterialProgress): string {
  return JSON.stringify({ [PROGRESS_MARKER]: 1, ls: progress });
}
