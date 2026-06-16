import { NextRequest, NextResponse } from "next/server";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";
import {
  buildRegisteredSchools,
  matchRegisteredSchool,
} from "@/lib/schulungen/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kontaktinfo + Anmeldungen + offene Konflikte für eine einzelne Schule. */
export async function GET(request: NextRequest) {
  const auth = await requireSchulungenAccess();
  if (!auth.ok) return auth.response;

  const schoolName = request.nextUrl.searchParams.get("name");
  if (!schoolName) {
    return NextResponse.json({ error: "name fehlt" }, { status: 400 });
  }

  const admin = createServiceClient();

  // Bestandsaufnahme + alle Schulen aus der schools-Tabelle laden
  const [bestandRes, allSchoolsRes] = await Promise.all([
    admin
      .from("bestandsaufnahme_responses")
      .select("school_name, contact_email, contact_phone, contact_person, principal_name"),
    admin
      .from("schools")
      .select("id, name, city"),
  ]);

  const bestandRows = (bestandRes.data ?? []) as Array<{
    school_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    contact_person: string | null;
    principal_name: string | null;
  }>;

  // Tolerantes Schul-Matching (gleiche Logik wie overview/participants)
  const registeredSchools = buildRegisteredSchools(
    bestandRows.map((b) => b.school_name)
  );
  const canonicalName =
    matchRegisteredSchool(schoolName, registeredSchools) ?? schoolName;

  // Schul-IDs in der schools-Tabelle finden, die zu dieser Schule gehören
  const allSchools = (allSchoolsRes.data ?? []) as Array<{
    id: string;
    name: string | null;
    city: string | null;
  }>;
  const matchingSchoolIds = allSchools
    .filter((s) => {
      const m = matchRegisteredSchool(s.name ?? "", registeredSchools);
      return m === canonicalName || s.name === schoolName;
    })
    .map((s) => s.id);

  // Kontaktinfo aus Bestandsaufnahme
  const bestandEntry = bestandRows.find((b) => {
    const n = b.school_name?.trim() ?? "";
    return n === canonicalName || n === schoolName;
  });
  const contact = bestandEntry
    ? {
        email: bestandEntry.contact_email ?? null,
        phone: bestandEntry.contact_phone ?? null,
        contact_person: bestandEntry.contact_person ?? null,
        principal_name: bestandEntry.principal_name ?? null,
      }
    : null;

  if (matchingSchoolIds.length === 0) {
    return NextResponse.json({ contact, registrations: [], conflicts: [] });
  }

  // Anmeldungen + offene Konflikte parallel laden
  const [regsRes, conflictsRes] = await Promise.all([
    admin
      .from("registrations")
      .select(
        `role,
         person:persons (id, first_name, last_name, email),
         event:training_events (id, kurs_nr, title, start_date)`
      )
      .in("school_id", matchingSchoolIds)
      .eq("status", "registered"),
    admin
      .from("import_conflicts")
      .select(
        `id, reason, role,
         person:persons (id, first_name, last_name, email),
         event:training_events (id, kurs_nr, title, start_date)`
      )
      .in("school_id", matchingSchoolIds)
      .eq("status", "open"),
  ]);

  return NextResponse.json({
    contact,
    registrations: regsRes.data ?? [],
    conflicts: conflictsRes.data ?? [],
  });
}
