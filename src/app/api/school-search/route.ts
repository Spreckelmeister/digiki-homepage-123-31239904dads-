import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 3) {
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
