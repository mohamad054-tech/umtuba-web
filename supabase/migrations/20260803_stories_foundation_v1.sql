-- UMTUBA Story Foundation V1
-- Additive only. Private stories bucket + stories / story_views tables.
-- Privacy: owner + followers can read non-expired stories.
-- No music / stickers / reactions / replies / UM Points.
-- Fail-closed RLS. No privileged anon grants.

-- ---------------------------------------------------------------------------
-- 1) Helper: active-story visibility (owner or follower, not expired)
-- ---------------------------------------------------------------------------

create or replace function public.can_view_active_story(
  p_owner_id uuid,
  p_expires_at timestamptz
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select
    auth.uid() is not null
    and p_expires_at > now()
    and (
      auth.uid() = p_owner_id
      or exists (
        select 1
        from public.profile_follows pf
        where pf.follower_id = auth.uid()
          and pf.following_id = p_owner_id
      )
    );
$$;

revoke all on function public.can_view_active_story(uuid, timestamptz) from public;
grant execute on function public.can_view_active_story(uuid, timestamptz) to authenticated;
-- Explicitly no anon execute (fail-closed for privileged helpers).
revoke execute on function public.can_view_active_story(uuid, timestamptz) from anon;

-- ---------------------------------------------------------------------------
-- 2) stories
-- ---------------------------------------------------------------------------

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  media_path text not null,
  media_type text not null
    check (media_type in ('image', 'video')),
  caption text
    check (caption is null or char_length(caption) <= 500),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Path must live under the owner's storage folder only (blocks hijacking other users' objects).
alter table public.stories
  drop constraint if exists stories_media_path_owner_folder_check;

alter table public.stories
  add constraint stories_media_path_owner_folder_check
  check (
    char_length(btrim(media_path)) between 3 and 512
    and media_path !~ '\s'
    and media_path !~ '\.\.'
    and media_path like (owner_id::text || '/%')
    and media_path not like '%/%/%'
  );

-- Enforce 24h lifetime from created_at (insert + any future updates).
create or replace function public.stories_enforce_expiry()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- Deny backdated/future created_at tricks that would extend lifetime.
    new.created_at := now();
    new.expires_at := new.created_at + interval '24 hours';
    -- Defense in depth: path must remain under owner folder.
    if new.media_path is distinct from (new.owner_id::text || '/' || split_part(new.media_path, '/', 2))
       or position('/' in substr(new.media_path, length(new.owner_id::text) + 2)) > 0 then
      raise exception 'Story media_path must be under the owner folder';
    end if;
  elsif tg_op = 'UPDATE' then
    -- Lifetime is fixed from original created_at; media identity immutable.
    new.created_at := old.created_at;
    new.expires_at := old.created_at + interval '24 hours';
    new.owner_id := old.owner_id;
    new.media_path := old.media_path;
    new.media_type := old.media_type;
  end if;

  if new.expires_at <= new.created_at then
    raise exception 'Story expiry must be after created_at';
  end if;

  return new;
end;
$$;

drop trigger if exists stories_enforce_expiry_trg on public.stories;
create trigger stories_enforce_expiry_trg
  before insert or update on public.stories
  for each row execute function public.stories_enforce_expiry();

create index if not exists stories_owner_id_idx
  on public.stories (owner_id);

create index if not exists stories_expires_at_idx
  on public.stories (expires_at);

-- Composite for owner timelines + expiry filtering in queries (no now() in index).
create index if not exists stories_owner_created_idx
  on public.stories (owner_id, created_at desc);

create index if not exists stories_expires_created_idx
  on public.stories (expires_at, created_at desc);

create index if not exists stories_media_path_idx
  on public.stories (media_path);

alter table public.stories enable row level security;
alter table public.stories force row level security;

drop policy if exists "Owners can insert own stories" on public.stories;
drop policy if exists "Owners can delete own stories" on public.stories;
drop policy if exists "Owners can read own stories" on public.stories;
drop policy if exists "Followers can read active stories" on public.stories;
drop policy if exists "Owners can update own story caption" on public.stories;

create policy "Owners can insert own stories"
  on public.stories
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners can delete own stories"
  on public.stories
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- Owner can read own rows including expired (cleanup / viewer list context).
create policy "Owners can read own stories"
  on public.stories
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

-- Followers (and self via can_view) only while active.
create policy "Followers can read active stories"
  on public.stories
  for select
  to authenticated
  using (
    public.can_view_active_story(owner_id, expires_at)
  );

