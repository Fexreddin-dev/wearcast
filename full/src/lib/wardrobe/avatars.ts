import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  baseInfo,
  COVERED,
  type AgeGroup,
  type BaseAvatar,
  type Category,
  type Coverage,
  defaultMeasurements,
  type Gender,
  isBaseAvatar,
  isUuid,
  MEASURE_KEYS,
  type Measurements,
} from "./catalog";
import { askGemini, type Caller, cutout, FAL_EDIT, FAL_TRYON, fetchBuffer, runFal, StudioFailure, uploadOpaque, uploadStatic } from "./server";
import { findHeadscarf, layHeadBack } from "./hijab";

type Admin = ReturnType<typeof createAdminClient>;
export const photos = (admin: Admin) => admin.storage.from("user-photos");
export const publicFile = (...parts: string[]) => fs.readFile(path.join(process.cwd(), "public", "assets", ...parts));

// What try-on needs to know about the avatar being dressed.
export type AvatarProfile = {
  key: string;
  rowId: string | null; // null for shipped avatars: their internal row is made on first use
  gender: Gender;
  age: AgeGroup;
  modest: boolean;
  measurements: Measurements;
  cachePrefix: string;
  modelImage: () => Promise<string>;
  source: () => Promise<Buffer>; // the avatar's own front picture, before anything is dressed
};

export async function loadAvatar(admin: Admin, userId: string, key: string): Promise<AvatarProfile> {
  if (isBaseAvatar(key)) {
    const info = baseInfo(key);
    return {
      key,
      rowId: null,
      ...info,
      measurements: defaultMeasurements(info.gender, info.age),
      cachePrefix: `base:${key}`,
      modelImage: () => uploadStatic(`avatar:${key}:front`, () => publicFile("avatars", `${key}-front.png`)),
      source: () => publicFile("avatars", `${key}-front.png`),
    };
  }
  if (!isUuid(key)) throw new StudioFailure("invalid");
  const { data: row, error } = await admin
    .from("avatars")
    .select("id, gender, age_group, modest, measurements, image_path, version")
    .eq("id", key)
    .eq("user_id", userId)
    .eq("status", "done")
    .in("kind", ["custom", "photo"])
    .maybeSingle();
  if (error) throw error;
  if (!row?.image_path) throw new StudioFailure("invalid", 404);
  const gender = (row.gender ?? "female") as Gender;
  const age = (row.age_group === "adult" ? "adult" : "teen") as AgeGroup;
  const source = async () => {
    const { data, error: e } = await photos(admin).download(row.image_path!);
    if (e) throw e;
    return Buffer.from(await data.arrayBuffer());
  };
  return {
    key,
    rowId: row.id,
    gender,
    age,
    modest: row.modest,
    measurements: readMeasurements(row.measurements, gender, age),
    cachePrefix: `avatar:${row.id}:${row.version}`,
    modelImage: () => uploadStatic(`own:${row.id}:${row.version}`, source),
    source,
  };
}

export function readMeasurements(raw: unknown, gender: Gender, age: AgeGroup): Measurements {
  const base = defaultMeasurements(gender, age);
  const src = (raw ?? {}) as Record<string, unknown>;
  for (const k of MEASURE_KEYS) if (typeof src[k] === "number" && Number.isFinite(src[k])) base[k] = src[k] as number;
  return base;
}

const jpegPart = async (image: Buffer, size = 768) => ({
  inlineData: {
    mimeType: "image/jpeg",
    data: (await sharp(image).flatten({ background: "#FFFFFF" }).resize(size, size, { fit: "inside" }).jpeg({ quality: 84 }).toBuffer()).toString("base64"),
  },
});

// ───────── Coverage of a garment (sleeves, neckline, length) ─────────
const COVERAGE_PROMPT =
  'Describe how much this garment covers when worn. Reply as JSON {"sleeves": "none"|"short"|"long", "neckline": "high"|"regular"|"low", "length": "mini"|"knee"|"long"|"na", "revealing": boolean}. ' +
  "sleeves: none for sleeveless or strapless, short for t-shirt to elbow length, long for wrist length; use long for trousers and skirts. " +
  "neckline: low for deep V, plunging, off-shoulder or strapless; high for turtle or high necks. " +
  "length: for skirts, dresses and shorts: mini = above mid-thigh, knee = around the knee, long = midi, ankle or full length; use long for full trousers and na for tops and jackets. " +
  "revealing: true for swimwear, underwear, lingerie, sheer or see-through fabric, crop tops that show the belly, backless or large cut-out designs.";

