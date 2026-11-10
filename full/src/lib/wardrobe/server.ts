import "server-only";
import { fal } from "@fal-ai/client";
import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import sharp from "sharp";
import { isUnlimitedUser } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StudioError } from "./catalog";

export const FAL_TRYON = "fal-ai/fashn/tryon/v1.6";
export const FAL_CUTOUT = "fal-ai/birefnet/v2";
export const FAL_EDIT = "fal-ai/flux-pro/kontext";
const COST: Record<string, number> = { [FAL_TRYON]: 0.075, [FAL_CUTOUT]: 0.01, [FAL_EDIT]: 0.04 };

export class StudioFailure extends Error {
  constructor(public code: StudioError, public status = 400) {
    super(code);
  }
}

export function fail(e: unknown) {
  if (e instanceof StudioFailure) return Response.json({ error: e.code }, { status: e.status });
  console.error("[wardrobe]", e instanceof Error ? e.message : "unknown error");
  return Response.json({ error: "failed" satisfies StudioError }, { status: 500 });
}

export type Caller = { id: string; unlimited: boolean };

export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new StudioFailure("unauthorized", 401);
  return { user: data.user, supabase, caller: { id: data.user.id, unlimited: isUnlimitedUser(data.user) } as Caller };
}

export async function assertPlanActive(userId: string) {
  const { data, error } = await createAdminClient().rpc("plan_is_active", { p_user: userId });
  if (error) throw error;
  if (!data) throw new StudioFailure("plan_inactive", 403);
}

export async function planOf(userId: string) {
  const { data } = await createAdminClient().from("subscriptions").select("plan").eq("user_id", userId).maybeSingle();
  return (data?.plan as string) ?? "free";
}

export const startOfToday = () => `${new Date().toISOString().slice(0, 10)}T00:00:00Z`;

// Every paid call in the app passes here. Unlimited accounts skip the cap; all spending is logged.
export async function runFal(model: string, input: Record<string, unknown>, caller: Caller) {
  const admin = createAdminClient();
  const cost = COST[model];
  if (!caller.unlimited) {
    const [{ data: cap }, { data: rows, error }] = await Promise.all([
      admin.from("app_settings").select("value").eq("key", "fal_budget_cap_usd").maybeSingle(),
      admin.from("cost_log").select("cost_usd").eq("provider", "fal"),
    ]);
    if (error) throw error;
    const spent = (rows ?? []).reduce((s, r) => s + Number(r.cost_usd), 0);
    if (cap?.value == null || spent + cost > Number(cap.value)) throw new StudioFailure("budget", 503);
  }

  fal.config({ credentials: process.env.FAL_KEY });
  const res = await fal.subscribe(model, { input, logs: false });
  await admin.from("cost_log").insert({ provider: "fal", model, cost_usd: cost, user_id: caller.id });
  return res.data as { images?: { url: string }[]; image?: { url: string } };
}

export async function fetchBuffer(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`download ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

// The try-on model expects a normal photo, so transparent assets get a plain background.
// Sized to what the model actually uses, which keeps the upload quick.
export async function uploadOpaque(input: Buffer, background = "#F4F3EF") {
  const jpeg = await sharp(input)
    .flatten({ background })
    .resize(1024, 1536, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 93 })
    .toBuffer();
  fal.config({ credentials: process.env.FAL_KEY });
  return fal.storage.upload(new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }));
}

// Shipped avatars and sample garments never change, so each is uploaded once per hour at most.
const uploaded = new Map<string, { at: number; url: string }>();
export async function uploadStatic(key: string, load: () => Promise<Buffer>, background?: string) {
  const hit = uploaded.get(key);
  if (hit && Date.now() - hit.at < 3_600_000) return hit.url;
  const url = await uploadOpaque(await load(), background);
  uploaded.set(key, { at: Date.now(), url });
  return url;
}

export async function cutout(imageUrl: string, caller: Caller) {
  const data = await runFal(
    FAL_CUTOUT,
    { image_url: imageUrl, model: "General Use (Light)", operating_resolution: "1024x1024", refine_foreground: true, output_format: "png" },
    caller,
  );
  const raw = await fetchBuffer(data.image!.url);
  return sharp(raw)
    .trim({ threshold: 1 })
    .extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

// These models are often briefly overloaded, so a busy one hands over to the next.
const GEMINI_MODELS = ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-3-flash-preview"];

export async function askGemini(parts: (string | Part)[], timeout = 15_000) {
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
  const models = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL, ...GEMINI_MODELS] : GEMINI_MODELS;
  let last: unknown;
  for (const name of models) {
    try {
      const model = client.getGenerativeModel({ model: name, generationConfig: { responseMimeType: "application/json" } }, { timeout });
      const result = await model.generateContent(parts);
      return JSON.parse(result.response.text()) as unknown;
    } catch (e) {
      last = e;
    }
  }
  throw last;
}
