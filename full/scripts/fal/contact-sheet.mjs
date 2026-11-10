// Builds a labelled contact sheet PNG from a folder of images (no Fal cost).
// Usage: node scripts/fal/contact-sheet.mjs <folder> <pattern-suffix> <out.png>
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [dir, suffix = ".png", out] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter((f) => f.endsWith(suffix)).sort();
const W = 240, H = 427, LABEL = 34, COLS = 6, GAP = 12;
const rows = Math.ceil(files.length / COLS);
const sheetW = COLS * W + (COLS + 1) * GAP;
const sheetH = rows * (H + LABEL) + (rows + 1) * GAP;

const tiles = [];
for (const [i, f] of files.entries()) {
  const x = GAP + (i % COLS) * (W + GAP);
  const y = GAP + Math.floor(i / COLS) * (H + LABEL + GAP);
  const img = await sharp(path.join(dir, f)).resize(W, H, { fit: "contain", background: "#F4F3EF" }).png().toBuffer();
  tiles.push({ input: img, left: x, top: y });
  const label = Buffer.from(
    `<svg width="${W}" height="${LABEL}"><text x="${W / 2}" y="23" font-family="Arial" font-size="18" text-anchor="middle" fill="#1C1C1E">${f.replace(suffix, "")}</text></svg>`,
  );
  tiles.push({ input: label, left: x, top: y + H });
}
await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: "#EAE8E1" } })
  .composite(tiles)
  .png()
  .toFile(out);
console.log(`Contact sheet: ${out} (${files.length} images)`);
