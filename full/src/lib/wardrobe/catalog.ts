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

// Shipped avatars. Teen avatars (8-17) follow the age rules below.
export const BASE_AVATARS = ["m1", "m2", "m3", "f1", "f2", "f3", "h1", "h2", "tb1", "tb2", "tg1", "tg2"] as const;
export type BaseAvatar = (typeof BASE_AVATARS)[number];
export const isBaseAvatar = (v: string): v is BaseAvatar => (BASE_AVATARS as readonly string[]).includes(v);

export type Gender = "male" | "female";
export type AgeGroup = "adult" | "teen";
export const AGE_GROUPS = ["adult", "teen"] as const;
export const baseInfo = (id: BaseAvatar) => ({
  gender: (id.startsWith("m") || id.startsWith("tb") ? "male" : "female") as Gender,
  age: (id.startsWith("t") ? "teen" : "adult") as AgeGroup,
  modest: id.startsWith("h"),
});

// An avatar on the podium: a shipped one ("m1") or one the owner made (its uuid).
export type AvatarCard = {
  id: string;
  image: string;
  name: string | null;
  gender: Gender;
  age: AgeGroup;
  modest: boolean;
  own: boolean;
  measurements: Measurements;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);
export const isAvatarKey = (v: string) => isBaseAvatar(v) || isUuid(v);

export const avatarSrc = (id: string, view: View) => `/assets/avatars/${id}-${view}.webp`;

// ───────── Avatar studio ─────────
export const SKIN_TONES = ["porcelain", "light", "medium", "olive", "tan", "deep"] as const;
export const HAIR_STYLES = ["keep", "bald", "buzz", "short", "medium", "bob", "long", "curly", "wavy", "bun"] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];
// Hair choices that suit each body; a beard is its own choice, for adult men only.
export const hairFor = (gender: Gender): HairStyle[] =>
  gender === "male" ? ["keep", "bald", "buzz", "short", "medium", "long", "curly"] : ["keep", "short", "bob", "long", "curly", "wavy", "bun"];
export const BEARD_STYLES = ["keep", "clean", "stubble", "short", "full", "goatee", "mustache"] as const;
export type BeardStyle = (typeof BEARD_STYLES)[number];
export const hasBeardChoice = (gender: Gender, age: AgeGroup) => gender === "male" && age === "adult";
export const FACE_SHAPES = ["keep", "oval", "round", "square", "heart"] as const;
export const HIJAB_STYLES = ["keep", "classic", "turban", "shawl"] as const;

export const MEASURE_KEYS = ["height", "weight", "shoulder", "chest", "belly", "waist", "hips"] as const;
export type Measurements = Record<(typeof MEASURE_KEYS)[number], number>;
// Slider ranges in cm (weight in kg).
export const MEASURE_RANGE: Record<(typeof MEASURE_KEYS)[number], [number, number]> = {
  height: [120, 210],
  weight: [25, 160],
  shoulder: [30, 60],
  chest: [60, 150],
  belly: [55, 160],
  waist: [50, 150],
  hips: [60, 160],
};
export function defaultMeasurements(gender: Gender, age: AgeGroup): Measurements {
  if (age === "teen")
    return gender === "male"
      ? { height: 160, weight: 50, shoulder: 40, chest: 82, belly: 70, waist: 68, hips: 84 }
      : { height: 156, weight: 47, shoulder: 37, chest: 80, belly: 68, waist: 64, hips: 86 };
  return gender === "male"
    ? { height: 178, weight: 76, shoulder: 46, chest: 100, belly: 88, waist: 84, hips: 98 }
    : { height: 166, weight: 60, shoulder: 39, chest: 90, belly: 78, waist: 72, hips: 98 };
}

// ───────── Smart Fit: body size against the garment's label size and cut ─────────
// Body measurements (cm) at which each label size fits as intended.
const SIZE_CHART = {
  male: { chest: [86, 92, 100, 108, 116, 124], waist: [72, 78, 84, 92, 100, 108] },
  female: { chest: [80, 86, 92, 98, 106, 114], waist: [62, 68, 74, 80, 88, 96], hips: [88, 94, 100, 106, 112, 120] },
} as const;

// Position of a measurement on the size scale, e.g. 2.5 = between M and L.
function sizePosition(value: number, chart: readonly number[]) {
  if (value <= chart[0]) return (value - chart[0]) / (chart[1] - chart[0]);
  for (let i = 0; i < chart.length - 1; i++) {
    if (value <= chart[i + 1]) return i + (value - chart[i]) / (chart[i + 1] - chart[i]);
  }
  const last = chart.length - 1;
  return last + (value - chart[last]) / (chart[last] - chart[last - 1]);
}

