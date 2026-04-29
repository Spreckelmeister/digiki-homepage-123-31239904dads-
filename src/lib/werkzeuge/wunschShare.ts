// Eltern-Wunsch-Workflow ohne Server.
//
// Lehrkraft erzeugt Eltern-Formulare (Druck) → QR-Code enthält URL mit
// Hash-Payload (#p=…). Eltern scannen, füllen am Smartphone aus.
// Ergebnis-Seite zeigt Rück-Code (Text + QR), den die Lehrkraft scannt
// oder einfügt.
//
// Hash-Fragment wird vom Browser NIEMALS an den Server gesendet.
// → komplett serverless, datensparsam.

import type { ClassRoster, Student } from "./classRosters";

// ── Short-IDs (8 hex chars) ──────────────────────────────────────────
// Volle UUIDs würden den Payload aufblähen. 8 hex chars sind innerhalb
// einer Klassenliste (max ~30 Kinder) praktisch immer eindeutig.

export function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8);
}

// ── base64url Codec ──────────────────────────────────────────────────

function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  // Browser btoa erwartet Latin-1 Strings → wir geben jedes Byte
  // einzeln rein.
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  let std = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = std.length % 4;
  if (pad) std += "=".repeat(4 - pad);
  const bin = atob(std);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ── Payload-Typen ────────────────────────────────────────────────────

/** Gesendet an die Eltern (im URL-Hash der gedruckten QR-Adresse) */
export interface WunschPayload {
  v: 1;
  /** Short-ID des aktuellen Kindes */
  s: string;
  /** Alle Mitschüler (inkl. eigenes Kind) als short-id + Name */
  n: { id: string; name: string }[];
  /** max. Anzahl Wünsche */
  mw: number;
  /** Schul-Hinweis / Klassenname (optional, nur Anzeige) */
  c?: string;
}

/** Antwort der Eltern an die Lehrkraft */
export interface WunschResult {
  v: 1;
  s: string; // short-id des Kindes
  w: string[]; // short-ids der Wünsche
  ng: string[]; // short-ids der NoGo
}

// ── Encode / Decode ──────────────────────────────────────────────────

export function encodePayload(payload: WunschPayload): string {
  return bytesToBase64Url(utf8ToBytes(JSON.stringify(payload)));
}

export function decodePayload(encoded: string): WunschPayload | null {
  try {
    const obj = JSON.parse(bytesToUtf8(base64UrlToBytes(encoded)));
    if (!obj || obj.v !== 1 || typeof obj.s !== "string" || !Array.isArray(obj.n)) {
      return null;
    }
    return obj as WunschPayload;
  } catch {
    return null;
  }
}

export function encodeResult(result: WunschResult): string {
  return bytesToBase64Url(utf8ToBytes(JSON.stringify(result)));
}

export function decodeResult(encoded: string): WunschResult | null {
  try {
    const obj = JSON.parse(bytesToUtf8(base64UrlToBytes(encoded.trim())));
    if (
      !obj ||
      obj.v !== 1 ||
      typeof obj.s !== "string" ||
      !Array.isArray(obj.w) ||
      !Array.isArray(obj.ng)
    ) {
      return null;
    }
    return obj as WunschResult;
  } catch {
    return null;
  }
}

// ── Builder & Matcher für die Lehrkraft-Seite ────────────────────────

export function buildPayloadForStudent(
  roster: ClassRoster,
  student: Student,
  maxWishes: number
): WunschPayload {
  return {
    v: 1,
    s: shortId(student.id),
    n: roster.students.map((s) => ({ id: shortId(s.id), name: s.name })),
    mw: maxWishes,
    c: roster.name,
  };
}

/** Findet den passenden Student im Roster zum kurzen Result. */
export function applyResultToRoster(
  roster: ClassRoster,
  result: WunschResult
): { student: Student; wishes: string[]; noGo: string[] } | null {
  const lookup = new Map<string, string>(); // shortId -> realId
  for (const s of roster.students) lookup.set(shortId(s.id), s.id);
  const realStudentId = lookup.get(result.s);
  if (!realStudentId) return null;
  const student = roster.students.find((s) => s.id === realStudentId);
  if (!student) return null;
  const wishes = result.w
    .map((sid) => lookup.get(sid))
    .filter((id): id is string => !!id && id !== realStudentId);
  const noGo = result.ng
    .map((sid) => lookup.get(sid))
    .filter((id): id is string => !!id && id !== realStudentId);
  return { student, wishes, noGo };
}
