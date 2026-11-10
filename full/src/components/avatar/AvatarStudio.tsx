"use client";
/* eslint-disable @next/next/no-img-element -- private signed images and transparent cut-outs */

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import {
  type AgeGroup,
  type AvatarCard,
  BASE_AVATARS,
  type BaseAvatar,
  avatarSrc,
  baseInfo,
  customPrompt,
  defaultMeasurements,
  FACE_SHAPES,
  type Gender,
  HAIR_STYLES,
  HIJAB_STYLES,
  MEASURE_KEYS,
  MEASURE_RANGE,
  type Measurements,
  SKIN_TONES,
  type StudioError,
} from "@/lib/wardrobe/catalog";
import { Options } from "@/components/wardrobe/Closet";
import { callApi } from "@/components/wardrobe/WardrobeStudio";
import "@/components/wardrobe/wardrobe.css";
import "./avatar.css";

type T = Dictionary["avatar"];
type W = Dictionary["wardrobe"];
const ANGLES = ["front", "side", "back"] as const;
// Swatch colours only illustrate the choice; the picture itself is made from the words.
const SWATCH: Record<(typeof SKIN_TONES)[number], string> = {
  porcelain: "#f3dccb",
  light: "#e8c3a2",
  medium: "#cf9f78",
  olive: "#b88a5c",
  tan: "#956541",
  deep: "#5b3a26",
};

