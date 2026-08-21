import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createDeletionToken } from "@/lib/deletionToken";
import {
  escapeHtml,
  isSmtpConfigured,
  sendAuthCodeMail,
} from "@/lib/email/sendAuthCodeMail";

export const runtime = "nodejs";

// Ambiguitäts-freies Alphabet: keine 0/O, 1/I/L – leichter abzutippen.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

function generateShortCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

// Rate-Limit: max 1 Löschanfrage pro 60 Sekunden pro User-ID.
// Verhindert Missbrauch, wenn jemand anderes kurz Sessionzugang hatte.
const rateMap = new Map<string, number>();

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const now = Date.now();
  const lastSent = rateMap.get(user.id) ?? 0;
  if (now - lastSent < 60_000) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (rateMap.size >= 5000) rateMap.clear();
  rateMap.set(user.id, now);

  let body: { password?: unknown; deleteBestPractices?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { password, deleteBestPractices } = body;
  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "Passwort fehlt" }, { status: 400 });
  }
  const shouldDeleteBP = deleteBestPractices === true;

  // Passwort serverseitig verifizieren (separater Anon-Client, damit die
  // bestehende Session unberührt bleibt).
  const verifier = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error: pwError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (pwError) {
    return NextResponse.json(
      { error: "Passwort ist nicht korrekt." },
      { status: 401 }
    );
  }

  // Token erzeugen und per Mail versenden – noch KEIN Löschen. Der Token
  // wandert NUR in die Code-Tabelle („Code statt Link"): Die Mail enthält
  // keinen Bestätigungs-Link mehr, den ein Mail-Scanner per GET auslösen
  // könnte – gelöscht wird ausschließlich per Code-Eingabe im Konto-Dialog.
  const token = createDeletionToken(user.id, user.email, shouldDeleteBP);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://digiki-os.de").replace(/\/$/, "");

  // 8-Zeichen-Fallback-Code anlegen – wird in account_deletion_codes
  // gespeichert, damit der User den Code statt des Links einlösen kann,
  // falls E-Mail-Scanner den Link unbrauchbar machen.
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Alte, evtl. noch ausstehende Codes desselben Users invalidieren – sonst
  // könnten mehrere parallele Codes existieren, was verwirrt.
  try {
    await admin
      .from("account_deletion_codes")
      .delete()
      .ilike("email", user.email);
  } catch {
    /* Cleanup ist nicht fatal */
  }

  // Code generieren + einfügen mit Kollisions-Retry (theoretisch möglich,
  // praktisch extrem selten bei 31^8 ≈ 10^11 Kombinationen).
  let shortCode = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateShortCode();
    const { error: insertError } = await admin
      .from("account_deletion_codes")
      .insert({
        code: candidate,
        token,
        email: user.email,
        expires_at: expiresAt,
      });
    if (!insertError) {
      shortCode = candidate;
      break;
    }
    if (!insertError.message?.toLowerCase().includes("duplicate")) {
      console.error(
        "[account/request-delete] code insert error:",
        insertError.message
      );
      return NextResponse.json(
        { error: "Fallback-Code konnte nicht angelegt werden." },
        { status: 500 }
      );
    }
  }
  if (!shortCode) {
    return NextResponse.json(
      { error: "Fallback-Code konnte nicht angelegt werden." },
      { status: 500 }
    );
  }

  if (!isSmtpConfigured()) {
    console.error("[account/request-delete] SMTP not configured");
    return NextResponse.json(
      { error: "Mailversand ist aktuell nicht möglich. Bitte später erneut versuchen." },
      { status: 500 }
    );
  }

  try {
    const emailSafe = escapeHtml(user.email);

    await sendAuthCodeMail({
      to: user.email,
      subject: "Konto-Löschung bestätigen – DigiKI",
      eyebrow: "Konto-Löschung",
      heading: "Bitte bestätigen Sie die Löschung Ihres Kontos",
      preheader: "Ihr 8-stelliger Bestätigungscode für die Konto-Löschung.",
      introHtml: `
              <p style="margin:0 0 20px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                Sie haben soeben die Löschung Ihres DigiKI-Zugangs
                (<strong>${emailSafe}</strong>) angefordert. Bevor wir Ihr Konto
                endgültig entfernen, benötigen wir eine Bestätigung von dieser
                E-Mail-Adresse.
              </p>`,
      codeLeadHtml:
        '<strong style="color:#B91C1C;">Konto endgültig löschen:</strong> Geben Sie diesen 8-stelligen Code im geöffneten Bestätigungsfenster Ihrer Konto-Einstellungen ein. Erst mit der Code-Eingabe werden Ihr Zugang, Ihr Profil, Ihre Bestandsaufnahmen und alle eingereichten Anträge unwiderruflich entfernt:',
      code: shortCode,
      validityHtml:
        "Der Code ist <strong>24 Stunden</strong> gültig und nur einmal verwendbar. Solange Sie ihn nicht eingeben, bleibt Ihr Konto unverändert aktiv.",
      pageUrl: `${siteUrl}/best-practice/konto`,
      pageLabel:
        "Fenster geschlossen? In Ihren Konto-Einstellungen können Sie den Vorgang jederzeit neu starten:",
      pageUrlText: "digiki-os.de/best-practice/konto",
      extraHtml: `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #006363;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-weight:bold;color:#006363;font-size:14px;">
                      Sie haben das nicht angefordert?
                    </p>
                    <p style="margin:0;color:#555555;font-size:14px;line-height:1.5;">
                      Ignorieren Sie diese E-Mail einfach. Ohne Eingabe des
                      Codes geschieht nichts – Ihr Konto bleibt bestehen. Zur
                      Sicherheit empfehlen wir, Ihr Passwort zu ändern.
                    </p>
                  </td>
                </tr>
              </table>`,
    });
  } catch (emailErr) {
    console.error("[account/request-delete] Email error:", emailErr);
    return NextResponse.json(
      { error: "Bestätigungsmail konnte nicht versendet werden. Bitte später erneut versuchen." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, email: user.email });
}
