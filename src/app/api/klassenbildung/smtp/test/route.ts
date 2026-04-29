import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/lib/klassenbildung/cryptoServer";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

// ── POST: Sendet eine Test-Mail mit der hinterlegten Config ────────
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const targetEmail =
    typeof body.target === "string" && body.target.trim().length > 0
      ? body.target.trim()
      : user.email;
  if (!targetEmail) {
    return NextResponse.json(
      { error: "no_target", detail: "Kein Test-Empfänger angegeben." },
      { status: 400 }
    );
  }

  // Service-Role nötig für Update auf last_test_at/error
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Volle Config inkl. Passwort holen (über Service-Key, nicht User)
  const { data: cfg, error: cfgErr } = await serviceSupabase
    .from("klassenbildung_smtp_config")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (cfgErr || !cfg) {
    return NextResponse.json(
      { error: "no_config", detail: "Keine SMTP-Config gespeichert." },
      { status: 404 }
    );
  }

  let password: string;
  try {
    password = decryptSecret({
      enc: cfg.password_enc,
      iv: cfg.password_iv,
      tag: cfg.password_tag,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Entschlüsselung fehlgeschlagen";
    return NextResponse.json(
      { error: "decryption_failed", detail: msg },
      { status: 500 }
    );
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.smtp_user, pass: password },
  });

  const fromHeader = cfg.from_name
    ? `${cfg.from_name} <${cfg.from_email}>`
    : cfg.from_email;

  try {
    await transporter.sendMail({
      from: fromHeader,
      to: targetEmail,
      replyTo: cfg.reply_to ?? undefined,
      subject: "DigiKI · SMTP-Test erfolgreich",
      text:
        "Diese Mail bestätigt, dass Ihr eigener SMTP-Server für DigiKI Klassenverteilung korrekt eingerichtet ist.\n\n" +
        "Wenn Sie diese Mail erhalten, werden Eltern-Benachrichtigungen ab jetzt über Ihren Server verschickt.",
      html:
        '<p>Diese Mail bestätigt, dass Ihr eigener SMTP-Server für <strong>DigiKI Klassenverteilung</strong> korrekt eingerichtet ist.</p>' +
        '<p style="color:#555">Wenn Sie diese Mail erhalten, werden Eltern-Benachrichtigungen ab jetzt über Ihren Server verschickt.</p>',
    });
    await serviceSupabase
      .from("klassenbildung_smtp_config")
      .update({
        verified_at: new Date().toISOString(),
        last_test_at: new Date().toISOString(),
        last_test_error: null,
      })
      .eq("user_id", user.id);
    return NextResponse.json({ ok: true, target: targetEmail });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    await serviceSupabase
      .from("klassenbildung_smtp_config")
      .update({
        last_test_at: new Date().toISOString(),
        last_test_error: msg.slice(0, 500),
      })
      .eq("user_id", user.id);
    return NextResponse.json(
      { error: "send_failed", detail: msg },
      { status: 502 }
    );
  }
}
