import type { SupabaseClient, User, EmailOtpType } from "@supabase/supabase-js";

/**
 * Löst einen Anmelde-/Bestätigungscode ein und meldet den Nutzer an.
 *
 * Codes, die „per Eingabe anmelden", entstehen an zwei Stellen:
 *  - /api/auth/request-login-code → generateLink({type:"magiclink"})
 *  - /api/register-bestandsaufnahme → generateLink({type:"signup"})
 * Damit JEDER dieser Codes an JEDER Login-Eingabe funktioniert, probieren
 * wir die Typen in fester Reihenfolge durch (disziplinierte Teilmenge des
 * alten CodeForm-Fallbacks). Ein erfolgreiches verifyOtp bestätigt dabei
 * auch eine noch unbestätigte E-Mail-Adresse (Selbstheilung).
 *
 * `recovery` fehlt hier bewusst – Passwort-Reset-Codes gehören auf die
 * Seite „Passwort vergessen" und sollen nicht nebenbei einloggen.
 */
const SIGN_IN_OTP_TYPES: EmailOtpType[] = ["magiclink", "signup", "email"];

/** Erlaubtes Code-Format (Supabase-OTP: 6–10 alphanumerische Zeichen). */
export const OTP_CODE_PATTERN = /^[A-Za-z0-9]{6,10}$/;

export type VerifySignInResult =
  | { ok: true; user: User | null }
  | { ok: false; kind: "expired" | "invalid" | "other"; message: string };

export function normalizeOtpCode(raw: string): string {
  return raw.replace(/\s+/g, "");
}

export async function verifySignInCode(
  supabase: SupabaseClient,
  emailRaw: string,
  tokenRaw: string
): Promise<VerifySignInResult> {
  const email = emailRaw.trim().toLowerCase();
  const token = normalizeOtpCode(tokenRaw);

  if (!OTP_CODE_PATTERN.test(token)) {
    return { ok: false, kind: "invalid", message: "format" };
  }

  let lastMessage = "";
  for (const type of SIGN_IN_OTP_TYPES) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    });

    if (!error) {
      return { ok: true, user: data.user ?? null };
    }

    const msg = error.message.toLowerCase();
    // Abgelaufen → sofort raus, kein Typ-Fallback sinnvoll.
    if (msg.includes("expired")) {
      return { ok: false, kind: "expired", message: error.message };
    }
    if (
      msg.includes("invalid") ||
      msg.includes("not found") ||
      msg.includes("token")
    ) {
      lastMessage = error.message;
      continue;
    }
    // Unerwarteter Fehler (Netz, Rate-Limit, …) → nicht weiter probieren.
    return { ok: false, kind: "other", message: error.message };
  }

  return { ok: false, kind: "invalid", message: lastMessage };
}
