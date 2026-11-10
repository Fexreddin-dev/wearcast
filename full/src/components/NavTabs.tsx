"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";

const TABS = ["wardrobe", "avatar", "outfits"] as const;

// The three studio sections: centred in the header on wide screens, a second header row below 1024 px.
export default function NavTabs({ locale, labels, menu }: { locale: Locale; labels: Record<(typeof TABS)[number], string>; menu: string }) {
  const path = usePathname();
  const items = TABS.map((tab) => {
    const href = `/${locale}/${tab}`;
    return { tab, href, active: path === href || path.startsWith(`${href}/`) };
  });

  return (
    <>
      <nav className="hidden gap-8 text-xs font-medium tracking-[0.2em] lg:flex" aria-label={menu}>
        {items.map((i) => (
          <Link key={i.tab} href={i.href} aria-current={i.active ? "page" : undefined} className={`wc-tab ${i.active ? "is-active" : "text-text-2"}`}>
            {labels[i.tab]}
          </Link>
        ))}
      </nav>
      {/* Narrower screens: a second row inside the header, only on the studio pages (the hero keeps its header height). */}
      {items.some((i) => i.active) && (
        <nav className="wc-tabs-row" aria-label={menu}>
          {items.map((i) => (
            <Link key={i.tab} href={i.href} aria-current={i.active ? "page" : undefined} className={i.active ? "is-active" : ""}>
              {labels[i.tab]}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
