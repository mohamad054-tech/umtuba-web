-- =============================================================================
-- UMTUBA Translation Studio Stable Identity Schema V1
-- Migration: 20260911_translation_studio_stable_identity_schema_v1.sql
--
-- Additive identity/actor foundation for future DB-backed Studio persistence.
-- Does NOT: write RPCs, DB adapter, importer, runtime cutover, RLS changes.
-- UUID primary keys and existing FKs are preserved.
-- Language identity remains translation_studio_languages.code (no stable_id).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Namespaces — stable_id = runtime ns_*
-- ---------------------------------------------------------------------------
alter table public.translation_studio_namespaces
  add column if not exists stable_id text
    check (stable_id is null or char_length(stable_id) between 1 and 128);

comment on column public.translation_studio_namespaces.id is
  'Internal relational identity (UUID PK).';
comment on column public.translation_studio_namespaces.stable_id is
  'Runtime/domain identity (e.g. ns_nav). Nullable until import/backfill.';

create unique index if not exists translation_studio_namespaces_stable_id_uidx
  on public.translation_studio_namespaces (stable_id)
  where stable_id is not null;

-- ---------------------------------------------------------------------------
-- Keys — stable_id = runtime key_appshell_*
-- ---------------------------------------------------------------------------
alter table public.translation_studio_keys
  add column if not exists stable_id text
    check (stable_id is null or char_length(stable_id) between 1 and 256);

comment on column public.translation_studio_keys.id is
  'Internal relational identity (UUID PK).';
comment on column public.translation_studio_keys.stable_id is
  'Runtime/domain identity used in admin URLs (e.g. key_appshell_nav__home).';

create unique index if not exists translation_studio_keys_stable_id_uidx
  on public.translation_studio_keys (stable_id)
  where stable_id is not null;

-- ---------------------------------------------------------------------------
-- Values — stable_id = runtime val_appshell_*; suggestion_stable_id soft ref
-- ---------------------------------------------------------------------------
alter table public.translation_studio_values
  add column if not exists stable_id text
    check (stable_id is null or char_length(stable_id) between 1 and 256);

alter table public.translation_studio_values
  add column if not exists suggestion_stable_id text
    check (
      suggestion_stable_id is null
      or char_length(suggestion_stable_id) between 1 and 128
    );

comment on column public.translation_studio_values.id is
  'Internal relational identity (UUID PK).';
comment on column public.translation_studio_values.stable_id is
  'Runtime/domain identity (e.g. val_appshell_nav__home_ar).';
comment on column public.translation_studio_values.suggestion_stable_id is
  'Soft runtime identity reference to translation_studio_suggestions.stable_id. No FK in V1.';

create unique index if not exists translation_studio_values_stable_id_uidx
  on public.translation_studio_values (stable_id)
  where stable_id is not null;

-- ---------------------------------------------------------------------------
-- Versions — stable_id = runtime ver_* / ingest ids
-- ---------------------------------------------------------------------------
alter table public.translation_studio_versions
  add column if not exists stable_id text
    check (stable_id is null or char_length(stable_id) between 1 and 128);

comment on column public.translation_studio_versions.id is
  'Internal relational identity (UUID PK).';
comment on column public.translation_studio_versions.stable_id is
  'Runtime/domain identity for version history rows.';

create unique index if not exists translation_studio_versions_stable_id_uidx
  on public.translation_studio_versions (stable_id)
  where stable_id is not null;

-- ---------------------------------------------------------------------------
-- Suggestions — stable_id = runtime sug_*
-- ---------------------------------------------------------------------------
alter table public.translation_studio_suggestions
  add column if not exists stable_id text
    check (stable_id is null or char_length(stable_id) between 1 and 128);

comment on column public.translation_studio_suggestions.id is
  'Internal relational identity (UUID PK).';
comment on column public.translation_studio_suggestions.stable_id is
  'Runtime/domain identity (e.g. sug_N).';

create unique index if not exists translation_studio_suggestions_stable_id_uidx
  on public.translation_studio_suggestions (stable_id)
  where stable_id is not null;

-- ---------------------------------------------------------------------------
-- Memory — stable_id = runtime tm_appshell_* / tm_*
-- ---------------------------------------------------------------------------
alter table public.translation_studio_memory
  add column if not exists stable_id text
    check (stable_id is null or char_length(stable_id) between 1 and 128);

comment on column public.translation_studio_memory.id is
  'Internal relational identity (UUID PK).';
comment on column public.translation_studio_memory.stable_id is
  'Runtime/domain identity for translation memory entries.';

create unique index if not exists translation_studio_memory_stable_id_uidx
  on public.translation_studio_memory (stable_id)
  where stable_id is not null;

-- ---------------------------------------------------------------------------
-- Terminology — stable_id = runtime term_*
-- ---------------------------------------------------------------------------
alter table public.translation_studio_terminology
  add column if not exists stable_id text
    check (stable_id is null or char_length(stable_id) between 1 and 128);

comment on column public.translation_studio_terminology.id is
  'Internal relational identity (UUID PK).';
comment on column public.translation_studio_terminology.stable_id is
  'Runtime/domain identity (e.g. term_home).';

create unique index if not exists translation_studio_terminology_stable_id_uidx
  on public.translation_studio_terminology (stable_id)
  where stable_id is not null;

-- ---------------------------------------------------------------------------
-- Audit log — stable_id + actor_kind / actor_ref for non-auth-user actors
-- ---------------------------------------------------------------------------
alter table public.translation_studio_audit_log
  add column if not exists stable_id text
    check (stable_id is null or char_length(stable_id) between 1 and 160);

alter table public.translation_studio_audit_log
  add column if not exists actor_kind text not null default 'user'
    check (actor_kind in ('user', 'system', 'import', 'ai'));

alter table public.translation_studio_audit_log
  add column if not exists actor_ref text
    check (actor_ref is null or char_length(actor_ref) between 1 and 200);

comment on column public.translation_studio_audit_log.id is
  'Internal relational identity (UUID PK).';
comment on column public.translation_studio_audit_log.stable_id is
  'Runtime/domain identity for audit rows.';
comment on column public.translation_studio_audit_log.actor_id is
  'Auth user UUID when actor_kind = user; null for system/import/ai actors.';
comment on column public.translation_studio_audit_log.actor_kind is
  'Actor class: user | system | import | ai. Non-user actors do not require synthetic auth.users rows.';
comment on column public.translation_studio_audit_log.actor_ref is
  'Non-user actor reference (e.g. system:seed, system:app_shell_ingestion, system:pipeline). Null for user actors.';

create unique index if not exists translation_studio_audit_log_stable_id_uidx
  on public.translation_studio_audit_log (stable_id)
  where stable_id is not null;

-- ---------------------------------------------------------------------------
-- Languages — no stable_id column; code remains the stable identity
-- ---------------------------------------------------------------------------
comment on column public.translation_studio_languages.code is
  'Stable language identity (text PK). No separate stable_id column by design.';
