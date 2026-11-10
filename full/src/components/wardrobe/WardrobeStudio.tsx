"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import {
  canTryOn,
  isBaseAvatar,
  MAX_LAYERS,
  DEMO_ITEMS,
  layerRank,
  type BaseAvatar,
  type StudioError,
  type WardrobeItem,
} from "@/lib/wardrobe/catalog";
import Closet from "./Closet";
import Podium from "./Podium";
import DayPanel, { type Look, type WeatherData } from "./DayPanel";
import "./wardrobe.css";

export type Text = Dictionary["wardrobe"];
export type StudioData = {
  items: WardrobeItem[];
  limit: number;
  credits: number;
  city: string;
  look: Look | null;
  worn: Record<string, string[]>;
  wornAvatar: string | null;
  preview: boolean;
  weather?: WeatherData;
};

export async function callApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({ error: "failed" }));
  if (!res.ok) throw new Error((body.error as StudioError) ?? "failed");
  return body as T;
}

const json = (method: string, payload: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

// Pieces stack: what goes on later lies over what is already worn, and taking it off reveals it again.
function withItem(current: WardrobeItem[], item: WardrobeItem) {
  return [...current, item].sort((a, b) => layerRank(a.category) - layerRank(b.category));
}

export default function WardrobeStudio({ locale, t, data }: { locale: Locale; t: Text; data: StudioData }) {
  const router = useRouter();
  const [own, setOwn] = useState(data.items);
  const [avatar, setAvatar] = useState<BaseAvatar>(data.wornAvatar && isBaseAvatar(data.wornAvatar) ? data.wornAvatar : "f1");
  const [layers, setLayers] = useState<WardrobeItem[]>([]);
  const [look, setLook] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<WardrobeItem | null>(null);
  const worn = useRef(data.worn);
  const viewToken = useRef(0);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const nextToast = useRef(0);

  const toast = useCallback((text: string) => {
    const id = ++nextToast.current;
    setToasts((all) => [...all, { id, text }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 3800);
  }, []);

  const showError = useCallback(
    (e: unknown) => {
      const code = (e instanceof Error ? e.message : "failed") as StudioError;
      toast(t.errors[code] ?? t.errors.failed);
    },
    [t, toast],
  );

  const everything = useMemo(() => [...own, ...DEMO_ITEMS], [own]);

  const remember = useCallback(
    (id: BaseAvatar, items: WardrobeItem[]) => {
      worn.current = { ...worn.current, [id]: items.map((i) => i.ref) };
      if (!data.preview) void callApi("/api/worn", json("POST", { avatar: id, items: items.map((i) => i.ref) })).catch(() => undefined);
    },
    [data.preview],
  );

  // Puts back what this avatar was last wearing. Only ever reads saved results, so it costs nothing.
  const restore = useCallback(
    async (id: BaseAvatar) => {
      const token = ++viewToken.current;
      const items = (worn.current[id] ?? []).flatMap((ref) => everything.filter((i) => i.ref === ref));
      setLayers([]);
      setLook(null);
      if (items.length === 0 || data.preview) return;
      try {
        const res = await callApi<{ image: string | null }>("/api/tryon", json("POST", { avatar: id, items: items.map((i) => i.ref), cacheOnly: true }));
        // A newer choice (another avatar, or dressing) wins over this slower answer.
        if (res.image && token === viewToken.current) {
          setLayers(items);
          setLook(res.image);
        }
      } catch {
        /* the plain avatar stays on screen */
      }
    },
    [data.preview, everything],
  );

  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    void restore(avatar);
  }, [avatar, restore]);

  const dress = useCallback(
    async (next: WardrobeItem[], added: WardrobeItem | null) => {
      viewToken.current += 1;
      setBusy(true);
      setPreview(added);
      try {
        const res = await callApi<{ image: string; charged: number; cached: boolean }>(
          "/api/tryon",
          json("POST", { avatar, items: next.map((n) => n.ref) }),
        );
        setLayers(next);
        setLook(res.image);
        remember(avatar, next);
        toast(res.cached ? t.toast.cached : res.charged === 0 ? t.toast.ready : res.charged === 1 ? t.toast.dressed : t.toast.dressedMany.replace("{n}", String(res.charged)));
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
    const worn = layers.some((l) => l.ref === item.ref);
    if (worn) applyLayers(layers.filter((l) => l.ref !== item.ref));
    else if (layers.length >= MAX_LAYERS) toast(t.maxLayers);
    else applyLayers(withItem(layers, item), item);
  };

  const chooseAvatar = (id: BaseAvatar) => {
    if (busy) return;
    setAvatar(id);
    void restore(id);
    if (!data.preview) void callApi("/api/worn", json("POST", { avatar: id, items: worn.current[id] ?? [] })).catch(() => undefined);
  };

  const getTheLook = (itemIds: string[]) => {
    if (busy) return;
    const items = itemIds.flatMap((id) => own.filter((o) => o.ref === id && canTryOn(o.category)));
    if (items.length) applyLayers(items.reduce<WardrobeItem[]>((acc, item) => withItem(acc, item), []));
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
    } catch (e) {
      showError(e);
    }
  };

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
          }}
          onError={showError}
        />
      </div>

      <div className="wc-col wc-center glass">
        <Podium
          t={t}
          avatar={avatar}
          onAvatar={chooseAvatar}
          look={look}
          layers={layers}
          busy={busy}
          preview={preview}
          onRemove={(ref) => !busy && applyLayers(layers.filter((l) => l.ref !== ref))}
          onReset={() => !busy && applyLayers([])}
        />
      </div>

      <div className="wc-col wc-scroll">
        <DayPanel
          locale={locale}
          t={t}
          initialCity={data.city}
          initialLook={data.look}
          initialWeather={data.weather}
          preview={data.preview}
          ownCount={own.length}
          all={everything}
          busy={busy}
          onGetLook={getTheLook}
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
