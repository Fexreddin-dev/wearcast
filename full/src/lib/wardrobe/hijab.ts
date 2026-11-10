import "server-only";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AvatarProfile } from "./avatars";
import { type Caller, FAL_SEGMENT, fetchBuffer, runFal, StudioFailure, uploadOpaque } from "./server";

type Admin = ReturnType<typeof createAdminClient>;
const BACKGROUND = "#F4F3EF";

// Why this exists (Nov 2026): the try-on model redraws the whole upper body for a new top, and on a
// hijab avatar it also redrew the headscarf: the drape over the chest vanished, it became a turban and
// the neck was bare. Keeping the old top (segmentation_free) did not help either. So on hijab avatars
// the head and headscarf of the avatar's own picture are laid back over every result. The result keeps
// the avatar's exact pose and size, so the two line up.

// Where the headscarf mask is kept. A user's mask sits in that avatar's private folder, so it is
// deleted together with the avatar (purgeAvatar removes the whole folder).
function maskLocation(admin: Admin, avatar: AvatarProfile, userId: string) {
  if (!avatar.rowId || avatar.cachePrefix.startsWith("base:"))
    return { bucket: admin.storage.from("generations"), path: `shared/masks/${avatar.key}.headscarf.png` };
  const version = avatar.cachePrefix.split(":").at(-1);
  return { bucket: admin.storage.from("user-photos"), path: `${userId}/avatars/${avatar.rowId}/headscarf-v${version}.png` };
}

// A usable mask covers a head-sized area in the upper part of the picture.
async function maskIsPlausible(mask: Buffer) {
  const { data, info } = await sharp(mask).greyscale().extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  let on = 0;
  let top = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i] > 127) {
      on++;
      if (top < 0) top = Math.floor(i / info.width);
    }
  }
  const share = on / data.length;
  return share > 0.004 && share < 0.2 && top >= 0 && top < info.height * 0.3;
}

// The headscarf's outline in a picture (about half a cent), or null when none is found.
export async function findHeadscarf(caller: Caller, picture: Buffer) {
  const imageUrl = await uploadOpaque(picture, BACKGROUND);
  for (const prompt of ["headscarf", "hijab"]) {
    const data = await runFal(FAL_SEGMENT, { image_url: imageUrl, prompt, mask_only: true, fill_holes: true }, caller);
    const mask = await fetchBuffer(data.image!.url);
    if (await maskIsPlausible(mask)) return mask;
  }
  return null;
}

// Made once per avatar and kept.
async function headscarfMask(admin: Admin, caller: Caller, avatar: AvatarProfile, original: Buffer) {
  const where = maskLocation(admin, avatar, caller.id);
  const stored = await where.bucket.download(where.path);
  if (stored.data) return Buffer.from(await stored.data.arrayBuffer());
  const mask = await findHeadscarf(caller, original);
  // Without a mask the headscarf cannot be protected, so nothing is shown and the credit goes back.
  if (!mask) throw new StudioFailure("look_failed", 422);
  const up = await where.bucket.upload(where.path, mask, { contentType: "image/png", upsert: true });
  if (up.error) throw up.error;
  return mask;
}

