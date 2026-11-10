import "server-only";
import type { Category } from "./catalog";
import { type Caller, describeError, FAL_EDIT, runFal, StudioFailure } from "./server";

const GARMENT_LOOK =
  "Turn this into a clean professional catalogue photograph of this exact same garment alone, floating as if worn by a fully invisible ghost mannequin with nothing visible inside the neck or sleeves, " +
  "symmetrical, front view, fully visible, neatly pressed with smooth natural folds.";
const OBJECT_LOOK =
  "Turn this into a clean professional catalogue product photograph of this exact same item alone, neatly presented, three-quarter view, fully visible.";
const KEEP =
  " Keep the exact same color, pattern, fabric texture, buttons, collar, stitching and details. Do not add or remove any design element. " +
  "Show only the garment: remove the person, body, head, neck, hands, legs, any mannequin, hanger, floor, furniture and shadows. Plain light studio background, soft even studio lighting, photorealistic, sharp fabric detail, no text.";

// Rebuilds a casual photo as a tidy studio shot. If that step fails the original photo is used.
export async function tidyPhoto(imageUrl: string, category: Category, caller: Caller) {
  const worn = category !== "shoes" && category !== "accessories";
  try {
    const data = await runFal(
      FAL_EDIT,
      {
        prompt: (worn ? GARMENT_LOOK : OBJECT_LOOK) + KEEP,
        image_url: imageUrl,
        aspect_ratio: worn ? "3:4" : "1:1",
        output_format: "png",
        safety_tolerance: "2",
      },
      caller,
    );
    return data.images![0].url;
  } catch (e) {
    if (e instanceof StudioFailure) throw e;
    console.error("[wardrobe] tidy step failed", describeError(e));
    return imageUrl;
  }
}

