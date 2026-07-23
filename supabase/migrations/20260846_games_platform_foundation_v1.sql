-- UM Games Platform Foundation V1
-- Additive only. Version 20260846 (renumbered from 20260842 to avoid
-- collision with Ads 20260842 on alpha). After Learning 20260841 and after
-- reserved Learning 20260844–20260845 on other branches.
--
-- Provides shared, server-authoritative foundation for ALL UMTUBA games:
--   games, game_player_profiles, game_sessions, game_session_results,
--   game_player_progress, game_achievements, game_player_achievements,
--   game_privacy_settings
--
-- Does NOT: real playable games, full Games UI, multiplayer, public
-- leaderboards, UM Points awarding, Ads placement activation, Live/World
-- event logic, Activity Tier coupling, or service-role usage from UI.
--
-- Trust boundary: client result payloads are CLAIMS only. Fail-closed
-- validation. Internal helpers revoked from authenticated.
-- Migration apply status: NOT APPLIED (Git-only until explicitly approved).

-- ---------------------------------------------------------------------------
-- 1) games — catalog
-- ---------------------------------------------------------------------------

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  game_key text not null
    constraint games_game_key_format check (
      game_key ~ '^[a-z][a-z0-9_]{1,62}[a-z0-9]$'
    ),
  slug text not null
    constraint games_slug_format check (
      slug ~ '^[a-z][a-z0-9-]{1,62}[a-z0-9]$'
    ),
  name text not null
    constraint games_name_len check (char_length(name) between 1 and 120),
  description text
    constraint games_description_len check (
      description is null or char_length(description) <= 4000
    ),
  status text not null default 'draft'
    constraint games_status_check check (
      status in ('draft', 'active', 'archived')
    ),
  result_validation_mode text not null default 'fail_closed'
    constraint games_result_validation_mode_check check (
      result_validation_mode in ('fail_closed')
    ),
  session_ttl_seconds integer not null default 3600
    constraint games_session_ttl_check check (
      session_ttl_seconds between 60 and 86400
    ),
  -- Reserved future integration boundaries (nullable, NO foreign keys).
  city_id uuid,
  world_event_id uuid,
  live_room_id uuid,
  community_project_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint games_game_key_unique unique (game_key),
  constraint games_slug_unique unique (slug)
);

comment on table public.games is
  'UM Games catalog. game_key/slug are Games-domain identifiers — NOT Ads placement IDs. V1 has no playable game seed.';

comment on column public.games.result_validation_mode is
  'V1: fail_closed only. Unknown/authoritative client fields reject the claim.';

comment on column public.games.city_id is
  'Reserved future boundary. Nullable. No FK. Non-authoritative in V1.';

create index if not exists games_status_idx on public.games (status);

drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at
  before update on public.games
  for each row execute function public.set_row_updated_at();

alter table public.games enable row level security;
alter table public.games force row level security;

revoke all on table public.games from public, anon, authenticated;
grant select on table public.games to authenticated;
revoke insert, update, delete on table public.games from anon, authenticated;
grant all on table public.games to service_role;

drop policy if exists "Authenticated read active games catalog" on public.games;
create policy "Authenticated read active games catalog"
  on public.games for select
  to authenticated
  using (status = 'active');

drop policy if exists "Platform admins read all games" on public.games;
create policy "Platform admins read all games"
  on public.games for select
  to authenticated
  using (public.is_platform_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 2) game_player_profiles — lightweight Games-domain profile
-- ---------------------------------------------------------------------------

create table if not exists public.game_player_profiles (
  user_id uuid primary key
    references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.game_player_profiles is
  'Lightweight Games player record. Does not replace social profiles.';

drop trigger if exists game_player_profiles_set_updated_at
  on public.game_player_profiles;
create trigger game_player_profiles_set_updated_at
  before update on public.game_player_profiles
  for each row execute function public.set_row_updated_at();

alter table public.game_player_profiles enable row level security;
alter table public.game_player_profiles force row level security;

revoke all on table public.game_player_profiles
  from public, anon, authenticated;
grant select on table public.game_player_profiles to authenticated;
revoke insert, update, delete on table public.game_player_profiles
  from anon, authenticated;
grant all on table public.game_player_profiles to service_role;

drop policy if exists "Players read own game profile"
  on public.game_player_profiles;
create policy "Players read own game profile"
  on public.game_player_profiles for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3) game_privacy_settings — default private
-- ---------------------------------------------------------------------------

