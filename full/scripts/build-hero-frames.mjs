// Builds web-ready hero frame sequences + manifest (no Fal cost).
// Usage: node scripts/build-hero-frames.mjs [srcFramesDir] [publicSubdir]
//   default: assets-src/hero2/frames -> public/assets/hero/v2
// Desktop: every frame, 1600px wide. Mobile: every 2nd frame, 900px wide.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.resolve(ROOT, process.argv[2] ?? "assets-src/hero2/frames");
const SUB = process.argv[3] ?? "assets/hero/v2";
const OUT = path.join(ROOT, "public", SUB);
const frames = fs.readdirSync(SRC).filter((f) => f.endsWith(".png")).sort();

const sets = [
  { name: "d", width: 1600, step: 1, quality: 72 },
  { name: "m", width: 900, step: 2, quality: 70 },
];

const manifest = { base: `/${SUB}`, frames: {}, ratio: 0, wall: "", floor: "", edgeWall: "", edgeFloor: "" };
for (const s of sets) {
  const dir = path.join(OUT, "frames", s.name);
  fs.mkdirSync(dir, { recursive: true });
  const picked = frames.filter((_, i) => i % s.step === 0 || i === frames.length - 1);
  let bytes = 0;
  for (const [i, f] of picked.entries()) {
    const out = path.join(dir, `${String(i + 1).padStart(3, "0")}.webp`);
    await sharp(path.join(SRC, f)).resize({ width: s.width }).webp({ quality: s.quality }).toFile(out);
    bytes += fs.statSync(out).size;
  }
  const meta = await sharp(path.join(dir, "001.webp")).metadata();
  manifest.frames[s.name] = { count: picked.length, width: meta.width, height: meta.height, path: `/${SUB}/frames/${s.name}` };
  manifest.ratio = meta.width / meta.height;
  console.log(`${s.name}: ${picked.length} frames, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
}

// Backdrop colours from raw pixels: top/bottom rows (for phones) and the outer columns (for very wide screens).
const first = path.join(SRC, frames[0]);
const { data, info } = await sharp(first).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const avg = (x0, x1, y0, y1) => {
  const sum = [0, 0, 0];
  let n = 0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = (y * info.width + x) * info.channels;
      sum[0] += data[i]; sum[1] += data[i + 1]; sum[2] += data[i + 2]; n++;
    }
  return "#" + sum.map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("");
};
const Wd = info.width, Hd = info.height;
manifest.wall = avg(0, Wd, 0, 6);
manifest.floor = avg(0, Wd, Hd - 6, Hd);
// outer 4px columns, both sides, upper wall area and floor area
const colAvg = (y0, y1) => {
  const l = avg(0, 4, y0, y1), r = avg(Wd - 4, Wd, y0, y1);
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return "#" + p(l).map((v, i) => Math.round((v + p(r)[i]) / 2).toString(16).padStart(2, "0")).join("");
};
manifest.edgeWall = colAvg(Math.round(Hd * 0.1), Math.round(Hd * 0.7));
manifest.edgeFloor = colAvg(Math.round(Hd * 0.88), Hd);

// Static posters (closed / open) for no-JS, LCP and reduced motion.
await sharp(first).resize({ width: 1600 }).webp({ quality: 78 }).toFile(path.join(OUT, "stage-closed.webp"));
await sharp(path.join(SRC, frames.at(-1))).resize({ width: 1600 }).webp({ quality: 78 }).toFile(path.join(OUT, "stage-open.webp"));
// Ending poster = exact composite the living video starts from.
const endStart = path.join(ROOT, "assets-src", "hero2", "ending-start.png");
if (fs.existsSync(endStart)) await sharp(endStart).resize({ width: 1600 }).webp({ quality: 80 }).toFile(path.join(OUT, "ending-poster.webp"));

fs.writeFileSync(path.join(ROOT, "src", "components", "hero", "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(manifest);
