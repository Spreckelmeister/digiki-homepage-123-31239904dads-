import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { performAccountDeletionByToken } from "@/lib/performAccountDeletion";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

// Brute-Force-Schutz: max 5 Versuche pro 10 Minuten pro IP. Bei 31^8 möglichen
// Codes ist das praktisch unangreifbar, aber wir wollen auch nicht die DB
// mit Lookups hämmern lassen.
const rateMap = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateMap.set(ip, { count: 1, windowStart: now });
    if (rateMap.size >= 5000) {
      // Grobes Cleanup – älteste Einträge verwerfen.
      for (const [key, value] of rateMap) {
        if (now - value.windowStart > WINDOW_MS) rateMap.delete(key);
      }
    }
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Zu viele Versuche. Bitte in ein paar Minuten erneut versuchen." },
      { status: 429 }
    );
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: { email?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawEmail = body.email;
  const rawCode = body.code;
  if (typeof rawEmail !== "string" || typeof rawCode !== "string") {
    return NextResponse.json({ error: "Bitte geben Sie E-Mail und Code ein." }, { status: 400 });
  }
  const emailNormalized = rawEmail.trim().toLowerCase();
  const codeNormalized = rawCode.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(codeNormalized)) {
    return NextResponse.json(
      { error: "Der Code muss genau 8 Zeichen lang sein (Buchstaben und Zahlen)." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
    return NextResponse.json(
      { error: "Bitte geben Sie eine gültige E-Mail-Adresse ein." },
      { status: 400 }
    );
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Code + Email müssen übereinstimmen – kein "bekannter" Code sollte für
  // eine andere Email wirksam sein.
  const { data: codeRow, error: lookupError } = await admin
    .from("account_deletion_codes")
    .select("token, email, expires_at")
    .eq("code", codeNormalized)
    .ilike("email", emailNormalized)
    .maybeSingle();

  if (lookupError) {
    console.error("[confirm-delete-code] lookup error:", lookupError.message);
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
  if (!codeRow) {
    return NextResponse.json(
      { error: "Code oder E-Mail-Adresse passen nicht." },
      { status: 400 }
    );
  }
  if (new Date(codeRow.expires_at).getTime() < Date.now()) {
    // Abgelaufenen Eintrag gleich aufräumen.
    await admin
      .from("account_deletion_codes")
      .delete()
      .eq("code", codeNormalized);
    return NextResponse.json(
      { error: "Der Code ist abgelaufen. Bitte fordern Sie einen neuen an." },
      { status: 400 }
    );
  }

  const result = await performAccountDeletionByToken(codeRow.token);
  if (!result.ok) {
    if (result.reason === "expired") {
      return NextResponse.json(
        { error: "Der Code ist abgelaufen. Bitte fordern Sie einen neuen an." },
        { status: 400 }
      );
    }
    if (result.reason === "invalid") {
      return NextResponse.json(
        { error: "Code konnte nicht verifiziert werden." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Löschung konnte nicht abgeschlossen werden. Bitte Support kontaktieren." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
