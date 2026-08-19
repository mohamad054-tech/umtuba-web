-- Rewards / Referral Engine launch_v1 (20260933)
-- Additive / non-destructive. Self-contained: 20260931 was HOLD and never
-- applied. This file creates the engine IF NOT EXISTS and enables launch_v1.
-- Do NOT apply 20260931. Next unused number after applied 20260932.
--
-- Extends existing um_point_balances / um_points_ledger / referral_* .
-- Does NOT create a second wallet or second points ledger.
-- Does NOT drop tables or rewrite history.
--
-- CONTAINMENT: set unified_rewards_engine_authoritative=0 to stop new awards.
-- ROLLBACK: admin_reverse_reward_ledger for bad credits; do not DELETE ledger.
-- Collision: 20260929 reserved local-only; 20260930 applied; 20260931 HOLD;
-- 20260932 applied social sounds. This is 20260933.
--
-- MIGRATION_APPLIED=NO
-- POLICY_VERSION=launch_v1
-- LAUNCH_GROWTH_MODE=3_MONTHS
-- POINT_VALUES_CONFIGURED=YES
-- 20260931_NOT_INCLUDED=YES

insert into public.um_points_config (key, value, description)
values
  (
    'unified_rewards_engine_authoritative',
    1,
    '1 = launch_v1 unified engine is authoritative; 0 = contain new unified awards'
  )
on conflict (key) do update
  set value = excluded.value,
      description = excluded.description;

-- ---------------------------------------------------------------------------
-- 1) Extend existing wallet snapshot (keep `balance` as available)
-- ---------------------------------------------------------------------------

alter table public.um_point_balances
  add column if not exists pending_balance bigint not null default 0;

alter table public.um_point_balances
  add column if not exists lifetime_earned bigint not null default 0;

alter table public.um_point_balances
  add column if not exists lifetime_spent bigint not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'um_point_balances_pending_nonneg'
  ) then
    alter table public.um_point_balances
      add constraint um_point_balances_pending_nonneg
      check (pending_balance >= 0);
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conname = 'um_point_balances_lifetime_earned_nonneg'
  ) then
    alter table public.um_point_balances
      add constraint um_point_balances_lifetime_earned_nonneg
      check (lifetime_earned >= 0);
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conname = 'um_point_balances_lifetime_spent_nonneg'
  ) then
    alter table public.um_point_balances
      add constraint um_point_balances_lifetime_spent_nonneg
      check (lifetime_spent >= 0);
  end if;
end
$$;

update public.um_point_balances
set lifetime_earned = greatest(lifetime_earned, balance)
where lifetime_earned = 0
  and balance > 0;

comment on column public.um_point_balances.balance is
  'Available confirmed UM. Derivable from um_points_ledger CREDITS-DEBITS confirmed.';
comment on column public.um_point_balances.pending_balance is
  'Pending UM not yet qualified. Derivable from pending ledger credits.';

revoke insert, update, delete on public.um_point_balances from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Extend existing immutable ledger (append-only; points stay > 0)
-- ---------------------------------------------------------------------------

alter table public.um_points_ledger
  add column if not exists event_id uuid;

alter table public.um_points_ledger
  add column if not exists rule_id text;

alter table public.um_points_ledger
  add column if not exists rule_version integer;

alter table public.um_points_ledger
  add column if not exists direction text not null default 'CREDIT';

alter table public.um_points_ledger
  add column if not exists status text not null default 'CONFIRMED';

alter table public.um_points_ledger
  add column if not exists reason_code text;

alter table public.um_points_ledger
  add column if not exists source_type text;

alter table public.um_points_ledger
  add column if not exists source_id text;

alter table public.um_points_ledger
  add column if not exists confirmed_at timestamptz;

alter table public.um_points_ledger
  add column if not exists reversed_at timestamptz;

