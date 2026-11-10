// Batch: SIDE view of each base avatar from its front image (Flux Kontext keeps identity).
// Usage: node scripts/fal/sides.mjs [--only m1,f2] [--dry]
import fs from "node:fs";
import path from "node:path";
import { ROOT, falRun, download, uploadFile, estimateCost, spentSoFar, BUDGET_CAP_USD } from "./lib.mjs";
import { AVATARS } from "./avatars.mjs";

const MODEL = "fal-ai/flux-pro/kontext";
const DIR = path.join(ROOT, "assets-src", "avatars");

const PROMPT =
  "Show this exact same person from a strict side profile view, body and face turned 90 degrees to face the left edge of the image. " +
  "Keep the identical face, skin tone, hair, body proportions and the exact same clothes and shoes. " +
  "Full body from top of head to shoes, standing upright, arms hanging relaxed at the sides, hands visible. " +
  "Same plain warm cream studio backdrop, same soft studio lighting, photorealistic.";

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only"));
const only = onlyArg ? (onlyArg.split("=")[1] ?? args[args.indexOf(onlyArg) + 1]).split(",") : null;
const todo = AVATARS.filter((a) => (only ? only.includes(a.id) : !fs.existsSync(path.join(DIR, `${a.id}-side.png`))));

console.log(`Side views to generate: ${todo.map((a) => a.id).join(", ") || "none"}`);
console.log(`Estimated: $${(todo.length * estimateCost(MODEL)).toFixed(2)} | spent: $${spentSoFar().toFixed(3)} | cap: $${BUDGET_CAP_USD}`);
if (args.includes("--dry")) process.exit(0);

for (const a of todo) {
  const url = await uploadFile(path.join(DIR, `${a.id}-front.png`));
  const data = await falRun(
    MODEL,
    { prompt: PROMPT, image_url: url, aspect_ratio: "9:16", output_format: "png", safety_tolerance: "2" },
    { note: `avatar ${a.id} side` },
  );
  await download(data.images[0].url, path.join(DIR, `${a.id}-side.png`));
}
