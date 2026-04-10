import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { list, put } from "@vercel/blob";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const SOURCE_DIR = resolve("private-images");
const OUTPUT_FILE = resolve("src/data/images.generated.ts");
const BLOB_PREFIX = "images/";
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

function slugFromFilename(file: string): string {
  return basename(file, extname(file));
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      "❌ BLOB_READ_WRITE_TOKEN fehlt. Führe 'vercel env pull .env.local' aus oder trage den Token manuell ein.",
    );
    process.exit(1);
  }

  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && ALLOWED_EXT.has(extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();

  if (files.length === 0) {
    console.error(`❌ Keine Bilder in ${SOURCE_DIR} gefunden.`);
    process.exit(1);
  }

  console.log(`📂 ${files.length} Bild(er) gefunden in ${SOURCE_DIR}\n`);

  const existing = await list({ prefix: BLOB_PREFIX });
  const existingByPath = new Map(existing.blobs.map((b) => [b.pathname, b]));

  const results: Array<{ slug: string; url: string; filename: string }> = [];

  for (const file of files) {
    const slug = slugFromFilename(file);
    const pathname = `${BLOB_PREFIX}${file}`;
    const existingBlob = existingByPath.get(pathname);

    if (existingBlob) {
      console.log(`↻  ${file} — bereits hochgeladen, überspringe`);
      results.push({ slug, url: existingBlob.url, filename: file });
      continue;
    }

    const data = await readFile(join(SOURCE_DIR, file));
    console.log(`⬆  ${file} (${(data.length / 1024 / 1024).toFixed(2)} MB) …`);

    const blob = await put(pathname, data, {
      access: "public",
      addRandomSuffix: false,
      contentType: `image/${extname(file).slice(1).replace("jpg", "jpeg")}`,
      cacheControlMaxAge: 31536000,
    });

    console.log(`   → ${blob.url}`);
    results.push({ slug, url: blob.url, filename: file });
  }

  results.sort((a, b) => a.slug.localeCompare(b.slug));

  const body = [
    "// AUTO-GENERATED — nicht von Hand bearbeiten.",
    "// Erzeugt durch scripts/upload-images.ts",
    "",
    "export const blobImages = {",
    ...results.map(
      (r) => `  ${JSON.stringify(r.slug)}: ${JSON.stringify(r.url)},`,
    ),
    "} as const;",
    "",
    "export type BlobImageKey = keyof typeof blobImages;",
    "",
  ].join("\n");

  await writeFile(OUTPUT_FILE, body, "utf8");
  console.log(`\n✅ URLs geschrieben nach ${OUTPUT_FILE}`);
  console.log(`   ${results.length} Einträge:`);
  for (const r of results) console.log(`   • ${r.slug}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