export async function measureCoverage(image: Buffer): Promise<Coverage | null> {
  try {
    const a = (await askGemini([COVERAGE_PROMPT, await jpegPart(image, 512)])) as Partial<Coverage>;
    const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T) => (allowed.includes(v as T) ? (v as T) : fallback);
    return {
      sleeves: pick(a.sleeves, ["none", "short", "long"] as const, "short"),
      neckline: pick(a.neckline, ["high", "regular", "low"] as const, "regular"),
      length: pick(a.length, ["mini", "knee", "long", "na"] as const, "na"),
      revealing: a.revealing === true,
    };
  } catch {
    return null;
  }
}

// Sample pieces are all long-sleeved and long, checked by eye.
export async function coverageFor(admin: Admin, item: { ownId?: string; cleanPath?: string; category: Category }): Promise<Coverage | null> {
  if (!item.ownId) return COVERED;
  const { data } = await admin.from("wardrobe_items").select("coverage").eq("id", item.ownId).maybeSingle();
  if (data?.coverage) return data.coverage as Coverage;
  const { data: file, error } = await admin.storage.from("wardrobe").download(item.cleanPath!);
  if (error) return null;
  const c = await measureCoverage(Buffer.from(await file.arrayBuffer()));
  if (c) await admin.from("wardrobe_items").update({ coverage: c }).eq("id", item.ownId);
  return c;
}

// ───────── Own photo → avatar ─────────
const PHOTO_CHECK =
  'Check this photo before it becomes a full-body fashion avatar. Reply as JSON {"one_main_person": boolean, "full_body": boolean, "facing_camera": boolean, "everyday_clothes": boolean, "under_18": boolean}. ' +
  "one_main_person: exactly one person stands in the foreground; ignore small or blurred people in the background. " +
  "full_body: that person is visible from the top of the head down to the shoes. facing_camera: standing and facing the camera; a slight angle is fine. " +
  "everyday_clothes: false only for swimwear, underwear or nudity. under_18: the person looks younger than 18.";

export type PhotoVerdict = { usable: boolean; underAge: boolean };
// Three looks; a photo is refused only when at least two agree on the same problem. One look alone was
// not steady (it once counted people walking in the background), and a wrongly refused photo would block
// a real customer, while a wrongly accepted one only costs a free cut-out (the studio outfit is checked again).
export async function checkPersonPhoto(image: Buffer): Promise<PhotoVerdict> {
  const part = await jpegPart(image);
  const answers = (
    await Promise.all([0, 1, 2].map(() => askGemini([PHOTO_CHECK, part], 25_000).catch(() => null)))
  ).filter((a): a is Record<string, unknown> => !!a && typeof a === "object");
  if (answers.length === 0) return { usable: true, underAge: false }; // checker unreachable: accepted
  const votes = (test: (a: Record<string, unknown>) => boolean) => answers.filter(test).length;
  const need = Math.min(2, answers.length);
  const problem = (["one_main_person", "full_body", "facing_camera", "everyday_clothes"] as const).some((k) => votes((a) => a[k] === false) >= need);
  return { usable: !problem, underAge: votes((a) => a.under_18 === true) >= need };
}

// Studio outfit: the person is dressed in one plain, neutral outfit for cleaner try-ons.
// Tested on three photos (Nov 2026):
// - a base model's photo as the garment was unreliable: once it swapped the clothes, once it changed nothing,
//   and on the hijab photo it also replaced the headscarf;
// - a short-sleeve t-shirt left the photo's own long sleeves showing underneath;
// - a garment-only flat lay with long sleeves worked: modest outfit on the hijab photo, neutral one on the man.
//   On a woman in a wide dress the dress still showed beside the trousers, and removing the old clothes
//   first fixed that. A long cardigan left a panel beside one trouser leg the same way, and the checks
//   did not see it reliably, so removing the old clothes now comes first (Nov 2026).
function studioOutfit(modest: boolean) {
  return modest
    ? {
        garment: () => uploadStatic("studio:modest", () => publicFile("studio", "outfit-modest.png"), "#FFFFFF"),
        expected: "a cream long-sleeve sweater and beige wide trousers",
      }
    : {
        garment: () => uploadStatic("studio:neutral", () => publicFile("studio", "outfit-neutral.png"), "#FFFFFF"),
        expected: "a plain white long-sleeve top and light grey trousers",
      };
}