create table if not exists public.game_privacy_settings (
  user_id uuid primary key
    references public.profiles (id) on delete cascade,
  share_achievements boolean not null default false,
  share_best_score boolean not null default false,
  share_level_or_progress boolean not null default false,
  share_activity boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.game_privacy_settings is
  'Games privacy. Defaults ALL private. Opt-in only. No public leaderboard reads in V1.';

drop trigger if exists game_privacy_settings_set_updated_at
  on public.game_privacy_settings;
create trigger game_privacy_settings_set_updated_at
  before update on public.game_privacy_settings
  for each row execute function public.set_row_updated_at();

alter table public.game_privacy_settings enable row level security;
alter table public.game_privacy_settings force row level security;

revoke all on table public.game_privacy_settings
  from public, anon, authenticated;
grant select on table public.game_privacy_settings to authenticated;
revoke insert, update, delete on table public.game_privacy_settings
  from anon, authenticated;
grant all on table public.game_privacy_settings to service_role;

drop policy if exists "Players read own game privacy"
  on public.game_privacy_settings;
create policy "Players read own game privacy"
  on public.game_privacy_settings for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4) game_sessions — server-owned lifecycle
-- ---------------------------------------------------------------------------

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null
    references public.games (id) on delete restrict,
  user_id uuid not null
    references public.profiles (id) on delete restrict,
  status text not null default 'active'
    constraint game_sessions_status_check check (
      status in (
        'active',
        'submitted',
        'accepted',
        'rejected',
        'expired',
        'cancelled'
      )
    ),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  expired_at timestamptz,
  cancelled_at timestamptz,
  session_ttl_seconds_snapshot integer not null
    constraint game_sessions_ttl_snapshot_check check (
      session_ttl_seconds_snapshot between 60 and 86400
    ),
  -- Reserved future boundaries (nullable, NO FKs).
  city_id uuid,
  world_event_id uuid,
  live_room_id uuid,
  community_project_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.game_sessions is
  'Server-owned game session. At most one active session per (user, game). Client cannot invent identity/status.';

comment on column public.game_sessions.status is
  'active|submitted|accepted|rejected|expired|cancelled. active is the only submittable live state.';

create unique index if not exists game_sessions_one_active_uidx
  on public.game_sessions (user_id, game_id)
  where status = 'active';

create index if not exists game_sessions_user_game_status_idx
  on public.game_sessions (user_id, game_id, status);

create index if not exists game_sessions_expires_at_idx
  on public.game_sessions (expires_at)
  where status = 'active';

drop trigger if exists game_sessions_set_updated_at on public.game_sessions;
create trigger game_sessions_set_updated_at
  before update on public.game_sessions
  for each row execute function public.set_row_updated_at();

create or replace function public.game_session_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.game_id is distinct from old.game_id
     or new.user_id is distinct from old.user_id
     or new.started_at is distinct from old.started_at
     or new.expires_at is distinct from old.expires_at
     or new.session_ttl_seconds_snapshot
          is distinct from old.session_ttl_seconds_snapshot
     or new.created_at is distinct from old.created_at
  then
    raise exception 'game_sessions identity/ttl columns are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists game_sessions_guard_immutable on public.game_sessions;
create trigger game_sessions_guard_immutable
  before update on public.game_sessions
  for each row execute function public.game_session_guard_immutable();

alter table public.game_sessions enable row level security;
alter table public.game_sessions force row level security;

revoke all on table public.game_sessions from public, anon, authenticated;
grant select on table public.game_sessions to authenticated;
revoke insert, update, delete on table public.game_sessions
  from anon, authenticated;
grant all on table public.game_sessions to service_role;

drop policy if exists "Players read own game sessions" on public.game_sessions;
create policy "Players read own game sessions"
  on public.game_sessions for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5) game_session_results — separate from session; claim + decision
-- ---------------------------------------------------------------------------

