import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter: max 2 requests per second per IP
const rateMap = new Map<string, number[]>();
const RATE_WINDOW_MS = 1000;
const RATE_MAX = 2;
const RATE_MAP_MAX_SIZE = 5000;

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
  // Evict oldest entry if map grows too large
  if (!rateMap.has(ip) && rateMap.size >= RATE_MAP_MAX_SIZE) {
    rateMap.delete(rateMap.keys().next().value!);
  }
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
  if (!q || q.length < 3 || q.length > 100) {
    return NextResponse.json([]);
  }

  const params = new URLSearchParams({
    q: `${q} Schule`,
    format: "json",
    addressdetails: "1",
    countrycodes: "de",
    limit: "10",
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

  const data: Record<string, unknown>[] = await res.json();

  // Filter for school-related results
  const schools = data.filter(
    (item) =>
      item.class === "amenity" &&
      (item.type === "school" ||
        item.type === "college" ||
        item.type === "university")
  );

  return NextResponse.json(schools.length > 0 ? schools.slice(0, 5) : data.slice(0, 5));
}
