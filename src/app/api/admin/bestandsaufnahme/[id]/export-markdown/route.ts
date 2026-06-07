import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type BestandsaufnahmeRow } from "@/lib/bestandsaufnahme/aggregations";
import { generateSingleBestandsaufnahmeMarkdown } from "@/lib/bestandsaufnahme/markdownReport";

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
    .from("bestandsaufnahme_responses")
    .select("*")
    .eq("id", id)
    .single();

  if (!row) {
    return NextResponse.json(
      { error: "Bestandsaufnahme nicht gefunden" },
      { status: 404 },
    );
  }

  const r = row as BestandsaufnahmeRow;

  // Weitere Versionen derselben Schule mitliefern, damit der Markdown die
  // Zugehörigkeit dokumentieren kann.
  let allVersions: BestandsaufnahmeRow[] = [r];
  if (r.school_name) {
    const { data: siblings } = await supabase
      .from("bestandsaufnahme_responses")
      .select("id, school_name, created_at")
      .ilike("school_name", r.school_name)
      .order("created_at", { ascending: false });
    if (siblings && siblings.length > 1) {
      // Wir reichen die schmale Sibling-Liste an die Markdown-Funktion;
      // dort wird nur created_at + id verwendet.
      allVersions = siblings as unknown as BestandsaufnahmeRow[];
    }
  }

  const markdown = generateSingleBestandsaufnahmeMarkdown(r, { allVersions });

  const date = new Date(r.created_at).toISOString().slice(0, 10);
  const slug = slugify(r.school_name ?? "schule");
  const filename = `bestandsaufnahme-${slug}-${date}.md`;

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
