-- NOT APPLIED. Written 2026-09-15 for history / future apply.
-- Do not supabase db push. Do not apply blindly to production.
-- Adds per-viewer view/share/watch-signal/referral throttle plus
-- video_commerce_events write lockdown (revoke UPDATE/DELETE; metadata size).

begin;

-- ---------------------------------------------------------------------------
-- Helper table — append-only, cleanup-friendly created_at
-- ---------------------------------------------------------------------------

create table if not exists public.rpc_abuse_events (
  id bigint generated always as identity primary key,
  kind text not null
    check (kind in ('view', 'share', 'watch_signal', 'referral')),
  viewer_key text not null,
  post_id bigint,
  created_at timestamptz not null default now()
);

create index if not exists rpc_abuse_events_kind_viewer_created_idx
  on public.rpc_abuse_events (kind, viewer_key, created_at desc);

create index if not exists rpc_abuse_events_view_lookup_idx
  on public.rpc_abuse_events (kind, post_id, viewer_key, created_at desc)
  where post_id is not null;

create index if not exists rpc_abuse_events_created_at_idx
  on public.rpc_abuse_events (created_at);

alter table public.rpc_abuse_events enable row level security;

revoke all on table public.rpc_abuse_events from public, anon, authenticated;

comment on table public.rpc_abuse_events is
  'Throttle log for DEFINER RPCs. Delete rows older than 7 days when convenient.';

