"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import {
  type AvatarCard,
  baseCards,
  canTryOn,
  MAX_LAYERS,
  DEMO_ITEMS,
  layerRank,
  type Occasion,
  type StudioError,
  type WardrobeItem,
} from "@/lib/wardrobe/catalog";
import Closet from "./Closet";
import Podium from "./Podium";
import DayPanel, { type WeatherData } from "./DayPanel";
import "./wardrobe.css";

export type Text = Dictionary["wardrobe"];
export type StudioData = {
  owner: string; // the signed-in account; keeps the in-browser memory per person
  items: WardrobeItem[];
  avatars: AvatarCard[]; // the owner's own avatars
  limit: number;
  credits: number;
  city: string;
  worn: Record<string, string[]>;
  wornAvatar: string | null;
  preview: boolean;
  weather?: WeatherData;
  start?: { avatar: string | null; refs: string[] } | null; // opened from Outfits or the Avatar studio
};

export async function callApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({ error: "failed" }));
  if (!res.ok) throw new Error((body.error as StudioError) ?? "failed");
  return body as T;
}

export const json = (method: string, payload: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

// Pieces stack: what goes on later lies over what is already worn, and taking it off reveals it again.
function withItem(current: WardrobeItem[], item: WardrobeItem) {
  return [...current, item].sort((a, b) => layerRank(a.category) - layerRank(b.category));
}

type TryOnReply = { image: string | null; charged: number; cached: boolean; notice: "modest" | null };

// What each avatar wears, kept in the browser while moving between the studio pages: a page shown
// again from the short browser cache may carry slightly older account data than this.
const memory = new Map<string, { worn: Record<string, string[]>; avatar: string | null }>();

export default function WardrobeStudio({ locale, t, data }: { locale: Locale; t: Text; data: StudioData }) {
  const router = useRouter();
  const [own, setOwn] = useState(data.items);
  const avatars = useMemo(() => [...data.avatars, ...baseCards()], [data.avatars]);
  const known = useCallback((id: string | null | undefined) => (id && avatars.some((a) => a.id === id) ? id : null), [avatars]);
  const kept = memory.get(data.owner);
  const [avatar, setAvatar] = useState<string>(() => known(data.start?.avatar) ?? known(kept?.avatar) ?? known(data.wornAvatar) ?? "f1");
  const [layers, setLayers] = useState<WardrobeItem[]>([]);
  const [look, setLook] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<WardrobeItem | null>(null);
  const worn = useRef(kept?.worn ?? data.worn);
  const viewToken = useRef(0);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const nextToast = useRef(0);

  const toast = useCallback((text: string) => {
    const id = ++nextToast.current;
    setToasts((all) => [...all, { id, text }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 4200);
  }, []);

  const showError = useCallback(
    (e: unknown) => {
      const code = (e instanceof Error ? e.message : "failed") as StudioError;
      toast(t.errors[code as keyof Text["errors"]] ?? t.errors.failed);
    },
    [t, toast],
  );

  const everything = useMemo(() => [...own, ...DEMO_ITEMS], [own]);
  const piecesOf = useCallback((refs: string[]) => refs.flatMap((ref) => everything.filter((i) => i.ref === ref)), [everything]);

  const remember = useCallback(
    (id: string, items: WardrobeItem[]) => {
      worn.current = { ...worn.current, [id]: items.map((i) => i.ref) };
      memory.set(data.owner, { worn: worn.current, avatar: id });
      if (!data.preview) void callApi("/api/worn", json("POST", { avatar: id, items: items.map((i) => i.ref) })).catch(() => undefined);
    },
    [data.owner, data.preview],
  );

  // Puts back what this avatar was last wearing. Only ever reads saved results, so it costs nothing.
  const restore = useCallback(
    async (id: string, items: WardrobeItem[]) => {
      const token = ++viewToken.current;
      if (items.length === 0 || data.preview) return false;
      try {
        const res = await callApi<TryOnReply>("/api/tryon", json("POST", { avatar: id, items: items.map((i) => i.ref), cacheOnly: true }));
        // A newer choice (another avatar, or dressing) wins over this slower answer.
        if (res.image && token === viewToken.current) {
          setLayers(items);
          setLook(res.image);
          return true;
        }
      } catch {
        /* the plain avatar stays on screen */
      }
      return false;
    },
    [data.preview],
  );

  const dress = useCallback(
    async (next: WardrobeItem[], added: WardrobeItem | null, on = avatar) => {
      viewToken.current += 1;
      setBusy(true);
      setPreview(added);
      try {
        const res = await callApi<TryOnReply>("/api/tryon", json("POST", { avatar: on, items: next.map((n) => n.ref) }));
        setLayers(next);
        setLook(res.image);
        remember(on, next);
        toast(res.cached ? t.toast.cached : res.charged === 0 ? t.toast.ready : res.charged === 1 ? t.toast.dressed : t.toast.dressedMany.replace("{n}", String(res.charged)));
        if (res.notice === "modest") toast(t.modestNote);
        router.refresh();
      } catch (e) {
        showError(e);
      } finally {
        setBusy(false);
        setPreview(null);
      }
    },
    [avatar, remember, router, showError, t, toast],
  );

  // Runs on the first visit and every time a look or an avatar is opened from Outfits or the Avatar studio.
  // The page itself can be reused from the browser's short cache, so each new request is handled, not only
  // the first one. A look made before is shown for free; only a look never made is dressed (and paid).
  const handled = useRef<StudioData["start"] | undefined>(undefined);
  useEffect(() => {
    const start = data.start ?? null;
    const first = handled.current === undefined;
    if (!first && handled.current === start) return;
    handled.current = start;
    if (!first && !start) return; // the address was tidied after a request was handled
    const target = known(start?.avatar) ?? avatar;
    const startItems = start?.refs.length ? piecesOf(start.refs).filter((i) => canTryOn(i.category)) : [];
    const run = async () => {
      await Promise.resolve();
      if (target !== avatar) {
        setAvatar(target);
        setLayers([]);
        setLook(null);
      }
      memory.set(data.owner, { worn: worn.current, avatar: target });
      if (startItems.length) {
        const sorted = startItems.reduce<WardrobeItem[]>((acc, item) => withItem(acc, item), []);
        if (await restore(target, sorted)) remember(target, sorted);
        else await dress(sorted, null, target);
        return;
      }
      // Opened from the Avatar studio: this avatar becomes the one that opens next time too.
      if (start?.avatar && !data.preview) void callApi("/api/worn", json("POST", { avatar: target, items: worn.current[target] ?? [] })).catch(() => undefined);
      await restore(target, piecesOf(worn.current[target] ?? []));
    };
    void run();
    if (start) router.replace(`/${locale}/wardrobe`, { scroll: false });
  }, [avatar, data.owner, data.preview, data.start, dress, known, locale, piecesOf, remember, restore, router]);

  const applyLayers = useCallback(
    (next: WardrobeItem[], added: WardrobeItem | null = null) => {
      if (next.length === 0) {
        setLayers([]);
        setLook(null);
        remember(avatar, []);
        return;
      }
      void dress(next, added);
    },
    [avatar, dress, remember],
  );

  const toggle = (item: WardrobeItem) => {
    if (busy) return;
    if (!canTryOn(item.category)) return toast(t.soon);
    const isWorn = layers.some((l) => l.ref === item.ref);
    if (isWorn) applyLayers(layers.filter((l) => l.ref !== item.ref));
    else if (layers.length >= MAX_LAYERS) toast(t.maxLayers);
    else applyLayers(withItem(layers, item), item);
  };

  const chooseAvatar = (id: string) => {
    if (busy) return;
    setAvatar(id);
    memory.set(data.owner, { worn: worn.current, avatar: id });
    setLayers([]);
    setLook(null);
    void restore(id, piecesOf(worn.current[id] ?? []));
    if (!data.preview) void callApi("/api/worn", json("POST", { avatar: id, items: worn.current[id] ?? [] })).catch(() => undefined);
  };

  const getTheLook = (refs: string[]) => {
    if (busy) return;
    const items = piecesOf(refs).filter((i) => canTryOn(i.category));
    if (items.length) applyLayers(items.reduce<WardrobeItem[]>((acc, item) => withItem(acc, item), []));
  };

  const saveLook = async (refs: string[], name?: string, occasion?: Occasion | null) => {
    try {
      await callApi("/api/outfits", json("POST", { refs, avatar, name, occasion }));
      toast(t.toast.saved);
      router.refresh();
      return true;
    } catch (e) {
      showError(e);
      return false;
    }
  };

  const removeOwn = async (item: WardrobeItem) => {
    if (item.demo) {
      if (layers.some((l) => l.ref === item.ref)) applyLayers(layers.filter((l) => l.ref !== item.ref));
      return;
    }
    try {
      await callApi(`/api/wardrobe/${item.ref}`, { method: "DELETE" });
      setOwn((all) => all.filter((o) => o.ref !== item.ref));
      if (layers.some((l) => l.ref === item.ref)) applyLayers(layers.filter((l) => l.ref !== item.ref));
      toast(t.toast.removed);
      router.refresh();
    } catch (e) {
      showError(e);
    }
  };

  const current = avatars.find((a) => a.id === avatar) ?? avatars[0];

  return (
    <div className="wc-studio">
      <div className="wc-col">
        <Closet
          t={t}
          own={own}
          limit={data.limit}
          worn={layers}
          onToggle={toggle}
          onDelete={removeOwn}
          onAdded={(item) => {
            setOwn((all) => [item, ...all]);
            toast(t.toast.added);
            router.refresh();
          }}
          onError={showError}
        />
      </div>

      <div className="wc-col wc-center glass">
        <Podium
          t={t}
          avatars={avatars}
          current={current}
          avatarHref={`/${locale}/avatar`}
          onAvatar={chooseAvatar}
          look={look}
          layers={layers}
          busy={busy}
          preview={preview}
          canSave={!data.preview}
          onSave={(name, occasion) => saveLook(layers.map((l) => l.ref), name, occasion)}
          onRemove={(ref) => !busy && applyLayers(layers.filter((l) => l.ref !== ref))}
          onReset={() => !busy && applyLayers([])}
        />
      </div>

      <div className="wc-col wc-scroll">
        <DayPanel
          locale={locale}
          t={t}
          initialCity={data.city}
          initialWeather={data.weather}
          preview={data.preview}
          avatar={avatar}
          all={everything}
          busy={busy}
          onGetLook={getTheLook}
          onSave={(refs) => void saveLook(refs)}
          onToast={toast}
          onError={showError}
        />
      </div>

      <div className="wc-toasts" role="status" aria-live="polite">
        {toasts.map((x) => (
          <div key={x.id} className="wc-toast glass">{x.text}</div>
        ))}
      </div>
    </div>
  );
}