alter table public.um_points_ledger
  add column if not exists reversal_of uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'um_points_ledger_direction_check'
  ) then
    alter table public.um_points_ledger
      add constraint um_points_ledger_direction_check
      check (direction in ('CREDIT', 'DEBIT'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'um_points_ledger_status_check'
  ) then
    alter table public.um_points_ledger
      add constraint um_points_ledger_status_check
      check (status in ('PENDING', 'CONFIRMED', 'REVERSED', 'EXPIRED'));
  end if;
end
$$;

update public.um_points_ledger
set confirmed_at = coalesce(confirmed_at, created_at)
where status = 'CONFIRMED'
  and confirmed_at is null;

create index if not exists um_points_ledger_event_id_idx
  on public.um_points_ledger (event_id);

create index if not exists um_points_ledger_rule_id_idx
  on public.um_points_ledger (rule_id, rule_version);

create index if not exists um_points_ledger_reversal_of_idx
  on public.um_points_ledger (reversal_of)
  where reversal_of is not null;

create index if not exists um_points_ledger_user_status_idx
  on public.um_points_ledger (user_id, status, created_at desc);

create index if not exists um_points_ledger_user_rule_idx
  on public.um_points_ledger (user_id, rule_id, created_at desc)
  where rule_id is not null;

revoke insert, update, delete on public.um_points_ledger from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Engine tables
-- ---------------------------------------------------------------------------

create table if not exists public.reward_event_types (
  event_type text primary key
    constraint reward_event_types_format check (
      event_type ~ '^[A-Z][A-Z0-9_]{2,62}$'
    ),
  label text not null,
  is_capability boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.reward_event_types enable row level security;
alter table public.reward_event_types force row level security;

drop policy if exists "Reward event types are readable" on public.reward_event_types;
create policy "Reward event types are readable"
  on public.reward_event_types
  for select
  to authenticated
  using (true);

revoke insert, update, delete on public.reward_event_types from anon, authenticated;

insert into public.reward_event_types (event_type, label) values
  ('ACCOUNT_CREATED', 'Account created'),
  ('REFERRAL_SIGNUP', 'Referral signup'),
  ('REFERRAL_QUALIFIED', 'Referral qualified'),
  ('FIRST_POST', 'First post'),
  ('POST_PUBLISHED', 'Post published'),
  ('VIDEO_PUBLISHED', 'Video published'),
  ('COMMENT_CREATED', 'Comment created'),
  ('REPLY_CREATED', 'Reply created'),
  ('LIKE_GIVEN', 'Like given'),
  ('LIKE_RECEIVED', 'Like received'),
  ('SAVE_CREATED', 'Save created'),
  ('SAVE_RECEIVED', 'Save received'),
  ('SHARE_CREATED', 'Share created'),
  ('SHARE_RECEIVED', 'Share received'),
  ('FOLLOW_GIVEN', 'Follow given'),
  ('FOLLOW_RECEIVED', 'Follow received'),
  ('DAILY_ENGAGEMENT', 'Daily engagement'),
  ('SOUND_CREATED', 'Sound created'),
  ('SOUND_USED', 'Sound used'),
  ('CHALLENGE_PARTICIPATE', 'Challenge participate'),
  ('CHALLENGE_COMPLETE', 'Challenge complete'),
  ('CREATOR_MILESTONE', 'Creator milestone'),
  ('COURSE_ENROLLED', 'Course enrolled'),
  ('LESSON_COMPLETED', 'Lesson completed'),
  ('COURSE_COMPLETED', 'Course completed'),
  ('QUIZ_PASSED', 'Quiz passed'),
  ('CERTIFICATE_EARNED', 'Certificate earned'),
  ('LEARNING_STREAK', 'Learning streak'),
  ('STREAK_REACHED', 'Streak reached'),
  ('MILESTONE_REACHED', 'Milestone reached'),
  ('GAME_PARTICIPATE', 'Game participate'),
  ('GAME_COMPLETED', 'Game completed'),
  ('GAME_ACHIEVEMENT', 'Game achievement'),
  ('GAME_TOURNAMENT', 'Game tournament'),
  ('GAME_SCORE_MILESTONE', 'Game score milestone'),
  ('STORE_PURCHASE', 'Store purchase'),
  ('STORE_SALE', 'Store sale'),
  ('STORE_MILESTONE', 'Store milestone'),
  ('ADMIN_GRANT', 'Admin grant'),
  ('ADMIN_REVERSAL', 'Admin reversal')
on conflict (event_type) do nothing;

create table if not exists public.reward_rules (
  rule_id text primary key
    constraint reward_rules_id_format check (
      char_length(btrim(rule_id)) between 3 and 80
    ),
  event_type text not null references public.reward_event_types (event_type),
  name text not null
    constraint reward_rules_name_len check (char_length(name) between 1 and 160),
  enabled boolean not null default false,
  points_amount integer not null default 0
    constraint reward_rules_points_nonneg check (points_amount >= 0),
  currency text not null default 'UM'
    constraint reward_rules_currency_um check (currency = 'UM'),
  version integer not null default 1
    constraint reward_rules_version_pos check (version >= 1),
  start_at timestamptz,
  end_at timestamptz,
  per_user_limit integer
    constraint reward_rules_per_user_limit_pos check (
      per_user_limit is null or per_user_limit > 0
    ),
  daily_limit integer
    constraint reward_rules_daily_limit_pos check (
      daily_limit is null or daily_limit > 0
    ),
  weekly_limit integer
    constraint reward_rules_weekly_limit_pos check (
      weekly_limit is null or weekly_limit > 0
    ),
  lifetime_limit integer
    constraint reward_rules_lifetime_limit_pos check (
      lifetime_limit is null or lifetime_limit > 0
    ),
  cooldown_seconds integer
    constraint reward_rules_cooldown_pos check (
      cooldown_seconds is null or cooldown_seconds >= 0
    ),
  minimum_account_age_seconds integer
    constraint reward_rules_min_age_pos check (
      minimum_account_age_seconds is null or minimum_account_age_seconds >= 0
    ),
  qualification_delay_seconds integer
    constraint reward_rules_qual_delay_pos check (
      qualification_delay_seconds is null or qualification_delay_seconds >= 0
    ),
  requires_unique_actor boolean not null default false,
  requires_verified_account boolean not null default false,
  reversal_policy text not null default 'append_only'
    constraint reward_rules_reversal_policy_check check (
      reversal_policy = 'append_only'
    ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reward_rules_event_type_idx
  on public.reward_rules (event_type, enabled);

alter table public.reward_rules enable row level security;
alter table public.reward_rules force row level security;

drop policy if exists "Users can read disabled-safe reward rules" on public.reward_rules;
create policy "Users can read disabled-safe reward rules"
  on public.reward_rules
  for select
  to authenticated
  using (true);

revoke insert, update, delete on public.reward_rules from anon, authenticated;

insert into public.reward_rules (
  rule_id, event_type, name, enabled, points_amount, metadata
)
select
  'capability.' || lower(event_type),
  event_type,
  label || ' (unconfigured)',
  false,
  0,
  jsonb_build_object(
    'capability', true,
    'pointValue', 'UNCONFIGURED',
    'policy', 'UMTUBA_REWARDS_POLICY_V1_PENDING'
  )
from public.reward_event_types
on conflict (rule_id) do nothing;

create table if not exists public.reward_rule_versions (
  id uuid primary key default gen_random_uuid(),
  rule_id text not null references public.reward_rules (rule_id) on delete restrict,
  version integer not null,
  enabled boolean not null,
  points_amount integer not null,
  snapshot jsonb not null default '{}'::jsonb,
  reason text not null default 'seed',
  created_at timestamptz not null default now(),
  constraint reward_rule_versions_unique unique (rule_id, version)
);

create index if not exists reward_rule_versions_rule_idx
  on public.reward_rule_versions (rule_id, version desc);

alter table public.reward_rule_versions enable row level security;
alter table public.reward_rule_versions force row level security;

revoke all on public.reward_rule_versions from anon, authenticated;

insert into public.reward_rule_versions (
  rule_id, version, enabled, points_amount, snapshot, reason
)
select
  r.rule_id,
  r.version,
  r.enabled,
  r.points_amount,
  jsonb_build_object('seed', true),
  'seed_capability_unconfigured'
from public.reward_rules r
on conflict (rule_id, version) do nothing;

create table if not exists public.reward_events (
  event_id uuid primary key default gen_random_uuid(),
  event_type text not null references public.reward_event_types (event_type),
  actor_user_id uuid not null references auth.users (id) on delete cascade,
  subject_user_id uuid not null references auth.users (id) on delete cascade,
  idempotency_key text not null,
  source_type text not null,
  source_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint reward_events_idempotency_unique unique (idempotency_key)
);

create index if not exists reward_events_subject_created_idx
  on public.reward_events (subject_user_id, created_at desc);

create index if not exists reward_events_type_created_idx
  on public.reward_events (event_type, created_at desc);

alter table public.reward_events enable row level security;
alter table public.reward_events force row level security;

drop policy if exists "Users can view own reward events" on public.reward_events;
create policy "Users can view own reward events"
  on public.reward_events
  for select
  to authenticated
  using (
    (select auth.uid()) = actor_user_id
    or (select auth.uid()) = subject_user_id
    or public.is_platform_admin()
  );

revoke insert, update, delete on public.reward_events from anon, authenticated;

create table if not exists public.reward_qualifications (
  qualification_id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.reward_events (event_id) on delete restrict,
  rule_id text not null references public.reward_rules (rule_id) on delete restrict,
  rule_version integer not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'PENDING'
    constraint reward_qualifications_status_check check (
      status in ('PENDING', 'QUALIFIED', 'REJECTED', 'REVERSED')
    ),
  reason_code text not null default 'awaiting_qualification',
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  rejected_at timestamptz,
  reversed_at timestamptz,
  constraint reward_qualifications_event_unique unique (event_id)
);

create index if not exists reward_qualifications_user_status_idx
  on public.reward_qualifications (user_id, status, created_at desc);

alter table public.reward_qualifications enable row level security;
alter table public.reward_qualifications force row level security;

drop policy if exists "Users can view own reward qualifications"
  on public.reward_qualifications;
create policy "Users can view own reward qualifications"
  on public.reward_qualifications
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.is_platform_admin()
  );

revoke insert, update, delete on public.reward_qualifications from anon, authenticated;

create table if not exists public.reward_abuse_flags (
  flag_id uuid primary key default gen_random_uuid(),
  kind text not null
    constraint reward_abuse_flags_kind_check check (
      kind in (
        'self_interaction',
        'duplicate_event',
        'rapid_repeat',
        'suspicious_referral',
        'referral_loop',
        'manual_review',
        'automated_signup',
        'ownership_change',
        'deleted_recreate'
      )
    ),
  user_id uuid not null references auth.users (id) on delete cascade,
  related_user_id uuid references auth.users (id) on delete set null,
  event_id uuid references public.reward_events (event_id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  auto_punished boolean not null default false
    constraint reward_abuse_flags_no_auto_punish check (auto_punished = false),
  created_at timestamptz not null default now()
);

create index if not exists reward_abuse_flags_user_idx
  on public.reward_abuse_flags (user_id, created_at desc);

alter table public.reward_abuse_flags enable row level security;
alter table public.reward_abuse_flags force row level security;

drop policy if exists "Platform admins can view reward abuse flags"
  on public.reward_abuse_flags;
create policy "Platform admins can view reward abuse flags"
  on public.reward_abuse_flags
  for select
  to authenticated
  using (public.is_platform_admin());

revoke insert, update, delete on public.reward_abuse_flags from anon, authenticated;

create table if not exists public.reward_rule_audits (
  audit_id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users (id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reward_rule_audits_created_idx
  on public.reward_rule_audits (created_at desc);

alter table public.reward_rule_audits enable row level security;
alter table public.reward_rule_audits force row level security;

drop policy if exists "Platform admins can view reward rule audits"
  on public.reward_rule_audits;
create policy "Platform admins can view reward rule audits"
  on public.reward_rule_audits
  for select
  to authenticated
  using (public.is_platform_admin());

revoke insert, update, delete on public.reward_rule_audits from anon, authenticated;

create table if not exists public.reward_account_eligibility (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state text not null default 'eligible'
    constraint reward_account_eligibility_state_check check (
      state in ('eligible', 'review', 'ineligible')
    ),
  reason text,
  updated_at timestamptz not null default now()
);

alter table public.reward_account_eligibility enable row level security;
alter table public.reward_account_eligibility force row level security;

drop policy if exists "Users can view own reward eligibility"
  on public.reward_account_eligibility;
create policy "Users can view own reward eligibility"
  on public.reward_account_eligibility
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.is_platform_admin()
  );

revoke insert, update, delete on public.reward_account_eligibility from anon, authenticated;

-- Qualify existing referral conversions without inventing thresholds.
alter table public.referral_conversions
  add column if not exists qualification_status text;

alter table public.referral_conversions
  add column if not exists qualified_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'referral_conversions_qualification_status_check'
  ) then
    alter table public.referral_conversions
      add constraint referral_conversions_qualification_status_check
      check (
        qualification_status is null
        or qualification_status in ('PENDING', 'QUALIFIED', 'REJECTED', 'REVERSED')
      );
  end if;
end
$$;

update public.referral_conversions
set qualification_status = coalesce(qualification_status, 'PENDING')
where qualification_status is null;

-- ---------------------------------------------------------------------------
-- 4) Helpers
-- ---------------------------------------------------------------------------

create or replace function public.derive_um_wallet_snapshot(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_available bigint := 0;
  v_pending bigint := 0;
  v_earned bigint := 0;
  v_spent bigint := 0;
  v_updated timestamptz := now();
  v_has_balance boolean := false;
  v_ledger_updated timestamptz;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_user');
  end if;

  -- Spendable UM is um_point_balances.balance. Learning lesson unlocks
  -- decrement that column without a ledger DEBIT. Never recompute
  -- availableBalance from ledger-only math when a wallet row exists.
  select b.balance, b.updated_at
    into v_available, v_updated
  from public.um_point_balances b
  where b.user_id = p_user_id;
  v_has_balance := found;

  select
    coalesce(sum(case
      when direction = 'CREDIT' and status = 'PENDING' then points
      when direction = 'DEBIT' and status = 'PENDING' then -points
      else 0
    end), 0),
    coalesce(sum(case
      when direction = 'CREDIT'
        and (status = 'CONFIRMED' or (status = 'REVERSED' and confirmed_at is not null))
      then points else 0
    end), 0),
    max(created_at)
  into v_pending, v_earned, v_ledger_updated
  from public.um_points_ledger
  where user_id = p_user_id;

  if not v_has_balance then
    select coalesce(sum(case
      when direction = 'CREDIT' and status = 'CONFIRMED' and reversal_of is null then points
      when direction = 'DEBIT' and status = 'CONFIRMED' and reversal_of is null then -points
      else 0
    end), 0)
    into v_available
    from public.um_points_ledger
    where user_id = p_user_id;
    v_updated := coalesce(v_ledger_updated, now());
  end if;

  v_spent := greatest(0, coalesce(v_earned, 0) - coalesce(v_available, 0) - greatest(coalesce(v_pending, 0), 0));

  return jsonb_build_object(
    'userId', p_user_id,
    'availableBalance', coalesce(v_available, 0),
    'pendingBalance', coalesce(v_pending, 0),
    'lifetimeEarned', coalesce(v_earned, 0),
    'lifetimeSpent', v_spent,
    'updatedAt', coalesce(v_updated, v_ledger_updated, now())
  );
end;
$$;

revoke all on function public.derive_um_wallet_snapshot(uuid) from public, anon, authenticated;

create or replace function public.reconcile_um_wallet_snapshot(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snap jsonb;
begin
  v_snap := public.derive_um_wallet_snapshot(p_user_id);
  insert into public.um_point_balances (
    user_id, balance, pending_balance, lifetime_earned, lifetime_spent, updated_at
  )
  values (
    p_user_id,
    greatest(0, coalesce((v_snap->>'availableBalance')::bigint, 0)),
    greatest(0, coalesce((v_snap->>'pendingBalance')::bigint, 0)),
    greatest(0, coalesce((v_snap->>'lifetimeEarned')::bigint, 0)),
    greatest(0, coalesce((v_snap->>'lifetimeSpent')::bigint, 0)),
    now()
  )
  on conflict (user_id) do update
    set pending_balance = excluded.pending_balance,
        lifetime_earned = excluded.lifetime_earned,
        lifetime_spent = excluded.lifetime_spent,
        updated_at = now();
  -- Do not overwrite balance. Lesson unlocks and other non-ledger spends
  -- live only on um_point_balances.balance.
  return v_snap;
end;
$$;

revoke all on function public.reconcile_um_wallet_snapshot(uuid) from public, anon, authenticated;

create or replace function public.flag_reward_abuse(
  p_kind text,
  p_user_id uuid,
  p_related_user_id uuid default null,
  p_event_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_user_id is null or nullif(btrim(coalesce(p_kind, '')), '') is null then
    return null;
  end if;

  insert into public.reward_abuse_flags (
    kind, user_id, related_user_id, event_id, details, auto_punished
  )
  values (
    p_kind,
    p_user_id,
    p_related_user_id,
    p_event_id,
    coalesce(p_details, '{}'::jsonb),
    false
  )
  returning flag_id into v_id;

  return v_id;
end;
$$;

revoke all on function public.flag_reward_abuse(text, uuid, uuid, uuid, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) process_reward_event — no client amount parameter
-- ---------------------------------------------------------------------------

create or replace function public.process_reward_event(
  p_event_type text,
  p_idempotency_key text,
  p_source_type text,
  p_source_id text,
  p_subject_user_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_subject uuid;
  v_event_type text := upper(btrim(coalesce(p_event_type, '')));
  v_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_existing public.reward_events%rowtype;
  v_event_id uuid;
  v_rule public.reward_rules%rowtype;
  v_qual_id uuid;
  v_ledger_id uuid;
  v_status text;
  v_delay integer;
  v_source_type text := coalesce(nullif(btrim(coalesce(p_source_type, '')), ''), 'unknown');
  v_source_id text := coalesce(nullif(btrim(coalesce(p_source_id, '')), ''), v_key);
  v_counterpart text;
  v_credit_count integer := 0;
  v_last_credit timestamptz;
  v_trusted uuid;
begin
  if p_metadata ? '_trustedActor' then
    begin
      v_trusted := (p_metadata->>'_trustedActor')::uuid;
    exception when others then
      v_trusted := null;
    end;
  end if;
  v_uid := coalesce(v_uid, v_trusted);
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_metadata ? 'amount'
     or p_metadata ? 'points'
     or p_metadata ? 'pointsAmount'
     or p_metadata ? 'clientAmount'
     or p_metadata ? 'p_points' then
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'unauthorized_client_amount'
    );
  end if;

  v_subject := coalesce(p_subject_user_id, v_uid);
  if v_subject <> v_uid
     and v_trusted is null
     and not public.is_platform_admin() then
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'cross_user_forbidden'
    );
  end if;

  if v_key is null or v_event_type !~ '^[A-Z][A-Z0-9_]{2,62}$' then
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'invalid_event'
    );
  end if;

  select * into v_existing
  from public.reward_events
  where idempotency_key = v_key;

  if v_existing.event_id is not null then
    return jsonb_build_object(
      'accepted', true,
      'awarded', 0,
      'replayed', true,
      'denialReason', 'duplicate_event',
      'eventId', v_existing.event_id
    );
  end if;

  insert into public.reward_events (
    event_type, actor_user_id, subject_user_id,
    idempotency_key, source_type, source_id, metadata
  )
  values (
    v_event_type,
    v_uid,
    v_subject,
    v_key,
    v_source_type,
    v_source_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (idempotency_key) do nothing
  returning event_id into v_event_id;

  if v_event_id is null then
    select event_id into v_event_id
    from public.reward_events
    where idempotency_key = v_key;
    return jsonb_build_object(
      'accepted', true,
      'awarded', 0,
      'replayed', true,
      'denialReason', 'duplicate_event',
      'eventId', v_event_id
    );
  end if;

  if exists (
    select 1
    from public.reward_account_eligibility e
    where e.user_id = v_subject
      and e.state = 'ineligible'
  ) then
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'account_ineligible',
      'eventId', v_event_id
    );
  end if;

  select * into v_rule
  from public.reward_rules
  where event_type = v_event_type
  order by enabled desc, version desc
  limit 1;

  if v_rule.rule_id is null then
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'no_matching_rule',
      'eventId', v_event_id
    );
  end if;

  if not v_rule.enabled then
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'rule_disabled',
      'eventId', v_event_id
    );
  end if;

  if v_rule.points_amount <= 0 then
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'rule_zero',
      'eventId', v_event_id
    );
  end if;

  if (v_rule.start_at is not null and now() < v_rule.start_at)
     or (v_rule.end_at is not null and now() > v_rule.end_at) then
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'rule_inactive_window',
      'eventId', v_event_id
    );
  end if;

  if coalesce(public.um_points_config_value('unified_rewards_engine_authoritative', 0), 0) <> 1 then
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'engine_not_authoritative',
      'eventId', v_event_id
    );
  end if;

  v_counterpart := nullif(btrim(coalesce(
    p_metadata->>'counterpartUserId',
    p_metadata->>'counterpart_user_id',
    ''
  )), '');

  if v_counterpart is not null and v_counterpart = v_subject::text then
    perform public.flag_reward_abuse(
      'self_interaction',
      v_subject,
      v_uid,
      v_event_id,
      jsonb_build_object('eventType', v_event_type)
    );
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'self_interaction',
      'eventId', v_event_id
    );
  end if;

  if (
    select count(*)
    from public.reward_events e
    where e.subject_user_id = v_subject
      and e.event_type = v_event_type
      and e.created_at > now() - interval '60 seconds'
  ) >= 8 then
    perform public.flag_reward_abuse(
      'rapid_repeat',
      v_subject,
      null,
      v_event_id,
      jsonb_build_object('eventType', v_event_type)
    );
  end if;

  if v_rule.requires_verified_account
     and lower(coalesce(p_metadata->>'accountVerified', 'false')) not in ('true', 't', '1') then
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'eligibility_unverified',
      'eventId', v_event_id
    );
  end if;

  if v_rule.minimum_account_age_seconds is not null
     and nullif(btrim(coalesce(p_metadata->>'accountCreatedAt', '')), '') is not null
     and (now() - (p_metadata->>'accountCreatedAt')::timestamptz)
         < make_interval(secs => v_rule.minimum_account_age_seconds) then
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'eligibility_account_age',
      'eventId', v_event_id
    );
  end if;

  perform pg_advisory_xact_lock(hashtext('um-reward-user:' || v_subject::text));

  select count(*)::integer, max(created_at)
    into v_credit_count, v_last_credit
  from public.um_points_ledger
  where user_id = v_subject
    and rule_id = v_rule.rule_id
    and direction = 'CREDIT'
    and status not in ('REVERSED', 'EXPIRED');

  if (v_rule.lifetime_limit is not null and v_credit_count >= v_rule.lifetime_limit)
     or (v_rule.per_user_limit is not null and v_credit_count >= v_rule.per_user_limit) then
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'eligibility_limit',
      'eventId', v_event_id
    );
  end if;

  if v_rule.daily_limit is not null
     and (
       select count(*)
       from public.um_points_ledger
       where user_id = v_subject
         and rule_id = v_rule.rule_id
         and direction = 'CREDIT'
         and status not in ('REVERSED', 'EXPIRED')
         and created_at >= date_trunc('day', timezone('utc', now()))
     ) >= v_rule.daily_limit then
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'eligibility_limit',
      'eventId', v_event_id
    );
  end if;

  if v_rule.weekly_limit is not null
     and (
       select count(*)
       from public.um_points_ledger
       where user_id = v_subject
         and rule_id = v_rule.rule_id
         and direction = 'CREDIT'
         and status not in ('REVERSED', 'EXPIRED')
         and created_at >= now() - interval '7 days'
     ) >= v_rule.weekly_limit then
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'eligibility_limit',
      'eventId', v_event_id
    );
  end if;

  if v_rule.cooldown_seconds is not null
     and v_last_credit is not null
     and (now() - v_last_credit) < make_interval(secs => v_rule.cooldown_seconds) then
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'eligibility_cooldown',
      'eventId', v_event_id
    );
  end if;

  if v_rule.requires_unique_actor
     and v_counterpart is not null
     and exists (
       select 1
       from public.um_points_ledger
       where user_id = v_subject
         and rule_id = v_rule.rule_id
         and direction = 'CREDIT'
         and status not in ('REVERSED', 'EXPIRED')
         and metadata->>'counterpartUserId' = v_counterpart
     ) then
    return jsonb_build_object(
      'accepted', false,
      'awarded', 0,
      'denialReason', 'eligibility_limit',
      'eventId', v_event_id
    );
  end if;

  v_delay := coalesce(v_rule.qualification_delay_seconds, 0);
  v_status := case when v_delay > 0 then 'PENDING' else 'QUALIFIED' end;

  insert into public.reward_qualifications (
    event_id, rule_id, rule_version, user_id, status, reason_code, qualified_at
  )
  values (
    v_event_id,
    v_rule.rule_id,
    v_rule.version,
    v_subject,
    v_status,
    case when v_status = 'QUALIFIED' then 'auto_qualified' else 'awaiting_qualification' end,
    case when v_status = 'QUALIFIED' then now() else null end
  )
  returning qualification_id into v_qual_id;

  insert into public.um_points_ledger (
    user_id,
    points,
    reason,
    dedupe_key,
    metadata,
    event_id,
    rule_id,
    rule_version,
    direction,
    status,
    reason_code,
    source_type,
    source_id,
    confirmed_at
  )
  values (
    v_subject,
    v_rule.points_amount,
    left(v_rule.name, 200),
    'unified:' || v_key,
    jsonb_build_object(
      'eventType', v_event_type,
      'qualificationId', v_qual_id,
      'ruleVersion', v_rule.version,
      'counterpartUserId', v_counterpart
    ),
    v_event_id,
    v_rule.rule_id,
    v_rule.version,
    'CREDIT',
    case when v_status = 'QUALIFIED' then 'CONFIRMED' else 'PENDING' end,
    v_event_type,
    v_source_type,
    v_source_id,
    case when v_status = 'QUALIFIED' then now() else null end
  )
  on conflict (user_id, dedupe_key) do nothing
  returning id into v_ledger_id;

  if v_ledger_id is null then
    return jsonb_build_object(
      'accepted', true,
      'awarded', 0,
      'replayed', true,
      'denialReason', 'duplicate_event',
      'eventId', v_event_id
    );
  end if;

  if v_status = 'QUALIFIED' then
    insert into public.um_point_balances (
      user_id, balance, pending_balance, lifetime_earned, lifetime_spent, updated_at
    )
    values (
      v_subject, v_rule.points_amount, 0, v_rule.points_amount, 0, now()
    )
    on conflict (user_id) do update
      set balance = public.um_point_balances.balance + excluded.balance,
          lifetime_earned = public.um_point_balances.lifetime_earned + excluded.lifetime_earned,
          updated_at = now();
  else
    insert into public.um_point_balances (
      user_id, balance, pending_balance, lifetime_earned, lifetime_spent, updated_at
    )
    values (
      v_subject, 0, v_rule.points_amount, 0, 0, now()
    )
    on conflict (user_id) do update
      set pending_balance = public.um_point_balances.pending_balance + excluded.pending_balance,
          updated_at = now();
  end if;

  perform public.reconcile_um_wallet_snapshot(v_subject);

  if v_status = 'QUALIFIED'
     and v_rule.points_amount >= 5
     and to_regprocedure('public.create_notification(uuid,uuid,text,text,text,text,text,text,jsonb,text)') is not null then
    perform public.create_notification(
      v_subject,
      null,
      'um_points_earned',
      '+' || v_rule.points_amount::text || ' UM Points',
      v_rule.name,
      'rewards',
      v_ledger_id::text,
      '/rewards',
      jsonb_build_object(
        'eventType', v_event_type,
        'points', v_rule.points_amount,
        'policyVersion', 'launch_v1'
      ),
      'um_points_earned:' || v_ledger_id::text
    );
  end if;

  return jsonb_build_object(
    'accepted', true,
    'awarded', case when v_status = 'QUALIFIED' then v_rule.points_amount else 0 end,
    'replayed', false,
    'eventId', v_event_id,
    'ledgerId', v_ledger_id,
    'qualificationId', v_qual_id,
    'status', v_status,
    'policyVersion', 'launch_v1'
  );
