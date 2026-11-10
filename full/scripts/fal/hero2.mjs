// Hero v2 assets: wardrobe on the left, couple side by side on the right, smiling, living ending.
//   node scripts/fal/hero2.mjs stage            -> 16:9 stage, wardrobe left third
//   node scripts/fal/hero2.mjs video            -> doors opening (Kling) from the stage
//   node scripts/fal/hero2.mjs smile            -> smiling base portraits (Kontext)
//   node scripts/fal/hero2.mjs tryon [who] [i]  -> progressive dressing states
//   node scripts/fal/hero2.mjs ending           -> living loop of the dressed couple (Kling)
// Add --force to redo a step that already has output.
import fs from "node:fs";
import path from "node:path";
import { ROOT, falRun, download, uploadFile } from "./lib.mjs";

const OLD = path.join(ROOT, "assets-src", "hero");
const SRC = path.join(ROOT, "assets-src", "hero2");
const AV = path.join(ROOT, "assets-src", "avatars");
const GARM = path.join(ROOT, "assets-src", "wardrobe");
fs.mkdirSync(SRC, { recursive: true });
const step = process.argv[2];
const force = process.argv.includes("--force");
const need = (f) => force || !fs.existsSync(path.join(SRC, f));

const KLING = "fal-ai/kling-video/v2.5-turbo/pro/image-to-video";
const KONTEXT = "fal-ai/flux-pro/kontext";

async function stage() {
  if (!need("stage-closed.png")) return;
  const url = await uploadFile(path.join(OLD, "wardrobe-closed-b.png"));
  const data = await falRun(
    KONTEXT,
    {
      prompt:
        "Turn this into a wide 16:9 landscape studio photograph. Keep this exact wardrobe and its round white marble plinth unchanged in design, " +
        "and place them in the LEFT part of the frame, with the wardrobe's centre about one quarter of the way in from the left edge. " +
        "The wardrobe with plinth should fill about 70 percent of the frame height. " +
        "Extend the same plain warm cream wall and the same smooth light floor to the right, leaving the whole right half of the frame completely empty floor space for two people to stand. " +
        "Same soft high-key studio lighting, camera straight on, no new objects, photorealistic.",
      image_url: url,
      aspect_ratio: "16:9",
      output_format: "png",
      safety_tolerance: "2",
    },
    { note: "hero2 stage closed (wardrobe left)" },
  );
  await download(data.images[0].url, path.join(SRC, "stage-closed.png"));
}

async function video() {
  if (!need("doors.mp4")) return;
  const url = await uploadFile(path.join(SRC, "stage-closed.png"));
  const data = await falRun(
    KLING,
    {
      prompt:
        "The two arched glass doors of the wardrobe slowly and smoothly swing open outward at the same time, hinged on their outer edges, " +
        "and the warm LED light inside glows brighter, revealing the oak interior with clothes on wooden hangers and folded items on shelves. " +
        "Static locked-off camera, no camera movement, no zoom. The wardrobe body and the round marble plinth stay exactly in place. Calm, elegant, luxury commercial.",
      image_url: url,
      duration: "5",
      negative_prompt: "camera movement, zoom, pan, shake, people, hands, morphing, warping, distortion, flicker, blur, extra furniture, text",
      cfg_scale: 0.6,
    },
    { note: "hero2 doors video 5s" },
  );
  await download(data.video.url, path.join(SRC, "doors.mp4"));
}

const SMILE =
  "Give this person a warm, natural, friendly smile with relaxed eyes, as in a happy fashion campaign photo. " +
  "Keep everything else exactly the same: identity, face shape, hair, body, pose, both hands visible at the sides, clothes, shoes, background and lighting.";

async function smile() {
  for (const [who, file] of [["man", "m1-front.png"], ["woman", "f1-front.png"]]) {
    if (!need(`${who}-base.png`)) continue;
    const url = await uploadFile(path.join(AV, file));
    const data = await falRun(
      KONTEXT,
      { prompt: SMILE, image_url: url, aspect_ratio: "9:16", output_format: "png", safety_tolerance: "2" },
      { note: `hero2 ${who} smile` },
    );
    await download(data.images[0].url, path.join(SRC, `${who}-base.png`));
  }
}

