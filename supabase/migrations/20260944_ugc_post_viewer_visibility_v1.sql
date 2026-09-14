-- UMTUBA UGC post viewer visibility V1
-- PRINT / write only. Do not apply. Never supabase db push.
-- Query-level + RPC gates only. Do not change RLS.

-- PostgREST embed: posts.user_id → profiles.id (alongside auth.users FK).
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'posts_user_id_profiles_fkey'
  ) then
    return;
  end if;

  if exists (
    select 1
    from public.posts p
    where p.user_id is not null
      and not exists (
        select 1 from public.profiles pr where pr.id = p.user_id
      )
  ) then
    raise notice
      'Skipping posts_user_id_profiles_fkey; orphan posts.user_id rows exist';
    return;
  end if;

  alter table public.posts
    add constraint posts_user_id_profiles_fkey
    foreign key (user_id) references public.profiles (id)
    on delete set null;
end $$;

-- Same boolean as lib/supabase/postVisibility.ts isPostVisibleToViewer.
create or replace function public.post_is_visible_to_viewer(
  p_deleted_at timestamptz,
  p_author_id uuid,
  p_author_status text,
  p_viewer_id uuid
)
returns boolean
language sql
immutable
as $$
  select
    case
      when lower(coalesce(p_author_status, '')) in ('suspended', 'banned') then false
      when lower(coalesce(p_author_status, '')) = 'shadowbanned' then
        p_viewer_id is not null
        and p_author_id is not null
        and p_viewer_id = p_author_id
      when p_deleted_at is not null then
        p_viewer_id is not null
        and p_author_id is not null
        and p_viewer_id = p_author_id
        and lower(coalesce(p_author_status, '')) in ('active', 'shadowbanned')
      when lower(coalesce(p_author_status, '')) = 'active' then true
      else false
    end;
$$;

revoke all on function public.post_is_visible_to_viewer(timestamptz, uuid, text, uuid) from public;
grant execute on function public.post_is_visible_to_viewer(timestamptz, uuid, text, uuid) to anon, authenticated;

-- Same boolean as lib/supabase/postVisibility.ts isPostInteractable.
create or replace function public.post_is_interactable(p_post_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.posts p
    join public.profiles pr on pr.id = p.user_id
    where p.id = p_post_id
      and p.deleted_at is null
      and pr.moderation_status = 'active'
  );
$$;

revoke all on function public.post_is_interactable(bigint) from public;
grant execute on function public.post_is_interactable(bigint) to anon, authenticated;

-- 1. Profile counts match rows the viewer can see.
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
  v_status text;
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

  select pr.moderation_status into v_status
  from public.profiles pr
  where pr.id = p_user_id;

  select
    count(*)::integer,
    coalesce(sum(p.likes), 0)::bigint,
    coalesce(sum(p.views), 0)::bigint
  into v_video_count, v_likes, v_views
  from public.posts p
  where p.user_id = p_user_id
    and public.is_video_post_publicly_visible(p.post_type, p.media_status, p.video_path)
    and public.post_is_visible_to_viewer(
      p.deleted_at,
      p.user_id,
      v_status,
      auth.uid()
    );

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
  'Profile video stats for rows visible to auth.uid() (excludes taken-down and non-active authors for other viewers).';

-- 2. Interaction RPCs reject removed / non-active authors.
create or replace function public.toggle_post_like(p_post_id bigint)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_liked boolean;
  v_count integer;
  v_deleted integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.post_is_interactable(p_post_id) then
    raise exception 'Post not found';
  end if;

  delete from public.post_likes
  where post_id = p_post_id
    and user_id = v_uid;

  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    v_liked := false;
  else
    insert into public.post_likes (post_id, user_id)
    values (p_post_id, v_uid)
    on conflict (post_id, user_id) do nothing;

    v_liked := exists (
      select 1
      from public.post_likes
      where post_id = p_post_id
        and user_id = v_uid
    );
  end if;

  select likes into v_count from public.posts where id = p_post_id;

  return jsonb_build_object(
    'liked', v_liked,
    'likes', coalesce(v_count, 0)
  );
end;
$$;

revoke all on function public.toggle_post_like(bigint) from public;
grant execute on function public.toggle_post_like(bigint) to authenticated;

