import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { baseCards, canTryOn, type Category, DEMO_ITEMS, type Occasion, type WardrobeItem } from "@/lib/wardrobe/catalog";
import { ownAvatars } from "@/lib/wardrobe/pages";
import OutfitsBoard, { type SavedOutfit } from "@/components/outfits/OutfitsBoard";

async function Board({ locale, previewRequested }: { locale: Locale; previewRequested: boolean }) {
  const dict = getDictionary(locale);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    if (previewRequested && process.env.NODE_ENV === "development") {
      return <OutfitsBoard locale={locale} t={dict.outfits} w={dict.wardrobe} outfits={[]} preview />;
    }
    redirect(`/${locale}/login`);
  }

  const [{ data: rows }, { data: items }, avatars] = await Promise.all([
    supabase
      .from("outfits")
      .select("id, name, occasion, refs, avatar, created_at, generations(result_paths, status)")
      .order("created_at", { ascending: false }),
    supabase.from("wardrobe_items").select("id, category, name, clean_path").eq("status", "done"),
    ownAvatars(supabase),
  ]);

  // Short-lived links: finished looks and own pieces.
  const lookPaths = (rows ?? []).map((r) => {
    const g = r.generations as unknown as { result_paths: string[]; status: string } | null;
    return g?.status === "done" ? g.result_paths[0] : null;
  });
  const wanted = lookPaths.filter((p): p is string => !!p);
  const [{ data: looks }, { data: pieces }] = await Promise.all([
    wanted.length ? supabase.storage.from("generations").createSignedUrls(wanted, 3600) : Promise.resolve({ data: [] }),
    items?.length ? supabase.storage.from("wardrobe").createSignedUrls(items.map((i) => i.clean_path as string), 3600) : Promise.resolve({ data: [] }),
  ]);
  const own: WardrobeItem[] = (items ?? []).map((r, i) => ({
    ref: r.id,
    category: r.category as Category,
    name: r.name,
    image: pieces?.[i]?.signedUrl ?? "",
    demo: false,
  }));
  const allPieces = [...own, ...DEMO_ITEMS];
  const allAvatars = [...avatars, ...baseCards()];

  const outfits: SavedOutfit[] = (rows ?? []).map((r, i) => {
    const refs = r.refs as string[];
    const found = refs.flatMap((ref) => allPieces.filter((p) => p.ref === ref));
    const path = lookPaths[i];
    return {
      id: r.id,
      name: r.name,
      occasion: r.occasion as Occasion | null,
      createdAt: r.created_at,
      pieces: found.map((p) => ({ image: p.image, label: p.name ?? dict.wardrobe.cat[p.category] })),
      missing: found.length < refs.length,
      look: path ? (looks?.find((l) => l.path === path)?.signedUrl ?? null) : null,
      avatarImage: allAvatars.find((a) => a.id === r.avatar)?.image ?? null,
      steps: found.filter((p) => canTryOn(p.category)).length,
    };
  });

  return <OutfitsBoard locale={locale} t={dict.outfits} w={dict.wardrobe} outfits={outfits} preview={false} />;
}

async function Gate({ params, searchParams }: PageProps<"/[locale]/outfits">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  return <Board locale={locale} previewRequested={query.preview === "1"} />;
}

export default function OutfitsPage(props: PageProps<"/[locale]/outfits">) {
  return (
    <Suspense fallback={<div className="glass m-3 h-[calc(100svh-6rem)] animate-pulse" />}>
      <Gate {...props} />
    </Suspense>
  );
}
