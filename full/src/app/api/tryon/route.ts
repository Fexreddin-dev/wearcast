import { z } from "zod";
import { isAvatarKey, MAX_LAYERS } from "@/lib/wardrobe/catalog";
import { fail, requireUser, StudioFailure } from "@/lib/wardrobe/server";
import { runTryOn } from "@/lib/wardrobe/tryon";

const body = z.object({
  avatar: z.string(),
  items: z.array(z.string().max(60)).min(1).max(MAX_LAYERS),
  cacheOnly: z.boolean().default(false), // restoring a saved look must never cost anything
});

export async function POST(request: Request) {
  try {
    const { caller } = await requireUser();
    const parsed = body.safeParse(await request.json());
    if (!parsed.success || !isAvatarKey(parsed.data.avatar)) throw new StudioFailure("invalid");
    const { avatar, items, cacheOnly } = parsed.data;
    return Response.json(await runTryOn(caller, avatar, [...new Set(items)], cacheOnly));
  } catch (e) {
    return fail(e);
  }
}