create or replace function public.toggle_post_save(p_post_id bigint)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_saved boolean;
  v_count integer;
  v_deleted integer;
  v_owner uuid;
  v_points int := public.um_points_config_value('creator_qualified_save', 3);
  v_cap int := public.um_points_config_value('save_daily_cap_points', 30);
  v_label text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select user_id into v_owner from public.posts where id = p_post_id;
  if not public.post_is_interactable(p_post_id) then
    raise exception 'Post not found';
  end if;

  delete from public.post_saves
  where post_id = p_post_id
    and user_id = v_uid;

  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    v_saved := false;
  else
    insert into public.post_saves (user_id, post_id)
    values (v_uid, p_post_id)
    on conflict (user_id, post_id) do nothing;

    v_saved := exists (
      select 1 from public.post_saves
      where post_id = p_post_id and user_id = v_uid
    );

    if v_saved and v_owner is distinct from v_uid then
      v_label := public.notification_actor_label(v_uid);

      perform public.create_notification(
        v_owner,
        v_uid,
        'post_save',
        v_label || ' saved your post',
        null,
        'post',
        p_post_id::text,
        '/discover?post=' || p_post_id::text,
        jsonb_build_object('postId', p_post_id, 'saverId', v_uid),
        'post_save:' || p_post_id::text || ':' || v_uid::text
      );

      perform public.award_um_points_to_user(
        v_owner,
        v_points,
        'qualified save',
        'creator_save:' || p_post_id::text || ':' || v_uid::text,
        jsonb_build_object(
          'category', 'save',
          'postId', p_post_id,
          'saverId', v_uid
        ),
        v_cap
      );

      perform public.try_award_activity_score(
        v_owner,
        public.activity_tier_config_value('score_save_received', 5),
        'engagement_received',
        'save received',
        'activity_save:' || p_post_id::text || ':' || v_uid::text,
        jsonb_build_object('postId', p_post_id, 'saverId', v_uid),
        v_uid,
        public.activity_tier_config_value('cap_engagement_received', 100)
      );
    end if;
  end if;

  select saves into v_count from public.posts where id = p_post_id;

  return jsonb_build_object(
    'saved', v_saved,
    'saves', coalesce(v_count, 0)
  );
end;
$$;

revoke all on function public.toggle_post_save(bigint) from public;
grant execute on function public.toggle_post_save(bigint) to authenticated;

create or replace function public.record_post_share(
  p_post_id bigint,
  p_viewer_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_key text;
  v_window interval := interval '1 hour';
  v_prev timestamptz;
  v_counted boolean := false;
  v_count integer;
  v_inserted integer;
  v_owner uuid;
  v_points int := public.um_points_config_value('creator_qualified_share', 5);
  v_cap int := public.um_points_config_value('share_daily_cap_points', 20);
  v_label text;
  v_day text := to_char(date_trunc('day', timezone('utc', now())), 'YYYYMMDD');
begin
  v_key := public.resolve_interaction_viewer_key(p_viewer_key);

  select user_id into v_owner from public.posts where id = p_post_id;
  if not public.post_is_interactable(p_post_id) then
    raise exception 'Post not found';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('post_share:' || p_post_id::text || ':' || v_key)
  );

  select last_shared_at into v_prev
  from public.post_shares
  where post_id = p_post_id
    and viewer_key = v_key;

  if v_prev is null then
    insert into public.post_shares (post_id, viewer_key, user_id, last_shared_at)
    values (p_post_id, v_key, v_uid, now())
    on conflict (post_id, viewer_key) do nothing;

    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      perform set_config('umtuba.allow_counter_sync', 'on', true);
      update public.posts set shares = shares + 1 where id = p_post_id;
      v_counted := true;
    end if;
  elsif now() - v_prev >= v_window then
    update public.post_shares
    set last_shared_at = now(),
        user_id = coalesce(v_uid, user_id)
    where post_id = p_post_id
      and viewer_key = v_key
      and last_shared_at = v_prev;

    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      perform set_config('umtuba.allow_counter_sync', 'on', true);
      update public.posts set shares = shares + 1 where id = p_post_id;
      v_counted := true;
    end if;
  end if;

  if v_counted and v_owner is not null and (v_uid is null or v_owner <> v_uid) then
    if v_uid is not null then
      v_label := public.notification_actor_label(v_uid);
      perform public.create_notification(
        v_owner,
        v_uid,
        'post_share',
        v_label || ' shared your post',
        null,
        'post',
        p_post_id::text,
        '/discover?post=' || p_post_id::text,
        jsonb_build_object('postId', p_post_id, 'sharerId', v_uid),
        'post_share:' || p_post_id::text || ':' || v_uid::text || ':' || v_day
      );
    else
      perform public.create_notification(
        v_owner,
        null,
        'post_share',
        'Someone shared your post',
        null,
        'post',
        p_post_id::text,
        '/discover?post=' || p_post_id::text,
        jsonb_build_object('postId', p_post_id),
        'post_share:' || p_post_id::text || ':' || v_key || ':' || v_day
      );
    end if;

    perform public.award_um_points_to_user(
      v_owner,
      v_points,
      'qualified share',
      'creator_share:' || p_post_id::text || ':' || v_key || ':' || v_day,
      jsonb_build_object(
        'category', 'share',
        'postId', p_post_id,
        'viewerKey', v_key
      ),
      v_cap
    );

    perform public.try_award_activity_score(
      v_owner,
      public.activity_tier_config_value('score_share_received', 8),
      'engagement_received',
      'share received',
      'activity_share:' || p_post_id::text || ':' || v_key || ':' || v_day,
      jsonb_build_object('postId', p_post_id, 'viewerKey', v_key),
      v_uid,
      public.activity_tier_config_value('cap_engagement_received', 100)
    );
  end if;

  select shares into v_count from public.posts where id = p_post_id;

  return jsonb_build_object(
    'counted', v_counted,
    'shares', coalesce(v_count, 0)
  );
