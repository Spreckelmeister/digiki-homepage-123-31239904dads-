import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  encryptSecret,
  isEncryptionConfigured,
} from "@/lib/klassenbildung/cryptoServer";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

function checkOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  // GET ist idempotent → kein CSRF-Risiko. Browser senden bei
  // Same-Origin-GETs oft keinen Origin-Header.
  if (req.method === "GET") {
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return null;
  }
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PublicSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  smtp_user: string;
  from_email: string;
  from_name: string | null;
  reply_to: string | null;
  school_name: string | null;
  school_logo_url: string | null;
  verified_at: string | null;
  last_test_at: string | null;
  last_test_error: string | null;
}

// ── GET: aktuelle Config (ohne Passwort) ────────────────────────────
export async function GET(req: NextRequest) {
  const denied = checkOrigin(req);
  if (denied) return denied;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("klassenbildung_smtp_config")
    .select(
      "host, port, secure, smtp_user, from_email, from_name, reply_to, school_name, school_logo_url, verified_at, last_test_at, last_test_error"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    config: (data as PublicSmtpConfig | null) ?? null,
    encryption_ready: isEncryptionConfigured(),
  });
}

// ── PUT: Config setzen / aktualisieren ──────────────────────────────
export async function PUT(req: NextRequest) {
  const denied = checkOrigin(req);
  if (denied) return denied;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!isEncryptionConfigured()) {
    return NextResponse.json(
      {
        error: "encryption_not_ready",
        detail:
          "SMTP_ENCRYPTION_KEY ist auf dem Server nicht gesetzt. Bitte System-Administrator informieren.",
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const host = typeof body.host === "string" ? body.host.trim() : "";
  const port =
    Number.isFinite(body.port) && body.port >= 1 && body.port <= 65535
      ? Math.floor(body.port)
      : null;
  const secure = body.secure === true;
  const smtpUser =
    typeof body.smtp_user === "string" ? body.smtp_user.trim() : "";
  const password =
    typeof body.password === "string" ? body.password : null;
  const fromEmail =
    typeof body.from_email === "string" ? body.from_email.trim() : "";
  const fromName =
    typeof body.from_name === "string"
      ? body.from_name.trim().slice(0, 120) || null
      : null;
  const replyTo =
    typeof body.reply_to === "string" ? body.reply_to.trim() : "";
  const schoolName =
    typeof body.school_name === "string"
      ? body.school_name.trim().slice(0, 200) || null
      : null;
  const schoolLogoUrl =
    typeof body.school_logo_url === "string"
      ? body.school_logo_url.trim().slice(0, 500) || null
      : null;

  if (!host || port === null || !smtpUser || !fromEmail) {
    return NextResponse.json(
      { error: "missing_fields" },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(fromEmail)) {
    return NextResponse.json({ error: "invalid_from_email" }, { status: 400 });
  }
  if (replyTo && !EMAIL_RE.test(replyTo)) {
    return NextResponse.json({ error: "invalid_reply_to" }, { status: 400 });
  }

  // Existierende Config holen, um zu wissen ob Passwort schon hinterlegt ist
  const { data: existing } = await supabase
    .from("klassenbildung_smtp_config")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing && !password) {
    return NextResponse.json(
      { error: "password_required" },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {
    host: host.slice(0, 200),
    port,
    secure,
    smtp_user: smtpUser.slice(0, 200),
    from_email: fromEmail.toLowerCase().slice(0, 200),
    from_name: fromName,
    reply_to: replyTo ? replyTo.toLowerCase().slice(0, 200) : null,
    school_name: schoolName,
    school_logo_url: schoolLogoUrl,
    updated_at: new Date().toISOString(),
    // Bei Passwort-Änderung: verified_at zurücksetzen
    verified_at: null,
    last_test_at: null,
    last_test_error: null,
  };

  if (password) {
    const { enc, iv, tag } = encryptSecret(password);
    update.password_enc = enc;
    update.password_iv = iv;
    update.password_tag = tag;
  }

  if (existing) {
    const { error } = await supabase
      .from("klassenbildung_smtp_config")
      .update(update)
      .eq("user_id", user.id);
    if (error)
      return NextResponse.json(
        { error: "update_failed", detail: error.message },
        { status: 500 }
      );
  } else {
    const { error } = await supabase
      .from("klassenbildung_smtp_config")
      .insert({
        user_id: user.id,
        ...update,
      });
    if (error)
      return NextResponse.json(
        { error: "insert_failed", detail: error.message },
        { status: 500 }
      );
  }
  return NextResponse.json({ ok: true });
}

// ── DELETE: Config löschen ──────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const denied = checkOrigin(req);
  if (denied) return denied;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("klassenbildung_smtp_config")
    .delete()
    .eq("user_id", user.id);
  if (error)
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
