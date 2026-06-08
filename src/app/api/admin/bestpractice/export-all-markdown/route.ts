import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { BestPractice } from "@/lib/types";
import { generateAllBestPracticesMarkdown } from "@/lib/bestpractice/markdownReport";
import {
  applyBestPracticeFilters,
  parseBestPracticeFilterParams,
  type BestPracticeFilterRow,
} from "@/lib/bestpractice/filters";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const filterState = parseBestPracticeFilterParams(url.searchParams);

  const { data: rows } = await supabase
    .from("best_practices")
    .select(
      "*, profiles(full_name), best_practice_categories(categories(*))",
    )
    .order("created_at", { ascending: false });

  const practices = (rows ?? []) as BestPractice[];

  const filterRows: BestPracticeFilterRow[] = practices.map((p) => ({
    id: p.id,
    title: p.title ?? "",
    school_name: p.school_name ?? "",
    subject: p.subject ?? null,
    grade_level: p.grade_level ?? null,
    published: Boolean(p.published),
    has_vorlage: Boolean(p.vorlage_data),
    created_at: p.created_at,
  }));
  const filteredRows = applyBestPracticeFilters(filterRows, filterState);
  const allowedIds = new Set(filteredRows.map((r) => r.id));
  const filtered = practices.filter((p) => allowedIds.has(p.id));

  const isFiltered =
    filterState.query.trim() !== "" || filterState.activeFilters.size > 0;

  const markdown = generateAllBestPracticesMarkdown({
    generatedAt: new Date(),
    practices: filtered,
    isFiltered,
  });

  const date = new Date().toISOString().slice(0, 10);
  const suffix = isFiltered ? "-gefiltert" : "";
  const filename = `digiki-best-practices${suffix}-${date}.md`;

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
