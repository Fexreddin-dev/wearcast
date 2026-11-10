import sharp from "sharp";
import { z } from "zod";
import { CATEGORIES, GARMENT_PROMPT } from "@/lib/wardrobe/catalog";
import { askGemini, fail, requireUser, StudioFailure } from "@/lib/wardrobe/server";

const reply = z.object({ category: z.enum(CATEGORIES) });

// Looks at the photo and suggests the category. The person can still change it.
export async function POST(request: Request) {
  try {
    await requireUser();
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024) throw new StudioFailure("invalid");

    const small = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize(512, 512, { fit: "inside" })
      .jpeg({ quality: 80 })
      .toBuffer();
    const answer = await askGemini([GARMENT_PROMPT, { inlineData: { mimeType: "image/jpeg", data: small.toString("base64") } }]);
    return Response.json(reply.parse(answer));
  } catch (e) {
    return fail(e);
  }
}
