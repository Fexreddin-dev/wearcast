import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/supabase/signed";
import { type AvatarCard, type Category, type WardrobeItem } from "./catalog";
import { readMeasurements } from "./avatars";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// The owner's finished avatars, newest first, with short-lived links to their pictures.
export async function ownAvatars(supabase: Supabase): Promise<AvatarCard[]> {
  const { data: rows } = await supabase
    .from("avatars")
    .select("id, name, gender, age_group, modest, measurements, image_path")
    .in("kind", ["custom", "photo"])
    .eq("status", "done")
    .order("created_at", { ascending: false });
  const list = (rows ?? []).filter((r) => r.image_path);
  if (!list.length) return [];
  const webp = (r: (typeof list)[number]) => (r.image_path as string).replace(/\.png$/, ".webp");
  const signed = await signedUrls(supabase, "user-photos", list.map(webp));
  return list.map((r) => {
    const gender = r.gender === "male" ? "male" : "female";
    const age = r.age_group === "adult" ? "adult" : "teen";
    return {
      id: r.id,
      image: signed.get(webp(r)) ?? "",
      name: r.name || null,
      gender,
      age,
      modest: r.modest,
      own: true,
      measurements: readMeasurements(r.measurements, gender, age),
    };
  });
}

// The owner's finished wardrobe pieces, newest first.
export async function ownItems(supabase: Supabase): Promise<WardrobeItem[]> {
  const { data: rows } = await supabase
    .from("wardrobe_items")
    .select("id, category, name, clean_path, size, fit")
    .eq("status", "done")
    .order("created_at", { ascending: false });
  const list = (rows ?? []).filter((r) => r.clean_path);
  if (!list.length) return [];
  const signed = await signedUrls(supabase, "wardrobe", list.map((r) => r.clean_path as string));
  return list.map((r) => ({
    ref: r.id,
    category: r.category as Category,
    name: r.name,
    image: signed.get(r.clean_path as string) ?? "",
    demo: false,
    size: r.size,
    fit: r.fit,
  }));
}
