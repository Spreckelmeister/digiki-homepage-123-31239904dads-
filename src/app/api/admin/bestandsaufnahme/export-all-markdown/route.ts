import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  type BestandsaufnahmeRow,
  dedupeBySchool,
} from "@/lib/bestandsaufnahme/aggregations";
import { generateAllBestandsaufnahmenMarkdown } from "@/lib/bestandsaufnahme/markdownReport";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
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

  const { data: rawRows } = await supabase
    .from("bestandsaufnahme_responses")
    .select("*")
    .not("school_name", "ilike", "%test%")
    .not("school_name", "ilike", "%admin%")
    .order("created_at", { ascending: false });

  const allRows = (rawRows ?? []) as BestandsaufnahmeRow[];

  // Versionen pro Schule indexieren (für den „N Versionen"-Hinweis im Markdown)
  const duplicatesByKey = new Map<string, BestandsaufnahmeRow[]>();
  for (const r of allRows) {
    const key = (r.school_name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!key) continue;
    const arr = duplicatesByKey.get(key) ?? [];
    arr.push(r);
    duplicatesByKey.set(key, arr);
  }

  // Eindeutige Liste (jüngste pro Schule) als Hauptbasis
  const { unique } = dedupeBySchool(allRows);

  const markdown = generateAllBestandsaufnahmenMarkdown({
    generatedAt: new Date(),
    uniqueSchools: unique,
    duplicatesByKey,
  });

  const date = new Date().toISOString().slice(0, 10);
  const filename = `digiki-bestandsaufnahmen-alle-${date}.md`;

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
