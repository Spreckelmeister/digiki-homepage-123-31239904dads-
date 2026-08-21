import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  isSmtpConfigured,
  sendAuthCodeMail,
  getSiteUrl,
  type SendAuthCodeMailOptions,
} from "@/lib/email/sendAuthCodeMail";

/**
 * Gemeinsames Gerüst der Code-Anforderungs-Routen (Login + Passwort-Reset).
 *
 * Enumeration-sicher: Ob ein Konto existiert, verrät die Antwort nie –
 * „user not found" und Mail-Transportfehler liefern trotzdem {ok:true}.
 * Nur Konfigurationsfehler (SMTP fehlt) sind ein ehrliches 503, weil sie
 * für JEDE Adresse identisch gelten.
 */

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

// Primäre Bremse: 60 s pro E-Mail-Adresse (deckt sich mit dem sichtbaren
// „Code erneut senden"-Countdown im UI). Schlüssel enthält die Art des
// Codes, damit Login- und Recovery-Anforderung sich nicht blockieren.
const emailRateMap = new Map<string, number>();
const EMAIL_COOLDOWN_MS = 60_000;

// Sekundäre Bremse pro IP – bewusst großzügig (20/10 min), weil ganze
// Schulen hinter einer NAT-IP sitzen (Muster aus confirm-delete-code).
const ipRateMap = new Map<string, { count: number; windowStart: number }>();
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX_REQUESTS = 20;

function ipLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipRateMap.get(ip);
  if (!entry || now - entry.windowStart > IP_WINDOW_MS) {
    ipRateMap.set(ip, { count: 1, windowStart: now });
    if (ipRateMap.size >= 5000) {
      for (const [key, value] of ipRateMap) {
        if (now - value.windowStart > IP_WINDOW_MS) ipRateMap.delete(key);
      }
    }
    return false;
  }
  entry.count += 1;
  return entry.count > IP_MAX_REQUESTS;
}

function isEmailValid(email: string): boolean {
  return email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export interface AuthCodeRequestConfig {
  /** Präfix für den E-Mail-Rate-Limit-Schlüssel (z.B. "login"). */
  kind: string;
  /** Welcher OTP-Typ gemintet wird. */
  linkType: "magiclink" | "recovery";
  /** Baut die Mail; `code` ist der frische Einmal-Code. */
  buildMail: (args: {
    email: string;
    code: string;
    siteUrl: string;
  }) => Omit<SendAuthCodeMailOptions, "to">;
}

export async function handleAuthCodeRequest(
  request: NextRequest,
  config: AuthCodeRequestConfig
): Promise<NextResponse> {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.email !== "string") {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  const email = body.email.trim().toLowerCase();
  if (!isEmailValid(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (ipLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const emailKey = `${config.kind}:${email}`;
  const now = Date.now();
  const lastSent = emailRateMap.get(emailKey) ?? 0;
  if (now - lastSent < EMAIL_COOLDOWN_MS) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (emailRateMap.size >= 5000) emailRateMap.clear();
  emailRateMap.set(emailKey, now);

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json({ error: "server_config" }, { status: 500 });
  }
  if (!isSmtpConfigured()) {
    // Ehrliches, adressunabhängiges Signal – Client bietet dann den
    // Passwort-Weg an.
    return NextResponse.json({ error: "mail_unavailable" }, { status: 503 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Der Link selbst wird NIE verwendet – wir brauchen nur den Einmal-Code
  // (properties.email_otp). Fehler (unbekannte Adresse etc.) werden bewusst
  // verschluckt: Antwort bleibt {ok:true} (Enumeration-Schutz).
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: config.linkType,
      email,
    });

  const code = linkData?.properties?.email_otp ?? "";
  if (linkError || !code) {
    console.info(
      `[request-${config.kind}-code] kein Code für Anfrage:`,
      linkError?.message ?? "email_otp fehlt"
    );
    return NextResponse.json({ ok: true });
  }

  try {
    const mail = config.buildMail({ email, code, siteUrl: getSiteUrl() });
    await sendAuthCodeMail({ ...mail, to: email });
  } catch (mailError) {
    // Transportfehler nicht an den Client melden – ein Fehler NUR für
    // existierende Konten wäre ein Enumerations-Leck.
    console.error(`[request-${config.kind}-code] Mail-Fehler:`, mailError);
  }

  return NextResponse.json({ ok: true });
}
