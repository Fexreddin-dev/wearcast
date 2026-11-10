-- WearCast Phase 4: Daily Curated Look history (own wardrobe and trends), kept while the weather stays alike.
-- Run once in Supabase > SQL Editor, after 0003_avatars_outfits.sql. Safe to run twice.

create table if not exists public.look_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('wardrobe', 'trend')),
  audience text not null check (audience in ('men', 'women', 'hijab', 'teen_boys', 'teen_girls')),
  band text not null,                       -- weather group, e.g. "5..10|10..15|rain|calm"
  city text,
  refs text[] not null default '{}',        -- pieces to dress: own uuids or "demo:..." samples
  pieces jsonb not null default '[]',       -- trend pieces: category, colour, names, closest own piece
  note jsonb not null default '{}',         -- one sentence in en / az / tr
  why jsonb not null default '{}',          -- weather, harmony, layers: each in en / az / tr
  changed boolean not null default false,   -- made because the person asked for another look
  created_at timestamptz not null default now()
);
create index if not exists look_history_lookup on public.look_history (user_id, source, audience, created_at desc);

-- Written only by the server; owners read their own.
alter table public.look_history enable row level security;
drop policy if exists look_history_select on public.look_history;
create policy look_history_select on public.look_history for select to authenticated using (user_id = auth.uid());
