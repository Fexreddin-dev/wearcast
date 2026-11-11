// Investor prototype (11 Nov 2026): dress the curated looks on m1 and f1 ahead of time, as the owner, so
// every visitor gets them from the shared cache at no cost. Each step goes through runTryOn: the usual
// check (three answers) and a second attempt. Stops before total Fal spending passes the owner's limit.
// Run (from full/):
//   JITI_ALIAS='{"@/":"<full>/src/","server-only":"<full>/node_modules/server-only/empty.js"}' \
//   node --env-file=.env.local --use-system-ca node_modules/jiti/lib/jiti-cli.mjs scripts/fal/proto-looks.mts [m1-1,f1-2 ...]
import fs from "node:fs";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { runTryOn } from "@/lib/wardrobe/tryon";
import { CURATED, CURATOR_ID } from "@/lib/wardrobe/curated";

const LIMIT_USD = 20.60; // was 20.455; one more coat step from the extra $0.94 the owner allowed if all looks are clean // cost_log before round 2 (18.455) + the $2.00 the owner allowed on 11 Nov 2026 (balance $2.94)
const OUT = process.env.PROTO_OUT ?? "proto-out";
fs.mkdirSync(OUT, { recursive: true });
const admin = createAdminClient();

async function spent() {
  const { data, error } = await admin.from("cost_log").select("cost_usd");
  if (error) throw error;
  return (data ?? []).reduce((s, r) => s + Number(r.cost_usd), 0);
}

const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
for (const look of CURATED) {
  const id = `${look.avatar}-${look.n}`;
  if (only.length && !only.includes(id)) continue;
  const before = await spent();
  // Worst case for one look: three steps, two attempts each, plus one jacket picture.
  // STEPS: how many pieces are not dressed yet (the rest come from the cache), when it is known.
  const steps = Number(process.env.STEPS ?? look.refs.length);
  if (before + steps * 0.15 + (process.env.STEPS ? 0 : 0.08) > LIMIT_USD) {
    console.log(`STOP before ${id}: spent $${before.toFixed(3)}, limit $${LIMIT_USD}`);
    break;
  }
  const t0 = Date.now();
  try {
    const res = await runTryOn({ id: CURATOR_ID, unlimited: true }, look.avatar, look.refs);
    const buf = Buffer.from(await (await fetch(res.image!)).arrayBuffer());
    fs.writeFileSync(path.join(OUT, `${id}.webp`), buf);
    console.log(`OK ${id} cached=${res.cached} ${Math.round((Date.now() - t0) / 1000)}s spent $${(await spent()).toFixed(3)}`);
  } catch (e) {
    console.log(`FAIL ${id}: ${e instanceof Error ? e.message : e} spent $${(await spent()).toFixed(3)}`);
  }
}
