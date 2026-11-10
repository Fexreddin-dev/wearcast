import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { isUnlimitedUser } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { WARDROBE_LIMITS, type Category, type WardrobeItem } from "@/lib/wardrobe/catalog";
import WardrobeStudio, { type StudioData } from "@/components/wardrobe/WardrobeStudio";

// Local layout check only: lets the screen be inspected without an account. Never active in production.
const PREVIEW: StudioData = {
  items: [],
  limit: 8,
  credits: 2,
  city: "Baku",
  look: null,
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

async function Studio({ locale, previewRequested }: { locale: Locale; previewRequested: boolean }) {
  const dict = getDictionary(locale);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    if (previewRequested && process.env.NODE_ENV === "development") {
      return <WardrobeStudio locale={locale} t={dict.wardrobe} data={PREVIEW} />;
    }
    redirect(`/${locale}/login`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: rows }, { data: sub }, { data: credits }, { data: profile }, { data: look }] = await Promise.all([
    supabase.from("wardrobe_items").select("id, category, name, clean_path").eq("status", "done").order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("plan, wardrobe_extra_slots").maybeSingle(),
    supabase.rpc("my_credit_balance"),
    supabase.from("profiles").select("city").maybeSingle(),
    supabase.from("daily_looks").select("item_ids, note").eq("look_date", today).maybeSingle(),
  ]);

  const paths = (rows ?? []).map((r) => r.clean_path as string);
  const { data: signed } = paths.length
    ? await supabase.storage.from("wardrobe").createSignedUrls(paths, 3600)
    : { data: [] };
  const items: WardrobeItem[] = (rows ?? []).map((r, i) => ({
    ref: r.id,
    category: r.category as Category,
    name: r.name,
    image: signed?.[i]?.signedUrl ?? "",
    demo: false,
  }));

  return (
    <WardrobeStudio
      locale={locale}
      t={dict.wardrobe}
      data={{
        items,
        limit: isUnlimitedUser(auth.user) ? Infinity : (WARDROBE_LIMITS[sub?.plan ?? "free"] ?? 8) + (sub?.wardrobe_extra_slots ?? 0),
        credits: credits ?? 0,
        city: profile?.city || "Baku",
        look: look ? { itemIds: look.item_ids, note: look.note } : null,
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
  return <Studio locale={locale} previewRequested={query.preview === "1"} />;
}

export default function WardrobePage(props: PageProps<"/[locale]/wardrobe">) {
  return (
    <Suspense fallback={<div className="glass m-3 h-[calc(100svh-6rem)] animate-pulse" />}>
      <Gate {...props} />
    </Suspense>
  );
}
