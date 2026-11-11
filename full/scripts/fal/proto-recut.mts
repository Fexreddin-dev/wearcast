// Investor prototype (11 Nov 2026): cut the finished looks out again from their full pictures (raw.jpg) with a
// hair-aware background removal, because the first cut left light background patches between hair strands.
// Usage (like proto-looks.mts): ... proto-recut.mts <variant> <look ids...>   variant: Portrait | Matting | "General Use (Heavy)"
// Writes <PROTO_OUT>/<id>.<variant>.png for comparison; the app files are not touched.
import fs from "node:fs";
import path from "node:path";
import { fal } from "@fal-ai/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { findLook } from "@/lib/wardrobe/tryon";
import { CURATED, CURATOR_ID } from "@/lib/wardrobe/curated";

const [variant, ...ids] = process.argv.slice(2);
const OUT = process.env.PROTO_OUT ?? "proto-out";
fs.mkdirSync(OUT, { recursive: true });
fal.config({ credentials: process.env.FAL_KEY });
const admin = createAdminClient();

for (const id of ids) {
  const look = CURATED.find((c) => c.id === id) ?? null;
  const [avatar, refs] = look ? [look.avatar, look.refs] : [id.split(":")[0], id.split(":")[1].split("+")];
  const { generationId } = await findLook(CURATOR_ID, avatar, refs);
  const { data: gen } = await admin.from("generations").select("result_paths").eq("id", generationId!).single();
  const { data: file, error } = await admin.storage.from("generations").download((gen!.result_paths as string[])[1]);
  if (error) throw error;
  const url = await fal.storage.upload(new Blob([await file.arrayBuffer()], { type: "image/jpeg" }));
  const res = await fal.subscribe("fal-ai/birefnet/v2", {
    input: { image_url: url, model: variant as "Portrait", operating_resolution: "2048x2048", refine_foreground: true, output_format: "png" },
  });
  await admin.from("cost_log").insert({ provider: "fal", model: "fal-ai/birefnet/v2", cost_usd: 0.01, user_id: CURATOR_ID });
  const png = Buffer.from(await (await fetch((res.data as { image: { url: string } }).image.url)).arrayBuffer());
  const name = `${(look?.id ?? id).replace(/[:+]/g, "_")}.${variant.replace(/\W+/g, "")}.png`;
  fs.writeFileSync(path.join(OUT, name), png);
  console.log("saved", name);
}
