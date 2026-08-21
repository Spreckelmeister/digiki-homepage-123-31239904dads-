import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getResendBlock } from "@/lib/auth/resendCooldown";
import { extractContactNames } from "@/lib/contact-name";
import {
  escapeHtml,
  isSmtpConfigured,
  sendAuthCodeMail,
  getSiteUrl,
} from "@/lib/email/sendAuthCodeMail";

/**
 * Admin-Funktion: Erinnerungs-Mail an Schulen mit unbestätigter E-Mail.
 *
 * „Code statt Link": Diese Mail enthält bewusst KEIN Geheimnis mehr (weder
 * Token-Link noch Code) – nur eine Schritt-für-Schritt-Anleitung für die
 * Anmeldung per Code. Der Code-Login bestätigt die Adresse automatisch,
 * und eine Anleitung kann nie ablaufen und von keinem Mail-Scanner
 * unbrauchbar gemacht werden.
 */

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

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

  // Admin-Auth
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

  // Body
  let body: { userId?: unknown; override?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { userId, override } = body;
  // override === true → Admin überschreibt die 24h-Sperre bewusst (nur über
  // die Detail-Karte mit Warnhinweis; der Schnellversand der Tabelle sendet
  // dieses Flag NICHT). Nur Admins erreichen diese Route ohnehin.
  const forceOverride = override === true;
  if (typeof userId !== "string" || !userId.trim()) {
    return NextResponse.json({ error: "Fehlende Felder" }, { status: 400 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Zielnutzer abfragen
  const { data: userData, error: userError } =
    await admin.auth.admin.getUserById(userId);
  if (userError || !userData?.user) {
    return NextResponse.json(
      { error: "Benutzer nicht gefunden" },
      { status: 404 },
    );
  }

  const targetEmail = userData.user.email;
  if (!targetEmail) {
    return NextResponse.json(
      { error: "Benutzer hat keine E-Mail-Adresse" },
      { status: 400 },
    );
  }

  if (userData.user.email_confirmed_at) {
    return NextResponse.json(
      { error: "E-Mail bereits bestätigt" },
      { status: 400 },
    );
  }

  // 24-Stunden-Sperren prüfen. Es greift, was später endet:
  //  • signup-grace:    Die Anmeldung ist noch keine 24h her – die Schule
  //    soll erst selbst Gelegenheit haben, ihre Adresse zu bestätigen,
  //    bevor wir per Admin-Mail nachfassen.
  //  • resend-cooldown: Nicht mehrfach hintereinander erinnern, damit die
  //    Schule nicht gespammt wird. Quelle der Wahrheit ist
  //    user_metadata.last_confirmation_resend_at.
  const existingMeta =
    (userData.user.user_metadata ?? {}) as Record<string, unknown>;
  const lastResendIso =
    typeof existingMeta.last_confirmation_resend_at === "string"
      ? existingMeta.last_confirmation_resend_at
      : null;
  const signupIso = userData.user.created_at ?? null;
  const block = getResendBlock(signupIso, lastResendIso);
  if (block && !forceOverride) {
    const error =
      block.reason === "signup-grace"
        ? `Die Anmeldung ist erst seit Kurzem eingegangen. Wir geben der Schule zunächst Gelegenheit, ihre E-Mail-Adresse selbst zu bestätigen – eine Erinnerungs-Mail kann erst in ${block.formatted} versendet werden.`
        : `Eine neue Erinnerungs-Mail kann erst in ${block.formatted} versendet werden – so vermeiden wir, dass die Schule mehrfach hintereinander kontaktiert wird.`;
    return NextResponse.json(
      {
        error,
        reason: block.reason,
        cooldownRemainingMs: block.remainingMs,
        nextAvailableAt: block.nextAvailableAt,
      },
      { status: 429 },
    );
  }

  // Begrüßungsdaten aus dem Profil
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("full_name, school")
    .eq("id", userId)
    .single();
  const fullName = targetProfile?.full_name ?? "";
  const schoolName = targetProfile?.school ?? "";

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { error: "Mail-Versand ist serverseitig nicht konfiguriert" },
      { status: 500 },
    );
  }

  try {
    // full_name kann „Name, Funktion" (ggf. mehrere Personen) sein – für die
    // Anrede nur die Namen verwenden (Funktionen entfernt).
    const contactName = extractContactNames(fullName);
    const greeting = contactName
      ? `Guten Tag ${escapeHtml(contactName.slice(0, 100))},`
      : "Guten Tag,";
    const schoolSafe = escapeHtml(schoolName.slice(0, 200));
    const emailSafe = escapeHtml(targetEmail);
    const schoolPhrase = schoolName ? ` für <strong>${schoolSafe}</strong>` : "";
    const siteUrl = getSiteUrl();
    const loginUrl = `${siteUrl}/best-practice/login`;

    await sendAuthCodeMail({
      to: targetEmail,
      subject: "Anmelden bei DigiKI geht jetzt ganz einfach – per Code",
      eyebrow: "Erinnerung",
      heading: "Neu: Anmelden per Code – ganz ohne alte E-Mails",
      preheader:
        "E-Mail-Adresse eingeben, neuen Code erhalten, anmelden – das bestätigt auch Ihre Adresse.",
      introHtml: `
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;">${greeting}</p>
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                Ihre Bestandsaufnahme${schoolPhrase} ist gut bei uns angekommen.
                Nur ein Schritt fehlt noch: die Bestätigung Ihrer
                E-Mail-Adresse.
              </p>
              <p style="margin:0 0 20px 0;color:#1A1A1A;font-size:15px;line-height:1.6;">
                <strong>Das geht jetzt einfacher als früher:</strong> Wir haben
                die Anmeldung auf ein neues Code-System umgestellt. Sie müssen
                keine alte E-Mail mehr heraussuchen und keinen Link anklicken.
                Geben Sie einfach Ihre E-Mail-Adresse auf unserer Anmeldeseite
                ein – Sie bekommen dann sofort einen frischen Anmeldecode
                zugeschickt. Sobald Sie sich damit anmelden, ist Ihre
                E-Mail-Adresse automatisch bestätigt.
              </p>`,
      extraHtml: `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #AB7A0E;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px 0;font-weight:bold;color:#006363;font-size:15px;">
                      So einfach geht es
                    </p>
                    <ol style="margin:0 0 12px 0;padding:0 0 0 20px;color:#1A1A1A;font-size:14px;line-height:1.7;">
                      <li>Öffnen Sie die Anmeldeseite:
                        <a href="${escapeHtml(loginUrl)}" style="color:#006363;font-weight:bold;">digiki-os.de/best-practice/login</a>
                      </li>
                      <li>Geben Sie Ihre E-Mail-Adresse (<strong>${emailSafe}</strong>) ein und klicken Sie auf <strong>„Weiter"</strong>.</li>
                      <li>Sie erhalten sofort eine E-Mail mit einem 8-stelligen Code. Code eintippen – fertig! Sie sind angemeldet und Ihre Adresse ist bestätigt.</li>
                    </ol>
                    <p style="margin:0;color:#555555;font-size:13px;line-height:1.6;">
                      Diese Erinnerung enthält absichtlich keinen Link zum
                      Anklicken und keinen Code – <strong>sie kann deshalb
                      nicht ablaufen</strong>. Ihren frischen Code bekommen Sie
                      immer direkt bei der Anmeldung.
                    </p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:#F5F9F9;border-left:4px solid #006363;border-radius:0 6px 6px 0;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-weight:bold;color:#006363;font-size:14px;">
                      Ihre Login-E-Mail
                    </p>
                    <p style="margin:0;color:#555555;font-size:14px;line-height:1.5;">
                      <strong>${emailSafe}</strong>
                    </p>
                  </td>
                </tr>
              </table>`,
    });

    // Cooldown-Stempel im user_metadata aktualisieren – dient als Quelle
    // der Wahrheit für die 24h-Sperre, sowohl serverseitig (Re-Check) als
    // auch clientseitig (UI-Anzeige „verfügbar in X").
    // WICHTIG: supabase-js WIRFT bei API-Fehlern nicht, sondern liefert
    // { error } – deshalb explizit prüfen (der frühere try/catch hat
    // Fehler hier lautlos verschluckt, wodurch die Sperre nach einem
    // Neuladen der Seite fehlte).
    const stampIso = new Date().toISOString();
    const { error: metaError } = await admin.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          ...existingMeta,
          last_confirmation_resend_at: stampIso,
        },
      },
    );
    if (metaError) {
      // Mail ist raus → kein Fehlschlag, aber Client soll es anzeigen können.
      console.error(
        "[resend-signup-confirmation] metadata update failed:",
        metaError.message,
      );
      return NextResponse.json({
        ok: true,
        lastResendAt: stampIso,
        stampSaved: false,
      });
    }

    return NextResponse.json({ ok: true, lastResendAt: stampIso, stampSaved: true });
  } catch (emailErr) {
    console.error(
      "[resend-signup-confirmation] mail error:",
      emailErr,
    );
    return NextResponse.json(
      { error: "Mail-Versand fehlgeschlagen" },
      { status: 500 },
    );
  }
}
