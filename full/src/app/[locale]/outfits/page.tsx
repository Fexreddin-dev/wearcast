import { Suspense } from "react";
import { OutfitsSkeleton } from "@/components/Skeletons";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/supabase/signed";
import { baseCards, canTryOn, DEMO_ITEMS, type Occasion } from "@/lib/wardrobe/catalog";
import { ownAvatars, ownItems } from "@/lib/wardrobe/pages";
import OutfitsBoard, { type SavedOutfit } from "@/components/outfits/OutfitsBoard";

async function Board({ locale, previewRequested }: { locale: Locale; previewRequested: boolean }) {
  const dict = getDictionary(locale);
  const supabase = await createClient();
  // Asked together: each trip to the database takes about 0.4 s.
  const [{ data: auth }, { data: rows }, own, avatars] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("outfits")
      .select("id, name, occasion, refs, avatar, created_at, generations(result_paths, status)")
      .order("created_at", { ascending: false }),
    ownItems(supabase),
    ownAvatars(supabase),
  ]);
  if (!auth.user) {
    if (previewRequested && process.env.NODE_ENV === "development") {
      return <OutfitsBoard locale={locale} t={dict.outfits} w={dict.wardrobe} outfits={[]} preview />;
    }
    redirect(`/${locale}/login`);
  }

  // Short-lived links: finished looks and own pieces.
  const lookPaths = (rows ?? []).map((r) => {
    const g = r.generations as unknown as { result_paths: string[]; status: string } | null;
    return g?.status === "done" ? g.result_paths[0] : null;
  });
  const looks = await signedUrls(supabase, "generations", lookPaths.filter((p): p is string => !!p));
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
      look: path ? (looks.get(path) ?? null) : null,
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
    <Suspense fallback={<OutfitsSkeleton />}>
      <Gate {...props} />
    </Suspense>
  );
}
