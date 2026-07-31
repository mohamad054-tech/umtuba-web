-- =============================================================================
-- UMTUBA AI Data Platform Workflow & Dataset Approval V1
-- Migration: 20260878_ai_data_platform_workflow_approval_v1.sql
--
-- Additive schema for workflow / audit trail persistence.
-- Runtime V1 uses data/ai-data-platform/workflow.json.
-- Local file only — do NOT remote-apply without explicit approval.
-- Does NOT modify 20260877 or prior migrations.
-- =============================================================================

create extension if not exists pgcrypto;

create table if not exists public.ai_dataset_workflows (
  dataset_id text primary key references public.ai_datasets (id) on delete cascade,
  approval_state text not null,
  checks jsonb not null default '{}'::jsonb,
  rejection_reason text null,
  clone_of_dataset_id text null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_dataset_version_workflows (
  version_id text primary key references public.ai_dataset_versions (id) on delete cascade,
  dataset_id text not null references public.ai_datasets (id) on delete cascade,
  lifecycle text not null,
  diff_summary text not null default '',
  change_history jsonb not null default '[]'::jsonb,
  approval_history jsonb not null default '[]'::jsonb,
  rollback_candidate boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_experiment_candidates (
  id text primary key,
  candidate_dataset_id text not null references public.ai_datasets (id) on delete restrict,
  candidate_dataset_version_id text not null references public.ai_dataset_versions (id) on delete restrict,
  candidate_model_id text null,
  evaluation_set_id text null,
  expected_metrics jsonb not null default '{}'::jsonb,
  owner text null,
  status text not null,
  artifact_refs jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_model_candidates (
  id text primary key,
  model_id text not null references public.ai_models (id) on delete cascade,
  dataset_version_id text not null references public.ai_dataset_versions (id) on delete restrict,
  evaluation_set_id text null,
  promotion_eligible boolean not null default false,
  promotion_blockers jsonb not null default '[]'::jsonb,
  approval_state text not null,
  rollback_target_id text null,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_workflow_audit_trail (
  id text primary key,
  actor_id text null,
  timestamp timestamptz not null default timezone('utc', now()),
  action text not null,
  reason text null,
  previous_state text null,
  new_state text null,
  dataset_id text null,
  version_id text null,
  detail jsonb not null default '{}'::jsonb
);

create index if not exists ai_workflow_audit_trail_ts_idx
  on public.ai_workflow_audit_trail (timestamp desc);
create index if not exists ai_workflow_audit_trail_dataset_idx
  on public.ai_workflow_audit_trail (dataset_id, timestamp desc);

alter table public.ai_dataset_workflows enable row level security;
alter table public.ai_dataset_workflows force row level security;
alter table public.ai_dataset_version_workflows enable row level security;
alter table public.ai_dataset_version_workflows force row level security;
alter table public.ai_experiment_candidates enable row level security;
alter table public.ai_experiment_candidates force row level security;
alter table public.ai_model_candidates enable row level security;
alter table public.ai_model_candidates force row level security;
alter table public.ai_workflow_audit_trail enable row level security;
alter table public.ai_workflow_audit_trail force row level security;

revoke all on table public.ai_dataset_workflows from anon, authenticated;
revoke all on table public.ai_dataset_version_workflows from anon, authenticated;
revoke all on table public.ai_experiment_candidates from anon, authenticated;
revoke all on table public.ai_model_candidates from anon, authenticated;
revoke all on table public.ai_workflow_audit_trail from anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_platform_admin'
  ) then
    execute $policy$
      create policy ai_dataset_workflows_admin_select
        on public.ai_dataset_workflows for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy ai_dataset_version_workflows_admin_select
        on public.ai_dataset_version_workflows for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy ai_experiment_candidates_admin_select
        on public.ai_experiment_candidates for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy ai_model_candidates_admin_select
        on public.ai_model_candidates for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy ai_workflow_audit_trail_admin_select
        on public.ai_workflow_audit_trail for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    grant select on table public.ai_dataset_workflows to authenticated;
    grant select on table public.ai_dataset_version_workflows to authenticated;
    grant select on table public.ai_experiment_candidates to authenticated;
    grant select on table public.ai_model_candidates to authenticated;
    grant select on table public.ai_workflow_audit_trail to authenticated;
  end if;
end $$;
