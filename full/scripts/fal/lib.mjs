// Shared helpers for asset generation scripts. Server/CLI only — FAL_KEY never reaches the browser.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fal } from "@fal-ai/client";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "../..");
export const ASSETS = path.join(ROOT, "public", "assets");

// Hard spending cap for Phase 2 (USD). The script refuses any call that would cross it.
export const BUDGET_CAP_USD = 7.9; // Phase 2 + hero film + Phase 3 tests the owner asked for (Nov 2026)

// Known prices (checked on fal.ai, 2026-11-08). Estimates round up to be safe.
export const PRICES = {
  "fal-ai/flux-pro/v1.1": { perMegapixel: 0.04 },
  "fal-ai/flux-pro/kontext": { perImage: 0.04 },
  "fal-ai/flux-pro/kontext/multi": { perImage: 0.04 },
  "fal-ai/birefnet/v2": { perImage: 0.01 }, // listed as $0 — we book a conservative 1 cent
  "fal-ai/clarity-upscaler": { perMegapixel: 0.03 },
  "fal-ai/fashn/tryon/v1.6": { perImage: 0.075 },
  "fal-ai/kling-video/v2.5-turbo/pro/image-to-video": { per5s: 0.35 },
};

export function estimateCost(model, { width, height } = {}) {
  const p = PRICES[model];
  if (!p) throw new Error(`No price known for ${model}`);
  if (p.perMegapixel) return Math.ceil((width * height) / 1_000_000) * p.perMegapixel;
  if (p.perImage) return p.perImage;
  if (p.per5s) return p.per5s;
  throw new Error(`Bad price entry for ${model}`);
}

// Minimal .env.local reader (values trimmed; nothing is printed).
function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}
const env = loadEnv();
for (const k of ["FAL_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!env[k]) throw new Error(`${k} is empty in .env.local`);
}
fal.config({ credentials: env.FAL_KEY });
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Local ledger mirrors cost_log so the cap works even offline.
const LEDGER = path.join(__dirname, "ledger.json");
export function readLedger() {
  return fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, "utf8")) : [];
}
export function spentSoFar() {
  return readLedger().reduce((s, e) => s + e.cost_usd, 0);
}

async function book(model, cost, note) {
  const ledger = readLedger();
  ledger.push({ model, cost_usd: cost, note, at: new Date().toISOString() });
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
  const { error } = await supabase.from("cost_log").insert({ provider: "fal", model, cost_usd: cost });
  if (error) console.warn(`  ! cost_log insert failed (kept in local ledger): ${error.message}`);
}

// One guarded Fal call: checks the cap, runs, books the cost.
export async function falRun(model, input, { note = "", size } = {}) {
  const cost = estimateCost(model, size);
  const spent = spentSoFar();
  if (spent + cost > BUDGET_CAP_USD) {
    throw new Error(`Budget cap: spent $${spent.toFixed(3)} + $${cost} > $${BUDGET_CAP_USD}`);
  }
  const res = await fal.subscribe(model, { input, logs: false });
  await book(model, cost, note);
  console.log(`  ✓ ${note}  ($${cost.toFixed(3)}, total $${(spent + cost).toFixed(3)})`);
  return res.data;
}

export async function download(url, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Download failed ${r.status}`);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  return dest;
}

export async function uploadFile(file) {
  const buf = fs.readFileSync(file);
  const type = file.endsWith(".png") ? "image/png" : "image/jpeg";
  return fal.storage.upload(new Blob([buf], { type }));
}
