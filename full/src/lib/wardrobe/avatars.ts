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
  return {
    key,
    rowId: row.id,
    gender,
    age,
    modest: row.modest,
    measurements: readMeasurements(row.measurements, gender, age),
    cachePrefix: `avatar:${row.id}:${row.version}`,
    modelImage: () =>
      uploadStatic(`own:${row.id}:${row.version}`, async () => {
        const { data, error: e } = await photos(admin).download(row.image_path!);
        if (e) throw e;
        return Buffer.from(await data.arrayBuffer());
      }),
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
  'Check this photo before it becomes a full-body fashion avatar. Reply as JSON {"people": number, "full_body": boolean, "facing_camera": boolean, "everyday_clothes": boolean, "under_18": boolean}. ' +
  "people: how many people are clearly visible. full_body: the whole person is visible from the top of the head down to the shoes. " +
  "facing_camera: standing and facing the camera; a slight angle is fine. everyday_clothes: false for swimwear, underwear or nudity. under_18: the person looks younger than 18.";

export type PhotoVerdict = { usable: boolean; underAge: boolean };
export async function checkPersonPhoto(image: Buffer): Promise<PhotoVerdict> {
  try {
    const a = (await askGemini([PHOTO_CHECK, await jpegPart(image)], 25_000)) as Record<string, unknown>;
    const usable = a.people === 1 && a.full_body === true && a.facing_camera !== false && a.everyday_clothes !== false;
    return { usable, underAge: a.under_18 === true };
  } catch {
    // When the checker is unreachable the photo is accepted; the try-on model still moderates.
    return { usable: true, underAge: false };
  }
}

// Studio outfit: the person is dressed in the same plain base outfit as the shipped models.
// Tested (Nov 2026): a base model photo as the garment works for plain outfits; for modest outfits a
// garment-only flat lay is used, because the base model's own headscarf would otherwise travel too.
function studioOutfit(gender: Gender, age: AgeGroup, modest: boolean) {
  if (modest) {
    return {
      garment: () => uploadStatic("studio:modest", () => publicFile("studio", "outfit-modest.png"), "#FFFFFF"),
      input: { category: "one-pieces", garment_photo_type: "flat-lay" },
      expected: "a cream long-sleeve sweater and beige wide trousers",
    };
  }
  const base: BaseAvatar = age === "teen" ? (gender === "male" ? "tb1" : "tg1") : gender === "male" ? "m1" : "f1";
  return {
    garment: () => uploadStatic(`studio:${base}`, () => publicFile("avatars", `${base}-front.png`)),
    input: { category: "auto", garment_photo_type: "model" },
    expected: "a plain white t-shirt",
  };
}

const outfitCheck = (expected: string) =>
  `This photo should show one real person wearing ${expected}. Reply as JSON {"ok": boolean, "problem": string}. ` +
  "ok is false only if: sleeves, cuffs, a hood or fabric of a different garment stick out under or over the new clothes; " +
  "hands or arms look like a white mannequin; the person has extra or missing limbs; the face or headscarf looks damaged or replaced. Small wrinkles are normal.";

async function outfitIsClean(url: string, expected: string) {
  try {
    const part = await jpegPart(await fetchBuffer(url));
    const prompt = outfitCheck(expected);
    const answers = (await Promise.all([askGemini([prompt, part]), askGemini([prompt, part])])) as { ok?: boolean }[];
    return answers.every((a) => a.ok !== false);
  } catch {
    return true;
  }
}

// Returns the picture to cut out, and whether the studio outfit was really applied.
export async function dressInStudioOutfit(photoUrl: string, profile: { gender: Gender; age: AgeGroup; modest: boolean }, caller: Caller) {
  const s = studioOutfit(profile.gender, profile.age, profile.modest);
  const data = await runFal(
    FAL_TRYON,
    {
      model_image: photoUrl,
      garment_image: await s.garment(),
      ...s.input,
      mode: "balanced",
      moderation_level: "conservative",
      num_samples: 1,
      output_format: "png",
    },
    caller,
  );
  const url = data.images![0].url;
  return (await outfitIsClean(url, s.expected)) ? url : null;
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
