-- WearCast Phase 4: own avatars (photo or customised base), saved outfits, garment coverage for age/modest rules.
-- Run once in Supabase > SQL Editor, after 0002_wardrobe.sql. Safe to run twice.

-- ───────── Avatars ─────────
-- kind: 'base'   = internal row for a shipped avatar (m1, f2 ...), used only to link try-on results
--       'custom' = a shipped avatar adjusted by the owner (skin, hair, body)
--       'photo'  = made from the owner's own photo
alter table public.avatars add column if not exists kind text not null default 'base';
alter table public.avatars drop constraint if exists avatars_kind_check;
alter table public.avatars add constraint avatars_kind_check check (kind in ('base', 'custom', 'photo'));
alter table public.avatars add column if not exists gender text;
alter table public.avatars drop constraint if exists avatars_gender_check;
alter table public.avatars add constraint avatars_gender_check check (gender is null or gender in ('male', 'female'));
alter table public.avatars add column if not exists age_group public.age_group not null default 'adult';
alter table public.avatars add column if not exists modest boolean not null default false;
alter table public.avatars add column if not exists image_path text;   -- finished cut-out in 'user-photos'
alter table public.avatars add column if not exists status public.gen_status not null default 'done';

-- Avatars are created and changed only by the server (it checks photos, credits and storage paths).
drop policy if exists avatars_all on public.avatars;
drop policy if exists avatars_select on public.avatars;
create policy avatars_select on public.avatars for select to authenticated using (user_id = auth.uid());

-- Avatar photos are written only by the server too; owners can still read their own files.
drop policy if exists "own files insert" on storage.objects;
create policy "own files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own files update" on storage.objects;
create policy "own files update" on storage.objects for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own files delete" on storage.objects;
create policy "own files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────── Saved outfits ─────────
-- refs keeps sample pieces ("demo:...") as well as own pieces; avatar is a base id or an avatar uuid.
alter table public.outfits add column if not exists refs text[] not null default '{}';
alter table public.outfits add column if not exists avatar text;
-- Outfits are written through the server, which checks the pieces belong to the owner.
drop policy if exists outfits_all on public.outfits;
drop policy if exists outfits_select on public.outfits;
create policy outfits_select on public.outfits for select to authenticated using (user_id = auth.uid());

-- ───────── Garment coverage (sleeves, neckline, length), filled by the server ─────────
alter table public.wardrobe_items add column if not exists coverage jsonb;
