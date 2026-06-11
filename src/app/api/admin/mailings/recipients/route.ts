import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Liefert die Empfänger für das Admin-Mailing-Tool, gruppiert nach Quelle:
 *  - accounts:      registrierte DigiKI-Konten (auth.users + profiles)
 *  - participants:  Schulungsteilnehmer (persons mit E-Mail aus den Importen)
 *  - contacts:      Ansprechpartner der Schulen (Bestandsaufnahme-Kontakte)
 *
 * Auth: Admin-only. Service-Role-Key nur serverseitig.
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

  type Entry = {
    id: string;
    email: string;
    full_name: string | null;
    school: string | null;
    confirmed: boolean;
  };

  // Dedupe innerhalb einer Gruppe (case-insensitiv nach E-Mail).
  const dedupe = (list: Entry[]): Entry[] => {
    const seen = new Set<string>();
    return list.filter((e) => {
      const k = e.email.toLowerCase();
      if (!e.email || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  // ── 1. DigiKI-Konten ───────────────────────────────────────────────
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
  const userIds = usersData.users.map((u) => u.id);
  const { data: profilesData } = await admin
    .from("profiles")
    .select("id, full_name, school")
    .in("id", userIds);
  const profileById = new Map((profilesData ?? []).map((p) => [p.id, p]));

  const accounts = dedupe(
    usersData.users
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
      }),
  ).sort((a, b) => {
    if (a.confirmed !== b.confirmed) return a.confirmed ? -1 : 1;
    return a.email.localeCompare(b.email);
  });

  // ── 2. Schulungsteilnehmer (persons mit E-Mail) ────────────────────
  const { data: personsData } = await admin
    .from("persons")
    .select("id, first_name, last_name, email, school:schools (name)")
    .not("email", "is", null);

  const participants = dedupe(
    ((personsData ?? []) as unknown as Array<{
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      school: { name: string | null } | null;
    }>).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: [p.last_name, p.first_name].filter(Boolean).join(", ") || null,
      school: p.school?.name ?? null,
      confirmed: true,
    })),
  ).sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "", "de"));

  // ── 3. Ansprechpartner (Bestandsaufnahme-Kontakte) ─────────────────
  const { data: contactsData } = await admin
    .from("bestandsaufnahme_responses")
    .select("id, contact_email, contact_person, school_name")
    .not("contact_email", "is", null);

  const contacts = dedupe(
    ((contactsData ?? []) as unknown as Array<{
      id: string;
      contact_email: string;
      contact_person: string | null;
      school_name: string | null;
    }>)
      .filter(
        (c) =>
          c.contact_email.includes("@") &&
          !(c.school_name ?? "").toLowerCase().includes("test") &&
          !(c.school_name ?? "").toLowerCase().includes("admin"),
      )
      .map((c) => ({
        id: c.id,
        email: c.contact_email,
        full_name: c.contact_person ?? null,
        school: c.school_name ?? null,
        confirmed: true,
      })),
  ).sort((a, b) => (a.school ?? "").localeCompare(b.school ?? "", "de"));

  // ── 4. Dauerhaft gespeicherte manuelle Adressen ───────────────────
  const { data: extraData } = await admin
    .from("mailing_extra_recipients")
    .select("id, email, label")
    .order("created_at", { ascending: true });
  const manual = dedupe(
    ((extraData ?? []) as Array<{ id: string; email: string; label: string | null }>).map(
      (m) => ({
        id: m.id,
        email: m.email,
        full_name: m.label ?? null,
        school: null,
        confirmed: true,
      }),
    ),
  );

  return NextResponse.json({
    accounts,
    participants,
    contacts,
    manual,
    // Abwärtskompatibel: einige Stellen lesen evtl. noch `recipients`.
    recipients: accounts,
    total: accounts.length,
    confirmedCount: accounts.filter((r) => r.confirmed).length,
  });
}
