// Investor prototype (11 Nov 2026): clean catalogue pictures of the four sneaker colours worn in the looks, shown
// as "shoes" pieces next to the other garments (a crop from the model's feet showed cut-off ankles and cuffs).
// Usage: node --use-system-ca scripts/fal/proto-shoe-photos.mjs [--only=white,black] [--dry]
import fs from "node:fs";
import path from "node:path";
import { ROOT, falRun, download, estimateCost, spentSoFar, BUDGET_CAP_USD } from "./lib.mjs";

const MODEL = "fal-ai/flux-pro/v1.1";
const OUT = path.join(ROOT, "assets-src", "shoes");
const SQUARE = { width: 960, height: 960 };
const STUDIO =
  "high-end e-commerce product photograph, a single pair of low-top leather sneakers side by side, three-quarter side view, " +
  "entire pair visible and centered with margin around it, no person, no feet, no socks, no legs, isolated on a plain seamless very pale off-white background, " +
  "soft diffused studio lighting, subtle natural shadow, real camera photograph, not a 3D render, ultra sharp stitching and laces, luxury minimal catalogue style, no text, no logo, no label";

const COLOURS = {
  white: "clean white leather sneakers with a white rubber sole and white laces",
  black: "matte black leather sneakers with a white rubber sole and black laces",
  brown: "chestnut brown suede sneakers with a white rubber sole and brown laces",
  tan: "light tan sand suede sneakers with a white rubber sole and tan laces",
};

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].split(",") : Object.keys(COLOURS);
const todo = only.filter((c) => COLOURS[c] && (onlyArg || !fs.existsSync(path.join(OUT, `${c}.png`))));
console.log(`To make: ${todo.join(", ") || "none"} | est $${(todo.length * estimateCost(MODEL, SQUARE)).toFixed(2)} | spent $${spentSoFar().toFixed(3)} | cap $${BUDGET_CAP_USD}`);
if (!args.includes("--dry")) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const c of todo) {
    const data = await falRun(MODEL, { prompt: `${COLOURS[c]}. ${STUDIO}`, image_size: SQUARE, num_images: 1, output_format: "png", safety_tolerance: "2" }, { note: `proto shoe ${c}`, size: SQUARE });
    await download(data.images[0].url, path.join(OUT, `${c}.png`));
  }
}
