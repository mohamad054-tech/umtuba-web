-- UMTUBA P0: profiles, posts.user_id, and Row Level Security
-- Apply this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS patterns.

-- ---------------------------------------------------------------------------
-- 1. Profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  username text not null,
  avatar_initial text not null default 'U',
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username ~ '^[a-z0-9_]{3,24}$'
  ),
  constraint profiles_username_unique unique (username)
);

create index if not exists profiles_username_idx
  on public.profiles (username);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles
  for select
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- Create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_full_name text;
  raw_username text;
  safe_username text;
  safe_full_name text;
  initial text;
begin
  raw_full_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  raw_username := lower(nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), ''));

  safe_full_name := coalesce(raw_full_name, split_part(new.email, '@', 1), 'UMTUBA User');
  safe_username := coalesce(raw_username, 'user_' || substr(replace(new.id::text, '-', ''), 1, 12));

  if safe_username !~ '^[a-z0-9_]{3,24}$' then
    safe_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;

  initial := upper(substr(safe_full_name, 1, 1));
  if initial is null or initial = '' then
    initial := 'U';
  end if;

  insert into public.profiles (id, full_name, username, avatar_initial)
  values (new.id, safe_full_name, safe_username, initial)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. Posts: add user_id and secure RLS
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists posts_user_id_idx on public.posts (user_id);
create index if not exists posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

-- Remove any previous open policies if they exist under common names.
drop policy if exists "Enable read access for all users" on public.posts;
drop policy if exists "Enable insert for all users" on public.posts;
drop policy if exists "Enable insert for authenticated users only" on public.posts;
drop policy if exists "Public posts are viewable by everyone" on public.posts;
drop policy if exists "Authenticated users can create posts" on public.posts;
drop policy if exists "Users can update their own posts" on public.posts;
drop policy if exists "Users can delete their own posts" on public.posts;
drop policy if exists "Posts are viewable by everyone" on public.posts;
drop policy if exists "Users can insert their own posts" on public.posts;

create policy "Posts are viewable by everyone"
  on public.posts
  for select
  using (true);

create policy "Users can insert their own posts"
  on public.posts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own posts"
  on public.posts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own posts"
  on public.posts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 3. Storage bucket: post-images (public read for feed <img> URLs)
--    Uploads must live under: {user_id}/{filename}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read access for post images" on storage.objects;
drop policy if exists "Users can upload into own folder" on storage.objects;
drop policy if exists "Users can update own folder" on storage.objects;
drop policy if exists "Users can delete own folder" on storage.objects;
drop policy if exists "Anyone can upload post images" on storage.objects;
drop policy if exists "Anyone can update post images" on storage.objects;
drop policy if exists "Anyone can delete post images" on storage.objects;

create policy "Public read access for post images"
  on storage.objects
  for select
  using (bucket_id = 'post-images');

create policy "Users can upload into own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can update own folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete own folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
