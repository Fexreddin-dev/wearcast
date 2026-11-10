import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAvatarKey, MAX_LAYERS, OCCASIONS } from "@/lib/wardrobe/catalog";
import { fail, requireUser, StudioFailure } from "@/lib/wardrobe/server";
import { findLook } from "@/lib/wardrobe/tryon";

const body = z.object({
  refs: z.array(z.string().max(60)).min(1).max(MAX_LAYERS),
  avatar: z.string().max(40),
  name: z.string().trim().max(60).optional(),
  occasion: z.enum(OCCASIONS).nullable().optional(),
});

// Saves a look. The pieces are checked against the owner's wardrobe, and the finished
// picture is linked when it exists, so wearing it again is free.
export async function POST(request: Request) {
  try {
    const { user } = await requireUser();
    const parsed = body.safeParse(await request.json());
    if (!parsed.success || !isAvatarKey(parsed.data.avatar)) throw new StudioFailure("invalid");
    const { refs, avatar, name, occasion } = parsed.data;
    const look = await findLook(user.id, avatar, [...new Set(refs)]);
    const { data, error } = await createAdminClient()
      .from("outfits")
      .insert({
        user_id: user.id,
        refs: look.refs,
        item_ids: look.ownIds,
        avatar,
        generation_id: look.generationId,
        name: name || null,
        occasion: occasion ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return Response.json({ id: data.id });
  } catch (e) {
    return fail(e);
  }
}
