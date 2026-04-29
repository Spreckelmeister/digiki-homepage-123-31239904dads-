import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { decryptSecret, isEncryptionConfigured } from "@/lib/klassenbildung/cryptoServer";

interface Params {
  params: Promise<{ id: string }>;
}

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

interface AssignmentInput {
  registration_id: string;
  assigned_class: number;
  /** Anzeige-Label, z. B. "1a"; falls leer wird die Zahl verwendet */
  class_label?: string;
}

// ── POST: Klassenzuteilung speichern + Eltern benachrichtigen ─────
export async function POST(req: NextRequest, { params }: Params) {
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id: sessionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.assignments)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const dryRun = body.dry_run === true;

  // Owner-Check + Session-Daten
  const { data: session } = await supabase
    .from("klassenbildung_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const assignments: AssignmentInput[] = body.assignments
    .filter(
      (a: unknown): a is AssignmentInput =>
        a !== null &&
        typeof a === "object" &&
        typeof (a as AssignmentInput).registration_id === "string" &&
        Number.isFinite((a as AssignmentInput).assigned_class) &&
        (a as AssignmentInput).assigned_class >= 1 &&
        (a as AssignmentInput).assigned_class <= 20
    )
    .slice(0, 500);

  if (assignments.length === 0) {
    return NextResponse.json({ error: "no_assignments" }, { status: 400 });
  }

  // Registrations laden (für Email-Adressen + Names)
  const regIds = assignments.map((a) => a.registration_id);
  const { data: regs } = await supabase
    .from("klassenbildung_registrations")
    .select("id, child_name, parent_email, parent_name, assigned_class, session_id")
    .in("id", regIds);

  if (!regs) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  // Schutz: alle Registrations gehören zu unserer Session
  for (const r of regs) {
    if (r.session_id !== sessionId) {
      return NextResponse.json(
        { error: "registration_mismatch" },
        { status: 400 }
      );
    }
  }

  // Map: registration_id → assigned_class
  const classByReg = new Map<string, number>();
  const labelByReg = new Map<string, string>();
  for (const a of assignments) {
    classByReg.set(a.registration_id, a.assigned_class);
    if (typeof a.class_label === "string" && a.class_label.trim()) {
      labelByReg.set(a.registration_id, a.class_label.trim());
    }
  }

  // ── 1) DB-Updates (assigned_class), wenn nicht dry-run ──────────
  let updatedCount = 0;
  if (!dryRun) {
    // Single-row updates – einfach und nachvollziehbar.
    for (const r of regs) {
      const cls = classByReg.get(r.id);
      if (typeof cls !== "number") continue;
      const { error } = await supabase
        .from("klassenbildung_registrations")
        .update({ assigned_class: cls, updated_at: new Date().toISOString() })
        .eq("id", r.id);
      if (!error) updatedCount++;
    }
    // Session auf 'assigned' setzen
    await supabase
      .from("klassenbildung_sessions")
      .update({ status: "assigned", updated_at: new Date().toISOString() })
      .eq("id", sessionId);
  }

  // ── 2) E-Mails versenden ────────────────────────────────────────
  // Reihenfolge der Quellen:
  //   1. Eigener SMTP-Server der Lehrkraft (Schul-Branding möglich).
  //   2. Fallback: DigiKI-System-SMTP via Env-Vars.
  //
  // Klassenzuteilungen werden immer in der DB gespeichert; Mails
  // werden übersprungen, falls weder noch verfügbar ist.
  let mailsSent = 0;
  let mailsSkipped = 0;

  const serviceSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
      : null;

  // Eigener SMTP der Lehrkraft (primär)
  let userSmtp: {
    transporter: nodemailer.Transporter;
    fromHeader: string;
    replyTo: string | null;
    schoolName: string | null;
    schoolLogoUrl: string | null;
  } | null = null;
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
          schoolName: cfg.school_name ?? session.school_name,
          schoolLogoUrl: cfg.school_logo_url,
        };
      } catch (e) {
        console.error("[klassenbildung notify] decrypt user smtp failed", e);
      }
    }
  }

  // Fallback: Checkdomain-SMTP für die Klassenverteilung.
  // BEWUSST nicht der allgemeine SMTP_*-Pool (= Resend), damit das
  // Resend-Kontingent unangetastet bleibt. Diese Mails laufen über
  // einen separaten Checkdomain-Account.
  // Env-Vars: KV_SMTP_HOST, KV_SMTP_PORT, KV_SMTP_USER,
  //           KV_SMTP_PASSWORD, KV_SMTP_FROM, KV_SMTP_SECURE
  const systemSmtpReady =
    !!process.env.KV_SMTP_HOST &&
    !!process.env.KV_SMTP_USER &&
    !!process.env.KV_SMTP_PASSWORD;
  let systemTransporter: nodemailer.Transporter | null = null;
  if (!userSmtp && systemSmtpReady) {
    systemTransporter = nodemailer.createTransport({
      host: process.env.KV_SMTP_HOST,
      port: parseInt(process.env.KV_SMTP_PORT ?? "587"),
      secure: process.env.KV_SMTP_SECURE === "true",
      auth: {
        user: process.env.KV_SMTP_USER!,
        pass: process.env.KV_SMTP_PASSWORD!,
      },
    });
  }

  const smtpSource: "user" | "system" | "none" = userSmtp
    ? "user"
    : systemTransporter
      ? "system"
      : "none";

  if (smtpSource !== "none" && !dryRun) {
    const transporter = userSmtp ? userSmtp.transporter : systemTransporter!;
    const fromHeader = userSmtp
      ? userSmtp.fromHeader
      : `DigiKI <${process.env.KV_SMTP_FROM ?? process.env.KV_SMTP_USER}>`;
    const replyTo =
      userSmtp?.replyTo ?? session.contact_email ?? undefined;
    const branding = {
      schoolName: userSmtp?.schoolName ?? session.school_name,
      schoolLogoUrl: userSmtp?.schoolLogoUrl ?? null,
      sessionName: session.name,
    };

    for (const r of regs) {
      const cls = classByReg.get(r.id);
      if (!r.parent_email || typeof cls !== "number") {
        mailsSkipped++;
        continue;
      }
      const classDisplay = labelByReg.get(r.id) ?? String(cls);
      try {
        await transporter.sendMail({
          from: fromHeader,
          to: r.parent_email,
          replyTo,
          subject: `Klassenzuteilung: ${r.child_name} – Klasse ${classDisplay}`,
          html: assignmentEmailHtml({
            childName: r.child_name,
            parentName: r.parent_name ?? null,
            assignedClassLabel: classDisplay,
            sessionName: branding.sessionName,
            schoolName: branding.schoolName,
            schoolLogoUrl: branding.schoolLogoUrl,
            useSchoolBranding: !!userSmtp,
          }),
        });
        mailsSent++;
        if (serviceSupabase) {
          await serviceSupabase
            .from("klassenbildung_registrations")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", r.id);
        }
      } catch (err) {
        console.error("[klassenbildung notify] mail failed", err);
        mailsSkipped++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    updated_assignments: updatedCount,
    mails_sent: mailsSent,
    mails_skipped: mailsSkipped,
    smtp_source: smtpSource,
    smtp_configured: smtpSource !== "none",
    eligible_emails: regs.filter((r) => r.parent_email).length,
  });
}

