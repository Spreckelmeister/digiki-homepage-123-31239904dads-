import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { del, list, put } from "@vercel/blob";
import { config } from "dotenv";
import sharp from "sharp";

config({ path: ".env.local" });
config({ path: ".env" });

const SOURCE_DIR = resolve("private-images");
const OUTPUT_FILE = resolve("src/data/images.generated.ts");
const BLOB_PREFIX = "images/";
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

// Komprimierungs-Einstellungen
const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;

function slugFromFilename(file: string): string {
  return basename(file, extname(file));
}

async function compressToWebp(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      "❌ BLOB_READ_WRITE_TOKEN fehlt. Führe 'vercel env pull .env.local' aus oder trage den Token manuell ein.",
    );
    process.exit(1);
  }

  const recompress = process.argv.includes("--recompress");

  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && ALLOWED_EXT.has(extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();

  if (files.length === 0) {
    console.error(`❌ Keine Bilder in ${SOURCE_DIR} gefunden.`);
    process.exit(1);
  }

  console.log(`📂 ${files.length} Bild(er) gefunden in ${SOURCE_DIR}`);
  console.log(`   Komprimierung: max ${MAX_WIDTH}px Breite, WebP Q${WEBP_QUALITY}`);
  if (recompress) console.log(`   🔄 --recompress: Alle Bilder werden neu hochgeladen`);
  console.log();

  const existing = await list({ prefix: BLOB_PREFIX });
  const existingByPath = new Map(existing.blobs.map((b) => [b.pathname, b]));

  const results: Array<{ slug: string; url: string; filename: string }> = [];

  for (const file of files) {
    const slug = slugFromFilename(file);
    const webpFilename = `${slug}.webp`;
    const webpPathname = `${BLOB_PREFIX}${webpFilename}`;

    // Auch alte JPG-Versionen als "bereits vorhanden" erkennen
    const existingWebp = existingByPath.get(webpPathname);

    if (existingWebp && !recompress) {
      console.log(`↻  ${file} → ${webpFilename} — bereits vorhanden, überspringe`);
      results.push({ slug, url: existingWebp.url, filename: webpFilename });
      continue;
    }

    // Original einlesen und komprimieren
    const raw = await readFile(join(SOURCE_DIR, file));
    const rawMb = (raw.length / 1024 / 1024).toFixed(2);

    const compressed = await compressToWebp(raw);
    const compMb = (compressed.length / 1024 / 1024).toFixed(2);
    const savings = (100 - (compressed.length / raw.length) * 100).toFixed(0);

    console.log(`⬆  ${file} (${rawMb} MB) → ${webpFilename} (${compMb} MB, −${savings}%) …`);

    // Alte JPG-Version löschen, falls vorhanden
    const oldJpgPathname = `${BLOB_PREFIX}${file}`;
    const oldJpg = existingByPath.get(oldJpgPathname);
    if (oldJpg && extname(file).toLowerCase() !== ".webp") {
      await del(oldJpg.url);
      console.log(`   🗑  Alte Version ${file} gelöscht`);
    }

    // Alte WebP-Version löschen bei --recompress
    if (existingWebp && recompress) {
      await del(existingWebp.url);
    }

    const blob = await put(webpPathname, compressed, {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/webp",
      cacheControlMaxAge: 31536000,
    });

    console.log(`   → ${blob.url}`);
    results.push({ slug, url: blob.url, filename: webpFilename });
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

  const totalRaw = files.length;
  console.log(`\n✅ ${totalRaw} Bilder verarbeitet → URLs in ${OUTPUT_FILE}`);
  for (const r of results) console.log(`   • ${r.slug} → ${r.filename}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
