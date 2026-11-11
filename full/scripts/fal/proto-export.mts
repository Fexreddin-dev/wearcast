// Investor prototype (11 Nov 2026): copies the finished, checked curated looks from storage into
// public/assets/looks/<id>.webp, so the site shows them as plain files (instant, no database). Free.
// Run like proto-looks.mts.
import fs from "node:fs";
import path from "node:path";
import { runTryOn } from "@/lib/wardrobe/tryon";
import { CURATED, CURATOR_ID } from "@/lib/wardrobe/curated";

const OUT = path.join(process.cwd(), "public", "assets", "looks");
fs.mkdirSync(OUT, { recursive: true });
for (const look of CURATED) {
  const res = await runTryOn({ id: CURATOR_ID, unlimited: true }, look.avatar, look.refs, true);
  if (!res.image) {
    console.log(`MISSING ${look.id}`);
    continue;
  }
  const buf = Buffer.from(await (await fetch(res.image)).arrayBuffer());
  fs.writeFileSync(path.join(OUT, `${look.id}.webp`), buf);
  console.log(`saved ${look.id} ${Math.round(buf.length / 1024)} KB`);
}