export type FitResult = "tight" | "snug" | "true" | "relaxed" | "oversized";
export function smartFit(body: Measurements, gender: Gender, category: Category, size?: string | null, fit?: string | null): FitResult | null {
  const label = SIZES.indexOf((size ?? "") as (typeof SIZES)[number]);
  if (label < 0 || !FASHN_CATEGORY[category]) return null;
  const chart = SIZE_CHART[gender];
  const upper = sizePosition(body.chest, chart.chest);
  const lower = Math.max(sizePosition(body.waist, chart.waist), "hips" in chart ? sizePosition(body.hips, chart.hips) : -9);
  const bodySize = category === "pants-skirts" ? lower : category === "dresses" ? Math.max(upper, lower) : upper;
  const room = label - bodySize + (fit === "slim" ? -0.5 : fit === "oversize" ? 1.5 : 0);
  if (room < -0.75) return "tight";
  if (room < -0.25) return "snug";
  if (room <= 0.75) return "true";
  if (room <= 1.75) return "relaxed";
  return "oversized";
}

// ───────── Coverage: age and modest-dressing rules ─────────
export type Coverage = {
  sleeves: "none" | "short" | "long";
  neckline: "high" | "regular" | "low";
  length: "mini" | "knee" | "long" | "na";
  revealing: boolean;
};
export const COVERED: Coverage = { sleeves: "long", neckline: "regular", length: "long", revealing: false };

// Teen avatars never wear revealing pieces. Modest avatars get a gentle note instead of a block.
export function coverageRule(c: Coverage, age: AgeGroup, modest: boolean): "blocked" | "modest" | null {
  if (age === "teen" && (c.revealing || c.length === "mini" || c.neckline === "low")) return "blocked";
  if (modest && (c.revealing || c.sleeves !== "long" || c.neckline === "low" || c.length === "mini" || c.length === "knee")) return "modest";
  return null;
}

export const OCCASIONS = ["work", "school", "wedding", "sport", "casual", "travel"] as const;
export type Occasion = (typeof OCCASIONS)[number];