end;
$$;

revoke all on function public.record_post_share(bigint, text) from public;
grant execute on function public.record_post_share(bigint, text) to anon, authenticated;

create or replace function public.record_post_view(
  p_post_id bigint,
  p_viewer_key text default null,
  p_country_code text default null,
  p_country_name text default null,
  p_city text default null,
  p_qualified boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_uid uuid := auth.uid();
  v_window interval := interval '6 hours';
  v_prev timestamptz;
  v_counted boolean := false;
  v_count integer;
  v_inserted integer;
  v_owner uuid;
  v_code text := nullif(upper(btrim(coalesce(p_country_code, ''))), '');
  v_name text := nullif(btrim(coalesce(p_country_name, '')), '');
  v_city text := nullif(btrim(coalesce(p_city, '')), '');
  v_qualified boolean := coalesce(p_qualified, true);
begin
  v_key := public.resolve_interaction_viewer_key(p_viewer_key);

  select user_id into v_owner from public.posts where id = p_post_id;
  if not public.post_is_interactable(p_post_id) then
    raise exception 'Post not found';
  end if;

  if v_city is not null and v_city ~ '^-?[0-9]+\.?[0-9]*\s*,\s*-?[0-9]' then
    v_city := null;
  end if;

  if v_code is not null and v_code !~ '^[A-Z]{2}$' then
    v_code := null;
    v_name := null;
  end if;

  perform pg_advisory_xact_lock(
    hashtext('post_view:' || p_post_id::text || ':' || v_key)
  );

  select last_viewed_at into v_prev
  from public.post_views
  where post_id = p_post_id
    and viewer_key = v_key;

  if v_prev is null then
    insert into public.post_views (
      post_id, viewer_key, last_viewed_at, viewed_at,
      viewer_id, country_code, country_name, city, qualified_view
    )
    values (
      p_post_id, v_key, now(), now(),
      v_uid, v_code, v_name, v_city, v_qualified
    )
    on conflict (post_id, viewer_key) do nothing;

    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      perform set_config('umtuba.allow_counter_sync', 'on', true);
      update public.posts set views = views + 1 where id = p_post_id;
      v_counted := true;
    end if;
  elsif now() - v_prev >= v_window then
    update public.post_views
    set last_viewed_at = now(),
        viewed_at = now(),
        viewer_id = coalesce(v_uid, viewer_id),
        country_code = coalesce(v_code, country_code),
        country_name = coalesce(v_name, country_name),
        city = coalesce(v_city, city),
        qualified_view = v_qualified
    where post_id = p_post_id
      and viewer_key = v_key
      and last_viewed_at = v_prev;

    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      perform set_config('umtuba.allow_counter_sync', 'on', true);
      update public.posts set views = views + 1 where id = p_post_id;
      v_counted := true;
    end if;
  end if;

  select views into v_count from public.posts where id = p_post_id;

  if v_counted and v_qualified then
    perform public.process_post_journey_from_view(
      p_post_id,
      v_owner,
      v_count,
      v_code,
      v_name,
      v_city
    );
  end if;

  return jsonb_build_object(
    'counted', v_counted,
    'views', coalesce(v_count, 0),
    'qualified', v_qualified and v_counted
  );
end;
$$;

revoke all on function public.record_post_view(bigint, text, text, text, text, boolean) from public;
grant execute on function public.record_post_view(bigint, text, text, text, text, boolean) to anon, authenticated;

create or replace function public.report_ugc_content(
  p_post_id bigint,
  p_reason_code text,
  p_reason_detail text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := lower(btrim(coalesce(p_reason_code, '')));
  v_detail text := nullif(btrim(coalesce(p_reason_detail, '')), '');
  v_author uuid;
  v_open integer;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if v_reason not in (
    'spam', 'harassment', 'hate', 'sexual', 'violence', 'illegal', 'impersonation', 'other'
  ) then
    raise exception 'Invalid reason'
      using errcode = '22023';
  end if;

  if v_detail is not null and char_length(v_detail) > 1000 then
    raise exception 'Reason detail is too long'
      using errcode = '22023';
  end if;

  select p.user_id into v_author
  from public.posts p
  where p.id = p_post_id;

  if not found or not public.post_is_interactable(p_post_id) then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if v_author is not null and v_author = v_uid then
    raise exception 'Cannot report your own content'
      using errcode = '42501';
  end if;

  select count(*)::integer into v_open
  from public.ugc_reports r
  where r.reporter_id = v_uid
    and r.status = 'open'
    and r.created_at > now() - interval '24 hours';

  if v_open >= 20 then
    raise exception 'Too many reports'
      using errcode = '54000';
  end if;

  if exists (
    select 1
    from public.ugc_reports r
    where r.reporter_id = v_uid
      and r.target_type = 'content'
      and r.target_post_id = p_post_id
      and r.status = 'open'
  ) then
    raise exception 'Already reported'
      using errcode = '23505';
  end if;

  insert into public.ugc_reports (
    reporter_id, target_type, target_user_id, target_post_id, reason_code, reason_detail
  )
  values (v_uid, 'content', v_author, p_post_id, v_reason, v_detail)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.report_ugc_content(bigint, text, text) from public, anon;
grant execute on function public.report_ugc_content(bigint, text, text) to authenticated;

-- 3. Journey uses the same viewer visibility rule (owner can still see own removed).
create or replace function public.get_post_journey(p_post_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_views bigint;
  v_deleted timestamptz;
  v_status text;
begin
  select p.user_id, p.views, p.deleted_at, pr.moderation_status
    into v_owner, v_views, v_deleted, v_status
  from public.posts p
  left join public.profiles pr on pr.id = p.user_id
  where p.id = p_post_id;

  if not found then
    raise exception 'Post not found';
  end if;

  if not public.post_is_visible_to_viewer(
    v_deleted,
    v_owner,
    v_status,
    auth.uid()
  ) then
    raise exception 'Post not found';
  end if;

  return jsonb_build_object(
    'postId', p_post_id,
    'ownerId', v_owner,
    'views', coalesce(v_views, 0),
    'countryCount', (
      select count(*)::int from public.post_journey_countries where post_id = p_post_id
    ),
    'countries', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'countryCode', c.country_code,
            'countryName', c.country_name,
            'viewCount', c.view_count,
            'isTrending', c.is_trending,
            'firstReachedAt', c.first_reached_at
          )
          order by c.view_count desc, c.first_reached_at asc
        )
        from public.post_journey_countries c
        where c.post_id = p_post_id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.get_post_journey(bigint) from public;
grant execute on function public.get_post_journey(bigint) to authenticated, anon;

notify pgrst, 'reload schema';
