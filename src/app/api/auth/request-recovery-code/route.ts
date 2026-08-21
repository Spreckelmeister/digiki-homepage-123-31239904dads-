import { NextRequest } from "next/server";
import { handleAuthCodeRequest } from "@/lib/auth/requestAuthCode";
import { OTP_LENGTH_LABEL } from "@/lib/email/sendAuthCodeMail";

export const runtime = "nodejs";

/**
 * Fordert einen Passwort-Reset-Code an („Code statt Link").
 *
 * Ersetzt `supabase.auth.resetPasswordForEmail`: Die Mail kommt aus unserem
 * eigenen Versand (Resend/SMTP) mit DigiKI-Branding, enthält nur den Code
 * plus einen normalen Seiten-Link – keinen Token-Link, den Mail-Scanner
 * verbrennen könnten. Antwort ist enumeration-sicher immer {ok:true}.
 */
export async function POST(request: NextRequest) {
  return handleAuthCodeRequest(request, {
    kind: "recovery",
    linkType: "recovery",
    buildMail: ({ code, siteUrl }) => ({
      subject: "Ihr Code zum Zurücksetzen des Passworts – DigiKI",
      eyebrow: "Passwort",
      heading: "Passwort zurücksetzen",
      preheader: `Ihr ${OTP_LENGTH_LABEL}er Code, um ein neues Passwort festzulegen.`,
      introHtml: `
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;">Guten Tag,</p>
              <p style="margin:0 0 20px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                mit diesem Code legen Sie ein neues Passwort für Ihren
                DigiKI-Zugang fest. Geben Sie ihn im geöffneten Fenster auf der
                Seite „Passwort vergessen" ein:
              </p>`,
      code,
      pageUrl: `${siteUrl}/best-practice/passwort-vergessen`,
      pageLabel: "Seite bereits geschlossen? Hier können Sie den Code eingeben:",
      pageUrlText: "digiki-os.de/best-practice/passwort-vergessen",
      footerNoteHtml:
        "Sie haben diese E-Mail nicht angefordert? Dann können Sie sie einfach ignorieren – Ihr Passwort bleibt unverändert.",
    }),
  });
}
