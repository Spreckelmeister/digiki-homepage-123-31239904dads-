import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";
import { wrapMailing } from "@/lib/email/wrapMailing";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

type SendBody = {
  subject?: unknown;
  html?: unknown;
  useWrapper?: unknown;
  eyebrow?: unknown;
  heading?: unknown;
  preheader?: unknown;
  mode?: unknown; // "test" | "bulk"
  audience?: unknown; // "all" | "confirmed"
  testEmail?: unknown;
};

/**
 * Versendet eine Admin-Mailing an entweder genau eine Test-Adresse oder
 * an alle Account-E-Mails (gefiltert nach Bestätigungsstatus).
 *
 * Antwortet mit Counts (sent/failed) plus den fehlgeschlagenen Adressen,
 * damit das Frontend einen klaren Report anzeigen kann.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD
  ) {
    return NextResponse.json(
      { error: "Mail-Versand ist serverseitig nicht konfiguriert" },
      { status: 500 },
    );
  }

  // Auth (Admin-only)
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

  // Body parsen + validieren
  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const html = typeof body.html === "string" ? body.html : "";
  const useWrapper = body.useWrapper !== false; // Default: true
  const eyebrow = typeof body.eyebrow === "string" ? body.eyebrow.trim() : "";
  const heading = typeof body.heading === "string" ? body.heading.trim() : "";
  const preheader = typeof body.preheader === "string" ? body.preheader.trim() : "";
  const mode = body.mode === "bulk" ? "bulk" : "test";
  const audience = body.audience === "all" ? "all" : "confirmed";
  const testEmail =
    typeof body.testEmail === "string" ? body.testEmail.trim() : "";

  if (!subject || subject.length > 200) {
    return NextResponse.json(
      { error: "Betreff fehlt oder ist zu lang." },
      { status: 400 },
    );
  }
  if (!html.trim()) {
    return NextResponse.json(
      { error: "Der HTML-Inhalt ist leer." },
      { status: 400 },
    );
  }

  // Empfänger bestimmen
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let recipients: string[] = [];

  if (mode === "test") {
    if (!testEmail || !testEmail.includes("@")) {
      return NextResponse.json(
        { error: "Bitte eine gültige Test-E-Mail angeben." },
        { status: 400 },
      );
    }
    recipients = [testEmail];
  } else {
    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersError) {
      return NextResponse.json(
        { error: "Empfängerliste konnte nicht geladen werden" },
        { status: 500 },
      );
    }
    recipients = usersData.users
      .filter((u) => !!u.email)
      .filter((u) =>
        audience === "confirmed" ? !!u.email_confirmed_at : true,
      )
      .map((u) => u.email as string);

    // Duplikate raus (case-insensitive)
    const seen = new Set<string>();
    recipients = recipients.filter((e) => {
      const k = e.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "Keine Empfänger gefunden." },
      { status: 400 },
    );
  }

  // HTML wrappen oder roh nutzen
  const finalHtml = useWrapper
    ? wrapMailing({ bodyHtml: html, eyebrow, heading, preheader })
    : html;

  // SMTP-Transport (Resend o.ä.)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  const from = `DigiKI <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`;

  // Einzelversand (KEIN BCC – DSGVO: Empfänger sollen sich nicht
  // gegenseitig sehen). Kleine Pause zwischen Mails, damit der SMTP-
  // Provider nicht in Rate-Limits läuft.
  const failed: { email: string; error: string }[] = [];
  let sent = 0;
  for (const to of recipients) {
    try {
      await transporter.sendMail({
        from,
        to,
        subject,
        html: finalHtml,
      });
      sent++;
    } catch (err) {
      failed.push({
        email: to,
        error: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    }
    // kleine Atempause (50 ms) – reicht bei Resend mit Standard-Limit
    await new Promise((r) => setTimeout(r, 50));
  }

  return NextResponse.json({
    ok: true,
    mode,
    total: recipients.length,
    sent,
    failed,
  });
}
