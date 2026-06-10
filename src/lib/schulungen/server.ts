import { NextResponse } from "next/server";
import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Server-Helfer für die Schulungs-Dashboard-API:
// Auth-Prüfung (Rolle admin ODER schulungsteam) + Service-Role-Client.

export type DashboardAuth =
  | { ok: true; userId: string; role: "admin" | "schulungsteam"; isAdmin: boolean }
  | { ok: false; response: NextResponse };

export async function requireSchulungenAccess(opts?: {
  adminOnly?: boolean;
}): Promise<DashboardAuth> {
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

  const role = profile?.role?.toLowerCase();
  const allowed = opts?.adminOnly
    ? role === "admin"
    : role === "admin" || role === "schulungsteam";

  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    userId: user.id,
    role: role as "admin" | "schulungsteam",
    isAdmin: role === "admin",
  };
}

/** Service-Role-Client: umgeht RLS, nur serverseitig verwenden. */
export function createServiceClient(): SupabaseClient {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** Erkennt die Quoten-Exception aus dem Postgres-Trigger. */
export function isQuotaError(message: string | null | undefined): boolean {
  return !!message && message.includes("QUOTA_EXCEEDED");
}

/** Macht aus der Trigger-Meldung einen lesbaren Konflikt-Grund. */
export function quotaReason(role: string, used: string): string {
  return role === "leadership"
    ? `Quote überschritten: ${used} Person aus der Schulleitung bereits angemeldet (max. 1 je Schule)`
    : `Quote überschritten: ${used} Lehrkräfte bereits angemeldet (max. 2 je Schule)`;
}
