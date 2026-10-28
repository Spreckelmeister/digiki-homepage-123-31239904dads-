/**
 * Zwei-Faktor-Bausteine (Admins): Authenticator-App (TOTP) und Passkey
 * (WebAuthn) über Supabase MFA. Durchgesetzt wird die Pflicht in der
 * Datenbank (Migration 036) und per Middleware-Umleitung; hier liegt nur
 * die Browser-Seite von Einrichtung und Bestätigung.
 *
 * Die Passkey-Methoden von supabase-js sind noch als „experimental“
 * markiert (`_register` / `_authenticate`) – deshalb gekapselt an einer
 * Stelle, falls sich die API ändert.
 */

import type { Factor, SupabaseClient } from "@supabase/supabase-js";

export type MfaFactor = Pick<Factor, "id" | "factor_type" | "friendly_name" | "created_at">;

export interface MfaState {
  /** Aktuelle Stufe der Sitzung – „aal2“ = zweiter Faktor bestätigt. */
  currentLevel: string | null;
  /** Bestätigte (nutzbare) Faktoren. */
  factors: MfaFactor[];
}

export function passkeysSupported(): boolean {
  return typeof window !== "undefined" && "PublicKeyCredential" in window;
}

export async function getMfaState(supabase: SupabaseClient): Promise<MfaState> {
  const [{ data: aal }, { data: list }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);
  const factors = (list?.all ?? [])
    .filter((f) => f.status === "verified")
    .filter((f) => f.factor_type === "totp" || f.factor_type === "webauthn");
  return { currentLevel: aal?.currentLevel ?? null, factors };
}

/** Verwirft abgebrochene, nie bestätigte Einrichtungen (sonst blockiert
 *  Supabase eine neue Einrichtung mit gleichem Namen). */
async function removeUnverified(supabase: SupabaseClient, type: "totp" | "webauthn") {
  const { data } = await supabase.auth.mfa.listFactors();
  for (const f of data?.all ?? []) {
    if (f.factor_type === type && f.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }
}

/** Relying Party ID = Domain ohne „www.“ (muss zur Supabase-Einstellung
 *  „Relying Party ID“ passen, dort: digiki-os.de). Die Seite läuft unter
 *  www.digiki-os.de; ein Passkey für digiki-os.de gilt auch dort. */
function webauthnOptions() {
  return { rpId: window.location.hostname.replace(/^www\./, "") };
}

function suffix(): string {
  return new Date().toLocaleDateString("de-DE");
}

export async function startTotpEnrollment(supabase: SupabaseClient) {
  await removeUnverified(supabase, "totp");
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "DigiKI",
    friendlyName: `Authenticator-App (${suffix()})`,
  });
  if (error || !data) throw new MfaError(friendlyError(error));
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyTotp(supabase: SupabaseClient, factorId: string, code: string) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) {
    throw new MfaError(
      error.code === "mfa_verification_failed" || error.status === 422
        ? "Der Code stimmt nicht. Bitte den aktuellen 6-stelligen Code aus der App eingeben."
        : friendlyError(error),
    );
  }
}

export async function registerPasskey(supabase: SupabaseClient) {
  await removeUnverified(supabase, "webauthn");
  const { error } = await supabase.auth.mfa.webauthn._register({
    friendlyName: `Passkey (${suffix()})`,
    webauthn: webauthnOptions(),
  });
  if (error) throw new MfaError(friendlyError(error));
}

export async function authenticatePasskey(supabase: SupabaseClient, factorId: string) {
  const { error } = await supabase.auth.mfa.webauthn._authenticate({
    factorId,
    webauthn: webauthnOptions(),
  });
  if (error) throw new MfaError(friendlyError(error));
}

export async function removeFactor(supabase: SupabaseClient, factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw new MfaError(friendlyError(error));
}

export class MfaError extends Error {}

function friendlyError(error: { message?: string; code?: string; name?: string } | null): string {
  const msg = `${error?.code ?? ""} ${error?.name ?? ""} ${error?.message ?? ""}`.toLowerCase();
  if (msg.includes("notallowed") || msg.includes("abort") || msg.includes("cancel")) {
    return "Der Vorgang wurde abgebrochen. Bitte erneut versuchen.";
  }
  // z. B. „mfa_webauthn_enroll_not_enabled“ / „… is disabled“
  if (msg.includes("disabled") || msg.includes("not_enabled") || msg.includes("not enabled")) {
    return "Diese Methode ist noch nicht freigeschaltet. Bitte die Authenticator-App verwenden.";
  }
  if (msg.includes("expired")) {
    return "Die Anfrage ist abgelaufen. Bitte erneut versuchen.";
  }
  return "Das hat leider nicht geklappt. Bitte erneut versuchen.";
}
