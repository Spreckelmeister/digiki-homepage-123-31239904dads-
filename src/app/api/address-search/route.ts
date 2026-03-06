import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
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

  const data = await res.json();
  return NextResponse.json(data);
}
