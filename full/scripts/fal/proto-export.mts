// Investor prototype (11 Nov 2026): makes the shipped look pictures (public/assets/looks/<id>.webp).
// For each approved look: the full try-on picture (raw.jpg) is cut out again with the hair-aware "Portrait"
// background removal (the first cut left light patches beside long hair), then finished by scripts/fal/finish.mjs
// (edge clean-up, light sharpening, a little colour depth). A cut-out made earlier is reused from CUT_DIR.
// Run like proto-looks.mts:  ... proto-export.mts [ids...]
import fs from "node:fs";
import path from "node:path";
import { fal } from "@fal-ai/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { findLook } from "@/lib/wardrobe/tryon";
import { APPROVED, CURATED, CURATOR_ID } from "@/lib/wardrobe/curated";
import sharp from "sharp";
import { finishLook } from "./finish.mjs";
import { recolourShoes } from "./shoes.mjs";

const OUT = path.join(process.cwd(), "public", "assets", "looks");
const CUT_DIR = process.env.CUT_DIR ?? path.join(process.cwd(), "assets-src", "looks-cut");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(CUT_DIR, { recursive: true });
fal.config({ credentials: process.env.FAL_KEY });
const admin = createAdminClient();

const only = process.argv.slice(2);
// Only looks with approved texts are exported (unless named): the others are not shown anywhere.
const todo = only.length ? CURATED.filter((c) => only.includes(c.id)) : APPROVED();
for (const look of todo) {
  const cutPath = path.join(CUT_DIR, `${look.id}.png`);
  if (!fs.existsSync(cutPath)) {
    const { generationId } = await findLook(CURATOR_ID, look.avatar, look.refs);
    if (!generationId) {
      console.log(`MISSING ${look.id}`);
      continue;
    }
    const { data: gen } = await admin.from("generations").select("result_paths").eq("id", generationId).single();
    const { data: file, error } = await admin.storage.from("generations").download((gen!.result_paths as string[])[1]);
    if (error) throw error;
    const url = await fal.storage.upload(new Blob([await file.arrayBuffer()], { type: "image/jpeg" }));
    const res = await fal.subscribe("fal-ai/birefnet/v2", {
      input: { image_url: url, model: "Portrait", operating_resolution: "2048x2048", refine_foreground: true, output_format: "png" },
    });
    await admin.from("cost_log").insert({ provider: "fal", model: "fal-ai/birefnet/v2", cost_usd: 0.01, user_id: CURATOR_ID });
    fs.writeFileSync(cutPath, Buffer.from(await (await fetch((res.data as { image: { url: string } }).image.url)).arrayBuffer()));
  }
  const finished = ((await finishLook(cutPath)) as { buf: Buffer }).buf;
  // Shoes matched to the outfit, from the same sneakers (free, deterministic).
  const shod = ((await recolourShoes(finished, look.shoes)) as { buf: Buffer }).buf;
  fs.writeFileSync(path.join(OUT, `${look.id}.webp`), shod);
  // The pair as worn, cut from the picture, is the "shoes" piece of the set.
  const meta = await sharp(shod).metadata();
  const top = Math.round(meta.height! * 0.9);
  fs.mkdirSync(path.join(OUT, "shoes"), { recursive: true });
  fs.writeFileSync(
    path.join(OUT, "shoes", `${look.id}.webp`),
    await sharp(shod).extract({ left: 0, top, width: meta.width!, height: meta.height! - top }).trim({ threshold: 1 }).webp({ quality: 95, alphaQuality: 95 }).toBuffer(),
  );
  const buf = shod;
  console.log(`saved ${look.id} ${Math.round(buf.length / 1024)} KB`);
}
