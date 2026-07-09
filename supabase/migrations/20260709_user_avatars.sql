-- Urban Yards dashboard user avatar support.
-- Run after the dashboard security foundation migration.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists avatar_path text,
  add column if not exists avatar_updated_at timestamptz;

create index if not exists profiles_avatar_updated_at_idx
  on public.profiles (avatar_updated_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-avatars',
  'user-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read user avatars" on storage.objects;
create policy "public read user avatars"
  on storage.objects for select
  using (bucket_id = 'user-avatars');

drop policy if exists "users insert own avatars" on storage.objects;
create policy "users insert own avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'user-avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users update own avatars" on storage.objects;
create policy "users update own avatars"
  on storage.objects for update
  using (
    bucket_id = 'user-avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'user-avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete own avatars" on storage.objects;
create policy "users delete own avatars"
  on storage.objects for delete
  using (
    bucket_id = 'user-avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner/admin avatar writes are performed by Netlify Functions using the
-- Supabase service role key, which bypasses RLS after server-side role checks.
