import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { BestPractice } from "@/lib/types";
import { generateBestPracticeMarkdown } from "@/lib/bestpractice/markdownReport";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID fehlt" }, { status: 400 });
  }

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

  const { data: row } = await supabase
    .from("best_practices")
    .select(
      "*, profiles(full_name), best_practice_categories(categories(*))",
    )
    .eq("id", id)
    .single();

  if (!row) {
    return NextResponse.json(
      { error: "Best-Practice-Beitrag nicht gefunden" },
      { status: 404 },
    );
  }

  const markdown = generateBestPracticeMarkdown(row as BestPractice);

  const date = new Date(row.created_at).toISOString().slice(0, 10);
  const slug = slugify(row.title ?? "best-practice");
  const filename = `best-practice-${slug}-${date}.md`;

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
