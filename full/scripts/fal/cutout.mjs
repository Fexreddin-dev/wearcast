// Background removal (BiRefNet v2) -> transparent PNG + WebP, trimmed, into public/assets/<kind>/.
// Usage: node scripts/fal/cutout.mjs <src-dir> <dest-dir> [--only a,b] [--dry]
// Skips files that already have a cutout.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ROOT, falRun, download, uploadFile, estimateCost, spentSoFar, BUDGET_CAP_USD } from "./lib.mjs";

const MODEL = "fal-ai/birefnet/v2";
const [srcArg, destArg, ...rest] = process.argv.slice(2);
const SRC = path.resolve(ROOT, srcArg);
const DEST = path.resolve(ROOT, destArg);
const onlyArg = rest.find((a) => a.startsWith("--only"));
const only = onlyArg ? (onlyArg.split("=")[1] ?? rest[rest.indexOf(onlyArg) + 1]).split(",") : null;

const files = fs
  .readdirSync(SRC)
  .filter((f) => f.endsWith(".png"))
  .filter((f) => (only ? only.some((o) => f.startsWith(o + "-") || f === o + ".png") : !fs.existsSync(path.join(DEST, f))));

console.log(`Cutouts to make: ${files.length}`);
console.log(`Estimated: $${(files.length * estimateCost(MODEL)).toFixed(2)} | spent: $${spentSoFar().toFixed(3)} | cap: $${BUDGET_CAP_USD}`);
if (rest.includes("--dry")) process.exit(0);

fs.mkdirSync(DEST, { recursive: true });
const tmp = path.join(ROOT, "assets-src", ".tmp");
for (const f of files) {
  const url = await uploadFile(path.join(SRC, f));
  const data = await falRun(
    MODEL,
    { image_url: url, model: "General Use (Heavy)", operating_resolution: "1024x1024", refine_foreground: true, output_format: "png" },
    { note: `cutout ${path.basename(SRC)}/${f}` },
  );
  const raw = await download(data.image.url, path.join(tmp, f));
  // Trim empty transparent margins but keep a small pad so shadows/edges are not clipped.
  const trimmed = await sharp(raw).trim({ threshold: 1 }).extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp(trimmed).png({ compressionLevel: 9 }).toFile(path.join(DEST, f));
  await sharp(trimmed).webp({ quality: 90, alphaQuality: 95 }).toFile(path.join(DEST, f.replace(/\.png$/, ".webp")));
}
fs.rmSync(tmp, { recursive: true, force: true });
