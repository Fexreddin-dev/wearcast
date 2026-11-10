"use client";
/* eslint-disable @next/next/no-img-element -- private signed images and transparent cutouts */

import { useRef, useState, useSyncExternalStore } from "react";
import { canTryOn, CATEGORIES, DEMO_ITEMS, FITS, MATERIALS, SIZES, type Category, type WardrobeItem } from "@/lib/wardrobe/catalog";
import { callApi, type Text } from "./WardrobeStudio";

type Filter = "all" | Category;

// Shoes and accessories sit on a glass shelf instead of a hanger.
const NO_HANGER: Category[] = ["shoes", "accessories"];

// Which sample pieces this visitor has put away: a per-browser preference.
const HIDDEN_KEY = "wc-hidden-samples";
const HIDDEN_EVENT = "wc-hidden-samples-change";
function readHidden() {
  try {
    return localStorage.getItem(HIDDEN_KEY) ?? "";
  } catch {
    return "";
  }
}
function writeHidden(refs: string[]) {
  try {
    localStorage.setItem(HIDDEN_KEY, refs.join(","));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(HIDDEN_EVENT));
}
function subscribeHidden(onChange: () => void) {
  window.addEventListener(HIDDEN_EVENT, onChange);
  return () => window.removeEventListener(HIDDEN_EVENT, onChange);
}

function Hanger() {
  return (
    <svg className="wc-item-hanger" viewBox="0 0 44 24" fill="none" aria-hidden="true">
      <path d="M22 9V6.2a2.7 2.7 0 1 0-2.7-2.7" stroke="#b4935a" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M22 9 3.5 19.5c-1.2.7-.7 2.5.7 2.5h35.6c1.4 0 1.9-1.8.7-2.5L22 9Z" fill="currentColor" />
    </svg>
  );
}

export default function Closet({
  t, own, limit, worn, onToggle, onDelete, onAdded, onError,
}: {
  t: Text;
  own: WardrobeItem[];
  limit: number;
  worn: WardrobeItem[];
  onToggle: (item: WardrobeItem) => void;
  onDelete: (item: WardrobeItem) => void;
  onAdded: (item: WardrobeItem) => void;
  onError: (e: unknown) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);
  const hidden = useSyncExternalStore(subscribeHidden, readHidden, () => "").split(",").filter(Boolean);
  const shown = [...own, ...DEMO_ITEMS.filter((d) => !hidden.includes(d.ref))].filter((i) => filter === "all" || i.category === filter);

  return (
    <div className="wc-closet">
      <div className="wc-closet-inner">
        <div className="wc-closet-head">
          <h1 className="font-serif text-xl">{t.closet}</h1>
          <p className="text-[0.68rem] text-text-2">
            {own.length} / {Number.isFinite(limit) ? limit : "∞"} {t.slots}
            {hidden.length > 0 && (
              <button type="button" className="ml-2 cursor-pointer text-accent underline" onClick={() => writeHidden([])}>{t.showSamples}</button>
            )}
          </p>
        </div>
        <div className="wc-chips">
          {(["all", ...CATEGORIES] as Filter[]).map((c) => (
            <button key={c} type="button" className="wc-chip" aria-pressed={filter === c} onClick={() => setFilter(c)}>
              {t.cat[c]}
            </button>
          ))}
        </div>
        <div className="wc-rail" />
        <div className="wc-scroll flex-1">
          {shown.length === 0 && <p className="p-6 text-center text-xs text-text-2">{t.empty}</p>}
          <div className="wc-grid">
            {shown.map((item) => (
              <div key={item.ref} className="wc-item-wrap">
                <button
                  type="button"
                  className={`wc-item w-full ${canTryOn(item.category) ? "" : "is-muted"}`}
                  aria-pressed={worn.some((w) => w.ref === item.ref)}
                  aria-label={item.name ?? t.cat[item.category]}
                  onClick={() => onToggle(item)}
                >
                  {NO_HANGER.includes(item.category) ? <span className="wc-no-hanger" /> : <Hanger />}
                  <span className={`wc-item-frame relative block ${NO_HANGER.includes(item.category) ? "on-shelf" : ""}`}>
                    <img src={item.image} alt="" loading="lazy" draggable={false} />
                    {item.demo && <span className="wc-tag">{t.demo}</span>}
                  </span>
                </button>
                <button
                  type="button"
                  className="wc-del"
                  aria-label={t.podium.remove}
                  onClick={() => {
                    if (item.demo) writeHidden([...hidden, item.ref]);
                    onDelete(item);
                  }}
                >×</button>
              </div>
            ))}
          </div>
        </div>
        <div className="relative p-2.5">
          <button type="button" className="btn btn-primary w-full" disabled={own.length >= limit} onClick={() => setAdding(true)}>
            + {t.addItem}
          </button>
        </div>
      </div>
      {adding && (
        <AddItem
          t={t}
          onClose={() => setAdding(false)}
          onAdded={(item) => {
            onAdded(item);
            setAdding(false);
          }}
          onError={onError}
        />
      )}
    </div>
  );
}

