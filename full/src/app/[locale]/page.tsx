import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import Hero from "@/components/hero/Hero";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <Hero
      locale={locale}
      text={{
        brand: dict.brand,
        tagline: dict.tagline,
        scroll: dict.hero.scroll,
        cta: dict.nav.signUp,
        signIn: dict.nav.signIn,
        morning: dict.hero.morning,
        afternoon: dict.hero.afternoon,
        evening: dict.hero.evening,
      }}
    />
  );
}
