// Hero film assets: one continuous camera journey  sky → window → studio → inside the wardrobe → back out.
// Every video's last frame is the next video's first frame, so the chapters join without cuts.
//   node scripts/fal/hero3.mjs keys     -> sky (Flux), window (Kontext from studio), inside-wardrobe (Kontext), gold blueprint (Kontext)
//   node scripts/fal/hero3.mjs videos   -> v1 sky→window, v2 window→studio, v3 open wardrobe→inside (Kling, first+last frame)
// --force redoes existing outputs; --only=v1,v3 limits the videos step.
import fs from "node:fs";
import path from "node:path";
import { ROOT, falRun, download, uploadFile } from "./lib.mjs";

const H2 = path.join(ROOT, "assets-src", "hero2");
const SRC = path.join(ROOT, "assets-src", "hero3");
fs.mkdirSync(SRC, { recursive: true });
const step = process.argv[2];
const force = process.argv.includes("--force");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].split(",") : null;
const need = (f) => force || !fs.existsSync(path.join(SRC, f));

const KONTEXT = "fal-ai/flux-pro/kontext";
const KLING = "fal-ai/kling-video/v2.5-turbo/pro/image-to-video";
const SKY_SIZE = { width: 1344, height: 720 }; // ≈ stage ratio, < 1 MP

async function kontext(input, prompt, out, note) {
  const url = await uploadFile(input);
  const data = await falRun(KONTEXT, { prompt, image_url: url, aspect_ratio: "16:9", output_format: "png", safety_tolerance: "2" }, { note });
  await download(data.images[0].url, path.join(SRC, out));
}

async function keys() {
  if (need("k1-sky.png")) {
    const data = await falRun(
      "fal-ai/flux-pro/v1.1",
      {
        prompt:
          "Cinematic wide shot high above soft morning clouds, warm golden sunrise light and gentle sun rays breaking through the clouds, " +
          "pale cream, peach and soft blue sky tones, through gaps in the clouds far below a calm modern city with elegant light stone buildings is faintly visible. " +
          "Dreamy, airy, luxurious, photorealistic, high detail, no text, no logo, no birds, no aircraft",
        image_size: SKY_SIZE,
        num_images: 1,
        output_format: "png",
        safety_tolerance: "2",
      },
      { note: "hero3 k1 sky", size: SKY_SIZE },
    );
    await download(data.images[0].url, path.join(SRC, "k1-sky.png"));
  }
  if (need("k2-window.png"))
    await kontext(
      path.join(H2, "stage-closed.png"),
      "Show this exact same room, with the same arched wardrobe on its marble plinth, now seen from outside the building through one large floor-to-ceiling window with a slim warm-bronze frame. " +
        "Fine fresh raindrops on the window glass, soft morning daylight, a little of the light stone facade visible around the window. " +
        "The room inside stays warm cream and softly lit, the wardrobe is clearly visible through the glass in the same position. Camera straight on, photorealistic.",
      "k2-window.png",
      "hero3 k2 window",
    );
  if (need("k4-inside.png"))
    await kontext(
      path.join(H2, "frames", "f121.png"),
      "Move the camera right inside this open wardrobe: a close-up view between the garments hanging on light oak wooden hangers on the brass rail, " +
        "soft cream and beige shirts, blazers and blouses in the foreground and background, warm LED light glowing from above, shallow depth of field, " +
        "same oak interior and lighting, photorealistic, luxury fashion commercial.",
      "k4-inside.png",
      "hero3 k4 inside wardrobe",
    );
  if (need("k4-gold.png"))
    await kontext(
      path.join(SRC, "k4-inside.png"),
      "Turn this exact image into an elegant technical line drawing: every garment, hanger, rail and shelf drawn with thin glowing warm-gold lines on a soft warm cream background, " +
        "like a luxury fashion blueprint, same composition and perspective, clean, no shading, no text.",
      "k4-gold.png",
      "hero3 k4 gold blueprint",
    );
}

const NEG = "morphing, warping, melting, distortion, flicker, people, hands, text, watermark, extra objects, shaky camera";
const VIDEOS = {
  v1: {
    first: () => path.join(SRC, "k1-sky.png"),
    last: () => path.join(SRC, "k2-window.png"),
    prompt:
      "One smooth continuous cinematic camera move: the camera glides down through the soft morning clouds toward the city, " +
      "descends along the light stone building and arrives straight in front of a large window with raindrops on the glass. Seamless, elegant, slow and steady.",
  },
  v2: {
    first: () => path.join(SRC, "k2-window.png"),
    last: () => path.join(H2, "stage-closed.png"),
    prompt:
      "One smooth continuous camera move: the camera slowly pushes forward through the window glass into the warm cream room, " +
      "the raindrops and window frame pass out of view, and the camera settles in front of the arched wardrobe on its marble plinth. Seamless, elegant, steady.",
  },
  v3: {
    first: () => path.join(H2, "frames", "f121.png"),
    last: () => path.join(SRC, "k4-inside.png"),
    prompt:
      "One smooth continuous camera move: the camera slowly glides forward into the open arched wardrobe, past the open glass doors, " +
      "and moves in between the garments hanging on wooden hangers, warm LED light above. Seamless, elegant, steady, luxury commercial.",
  },
};

async function videos() {
  const todo = Object.entries(VIDEOS).filter(([k]) => (only ? only.includes(k) : need(`${k}.mp4`)));
  await Promise.all(
    todo.map(async ([k, v]) => {
      const [first, last] = await Promise.all([uploadFile(v.first()), uploadFile(v.last())]);
      const data = await falRun(
        KLING,
        { prompt: v.prompt, image_url: first, tail_image_url: last, duration: "5", negative_prompt: NEG, cfg_scale: 0.5 },
        { note: `hero3 ${k} video 5s` },
      );
      await download(data.video.url, path.join(SRC, `${k}.mp4`));
    }),
  );
}

const steps = { keys, videos };
if (!steps[step]) {
  console.log(`Steps: ${Object.keys(steps).join(", ")}`);
  process.exit(1);
}
await steps[step]();
