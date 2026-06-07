import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { type BestandsaufnahmeRow } from "@/lib/bestandsaufnahme/aggregations";
import { generateAllBestandsaufnahmenMarkdown } from "@/lib/bestandsaufnahme/markdownReport";
import {
  applyFilters,
  groupBySchool,
  parseFilterParams,
  type FilterableRow,
} from "@/lib/bestandsaufnahme/filters";

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
  const filterState = parseFilterParams(url.searchParams);
  const needsEmailConfirmedMap = filterState.activeFilters.has("not-confirmed");

  const { data: rawRows } = await supabase
    .from("bestandsaufnahme_responses")
    .select("*")
    .not("school_name", "ilike", "%test%")
    .not("school_name", "ilike", "%admin%")
    .order("created_at", { ascending: false });

  const allRows = (rawRows ?? []) as (BestandsaufnahmeRow & {
    user_id: string | null;
  })[];

  // Versionen pro Schule indexieren (für den „N Versionen"-Hinweis im Markdown)
  const duplicatesByKey = new Map<string, BestandsaufnahmeRow[]>();
  for (const r of allRows) {
    const key = (r.school_name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!key) continue;
    const arr = duplicatesByKey.get(key) ?? [];
    arr.push(r);
    duplicatesByKey.set(key, arr);
  }

  // Optional: Bestätigungs-Status laden, falls der Filter „not-confirmed"
  // aktiv ist – sonst sparen wir uns den teuren listUsers-Call.
  let emailConfirmedMap: Map<string, string | null> | undefined;
  if (
    needsEmailConfirmedMap &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );
      const { data: usersData } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const wanted = new Set(
        allRows
          .map((r) => r.user_id)
          .filter((id): id is string => typeof id === "string"),
      );
      emailConfirmedMap = new Map();
      for (const u of usersData?.users ?? []) {
        if (wanted.has(u.id)) {
          emailConfirmedMap.set(u.id, u.email_confirmed_at ?? null);
        }
      }
    } catch (err) {
      console.error("[export-all-markdown] listUsers failed:", err);
    }
  }

  // Gruppieren, dann GENAU dieselbe Filter-Logik wie im Client anwenden,
  // damit der Download deckungsgleich zur sichtbaren Tabelle ist.
  const groups = groupBySchool<BestandsaufnahmeRow & FilterableRow>(
    allRows as unknown as (BestandsaufnahmeRow & FilterableRow & { created_at: string })[],
  );
  const filteredGroups = applyFilters(groups, filterState, { emailConfirmedMap });
  const uniqueSchools = filteredGroups.map((g) => g.latest as BestandsaufnahmeRow);

  const markdown = generateAllBestandsaufnahmenMarkdown({
    generatedAt: new Date(),
    uniqueSchools,
    duplicatesByKey,
  });

  // Dateiname signalisiert „gefilterter Export", wenn welche aktiv sind
  const date = new Date().toISOString().slice(0, 10);
  const filterSuffix =
    filterState.query.trim() !== "" || filterState.activeFilters.size > 0
      ? "-gefiltert"
      : "";
  const filename = `digiki-bestandsaufnahmen${filterSuffix}-${date}.md`;

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
