import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSchulungenAccess } from "@/lib/schulungen/server";
import { syncNlcDeadlines } from "@/lib/schulungen/nlcSync";

/**
 * NLC-Abgleich der Anmeldeschlüsse.
 *
 * GET  – täglicher Vercel-Cron (vercel.json). Vercel sendet automatisch
 *        "Authorization: Bearer <CRON_SECRET>", wenn die Env-Var im
 *        Projekt gesetzt ist.
 * POST – Admin-Knopf im Schulungsdashboard (Session-Auth, nur Admins).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// ~25 Events in 5er-Batches mit 8-s-Timeout je Abruf – 60 s reichen locker.
export const maxDuration = 60;

async function runSync() {
  const summary = await syncNlcDeadlines();
  if (summary.updated.length > 0) {
    console.log(
      "[nlc-sync] Fristen aktualisiert:",
      summary.updated
        .map((u) => `${u.kurs_nr} ${u.from ?? "leer"} → ${u.to}`)
        .join("; "),
    );
  }
  if (summary.failed.length > 0) {
    console.error(
      "[nlc-sync] Fehler:",
      summary.failed.map((f) => `${f.kurs_nr}: ${f.error}`).join("; "),
    );
  }
  // Die öffentliche Terminliste ist statisch (revalidate 600) – nach dem
  // Abgleich sofort neu aufbauen, damit neue Fristen ohne Wartezeit
  // sichtbar sind.
  revalidatePath("/fuer-schulen");
  return summary;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "cron_not_configured" },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runSync();
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[nlc-sync] Abgleich fehlgeschlagen:", err);
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}

export async function POST() {
  const auth = await requireSchulungenAccess({ adminOnly: true });
  if (!auth.ok) return auth.response;

  try {
    const summary = await runSync();
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[nlc-sync] Abgleich fehlgeschlagen:", err);
    return NextResponse.json(
      { error: "Der NLC-Abgleich ist fehlgeschlagen. Bitte später erneut versuchen." },
      { status: 500 },
    );
  }
}
