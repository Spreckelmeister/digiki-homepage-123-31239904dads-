import { NextRequest, NextResponse } from "next/server";
import { performAccountDeletionByToken } from "@/lib/performAccountDeletion";

export const runtime = "nodejs";

function redirectTo(
  request: NextRequest,
  status: "ok" | "invalid" | "expired" | "error"
): NextResponse {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const target = new URL("/konto-geloescht", base);
  target.searchParams.set("status", status);
  return NextResponse.redirect(target, { status: 303 });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return redirectTo(request, "invalid");

  const result = await performAccountDeletionByToken(token);
  if (!result.ok) {
    if (result.reason === "expired") return redirectTo(request, "expired");
    if (result.reason === "invalid") return redirectTo(request, "invalid");
    return redirectTo(request, "error");
  }
  return redirectTo(request, "ok");
}
