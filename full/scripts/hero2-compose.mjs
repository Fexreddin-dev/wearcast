// Composes the final dressed scene exactly as the hero code lays it out (start frame for the living ending video).
import sharp from "sharp";
import { LAYOUT } from "../src/components/hero/layout.mjs";

const bg = "assets-src/hero2/frames/f121.png";
const { width: W, height: H } = await sharp(bg).metadata();
const layers = [];
for (const who of ["man", "woman"]) {
  const p = LAYOUT.people[who];
  const h = Math.round(p.h * H);
  const img = await sharp(`public/assets/hero/v2/states/${who}-3.webp`).resize({ height: h }).toBuffer();
  const { width: w } = await sharp(img).metadata();
  const left = Math.round(p.cx * W - w / 2);
  const top = Math.round(LAYOUT.feetY * H - h);
  // soft contact shadow like the CSS one
  const sw = Math.round(w * 1.5), sh = Math.round(h * 0.05);
  const shadow = Buffer.from(`<svg width="${sw}" height="${sh}"><defs><radialGradient id="g"><stop offset="0" stop-color="rgb(70,50,30)" stop-opacity="0.38"/><stop offset="0.6" stop-color="rgb(70,50,30)" stop-opacity="0.12"/><stop offset="1" stop-color="rgb(70,50,30)" stop-opacity="0"/></radialGradient></defs><ellipse cx="${sw / 2}" cy="${sh / 2}" rx="${sw / 2}" ry="${sh / 2}" fill="url(#g)"/></svg>`);
  layers.push({ input: shadow, left: Math.round(p.cx * W - sw / 2), top: Math.round(LAYOUT.feetY * H - sh / 2 + h * 0.012) });
  layers.push({ input: img, left, top });
}
await sharp(bg).composite(layers).png().toFile("assets-src/hero2/ending-start.png");
console.log("ok", W, H);
