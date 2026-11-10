-- WearCast initial schema: tables, RLS, credit functions, storage buckets.
-- Rule: every user-owned row is visible only to its owner. Writes that touch money/credits
-- go through the server (service_role) only.

create extension if not exists pgcrypto;

-- ───────── enums ─────────
create type public.plan_tier as enum ('free', 'starter', 'plus', 'premium');
create type public.sub_status as enum ('active', 'expired', 'trial');
create type public.order_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.order_kind as enum ('plan', 'credits', 'wardrobe_slots');
create type public.gen_status as enum ('queued', 'processing', 'done', 'failed');
create type public.age_group as enum ('adult', 'teen', 'child');

-- ───────── profiles ─────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'en' check (locale in ('en','az','tr')),
  gender text check (gender in ('male','female')),
  age_group public.age_group not null default 'adult',
  modest_mode boolean not null default false,
  city text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.subscriptions (user_id, plan, status) values (new.id, 'free', 'active') on conflict do nothing;
  return new;
end $$;

-- ───────── subscriptions ─────────
create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan public.plan_tier not null default 'free',
  status public.sub_status not null default 'active',
  wardrobe_extra_slots int not null default 0,
  current_period_end timestamptz,
  wardrobe_delete_after timestamptz, -- set when a paid plan lapses; wardrobe is purged after this
  updated_at timestamptz not null default now()
);

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────── credit ledger (balance = sum of delta) ─────────
create table public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null,
  reason text not null,            -- 'plan_grant' | 'addon' | 'tryon' | 'refund' | 'admin'
  ref text,                        -- idempotency key
  created_at timestamptz not null default now(),
  unique (user_id, ref)
);
create index on public.credit_ledger (user_id);

create or replace function public.credit_balance(p_user uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from public.credit_ledger where user_id = p_user;
$$;

-- Atomically spend credits. Returns true on success, false when balance is too low.
-- Idempotent on (user, ref): a repeated ref is treated as already spent.
create or replace function public.spend_credits(p_user uuid, p_amount int, p_ref text, p_reason text default 'tryon')
returns boolean language plpgsql security definer set search_path = public as $$
declare bal int;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  if exists (select 1 from credit_ledger where user_id = p_user and ref = p_ref) then
    return true;
  end if;
  select coalesce(sum(delta),0) into bal from credit_ledger where user_id = p_user;
  if bal < p_amount then return false; end if;
  insert into credit_ledger (user_id, delta, reason, ref) values (p_user, -p_amount, p_reason, p_ref);
  return true;
end $$;

-- Refund a previous spend (once).
create or replace function public.refund_credits(p_user uuid, p_amount int, p_spend_ref text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into credit_ledger (user_id, delta, reason, ref)
  values (p_user, p_amount, 'refund', 'refund:' || p_spend_ref)
  on conflict (user_id, ref) do nothing;
end $$;

revoke all on function public.credit_balance(uuid) from public, anon, authenticated;
revoke all on function public.spend_credits(uuid, int, text, text) from public, anon, authenticated;
revoke all on function public.refund_credits(uuid, int, text) from public, anon, authenticated;
grant execute on function public.credit_balance(uuid) to service_role;
grant execute on function public.spend_credits(uuid, int, text, text) to service_role;
grant execute on function public.refund_credits(uuid, int, text) to service_role;

-- Owner-callable read of their own balance.
create or replace function public.my_credit_balance()
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from public.credit_ledger where user_id = auth.uid();
$$;
revoke all on function public.my_credit_balance() from public, anon;
grant execute on function public.my_credit_balance() to authenticated;

-- ───────── avatars, wardrobe, generations, outfits ─────────
create table public.avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My avatar',
  base_avatar_id text,              -- one of the 12 shipped base avatars, or null for photo-based
  skin_tone text,
  face_shape text,
  hair_style text,
  hijab_style text,
  measurements jsonb not null default '{}'::jsonb, -- height, weight, shoulder, chest, belly, waist, hips
  photo_paths text[] not null default '{}',        -- storage paths in user-photos
  version int not null default 1,
  created_at timestamptz not null default now()
);
create index on public.avatars (user_id);

create table public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('jackets','tops','bottoms','dresses','headwear','shoes','accessories')),
  name text,
  material text,
  size text check (size in ('XS','S','M','L','XL','XXL')),
  fit text check (fit in ('slim','regular','oversize')),
  original_paths text[] not null default '{}',
  clean_path text,                  -- background removed + upscaled
  status public.gen_status not null default 'queued',
  created_at timestamptz not null default now()
);
create index on public.wardrobe_items (user_id);

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  avatar_id uuid not null references public.avatars(id) on delete cascade,
  item_ids uuid[] not null,
  cache_key text not null,
  status public.gen_status not null default 'queued',
  result_paths text[] not null default '{}',
  model text,
  cost_usd numeric(8,4) not null default 0,
  error text,
  created_at timestamptz not null default now(),
  unique (user_id, cache_key)
);
create index on public.generations (user_id);

