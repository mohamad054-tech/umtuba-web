-- UMTUBA Notifications V2
-- Additive / idempotent. Apply after 20260715_notifications_v1.sql.
-- Extends types, preferences, dedupe, Journey/rewards/nearby/AI helpers.

-- ---------------------------------------------------------------------------
-- 1. Extend notifications: dedupe_key + type check + indexes
-- ---------------------------------------------------------------------------

alter table public.notifications
  add column if not exists dedupe_key text;

-- Unique per recipient when set. Multiple NULLs are allowed (Postgres UNIQUE).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_recipient_dedupe_key_unique'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_recipient_dedupe_key_unique
      unique (recipient_id, dedupe_key);
  end if;
end;
$$;

create index if not exists notifications_recipient_type_created_at_idx
  on public.notifications (recipient_id, type, created_at desc);

create index if not exists notifications_entity_created_at_idx
  on public.notifications (entity_type, entity_id, created_at desc)
  where entity_type is not null and entity_id is not null;

create index if not exists notifications_metadata_post_id_idx
  on public.notifications ((metadata->>'postId'))
  where metadata ? 'postId';

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      -- V1
      'follow',
      'post_like',
      'comment',
      'reply',
      'mention',
      'live_started',
      'direct_message',
      -- V2
      'post_reached_country',
      'post_trending_country',
      'post_milestone',
      'post_journey_summary',
      'um_points_earned',
      'reward_milestone',
      'nearby_live_started',
      'ai_creator_insight'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Notification preferences (nearby live OFF by default)
-- ---------------------------------------------------------------------------

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  journey_enabled boolean not null default true,
  rewards_enabled boolean not null default true,
  nearby_live_enabled boolean not null default false,
  ai_insights_enabled boolean not null default true,
  social_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

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

revoke delete on public.notification_preferences from anon, authenticated;

create or replace function public.ensure_notification_preferences(p_user_id uuid)
returns public.notification_preferences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.notification_preferences;
begin
  if p_user_id is null then
    raise exception 'user_id required';
  end if;

  insert into public.notification_preferences (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_row
  from public.notification_preferences
  where user_id = p_user_id;

  return v_row;
end;
$$;

revoke all on function public.ensure_notification_preferences(uuid) from public;

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
    'follow', 'post_like', 'comment', 'reply', 'mention', 'direct_message', 'live_started'
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

revoke all on function public.notification_pref_allows(uuid, text) from public;

-- ---------------------------------------------------------------------------
-- 3. Supporting tables (real DB-backed Journey / points / AI)
-- ---------------------------------------------------------------------------

create table if not exists public.post_journey_countries (
  post_id bigint not null references public.posts (id) on delete cascade,
  country_code text not null
    constraint post_journey_countries_code_format check (
      country_code ~ '^[A-Z]{2}$'
    ),
  country_name text not null
    constraint post_journey_countries_name_length check (
      char_length(btrim(country_name)) between 1 and 120
    ),
  first_reached_at timestamptz not null default now(),
  view_count bigint not null default 0
    constraint post_journey_countries_views_nonneg check (view_count >= 0),
  is_trending boolean not null default false,
  trending_notified_at timestamptz,
  primary key (post_id, country_code)
);

create index if not exists post_journey_countries_post_id_idx
  on public.post_journey_countries (post_id, first_reached_at desc);

alter table public.post_journey_countries enable row level security;

drop policy if exists "Post journey countries are viewable by everyone"
  on public.post_journey_countries;
create policy "Post journey countries are viewable by everyone"
  on public.post_journey_countries
  for select
  to authenticated, anon
  using (true);

revoke insert, update, delete on public.post_journey_countries from anon, authenticated;

create table if not exists public.um_point_balances (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance bigint not null default 0
    constraint um_point_balances_nonneg check (balance >= 0),
  updated_at timestamptz not null default now()
);

alter table public.um_point_balances enable row level security;

drop policy if exists "Users can view own UM point balance"
  on public.um_point_balances;
create policy "Users can view own UM point balance"
  on public.um_point_balances
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.um_point_balances from anon, authenticated;

create table if not exists public.um_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  points integer not null
    constraint um_points_ledger_points_positive check (points > 0),
  reason text not null
    constraint um_points_ledger_reason_length check (
      char_length(btrim(reason)) between 1 and 200
    ),
  dedupe_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint um_points_ledger_dedupe_unique unique (user_id, dedupe_key)
);

