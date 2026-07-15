-- Profile follow integrity (Phase A5)
-- Additive: enhance toggle to return counts; add snapshot RPC for initial UI state.
-- Preserves RLS on profile_follows. No destructive data changes.

-- ---------------------------------------------------------------------------
-- 1. Snapshot: viewer follow state + authoritative counts for a profile
-- ---------------------------------------------------------------------------

create or replace function public.get_profile_follow_snapshot(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_followers integer := 0;
  v_following integer := 0;
  v_is_following boolean := false;
begin
  if p_user_id is null then
    return jsonb_build_object(
      'following', false,
      'followersCount', 0,
      'followingCount', 0,
      'reason', 'invalid'
    );
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    return jsonb_build_object(
      'following', false,
      'followersCount', 0,
      'followingCount', 0,
      'reason', 'missing_profile'
    );
  end if;

  select count(*)::integer into v_followers
  from public.profile_follows
  where following_id = p_user_id;

  select count(*)::integer into v_following
  from public.profile_follows
  where follower_id = p_user_id;

  if v_uid is not null and v_uid <> p_user_id then
    v_is_following := exists (
      select 1
      from public.profile_follows
      where follower_id = v_uid
        and following_id = p_user_id
    );
  end if;

  return jsonb_build_object(
    'following', v_is_following,
    'followersCount', coalesce(v_followers, 0),
    'followingCount', coalesce(v_following, 0)
  );
end;
$$;

revoke all on function public.get_profile_follow_snapshot(uuid) from public;
grant execute on function public.get_profile_follow_snapshot(uuid) to anon, authenticated;

comment on function public.get_profile_follow_snapshot(uuid) is
  'Authoritative follow state for a profile: viewer following flag + follower/following counts.';

-- ---------------------------------------------------------------------------
-- 2. Toggle with counts + race-safe insert
-- ---------------------------------------------------------------------------

create or replace function public.toggle_profile_follow(p_following_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_following boolean;
  v_followers integer := 0;
  v_following_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_following_id is null or p_following_id = v_uid then
    raise exception 'Invalid follow target';
  end if;

  if not exists (select 1 from public.profiles where id = p_following_id) then
    raise exception 'Profile not found';
  end if;

  if exists (
    select 1 from public.profile_follows
    where follower_id = v_uid and following_id = p_following_id
  ) then
    delete from public.profile_follows
    where follower_id = v_uid and following_id = p_following_id;
    v_following := false;
  else
    insert into public.profile_follows (follower_id, following_id)
    values (v_uid, p_following_id)
    on conflict (follower_id, following_id) do nothing;
    -- Authoritative state after race-safe insert
    v_following := exists (
      select 1 from public.profile_follows
      where follower_id = v_uid and following_id = p_following_id
    );
  end if;

  select count(*)::integer into v_followers
  from public.profile_follows
  where following_id = p_following_id;

  select count(*)::integer into v_following_count
  from public.profile_follows
  where follower_id = p_following_id;

  return jsonb_build_object(
    'following', v_following,
    'followersCount', coalesce(v_followers, 0),
    'followingCount', coalesce(v_following_count, 0)
  );
end;
$$;

revoke all on function public.toggle_profile_follow(uuid) from public;
grant execute on function public.toggle_profile_follow(uuid) to authenticated;

comment on function public.toggle_profile_follow(uuid) is
  'Toggle follow/unfollow. Rejects self-follow. Returns authoritative following flag and counts.';
