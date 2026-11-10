// Batch: base avatar FRONT views (Flux Pro 1.1).
// Usage: node scripts/fal/avatars.mjs            -> generate missing
//        node scripts/fal/avatars.mjs --only m2,f3 -> regenerate these
//        node scripts/fal/avatars.mjs --dry       -> print plan & cost, spend nothing
import fs from "node:fs";
import path from "node:path";
import { ROOT, falRun, download, estimateCost, spentSoFar, BUDGET_CAP_USD } from "./lib.mjs";

const MODEL = "fal-ai/flux-pro/v1.1";
const SIZE = { width: 720, height: 1280 };
const OUT = path.join(ROOT, "assets-src", "avatars");

const STUDIO =
  "full-body fashion catalogue photograph, entire figure visible from top of head to shoes with space above and below, " +
  "standing straight facing the camera, relaxed neutral expression, both arms hanging relaxed at the sides slightly away from the body with both hands fully visible, hands not in pockets, feet slightly apart," +
  "plain seamless warm cream studio backdrop (#F4F3EF), soft diffused studio key light from the front-left, gentle fill, soft natural floor shadow, " +
  "shot on 85mm lens at waist height, photorealistic, natural skin texture with pores, sharp fabric detail, " +
  "a fictional ordinary person, not a celebrity, no text, no logo";

const ADULT_BASE = "wearing a plain fitted white crew-neck t-shirt, straight light-grey trousers and plain white minimal sneakers";
const HIJAB_BASE =
  "wearing a neatly wrapped hijab fully covering hair and neck, a loose long-sleeved plain cream tunic reaching mid-thigh, " +
  "wide-leg light-grey trousers and plain white minimal sneakers, modest fashion";
// Children/teens: always fully clothed, age-appropriate, modest. Mandatory.
const TEEN_BASE =
  "wearing an age-appropriate loose plain white crew-neck t-shirt with short sleeves, loose full-length blue jeans and plain white sneakers, fully clothed";

export const AVATARS = [
  { id: "m1", group: "man", desc: "a man around 30 years old, light olive skin, short neat dark-brown hair, light stubble, average build", base: ADULT_BASE },
  { id: "m2", group: "man", desc: "a man in his mid 40s, medium tan skin, closely shaved head, full neatly trimmed dark beard, sturdy build", base: ADULT_BASE },
  { id: "m3", group: "man", desc: "a man around 24 years old, fair skin, wavy medium-length light-brown hair, clean-shaven, slim build", base: ADULT_BASE },
  {
    id: "f1",
    group: "woman",
    desc:
      "a woman around 28 years old, light olive skin, long straight dark-brown hair, average build, " +
      "posing like a catalogue model with both arms straight down by her sides, palms resting lightly against the outside of her thighs, fingers relaxed and fully visible, nothing in her hands",
    base: "wearing a plain fitted white crew-neck t-shirt tucked in, straight light-grey trousers without visible pockets and plain white minimal sneakers",
  },
  { id: "f2", group: "woman", desc: "a woman in her late 30s, fair skin, shoulder-length curly auburn hair, curvy build", base: ADULT_BASE },
  { id: "f3", group: "woman", desc: "a woman around 25 years old, deep brown skin, short natural curly black hair, slim build", base: ADULT_BASE },
  { id: "h1", group: "hijab", desc: "a woman around 30 years old, light olive skin, soft beige hijab, average build", base: HIJAB_BASE },
  { id: "h2", group: "hijab", desc: "a woman around 22 years old, fair skin, dusty-rose hijab, slim build", base: HIJAB_BASE },
  { id: "tb1", group: "teen-boy", desc: "a teenage boy around 15 years old, light olive skin, short dark hair, slim build", base: TEEN_BASE },
  { id: "tb2", group: "teen-boy", desc: "a boy around 12 years old, fair skin, short light-brown hair, average build", base: TEEN_BASE },
  { id: "tg1", group: "teen-girl", desc: "a teenage girl around 15 years old, light olive skin, long dark hair in a low ponytail, slim build", base: TEEN_BASE },
  { id: "tg2", group: "teen-girl", desc: "a girl around 12 years old, fair skin, shoulder-length light-brown hair, average build", base: TEEN_BASE },
];

const promptFor = (a) => `${a.desc}, ${a.base}. ${STUDIO}`;

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const onlyArg = args.find((a) => a.startsWith("--only"));
  const only = onlyArg ? (onlyArg.split("=")[1] ?? args[args.indexOf(onlyArg) + 1]).split(",") : null;

  const todo = AVATARS.filter((a) =>
    only ? only.includes(a.id) : !fs.existsSync(path.join(OUT, `${a.id}-front.png`)),
  );
  const est = todo.length * estimateCost(MODEL, SIZE);
  console.log(`Avatars to generate: ${todo.map((a) => a.id).join(", ") || "none"}`);
  console.log(`Estimated: $${est.toFixed(2)} | spent so far: $${spentSoFar().toFixed(3)} | cap: $${BUDGET_CAP_USD}`);
  if (dry || !todo.length) return;

  fs.mkdirSync(OUT, { recursive: true });
  const meta = fs.existsSync(path.join(OUT, "meta.json")) ? JSON.parse(fs.readFileSync(path.join(OUT, "meta.json"), "utf8")) : {};
  for (const a of todo) {
    const data = await falRun(
      MODEL,
      { prompt: promptFor(a), image_size: SIZE, num_images: 1, output_format: "png", safety_tolerance: "2", enable_safety_checker: true },
      { note: `avatar ${a.id} front`, size: SIZE },
    );
    await download(data.images[0].url, path.join(OUT, `${a.id}-front.png`));
    meta[a.id] = { seed: data.seed, prompt: promptFor(a) };
    fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify(meta, null, 2));
  }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
