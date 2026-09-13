-- Activity tier / authentic activity score foundation.
-- Completely separate from um_point_balances / um_points_ledger.
-- Wallet conversion must never rewrite tier history.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.activity_score_balances (
  user_id uuid primary key references auth.users (id) on delete cascade,
  score integer not null default 0 check (score >= 0),
  tier_id text not null default 'spark',
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_score_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,
  category text not null,
  reason text not null,
  dedupe_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  reversed_ledger_id uuid references public.activity_score_ledger (id),
  created_at timestamptz not null default now(),
  constraint activity_score_ledger_user_dedupe unique (user_id, dedupe_key)
);

create index if not exists activity_score_ledger_user_created_idx
  on public.activity_score_ledger (user_id, created_at desc);

create index if not exists activity_score_ledger_category_created_idx
  on public.activity_score_ledger (user_id, category, created_at desc);

create table if not exists public.activity_tier_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  from_tier_id text,
  to_tier_id text not null,
  score_at_change integer not null default 0,
  reason text not null default 'score_change',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_tier_history_user_created_idx
  on public.activity_tier_history (user_id, created_at desc);

-- Optional runtime overrides (app layer remains source of defaults).
create table if not exists public.activity_tier_config (
  key text primary key,
  value integer not null,
  description text
);

insert into public.activity_tier_config (key, value, description) values
  ('daily_total_cap', 400, 'Max authentic activity score earnable per UTC day'),
  ('screen_time_daily_max', 20, 'Hard cap for secondary screen-time points'),
  ('screen_time_requires_primary', 10, 'Primary points required same day before screen-time counts'),
  ('tier_rising', 250, 'Threshold for Rising'),
  ('tier_creator', 1000, 'Threshold for Creator'),
  ('tier_pathfinder', 3500, 'Threshold for Pathfinder'),
  ('tier_luminary', 10000, 'Threshold for Luminary'),
  ('tier_icon', 25000, 'Threshold for Icon')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------------------------

alter table public.activity_score_balances enable row level security;
alter table public.activity_score_ledger enable row level security;
alter table public.activity_tier_history enable row level security;
alter table public.activity_tier_config enable row level security;

drop policy if exists "Activity score balances are publicly readable" on public.activity_score_balances;
create policy "Activity score balances are publicly readable"
  on public.activity_score_balances
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Users read own activity ledger" on public.activity_score_ledger;
create policy "Users read own activity ledger"
  on public.activity_score_ledger
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Activity tier history is publicly readable" on public.activity_tier_history;
create policy "Activity tier history is publicly readable"
  on public.activity_tier_history
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Activity tier config is readable" on public.activity_tier_config;
create policy "Activity tier config is readable"
  on public.activity_tier_config
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.activity_score_balances from anon, authenticated;
revoke insert, update, delete on public.activity_score_ledger from anon, authenticated;
revoke insert, update, delete on public.activity_tier_history from anon, authenticated;
revoke insert, update, delete on public.activity_tier_config from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Helpers
-- ---------------------------------------------------------------------------

create or replace function public.activity_tier_config_value(
  p_key text,
  p_default integer default 0
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value from public.activity_tier_config where key = p_key),
    p_default
  );
$$;

revoke all on function public.activity_tier_config_value(text, integer) from public;

create or replace function public.resolve_activity_tier_id(p_score integer)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_score integer := greatest(coalesce(p_score, 0), 0);
begin
  if v_score >= public.activity_tier_config_value('tier_icon', 25000) then
    return 'icon';
  elsif v_score >= public.activity_tier_config_value('tier_luminary', 10000) then
    return 'luminary';
  elsif v_score >= public.activity_tier_config_value('tier_pathfinder', 3500) then
    return 'pathfinder';
  elsif v_score >= public.activity_tier_config_value('tier_creator', 1000) then
    return 'creator';
  elsif v_score >= public.activity_tier_config_value('tier_rising', 250) then
    return 'rising';
  end if;
  return 'spark';
end;
$$;

revoke all on function public.resolve_activity_tier_id(integer) from public;

create or replace function public.activity_score_earned_today(
  p_user_id uuid,
  p_category text default null
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(delta), 0)::integer
  from public.activity_score_ledger
  where user_id = p_user_id
    and delta > 0
    and created_at >= date_trunc('day', timezone('utc', now()))
    and (p_category is null or category = p_category);
$$;

revoke all on function public.activity_score_earned_today(uuid, text) from public;

