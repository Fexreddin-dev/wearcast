import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type Audience,
  canTryOn,
  CATEGORIES,
  type Category,
  type Coverage,
  coverageRule,
  DAILY_LOOK_CHANGES,
  DEMO_ITEMS,
  type LookEntry,
  type LookSource,
  SAMPLE_NOTES,
  type Text3,
} from "./catalog";
import { coverageFor } from "./avatars";
import { askGemini, GEMINI_WRITING, planOf, startOfToday, StudioFailure } from "./server";
import type { Weather } from "./weather";

type Admin = ReturnType<typeof createAdminClient>;

// ───────── Weather groups: the look only changes when the weather really does ─────────
// Temperatures fall into 5 °C steps (the coldest and the warmest part of the day), plus rain (50 % or
// more in any part of the day) and wind (9 m/s or more, where a light jacket starts to matter).
// Ten warm, dry days in a row are one group, so they keep one look and cost nothing.
export function weatherBand(w: Weather) {
  const parts = [w.morning, w.afternoon, w.evening];
  const step = (t: number) => {
    const low = Math.floor(t / 5) * 5;
    return `${low}..${low + 5}`;
  };
  const temps = parts.map((p) => p.temp);
  return [
    step(Math.min(...temps)),
    step(Math.max(...temps)),
    parts.some((p) => p.rain >= 50) ? "rain" : "dry",
    parts.some((p) => p.wind >= 9) ? "windy" : "calm",
  ].join("|");
}

const AUDIENCE: Record<Audience, string> = {
  men: "an adult man",
  women: "an adult woman",
  hijab: "an adult woman who dresses modestly and wears a headscarf: long sleeves, covered neck, loose layers, long skirts or wide trousers (do not describe the headscarf)",
  teen_boys: "a teenage boy aged 8 to 17: age-appropriate, relaxed, never revealing",
  teen_girls: "a teenage girl aged 8 to 17: age-appropriate, never revealing, no high heels",
};
const isTeen = (a: Audience) => a === "teen_boys" || a === "teen_girls";
const isMaleAudience = (a: Audience) => a === "men" || a === "teen_boys";

type Candidate = { ref: string; category: Category; description: string };

// Pieces the stylist may use: own pieces first; samples help while the wardrobe is still small.
async function candidates(admin: Admin, userId: string, audience: Audience, withSamples: boolean) {
  const { data: rows, error } = await admin
    .from("wardrobe_items")
    .select("id, category, name, material, fit, size, coverage, clean_path")
    .eq("user_id", userId)
    .eq("status", "done");
  if (error) throw error;
  const own: Candidate[] = [];
  for (const r of rows ?? []) {
    const category = r.category as Category;
    if (!canTryOn(category)) continue;
    if (isTeen(audience) || audience === "hijab") {
      const c = (r.coverage as Coverage | null) ?? (await coverageFor(admin, { ownId: r.id, cleanPath: r.clean_path, category }));
      // Unknown or revealing pieces are never suggested for a teen; modest looks skip open pieces.
      if (!c && isTeen(audience)) continue;
      if (c && coverageRule(c, isTeen(audience) ? "teen" : "adult", audience === "hijab")) continue;
    }
    own.push({ ref: r.id, category, description: [r.name, r.material, r.fit, r.size].filter(Boolean).join(", ") || category });
  }
  // Sample pieces are all long and long-sleeved (checked by eye), so they suit every audience.
  const samples: Candidate[] = withSamples
    ? DEMO_ITEMS.filter((d) => canTryOn(d.category) && (isMaleAudience(audience) ? d.ref.startsWith("demo:man-") : d.ref.startsWith("demo:woman-"))).map((d) => ({
        ref: d.ref,
        category: d.category,
        description: SAMPLE_NOTES[d.ref] ?? d.category,
      }))
    : [];
  return { own, samples };
}