end;
$$;

revoke all on function public.process_reward_event(text, text, text, text, uuid, jsonb)
  from public, anon;
grant execute on function public.process_reward_event(text, text, text, text, uuid, jsonb)
  to authenticated;

comment on function public.process_reward_event(text, text, text, text, uuid, jsonb) is
  'Unified rewards event intake. No amount argument. Awards only when an enabled rule has points_amount > 0.';

-- ---------------------------------------------------------------------------
-- 6) Read contracts
-- ---------------------------------------------------------------------------

create or replace function public.get_my_rewards_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_snap jsonb;
  v_code text;
  v_active integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_snap := public.derive_um_wallet_snapshot(v_uid);
  v_code := public.ensure_referral_code_for_user(v_uid);

  select count(*)::integer into v_active
  from public.reward_rules
  where enabled = true
    and points_amount > 0;

  return jsonb_build_object(
    'contractVersion', 'v1',
    'wallet', v_snap,
    'referral', jsonb_build_object(
      'code', v_code,
      'referralLink', '/join?ref=' || v_code,
      'joinLink', '/join?ref=' || v_code,
      'invitePath', '/invite/' || v_code
    ),
    'activeRewardRuleCount', coalesce(v_active, 0),
    'pointValuesConfigured', coalesce(v_active, 0) > 0
  );
