-- UMTUBA Notifications V2 Automation
-- Connects real views / journey / UM Points to the V2 notification foundation.
-- Additive. Apply after 20260716_notifications_v2.sql.
-- Never stores precise coordinates — approximate country/city only.

-- ---------------------------------------------------------------------------
-- 1. Extend post_views telemetry
-- ---------------------------------------------------------------------------

alter table public.post_views
  add column if not exists viewer_id uuid references auth.users (id) on delete set null;

alter table public.post_views
  add column if not exists country_code text
    constraint post_views_country_code_format check (
      country_code is null or country_code ~ '^[A-Z]{2}$'
    );

alter table public.post_views
  add column if not exists country_name text
    constraint post_views_country_name_length check (
      country_name is null or char_length(btrim(country_name)) between 1 and 120
    );

alter table public.post_views
  add column if not exists city text
    constraint post_views_city_length check (
      city is null or char_length(btrim(city)) between 1 and 120
    );

alter table public.post_views
  add column if not exists qualified_view boolean not null default true;

alter table public.post_views
  add column if not exists viewed_at timestamptz;

-- Backfill viewed_at from last_viewed_at
update public.post_views
set viewed_at = coalesce(viewed_at, last_viewed_at, now())
where viewed_at is null;

alter table public.post_views
  alter column viewed_at set default now();

create index if not exists post_views_post_viewed_at_idx
  on public.post_views (post_id, viewed_at desc);

create index if not exists post_views_viewer_id_viewed_at_idx
  on public.post_views (viewer_id, viewed_at desc)
  where viewer_id is not null;

create index if not exists post_views_post_country_idx
  on public.post_views (post_id, country_code, viewed_at desc)
  where country_code is not null;

create index if not exists post_views_qualified_post_idx
  on public.post_views (post_id, viewed_at desc)
  where qualified_view = true;

drop policy if exists "Post owners can read view telemetry" on public.post_views;
create policy "Post owners can read view telemetry"
  on public.post_views
  for select
  to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.user_id = (select auth.uid())
    )
    or viewer_id = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 2. UM Points config (single place) + invite foundation
-- ---------------------------------------------------------------------------

create table if not exists public.um_points_config (
  key text primary key,
  value integer not null,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.um_points_config (key, value, description) values
  ('verified_welcome', 100, 'One-time verified account welcome bonus'),
  ('first_post_of_day', 25, 'First qualified post published each UTC day'),
  ('meaningful_comment', 5, 'Meaningful comment (min length)'),
  ('creator_qualified_save', 3, 'Creator receives a qualified save'),
  ('creator_qualified_share', 5, 'Creator receives a qualified share'),
  ('invite_active', 50, 'Invitee becomes active'),
  ('daily_earn_cap', 200, 'Max UM Points a user can earn per UTC day'),
  ('comment_min_length', 20, 'Min chars for meaningful comment'),
  ('comment_daily_cap_points', 25, 'Max points from comments per day'),
  ('save_daily_cap_points', 30, 'Max points from saves received per day'),
  ('share_daily_cap_points', 20, 'Max points from shares received per day'),
  ('trending_min_country_views', 20, 'Min country views before trending eligible'),
  ('trending_recent_window_hours', 24, 'Recent growth window for trending'),
  ('trending_recent_min_views', 10, 'Min recent views in window for trending')
on conflict (key) do nothing;

alter table public.um_points_config enable row level security;

drop policy if exists "UM points config is readable" on public.um_points_config;
create policy "UM points config is readable"
  on public.um_points_config
  for select
  to authenticated, anon
  using (true);

revoke insert, update, delete on public.um_points_config from anon, authenticated;

create or replace function public.um_points_config_value(p_key text, p_default integer default 0)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value from public.um_points_config where key = p_key),
    p_default
  );
$$;

revoke all on function public.um_points_config_value(text, integer) from public;

create table if not exists public.user_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users (id) on delete cascade,
  invite_code text not null
    constraint user_invites_code_format check (
      invite_code ~ '^[A-Z0-9]{6,16}$'
    ),
  invitee_id uuid unique references auth.users (id) on delete set null,
  claimed_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_invites_code_unique unique (invite_code),
  constraint user_invites_no_self check (
    invitee_id is null or invitee_id <> inviter_id
  )
);

create index if not exists user_invites_inviter_id_idx
  on public.user_invites (inviter_id, created_at desc);

alter table public.user_invites enable row level security;

drop policy if exists "Users can view own invites" on public.user_invites;
create policy "Users can view own invites"
  on public.user_invites
  for select
  to authenticated
  using (
    inviter_id = (select auth.uid())
    or invitee_id = (select auth.uid())
  );

revoke insert, update, delete on public.user_invites from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. System award helper (any recipient) with daily caps + ledger dedupe
-- ---------------------------------------------------------------------------

