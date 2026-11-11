"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { PROTOTYPE } from "@/lib/wardrobe/curated";

const ALL_TABS = ["wardrobe", "avatar", "outfits"] as const;
// Prototype: the avatar studio (new avatars cost money) is not offered yet.
const TABS = PROTOTYPE ? ALL_TABS.filter((t) => t !== "avatar") : ALL_TABS;

// The three studio sections: centred in the header on wide screens, a second header row below 1024 px.
export default function NavTabs({ locale, labels, menu }: { locale: Locale; labels: Record<(typeof ALL_TABS)[number], string>; menu: string }) {
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
