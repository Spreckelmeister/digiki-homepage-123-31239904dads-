import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
// ESM-Build: @ffmpeg/ffmpeg läuft als Module-Worker; in einem Module-Worker
// gibt es kein `importScripts`, deshalb lädt der Worker den Core via
// `await import(coreURL)` und braucht ein `export default` – das hat nur der
// ESM-Build, der UMD-Build setzt nur `module.exports`.
const src = join(root, "node_modules", "@ffmpeg", "core", "dist", "esm");
const dest = join(root, "public", "ffmpeg-core");

await mkdir(dest, { recursive: true });
for (const file of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  await copyFile(join(src, file), join(dest, file));
  console.log(`copied ${file} -> public/ffmpeg-core/${file}`);
}
