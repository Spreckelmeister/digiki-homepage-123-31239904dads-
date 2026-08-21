import { NextRequest } from "next/server";
import { handleAuthCodeRequest } from "@/lib/auth/requestAuthCode";
import { OTP_LENGTH_LABEL } from "@/lib/email/sendAuthCodeMail";

export const runtime = "nodejs";

/**
 * Fordert einen Anmeldecode an (OTP-first-Login, „Code statt Link").
 *
 * Mintet `generateLink({type:"magiclink"})` – funktioniert auch für noch
 * unbestätigte Konten; das Einlösen bestätigt die E-Mail-Adresse gleich mit
 * (Selbstheilung). Antwort ist enumeration-sicher immer {ok:true}.
 */
export async function POST(request: NextRequest) {
  return handleAuthCodeRequest(request, {
    kind: "login",
    linkType: "magiclink",
    buildMail: ({ code, siteUrl }) => ({
      subject: "Ihr Anmeldecode – DigiKI",
      eyebrow: "Anmeldung",
      heading: "Ihr Anmeldecode",
      preheader: `Ihr ${OTP_LENGTH_LABEL}er Code für die Anmeldung bei DigiKI.`,
      introHtml: `
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;">Guten Tag,</p>
              <p style="margin:0 0 20px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                mit diesem Code melden Sie sich bei DigiKI an – ganz ohne Passwort.
                Geben Sie ihn einfach im geöffneten Anmeldefenster ein:
              </p>`,
      code,
      pageUrl: `${siteUrl}/best-practice/login`,
      pageLabel: "Anmeldeseite bereits geschlossen? Hier geht es zur Anmeldung:",
      pageUrlText: "digiki-os.de/best-practice/login",
      footerNoteHtml:
        "Sie haben diese E-Mail nicht angefordert? Dann können Sie sie einfach ignorieren – ohne Eingabe des Codes passiert nichts.",
    }),
  });
}
