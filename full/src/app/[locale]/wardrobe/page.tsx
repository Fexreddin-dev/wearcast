import { Suspense } from "react";
import { WardrobeSkeleton } from "@/components/Skeletons";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { isUnlimitedUser } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { WARDROBE_LIMITS } from "@/lib/wardrobe/catalog";
import { ownAvatars, ownItems } from "@/lib/wardrobe/pages";
import WardrobeStudio, { type StudioData } from "@/components/wardrobe/WardrobeStudio";

// Local layout check only: lets the screen be inspected without an account. Never active in production.
const PREVIEW: StudioData = {
  owner: "preview",
  items: [],
  avatars: [],
  limit: 8,
  credits: 2,
  city: "Baku",
  worn: {},
  wornAvatar: null,
  preview: true,
  weather: {
    city: "Baku",
    morning: { temp: 11, wind: 5, rain: 10, sky: "Clouds" },
    afternoon: { temp: 15, wind: 7, rain: 20, sky: "Clear" },
    evening: { temp: 10, wind: 4, rain: 40, sky: "Rain" },
  },
};

type Start = { outfit?: string; avatar?: string };

async function Studio({ locale, previewRequested, start }: { locale: Locale; previewRequested: boolean; start: Start }) {
  const dict = getDictionary(locale);
  const supabase = await createClient();
  // Everything is asked at once: each trip to the database takes about 0.4 s, so waiting for the
  // user first and the data afterwards doubled the time. Without a session the row-level rules
  // simply return nothing, and the visitor is sent to sign in below.
  const [{ data: auth }, items, { data: sub }, { data: credits }, { data: profile }, avatars, { data: outfit }] = await Promise.all([
    supabase.auth.getUser(),
    ownItems(supabase),
    supabase.from("subscriptions").select("plan, wardrobe_extra_slots").maybeSingle(),
    supabase.rpc("my_credit_balance"),
    supabase.from("profiles").select("city").maybeSingle(),
    ownAvatars(supabase),
    start.outfit && /^[0-9a-f-]{36}$/i.test(start.outfit)
      ? supabase.from("outfits").select("refs, avatar").eq("id", start.outfit).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!auth.user) {
    if (previewRequested && process.env.NODE_ENV === "development") {
      return <WardrobeStudio locale={locale} t={dict.wardrobe} data={PREVIEW} />;
    }
    redirect(`/${locale}/login`);
  }

  return (
    <WardrobeStudio
      locale={locale}
      t={dict.wardrobe}
      data={{
        owner: auth.user.id,
        items,
        avatars,
        start: outfit ? { avatar: (outfit.avatar as string | null) ?? null, refs: outfit.refs as string[] } : start.avatar ? { avatar: start.avatar, refs: [] } : null,
        limit: isUnlimitedUser(auth.user) ? Infinity : (WARDROBE_LIMITS[sub?.plan ?? "free"] ?? 8) + (sub?.wardrobe_extra_slots ?? 0),
        credits: credits ?? 0,
        city: profile?.city || "Baku",
        worn: (auth.user.user_metadata?.worn as Record<string, string[]>) ?? {},
        wornAvatar: (auth.user.user_metadata?.wornAvatar as string) ?? null,
        preview: false,
      }}
    />
  );
}

async function Gate({ params, searchParams }: PageProps<"/[locale]/wardrobe">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  return <Studio locale={locale} previewRequested={query.preview === "1"} start={{ outfit: one(query.outfit), avatar: one(query.avatar) }} />;
}

export default function WardrobePage(props: PageProps<"/[locale]/wardrobe">) {
  return (
    <Suspense fallback={<WardrobeSkeleton />}>
      <Gate {...props} />
    </Suspense>
  );
}
