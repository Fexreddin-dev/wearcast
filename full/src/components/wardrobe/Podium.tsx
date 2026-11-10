"use client";
/* eslint-disable @next/next/no-img-element -- transparent avatars and private signed results */

import { useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { type AvatarCard, type Category, OCCASIONS, type Occasion, smartFit, type WardrobeItem } from "@/lib/wardrobe/catalog";
import type { Text } from "./WardrobeStudio";

const ZOOM = 3;
const LENS = 85;
// Where each piece sits on the body, as a share of the figure's height.
const ZONE: Partial<Record<Category, { top: string; height: string; left?: string }>> = {
  "jackets-coats": { top: "16%", height: "34%", left: "22%" },
  "shirts-tops": { top: "18%", height: "30%" },
  dresses: { top: "17%", height: "58%" },
  "pants-skirts": { top: "48%", height: "42%" },
};

// Trousers and skirts sit just under the "preparing" card, never behind it.
const LOWER_PREVIEW = { top: "calc(50% + 62px)", height: "calc(47% - 62px)" };

export default function Podium({
  t, avatars, current, avatarHref, onAvatar, look, layers, busy, preview, canSave, onSave, onRemove, onReset,
}: {
  t: Text;
  avatars: AvatarCard[];
  current: AvatarCard;
  avatarHref: string;
  onAvatar: (id: string) => void;
  look: string | null;
  layers: WardrobeItem[];
  busy: boolean;
  preview: WardrobeItem | null;
  canSave: boolean;
  onSave: (name: string, occasion: Occasion | null) => Promise<boolean>;
  onRemove: (ref: string) => void;
  onReset: () => void;
}) {
  const [loupe, setLoupe] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listOpen, setListOpen] = useState(false); // phones: the worn list folds into a small button
  const [lens, setLens] = useState<{ x: number; y: number; style: React.CSSProperties } | null>(null);
  const figure = useRef<HTMLImageElement>(null);

  // Only the outermost piece of each kind can be reached on the body; the list shows them all.
  const reachable = layers.filter((l, i) => !layers.slice(i + 1).some((later) => later.category === l.category));

  const moveLens = (e: PointerEvent<HTMLDivElement>) => {
    const img = figure.current;
    if (!loupe || !img?.naturalWidth) return;
    const box = img.getBoundingClientRect();
    const stage = e.currentTarget.getBoundingClientRect();
    const scale = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const left = box.left + (box.width - w) / 2;
    const top = box.bottom - h;
    setLens({
      x: e.clientX - stage.left,
      y: e.clientY - stage.top,
      style: {
        backgroundImage: `url("${img.currentSrc}")`,
        backgroundSize: `${w * ZOOM}px ${h * ZOOM}px`,
        backgroundPosition: `${LENS - (e.clientX - left) * ZOOM}px ${LENS - (e.clientY - top) * ZOOM}px`,
      },
    });
  };

  return (
    <>
      <div className="wc-floor" aria-hidden="true" />
      <div className={`wc-stage ${loupe ? "is-loupe" : ""}`} onPointerMove={moveLens} onPointerLeave={() => setLens(null)}>
        <div className={`wc-figure ${busy ? "is-busy" : ""}`}>
          <img ref={figure} src={look ?? current.image} alt="" draggable={false} />
        </div>

        {/* The chosen piece appears on the body at once, while the finished look is prepared. */}
        {busy && preview && ZONE[preview.category] && (
          <div className="wc-figure-box">
            <img className="wc-preview" src={preview.image} alt="" style={preview.category === "pants-skirts" ? LOWER_PREVIEW : { top: ZONE[preview.category]!.top, height: ZONE[preview.category]!.height }} draggable={false} />
          </div>
        )}

        {!busy && !loupe && (
          <div className="wc-figure-box">
            {reachable.map((l) => (
              <div key={l.ref} className="wc-zone" style={ZONE[l.category]}>
                <button type="button" className="wc-x" aria-label={t.podium.remove} onClick={() => onRemove(l.ref)}>×</button>
              </div>
            ))}
          </div>
        )}

        {busy && (
          <div className="wc-curating">
            <div className="wc-curating-card glass">
              <span className="font-serif text-lg">{t.podium.curating}</span>
              <span className="wc-skeleton" />
            </div>
          </div>
        )}
        {loupe && lens && <div className="wc-lens" style={{ left: lens.x, top: lens.y, ...lens.style }} />}
      </div>

      <div className={`wc-tool glass wc-layers ${listOpen ? "is-open" : ""}`}>
        <button type="button" className="wc-layers-head" aria-expanded={listOpen} onClick={() => setListOpen((v) => !v)}>
          {t.podium.layers}
          {layers.length > 0 && <span className="wc-layers-count"> · {layers.length}</span>}
        </button>
        {layers.length === 0 && <p className="wc-layers-empty text-[0.7rem] text-text-2">{t.podium.noLayers}</p>}
        {layers.map((l) => {
          const fit = smartFit(current.measurements, current.gender, l.category, l.size, l.fit);
          return (
            <div key={l.ref} className="wc-layer-row">
              <span className="min-w-0">
                <span className="block truncate">{l.name ?? t.cat[l.category]}</span>
                {fit && <span className={`wc-fit is-${fit}`} title={t.fit.help}>{t.fit[fit]}</span>}
              </span>
              <button type="button" aria-label={t.podium.remove} onClick={() => onRemove(l.ref)}>×</button>
            </div>
          );
        })}
        {layers.length > 0 && (
          <button type="button" className="wc-reset mt-1 cursor-pointer text-[0.68rem] text-accent" onClick={onReset}>{t.podium.reset}</button>
        )}
      </div>

      <div className="wc-tool right-3 top-3 flex flex-col items-end gap-1.5">
        <button type="button" className="btn btn-ghost wc-mini" aria-pressed={loupe} onClick={() => { setLoupe((v) => !v); setLens(null); }}>
          {t.podium.loupe}
        </button>
        {canSave && layers.length > 0 && !busy && (
          <button type="button" className="btn btn-ghost wc-mini" onClick={() => setSaving(true)}>{t.saveLook}</button>
        )}
      </div>

      <div className="wc-avatars" role="group" aria-label={t.podium.avatar}>
        {avatars.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`wc-avatar ${a.own ? "is-own" : ""}`}
            aria-pressed={a.id === current.id}
            aria-label={a.name ?? (a.own ? t.yours : a.age === "teen" ? `${t.teen} ${a.id}` : a.id)}
            title={a.name ?? undefined}
            onClick={() => onAvatar(a.id)}
          >
            <img src={a.image} alt="" loading="lazy" />
          </button>
        ))}
        <Link href={avatarHref} className="wc-avatar wc-avatar-add" aria-label="+">+</Link>
      </div>

      {saving && <SaveLook t={t} onClose={() => setSaving(false)} onSave={onSave} />}
    </>
  );
}

function SaveLook({ t, onClose, onSave }: { t: Text; onClose: () => void; onSave: (name: string, occasion: Occasion | null) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [sending, setSending] = useState(false);
  return (
    <div className="wc-modal" role="dialog" aria-modal="true" aria-label={t.saveTitle}>
      <div className="wc-dialog glass flex flex-col gap-3.5">
        <h2 className="font-serif text-2xl">{t.saveTitle}</h2>
        <input className="field" placeholder={t.lookName} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        <div>
          <p className="mb-1.5 text-xs text-text-2">{t.occasion}</p>
          <div className="flex flex-wrap gap-1.5">
            {OCCASIONS.map((o) => (
              <button key={o} type="button" className="wc-option" aria-pressed={o === occasion} onClick={() => setOccasion(o === occasion ? null : o)}>
                {t.occasions[o]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-ghost" disabled={sending} onClick={onClose}>{t.cancel}</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={sending}
            onClick={async () => {
              setSending(true);
              if (await onSave(name.trim(), occasion)) onClose();
              else setSending(false);
            }}
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
