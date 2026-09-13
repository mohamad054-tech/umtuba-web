-- Profile content stats (Phase B2)
-- Additive: one RPC for authoritative video/like/view totals for a profile.
-- No destructive changes. App has a table-scan fallback until this is applied.

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

  -- Published videos = rows with a storage path (same rule as Discover/Watch).
  select
    count(*)::integer,
    coalesce(sum(likes), 0)::bigint,
    coalesce(sum(views), 0)::bigint
  into v_video_count, v_likes, v_views
  from public.posts
  where user_id = p_user_id
    and post_type = 'video'
    and video_path is not null;

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
  'Authoritative profile video count + sum of denormalized post likes/views for published videos.';
