"use client";
/* eslint-disable @next/next/no-img-element -- private signed images */

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { OCCASIONS, type Occasion, type StudioError } from "@/lib/wardrobe/catalog";
import { callApi, json } from "@/components/wardrobe/WardrobeStudio";
import "@/components/wardrobe/wardrobe.css";
import "./outfits.css";

type T = Dictionary["outfits"];
const MONTHS: Record<Locale, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  az: ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"],
  tr: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"],
};
type W = Dictionary["wardrobe"];
export type SavedOutfit = {
  id: string;
  name: string | null;
  occasion: Occasion | null;
  createdAt: string;
  pieces: { image: string; label: string }[];
  missing: boolean;
  look: string | null; // finished picture: wearing it again is free
  avatarImage: string | null;
  steps: number; // pieces that are dressed one by one
};

export default function OutfitsBoard({ locale, t, w, outfits: initial, preview }: { locale: Locale; t: T; w: W; outfits: SavedOutfit[]; preview: boolean }) {
  const router = useRouter();
  const [outfits, setOutfits] = useState(initial);
  const [filter, setFilter] = useState<"all" | Occasion>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const nextToast = useRef(0);

  const toast = useCallback((text: string) => {
    const id = ++nextToast.current;
    setToasts((all) => [...all, { id, text }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 3800);
  }, []);
  const showError = (e: unknown) => {
    const code = (e instanceof Error ? e.message : "failed") as StudioError;
    toast(w.errors[code as keyof W["errors"]] ?? w.errors.failed);
  };

  const shown = outfits.filter((o) => filter === "all" || o.occasion === filter);
  // Month names written out: some browsers have no Azerbaijani month names and print "M11".
  const date = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()} ${MONTHS[locale][d.getMonth()]}`;
  };

  const update = async (id: string, name: string, occasion: Occasion | null) => {
    try {
      await callApi(`/api/outfits/${id}`, json("PATCH", { name: name || null, occasion }));
      setOutfits((all) => all.map((o) => (o.id === id ? { ...o, name: name || null, occasion } : o)));
      setEditing(null);
      toast(t.updated);
      router.refresh();
    } catch (e) {
      showError(e);
    }
  };
  const remove = async (id: string) => {
    try {
      await callApi(`/api/outfits/${id}`, { method: "DELETE" });
      setOutfits((all) => all.filter((o) => o.id !== id));
      toast(t.deleted);
      router.refresh();
    } catch (e) {
      showError(e);
    }
  };

  return (
    <div className="of-page">
      <header className="glass of-head">
        <div>
          <h1 className="font-serif text-3xl">{t.title}</h1>
          <p className="mt-1 text-xs text-text-2">{t.intro}</p>
        </div>
        <div className="wc-chips !p-0" role="group" aria-label={w.occasion}>
          {(["all", ...OCCASIONS] as const).map((o) => (
            <button key={o} type="button" className="wc-chip" aria-pressed={filter === o} onClick={() => setFilter(o)}>
              {o === "all" ? t.all : t.occ[o]}
            </button>
          ))}
        </div>
      </header>

      {shown.length === 0 && (
        <div className="glass of-empty">
          <p className="text-sm text-text-2">{t.empty}</p>
          <Link href={`/${locale}/wardrobe`} className="btn btn-primary mt-4">{t.openStudio}</Link>
        </div>
      )}

      <div className="of-grid">
        {shown.map((o) => (
          <article key={o.id} className="glass of-card">
            <div className="of-stage">
              {o.look ? (
                <img className="of-look" src={o.look} alt="" loading="lazy" />
              ) : (
                <div className="of-pieces">
                  {o.pieces.map((p, i) => (
                    <img key={i} src={p.image} alt={p.label} loading="lazy" />
                  ))}
                </div>
              )}
              {!o.look && o.avatarImage && <img className="of-avatar" src={o.avatarImage} alt="" loading="lazy" />}
            </div>

            {editing === o.id ? (
              <EditOutfit t={t} outfit={o} onCancel={() => setEditing(null)} onSave={(name, occ) => update(o.id, name, occ)} />
            ) : (
              <div className="flex flex-col gap-2 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="truncate font-serif text-lg">{o.name ?? o.pieces.map((p) => p.label).join(" · ")}</h2>
                  <span className="flex-none text-[0.65rem] text-text-2">{date(o.createdAt)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[0.7rem] text-accent">{o.occasion ? t.occ[o.occasion] : t.noOccasion}</span>
                  <span className={`of-status ${o.look ? "is-ready" : ""}`}>{o.look ? t.ready : t.costs.replace("{n}", String(o.steps))}</span>
                </div>
                {o.missing && <p className="text-[0.68rem] text-text-2">{t.missing}</p>}
                <div className="mt-1 flex gap-1.5">
                  <Link href={`/${locale}/wardrobe?outfit=${o.id}`} className="btn btn-primary wc-mini flex-1 justify-center" aria-disabled={o.steps === 0}>
                    {t.wear}
                  </Link>
                  <button type="button" className="btn btn-ghost wc-mini" disabled={preview} onClick={() => setEditing(o.id)}>{t.rename}</button>
                  <button type="button" className="btn btn-ghost wc-mini" disabled={preview} onClick={() => remove(o.id)}>{t.delete}</button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="wc-toasts" role="status" aria-live="polite">
        {toasts.map((x) => (
          <div key={x.id} className="wc-toast glass">{x.text}</div>
        ))}
      </div>
    </div>
  );
}

function EditOutfit({ t, outfit, onCancel, onSave }: { t: T; outfit: SavedOutfit; onCancel: () => void; onSave: (name: string, occasion: Occasion | null) => void }) {
  const [name, setName] = useState(outfit.name ?? "");
  const [occasion, setOccasion] = useState<Occasion | null>(outfit.occasion);
  return (
    <div className="flex flex-col gap-2.5 p-3">
      <input className="field" aria-label={t.name} placeholder={t.name} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex flex-wrap gap-1.5">
        {OCCASIONS.map((o) => (
          <button key={o} type="button" className="wc-option" aria-pressed={o === occasion} onClick={() => setOccasion(o === occasion ? null : o)}>{t.occ[o]}</button>
        ))}
      </div>
      <div className="flex justify-end gap-1.5">
        <button type="button" className="btn btn-ghost wc-mini" onClick={onCancel}>{t.cancel}</button>
        <button type="button" className="btn btn-primary wc-mini" onClick={() => onSave(name.trim(), occasion)}>{t.save}</button>
      </div>
    </div>
  );
}
