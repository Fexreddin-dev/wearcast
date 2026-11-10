import "server-only";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORIES, DAILY_TRYONS, DEMO_ITEMS, FASHN_CATEGORY, layerRank, type Category } from "./catalog";
import {
  askGemini,
  assertPlanActive,
  type Caller,
  cutout,
  FAL_EDIT,
  FAL_TRYON,
  fetchBuffer,
  planOf,
  runFal,
  startOfToday,
  StudioFailure,
  uploadOpaque,
  uploadStatic,
} from "./server";

type Layer = { ref: string; category: Category; ownId?: string; cleanPath?: string };
type Admin = ReturnType<typeof createAdminClient>;

const STALE_MS = 3 * 60 * 1000;
const publicFile = (...parts: string[]) => fs.readFile(path.join(process.cwd(), "public", "assets", ...parts));
const results = (admin: Admin) => admin.storage.from("generations");

const STUDIO =
  " Ghost mannequin catalogue photograph, front view, the whole jacket visible, plain white background, soft even light, photorealistic. " +
  "Keep the jacket's exact color, fabric, lapels, buttons and pockets.";
async function resolveLayers(admin: Admin, userId: string, refs: string[]) {
  const ownIds = refs.filter((r) => !r.startsWith("demo:"));
  if (ownIds.some((r) => !z.uuid().safeParse(r).success)) throw new StudioFailure("invalid");
  const { data: rows, error } = ownIds.length
    ? await admin
        .from("wardrobe_items")
        .select("id, category, clean_path")
        .eq("user_id", userId)
        .eq("status", "done")
        .in("id", ownIds)
    : { data: [], error: null };
  if (error) throw error;

  const layers = refs.map((ref): Layer => {
    const demo = DEMO_ITEMS.find((d) => d.ref === ref);
    if (demo) return { ref, category: demo.category };
    const row = rows?.find((r) => r.id === ref);
    if (!row || !CATEGORIES.includes(row.category)) throw new StudioFailure("invalid");
    return {
      ref,
      category: row.category as Category,
      ownId: row.id,
      cleanPath: row.clean_path,
    };
  });
  if (layers.some((l) => !FASHN_CATEGORY[l.category])) throw new StudioFailure("invalid");
  return layers.sort((a, b) => layerRank(a.category) - layerRank(b.category));
}

async function ensureAvatarRow(admin: Admin, userId: string, base: string) {
  const { data, error } = await admin
    .from("avatars")
    .select("id")
    .eq("user_id", userId)
    .eq("base_avatar_id", base)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data.id as string;
  const { data: made, error: e } = await admin
    .from("avatars")
    .insert({ user_id: userId, base_avatar_id: base, name: base })
    .select("id")
    .single();
  if (e) throw e;
  return made.id as string;
}

