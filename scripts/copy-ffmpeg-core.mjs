import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "node_modules", "@ffmpeg", "core", "dist", "umd");
const dest = join(root, "public", "ffmpeg-core");

await mkdir(dest, { recursive: true });
for (const file of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  await copyFile(join(src, file), join(dest, file));
  console.log(`copied ${file} -> public/ffmpeg-core/${file}`);
}
