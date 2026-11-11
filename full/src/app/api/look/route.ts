import { z } from "zod";
import { PROTOTYPE } from "@/lib/wardrobe/curated";
import { createAdminClient } from "@/lib/supabase/admin";
import { audienceOf, isAvatarKey } from "@/lib/wardrobe/catalog";
import { loadAvatar } from "@/lib/wardrobe/avatars";
import { dailyLook } from "@/lib/wardrobe/looks";
import { fail, requireUser, StudioFailure } from "@/lib/wardrobe/server";
import { getWeather } from "@/lib/wardrobe/weather";

const body = z.object({
  source: z.enum(["wardrobe", "trend"]),
  avatar: z.string().max(40),
  change: z.boolean().default(false), // true only when the person asks for another look
});

// The Daily Curated Look for the avatar on the podium. It stays the same while the weather stays in
// the same group, so most visits read a saved look and cost nothing.
export async function POST(request: Request) {
  try {
    const { user, caller } = await requireUser();
    // Prototype: only the ready-made looks are used, so nothing here can cost money.
    if (PROTOTYPE && !caller.unlimited) throw new StudioFailure("prototype_only", 409);
    const parsed = body.safeParse(await request.json());
    if (!parsed.success || !isAvatarKey(parsed.data.avatar)) throw new StudioFailure("invalid");
    const admin = createAdminClient();
    const [avatar, { data: profile }] = await Promise.all([
      loadAvatar(admin, user.id, parsed.data.avatar),
      admin.from("profiles").select("city").eq("id", user.id).maybeSingle(),
    ]);
    const weather = await getWeather(profile?.city || "Baku");
    return Response.json(
      await dailyLook({
        userId: user.id,
        unlimited: caller.unlimited,
        source: parsed.data.source,
        audience: audienceOf(avatar),
        weather,
        change: parsed.data.change,
      }),
    );
  } catch (e) {
    return fail(e);
  }
}