function Options<T extends string>({
  label, values, value, onChange, text,
}: {
  label: string;
  values: readonly T[];
  value: T;
  onChange: (v: T) => void;
  text: (v: T) => string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-text-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <button key={v} type="button" className="wc-option" aria-pressed={v === value} onClick={() => onChange(v)}>{text(v)}</button>
        ))}
      </div>
    </div>
  );
}

const ANGLES = ["front", "side", "back"] as const;

function AddItem({
  t, onClose, onAdded, onError,
}: {
  t: Text;
  onClose: () => void;
  onAdded: (item: WardrobeItem) => void;
  onError: (e: unknown) => void;
}) {
  const [files, setFiles] = useState<Partial<Record<(typeof ANGLES)[number], File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<(typeof ANGLES)[number], string>>>({});
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("shirts-tops");
  const [material, setMaterial] = useState<(typeof MATERIALS)[number]>("cotton");
  const [size, setSize] = useState<(typeof SIZES)[number]>("M");
  const [fit, setFit] = useState<(typeof FITS)[number]>("regular");
  const [saving, setSaving] = useState(false);
  const categoryTouched = useRef(false);

  const pick = (angle: (typeof ANGLES)[number], file?: File) => {
    if (!file) return;
    setFiles((f) => ({ ...f, [angle]: file }));
    if (angle === "front" && !categoryTouched.current) {
      const form = new FormData();
      form.set("image", file);
      void callApi<{ category: Category }>("/api/wardrobe/detect", { method: "POST", body: form })
        .then((r) => !categoryTouched.current && setCategory(r.category))
        .catch(() => undefined);
    }
    setPreviews((p) => {
      if (p[angle]) URL.revokeObjectURL(p[angle]!);
      return { ...p, [angle]: URL.createObjectURL(file) };
    });
  };

  const submit = async () => {
    const form = new FormData();
    for (const a of ANGLES) if (files[a]) form.set(a, files[a]!);
    form.set("category", category);
    form.set("material", material);
    form.set("size", size);
    form.set("fit", fit);
    if (name.trim()) form.set("name", name.trim());
    setSaving(true);
    try {
      const { item } = await callApi<{ item: WardrobeItem }>("/api/wardrobe", { method: "POST", body: form });
      onAdded(item);
    } catch (e) {
      onError(e);
      setSaving(false);
    }
  };

  return (
    <div className="wc-modal" role="dialog" aria-modal="true" aria-label={t.add.title}>
      <div className="wc-dialog glass flex flex-col gap-3.5">
        <h2 className="font-serif text-2xl">{t.add.title}</h2>
        <div className="grid grid-cols-3 gap-2">
          {ANGLES.map((a) => (
            <label key={a} className="wc-photo">
              {previews[a] ? <img src={previews[a]} alt="" /> : <span>{t.add[a]}</span>}
              <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={t.add[a]} onChange={(e) => pick(a, e.target.files?.[0])} />
            </label>
          ))}
        </div>
        <p className="text-[0.7rem] text-text-2">{t.add.photoHint}</p>
        <input className="field" placeholder={t.add.name} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        <Options label={t.add.category} values={CATEGORIES} value={category} onChange={(c) => { categoryTouched.current = true; setCategory(c); }} text={(c) => t.cat[c]} />
        <Options label={t.add.material} values={MATERIALS} value={material} onChange={setMaterial} text={(m) => t.add[m]} />
        <Options label={t.add.size} values={SIZES} value={size} onChange={setSize} text={(s) => s} />
        <Options label={t.add.fit} values={FITS} value={fit} onChange={setFit} text={(f) => t.add[f]} />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-ghost" disabled={saving} onClick={onClose}>{t.add.cancel}</button>
          <button type="button" className="btn btn-primary" disabled={saving || !files.front} onClick={submit}>
            {saving ? t.add.saving : t.add.save}
          </button>
        </div>
      </div>
    </div>
  );
}
