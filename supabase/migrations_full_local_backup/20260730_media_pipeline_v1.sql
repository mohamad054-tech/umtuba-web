-- UMTUBA Media Pipeline V1
-- Additive only. Safe to re-run. Does not drop existing tables or data.
-- Apply manually in Supabase SQL Editor after Video Posts V1.
-- Do NOT auto-apply from the app.
--
-- Adds upload/processing lifecycle, media metadata, thumbnail path architecture,
-- future-ready media_pipeline jsonb (HLS/DASH/ABR/AI hooks — not implemented),
-- and readiness gates for public feeds + storage SELECT.

-- ---------------------------------------------------------------------------
-- 1. Lifecycle + metadata columns on posts
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists media_status text,
  add column if not exists upload_started_at timestamptz,
  add column if not exists upload_completed_at timestamptz,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_completed_at timestamptz,
  add column if not exists processing_error text,
  add column if not exists processing_progress integer,
  add column if not exists media_duration_ms integer,
  add column if not exists media_width integer,
  add column if not exists media_height integer,
  add column if not exists media_fps numeric,
  add column if not exists media_codec text,
  add column if not exists media_bitrate integer,
  add column if not exists media_file_size bigint,
  add column if not exists media_aspect_ratio text,
  add column if not exists thumbnail_path text,
  add column if not exists media_pipeline jsonb;

-- Existing rows: treat as ready so Discover/Watch/Profile keep working.
update public.posts
set media_status = 'ready'
where media_status is null;

alter table public.posts
  alter column media_status set default 'ready';

alter table public.posts
  alter column media_status set not null;

update public.posts
set media_pipeline = jsonb_build_object(
  'hls', null,
  'dash', null,
  'abr', null,
  'ai_enhancement', null,
  'ai_translation', null,
  'ai_dubbing', null
)
where media_pipeline is null;

alter table public.posts
  alter column media_pipeline set default jsonb_build_object(
    'hls', null,
    'dash', null,
    'abr', null,
    'ai_enhancement', null,
    'ai_translation', null,
    'ai_dubbing', null
  );

alter table public.posts
  alter column media_pipeline set not null;

-- Constraints
alter table public.posts
  drop constraint if exists posts_media_status_check;

alter table public.posts
  add constraint posts_media_status_check
  check (
    media_status in (
      'draft',
      'uploading',
      'queued',
      'processing',
      'ready',
      'failed'
    )
  );

alter table public.posts
  drop constraint if exists posts_processing_progress_check;

alter table public.posts
  add constraint posts_processing_progress_check
  check (
    processing_progress is null
    or (processing_progress >= 0 and processing_progress <= 100)
  );

alter table public.posts
  drop constraint if exists posts_media_duration_ms_check;

alter table public.posts
  add constraint posts_media_duration_ms_check
  check (media_duration_ms is null or media_duration_ms >= 0);

alter table public.posts
  drop constraint if exists posts_media_width_check;

alter table public.posts
  add constraint posts_media_width_check
  check (media_width is null or media_width > 0);

alter table public.posts
  drop constraint if exists posts_media_height_check;

alter table public.posts
  add constraint posts_media_height_check
  check (media_height is null or media_height > 0);

alter table public.posts
  drop constraint if exists posts_media_fps_check;

alter table public.posts
  add constraint posts_media_fps_check
  check (media_fps is null or media_fps > 0);

alter table public.posts
  drop constraint if exists posts_media_bitrate_check;

alter table public.posts
  add constraint posts_media_bitrate_check
  check (media_bitrate is null or media_bitrate > 0);

alter table public.posts
  drop constraint if exists posts_media_file_size_check;

alter table public.posts
  add constraint posts_media_file_size_check
  check (
    media_file_size is null
    or (media_file_size > 0 and media_file_size <= 52428800)
  );

alter table public.posts
  drop constraint if exists posts_media_codec_length_check;

alter table public.posts
  add constraint posts_media_codec_length_check
  check (media_codec is null or char_length(media_codec) between 1 and 64);

alter table public.posts
  drop constraint if exists posts_media_aspect_ratio_length_check;

alter table public.posts
  add constraint posts_media_aspect_ratio_length_check
  check (
    media_aspect_ratio is null
    or char_length(media_aspect_ratio) between 1 and 32
  );

alter table public.posts
  drop constraint if exists posts_thumbnail_path_length_check;

alter table public.posts
  add constraint posts_thumbnail_path_length_check
  check (
    thumbnail_path is null
    or char_length(btrim(thumbnail_path)) between 1 and 1024
  );

alter table public.posts
  drop constraint if exists posts_processing_error_length_check;

alter table public.posts
  add constraint posts_processing_error_length_check
  check (
    processing_error is null
    or char_length(processing_error) between 1 and 2000
  );

-- Ready videos still require a storage path; draft/uploading may omit it.
alter table public.posts
  drop constraint if exists posts_video_requires_path_check;

