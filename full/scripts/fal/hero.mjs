// Hero scene assets. Run step by step so each batch can be reviewed:
//   node scripts/fal/hero.mjs wardrobe   -> closed + open wardrobe stills
// (later steps: video, tryon, upscale)
import fs from "node:fs";
import path from "node:path";
import { ROOT, falRun, download, uploadFile } from "./lib.mjs";

const SRC = path.join(ROOT, "assets-src", "hero");
fs.mkdirSync(SRC, { recursive: true });
const step = process.argv[2];
const force = process.argv.includes("--force");
const need = (f) => force || !fs.existsSync(path.join(SRC, f));

const WARDROBE_SIZE = { width: 864, height: 1152 }; // 3:4, < 1 MP

const WARDROBE_CLOSED =
  "Front view of a single modern luxury designer wardrobe, centered, standing on a low round cream travertine plinth. " +
  "Tall elegant proportions with a softly rounded arched top. Frame and side panels in warm light oak wood with fine natural grain. " +
  "Two tall closed doors of smoked bronze-tinted glass set in very thin brushed brass frames with slim vertical brass handles. " +
  "Through the tinted glass the interior softly glows with warm hidden LED light, faintly revealing a row of light oak wooden hangers with neutral garments and clear glass shelves. " +
  "Placed in an empty infinite seamless photo studio: one continuous plain warm cream backdrop curving into the floor (#F4F3EF), no walls, no corners, no skirting board, no windows, no furniture, no plants. " +
  "Soft diffused high-key studio light, gentle warm rim light, soft natural contact shadow on the plinth. " +
  "Camera straight on at mid height, generous empty cream margin on all sides, entire wardrobe and plinth visible. " +
  "Photorealistic high-end interior product photograph in the style of a luxury fashion house campaign, sharp wood and glass detail, no people, no text, no logo";

const WARDROBE_OPEN =
  "Swing the two arched glass doors of this same wardrobe open by about 70 degrees, hinged on the outer edges, so the interior is clearly visible. " +
  "The wardrobe must stay identical: same narrow arched shape with the rounded top, same light oak frame, same thin brass door frames, same size and exact position in the frame, " +
  "still standing on the same round white marble plinth in the center. Do not enlarge, widen or redesign the wardrobe. " +
  "Interior lit by warm hidden LED light: the same oak shelves and folded items, a brass rail with light oak wooden hangers holding a camel blazer, navy trousers, a light blue shirt and an ivory blouse. " +
  "Same wall, floor, camera angle, lighting and empty space on both sides. Photorealistic.";

async function wardrobe() {
  if (need("wardrobe-closed.png")) {
    const data = await falRun(
      "fal-ai/flux-pro/v1.1",
      { prompt: WARDROBE_CLOSED, image_size: WARDROBE_SIZE, num_images: 1, output_format: "png", safety_tolerance: "2" },
      { note: "hero wardrobe closed", size: WARDROBE_SIZE },
    );
    await download(data.images[0].url, path.join(SRC, "wardrobe-closed.png"));
  }
  if (need("wardrobe-open.png")) {
    const url = await uploadFile(path.join(SRC, "wardrobe-closed.png"));
    const data = await falRun(
      "fal-ai/flux-pro/kontext",
      { prompt: WARDROBE_OPEN, image_url: url, aspect_ratio: "3:4", output_format: "png", safety_tolerance: "2" },
      { note: "hero wardrobe open" },
    );
    await download(data.images[0].url, path.join(SRC, "wardrobe-open.png"));
  }
}

// Two design candidates for the closed wardrobe; copy the chosen one to wardrobe-closed.png.
async function variants() {
  for (const v of ["a", "b"]) {
    if (!need(`wardrobe-closed-${v}.png`)) continue;
    const data = await falRun(
      "fal-ai/flux-pro/v1.1",
      { prompt: WARDROBE_CLOSED, image_size: WARDROBE_SIZE, num_images: 1, output_format: "png", safety_tolerance: "2" },
      { note: `hero wardrobe closed variant ${v}`, size: WARDROBE_SIZE },
    );
    await download(data.images[0].url, path.join(SRC, `wardrobe-closed-${v}.png`));
  }
}

// Wide 16:9 studio stage from the chosen variant (B), then its open-door state.
const WIDEN =
  "Widen this photo into a 16:9 landscape studio scene. Keep the wardrobe and the round marble plinth exactly the same, same size relative to the height of the frame, centered. " +
  "Extend the same plain warm cream wall and the same smooth cream floor evenly to the left and right, leaving wide empty floor space on both sides for people to stand. " +
  "No new objects, same soft studio lighting, photorealistic.";

