import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "./ThemeToggle";
import LocaleSwitcher from "./LocaleSwitcher";
import NavTabs from "./NavTabs";
import { signOut } from "@/app/actions/auth";
import { isUnlimitedUser } from "@/lib/admin";

export default async function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const credits = user ? (await supabase.rpc("my_credit_balance")).data : null;
  const unlimited = isUnlimitedUser(user);

  return (
    <header className="glass sticky top-3 z-50 mx-3 mt-3 flex min-h-16 flex-wrap items-center justify-between gap-x-2 px-3 sm:gap-x-3 sm:px-4 md:px-5 lg:h-16 lg:flex-nowrap">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}`} className="font-serif text-xl tracking-wide md:text-2xl">
          {dict.brand}
        </Link>
        {user && (
          <Link href={`/${locale}`} className="hidden whitespace-nowrap text-xs uppercase tracking-widest text-text-2 sm:inline">
            {dict.nav.home}
          </Link>
        )}
      </div>

      {user && (
        <NavTabs locale={locale} menu={dict.nav.menu} labels={{ wardrobe: dict.nav.wardrobe, avatar: dict.nav.avatar, outfits: dict.nav.outfits }} />
      )}

      <div className="flex items-center gap-2 sm:gap-3">
        {user && (
          <span className="hidden whitespace-nowrap text-xs tracking-wide text-text-2 sm:inline">
            {dict.wardrobe.credits}: <strong className="font-medium text-text">{unlimited ? "∞" : (credits ?? 0)}</strong>
          </span>
        )}
        {unlimited && (
          <Link href={`/${locale}/admin`} className="hidden text-xs uppercase tracking-widest text-accent sm:inline">{dict.admin.title}</Link>
        )}
        <LocaleSwitcher current={locale} />
        <ThemeToggle toLight={dict.theme.toLight} toDark={dict.theme.toDark} />
        {user ? (
          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            <button className="btn btn-ghost" type="submit">{dict.nav.signOut}</button>
          </form>
        ) : (
          <Link href={`/${locale}/login`} className="btn btn-ghost whitespace-nowrap max-sm:!px-3">{dict.nav.signIn}</Link>
        )}
      </div>
    </header>
  );
}
