// AES-256-GCM Verschlüsselung für SMTP-Passwörter.
// SERVER-ONLY (nutzt node:crypto). Niemals in Client-Bundles ziehen.
//
// Voraussetzung: ENV-Variable SMTP_ENCRYPTION_KEY mit einem
// base64-codierten 32-Byte-Schlüssel.
//   z. B. erzeugen mit:  openssl rand -base64 32

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getKey(): Buffer {
  const raw = process.env.SMTP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "SMTP_ENCRYPTION_KEY ist nicht gesetzt. Bitte einen 32-Byte-Schlüssel als base64 in die Umgebung legen."
    );
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `SMTP_ENCRYPTION_KEY hat ${buf.length} Bytes, erwartet werden 32 (256 Bit).`
    );
  }
  return buf;
}

export interface EncryptedSecret {
  enc: string; // base64
  iv: string; // base64 (12 Bytes für GCM)
  tag: string; // base64 (16 Bytes Auth-Tag)
}

export function encryptSecret(plain: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    enc: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptSecret(s: EncryptedSecret): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(s.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(s.tag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(s.enc, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

export function isEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}
