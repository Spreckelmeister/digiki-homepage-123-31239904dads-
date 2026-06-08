import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Liefert die vollständige Empfänger-Liste für das Admin-Mailing-Tool.
 * Quelle ist `auth.users` (= alle registrierten Accounts), angereichert mit
 * Profil-Daten (Name, Schule), damit der Admin im UI sieht, an wen
 * tatsächlich versendet wird.
 *
 * Auth: Admin-only. Service-Role-Key wird ausschließlich serverseitig genutzt.
 */
export async function GET(_request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role?.toLowerCase() !== "admin") {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // listUsers paginiert: erste 1000 reichen für unser Szenario (≈50 Schulen).
  // Falls die Liste irgendwann darüber wächst, hier in einer Schleife
  // weiterblättern (perPage max 1000).
  const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (usersError) {
    console.error("[mailings/recipients] listUsers error:", usersError.message);
    return NextResponse.json(
      { error: "Empfängerliste konnte nicht geladen werden" },
      { status: 500 },
    );
  }

  // Profile zu allen User-IDs in einem Rutsch holen, damit wir Name + Schule
  // anzeigen können. Fehlt ein Profil, bleibt das Feld leer – die E-Mail
  // selbst ist die einzige zwingend nötige Information.
  const userIds = usersData.users.map((u) => u.id);
  const { data: profilesData } = await admin
    .from("profiles")
    .select("id, full_name, school")
    .in("id", userIds);
  const profileById = new Map(
    (profilesData ?? []).map((p) => [p.id, p]),
  );

  const recipients = usersData.users
    .filter((u) => !!u.email)
    .map((u) => {
      const p = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email as string,
        full_name: p?.full_name ?? null,
        school: p?.school ?? null,
        confirmed: !!u.email_confirmed_at,
      };
    })
    // Bestätigte zuerst, danach unbestätigte; innerhalb alphabetisch nach E-Mail
    .sort((a, b) => {
      if (a.confirmed !== b.confirmed) return a.confirmed ? -1 : 1;
      return a.email.localeCompare(b.email);
    });

  return NextResponse.json({
    recipients,
    total: recipients.length,
    confirmedCount: recipients.filter((r) => r.confirmed).length,
  });
}
