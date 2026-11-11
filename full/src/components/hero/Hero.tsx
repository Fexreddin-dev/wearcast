"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import film from "./film.json";
import { LAYOUT } from "./layout.mjs";

/*
 * Hero film: one continuous camera journey driven by scroll (Lenis inertia + GSAP ScrollTrigger).
 *   Your Weather.   sky → down through the clouds → a window with raindrops → through the glass into the studio
 *   Your Wardrobe.  doors open → camera glides inside → gold "digital wardrobe" scan → camera pulls back out
 *   Your Style.     the couple materialises → three dressing rounds → living finale → call to action
 * Everything is computed by one deterministic render(p) from scroll progress p ∈ [0,1].
 */

type Who = "man" | "woman";
type Slot = "top" | "trousers" | "skirt" | "shoes";
type Ch = "c1" | "c2" | "c3" | "c4";
const WHO: Who[] = ["man", "woman"];
const CHS: Ch[] = ["c1", "c2", "c3", "c4"];

const RATIO = film.ratio;
const FILM = film.base;
const V2 = "/assets/hero/v2"; // dressing states + living finale
const { feetY: FEET_Y, people: PEOPLE, origin: ORIGIN } = LAYOUT;

// ---- timeline (fractions of the pinned scroll)
const T = {
  c1: [0.025, 0.15],
  c2: [0.15, 0.25],
  c3: [0.265, 0.36],
  c4: [0.375, 0.465],
  scanIn: [0.47, 0.5],
  scanOut: [0.512, 0.54],
  c5: [0.545, 0.615],
  appear: [0.615, 0.65],
  end: [0.885, 0.93],
  cta: [0.92, 0.97],
} as const;
const JOIN_BLEND = 0.12; // soft dissolve at the start of c2 (the two clips differ by a few % in scale)

const SLOTS: Record<Slot, { cy: number; h: number }> = {
  top: { cy: 0.34, h: 0.36 },
  trousers: { cy: 0.69, h: 0.5 },
  skirt: { cy: 0.68, h: 0.46 },
  shoes: { cy: 0.965, h: 0.075 },
};
type Flight = { who: Who; garment: string; slot: Slot };
const ROUNDS: { start: number; flights: Flight[] }[] = [
  { start: 0.655, flights: [{ who: "man", garment: "man-trousers", slot: "trousers" }, { who: "woman", garment: "woman-skirt", slot: "skirt" }] },
  { start: 0.73, flights: [{ who: "man", garment: "man-blazer", slot: "top" }, { who: "woman", garment: "woman-blouse", slot: "top" }] },
  { start: 0.805, flights: [{ who: "man", garment: "man-loafers", slot: "shoes" }, { who: "woman", garment: "woman-heels", slot: "shoes" }] },
];
const R_LEN = 0.072;
const WOMAN_DELAY = 0.012;
const FLIGHTS = ROUNDS.flatMap((r, k) =>
  r.flights.map((f) => ({ ...f, round: k, start: r.start + (f.who === "woman" ? WOMAN_DELAY : 0), len: R_LEN - WOMAN_DELAY })),
);