async function stage() {
  if (need("wardrobe-closed.png")) {
    const url = await uploadFile(path.join(SRC, "wardrobe-closed-b.png"));
    const data = await falRun(
      "fal-ai/flux-pro/kontext",
      { prompt: WIDEN, image_url: url, aspect_ratio: "16:9", output_format: "png", safety_tolerance: "2" },
      { note: "hero stage closed 16:9" },
    );
    await download(data.images[0].url, path.join(SRC, "wardrobe-closed.png"));
  }
  if (need("wardrobe-open.png")) {
    const url = await uploadFile(path.join(SRC, "wardrobe-closed.png"));
    const data = await falRun(
      "fal-ai/flux-pro/kontext",
      { prompt: WARDROBE_OPEN, image_url: url, aspect_ratio: "16:9", output_format: "png", safety_tolerance: "2" },
      { note: "hero stage open 16:9" },
    );
    await download(data.images[0].url, path.join(SRC, "wardrobe-open.png"));
  }
}

// Door-opening video from the closed stage only (keeps design consistent; last frame = open state).
async function video() {
  if (!need("doors.mp4")) return;
  const url = await uploadFile(path.join(SRC, "wardrobe-closed.png"));
  const data = await falRun(
    "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
    {
      prompt:
        "The two arched glass doors of the wardrobe slowly and smoothly swing open outward at the same time, hinged on their outer edges, " +
        "revealing the warmly lit oak interior with clothes on wooden hangers and folded items on shelves. " +
        "Static locked-off camera, no camera movement. The wardrobe body and the round marble plinth stay exactly in place and unchanged. Calm, elegant, luxury commercial.",
      image_url: url,
      duration: "5",
      negative_prompt: "camera movement, zoom, pan, shake, people, hands, morphing, warping, distortion, flicker, blur, extra furniture, text",
      cfg_scale: 0.6,
    },
    { note: "hero doors video 5s" },
  );
  await download(data.video.url, path.join(SRC, "doors.mp4"));
}

// Progressive dressing states: <who>-0 (base) -> -1 -> -2 -> -3. Each state builds on the previous one.
// Clothes via FASHN try-on; shoes via a Kontext edit (try-on does not cover footwear).
const GARM = path.join(ROOT, "assets-src", "wardrobe");
const AV = path.join(ROOT, "assets-src", "avatars");
const CHAINS = {
  man: {
    base: "m1-front.png",
    steps: [
      { kind: "tryon", garment: "man-trousers.png", category: "bottoms", photo: "flat-lay" },
      { kind: "tryon", garment: "man-blazer.png", category: "tops", photo: "auto" },
      { kind: "edit", prompt: "Replace only his white sneakers with a pair of dark brown polished leather penny loafers. Keep everything else exactly the same: face, body, pose, clothes, background, lighting." },
    ],
  },
  woman: {
    base: "f1-front.png",
    steps: [
      { kind: "tryon", garment: "woman-blouse.png", category: "tops", photo: "flat-lay" },
      { kind: "tryon", garment: "woman-skirt.png", category: "bottoms", photo: "auto" },
      { kind: "edit", prompt: "Replace only her white sneakers with a pair of beige leather slingback shoes with a low block heel. Keep everything else exactly the same: face, body, pose, clothes, background, lighting." },
    ],
  },
};

async function tryon() {
  const who = process.argv[3];
  const only = process.argv[4] ? Number(process.argv[4]) : null; // redo a single state index
  const dir = path.join(SRC, "states");
  fs.mkdirSync(dir, { recursive: true });
  for (const name of who ? [who] : Object.keys(CHAINS)) {
    const chain = CHAINS[name];
    const s0 = path.join(dir, `${name}-0.png`);
    if (!fs.existsSync(s0)) fs.copyFileSync(path.join(AV, chain.base), s0);
    for (const [i, st] of chain.steps.entries()) {
      const out = path.join(dir, `${name}-${i + 1}.png`);
      if (fs.existsSync(out) && only !== i + 1) continue;
      const prev = await uploadFile(path.join(dir, `${name}-${i}.png`));
      let url;
      if (st.kind === "tryon") {
        const garment = await uploadFile(path.join(GARM, st.garment));
        const data = await falRun(
          "fal-ai/fashn/tryon/v1.6",
          { model_image: prev, garment_image: garment, category: st.category, garment_photo_type: st.photo, mode: "quality", moderation_level: "conservative", num_samples: 1, output_format: "png" },
          { note: `hero ${name}-${i + 1} tryon ${st.garment}` },
        );
        url = data.images[0].url;
      } else {
        const data = await falRun(
          "fal-ai/flux-pro/kontext",
          { prompt: st.prompt, image_url: prev, aspect_ratio: "9:16", output_format: "png", safety_tolerance: "2" },
          { note: `hero ${name}-${i + 1} shoes edit` },
        );
        url = data.images[0].url;
      }
      await download(url, out);
    }
  }
}

const steps = { wardrobe, variants, stage, video, tryon };
if (!steps[step]) {
  console.log(`Steps: ${Object.keys(steps).join(", ")}`);
  process.exit(1);
}
await steps[step]();