end;
$$;

revoke all on function public.get_my_rewards_snapshot() from public, anon;
grant execute on function public.get_my_rewards_snapshot() to authenticated;

create or replace function public.get_my_rewards_history(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(100, greatest(1, coalesce(p_limit, 50)));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  return coalesce(
    (
      select jsonb_agg(item)
      from (
        select jsonb_build_object(
          'transactionId', l.id,
          'direction', coalesce(l.direction, 'CREDIT'),
          'displayAmount', case
            when l.rule_id is null then l.points
            when r.enabled = true and r.points_amount > 0 then l.points
            else null
          end,
          'reasonCode', coalesce(l.reason_code, l.reason),
          'status', coalesce(l.status, 'CONFIRMED'),
          'createdAt', l.created_at,
          'ruleId', l.rule_id,
          'ruleVersion', l.rule_version
        ) as item
        from public.um_points_ledger l
        left join public.reward_rules r on r.rule_id = l.rule_id
        where l.user_id = v_uid
        order by l.created_at desc
        limit v_limit
      ) q
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.get_my_rewards_history(integer) from public, anon;
grant execute on function public.get_my_rewards_history(integer) to authenticated;

create or replace function public.get_my_referral_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_code := public.ensure_referral_code_for_user(v_uid);

  return jsonb_build_object(
    'contractVersion', 'v1',
    'code', v_code,
    'referralLink', '/join?ref=' || v_code,
    'joinLink', '/join?ref=' || v_code,
    'invitePath', '/invite/' || v_code,
    'rewardStatus', 'NONE'
  );
end;
$$;

revoke all on function public.get_my_referral_profile() from public, anon;
grant execute on function public.get_my_referral_profile() to authenticated;

create or replace function public.attribute_referral_signup_v2(p_referral_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_referral_code, '')));
  v_inviter uuid;
  v_existing uuid;
  v_parent uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_code !~ '^[A-Z0-9]{6,16}$' then
    return jsonb_build_object('accepted', false, 'denialReason', 'invalid_event');
  end if;

  select user_id into v_inviter
  from public.referral_codes
  where code = v_code
    and is_active = true
  limit 1;

  if v_inviter is null then
    perform public.flag_reward_abuse(
      'suspicious_referral',
      v_uid,
      null,
      null,
      jsonb_build_object('reason', 'unknown_code')
    );
    return jsonb_build_object('accepted', false, 'denialReason', 'referral_unknown_code');
  end if;

  if v_inviter = v_uid then
    perform public.flag_reward_abuse(
      'suspicious_referral',
      v_uid,
      v_inviter,
      null,
      jsonb_build_object('reason', 'self_referral')
    );
    return jsonb_build_object('accepted', false, 'denialReason', 'referral_self');
  end if;

  if exists (
    select 1 from public.referral_conversions where referred_user_id = v_uid
  ) then
    return jsonb_build_object('accepted', false, 'denialReason', 'referral_duplicate');
  end if;

  if exists (
    select 1
    from public.reward_events
    where idempotency_key = 'referral_signup_v2:' || v_uid::text
  ) then
    return jsonb_build_object('accepted', false, 'denialReason', 'referral_duplicate');
  end if;

  select referrer_user_id into v_parent
  from public.referral_conversions
  where referred_user_id = v_inviter
  limit 1;

  if v_parent = v_uid then
    perform public.flag_reward_abuse(
      'referral_loop',
      v_uid,
      v_inviter,
      null,
      jsonb_build_object('reason', 'direct_loop')
    );
    return jsonb_build_object('accepted', false, 'denialReason', 'referral_loop');
  end if;

  if exists (
    select 1
    from public.reward_events
    where event_type = 'REFERRAL_SIGNUP'
      and actor_user_id = v_inviter
      and metadata->>'inviterUserId' = v_uid::text
  ) then
    perform public.flag_reward_abuse(
      'referral_loop',
      v_uid,
      v_inviter,
      null,
      jsonb_build_object('reason', 'direct_loop_v2')
    );
    return jsonb_build_object('accepted', false, 'denialReason', 'referral_loop');
  end if;

  -- Record attribution on reward_events only. Do NOT insert referral_conversions:
  -- that unique(referred_user_id) slot is owned by complete_referral_signup
  -- until unified_rewards_engine_authoritative = 1.
  insert into public.reward_events (
    event_type,
    actor_user_id,
    subject_user_id,
    idempotency_key,
    source_type,
    source_id,
    metadata
  )
  values (
    'REFERRAL_SIGNUP',
    v_uid,
    v_uid,
    'referral_signup_v2:' || v_uid::text,
    'referral',
    v_code,
    jsonb_build_object(
      'inviterUserId', v_inviter,
      'referralCode', v_code,
      'pointsAwarded', 0
    )
  )
  on conflict (idempotency_key) do nothing
  returning event_id into v_existing;

  if v_existing is null then
    return jsonb_build_object('accepted', false, 'denialReason', 'referral_duplicate');
  end if;

  return jsonb_build_object(
    'accepted', true,
    'denialReason', null,
    'conversionId', null,
    'eventId', v_existing,
    'inviterUserId', v_inviter,
    'rewardStatus', 'PENDING',
    'pointsAwarded', 0
  );
end;
$$;

revoke all on function public.attribute_referral_signup_v2(text) from public, anon;
grant execute on function public.attribute_referral_signup_v2(text) to authenticated;

comment on function public.attribute_referral_signup_v2(text) is
  'Records referral attribution without awarding points. Qualification stays PENDING.';

-- ---------------------------------------------------------------------------
-- 7) Admin foundation — audited, no destructive ledger edits
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_reward_rules()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform admin required' using errcode = '42501';
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(r) order by r.event_type)
      from public.reward_rules r
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.admin_list_reward_rules() from public, anon;
grant execute on function public.admin_list_reward_rules() to authenticated;

