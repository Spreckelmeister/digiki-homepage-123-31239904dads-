import { NextRequest, NextResponse } from "next/server";
import { requireSchulungenAccess } from "@/lib/schulungen/server";
import {
  extractEventSuggestion,
  extractNlcEventId,
  fetchNlcEventDetails,
} from "@/lib/schulungen/nlcSync";

/**
 * Vorschlagswerte für das Anlegen/Bearbeiten einer Schulung aus dem
 * NLC-Eintrag: Der Admin fügt im Modal zuerst den Anmeldelink ein,
 * diese Route liefert KOS-Nummer, Titel, ersten Schulungstag,
 * Zielgruppe und Anmeldeschluss zurück (alles bleibt editierbar).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireSchulungenAccess({ adminOnly: true });
  if (!auth.ok) return auth.response;

  const link = (request.nextUrl.searchParams.get("link") ?? "").trim();
  const nlcId = extractNlcEventId({ anmeldung_url: link, nlc_event_id: link });
  if (!nlcId) {
    return NextResponse.json(
      {
        error:
          "Kein NLC-Link erkannt – erwartet wird z.B. https://nlc.info/app/edb/event/55355.",
      },
      { status: 400 },
    );
  }

  try {
    const event = await fetchNlcEventDetails(nlcId);
    return NextResponse.json({ suggestion: extractEventSuggestion(event) });
  } catch (err) {
    console.error("[nlc-event]", err);
    return NextResponse.json(
      {
        error:
          "Die NLC-Daten konnten nicht geladen werden – bitte Felder manuell ausfüllen.",
      },
      { status: 502 },
    );
  }
}
