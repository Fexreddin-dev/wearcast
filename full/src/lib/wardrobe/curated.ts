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
  low: number; // planned temperature range, °C
  high: number;
  refs: string[]; // every piece is dressed; inner layers first
  shoes: ShoeColour; // the colour of the sneakers on the model: matched to the outfit (scripts/fal/shoes.mjs)
  shoe: { name: Text3; image: string }; // a catalogue picture of that pair, shown with the other pieces
  image: string; // the finished look, shipped with the site (public/assets/looks), so it opens at once
  note: Text3;
  why: { weather: Text3; harmony: Text3; layers: Text3 };
};

export type ShoeColour = "white" | "black" | "brown" | "tan";
type Plan = Omit<CuratedLook, "id" | "image" | "note" | "why" | "shoe">;
const SHOE_NAMES: Record<ShoeColour, Text3> = {
  white: { en: "White sneakers", az: "Ağ idman ayaqqabısı", tr: "Beyaz spor ayakkabı" },
  black: { en: "Black sneakers", az: "Qara idman ayaqqabısı", tr: "Siyah spor ayakkabı" },
  brown: { en: "Brown sneakers", az: "Qəhvəyi idman ayaqqabısı", tr: "Kahverengi spor ayakkabı" },
  tan: { en: "Tan sneakers", az: "Bej idman ayaqqabısı", tr: "Bej spor ayakkabı" },
};
// Looks span the year, from hot to cold, so the look of the day follows the real forecast.
// Left out after checks (11 Nov 2026): a blazer over a shirt (broke the shirt), navy trousers (hem folded at the
// shoes), jeans with an open shirt; round 2: shorts (legs and shoes redrawn), grey trousers (came out shiny like leather joggers), a summer dress on f1 (hem hung loose twice), a long and a short coat and a puffer on f1 (cut to a cropped jacket; the puffer lost its collar).
const PLANS: Plan[] = [
  { avatar: "m1", n: 7, low: 21, high: 32, shoes: "white", refs: ["demo:man-chinos", "demo:man-tee"] },
  { avatar: "m1", n: 5, low: 13, high: 18, shoes: "brown", refs: ["demo:man-chinos", "demo:man-shirt"] },
  { avatar: "m1", n: 3, low: 10, high: 15, shoes: "brown", refs: ["demo:man-chinos", "demo:man-sweater"] },
  { avatar: "m1", n: 1, low: 7, high: 12, shoes: "black", refs: ["demo:man-jeans", "demo:man-sweater"] },
  { avatar: "m1", n: 10, low: -5, high: 6, shoes: "black", refs: ["demo:man-jeans", "demo:man-puffer"] },
  { avatar: "f1", n: 1, low: 6, high: 12, shoes: "white", refs: ["demo:woman-dress"] },
  { avatar: "f1", n: 7, low: 21, high: 32, shoes: "white", refs: ["demo:woman-jeans", "demo:woman-tee"] },
  { avatar: "f1", n: 5, low: 13, high: 18, shoes: "brown", refs: ["demo:woman-skirt", "demo:woman-blouse"] },
  { avatar: "f1", n: 4, low: 9, high: 19, shoes: "white", refs: ["demo:woman-jeans", "demo:woman-shirt"] },
  { avatar: "f1", n: 3, low: 10, high: 15, shoes: "tan", refs: ["demo:woman-jeans", "demo:woman-blouse"] },
  { avatar: "f1", n: 2, low: 9, high: 13, shoes: "black", refs: ["demo:woman-trousers", "demo:woman-shirt"] },
  { avatar: "f1", n: 8, low: 12, high: 17, shoes: "tan", refs: ["demo:woman-knitdress"] },
];

const texts = TEXTS as Record<string, { note: Text3; why: CuratedLook["why"] }>;

// Only looks that were dressed, checked and approved are listed in curated-texts.json.
export const CURATED: CuratedLook[] = PLANS.map((p) => ({ ...p, id: `${p.avatar}-${p.n}`, image: `/assets/looks/${p.avatar}-${p.n}.webp`, shoe: { name: SHOE_NAMES[p.shoes], image: `/assets/looks/shoes/${p.shoes}.webp` }, ...(texts[`${p.avatar}-${p.n}`] ?? { note: null!, why: null! }) }));
export const APPROVED = () => CURATED.filter((c) => c.note);

// The looks for this avatar, the best match for today's real weather first (the coldest and the warmest part
// of the day against each look's range). Before the weather is known, the looks keep their order.
export function looksFor(avatar: string, weather?: { low: number; high: number } | null) {
  const list = APPROVED().filter((c) => c.avatar === avatar);
  if (!weather) return list;
  const miss = (c: CuratedLook) => Math.abs(c.low - weather.low) + Math.abs(c.high - weather.high);
  return [...list].sort((a, b) => miss(a) - miss(b));
}

// The shipped picture for exactly these pieces on this avatar, if it is one of the approved looks.
export function curatedImage(avatar: string | null | undefined, refs: string[]) {
  const look = APPROVED().find((c) => c.avatar === avatar && c.refs.length === refs.length && c.refs.every((r) => refs.includes(r)));
  return look?.image ?? null;
}

// The approved look for exactly these pieces on this avatar (to show its shoes with the set).
export function curatedLook(avatar: string | null | undefined, refs: string[]) {
  return APPROVED().find((c) => c.avatar === avatar && c.refs.length === refs.length && c.refs.every((r) => refs.includes(r))) ?? null;
}