// Claims a cache row so two parallel requests never pay for the same result.
async function claim(admin: Admin, userId: string, avatarId: string, key: string, itemIds: string[]) {
  const { data: row, error } = await admin
    .from("generations")
    .insert({ user_id: userId, avatar_id: avatarId, cache_key: key, item_ids: itemIds, status: "processing", model: FAL_TRYON })
    .select("id")
    .maybeSingle();
  if (row) return row.id as string;
  if (error && error.code !== "23505") throw error;

  const stale = new Date(Date.now() - STALE_MS).toISOString();
  const { data: again, error: e } = await admin
    .from("generations")
    .update({ status: "processing", error: null, created_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("cache_key", key)
    .or(`status.eq.failed,and(status.eq.processing,created_at.lt.${stale})`)
    .select("id")
    .maybeSingle();
  if (e) throw e;
  if (!again) throw new StudioFailure("busy", 409);
  return again.id as string;
}

async function sign(admin: Admin, p: string) {
  const { data, error } = await results(admin).createSignedUrl(p, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// Prepared garment pictures are made once and kept, so they are paid for once.
async function piece(admin: Admin, storagePath: string, make: () => Promise<string>) {
  const existing = await results(admin).createSignedUrl(storagePath, 3600);
  if (existing.data?.signedUrl) return existing.data.signedUrl;
  const url = await make();
  const up = await results(admin).upload(storagePath, await fetchBuffer(url), { contentType: "image/png", upsert: true });
  if (up.error) throw up.error;
  return url;
}

const pieceFolder = (caller: Caller, layers: Layer[]) => (layers.some((l) => l.ownId) ? `${caller.id}/pieces` : "shared/pieces");
const pieceName = (l: Layer) => l.ownId ?? l.ref.slice(5);

async function frontPicture(admin: Admin, layer: Layer) {
  if (layer.ownId) {
    // The tidied catalogue version dresses far better than a casual photo.
    const { data, error } = await admin.storage.from("wardrobe").download(layer.cleanPath!);
    if (error) throw error;
    return uploadOpaque(Buffer.from(await data.arrayBuffer()), "#FFFFFF");
  }
  const id = layer.ref.slice(5);
  return uploadStatic(`garment:${id}`, () => publicFile("wardrobe", `${id}.png`), "#FFFFFF");
}

async function garmentBuffer(admin: Admin, layer: Layer) {
  if (layer.ownId) {
    const { data, error } = await admin.storage.from("wardrobe").download(layer.cleanPath!);
    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  }
  return publicFile("wardrobe", `${layer.ref.slice(5)}.png`);
}

const asJpegPart = async (image: Buffer) => ({
  inlineData: {
    mimeType: "image/jpeg",
    data: (await sharp(image).flatten({ background: "#FFFFFF" }).resize(512, 512, { fit: "inside" }).jpeg({ quality: 82 }).toBuffer()).toString("base64"),
  },
});

async function describeGarment(image: Buffer) {
  try {
    const answer = (await askGemini([
      'Describe this garment for a catalogue in at most 10 words: colour, fabric, type and collar. Reply as JSON {"text": string}.',
      await asJpegPart(image),
    ])) as { text?: string };
    if (answer.text) return answer.text;
  } catch {
    /* a neutral description below keeps the look possible */
  }
  return "a plain light shirt";
}

const PIECE_CHECK =
  'This catalogue picture should show one jacket or coat, front view, worn open over an inner garment. Look only for severe damage. Reply as JSON {"ok": boolean, "problem": string}. ' +
  "ok is false only if: (1) the two front panels are clearly not mirror images because one side is folded, flipped or twisted so that its inner lining faces the viewer; " +
  "(2) a lapel or sleeve is missing or duplicated; (3) fabric of the inner garment appears inside a pocket or on the outside of the jacket. " +
  "Labels, seams, stitching, the inside of the collar and a little lining at the bottom hem are normal and must not count as damage.";

// Garment pictures made here are kept and reused, so a damaged one must never be saved.
async function pieceIsClean(image: Buffer) {
  try {
    // One look missed a damaged picture about a third of the time, so two must both agree.
    const part = await asJpegPart(image);
    const answers = (await Promise.all([askGemini([PIECE_CHECK, part]), askGemini([PIECE_CHECK, part])])) as { ok?: boolean }[];
    return answers.every((a) => a.ok !== false);
  } catch {
    return true; // when the checker is unreachable it must not block dressing
  }
}

const piecePrompt = (inner: string) =>
  `Show this exact same jacket worn open over ${inner}, clearly filling the opening. Keep the jacket exactly as it is: same shape, symmetric, both lapels, both sleeves. ` +
  "Change nothing except filling the empty opening. No person, no neck, no mannequin." +
  STUDIO;

// Try-on replaces the whole top, so a jacket is first pictured together with what goes under it.
// Only the jacket's own picture is edited: combining two garment pictures distorted the jacket.
async function jacketPicture(admin: Admin, caller: Caller, avatar: string, layers: Layer[], index: number) {
  const jacket = layers[index];
  const below = layers.slice(0, index);
  if (below.some((l) => l.category === "dresses")) return frontPicture(admin, jacket);
  const under = below.filter((l) => l.category === "shirts-tops" || l.category === "jackets-coats").at(-1);
  const inner = under ? `${pieceName(under)}.v2` : avatar.startsWith("h") ? "cream" : "tee";

  return piece(admin, `${pieceFolder(caller, [jacket, ...(under ? [under] : [])])}/${pieceName(jacket)}+${inner}.png`, async () => {
    const top = under
      ? await describeGarment(await garmentBuffer(admin, under))
      : inner === "cream"
        ? "a plain cream high-neck long-sleeve top"
        : "a plain white crew-neck t-shirt";
    const jacketUrl = await frontPicture(admin, jacket);
    for (let attempt = 0; attempt < 2; attempt++) {
      const data = await runFal(
        FAL_EDIT,
        { prompt: piecePrompt(top), image_url: jacketUrl, aspect_ratio: "3:4", output_format: "png", safety_tolerance: "2" },
        caller,
      );
      const url = data.images![0].url;
      if (await pieceIsClean(await fetchBuffer(url))) return url;
    }
    throw new StudioFailure("failed", 502);
  });
}

function garmentFor(admin: Admin, caller: Caller, avatar: string, layers: Layer[], index: number) {
  const layer = layers[index];
  if (layer.category === "jackets-coats") return jacketPicture(admin, caller, avatar, layers, index);
  return frontPicture(admin, layer);
}

async function assertDailyLimit(admin: Admin, userId: string, steps: number) {
  const { data, error } = await admin
    .from("credit_ledger")
    .select("delta, reason")
    .eq("user_id", userId)
    .in("reason", ["tryon", "refund"])
    .gte("created_at", startOfToday());
  if (error) throw error;
  const used = (data ?? []).reduce((n, r) => n + (r.reason === "tryon" ? 1 : -1), 0);
  if (used + steps > (DAILY_TRYONS[await planOf(userId)] ?? 2)) throw new StudioFailure("daily_limit", 429);
}

export async function runTryOn(caller: Caller, avatar: string, refs: string[], cacheOnly = false) {
  if (!caller.unlimited) await assertPlanActive(caller.id);
  const admin = createAdminClient();
  const layers = await resolveLayers(admin, caller.id, refs);
  const avatarId = await ensureAvatarRow(admin, caller.id, avatar);
  const keys = layers.map((_, i) => {
    const stack = layers.slice(0, i + 1);
    // Looks already paid for stay free, except jackets dressed over another top: those used a damaged picture.
    const uppers = stack.filter((l) => l.category === "shirts-tops" || l.category === "jackets-coats");
    const stale = uppers.length > 1 && uppers.at(-1)!.category === "jackets-coats";
    return createHash("sha256").update(`${stale ? "v5" : "v4"}|base:${avatar}|front|${stack.map((l) => l.ref).join(",")}`).digest("hex");
  });
  const charges = !caller.unlimited;

  const { data: cached, error } = await admin
    .from("generations")
    .select("cache_key, result_paths")
    .eq("user_id", caller.id)
    .eq("status", "done")
    .in("cache_key", keys);
  if (error) throw error;
  const cachedMap = new Map(cached?.map((c) => [c.cache_key as string, c.result_paths as string[]]));

  let start = 0;
  for (let i = keys.length - 1; i >= 0; i--) {
    if (cachedMap.has(keys[i])) {
      start = i + 1;
      break;
    }
  }
  if (cacheOnly && start < layers.length) return { image: null, items: [] as string[], charged: 0, cached: false };
  if (start < layers.length && charges) await assertDailyLimit(admin, caller.id, layers.length - start);

  let charged = 0;
  let lastPaths = start > 0 ? cachedMap.get(keys[start - 1])! : null;

  for (let i = start; i < layers.length; i++) {
    const layer = layers[i];
    const itemIds = layers.slice(0, i + 1).flatMap((l) => (l.ownId ? [l.ownId] : []));
    const genId = await claim(admin, caller.id, avatarId, keys[i], itemIds);
    const spendRef = `tryon:${keys[i]}:${randomUUID()}`;

    if (charges) {
      const { data: paid, error: spendError } = await admin.rpc("spend_credits", { p_user: caller.id, p_amount: 1, p_ref: spendRef });
      if (spendError || !paid) {
        await admin.from("generations").update({ status: "failed", error: "no_credits" }).eq("id", genId);
        if (spendError) throw spendError;
        throw new StudioFailure("no_credits", 402);
      }
    }

    try {
      const [modelImage, garmentImage] = await Promise.all([
        lastPaths ? sign(admin, lastPaths[1]) : uploadStatic(`avatar:${avatar}:front`, () => publicFile("avatars", `${avatar}-front.png`)),
        garmentFor(admin, caller, avatar, layers, i),
      ]);
      const data = await runFal(
        FAL_TRYON,
        {
          model_image: modelImage,
          garment_image: garmentImage,
          category: FASHN_CATEGORY[layer.category],
          garment_photo_type: "flat-lay",
          mode: "balanced",
          moderation_level: "conservative",
          num_samples: 1,
          output_format: "png",
        },
        caller,
      );

      const url = data.images![0].url;
      const rawPath = `${caller.id}/${genId}/raw.jpg`;
      const cutPath = `${caller.id}/${genId}/look.webp`;
      const [rawPng, cutPng] = await Promise.all([fetchBuffer(url), cutout(url, caller)]);
      // Compact formats: the full-size PNGs took about 5 seconds to store.
      const [raw, cut] = await Promise.all([
        sharp(rawPng).flatten({ background: "#F4F3EF" }).jpeg({ quality: 93 }).toBuffer(),
        sharp(cutPng).webp({ quality: 92, alphaQuality: 95 }).toBuffer(),
      ]);
      const stored = await Promise.all([
        results(admin).upload(rawPath, raw, { contentType: "image/jpeg", upsert: true }),
        results(admin).upload(cutPath, cut, { contentType: "image/webp", upsert: true }),
      ]);
      for (const up of stored) if (up.error) throw up.error;
      lastPaths = [cutPath, rawPath];
      const { error: e } = await admin.from("generations").update({ status: "done", result_paths: lastPaths, cost_usd: 0.085 }).eq("id", genId);
      if (e) throw e;
      if (charges) charged += 1;
    } catch (err) {
      if (charges) await admin.rpc("refund_credits", { p_user: caller.id, p_amount: 1, p_spend_ref: spendRef });
      await admin
        .from("generations")
        .update({ status: "failed", error: err instanceof Error ? err.message.slice(0, 200) : "failed" })
        .eq("id", genId);
      if (err instanceof StudioFailure) throw err;
      console.error("[tryon] failed", err instanceof Error ? err.message : "unknown");
      throw new StudioFailure("failed", 502);
    }
  }

  return { image: await sign(admin, lastPaths![0]), items: layers.map((l) => l.ref), charged, cached: start === layers.length };
}
