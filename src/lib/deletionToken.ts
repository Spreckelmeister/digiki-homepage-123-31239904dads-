// Stateless HMAC-signierte Tokens für den Account-Löschungs-Bestätigungs-Flow.
// Kein DB-Eintrag nötig: Das Token trägt seine Payload selbst und ist durch
// einen abgeleiteten Server-Key geschützt. Single-Use wird praktisch dadurch
// erzwungen, dass der User nach Konsum nicht mehr existiert – ein zweiter
// Klick auf denselben Link trifft dann auf einen leeren Delete und gibt eine
// neutrale "bereits gelöscht"-Antwort.
//
// Läuft nur auf der Server-Seite (nutzt node:crypto).

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export interface DeletionPayload {
  userId: string;
  email: string;
  deleteBestPractices: boolean;
  nonce: string;
  /** Unix-Epoch-Seconds */
  exp: number;
}

const TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 Stunden

function getSigningKey(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY missing – cannot sign deletion tokens");
  }
  // Zweckgebundene Ableitung: falls derselbe Service-Key an anderer Stelle
  // als HMAC-Secret verwendet würde, kollidieren die Tokens nicht.
  return createHmac("sha256", secret).update("digiki/account-deletion/v1").digest();
}

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

export function createDeletionToken(
  userId: string,
  email: string,
  deleteBestPractices: boolean
): string {
  const payload: DeletionPayload = {
    userId,
    email,
    deleteBestPractices,
    nonce: randomBytes(16).toString("hex"),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const payloadB64 = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = createHmac("sha256", getSigningKey()).update(payloadB64).digest();
  return `${payloadB64}.${b64urlEncode(sig)}`;
}

export type VerifyResult =
  | { ok: true; payload: DeletionPayload }
  | { ok: false; reason: "format" | "signature" | "expired" | "payload" };

export function verifyDeletionToken(token: string): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "format" };
  const [payloadB64, sigB64] = parts;

  let expectedSig: Buffer;
  try {
    expectedSig = createHmac("sha256", getSigningKey()).update(payloadB64).digest();
  } catch {
    return { ok: false, reason: "signature" };
  }

  let providedSig: Buffer;
  try {
    providedSig = b64urlDecode(sigB64);
  } catch {
    return { ok: false, reason: "signature" };
  }
  if (providedSig.length !== expectedSig.length) {
    return { ok: false, reason: "signature" };
  }
  if (!timingSafeEqual(providedSig, expectedSig)) {
    return { ok: false, reason: "signature" };
  }

  let payload: DeletionPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8")) as DeletionPayload;
  } catch {
    return { ok: false, reason: "payload" };
  }

  if (
    typeof payload.userId !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.deleteBestPractices !== "boolean" ||
    typeof payload.exp !== "number"
  ) {
    return { ok: false, reason: "payload" };
  }

  if (Math.floor(Date.now() / 1000) > payload.exp) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, payload };
}
