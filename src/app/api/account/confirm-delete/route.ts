import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { verifyDeletionToken } from "@/lib/deletionToken";

export const runtime = "nodejs";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function redirectTo(request: NextRequest, status: "ok" | "invalid" | "expired" | "error"): NextResponse {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const target = new URL("/konto-geloescht", base);
  target.searchParams.set("status", status);
  return NextResponse.redirect(target, { status: 303 });
}

export async function GET(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error("[account/confirm-delete] Supabase env vars missing");
    return redirectTo(request, "error");
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return redirectTo(request, "invalid");

  const verified = verifyDeletionToken(token);
  if (!verified.ok) {
    return redirectTo(request, verified.reason === "expired" ? "expired" : "invalid");
  }
  const { userId, email, deleteBestPractices } = verified.payload;

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // User existiert noch? Sonst: doppelter Klick auf den Link – idempotent.
  const { data: existing } = await admin.auth.admin.getUserById(userId);
  if (!existing?.user) {
    return redirectTo(request, "ok");
  }

  // Zählen, was gelöscht werden wird – brauchen wir für die Success-Mail.
  const [baRes, toolsRes, studentsRes, bpRes] = await Promise.all([
    admin
      .from("bestandsaufnahme_responses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("applications_tool_licenses")
      .select("id", { count: "exact", head: true })
      .ilike("email", email),
    admin
      .from("applications_student_assistants")
      .select("id", { count: "exact", head: true })
      .ilike("email", email),
    admin
      .from("best_practices")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId),
  ]);
  const counts = {
    bestandsaufnahmen: baRes.count ?? 0,
    toolApps: toolsRes.count ?? 0,
    studentApps: studentsRes.count ?? 0,
    bestPractices: bpRes.count ?? 0,
  };

  // Löschen in derselben Reihenfolge wie die alte Route – FK-sicher.
  await admin.from("bestandsaufnahme_responses").delete().eq("user_id", userId);
  await admin.from("applications_tool_licenses").delete().ilike("email", email);
  await admin.from("applications_student_assistants").delete().ilike("email", email);

  if (deleteBestPractices) {
    await admin.from("best_practices").delete().eq("author_id", userId);
  } else {
    await admin
      .from("best_practices")
      .update({ author_id: null })
      .eq("author_id", userId);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error(
      "[account/confirm-delete] auth.admin.deleteUser:",
      deleteError.message
    );
    return redirectTo(request, "error");
  }

  // ── Erfolgs-Mail (Löschnachweis) ──────────────────────────────────────────
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  ) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      const emailSafe = escapeHtml(email);
      const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

      const now = new Date();
      const formattedDate = new Intl.DateTimeFormat("de-DE", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Berlin",
      }).format(now);
      const transactionId = `DEL-${now.getTime().toString(36).toUpperCase()}-${userId.slice(0, 8).toUpperCase()}`;

      const line = (label: string, count: number, kept = false) => {
        if (count === 0) return "";
        const suffix = kept ? " – anonymisiert erhalten" : "";
        return `<li style="margin:0 0 4px 0;">${escapeHtml(label)} (${count})${suffix}</li>`;
      };

      const listItems =
        line("Bestandsaufnahmen", counts.bestandsaufnahmen) +
        line("Tool-Lizenz-Anträge", counts.toolApps) +
        line("Hilfskräfte-Anträge", counts.studentApps) +
        line(
          "Best-Practice-Beiträge",
          counts.bestPractices,
          !deleteBestPractices
        );

      const allZero =
        counts.bestandsaufnahmen === 0 &&
        counts.toolApps === 0 &&
        counts.studentApps === 0 &&
        counts.bestPractices === 0;

      const dataBlock = allZero
        ? `<p style="margin:0;color:#1A1A1A;font-size:14px;line-height:1.5;">
             Zum Zeitpunkt der Löschung lagen keine verknüpften Einreichungen
             oder Beiträge vor.
           </p>`
        : `<ul style="margin:0;padding-left:20px;color:#1A1A1A;font-size:14px;line-height:1.6;">
             ${listItems}
           </ul>`;

      const html = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#F5F9F9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background-color:#F5F9F9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:560px;width:100%;">
          <!-- Logo-Header -->
          <tr>
            <td align="center"
              style="background-color:#006363;padding:28px 32px 24px;border-radius:12px 12px 0 0;">
              <img src="https://digiki-os.de/images/logos/DigiKI_Logo_v5.png"
                alt="DigiKI – Grundschulen Osnabrück"
                width="160" height="73"
                style="display:block;border:0;" />
            </td>
          </tr>
          <!-- Farbbalken -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#006363 0%,#00cabe 100%);"></td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 32px;
              border-left:1px solid #DEE8E8;border-right:1px solid #DEE8E8;">
              <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:bold;color:#006363;">
                Ihr DigiKI-Konto wurde gelöscht
              </h1>
              <p style="margin:0 0 24px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                Die Löschung des Zugangs zu <strong>${emailSafe}</strong> ist
                abgeschlossen. Nachfolgend finden Sie den Nachweis der entfernten
                Daten.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #006363;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px 0;font-weight:bold;color:#006363;font-size:15px;">
                      Entfernte Daten
                    </p>
                    ${dataBlock}
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #AB7A0E;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-weight:bold;color:#006363;font-size:14px;">
                      Protokoll
                    </p>
                    <p style="margin:0 0 4px 0;color:#1A1A1A;font-size:14px;line-height:1.5;">
                      Zeitpunkt: <strong>${escapeHtml(formattedDate)}</strong> (Europe/Berlin)
                    </p>
                    <p style="margin:0;color:#555555;font-size:13px;line-height:1.5;">
                      Vorgangs-ID: <span style="font-family:'Courier New',Courier,monospace;">${escapeHtml(transactionId)}</span>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                Sollten Sie die Löschung nicht selbst ausgelöst haben oder Fragen
                zum Vorgang haben, melden Sie sich bitte zeitnah bei Kai Krafft
                (<a href="mailto:krafft@osnabrueck.de" style="color:#006363;">krafft@osnabrueck.de</a>).
              </p>

              <p style="margin:0;color:#1A1A1A;font-size:15px;">
                Vielen Dank, dass Sie Teil des DigiKI-Projekts waren.<br />
                <strong>Das DigiKI-Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#F5F9F9;padding:20px 32px;
              border:1px solid #DEE8E8;border-top:none;
              border-radius:0 0 12px 12px;">
              <p style="margin:0;font-size:11px;color:#999999;line-height:1.6;text-align:center;">
                Diese E-Mail wurde automatisch versendet – bitte nicht antworten.<br />
                DigiKI – Digitalisierung &amp; Künstliche Intelligenz an Grundschulen Osnabrück<br />
                Kai Krafft · Bildungskoordinator im Fachbereich 40-3 Bildung, Stadt Osnabrück ·
                <a href="mailto:krafft@osnabrueck.de" style="color:#006363;text-decoration:none;">krafft@osnabrueck.de</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      await transporter.sendMail({
        from: `DigiKI <${from}>`,
        to: email,
        subject: "Konto gelöscht – Bestätigung (DigiKI)",
        html,
      });
    } catch (emailErr) {
      // Email-Fehler sind nicht fatal – der Account ist tatsächlich gelöscht.
      console.error("[account/confirm-delete] Success email error:", emailErr);
    }
  }

  return redirectTo(request, "ok");
}
