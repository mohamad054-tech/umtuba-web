-- UMTUBA Notifications V2 — event wiring polish
-- Adds creator notifications for saves/shares + conservative AI insights on milestones.
-- Apply after 20260717_notifications_v2_automation.sql.

-- ---------------------------------------------------------------------------
-- 1. Extend type check for post_save / post_share
-- ---------------------------------------------------------------------------

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'follow',
      'post_like',
      'comment',
      'reply',
      'mention',
      'live_started',
      'direct_message',
      'post_reached_country',
      'post_trending_country',
      'post_milestone',
      'post_journey_summary',
      'um_points_earned',
      'reward_milestone',
      'nearby_live_started',
      'ai_creator_insight',
      'post_save',
      'post_share'
    )
  );

create or replace function public.notification_pref_allows(
  p_user_id uuid,
  p_type text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_prefs public.notification_preferences;
begin
  v_prefs := public.ensure_notification_preferences(p_user_id);

  if p_type in (
    'follow', 'post_like', 'comment', 'reply', 'mention',
    'direct_message', 'live_started', 'post_save', 'post_share'
  ) then
    return coalesce(v_prefs.social_enabled, true);
  end if;

  if p_type in (
    'post_reached_country',
    'post_trending_country',
    'post_milestone',
    'post_journey_summary'
  ) then
    return coalesce(v_prefs.journey_enabled, true);
  end if;

  if p_type in ('um_points_earned', 'reward_milestone') then
    return coalesce(v_prefs.rewards_enabled, true);
  end if;

  if p_type = 'nearby_live_started' then
    return coalesce(v_prefs.nearby_live_enabled, false);
  end if;

  if p_type = 'ai_creator_insight' then
    return coalesce(v_prefs.ai_insights_enabled, true);
  end if;

  return true;
end;
$$;

-- Update list filter to include save/share in social
drop function if exists public.list_my_notifications(int, timestamptz, text);

create or replace function public.list_my_notifications(
  p_limit int default 20,
  p_before timestamptz default null,
  p_category text default 'all'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit int := greatest(1, least(coalesce(p_limit, 20), 50));
  v_category text := lower(btrim(coalesce(p_category, 'all')));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_category not in ('all', 'social', 'journey', 'live', 'rewards', 'ai') then
    v_category := 'all';
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(x) order by x."createdAt" desc)
      from (
        select
          n.id,
          n.type,
          n.title,
          n.body,
          n.entity_type as "entityType",
          n.entity_id as "entityId",
          n.href,
          n.metadata,
          n.read_at as "readAt",
          n.created_at as "createdAt",
          n.actor_id as "actorId",
          n.dedupe_key as "dedupeKey",
          case
            when p.id is null then null
            else jsonb_build_object(
              'id', p.id,
              'username', p.username,
              'displayName', coalesce(
                nullif(btrim(p.full_name), ''),
                nullif(btrim(p.username), ''),
                'Someone'
              ),
              'avatarUrl', null,
              'avatarInitial', coalesce(
                nullif(btrim(p.avatar_initial), ''),
                upper(left(coalesce(p.username, 'U'), 1))
              )
            )
          end as actor
        from public.notifications n
        left join public.profiles p on p.id = n.actor_id
        where n.recipient_id = v_uid
          and (p_before is null or n.created_at < p_before)
          and (
            v_category = 'all'
            or (
              v_category = 'social'
              and n.type in (
                'follow', 'post_like', 'comment', 'reply',
                'mention', 'direct_message', 'post_save', 'post_share'
              )
            )
            or (
              v_category = 'journey'
              and n.type in (
                'post_reached_country',
                'post_trending_country',
                'post_milestone',
                'post_journey_summary'
              )
            )
            or (
              v_category = 'live'
              and n.type in ('live_started', 'nearby_live_started')
            )
            or (
              v_category = 'rewards'
              and n.type in ('um_points_earned', 'reward_milestone')
            )
            or (
              v_category = 'ai'
              and n.type = 'ai_creator_insight'
            )
          )
        order by n.created_at desc
        limit v_limit
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.list_my_notifications(int, timestamptz, text) from public;
grant execute on function public.list_my_notifications(int, timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Internal AI insight helper (system → user)
-- ---------------------------------------------------------------------------

create or replace function public.emit_ai_creator_insight_for_user(
  p_user_id uuid,
  p_insight_key text,
  p_title text,
  p_body text default null,
  p_category text default 'general',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := btrim(coalesce(p_insight_key, ''));
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_category text := coalesce(nullif(btrim(coalesce(p_category, '')), ''), 'general');
  v_insight_id uuid;
  v_notif uuid;
begin
  if p_user_id is null or v_key = '' or v_title = '' then
    return null;
  end if;

  insert into public.creator_ai_insights (
    user_id, insight_key, title, body, category, metadata
  )
  values (
    p_user_id, v_key, v_title, v_body, v_category,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, insight_key) do nothing
  returning id into v_insight_id;

  if v_insight_id is null then
    return null;
  end if;

  v_notif := public.create_notification(
    p_user_id,
    null,
    'ai_creator_insight',
    v_title,
    v_body,
    'ai_insight',
    v_insight_id::text,
    '/creator/insights',
    jsonb_build_object(
      'insightId', v_insight_id,
      'insightKey', v_key,
      'category', v_category
    ) || coalesce(p_metadata, '{}'::jsonb),
    'ai_creator_insight:' || p_user_id::text || ':' || v_key
  );

  return v_notif;
end;
$$;

revoke all on function public.emit_ai_creator_insight_for_user(
  uuid, text, text, text, text, jsonb
) from public;

-- ---------------------------------------------------------------------------
-- 3. Patch save / share to notify creator (in addition to UM Points)
-- ---------------------------------------------------------------------------

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
  if v_owner is null then
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
    end if;
  end if;

  select saves into v_count from public.posts where id = p_post_id;

  return jsonb_build_object(
    'saved', v_saved,
    'saves', coalesce(v_count, 0)
  );
end;
$$;

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
  if v_owner is null then
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
  end if;

  select shares into v_count from public.posts where id = p_post_id;

  return jsonb_build_object(
    'counted', v_counted,
    'shares', coalesce(v_count, 0)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Emit AI insights from real journey / view milestones
-- ---------------------------------------------------------------------------

create or replace function public.process_post_journey_from_view(
  p_post_id bigint,
  p_owner_id uuid,
  p_views bigint,
  p_country_code text,
  p_country_name text,
  p_city text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(btrim(coalesce(p_country_code, '')));
  v_name text := nullif(btrim(coalesce(p_country_name, '')), '');
  v_existed boolean := false;
  v_country_count int;
  v_country_views bigint;
  v_recent int;
  v_trend_min int := public.um_points_config_value('trending_min_country_views', 20);
  v_trend_window int := public.um_points_config_value('trending_recent_window_hours', 24);
  v_trend_recent int := public.um_points_config_value('trending_recent_min_views', 10);
  v_threshold bigint;
  v_day text := to_char((timezone('utc', now()))::date, 'YYYY-MM-DD');
  v_updated int;
begin
  if p_owner_id is null or p_post_id is null then
    return;
  end if;

  foreach v_threshold in array array[500, 1000, 10000, 100000]::bigint[]
  loop
    if coalesce(p_views, 0) >= v_threshold then
      perform public.create_notification(
        p_owner_id,
        null,
        'post_milestone',
        format('%s views', trim(to_char(v_threshold, 'FM999,999,999'))),
        'Your post hit ' || v_threshold::text || ' views.',
        'post',
        p_post_id::text,
        '/discover?post=' || p_post_id::text,
        jsonb_build_object(
          'postId', p_post_id,
          'milestoneKind', 'views',
          'milestoneValue', v_threshold
        ),
        'post_milestone:views:' || p_post_id::text || ':' || v_threshold::text
      );

      if v_threshold = 1000 then
        perform public.emit_ai_creator_insight_for_user(
          p_owner_id,
          'momentum_1k_views:' || p_post_id::text,
          'Your latest post is gaining unusual momentum.',
          'This post crossed 1,000 views. Keep publishing in a similar style while engagement is rising.',
          'momentum',
          jsonb_build_object('postId', p_post_id, 'views', p_views)
        );
      end if;
    end if;
  end loop;

  if v_code !~ '^[A-Z]{2}$' then
    return;
  end if;

  if v_name is null then
    v_name := v_code;
  end if;

  select exists (
    select 1 from public.post_journey_countries
    where post_id = p_post_id and country_code = v_code
  ) into v_existed;

  insert into public.post_journey_countries (
    post_id, country_code, country_name, view_count
  )
  values (p_post_id, v_code, v_name, 1)
  on conflict (post_id, country_code) do update
    set view_count = public.post_journey_countries.view_count + 1,
        country_name = excluded.country_name;

  if not v_existed then
    perform public.create_notification(
      p_owner_id,
      null,
      'post_reached_country',
      'Your post has reached ' || v_name || '.',
      case when nullif(btrim(coalesce(p_city, '')), '') is not null
        then 'First views from ' || btrim(p_city)
        else null
      end,
      'post',
      p_post_id::text,
      '/post-journey?postId=' || p_post_id::text,
      jsonb_build_object(
        'postId', p_post_id,
        'countryCode', v_code,
        'countryName', v_name,
        'city', nullif(btrim(coalesce(p_city, '')), '')
      ),
      'post_reached_country:' || p_post_id::text || ':' || v_code
    );
  end if;

  select count(*)::int into v_country_count
  from public.post_journey_countries
  where post_id = p_post_id;

  if v_country_count in (5, 10, 25) then
    perform public.create_notification(
      p_owner_id,
      null,
      'post_milestone',
      'Reached ' || v_country_count::text || ' countries',
      'Your post has now traveled through ' || v_country_count::text || ' countries.',
      'post',
      p_post_id::text,
      '/post-journey?postId=' || p_post_id::text,
      jsonb_build_object(
        'postId', p_post_id,
        'milestoneKind', 'countries',
        'milestoneValue', v_country_count,
        'countryCount', v_country_count
      ),
      'post_milestone:countries:' || p_post_id::text || ':' || v_country_count::text
    );

    if v_country_count = 5 then
      perform public.emit_ai_creator_insight_for_user(
        p_owner_id,
        'travel_reach_5:' || p_post_id::text,
        'Posts about travel are getting stronger engagement.',
        'This post reached 5 countries. Cross-border discovery is working — lean into place-based storytelling.',
        'travel',
        jsonb_build_object('postId', p_post_id, 'countryCount', v_country_count)
      );
    end if;
  end if;

  if v_country_count > 0 then
    perform public.create_notification(
      p_owner_id,
      null,
      'post_journey_summary',
      'Your post has now traveled through ' || v_country_count::text || ' countries.',
      null,
      'post',
      p_post_id::text,
      '/post-journey?postId=' || p_post_id::text,
      jsonb_build_object(
        'postId', p_post_id,
        'countryCount', v_country_count
      ),
      'post_journey_summary:' || p_post_id::text || ':' || v_day
    );
  end if;

  select view_count into v_country_views
  from public.post_journey_countries
  where post_id = p_post_id and country_code = v_code;

  select count(*)::int into v_recent
  from public.post_views
  where post_id = p_post_id
    and country_code = v_code
    and qualified_view = true
    and viewed_at >= now() - make_interval(hours => v_trend_window);

  if coalesce(v_country_views, 0) >= v_trend_min
     and v_recent >= v_trend_recent then
    update public.post_journey_countries
    set is_trending = true,
        trending_notified_at = now()
    where post_id = p_post_id
      and country_code = v_code
      and trending_notified_at is null;

    get diagnostics v_updated = row_count;

    if v_updated > 0 then
      perform public.create_notification(
        p_owner_id,
        null,
        'post_trending_country',
        'Your post is gaining momentum in ' || v_name || '.',
        null,
        'post',
        p_post_id::text,
        '/post-journey?postId=' || p_post_id::text,
        jsonb_build_object(
          'postId', p_post_id,
          'countryCode', v_code,
          'countryName', v_name,
          'countryViews', v_country_views,
          'recentViews', v_recent
        ),
        'post_trending_country:' || p_post_id::text || ':' || v_code
      );
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. RLS snapshot sanity (re-assert critical policies)
-- ---------------------------------------------------------------------------

drop policy if exists "Users can view their notifications" on public.notifications;
create policy "Users can view their notifications"
  on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = recipient_id);

drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications"
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

revoke insert, delete on public.notifications from anon, authenticated;

drop policy if exists "Users can view own notification preferences"
  on public.notification_preferences;
create policy "Users can view own notification preferences"
  on public.notification_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own notification preferences"
  on public.notification_preferences;
create policy "Users can insert own notification preferences"
  on public.notification_preferences
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own notification preferences"
  on public.notification_preferences;
create policy "Users can update own notification preferences"
  on public.notification_preferences
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
