import { randomUUID } from "node:crypto";
import { fal } from "@fal-ai/client";
import sharp from "sharp";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AGE_GROUPS,
  type AvatarCard,
  BASE_AVATARS,
  baseInfo,
  customPrompt,
  FACE_SHAPES,
  HAIR_STYLES,
  HIJAB_STYLES,
  MEASURE_KEYS,
  MEASURE_RANGE,
  type Measurements,
  SKIN_TONES,
} from "@/lib/wardrobe/catalog";
import {
  checkPersonPhoto,
  dressInStudioOutfit,
  finishAvatar,
  makeCustomPicture,
  photos,
  publicFile,
  purgeAvatar,
} from "@/lib/wardrobe/avatars";
import { assertPlanActive, type Caller, fail, requireUser, startOfToday, StudioFailure } from "@/lib/wardrobe/server";

type Admin = ReturnType<typeof createAdminClient>;
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
// Making an avatar is a one-time setup, so a small daily allowance is plenty.
const DAILY_AVATARS = 3;

const measurements = z.object(
  Object.fromEntries(MEASURE_KEYS.map((k) => [k, z.number().min(MEASURE_RANGE[k][0]).max(MEASURE_RANGE[k][1])])) as Record<
    (typeof MEASURE_KEYS)[number],
    z.ZodNumber
  >,
);
const common = z.object({ name: z.string().trim().max(40).optional(), measurements });
const photoFields = common.extend({
  gender: z.enum(["male", "female"]),
  age: z.enum(AGE_GROUPS),
  modest: z.boolean(),
  studio: z.boolean(),
  consent: z.literal(true),
});
const customFields = common.extend({
  base: z.enum(BASE_AVATARS),
  skin: z.enum(["keep", ...SKIN_TONES]),
  hair: z.enum(HAIR_STYLES),
  face: z.enum(FACE_SHAPES),
  hijab: z.enum(HIJAB_STYLES),
});

const photo = (v: FormDataEntryValue | null) => {
  if (!(v instanceof File) || v.size === 0) return null;
  if (v.size > MAX_BYTES || !TYPES.includes(v.type)) throw new StudioFailure("invalid");
  return v;
};

async function assertDailyAvatars(admin: Admin, userId: string) {
  const { count, error } = await admin
    .from("credit_ledger")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("reason", "avatar_made")
    .gte("created_at", startOfToday());
  if (error) throw error;
  if ((count ?? 0) >= DAILY_AVATARS) throw new StudioFailure("avatar_limit", 429);
}

// One credit for a step that changes the picture, returned if that step does not work out.
function wallet(admin: Admin, caller: Caller) {
  let ref: string | null = null;
  return {
    async spend() {
      if (caller.unlimited) return;
      ref = `avatar:${randomUUID()}`;
      const { data: paid, error } = await admin.rpc("spend_credits", { p_user: caller.id, p_amount: 1, p_ref: ref, p_reason: "avatar" });
      if (error) throw error;
      if (!paid) {
        ref = null;
        throw new StudioFailure("no_credits", 402);
      }
    },
    async refund() {
      if (!ref) return;
      // Its own reason, so a returned avatar credit never counts against today's try-ons.
      await admin.from("credit_ledger").insert({ user_id: caller.id, delta: 1, reason: "avatar_refund", ref: `refund:${ref}` });
      ref = null;
    },
    get charged() {
      return ref !== null;
    },
  };
}

const card = (row: { id: string; name: string | null; gender: string; age_group: string; modest: boolean; measurements: Measurements }, image: string): AvatarCard => ({
  id: row.id,
  image,
  name: row.name,
  gender: row.gender as AvatarCard["gender"],
  age: row.age_group === "adult" ? "adult" : "teen",
  modest: row.modest,
  own: true,
  measurements: row.measurements,
});

