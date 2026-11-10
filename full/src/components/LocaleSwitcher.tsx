"use client";

import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";

// A full page load on purpose: switching language rebuilds the whole page, and a full load
// always brings fresh account data (chosen avatar, outfit) and re-applies the saved theme before paint.
export default function LocaleSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname() || `/${current}`;
  const rest = pathname.split("/").slice(2).join("/");

  return (
    <div className="flex items-center gap-1 text-xs tracking-widest">
      {locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-text-2">|</span>}
          <a
            href={`/${l}${rest ? `/${rest}` : ""}`}
            className={l === current ? "font-semibold" : "text-text-2"}
            aria-current={l === current ? "true" : undefined}
          >
            {l.toUpperCase()}
          </a>
        </span>
      ))}
    </div>
  );
}
