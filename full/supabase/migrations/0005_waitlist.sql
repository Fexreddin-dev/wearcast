-- WearCast prototype: "Be the first to know" emails from the public page.
-- Run once in Supabase > SQL Editor, after 0004_look_history.sql. Safe to run twice.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) <= 254),
  locale text check (locale in ('en', 'az', 'tr')),
  created_at timestamptz not null default now()
);

-- Written only by the server (secret key); nobody can read or write it from the browser.
alter table public.waitlist enable row level security;
