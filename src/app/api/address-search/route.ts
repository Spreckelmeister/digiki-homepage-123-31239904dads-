import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter: max 2 requests per second per IP
const rateMap = new Map<string, number[]>();
const RATE_WINDOW_MS = 1000;
const RATE_MAX = 2;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateMap.get(ip) || []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  if (timestamps.length >= RATE_MAX) {
    rateMap.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  rateMap.set(ip, timestamps);
  return false;
}

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 3) {
    return NextResponse.json([]);
  }

  const params = new URLSearchParams({
    q,
    format: "json",
    addressdetails: "1",
    countrycodes: "de",
    limit: "5",
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        "User-Agent": "DigiKI-Homepage/1.0 (krafft@osnabrueck.de)",
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json([], { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