create or replace function public.um_points_earned_today(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(points), 0)::integer
  from public.um_points_ledger
  where user_id = p_user_id
    and created_at >= date_trunc('day', timezone('utc', now()))
    and created_at < date_trunc('day', timezone('utc', now())) + interval '1 day';
$$;

revoke all on function public.um_points_earned_today(uuid) from public;

create or replace function public.award_um_points_to_user(
  p_user_id uuid,
  p_points integer,
  p_reason text,
  p_dedupe_key text,
  p_metadata jsonb default '{}'::jsonb,
  p_category_daily_cap integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer := coalesce(p_points, 0);
  v_reason text := btrim(coalesce(p_reason, ''));
  v_dedupe text := nullif(btrim(coalesce(p_dedupe_key, '')), '');
  v_ledger_id uuid;
  v_balance bigint;
  v_notif uuid;
  v_threshold bigint;
  v_earned_today integer;
  v_daily_cap integer := public.um_points_config_value('daily_earn_cap', 200);
  v_category_earned integer := 0;
  v_category text := coalesce(p_metadata->>'category', '');
begin
  if p_user_id is null or v_points <= 0 or v_reason = '' or v_dedupe is null then
    return jsonb_build_object('created', false, 'reason', 'invalid');
  end if;

  v_earned_today := public.um_points_earned_today(p_user_id);
  if v_earned_today >= v_daily_cap then
    return jsonb_build_object(
      'created', false,
      'reason', 'daily_cap',
      'balance', coalesce((select balance from public.um_point_balances where user_id = p_user_id), 0)
    );
  end if;

  if v_points > (v_daily_cap - v_earned_today) then
    v_points := greatest(0, v_daily_cap - v_earned_today);
  end if;

  if v_points <= 0 then
    return jsonb_build_object('created', false, 'reason', 'daily_cap');
  end if;

  if p_category_daily_cap is not null and v_category <> '' then
    select coalesce(sum(points), 0)::integer into v_category_earned
    from public.um_points_ledger
    where user_id = p_user_id
      and created_at >= date_trunc('day', timezone('utc', now()))
      and metadata->>'category' = v_category;

    if v_category_earned >= p_category_daily_cap then
      return jsonb_build_object('created', false, 'reason', 'category_cap');
    end if;

    if v_points > (p_category_daily_cap - v_category_earned) then
      v_points := greatest(0, p_category_daily_cap - v_category_earned);
    end if;

    if v_points <= 0 then
      return jsonb_build_object('created', false, 'reason', 'category_cap');
    end if;
  end if;

  insert into public.um_points_ledger (
    user_id, points, reason, dedupe_key, metadata
  )
  values (
    p_user_id, v_points, v_reason, v_dedupe, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, dedupe_key) do nothing
  returning id into v_ledger_id;

  if v_ledger_id is null then
    return jsonb_build_object(
      'created', false,
      'reason', 'deduped',
      'balance', coalesce((select balance from public.um_point_balances where user_id = p_user_id), 0)
    );
  end if;

  insert into public.um_point_balances (user_id, balance, updated_at)
  values (p_user_id, v_points, now())
  on conflict (user_id) do update
    set balance = public.um_point_balances.balance + excluded.balance,
        updated_at = now()
  returning balance into v_balance;

  v_notif := public.create_notification(
    p_user_id,
    null,
    'um_points_earned',
    'You earned ' || v_points::text || ' UM Points for ' || v_reason || '.',
    null,
    'reward',
    v_ledger_id::text,
    '/rewards',
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
        p_user_id,
        null,
        'reward_milestone',
        'You reached ' || trim(to_char(v_threshold, 'FM999,999,999')) || ' UM Points.',
        null,
        'reward',
        p_user_id::text,
        '/rewards',
        jsonb_build_object(
          'points', v_threshold,
          'milestoneKind', 'um_points',
          'milestoneValue', v_threshold,
          'balance', v_balance
        ),
        'reward_milestone:um_points:' || p_user_id::text || ':' || v_threshold::text
      );
    end if;
  end loop;

  return jsonb_build_object(
    'created', true,
    'balance', v_balance,
    'ledgerId', v_ledger_id,
    'points', v_points,
    'notificationId', v_notif
  );
end;
$$;

revoke all on function public.award_um_points_to_user(uuid, integer, text, text, jsonb, integer) from public;

-- Replace self-award wrapper to use system helper + /rewards
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
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  return public.award_um_points_to_user(
    v_uid, p_points, p_reason, p_dedupe_key, p_metadata, null
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Journey automation (internal, SECURITY DEFINER)
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
  v_city text := nullif(btrim(coalesce(p_city, '')), '');
  v_inserted boolean := false;
  v_row_count int;
  v_country_count int;
  v_country_views bigint;
  v_recent int;
  v_trend_min int := public.um_points_config_value('trending_min_country_views', 20);
  v_trend_window int := public.um_points_config_value('trending_recent_window_hours', 24);
  v_trend_recent int := public.um_points_config_value('trending_recent_min_views', 10);
  v_threshold bigint;
  v_day text := to_char((timezone('utc', now()))::date, 'YYYY-MM-DD');
begin
  if p_owner_id is null or p_post_id is null then
    return;
  end if;

  -- View milestones (idempotent via dedupe_key)
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
    end if;
  end loop;

  if v_code !~ '^[A-Z]{2}$' then
    return;
  end if;

  if v_name is null then
    v_name := v_code;
  end if;

  insert into public.post_journey_countries (
    post_id, country_code, country_name, view_count
  )
  values (p_post_id, v_code, v_name, 1)
  on conflict (post_id, country_code) do update
    set view_count = public.post_journey_countries.view_count + 1,
        country_name = excluded.country_name
  returning (xmax = 0) into v_inserted;

  -- xmax=0 means inserted; on conflict update xmax != 0. In PG, use GET DIAGNOSTICS differently.
  -- Safer: check if first_reached_at is within this transaction via row count before/after.
end;
$$;

-- Rewrite journey processor more clearly without xmax trick
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
  end if;

  -- Journey summary (daily dedupe)
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

    if found then
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

revoke all on function public.process_post_journey_from_view(
  bigint, uuid, bigint, text, text, text
) from public;

-- ---------------------------------------------------------------------------
-- 5. Replace record_post_view with geo + automation
-- ---------------------------------------------------------------------------

drop function if exists public.record_post_view(bigint, text);

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
  if v_owner is null then
    raise exception 'Post not found';
  end if;

  -- Never accept anything that looks like coordinates
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

-- ---------------------------------------------------------------------------
-- 6. UM Points automation hooks
-- ---------------------------------------------------------------------------

create or replace function public.claim_verified_welcome_bonus()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_confirmed timestamptz;
  v_points integer := public.um_points_config_value('verified_welcome', 100);
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select email_confirmed_at into v_confirmed
  from auth.users
  where id = v_uid;

  if v_confirmed is null then
    return jsonb_build_object('created', false, 'reason', 'not_verified');
  end if;

  return public.award_um_points_to_user(
    v_uid,
    v_points,
    'verified account welcome',
    'verified_welcome:' || v_uid::text,
    jsonb_build_object('category', 'welcome'),
    null
  );
end;
$$;

revoke all on function public.claim_verified_welcome_bonus() from public;
grant execute on function public.claim_verified_welcome_bonus() to authenticated;

create or replace function public.notify_on_first_post_of_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer := public.um_points_config_value('first_post_of_day', 25);
  v_day text := to_char((timezone('utc', now()))::date, 'YYYY-MM-DD');
begin
  if new.user_id is null then
    return new;
  end if;

  perform public.award_um_points_to_user(
    new.user_id,
    v_points,
    'first post of the day',
    'first_post_of_day:' || new.user_id::text || ':' || v_day,
    jsonb_build_object('category', 'create', 'postId', new.id),
    null
  );

  -- Invite activation: first post marks invitee active
  update public.user_invites
  set rewarded_at = now()
  where invitee_id = new.user_id
    and rewarded_at is null
    and claimed_at is not null
  returning inviter_id into new; -- can't use new like this

  return new;
end;
$$;

-- Fix invite activation properly
create or replace function public.notify_on_first_post_of_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer := public.um_points_config_value('first_post_of_day', 25);
  v_invite_points integer := public.um_points_config_value('invite_active', 50);
  v_day text := to_char((timezone('utc', now()))::date, 'YYYY-MM-DD');
  v_inviter uuid;
  v_invite_id uuid;
begin
  if new.user_id is null then
    return new;
  end if;

  perform public.award_um_points_to_user(
    new.user_id,
    v_points,
    'first post of the day',
    'first_post_of_day:' || new.user_id::text || ':' || v_day,
    jsonb_build_object('category', 'create', 'postId', new.id),
    null
  );

  select id, inviter_id into v_invite_id, v_inviter
  from public.user_invites
  where invitee_id = new.user_id
    and rewarded_at is null
    and claimed_at is not null
  limit 1;

  if v_inviter is not null and v_invite_id is not null then
    update public.user_invites
    set rewarded_at = now()
    where id = v_invite_id
      and rewarded_at is null;

    if found then
      perform public.award_um_points_to_user(
        v_inviter,
        v_invite_points,
        'invited user became active',
        'invite_active:' || v_invite_id::text,
        jsonb_build_object(
          'category', 'invite',
          'inviteeId', new.user_id,
          'inviteId', v_invite_id
        ),
        null
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists posts_first_of_day_um_points on public.posts;
create trigger posts_first_of_day_um_points
  after insert on public.posts
  for each row execute function public.notify_on_first_post_of_day();

create or replace function public.notify_on_meaningful_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min int := public.um_points_config_value('comment_min_length', 20);
  v_points int := public.um_points_config_value('meaningful_comment', 5);
  v_cap int := public.um_points_config_value('comment_daily_cap_points', 25);
  v_owner uuid;
begin
  if new.user_id is null then
    return new;
  end if;

  if char_length(btrim(coalesce(new.body, ''))) < v_min then
    return new;
  end if;

  select user_id into v_owner from public.posts where id = new.post_id;

  -- Block self-interaction rewards
  if v_owner is not null and v_owner = new.user_id then
    return new;
  end if;

  perform public.award_um_points_to_user(
    new.user_id,
    v_points,
    'meaningful engagement',
    'meaningful_comment:' || new.id::text,
    jsonb_build_object(
      'category', 'comment',
      'postId', new.post_id,
      'commentId', new.id
    ),
    v_cap
  );

  return new;
end;
$$;

drop trigger if exists post_comments_um_points on public.post_comments;
create trigger post_comments_um_points
  after insert on public.post_comments
  for each row execute function public.notify_on_meaningful_comment();

-- Patch save RPC to award creator (not self)
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

-- Patch share RPC to award creator
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
    perform public.award_um_points_to_user(
      v_owner,
      v_points,
      'qualified share',
      'creator_share:' || p_post_id::text || ':' || v_key || ':' || to_char(date_trunc('day', timezone('utc', now())), 'YYYYMMDD'),
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

-- Invite RPCs
create or replace function public.create_my_invite_code()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_id uuid;
  v_existing text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select invite_code into v_existing
  from public.user_invites
  where inviter_id = v_uid
    and invitee_id is null
  order by created_at desc
  limit 1;

  if v_existing is not null then
    return jsonb_build_object('inviteCode', v_existing, 'created', false);
  end if;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.user_invites (inviter_id, invite_code)
  values (v_uid, v_code)
  returning id into v_id;

  return jsonb_build_object('inviteCode', v_code, 'created', true, 'id', v_id);
end;
$$;

revoke all on function public.create_my_invite_code() from public;
grant execute on function public.create_my_invite_code() to authenticated;

create or replace function public.claim_invite_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_code !~ '^[A-Z0-9]{6,16}$' then
    raise exception 'Invalid invite code';
  end if;

  if exists (select 1 from public.user_invites where invitee_id = v_uid) then
    return jsonb_build_object('claimed', false, 'reason', 'already_claimed');
  end if;

  update public.user_invites
  set invitee_id = v_uid,
      claimed_at = now()
  where invite_code = v_code
    and invitee_id is null
    and inviter_id <> v_uid
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('claimed', false, 'reason', 'unavailable');
  end if;

  return jsonb_build_object('claimed', true, 'id', v_id);
end;
$$;

revoke all on function public.claim_invite_code(text) from public;
grant execute on function public.claim_invite_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Read APIs: journey, rewards, insights + fix AI href
-- ---------------------------------------------------------------------------

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
begin
  select user_id, views into v_owner, v_views
  from public.posts
  where id = p_post_id;

  if v_owner is null then
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

create or replace function public.get_my_um_points_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_balance bigint := 0;
  v_next bigint;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select balance into v_balance
  from public.um_point_balances
  where user_id = v_uid;

  v_balance := coalesce(v_balance, 0);

  select m into v_next
  from unnest(array[1000, 5000, 10000, 50000, 100000]::bigint[]) as m
  where m > v_balance
  order by m
  limit 1;

  return jsonb_build_object(
    'balance', v_balance,
    'earnedToday', public.um_points_earned_today(v_uid),
    'dailyCap', public.um_points_config_value('daily_earn_cap', 200),
    'nextMilestone', v_next,
    'ledger', coalesce(
      (
        select jsonb_agg(to_jsonb(x) order by x."createdAt" desc)
        from (
          select
            l.id,
            l.points,
            l.reason,
            l.metadata,
            l.created_at as "createdAt"
          from public.um_points_ledger l
          where l.user_id = v_uid
          order by l.created_at desc
          limit 30
        ) x
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.get_my_um_points_summary() from public;
grant execute on function public.get_my_um_points_summary() to authenticated;

create or replace function public.get_my_creator_insights()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(x) order by x."createdAt" desc)
      from (
        select
          i.id,
          i.insight_key as "insightKey",
          i.title,
          i.body,
          i.category,
          i.metadata,
          i.created_at as "createdAt"
        from public.creator_ai_insights i
        where i.user_id = v_uid
        order by i.created_at desc
        limit 50
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.get_my_creator_insights() from public;
grant execute on function public.get_my_creator_insights() to authenticated;

-- Update AI insight notifications to /creator/insights
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
    '/creator/insights',
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
