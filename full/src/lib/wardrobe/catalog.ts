// Shared wardrobe definitions. Safe for both browser and server.
export const CATEGORIES = [
  "jackets-coats",
  "shirts-tops",
  "pants-skirts",
  "dresses",
  "hijab-headwear",
  "shoes",
  "accessories",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export const FITS = ["slim", "regular", "oversize"] as const;
export const MATERIALS = ["cotton", "denim", "leather", "silk", "wool", "linen"] as const;

export type View = "front" | "side" | "back";

// Adult base avatars only. Teen and child avatars open once the age rules ship.
export const BASE_AVATARS = ["m1", "m2", "m3", "f1", "f2", "f3", "h1", "h2"] as const;
export type BaseAvatar = (typeof BASE_AVATARS)[number];
export const isBaseAvatar = (v: string): v is BaseAvatar => (BASE_AVATARS as readonly string[]).includes(v);

export const avatarSrc = (id: string, view: View) => `/assets/avatars/${id}-${view}.webp`;

export type WardrobeItem = {
  ref: string; // "demo:<id>" or the row uuid
  category: Category;
  name: string | null;
  image: string;
  demo: boolean;
};

const demo = (id: string, category: Category): WardrobeItem => ({
  ref: `demo:${id}`,
  category,
  name: null,
  image: `/assets/wardrobe/${id}.webp`,
  demo: true,
});

export const DEMO_ITEMS: WardrobeItem[] = [
  demo("man-blazer", "jackets-coats"),
  demo("man-shirt", "shirts-tops"),
  demo("woman-blouse", "shirts-tops"),
  demo("man-trousers", "pants-skirts"),
  demo("woman-skirt", "pants-skirts"),
  demo("man-loafers", "shoes"),
  demo("woman-heels", "shoes"),
  demo("woman-bag", "accessories"),
];

// What the try-on model can dress today, and how it names each kind.
export const FASHN_CATEGORY: Partial<Record<Category, "tops" | "bottoms" | "one-pieces">> = {
  "jackets-coats": "tops",
  "shirts-tops": "tops",
  "pants-skirts": "bottoms",
  dresses: "one-pieces",
};
export const canTryOn = (c: Category) => c in FASHN_CATEGORY;

// Dressing order: inner layers first, so the same look always shares one cache path.
const ORDER: Category[] = ["pants-skirts", "dresses", "shirts-tops", "jackets-coats"];
export const layerRank = (c: Category) => ORDER.indexOf(c);

export const WARDROBE_LIMITS: Record<string, number> = { free: 4, starter: 8, plus: 24, premium: 50 };
// A credit covers one dressed piece. The monthly total stays fixed;
// the daily limit only spreads it out.
export const DAILY_TRYONS: Record<string, number> = { free: 2, starter: 4, plus: 8, premium: 14 };
export const DAILY_UPLOADS = 10;
export const MAX_LAYERS = 6;

export type StudioError =
  | "unauthorized"
  | "invalid"
  | "plan_inactive"
  | "wardrobe_full"
  | "no_credits"
  | "busy"
  | "budget"
  | "failed"
  | "view_failed"
  | "daily_limit"
  | "city_not_found"
  | "too_few_items"
  | "shuffle_limit";

export const GARMENT_PROMPT =
  "Identify the main clothing item in this photo. Reply as JSON {\"category\": string} using exactly one of: " +
  CATEGORIES.join(", ") +
  ". jackets-coats: blazers, jackets, coats, parkas, cardigans worn open. shirts-tops: t-shirts, shirts, blouses, sweaters, hoodies. " +
  "pants-skirts: trousers, jeans, shorts, skirts. dresses: one-piece dresses and jumpsuits. hijab-headwear: hijabs, scarves, hats, caps. " +
  "shoes: all footwear. accessories: bags, belts, sunglasses, gloves.";