const outfitCheck = (expected: string) =>
  `This photo should show one real person wearing ${expected}. Reply as JSON {"ok": boolean, "problem": string}. ` +
  "ok is false only if: sleeves, cuffs, a hood or fabric of a different garment (for example a dress, skirt, coat or cardigan) stick out under, beside or over the new clothes; " +
  "a long panel or flap of fabric hangs beside or over the trousers, or one trouser leg has an extra layer the other does not; " +
  "hands or arms look like a white mannequin; the person has extra or missing limbs; the face or headscarf looks damaged or replaced; the person still wears different clothes. " +
  "Small wrinkles are normal.";

// Three looks, majority wins: a single look was sometimes too strict on a clean picture (1 in 3), and
// caught a leftover dress every time. When the checker cannot be reached the picture is not trusted.
export async function outfitIsClean(url: string, expected: string) {
  try {
    const part = await jpegPart(await fetchBuffer(url));
    const prompt = outfitCheck(expected);
    const answers = (await Promise.all([0, 1, 2].map(() => askGemini([prompt, part])))) as { ok?: boolean }[];
    return answers.filter((a) => a.ok === true).length >= 2;
  } catch {
    return false;
  }
}

// The dressed picture, or null when neither attempt is clean (the person's own clothes are kept then).
// `photo` is the uploaded picture itself: on a hijab photo the try-on model redrew the headscarf (its
// drape became a huge collar, Nov 2026), so the person's own head and headscarf are laid back on.
export async function dressInStudioOutfit(photoUrl: string, photo: Buffer, profile: { modest: boolean }, caller: Caller) {
  const s = studioOutfit(profile.modest);
  const [garment, scarf] = await Promise.all([s.garment(), profile.modest ? findHeadscarf(caller, photo) : null]);
  if (profile.modest && !scarf) return null; // the headscarf could not be protected: keep the own clothes
  for (const keepShape of [false, true]) {
    const data = await runFal(
      FAL_TRYON,
      {
        model_image: photoUrl,
        garment_image: garment,
        category: "one-pieces",
        garment_photo_type: "flat-lay",
        mode: "balanced",
        // First attempt removes the old clothes; the second keeps the silhouette.
        segmentation_free: keepShape,
        moderation_level: "conservative",
        num_samples: 1,
        output_format: "png",
      },
      caller,
    );
    let url = data.images![0].url;
    if (scarf) url = await uploadOpaque(await layHeadBack(photo, scarf, await fetchBuffer(url)), "#FFFFFF");
    if (await outfitIsClean(url, s.expected)) return url;
  }
  return null;
}

// ───────── Shipped avatar → adjusted avatar ─────────
const FRAME_CHECK =
  'Reply as JSON {"ok": boolean}. ok is true only if the image shows exactly one real person standing, fully visible from the top of the head to both shoes, with natural hands and no distorted body parts.';

export async function makeCustomPicture(base: BaseAvatar, prompt: string, caller: Caller) {
  const image = await uploadOpaque(await publicFile("avatars", `${base}-front.png`), "#F4F3EF");
  for (let attempt = 0; attempt < 2; attempt++) {
    const data = await runFal(FAL_EDIT, { prompt, image_url: image, aspect_ratio: "9:16", output_format: "png", safety_tolerance: "2" }, caller);
    const url = data.images![0].url;
    try {
      const a = (await askGemini([FRAME_CHECK, await jpegPart(await fetchBuffer(url))])) as { ok?: boolean };
      if (a.ok !== false) return url;
    } catch {
      return url;
    }
  }
  throw new StudioFailure("failed", 502);
}

// The finished avatar: background removed, trimmed, same height as the shipped ones.
export async function finishAvatar(url: string, caller: Caller) {
  const cut = await cutout(url, caller);
  const png = await sharp(cut).resize({ height: 1400, withoutEnlargement: true }).png().toBuffer();
  const webp = await sharp(png).webp({ quality: 90, alphaQuality: 95 }).toBuffer();
  return { png, webp };
}

// Removes every file of an avatar: photos, the cut-out and all try-on results made on it.
export async function purgeAvatar(admin: Admin, userId: string, avatarId: string) {
  const folder = `${userId}/avatars/${avatarId}`;
  const { data: files } = await photos(admin).list(folder, { limit: 100 });
  if (files?.length) {
    const { error } = await photos(admin).remove(files.map((f) => `${folder}/${f.name}`));
    if (error) throw error;
  }
  const { data: gens } = await admin.from("generations").select("result_paths").eq("user_id", userId).eq("avatar_id", avatarId);
  const results = (gens ?? []).flatMap((g) => g.result_paths as string[]);
  if (results.length) {
    const { error } = await admin.storage.from("generations").remove(results);
    if (error) throw error;
  }
}
