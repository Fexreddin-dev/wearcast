/* eslint-disable @next/next/no-img-element -- transparent product pictures */
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Waitlist, WeatherDemo } from "./site/SiteParts";

const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support.wearcast@gmail.com";

// One look (f1-2: black trousers and a white shirt, planned for 9–13°C) tells the whole story in three steps;
// the weather demo below uses other looks, so nothing is shown twice.
function StepArt({ n }: { n: 1 | 2 | 3 }) {
  if (n === 1)
    return (
      <div className="site-step-art site-weather" aria-hidden>
        <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <circle cx="9" cy="8.5" r="3" />
          <path d="M7 18h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.4A2.8 2.8 0 0 0 7 18z" />
        </svg>
        <span className="font-serif text-3xl">9° – 13°</span>
        <span className="text-[0.62rem] tracking-[0.18em] text-text-2">BAKU</span>
      </div>
    );
  if (n === 2)
    return (
      <div className="site-step-art site-set" aria-hidden>
        <img src="/assets/wardrobe/woman-shirt.webp" alt="" />
        <img src="/assets/wardrobe/woman-trousers.webp" alt="" />
      </div>
    );
  return (
    <div className="site-step-art site-model" aria-hidden>
      <img src="/assets/looks/f1-2.webp" alt="" />
    </div>
  );
}

// The public page after the hero: how it works, a live weather demo, what comes next, questions, the
// early-access list, who we are and how to reach us.
export default function SiteInfo({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const s = dict.site;
  const steps = [
    { n: 1 as const, title: s.s1t, body: s.s1 },
    { n: 2 as const, title: s.s2t, body: s.s2 },
    { n: 3 as const, title: s.s3t, body: s.s3 },
  ];
  return (
    <div className="site-info relative z-10 mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-10 pt-16 sm:px-6">
      <section aria-labelledby="how" className="flex flex-col gap-5">
        <h2 id="how" className="reveal text-center font-serif text-3xl sm:text-4xl">{s.howTitle}</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.n} className="glass reveal flex flex-col gap-3 p-5">
              <StepArt n={step.n} />
              <span className="text-[0.68rem] tracking-[0.2em] text-accent">0{step.n}</span>
              <h3 className="font-serif text-xl">{step.title}</h3>
              <p className="text-sm leading-relaxed text-text-2">{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="flex justify-center">
          <Link href={`/${locale}/signup`} className="btn btn-primary">{dict.nav.signUp}</Link>
        </div>
      </section>

      <WeatherDemo s={s} />

      <section aria-labelledby="soon" className="flex flex-col gap-5">
        <div className="reveal text-center">
          <h2 id="soon" className="font-serif text-3xl sm:text-4xl">{s.soonTitle}</h2>
          <p className="mt-2 text-sm text-text-2">{s.soonSub}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {s.soon.map(([title, body]) => (
            <li key={title} className="glass reveal flex flex-col gap-1.5 p-5">
              <span className="site-soon-dot" aria-hidden />
              <h3 className="font-serif text-lg leading-snug">{title}</h3>
              <p className="text-[0.8rem] leading-relaxed text-text-2">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq" className="flex flex-col gap-4">
        <h2 id="faq" className="reveal text-center font-serif text-3xl sm:text-4xl">{s.faqTitle}</h2>
        <div className="glass reveal flex flex-col divide-y divide-[var(--glass-border)] px-5 sm:px-7">
          {s.faq.map(([q, a]) => (
            <details key={q} className="site-faq group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-lg">
                {q}
                <span className="site-faq-plus text-accent" aria-hidden>+</span>
              </summary>
              <p className="pt-2 text-sm leading-relaxed text-text-2">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <Waitlist s={s} locale={locale} />

      <div className="grid gap-4 md:grid-cols-2">
        <section id="about" aria-labelledby="about-title" className="glass reveal flex flex-col gap-3 p-6 sm:p-8">
          <h2 id="about-title" className="font-serif text-2xl">{s.aboutTitle}</h2>
          <p className="text-sm leading-relaxed text-text-2">{s.about}</p>
        </section>
        <section id="support" aria-labelledby="support-title" className="glass reveal flex flex-col gap-3 p-6 sm:p-8">
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
