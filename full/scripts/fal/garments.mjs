// Batch: 8 demo wardrobe garments as studio product photos (Flux Pro 1.1).
// Usage: node scripts/fal/garments.mjs [--only id1,id2] [--dry]
import fs from "node:fs";
import path from "node:path";
import { ROOT, falRun, download, estimateCost, spentSoFar, BUDGET_CAP_USD } from "./lib.mjs";

const MODEL = "fal-ai/flux-pro/v1.1";
const OUT = path.join(ROOT, "assets-src", "wardrobe");
const TALL = { width: 768, height: 1152 }; // < 1 MP
const SQUARE = { width: 960, height: 960 }; // < 1 MP

const GHOST =
  "high-end e-commerce ghost mannequin product photograph, garment shown front view with natural 3D shape as if worn by an invisible body, " +
  "entire garment visible and centered with margin around it, no person, no visible mannequin, no hanger";
const FLAT =
  "high-end e-commerce flat lay product photograph, top-down view, the single garment laid perfectly flat and neatly arranged, " +
  "only this one garment and nothing else, no person, no model, no body, no mannequin, no other clothing, no accessories";
const OBJECT = "high-end e-commerce product photograph, entire product visible and centered with margin around it, no person";
const STUDIO =
  "isolated on a plain seamless very pale off-white background that contrasts clearly with the product, soft diffused studio lighting, subtle natural shadow, " +
  "real camera photograph of real fabric, not a 3D render, not CGI, ultra sharp fabric texture with visible weave, natural creases and stitching, " +
  "luxury minimal catalogue style, no text, no logo, no label";

// role/hero: which hero figure wears it and in which order (garment flies in this order).
export const GARMENTS = [
  { id: "man-trousers", category: "pants-skirts", hero: "man:1", size: TALL, kind: FLAT, desc: "one pair of men's dark navy wool pleated straight-leg tailored trousers alone, full length with both legs visible, waistband at top" },
  { id: "man-blazer", category: "jackets-coats", hero: "man:2", size: TALL, kind: GHOST, desc: "men's camel brown unstructured soft wool single-breasted blazer, two buttons, open front showing an empty neckline" },
  { id: "man-loafers", category: "shoes", hero: "man:3", size: SQUARE, kind: OBJECT, desc: "a pair of men's dark brown polished leather penny loafers, three-quarter side view, side by side" },
  { id: "man-shirt", category: "shirts-tops", hero: null, size: TALL, kind: GHOST, desc: "men's light blue cotton oxford button-down shirt, long sleeves" },
  { id: "woman-blouse", category: "shirts-tops", hero: "woman:1", size: TALL, kind: FLAT, desc: "one women's ivory silk long-sleeve blouse alone with a soft round neckline, relaxed fit, sleeves laid out at the sides" },
  { id: "woman-skirt", category: "pants-skirts", hero: "woman:2", size: TALL, kind: GHOST, desc: "women's camel pleated satin midi skirt reaching below the knee, high waist" },
  { id: "woman-heels", category: "shoes", hero: "woman:3", size: SQUARE, kind: OBJECT, desc: "a pair of women's beige leather slingback shoes with a low block heel, three-quarter side view, side by side" },
  { id: "woman-bag", category: "accessories", hero: null, size: SQUARE, kind: OBJECT, desc: "a women's cognac brown smooth leather structured shoulder bag with a thin strap and gold clasp" },
];

const promptFor = (g) => `${g.desc}. ${g.kind}. ${STUDIO}`;

async function main() {
  const args = process.argv.slice(2);
  const onlyArg = args.find((a) => a.startsWith("--only"));
  const only = onlyArg ? (onlyArg.split("=")[1] ?? args[args.indexOf(onlyArg) + 1]).split(",") : null;
  const todo = GARMENTS.filter((g) => (only ? only.includes(g.id) : !fs.existsSync(path.join(OUT, `${g.id}.png`))));
  const est = todo.reduce((s, g) => s + estimateCost(MODEL, g.size), 0);
  console.log(`Garments to generate: ${todo.map((g) => g.id).join(", ") || "none"}`);
  console.log(`Estimated: $${est.toFixed(2)} | spent: $${spentSoFar().toFixed(3)} | cap: $${BUDGET_CAP_USD}`);
  if (args.includes("--dry") || !todo.length) return;

  fs.mkdirSync(OUT, { recursive: true });
  for (const g of todo) {
    const data = await falRun(
      MODEL,
      { prompt: promptFor(g), image_size: g.size, num_images: 1, output_format: "png", safety_tolerance: "2" },
      { note: `garment ${g.id}`, size: g.size },
    );
    await download(data.images[0].url, path.join(OUT, `${g.id}.png`));
  }
  // Manifest for the app (category + hero order), no Fal cost.
  fs.writeFileSync(
    path.join(ROOT, "public", "assets", "wardrobe", "manifest.json"),
    JSON.stringify(GARMENTS.map(({ id, category, hero }) => ({ id, category, hero })), null, 2),
  );
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