create table if not exists public.game_session_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.game_sessions (id) on delete cascade,
  game_id uuid not null
    references public.games (id) on delete restrict,
  user_id uuid not null
    references public.profiles (id) on delete restrict,
  -- Client claim (validated allowlist only).
  claim_score numeric not null
    constraint game_session_results_claim_score_non_negative check (
      claim_score >= 0
    ),
  claim_level integer
    constraint game_session_results_claim_level_check check (
      claim_level is null or claim_level between 0 and 1000000
    ),
  claim_experience_delta integer
    constraint game_session_results_claim_xp_check check (
      claim_experience_delta is null
      or claim_experience_delta between 0 and 1000000
    ),
  claim_duration_ms integer
    constraint game_session_results_claim_duration_check check (
      claim_duration_ms is null
      or claim_duration_ms between 0 and 86400000
    ),
  claim_payload jsonb not null default '{}'::jsonb
    constraint game_session_results_claim_payload_object check (
      jsonb_typeof(claim_payload) = 'object'
    ),
  decision_status text not null
    constraint game_session_results_decision_check check (
      decision_status in ('accepted', 'rejected')
    ),
  rejection_reason text
    constraint game_session_results_rejection_reason_len check (
      rejection_reason is null or char_length(rejection_reason) <= 120
    ),
  -- Recorded server view of accepted claim (NOT UM Points; NOT trust for economy).
  recorded_score numeric
    constraint game_session_results_recorded_score_non_negative check (
      recorded_score is null or recorded_score >= 0
    ),
  recorded_level integer,
  idempotency_key text not null
    constraint game_session_results_idempotency_key_len check (
      char_length(idempotency_key) between 1 and 128
    ),
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_session_results_session_unique unique (session_id),
  constraint game_session_results_user_game_idempotency_unique
    unique (user_id, game_id, idempotency_key)
);

comment on table public.game_session_results is
  'Session results are separate from sessions. Client payload is a claim. Accepted recorded_* values are progression inputs only — NEVER UM Points.';

create index if not exists game_session_results_user_game_idx
  on public.game_session_results (user_id, game_id);

create index if not exists game_session_results_decision_idx
  on public.game_session_results (decision_status);

drop trigger if exists game_session_results_set_updated_at
  on public.game_session_results;
create trigger game_session_results_set_updated_at
  before update on public.game_session_results
  for each row execute function public.set_row_updated_at();

alter table public.game_session_results enable row level security;
alter table public.game_session_results force row level security;

revoke all on table public.game_session_results
  from public, anon, authenticated;
grant select on table public.game_session_results to authenticated;
revoke insert, update, delete on table public.game_session_results
  from anon, authenticated;
grant all on table public.game_session_results to service_role;

drop policy if exists "Players read own game session results"
  on public.game_session_results;
create policy "Players read own game session results"
  on public.game_session_results for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6) game_player_progress — per-game summary (server-written only)
-- ---------------------------------------------------------------------------

create table if not exists public.game_player_progress (
  user_id uuid not null
    references public.profiles (id) on delete cascade,
  game_id uuid not null
    references public.games (id) on delete cascade,
  play_count integer not null default 0
    constraint game_player_progress_play_count_non_negative check (
      play_count >= 0
    ),
  accepted_result_count integer not null default 0
    constraint game_player_progress_accepted_non_negative check (
      accepted_result_count >= 0
    ),
  best_score numeric
    constraint game_player_progress_best_score_non_negative check (
      best_score is null or best_score >= 0
    ),
  current_level integer not null default 0
    constraint game_player_progress_level_check check (
      current_level between 0 and 1000000
    ),
  experience_value integer not null default 0
    constraint game_player_progress_xp_check check (
      experience_value >= 0
    ),
  last_played_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

comment on table public.game_player_progress is
  'Per-game progression summary. Mutations only via internal Games helpers. Not Activity Tiers.';

drop trigger if exists game_player_progress_set_updated_at
  on public.game_player_progress;
create trigger game_player_progress_set_updated_at
  before update on public.game_player_progress
  for each row execute function public.set_row_updated_at();

alter table public.game_player_progress enable row level security;
alter table public.game_player_progress force row level security;

revoke all on table public.game_player_progress
  from public, anon, authenticated;
grant select on table public.game_player_progress to authenticated;
revoke insert, update, delete on table public.game_player_progress
  from anon, authenticated;
grant all on table public.game_player_progress to service_role;

drop policy if exists "Players read own game progress"
  on public.game_player_progress;
create policy "Players read own game progress"
  on public.game_player_progress for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7) game_achievements — catalog per game
-- ---------------------------------------------------------------------------

