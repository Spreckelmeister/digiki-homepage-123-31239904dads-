import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  ApplicationStudentAssistant,
  ApplicationToolLicense,
} from "@/lib/types";
import {
  generateAllApplicationsMarkdown,
  type CombinedApplication,
} from "@/lib/applications/markdownReport";
import {
  applyApplicationFilters,
  parseApplicationFilterParams,
  type ApplicationFilterRow,
} from "@/lib/applications/filters";

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
  const filterState = parseApplicationFilterParams(url.searchParams);

  const [{ data: studentApps }, { data: toolApps }] = await Promise.all([
    supabase
      .from("applications_student_assistants")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("applications_tool_licenses")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const combined: CombinedApplication[] = [
    ...(studentApps ?? []).map((a) => ({
      ...(a as ApplicationStudentAssistant),
      type: "hilfskraefte" as const,
    })),
    ...(toolApps ?? []).map((a) => ({
      ...(a as ApplicationToolLicense),
      type: "tool-lizenzen" as const,
    })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // Auf Filter-Row reduzieren, filtern, dann auf die vollständigen
  // Anträge zurückmappen.
  const filterRows: ApplicationFilterRow[] = combined.map((a) => ({
    id: a.id,
    type: a.type,
    school_name: a.school_name ?? "",
    contact_person: a.contact_person ?? "",
    email: a.email ?? "",
    status: a.status,
    created_at: a.created_at,
  }));
  const filteredRows = applyApplicationFilters(filterRows, filterState);
  const allowedKeys = new Set(
    filteredRows.map((r) => `${r.type}:${r.id}`),
  );
  const filteredApps = combined.filter((a) =>
    allowedKeys.has(`${a.type}:${a.id}`),
  );

  const isFiltered =
    filterState.query.trim() !== "" || filterState.activeFilters.size > 0;

  const markdown = generateAllApplicationsMarkdown({
    generatedAt: new Date(),
    applications: filteredApps,
    isFiltered,
  });

  const date = new Date().toISOString().slice(0, 10);
  const suffix = isFiltered ? "-gefiltert" : "";
  const filename = `digiki-antraege${suffix}-${date}.md`;

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
