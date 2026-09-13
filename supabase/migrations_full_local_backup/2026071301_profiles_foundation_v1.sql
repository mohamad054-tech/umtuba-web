-- UMTUBA Backend Foundation V1: extend profiles + avatars storage
-- Additive only. Safe to re-run. Does not drop existing tables or data.
-- Apply in Supabase SQL Editor after 20260712_auth_profiles_posts_rls.sql.

-- ---------------------------------------------------------------------------
-- 1. Extend public.profiles for Foundation V1 fields
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists bio text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists avatar_url text,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill display_name from full_name when missing.
update public.profiles
set display_name = coalesce(nullif(trim(display_name), ''), full_name)
where display_name is null or trim(display_name) = '';

-- Align username format with signup UI (letters, numbers, dots, underscores).
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format check (
    username ~ '^[a-z0-9._]{3,24}$'
  );

-- Case-insensitive uniqueness (usernames are stored lowercase; this guards edge cases).
create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username));

create index if not exists profiles_username_idx
  on public.profiles (username);

-- ---------------------------------------------------------------------------
-- 2. updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Signup trigger: create profile from auth metadata
--    Handles duplicate usernames by falling back to a unique user_* handle.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_full_name text;
  raw_display_name text;
  raw_username text;
  safe_username text;
  safe_display_name text;
  safe_full_name text;
  initial text;
  attempt int := 0;
begin
  raw_full_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  raw_display_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  raw_username := lower(nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), ''));

  safe_display_name := coalesce(
    raw_display_name,
    raw_full_name,
    split_part(new.email, '@', 1),
    'UMTUBA User'
  );
  safe_full_name := coalesce(raw_full_name, safe_display_name);
  safe_username := coalesce(raw_username, 'user_' || substr(replace(new.id::text, '-', ''), 1, 12));

  if safe_username !~ '^[a-z0-9._]{3,24}$' then
    safe_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;

  initial := upper(substr(safe_display_name, 1, 1));
  if initial is null or initial = '' then
    initial := 'U';
  end if;

  loop
    begin
      insert into public.profiles (
        id,
        username,
        display_name,
        full_name,
        bio,
        city,
        country,
        avatar_url,
        avatar_initial
      )
      values (
        new.id,
        safe_username,
        safe_display_name,
        safe_full_name,
        null,
        null,
        null,
        null,
        initial
      )
      on conflict (id) do nothing;

      exit;
    exception
      when unique_violation then
        attempt := attempt + 1;
        if attempt > 5 then
          safe_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
        else
          safe_username := left(
            'u_' || substr(replace(new.id::text, '-', ''), 1, 10) || attempt::text,
            24
          );
        end if;
    end;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. RLS (re-assert Foundation V1 policies; auth.uid() null-safe)
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles
  for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = id);

-- No delete policy: users cannot delete arbitrary profiles via the client.

-- ---------------------------------------------------------------------------
-- 5. Avatars storage bucket (optional until applied in Dashboard/SQL)
--    Uploads must live under: {user_id}/{filename}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read access for avatars" on storage.objects;
drop policy if exists "Users can upload own avatar folder" on storage.objects;
drop policy if exists "Users can update own avatar folder" on storage.objects;
drop policy if exists "Users can delete own avatar folder" on storage.objects;

create policy "Public read access for avatars"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy "Users can upload own avatar folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can update own avatar folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'avatars'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete own avatar folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