create table if not exists public.game_achievements (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null
    references public.games (id) on delete cascade,
  achievement_key text not null
    constraint game_achievements_key_format check (
      achievement_key ~ '^[a-z][a-z0-9_]{1,62}[a-z0-9]$'
    ),
  name text not null
    constraint game_achievements_name_len check (
      char_length(name) between 1 and 120
    ),
  description text
    constraint game_achievements_description_len check (
      description is null or char_length(description) <= 2000
    ),
  -- Simple V1 rule: { "min_score": number } optional. Evaluated server-side.
  unlock_rule jsonb not null default '{}'::jsonb
    constraint game_achievements_unlock_rule_object check (
      jsonb_typeof(unlock_rule) = 'object'
    ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_achievements_game_key_unique unique (game_id, achievement_key)
);

comment on table public.game_achievements is
  'Per-game achievement catalog. Not Activity Tiers. Unlock evaluation is server-only.';

drop trigger if exists game_achievements_set_updated_at
  on public.game_achievements;
create trigger game_achievements_set_updated_at
  before update on public.game_achievements
  for each row execute function public.set_row_updated_at();

alter table public.game_achievements enable row level security;
alter table public.game_achievements force row level security;

revoke all on table public.game_achievements
  from public, anon, authenticated;
grant select on table public.game_achievements to authenticated;
revoke insert, update, delete on table public.game_achievements
  from anon, authenticated;
grant all on table public.game_achievements to service_role;

drop policy if exists "Authenticated read active game achievements"
  on public.game_achievements;
create policy "Authenticated read active game achievements"
  on public.game_achievements for select
  to authenticated
  using (
    is_active = true
    and exists (
      select 1 from public.games g
      where g.id = game_achievements.game_id
        and g.status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- 8) game_player_achievements — unlocks (idempotent)
-- ---------------------------------------------------------------------------

create table if not exists public.game_player_achievements (
  user_id uuid not null
    references public.profiles (id) on delete cascade,
  achievement_id uuid not null
    references public.game_achievements (id) on delete cascade,
  game_id uuid not null
    references public.games (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  source_session_id uuid
    references public.game_sessions (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

comment on table public.game_player_achievements is
  'Player achievement unlocks. PK enforces idempotent unlock. No public leaderboard policy.';

create index if not exists game_player_achievements_user_game_idx
  on public.game_player_achievements (user_id, game_id);

alter table public.game_player_achievements enable row level security;
alter table public.game_player_achievements force row level security;

revoke all on table public.game_player_achievements
  from public, anon, authenticated;
grant select on table public.game_player_achievements to authenticated;
revoke insert, update, delete on table public.game_player_achievements
  from anon, authenticated;
grant all on table public.game_player_achievements to service_role;

drop policy if exists "Players read own game achievements"
  on public.game_player_achievements;
create policy "Players read own game achievements"
  on public.game_player_achievements for select
  to authenticated
  using (user_id = auth.uid());

-- ===========================================================================
-- Internal helpers (revoked from authenticated)
-- ===========================================================================

create or replace function public.game_ensure_player_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.game_player_profiles (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  insert into public.game_privacy_settings (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.game_ensure_player_profile(uuid)
  from public, anon, authenticated;
grant execute on function public.game_ensure_player_profile(uuid)
  to service_role;

create or replace function public.game_ensure_privacy_settings(p_user_id uuid)
returns public.game_privacy_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.game_privacy_settings%rowtype;
begin
  perform public.game_ensure_player_profile(p_user_id);
  select * into v_row
  from public.game_privacy_settings
  where user_id = p_user_id;
  return v_row;
end;
$$;

revoke all on function public.game_ensure_privacy_settings(uuid)
  from public, anon, authenticated;
grant execute on function public.game_ensure_privacy_settings(uuid)
  to service_role;

create or replace function public.game_session_expire_if_due(p_session_id uuid)
returns public.game_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.game_sessions%rowtype;
  v_now timestamptz := now();
begin
  select * into v_session
  from public.game_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Game session not found';
  end if;

  if v_session.status = 'active' and v_now > v_session.expires_at then
    update public.game_sessions
    set status = 'expired',
        expired_at = v_now,
        updated_at = v_now
    where id = p_session_id
    returning * into v_session;
  end if;

  return v_session;
end;
$$;

revoke all on function public.game_session_expire_if_due(uuid)
  from public, anon, authenticated;
grant execute on function public.game_session_expire_if_due(uuid)
  to service_role;

-- Validates client claim JSON. Returns normalized claim or raises.
create or replace function public.game_validate_client_result_claim(
  p_claim jsonb,
  p_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_score numeric;
  v_level integer;
  v_xp integer;
  v_duration integer;
  v_meta jsonb;
  v_out jsonb;
  v_allowed text[] := array[
    'score', 'level', 'experience_delta', 'duration_ms', 'client_meta'
  ];
  v_denied text[] := array[
    'accepted', 'rejected', 'decision', 'decision_status',
    'server_score', 'server_level', 'awarded_points', 'um_points',
    'points', 'wallet_credit', 'achievement_ids', 'unlocked_achievements',
    'progress', 'best_score', 'play_count', 'scored_by', 'validated_by',
    'trust_level', 'anti_cheat_passed'
  ];
begin
  if p_mode is distinct from 'fail_closed' then
    raise exception 'validation_mode_unsupported';
  end if;

  if p_claim is null or jsonb_typeof(p_claim) is distinct from 'object' then
    raise exception 'claim_not_object';
  end if;

  if octet_length(p_claim::text) > 4096 then
    raise exception 'claim_payload_too_large';
  end if;

  for v_key in select jsonb_object_keys(p_claim)
  loop
    if v_key = any (v_denied) then
      raise exception 'authoritative_field_forbidden';
    end if;
    if not (v_key = any (v_allowed)) then
      raise exception 'unknown_claim_field';
    end if;
  end loop;

  if not (p_claim ? 'score') then
    raise exception 'score_required';
  end if;

  begin
    v_score := (p_claim ->> 'score')::numeric;
  exception
    when others then
      raise exception 'score_not_finite';
  end;

  if v_score is null or v_score < 0 then
    raise exception 'score_negative';
  end if;
  if v_score > 1000000000 then
    raise exception 'score_out_of_range';
  end if;

  v_out := jsonb_build_object('score', v_score);

  if p_claim ? 'level' then
    begin
      v_level := (p_claim ->> 'level')::integer;
    exception
      when others then
        raise exception 'level_not_integer';
    end;
    if v_level is null or v_level < 0 or v_level > 1000000 then
      raise exception 'level_out_of_range';
    end if;
    v_out := v_out || jsonb_build_object('level', v_level);
  end if;

  if p_claim ? 'experience_delta' then
    begin
      v_xp := (p_claim ->> 'experience_delta')::integer;
    exception
      when others then
        raise exception 'experience_delta_not_integer';
    end;
    if v_xp is null or v_xp < 0 or v_xp > 1000000 then
      raise exception 'experience_delta_out_of_range';
    end if;
    v_out := v_out || jsonb_build_object('experience_delta', v_xp);
  end if;

  if p_claim ? 'duration_ms' then
    begin
      v_duration := (p_claim ->> 'duration_ms')::integer;
    exception
      when others then
        raise exception 'duration_ms_not_integer';
    end;
    if v_duration is null or v_duration < 0 or v_duration > 86400000 then
      raise exception 'duration_ms_out_of_range';
    end if;
    v_out := v_out || jsonb_build_object('duration_ms', v_duration);
  end if;

  if p_claim ? 'client_meta' then
    v_meta := p_claim -> 'client_meta';
    if jsonb_typeof(v_meta) is distinct from 'object' then
      raise exception 'client_meta_not_object';
    end if;
    if octet_length(v_meta::text) > 1024 then
      raise exception 'client_meta_too_large';
    end if;
    v_out := v_out || jsonb_build_object('client_meta', v_meta);
  end if;

  return v_out;
end;
$$;

revoke all on function public.game_validate_client_result_claim(jsonb, text)
  from public, anon, authenticated;
grant execute on function public.game_validate_client_result_claim(jsonb, text)
  to service_role;

-- Apply accepted result → progress + idempotent achievement unlocks.
-- NEVER awards UM Points.
create or replace function public.game_apply_accepted_result(
  p_session_id uuid,
  p_user_id uuid,
  p_game_id uuid,
  p_recorded_score numeric,
  p_recorded_level integer,
  p_experience_delta integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ach record;
  v_min_score numeric;
  v_now timestamptz := now();
  v_xp integer := coalesce(p_experience_delta, 0);
begin
  insert into public.game_player_progress as p (
    user_id,
    game_id,
    play_count,
    accepted_result_count,
    best_score,
    current_level,
    experience_value,
    last_played_at
  ) values (
    p_user_id,
    p_game_id,
    1,
    1,
    p_recorded_score,
    coalesce(p_recorded_level, 0),
    v_xp,
    v_now
  )
  on conflict (user_id, game_id) do update
  set play_count = p.play_count + 1,
      accepted_result_count = p.accepted_result_count + 1,
      best_score = case
        when p.best_score is null then excluded.best_score
        when excluded.best_score is null then p.best_score
        else greatest(p.best_score, excluded.best_score)
      end,
      current_level = greatest(p.current_level, excluded.current_level),
      experience_value = p.experience_value + excluded.experience_value,
      last_played_at = excluded.last_played_at,
      updated_at = v_now;

  for v_ach in
    select a.*
    from public.game_achievements a
    where a.game_id = p_game_id
      and a.is_active = true
  loop
    v_min_score := null;
    if v_ach.unlock_rule ? 'min_score' then
      begin
        v_min_score := (v_ach.unlock_rule ->> 'min_score')::numeric;
      exception
        when others then
          continue;
      end;
    else
      continue;
    end if;

    if v_min_score is not null and p_recorded_score >= v_min_score then
      insert into public.game_player_achievements (
        user_id,
        achievement_id,
        game_id,
        source_session_id,
        unlocked_at
      ) values (
        p_user_id,
        v_ach.id,
        p_game_id,
        p_session_id,
        v_now
      )
      on conflict (user_id, achievement_id) do nothing;
    end if;
  end loop;
end;
$$;

revoke all on function public.game_apply_accepted_result(
  uuid, uuid, uuid, numeric, integer, integer
) from public, anon, authenticated;
grant execute on function public.game_apply_accepted_result(
  uuid, uuid, uuid, numeric, integer, integer
) to service_role;

comment on function public.game_apply_accepted_result(
  uuid, uuid, uuid, numeric, integer, integer
) is
  'Internal progression + achievement unlock. NEVER calls award_um_points*. Revoked from authenticated.';

-- ===========================================================================
-- Public RPCs (authenticated)
-- ===========================================================================

create or replace function public.start_game_session(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_game public.games%rowtype;
  v_session public.game_sessions%rowtype;
  v_now timestamptz := now();
  v_ttl integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_game_id is null then
    raise exception 'game_id is required';
  end if;

  select * into v_game
  from public.games
  where id = p_game_id;

  if not found or v_game.status is distinct from 'active' then
    raise exception 'Game not available';
  end if;

  perform public.game_ensure_player_profile(v_uid);

  -- Resume existing active session after lazy expiry.
  select * into v_session
  from public.game_sessions
  where user_id = v_uid
    and game_id = p_game_id
    and status = 'active'
  for update;

  if found then
    v_session := public.game_session_expire_if_due(v_session.id);
    if v_session.status = 'active' then
      return jsonb_build_object(
        'session_id', v_session.id,
        'game_id', v_session.game_id,
        'status', v_session.status,
        'started_at', v_session.started_at,
        'expires_at', v_session.expires_at,
        'resumed', true
      );
    end if;
  end if;

  v_ttl := v_game.session_ttl_seconds;

  insert into public.game_sessions (
    game_id,
    user_id,
    status,
    started_at,
    expires_at,
    session_ttl_seconds_snapshot,
    city_id,
    world_event_id,
    live_room_id,
    community_project_id
  ) values (
    p_game_id,
    v_uid,
    'active',
    v_now,
    v_now + make_interval(secs => v_ttl),
    v_ttl,
    v_game.city_id,
    v_game.world_event_id,
    v_game.live_room_id,
    v_game.community_project_id
  )
  returning * into v_session;

  return jsonb_build_object(
    'session_id', v_session.id,
    'game_id', v_session.game_id,
    'status', v_session.status,
    'started_at', v_session.started_at,
    'expires_at', v_session.expires_at,
    'resumed', false
  );
end;
$$;

revoke all on function public.start_game_session(uuid) from public, anon;
grant execute on function public.start_game_session(uuid)
  to authenticated, service_role;

create or replace function public.submit_game_session_result(
  p_session_id uuid,
  p_idempotency_key text,
  p_claim jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.game_sessions%rowtype;
  v_game public.games%rowtype;
  v_existing public.game_session_results%rowtype;
  v_normalized jsonb;
  v_result public.game_session_results%rowtype;
  v_now timestamptz := now();
  v_score numeric;
  v_level integer;
  v_xp integer;
  v_duration integer;
  v_decision text;
  v_reason text;
  v_deny constant text := 'Not allowed to submit this game session';
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_session_id is null then
    raise exception 'session_id is required';
  end if;
  if p_idempotency_key is null
     or char_length(p_idempotency_key) < 1
     or char_length(p_idempotency_key) > 128
     or p_idempotency_key !~ '^[A-Za-z0-9._:-]+$'
  then
    raise exception 'idempotency_key_invalid';
  end if;

  select * into v_session
  from public.game_sessions
  where id = p_session_id;

  if not found or v_session.user_id is distinct from v_uid then
    raise exception '%', v_deny;
  end if;

  v_session := public.game_session_expire_if_due(p_session_id);

  if v_session.user_id is distinct from v_uid then
    raise exception '%', v_deny;
  end if;

  -- Idempotent replay: same key for this user+game returns prior decision.
  select * into v_existing
  from public.game_session_results
  where user_id = v_uid
    and game_id = v_session.game_id
    and idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'session_id', v_existing.session_id,
      'result_id', v_existing.id,
      'decision_status', v_existing.decision_status,
      'rejection_reason', v_existing.rejection_reason,
      'recorded_score', v_existing.recorded_score,
      'idempotent_replay', true
    );
  end if;

  if v_session.status = 'expired' then
    raise exception 'session_expired';
  end if;

  if v_session.status is distinct from 'active' then
    raise exception 'session_not_active';
  end if;

  select * into v_game from public.games where id = v_session.game_id;
  if not found then
    raise exception 'Game not available';
  end if;

  begin
    v_normalized := public.game_validate_client_result_claim(
      p_claim,
      v_game.result_validation_mode
    );
    v_decision := 'accepted';
    v_reason := null;
  exception
    when others then
      v_decision := 'rejected';
      v_reason := left(sqlerrm, 120);
      v_normalized := coalesce(p_claim, '{}'::jsonb);
  end;

  v_score := nullif(v_normalized ->> 'score', '')::numeric;
  if v_normalized ? 'level' then
    v_level := (v_normalized ->> 'level')::integer;
  else
    v_level := null;
  end if;
  if v_normalized ? 'experience_delta' then
    v_xp := (v_normalized ->> 'experience_delta')::integer;
  else
    v_xp := null;
  end if;
  if v_normalized ? 'duration_ms' then
    v_duration := (v_normalized ->> 'duration_ms')::integer;
  else
    v_duration := null;
  end if;

  if v_decision = 'rejected' then
    -- Persist rejection with safe claim_score fallback when unparseable/invalid.
    if v_score is null or v_score < 0 then
      v_score := 0;
    end if;
  end if;

  insert into public.game_session_results (
    session_id,
    game_id,
    user_id,
    claim_score,
    claim_level,
    claim_experience_delta,
    claim_duration_ms,
    claim_payload,
    decision_status,
    rejection_reason,
    recorded_score,
    recorded_level,
    idempotency_key,
    decided_at
  ) values (
    p_session_id,
    v_session.game_id,
    v_uid,
    v_score,
    v_level,
    v_xp,
    v_duration,
    v_normalized,
    v_decision,
    v_reason,
    case when v_decision = 'accepted' then v_score else null end,
    case when v_decision = 'accepted' then v_level else null end,
    p_idempotency_key,
    v_now
  )
  returning * into v_result;

  update public.game_sessions
  set status = v_decision,
      submitted_at = v_now,
      accepted_at = case when v_decision = 'accepted' then v_now else null end,
      rejected_at = case when v_decision = 'rejected' then v_now else null end,
      updated_at = v_now
  where id = p_session_id;

  if v_decision = 'accepted' then
    perform public.game_apply_accepted_result(
      p_session_id,
      v_uid,
      v_session.game_id,
      v_score,
      coalesce(v_level, 0),
      coalesce(v_xp, 0)
    );
  end if;

  return jsonb_build_object(
    'session_id', p_session_id,
    'result_id', v_result.id,
    'decision_status', v_result.decision_status,
    'rejection_reason', v_result.rejection_reason,
    'recorded_score', v_result.recorded_score,
    'idempotent_replay', false
  );
end;
$$;

revoke all on function public.submit_game_session_result(uuid, text, jsonb)
  from public, anon;
grant execute on function public.submit_game_session_result(uuid, text, jsonb)
  to authenticated, service_role;

create or replace function public.get_my_game_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.game_sessions%rowtype;
  v_result public.game_session_results%rowtype;
  v_deny constant text := 'Not allowed to read this game session';
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_session_id is null then
    raise exception 'session_id is required';
  end if;

  select * into v_session
  from public.game_sessions
  where id = p_session_id;

  if not found or v_session.user_id is distinct from v_uid then
    raise exception '%', v_deny;
  end if;

  v_session := public.game_session_expire_if_due(p_session_id);
  if v_session.user_id is distinct from v_uid then
    raise exception '%', v_deny;
  end if;

  select * into v_result
  from public.game_session_results
  where session_id = p_session_id;

  return jsonb_build_object(
    'session_id', v_session.id,
    'game_id', v_session.game_id,
    'status', v_session.status,
    'started_at', v_session.started_at,
    'expires_at', v_session.expires_at,
    'submitted_at', v_session.submitted_at,
    'accepted_at', v_session.accepted_at,
    'rejected_at', v_session.rejected_at,
    'expired_at', v_session.expired_at,
    'result', case
      when not found then null
      else jsonb_build_object(
        'result_id', v_result.id,
        'decision_status', v_result.decision_status,
        'rejection_reason', v_result.rejection_reason,
        'recorded_score', v_result.recorded_score,
        'recorded_level', v_result.recorded_level,
        'decided_at', v_result.decided_at
      )
    end
  );
end;
$$;

revoke all on function public.get_my_game_session(uuid) from public, anon;
grant execute on function public.get_my_game_session(uuid)
  to authenticated, service_role;

create or replace function public.get_my_game_progress(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.game_player_progress%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_game_id is null then
    raise exception 'game_id is required';
  end if;

  select * into v_row
  from public.game_player_progress
  where user_id = v_uid
    and game_id = p_game_id;

  if not found then
    return jsonb_build_object(
      'game_id', p_game_id,
      'play_count', 0,
      'accepted_result_count', 0,
      'best_score', null,
      'current_level', 0,
      'experience_value', 0,
      'last_played_at', null
    );
  end if;

  return jsonb_build_object(
    'game_id', v_row.game_id,
    'play_count', v_row.play_count,
    'accepted_result_count', v_row.accepted_result_count,
    'best_score', v_row.best_score,
    'current_level', v_row.current_level,
    'experience_value', v_row.experience_value,
    'last_played_at', v_row.last_played_at
  );
end;
$$;

revoke all on function public.get_my_game_progress(uuid) from public, anon;
grant execute on function public.get_my_game_progress(uuid)
  to authenticated, service_role;

create or replace function public.get_my_game_achievements(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_items jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_game_id is null then
    raise exception 'game_id is required';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'achievement_id', a.id,
      'achievement_key', a.achievement_key,
      'name', a.name,
      'description', a.description,
      'unlocked_at', pa.unlocked_at
    )
    order by pa.unlocked_at desc
  ), '[]'::jsonb)
  into v_items
  from public.game_player_achievements pa
  join public.game_achievements a on a.id = pa.achievement_id
  where pa.user_id = v_uid
    and pa.game_id = p_game_id;

  return jsonb_build_object(
    'game_id', p_game_id,
    'achievements', v_items
  );
end;
$$;

revoke all on function public.get_my_game_achievements(uuid) from public, anon;
grant execute on function public.get_my_game_achievements(uuid)
  to authenticated, service_role;

create or replace function public.get_my_game_privacy_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.game_privacy_settings%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_row := public.game_ensure_privacy_settings(v_uid);

  return jsonb_build_object(
    'share_achievements', v_row.share_achievements,
    'share_best_score', v_row.share_best_score,
    'share_level_or_progress', v_row.share_level_or_progress,
    'share_activity', v_row.share_activity
  );
end;
$$;

revoke all on function public.get_my_game_privacy_settings() from public, anon;
grant execute on function public.get_my_game_privacy_settings()
  to authenticated, service_role;

create or replace function public.update_my_game_privacy_settings(p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.game_privacy_settings%rowtype;
  v_key text;
  v_allowed text[] := array[
    'share_achievements',
    'share_best_score',
    'share_level_or_progress',
    'share_activity'
  ];
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) is distinct from 'object' then
    raise exception 'privacy_not_object';
  end if;

  for v_key in select jsonb_object_keys(p_patch)
  loop
    if not (v_key = any (v_allowed)) then
      raise exception 'privacy_unknown_field';
    end if;
    if jsonb_typeof(p_patch -> v_key) is distinct from 'boolean' then
      raise exception 'privacy_field_not_boolean';
    end if;
  end loop;

  perform public.game_ensure_player_profile(v_uid);

  update public.game_privacy_settings
  set share_achievements = case
        when p_patch ? 'share_achievements'
          then (p_patch ->> 'share_achievements')::boolean
        else share_achievements
      end,
      share_best_score = case
        when p_patch ? 'share_best_score'
          then (p_patch ->> 'share_best_score')::boolean
        else share_best_score
      end,
      share_level_or_progress = case
        when p_patch ? 'share_level_or_progress'
          then (p_patch ->> 'share_level_or_progress')::boolean
        else share_level_or_progress
      end,
      share_activity = case
        when p_patch ? 'share_activity'
          then (p_patch ->> 'share_activity')::boolean
        else share_activity
      end,
      updated_at = now()
  where user_id = v_uid
  returning * into v_row;

  return jsonb_build_object(
    'share_achievements', v_row.share_achievements,
    'share_best_score', v_row.share_best_score,
    'share_level_or_progress', v_row.share_level_or_progress,
    'share_activity', v_row.share_activity
  );
end;
$$;

revoke all on function public.update_my_game_privacy_settings(jsonb)
  from public, anon;
grant execute on function public.update_my_game_privacy_settings(jsonb)
  to authenticated, service_role;