export default function AvatarStudio({
  locale, t, w, avatars: initial, credits, preview,
}: {
  locale: Locale;
  t: T;
  w: W;
  avatars: AvatarCard[];
  credits: number;
  preview: boolean;
}) {
  const router = useRouter();
  const [avatars, setAvatars] = useState(initial);
  const [tab, setTab] = useState<"photo" | "custom">("photo");
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const nextToast = useRef(0);

  const toast = useCallback((text: string) => {
    const id = ++nextToast.current;
    setToasts((all) => [...all, { id, text }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 4600);
  }, []);
  const showError = useCallback(
    (e: unknown) => {
      const code = (e instanceof Error ? e.message : "failed") as StudioError;
      toast(w.errors[code as keyof W["errors"]] ?? w.errors.failed);
    },
    [toast, w],
  );

  const created = (avatar: AvatarCard, plain: boolean) => {
    setAvatars((all) => [avatar, ...all]);
    toast(plain ? t.createdPlain : t.created);
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await callApi(`/api/avatars/${id}`, { method: "DELETE" });
      setAvatars((all) => all.filter((a) => a.id !== id));
      toast(t.deleted);
    } catch (e) {
      showError(e);
    }
  };

  return (
    <div className="av-page">
      <section className="glass av-mine">
        <h1 className="font-serif text-3xl">{t.title}</h1>
        <p className="mt-1 text-xs leading-relaxed text-text-2">{t.intro}</p>
        <h2 className="mt-5 mb-2 text-[0.68rem] font-medium tracking-[0.18em] uppercase">{t.mine}</h2>
        {avatars.length === 0 && <p className="py-6 text-xs text-text-2">{t.empty}</p>}
        <div className="av-grid">
          {avatars.map((a) => (
            <article key={a.id} className="av-card">
              <div className="av-card-stage">
                <img src={a.image} alt={a.name ?? ""} loading="lazy" />
              </div>
              <div className="flex items-center gap-1.5 px-1 pt-2">
                <span className="truncate text-xs font-medium">{a.name ?? w.yours}</span>
                {a.age === "teen" && <span className="av-badge">{w.teen}</span>}
                {a.modest && <span className="av-badge">{t.modest.split(" (")[0]}</span>}
              </div>
              <div className="flex gap-1.5 p-1 pt-2">
                <Link href={`/${locale}/wardrobe?avatar=${a.id}`} className="btn btn-primary wc-mini flex-1 justify-center">{t.dress}</Link>
                <button type="button" className="btn btn-ghost wc-mini" onClick={() => remove(a.id)}>{t.delete}</button>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-4 text-[0.68rem] leading-relaxed text-text-2">{t.privacy}</p>
      </section>

      <section className="glass av-make">
        <div className="av-tabs" role="tablist">
          {(["photo", "custom"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className="av-tab" onClick={() => setTab(k)}>
              {k === "photo" ? t.fromPhoto : t.customize}
            </button>
          ))}
        </div>
        {tab === "photo" ? (
          <PhotoForm t={t} w={w} credits={credits} preview={preview} onCreated={created} onError={showError} />
        ) : (
          <CustomForm t={t} w={w} credits={credits} preview={preview} onCreated={created} onError={showError} />
        )}
      </section>

      <div className="wc-toasts" role="status" aria-live="polite">
        {toasts.map((x) => (
          <div key={x.id} className="wc-toast glass">{x.text}</div>
        ))}
      </div>
    </div>
  );
}

type FormProps = {
  t: T;
  w: W;
  credits: number;
  preview: boolean;
  onCreated: (a: AvatarCard, plain: boolean) => void;
  onError: (e: unknown) => void;
};

async function send(mode: "photo" | "custom", data: unknown, files: Partial<Record<string, File>> = {}) {
  const form = new FormData();
  form.set("mode", mode);
  form.set("data", JSON.stringify(data));
  for (const [k, f] of Object.entries(files)) if (f) form.set(k, f);
  return callApi<{ avatar: AvatarCard; plain: boolean }>("/api/avatars", { method: "POST", body: form });
}

function PhotoForm({ t, w, credits, preview, onCreated, onError }: FormProps) {
  const [files, setFiles] = useState<Partial<Record<(typeof ANGLES)[number], File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<(typeof ANGLES)[number], string>>>({});
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [age, setAge] = useState<AgeGroup>("adult");
  const [modest, setModest] = useState(false);
  const [studio, setStudio] = useState(true);
  const [consent, setConsent] = useState(false);
  const [m, setM] = useState<Measurements>(defaultMeasurements("female", "adult"));
  const [saving, setSaving] = useState(false);

  const reset = (g: Gender, a: AgeGroup) => setM(defaultMeasurements(g, a));
  const pick = (angle: (typeof ANGLES)[number], file?: File) => {
    if (!file) return;
    setFiles((f) => ({ ...f, [angle]: file }));
    setPreviews((p) => {
      if (p[angle]) URL.revokeObjectURL(p[angle]!);
      return { ...p, [angle]: URL.createObjectURL(file) };
    });
  };

  const submit = async () => {
    setSaving(true);
    try {
      const res = await send("photo", { name: name.trim() || undefined, gender, age, modest, studio, consent, measurements: m }, files);
      onCreated(res.avatar, studio && res.plain);
      setFiles({});
      setPreviews({});
      setName("");
      setConsent(false);
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  };

  const needsCredit = studio && Number.isFinite(credits);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-xs text-text-2">{t.photos}</p>
        <div className="grid grid-cols-3 gap-2">
          {ANGLES.map((a) => (
            <label key={a} className="wc-photo">
              {previews[a] ? <img src={previews[a]} alt="" /> : <span>{t[a]}{a === "front" ? " *" : ""}</span>}
              <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={t[a]} onChange={(e) => pick(a, e.target.files?.[0])} />
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[0.7rem] leading-relaxed text-text-2">{t.photoHint}</p>
      </div>
      <input className="field" placeholder={t.name} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Options label={t.gender} values={["female", "male"] as const} value={gender} onChange={(g) => { setGender(g); if (g === "male") setModest(false); reset(g, age); }} text={(g) => t[g]} />
        <Options label={t.age} values={["adult", "teen"] as const} value={age} onChange={(a) => { setAge(a); reset(gender, a); }} text={(a) => t[a]} />
      </div>
      {age === "teen" && <p className="text-[0.7rem] text-text-2">{t.teenNote}</p>}
      {gender === "female" && (
        <Toggle checked={modest} onChange={setModest} label={t.modest} help={t.modestHelp} />
      )}
      <Toggle checked={studio} onChange={setStudio} label={t.studio} help={t.studioHelp} />
      <Body t={t} m={m} onChange={setM} />
      <Toggle checked={consent} onChange={setConsent} label={t.consent} />
      <Footer t={t} cost={needsCredit} saving={saving} disabled={preview || saving || !files.front || !consent || (needsCredit && credits < 1)} noCredit={needsCredit && credits < 1 ? w.errors.no_credits : null} onSubmit={submit} />
    </div>
  );
}

function CustomForm({ t, w, credits, preview, onCreated, onError }: FormProps) {
  const [base, setBase] = useState<BaseAvatar>("f1");
  const [name, setName] = useState("");
  const [skin, setSkin] = useState<"keep" | (typeof SKIN_TONES)[number]>("keep");
  const [hair, setHair] = useState<(typeof HAIR_STYLES)[number]>("keep");
  const [face, setFace] = useState<(typeof FACE_SHAPES)[number]>("keep");
  const [hijab, setHijab] = useState<(typeof HIJAB_STYLES)[number]>("keep");
  const [m, setM] = useState<Measurements>(defaultMeasurements("female", "adult"));
  const [saving, setSaving] = useState(false);
  const info = baseInfo(base);

  const choose = (id: BaseAvatar) => {
    const i = baseInfo(id);
    setBase(id);
    setM(defaultMeasurements(i.gender, i.age));
    setHair("keep");
    setHijab("keep");
  };
  const hairs = HAIR_STYLES.filter((h) => h !== "beard" || (info.gender === "male" && info.age === "adult"));
  const changes = customPrompt(base, { skin: skin === "keep" ? undefined : skin, hair, face, hijab }, m) !== null;

  const submit = async () => {
    setSaving(true);
    try {
      const res = await send("custom", { name: name.trim() || undefined, base, skin, hair, face, hijab, measurements: m });
      onCreated(res.avatar, false);
      setName("");
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  };

  const needsCredit = changes && Number.isFinite(credits);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-xs text-text-2">{t.base}</p>
        <div className="av-bases">
          {BASE_AVATARS.map((id) => (
            <button key={id} type="button" className="wc-avatar av-base" aria-pressed={id === base} aria-label={id} onClick={() => choose(id)}>
              <img src={avatarSrc(id, "front")} alt="" loading="lazy" />
            </button>
          ))}
        </div>
        {info.age === "teen" && <p className="mt-1.5 text-[0.7rem] text-text-2">{t.teenNote}</p>}
      </div>
      <input className="field" placeholder={t.name} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      <div>
        <p className="mb-1.5 text-xs text-text-2">{t.skin}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="wc-option" aria-pressed={skin === "keep"} onClick={() => setSkin("keep")}>{t.hairs.keep}</button>
          {SKIN_TONES.map((s) => (
            <button key={s} type="button" className="av-swatch" aria-pressed={skin === s} aria-label={t.tones[s]} title={t.tones[s]} style={{ background: SWATCH[s] }} onClick={() => setSkin(s)} />
          ))}
        </div>
      </div>
      {info.modest ? (
        <Options label={t.hijab} values={HIJAB_STYLES} value={hijab} onChange={setHijab} text={(h) => t.hijabs[h]} />
      ) : (
        <Options label={t.hair} values={hairs} value={hair} onChange={setHair} text={(h) => t.hairs[h]} />
      )}
      <Options label={t.face} values={FACE_SHAPES} value={face} onChange={setFace} text={(f) => t.faces[f]} />
      <Body t={t} m={m} onChange={setM} />
      <Footer t={t} cost={needsCredit} saving={saving} disabled={preview || saving || (needsCredit && credits < 1)} noCredit={needsCredit && credits < 1 ? w.errors.no_credits : null} onSubmit={submit} />
    </div>
  );
}

function Toggle({ checked, onChange, label, help }: { checked: boolean; onChange: (v: boolean) => void; label: string; help?: string }) {
  return (
    <label className="av-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-xs font-medium">{label}</span>
        {help && <span className="mt-0.5 block text-[0.7rem] leading-relaxed text-text-2">{help}</span>}
      </span>
    </label>
  );
}

function Body({ t, m, onChange }: { t: T; m: Measurements; onChange: (m: Measurements) => void }) {
  return (
    <details className="av-body" open>
      <summary className="cursor-pointer text-xs font-medium">{t.body}</summary>
      <p className="mt-1 text-[0.7rem] text-text-2">{t.bodyHelp}</p>
      <div className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2">
        {MEASURE_KEYS.map((k) => (
          <label key={k} className="av-range">
            <span className="flex justify-between text-[0.72rem]">
              <span>{t.m[k]}</span>
              <span className="text-text-2">{m[k]} {k === "weight" ? "kg" : "cm"}</span>
            </span>
            <input
              type="range"
              min={MEASURE_RANGE[k][0]}
              max={MEASURE_RANGE[k][1]}
              value={m[k]}
              onChange={(e) => onChange({ ...m, [k]: Number(e.target.value) })}
            />
          </label>
        ))}
      </div>
    </details>
  );
}

function Footer({ t, cost, saving, disabled, noCredit, onSubmit }: { t: T; cost: boolean; saving: boolean; disabled: boolean; noCredit: string | null; onSubmit: () => void }) {
  return (
    <div className="flex flex-col gap-2 border-t border-[rgba(120,100,70,0.16)] pt-3">
      <p className="text-[0.7rem] text-text-2">{noCredit ?? (cost ? t.cost : t.costFree)}</p>
      <button type="button" className="btn btn-primary w-full" disabled={disabled} onClick={onSubmit}>
        {saving ? t.creating : t.submit}
      </button>
    </div>
  );
}
