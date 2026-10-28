import { NextRequest, NextResponse } from "next/server";
import {
  createClient as createAdminClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import {
  createSmtpTransporter,
  escapeHtml,
  getSiteUrl,
  isSmtpConfigured,
  sendAuthCodeMail,
} from "@/lib/email/sendAuthCodeMail";
import { wrapMailing } from "@/lib/email/wrapMailing";
import {
  CONTACT_FORWARD_SETTING_KEY,
  CONTACT_TOPICS,
  MAX_MESSAGE_LENGTH,
  parseForwardRecipients,
} from "@/lib/kontakt";

/**
 * Kontaktformular-Eingang: speichert die Anfrage in `contact_requests`
 * (Admin-Bereich, Tab „Kontakt") und versendet eine automatische
 * Eingangsbestätigung an die absendende Person.
 *
 * Zusätzlich geht eine Kopie an die Weiterleitungs-Adresse(n), die Admins
 * im Tab „Kontakt" pflegen (`app_settings.contact_forward_to`; ohne Zeile
 * Fallback auf die Env `CONTACT_FORWARD_TO`). Reply-To ist die absendende
 * Person, man kann direkt antworten. Leer = keine Weiterleitung.
 */

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

// Fenster-Limiter: max. 3 Anfragen pro IP in 10 Minuten (Schulen teilen
// sich oft eine IP – Kontaktanfragen sind aber selten genug dafür).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  if (hits.size >= 5000) hits.clear();
  hits.set(ip, recent);
  return false;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanStr(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

async function getForwardRecipients(admin: SupabaseClient): Promise<string[]> {
  const { data, error } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", CONTACT_FORWARD_SETTING_KEY)
    .maybeSingle();
  if (error) console.error("[kontakt] Einstellung nicht lesbar:", error);
  const raw =
    !error && data ? (data.value as string) : (process.env.CONTACT_FORWARD_TO ?? "");
  return parseForwardRecipients(raw).valid;
}

/** Weiterleitung einer neuen Anfrage an das Team. Wirft bei Transportfehlern. */
async function forwardToTeam(
  to: string[],
  req: {
    name: string;
    email: string;
    schoolName: string;
    topic: string | null;
    message: string;
  },
): Promise<void> {
  const adminUrl = `${getSiteUrl()}/best-practice/admin/kontakt`;
  const row = (label: string, value: string) =>
    `<p style="margin:0 0 4px 0;color:#555555;font-size:13px;"><strong>${label}:</strong> ${value}</p>`;

  const html = wrapMailing({
    eyebrow: "Kontaktformular",
    heading: "Neue Kontaktanfrage",
    preheader: `${req.name}${req.topic ? ` – ${req.topic}` : ""}`,
    bodyHtml: `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #006363;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:14px 16px;">
                    ${row("Name", escapeHtml(req.name))}
                    ${row("E-Mail", `<a href="mailto:${escapeHtml(req.email)}" style="color:#006363;">${escapeHtml(req.email)}</a>`)}
                    ${req.schoolName ? row("Schule", escapeHtml(req.schoolName)) : ""}
                    ${req.topic ? row("Anliegen", escapeHtml(req.topic)) : ""}
                    <p style="margin:8px 0 0 0;color:#1A1A1A;font-size:14px;line-height:1.6;">${escapeHtml(req.message).replace(/\n/g, "<br />")}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px 0;color:#1A1A1A;font-size:14px;line-height:1.6;">
                Antworten auf diese E-Mail gehen direkt an die absendende Person.
                Bitte setzen Sie den Status anschließend im Admin-Bereich:
              </p>
              <p style="margin:0;font-size:14px;">
                <a href="${escapeHtml(adminUrl)}" style="color:#006363;font-weight:bold;">Kontaktanfragen im Admin-Bereich öffnen</a>
              </p>`,
  });

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  await createSmtpTransporter().sendMail({
    from: `DigiKI Kontaktformular <${from}>`,
    to,
    replyTo: { name: req.name, address: req.email },
    subject: `Kontaktanfrage: ${req.topic ?? "Allgemein"} – ${req.name}`,
    html,
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Honeypot: Menschen sehen das Feld nicht. Ist es gefüllt, tun wir so,
  // als wäre alles gut – ohne zu speichern oder zu mailen.
  if (cleanStr(body.website, 10)) {
    return NextResponse.json({ ok: true, mailSent: false });
  }

  const name = cleanStr(body.name, 150);
  const email = cleanStr(body.email, 200).toLowerCase();
  const schoolName = cleanStr(body.school_name, 200);
  const topicRaw = cleanStr(body.topic, 100);
  const message = cleanStr(body.message, MAX_MESSAGE_LENGTH);

  if (!name || !message || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const topic = (CONTACT_TOPICS as readonly string[]).includes(topicRaw)
    ? topicRaw
    : null;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error("[kontakt] Supabase-Env fehlt – Anfrage nicht speicherbar.");
    return NextResponse.json({ error: "config" }, { status: 503 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error: insertError } = await admin.from("contact_requests").insert({
    name,
    email,
    school_name: schoolName || null,
    topic,
    message,
  });

  if (insertError) {
    console.error("[kontakt] Insert fehlgeschlagen:", insertError);
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  // Weiterleitung ans Team – Fehler nur loggen, die Anfrage ist gespeichert.
  if (isSmtpConfigured()) {
    try {
      const forwardTo = await getForwardRecipients(admin);
      if (forwardTo.length > 0) {
        await forwardToTeam(forwardTo, { name, email, schoolName, topic, message });
      }
    } catch (err) {
      console.error("[kontakt] Weiterleitung fehlgeschlagen:", err);
    }
  }

  // Eingangsbestätigung – ein Fehler hier macht die gespeicherte Anfrage
  // nicht ungültig, das Formular meldet den Mail-Status separat.
  let mailSent = false;
  if (isSmtpConfigured()) {
    try {
      const messageHtml = escapeHtml(message).replace(/\n/g, "<br />");
      await sendAuthCodeMail({
        to: email,
        subject: "Ihre Anfrage ist eingegangen – DigiKI",
        eyebrow: "Eingangsbestätigung",
        heading: "Vielen Dank für Ihre Nachricht",
        preheader:
          "Ihre Anfrage ist beim DigiKI-Team eingegangen – wir melden uns so schnell wie möglich.",
        introHtml: `
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;">Guten Tag ${escapeHtml(name)},</p>
              <p style="margin:0 0 20px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                vielen Dank für Ihre Nachricht über das Kontaktformular. Ihre
                Anfrage ist beim DigiKI-Team eingegangen und wird so schnell
                wie möglich bearbeitet – wir melden uns zeitnah bei Ihnen.
              </p>`,
        extraHtml: `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #006363;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-weight:bold;color:#006363;font-size:14px;">Ihre Nachricht im Überblick</p>
                    ${topic ? `<p style="margin:0 0 4px 0;color:#555555;font-size:13px;"><strong>Anliegen:</strong> ${escapeHtml(topic)}</p>` : ""}
                    ${schoolName ? `<p style="margin:0 0 4px 0;color:#555555;font-size:13px;"><strong>Schule:</strong> ${escapeHtml(schoolName)}</p>` : ""}
                    <p style="margin:8px 0 0 0;color:#555555;font-size:13px;line-height:1.6;">${messageHtml}</p>
                  </td>
                </tr>
              </table>`,
        footerNoteHtml:
          "Diese Eingangsbestätigung wurde automatisch versendet – bitte antworten Sie nicht direkt auf diese E-Mail. Für Rückfragen nutzen Sie einfach erneut das Kontaktformular auf der DigiKI-Website.",
      });
      mailSent = true;
    } catch (err) {
      console.error("[kontakt] Eingangsbestätigung fehlgeschlagen:", err);
    }
  } else {
    console.warn("[kontakt] SMTP nicht konfiguriert – keine Eingangsbestätigung.");
  }

  return NextResponse.json({ ok: true, mailSent });
}