function assignmentEmailHtml({
  childName,
  parentName,
  assignedClassLabel,
  sessionName,
  schoolName,
  schoolLogoUrl,
  useSchoolBranding,
}: {
  childName: string;
  parentName: string | null;
  assignedClassLabel: string;
  sessionName: string;
  schoolName: string | null;
  schoolLogoUrl: string | null;
  useSchoolBranding: boolean;
}): string {
  const greeting = parentName
    ? `Guten Tag ${escapeHtml(parentName)},`
    : "Guten Tag,";

  // Header: Schul-Branding nur wenn eigener SMTP läuft (sonst wäre der
  // Absender DigiKI, das Logo aber Schule → Phishing-Optik).
  const headerHtml = useSchoolBranding
    ? schoolLogoUrl
      ? `<img src="${escapeHtml(schoolLogoUrl)}" alt="${escapeHtml(schoolName ?? "Schule")}" style="display:block;border:0;max-height:80px;max-width:280px;" />`
      : `<p style="margin:0;color:#fff;font-size:18px;font-weight:bold;letter-spacing:0.02em;">${escapeHtml(schoolName ?? sessionName)}</p>`
    : `<img src="https://digiki-os.de/images/logos/DigiKI_Logo_v5.png" alt="DigiKI" width="160" height="73" style="display:block;border:0;" />`;

  const footerNote = useSchoolBranding
    ? `Automatisch versendet von ${escapeHtml(schoolName ?? sessionName)} über DigiKI Klassenverteilung. Bei Rückfragen wenden Sie sich bitte direkt an die Schule.`
    : `Automatisch versendet über das DigiKI-Tool „Klassenverteilung". Bei Rückfragen wenden Sie sich bitte direkt an die Schule.`;

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
          <p style="margin:0;color:#1A1A1A;font-size:14px;">Mit freundlichen Grüßen<br /><strong>${escapeHtml(sessionName)}${schoolName ? " · " + escapeHtml(schoolName) : ""}</strong></p>
        </td></tr>
        <tr><td style="background-color:#F5F9F9;padding:20px 32px;border:1px solid #DEE8E8;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0;font-size:11px;color:#999999;line-height:1.6;text-align:center;">
            ${footerNote}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
