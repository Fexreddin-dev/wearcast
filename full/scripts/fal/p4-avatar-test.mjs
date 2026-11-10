// Phase 4 test (temporary): can a casual photo become a tidy studio avatar without changing the person?
// Steps: people (3 synthetic test photos) -> studio (FASHN outfit swap from a base avatar) -> sheet.
// Usage: node --use-system-ca scripts/fal/p4-avatar-test.mjs <people|studio|sheet> [--only a,b]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ASSETS, download, falRun, ROOT } from "./lib.mjs";
import { fal } from "@fal-ai/client";

const OUT = path.join(ROOT, "assets-src", "p4-test");
fs.mkdirSync(OUT, { recursive: true });
const step = process.argv[2];
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1].split(",") : null;

const PEOPLE = {
  man: {
    base: "m1",
    prompt:
      "Casual smartphone photo of a 30 year old man standing in a living room, full body from head to shoes, facing the camera, arms relaxed at his sides, wearing a navy hoodie, black slim jeans and dark sneakers, natural indoor light, realistic amateur photo",
  },
  woman: {
    base: "f1",
    prompt:
      "Casual smartphone photo of a 28 year old woman standing on a city sidewalk, full body from head to shoes, facing the camera, arms relaxed, wearing a light denim jacket over a floral midi dress and white sneakers, daylight, realistic amateur photo",
  },
  hijab: {
    base: "h1",
    prompt:
      "Casual smartphone photo of a 25 year old woman wearing a black hijab, standing in a hallway, full body from head to shoes, facing the camera, arms relaxed, wearing a long olive green cardigan over a black top and dark wide trousers, flat shoes, warm indoor light, realistic amateur photo",
  },
};
const ids = Object.keys(PEOPLE).filter((id) => !only || only.includes(id));

async function upJpeg(buf, bg = "#F4F3EF") {
  const jpeg = await sharp(buf).flatten({ background: bg }).resize(1024, 1536, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 93 }).toBuffer();
  return fal.storage.upload(new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }));
}

if (step === "people") {
  for (const id of ids) {
    const data = await falRun(
      "fal-ai/flux/dev",
      { prompt: PEOPLE[id].prompt, image_size: { width: 768, height: 1280 }, num_images: 1, enable_safety_checker: true },
      { note: `p4 test photo ${id}`, size: { width: 768, height: 1280 } },
    );
    await download(data.images[0].url, path.join(OUT, `${id}-photo.jpg`));
  }
}

if (step === "studio") {
  for (const id of ids) {
    const model = await upJpeg(fs.readFileSync(path.join(OUT, `${id}-photo.jpg`)));
    const garment = await upJpeg(fs.readFileSync(path.join(ASSETS, "avatars", `${PEOPLE[id].base}-front.png`)));
    const data = await falRun(
      "fal-ai/fashn/tryon/v1.6",
      {
        model_image: model,
        garment_image: garment,
        category: "auto",
        garment_photo_type: "model",
        mode: "balanced",
        moderation_level: "conservative",
        num_samples: 1,
        output_format: "png",
      },
      { note: `p4 studio outfit ${id}` },
    );
    await download(data.images[0].url, path.join(OUT, `${id}-studio.png`));
  }
}

if (step === "sheet") {
  const tiles = [];
  for (const id of ids) {
    for (const f of [`${id}-photo.jpg`, `${id}-studio.png`]) {
      const p = path.join(OUT, f);
      if (!fs.existsSync(p)) continue;
      tiles.push(await sharp(p).resize(360, 600, { fit: "contain", background: "#EAE8E1" }).flatten({ background: "#EAE8E1" }).png().toBuffer());
    }
  }
  await sharp({ create: { width: 360 * Math.min(tiles.length, 6), height: 600 * Math.ceil(tiles.length / 6), channels: 3, background: "#EAE8E1" } })
    .composite(tiles.map((b, i) => ({ input: b, left: (i % 6) * 360, top: Math.floor(i / 6) * 600 })))
    .jpeg({ quality: 88 })
    .toFile(path.join(OUT, "sheet.jpg"));
  console.log(path.join(OUT, "sheet.jpg"));
}

// One-time base outfits as garment-only pictures, so nothing from the base model's head (hijab, hair) can travel.
const OUTFITS = {
  basic: { from: "m1", text: "the plain white short-sleeve crew-neck t-shirt and the light grey trousers" },
  modest: { from: "h1", text: "the cream long-sleeve high-neck sweater and the beige wide-leg trousers" },
};
if (step === "outfits") {
  for (const [id, o] of Object.entries(OUTFITS)) {
    if (only && !only.includes(id)) continue;
    const img = await upJpeg(fs.readFileSync(path.join(ASSETS, "avatars", `${o.from}-front.png`)), "#FFFFFF");
    const data = await falRun(
      "fal-ai/flux-pro/kontext",
      {
        prompt:
          `Professional flat lay product photograph of only this outfit: ${o.text}, laid flat on a plain white surface, seen from directly above, ` +
          "the top placed above the trousers as if worn, sleeves straight down at the sides, neatly pressed. No person, no mannequin, no body, no head, no hijab, no hands, no shoes, no hanger. " +
          "Keep the exact same colors, fabric and fit. Plain white background, soft even studio light, photorealistic.",
        image_url: img,
        aspect_ratio: "9:16",
        output_format: "png",
        safety_tolerance: "2",
      },
      { note: `p4 base outfit ${id}` },
    );
    await download(data.images[0].url, path.join(OUT, `flat-${id}.png`));
  }
}

if (step === "studio2") {
  const which = { man: "basic", woman: "basic", hijab: "modest" };
  for (const id of ids) {
    const model = await upJpeg(fs.readFileSync(path.join(OUT, `${id}-photo.jpg`)));
    const garment = await upJpeg(fs.readFileSync(path.join(OUT, `flat-${which[id]}.png`)), "#FFFFFF");
    const data = await falRun(
      "fal-ai/fashn/tryon/v1.6",
      {
        model_image: model,
        garment_image: garment,
        category: "one-pieces",
        segmentation_free: process.argv.includes("--strict") ? false : true,
        garment_photo_type: "flat-lay",
        mode: "balanced",
        moderation_level: "conservative",
        num_samples: 1,
        output_format: "png",
      },
      { note: `p4 studio outfit v2 ${id}` },
    );
    await download(data.images[0].url, path.join(OUT, process.argv.includes("--strict") ? `${id}-studio4.png` : `${id}-studio3.png`));
  }
}
