// Investor prototype (11 Nov 2026): extra sample garments so each base avatar gets 5 looks.
// Usage: node --use-system-ca scripts/fal/proto-garments.mjs [--only=id1,id2] [--dry]
import fs from "node:fs";
import path from "node:path";
import { ROOT, falRun, download, estimateCost, spentSoFar, BUDGET_CAP_USD } from "./lib.mjs";

const MODEL = "fal-ai/flux-pro/v1.1";
const OUT = path.join(ROOT, "assets-src", "wardrobe");
const TALL = { width: 768, height: 1152 };
const GHOST =
  "high-end e-commerce ghost mannequin product photograph, garment shown front view with natural 3D shape as if worn by an invisible body, " +
  "entire garment visible and centered with margin around it, no person, no visible mannequin, no hanger";
const FLAT =
  "high-end e-commerce flat lay product photograph, top-down view, the single garment laid perfectly flat and neatly arranged, " +
  "only this one garment and nothing else, no person, no model, no body, no mannequin, no other clothing, no accessories";
const STUDIO =
  "isolated on a plain seamless very pale off-white background that contrasts clearly with the product, soft diffused studio lighting, subtle natural shadow, " +
  "real camera photograph of real fabric, not a 3D render, not CGI, ultra sharp fabric texture with visible weave, natural creases and stitching, " +
  "luxury minimal catalogue style, no text, no logo, no label";

export const PROTO = [
  { id: "man-chinos", kind: FLAT, desc: "one pair of men's stone beige cotton chino trousers alone, slim straight leg, full length with both legs visible, waistband at top" },
  { id: "man-jeans", kind: FLAT, desc: "one pair of men's dark indigo rinse straight-leg denim jeans alone, full length with both legs visible, waistband at top" },
  { id: "man-sweater", kind: GHOST, desc: "men's charcoal grey fine merino wool crew-neck sweater, long sleeves, ribbed cuffs and hem, regular fit" },
  { id: "man-turtleneck", kind: GHOST, desc: "men's black fine-knit merino wool turtleneck sweater, long sleeves, regular fit, the whole sweater small in the frame with wide empty margin on every side, both sleeves and the hem fully visible" },
  { id: "man-jacket", kind: GHOST, desc: "men's navy blue cotton harrington jacket, zip front fully open and hollow inside, only the jacket's own navy lining visible inside, nothing worn under it, no t-shirt, stand collar, ribbed cuffs and hem, hip length" },
  { id: "woman-trousers", kind: FLAT, desc: "one pair of women's solid jet black wool high-waisted wide-leg tailored trousers alone, entirely black fabric, full length to the floor with both legs visible, waistband at top" },
  { id: "woman-jeans", kind: FLAT, desc: "one pair of women's light blue straight-leg high-waisted denim jeans alone, full length with both legs visible, waistband at top" },
  { id: "woman-sweater", kind: GHOST, desc: "women's oatmeal cream soft wool crew-neck sweater, long sleeves, relaxed fit, hip length, no hanger, nothing above the neckline" },
  { id: "woman-shirt", kind: GHOST, desc: "women's crisp white cotton poplin button-up shirt, long sleeves, classic collar, hip length, relaxed fit, fully buttoned, no mannequin neck or stand, empty hollow collar, nothing above the collar" },
  { id: "woman-dress", kind: GHOST, desc: "women's navy blue fine-knit long-sleeve midi dress reaching below the knee, round neckline, straight relaxed fit" },
  { id: "woman-blazer", kind: GHOST, desc: "women's black tailored single-breasted wool blazer, one button, open front showing an empty neckline, hip length" },
];

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].split(",") : null;
const todo = PROTO.filter((g) => (only ? only.includes(g.id) : !fs.existsSync(path.join(OUT, `${g.id}.png`))));
console.log(`To make: ${todo.map((g) => g.id).join(", ") || "none"} | est $${(todo.length * estimateCost(MODEL, TALL)).toFixed(2)} | spent $${spentSoFar().toFixed(3)} | cap $${BUDGET_CAP_USD}`);
if (!args.includes("--dry")) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const g of todo) {
    const data = await falRun(MODEL, { prompt: `${g.desc}. ${g.kind}. ${STUDIO}`, image_size: TALL, num_images: 1, output_format: "png", safety_tolerance: "2" }, { note: `proto garment ${g.id}`, size: TALL });
    await download(data.images[0].url, path.join(OUT, `${g.id}.png`));
  }
}
