-- =============================================================================
-- UMTUBA Knowledge Acquisition Platform Foundation V1
-- Migration: 20260876_knowledge_acquisition_foundation_v1.sql
--
-- Additive schema for future Supabase-backed knowledge registry.
-- Runtime V1 uses data/knowledge-acquisition/registry.json.
-- Local file only — do NOT remote-apply without explicit approval.
-- Does NOT train models, scrape, or download external datasets.
-- =============================================================================

create extension if not exists pgcrypto;

create table if not exists public.knowledge_sources (
  id text primary key,
  name text not null,
  kind text not null,
  description text not null default '',
  rights jsonb not null,
  stage text not null,
  domains jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid null references auth.users (id) on delete set null
);

create table if not exists public.knowledge_assets (
  id text primary key,
  source_id text not null references public.knowledge_sources (id) on delete restrict,
  title text not null,
  content_fingerprint text not null,
  content_preview text not null default '',
  mime_hint text null,
  domains jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  stage text not null,
  rights jsonb not null,
  quality jsonb not null,
  privacy jsonb not null,
  eligibility jsonb not null default '[]'::jsonb,
  dataset_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists knowledge_assets_fingerprint_idx
  on public.knowledge_assets (content_fingerprint);
create index if not exists knowledge_assets_source_idx
  on public.knowledge_assets (source_id);

create table if not exists public.knowledge_datasets (
  id text primary key,
  version text not null,
  name text not null,
  source_id text not null references public.knowledge_sources (id) on delete restrict,
  rights jsonb not null,
  quality_summary jsonb not null,
  languages jsonb not null default '[]'::jsonb,
  domains jsonb not null default '[]'::jsonb,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  asset_count integer not null default 0 check (asset_count >= 0),
  linked_asset_ids jsonb not null default '[]'::jsonb,
  eligibility jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint knowledge_datasets_id_version_unique unique (id, version)
);

create table if not exists public.knowledge_graph_nodes (
  id text primary key,
  kind text not null,
  label text not null,
  ref_id text not null
);

create table if not exists public.knowledge_graph_edges (
  id text primary key,
  relation_type text not null,
  from_node_id text not null references public.knowledge_graph_nodes (id) on delete cascade,
  to_node_id text not null references public.knowledge_graph_nodes (id) on delete cascade,
  detail text null
);

create table if not exists public.knowledge_acquisition_history (
  id text primary key,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  actor_id uuid null references auth.users (id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists knowledge_acquisition_history_entity_idx
  on public.knowledge_acquisition_history (entity_type, entity_id, created_at desc);

alter table public.knowledge_sources enable row level security;
alter table public.knowledge_sources force row level security;
alter table public.knowledge_assets enable row level security;
alter table public.knowledge_assets force row level security;
alter table public.knowledge_datasets enable row level security;
alter table public.knowledge_datasets force row level security;
alter table public.knowledge_graph_nodes enable row level security;
alter table public.knowledge_graph_nodes force row level security;
alter table public.knowledge_graph_edges enable row level security;
alter table public.knowledge_graph_edges force row level security;
alter table public.knowledge_acquisition_history enable row level security;
alter table public.knowledge_acquisition_history force row level security;

revoke all on table public.knowledge_sources from anon, authenticated;
revoke all on table public.knowledge_assets from anon, authenticated;
revoke all on table public.knowledge_datasets from anon, authenticated;
revoke all on table public.knowledge_graph_nodes from anon, authenticated;
revoke all on table public.knowledge_graph_edges from anon, authenticated;
revoke all on table public.knowledge_acquisition_history from anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_platform_admin'
  ) then
    execute $policy$
      create policy knowledge_sources_admin_select
        on public.knowledge_sources
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy knowledge_assets_admin_select
        on public.knowledge_assets
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy knowledge_datasets_admin_select
        on public.knowledge_datasets
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy knowledge_graph_nodes_admin_select
        on public.knowledge_graph_nodes
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy knowledge_graph_edges_admin_select
        on public.knowledge_graph_edges
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy knowledge_acquisition_history_admin_select
        on public.knowledge_acquisition_history
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    grant select on table public.knowledge_sources to authenticated;
    grant select on table public.knowledge_assets to authenticated;
    grant select on table public.knowledge_datasets to authenticated;
    grant select on table public.knowledge_graph_nodes to authenticated;
    grant select on table public.knowledge_graph_edges to authenticated;
    grant select on table public.knowledge_acquisition_history to authenticated;
  end if;
end $$;
