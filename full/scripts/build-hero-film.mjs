// Builds the hero film chapters as web image sequences + manifest (no Fal cost).
// Every frame is cover-fitted to the same stage size so chapters line up exactly.
//   c1 sky → window      (assets-src/hero3/v1)
//   c2 window → studio   (assets-src/hero3/v2)
//   c3 doors open        (assets-src/hero2/frames)
//   c4 into the wardrobe (assets-src/hero3/v3)   (played backwards for the pull-back)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "assets", "hero", "film");
const CHAPTERS = {
  c1: "assets-src/hero3/v1",
  c2: "assets-src/hero3/v2",
  c3: "assets-src/hero2/frames",
  c4: "assets-src/hero3/v3",
};
const SETS = [
  { name: "d", width: 1600, height: 862, step: 2, quality: 72 },
  { name: "m", width: 900, height: 485, step: 3, quality: 68 },
];

const manifest = { base: "/assets/hero/film", ratio: 1600 / 862, chapters: {} };
let total = { d: 0, m: 0 };
for (const [ch, rel] of Object.entries(CHAPTERS)) {
  const src = path.join(ROOT, rel);
  const frames = fs.readdirSync(src).filter((f) => f.endsWith(".png")).sort();
  manifest.chapters[ch] = {};
  for (const s of SETS) {
    const dir = path.join(OUT, ch, s.name);
    fs.mkdirSync(dir, { recursive: true });
    const picked = frames.filter((_, i) => i % s.step === 0 || i === frames.length - 1);
    for (const [i, f] of picked.entries()) {
      const out = path.join(dir, `${String(i + 1).padStart(3, "0")}.webp`);
      await sharp(path.join(src, f)).resize(s.width, s.height, { fit: "cover", position: "centre" }).webp({ quality: s.quality }).toFile(out);
      total[s.name] += fs.statSync(out).size;
    }
    manifest.chapters[ch][s.name] = picked.length;
  }
  console.log(ch, manifest.chapters[ch]);
}
// Gold blueprint overlay for the "digital wardrobe" moment (same crop as the last c4 frame).
for (const s of SETS)
  await sharp(path.join(ROOT, "assets-src/hero3/k4-gold.png"))
    .resize(s.width, s.height, { fit: "cover", position: "centre" })
    .webp({ quality: 80 })
    .toFile(path.join(OUT, `gold-${s.name}.webp`));
// First frame as poster (LCP / no-JS).
await sharp(path.join(OUT, "c1", "d", "001.webp")).toFile(path.join(OUT, "poster.webp"));

fs.writeFileSync(path.join(ROOT, "src", "components", "hero", "film.json"), JSON.stringify(manifest, null, 2));
console.log(`desktop ${(total.d / 1048576).toFixed(2)} MB, mobile ${(total.m / 1048576).toFixed(2)} MB`);