// The area taken from the original: the headscarf, the face inside it, a margin around the head,
// everything above the head, grown a little and softened so the seam does not show.
export async function headArea(mask: Buffer, w: number, h: number) {
  const m = await sharp(mask).resize(w, h, { fit: "fill" }).greyscale().extractChannel(0).raw().toBuffer();
  const out = Buffer.alloc(w * h);
  const spans: ([number, number] | null)[] = [];
  for (let y = 0; y < h; y++) {
    let l = -1;
    let r = -1;
    for (let x = 0; x < w; x++) {
      if (m[y * w + x] > 127) {
        if (l < 0) l = x;
        r = x;
      }
    }
    spans.push(l >= 0 ? [l, r] : null);
    if (l >= 0) out.fill(255, y * w + l, y * w + r + 1);
  }
  const rows = spans.flatMap((s, y) => (s ? [y] : []));
  if (!rows.length) throw new StudioFailure("look_failed", 422);
  const top = rows[0];
  const bottom = rows.at(-1)!;
  const margin = Math.round(w * 0.06);
  // Down to about the chin, where there are no shoulders yet. A long drape must not set this: on h2 it
  // reached the shoulders and brought back a patch of the old top (Nov 2026). A head is about a tenth
  // of a full-body picture's height.
  const headEnd = top + Math.min(Math.round((bottom - top) * 0.55), Math.round(h * 0.1));
  for (let y = top; y <= headEnd; y++) {
    const s = spans[y];
    if (!s) continue;
    out.fill(255, y * w + Math.max(0, s[0] - margin), y * w + Math.min(w - 1, s[1] + margin) + 1);
  }
  // Nothing but background is above the head, so that whole band comes from the original: a stray piece
  // of the redrawn scarf once floated there, beside the head (h1 shirt, Nov 2026).
  out.fill(255, 0, top * w);
  // A headscarf that is open under the chin (tucked into a high collar, as on photo avatars) leaves a gap
  // there: the neck below it comes from the original too, otherwise a new round neckline bares it.
  const chin = spans[headEnd] ? headEnd : rows.find((y) => y >= headEnd);
  if (chin !== undefined) {
    let gapL = -1;
    let gapR = -1;
    let runStart = -1;
    const [l, r] = spans[chin]!;
    for (let x = l; x <= r; x++) {
      const on = m[chin * w + x] > 127;
      if (!on && runStart < 0) runStart = x;
      if (on && runStart >= 0) {
        if (x - runStart > gapR - gapL) [gapL, gapR] = [runStart, x - 1];
        runStart = -1;
      }
    }
    // A scarf wrapped under the chin (h1, h2) covers the middle just below it: then nothing is added,
    // or the old top below the drape would come back as a patch.
    const mid = Math.round((gapL + gapR) / 2);
    // (a thin sliver of mask on a collar does not count: it must cover a real height below the chin)
    let covered = 0;
    for (let y = chin; y < Math.min(h, chin + Math.round(h * 0.08)); y++) if (m[y * w + mid] > 127) covered++;
    const wrapped = covered > h * 0.03;
    if (!wrapped && gapR > gapL && gapR - gapL < w * 0.5) {
      // As wide as a high collar and down to the base of the neck, still inside the shoulders.
      const pad = Math.round(w * 0.04);
      for (let y = chin; y < Math.min(h, chin + Math.round(h * 0.095)); y++) out.fill(255, y * w + Math.max(0, gapL - pad), y * w + Math.min(w - 1, gapR + pad) + 1);
    }
  }
  const grow = Math.max(3, Math.round(w * 0.02));
  return sharp(out, { raw: { width: w, height: h, channels: 1 } }).blur(grow).threshold(16).blur(1.2).extractChannel(0).raw().toBuffer();
}

// Lays the avatar's own head and headscarf over a try-on result. Returns a PNG of the result's size.
export async function keepHeadscarf(caller: Caller, avatar: AvatarProfile, result: Buffer) {
  const admin = createAdminClient();
  const original = await avatar.source();
  const mask = await headscarfMask(admin, caller, avatar, original);
  return layHeadBack(original, mask, result);
}

// The head and headscarf of `original` (outlined by `mask`) over `result`, which shows the same person
// in the same pose and frame. Used after try-on and after the studio outfit on a hijab photo.
export async function layHeadBack(original: Buffer, mask: Buffer, result: Buffer) {
  const { width: w, height: h } = await sharp(result).metadata();
  if (!w || !h) throw new Error("unreadable try-on result");
  const [area, base, res] = await Promise.all([
    headArea(mask, w, h),
    sharp(original).flatten({ background: BACKGROUND }).resize(w, h, { fit: "fill" }).removeAlpha().raw().toBuffer(),
    sharp(result).flatten({ background: BACKGROUND }).removeAlpha().raw().toBuffer(),
  ]);
  const out = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const t = area[i] / 255;
    const j = i * 3;
    out[j] = Math.round(base[j] * t + res[j] * (1 - t));
    out[j + 1] = Math.round(base[j + 1] * t + res[j + 1] * (1 - t));
    out[j + 2] = Math.round(base[j + 2] * t + res[j + 2] * (1 - t));
  }
  return sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
}
