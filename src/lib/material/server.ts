import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Server-Helfer für Schulungsmaterial, Programm-Zugehörigkeit und die
// Regel für E-Mail-Domains (Migration 038).

/**
 * Hat das angemeldete Konto eine Bestandsaufnahme (= Programm-Schule)?
 * Fehlt die Migration, gilt „ja" – dann bleibt alles wie bisher.
 */
export async function hasBestandsaufnahme(
  supabase: SupabaseClient
): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_bestandsaufnahme");
  if (error) return true;
  return data === true;
}

/**
 * Ist die Adresse für Schulkonten gesperrt (private Postfächer wie gmail)?
 * Fehlt die Migration, wird nichts gesperrt.
 */
export async function isEmailDomainBlocked(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_email_domain_blocked", {
    p_email: email,
  });
  if (error) {
    console.error("[email-domain] Prüfung nicht möglich:", error.message);
    return false;
  }
  return data === true;
}

/**
 * Ist die Schule schon registriert (Schulkonto oder Bestandsaufnahme unter
 * diesem Namen – auch über die Zuordnungsliste, Migration 041)?
 * `null` = Prüfung nicht möglich (Migration fehlt).
 */
export async function isSchoolRegistered(
  admin: SupabaseClient,
  schoolName: string,
  excludeUserId: string | null = null
): Promise<boolean | null> {
  const { data, error } = await admin.rpc("school_is_registered", {
    p_school: schoolName,
    p_exclude_user: excludeUserId,
  });
  if (error) {
    console.error("[school-registered] Prüfung nicht möglich:", error.message);
    return null;
  }
  return data === true;
}

export const PRIVATE_EMAIL_MESSAGE =
  "Bitte verwenden Sie die dienstliche E-Mail-Adresse Ihrer Schule. Private Adressen (z. B. Gmail, GMX, Web.de) sind nicht zugelassen.";

export type AdminAuth =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/** API-Routen: nur Admins, und nur mit bestätigtem zweiten Faktor. */
export async function requireAdmin(): Promise<AdminAuth> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      ),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      ),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role?.toLowerCase() !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      ),
    };
  }

  // Die Routen arbeiten mit dem Service-Role-Key (umgeht RLS) – die
  // 2FA-Pflicht aus Migration 036 deshalb hier ausdrücklich prüfen.
  const { data: needsMfa } = await supabase.rpc("current_user_needs_mfa");
  if (needsMfa === true) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Zweiter Faktor erforderlich" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId: user.id };
}
