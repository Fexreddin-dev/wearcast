import { Suspense } from "react";
import { OutfitsSkeleton } from "@/components/Skeletons";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CURATOR_ID, curatedImage, PROTOTYPE, PROTOTYPE_AVATARS } from "@/lib/wardrobe/curated";
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
      .select("id, name, occasion, refs, avatar, created_at, generation_id, generations(result_paths, status)")
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
  let lookPaths = (rows ?? []).map((r) => {
    const g = r.generations as unknown as { result_paths: string[]; status: string } | null;
    return g?.status === "done" ? g.result_paths[0] : null;
  });
  // Prototype: ready-made looks belong to the owner account, which row-level rules hide from visitors.
  // Only those shared results are read with the server key, by the ids the visitor saved.
  const admin = PROTOTYPE ? createAdminClient() : null;
  if (admin) {
    const ids = (rows ?? []).map((r) => r.generation_id as string | null).filter((x): x is string => !!x);
    const { data: shared } = ids.length
      ? await admin.from("generations").select("id, result_paths").in("id", ids).eq("user_id", CURATOR_ID).eq("status", "done")
      : { data: [] };
    lookPaths = (rows ?? []).map((r, i) => lookPaths[i] ?? (shared?.find((g) => g.id === r.generation_id)?.result_paths as string[] | undefined)?.[0] ?? null);
  }
  const own0 = lookPaths.filter((p): p is string => !!p && !p.startsWith(`${CURATOR_ID}/`));
  const shared0 = lookPaths.filter((p): p is string => !!p && p.startsWith(`${CURATOR_ID}/`));
  const [ownLooks, sharedLooks] = await Promise.all([
    signedUrls(supabase, "generations", own0),
    admin && shared0.length ? signedUrls(admin as unknown as typeof supabase, "generations", shared0) : new Map<string, string>(),
  ]);
  const looks = new Map([...ownLooks, ...sharedLooks]);
  const allPieces = [...own, ...DEMO_ITEMS];
  const allAvatars = [...avatars, ...baseCards()];
  const visible = (rows ?? []).map((r) => !PROTOTYPE || !r.avatar || (PROTOTYPE_AVATARS as readonly string[]).includes(r.avatar as string));

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
      look: (PROTOTYPE ? curatedImage(r.avatar as string | null, refs) : null) ?? (path ? (looks.get(path) ?? null) : null),
      avatarImage: allAvatars.find((a) => a.id === r.avatar)?.image ?? null,
      steps: found.filter((p) => canTryOn(p.category)).length,
    };
  });

  return <OutfitsBoard locale={locale} t={dict.outfits} w={dict.wardrobe} outfits={outfits.filter((_, i) => visible[i])} preview={false} />;
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
