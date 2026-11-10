"use client";
/* eslint-disable @next/next/no-img-element -- private signed images */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { LookEntry, LookSource, WardrobeItem } from "@/lib/wardrobe/catalog";
import { callApi, json, type Text } from "./WardrobeStudio";

type Part = { temp: number; wind: number; rain: number; sky: string };
export type WeatherData = { city: string; morning: Part; afternoon: Part; evening: Part };
type Reply = { history: LookEntry[]; changesLeft: number | null };
type Slot = Reply & { index: number };

export default function DayPanel({
  locale, t, initialCity, initialWeather, preview, avatar, all, busy, onGetLook, onSave, onToast, onError,
}: {
  locale: Locale;
  t: Text;
  initialCity: string;
  initialWeather?: WeatherData;
  preview: boolean;
  avatar: string;
  all: WardrobeItem[];
  busy: boolean;
  onGetLook: (refs: string[]) => void;
  onSave: (refs: string[]) => void;
  onToast: (text: string) => void;
  onError: (e: unknown) => void;
}) {
  const [weather, setWeather] = useState<WeatherData | null>(initialWeather ?? null);
  const [weatherFailed, setWeatherFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [city, setCity] = useState(initialCity);
  const [source, setSource] = useState<LookSource>("wardrobe");
  // Looks per source and avatar, so switching back and forth never asks again.
  const [slots, setSlots] = useState<Record<string, Slot>>({});
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const asked = useRef(new Set<string>());
  const key = `${source}|${avatar}`;
  const slot = slots[key];

  useEffect(() => {
    if (preview) return;
    callApi<WeatherData>(`/api/weather?city=${encodeURIComponent(initialCity)}`)
      .then(setWeather)
      .catch(() => setWeatherFailed(true));
  }, [initialCity, preview]);

  const load = useCallback(
    async (src: LookSource, av: string, change: boolean) => {
      const k = `${src}|${av}`;
      setLoading(true);
      setFailed(null);
      try {
        const res = await callApi<Reply>("/api/look", json("POST", { source: src, avatar: av, change }));
        setSlots((all) => ({ ...all, [k]: { ...res, index: 0 } }));
      } catch (e) {
        const code = e instanceof Error ? e.message : "failed";
        // No credit is involved here, so the general "credit returned" message would mislead.
        if (change) {
          if (code === "failed") onToast(t.look.failed);
          else onError(e);
        } else setFailed(code);
      } finally {
        setLoading(false);
      }
    },
    [onError, onToast, t],
  );

  // The look for the avatar on the podium; asked once per source and avatar while the page is open.
  useEffect(() => {
    if (preview || asked.current.has(key)) return;
    asked.current.add(key);
    const run = async () => {
      await Promise.resolve();
      await load(source, avatar, false);
    };
    void run();
  }, [avatar, key, load, preview, source]);

  const saveCity = async () => {
    try {
      const next = await callApi<WeatherData>("/api/weather", json("PUT", { city }));
      setWeather(next);
      setCity(next.city);
      setEditing(false);
      setWeatherFailed(false);
      onToast(t.toast.city);
      // A new city may mean other weather: the look is checked again.
      asked.current.clear();
      setSlots({});
      void load(source, avatar, false);
      asked.current.add(key);
    } catch (e) {
      onError(e);
    }
  };

  const entry = slot?.history[slot.index] ?? null;
  const pieceOf = (ref: string | null) => (ref ? all.find((a) => a.ref === ref) : undefined);
  const step = (by: number) =>
    setSlots((all) => (slot ? { ...all, [key]: { ...slot, index: Math.min(slot.history.length - 1, Math.max(0, slot.index + by)) } } : all));
  const usesSamples = entry?.refs.some((r) => r.startsWith("demo:")) ?? false;

  return (
    <div className="flex flex-col gap-3">
      <section className="glass p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="text-[0.68rem] font-medium tracking-[0.18em]">{t.weather.title}</h2>
          <button type="button" className="cursor-pointer text-[0.68rem] text-accent" onClick={() => setEditing((v) => !v)}>
            {weather?.city ?? city}
          </button>
        </div>
        {editing && (
          <div className="my-2 flex gap-2">
            <input className="field" style={{ padding: "0.45rem 0.7rem", fontSize: "0.8rem" }} aria-label={t.weather.change} value={city} maxLength={60} onChange={(e) => setCity(e.target.value)} />
            <button type="button" className="btn btn-ghost wc-mini" onClick={saveCity}>{t.weather.save}</button>
          </div>
        )}
        {weatherFailed && <p className="py-3 text-xs text-text-2">{t.weather.unavailable}</p>}
        {!weatherFailed && !weather && <div className="wc-skeleton my-6 w-full" />}
        {weather && (["morning", "afternoon", "evening"] as const).map((p) => (
          <div key={p} className="wc-part">
            <span>{t.weather[p]}</span>
            <span className="font-medium">{weather[p].temp}°</span>
            <span className="text-[0.68rem] text-text-2">{weather[p].wind} {t.weather.wind} · {weather[p].rain}% {t.weather.rain}</span>
          </div>
        ))}
      </section>

      <section className="glass flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[0.68rem] font-medium tracking-[0.18em]">{t.look.title}</h2>
          {slot && slot.history.length > 1 && (
            <div className="flex items-center gap-1 text-[0.68rem] text-text-2">
              <button type="button" className="wc-arrow" aria-label={t.look.older} disabled={slot.index >= slot.history.length - 1} onClick={() => step(1)}>‹</button>
              <span>{slot.index + 1}/{slot.history.length}</span>
              <button type="button" className="wc-arrow" aria-label={t.look.newer} disabled={slot.index === 0} onClick={() => step(-1)}>›</button>
            </div>
          )}
        </div>
        <div className="wc-seg" role="tablist">
          {(["wardrobe", "trend"] as const).map((s) => (
            <button key={s} type="button" role="tab" aria-selected={source === s} onClick={() => setSource(s)}>
              {s === "wardrobe" ? t.look.mine : t.look.trends}
            </button>
          ))}
        </div>

        {preview && <p className="text-xs leading-relaxed text-text-2">{t.look.needItems}</p>}
        {!preview && loading && !entry && (
          <div className="flex flex-col gap-2 py-1" aria-busy="true">
            <span className="wc-skeleton w-full" />
            <span className="text-[0.66rem] text-text-2">{t.look.thinking}</span>
          </div>
        )}
        {!preview && !loading && !entry && failed && (
          <p className="text-xs leading-relaxed text-text-2">{failed === "too_few_items" ? t.look.needItems : failed === "failed" ? t.look.failed : (t.errors[failed as keyof Text["errors"]] ?? t.look.failed)}</p>
        )}

        {entry && slot && (
          <div className={`flex flex-col gap-3 ${loading ? "opacity-60" : ""}`}>
            {entry.source === "wardrobe" ? (
              <div className="flex gap-2">
                {entry.refs.map((r) => {
                  const p = pieceOf(r);
                  return p ? <img key={r} src={p.image} alt={p.name ?? t.cat[p.category]} className="h-20 w-16 object-contain" /> : null;
                })}
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {entry.pieces.map((p, i) => {
                  const match = pieceOf(p.ref);
                  return (
                    <li key={i} className="wc-trend-row">
                      <span className="wc-dot" style={{ background: p.color }} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.76rem]">{p.name[locale]}</span>
                        <span className="block text-[0.62rem] text-text-2">{t.cat[p.category]}{match ? ` · ${t.look.closest}` : ""}</span>
                      </span>
                      {match && <img src={match.image} alt="" className="h-10 w-8 flex-none object-contain" />}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="font-serif text-[1.02rem] leading-snug">{entry.note[locale]}</p>
            <details className="wc-why">
              <summary>{t.look.why}</summary>
              <dl>
                <dt>{t.look.whyWeather}</dt><dd>{entry.why.weather[locale]}</dd>
                <dt>{t.look.whyHarmony}</dt><dd>{entry.why.harmony[locale]}</dd>
                <dt>{t.look.whyLayers}</dt><dd>{entry.why.layers[locale]}</dd>
              </dl>
            </details>
            {usesSamples && <p className="text-[0.66rem] text-text-2">{t.look.samplesUsed}</p>}
            {entry.source === "trend" && entry.refs.length === 0 && <p className="text-[0.66rem] text-text-2">{t.look.noMatch}</p>}
            <button type="button" className="btn btn-primary w-full" disabled={busy || entry.refs.length === 0} onClick={() => onGetLook(entry.refs)}>{t.look.get}</button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-ghost wc-mini" disabled={loading || slot.changesLeft === 0} onClick={() => load(source, avatar, true)}>
                {t.look.shuffle}
              </button>
              <button type="button" className="btn btn-ghost wc-mini" disabled={entry.refs.length === 0} onClick={() => onSave(entry.refs)}>{t.look.save}</button>
            </div>
            <p className="text-center text-[0.62rem] leading-relaxed text-text-2">
              {slot.changesLeft === null ? t.look.stable : `${t.look.changesLeft.replace("{n}", String(slot.changesLeft))} · ${t.look.stable}`}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