const text3 = z.object({ en: z.string().max(400), az: z.string().max(400).optional(), tr: z.string().max(400).optional() });
const fill = (t: z.infer<typeof text3>): Text3 => ({ en: t.en, az: t.az || t.en, tr: t.tr || t.en });
const why = z.object({ weather: text3, harmony: text3, layers: text3 });
const wardrobeReply = z.object({ refs: z.array(z.string()), note: text3, why });
const trendReply = z.object({
  pieces: z.array(z.object({ category: z.string(), color: z.string(), name: text3, ref: z.string().nullable().optional() })).min(1).max(5),
  note: text3,
  why,
});

const WRITING =
  'Write "note" as one warm sentence. In "why": "weather" says why it suits today (mention the temperatures, wind or rain), ' +
  '"harmony" how the colours and fabrics go together, "layers" what is worn underneath and on top and what to take off when it warms up. ' +
  "Each at most two short sentences. Every text has en, az and tr: az in natural, correctly spelled Azerbaijani (Latin script), tr in natural Turkish. Never mention technology.";

function season(date = new Date()) {
  const m = date.getUTCMonth();
  return m <= 1 || m === 11 ? "winter" : m <= 4 ? "spring" : m <= 7 ? "summer" : "autumn";
}

const weatherLine = (w: Weather) =>
  (["morning", "afternoon", "evening"] as const).map((p) => `${p} ${w[p].temp}°C, wind ${w[p].wind} m/s, rain ${w[p].rain}%, ${w[p].sky}`).join("; ");

function rowToEntry(r: Record<string, unknown>): LookEntry {
  return {
    id: r.id as string,
    source: r.source as LookSource,
    refs: (r.refs as string[]) ?? [],
    pieces: (r.pieces as LookEntry["pieces"]) ?? [],
    note: r.note as Text3,
    why: r.why as LookEntry["why"],
    createdAt: r.created_at as string,
    city: (r.city as string) ?? null,
  };
}