create index if not exists um_points_ledger_user_created_at_idx
  on public.um_points_ledger (user_id, created_at desc);

alter table public.um_points_ledger enable row level security;

drop policy if exists "Users can view own UM points ledger"
  on public.um_points_ledger;
create policy "Users can view own UM points ledger"
  on public.um_points_ledger
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.um_points_ledger from anon, authenticated;

create table if not exists public.creator_ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  insight_key text not null
    constraint creator_ai_insights_key_length check (
      char_length(btrim(insight_key)) between 1 and 120
    ),
  title text not null
    constraint creator_ai_insights_title_length check (
      char_length(btrim(title)) between 1 and 200
    ),
  body text
    constraint creator_ai_insights_body_length check (
      body is null or char_length(body) <= 500
    ),
  category text not null default 'general'
    constraint creator_ai_insights_category_length check (
      char_length(btrim(category)) between 1 and 60
    ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint creator_ai_insights_user_key_unique unique (user_id, insight_key)
);

create index if not exists creator_ai_insights_user_created_at_idx
  on public.creator_ai_insights (user_id, created_at desc);

alter table public.creator_ai_insights enable row level security;

drop policy if exists "Users can view own AI insights"
  on public.creator_ai_insights;
create policy "Users can view own AI insights"
  on public.creator_ai_insights
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.creator_ai_insights from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Recreate create_notification with prefs + dedupe
-- ---------------------------------------------------------------------------

drop function if exists public.create_notification(
  uuid, uuid, text, text, text, text, text, text, jsonb
);

create or replace function public.create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_entity_type text default null,
  p_entity_id text default null,
  p_href text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_dedupe text := nullif(btrim(coalesce(p_dedupe_key, '')), '');