const CHAINS = {
  man: [
    { kind: "tryon", garment: "man-trousers.png", category: "bottoms", photo: "flat-lay" },
    // FASHN removed the T-shirt under the blazer (bare chest), so the blazer is layered with Kontext instead.
    { kind: "edit", prompt: "Dress him in a camel brown unstructured soft wool single-breasted blazer worn open over his same white crew-neck t-shirt, the t-shirt clearly visible underneath, natural fit and drape, sleeves to the wrist. Keep everything else exactly the same: face, smile, hair, body, pose, hands, dark navy trousers, white sneakers, background, lighting." },
    { kind: "edit", prompt: "Replace only his white sneakers with a pair of dark brown polished leather penny loafers. Keep everything else exactly the same: face, smile, body, pose, clothes, background, lighting." },
  ],
  woman: [
    { kind: "tryon", garment: "woman-skirt.png", category: "bottoms", photo: "auto" },
    { kind: "tryon", garment: "woman-blouse.png", category: "tops", photo: "flat-lay" },
    { kind: "edit", prompt: "Replace only her white sneakers with a pair of beige leather slingback shoes with a low block heel. Keep everything else exactly the same: face, smile, body, pose, clothes, background, lighting." },
  ],
};

async function tryon() {
  const who = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : null;
  const only = process.argv[4] && !process.argv[4].startsWith("--") ? Number(process.argv[4]) : null;
  const dir = path.join(SRC, "states");
  fs.mkdirSync(dir, { recursive: true });
  for (const name of who ? [who] : Object.keys(CHAINS)) {
    fs.copyFileSync(path.join(SRC, `${name}-base.png`), path.join(dir, `${name}-0.png`));
    for (const [i, st] of CHAINS[name].entries()) {
      const out = path.join(dir, `${name}-${i + 1}.png`);
      if (fs.existsSync(out) && only !== i + 1 && !(force && only === null)) continue;
      const prev = await uploadFile(path.join(dir, `${name}-${i}.png`));
      let url;
      if (st.kind === "tryon") {
        const garment = await uploadFile(path.join(GARM, st.garment));
        const data = await falRun(
          "fal-ai/fashn/tryon/v1.6",
          { model_image: prev, garment_image: garment, category: st.category, garment_photo_type: st.photo, mode: "quality", moderation_level: "conservative", num_samples: 1, output_format: "png" },
          { note: `hero2 ${name}-${i + 1} tryon ${st.garment}` },
        );
        url = data.images[0].url;
      } else {
        const data = await falRun(
          KONTEXT,
          { prompt: st.prompt, image_url: prev, aspect_ratio: "9:16", output_format: "png", safety_tolerance: "2" },
          { note: `hero2 ${name}-${i + 1} shoes edit` },
        );
        url = data.images[0].url;
      }
      await download(url, out);
    }
  }
}

async function ending() {
  if (!need("ending.mp4")) return;
  const url = await uploadFile(path.join(SRC, "ending-start.png"));
  const data = await falRun(
    KLING,
    {
      prompt:
        "The man and the woman stand side by side and come to life: they smile warmly, the woman glances at the man and laughs softly, " +
        "the man smiles back and gently adjusts the lapel of his blazer, both breathe naturally and shift their weight slightly. " +
        "Subtle, natural, elegant movement, they stay in the same place. Static locked-off camera, no zoom. The wardrobe, plinth, wall and floor stay exactly unchanged.",
      image_url: url,
      duration: "5",
      negative_prompt: "camera movement, zoom, pan, walking away, extra people, morphing face, distortion, flicker, blur, text, changing clothes",
      cfg_scale: 0.5,
    },
    { note: "hero2 living ending 5s" },
  );
  await download(data.video.url, path.join(SRC, "ending.mp4"));
}

const steps = { stage, video, smile, tryon, ending };
if (!steps[step]) {
  console.log(`Steps: ${Object.keys(steps).join(", ")}`);
  process.exit(1);
}
await steps[step]();
