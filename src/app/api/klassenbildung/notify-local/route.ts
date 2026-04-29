import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { decryptSecret, isEncryptionConfigured } from "@/lib/klassenbildung/cryptoServer";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

interface Notification {
  email: string;
  child_name: string;
  parent_name?: string | null;
  assigned_class: number;
  /** Anzeige-Label, z. B. "1a"; falls leer wird "{assigned_class}" verwendet */
  class_label?: string | null;
}

// ── POST: Eltern direkt informieren (für Offline-QR-Wunschzettel,
// die NICHT aus einer Online-Session stammen). Nichts wird in der
// Datenbank gespeichert – die E-Mails kommen direkt aus dem Request. ─
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.notifications)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const schoolName =
    typeof body.school_name === "string"
      ? body.school_name.trim().slice(0, 200) || null
      : null;
  const contactName =
    typeof body.contact_name === "string"
      ? body.contact_name.trim().slice(0, 200) || null
      : null;
  const contactEmail =
    typeof body.contact_email === "string"
      ? body.contact_email.trim().slice(0, 200) || null
      : null;
  const sessionLabel =
    typeof body.session_label === "string"
      ? body.session_label.trim().slice(0, 200) || null
      : null;

  const notifications: Notification[] = (body.notifications as unknown[])
    .filter(
      (n): n is Notification =>
        n !== null &&
        typeof n === "object" &&
        typeof (n as Notification).email === "string" &&
        EMAIL_RE.test((n as Notification).email) &&
        typeof (n as Notification).child_name === "string" &&
        (n as Notification).child_name.length > 0 &&
        Number.isFinite((n as Notification).assigned_class) &&
        (n as Notification).assigned_class >= 1 &&
        (n as Notification).assigned_class <= 20
    )
    .slice(0, 500);

  if (notifications.length === 0) {
    return NextResponse.json({ error: "no_notifications" }, { status: 400 });
  }

  // ── SMTP-Quelle bestimmen: User-eigener Server > System-Fallback ──
  let userSmtp: {
    transporter: nodemailer.Transporter;
    fromHeader: string;
    replyTo: string | null;
    schoolName: string | null;
    schoolLogoUrl: string | null;
  } | null = null;

  const serviceSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
      : null;

  if (serviceSupabase && isEncryptionConfigured()) {
    const { data: cfg } = await serviceSupabase
      .from("klassenbildung_smtp_config")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (cfg) {
      try {
        const password = decryptSecret({
          enc: cfg.password_enc,
          iv: cfg.password_iv,
          tag: cfg.password_tag,
        });
        userSmtp = {
          transporter: nodemailer.createTransport({
            host: cfg.host,
            port: cfg.port,
            secure: cfg.secure,
            auth: { user: cfg.smtp_user, pass: password },
          }),
          fromHeader: cfg.from_name
            ? `${cfg.from_name} <${cfg.from_email}>`
            : cfg.from_email,
          replyTo: cfg.reply_to,
          schoolName: cfg.school_name ?? schoolName,
          schoolLogoUrl: cfg.school_logo_url,
        };
      } catch (e) {
        console.error("[notify-local] decrypt user smtp failed", e);
      }
    }
  }

  const systemSmtpReady =
    !!process.env.SMTP_HOST &&
    !!process.env.SMTP_USER &&
    !!process.env.SMTP_PASSWORD;
  let systemTransporter: nodemailer.Transporter | null = null;
  if (!userSmtp && systemSmtpReady) {
    systemTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASSWORD!,
      },
    });
  }

  const smtpSource: "user" | "system" | "none" = userSmtp
    ? "user"
    : systemTransporter
      ? "system"
      : "none";

  if (smtpSource === "none") {
    return NextResponse.json({
      ok: true,
      mails_sent: 0,
      mails_skipped: notifications.length,
      smtp_source: "none",
      smtp_configured: false,
      eligible_emails: notifications.length,
    });
  }

  const transporter = userSmtp ? userSmtp.transporter : systemTransporter!;
  const fromHeader = userSmtp
    ? userSmtp.fromHeader
    : `DigiKI <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`;
  const replyTo = userSmtp?.replyTo ?? contactEmail ?? undefined;
  const branding = {
    schoolName: userSmtp?.schoolName ?? schoolName ?? sessionLabel ?? null,
    schoolLogoUrl: userSmtp?.schoolLogoUrl ?? null,
    contactName: contactName,
    sessionLabel: sessionLabel ?? "Klassenbildung",
  };

  let sent = 0;
  let skipped = 0;
  for (const n of notifications) {
    const classDisplay = (n.class_label && n.class_label.trim()) || String(n.assigned_class);
    try {
      await transporter.sendMail({
        from: fromHeader,
        to: n.email,
        replyTo,
        subject: `Klassenzuteilung: ${n.child_name} – Klasse ${classDisplay}`,
        html: assignmentEmailHtml({
          childName: n.child_name,
          parentName: n.parent_name ?? null,
          assignedClassLabel: classDisplay,
          sessionName: branding.sessionLabel,
          schoolName: branding.schoolName,
          schoolLogoUrl: branding.schoolLogoUrl,
          contactName: branding.contactName,
          useSchoolBranding: !!userSmtp,
        }),
      });
      sent++;
    } catch (err) {
      console.error("[notify-local] mail failed", err);
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    mails_sent: sent,
    mails_skipped: skipped,
    smtp_source: smtpSource,
    smtp_configured: true,
    eligible_emails: notifications.length,
  });
}

