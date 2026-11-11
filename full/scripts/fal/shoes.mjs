// Investor prototype (11 Nov 2026): matches the shoes to the outfit without any model (free, deterministic).
// The avatars all stand in the same white sneakers, in the same pose, so the same pixels are the shoes in every
// look. The sneakers are found (pale, colourless pixels in the foot area, not touching the legs' colours),
// the white sole is kept, and the upper is recoloured with its own light and shade, so shape, laces and
// shadows stay real. Real boots or loafers need a try-on model and are planned for later.
// Usage: node scripts/fal/shoes.mjs <in.webp> <out.webp> <colour: white|black|brown|tan|navy|grey> [debug.png]
import fs from "node:fs";
import sharp from "sharp";

// Target colours of the upper: [r, g, b] of the mid-tone; shade follows the original light.
export const SHOE_COLOURS = {
  white: null,
  black: [34, 32, 34],
  brown: [104, 66, 40],
  tan: [172, 128, 84],
  navy: [34, 48, 84],
  grey: [112, 112, 116],
};

export async function recolourShoes(input, colour, { debug = null } = {}) {
  const target = SHOE_COLOURS[colour];
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const recolour = !!target;

  const y0 = Math.round(h * 0.9); // the foot area (shoes start about here in every look)
  const px = (x, y) => (y * w + x) * 4;
  const lum = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  const sat = (i) => Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);

  // 1. pale, colourless, solid pixels in the foot area
  const core = new Uint8Array(w * h);
  for (let y = y0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = px(x, y);
    if (data[i + 3] > 200 && lum(i) > 150 && sat(i) < 38) core[y * w + x] = 1;
  }
  // 2. grow by a few pixels into the shaded parts of the shoe (darker but still colourless), never into skin or fabric
  const mask = Uint8Array.from(core);
  for (let pass = 0; pass < 7; pass++) {
    const next = Uint8Array.from(mask);
    for (let y = y0; y < h; y++) for (let x = 1; x < w - 1; x++) {
      if (mask[y * w + x]) continue;
      const i = px(x, y);
      if (data[i + 3] < 200 || sat(i) > 46 || lum(i) < 40) continue;
      if (mask[y * w + x - 1] || mask[y * w + x + 1] || (y > y0 && mask[(y - 1) * w + x]) || (y < h - 1 && mask[(y + 1) * w + x])) next[y * w + x] = 1;
    }
    mask.set(next);
  }
  // 2b. only the shoes: pieces of the mask that reach the bottom edge of the picture (the soles touch it);
  // patches higher up (a pale trouser cuff, a sock) are left alone
  const seen = new Uint8Array(w * h);
  for (let y = y0; y < h; y++) for (let x = 0; x < w; x++) {
    const k0 = y * w + x;
    if (!mask[k0] || seen[k0]) continue;
    const stack = [k0];
    const comp = [];
    let touches = false;
    seen[k0] = 1;
    while (stack.length) {
      const k = stack.pop();
      comp.push(k);
      const cy = (k / w) | 0;
      if (cy >= h - 4) touches = true;
      const cx = k - cy * w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= w || ny < y0 || ny >= h) continue;
        const nk = ny * w + nx;
        if (mask[nk] && !seen[nk]) { seen[nk] = 1; stack.push(nk); }
      }
    }
    // A shoe is a big piece (the left one stands higher and may not touch the bottom edge); cuffs and socks are small.
    if (comp.length < 1500 && !touches) for (const k of comp) mask[k] = 0;
  }
  // 3. keep the sole white: per column, the lowest shoe pixels stay as they are
  const band = Math.max(10, Math.round(h * 0.0135));
  const soleKeep = new Uint8Array(w * h);
  const bottoms = new Int32Array(w).fill(-1);
  for (let x = 0; x < w; x++) for (let y = h - 1; y >= y0; y--) if (mask[y * w + x]) { bottoms[x] = y; break; }
  // The line between upper and sole follows a smoothed bottom edge (a median over neighbouring columns), so it is a clean curve.
  const smooth = new Int32Array(w).fill(-1);
  for (let x = 0; x < w; x++) {
    if (bottoms[x] < 0) continue;
    const near = [];
    for (let d = -12; d <= 12; d++) if (x + d >= 0 && x + d < w && bottoms[x + d] >= 0) near.push(bottoms[x + d]);
    near.sort((p, q) => p - q);
    smooth[x] = near[near.length >> 1];
  }
  for (let x = 0; x < w; x++) {
    if (smooth[x] < 0) continue;
    for (let y = Math.max(y0, smooth[x] - band); y <= h - 1; y++) soleKeep[y * w + x] = 1;
  }
  // 4. recolour with the original light: dark parts stay dark, highlights stay bright. The change is blended in
  // through a softened mask, so the edge of the upper and the line to the white sole show no steps.
  const wt = Buffer.alloc(w * h);
  for (let k = 0; k < w * h; k++) wt[k] = mask[k] && !soleKeep[k] ? 255 : 0;
  const soft = await sharp(wt, { raw: { width: w, height: h, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer();
  if (soft.length !== w * h) throw new Error("soft mask has the wrong size");
  let changed = 0;
  const out = Buffer.from(data);
  const dbg = debug ? Buffer.from(data) : null;
  for (let y = y0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x;
    const i = k * 4;
    if (dbg && mask[k]) { dbg[i] = soleKeep[k] ? 0 : 255; dbg[i + 1] = soleKeep[k] ? 255 : 0; dbg[i + 2] = 0; }
    const a = recolour ? soft[k] / 255 : 0;
    if (a < 0.04 || data[i + 3] < 30) continue;
    const l = Math.min(1, lum(i) / 235);
    const shade = 0.22 + 0.78 * Math.pow(l, 1.15);
    const sheen = Math.max(0, l - 0.9) * 0.7 * 255;
    for (let c = 0; c < 3; c++) {
      const tone = Math.max(0, Math.min(255, (target ? target[c] : 255) * shade + sheen));
      out[i + c] = Math.round(data[i + c] * (1 - a) + tone * a);
    }
    changed++;
  }
  const rgba = out;
  if (debug) await sharp(dbg, { raw: { width: w, height: h, channels: 4 } }).flatten({ background: "#1b1b1e" }).extract({ left: 0, top: y0, width: w, height: h - y0 }).resize({ width: 700 }).png().toFile(debug);
  const buf = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 95, alphaQuality: 95 }).toBuffer();
  // The pair on its own, without socks, trousers or legs: only the shoe pixels stay (a slightly softened edge).
  const whole = Buffer.alloc(w * h);
  for (let k = 0; k < w * h; k++) whole[k] = mask[k] ? 255 : 0;
  const edge = await sharp(whole, { raw: { width: w, height: h, channels: 1 } }).blur(0.9).extractChannel(0).raw().toBuffer();
  const alone = Buffer.from(rgba);
  for (let k = 0; k < w * h; k++) alone[k * 4 + 3] = Math.min(data[k * 4 + 3], Math.max(0, Math.min(255, Math.round((edge[k] - 90) * 1.6))));
  const piece = await sharp(alone, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 8 }).webp({ quality: 95, alphaQuality: 95 }).toBuffer();
  return { buf, piece, pixels: changed };
}

if (process.argv[1]?.endsWith("shoes.mjs") && process.argv[4]) {
  const [, , inPath, outPath, colour, debug] = process.argv;
  const { buf, pixels } = await recolourShoes(inPath, colour, { debug });
  fs.writeFileSync(outPath, buf);
  console.log(outPath, colour, pixels, "pixels");
}
