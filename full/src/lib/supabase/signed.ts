import "server-only";
import type { createClient } from "./server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Signed links to private files are valid for an hour; each is reused for 45 minutes, which saves a
// round trip to storage on most page loads. Only paths the owner's own (row-level secured) query
// returned are ever signed, so a cached link is only handed back to that owner.
const TTL_S = 3600;
const REUSE_MS = 45 * 60 * 1000;
const memo = new Map<string, { url: string; at: number }>();

export async function signedUrls(supabase: Supabase, bucket: string, paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const now = Date.now();
  const missing: string[] = [];
  for (const p of new Set(paths)) {
    const hit = memo.get(`${bucket}/${p}`);
    if (hit && now - hit.at < REUSE_MS) out.set(p, hit.url);
    else missing.push(p);
  }
  if (missing.length) {
    const { data } = await supabase.storage.from(bucket).createSignedUrls(missing, TTL_S);
    for (const item of data ?? []) {
      if (!item.path || !item.signedUrl) continue;
      memo.set(`${bucket}/${item.path}`, { url: item.signedUrl, at: now });
      out.set(item.path, item.signedUrl);
    }
  }
  if (memo.size > 5000) for (const [k, v] of memo) if (now - v.at >= REUSE_MS) memo.delete(k);
  return out;
}
