import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  ApplicationStudentAssistant,
  ApplicationToolLicense,
} from "@/lib/types";
import {
  generateHilfskraefteMarkdown,
  generateToolLizenzenMarkdown,
} from "@/lib/applications/markdownReport";

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
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const { type, id } = await params;
  if (!id || !type) {
    return NextResponse.json(
      { error: "Parameter fehlen" },
      { status: 400 },
    );
  }
  if (type !== "hilfskraefte" && type !== "tool-lizenzen") {
    return NextResponse.json(
      { error: "Unbekannter Antragstyp" },
      { status: 400 },
    );
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

  const tableName =
    type === "hilfskraefte"
      ? "applications_student_assistants"
      : "applications_tool_licenses";

  const { data: row } = await supabase
    .from(tableName)
    .select("*")
    .eq("id", id)
    .single();

  if (!row) {
    return NextResponse.json(
      { error: "Antrag nicht gefunden" },
      { status: 404 },
    );
  }

  const markdown =
    type === "hilfskraefte"
      ? generateHilfskraefteMarkdown(row as ApplicationStudentAssistant)
      : generateToolLizenzenMarkdown(row as ApplicationToolLicense);

  const date = new Date(row.created_at).toISOString().slice(0, 10);
  const slug = slugify(row.school_name ?? "antrag");
  const typeSlug = type === "hilfskraefte" ? "hilfskraefte" : "tool-lizenzen";
  const filename = `antrag-${typeSlug}-${slug}-${date}.md`;

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
