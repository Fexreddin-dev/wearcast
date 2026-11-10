"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";

const TABS = ["wardrobe", "avatar", "outfits"] as const;

// The three studio sections: centred in the header on wide screens, a glass bar at the bottom on phones.
export default function NavTabs({ locale, labels, menu }: { locale: Locale; labels: Record<(typeof TABS)[number], string>; menu: string }) {
  const path = usePathname();
  const items = TABS.map((tab) => {
    const href = `/${locale}/${tab}`;
    return { tab, href, active: path === href || path.startsWith(`${href}/`) };
  });

  return (
    <>
      <nav className="hidden gap-8 text-xs font-medium tracking-[0.2em] md:flex" aria-label={menu}>
        {items.map((i) => (
          <Link key={i.tab} href={i.href} aria-current={i.active ? "page" : undefined} className={`wc-tab ${i.active ? "is-active" : "text-text-2"}`}>
            {labels[i.tab]}
          </Link>
        ))}
      </nav>
      <nav className="wc-mobile-nav glass md:hidden" aria-label={menu}>
        {items.map((i) => (
          <Link key={i.tab} href={i.href} aria-current={i.active ? "page" : undefined} className={i.active ? "is-active" : ""}>
            {labels[i.tab]}
          </Link>
        ))}
      </nav>
    </>
  );
}
