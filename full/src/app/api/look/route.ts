import { z } from "zod";
import { locales } from "@/i18n/config";
import { canTryOn, type Category } from "@/lib/wardrobe/catalog";
import { askGemini, fail, requireUser, StudioFailure } from "@/lib/wardrobe/server";
import { getWeather } from "@/lib/wardrobe/weather";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_SHUFFLES = 10;
const body = z.object({ shuffle: z.boolean().default(false), locale: z.enum(locales).default("en") });
const reply = z.object({ item_ids: z.array(z.string()), note: z.string().max(240) });
const LANGUAGE = { en: "English", az: "Azerbaijani", tr: "Turkish" };

export async function POST(request: Request) {
  try {
    const { user } = await requireUser();
    const parsed = body.safeParse(await request.json());
    if (!parsed.success) throw new StudioFailure("invalid");
    const { shuffle, locale } = parsed.data;

    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await admin
      .from("daily_looks")
      .select("item_ids, note, shuffles")
      .eq("user_id", user.id)
      .eq("look_date", today)
      .maybeSingle();
    if (existing && !shuffle) return Response.json({ itemIds: existing.item_ids, note: existing.note });
    if ((existing?.shuffles ?? 0) >= MAX_SHUFFLES) throw new StudioFailure("shuffle_limit", 429);

    const [{ data: items }, { data: profile }] = await Promise.all([
      admin.from("wardrobe_items").select("id, category, name, material, fit").eq("user_id", user.id).eq("status", "done"),
      admin.from("profiles").select("city, modest_mode").eq("id", user.id).maybeSingle(),
    ]);
    const wearable = (items ?? []).filter((i) => canTryOn(i.category as Category));
    if (wearable.length < 2) throw new StudioFailure("too_few_items", 422);

    const city = profile?.city || "Baku";
    const weather = await getWeather(city);
    const prompt = [
      "You are a personal stylist. Build one complete outfit using only the wardrobe below.",
      "Use at most one item per category. Use a dress alone, or a top with a bottom. A jacket is optional and only for cool or windy weather.",
      profile?.modest_mode ? "Modest dressing: long sleeves, covered neck, loose layers." : "",
      shuffle && existing ? `Choose a different combination from: ${JSON.stringify(existing.item_ids)}.` : "",
      `Weather in ${weather.city}: ${JSON.stringify(weather)}.`,
      `Wardrobe: ${JSON.stringify(wearable)}.`,
      `Reply as JSON: {"item_ids": string[], "note": string}. "note" is one short warm sentence in ${LANGUAGE[locale]} about why it suits today. Never mention technology.`,
    ].filter(Boolean).join("\n");

    const look = reply.parse(await askGemini([prompt], 25_000));

    // The answer is only trusted for ids that really are in this wardrobe, one per category.
    const seen = new Set<string>();
    const itemIds = look.item_ids.filter((id) => {
      const item = wearable.find((w) => w.id === id);
      if (!item || seen.has(item.category)) return false;
      seen.add(item.category);
      return true;
    });
    if (!itemIds.length) throw new StudioFailure("failed", 502);

    const { error } = await admin.from("daily_looks").upsert({
      user_id: user.id,
      look_date: today,
      city: weather.city,
      item_ids: itemIds,
      note: look.note,
      shuffles: (existing?.shuffles ?? 0) + (shuffle ? 1 : 0),
    });
    if (error) throw error;
    return Response.json({ itemIds, note: look.note });
  } catch (e) {
    return fail(e);
  }
}
