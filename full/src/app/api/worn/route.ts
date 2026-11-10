import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAvatarKey, MAX_LAYERS } from "@/lib/wardrobe/catalog";
import { fail, requireUser, StudioFailure } from "@/lib/wardrobe/server";

const body = z.object({ avatar: z.string(), items: z.array(z.string().max(60)).max(MAX_LAYERS) });

// Remembers what each avatar wears and which avatar was last open. Kept with the account, so it follows the person.
export async function POST(request: Request) {
  try {
    const { user } = await requireUser();
    const parsed = body.safeParse(await request.json());
    if (!parsed.success || !isAvatarKey(parsed.data.avatar)) throw new StudioFailure("invalid");
    const { avatar, items } = parsed.data;
    const meta = user.user_metadata ?? {};
    const { error } = await createAdminClient().auth.admin.updateUserById(user.id, {
      user_metadata: { ...meta, worn: { ...(meta.worn ?? {}), [avatar]: items }, wornAvatar: avatar },
    });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
