// One-off image edit with Flux Kontext (keeps identity, changes only what the prompt says).
// Usage: node scripts/fal/edit.mjs <in.png> <out.png> "<edit prompt>" [aspect_ratio]
import path from "node:path";
import { ROOT, falRun, download, uploadFile } from "./lib.mjs";

const [inp, out, prompt, aspect = "9:16"] = process.argv.slice(2);
const url = await uploadFile(path.resolve(ROOT, inp));
const data = await falRun(
  "fal-ai/flux-pro/kontext",
  { prompt, image_url: url, aspect_ratio: aspect, output_format: "png", safety_tolerance: "2" },
  { note: `edit ${path.basename(inp)} -> ${path.basename(out)}` },
);
await download(data.images[0].url, path.resolve(ROOT, out));
