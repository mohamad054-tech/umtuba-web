-- =============================================================================
-- UMTUBA Private AI Workflow & Lifecycle V1
-- Migration: 20260880_private_ai_workflow_lifecycle_v1.sql
--
-- Minimal additive schema for admin lifecycle audit trail.
-- Runtime V1 still uses data/private-ai/registry.json (schemaVersion 2).
-- Local file only — do NOT remote-apply without explicit approval.
-- Does NOT train models, store weights, or change inference.
--
-- Why needed: Foundation migration (20260879) has model registry tables but no
-- audit trail for lifecycle transitions. This adds audit persistence only.
-- Lifecycle values remain free-form text on private_ai_models (no enum rewrite).
-- =============================================================================

create extension if not exists pgcrypto;

create table if not exists public.private_ai_lifecycle_audit (
  id text primary key,
  model_id text null references public.private_ai_models (id) on delete set null,
  actor_id uuid null,
  actor_role text null,
  action text not null,
  reason text null,
  previous_state text null,
  new_state text null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists private_ai_lifecycle_audit_model_id_idx
  on public.private_ai_lifecycle_audit (model_id);

create index if not exists private_ai_lifecycle_audit_created_at_idx
  on public.private_ai_lifecycle_audit (created_at desc);

-- Optional review reason column on models (additive; nullable).
alter table public.private_ai_models
  add column if not exists review_reason text null;

alter table public.private_ai_lifecycle_audit enable row level security;
alter table public.private_ai_lifecycle_audit force row level security;

revoke all on table public.private_ai_lifecycle_audit from anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_platform_admin'
  ) then
    execute $policy$
      create policy private_ai_lifecycle_audit_admin_select
        on public.private_ai_lifecycle_audit for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    grant select on table public.private_ai_lifecycle_audit to authenticated;
  end if;
end $$;