create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  occasion text check (occasion in ('work','school','wedding','sport','casual','travel')),
  item_ids uuid[] not null default '{}',
  generation_id uuid references public.generations(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.outfits (user_id);

-- ───────── manual payment orders (M10 transfer, admin-approved) ─────────
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.order_kind not null,
  sku text not null,                       -- 'starter' | 'plus' | 'premium' | 'credits_5' | 'credits_10' | 'slots_10'
  amount_azn numeric(8,2) not null,        -- includes unique qəpik tag for matching
  status public.order_status not null default 'pending',
  receipt_path text,
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index on public.orders (user_id);

-- ───────── public content & settings ─────────
create table public.trends (
  id uuid primary key default gen_random_uuid(),
  week date not null,
  audience text not null check (audience in ('men','women','hijab','teen','kids')),
  title text not null,
  description text,
  image_path text not null,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null
);
insert into public.app_settings (key, value) values
  ('launch_discount', 'true'::jsonb),
  ('fal_budget_alert_usd', '2'::jsonb);

create table public.cost_log (
  id bigint generated always as identity primary key,
  provider text not null,
  model text,
  cost_usd numeric(8,4) not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- ───────── Row Level Security ─────────
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.avatars enable row level security;
alter table public.wardrobe_items enable row level security;
alter table public.generations enable row level security;
alter table public.outfits enable row level security;
alter table public.orders enable row level security;
alter table public.trends enable row level security;
alter table public.app_settings enable row level security;
alter table public.cost_log enable row level security;
alter table public.contact_messages enable row level security;

-- profiles: read/update own
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- subscriptions & ledger: read-only for owner (writes are server-side)
create policy subs_select on public.subscriptions for select to authenticated using (user_id = auth.uid());
create policy ledger_select on public.credit_ledger for select to authenticated using (user_id = auth.uid());

-- avatars, wardrobe, outfits: full CRUD on own rows
create policy avatars_all on public.avatars for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy wardrobe_all on public.wardrobe_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy outfits_all on public.outfits for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- generations: read own (created/updated by the server)
create policy gens_select on public.generations for select to authenticated using (user_id = auth.uid());

-- orders: read own, create own pending order, attach receipt to own pending order
create policy orders_select on public.orders for select to authenticated using (user_id = auth.uid());
create policy orders_insert on public.orders for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
create policy orders_update on public.orders for update to authenticated
  using (user_id = auth.uid() and status = 'pending') with check (user_id = auth.uid() and status = 'pending');

-- trends: public read (anon + authenticated)
create policy trends_read on public.trends for select to anon, authenticated using (true);

-- app_settings: public read of settings (discount flag etc.)
create policy settings_read on public.app_settings for select to anon, authenticated using (true);

-- cost_log, contact_messages: no client policies at all (service_role only).
-- Contact form submits through a server route using service_role.

-- ───────── Storage buckets & policies ─────────
insert into storage.buckets (id, name, public) values
  ('user-photos', 'user-photos', false),
  ('wardrobe',    'wardrobe',    false),
  ('generations', 'generations', false),
  ('receipts',    'receipts',    false),
  ('trends',      'trends',      true)
on conflict (id) do nothing;

-- Convention: object path = '<user_id>/...'. Owner-only access in the private buckets.
create policy "own files read" on storage.objects for select to authenticated
  using (bucket_id in ('user-photos','wardrobe','generations','receipts') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('user-photos','wardrobe','receipts') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files update" on storage.objects for update to authenticated
  using (bucket_id in ('user-photos','wardrobe','receipts') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files delete" on storage.objects for delete to authenticated
  using (bucket_id in ('user-photos','wardrobe','generations','receipts') and (storage.foldername(name))[1] = auth.uid()::text);
-- 'generations' is written only by the server (service_role); 'trends' is public-read, server-write.