create or replace function public.rpc_abuse_is_allowed(
  p_kind text,
  p_viewer_key text,
  p_post_id bigint,
  p_window interval,
  p_max integer
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_kind is null or p_viewer_key is null or p_max is null or p_max < 1 then
    return false;
  end if;

  if p_kind = 'view' and p_post_id is not null then
    select count(*) into v_count
    from public.rpc_abuse_events
    where kind = p_kind
      and viewer_key = p_viewer_key
      and post_id = p_post_id
      and created_at >= now() - p_window;
  else
    select count(*) into v_count
    from public.rpc_abuse_events
    where kind = p_kind
      and viewer_key = p_viewer_key
      and created_at >= now() - p_window;
  end if;

  return coalesce(v_count, 0) < p_max;
end;
$$;

create or replace function public.rpc_abuse_record(
  p_kind text,
  p_viewer_key text,
  p_post_id bigint default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.rpc_abuse_events (kind, viewer_key, post_id)
  values (p_kind, p_viewer_key, p_post_id);
end;
$$;

revoke all on function public.rpc_abuse_is_allowed(text, text, bigint, interval, integer)
  from public, anon, authenticated;
revoke all on function public.rpc_abuse_record(text, text, bigint)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- record_post_share — same signature; + N shares / viewer / hour
-- Live-equivalent body from 20260944 plus helper-table throttle.
-- ---------------------------------------------------------------------------

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

  if not public.rpc_abuse_is_allowed(
    'share', v_key, null, interval '1 hour', 20
  ) then
    select shares into v_count from public.posts where id = p_post_id;
    return jsonb_build_object(
      'counted', false,
      'shares', coalesce(v_count, 0)
    );
  end if;

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

  if v_counted then
    perform public.rpc_abuse_record('share', v_key, p_post_id);
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

-- ---------------------------------------------------------------------------
-- record_post_view — same signature; at most 1 counted view / (post, viewer) / 24h
-- ---------------------------------------------------------------------------

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

  if not public.rpc_abuse_is_allowed(
    'view', v_key, p_post_id, interval '24 hours', 1
  ) then
    select views into v_count from public.posts where id = p_post_id;
    return jsonb_build_object(
      'counted', false,
      'views', coalesce(v_count, 0),
      'qualified', false
    );
  end if;

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

  if v_counted then
    perform public.rpc_abuse_record('view', v_key, p_post_id);
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

-- ---------------------------------------------------------------------------
-- record_watch_signal — same signature; 300 upserts / viewer / hour
-- ---------------------------------------------------------------------------

create or replace function public.record_watch_signal(
  p_post_id bigint,
  p_session_id text,
  p_viewer_key text default null,
  p_surface text default 'discover',
  p_watch_duration_ms integer default 0,
  p_watch_percent numeric default 0,
  p_completed boolean default false,
  p_rewatch_count integer default 0,
  p_liked boolean default false,
  p_saved boolean default false,
  p_shared boolean default false,
  p_commented boolean default false,
  p_follow_after_watch boolean default false,
  p_skipped_early boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_viewer text;
  v_session text := nullif(btrim(coalesce(p_session_id, '')), '');
  v_surface text := lower(btrim(coalesce(p_surface, 'discover')));
  v_creator uuid;
  v_duration integer := greatest(0, coalesce(p_watch_duration_ms, 0));
  v_percent numeric := least(100, greatest(0, coalesce(p_watch_percent, 0)));
  v_rewatch integer := greatest(0, coalesce(p_rewatch_count, 0));
  v_completed boolean := coalesce(p_completed, false);
  v_skipped boolean;
  v_signal_id bigint;
begin
  if p_post_id is null or p_post_id <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_post');
  end if;

  if v_session is null or char_length(v_session) < 8 or char_length(v_session) > 64 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_session');
  end if;

  if v_surface not in ('discover', 'watch') then
    v_surface := 'discover';
  end if;

  if v_uid is not null then
    v_viewer := 'u:' || v_uid::text;
  else
    v_viewer := lower(btrim(coalesce(p_viewer_key, '')));
    if v_viewer !~ '^d:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return jsonb_build_object('ok', false, 'reason', 'invalid_viewer_key');
    end if;
  end if;

  if not public.rpc_abuse_is_allowed(
    'watch_signal', v_viewer, null, interval '1 hour', 300
  ) then
    return jsonb_build_object(
      'ok', true,
      'signalId', null,
      'skippedEarly', false,
      'throttled', true
    );
  end if;

  select p.user_id into v_creator
  from public.posts p
  where p.id = p_post_id
    and p.post_type = 'video'
    and p.media_status = 'ready';

  if v_creator is null and not exists (
    select 1 from public.posts p where p.id = p_post_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'post_not_found');
  end if;

  if p_skipped_early is null then
    v_skipped := (v_percent < 15 and v_duration < 3000 and not v_completed);
  else
    v_skipped := p_skipped_early;
  end if;

  insert into public.watch_signals as ws (
    post_id,
    creator_id,
    user_id,
    viewer_key,
    session_id,
    surface,
    watch_duration_ms,
    watch_percent,
    completed,
    rewatch_count,
    liked,
    saved,
    shared,
    commented,
    follow_after_watch,
    skipped_early,
    model_version,
    updated_at
  )
  values (
    p_post_id,
    v_creator,
    v_uid,
    v_viewer,
    v_session,
    v_surface,
    v_duration,
    round(v_percent::numeric, 2),
    v_completed,
    v_rewatch,
    coalesce(p_liked, false),
    coalesce(p_saved, false),
    coalesce(p_shared, false),
    coalesce(p_commented, false),
    coalesce(p_follow_after_watch, false),
    v_skipped,
    'deterministic-v1',
    now()
  )
  on conflict (viewer_key, post_id, session_id) do update set
    watch_duration_ms = greatest(ws.watch_duration_ms, excluded.watch_duration_ms),
    watch_percent = greatest(ws.watch_percent, excluded.watch_percent),
    completed = ws.completed or excluded.completed,
    rewatch_count = greatest(ws.rewatch_count, excluded.rewatch_count),
    liked = ws.liked or excluded.liked,
    saved = ws.saved or excluded.saved,
    shared = ws.shared or excluded.shared,
    commented = ws.commented or excluded.commented,
    follow_after_watch = ws.follow_after_watch or excluded.follow_after_watch,
    skipped_early = case
      when ws.completed or excluded.completed then false
      when greatest(ws.watch_percent, excluded.watch_percent) >= 15 then false
      else ws.skipped_early or excluded.skipped_early
    end,
    creator_id = coalesce(excluded.creator_id, ws.creator_id),
    user_id = coalesce(excluded.user_id, ws.user_id),
    updated_at = now()
  returning id into v_signal_id;

  perform public.rpc_abuse_record('watch_signal', v_viewer, p_post_id);
  perform public.refresh_video_quality_signals(p_post_id);

  if v_creator is not null then
    perform public.refresh_creator_quality_signals(v_creator);
  end if;

  if v_uid is not null then
    perform public.refresh_user_interest_profile(v_uid);
  end if;

  return jsonb_build_object(
    'ok', true,
    'signalId', v_signal_id,
    'skippedEarly', v_skipped
  );
end;
$$;

revoke all on function public.record_watch_signal(
  bigint, text, text, text, integer, numeric, boolean, integer,
  boolean, boolean, boolean, boolean, boolean, boolean
) from public;
grant execute on function public.record_watch_signal(
  bigint, text, text, text, integer, numeric, boolean, integer,
  boolean, boolean, boolean, boolean, boolean, boolean
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- record_referral_attribution — same signature; 20 / visitor-or-ip / hour
-- Anon identity is the client visitor id (or ip_hash). Not a server secret.
-- ---------------------------------------------------------------------------

create or replace function public.record_referral_attribution(
  p_referral_code text,
  p_anonymous_visitor_id text default null,
  p_landing_path text default null,
  p_ip_hash text default null,
  p_user_agent_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(btrim(coalesce(p_referral_code, '')));
  v_visitor text := nullif(btrim(coalesce(p_anonymous_visitor_id, '')), '');
  v_referrer uuid;
  v_ttl_days integer := public.um_points_config_value('referral_attribution_ttl_days', 30);
  v_existing public.referral_attributions%rowtype;
  v_id uuid;
  v_expires timestamptz;
  v_abuse_key text;
begin
  if v_code !~ '^[A-Z0-9]{6,16}$' then
    return jsonb_build_object('recorded', false, 'reason', 'invalid_code');
  end if;

  v_abuse_key := coalesce(
    v_visitor,
    nullif(btrim(coalesce(p_ip_hash, '')), ''),
    'anon:unknown'
  );
  if not public.rpc_abuse_is_allowed(
    'referral', v_abuse_key, null, interval '1 hour', 20
  ) then
    return jsonb_build_object('recorded', false, 'reason', 'throttled');
  end if;

  select user_id into v_referrer
  from public.referral_codes
  where code = v_code
    and is_active = true
  limit 1;

  if v_referrer is null then
    return jsonb_build_object('recorded', false, 'reason', 'unknown_code');
  end if;

  if v_visitor is not null then
    select * into v_existing
    from public.referral_attributions
    where anonymous_visitor_id = v_visitor
      and status = 'pending'
      and expires_at > now()
    order by created_at asc
    limit 1;

    if v_existing.id is not null then
      return jsonb_build_object(
        'recorded', false,
        'reason', 'first_touch_kept',
        'attributionId', v_existing.id,
        'referralCode', v_existing.referral_code,
        'referrerUserId', v_existing.referrer_user_id,
        'expiresAt', v_existing.expires_at
      );
    end if;
  end if;

  v_expires := now() + make_interval(days => greatest(1, v_ttl_days));

  insert into public.referral_attributions (
    referrer_user_id,
    referral_code,
    anonymous_visitor_id,
    landing_path,
    ip_hash,
    user_agent_hash,
    expires_at,
    status
  )
  values (
    v_referrer,
    v_code,
    v_visitor,
    nullif(btrim(coalesce(p_landing_path, '')), ''),
    nullif(btrim(coalesce(p_ip_hash, '')), ''),
    nullif(btrim(coalesce(p_user_agent_hash, '')), ''),
    v_expires,
    'pending'
  )
  returning id into v_id;

  perform public.rpc_abuse_record('referral', v_abuse_key, null);

  return jsonb_build_object(
    'recorded', true,
    'attributionId', v_id,
    'referralCode', v_code,
    'referrerUserId', v_referrer,
    'expiresAt', v_expires
  );
end;
$$;

revoke all on function public.record_referral_attribution(text, text, text, text, text) from public;
grant execute on function public.record_referral_attribution(text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- video_commerce_events — keep INSERT policy; revoke UPDATE/DELETE; size cap
-- event_type CHECK already matches app: badge_shown, badge_opened, product_viewed
-- ---------------------------------------------------------------------------

revoke update, delete on table public.video_commerce_events from public, anon, authenticated;

alter table public.video_commerce_events
  drop constraint if exists video_commerce_events_metadata_size_chk;

alter table public.video_commerce_events
  add constraint video_commerce_events_metadata_size_chk
  check (octet_length(coalesce(metadata::text, '')) <= 4096);

alter table public.video_commerce_events
  drop constraint if exists video_commerce_events_event_type_check;
alter table public.video_commerce_events
  drop constraint if exists video_commerce_events_event_type_chk;

alter table public.video_commerce_events
  add constraint video_commerce_events_event_type_chk
  check (event_type in ('badge_shown', 'badge_opened', 'product_viewed'));

commit;

-- ---------------------------------------------------------------------------
-- ROLLBACK (do not run blindly; 20260948 is not applied on production)
-- ---------------------------------------------------------------------------
-- begin;
-- alter table public.video_commerce_events
--   drop constraint if exists video_commerce_events_metadata_size_chk;
-- alter table public.video_commerce_events
--   drop constraint if exists video_commerce_events_event_type_chk;
-- -- Restore the original inline event_type CHECK from 20260801 if needed:
-- -- alter table public.video_commerce_events
-- --   add constraint video_commerce_events_event_type_check
-- --   check (event_type in ('badge_shown', 'badge_opened', 'product_viewed'));
-- grant update, delete on table public.video_commerce_events to anon, authenticated;
-- -- Recreate record_post_view / record_post_share from
-- --   supabase/migrations/20260944_ugc_post_viewer_visibility_v1.sql
-- -- Recreate record_watch_signal from
-- --   supabase/migrations/20260731_recommendation_infrastructure_v1.sql
-- -- Recreate record_referral_attribution from
-- --   supabase/migrations/20260722_referral_rewards_v1.sql
-- drop function if exists public.rpc_abuse_record(text, text, bigint);
-- drop function if exists public.rpc_abuse_is_allowed(text, text, bigint, interval, integer);
-- drop table if exists public.rpc_abuse_events;
-- commit;