create or replace function public.admin_update_reward_rule(
  p_rule_id text,
  p_enabled boolean default null,
  p_points_amount integer default null,
  p_name text default null,
  p_start_at timestamptz default null,
  p_end_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_before public.reward_rules%rowtype;
  v_after public.reward_rules%rowtype;
begin
  if v_uid is null or not public.is_platform_admin() then
    raise exception 'Platform admin required' using errcode = '42501';
  end if;

  select * into v_before from public.reward_rules where rule_id = p_rule_id;
  if v_before.rule_id is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown_rule');
  end if;

  if p_points_amount is not null and p_points_amount < 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_amount');
  end if;

  update public.reward_rules
  set enabled = coalesce(p_enabled, enabled),
      points_amount = coalesce(p_points_amount, points_amount),
      name = coalesce(nullif(btrim(coalesce(p_name, '')), ''), name),
      start_at = coalesce(p_start_at, start_at),
      end_at = coalesce(p_end_at, end_at),
      version = version + 1,
      updated_at = now()
  where rule_id = p_rule_id
  returning * into v_after;

  insert into public.reward_rule_versions (
    rule_id, version, enabled, points_amount, snapshot, reason
  )
  values (
    v_after.rule_id,
    v_after.version,
    v_after.enabled,
    v_after.points_amount,
    to_jsonb(v_after),
    'admin_update'
  );

  insert into public.reward_rule_audits (
    admin_user_id, action, target_type, target_id, before, after
  )
  values (
    v_uid,
    'update_rule',
    'rule',
    p_rule_id,
    jsonb_build_object(
      'enabled', v_before.enabled,
      'pointsAmount', v_before.points_amount,
      'version', v_before.version
    ),
    jsonb_build_object(
      'enabled', v_after.enabled,
      'pointsAmount', v_after.points_amount,
      'version', v_after.version
    )
  );

  return jsonb_build_object('ok', true, 'rule', to_jsonb(v_after));
end;
$$;

revoke all on function public.admin_update_reward_rule(text, boolean, integer, text, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.admin_update_reward_rule(text, boolean, integer, text, timestamptz, timestamptz)
  to authenticated;

create or replace function public.admin_reverse_reward_ledger(
  p_transaction_id uuid,
  p_reason_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_orig public.um_points_ledger%rowtype;
  v_rev uuid;
  v_reason text := nullif(btrim(coalesce(p_reason_code, '')), '');
begin
  if v_uid is null or not public.is_platform_admin() then
    raise exception 'Platform admin required' using errcode = '42501';
  end if;

  if v_reason is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_reason');
  end if;

  select * into v_orig
  from public.um_points_ledger
  where id = p_transaction_id
  for update;
  if v_orig.id is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown_transaction');
  end if;

  if v_orig.direction <> 'CREDIT' then
    return jsonb_build_object('ok', false, 'reason', 'not_a_credit');
  end if;

  if v_orig.status = 'REVERSED' then
    return jsonb_build_object('ok', false, 'reason', 'already_reversed');
  end if;

  update public.um_points_ledger
  set status = 'REVERSED',
      reversed_at = now()
  where id = v_orig.id
    and status <> 'REVERSED';
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'already_reversed');
  end if;

  insert into public.um_points_ledger (
    user_id,
    points,
    reason,
    dedupe_key,
    metadata,
    event_id,
    rule_id,
    rule_version,
    direction,
    status,
    reason_code,
    source_type,
    source_id,
    confirmed_at,
    reversal_of
  )
  values (
    v_orig.user_id,
    v_orig.points,
    left('reversal: ' || v_reason, 200),
    'reversal:' || v_orig.id::text,
    jsonb_build_object('originalTransactionId', v_orig.id),
    v_orig.event_id,
    v_orig.rule_id,
    v_orig.rule_version,
    'DEBIT',
    'CONFIRMED',
    v_reason,
    'reversal',
    v_orig.id::text,
    now(),
    v_orig.id
  )
  on conflict (user_id, dedupe_key) do nothing
  returning id into v_rev;

  if v_rev is null then
    return jsonb_build_object('ok', false, 'reason', 'already_reversed');
  end if;

  update public.reward_qualifications
  set status = 'REVERSED',
      reversed_at = now(),
      reason_code = v_reason
  where event_id = v_orig.event_id
    and status <> 'REVERSED';

  if v_orig.status = 'CONFIRMED' then
    update public.um_point_balances
    set balance = greatest(0, balance - v_orig.points),
        updated_at = now()
    where user_id = v_orig.user_id;
  elsif v_orig.status = 'PENDING' then
    update public.um_point_balances
    set pending_balance = greatest(0, pending_balance - v_orig.points),
        updated_at = now()
    where user_id = v_orig.user_id;
  end if;

  insert into public.reward_rule_audits (
    admin_user_id, action, target_type, target_id, before, after
  )
  values (
    v_uid,
    'reverse_ledger',
    'ledger',
    v_orig.id::text,
    jsonb_build_object('status', v_orig.status),
    jsonb_build_object('status', 'REVERSED', 'reversalId', v_rev)
  );

  perform public.reconcile_um_wallet_snapshot(v_orig.user_id);

  return jsonb_build_object(
    'ok', true,
    'originalId', v_orig.id,
    'reversalId', v_rev
  );
end;
$$;

revoke all on function public.admin_reverse_reward_ledger(uuid, text) from public, anon;
grant execute on function public.admin_reverse_reward_ledger(uuid, text) to authenticated;

create or replace function public.admin_inspect_rewards(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform admin required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'wallet', public.derive_um_wallet_snapshot(p_user_id),
    'activeRewardRuleCount', (
      select count(*)::integer
      from public.reward_rules
      where enabled = true and points_amount > 0
    )
  );
end;
$$;

revoke all on function public.admin_inspect_rewards(uuid) from public, anon;
grant execute on function public.admin_inspect_rewards(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8) launch_v1 policy enablement + trusted intake + referrals + analytics
-- ---------------------------------------------------------------------------

insert into public.um_points_config (key, value, description)
values
  ('rewards_policy_version', 1, '1 = launch_v1; later values reserved for post_launch_v2'),
  ('legacy_award_path_enabled', 0, '0 = product awards route through unified engine'),
  ('launch_daily_earn_cap', 400, 'Launch Growth Mode safety net — not a first-N-videos cap'),
  ('referral_inviter_points', 40, 'launch_v1 inviter UM on qualified new account'),
  ('referral_referred_extra_points', 0, 'No second welcome; ACCOUNT_CREATED is the new-user bonus')
on conflict (key) do update
  set value = excluded.value,
      description = excluded.description;

insert into public.um_points_config (key, value, description)
values ('daily_earn_cap', 400, 'Launch Growth Mode daily earn safety net')
on conflict (key) do update
  set value = 400,
      description = excluded.description;

insert into public.reward_rules (
  rule_id, event_type, name, enabled, points_amount, lifetime_limit, daily_limit,
  requires_unique_actor, requires_verified_account, metadata
)
values
  ('capability.account_created', 'ACCOUNT_CREATED', 'Account created', true, 100, 1, null, false, true, '{"policy":"launch_v1"}'::jsonb),
  ('capability.referral_signup', 'REFERRAL_SIGNUP', 'Referral signup', false, 0, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.referral_qualified', 'REFERRAL_QUALIFIED', 'Referral qualified', true, 40, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.first_post', 'FIRST_POST', 'First post', true, 15, 1, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.post_published', 'POST_PUBLISHED', 'Post published', true, 6, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.video_published', 'VIDEO_PUBLISHED', 'Video published', true, 10, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.comment_created', 'COMMENT_CREATED', 'Comment created', true, 3, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.reply_created', 'REPLY_CREATED', 'Reply created', true, 4, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.like_given', 'LIKE_GIVEN', 'Like given', true, 1, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.like_received', 'LIKE_RECEIVED', 'Like received', true, 1, null, null, true, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.save_created', 'SAVE_CREATED', 'Save created', true, 2, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.save_received', 'SAVE_RECEIVED', 'Save received', true, 2, null, null, true, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.share_created', 'SHARE_CREATED', 'Share created', true, 3, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.share_received', 'SHARE_RECEIVED', 'Share received', true, 3, null, null, true, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.follow_given', 'FOLLOW_GIVEN', 'Follow given', true, 2, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.follow_received', 'FOLLOW_RECEIVED', 'Follow received', true, 3, null, null, true, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.daily_engagement', 'DAILY_ENGAGEMENT', 'Daily engagement', true, 5, null, 1, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.sound_created', 'SOUND_CREATED', 'Sound created', true, 8, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.sound_used', 'SOUND_USED', 'Sound used', true, 5, null, null, true, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.challenge_participate', 'CHALLENGE_PARTICIPATE', 'Challenge participate', true, 8, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.challenge_complete', 'CHALLENGE_COMPLETE', 'Challenge complete', true, 15, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.creator_milestone', 'CREATOR_MILESTONE', 'Creator milestone', true, 20, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.course_enrolled', 'COURSE_ENROLLED', 'Course enrolled', true, 5, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.lesson_completed', 'LESSON_COMPLETED', 'Lesson completed', true, 8, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.course_completed', 'COURSE_COMPLETED', 'Course completed', true, 25, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.quiz_passed', 'QUIZ_PASSED', 'Quiz passed', true, 10, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.certificate_earned', 'CERTIFICATE_EARNED', 'Certificate earned', true, 30, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.learning_streak', 'LEARNING_STREAK', 'Learning streak', true, 5, null, 1, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.streak_reached', 'STREAK_REACHED', 'Streak reached', true, 5, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.milestone_reached', 'MILESTONE_REACHED', 'Milestone reached', true, 20, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.game_participate', 'GAME_PARTICIPATE', 'Game participate', true, 3, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.game_completed', 'GAME_COMPLETED', 'Game completed', true, 8, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.game_achievement', 'GAME_ACHIEVEMENT', 'Game achievement', true, 12, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.game_tournament', 'GAME_TOURNAMENT', 'Game tournament', true, 20, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.game_score_milestone', 'GAME_SCORE_MILESTONE', 'Game score milestone', true, 10, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.store_purchase', 'STORE_PURCHASE', 'Store purchase', true, 15, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.store_sale', 'STORE_SALE', 'Store sale', true, 15, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.store_milestone', 'STORE_MILESTONE', 'Store milestone', true, 25, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.admin_grant', 'ADMIN_GRANT', 'Admin grant', false, 0, null, null, false, false, '{"policy":"launch_v1"}'::jsonb),
  ('capability.admin_reversal', 'ADMIN_REVERSAL', 'Admin reversal', false, 0, null, null, false, false, '{"policy":"launch_v1"}'::jsonb)
on conflict (rule_id) do update
  set name = excluded.name,
      enabled = excluded.enabled,
      points_amount = excluded.points_amount,
      lifetime_limit = excluded.lifetime_limit,
      daily_limit = excluded.daily_limit,
      requires_unique_actor = excluded.requires_unique_actor,
      requires_verified_account = excluded.requires_verified_account,
      metadata = excluded.metadata,
      version = public.reward_rules.version + 1,
      updated_at = now();

create or replace function public.process_reward_event_for_users(
  p_actor_user_id uuid,
  p_subject_user_id uuid,
  p_event_type text,
  p_idempotency_key text,
  p_source_type text,
  p_source_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := p_actor_user_id;
  v_subject uuid := coalesce(p_subject_user_id, p_actor_user_id);
begin
  if v_uid is null or v_subject is null then
    return jsonb_build_object('accepted', false, 'awarded', 0, 'denialReason', 'invalid_event');
  end if;

  return public.process_reward_event(
    p_event_type,
    p_idempotency_key,
    p_source_type,
    p_source_id,
    v_subject,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('_trustedActor', v_uid)
  );
end;
$$;

revoke all on function public.process_reward_event_for_users(uuid, uuid, text, text, text, text, jsonb)
  from public, anon, authenticated;

create or replace function public.verify_reward_event_source(
  p_uid uuid,
  p_event_type text,
  p_source_id text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ok boolean := false;
begin
  if p_uid is null or p_event_type is null or p_source_id is null then
    return false;
  end if;

  if p_event_type in (
    'ACCOUNT_CREATED', 'REFERRAL_SIGNUP', 'REFERRAL_QUALIFIED',
    'ADMIN_GRANT', 'ADMIN_REVERSAL',
    'COURSE_ENROLLED', 'LESSON_COMPLETED', 'COURSE_COMPLETED', 'QUIZ_PASSED',
    'CERTIFICATE_EARNED', 'LEARNING_STREAK', 'STREAK_REACHED', 'MILESTONE_REACHED',
    'GAME_PARTICIPATE', 'GAME_COMPLETED', 'GAME_ACHIEVEMENT', 'GAME_TOURNAMENT',
    'GAME_SCORE_MILESTONE', 'STORE_PURCHASE', 'STORE_SALE', 'STORE_MILESTONE',
    'CHALLENGE_PARTICIPATE', 'CHALLENGE_COMPLETE', 'CREATOR_MILESTONE'
  ) then
    return false;
  end if;

  if p_event_type in ('POST_PUBLISHED', 'VIDEO_PUBLISHED', 'FIRST_POST') then
    select true into v_ok
    from public.posts
    where id::text = p_source_id
      and user_id = p_uid
      and (
        p_event_type <> 'VIDEO_PUBLISHED'
        or post_type = 'video'
      );
    return coalesce(v_ok, false);
  end if;

  if p_event_type in ('COMMENT_CREATED', 'REPLY_CREATED') then
    select true into v_ok
    from public.post_comments
    where id::text = p_source_id
      and user_id = p_uid;
    return coalesce(v_ok, false);
  end if;

  if p_event_type in ('LIKE_GIVEN', 'LIKE_RECEIVED') then
    select true into v_ok
    from public.post_likes l
    join public.posts p on p.id = l.post_id
    where (l.post_id::text || ':' || l.user_id::text) = p_source_id
      and (
        (p_event_type = 'LIKE_GIVEN' and l.user_id = p_uid)
        or (p_event_type = 'LIKE_RECEIVED' and p.user_id = p_uid and l.user_id <> p_uid)
      );
    return coalesce(v_ok, false);
  end if;

  if p_event_type in ('SAVE_CREATED', 'SAVE_RECEIVED') then
    select true into v_ok
    from public.post_saves s
    join public.posts p on p.id = s.post_id
    where (s.post_id::text || ':' || s.user_id::text) = p_source_id
      and (
        (p_event_type = 'SAVE_CREATED' and s.user_id = p_uid)
        or (p_event_type = 'SAVE_RECEIVED' and p.user_id = p_uid and s.user_id <> p_uid)
      );
    return coalesce(v_ok, false);
  end if;

  if p_event_type in ('SHARE_CREATED', 'SHARE_RECEIVED') then
    select true into v_ok
    from public.post_shares s
    join public.posts p on p.id = s.post_id
    where (s.post_id::text || ':' || coalesce(s.user_id::text, s.viewer_key)) = p_source_id
      and (
        (p_event_type = 'SHARE_CREATED' and s.user_id = p_uid)
        or (p_event_type = 'SHARE_RECEIVED' and p.user_id = p_uid and s.user_id is distinct from p_uid)
      );
    return coalesce(v_ok, false);
  end if;

  if p_event_type in ('FOLLOW_GIVEN', 'FOLLOW_RECEIVED') then
    select true into v_ok
    from public.profile_follows f
    where (f.follower_id::text || ':' || f.following_id::text) = p_source_id
      and (
        (p_event_type = 'FOLLOW_GIVEN' and f.follower_id = p_uid)
        or (p_event_type = 'FOLLOW_RECEIVED' and f.following_id = p_uid and f.follower_id <> p_uid)
      );
    return coalesce(v_ok, false);
  end if;

  if p_event_type = 'SOUND_CREATED' and to_regclass('public.social_sounds') is not null then
    select true into v_ok
    from public.social_sounds
    where id::text = p_source_id
      and owner_user_id = p_uid;
    return coalesce(v_ok, false);
  end if;

  if p_event_type = 'DAILY_ENGAGEMENT' then
    return p_source_id = (p_uid::text || ':' || to_char((timezone('utc', now()))::date, 'YYYY-MM-DD'));
  end if;

  return false;
end;
$$;

revoke all on function public.verify_reward_event_source(uuid, text, text)
  from public, anon, authenticated;

create or replace function public.ingest_verified_reward_event(
  p_actor_user_id uuid,
  p_subject_user_id uuid,
  p_event_type text,
  p_idempotency_key text,
  p_source_type text,
  p_source_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_actor_user_id is null then
    return jsonb_build_object('accepted', false, 'awarded', 0, 'denialReason', 'invalid_event');
  end if;
  return public.process_reward_event_for_users(
    p_actor_user_id,
    coalesce(p_subject_user_id, p_actor_user_id),
    p_event_type,
    p_idempotency_key,
    p_source_type,
    p_source_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.ingest_verified_reward_event(uuid, uuid, text, text, text, text, jsonb)
  from public, anon, authenticated;

create or replace function public.admin_confirm_reward_qualification(p_qualification_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_qual public.reward_qualifications%rowtype;
  v_led public.um_points_ledger%rowtype;
begin
  if v_uid is null or not public.is_platform_admin() then
    raise exception 'Platform admin required' using errcode = '42501';
  end if;

  select * into v_qual
  from public.reward_qualifications
  where qualification_id = p_qualification_id
  for update;
  if v_qual.qualification_id is null or v_qual.status <> 'PENDING' then
    return jsonb_build_object('ok', false, 'reason', 'not_pending');
  end if;

  update public.reward_qualifications
  set status = 'QUALIFIED',
      qualified_at = now(),
      reason_code = 'admin_confirmed'
  where qualification_id = v_qual.qualification_id;

  select * into v_led
  from public.um_points_ledger
  where event_id = v_qual.event_id
    and direction = 'CREDIT'
    and status = 'PENDING'
  for update;

  if v_led.id is not null then
    update public.um_points_ledger
    set status = 'CONFIRMED',
        confirmed_at = now()
    where id = v_led.id;
    update public.um_point_balances
    set balance = balance + v_led.points,
        pending_balance = greatest(0, pending_balance - v_led.points),
        lifetime_earned = lifetime_earned + v_led.points,
        updated_at = now()
    where user_id = v_qual.user_id;
  end if;

  perform public.reconcile_um_wallet_snapshot(v_qual.user_id);
  return jsonb_build_object('ok', true, 'qualificationId', v_qual.qualification_id);
end;
$$;

revoke all on function public.admin_confirm_reward_qualification(uuid) from public, anon;
grant execute on function public.admin_confirm_reward_qualification(uuid) to authenticated;

create or replace function public.admin_reject_reward_qualification(
  p_qualification_id uuid,
  p_reason_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_qual public.reward_qualifications%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason_code, '')), '');
begin
  if v_uid is null or not public.is_platform_admin() then
    raise exception 'Platform admin required' using errcode = '42501';
  end if;
  if v_reason is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_reason');
  end if;

  select * into v_qual
  from public.reward_qualifications
  where qualification_id = p_qualification_id
  for update;
  if v_qual.qualification_id is null or v_qual.status <> 'PENDING' then
    return jsonb_build_object('ok', false, 'reason', 'not_pending');
  end if;

  update public.reward_qualifications
  set status = 'REJECTED',
      rejected_at = now(),
      reason_code = v_reason
  where qualification_id = v_qual.qualification_id;

  update public.um_points_ledger
  set status = 'EXPIRED'
  where event_id = v_qual.event_id
    and status = 'PENDING';

  update public.um_point_balances
  set pending_balance = greatest(
        0,
        pending_balance - coalesce((
          select points from public.um_points_ledger
          where event_id = v_qual.event_id
          order by created_at desc
          limit 1
        ), 0)
      ),
      updated_at = now()
  where user_id = v_qual.user_id;

  perform public.reconcile_um_wallet_snapshot(v_qual.user_id);
  return jsonb_build_object('ok', true, 'qualificationId', v_qual.qualification_id);
end;
$$;

revoke all on function public.admin_reject_reward_qualification(uuid, text) from public, anon;
grant execute on function public.admin_reject_reward_qualification(uuid, text) to authenticated;

create or replace function public.qualify_my_referral_signup()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_inviter uuid;
  v_attr jsonb;
  v_award jsonb;
  v_created timestamptz;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select created_at into v_created from auth.users where id = v_uid;
  if v_created is not null and v_created < now() - interval '30 days' then
    return jsonb_build_object('accepted', false, 'denialReason', 'invalid_event');
  end if;

  v_attr := public.attribute_referral_signup_v2(
    coalesce(
      (
        select referral_code
        from public.referral_attributions
        where converted_user_id = v_uid
           or (
             anonymous_visitor_id is not null
             and status in ('pending', 'converted')
           )
        order by created_at asc
        limit 1
      ),
      ''
    )
  );

  select c.user_id, c.code into v_inviter, v_code
  from public.referral_codes c
  join public.referral_attributions a on a.referral_code = c.code
  where a.converted_user_id = v_uid
     or exists (
       select 1 from public.reward_events e
       where e.idempotency_key = 'referral_signup_v2:' || v_uid::text
         and e.metadata->>'inviterUserId' = c.user_id::text
     )
  limit 1;

  if v_inviter is null then
    select user_id, code into v_inviter, v_code
    from public.referral_codes
    where code = upper(btrim(coalesce(
      (select referral_code from public.referral_attributions
       where converted_user_id is null
         and status = 'pending'
       order by created_at desc
       limit 1),
      ''
    )))
    limit 1;
  end if;

  if v_inviter is null or v_inviter = v_uid then
    return jsonb_build_object(
      'accepted', false,
      'denialReason', case when v_inviter = v_uid then 'referral_self' else 'referral_unknown_code' end
    );
  end if;

  v_award := public.ingest_verified_reward_event(
    v_inviter,
    v_inviter,
    'REFERRAL_QUALIFIED',
    'referral_signup:' || v_uid::text,
    'referral',
    v_uid::text,
    jsonb_build_object('referredUserId', v_uid, 'referralCode', v_code)
  );

  return jsonb_build_object(
    'accepted', coalesce((v_award->>'accepted')::boolean, false),
    'awarded', coalesce((v_award->>'awarded')::integer, 0),
    'replayed', coalesce((v_award->>'replayed')::boolean, false),
    'inviterUserId', v_inviter,
    'referredExtraPoints', 0
  );
end;
$$;

revoke all on function public.qualify_my_referral_signup() from public, anon;
grant execute on function public.qualify_my_referral_signup() to authenticated;

create or replace function public.claim_verified_welcome_bonus()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_confirmed timestamptz;
  v_existing uuid;
  v_result jsonb;
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

  select id into v_existing
  from public.um_points_ledger
  where user_id = v_uid
    and (
      dedupe_key = 'verified_welcome:' || v_uid::text
      or dedupe_key = 'unified:verified_welcome:' || v_uid::text
    )
  limit 1;

  if v_existing is not null then
    return jsonb_build_object('created', false, 'reason', 'deduped', 'replayed', true);
  end if;

  v_result := public.ingest_verified_reward_event(
    v_uid,
    v_uid,
    'ACCOUNT_CREATED',
    'verified_welcome:' || v_uid::text,
    'account',
    v_uid::text,
    jsonb_build_object('accountVerified', true)
  );

  return jsonb_build_object(
    'created', coalesce((v_result->>'awarded')::integer, 0) > 0,
    'reason', coalesce(v_result->>'denialReason', 'ok'),
    'points', coalesce((v_result->>'awarded')::integer, 0),
    'replayed', coalesce((v_result->>'replayed')::boolean, false)
  );
end;
$$;

revoke all on function public.claim_verified_welcome_bonus() from public;
grant execute on function public.claim_verified_welcome_bonus() to authenticated;

create or replace function public.route_legacy_um_award_to_engine(
  p_user_id uuid,
  p_reason text,
  p_dedupe_key text,
  p_metadata jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := lower(btrim(coalesce(p_reason, '')));
  v_type text;
  v_actor uuid := p_user_id;
  v_subject uuid := p_user_id;
begin
  if coalesce(public.um_points_config_value('unified_rewards_engine_authoritative', 0), 0) <> 1 then
    return null;
  end if;
  if coalesce((p_metadata->>'engine_passthrough')::boolean, false) then
    return null;
  end if;

  if v_reason in ('verified account welcome') then
    v_type := 'ACCOUNT_CREATED';
  elsif v_reason in ('referral signup') then
    v_type := 'REFERRAL_QUALIFIED';
  elsif v_reason in ('first post of the day') then
    v_type := 'POST_PUBLISHED';
  elsif v_reason in ('meaningful engagement') then
    v_type := 'COMMENT_CREATED';
  elsif v_reason like 'creator qualified save%' or v_reason = 'qualified save' then
    v_type := 'SAVE_RECEIVED';
  elsif v_reason like 'creator qualified share%' or v_reason = 'qualified share' then
    v_type := 'SHARE_RECEIVED';
  elsif v_reason = 'invited user became active' then
    return jsonb_build_object('created', false, 'reason', 'routed_referral_engine');
  else
    return null;
  end if;

  return public.ingest_verified_reward_event(
    v_actor,
    v_subject,
    v_type,
    p_dedupe_key,
    coalesce(p_metadata->>'category', 'legacy'),
    coalesce(p_metadata->>'postId', p_metadata->>'commentId', p_dedupe_key),
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.route_legacy_um_award_to_engine(uuid, text, text, jsonb)
  from public, anon, authenticated;

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
  v_routed jsonb;
  v_points integer := coalesce(p_points, 0);
  v_reason text := btrim(coalesce(p_reason, ''));
  v_dedupe text := nullif(btrim(coalesce(p_dedupe_key, '')), '');
  v_ledger_id uuid;
  v_earned_today integer;
  v_daily_cap integer := public.um_points_config_value('daily_earn_cap', 400);
  v_category_earned integer := 0;
  v_category text := coalesce(p_metadata->>'category', '');
  v_skip_notification boolean := coalesce((p_metadata->>'skip_notification')::boolean, false);
  v_bypass_daily_cap boolean := coalesce((p_metadata->>'bypass_daily_cap')::boolean, false);
begin
  v_routed := public.route_legacy_um_award_to_engine(
    p_user_id, p_reason, p_dedupe_key, coalesce(p_metadata, '{}'::jsonb)
  );
  if v_routed is not null then
    return jsonb_build_object(
      'created', coalesce((v_routed->>'awarded')::integer, 0) > 0,
      'reason', coalesce(v_routed->>'denialReason', 'routed'),
      'points', coalesce((v_routed->>'awarded')::integer, 0)
    );
  end if;

  if p_user_id is null or v_points <= 0 or v_reason = '' or v_dedupe is null then
    return jsonb_build_object('created', false, 'reason', 'invalid');
  end if;

  if not v_bypass_daily_cap then
    v_earned_today := public.um_points_earned_today(p_user_id);
    if v_earned_today >= v_daily_cap then
      return jsonb_build_object('created', false, 'reason', 'daily_cap');
    end if;
    if v_points > (v_daily_cap - v_earned_today) then
      v_points := greatest(0, v_daily_cap - v_earned_today);
    end if;
    if v_points <= 0 then
      return jsonb_build_object('created', false, 'reason', 'daily_cap');
    end if;
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
    return jsonb_build_object('created', false, 'reason', 'deduped');
  end if;

  insert into public.um_point_balances (user_id, balance, updated_at)
  values (p_user_id, v_points, now())
  on conflict (user_id) do update
    set balance = public.um_point_balances.balance + excluded.balance,
        updated_at = now();

  if not v_skip_notification
     and v_points >= 5
     and to_regprocedure('public.create_notification(uuid,uuid,text,text,text,text,text,text,jsonb,text)') is not null then
    perform public.create_notification(
      p_user_id, null, 'um_points_earned',
      '+' || v_points::text || ' UM Points',
      v_reason, 'rewards', v_ledger_id::text, '/rewards',
      jsonb_build_object('points', v_points),
      'um_points_earned:' || v_ledger_id::text
    );
  end if;

  return jsonb_build_object('created', true, 'points', v_points, 'ledgerId', v_ledger_id);
end;
$$;

revoke all on function public.award_um_points_to_user(uuid, integer, text, text, jsonb, integer)
  from public, anon, authenticated;

create or replace function public.reward_on_post_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null then
    return new;
  end if;
  if new.post_type = 'video' then
    perform public.ingest_verified_reward_event(
      new.user_id, new.user_id, 'VIDEO_PUBLISHED',
      'video_published:' || new.id::text, 'post', new.id::text,
      jsonb_build_object('postId', new.id)
    );
  else
    perform public.ingest_verified_reward_event(
      new.user_id, new.user_id, 'POST_PUBLISHED',
      'post_published:' || new.id::text, 'post', new.id::text,
      jsonb_build_object('postId', new.id)
    );
  end if;
  perform public.ingest_verified_reward_event(
    new.user_id, new.user_id, 'FIRST_POST',
    'first_post:' || new.user_id::text, 'post', new.id::text,
    jsonb_build_object('postId', new.id)
  );
  return new;
end;
$$;

drop trigger if exists reward_on_post_published on public.posts;
create trigger reward_on_post_published
  after insert on public.posts
  for each row execute function public.reward_on_post_published();

create or replace function public.reward_on_comment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min int := public.um_points_config_value('comment_min_length', 20);
  v_owner uuid;
begin
  if new.user_id is null then
    return new;
  end if;
  if char_length(btrim(coalesce(new.body, ''))) < v_min then
    return new;
  end if;
  select user_id into v_owner from public.posts where id = new.post_id;
  if v_owner is not null and v_owner = new.user_id then
    return new;
  end if;
  perform public.ingest_verified_reward_event(
    new.user_id, new.user_id, 'COMMENT_CREATED',
    'meaningful_comment:' || new.id::text, 'comment', new.id::text,
    jsonb_build_object('postId', new.post_id, 'counterpartUserId', v_owner)
  );
  return new;
end;
$$;

drop trigger if exists reward_on_comment_created on public.post_comments;
create trigger reward_on_comment_created
  after insert on public.post_comments
  for each row execute function public.reward_on_comment_created();

create or replace function public.reward_on_like_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.posts where id = new.post_id;
  if v_owner is null or v_owner = new.user_id then
    return new;
  end if;
  perform public.ingest_verified_reward_event(
    new.user_id, new.user_id, 'LIKE_GIVEN',
    'like_given:' || new.post_id::text || ':' || new.user_id::text,
    'like', new.post_id::text || ':' || new.user_id::text,
    jsonb_build_object('counterpartUserId', v_owner)
  );
  perform public.ingest_verified_reward_event(
    new.user_id, v_owner, 'LIKE_RECEIVED',
    'like_received:' || new.post_id::text || ':' || new.user_id::text,
    'like', new.post_id::text || ':' || new.user_id::text,
    jsonb_build_object('counterpartUserId', new.user_id)
  );
  return new;
end;
$$;

drop trigger if exists reward_on_like_created on public.post_likes;
create trigger reward_on_like_created
  after insert on public.post_likes
  for each row execute function public.reward_on_like_created();

create or replace function public.reward_on_save_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.posts where id = new.post_id;
  if v_owner is null or v_owner = new.user_id then
    return new;
  end if;
  perform public.ingest_verified_reward_event(
    new.user_id, new.user_id, 'SAVE_CREATED',
    'save_created:' || new.post_id::text || ':' || new.user_id::text,
    'save', new.post_id::text || ':' || new.user_id::text,
    jsonb_build_object('counterpartUserId', v_owner)
  );
  perform public.ingest_verified_reward_event(
    new.user_id, v_owner, 'SAVE_RECEIVED',
    'save_received:' || new.post_id::text || ':' || new.user_id::text,
    'save', new.post_id::text || ':' || new.user_id::text,
    jsonb_build_object('counterpartUserId', new.user_id)
  );
  return new;
end;
$$;

drop trigger if exists reward_on_save_created on public.post_saves;
create trigger reward_on_save_created
  after insert on public.post_saves
  for each row execute function public.reward_on_save_created();

create or replace function public.reward_on_share_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.posts where id = new.post_id;
  if v_owner is null or v_owner = new.user_id then
    return new;
  end if;
  perform public.ingest_verified_reward_event(
    coalesce(new.user_id, v_owner), coalesce(new.user_id, v_owner), 'SHARE_CREATED',
    'share_created:' || new.post_id::text || ':' || coalesce(new.user_id::text, new.viewer_key),
    'share', new.post_id::text || ':' || coalesce(new.user_id::text, new.viewer_key),
    jsonb_build_object('counterpartUserId', v_owner)
  );
  if new.user_id is not null then
    perform public.ingest_verified_reward_event(
      new.user_id, v_owner, 'SHARE_RECEIVED',
      'share_received:' || new.post_id::text || ':' || new.user_id::text,
      'share', new.post_id::text || ':' || new.user_id::text,
      jsonb_build_object('counterpartUserId', new.user_id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists reward_on_share_created on public.post_shares;
create trigger reward_on_share_created
  after insert on public.post_shares
  for each row execute function public.reward_on_share_created();

create or replace function public.reward_on_follow_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.follower_id is null or new.following_id is null or new.follower_id = new.following_id then
    return new;
  end if;
  perform public.ingest_verified_reward_event(
    new.follower_id, new.follower_id, 'FOLLOW_GIVEN',
    'follow_given:' || new.follower_id::text || ':' || new.following_id::text,
    'follow', new.follower_id::text || ':' || new.following_id::text,
    jsonb_build_object('counterpartUserId', new.following_id)
  );
  perform public.ingest_verified_reward_event(
    new.follower_id, new.following_id, 'FOLLOW_RECEIVED',
    'follow_received:' || new.follower_id::text || ':' || new.following_id::text,
    'follow', new.follower_id::text || ':' || new.following_id::text,
    jsonb_build_object('counterpartUserId', new.follower_id)
  );
  return new;
end;
$$;

drop trigger if exists reward_on_follow_created on public.profile_follows;
create trigger reward_on_follow_created
  after insert on public.profile_follows
  for each row execute function public.reward_on_follow_created();

do $$
begin
  if to_regclass('public.social_sounds') is not null then
    execute $fn$
      create or replace function public.reward_on_sound_created()
      returns trigger
      language plpgsql
      security definer
      set search_path = public
      as $body$
      begin
        if new.owner_user_id is null then
          return new;
        end if;
        perform public.ingest_verified_reward_event(
          new.owner_user_id, new.owner_user_id, 'SOUND_CREATED',
          'sound_created:' || new.id::text, 'sound', new.id::text,
          '{}'::jsonb
        );
        return new;
      end;
      $body$;
    $fn$;
    execute 'drop trigger if exists reward_on_sound_created on public.social_sounds';
    execute 'create trigger reward_on_sound_created after insert on public.social_sounds for each row execute function public.reward_on_sound_created()';
  end if;
end
$$;

create or replace function public.claim_daily_engagement()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_day text := to_char((timezone('utc', now()))::date, 'YYYY-MM-DD');
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  return public.ingest_verified_reward_event(
    v_uid, v_uid, 'DAILY_ENGAGEMENT',
    'daily_engagement:' || v_uid::text || ':' || v_day,
    'engagement', v_uid::text || ':' || v_day,
    '{}'::jsonb
  );
end;
$$;

revoke all on function public.claim_daily_engagement() from public, anon;
grant execute on function public.claim_daily_engagement() to authenticated;

create or replace function public.record_contract_reward_event(
  p_event_type text,
  p_idempotency_key text,
  p_source_type text,
  p_source_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_type text := upper(btrim(coalesce(p_event_type, '')));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_metadata ? 'amount' or p_metadata ? 'points' or p_metadata ? 'pointsAmount'
     or p_metadata ? 'clientAmount' or p_metadata ? 'p_points' then
    return jsonb_build_object('accepted', false, 'awarded', 0, 'denialReason', 'unauthorized_client_amount');
  end if;
  if not public.verify_reward_event_source(v_uid, v_type, p_source_id)
     and v_type not in (
       'COURSE_ENROLLED', 'LESSON_COMPLETED', 'COURSE_COMPLETED', 'QUIZ_PASSED',
       'CERTIFICATE_EARNED', 'LEARNING_STREAK',
       'GAME_PARTICIPATE', 'GAME_COMPLETED', 'GAME_ACHIEVEMENT', 'GAME_TOURNAMENT',
       'GAME_SCORE_MILESTONE',
       'STORE_PURCHASE', 'STORE_SALE', 'STORE_MILESTONE',
       'CHALLENGE_PARTICIPATE', 'CHALLENGE_COMPLETE', 'SOUND_USED'
     ) then
    return jsonb_build_object('accepted', false, 'awarded', 0, 'denialReason', 'invalid_event');
  end if;
  if v_type in (
    'COURSE_ENROLLED', 'LESSON_COMPLETED', 'COURSE_COMPLETED', 'QUIZ_PASSED',
    'CERTIFICATE_EARNED', 'LEARNING_STREAK',
    'GAME_PARTICIPATE', 'GAME_COMPLETED', 'GAME_ACHIEVEMENT', 'GAME_TOURNAMENT',
    'GAME_SCORE_MILESTONE',
    'STORE_PURCHASE', 'STORE_SALE', 'STORE_MILESTONE',
    'CHALLENGE_PARTICIPATE', 'CHALLENGE_COMPLETE', 'SOUND_USED'
  ) then
    return jsonb_build_object(
      'accepted', true,
      'awarded', 0,
      'recorded', true,
      'denialReason', null,
      'note', 'contract_recorded_pending_trusted_confirm'
    );
  end if;
  return public.ingest_verified_reward_event(
    v_uid, v_uid, v_type, p_idempotency_key, p_source_type, p_source_id, p_metadata
  );
end;
$$;

revoke all on function public.record_contract_reward_event(text, text, text, text, jsonb)
  from public, anon;
grant execute on function public.record_contract_reward_event(text, text, text, text, jsonb)
  to authenticated;

create or replace function public.get_my_referral_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_success integer := 0;
  v_pending integer := 0;
  v_points integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  v_code := public.ensure_referral_code_for_user(v_uid);
  select count(*)::integer into v_success
  from public.referral_conversions
  where referrer_user_id = v_uid
    and status = 'rewarded';
  select count(*)::integer into v_pending
  from public.reward_events
  where event_type = 'REFERRAL_SIGNUP'
    and metadata->>'inviterUserId' = v_uid::text
    and not exists (
      select 1 from public.um_points_ledger l
      where l.dedupe_key = 'unified:referral_signup:' || subject_user_id::text
         or l.dedupe_key = 'referral_signup:' || subject_user_id::text
    );
  select coalesce(sum(points), 0)::integer into v_points
  from public.um_points_ledger
  where user_id = v_uid
    and (
      reason_code = 'REFERRAL_QUALIFIED'
      or reason ilike '%referral%'
    )
    and direction = 'CREDIT'
    and status = 'CONFIRMED';
  return jsonb_build_object(
    'code', v_code,
    'invitePath', '/invite/' || v_code,
    'joinPath', '/join?ref=' || v_code,
    'referralLink', '/join?ref=' || v_code,
    'successfulReferrals', coalesce(v_success, 0),
    'pendingReferrals', coalesce(v_pending, 0),
    'pointsEarned', coalesce(v_points, 0),
    'pointsPerSignup', 40,
    'referredUserPoints', 0,
    'growthMode', true
  );
end;
$$;

revoke all on function public.get_my_referral_dashboard() from public, anon;
grant execute on function public.get_my_referral_dashboard() to authenticated;

create or replace function public.admin_rewards_launch_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform admin required' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'policyVersion', 'launch_v1',
    'pointsByEventType', coalesce((
      select jsonb_object_agg(reason_code, total)
      from (
        select coalesce(reason_code, 'legacy') as reason_code,
               sum(points)::bigint as total
        from public.um_points_ledger
        where direction = 'CREDIT'
          and status = 'CONFIRMED'
        group by 1
      ) s
    ), '{}'::jsonb),
    'activeEarners', (
      select count(distinct user_id)::integer
      from public.um_points_ledger
      where direction = 'CREDIT'
        and status = 'CONFIRMED'
        and created_at >= now() - interval '30 days'
    ),
    'referralConversions', (
      select count(*)::integer from public.referral_conversions where status = 'rewarded'
    ),
    'abuseFlags', (
      select count(*)::integer from public.reward_abuse_flags
      where created_at >= now() - interval '30 days'
    )
  );
end;
$$;

revoke all on function public.admin_rewards_launch_analytics() from public, anon;
grant execute on function public.admin_rewards_launch_analytics() to authenticated;

comment on function public.ingest_verified_reward_event(uuid, uuid, text, text, text, text, jsonb) is
  'Trusted DEFINER intake. Not granted to clients. Amounts come from launch_v1 rules.';
comment on function public.process_reward_event(text, text, text, text, uuid, jsonb) is
  'Client-callable intake with no amount argument. Sensitive types denied; source must verify.';
