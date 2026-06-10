/**
 * Gemeinsame Logik für die 24-Stunden-Sperre des Bestätigungs-Mail-Resend.
 * Wird sowohl vom Server (API-Route) als auch von Client-Komponenten
 * verwendet, damit das Verhalten konsistent ist.
 */

export const RESEND_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type CooldownInfo = {
  remainingMs: number;
  /** Vorformatierte Restzeit, z.B. „23 Std 12 Min" oder „47 Min". */
  formatted: string;
  /** ISO-Zeitstempel, wann die nächste Versand-Möglichkeit besteht. */
  nextAvailableAt: string;
};

/**
 * Liefert Cooldown-Infos – oder `null`, wenn keine Sperre aktiv ist
 * (kein vorheriger Versand, ungültiger Zeitstempel, oder >24h vorbei).
 */
export function getResendCooldown(
  lastResendIso: string | null | undefined,
  now: Date = new Date(),
): CooldownInfo | null {
  if (!lastResendIso) return null;
  const last = new Date(lastResendIso);
  if (Number.isNaN(last.getTime())) return null;
  const remaining = RESEND_COOLDOWN_MS - (now.getTime() - last.getTime());
  if (remaining <= 0) return null;
  return {
    remainingMs: remaining,
    formatted: formatCooldown(remaining),
    nextAvailableAt: new Date(last.getTime() + RESEND_COOLDOWN_MS).toISOString(),
  };
}

export type ResendBlockReason = "resend-cooldown" | "signup-grace";

export type ResendBlock = CooldownInfo & { reason: ResendBlockReason };

/**
 * Kombinierte Sperre für den Bestätigungs-Mail-Resend. Es greift die
 * Sperre, die später endet:
 *  - "signup-grace":    Die Anmeldung ist noch keine 24h her – die Schule
 *                       soll erst selbst Gelegenheit haben zu bestätigen,
 *                       bevor wir per Admin-Mail nachfassen.
 *  - "resend-cooldown": Nach einem Versand ist der Link 24h gültig – in
 *                       dieser Zeit kein erneuter Versand, damit die Schule
 *                       nicht mehrfach kontaktiert wird.
 *
 * Liefert `null`, wenn keine Sperre aktiv ist (Versand möglich).
 */
export function getResendBlock(
  signupAt: string | null | undefined,
  lastResendAt: string | null | undefined,
  now: Date = new Date(),
): ResendBlock | null {
  const resend = getResendCooldown(lastResendAt, now);
  const signup = getResendCooldown(signupAt, now);
  if (resend && signup) {
    // Beide aktiv: die länger laufende Sperre gewinnt.
    return resend.remainingMs >= signup.remainingMs
      ? { ...resend, reason: "resend-cooldown" }
      : { ...signup, reason: "signup-grace" };
  }
  if (resend) return { ...resend, reason: "resend-cooldown" };
  if (signup) return { ...signup, reason: "signup-grace" };
  return null;
}

/** Formatiert eine Restzeit als „23 Std 12 Min" bzw. „47 Min". */
export function formatCooldown(remainingMs: number): string {
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes - hours * 60;
  if (hours === 0) return `${minutes} Min`;
  if (minutes === 0) return `${hours} Std`;
  return `${hours} Std ${minutes} Min`;
}
