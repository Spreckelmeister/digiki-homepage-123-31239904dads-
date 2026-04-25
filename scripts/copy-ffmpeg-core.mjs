import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ESM-Build: @ffmpeg/ffmpeg läuft als Module-Worker; in einem Module-Worker
// gibt es kein `importScripts`, deshalb lädt der Worker den Core via
// `await import(coreURL)` und braucht ein `export default` – das hat nur der
// ESM-Build, der UMD-Build setzt nur `module.exports`.
const coreSrc = join(root, "node_modules", "@ffmpeg", "core", "dist", "esm");
const coreDest = join(root, "public", "ffmpeg-core");

await mkdir(coreDest, { recursive: true });
for (const file of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  await copyFile(join(coreSrc, file), join(coreDest, file));
  console.log(`copied ${file} -> public/ffmpeg-core/${file}`);
}

// Den FFmpeg-Worker selbst auch nach public/ kopieren und via classWorkerURL
// referenzieren. Grund: der Worker enthält `await import(_coreURL)` mit einer
// dynamischen Blob-URL – Turbopack/Webpack scheitert daran beim Bundlen
// ("Cannot find module as expression is too dynamic"). Wenn wir den Worker
// als statische Datei ausliefern, läuft der Import direkt im Browser, ohne
// Bundler-Pass.
const workerSrc = join(root, "node_modules", "@ffmpeg", "ffmpeg", "dist", "esm");
const workerDest = join(root, "public", "ffmpeg-worker");

await mkdir(workerDest, { recursive: true });
for (const file of ["worker.js", "const.js", "errors.js"]) {
  await copyFile(join(workerSrc, file), join(workerDest, file));
  console.log(`copied ${file} -> public/ffmpeg-worker/${file}`);
}
