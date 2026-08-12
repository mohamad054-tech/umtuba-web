-- =============================================================================
-- UMTUBA AI Data Platform & Model Registry Foundation V1
-- Migration: 20260877_ai_data_platform_foundation_v1.sql
--
-- Additive schema for future Supabase-backed AI data / model registries.
-- Runtime V1 uses data/ai-data-platform/registry.json.
-- Local file only — do NOT remote-apply without explicit approval.
-- Does NOT train models, change inference, or modify prior migrations.
-- =============================================================================

create extension if not exists pgcrypto;

create table if not exists public.ai_datasets (
  id text primary key,
  name text not null,
  version text not null,
  description text not null default '',
  owner text null,
  kind text not null,
  status text not null,
  source_asset_ids jsonb not null default '[]'::jsonb,
  knowledge_source_ids jsonb not null default '[]'::jsonb,
  translation_source_ids jsonb not null default '[]'::jsonb,
  learning_source_ids jsonb not null default '[]'::jsonb,
  coding_source_ids jsonb not null default '[]'::jsonb,
  commerce_source_ids jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  domains jsonb not null default '[]'::jsonb,
  rights jsonb not null,
  quality jsonb not null,
  eligibility jsonb not null default '[]'::jsonb,
  sensitivity text not null,
  statistics jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_dataset_versions (
  id text primary key,
  dataset_id text not null references public.ai_datasets (id) on delete cascade,
  version text not null,
  parent_version text null,
  created_from text null,
  changes text not null default '',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  language_distribution jsonb not null default '{}'::jsonb,
  domain_distribution jsonb not null default '{}'::jsonb,
  quality_metrics jsonb not null,
  approved boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ai_dataset_versions_dataset_version_unique unique (dataset_id, version)
);

create table if not exists public.ai_evaluation_sets (
  id text primary key,
  name text not null,
  kind text not null,
  description text not null default '',
  languages jsonb not null default '[]'::jsonb,
  domains jsonb not null default '[]'::jsonb,
  item_count integer not null default 0 check (item_count >= 0),
  linked_dataset_ids jsonb not null default '[]'::jsonb,
  status text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_experiments (
  id text primary key,
  model_id text null,
  model_family text not null,
  dataset_version_id text not null references public.ai_dataset_versions (id) on delete restrict,
  hyperparameters jsonb not null default '{}'::jsonb,
  started_at timestamptz null,
  finished_at timestamptz null,
  metrics jsonb not null default '{}'::jsonb,
  artifact_refs jsonb not null default '[]'::jsonb,
  status text not null,
  owner text null,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_models (
  id text primary key,
  family text not null,
  version text not null,
  provider text not null,
  architecture text not null,
  capabilities jsonb not null default '[]'::jsonb,
  dataset_version_id text null references public.ai_dataset_versions (id) on delete set null,
  evaluation_results jsonb not null default '{}'::jsonb,
  release_status text not null,
  rollback_target_id text null,
  lifecycle text not null,
  experiment_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_promotion_queue (
  id text primary key,
  model_id text not null references public.ai_models (id) on delete cascade,
  from_status text not null,
  to_status text not null,
  checklist jsonb not null,
  eligible boolean not null default false,
  blockers jsonb not null default '[]'::jsonb,
  requested_by text null,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.ai_datasets enable row level security;
alter table public.ai_datasets force row level security;
alter table public.ai_dataset_versions enable row level security;
alter table public.ai_dataset_versions force row level security;
alter table public.ai_evaluation_sets enable row level security;
alter table public.ai_evaluation_sets force row level security;
alter table public.ai_experiments enable row level security;
alter table public.ai_experiments force row level security;
alter table public.ai_models enable row level security;
alter table public.ai_models force row level security;
alter table public.ai_promotion_queue enable row level security;
alter table public.ai_promotion_queue force row level security;

revoke all on table public.ai_datasets from anon, authenticated;
revoke all on table public.ai_dataset_versions from anon, authenticated;
revoke all on table public.ai_evaluation_sets from anon, authenticated;
revoke all on table public.ai_experiments from anon, authenticated;
revoke all on table public.ai_models from anon, authenticated;
revoke all on table public.ai_promotion_queue from anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_platform_admin'
  ) then
    execute $policy$
      create policy ai_datasets_admin_select
        on public.ai_datasets for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy ai_dataset_versions_admin_select
        on public.ai_dataset_versions for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy ai_evaluation_sets_admin_select
        on public.ai_evaluation_sets for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy ai_experiments_admin_select
        on public.ai_experiments for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy ai_models_admin_select
        on public.ai_models for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy ai_promotion_queue_admin_select
        on public.ai_promotion_queue for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    grant select on table public.ai_datasets to authenticated;
    grant select on table public.ai_dataset_versions to authenticated;
    grant select on table public.ai_evaluation_sets to authenticated;
    grant select on table public.ai_experiments to authenticated;
    grant select on table public.ai_models to authenticated;
    grant select on table public.ai_promotion_queue to authenticated;
  end if;
end $$;
