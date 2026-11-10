"use client";
/* eslint-disable @next/next/no-img-element -- transparent avatars and private signed results */

import { useRef, useState, type PointerEvent } from "react";
import { avatarSrc, BASE_AVATARS, type BaseAvatar, type Category, type WardrobeItem } from "@/lib/wardrobe/catalog";
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
  t, avatar, onAvatar, look, layers, busy, preview, onRemove, onReset,
}: {
  t: Text;
  avatar: BaseAvatar;
  onAvatar: (id: BaseAvatar) => void;
  look: string | null;
  layers: WardrobeItem[];
  busy: boolean;
  preview: WardrobeItem | null;
  onRemove: (ref: string) => void;
  onReset: () => void;
}) {
  const [loupe, setLoupe] = useState(false);
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
          <img ref={figure} src={look ?? avatarSrc(avatar, "front")} alt="" draggable={false} />
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

      <div className="wc-tool glass wc-layers">
        <p className="mb-1 text-[0.62rem] uppercase tracking-widest text-text-2">{t.podium.layers}</p>
        {layers.length === 0 && <p className="text-[0.7rem] text-text-2">{t.podium.noLayers}</p>}
        {layers.map((l) => (
          <div key={l.ref} className="wc-layer-row">
            <span className="truncate">{l.name ?? t.cat[l.category]}</span>
            <button type="button" aria-label={t.podium.remove} onClick={() => onRemove(l.ref)}>×</button>
          </div>
        ))}
        {layers.length > 0 && (
          <button type="button" className="mt-1 cursor-pointer text-[0.68rem] text-accent" onClick={onReset}>{t.podium.reset}</button>
        )}
      </div>

      <div className="wc-tool right-3 top-3">
        <button type="button" className="btn btn-ghost wc-mini" aria-pressed={loupe} onClick={() => { setLoupe((v) => !v); setLens(null); }}>
          {t.podium.loupe}
        </button>
      </div>

      <div className="wc-avatars" role="group" aria-label={t.podium.avatar}>
        {BASE_AVATARS.map((id) => (
          <button key={id} type="button" className="wc-avatar" aria-pressed={id === avatar} aria-label={id} onClick={() => onAvatar(id)}>
            <img src={avatarSrc(id, "front")} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </>
  );
}
