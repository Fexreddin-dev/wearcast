// Investor prototype (11 Nov 2026): the Daily Curated Looks are made ahead of time, checked by eye and
// by the look check, and dressed once by the owner account. Every visitor then sees them from that shared
// cache, so showing, changing and re-wearing a look costs nothing and can never show a broken picture.
// Later, many looks per day will be added the same way (see PROGRESS.md).
import type { Text3 } from "./catalog";
import TEXTS from "./curated-texts.json";

export const PROTOTYPE = process.env.NEXT_PUBLIC_PROTOTYPE !== "false";

// The owner account (ADMIN_EMAIL) that dressed the looks; its finished results are shared.
export const CURATOR_ID = "d845250d-3d23-481e-9a0a-b3c2d2e21aa9";
// The two avatars of the prototype.
export const PROTOTYPE_AVATARS = ["m1", "f1"] as const;

export type CuratedLook = {
  id: string; // "m1-1"
  avatar: (typeof PROTOTYPE_AVATARS)[number];
  n: number;
  date: string; // the day (Baku forecast) this look was planned for
  low: number; // planned temperature range, °C
  high: number;
  refs: string[]; // every piece is dressed; inner layers first
  image: string; // the finished look, shipped with the site (public/assets/looks), so it opens at once
  note: Text3;
  why: { weather: Text3; harmony: Text3; layers: Text3 };
};

type Plan = Omit<CuratedLook, "id" | "image" | "note" | "why">;
// Jackets are left out: a blazer over a shirt broke the shirt every time on m1 (10 and 11 Nov 2026).
// Knitwear goes to the coldest days and shirts to the mildest (Baku forecast, 11 Nov 2026).
const PLANS: Plan[] = [
  { avatar: "m1", n: 1, date: "2026-11-11", low: 7, high: 12, refs: ["demo:man-jeans", "demo:man-sweater"] },
  { avatar: "m1", n: 2, date: "2026-11-12", low: 9, high: 13, refs: ["demo:man-trousers", "demo:man-sweater"] },
  { avatar: "m1", n: 3, date: "2026-11-13", low: 10, high: 15, refs: ["demo:man-chinos", "demo:man-sweater"] },
  { avatar: "m1", n: 4, date: "2026-11-14", low: 9, high: 19, refs: ["demo:man-trousers", "demo:man-shirt"] },
  { avatar: "m1", n: 5, date: "2026-11-15", low: 13, high: 18, refs: ["demo:man-chinos", "demo:man-shirt"] },
  { avatar: "f1", n: 1, date: "2026-11-11", low: 7, high: 12, refs: ["demo:woman-dress"] },
  { avatar: "f1", n: 2, date: "2026-11-12", low: 9, high: 13, refs: ["demo:woman-trousers", "demo:woman-shirt"] },
  { avatar: "f1", n: 3, date: "2026-11-13", low: 10, high: 15, refs: ["demo:woman-jeans", "demo:woman-blouse"] },
  { avatar: "f1", n: 4, date: "2026-11-14", low: 9, high: 19, refs: ["demo:woman-jeans", "demo:woman-shirt"] },
  { avatar: "f1", n: 5, date: "2026-11-15", low: 13, high: 18, refs: ["demo:woman-skirt", "demo:woman-blouse"] },
];

const texts = TEXTS as Record<string, { note: Text3; why: CuratedLook["why"] }>;

// Only looks that were dressed, checked and approved are listed in curated-texts.json.
export const CURATED: CuratedLook[] = PLANS.map((p) => ({ ...p, id: `${p.avatar}-${p.n}`, image: `/assets/looks/${p.avatar}-${p.n}.webp`, ...(texts[`${p.avatar}-${p.n}`] ?? { note: null!, why: null! }) }));
export const APPROVED = () => CURATED.filter((c) => c.note);

// The look for this avatar: today's planned look first, then the others in order. After the planned
// days the looks keep turning, one step per day.
export function looksFor(avatar: string, today = new Date()) {
  const list = APPROVED().filter((c) => c.avatar === avatar);
  if (!list.length) return [];
  const baku = new Date(today.getTime() + 4 * 3_600_000); // Baku is UTC+4 all year
  const day = baku.toISOString().slice(0, 10);
  let start = list.findIndex((c) => c.date === day);
  if (start < 0) start = Math.floor(baku.getTime() / 86_400_000) % list.length;
  return [...list.slice(start), ...list.slice(0, start)];
}

// The shipped picture for exactly these pieces on this avatar, if it is one of the approved looks.
export function curatedImage(avatar: string | null | undefined, refs: string[]) {
  const look = APPROVED().find((c) => c.avatar === avatar && c.refs.length === refs.length && c.refs.every((r) => refs.includes(r)));
  return look?.image ?? null;
}
