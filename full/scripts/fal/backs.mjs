// BACK view of each base avatar from its front image (Flux Kontext), then a transparent cutout.
// Usage: node scripts/fal/backs.mjs --only f1 [--dry]
// Costs per avatar: Kontext $0.04 + BiRefNet $0.01 (booked).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ROOT, ASSETS, falRun, download, uploadFile, estimateCost, spentSoFar, BUDGET_CAP_USD } from "./lib.mjs";

const KONTEXT = "fal-ai/flux-pro/kontext";
const BIREFNET = "fal-ai/birefnet/v2";
const SRC = path.join(ROOT, "assets-src", "avatars");
const PUBLIC = path.join(ASSETS, "avatars");

const PROMPT =
  "Show this exact same person from directly behind, a strict back view, body and head facing fully away from the camera, face not visible. " +
  "Keep the identical skin tone, hair color and length or head covering, body proportions and the exact same clothes and shoes. " +
  "Full body from top of head to shoes, standing upright, arms hanging relaxed at the sides, hands visible. " +
  "Same plain warm cream studio backdrop, same soft studio lighting, photorealistic.";

const args = process.argv.slice(2);
const i = args.indexOf("--only");
if (i < 0 || !args[i + 1]) throw new Error("Pass --only with avatar ids, so spending is always explicit");
const ids = args[i + 1].split(",");

const each = estimateCost(KONTEXT) + estimateCost(BIREFNET);
console.log(`Back views: ${ids.join(", ")}`);
console.log(`Estimated: $${(ids.length * each).toFixed(2)} | spent: $${spentSoFar().toFixed(3)} | cap: $${BUDGET_CAP_USD}`);
if (args.includes("--dry")) process.exit(0);

for (const id of ids) {
  const front = await uploadFile(path.join(SRC, `${id}-front.png`));
  const made = await falRun(
    KONTEXT,
    { prompt: PROMPT, image_url: front, aspect_ratio: "9:16", output_format: "png", safety_tolerance: "2" },
    { note: `avatar ${id} back` },
  );
  const original = await download(made.images[0].url, path.join(SRC, `${id}-back.png`));
  const cut = await falRun(
    BIREFNET,
    { image_url: await uploadFile(original), model: "General Use (Heavy)", operating_resolution: "1024x1024", refine_foreground: true, output_format: "png" },
    { note: `cutout avatar ${id} back` },
  );
  const raw = Buffer.from(await (await fetch(cut.image.url)).arrayBuffer());
  const trimmed = await sharp(raw).trim({ threshold: 1 }).extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp(trimmed).png({ compressionLevel: 9 }).toFile(path.join(PUBLIC, `${id}-back.png`));
  await sharp(trimmed).webp({ quality: 90, alphaQuality: 95 }).toFile(path.join(PUBLIC, `${id}-back.webp`));
}
