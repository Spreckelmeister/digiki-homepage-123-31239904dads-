/**
 * Bereinigt Profile, deren `full_name` versehentlich „Name, Funktion" enthält
 * (Bestandsaufnahme-Feld 9, z. B. „Helke Wiederholt, Lehrerin"). Für Anreden &
 * Anzeigen soll dort nur der Name vor dem ersten Komma stehen.
 *
 * - Betroffen sind NUR Profile mit Komma im full_name – alle anderen bleiben
 *   unangetastet.
 * - Standard ist ein DRY-RUN (zeigt nur an). Erst mit `--apply` wird geschrieben.
 * - Aktualisiert profiles.full_name UND die Auth-Metadaten (full_name), damit
 *   beides konsistent bleibt; `school` u. a. Metadaten bleiben erhalten.
 *
 * Ausführen (PowerShell):
 *   vercel env pull .env.local                         (einmalig, holt SERVICE_ROLE_KEY etc.)
 *   npx tsx scripts/fix-contact-fullnames.ts           (Dry-Run – nur Vorschau)
 *   npx tsx scripts/fix-contact-fullnames.ts --apply   (tatsächlich schreiben)
 * Alternativ per Umgebungsvariable:
 *   $env:APPLY="1"; npm run fix-contact-fullnames
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { extractContactNames } from "../src/lib/contact-name";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen. Erst 'vercel env pull .env.local' ausführen.",
  );
  process.exit(1);
}

// „--apply" als Flag ODER per Umgebungsvariable APPLY=1 (robuster, falls
// `npm run … -- --apply` den Flag je nach Shell nicht durchreicht).
const APPLY =
  process.argv.includes("--apply") ||
  process.env.APPLY === "1" ||
  process.env.APPLY === "true";
const supa = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Nur Profile mit Komma im Namen – das ist genau das betroffene Muster.
  const { data, error } = await supa
    .from("profiles")
    .select("id, full_name")
    .like("full_name", "%,%");

  if (error) {
    console.error("❌ Abfrage fehlgeschlagen:", error.message);
    process.exit(1);
  }

  const rows = data ?? [];
  const changes = rows
    .map((r) => ({
      id: r.id as string,
      from: String(r.full_name ?? ""),
      to: extractContactNames(r.full_name as string),
    }))
    .filter((c) => c.to && c.to !== c.from);

  console.log(
    `${rows.length} Profil(e) mit Komma gefunden, ${changes.length} davon zu ändern:\n`,
  );
  for (const c of changes) console.log(`  • "${c.from}"  →  "${c.to}"`);

  if (changes.length === 0) {
    console.log("\nNichts zu tun.");
    return;
  }
  if (!APPLY) {
    console.log("\nDRY-RUN – es wurde nichts geändert. Zum Schreiben: -- --apply");
    return;
  }

  let ok = 0,
    fail = 0;
  for (const c of changes) {
    const { error: pe } = await supa
      .from("profiles")
      .update({ full_name: c.to })
      .eq("id", c.id);
    if (pe) {
      fail++;
      console.error(`  ✗ profiles ${c.id}: ${pe.message}`);
      continue;
    }
    // Auth-Metadaten konsistent halten (mergen, damit school o. Ä. erhalten bleibt).
    // Die „Display name"-Anzeige in Supabase speist sich aus full_name/display_name/name
    // → alle drei Schlüssel mitsäubern, falls sie ein Komma enthalten.
    try {
      const { data: u } = await supa.auth.admin.getUserById(c.id);
      const meta: Record<string, unknown> = { ...(u?.user?.user_metadata ?? {}) };
      for (const k of ["full_name", "name", "display_name"]) {
        if (typeof meta[k] === "string" && (meta[k] as string).includes(",")) {
          meta[k] = extractContactNames(meta[k] as string);
        }
      }
      meta.full_name = c.to; // immer auf den reinen Namen setzen
      await supa.auth.admin.updateUserById(c.id, { user_metadata: meta });
    } catch (e) {
      console.warn(
        `  ! Auth-Metadaten für ${c.id} nicht aktualisiert (sekundär):`,
        e instanceof Error ? e.message : String(e),
      );
    }
    ok++;
  }
  console.log(`\nFertig: ${ok} aktualisiert, ${fail} Fehler.`);
}

main().catch((e) => {
  console.error("❌ Unerwarteter Fehler:", e);
  process.exit(1);
});
