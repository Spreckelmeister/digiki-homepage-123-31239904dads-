import { NextRequest, NextResponse } from "next/server";
import {
  requireSchulungenAccess,
  createServiceClient,
} from "@/lib/schulungen/server";
import type { AccessUser } from "@/lib/schulungen/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

/**
 * Zugriffsverwaltung (nur Admins): Personen mit der Rolle
 * "schulungsteam" sehen das Dashboard, sind sonst aber normalen
 * Lehrkraft-Konten gleichgestellt.
 */
export async function GET() {
  const auth = await requireSchulungenAccess({ adminOnly: true });
  if (!auth.ok) return auth.response;

  const admin = createServiceClient();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, full_name, school")
    .eq("role", "schulungsteam");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users: AccessUser[] = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      return {
        id: p.id,
        full_name: p.full_name,
        school: p.school,
        email: data?.user?.email ?? null,
      };
    })
  );

  return NextResponse.json({ users });
}

type AccessBody = {
  email?: unknown;
  action?: unknown; // "grant" | "revoke"
};

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auth = await requireSchulungenAccess({ adminOnly: true });
  if (!auth.ok) return auth.response;

  let body: AccessBody;
  try {
    body = (await request.json()) as AccessBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const action = body.action === "grant" ? "grant" : body.action === "revoke" ? "revoke" : null;

  if (!email || !email.includes("@") || !action) {
    return NextResponse.json({ error: "Ungültige Parameter" }, { status: 400 });
  }

  const admin = createServiceClient();

  // Nutzer per E-Mail suchen (Supabase Admin API, seitenweise)
  let userId: string | null = null;
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (data.users.length < 200) break;
  }

  if (!userId) {
    return NextResponse.json(
      {
        error:
          "Kein Konto mit dieser E-Mail gefunden. Die Person muss sich zuerst unter /best-practice/registrieren registrieren.",
      },
      { status: 404 }
    );
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json(
      { error: "Zu diesem Konto existiert noch kein Profil." },
      { status: 404 }
    );
  }

  if (profile.role === "admin") {
    return NextResponse.json(
      { error: "Admins haben bereits vollen Zugriff." },
      { status: 409 }
    );
  }

  if (action === "grant" && profile.role === "schulungsteam") {
    return NextResponse.json(
      { error: "Diese Person hat bereits Dashboard-Zugriff." },
      { status: 409 }
    );
  }
  if (action === "revoke" && profile.role !== "schulungsteam") {
    return NextResponse.json(
      { error: "Diese Person hat keinen Dashboard-Zugriff." },
      { status: 409 }
    );
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ role: action === "grant" ? "schulungsteam" : "teacher" })
    .eq("id", userId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action });
}
