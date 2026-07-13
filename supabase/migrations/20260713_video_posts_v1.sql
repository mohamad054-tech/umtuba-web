-- UMTUBA Video Posts V1: video metadata on posts + private post-videos bucket
-- Additive only. Safe to re-run. Does not drop existing tables or data.
-- Apply in Supabase SQL Editor after 20260713_profiles_foundation_v1.sql.

-- ---------------------------------------------------------------------------
-- 1. Extend public.posts with video media metadata
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists video_path text,
  add column if not exists video_mime_type text,
  add column if not exists video_byte_size bigint;

create index if not exists posts_post_type_idx
  on public.posts (post_type);

create index if not exists posts_video_path_idx
  on public.posts (video_path)
  where video_path is not null;

-- Integrity: video metadata only when present / required for video posts.
-- Non-video posts may leave video_* columns null.

alter table public.posts
  drop constraint if exists posts_video_byte_size_check;

alter table public.posts
  add constraint posts_video_byte_size_check
  check (
    video_byte_size is null
    or (video_byte_size > 0 and video_byte_size <= 52428800)
  );

alter table public.posts
  drop constraint if exists posts_video_mime_type_check;

alter table public.posts
  add constraint posts_video_mime_type_check
  check (
    video_mime_type is null
    or video_mime_type in ('video/mp4', 'video/webm', 'video/quicktime')
  );

alter table public.posts
  drop constraint if exists posts_video_requires_path_check;

alter table public.posts
  add constraint posts_video_requires_path_check
  check (
    post_type is distinct from 'video'
    or (video_path is not null and length(btrim(video_path)) > 0)
  );

alter table public.posts
  drop constraint if exists posts_non_video_clears_video_meta_check;

alter table public.posts
  add constraint posts_non_video_clears_video_meta_check
  check (
    post_type = 'video'
    or (
      video_path is null
      and video_mime_type is null
      and video_byte_size is null
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Storage bucket: post-videos (private; playback via signed URLs)
--    Uploads must live under: {user_id}/{filename}
--    Max 50 MB. MP4 / WebM / QuickTime only.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-videos',
  'post-videos',
  false,
  52428800,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 3. Storage RLS for post-videos (private bucket)
--    SELECT is NOT open to the whole bucket.
--    - Owners can read/write/delete only under {auth.uid()}/...
--    - Anyone may SELECT an object only when a published video post
--      references that exact path (needed to mint short-lived signed URLs).
--    - Anonymous users cannot INSERT / UPDATE / DELETE.
-- ---------------------------------------------------------------------------

drop policy if exists "Public read access for post videos" on storage.objects;
drop policy if exists "Owners can read own post videos" on storage.objects;
drop policy if exists "Published video posts are readable" on storage.objects;
drop policy if exists "Users can upload post videos into own folder" on storage.objects;
drop policy if exists "Users can update post videos in own folder" on storage.objects;
drop policy if exists "Users can delete post videos in own folder" on storage.objects;

create policy "Owners can read own post videos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'post-videos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Published video posts are readable"
  on storage.objects
  for select
  using (
    bucket_id = 'post-videos'
    and exists (
      select 1
      from public.posts p
      where p.video_path = name
        and p.post_type = 'video'
        and p.video_path is not null
    )
  );

create policy "Users can upload post videos into own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-videos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can update post videos in own folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'post-videos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'post-videos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete post videos in own folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'post-videos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