function assignmentEmailHtml({
  childName,
  parentName,
  assignedClassLabel,
  sessionName,
  schoolName,
  schoolLogoUrl,
  contactName,
  useSchoolBranding,
}: {
  childName: string;
  parentName: string | null;
  assignedClassLabel: string;
  sessionName: string;
  schoolName: string | null;
  schoolLogoUrl: string | null;
  contactName: string | null;
  useSchoolBranding: boolean;
}): string {
  const greeting = parentName
    ? `Guten Tag ${escapeHtml(parentName)},`
    : "Guten Tag,";

  const headerHtml = useSchoolBranding
    ? schoolLogoUrl
      ? `<img src="${escapeHtml(schoolLogoUrl)}" alt="${escapeHtml(schoolName ?? "Schule")}" style="display:block;border:0;max-height:80px;max-width:280px;" />`
      : `<p style="margin:0;color:#fff;font-size:18px;font-weight:bold;letter-spacing:0.02em;">${escapeHtml(schoolName ?? sessionName)}</p>`
    : `<img src="https://digiki-os.de/images/logos/DigiKI_Logo_v5.png" alt="DigiKI" width="160" height="73" style="display:block;border:0;" />`;

  const closing = contactName
    ? escapeHtml(contactName) +
      (schoolName ? "<br />" + escapeHtml(schoolName) : "")
    : escapeHtml(schoolName ?? sessionName);

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#F5F9F9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F5F9F9;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;">
        <tr><td align="center" style="background-color:#006363;padding:28px 32px 24px;border-radius:12px 12px 0 0;">
          ${headerHtml}
        </td></tr>
        <tr><td style="height:4px;background:linear-gradient(90deg,#006363 0%,#00cabe 100%);"></td></tr>
        <tr><td style="background-color:#ffffff;padding:36px 32px;border-left:1px solid #DEE8E8;border-right:1px solid #DEE8E8;">
          <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:bold;color:#006363;">Klassenzuteilung für ${escapeHtml(childName)}</h1>
          <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;">${greeting}</p>
          <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
            wir freuen uns, Ihnen die geplante Klassenzuteilung für Ihr Kind <strong>${escapeHtml(childName)}</strong> mitzuteilen.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F5F9F9;border-left:4px solid #006363;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
            <tr><td style="padding:18px 20px;">
              <p style="margin:0 0 4px 0;font-size:13px;color:#555;text-transform:uppercase;letter-spacing:1px;">Vorgesehene Klasse</p>
              <p style="margin:0;font-size:32px;font-weight:bold;color:#006363;">Klasse ${escapeHtml(assignedClassLabel)}</p>
            </td></tr>
          </table>
          <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:14px;line-height:1.6;">
            Wir haben bei der Einteilung soweit möglich Ihre Wünsche, Geschwister-Konstellationen und pädagogische Aspekte berücksichtigt.
          </p>
          <p style="margin:0 0 24px 0;color:#555;font-size:13px;line-height:1.6;background:#FFF7ED;border-left:3px solid #C2410C;padding:10px 14px;border-radius:0 6px 6px 0;">
            <strong>Hinweis:</strong> Bis zum offiziellen Schuljahresbeginn können noch organisatorische Anpassungen erforderlich werden. Sollte sich an der Zuteilung etwas ändern, melden wir uns rechtzeitig erneut bei Ihnen.
          </p>
          <p style="margin:0;color:#1A1A1A;font-size:14px;">Mit freundlichen Grüßen<br /><strong>${closing}</strong></p>
        </td></tr>
        <tr><td style="background-color:#F5F9F9;padding:20px 32px;border:1px solid #DEE8E8;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0;font-size:11px;color:#999999;line-height:1.6;text-align:center;">
            Automatisch versendet über DigiKI Klassenverteilung. Bei Rückfragen wenden Sie sich bitte direkt an die Schule.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