alter table public.posts
  add constraint posts_video_requires_path_check
  check (
    post_type is distinct from 'video'
    or media_status in ('draft', 'uploading')
    or (video_path is not null and length(btrim(video_path)) > 0)
  );

-- Non-video posts: clear video + pipeline media fields
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
      and thumbnail_path is null
      and media_duration_ms is null
      and media_width is null
      and media_height is null
      and media_fps is null
      and media_codec is null
      and media_bitrate is null
      and media_file_size is null
      and media_aspect_ratio is null
    )
  );

create index if not exists posts_media_status_idx
  on public.posts (media_status);

create index if not exists posts_video_ready_feed_idx
  on public.posts (created_at desc, id desc)
  where post_type = 'video'
    and media_status = 'ready'
    and video_path is not null;

create index if not exists posts_thumbnail_path_idx
  on public.posts (thumbnail_path)
  where thumbnail_path is not null;

comment on column public.posts.media_status is
  'Media Pipeline V1 lifecycle: draft|uploading|queued|processing|ready|failed';
comment on column public.posts.media_pipeline is
  'Future hooks (null until implemented): hls, dash, abr, ai_enhancement, ai_translation, ai_dubbing';
comment on column public.posts.thumbnail_path is
  'Storage path for poster/thumbnail (may be mocked until generator ships)';

-- ---------------------------------------------------------------------------
-- 2. Helper: public video visibility
-- ---------------------------------------------------------------------------

create or replace function public.is_video_post_publicly_visible(
  p_post_type text,
  p_media_status text,
  p_video_path text
)
returns boolean
language sql
immutable
as $$
  select
    p_post_type = 'video'
    and p_media_status = 'ready'
    and p_video_path is not null
    and length(btrim(p_video_path)) > 0;
$$;

revoke all on function public.is_video_post_publicly_visible(text, text, text) from public;
grant execute on function public.is_video_post_publicly_visible(text, text, text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. RLS — non-ready videos are owner-only; text/image stay public
-- ---------------------------------------------------------------------------

drop policy if exists "Posts are viewable by everyone" on public.posts;
drop policy if exists "Posts are viewable when public or owned" on public.posts;

create policy "Posts are viewable when public or owned"
  on public.posts
  for select
  using (
    (select auth.uid()) = user_id
    or post_type is distinct from 'video'
    or public.is_video_post_publicly_visible(post_type, media_status, video_path)
  );

-- ---------------------------------------------------------------------------
-- 4. Storage — published SELECT requires ready media_status
-- ---------------------------------------------------------------------------

drop policy if exists "Published video posts are readable" on storage.objects;

create policy "Published video posts are readable"
  on storage.objects
  for select
  using (
    bucket_id = 'post-videos'
    and exists (
      select 1
      from public.posts p
      where p.video_path = name
        and public.is_video_post_publicly_visible(
          p.post_type,
          p.media_status,
          p.video_path
        )
    )
  );

-- Thumbnail objects (architecture): same private bucket, thumbs/ folder.
-- Owners can already R/W under {uid}/… including {uid}/thumbs/…
-- Public read of a thumb only when a ready post references thumbnail_path.

drop policy if exists "Published video thumbnails are readable" on storage.objects;

create policy "Published video thumbnails are readable"
  on storage.objects
  for select
  using (
    bucket_id = 'post-videos'
    and exists (
      select 1
      from public.posts p
      where p.thumbnail_path = name
        and public.is_video_post_publicly_visible(
          p.post_type,
          p.media_status,
          p.video_path
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Profile stats — ready videos only
-- ---------------------------------------------------------------------------

create or replace function public.get_profile_content_stats(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_video_count integer := 0;
  v_likes bigint := 0;
  v_views bigint := 0;
begin
  if p_user_id is null then
    return jsonb_build_object(
      'videoCount', 0,
      'likesTotal', 0,
      'viewsTotal', 0,
      'reason', 'invalid'
    );
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    return jsonb_build_object(
      'videoCount', 0,
      'likesTotal', 0,
      'viewsTotal', 0,
      'reason', 'missing_profile'
    );
  end if;

  select
    count(*)::integer,
    coalesce(sum(likes), 0)::bigint,
    coalesce(sum(views), 0)::bigint
  into v_video_count, v_likes, v_views
  from public.posts
  where user_id = p_user_id
    and public.is_video_post_publicly_visible(post_type, media_status, video_path);

  return jsonb_build_object(
    'videoCount', coalesce(v_video_count, 0),
    'likesTotal', coalesce(v_likes, 0),
    'viewsTotal', coalesce(v_views, 0)
  );
end;
$$;

revoke all on function public.get_profile_content_stats(uuid) from public;
grant execute on function public.get_profile_content_stats(uuid) to anon, authenticated;

comment on function public.get_profile_content_stats(uuid) is
  'Authoritative profile stats for ready (publicly visible) video posts only.';
