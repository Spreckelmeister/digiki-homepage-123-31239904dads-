import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/schulungen/server";
import { isSchoolRegistered } from "@/lib/material/server";

// Vorab-Prüfung für das Bestandsaufnahme-Formular: Ist diese Schule schon
// registriert? So erfährt eine Lehrkraft das nach dem ersten Abschnitt –
// nicht erst nach 39 Fragen. Die verbindliche Prüfung macht die
// Registrierung selbst (/api/register-bestandsaufnahme).

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

// 10 Anfragen je Minute je IP.
const rateMap = new Map<string, { count: number; windowStart: number }>();

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.windowStart > 60_000) {
    if (rateMap.size >= 5000) rateMap.clear();
    rateMap.set(ip, { count: 1, windowStart: now });
  } else if (++entry.count > 10) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { schoolName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const schoolName =
    typeof body.schoolName === "string" ? body.schoolName.trim().slice(0, 200) : "";
  if (
    schoolName.length < 3 ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json({ registered: false });
  }

  // Angemeldetes Konto (holt die Bestandsaufnahme nach): sich selbst ausnehmen.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const registered = await isSchoolRegistered(
    createServiceClient(),
    schoolName,
    user?.id ?? null
  );
  return NextResponse.json({ registered: registered === true });
}
