import "server-only";
import { createHash, randomInt, randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORIES, CLOSED_OUTERWEAR, coverageRule, DAILY_TRYONS, DEMO_ITEMS, FASHN_CATEGORY, layerRank, type Category } from "./catalog";
import { type AvatarProfile, coverageFor, loadAvatar, publicFile } from "./avatars";
import { keepHeadscarf } from "./hijab";
import { CURATOR_ID, PROTOTYPE } from "./curated";
import {
  askGemini,
  assertPlanActive,
  type Caller,
  cutout,
  describeError,
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

// Prototype: the curated looks were dressed once by the owner account and are shared with everyone.
const cacheOwners = (callerId: string) => (PROTOTYPE ? [...new Set([callerId, CURATOR_ID])] : [callerId]);
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

// What stays the same when this kind of garment is dressed.
const UNCHANGED: Record<string, string> = {
  tops: "the trousers or skirt and the shoes",
  bottoms: "the top and the shoes",
  "one-pieces": "the shoes",
};

export const LOOK_CHECK = (modest: boolean, kind: string) =>
  "You check a virtual fitting result before a customer sees it. You get the garment picture, the person before, and the result photo of the same person who should now wear that garment. " +
  "Report only clear, visible defects; small wrinkles, lighting and slight colour shifts are normal, and hands in pockets or behind the body are not missing. " +
  'Reply as JSON {"ok": boolean, "problem": string}. ok is false if any of these is true: ' +
  "(1) the garment of the garment picture is not worn, or its type, main colour or length clearly changed (for example a hip-length blouse became a knee-length tunic or dress); " +
  "(2) a piece of fabric hangs loose, floats, or sticks out as a separate panel (for example behind or between the legs, below a hem, or a shirt front hanging lower on one side), or a garment is cut, melted or merged into the body; " +
  "(3) a button placket, collar or hem is crooked, broken or doubled; " +
  "(4) a hand, arm, leg, foot or sleeve is missing, duplicated or deformed; " +
  `(5) ${UNCHANGED[kind] ?? "the other clothes"} clearly changed compared with the person before (another colour, shape or kind); ` +
  "(6) there is a stray smudge, blob or piece of fabric in the background beside the person" +
  (modest
    ? "; (7) the headscarf does not cover all of the hair, the ears and the whole neck, or it does not fall down over the shoulders or chest (for example it became a small cap or turban and the neck is bare)."
    : ".");

const asCheckPart = (image: Buffer, size: number) =>
  sharp(image)
    .flatten({ background: "#FFFFFF" })
    .resize(size, size, { fit: "inside" })
    .jpeg({ quality: 85 })
    .toBuffer()
    .then((b) => ({ inlineData: { mimeType: "image/jpeg", data: b.toString("base64") } }));

// Every new look is checked before it is saved or shown: a broken one is made once more, and if that
// fails too the credit is returned. Three answers are needed and a look fails when two see a defect
// (a single look was unreliable, Nov 2026). Unanswered questions are asked again; a look that could not
// be checked by at least two answers is never shown (two broken looks once passed that way).
// Calibrated on stored results, see PROGRESS.md (Phase 4B).
export async function lookIsSound(result: Buffer, garment: Buffer, before: Buffer, modest: boolean, kind: string) {
  const [g, b, r] = await Promise.all([asJpegPart(garment), asCheckPart(before, 640), asCheckPart(result, 768)]);
  const parts = [LOOK_CHECK(modest, kind), "Garment picture:", g, "Person before:", b, "Result photo:", r];
  const ask = () => askGemini(parts, 20_000).then((a) => a as { ok?: boolean; problem?: string }, () => null);
  const answers = (await Promise.all([ask(), ask(), ask()])).filter((a) => a && typeof a.ok === "boolean") as { ok: boolean; problem?: string }[];
  // Busy models (rate limits) leave questions unanswered: ask again, one at a time, a few times.
  for (let tries = 0; answers.length < 3 && tries < 4; tries++) {
    await new Promise((done) => setTimeout(done, 1500));
    const a = await ask();
    if (a && typeof a.ok === "boolean") answers.push(a as { ok: boolean; problem?: string });
  }
  const bad = answers.filter((a) => !a.ok);
  const note = `[tryon] check: ${bad.length} of ${answers.length} answers saw a defect: ${bad.map((a) => a.problem).join(" | ").slice(0, 400)}`;
  if (bad.length || answers.length < 3) console.info(note);
  if (answers.length < 2) return false; // not checked, so not shown
  // Two answers that disagree are not enough: the look passes only when no more than one of three sees a defect.
  if (answers.length === 2) return bad.length === 0;
  return bad.length < 2;
}

const piecePrompt = (inner: string) =>
  `Show this exact same jacket worn open over ${inner}, clearly filling the opening. Keep the jacket exactly as it is: same shape, symmetric, both lapels, both sleeves. ` +
  "Change nothing except filling the empty opening. No person, no neck, no mannequin." +
  STUDIO;

// Try-on replaces the whole top, so a jacket is first pictured together with what goes under it.
// Only the jacket's own picture is edited: combining two garment pictures distorted the jacket.
async function jacketPicture(admin: Admin, caller: Caller, avatar: AvatarProfile, layers: Layer[], index: number) {
  const jacket = layers[index];
  const below = layers.slice(0, index);
  if (below.some((l) => l.category === "dresses")) return frontPicture(admin, jacket);
  const under = below.filter((l) => l.category === "shirts-tops" || l.category === "jackets-coats").at(-1);
  const inner = under ? `${pieceName(under)}.v2` : avatar.modest ? "cream" : "tee";

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

function garmentFor(admin: Admin, caller: Caller, avatar: AvatarProfile, layers: Layer[], index: number) {
  const layer = layers[index];
  if (layer.category === "jackets-coats" && !CLOSED_OUTERWEAR.has(layer.ref)) return jacketPicture(admin, caller, avatar, layers, index);
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

// One cache key per dressing step, so every partial look on the way is reusable.
function stepKeys(avatar: AvatarProfile, layers: Layer[]) {
  // v7 (10 Nov 2026): "quality" mode; the old piece is removed except under jackets. Looks made before
  // (v4, v5: short, shiny trousers and open shirts; v6: jackets with a stray panel) are never reused.
  // v10, hijab avatars only: v7 tops erased the headscarf's drape and bared the neck (v8: a failed test of
  // keeping the old top; v9: first headscarf overlay, which left a patch beside a long drape), so those are
  // never reused. From v10 the avatar's own head and headscarf are laid back on every result; v11: two
  // broken v10 looks passed a check that had too few answers, so v10 is dropped too.
  const version = avatar.modest ? "v11" : "v7";
  return layers.map((_, i) => {
    const stack = layers.slice(0, i + 1);
    return createHash("sha256").update(`${version}|${avatar.cachePrefix}|front|${stack.map((l) => l.ref).join(",")}`).digest("hex");
  });
}

// The finished result for this exact look, if it was ever made. Never costs anything.
export async function findLook(callerId: string, avatarKey: string, refs: string[]) {
  const admin = createAdminClient();
  const [avatar, layers] = await Promise.all([loadAvatar(admin, callerId, avatarKey), resolveLayers(admin, callerId, refs)]);
  const key = stepKeys(avatar, layers).at(-1)!;
  const { data } = await admin
    .from("generations")
    .select("id, result_paths")
    .in("user_id", cacheOwners(callerId))
    .eq("cache_key", key)
    .eq("status", "done")
    .limit(1)
    .maybeSingle();
  return { generationId: (data?.id as string) ?? null, refs: layers.map((l) => l.ref), ownIds: layers.flatMap((l) => (l.ownId ? [l.ownId] : [])) };
}

// Teen avatars never wear revealing pieces (checked before anything is paid). Modest avatars get a note.
async function checkCoverage(admin: Admin, avatar: AvatarProfile, layers: Layer[]) {
  if (avatar.age !== "teen" && !avatar.modest) return null;
  let notice: "modest" | null = null;
  for (const layer of layers) {
    const c = await coverageFor(admin, layer);
    if (!c) {
      if (avatar.age === "teen") throw new StudioFailure("failed", 503); // unknown pieces are never risked on a teen
      continue;
    }
    const rule = coverageRule(c, avatar.age, avatar.modest);
    if (rule === "blocked") throw new StudioFailure("not_for_age", 422);
    if (rule === "modest") notice = "modest";
  }
  return notice;
}

export async function runTryOn(caller: Caller, avatarKey: string, refs: string[], cacheOnly = false) {
  const t0 = Date.now();
  const lap = (label: string) => process.env.NODE_ENV === "development" && console.info(`[tryon] ${label} +${Date.now() - t0} ms`);
  const admin = createAdminClient();
  // Independent checks run together: each trip to the database takes about 0.4 s.
  const [avatar, layers] = await Promise.all([
    loadAvatar(admin, caller.id, avatarKey),
    resolveLayers(admin, caller.id, refs),
    caller.unlimited ? null : assertPlanActive(caller.id),
  ]);
  const keys = stepKeys(avatar, layers);
  const charges = !caller.unlimited;
  // Looks without one of the trousers or skirts, for the one-step shortcut below.
  const bottoms = layers.some((l) => l.category === "dresses") ? [] : layers.filter((l) => l.category === "pants-skirts" && layers.length > 1);
  const restKeys = bottoms.map((b) => stepKeys(avatar, layers.filter((l) => l !== b)).at(-1)!);

  const { data: cached, error } = await admin
    .from("generations")
    .select("cache_key, result_paths")
    .in("user_id", cacheOwners(caller.id))
    .eq("status", "done")
    .in("cache_key", [...keys, ...restKeys]);
  if (error) throw error;
  const cachedMap = new Map(cached?.map((c) => [c.cache_key as string, c.result_paths as string[]]));

  let start = 0;
  for (let i = keys.length - 1; i >= 0; i--) {
    if (cachedMap.has(keys[i])) {
      start = i + 1;
      break;
    }
  }
  // Prototype: visitors only ever wear finished looks, so nothing is paid and nothing unchecked is shown.
  if (PROTOTYPE && !caller.unlimited && start < layers.length && !cacheOnly) throw new StudioFailure("prototype_only", 409);
  if (cacheOnly && start < layers.length) return { image: null, items: [] as string[], charged: 0, cached: false, notice: null };

  // The dressing steps still to do: normally from the innermost missing layer outwards.
  let lastPaths = start > 0 ? cachedMap.get(keys[start - 1])! : null;
  let steps = layers.slice(start).map((_, n) => ({ index: start + n, key: keys[start + n], all: false }));
  // Trousers or a skirt added to a look that is already made go straight on top of it: one step and
  // one credit, instead of dressing every layer again from the inside out.
  if (!cacheOnly && steps.length > 1) {
    const found = bottoms.findIndex((_, n) => cachedMap.has(restKeys[n]));
    if (found >= 0) {
      lastPaths = cachedMap.get(restKeys[found])!;
      steps = [{ index: layers.indexOf(bottoms[found]), key: keys.at(-1)!, all: true }];
    }
  }

  const [notice, , avatarId] = await Promise.all([
    cacheOnly ? null : checkCoverage(admin, avatar, layers),
    steps.length && charges ? assertDailyLimit(admin, caller.id, steps.length) : null,
    steps.length ? (avatar.rowId ?? ensureAvatarRow(admin, caller.id, avatar.key)) : null,
  ]);

  let charged = 0;
  let previous: string | null = null; // picture from the step just done, used directly by the next one
  for (const step of steps) {
    const i = step.index;
    const layer = layers[i];
    const itemIds = (step.all ? layers : layers.slice(0, i + 1)).flatMap((l) => (l.ownId ? [l.ownId] : []));
    const genId = await claim(admin, caller.id, avatarId!, step.key, itemIds);
    const spendRef = `tryon:${step.key}:${randomUUID()}`;

    if (charges) {
      const { data: paid, error: spendError } = await admin.rpc("spend_credits", { p_user: caller.id, p_amount: 1, p_ref: spendRef });
      if (spendError || !paid) {
        await admin.from("generations").update({ status: "failed", error: "no_credits" }).eq("id", genId);
        if (spendError) throw spendError;
        throw new StudioFailure("no_credits", 402);
      }
    }

    try {
      lap("ready to dress");
      const [modelImage, garmentImage] = await Promise.all([
        previous ?? (lastPaths ? sign(admin, lastPaths[1]) : avatar.modelImage()),
        garmentFor(admin, caller, avatar, layers, i),
      ]);
      lap("pictures uploaded");
      const garmentPng = fetchBuffer(garmentImage);
      const beforePng = fetchBuffer(modelImage);
      garmentPng.catch(() => null); // both awaited below; never left as unhandled rejections
      beforePng.catch(() => null);
      let url = "";
      let rawPng: Buffer | null = null;
      let cutPng: Promise<Buffer> | null = null;
      let attempts = 0;
      for (let attempt = 0; attempt < 2 && !rawPng; attempt++) {
        attempts = attempt + 1;
        const data = await runFal(
          FAL_TRYON,
          {
            model_image: modelImage,
            garment_image: garmentImage,
            category: FASHN_CATEGORY[layer.category],
            garment_photo_type: "flat-lay",
            // Tested side by side (Nov 2026): "balanced" over the model's own clothes kept their shape
            // (cropped, wide, shiny trousers; shirts left open over the t-shirt). Removing the old piece and
            // "quality" gave full-length, matte trousers and buttoned shirts, at about 17 s instead of 11 s.
            // A jacket is different: it is drawn over what is already worn, and removing first left a stray
            // panel behind the legs and changed the shoes, so jackets keep the silhouette.
            // Hijab avatars: removing the old top also removed the headscarf's drape (turban, bare neck), and
            // keeping the old top left shirts open or twisted (Nov 2026 tests). So tops are replaced as for
            // everyone and the avatar's own headscarf is laid back on afterwards (hijab.ts).
            mode: "quality",
            segmentation_free: layer.category === "jackets-coats" && !CLOSED_OUTERWEAR.has(layer.ref),
            moderation_level: "conservative",
            num_samples: 1,
            output_format: "png",
            seed: randomInt(1, 2_000_000_000), // a fresh draw each time, so a second attempt is not a copy of the first
          },
          caller,
        );
        url = data.images![0].url;
        lap(`dressed, attempt ${attempt + 1}`);
        let png = await fetchBuffer(url);
        if (avatar.modest) {
          // The avatar's own headscarf goes back over the result (see hijab.ts), then this is the picture used.
          png = await keepHeadscarf(caller, avatar, png);
          url = await uploadOpaque(png);
          lap("headscarf kept");
        }
        // The background is removed while the check runs (BiRefNet costs nothing), so checking adds little time.
        const cut = cutout(url, caller);
        cut.catch(() => null);
        if (await lookIsSound(png, await garmentPng, await beforePng, avatar.modest, FASHN_CATEGORY[layer.category]!)) {
          rawPng = png;
          cutPng = cut;
        }
        lap("checked");
      }
      // Two broken results in a row: nothing is shown and the credit goes back (catch below).
      if (!rawPng || !cutPng) throw new StudioFailure("look_failed", 422);

      const rawPath = `${caller.id}/${genId}/raw.jpg`;
      const cutPath = `${caller.id}/${genId}/look.webp`;
      const cutBuf = await cutPng;
      lap("background removed");
      // Compact formats: the full-size PNGs took about 5 seconds to store.
      const [raw, cut] = await Promise.all([
        sharp(rawPng).flatten({ background: "#F4F3EF" }).jpeg({ quality: 93 }).toBuffer(),
        sharp(cutBuf).webp({ quality: 92, alphaQuality: 95 }).toBuffer(),
      ]);
      const stored = await Promise.all([
        results(admin).upload(rawPath, raw, { contentType: "image/jpeg", upsert: true }),
        results(admin).upload(cutPath, cut, { contentType: "image/webp", upsert: true }),
      ]);
      for (const up of stored) if (up.error) throw up.error;
      lastPaths = [cutPath, rawPath];
      previous = url;
      lap("stored");
      const { error: e } = await admin.from("generations").update({ status: "done", result_paths: lastPaths, cost_usd: 0.075 * attempts }).eq("id", genId);
      if (e) throw e;
      if (charges) charged += 1;
    } catch (err) {
      if (charges) await admin.rpc("refund_credits", { p_user: caller.id, p_amount: 1, p_spend_ref: spendRef });
      await admin
        .from("generations")
        .update({ status: "failed", error: err instanceof Error ? err.message.slice(0, 200) : "failed" })
        .eq("id", genId);
      if (err instanceof StudioFailure) throw err;
      console.error("[tryon] failed", describeError(err));
      throw new StudioFailure("failed", 502);
    }
  }

  return { image: await sign(admin, lastPaths![0]), items: layers.map((l) => l.ref), charged, cached: start === layers.length, notice };
}
