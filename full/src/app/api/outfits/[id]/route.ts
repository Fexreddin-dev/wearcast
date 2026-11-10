import type { NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { OCCASIONS } from "@/lib/wardrobe/catalog";
import { fail, requireUser, StudioFailure } from "@/lib/wardrobe/server";

const patch = z.object({ name: z.string().trim().max(60).nullable().optional(), occasion: z.enum(OCCASIONS).nullable().optional() });

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/outfits/[id]">) {
  try {
    const { id } = await ctx.params;
    const parsed = patch.safeParse(await request.json());
    if (!z.uuid().safeParse(id).success || !parsed.success) throw new StudioFailure("invalid");
    const { user } = await requireUser();
    const changes: Record<string, string | null> = {};
    if (parsed.data.name !== undefined) changes.name = parsed.data.name || null;
    if (parsed.data.occasion !== undefined) changes.occasion = parsed.data.occasion;
    const { data, error } = await createAdminClient().from("outfits").update(changes).eq("id", id).eq("user_id", user.id).select("id");
    if (error) throw error;
    if (!data?.length) throw new StudioFailure("invalid", 404);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

// Deleting a saved look keeps the pieces and the picture already made (it is still a free cache hit).
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/outfits/[id]">) {
  try {
    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success) throw new StudioFailure("invalid");
    const { user } = await requireUser();
    const { error } = await createAdminClient().from("outfits").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
