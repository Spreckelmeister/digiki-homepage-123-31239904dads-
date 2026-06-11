import { NextRequest, NextResponse } from "next/server";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

type ResetBody = { confirm?: unknown };

/**
 * Setzt alle Teilnahme-/Importdaten zurück (NUR Admins):
 * Anmeldungen, Personen, Schulen, Import-Batches und Konflikte werden
 * gelöscht. Die Schulungstermine (training_events) bleiben erhalten,
 * damit direkt danach neu importiert werden kann.
 *
 * Erfordert im Body { confirm: "LÖSCHEN" } als zusätzliche Sicherung
 * gegen versehentliche Auslösung.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auth = await requireSchulungenAccess({ adminOnly: true });
  if (!auth.ok) return auth.response;

  let body: ResetBody;
  try {
    body = (await request.json()) as ResetBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.confirm !== "LÖSCHEN") {
    return NextResponse.json(
      { error: "Bestätigung fehlt oder ist falsch." },
      { status: 400 }
    );
  }

  const admin = createServiceClient();

  // Reihenfolge entlang der Fremdschlüssel. registrations und persons
  // hängen via CASCADE an Schulen/Events, wir löschen aber explizit,
  // damit die Zähler in jeder Tabelle sicher geleert werden.
  // `neq id, <Nonsense-UUID>` = "alle Zeilen löschen" (PostgREST verlangt
  // einen Filter bei DELETE).
  const ALL = "00000000-0000-0000-0000-000000000000";
  const tables = [
    "import_conflicts",
    "registrations",
    "import_batches",
    "persons",
    "schools",
  ];

  for (const table of tables) {
    const { error } = await admin.from(table).delete().neq("id", ALL);
    if (error) {
      return NextResponse.json(
        { error: `Löschen von "${table}" fehlgeschlagen: ${error.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
