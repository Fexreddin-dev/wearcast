import type { NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeAvatar } from "@/lib/wardrobe/avatars";
import { fail, requireUser, StudioFailure } from "@/lib/wardrobe/server";

// Deletes an avatar for good: its photos, its cut-out and every look made on it.
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/avatars/[id]">) {
  try {
    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success) throw new StudioFailure("invalid");
    const { user } = await requireUser();
    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from("avatars")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .in("kind", ["custom", "photo"])
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new StudioFailure("invalid", 404);

    await purgeAvatar(admin, user.id, id);
    // Saved outfits stay; they simply open on another avatar.
    await admin.from("outfits").update({ avatar: null, generation_id: null }).eq("user_id", user.id).eq("avatar", id);
    const { error: e } = await admin.from("avatars").delete().eq("id", id).eq("user_id", user.id);
    if (e) throw e;

    const meta = user.user_metadata ?? {};
    const worn = { ...(meta.worn ?? {}) };
    delete worn[id];
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...meta, worn, wornAvatar: meta.wornAvatar === id ? null : meta.wornAvatar },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
