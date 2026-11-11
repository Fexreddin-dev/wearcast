// Investor prototype (11 Nov 2026): the last, free retouch of a finished look cut-out. Pure pixel work, no model:
//  1. hair tips (optional zone): light grey streaks left by the try-on where long hair falls over a dark top are
//     filled from the surrounding hair and fabric;
//  2. edge clean-up: half-transparent edge pixels take the colour of the solid pixels next to them, so no light
//     fringe shows on the dark theme;
//  3. a light colour-only sharpening and a little more colour depth.
// Usage: node scripts/fal/finish.mjs <in.png> <out.webp> [hairZone y0,y1 as share of height]
import sharp from "sharp";

async function blurRGBW(rgb, weight, width, height, sigma) {
  const [c, w] = await Promise.all([
    sharp(rgb, { raw: { width, height, channels: 3 } }).blur(sigma).raw().toBuffer(),
    sharp(weight, { raw: { width, height, channels: 1 } }).blur(sigma).extractChannel(0).raw().toBuffer(),
  ]);
  if (c.length !== width * height * 3 || w.length !== width * height) throw new Error("blur changed the channel count");
  return { c, w };
}

// Fills the pixels marked in `bad` (and only those) with the average colour of good neighbours.
async function fill(rgba, width, height, isGood, isTarget, sigma) {
  const n = width * height;
  const rgb = Buffer.alloc(n * 3);
  const weight = Buffer.alloc(n);
  for (let i = 0; i < n; i++) {
    if (!isGood(i)) continue;
    weight[i] = 255;
    rgb[i * 3] = rgba[i * 4];
    rgb[i * 3 + 1] = rgba[i * 4 + 1];
    rgb[i * 3 + 2] = rgba[i * 4 + 2];
  }
  // Premultiplied blur: colour sum / weight sum, so empty pixels do not darken the result.
  const premul = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) premul[i * 3 + k] = Math.round((rgb[i * 3 + k] * weight[i]) / 255);
  const { c, w } = await blurRGBW(premul, weight, width, height, sigma);
  let changed = 0;
  for (let i = 0; i < n; i++) {
    if (!isTarget(i) || w[i] < 8) continue;
    for (let k = 0; k < 3; k++) rgba[i * 4 + k] = Math.min(255, Math.round((c[i * 3 + k] * 255) / w[i]));
    changed++;
  }
  return changed;
}

export async function finishLook(input, { hairZone = null } = {}) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const px = Buffer.from(data);
  const lum = (i) => (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
  const sat = (i) => Math.max(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) - Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
  const report = {};

  if (hairZone) {
    const [y0, y1] = hairZone.map((v) => Math.round(v * height));
    const inZone = (i) => {
      const y = Math.floor(i / width);
      return y >= y0 && y <= y1 && px[i * 4 + 3] === 255;
    };
    // Light, colourless pixels (the streaks) inside the zone; brown hair, skin and coloured fabric are kept.
    const streak = (i) => inZone(i) && lum(i) > 115 && sat(i) < 45;
    const marked = new Uint8Array(width * height);
    for (let i = 0; i < marked.length; i++) if (streak(i)) marked[i] = 1;
    // Grow by one pixel so the soft rim of each streak goes too.
    const grown = Uint8Array.from(marked);
    for (let i = 0; i < marked.length; i++) {
      if (!marked[i]) continue;
      for (const d of [-1, 1, -width, width]) if (i + d >= 0 && i + d < marked.length && inZone(i + d) && lum(i + d) > 95 && sat(i + d) < 60) grown[i + d] = 1;
    }
    report.hair = await fill(px, width, height, (i) => px[i * 4 + 3] === 255 && !grown[i], (i) => grown[i] === 1, 3);
  }

  // Edge pixels: colour from solid neighbours (alpha is left as it is).
  report.edge = await fill(px, width, height, (i) => px[i * 4 + 3] >= 250, (i) => px[i * 4 + 3] > 0 && px[i * 4 + 3] < 250, 1.2);

  const alpha = Buffer.alloc(width * height);
  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    alpha[i] = px[i * 4 + 3];
    rgb[i * 3] = px[i * 4];
    rgb[i * 3 + 1] = px[i * 4 + 1];
    rgb[i * 3 + 2] = px[i * 4 + 2];
  }
  const tuned = await sharp(rgb, { raw: { width, height, channels: 3 } })
    .modulate({ saturation: 1.06 })
    .sharpen({ sigma: 0.9, m1: 0.8, m2: 2.5 })
    .raw()
    .toBuffer();
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    out[i * 4] = tuned[i * 3];
    out[i * 4 + 1] = tuned[i * 3 + 1];
    out[i * 4 + 2] = tuned[i * 3 + 2];
    out[i * 4 + 3] = alpha[i];
  }
  // Trim the empty margin, as the shipped looks are.
  const buf = await sharp(out, { raw: { width, height, channels: 4 } }).trim({ threshold: 1 }).webp({ quality: 95, alphaQuality: 95 }).toBuffer();
  const meta = await sharp(buf).metadata();
  if (meta.channels !== 4) throw new Error("transparency lost");
  return { buf, report };
}

if (process.argv[1]?.endsWith("finish.mjs") && process.argv[3]) {
  const [, , inPath, outPath, zone] = process.argv;
  const { buf, report } = await finishLook(inPath, { hairZone: zone ? zone.split(",").map(Number) : null });
  (await import("node:fs")).writeFileSync(outPath, buf);
  console.log(outPath, JSON.stringify(report));
}
