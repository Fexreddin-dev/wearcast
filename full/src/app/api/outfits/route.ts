import { z } from "zod";
import { fail, requireUser, StudioFailure } from "@/lib/wardrobe/server";

const body = z.object({ itemIds: z.array(z.uuid()).min(1).max(8), name: z.string().trim().max(60).optional() });

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireUser();
    const parsed = body.safeParse(await request.json());
    if (!parsed.success) throw new StudioFailure("invalid");
    const { error } = await supabase
      .from("outfits")
      .insert({ user_id: user.id, item_ids: parsed.data.itemIds, name: parsed.data.name ?? null });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
