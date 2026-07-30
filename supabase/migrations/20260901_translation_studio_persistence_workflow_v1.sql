-- =============================================================================
-- UMTUBA Translation Studio Persistence & Workflow V1
-- Migration: 20260901_translation_studio_persistence_workflow_v1.sql
--
-- Additive schema for future Supabase-backed studio persistence.
-- Runtime V1 uses a durable JSON file store (data/translation-studio/).
-- Local file only — do NOT remote-apply without explicit approval.
-- Style: FORCE RLS, revoke client writes, platform-admin read via
-- is_platform_admin() when available.
-- Does NOT: auto-publish, public translation API, product catalog writers.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Languages
-- ---------------------------------------------------------------------------
create table if not exists public.translation_studio_languages (
  code text primary key check (char_length(code) between 2 and 16),
  name text not null check (char_length(name) between 1 and 120),
  native_name text not null check (char_length(native_name) between 1 and 120),
  direction text not null check (direction in ('ltr', 'rtl')),
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Namespaces
-- ---------------------------------------------------------------------------
create table if not exists public.translation_studio_namespaces (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Keys
-- ---------------------------------------------------------------------------
create table if not exists public.translation_studio_keys (
  id uuid primary key default gen_random_uuid(),
  namespace_id uuid not null
    references public.translation_studio_namespaces (id) on delete cascade,
  key text not null check (char_length(key) between 1 and 256),
  source_text text not null check (char_length(source_text) <= 8000),
  description text null check (description is null or char_length(description) <= 2000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint translation_studio_keys_ns_key_unique unique (namespace_id, key)
);

create index if not exists translation_studio_keys_namespace_idx
  on public.translation_studio_keys (namespace_id);

-- ---------------------------------------------------------------------------
-- Values (workflow statuses)
-- ---------------------------------------------------------------------------
create table if not exists public.translation_studio_values (
  id uuid primary key default gen_random_uuid(),
  key_id uuid not null
    references public.translation_studio_keys (id) on delete cascade,
  language text not null
    references public.translation_studio_languages (code) on delete restrict,
  value text not null default '' check (char_length(value) <= 8000),
  status text not null
    check (status in (
      'missing',
      'draft',
      'ai_suggested',
      'needs_review',
      'approved',
      'rejected',
      'deprecated',
      'ready_for_publish'
    )),
  version integer not null default 1 check (version >= 1),
  suggestion_id uuid null,
  created_by uuid null references auth.users (id) on delete set null,
  updated_by uuid null references auth.users (id) on delete set null,
  approved_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint translation_studio_values_key_lang_unique unique (key_id, language)
);

create index if not exists translation_studio_values_status_idx
  on public.translation_studio_values (status, updated_at desc);
create index if not exists translation_studio_values_language_idx
  on public.translation_studio_values (language);

-- ---------------------------------------------------------------------------
-- Versions / history
-- ---------------------------------------------------------------------------
create table if not exists public.translation_studio_versions (
  id uuid primary key default gen_random_uuid(),
  value_id uuid not null
    references public.translation_studio_values (id) on delete cascade,
  key_id uuid not null
    references public.translation_studio_keys (id) on delete cascade,
  language text not null,
  value text not null default '',
  status text not null,
  version integer not null check (version >= 1),
  changed_by uuid null references auth.users (id) on delete set null,
  change_action text not null check (char_length(change_action) between 1 and 64),
  change_note text null check (change_note is null or char_length(change_note) <= 2000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists translation_studio_versions_value_idx
  on public.translation_studio_versions (value_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Suggestions (never auto-approved)
-- ---------------------------------------------------------------------------
create table if not exists public.translation_studio_suggestions (
  id uuid primary key default gen_random_uuid(),
  key_id uuid null
    references public.translation_studio_keys (id) on delete set null,
  value_id uuid null
    references public.translation_studio_values (id) on delete set null,
  source_text text not null,
  target_language text not null,
  candidate_text text not null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'accepted', 'rejected', 'superseded')),
  quality jsonb not null default '{}'::jsonb,
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists translation_studio_suggestions_value_idx
  on public.translation_studio_suggestions (value_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Translation Memory (approved reuse)
-- ---------------------------------------------------------------------------
create table if not exists public.translation_studio_memory (
  id uuid primary key default gen_random_uuid(),
  source_fingerprint text not null check (char_length(source_fingerprint) between 1 and 128),
  source_text text not null,
  language text not null
    references public.translation_studio_languages (code) on delete restrict,
  translated_text text not null,
  status text not null default 'approved' check (status = 'approved'),
  namespace_id uuid null
    references public.translation_studio_namespaces (id) on delete set null,
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint translation_studio_memory_fp_lang_unique
    unique (source_fingerprint, language)
);

-- ---------------------------------------------------------------------------
-- Terminology
-- ---------------------------------------------------------------------------
create table if not exists public.translation_studio_terminology (
  id uuid primary key default gen_random_uuid(),
  term text not null unique check (char_length(term) between 1 and 200),
  definition text not null default '',
  notes text null,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'deprecated')),
  translations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
create table if not exists public.translation_studio_audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in (
      'translation_value',
      'suggestion',
      'terminology',
      'memory',
      'publish'
    )),
  entity_id text not null,
  action text not null check (char_length(action) between 1 and 64),
  actor_id uuid null references auth.users (id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists translation_studio_audit_entity_idx
  on public.translation_studio_audit_log (entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: FORCE + revoke client writes; admin read when helper exists
-- ---------------------------------------------------------------------------
alter table public.translation_studio_languages enable row level security;
alter table public.translation_studio_languages force row level security;
alter table public.translation_studio_namespaces enable row level security;
alter table public.translation_studio_namespaces force row level security;
alter table public.translation_studio_keys enable row level security;
alter table public.translation_studio_keys force row level security;
alter table public.translation_studio_values enable row level security;
alter table public.translation_studio_values force row level security;
alter table public.translation_studio_versions enable row level security;
alter table public.translation_studio_versions force row level security;
alter table public.translation_studio_suggestions enable row level security;
alter table public.translation_studio_suggestions force row level security;
alter table public.translation_studio_memory enable row level security;
alter table public.translation_studio_memory force row level security;
alter table public.translation_studio_terminology enable row level security;
alter table public.translation_studio_terminology force row level security;
alter table public.translation_studio_audit_log enable row level security;
alter table public.translation_studio_audit_log force row level security;

revoke all on table public.translation_studio_languages from anon, authenticated;
revoke all on table public.translation_studio_namespaces from anon, authenticated;
revoke all on table public.translation_studio_keys from anon, authenticated;
revoke all on table public.translation_studio_values from anon, authenticated;
revoke all on table public.translation_studio_versions from anon, authenticated;
revoke all on table public.translation_studio_suggestions from anon, authenticated;
revoke all on table public.translation_studio_memory from anon, authenticated;
revoke all on table public.translation_studio_terminology from anon, authenticated;
revoke all on table public.translation_studio_audit_log from anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_platform_admin'
  ) then
    execute $policy$
      create policy translation_studio_languages_admin_select
        on public.translation_studio_languages
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy translation_studio_namespaces_admin_select
        on public.translation_studio_namespaces
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy translation_studio_keys_admin_select
        on public.translation_studio_keys
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy translation_studio_values_admin_select
        on public.translation_studio_values
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy translation_studio_versions_admin_select
        on public.translation_studio_versions
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy translation_studio_suggestions_admin_select
        on public.translation_studio_suggestions
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy translation_studio_memory_admin_select
        on public.translation_studio_memory
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy translation_studio_terminology_admin_select
        on public.translation_studio_terminology
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy translation_studio_audit_admin_select
        on public.translation_studio_audit_log
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;

    grant select on table public.translation_studio_languages to authenticated;
    grant select on table public.translation_studio_namespaces to authenticated;
    grant select on table public.translation_studio_keys to authenticated;
    grant select on table public.translation_studio_values to authenticated;
    grant select on table public.translation_studio_versions to authenticated;
    grant select on table public.translation_studio_suggestions to authenticated;
    grant select on table public.translation_studio_memory to authenticated;
    grant select on table public.translation_studio_terminology to authenticated;
    grant select on table public.translation_studio_audit_log to authenticated;
  end if;
end $$;
