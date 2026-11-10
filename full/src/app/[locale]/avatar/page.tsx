import { Suspense } from "react";
import { AvatarSkeleton } from "@/components/Skeletons";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { isUnlimitedUser } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { ownAvatars } from "@/lib/wardrobe/pages";
import AvatarStudio from "@/components/avatar/AvatarStudio";

async function Studio({ locale, previewRequested }: { locale: Locale; previewRequested: boolean }) {
  const dict = getDictionary(locale);
  const supabase = await createClient();
  // Asked together: each trip to the database takes about 0.4 s.
  const [{ data: auth }, avatars, { data: credits }] = await Promise.all([
    supabase.auth.getUser(),
    ownAvatars(supabase),
    supabase.rpc("my_credit_balance"),
  ]);
  if (!auth.user) {
    // Local layout check only, never active in production.
    if (previewRequested && process.env.NODE_ENV === "development") {
      return <AvatarStudio locale={locale} t={dict.avatar} w={dict.wardrobe} avatars={[]} credits={2} preview />;
    }
    redirect(`/${locale}/login`);
  }
  return (
    <AvatarStudio
      locale={locale}
      t={dict.avatar}
      w={dict.wardrobe}
      avatars={avatars}
      credits={isUnlimitedUser(auth.user) ? Infinity : (credits ?? 0)}
      preview={false}
    />
  );
}

async function Gate({ params, searchParams }: PageProps<"/[locale]/avatar">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  return <Studio locale={locale} previewRequested={query.preview === "1"} />;
}

export default function AvatarPage(props: PageProps<"/[locale]/avatar">) {
  return (
    <Suspense fallback={<AvatarSkeleton />}>
      <Gate {...props} />
    </Suspense>
  );
}
