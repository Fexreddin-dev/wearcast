// Investor prototype (11 Nov 2026): copies the finished, checked curated looks from storage into
// public/assets/looks/<id>.webp, so the site shows them as plain files (instant, no database). Free.
// Run like proto-looks.mts.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { runTryOn } from "@/lib/wardrobe/tryon";
import { CURATED, CURATOR_ID } from "@/lib/wardrobe/curated";

const OUT = path.join(process.cwd(), "public", "assets", "looks");
fs.mkdirSync(OUT, { recursive: true });
for (const look of CURATED) {
  const res = await runTryOn({ id: CURATOR_ID, unlimited: true }, look.avatar, look.refs, true);
  if (!res.image) {
    console.log(`MISSING ${look.id}`);
    continue;
  }
  // A light sharpening (compared side by side, 11 Nov 2026) makes seams, buttons and pleats clearer
  // without changing the picture. The originals stay in storage.
  const raw = Buffer.from(await (await fetch(res.image)).arrayBuffer());
  // Only the colours are sharpened. The soft cut-out edge is pulled in by about a pixel, which removes the
  // light fringe the background removal left (visible on the dark theme, e.g. between the legs).
  const { data: rgba, info } = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const rgb = await sharp(rgba, { raw: { width, height, channels: 4 } }).removeAlpha().sharpen({ sigma: 0.9, m1: 0.8, m2: 2.5 }).raw().toBuffer();
  const a0 = await sharp(rgba, { raw: { width, height, channels: 4 } }).extractChannel(3).blur(0.7).raw().toBuffer();
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    out[i * 4] = rgb[i * 3];
    out[i * 4 + 1] = rgb[i * 3 + 1];
    out[i * 4 + 2] = rgb[i * 3 + 2];
    out[i * 4 + 3] = Math.max(0, Math.min(255, Math.round((a0[i] - 0.375 * 255) * 1.6))); // pull the soft edge in about a pixel
  }
  const buf = await sharp(out, { raw: { width, height, channels: 4 } }).webp({ quality: 95, alphaQuality: 95 }).toBuffer();
  const meta = await sharp(buf).metadata();
  if (meta.channels !== 4) throw new Error(`${look.id}: transparency lost`);
  fs.writeFileSync(path.join(OUT, `${look.id}.webp`), buf);
  console.log(`saved ${look.id} ${Math.round(buf.length / 1024)} KB`);
}