export async function POST(request: Request) {
  let cleanup: (() => Promise<void>) | undefined;
  try {
    const { user, caller } = await requireUser();
    const form = await request.formData();
    const mode = form.get("mode");
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(String(form.get("data") ?? "{}"));
    } catch {
      throw new StudioFailure("invalid");
    }
    const admin = createAdminClient();
    if (!caller.unlimited) {
      await assertPlanActive(caller.id);
      await assertDailyAvatars(admin, caller.id);
    }
    const pay = wallet(admin, caller);

    let row: { kind: "photo" | "custom"; gender: string; age_group: string; modest: boolean; base_avatar_id: string | null; extra: Record<string, unknown> };
    let input: z.infer<typeof photoFields> | z.infer<typeof customFields>;
    if (mode === "photo") {
      const parsed = photoFields.safeParse(raw);
      if (!parsed.success) throw new StudioFailure(raw?.consent !== true ? "consent" : "invalid");
      input = parsed.data;
      row = { kind: "photo", gender: input.gender, age_group: input.age, modest: input.modest, base_avatar_id: null, extra: {} };
    } else if (mode === "custom") {
      const parsed = customFields.safeParse(raw);
      if (!parsed.success) throw new StudioFailure("invalid");
      input = parsed.data;
      const info = baseInfo(input.base);
      row = {
        kind: "custom",
        gender: info.gender,
        age_group: info.age,
        modest: info.modest,
        base_avatar_id: input.base,
        extra: { skin_tone: input.skin, hair_style: input.hair, face_shape: input.face, hijab_style: input.hijab },
      };
    } else throw new StudioFailure("invalid");

    const front = mode === "photo" ? photo(form.get("front")) : null;
    if (mode === "photo" && !front) throw new StudioFailure("invalid");

    const { data: made, error } = await admin
      .from("avatars")
      .insert({
        user_id: user.id,
        name: input.name || null,
        kind: row.kind,
        gender: row.gender,
        age_group: row.age_group,
        modest: row.modest,
        base_avatar_id: row.base_avatar_id,
        measurements: input.measurements,
        status: "processing",
        ...row.extra,
      })
      .select("id")
      .single();
    if (error) throw error;
    const id = made.id as string;
    const folder = `${user.id}/avatars/${id}`;
    cleanup = async () => {
      await pay.refund();
      await purgeAvatar(admin, user.id, id);
      await admin.from("avatars").delete().eq("id", id);
    };

    let source: string | null = null; // picture still to be cut out
    let finished: { png: Buffer; webp: Buffer } | null = null;
    let plain = false;
    const originals: string[] = [];

    if (mode === "photo") {
      const p = input as z.infer<typeof photoFields>;
      // Re-encoding applies the phone's rotation and drops location data.
      let frontJpeg: Buffer | undefined;
      for (const [name, file] of [["front", front], ["side", photo(form.get("side"))], ["back", photo(form.get("back"))]] as const) {
        if (!file) continue;
        const jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
          .rotate()
          .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 92 })
          .toBuffer();
        if (name === "front") frontJpeg = jpeg;
        const up = await photos(admin).upload(`${folder}/${name}.jpg`, jpeg, { contentType: "image/jpeg", upsert: true });
        if (up.error) throw up.error;
        originals.push(`${folder}/${name}.jpg`);
      }

      const verdict = await checkPersonPhoto(frontJpeg!);
      if (!verdict.usable) throw new StudioFailure("photo_unusable", 422);
      // Someone who looks under 18 always gets the teen rules, whatever was chosen.
      if (verdict.underAge) row.age_group = "teen";

      fal.config({ credentials: process.env.FAL_KEY });
      const upload = await sharp(frontJpeg!).resize(1024, 1536, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 93 }).toBuffer();
      source = await fal.storage.upload(new Blob([new Uint8Array(upload)], { type: "image/jpeg" }));
      if (p.studio) {
        await pay.spend();
        let dressed: string | null = null;
        try {
          dressed = await dressInStudioOutfit(source, { gender: p.gender, age: row.age_group as "adult" | "teen", modest: p.modest }, caller);
        } catch (e) {
          if (e instanceof StudioFailure && e.code === "budget") throw e;
          console.error("[avatars] studio outfit failed", e instanceof Error ? e.message : "unknown");
        }
        if (dressed) source = dressed;
        else {
          await pay.refund();
          plain = true;
        }
      }
    } else {
      const c = input as z.infer<typeof customFields>;
      const prompt = customPrompt(c.base, { skin: c.skin === "keep" ? undefined : c.skin, hair: c.hair, face: c.face, hijab: c.hijab }, c.measurements);
      if (prompt) {
        await pay.spend();
        source = await makeCustomPicture(c.base, prompt, caller);
      } else {
        // Nothing in the picture changes: the shipped cut-out is reused as it is, free.
        const [png, webp] = await Promise.all([publicFile("avatars", `${c.base}-front.png`), publicFile("avatars", `${c.base}-front.webp`)]);
        finished = { png, webp };
      }
    }

    finished ??= await finishAvatar(source!, caller);
    const [a, b] = await Promise.all([
      photos(admin).upload(`${folder}/avatar.png`, finished.png, { contentType: "image/png", upsert: true }),
      photos(admin).upload(`${folder}/avatar.webp`, finished.webp, { contentType: "image/webp", upsert: true }),
    ]);
    if (a.error) throw a.error;
    if (b.error) throw b.error;

    const { data: saved, error: saveError } = await admin
      .from("avatars")
      .update({ image_path: `${folder}/avatar.png`, photo_paths: originals, age_group: row.age_group, status: "done" })
      .eq("id", id)
      .select("id, name, gender, age_group, modest, measurements")
      .single();
    if (saveError) throw saveError;
    cleanup = undefined;
    await admin.from("credit_ledger").insert({ user_id: user.id, delta: 0, reason: "avatar_made", ref: `avatar_made:${id}` });

    const { data: signed } = await photos(admin).createSignedUrl(`${folder}/avatar.webp`, 3600);
    return Response.json({ avatar: card(saved, signed?.signedUrl ?? ""), plain, charged: pay.charged ? 1 : 0 });
  } catch (e) {
    await cleanup?.().catch(() => undefined);
    return fail(e);
  }
}
