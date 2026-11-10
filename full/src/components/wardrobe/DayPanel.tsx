"use client";
/* eslint-disable @next/next/no-img-element -- private signed images */

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { WardrobeItem } from "@/lib/wardrobe/catalog";
import { callApi, type Text } from "./WardrobeStudio";

export type Look = { itemIds: string[]; note: string | null };
type Part = { temp: number; wind: number; rain: number; sky: string };
export type WeatherData = { city: string; morning: Part; afternoon: Part; evening: Part };

const json = (method: string, payload: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

export default function DayPanel({
  locale, t, initialCity, initialLook, initialWeather, preview, ownCount, all, busy, onGetLook, onToast, onError,
}: {
  locale: Locale;
  t: Text;
  initialCity: string;
  initialLook: Look | null;
  initialWeather?: WeatherData;
  preview: boolean;
  ownCount: number;
  all: WardrobeItem[];
  busy: boolean;
  onGetLook: (ids: string[]) => void;
  onToast: (text: string) => void;
  onError: (e: unknown) => void;
}) {
  const [weather, setWeather] = useState<WeatherData | null>(initialWeather ?? null);
  const [weatherFailed, setWeatherFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [city, setCity] = useState(initialCity);
  const [look, setLook] = useState(initialLook);
  const [thinking, setThinking] = useState(false);
  const askedToday = useRef(false);

  useEffect(() => {
    if (preview) return;
    callApi<WeatherData>(`/api/weather?city=${encodeURIComponent(initialCity)}`)
      .then(setWeather)
      .catch(() => setWeatherFailed(true));
  }, [initialCity, preview]);

  const requestLook = async (shuffle: boolean) => {
    setThinking(true);
    try {
      setLook(await callApi<Look>("/api/look", json("POST", { shuffle, locale })));
    } catch (e) {
      onError(e);
    } finally {
      setThinking(false);
    }
  };

  useEffect(() => {
    if (preview || look || ownCount < 2 || askedToday.current) return;
    askedToday.current = true;
    setThinking(true);
    callApi<Look>("/api/look", json("POST", { shuffle: false, locale }))
      .then(setLook)
      .catch(() => undefined)
      .finally(() => setThinking(false));
  }, [look, locale, ownCount, preview]);

  const saveCity = async () => {
    try {
      const next = await callApi<WeatherData>("/api/weather", json("PUT", { city }));
      setWeather(next);
      setCity(next.city);
      setEditing(false);
      setWeatherFailed(false);
      onToast(t.toast.city);
    } catch (e) {
      onError(e);
    }
  };

  const saveLook = async () => {
    if (!look) return;
    try {
      await callApi("/api/outfits", json("POST", { itemIds: look.itemIds }));
      onToast(t.toast.saved);
    } catch (e) {
      onError(e);
    }
  };

  const pieces = (look?.itemIds ?? []).flatMap((id) => all.filter((a) => a.ref === id));

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
        <h2 className="text-[0.68rem] font-medium tracking-[0.18em]">{t.look.title}</h2>
        {ownCount < 2 && <p className="text-xs leading-relaxed text-text-2">{t.look.needItems}</p>}
        {ownCount >= 2 && !look && <div className="wc-skeleton w-full" />}
        {look && (
          <>
            <div className="flex gap-2">
              {pieces.map((p) => (
                <img key={p.ref} src={p.image} alt={p.name ?? t.cat[p.category]} className="h-20 w-16 object-contain" />
              ))}
            </div>
            {look.note && <p className="font-serif text-[1.02rem] leading-snug">{look.note}</p>}
            <button type="button" className="btn btn-primary w-full" disabled={busy} onClick={() => onGetLook(look.itemIds)}>{t.look.get}</button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-ghost wc-mini" disabled={thinking} onClick={() => requestLook(true)}>{t.look.shuffle}</button>
              <button type="button" className="btn btn-ghost wc-mini" onClick={saveLook}>{t.look.save}</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