// Chapter titles: when each one enters and leaves.
const TITLES = [
  { in: [-1, 0], out: [0.13, 0.165] },
  { in: [0.27, 0.31], out: [0.58, 0.61] },
  { in: [0.615, 0.655], out: [0.875, 0.905] },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const range = (p: number, r: readonly number[]) => clamp01((p - r[0]) / (r[1] - r[0]));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type HeroText = {
  brand: string;
  tagline: string;
  scroll: string;
  cta: string;
  signIn: string;
  morning: string;
  afternoon: string;
  evening: string;
};

export default function Hero({ text, locale }: { text: HeroText; locale: string }) {
  const [mood, setMood] = useState<"morning" | "afternoon" | "evening">("morning");
  const rootRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ambientRef = useRef<HTMLCanvasElement>(null);
  const goldRef = useRef<HTMLImageElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const flightRefs = useRef<(HTMLImageElement | null)[]>([]);
  const personRefs = useRef<Record<Who, HTMLDivElement | null>>({ man: null, woman: null });
  const stateRefs = useRef<Record<Who, (HTMLImageElement | null)[]>>({ man: [], woman: [] });
  const sweepRefs = useRef<Record<Who, HTMLDivElement | null>>({ man: null, woman: null });

  const words = text.tagline.split(/(?<=\.)\s+/).filter(Boolean);

  useEffect(() => {
    const root = rootRef.current!;
    const sticky = stickyRef.current!;
    const stage = stageRef.current!;
    const camera = cameraRef.current!;
    const canvas = canvasRef.current!;
    const ambient = ambientRef.current!;
    const video = videoRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const actx = ambient.getContext("2d", { alpha: false })!;
    // An opaque canvas starts black. Until the first film frame arrives it shows the stage's own warm colour and then
    // the poster, so the page never flashes dark on arrival (seen on the live site, 11 Nov 2026).
    actx.fillStyle = "#d9cbbb";
    actx.fillRect(0, 0, ambient.width, ambient.height);
    {
      const poster = root.querySelector<HTMLImageElement>("[data-poster]");
      const fillFromPoster = () => {
        // only while no film frame has been drawn yet (the film canvas becomes visible with its first frame)
        if (poster?.naturalWidth && canvas.style.opacity !== "1") actx.drawImage(poster, 0, 0, ambient.width, ambient.height);
      };
      if (poster?.complete) fillFromPoster();
      else poster?.addEventListener("load", fillFromPoster, { once: true });
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const set = mobile ? "m" : "d";
    const q = <T extends Element>(sel: string) => Array.from(root.querySelectorAll<T>(sel));
    const titleEls = q<HTMLElement>("[data-title]");
    const finalEls = q<HTMLElement>("[data-final]");
    const ctaEls = q<HTMLElement>("[data-cta]");
    const hintEls = q<HTMLElement>("[data-hint]");
    const weatherEls = q<HTMLElement>("[data-weather]");
    const shadowEls = q<HTMLElement>(".hero-shadow");
    const skyEls = q<HTMLElement>("[data-sky]");
    const letters = titleEls.map((el) => Array.from(el.querySelectorAll<HTMLElement>("[data-l]")));
    if (goldRef.current && mobile) goldRef.current.src = `${FILM}/gold-m.webp`;

    // ---------- frames, loaded chapter by chapter (coarse → fine inside each)
    const count = (ch: Ch) => film.chapters[ch][set];
    const frames: Record<Ch, (HTMLImageElement | null)[]> = {
      c1: new Array(count("c1")).fill(null),
      c2: new Array(count("c2")).fill(null),
      c3: new Array(count("c3")).fill(null),
      c4: new Array(count("c4")).fill(null),
    };
    let cancelled = false;
    let lastKey = "";
    const load = (ch: Ch, i: number) =>
      new Promise<void>((resolve) => {
        if (frames[ch][i]) return resolve();
        const img = new Image();
        img.decoding = "async";
        img.src = `${FILM}/${ch}/${set}/${String(i + 1).padStart(3, "0")}.webp`;
        img.onload = () => {
          frames[ch][i] = img;
          resolve();
        };
        img.onerror = () => resolve();
      });
    const orderFor = (n: number) => {
      const o: number[] = [0, n - 1];
      for (const step of [12, 6, 3, 1]) for (let i = 0; i < n; i += step) if (!o.includes(i)) o.push(i);
      return o;
    };
    const nearest = (ch: Ch, i: number) => {
      const arr = frames[ch];
      if (arr[i]) return arr[i];
      for (let d = 1; d < arr.length; d++) {
        const img = arr[i - d] || arr[i + d];
        if (img) return img;
      }
      return null;
    };

    // ---------- geometry
    let W = 0,
      H = 0;
    const measure = () => {
      W = stage.offsetWidth;
      H = stage.offsetHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      lastKey = "";
      FLIGHTS.forEach((f, i) => {
        const img = flightRefs.current[i];
        if (img) img.style.height = `${SLOTS[f.slot].h * PEOPLE[f.who].h * H}px`;
      });
      // Text zone above the couple (desktop), kept clear of the sticky header.
      const sr = stage.getBoundingClientRect();
      const kr = sticky.getBoundingClientRect();
      const stageTop = sr.top - kr.top;
      const top = stageTop + Math.max(0.075 * H, 96 - stageTop);
      sticky.style.setProperty("--zone-x", `${sr.left - kr.left + 0.53 * W}px`);
      sticky.style.setProperty("--zone-y", `${top}px`);
      sticky.style.setProperty("--zone-w", `${0.42 * W}px`);
      sticky.style.setProperty("--zone-room", `${Math.max(60, stageTop + (FEET_Y - PEOPLE.man.h) * H - top - 14)}px`);
      sticky.style.setProperty("--stage-w", `${W}px`);
      // Desktop: the copy above the couple must never touch their heads — shrink it to fit if needed.
      const room = stageTop + (FEET_Y - PEOPLE.man.h) * H - top - 14;
      [...q<HTMLElement>(".hero-title-zone"), ...q<HTMLElement>(".hero-final")].forEach((el) => {
        el.style.scale = "1";
        if (mobile) return;
        const k = Math.min(1, room / el.offsetHeight);
        el.style.transformOrigin = "0 0";
        el.style.scale = k < 1 ? k.toFixed(3) : "1";
      });
    };

    // ---------- which frame(s) to show at p
    type Spec = { ch: Ch; i: number };
    const at = (ch: Ch, t: number): Spec => ({ ch, i: Math.round(clamp01(t) * (count(ch) - 1)) });
    const frameSpec = (p: number): { a: Spec; b?: Spec; alpha?: number } => {
      if (p <= T.c1[1]) return { a: at("c1", range(p, T.c1)) };
      if (p <= T.c2[1]) {
        const t = range(p, T.c2);
        if (t < JOIN_BLEND) return { a: at("c1", 1), b: at("c2", t), alpha: easeInOut(t / JOIN_BLEND) };
        return { a: at("c2", t) };
      }
      if (p < T.c3[0]) return { a: at("c3", 0) };
      if (p <= T.c3[1]) return { a: at("c3", range(p, T.c3)) };
      if (p < T.c4[0]) return { a: at("c3", 1) };
      if (p <= T.c4[1]) return { a: at("c4", range(p, T.c4)) };
      if (p < T.c5[0]) return { a: at("c4", 1) };
      if (p <= T.c5[1]) return { a: at("c4", 1 - range(p, T.c5)) };
      return { a: at("c3", 1) };
    };
    const paint = (img: HTMLImageElement, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      actx.globalAlpha = alpha;
      actx.drawImage(img, 0, 0, ambient.width, ambient.height);
    };
    let current = 0;
    const drawFilm = (p: number, force = false) => {
      current = p;
      const s = frameSpec(p);
      const ia = nearest(s.a.ch, s.a.i);
      const ib = s.b ? nearest(s.b.ch, s.b.i) : null;
      const key = `${s.a.ch}${s.a.i}${ia ? 1 : 0}|${s.b ? `${s.b.ch}${s.b.i}${ib ? 1 : 0}${s.alpha?.toFixed(2)}` : ""}`;
      if (!force && key === lastKey) return;
      if (!ia) return; // the poster underneath stays until the first frame arrives
      lastKey = key;
      paint(ia);
      if (ib && s.alpha) paint(ib, s.alpha);
      ctx.globalAlpha = 1;
      actx.globalAlpha = 1;
      if (canvas.style.opacity !== "1") canvas.style.opacity = "1";
    };

    // ---------- living finale
    let videoReady = false;
    const ensureVideo = () => {
      if (videoReady) return;
      videoReady = true;
      video.src = `${V2}/ending-${mobile ? "m" : "d"}.mp4`;
      video.load();
    };
    const setOpacity = (el: HTMLElement | null | undefined, o: number) => {
      if (!el) return;
      const v = o.toFixed(3);
      if (el.style.opacity !== v) el.style.opacity = v;
    };

    const render = (p: number) => {
      drawFilm(p);

      // weather card + hint
      weatherEls.forEach((el) => {
        setOpacity(el, 1 - range(p, [0.085, 0.125]));
        el.style.pointerEvents = p < 0.1 ? "auto" : "none";
        el.style.transform = `translate3d(calc(-50% + var(--mx, 0px)), calc(${(-p * 260).toFixed(1)}px + var(--my, 0px)), 0)`;
      });
      hintEls.forEach((el) => setOpacity(el, 1 - range(p, [0.004, 0.03])));
      // the chosen time of day only colours the sky; it clears before the camera reaches the window
      const skyK = 1 - range(p, [0.07, 0.1]);
      skyEls.forEach((el) => el.style.setProperty("--sky-k", skyK.toFixed(3)));
      sticky.dataset.skyOn = skyK > 0.5 ? "1" : "0";

      // chapter titles: letters rise in, drift up and fade out
      titleEls.forEach((el, k) => {
        const tin = TITLES[k].in[0] < 0 ? 1 : range(p, TITLES[k].in);
        const tout = range(p, TITLES[k].out);
        const visible = tin > 0 && tout < 1;
        setOpacity(el, visible ? 1 - easeInOut(tout) : 0); // the counter fades with the letters
        if (!visible) return;
        const n = letters[k].length;
        letters[k].forEach((l, i) => {
          const lp = easeOut(clamp01(tin * 1.6 - (i / n) * 0.6));
          const lo = easeInOut(clamp01(tout * 1.6 - (i / n) * 0.6));
          l.style.opacity = (lp * (1 - lo)).toFixed(3);
          l.style.transform = `translate3d(0, ${((1 - lp) * 0.55 - lo * 0.4).toFixed(3)}em, 0)`;
        });
      });

      // gold "digital wardrobe" scan over the inside-the-wardrobe frame
      const g = p < (T.scanIn[1] + T.scanOut[0]) / 2 ? range(p, T.scanIn) : 1 - range(p, T.scanOut);
      const inScan = p > T.scanIn[0] && p < T.scanOut[1];
      const e = lerp(-8, 108, easeInOut(g));
      const gold = goldRef.current;
      if (gold) {
        setOpacity(gold, inScan && g > 0 ? 1 : 0);
        const m = `linear-gradient(90deg, #000 ${e - 5}%, transparent ${e + 5}%)`;
        gold.style.maskImage = m;
        gold.style.setProperty("-webkit-mask-image", m);
      }
      if (scanRef.current) {
        scanRef.current.style.left = `${e}%`;
        setOpacity(scanRef.current, inScan && g > 0.01 && g < 0.99 ? 1 : 0);
      }

      // camera drift during the dressing rounds only (the film itself provides the other moves)
      const drift = easeInOut(range(p, [ROUNDS[0].start, 0.87]));
      const settle = easeInOut(range(p, [0.87, 0.92]));
      camera.style.transform = `translate3d(${(-1.4 * drift * (1 - settle)).toFixed(3)}%, 0, 0) scale(${(1 + 0.03 * drift * (1 - settle)).toFixed(4)})`;

      // flights
      const dressed: Record<Who, number> = { man: 0, woman: 0 };
      const sweep: Record<Who, { t: number; state: number } | null> = { man: null, woman: null };
      const appear = easeInOut(range(p, T.appear));
      if (appear > 0 && appear < 1) WHO.forEach((w) => (sweep[w] = { t: appear, state: 0 }));
      FLIGHTS.forEach((f, i) => {
        const t = range(p, [f.start, f.start + f.len]);
        dressed[f.who] += easeInOut(range(t, [0.44, 0.88]));
        if (t > 0.42 && t < 1) sweep[f.who] = { t: range(t, [0.44, 0.93]), state: f.round + 1 };
        const img = flightRefs.current[i];
        if (!img) return;
        if (t <= 0 || t >= 0.56) {
          setOpacity(img, 0);
          return;
        }
        const slot = SLOTS[f.slot];
        const person = PEOPLE[f.who];
        const tx = person.cx * W;
        const ty = (FEET_Y - person.h) * H + slot.cy * person.h * H;
        const sx = ORIGIN.x * W;
        const sy = ORIGIN.y * H;
        const u = easeInOut(range(t, [0, 0.56]));
        const absorb = easeInOut(range(t, [0.3, 0.52]));
        // the man's garments take a low arc; the woman's rise over his head and drop onto her
        const cxp = f.who === "man" ? (sx + tx) / 2 : tx + 0.02 * W;
        const cyp = f.who === "man" ? 0.05 * H : -0.12 * H;
        const x = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * cxp + u * u * tx;
        const y = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * cyp + u * u * ty;
        const targetH = slot.h * person.h * H;
        const sc = lerp((ORIGIN.h * H) / targetH, 0.9, easeOut(u)) * lerp(1, 0.8, absorb);
        const speed = Math.sin(Math.PI * u);
        const ry = (1 - u) * -70 + speed * 10;
        const rz = speed * (f.who === "man" ? -7 : 7);
        setOpacity(img, Math.min(range(t, [0, 0.08]), 1 - absorb));
        img.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) perspective(900px) rotateY(${ry.toFixed(1)}deg) rotateZ(${rz.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
        img.style.filter = `blur(${(speed * 1.4 + absorb * 4).toFixed(2)}px) brightness(${(1 + absorb * 0.9).toFixed(2)}) drop-shadow(0 16px 22px rgba(60,40,20,0.2))`;
      });

      // dressing states (state 0 itself is revealed by the "appear" light)
      const endFade = easeInOut(range(p, T.end));
      WHO.forEach((who) => {
        const s = dressed[who];
        const base = Math.min(3, Math.floor(s + 1e-6));
        const frac = s - base;
        stateRefs.current[who].forEach((img, j) => {
          if (!img) return;
          let mask: string | null = null;
          let o = 0;
          if (j === 0 && appear < 1) {
            o = appear > 0 ? 1 : 0;
            const ee = lerp(-18, 118, appear);
            mask = `linear-gradient(180deg, #000 ${ee - 14}%, transparent ${ee + 14}%)`;
          } else if (j === base) {
            o = 1;
            // While the next look is revealed from the top, the previous one is hidden above the same line:
            // otherwise its white top showed beside the new garment until the light reached the feet.
            if (frac > 0) {
              const ee = lerp(-18, 118, frac);
              // Below the light the previous look stays as it is. Above it, it is kept only inside the new look's
              // outline (a second mask: the next state's own picture), so it fills the soft edge of the light
              // without a see-through gap, and nothing of it (the white top's sleeves) shows beside the new garment.
              mask = `linear-gradient(180deg, transparent ${ee + 14}%, #000 ${ee + 15}%), url(${V2}/states/${who}-${j + 1}.webp)`;
            }
          } else if (j === base + 1 && frac > 0) {
            o = 1;
            const ee = lerp(-18, 118, frac);
            mask = `linear-gradient(180deg, #000 ${ee - 14}%, transparent ${ee + 14}%)`;
          }
          setOpacity(img, o);
          if (mask) {
            img.style.maskImage = mask;
            img.style.setProperty("-webkit-mask-image", mask);
            // two layers (gradient + outline) are added together; each covers the whole picture
            img.style.setProperty("mask-size", "100% 100%");
            img.style.setProperty("-webkit-mask-size", "100% 100%");
            img.style.setProperty("mask-repeat", "no-repeat");
            img.style.setProperty("-webkit-mask-repeat", "no-repeat");
            img.style.setProperty("mask-composite", "add");
            img.style.setProperty("-webkit-mask-composite", "source-over");
          } else {
            for (const prop of ["mask-image", "-webkit-mask-image", "mask-size", "-webkit-mask-size", "mask-repeat", "-webkit-mask-repeat", "mask-composite", "-webkit-mask-composite"]) img.style.removeProperty(prop);
          }
        });
        const sw = sweepRefs.current[who];
        const sv = sweep[who];
        if (sw) {
          if (sv) {
            const src = `url(${V2}/states/${who}-${sv.state}.webp)`;
            if (sw.dataset.src !== src) {
              sw.dataset.src = src;
              sw.style.maskImage = src;
              sw.style.setProperty("-webkit-mask-image", src);
            }
            sw.style.backgroundPosition = `50% ${lerp(-30, 130, sv.t).toFixed(1)}%`;
            setOpacity(sw, Math.sin(Math.PI * sv.t));
          } else setOpacity(sw, 0);
        }
        const person = personRefs.current[who];
        if (person) {
          const bump = Math.sin(Math.PI * clamp01(frac)) * 0.012;
          person.style.transform = `scale(${(1 + bump).toFixed(4)})`;
          setOpacity(person, (p >= T.appear[0] ? 1 : 0) * (1 - endFade));
        }
      });
      shadowEls.forEach((el) => setOpacity(el, appear * (1 - endFade)));

      // living finale + closing copy
      if (p > 0.7) ensureVideo();
      setOpacity(video, endFade);
      if (endFade > 0.01) {
        if (video.paused && videoReady) video.play().catch(() => {});
      } else if (!video.paused) {
        video.pause();
        video.currentTime = 0;
      }
      const cta = easeOut(range(p, T.cta));
      finalEls.forEach((el) => {
        setOpacity(el, cta);
        el.style.translate = `0 ${((1 - cta) * 16).toFixed(1)}px`;
      });
      ctaEls.forEach((el) => (el.style.pointerEvents = cta > 0.5 ? "auto" : "none"));
    };

    measure();
    (async () => {
      for (const ch of CHS) {
        const order = orderFor(count(ch));
        for (let k = 0; k < order.length && !cancelled; k += 6) {
          await Promise.all(order.slice(k, k + 6).map((i) => load(ch, i)));
          drawFilm(current, true);
        }
      }
    })();

    // subtle pointer parallax on the floating copy (desktop)
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      sticky.style.setProperty("--mx", `${(x * 10).toFixed(1)}px`);
      sticky.style.setProperty("--my", `${(y * 6).toFixed(1)}px`);
    };

    if (reduce) {
      root.classList.add("is-static");
      const poster = root.querySelector<HTMLImageElement>("[data-poster]");
      if (poster) poster.src = `${V2}/ending-poster.webp`;
      canvas.style.display = "none";
      WHO.forEach((w) => setOpacity(personRefs.current[w], 0));
      titleEls.forEach((el) => setOpacity(el, 0));
      weatherEls.forEach((el) => {
        setOpacity(el, 0);
        el.style.pointerEvents = "none";
      });
      skyEls.forEach((el) => el.style.setProperty("--sky-k", "0"));
      hintEls.forEach((el) => setOpacity(el, 0));
      finalEls.forEach((el) => {
        setOpacity(el, 1);
        el.style.translate = "none";
      });
      ctaEls.forEach((el) => (el.style.pointerEvents = "auto"));
      return () => {
        cancelled = true;
      };
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const state = { p: 0 };
    const tween = gsap.to(state, {
      p: 1,
      ease: "none",
      onUpdate: () => render(state.p),
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.35,
        invalidateOnRefresh: true,
        onRefresh: () => {
          measure();
          render(state.p);
        },
      },
    });
    render(0);

    return () => {
      cancelled = true;
      window.removeEventListener("pointermove", onMove);
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.ticker.remove(raf);
      lenis.destroy();
      video.pause();
    };
  }, []);

  const title = (k: number, label: string, cls: string) => (
    <div data-title={k} className={`hero-title ${cls}`} style={{ opacity: k === 0 ? 1 : 0 }}>
      <span className="hero-count">{`0${k + 1} / 0${words.length}`}</span>
      <h2 className="hero-heading font-serif" aria-label={label}>
        {Array.from(label).map((ch, i) => (
          <span key={i} data-l className="hero-letter" aria-hidden>
            {ch === " " ? " " : ch}
          </span>
        ))}
      </h2>
    </div>
  );

  return (
    <section ref={rootRef} className="hero-root relative" aria-label={text.brand}>
      <div ref={stickyRef} data-mood={mood} className="hero-sticky sticky top-0 h-[100svh] overflow-hidden">
        {/* Ambient extension: a blurred copy of the current frame fills any space around the stage. */}
        <canvas ref={ambientRef} width={96} height={52} className="hero-ambient absolute inset-0 h-full w-full" aria-hidden />

        <div ref={stageRef} className="hero-stage absolute" style={{ ["--ratio" as string]: RATIO }}>
          <div ref={cameraRef} className="hero-camera absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img data-poster src={`${FILM}/poster.webp`} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full" />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ opacity: 0 }} aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={goldRef} src={`${FILM}/gold-d.webp`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0 }} aria-hidden />
            <div ref={scanRef} className="hero-scan" style={{ opacity: 0 }} aria-hidden />

            {WHO.map((who) => (
              <div
                key={who}
                className="hero-person-slot absolute -translate-x-1/2"
                style={{
                  left: `${PEOPLE[who].cx * 100}%`,
                  top: `${(FEET_Y - PEOPLE[who].h) * 100}%`,
                  height: `${PEOPLE[who].h * 100}%`,
                  width: `${(PEOPLE[who].h * 0.42 * 100) / RATIO}%`,
                }}
              >
                <div className="hero-shadow" style={{ opacity: 0 }} aria-hidden />
                <div
                  ref={(el) => {
                    personRefs.current[who] = el;
                  }}
                  className="hero-person absolute inset-0"
                  style={{ opacity: 0 }}
                >
                  <div className={`hero-idle hero-idle-${who} absolute inset-0`}>
                    {[0, 1, 2, 3].map((j) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={j}
                        ref={(el) => {
                          stateRefs.current[who][j] = el;
                        }}
                        src={`${V2}/states/${who}-${j}.webp`}
                        alt=""
                        draggable={false}
                        loading="lazy"
                        className="absolute bottom-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2 select-none"
                        style={{ opacity: 0, zIndex: j + 1 }}
                      />
                    ))}
                    <div
                      ref={(el) => {
                        sweepRefs.current[who] = el;
                      }}
                      className="hero-sweep absolute inset-0"
                      style={{ opacity: 0 }}
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
            ))}

            <video ref={videoRef} className="absolute inset-0 h-full w-full" muted playsInline loop preload="none" style={{ opacity: 0 }} aria-hidden />

            {FLIGHTS.map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={f.garment}
                ref={(el) => {
                  flightRefs.current[i] = el;
                }}
                src={`/assets/wardrobe/${f.garment}.webp`}
                alt=""
                draggable={false}
                loading="lazy"
                className="hero-flight pointer-events-none absolute left-0 top-0 w-auto max-w-none select-none"
                style={{ opacity: 0 }}
              />
            ))}
          </div>
        </div>

        {/* Time-of-day grade over the clouds (chapter 1) */}
        <div data-sky className="hero-sky" aria-hidden>
          {/* flat on purpose: a wrapper with opacity < 1 would stop these layers blending with the clouds */}
          <div className="hero-sky-noon-neutral" />
          <div className="hero-sky-noon-tint" />
          <div className="hero-sky-noon-light" />
          <div className="hero-sky-dusk" />
          <div className="hero-sky-stars" />
          <div className="hero-sky-moon" />
        </div>

        {/* Chapter titles */}
        <h1 className="sr-only">{text.brand}</h1>
        {title(0, words[0] ?? "", "hero-title-center")}
        {title(1, words[1] ?? "", "hero-title-zone")}
        {title(2, words[2] ?? "", "hero-title-zone")}

        {/* Weather card (chapter 1) */}
        <div data-weather className="hero-weather glass">
          {(
            [
              { id: "morning", label: text.morning, icon: "sun" },
              { id: "afternoon", label: text.afternoon, icon: "cloud" },
              { id: "evening", label: text.evening, icon: "moon" },
            ] as const
          ).map((d) => (
            <button key={d.id} type="button" className="hero-weather-col" aria-pressed={mood === d.id} onClick={() => setMood(d.id)}>
              <WeatherIcon kind={d.icon} />
              <span>{d.label}</span>
            </button>
          ))}
        </div>

        {/* Closing copy */}
        <div data-final className="hero-final" style={{ opacity: 0 }}>
          <p className="hero-final-brand font-serif">{text.brand}</p>
          <p className="hero-final-tag">{text.tagline}</p>
          <div data-cta className="hero-cta flex flex-wrap gap-3" style={{ pointerEvents: "none" }}>
            <Link href={`/${locale}/signup`} className="btn btn-primary">
              {text.cta}
            </Link>
            <Link href={`/${locale}/login`} className="btn btn-ghost">
              {text.signIn}
            </Link>
          </div>
        </div>

        <div data-hint className="hero-hint pointer-events-none absolute inset-x-0 bottom-5 z-30 flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#1C1C1E]/60">
          <span>{text.scroll}</span>
          <span className="hero-scroll-line" aria-hidden />
        </div>
      </div>
    </section>
  );
}

function WeatherIcon({ kind }: { kind: string }) {
  const common = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const };
  if (kind === "sun")
    return (
      <svg {...common} className="hero-wx hero-wx-sun">
        <circle cx="12" cy="12" r="4.2" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line key={a} x1="12" y1="2.6" x2="12" y2="5" transform={`rotate(${a} 12 12)`} />
        ))}
      </svg>
    );
  if (kind === "cloud")
    return (
      <svg {...common} className="hero-wx hero-wx-cloud">
        <circle cx="9" cy="8.5" r="3" />
        <path d="M7 18h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.4A2.8 2.8 0 0 0 7 18z" />
      </svg>
    );
  return (
    <svg {...common} className="hero-wx hero-wx-moon">
      <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />
    </svg>
  );
}