export type WardrobeItem = {
  ref: string; // "demo:<id>" or the row uuid
  category: Category;
  name: string | null;
  image: string;
  demo: boolean;
  size?: string | null;
  fit?: string | null;
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
  | "shuffle_limit"
  | "not_for_age"
  | "photo_unusable"
  | "avatar_limit"
  | "consent";

export const GARMENT_PROMPT =
  "Identify the main clothing item in this photo. Reply as JSON {\"category\": string} using exactly one of: " +
  CATEGORIES.join(", ") +
  ". jackets-coats: blazers, jackets, coats, parkas, cardigans worn open. shirts-tops: t-shirts, shirts, blouses, sweaters, hoodies. " +
  "pants-skirts: trousers, jeans, shorts, skirts. dresses: one-piece dresses and jumpsuits. hijab-headwear: hijabs, scarves, hats, caps. " +
  "shoes: all footwear. accessories: bags, belts, sunglasses, gloves.";

export const baseCards = (): AvatarCard[] =>
  BASE_AVATARS.map((id) => {
    const info = baseInfo(id);
    return { id, image: avatarSrc(id, "front"), name: null, ...info, own: false, measurements: defaultMeasurements(info.gender, info.age) };
  });

// ───────── Adjusting a shipped avatar: the picture edit, or null when nothing visible changes ─────────
// Tested on f1 (Nov 2026): a bare word like "olive" made the skin far darker than meant; describing the
// tone and saying what must stay (face, body) kept the edit close to the request.
const TONE: Record<string, string> = {
  porcelain: "a very fair, porcelain skin tone",
  light: "a light skin tone",
  medium: "a medium, light-brown skin tone",
  olive: "a light olive, Mediterranean skin tone",
  tan: "a warm tan, golden-brown skin tone",
  deep: "a deep brown skin tone",
};
export type CustomChoice = { skin?: string; hair?: string; beard?: string; face?: string; hijab?: string };
const HAIR_TEXT: Partial<Record<HairStyle, string>> = {
  bald: "Make the head completely bald and smoothly shaved.",
  buzz: "Give the person a very short buzz cut.",
  short: "Give the person short, neat hair.",
  medium: "Give the person medium-length hair reaching the ears.",
  bob: "Give the person a chin-length bob haircut.",
  long: "Give the person long hair falling past the shoulders.",
  curly: "Change the hair into natural loose curls.",
  wavy: "Give the person long, soft wavy hair.",
  bun: "Style the person's hair in a neat bun.",
};
const BEARD_TEXT: Partial<Record<BeardStyle, string>> = {
  clean: "Make the face clean-shaven, with no beard or moustache.",
  stubble: "Give the person light stubble.",
  short: "Give the person a short, well-groomed beard.",
  full: "Give the person a full, well-groomed beard.",
  goatee: "Give the person a neat goatee and no other facial hair.",
  mustache: "Give the person a neat moustache and no beard.",
};

export function customPrompt(base: BaseAvatar, choice: CustomChoice, m: Measurements) {
  const info = baseInfo(base);
  const changes: string[] = [];
  if (choice.skin && TONE[choice.skin]) changes.push(`Skin: ${TONE[choice.skin]}, the same on the face, neck, arms and hands.`);
  if (!info.modest) {
    const hair = choice.hair as HairStyle;
    if (hairFor(info.gender).includes(hair) && HAIR_TEXT[hair]) changes.push(HAIR_TEXT[hair]!);
    const beard = choice.beard as BeardStyle;
    if (hasBeardChoice(info.gender, info.age) && BEARD_TEXT[beard]) changes.push(BEARD_TEXT[beard]!);
  } else {
    if (choice.hijab === "classic") changes.push("Restyle the headscarf as a classic wrapped hijab that fully covers the hair, ears and neck.");
    if (choice.hijab === "turban") changes.push("Restyle the headscarf as a neat turban-style hijab wrap, with the neck still fully covered by the high collar.");
    if (choice.hijab === "shawl") changes.push("Restyle the headscarf as a long, loosely draped shawl hijab covering the hair, neck and upper chest.");
  }
  if (choice.face && choice.face !== "keep") changes.push(`Make the face shape slightly more ${choice.face}.`);

  const d = defaultMeasurements(info.gender, info.age);
  const bmi = m.weight / (m.height / 100) ** 2;
  if (bmi < 18.5) changes.push("Make the body build noticeably slimmer.");
  else if (bmi >= 30) changes.push("Make the body build plus-size, with a fuller stomach, arms and legs.");
  else if (bmi >= 26) changes.push("Make the body build somewhat fuller, with a softer stomach.");
  if (m.shoulder >= d.shoulder + 4) changes.push("Make the shoulders broader.");
  if (info.gender === "female" && m.hips - m.waist >= 32) changes.push("Give the figure curvier hips.");
  if (m.belly >= m.chest + 4) changes.push("Make the belly rounder.");
  if (!changes.length) return null;

  const outfit = info.modest
    ? "the same cream sweater, beige trousers and white sneakers"
    : info.age === "teen"
      ? "the same white t-shirt, blue jeans and white sneakers"
      : "the same white t-shirt, grey trousers and white sneakers";
  const bodyNamed = changes.some((c) => /body|shoulders|hips|belly/.test(c));
  return (
    "Edit only what is named here. " +
    changes.join(" ") +
    " Keep the person's identity: the same face, eyes, nose, lips and expression." +
    (bodyNamed ? "" : " Keep the same body shape, weight and height.") +
    ` Keep the same standing pose, ${outfit}, the same plain light background and soft studio lighting. ` +
    "Full body from the top of the head to the shoes, nothing cropped. Photorealistic."
  );
}

// ───────── Daily Curated Look ─────────
export type Audience = "men" | "women" | "hijab" | "teen_boys" | "teen_girls";
export const audienceOf = (a: { gender: Gender; age: AgeGroup; modest: boolean }): Audience =>
  a.modest ? "hijab" : a.age === "teen" ? (a.gender === "male" ? "teen_boys" : "teen_girls") : a.gender === "male" ? "men" : "women";
export type LookSource = "wardrobe" | "trend";
export type Text3 = { en: string; az: string; tr: string };
export type TrendPiece = { category: Category; color: string; name: Text3; ref: string | null };
export type LookEntry = {
  id: string;
  source: LookSource;
  refs: string[];
  pieces: TrendPiece[];
  note: Text3;
  why: { weather: Text3; harmony: Text3; layers: Text3 };
  createdAt: string;
  city: string | null;
};
// "Show me another look" per day; a new look because the weather changed is never counted.
export const DAILY_LOOK_CHANGES: Record<string, number> = { free: 3, starter: 5, plus: 8, premium: 12 };
// What the sample pieces are, for the stylist.
export const SAMPLE_NOTES: Record<string, string> = {
  "demo:man-blazer": "camel wool single-breasted blazer, men",
  "demo:man-shirt": "light blue cotton oxford button-down shirt, long sleeves, men",
  "demo:woman-blouse": "ivory silk blouse, long sleeves, women",
  "demo:man-trousers": "navy wool pleated trousers, full length, men",
  "demo:woman-skirt": "camel pleated midi skirt, women",
  "demo:man-loafers": "brown leather loafers, men",
  "demo:woman-heels": "nude leather heels, women",
  "demo:woman-bag": "tan leather handbag, women",
};
