import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { type AvatarCard } from "./catalog";
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
  const { data: signed } = await supabase.storage
    .from("user-photos")
    .createSignedUrls(list.map((r) => (r.image_path as string).replace(/\.png$/, ".webp")), 3600);
  return list.map((r, i) => {
    const gender = r.gender === "male" ? "male" : "female";
    const age = r.age_group === "adult" ? "adult" : "teen";
    return {
      id: r.id,
      image: signed?.[i]?.signedUrl ?? "",
      name: r.name,
      gender,
      age,
      modest: r.modest,
      own: true,
      measurements: readMeasurements(r.measurements, gender, age),
    };
  });
}
