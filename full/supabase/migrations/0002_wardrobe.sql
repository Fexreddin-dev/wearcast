-- WearCast Phase 3: wardrobe limits, 3-day trial, daily looks, try-on cache lookups.
-- Run once in Supabase > SQL Editor, after 0001_init.sql.

-- ───────── Categories now match the UI and manifest.json ─────────
alter table public.wardrobe_items drop constraint if exists wardrobe_items_category_check;
update public.wardrobe_items set category = case category
  when 'jackets' then 'jackets-coats'
  when 'tops' then 'shirts-tops'
  when 'bottoms' then 'pants-skirts'
  when 'headwear' then 'hijab-headwear'
  else category end;
alter table public.wardrobe_items add constraint wardrobe_items_category_check
  check (category in ('jackets-coats','shirts-tops','pants-skirts','dresses','hijab-headwear','shoes','accessories'));

-- ───────── Wardrobe rows are created only by the server, so plan limits cannot be skipped ─────────
drop policy if exists wardrobe_all on public.wardrobe_items;
create policy wardrobe_select on public.wardrobe_items for select to authenticated using (user_id = auth.uid());

-- Files in the 'wardrobe' bucket are written and removed only by the server too.
drop policy if exists "own files insert" on storage.objects;
create policy "own files insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('user-photos','receipts') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own files update" on storage.objects;
create policy "own files update" on storage.objects for update to authenticated
  using (bucket_id in ('user-photos','receipts') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own files delete" on storage.objects;
create policy "own files delete" on storage.objects for delete to authenticated
  using (bucket_id in ('user-photos','receipts') and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────── New users: 3-day trial with 2 free credits. No card, so nothing is ever charged. ─────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.subscriptions (user_id, plan, status, current_period_end)
    values (new.id, 'free', 'trial', now() + interval '3 days') on conflict do nothing;
  insert into public.credit_ledger (user_id, delta, reason, ref)
    values (new.id, 2, 'plan_grant', 'trial_grant') on conflict (user_id, ref) do nothing;
  return new;
end $$;

-- Accounts created before this migration get the same start.
update public.subscriptions
  set status = 'trial', current_period_end = now() + interval '3 days'
  where plan = 'free' and current_period_end is null;
insert into public.credit_ledger (user_id, delta, reason, ref)
  select user_id, 2, 'plan_grant', 'trial_grant' from public.subscriptions where plan = 'free'
  on conflict (user_id, ref) do nothing;

-- ───────── Plan helpers (server only) ─────────
create or replace function public.plan_is_active(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select status <> 'expired' and (current_period_end is null or current_period_end > now())
    from subscriptions where user_id = p_user
  ), false);
$$;

create or replace function public.wardrobe_limit(p_user uuid)
returns int language sql stable security definer set search_path = public as $$
  select (case plan when 'plus' then 24 when 'premium' then 50 else 8 end) + wardrobe_extra_slots
  from subscriptions where user_id = p_user;
$$;

-- Atomically takes one wardrobe slot. Returns the new row id, or null when the plan is
-- inactive or the wardrobe is full.
create or replace function public.reserve_wardrobe_item(
  p_user uuid, p_category text, p_name text, p_material text, p_size text, p_fit text
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('wardrobe:' || p_user::text));
  if not plan_is_active(p_user) then return null; end if;
  if (select count(*) from wardrobe_items where user_id = p_user) >= wardrobe_limit(p_user) then
    return null;
  end if;
  insert into wardrobe_items (user_id, category, name, material, size, fit, status)
    values (p_user, p_category, p_name, p_material, p_size, p_fit, 'processing')
    returning id into new_id;
  return new_id;
end $$;

revoke all on function public.plan_is_active(uuid) from public, anon, authenticated;
revoke all on function public.wardrobe_limit(uuid) from public, anon, authenticated;
revoke all on function public.reserve_wardrobe_item(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.plan_is_active(uuid) to service_role;
grant execute on function public.wardrobe_limit(uuid) to service_role;
grant execute on function public.reserve_wardrobe_item(uuid, text, text, text, text, text) to service_role;

-- ───────── Daily Curated Look: stored per day, so the model is not asked on every visit ─────────
create table public.daily_looks (
  user_id uuid not null references auth.users(id) on delete cascade,
  look_date date not null,
  city text,
  item_ids uuid[] not null default '{}',
  note text,
  shuffles int not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, look_date)
);
alter table public.daily_looks enable row level security;
create policy daily_looks_select on public.daily_looks for select to authenticated using (user_id = auth.uid());

-- ───────── Spending guard for try-on inside the app (same total as the asset scripts) ─────────
insert into public.app_settings (key, value) values ('fal_budget_cap_usd', '6.90'::jsonb)
on conflict (key) do update set value = excluded.value;
