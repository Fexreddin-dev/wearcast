import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, requireUser, StudioFailure } from "@/lib/wardrobe/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Removes the item, its photos and every try-on made with it, permanently.
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/wardrobe/[id]">) {
  try {
    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success) throw new StudioFailure("invalid");
    const { user } = await requireUser();
    const admin = createAdminClient();

    const { data: item, error } = await admin
      .from("wardrobe_items")
      .select("original_paths, clean_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!item) throw new StudioFailure("invalid", 404);

    const { data: gens } = await admin
      .from("generations")
      .select("id, result_paths")
      .eq("user_id", user.id)
      .contains("item_ids", [id]);

    const files = [...item.original_paths, ...(item.clean_path ? [item.clean_path] : [])];
    if (files.length) {
      const { error: e } = await admin.storage.from("wardrobe").remove(files);
      if (e) throw e;
    }
    const results = (gens ?? []).flatMap((g) => g.result_paths as string[]);
    if (results.length) {
      const { error: e } = await admin.storage.from("generations").remove(results);
      if (e) throw e;
    }
    const { data: pieces } = await admin.storage.from("generations").list(`${user.id}/pieces`, { limit: 1000 });
    const prepared = (pieces ?? []).filter((p) => p.name.includes(id)).map((p) => `${user.id}/pieces/${p.name}`);
    if (prepared.length) await admin.storage.from("generations").remove(prepared);
    if (gens?.length) await admin.from("generations").delete().in("id", gens.map((g) => g.id));
    await admin.from("wardrobe_items").delete().eq("id", id).eq("user_id", user.id);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
