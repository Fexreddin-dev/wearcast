"use client";
/* eslint-disable @next/next/no-img-element -- transparent look pictures */

import { useActionState, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { joinWaitlist, type WaitlistState } from "@/app/actions/waitlist";
import "./site.css";

type Site = Dictionary["site"];

// Three kinds of weather and what he and she would wear: knitwear, shirts, then summer t-shirts.
// Every change of weather changes the whole look, not one piece.
const DAYS = [
  { key: "cool", man: "m1-1", woman: "f1-2" },
  { key: "mild", man: "m1-5", woman: "f1-5" },
  { key: "hot", man: "m1-7", woman: "f1-7" },
] as const;

export function WeatherDemo({ s }: { s: Site }) {
  const [day, setDay] = useState<(typeof DAYS)[number]["key"]>("cool");
  const d = DAYS.find((x) => x.key === day)!;
  return (
    <section aria-labelledby="demo-title" className="glass reveal flex flex-col items-center gap-5 overflow-hidden px-4 pb-0 pt-8 sm:px-8">
      <div className="text-center">
        <h2 id="demo-title" className="font-serif text-3xl sm:text-4xl">{s.demoTitle}</h2>
        <p className="mt-2 text-sm text-text-2">{s.demoSub}</p>
      </div>
      <div className="wc-seg site-seg" role="tablist">
        {DAYS.map((x) => (
          <button key={x.key} type="button" role="tab" aria-selected={day === x.key} onClick={() => setDay(x.key)}>
            {s[x.key]}
          </button>
        ))}
      </div>
      <div className="site-demo-stage" aria-live="polite">
        {[d.man, d.woman].map((id) => (
          <img key={id} src={`/assets/looks/${id}.webp`} alt="" className="site-demo-look" />
        ))}
        <span className="site-demo-floor" aria-hidden />
      </div>
    </section>
  );
}

export function Waitlist({ s, locale }: { s: Site; locale: Locale }) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, undefined);
  const message = state?.status === "ok" ? s.waitOk : state?.status === "bad" ? s.waitBad : state?.status === "fail" ? s.waitFail : null;
  return (
    <section aria-labelledby="wait-title" className="glass reveal flex flex-col items-center gap-4 p-6 text-center sm:p-10">
      <h2 id="wait-title" className="font-serif text-3xl">{s.waitTitle}</h2>
      <p className="max-w-md text-sm text-text-2">{s.waitSub}</p>
      {state?.status === "ok" ? (
        <p role="status" className="text-sm font-medium text-accent">{message}</p>
      ) : (
        <form action={action} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
          <input type="hidden" name="locale" value={locale} />
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          <input className="field flex-1" type="email" name="email" required maxLength={254} placeholder={s.waitPlaceholder} aria-label={s.waitPlaceholder} />
          <button className="btn btn-primary whitespace-nowrap" type="submit" disabled={pending}>{s.waitButton}</button>
        </form>
      )}
      {message && state?.status !== "ok" && <p role="status" className="text-xs text-text-2">{message}</p>}
    </section>
  );
}