async function history(admin: Admin, userId: string, source: LookSource, audience: Audience) {
  const { data, error } = await admin
    .from("look_history")
    .select("id, source, refs, pieces, note, why, created_at, city, band")
    .eq("user_id", userId)
    .eq("source", source)
    .eq("audience", audience)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

async function changesLeft(admin: Admin, userId: string, unlimited: boolean) {
  if (unlimited) return null;
  const { count, error } = await admin
    .from("look_history")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("changed", true)
    .gte("created_at", startOfToday());
  if (error) throw error;
  return Math.max(0, (DAILY_LOOK_CHANGES[await planOf(userId)] ?? 3) - (count ?? 0));
}

export async function dailyLook(opts: {
  userId: string;
  unlimited: boolean;
  source: LookSource;
  audience: Audience;
  weather: Weather;
  change: boolean;
}) {
  const { userId, unlimited, source, audience, weather, change } = opts;
  const admin = createAdminClient();
  const band = weatherBand(weather);
  const [past, left] = await Promise.all([history(admin, userId, source, audience), changesLeft(admin, userId, unlimited)]);
  const latest = past[0];

  const { own, samples } = await candidates(admin, userId, audience, true);
  // Own pieces lead; samples join only while the wardrobe has fewer than two wearable pieces.
  const pool = source === "wardrobe" ? (own.length >= 2 ? own : [...own, ...samples]) : [...own, ...samples];
  const valid = (refs: string[]) => refs.every((r) => pool.some((p) => p.ref === r) || own.some((o) => o.ref === r));

  // Same weather group, same city and every piece still there: the same look, at no cost.
  const reusable = latest && latest.band === band && latest.city === weather.city && valid(latest.refs as string[]);
  if (!change && reusable) return { history: past.map(rowToEntry), changesLeft: left };
  if (change && left !== null && left <= 0) throw new StudioFailure("shuffle_limit", 429);
  if (source === "wardrobe" && pool.length < 2) throw new StudioFailure("too_few_items", 422);

  const avoid = change && latest ? `Choose a clearly different combination from the last one: ${JSON.stringify(latest.refs)}.` : "";
  const list = JSON.stringify(pool.map((p) => ({ ref: p.ref, category: p.category, description: p.description })));
  let row: Record<string, unknown>;

  if (source === "wardrobe") {
    const prompt = [
      `You are a personal stylist. Build one complete outfit for ${AUDIENCE[audience]} for today, using only the pieces below.`,
      "Use at most one piece per category. Use a dress alone, or a top with a bottom. Add a jacket or coat only when the coldest part of the day is below 18°C, or it is windy or rainy.",
      avoid,
      `Weather in ${weather.city}: ${weatherLine(weather)}.`,
      `Pieces: ${list}.`,
      'Reply as JSON: {"refs": string[], "note": {"en","az","tr"}, "why": {"weather": {...}, "harmony": {...}, "layers": {...}}}.',
      WRITING,
    ].filter(Boolean).join("\n");
    const answer = wardrobeReply.parse(await askGemini([prompt], 45_000, GEMINI_WRITING));
    // Only pieces that really exist, one per category.
    const seen = new Set<Category>();
    const refs = answer.refs.filter((ref) => {
      const p = pool.find((c) => c.ref === ref);
      if (!p || seen.has(p.category)) return false;
      seen.add(p.category);
      return true;
    });
    const hasBody = refs.some((r) => ["shirts-tops", "dresses", "jackets-coats"].includes(pool.find((p) => p.ref === r)!.category));
    if (!refs.length || !hasBody) throw new StudioFailure("failed", 502);
    row = { refs, pieces: [], note: fill(answer.note), why: { weather: fill(answer.why.weather), harmony: fill(answer.why.harmony), layers: fill(answer.why.layers) } };
  } else {
    const prompt = [
      `You are a fashion editor. Describe one outfit that follows current fashion trends for ${season()} ${new Date().getUTCFullYear()}, for ${AUDIENCE[audience]}, suited to today's weather.`,
      "Use 2 to 4 pieces: a top and a bottom (or one dress), optionally an outer layer and shoes. Give each piece a short name and its main colour as #RRGGBB.",
      `category is one of: jackets-coats, shirts-tops, pants-skirts, dresses, shoes.`,
      "For each piece, set ref to the closest piece from the wardrobe below only if it is a reasonable match (same category and a similar colour or style); otherwise null.",
      avoid ? "Suggest a clearly different outfit from the last one." : "",
      `Weather in ${weather.city}: ${weatherLine(weather)}.`,
      `Wardrobe: ${list}.`,
      'Reply as JSON: {"pieces": [{"category": string, "color": string, "name": {"en","az","tr"}, "ref": string|null}], "note": {"en","az","tr"}, "why": {"weather": {...}, "harmony": {...}, "layers": {...}}}.',
      WRITING,
    ].filter(Boolean).join("\n");
    const answer = trendReply.parse(await askGemini([prompt], 45_000, GEMINI_WRITING));
    const used = new Set<string>();
    const pieces = answer.pieces
      .filter((p) => (CATEGORIES as readonly string[]).includes(p.category))
      .map((p) => {
        const match = p.ref ? pool.find((c) => c.ref === p.ref && c.category === p.category && !used.has(c.ref)) : undefined;
        if (match) used.add(match.ref);
        return {
          category: p.category as Category,
          color: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : "#B08D57",
          name: fill(p.name),
          ref: match?.ref ?? null,
        };
      });
    if (pieces.length < 2) throw new StudioFailure("failed", 502);
    const refs = pieces.flatMap((p) => (p.ref && canTryOn(p.category) ? [p.ref] : []));
    row = { refs, pieces, note: fill(answer.note), why: { weather: fill(answer.why.weather), harmony: fill(answer.why.harmony), layers: fill(answer.why.layers) } };
  }

  const { data: saved, error } = await admin
    .from("look_history")
    .insert({ user_id: userId, source, audience, band, city: weather.city, changed: change, ...row })
    .select("id, source, refs, pieces, note, why, created_at, city, band")
    .single();
  if (error) throw error;
  return { history: [saved, ...past].slice(0, 10).map(rowToEntry), changesLeft: change && left !== null ? left - 1 : left };
}
