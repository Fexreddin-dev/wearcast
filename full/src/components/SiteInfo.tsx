import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support.wearcast@gmail.com";

// The public page after the hero: what WearCast does, who we are, and how to reach us.
export default function SiteInfo({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const s = dict.site;
  const features = [
    { title: s.f1t, body: s.f1, n: "01" },
    { title: s.f2t, body: s.f2, n: "02" },
    { title: s.f3t, body: s.f3, n: "03" },
  ];
  return (
    <div className="site-info relative z-10 mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-10 pt-16 sm:px-6">
      <section aria-labelledby="features" className="flex flex-col gap-5">
        <h2 id="features" className="text-center font-serif text-3xl sm:text-4xl">{s.featuresTitle}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <article key={f.n} className="glass flex flex-col gap-2 p-6">
              <span className="text-[0.68rem] tracking-[0.2em] text-accent">{f.n}</span>
              <h3 className="font-serif text-xl">{f.title}</h3>
              <p className="text-sm leading-relaxed text-text-2">{f.body}</p>
            </article>
          ))}
        </div>
        <div className="flex justify-center">
          <Link href={`/${locale}/signup`} className="btn btn-primary">{dict.nav.signUp}</Link>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section id="about" aria-labelledby="about-title" className="glass flex flex-col gap-3 p-6 sm:p-8">
          <h2 id="about-title" className="font-serif text-2xl">{s.aboutTitle}</h2>
          <p className="text-sm leading-relaxed text-text-2">{s.about}</p>
        </section>
        <section id="support" aria-labelledby="support-title" className="glass flex flex-col gap-3 p-6 sm:p-8">
          <h2 id="support-title" className="font-serif text-2xl">{s.supportTitle}</h2>
          <p className="text-sm leading-relaxed text-text-2">{s.support}</p>
          <a href={`mailto:${SUPPORT}`} className="w-fit break-all text-sm font-medium text-accent underline underline-offset-4">{SUPPORT}</a>
        </section>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--glass-border)] pt-5 text-[0.7rem] text-text-2">
        <span className="font-serif text-base text-text">{dict.brand}</span>
        <span>© 2026 {dict.brand}. {s.rights}</span>
      </footer>
    </div>
  );
}
