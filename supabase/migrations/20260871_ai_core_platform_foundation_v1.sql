-- =============================================================================
-- UMTUBA AI Core Platform Foundation V1
-- Migration: 20260871_ai_core_platform_foundation_v1.sql
--
-- Additive shared AI tables for runs, events, usage, sessions, evaluations.
-- Local file only — do NOT remote-apply without explicit approval.
-- Style: FORCE RLS, revoke client writes, owner-select policies, admin read via
-- is_platform_admin() when available.
-- Does NOT: provider secrets, product-specific AI tables, billing, agents.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------
create table if not exists public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_domain text not null check (char_length(product_domain) between 1 and 64),
  workspace_id uuid null,
  locale text null check (locale is null or char_length(locale) <= 32),
  status text not null default 'active'
    check (status in ('active', 'closed')),
  conversation_id uuid null,
  recent_run_ids uuid[] not null default '{}',
  data_classification text not null default 'internal'
    check (data_classification in ('public', 'internal', 'confidential', 'restricted')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_sessions_user_updated_idx
  on public.ai_sessions (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- Runs
-- ---------------------------------------------------------------------------
create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  trace_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid null references public.ai_sessions (id) on delete set null,
  parent_run_id uuid null references public.ai_runs (id) on delete set null,
  capability_id text not null check (char_length(capability_id) between 1 and 128),
  prompt_id text not null check (char_length(prompt_id) between 1 and 128),
  prompt_version text not null check (char_length(prompt_version) between 1 and 32),
  provider_id text null,
  model_id text null,
  status text not null
    check (status in (
      'requested', 'validated', 'routed', 'executing',
      'tool_waiting', 'tool_executing',
      'completed', 'failed', 'blocked', 'cancelled'
    )),
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz null,
  error_code text null,
  error_message text null,
  safety_outcome jsonb null,
  tool_call_summary jsonb not null default '[]'::jsonb,
  data_classification text not null default 'internal'
    check (data_classification in ('public', 'internal', 'confidential', 'restricted')),
  idempotency_key text null,
  metadata jsonb not null default '{}'::jsonb,
  constraint ai_runs_idempotency_unique unique (user_id, capability_id, idempotency_key)
);

create index if not exists ai_runs_user_started_idx
  on public.ai_runs (user_id, started_at desc);
create index if not exists ai_runs_capability_started_idx
  on public.ai_runs (capability_id, started_at desc);
create index if not exists ai_runs_trace_idx
  on public.ai_runs (trace_id);

-- ---------------------------------------------------------------------------
-- Run events (bounded trace)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_run_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_runs (id) on delete cascade,
  trace_id uuid not null,
  event_type text not null check (char_length(event_type) between 1 and 64),
  summary text not null check (char_length(summary) <= 500),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_run_events_run_created_idx
  on public.ai_run_events (run_id, created_at asc);

-- ---------------------------------------------------------------------------
-- Usage
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage_records (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_runs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid null,
  capability_id text not null,
  provider_id text not null,
  model_id text not null,
  input_tokens integer null check (input_tokens is null or input_tokens >= 0),
  output_tokens integer null check (output_tokens is null or output_tokens >= 0),
  cached_tokens integer null check (cached_tokens is null or cached_tokens >= 0),
  audio_units integer null check (audio_units is null or audio_units >= 0),
  image_units integer null check (image_units is null or image_units >= 0),
  cost_minor bigint null check (cost_minor is null or cost_minor >= 0),
  cost_currency text null,
  cost_status text not null
    check (cost_status in ('provider_reported', 'estimated', 'unavailable')),
  billing_classification text not null default 'unbilled'
    check (billing_classification in ('internal', 'product', 'unbilled')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_usage_records_user_created_idx
  on public.ai_usage_records (user_id, created_at desc);
create index if not exists ai_usage_records_run_idx
  on public.ai_usage_records (run_id);

-- ---------------------------------------------------------------------------
-- Evaluations
-- ---------------------------------------------------------------------------
create table if not exists public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_runs (id) on delete cascade,
  prompt_id text not null,
  prompt_version text not null,
  model_id text null,
  capability_id text not null,
  run_outcome text not null,
  schema_valid boolean null,
  tool_success boolean null,
  latency_ms integer null,
  safety_outcome text not null
    check (safety_outcome in ('allowed', 'blocked', 'unknown')),
  user_feedback text null check (user_feedback is null or user_feedback in ('up', 'down')),
  test_case_id text null,
  score numeric null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_evaluations_capability_created_idx
  on public.ai_evaluations (capability_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Optional memory records (policy-gated; not auto conversation dump)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_memory_records (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in (
    'session', 'user_preference', 'workspace', 'project_course', 'agent_workflow'
  )),
  owner_id uuid not null,
  memory_key text not null check (char_length(memory_key) between 1 and 128),
  value jsonb not null default '{}'::jsonb,
  data_classification text not null
    check (data_classification in ('public', 'internal', 'confidential', 'restricted')),
  provenance text not null check (char_length(provenance) <= 256),
  confidence numeric not null default 0.5
    check (confidence >= 0 and confidence <= 1),
  requires_human_confirmation boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz null,
  unique (scope, owner_id, memory_key)
);

create index if not exists ai_memory_records_owner_idx
  on public.ai_memory_records (scope, owner_id)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.ai_sessions enable row level security;
alter table public.ai_sessions force row level security;
alter table public.ai_runs enable row level security;
alter table public.ai_runs force row level security;
alter table public.ai_run_events enable row level security;
alter table public.ai_run_events force row level security;
alter table public.ai_usage_records enable row level security;
alter table public.ai_usage_records force row level security;
alter table public.ai_evaluations enable row level security;
alter table public.ai_evaluations force row level security;
alter table public.ai_memory_records enable row level security;
alter table public.ai_memory_records force row level security;

revoke all on table public.ai_sessions from public, anon, authenticated;
revoke all on table public.ai_runs from public, anon, authenticated;
revoke all on table public.ai_run_events from public, anon, authenticated;
revoke all on table public.ai_usage_records from public, anon, authenticated;
revoke all on table public.ai_evaluations from public, anon, authenticated;
revoke all on table public.ai_memory_records from public, anon, authenticated;

grant select on table public.ai_sessions to authenticated;
grant select on table public.ai_runs to authenticated;
grant select on table public.ai_run_events to authenticated;
grant select on table public.ai_usage_records to authenticated;
grant select on table public.ai_evaluations to authenticated;
grant select on table public.ai_memory_records to authenticated;

-- Owner read policies
drop policy if exists "Users read own ai sessions" on public.ai_sessions;
create policy "Users read own ai sessions"
  on public.ai_sessions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users read own ai runs" on public.ai_runs;
create policy "Users read own ai runs"
  on public.ai_runs for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users read own ai run events" on public.ai_run_events;
create policy "Users read own ai run events"
  on public.ai_run_events for select to authenticated
  using (
    exists (
      select 1 from public.ai_runs r
      where r.id = ai_run_events.run_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "Users read own ai usage" on public.ai_usage_records;
create policy "Users read own ai usage"
  on public.ai_usage_records for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users read own ai evaluations" on public.ai_evaluations;
create policy "Users read own ai evaluations"
  on public.ai_evaluations for select to authenticated
  using (
    exists (
      select 1 from public.ai_runs r
      where r.id = ai_evaluations.run_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "Users read own ai memory" on public.ai_memory_records;
create policy "Users read own ai memory"
  on public.ai_memory_records for select to authenticated
  using (
    deleted_at is null
    and scope in ('session', 'user_preference', 'agent_workflow')
    and owner_id = auth.uid()
  );

-- Platform admin diagnostics read (when helper exists)
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_platform_admin'
  ) then
    execute $policy$
      drop policy if exists "Platform admins read ai sessions" on public.ai_sessions;
      create policy "Platform admins read ai sessions"
        on public.ai_sessions for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      drop policy if exists "Platform admins read ai runs" on public.ai_runs;
      create policy "Platform admins read ai runs"
        on public.ai_runs for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      drop policy if exists "Platform admins read ai run events" on public.ai_run_events;
      create policy "Platform admins read ai run events"
        on public.ai_run_events for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      drop policy if exists "Platform admins read ai usage" on public.ai_usage_records;
      create policy "Platform admins read ai usage"
        on public.ai_usage_records for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      drop policy if exists "Platform admins read ai evaluations" on public.ai_evaluations;
      create policy "Platform admins read ai evaluations"
        on public.ai_evaluations for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      drop policy if exists "Platform admins read ai memory" on public.ai_memory_records;
      create policy "Platform admins read ai memory"
        on public.ai_memory_records for select to authenticated
        using (public.is_platform_admin());
    $policy$;
  end if;
end $$;

comment on table public.ai_runs is
  'UMTUBA AI Core Platform V1 run lifecycle. Writes via server/RPC only; clients select own rows.';
comment on table public.ai_usage_records is
  'Provider-neutral AI usage. cost_status may be unavailable; never fabricate cost.';
comment on table public.ai_memory_records is
  'Bounded memory interface foundation. Conversations are not auto-persisted.';
