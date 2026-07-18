-- Discover & Watch Recommendation Infrastructure V1
-- Additive only. Safe to re-run. Does not drop existing tables or data.
-- Apply manually in Supabase SQL Editor after 20260730_media_pipeline_v1.sql
-- (and prior social / referral / live migrations).
--
-- Goals:
-- 1) Persist watch-quality + engagement signals for ranking.
-- 2) Maintain user interest profiles, creator quality, and video quality aggregates.
-- 3) Schema-ready for future ML (feature jsonb + model_version) — no AI in V1.
-- 4) Does NOT change chronological Discover/Watch feed APIs, Media Pipeline,
--    Messenger, or Rewards award paths.
--
-- Client-callable: record_watch_signal (authenticated + anon with device key).
-- Aggregate refresh helpers are SECURITY DEFINER; execute revoked from clients.

-- ---------------------------------------------------------------------------
-- 1. watch_signals — per-session watch + engagement snapshot
-- ---------------------------------------------------------------------------

create table if not exists public.watch_signals (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  creator_id uuid references auth.users (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  viewer_key text not null,
  session_id text not null,
  surface text not null default 'discover'
    check (surface in ('discover', 'watch')),
  watch_duration_ms integer not null default 0
    check (watch_duration_ms >= 0),
  watch_percent numeric(5, 2) not null default 0
    check (watch_percent >= 0 and watch_percent <= 100),
  completed boolean not null default false,
  rewatch_count integer not null default 0
    check (rewatch_count >= 0),
  liked boolean not null default false,
  saved boolean not null default false,
  shared boolean not null default false,
  commented boolean not null default false,
  follow_after_watch boolean not null default false,
  skipped_early boolean not null default false,
  -- Reserved for future ML feature dumps (unused in deterministic V1).
  ml_features jsonb not null default '{}'::jsonb,
  model_version text not null default 'deterministic-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watch_signals_viewer_session_unique
    unique (viewer_key, post_id, session_id),
  constraint watch_signals_viewer_key_format check (
    viewer_key ~ '^(u:[0-9a-f-]{36}|d:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'
  ),
  constraint watch_signals_session_id_format check (
    char_length(btrim(session_id)) between 8 and 64
  )
);

create index if not exists watch_signals_post_id_created_at_idx
  on public.watch_signals (post_id, created_at desc);

create index if not exists watch_signals_user_id_created_at_idx
  on public.watch_signals (user_id, created_at desc)
  where user_id is not null;

create index if not exists watch_signals_creator_id_created_at_idx
  on public.watch_signals (creator_id, created_at desc)
  where creator_id is not null;

create index if not exists watch_signals_viewer_key_created_at_idx
  on public.watch_signals (viewer_key, created_at desc);

alter table public.watch_signals enable row level security;

drop policy if exists "Users can view their own watch signals" on public.watch_signals;
create policy "Users can view their own watch signals"
  on public.watch_signals
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No direct client insert/update/delete — writes go through record_watch_signal.
revoke all on table public.watch_signals from anon, authenticated;
grant select on table public.watch_signals to authenticated;

-- ---------------------------------------------------------------------------
-- 2. user_interest_profiles — per-user affinity aggregates
-- ---------------------------------------------------------------------------

create table if not exists public.user_interest_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tag_weights jsonb not null default '{}'::jsonb,
  creator_affinity jsonb not null default '{}'::jsonb,
  signal_counts jsonb not null default '{}'::jsonb,
  avg_watch_percent numeric(5, 2) not null default 0,
  completion_rate numeric(5, 4) not null default 0,
  skip_rate numeric(5, 4) not null default 0,
  positive_engagement_rate numeric(5, 4) not null default 0,
  total_signals integer not null default 0 check (total_signals >= 0),
  freshness_score numeric(5, 4) not null default 0,
  -- Reserved ML payload (empty in V1).
  ml_features jsonb not null default '{}'::jsonb,
  model_version text not null default 'deterministic-v1',
  last_computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_interest_profiles enable row level security;

drop policy if exists "Users can view their own interest profile"
  on public.user_interest_profiles;
create policy "Users can view their own interest profile"
  on public.user_interest_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.user_interest_profiles from anon, authenticated;
grant select on table public.user_interest_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 3. creator_quality_signals — per-creator quality aggregates
-- ---------------------------------------------------------------------------

create table if not exists public.creator_quality_signals (
  creator_id uuid primary key references auth.users (id) on delete cascade,
  video_count integer not null default 0 check (video_count >= 0),
  total_watches integer not null default 0 check (total_watches >= 0),
  avg_watch_percent numeric(5, 2) not null default 0,
  completion_rate numeric(5, 4) not null default 0,
  rewatch_rate numeric(5, 4) not null default 0,
  like_rate numeric(5, 4) not null default 0,
  save_rate numeric(5, 4) not null default 0,
  share_rate numeric(5, 4) not null default 0,
  comment_rate numeric(5, 4) not null default 0,
  follow_rate numeric(5, 4) not null default 0,
  skip_rate numeric(5, 4) not null default 0,
  quality_score numeric(8, 4) not null default 0,
  ml_features jsonb not null default '{}'::jsonb,
  model_version text not null default 'deterministic-v1',
  last_computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.creator_quality_signals enable row level security;

-- Public-read aggregates (no PII) — useful for ranking without exposing raw signals.
drop policy if exists "Creator quality signals are publicly readable"
  on public.creator_quality_signals;
create policy "Creator quality signals are publicly readable"
  on public.creator_quality_signals
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on table public.creator_quality_signals
  from anon, authenticated;
grant select on table public.creator_quality_signals to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. video_quality_signals — per-post quality aggregates
-- ---------------------------------------------------------------------------

create table if not exists public.video_quality_signals (
  post_id bigint primary key references public.posts (id) on delete cascade,
  creator_id uuid references auth.users (id) on delete set null,
  total_watches integer not null default 0 check (total_watches >= 0),
  avg_watch_percent numeric(5, 2) not null default 0,
  avg_watch_duration_ms integer not null default 0 check (avg_watch_duration_ms >= 0),
  completion_rate numeric(5, 4) not null default 0,
  rewatch_rate numeric(5, 4) not null default 0,
  like_rate numeric(5, 4) not null default 0,
  save_rate numeric(5, 4) not null default 0,
  share_rate numeric(5, 4) not null default 0,
  comment_rate numeric(5, 4) not null default 0,
  follow_rate numeric(5, 4) not null default 0,
  skip_rate numeric(5, 4) not null default 0,
  quality_score numeric(8, 4) not null default 0,
  ml_features jsonb not null default '{}'::jsonb,
  model_version text not null default 'deterministic-v1',
  last_computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_quality_signals_creator_id_idx
  on public.video_quality_signals (creator_id)
  where creator_id is not null;

create index if not exists video_quality_signals_quality_score_idx
  on public.video_quality_signals (quality_score desc);

alter table public.video_quality_signals enable row level security;

drop policy if exists "Video quality signals are publicly readable"
  on public.video_quality_signals;
create policy "Video quality signals are publicly readable"
  on public.video_quality_signals
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on table public.video_quality_signals
  from anon, authenticated;
grant select on table public.video_quality_signals to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Deterministic quality score helper (mirrors app weights; no AI)
-- ---------------------------------------------------------------------------

create or replace function public.compute_deterministic_quality_score(
  p_avg_watch_percent numeric,
  p_completion_rate numeric,
  p_rewatch_rate numeric,
  p_like_rate numeric,
  p_save_rate numeric,
  p_share_rate numeric,
  p_comment_rate numeric,
  p_follow_rate numeric,
  p_skip_rate numeric
)
returns numeric
language sql
immutable
as $$
  select round(
    (
      least(greatest(coalesce(p_avg_watch_percent, 0) / 100.0, 0), 1) * 0.22
      + least(greatest(coalesce(p_completion_rate, 0), 0), 1) * 0.18
      + least(greatest(coalesce(p_rewatch_rate, 0), 0), 1) * 0.06
      + least(greatest(coalesce(p_like_rate, 0), 0), 1) * 0.12
      + least(greatest(coalesce(p_save_rate, 0), 0), 1) * 0.12
      + least(greatest(coalesce(p_share_rate, 0), 0), 1) * 0.08
      + least(greatest(coalesce(p_comment_rate, 0), 0), 1) * 0.08
      + least(greatest(coalesce(p_follow_rate, 0), 0), 1) * 0.10
      - least(greatest(coalesce(p_skip_rate, 0), 0), 1) * 0.16
    )::numeric,
    4
  );
$$;

revoke all on function public.compute_deterministic_quality_score(
  numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Refresh video quality from watch_signals
-- ---------------------------------------------------------------------------

create or replace function public.refresh_video_quality_signals(p_post_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid;
  v_total integer;
  v_avg_pct numeric;
  v_avg_dur integer;
  v_completion numeric;
  v_rewatch numeric;
  v_like numeric;
  v_save numeric;
  v_share numeric;
  v_comment numeric;
  v_follow numeric;
  v_skip numeric;
  v_score numeric;
begin
  if p_post_id is null or p_post_id <= 0 then
    return;
  end if;

  select p.user_id into v_creator
  from public.posts p
  where p.id = p_post_id;

  select
    count(*)::integer,
    coalesce(avg(s.watch_percent), 0),
    coalesce(avg(s.watch_duration_ms), 0)::integer,
    coalesce(avg(case when s.completed then 1.0 else 0.0 end), 0),
    coalesce(avg(least(s.rewatch_count, 5)::numeric / 5.0), 0),
    coalesce(avg(case when s.liked then 1.0 else 0.0 end), 0),
    coalesce(avg(case when s.saved then 1.0 else 0.0 end), 0),
    coalesce(avg(case when s.shared then 1.0 else 0.0 end), 0),
    coalesce(avg(case when s.commented then 1.0 else 0.0 end), 0),
    coalesce(avg(case when s.follow_after_watch then 1.0 else 0.0 end), 0),
    coalesce(avg(case when s.skipped_early then 1.0 else 0.0 end), 0)
  into
    v_total, v_avg_pct, v_avg_dur, v_completion, v_rewatch,
    v_like, v_save, v_share, v_comment, v_follow, v_skip
  from public.watch_signals s
  where s.post_id = p_post_id;

  if coalesce(v_total, 0) = 0 then
    return;
  end if;

  v_score := public.compute_deterministic_quality_score(
    v_avg_pct, v_completion, v_rewatch, v_like, v_save,
    v_share, v_comment, v_follow, v_skip
  );

  insert into public.video_quality_signals as vqs (
    post_id,
    creator_id,
    total_watches,
    avg_watch_percent,
    avg_watch_duration_ms,
    completion_rate,
    rewatch_rate,
    like_rate,
    save_rate,
    share_rate,
    comment_rate,
    follow_rate,
    skip_rate,
    quality_score,
    model_version,
    last_computed_at,
    updated_at
  )
  values (
    p_post_id,
    v_creator,
    v_total,
    round(v_avg_pct::numeric, 2),
    v_avg_dur,
    round(v_completion::numeric, 4),
    round(v_rewatch::numeric, 4),
    round(v_like::numeric, 4),
    round(v_save::numeric, 4),
    round(v_share::numeric, 4),
    round(v_comment::numeric, 4),
    round(v_follow::numeric, 4),
    round(v_skip::numeric, 4),
    v_score,
    'deterministic-v1',
    now(),
    now()
  )
  on conflict (post_id) do update set
    creator_id = excluded.creator_id,
    total_watches = excluded.total_watches,
    avg_watch_percent = excluded.avg_watch_percent,
    avg_watch_duration_ms = excluded.avg_watch_duration_ms,
    completion_rate = excluded.completion_rate,
    rewatch_rate = excluded.rewatch_rate,
    like_rate = excluded.like_rate,
    save_rate = excluded.save_rate,
    share_rate = excluded.share_rate,
    comment_rate = excluded.comment_rate,
    follow_rate = excluded.follow_rate,
    skip_rate = excluded.skip_rate,
    quality_score = excluded.quality_score,
    model_version = excluded.model_version,
    last_computed_at = excluded.last_computed_at,
    updated_at = now();
end;
$$;

revoke all on function public.refresh_video_quality_signals(bigint)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Refresh creator quality from video_quality_signals
-- ---------------------------------------------------------------------------

create or replace function public.refresh_creator_quality_signals(p_creator_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_video_count integer;
  v_total integer;
  v_avg_pct numeric;
  v_completion numeric;
  v_rewatch numeric;
  v_like numeric;
  v_save numeric;
  v_share numeric;
  v_comment numeric;
  v_follow numeric;
  v_skip numeric;
  v_score numeric;
begin
  if p_creator_id is null then
    return;
  end if;

  select
    count(*)::integer,
    coalesce(sum(v.total_watches), 0)::integer,
    coalesce(avg(v.avg_watch_percent), 0),
    coalesce(avg(v.completion_rate), 0),
    coalesce(avg(v.rewatch_rate), 0),
    coalesce(avg(v.like_rate), 0),
    coalesce(avg(v.save_rate), 0),
    coalesce(avg(v.share_rate), 0),
    coalesce(avg(v.comment_rate), 0),
    coalesce(avg(v.follow_rate), 0),
    coalesce(avg(v.skip_rate), 0)
  into
    v_video_count, v_total, v_avg_pct, v_completion, v_rewatch,
    v_like, v_save, v_share, v_comment, v_follow, v_skip
  from public.video_quality_signals v
  where v.creator_id = p_creator_id;

  if coalesce(v_video_count, 0) = 0 then
    return;
  end if;

  v_score := public.compute_deterministic_quality_score(
    v_avg_pct, v_completion, v_rewatch, v_like, v_save,
    v_share, v_comment, v_follow, v_skip
  );

  insert into public.creator_quality_signals as cqs (
    creator_id,
    video_count,
    total_watches,
    avg_watch_percent,
    completion_rate,
    rewatch_rate,
    like_rate,
    save_rate,
    share_rate,
    comment_rate,
    follow_rate,
    skip_rate,
    quality_score,
    model_version,
    last_computed_at,
    updated_at
  )
  values (
    p_creator_id,
    v_video_count,
    v_total,
    round(v_avg_pct::numeric, 2),
    round(v_completion::numeric, 4),
    round(v_rewatch::numeric, 4),
    round(v_like::numeric, 4),
    round(v_save::numeric, 4),
    round(v_share::numeric, 4),
    round(v_comment::numeric, 4),
    round(v_follow::numeric, 4),
    round(v_skip::numeric, 4),
    v_score,
    'deterministic-v1',
    now(),
    now()
  )
  on conflict (creator_id) do update set
    video_count = excluded.video_count,
    total_watches = excluded.total_watches,
    avg_watch_percent = excluded.avg_watch_percent,
    completion_rate = excluded.completion_rate,
    rewatch_rate = excluded.rewatch_rate,
    like_rate = excluded.like_rate,
    save_rate = excluded.save_rate,
    share_rate = excluded.share_rate,
    comment_rate = excluded.comment_rate,
    follow_rate = excluded.follow_rate,
    skip_rate = excluded.skip_rate,
    quality_score = excluded.quality_score,
    model_version = excluded.model_version,
    last_computed_at = excluded.last_computed_at,
    updated_at = now();
end;
$$;

revoke all on function public.refresh_creator_quality_signals(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Refresh user interest profile from watch_signals
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_interest_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_avg_pct numeric;
  v_completion numeric;
  v_skip numeric;
  v_positive numeric;
  v_affinity jsonb := '{}'::jsonb;
  v_counts jsonb;
  r record;
begin
  if p_user_id is null then
    return;
  end if;

  select
    count(*)::integer,
    coalesce(avg(s.watch_percent), 0),
    coalesce(avg(case when s.completed then 1.0 else 0.0 end), 0),
    coalesce(avg(case when s.skipped_early then 1.0 else 0.0 end), 0),
    coalesce(
      avg(
        case
          when s.liked or s.saved or s.shared or s.commented or s.follow_after_watch
          then 1.0
          else 0.0
        end
      ),
      0
    )
  into v_total, v_avg_pct, v_completion, v_skip, v_positive
  from public.watch_signals s
  where s.user_id = p_user_id;

  if coalesce(v_total, 0) = 0 then
    return;
  end if;

  for r in
    select
      s.creator_id::text as creator_key,
      (
        avg(s.watch_percent) / 100.0 * 0.4
        + avg(case when s.completed then 1.0 else 0.0 end) * 0.2
        + avg(
          case
            when s.liked or s.saved or s.shared or s.commented or s.follow_after_watch
            then 1.0
            else 0.0
          end
        ) * 0.4
        - avg(case when s.skipped_early then 1.0 else 0.0 end) * 0.3
      ) as affinity
    from public.watch_signals s
    where s.user_id = p_user_id
      and s.creator_id is not null
    group by s.creator_id
    order by affinity desc
    limit 50
  loop
    v_affinity := v_affinity || jsonb_build_object(
      r.creator_key,
      round(greatest(least(r.affinity, 1), -1)::numeric, 4)
    );
  end loop;

  v_counts := jsonb_build_object(
    'total', v_total,
    'completed', (
      select count(*) from public.watch_signals s
      where s.user_id = p_user_id and s.completed
    ),
    'skipped_early', (
      select count(*) from public.watch_signals s
      where s.user_id = p_user_id and s.skipped_early
    ),
    'liked', (
      select count(*) from public.watch_signals s
      where s.user_id = p_user_id and s.liked
    ),
    'saved', (
      select count(*) from public.watch_signals s
      where s.user_id = p_user_id and s.saved
    ),
    'shared', (
      select count(*) from public.watch_signals s
      where s.user_id = p_user_id and s.shared
    ),
    'commented', (
      select count(*) from public.watch_signals s
      where s.user_id = p_user_id and s.commented
    ),
    'follow_after_watch', (
      select count(*) from public.watch_signals s
      where s.user_id = p_user_id and s.follow_after_watch
    )
  );

  insert into public.user_interest_profiles as uip (
    user_id,
    tag_weights,
    creator_affinity,
    signal_counts,
    avg_watch_percent,
    completion_rate,
    skip_rate,
    positive_engagement_rate,
    total_signals,
    freshness_score,
    model_version,
    last_computed_at,
    updated_at
  )
  values (
    p_user_id,
    '{}'::jsonb,
    v_affinity,
    v_counts,
    round(v_avg_pct::numeric, 2),
    round(v_completion::numeric, 4),
    round(v_skip::numeric, 4),
    round(v_positive::numeric, 4),
    v_total,
    1.0,
    'deterministic-v1',
    now(),
    now()
  )
  on conflict (user_id) do update set
    creator_affinity = excluded.creator_affinity,
    signal_counts = excluded.signal_counts,
    avg_watch_percent = excluded.avg_watch_percent,
    completion_rate = excluded.completion_rate,
    skip_rate = excluded.skip_rate,
    positive_engagement_rate = excluded.positive_engagement_rate,
    total_signals = excluded.total_signals,
    freshness_score = excluded.freshness_score,
    model_version = excluded.model_version,
    last_computed_at = excluded.last_computed_at,
    updated_at = now();
end;
$$;

revoke all on function public.refresh_user_interest_profile(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. record_watch_signal — client-callable upsert + aggregate refresh
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

  -- Derive early-skip when client omits the flag.
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

comment on function public.record_watch_signal(
  bigint, text, text, text, integer, numeric, boolean, integer,
  boolean, boolean, boolean, boolean, boolean, boolean
) is
  'Upsert watch-quality + engagement signals for Discover/Watch. Refreshes video/creator/user aggregates. Deterministic V1 — no AI.';

comment on table public.watch_signals is
  'Per-session watch signals for recommendation ranking. ML features reserved empty.';

comment on table public.user_interest_profiles is
  'Per-user interest affinity for deterministic ranking. Schema-ready for future ML.';

comment on table public.creator_quality_signals is
  'Creator-level quality aggregates used to prevent low-quality domination.';

comment on table public.video_quality_signals is
  'Video-level quality aggregates for deterministic feed scoring.';
