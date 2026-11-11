import { fal } from "@fal-ai/client";
import { PROTOTYPE } from "@/lib/wardrobe/curated";
import sharp from "sharp";
import { z } from "zod";
import { CATEGORIES, DAILY_UPLOADS, FITS, MATERIALS, SIZES, WARDROBE_LIMITS, type WardrobeItem } from "@/lib/wardrobe/catalog";
import { assertClearPhoto, assertPlanActive, type Caller, cutout, fail, planOf, requireUser, startOfToday, StudioFailure } from "@/lib/wardrobe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { measureCoverage } from "@/lib/wardrobe/avatars";
import { tidyPhoto } from "@/lib/wardrobe/tidy";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

const fields = z.object({
  category: z.enum(CATEGORIES),
  name: z.string().trim().max(60).optional(),
  material: z.enum(MATERIALS),
  size: z.enum(SIZES),
  fit: z.enum(FITS),
});

const photo = (v: FormDataEntryValue | null) => {
  if (!(v instanceof File) || v.size === 0) return null;
  if (v.size > MAX_BYTES || !TYPES.includes(v.type)) throw new StudioFailure("invalid");
  return v;
};

// Takes a wardrobe slot. Everyone except unlimited accounts is held to the plan and daily upload limits.
async function reserveSlot(admin: ReturnType<typeof createAdminClient>, caller: Caller, f: z.infer<typeof fields>) {
  if (caller.unlimited) {
    const { data, error } = await admin
      .from("wardrobe_items")
      .insert({ user_id: caller.id, category: f.category, name: f.name ?? null, material: f.material, size: f.size, fit: f.fit, status: "processing" })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  await assertPlanActive(caller.id);
  const [plan, today, owned] = await Promise.all([
    planOf(caller.id),
    admin.from("credit_ledger").select("id", { count: "exact", head: true }).eq("user_id", caller.id).eq("reason", "upload").gte("created_at", startOfToday()),
    admin.from("wardrobe_items").select("id", { count: "exact", head: true }).eq("user_id", caller.id),
  ]);
  if ((today.count ?? 0) >= DAILY_UPLOADS) throw new StudioFailure("daily_limit", 429);
  if (plan === "free" && (owned.count ?? 0) >= WARDROBE_LIMITS.free) throw new StudioFailure("wardrobe_full", 403);

  const { data: id, error } = await admin.rpc("reserve_wardrobe_item", {
    p_user: caller.id,
    p_category: f.category,
    p_name: f.name ?? null,
    p_material: f.material,
    p_size: f.size,
    p_fit: f.fit,
  });
  if (error) throw error;
  if (!id) throw new StudioFailure("wardrobe_full", 403);
  // A zero entry only counts the upload; it never changes the balance.
  await admin.from("credit_ledger").insert({ user_id: caller.id, delta: 0, reason: "upload", ref: `upload:${id}` });
  return id as string;
}

export async function POST(request: Request) {
  let cleanup: (() => Promise<void>) | undefined;
  try {
    const { user, caller } = await requireUser();
    // Prototype: only the ready-made looks are used, so nothing here can cost money.
    if (PROTOTYPE && !caller.unlimited) throw new StudioFailure("prototype_only", 409);
    const form = await request.formData();
    const parsed = fields.safeParse({
      category: form.get("category"),
      name: form.get("name") || undefined,
      material: form.get("material"),
      size: form.get("size"),
      fit: form.get("fit"),
    });
    const front = photo(form.get("front"));
    if (!parsed.success || !front) throw new StudioFailure("invalid");
    const side = photo(form.get("side"));
    const back = photo(form.get("back"));
    await assertClearPhoto(Buffer.from(await front.arrayBuffer()), "garment");

    const admin = createAdminClient();
    const id = await reserveSlot(admin, caller, parsed.data);

    const bucket = admin.storage.from("wardrobe");
    const paths: string[] = [];
    cleanup = async () => {
      if (paths.length) await bucket.remove(paths);
      await admin.from("wardrobe_items").delete().eq("id", id);
    };

    // Re-encoding applies the phone's rotation and drops location data from the photo.
    const originals: string[] = [];
    let frontJpeg: Buffer | undefined;
    for (const [name, file] of [["front", front], ["side", side], ["back", back]] as const) {
      if (!file) continue;
      const jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 92 })
        .toBuffer();
      if (name === "front") frontJpeg = jpeg;
      const path = `${user.id}/${id}/${name}.jpg`;
      const up = await bucket.upload(path, jpeg, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      paths.push(path);
      originals.push(path);
    }

    fal.config({ credentials: process.env.FAL_KEY });
    const falUrl = await fal.storage.upload(new Blob([new Uint8Array(frontJpeg!)], { type: "image/jpeg" }));
    const clean = await cutout(await tidyPhoto(falUrl, parsed.data.category, caller), caller);
    const cleanPath = `${user.id}/${id}/clean.png`;
    const up = await bucket.upload(cleanPath, clean, { contentType: "image/png" });
    if (up.error) throw up.error;
    paths.push(cleanPath);

    // How much the piece covers, for the teen and modest rules. Free, and filled later if it fails now.
    const coverage = parsed.data.category === "shoes" || parsed.data.category === "accessories" ? null : await measureCoverage(clean);
    const { error: saveError } = await admin
      .from("wardrobe_items")
      .update({ original_paths: originals, clean_path: cleanPath, status: "done", coverage })
      .eq("id", id);
    if (saveError) throw saveError;

    const { data: signed } = await bucket.createSignedUrl(cleanPath, 3600);
    const item: WardrobeItem = {
      ref: id,
      category: parsed.data.category,
      name: parsed.data.name ?? null,
      image: signed?.signedUrl ?? "",
      demo: false,
      size: parsed.data.size,
      fit: parsed.data.fit,
    };
    return Response.json({ item });
  } catch (e) {
    await cleanup?.().catch(() => undefined);
    return fail(e);
  }
}