-- Optional caption-only updates for owner (trigger keeps media/expiry locked).
create policy "Owners can update own story caption"
  on public.stories
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

revoke all on table public.stories from anon;
revoke all on table public.stories from public;
grant select, insert, update, delete on table public.stories to authenticated;

-- ---------------------------------------------------------------------------
-- 3) story_views (first + last view; one row per viewer per story)
-- ---------------------------------------------------------------------------

create table if not exists public.story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  viewer_id uuid not null references auth.users (id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  constraint story_views_one_per_viewer unique (story_id, viewer_id),
  constraint story_views_last_gte_first check (last_viewed_at >= first_viewed_at)
);

create index if not exists story_views_story_id_idx
  on public.story_views (story_id);

create index if not exists story_views_viewer_id_idx
  on public.story_views (viewer_id);

create index if not exists story_views_story_last_idx
  on public.story_views (story_id, last_viewed_at desc);

create or replace function public.story_views_preserve_first()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- Prevent forged viewer identity / backdated first_viewed_at on insert.
    new.viewer_id := auth.uid();
    new.first_viewed_at := now();
    new.last_viewed_at := now();
    if new.viewer_id is null then
      raise exception 'Authentication required to record a story view';
    end if;
  elsif tg_op = 'UPDATE' then
    new.story_id := old.story_id;
    new.viewer_id := old.viewer_id;
    new.first_viewed_at := old.first_viewed_at;
    -- Only allow last_viewed_at to move forward (or refresh to now).
    if new.last_viewed_at is null or new.last_viewed_at < old.first_viewed_at then
      new.last_viewed_at := now();
    elsif new.last_viewed_at < old.last_viewed_at then
      new.last_viewed_at := now();
    elsif new.last_viewed_at > now() + interval '1 minute' then
      new.last_viewed_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists story_views_preserve_first_trg on public.story_views;
create trigger story_views_preserve_first_trg
  before insert or update on public.story_views
  for each row execute function public.story_views_preserve_first();

alter table public.story_views enable row level security;
alter table public.story_views force row level security;

drop policy if exists "Users record own story views" on public.story_views;
drop policy if exists "Users update own story views" on public.story_views;
drop policy if exists "Users read own story views" on public.story_views;
drop policy if exists "Owners read viewers of own stories" on public.story_views;

-- Insert only for self, and only while the story is actively viewable.
create policy "Users record own story views"
  on public.story_views
  for insert
  to authenticated
  with check (
    viewer_id = (select auth.uid())
    and exists (
      select 1
      from public.stories s
      where s.id = story_id
        and public.can_view_active_story(s.owner_id, s.expires_at)
    )
  );

create policy "Users update own story views"
  on public.story_views
  for update
  to authenticated
  using (viewer_id = (select auth.uid()))
  with check (viewer_id = (select auth.uid()));

create policy "Users read own story views"
  on public.story_views
  for select
  to authenticated
  using (viewer_id = (select auth.uid()));

create policy "Owners read viewers of own stories"
  on public.story_views
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.stories s
      where s.id = story_id
        and s.owner_id = (select auth.uid())
    )
  );

revoke all on table public.story_views from anon;
revoke all on table public.story_views from public;
grant select, insert, update on table public.story_views to authenticated;
revoke delete on table public.story_views from authenticated;
revoke delete on table public.story_views from anon;

-- ---------------------------------------------------------------------------
-- 4) Storage bucket: stories (private; playback via signed URLs)
--    Path: {user_id}/{uuid}.{ext}
--    Images + videos only. Max 50 MB.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stories',
  'stories',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners can read own story media" on storage.objects;
drop policy if exists "Active story media is readable by allowed viewers" on storage.objects;
drop policy if exists "Users can upload story media into own folder" on storage.objects;
drop policy if exists "Users can update story media in own folder" on storage.objects;
drop policy if exists "Users can delete story media in own folder" on storage.objects;

create policy "Owners can read own story media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Active story media is readable by allowed viewers"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'stories'
    and exists (
      select 1
      from public.stories s
      where s.media_path = name
        and public.can_view_active_story(s.owner_id, s.expires_at)
    )
  );

create policy "Users can upload story media into own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can update story media in own folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete story media in own folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- ---------------------------------------------------------------------------
-- 5) Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.stories;
  exception
    when duplicate_object then null;
  end;
end;
$$;

alter table public.stories replica identity full;
