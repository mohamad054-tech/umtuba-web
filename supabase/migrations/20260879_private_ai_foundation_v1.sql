-- =============================================================================
-- UMTUBA Private AI Foundation V1
-- Migration: 20260879_private_ai_foundation_v1.sql
--
-- Additive schema for future private AI registries.
-- Runtime V1 uses data/private-ai/registry.json.
-- Local file only — do NOT remote-apply without explicit approval.
-- Does NOT train models, store weights, or change inference.
-- =============================================================================

create extension if not exists pgcrypto;

create table if not exists public.private_ai_models (
  id text primary key,
  name text not null,
  model_class text not null,
  family text not null,
  version text not null,
  capabilities jsonb not null default '[]'::jsonb,
  lifecycle text not null,
  deployment_profile_ids jsonb not null default '[]'::jsonb,
  hardware_contract_id text null,
  routing_contract_ids jsonb not null default '[]'::jsonb,
  provider_hint text null,
  architecture text not null,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.private_ai_capabilities (
  id text primary key,
  label text not null,
  description text not null default '',
  mapped_model_ids jsonb not null default '[]'::jsonb,
  status text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.private_ai_hardware_contracts (
  id text primary key,
  label text not null,
  contract jsonb not null
);

create table if not exists public.private_ai_deployment_profiles (
  id text primary key,
  label text not null,
  profile jsonb not null
);

create table if not exists public.private_ai_routing_contracts (
  id text primary key,
  name text not null,
  capability_id text not null,
  contract jsonb not null
);

create table if not exists public.private_ai_permissions (
  id text primary key,
  scope text not null,
  resource_id text not null,
  role text not null,
  actions jsonb not null default '[]'::jsonb,
  granted boolean not null default false,
  notes text not null default ''
);

alter table public.private_ai_models enable row level security;
alter table public.private_ai_models force row level security;
alter table public.private_ai_capabilities enable row level security;
alter table public.private_ai_capabilities force row level security;
alter table public.private_ai_hardware_contracts enable row level security;
alter table public.private_ai_hardware_contracts force row level security;
alter table public.private_ai_deployment_profiles enable row level security;
alter table public.private_ai_deployment_profiles force row level security;
alter table public.private_ai_routing_contracts enable row level security;
alter table public.private_ai_routing_contracts force row level security;
alter table public.private_ai_permissions enable row level security;
alter table public.private_ai_permissions force row level security;

revoke all on table public.private_ai_models from anon, authenticated;
revoke all on table public.private_ai_capabilities from anon, authenticated;
revoke all on table public.private_ai_hardware_contracts from anon, authenticated;
revoke all on table public.private_ai_deployment_profiles from anon, authenticated;
revoke all on table public.private_ai_routing_contracts from anon, authenticated;
revoke all on table public.private_ai_permissions from anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_platform_admin'
  ) then
    execute $policy$
      create policy private_ai_models_admin_select
        on public.private_ai_models for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy private_ai_capabilities_admin_select
        on public.private_ai_capabilities for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy private_ai_hardware_admin_select
        on public.private_ai_hardware_contracts for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy private_ai_deployments_admin_select
        on public.private_ai_deployment_profiles for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy private_ai_routing_admin_select
        on public.private_ai_routing_contracts for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy private_ai_permissions_admin_select
        on public.private_ai_permissions for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    grant select on table public.private_ai_models to authenticated;
    grant select on table public.private_ai_capabilities to authenticated;
    grant select on table public.private_ai_hardware_contracts to authenticated;
    grant select on table public.private_ai_deployment_profiles to authenticated;
    grant select on table public.private_ai_routing_contracts to authenticated;
    grant select on table public.private_ai_permissions to authenticated;
  end if;
end $$;