create or replace function public.activity_score_primary_earned_today(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(delta), 0)::integer
  from public.activity_score_ledger
  where user_id = p_user_id
    and delta > 0
    and created_at >= date_trunc('day', timezone('utc', now()))
    and category <> 'screen_time_secondary';
$$;

revoke all on function public.activity_score_primary_earned_today(uuid) from public;

-- ---------------------------------------------------------------------------
-- 4. Award + reverse (anti-abuse + fraud clawback)
-- ---------------------------------------------------------------------------

create or replace function public.award_activity_score_to_user(
  p_user_id uuid,
  p_points integer,
  p_category text,
  p_reason text,
  p_dedupe_key text,
  p_metadata jsonb default '{}'::jsonb,
  p_category_cap integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer := greatest(coalesce(p_points, 0), 0);
  v_daily_cap integer := public.activity_tier_config_value('daily_total_cap', 400);
  v_screen_max integer := public.activity_tier_config_value('screen_time_daily_max', 20);
  v_screen_gate integer := public.activity_tier_config_value('screen_time_requires_primary', 10);
  v_earned_today integer;
  v_cat_earned integer;
  v_primary_today integer;
  v_cat_cap integer;
  v_awarded integer;
  v_score integer;
  v_prev_tier text;
  v_new_tier text;
  v_dedupe text := left(coalesce(nullif(trim(p_dedupe_key), ''), gen_random_uuid()::text), 200);
begin
  if p_user_id is null or v_points <= 0 or coalesce(nullif(trim(p_category), ''), '') = '' then
    return jsonb_build_object('ok', false, 'awarded', 0, 'reason', 'invalid');
  end if;

  if exists (
    select 1 from public.activity_score_ledger
    where user_id = p_user_id and dedupe_key = v_dedupe
  ) then
    select score, tier_id into v_score, v_new_tier
    from public.activity_score_balances
    where user_id = p_user_id;
    return jsonb_build_object(
      'ok', true,
      'awarded', 0,
      'blocked', true,
      'reason', 'duplicate',
      'score', coalesce(v_score, 0),
      'tierId', coalesce(v_new_tier, 'spark')
    );
  end if;

  select tier_id, score into v_prev_tier, v_score
  from public.activity_score_balances
  where user_id = p_user_id;

  v_prev_tier := coalesce(v_prev_tier, 'spark');
  v_score := coalesce(v_score, 0);

  v_earned_today := public.activity_score_earned_today(p_user_id, null);
  v_cat_earned := public.activity_score_earned_today(p_user_id, p_category);
  v_primary_today := public.activity_score_primary_earned_today(p_user_id);

  if p_category = 'screen_time_secondary' then
    if v_primary_today < v_screen_gate then
      return jsonb_build_object('ok', false, 'awarded', 0, 'reason', 'screen_time_gate');
    end if;
    v_cat_cap := least(coalesce(p_category_cap, v_screen_max), v_screen_max);
  else
    v_cat_cap := coalesce(p_category_cap, v_daily_cap);
  end if;

  if v_earned_today >= v_daily_cap then
    return jsonb_build_object('ok', false, 'awarded', 0, 'reason', 'daily_cap');
  end if;

  if v_cat_earned >= v_cat_cap then
    return jsonb_build_object('ok', false, 'awarded', 0, 'reason', 'category_cap');
  end if;

  v_awarded := least(v_points, v_daily_cap - v_earned_today, v_cat_cap - v_cat_earned);
  if v_awarded <= 0 then
    return jsonb_build_object('ok', false, 'awarded', 0, 'reason', 'daily_cap');
  end if;

  insert into public.activity_score_ledger (
    user_id, delta, category, reason, dedupe_key, metadata
  ) values (
    p_user_id, v_awarded, p_category, left(coalesce(p_reason, p_category), 200),
    v_dedupe, coalesce(p_metadata, '{}'::jsonb)
  );

  v_score := v_score + v_awarded;
  v_new_tier := public.resolve_activity_tier_id(v_score);

  insert into public.activity_score_balances (user_id, score, tier_id, updated_at)
  values (p_user_id, v_score, v_new_tier, now())
  on conflict (user_id) do update
    set score = excluded.score,
        tier_id = excluded.tier_id,
        updated_at = now();

  if v_prev_tier is distinct from v_new_tier then
    insert into public.activity_tier_history (
      user_id, from_tier_id, to_tier_id, score_at_change, reason, metadata
    ) values (
      p_user_id, v_prev_tier, v_new_tier, v_score, 'score_change',
      jsonb_build_object('category', p_category, 'awarded', v_awarded)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'awarded', v_awarded,
    'score', v_score,
    'tierId', v_new_tier,
    'previousTierId', v_prev_tier
  );
end;
$$;

revoke all on function public.award_activity_score_to_user(uuid, integer, text, text, text, jsonb, integer) from public;

create or replace function public.reverse_activity_score_entry(
  p_ledger_id uuid,
  p_reason text default 'fraud_reversal',
  p_actor_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.activity_score_ledger%rowtype;
  v_score integer;
  v_prev_tier text;
  v_new_tier text;
  v_delta integer;
  v_reversal_key text;
begin
  select * into v_row
  from public.activity_score_ledger
  where id = p_ledger_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if v_row.delta <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'not_positive_award');
  end if;

  if exists (
    select 1 from public.activity_score_ledger
    where reversed_ledger_id = p_ledger_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_reversed');
  end if;

  select score, tier_id into v_score, v_prev_tier
  from public.activity_score_balances
  where user_id = v_row.user_id;

  v_score := coalesce(v_score, 0);
  v_prev_tier := coalesce(v_prev_tier, 'spark');
  v_delta := -least(v_row.delta, v_score);
  v_reversal_key := 'reversal:' || p_ledger_id::text;

  if v_delta = 0 then
    return jsonb_build_object('ok', false, 'reason', 'nothing_to_reverse', 'score', v_score);
  end if;

  insert into public.activity_score_ledger (
    user_id, delta, category, reason, dedupe_key, metadata, reversed_ledger_id
  ) values (
    v_row.user_id,
    v_delta,
    v_row.category,
    left(coalesce(nullif(trim(p_reason), ''), 'fraud_reversal'), 200),
    v_reversal_key,
    jsonb_build_object(
      'reversedLedgerId', p_ledger_id,
      'actorUserId', p_actor_user_id,
      'originalDelta', v_row.delta
    ),
    p_ledger_id
  );

  v_score := greatest(0, v_score + v_delta);
  v_new_tier := public.resolve_activity_tier_id(v_score);

  update public.activity_score_balances
  set score = v_score,
      tier_id = v_new_tier,
      updated_at = now()
  where user_id = v_row.user_id;

  if v_prev_tier is distinct from v_new_tier then
    insert into public.activity_tier_history (
      user_id, from_tier_id, to_tier_id, score_at_change, reason, metadata
    ) values (
      v_row.user_id, v_prev_tier, v_new_tier, v_score, 'fraud_reversal',
      jsonb_build_object('reversedLedgerId', p_ledger_id, 'delta', v_delta)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'reversed', abs(v_delta),
    'score', v_score,
    'tierId', v_new_tier,
    'previousTierId', v_prev_tier
  );
end;
$$;

revoke all on function public.reverse_activity_score_entry(uuid, text, uuid) from public;

-- Authenticated self-summary (progress); public snapshot by user id.
create or replace function public.get_my_activity_tier_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_score integer := 0;
  v_tier text := 'spark';
  v_updated timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;

  select score, tier_id, updated_at
    into v_score, v_tier, v_updated
  from public.activity_score_balances
  where user_id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'score', coalesce(v_score, 0),
    'tierId', coalesce(v_tier, 'spark'),
    'updatedAt', v_updated
  );
end;
$$;

revoke all on function public.get_my_activity_tier_summary() from public;
grant execute on function public.get_my_activity_tier_summary() to authenticated;

create or replace function public.get_activity_tier_snapshot(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score integer := 0;
  v_tier text := 'spark';
  v_updated timestamptz;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select score, tier_id, updated_at
    into v_score, v_tier, v_updated
  from public.activity_score_balances
  where user_id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'userId', p_user_id,
    'score', coalesce(v_score, 0),
    'tierId', coalesce(v_tier, public.resolve_activity_tier_id(coalesce(v_score, 0))),
    'updatedAt', v_updated
  );
end;
$$;

revoke all on function public.get_activity_tier_snapshot(uuid) from public;
grant execute on function public.get_activity_tier_snapshot(uuid) to anon, authenticated;

-- Realtime for signed-in header updates
do $$
begin
  begin
    alter publication supabase_realtime add table public.activity_score_balances;
  exception
    when duplicate_object then null;
  end;
end;
$$;

alter table public.activity_score_balances replica identity full;
