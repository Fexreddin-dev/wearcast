import "server-only";
import { StudioFailure } from "./server";

export type DayPart = { temp: number; wind: number; rain: number; sky: string };
export type Weather = { city: string; morning: DayPart; afternoon: DayPart; evening: DayPart };

type Entry = { dt: number; main: { temp: number }; wind: { speed: number }; pop: number; weather: { main: string }[] };

const cache = new Map<string, { at: number; value: Weather }>();
const TTL = 30 * 60 * 1000;

// Uses the next forecast slot for each part of the day, in the city's own time zone.
export async function getWeather(city: string): Promise<Weather> {
  const key = city.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
  url.searchParams.set("q", city);
  url.searchParams.set("units", "metric");
  url.searchParams.set("appid", process.env.OPENWEATHER_API_KEY ?? "");
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) throw new StudioFailure("city_not_found", 404);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  const body = (await res.json()) as { list: Entry[]; city: { name: string; timezone: number } };

  const pick = (hour: number): DayPart => {
    const match =
      body.list.find((e) => {
        const h = new Date((e.dt + body.city.timezone) * 1000).getUTCHours();
        return Math.abs(h - hour) <= 1.5;
      }) ?? body.list[0];
    return {
      temp: Math.round(match.main.temp),
      wind: Math.round(match.wind.speed),
      rain: Math.round((match.pop ?? 0) * 100),
      sky: match.weather[0]?.main ?? "",
    };
  };

  const value: Weather = { city: body.city.name, morning: pick(9), afternoon: pick(15), evening: pick(21) };
  cache.set(key, { at: Date.now(), value });
  return value;
}
