// One-off (11 Nov 2026): the generated cream sweater came on a hanger; remove it with one Kontext edit.
import { uploadFile, falRun, download } from "./lib.mjs";

const url = await uploadFile("assets-src/wardrobe/woman-sweater.hanger.png");
const d = await falRun(
  "fal-ai/flux-pro/kontext",
  {
    prompt:
      "Remove the wooden clothes hanger and its metal hook completely. Show the sweater as a ghost mannequin product photo: inside the round neckline only the inner back of the same cream knit is visible. " +
      "Keep the sweater exactly the same: colour, knit, shape, sleeves, hem. Same plain background.",
    image_url: url,
    aspect_ratio: "2:3",
    output_format: "png",
    safety_tolerance: "2",
  },
  { note: "proto unhang woman-sweater" },
);
await download(d.images[0].url, "assets-src/wardrobe/woman-sweater.png");
