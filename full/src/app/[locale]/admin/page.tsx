import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { revokeAccess, setBudgetCap } from "@/app/actions/admin";
import AdminShareForm from "@/components/AdminShareForm";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { currentUser, isOwnerUser, isUnlimitedUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass p-5">
      <p className="text-[0.68rem] uppercase tracking-widest text-text-2">{label}</p>
      <p className="mt-1 font-serif text-3xl">{value}</p>
    </div>
  );
}

async function AdminContent({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const user = await currentUser();
  // Anyone without access gets a plain 404, so the page does not reveal that it exists.
  if (!isUnlimitedUser(user)) notFound();
  const t = dict.admin;
  const owner = isOwnerUser(user);
  const admin = createAdminClient();

  const [{ data: users }, { data: costs }, { data: cap }, waitlist] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("cost_log").select("cost_usd").eq("provider", "fal"),
    admin.from("app_settings").select("value").eq("key", "fal_budget_cap_usd").maybeSingle(),
    admin.from("waitlist").select("email, locale, created_at").order("created_at", { ascending: false }).limit(200),
  ]);
  const spent = (costs ?? []).reduce((s, r) => s + Number(r.cost_usd), 0);
  const shared = (users?.users ?? []).filter((u) => u.app_metadata?.wearcast_unlimited === true);

  return (
    <section className="mx-auto mt-8 flex max-w-4xl flex-col gap-5 px-4 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">{t.title}</h1>
          <p className="mt-1 text-sm text-text-2">{t.unlimitedNote}</p>
        </div>
        <Link href={`/${locale}/wardrobe`} className="btn btn-primary">{t.openStudio}</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t.users} value={users?.users.length ?? 0} />
        <Stat label={t.spent} value={`$${spent.toFixed(2)}`} />
        <Stat label={t.cap} value={`$${Number(cap?.value ?? 0).toFixed(2)}`} />
        <Stat label={t.remaining} value={`$${Math.max(0, Number(cap?.value ?? 0) - spent).toFixed(2)}`} />
      </div>
      {Number(cap?.value ?? 0) <= spent && <p className="text-sm text-danger">{t.capReached}</p>}

      <div className="glass flex flex-col gap-3 p-5">
        <h2 className="font-serif text-2xl">{t.waitlist}{waitlist.data?.length ? ` · ${waitlist.data.length}` : ""}</h2>
        {waitlist.error ? (
          <p className="text-sm text-text-2">{t.waitlistMissing}</p>
        ) : !waitlist.data?.length ? (
          <p className="text-sm text-text-2">{t.waitlistEmpty}</p>
        ) : (
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto text-sm">
            {waitlist.data.map((w) => (
              <li key={w.email} className="flex justify-between gap-3">
                <span className="break-all">{w.email}</span>
                <span className="whitespace-nowrap text-text-2">{(w.locale ?? "").toUpperCase()} · {String(w.created_at).slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {owner && (
        <>
          <div className="glass flex flex-col gap-3 p-5">
            <h2 className="font-serif text-2xl">{t.share}</h2>
            <p className="text-sm text-text-2">{t.shareHelp}</p>
            <AdminShareForm t={t} />
            {shared.length === 0 && <p className="text-xs text-text-2">{t.nobody}</p>}
            <ul className="flex flex-col">
              {shared.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="truncate">{u.email}</span>
                  <form action={revokeAccess}>
                    <input type="hidden" name="id" value={u.id} />
                    <button className="btn btn-ghost" type="submit">{t.revoke}</button>
                  </form>
                </li>
              ))}
            </ul>
          </div>

          <form action={setBudgetCap} className="glass flex flex-col gap-3 p-5">
            <h2 className="font-serif text-2xl">{t.cap}</h2>
            <p className="text-sm text-text-2">{t.capHelp}</p>
            <div className="flex gap-2">
              <input className="field" type="number" name="cap" min="0" max="1000" step="0.1" defaultValue={Number(cap?.value ?? 0)} aria-label={t.cap} />
              <button className="btn btn-primary" type="submit">{t.save}</button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}

async function Gate({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <AdminContent dict={getDictionary(locale)} locale={locale} />;
}

export default function AdminPage(props: PageProps<"/[locale]/admin">) {
  return (
    <Suspense fallback={null}>
      <Gate {...props} />
    </Suspense>
  );
}