begin
  if p_recipient_id is null then
    return null;
  end if;

  if p_actor_id is not null and p_actor_id = p_recipient_id then
    return null;
  end if;

  if not public.notification_pref_allows(p_recipient_id, p_type) then
    return null;
  end if;

  if v_dedupe is not null then
    insert into public.notifications (
      recipient_id, actor_id, type, title, body,
      entity_type, entity_id, href, metadata, dedupe_key
    )
    values (
      p_recipient_id,
      p_actor_id,
      p_type,
      btrim(p_title),
      nullif(btrim(coalesce(p_body, '')), ''),
      p_entity_type,
      p_entity_id,
      p_href,
      coalesce(p_metadata, '{}'::jsonb),
      v_dedupe
    )
    on conflict on constraint notifications_recipient_dedupe_key_unique
    do nothing
    returning id into v_id;

    return v_id;
  end if;

  insert into public.notifications (
    recipient_id, actor_id, type, title, body,
    entity_type, entity_id, href, metadata, dedupe_key
  )
  values (
    p_recipient_id,
    p_actor_id,
    p_type,
    btrim(p_title),
    nullif(btrim(coalesce(p_body, '')), ''),
    p_entity_type,
    p_entity_id,
    p_href,
    coalesce(p_metadata, '{}'::jsonb),
    null
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_notification(
  uuid, uuid, text, text, text, text, text, text, jsonb, text
) from public;

-- ---------------------------------------------------------------------------
-- 5. Journey / milestone helpers
-- ---------------------------------------------------------------------------

create or replace function public.notify_post_reached_country(
  p_post_id bigint,
  p_country_code text,
  p_country_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_code text := upper(btrim(coalesce(p_country_code, '')));
  v_name text := btrim(coalesce(p_country_name, ''));
  v_inserted boolean := false;
  v_notif uuid;
  v_count int;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_post_id is null or v_code !~ '^[A-Z]{2}$' or v_name = '' then
    raise exception 'Invalid country reach payload';
  end if;

  select user_id into v_owner from public.posts where id = p_post_id;
  if v_owner is null then
    raise exception 'Post not found';
  end if;
  if v_owner <> v_uid then
    raise exception 'Only the post owner can record country reach';
  end if;

  insert into public.post_journey_countries (
    post_id, country_code, country_name
  )
  values (p_post_id, v_code, v_name)
  on conflict (post_id, country_code) do nothing;

  get diagnostics v_count = row_count;
  v_inserted := v_count > 0;

  if not v_inserted then
    return jsonb_build_object('created', false, 'notificationId', null);
  end if;

  select count(*)::int into v_count
  from public.post_journey_countries
  where post_id = p_post_id;

  v_notif := public.create_notification(
    v_owner,
    null,
    'post_reached_country',
    'Your post has reached ' || v_name || '.',
    null,
    'post',
    p_post_id::text,
    '/post-journey?postId=' || p_post_id::text,
    jsonb_build_object(
      'postId', p_post_id,
      'countryCode', v_code,
      'countryName', v_name,
      'countryCount', v_count
    ),
    'post_reached_country:' || p_post_id::text || ':' || v_code
  );

  -- Country-count milestones
  if v_count in (5, 10, 25) then
    perform public.create_notification(
      v_owner,
      null,
      'post_milestone',
      'Reached ' || v_count::text || ' countries',
      'Your post has now traveled through ' || v_count::text || ' countries.',
      'post',
      p_post_id::text,
      '/post-journey?postId=' || p_post_id::text,
      jsonb_build_object(
        'postId', p_post_id,
        'milestoneKind', 'countries',
        'milestoneValue', v_count,
        'countryCount', v_count
      ),
      'post_milestone:countries:' || p_post_id::text || ':' || v_count::text
    );
  end if;

  return jsonb_build_object(
    'created', true,
    'notificationId', v_notif,
    'countryCount', v_count
  );
end;
$$;

revoke all on function public.notify_post_reached_country(bigint, text, text) from public;
grant execute on function public.notify_post_reached_country(bigint, text, text) to authenticated;

create or replace function public.notify_post_trending_country(
  p_post_id bigint,
  p_country_code text,
  p_country_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_code text := upper(btrim(coalesce(p_country_code, '')));
  v_name text := btrim(coalesce(p_country_name, ''));
  v_notif uuid;
  v_updated int;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_post_id is null or v_code !~ '^[A-Z]{2}$' or v_name = '' then
    raise exception 'Invalid trending payload';
  end if;

  select user_id into v_owner from public.posts where id = p_post_id;
  if v_owner is null or v_owner <> v_uid then
    raise exception 'Only the post owner can mark trending';
  end if;

  -- Ensure country row exists
  insert into public.post_journey_countries (post_id, country_code, country_name)
  values (p_post_id, v_code, v_name)
  on conflict (post_id, country_code) do update
    set country_name = excluded.country_name;

  update public.post_journey_countries
  set is_trending = true,
      trending_notified_at = coalesce(trending_notified_at, now())
  where post_id = p_post_id
    and country_code = v_code
    and trending_notified_at is null;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    return jsonb_build_object('created', false, 'notificationId', null);
  end if;

  v_notif := public.create_notification(
    v_owner,
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
      'countryName', v_name
    ),
    'post_trending_country:' || p_post_id::text || ':' || v_code
  );

  return jsonb_build_object('created', v_notif is not null, 'notificationId', v_notif);
end;
$$;

revoke all on function public.notify_post_trending_country(bigint, text, text) from public;
grant execute on function public.notify_post_trending_country(bigint, text, text) to authenticated;

create or replace function public.notify_post_view_milestone(
  p_post_id bigint,
  p_views bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_views bigint := coalesce(p_views, 0);
  v_threshold bigint;
  v_notif uuid;
  v_created int := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select user_id into v_owner from public.posts where id = p_post_id;
  if v_owner is null or v_owner <> v_uid then
    raise exception 'Only the post owner can emit view milestones';
  end if;

  foreach v_threshold in array array[500, 1000, 10000, 100000]::bigint[]
  loop
    if v_views >= v_threshold then
      v_notif := public.create_notification(
        v_owner,
        null,
        'post_milestone',
        format('%s views',
          case
            when v_threshold >= 1000 then
              trim(to_char(v_threshold, 'FM999,999,999'))
            else v_threshold::text
          end
        ),
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
      if v_notif is not null then
        v_created := v_created + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object('createdCount', v_created);
end;
$$;

revoke all on function public.notify_post_view_milestone(bigint, bigint) from public;
grant execute on function public.notify_post_view_milestone(bigint, bigint) to authenticated;

create or replace function public.notify_post_journey_summary(
  p_post_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_count int;
  v_notif uuid;
  v_day text := to_char((timezone('utc', now()))::date, 'YYYY-MM-DD');
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select user_id into v_owner from public.posts where id = p_post_id;
  if v_owner is null or v_owner <> v_uid then
    raise exception 'Only the post owner can emit journey summaries';
  end if;

  select count(*)::int into v_count
  from public.post_journey_countries
  where post_id = p_post_id;

  if v_count <= 0 then
    return jsonb_build_object('created', false, 'notificationId', null);
  end if;

  v_notif := public.create_notification(
    v_owner,
    null,
    'post_journey_summary',
    'Your post has now traveled through ' || v_count::text || ' countries.',
    null,
    'post',
    p_post_id::text,
    '/post-journey?postId=' || p_post_id::text,
    jsonb_build_object(
      'postId', p_post_id,
      'countryCount', v_count
    ),
    'post_journey_summary:' || p_post_id::text || ':' || v_day
  );

  return jsonb_build_object(
    'created', v_notif is not null,
    'notificationId', v_notif,
    'countryCount', v_count
  );
end;
$$;

revoke all on function public.notify_post_journey_summary(bigint) from public;
grant execute on function public.notify_post_journey_summary(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. UM Points + reward milestones
-- ---------------------------------------------------------------------------

create or replace function public.award_um_points(
  p_points integer,
  p_reason text,
  p_dedupe_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_points integer := coalesce(p_points, 0);
  v_reason text := btrim(coalesce(p_reason, ''));
  v_dedupe text := nullif(btrim(coalesce(p_dedupe_key, '')), '');
  v_ledger_id uuid;
  v_balance bigint;
  v_notif uuid;
  v_threshold bigint;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_points <= 0 or v_reason = '' or v_dedupe is null then
    raise exception 'Invalid UM points award';
  end if;

  insert into public.um_points_ledger (
    user_id, points, reason, dedupe_key, metadata
  )
  values (
    v_uid, v_points, v_reason, v_dedupe, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, dedupe_key) do nothing
  returning id into v_ledger_id;

  if v_ledger_id is null then
    select balance into v_balance
    from public.um_point_balances
    where user_id = v_uid;

    return jsonb_build_object(
      'created', false,
      'balance', coalesce(v_balance, 0),
      'notificationId', null
    );
  end if;

  insert into public.um_point_balances (user_id, balance, updated_at)
  values (v_uid, v_points, now())
  on conflict (user_id) do update
    set balance = public.um_point_balances.balance + excluded.balance,
        updated_at = now()
  returning balance into v_balance;

  v_notif := public.create_notification(
    v_uid,
    null,
    'um_points_earned',
    'You earned ' || v_points::text || ' UM Points for ' || v_reason || '.',
    null,
    'reward',
    v_ledger_id::text,
    '/settings?section=notifications',
    jsonb_build_object(
      'points', v_points,
      'reason', v_reason,
      'balance', v_balance,
      'ledgerId', v_ledger_id
    ) || coalesce(p_metadata, '{}'::jsonb),
    'um_points_earned:' || v_dedupe
  );

  foreach v_threshold in array array[1000, 5000, 10000, 50000, 100000]::bigint[]
  loop
    if v_balance >= v_threshold then
      perform public.create_notification(
        v_uid,
        null,
        'reward_milestone',
        'You reached ' || trim(to_char(v_threshold, 'FM999,999,999')) || ' UM Points.',
        null,
        'reward',
        v_uid::text,
        '/settings?section=notifications',
        jsonb_build_object(
          'points', v_threshold,
          'milestoneKind', 'um_points',
          'milestoneValue', v_threshold,
          'balance', v_balance
        ),
        'reward_milestone:um_points:' || v_uid::text || ':' || v_threshold::text
      );
    end if;
  end loop;

  return jsonb_build_object(
    'created', true,
    'balance', v_balance,
    'ledgerId', v_ledger_id,
    'notificationId', v_notif
  );
end;
$$;

revoke all on function public.award_um_points(integer, text, text, jsonb) from public;
grant execute on function public.award_um_points(integer, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. AI creator insight helper
-- ---------------------------------------------------------------------------

create or replace function public.notify_ai_creator_insight(
  p_insight_key text,
  p_title text,
  p_body text default null,
  p_category text default 'general',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_key text := btrim(coalesce(p_insight_key, ''));
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_category text := nullif(btrim(coalesce(p_category, '')), '');
  v_insight_id uuid;
  v_notif uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_key = '' or v_title = '' then
    raise exception 'Invalid AI insight payload';
  end if;

  insert into public.creator_ai_insights (
    user_id, insight_key, title, body, category, metadata
  )
  values (
    v_uid,
    v_key,
    v_title,
    v_body,
    coalesce(v_category, 'general'),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, insight_key) do nothing
  returning id into v_insight_id;

  if v_insight_id is null then
    return jsonb_build_object('created', false, 'notificationId', null);
  end if;

  v_notif := public.create_notification(
    v_uid,
    null,
    'ai_creator_insight',
    v_title,
    v_body,
    'ai_insight',
    v_insight_id::text,
    '/settings?section=notifications',
    jsonb_build_object(
      'insightId', v_insight_id,
      'insightKey', v_key,
      'category', coalesce(v_category, 'general')
    ) || coalesce(p_metadata, '{}'::jsonb),
    'ai_creator_insight:' || v_uid::text || ':' || v_key
  );

  return jsonb_build_object(
    'created', v_notif is not null,
    'insightId', v_insight_id,
    'notificationId', v_notif
  );
end;
$$;

revoke all on function public.notify_ai_creator_insight(text, text, text, text, jsonb) from public;
grant execute on function public.notify_ai_creator_insight(text, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Nearby live (city/area only, opt-in, never exact coords)
-- ---------------------------------------------------------------------------

create or replace function public.notify_on_live_started()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
  r record;
  v_city text;
  v_country text;
begin
  if tg_op = 'UPDATE'
     and old.status is distinct from 'live'
     and new.status = 'live' then
    v_label := public.notification_actor_label(new.host_id);

    -- Followers (V1)
    for r in
      select follower_id
      from public.profile_follows
      where following_id = new.host_id
    loop
      perform public.create_notification(
        r.follower_id,
        new.host_id,
        'live_started',
        v_label || ' is live now',
        nullif(btrim(coalesce(new.title, '')), ''),
        'live_room',
        new.id::text,
        '/live/' || new.id::text,
        jsonb_build_object('roomId', new.id, 'title', new.title),
        'live_started:' || new.id::text || ':' || r.follower_id::text
      );
    end loop;

    -- Nearby (V2): approximate city match only; prefs default OFF
    v_city := nullif(lower(btrim(coalesce(new.city, ''))), '');
    v_country := nullif(btrim(coalesce(new.country, '')), '');

    if v_city is not null then
      for r in
        select p.id as user_id, p.city, p.country
        from public.profiles p
        join public.notification_preferences pref on pref.user_id = p.id
        where pref.nearby_live_enabled = true
          and p.id <> new.host_id
          and nullif(lower(btrim(coalesce(p.city, ''))), '') = v_city
          and not exists (
            select 1
            from public.profile_follows f
            where f.follower_id = p.id
              and f.following_id = new.host_id
          )
      loop
        perform public.create_notification(
          r.user_id,
          new.host_id,
          'nearby_live_started',
          'A live started near ' || btrim(coalesce(new.city, 'you')),
          case
            when v_country is not null then
              btrim(coalesce(new.city, '')) || ', ' || v_country
            else
              nullif(btrim(coalesce(new.city, '')), '')
          end,
          'live_room',
          new.id::text,
          '/live/' || new.id::text,
          jsonb_build_object(
            'roomId', new.id,
            'title', new.title,
            'city', nullif(btrim(coalesce(new.city, '')), ''),
            'country', v_country
            -- Never include latitude/longitude
          ),
          'nearby_live_started:' || new.id::text || ':' || r.user_id::text
        );
      end loop;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists live_rooms_notify_started on public.live_rooms;
create trigger live_rooms_notify_started
  after update of status on public.live_rooms
  for each row execute function public.notify_on_live_started();

-- ---------------------------------------------------------------------------
-- 9. Preferences RPCs + filtered list
-- ---------------------------------------------------------------------------

create or replace function public.get_my_notification_preferences()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.notification_preferences;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_row := public.ensure_notification_preferences(v_uid);

  return jsonb_build_object(
    'journeyEnabled', v_row.journey_enabled,
    'rewardsEnabled', v_row.rewards_enabled,
    'nearbyLiveEnabled', v_row.nearby_live_enabled,
    'aiInsightsEnabled', v_row.ai_insights_enabled,
    'socialEnabled', v_row.social_enabled,
    'updatedAt', v_row.updated_at
  );
end;
$$;

revoke all on function public.get_my_notification_preferences() from public;
grant execute on function public.get_my_notification_preferences() to authenticated;

create or replace function public.update_my_notification_preferences(
  p_journey_enabled boolean default null,
  p_rewards_enabled boolean default null,
  p_nearby_live_enabled boolean default null,
  p_ai_insights_enabled boolean default null,
  p_social_enabled boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.notification_preferences;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  perform public.ensure_notification_preferences(v_uid);

  update public.notification_preferences
  set
    journey_enabled = coalesce(p_journey_enabled, journey_enabled),
    rewards_enabled = coalesce(p_rewards_enabled, rewards_enabled),
    nearby_live_enabled = coalesce(p_nearby_live_enabled, nearby_live_enabled),
    ai_insights_enabled = coalesce(p_ai_insights_enabled, ai_insights_enabled),
    social_enabled = coalesce(p_social_enabled, social_enabled),
    updated_at = now()
  where user_id = v_uid
  returning * into v_row;

  return jsonb_build_object(
    'journeyEnabled', v_row.journey_enabled,
    'rewardsEnabled', v_row.rewards_enabled,
    'nearbyLiveEnabled', v_row.nearby_live_enabled,
    'aiInsightsEnabled', v_row.ai_insights_enabled,
    'socialEnabled', v_row.social_enabled,
    'updatedAt', v_row.updated_at
  );
end;
$$;

revoke all on function public.update_my_notification_preferences(
  boolean, boolean, boolean, boolean, boolean
) from public;
grant execute on function public.update_my_notification_preferences(
  boolean, boolean, boolean, boolean, boolean
) to authenticated;

-- Replace list RPC with optional category filter (keeps 2-arg calls working via default)
drop function if exists public.list_my_notifications(int, timestamptz);

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
                'mention', 'direct_message'
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

