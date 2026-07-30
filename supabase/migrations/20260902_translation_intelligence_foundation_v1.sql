-- =============================================================================
-- UMTUBA Translation Intelligence Foundation V1
-- Migration: 20260902_translation_intelligence_foundation_v1.sql
--
-- Additive schema for future Supabase-backed intelligence records.
-- Runtime V1 uses data/translation-studio/intelligence.json.
-- Local file only — do NOT remote-apply without explicit approval.
-- Does NOT modify 20260901 translation_studio_* tables.
-- Does NOT: train models, STT/TTS, auto-approve, client writes.
-- =============================================================================

create extension if not exists pgcrypto;

create table if not exists public.translation_intelligence_records (
  id text primary key,
  approved_value_id text not null,
  approved_version integer not null check (approved_version >= 1),
  source_text text not null,
  approved_target_text text not null,
  source_locale text not null,
  target_locale text not null,
  namespace_id text null,
  domain text null,
  content_type text not null
    check (content_type in (
      'ui_text', 'document_text', 'subtitle_segment',
      'voice_script', 'dubbing_segment'
    )),
  terminology_refs jsonb not null default '[]'::jsonb,
  style_profile_id text not null,
  provenance jsonb not null,
  suggestion_provenance jsonb null,
  reviewer_id uuid null references auth.users (id) on delete set null,
  approver_id uuid null references auth.users (id) on delete set null,
  quality jsonb not null,
  usage_rights jsonb not null,
  trust_level text not null
    check (trust_level in (
      'trusted_approved', 'trusted_internal',
      'untrusted_candidate', 'rejected'
    )),
  sensitivity text not null
    check (sensitivity in ('public', 'internal', 'confidential', 'restricted')),
  eligibility jsonb not null default '[]'::jsonb,
  feedback jsonb null,
  media jsonb null,
  source_fingerprint text not null,
  created_at timestamptz not null default timezone('utc', now()),
  approved_at timestamptz not null,
  constraint translation_intelligence_records_value_version_unique
    unique (approved_value_id, approved_version)
);

create index if not exists translation_intelligence_records_fp_idx
  on public.translation_intelligence_records (source_fingerprint);
create index if not exists translation_intelligence_records_locale_idx
  on public.translation_intelligence_records (target_locale, approved_at desc);

create table if not exists public.translation_intelligence_index (
  id text primary key,
  record_id text not null
    references public.translation_intelligence_records (id) on delete cascade,
  source_fingerprint text not null,
  domain_tags jsonb not null default '[]'::jsonb,
  terminology_usage jsonb not null default '[]'::jsonb,
  approved_target_variants jsonb not null default '[]'::jsonb,
  quality_history jsonb not null default '[]'::jsonb,
  reuse_count integer not null default 1 check (reuse_count >= 0),
  reviewer_corrections integer not null default 0 check (reviewer_corrections >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists translation_intelligence_index_fp_idx
  on public.translation_intelligence_index (source_fingerprint);

create table if not exists public.translation_intelligence_external_candidates (
  id text primary key,
  service_name text not null,
  provider_model text null,
  source_text text not null,
  candidate_text text not null,
  source_locale text not null,
  target_locale text not null,
  raw_response_ref text not null,
  raw_response_hash text not null,
  trust_level text not null default 'untrusted_candidate'
    check (trust_level = 'untrusted_candidate'),
  status text not null default 'pending_review'
    check (status = 'pending_review'),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.translation_intelligence_records enable row level security;
alter table public.translation_intelligence_records force row level security;
alter table public.translation_intelligence_index enable row level security;
alter table public.translation_intelligence_index force row level security;
alter table public.translation_intelligence_external_candidates enable row level security;
alter table public.translation_intelligence_external_candidates force row level security;

revoke all on table public.translation_intelligence_records from anon, authenticated;
revoke all on table public.translation_intelligence_index from anon, authenticated;
revoke all on table public.translation_intelligence_external_candidates from anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_platform_admin'
  ) then
    execute $policy$
      create policy translation_intelligence_records_admin_select
        on public.translation_intelligence_records
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy translation_intelligence_index_admin_select
        on public.translation_intelligence_index
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    execute $policy$
      create policy translation_intelligence_external_admin_select
        on public.translation_intelligence_external_candidates
        for select to authenticated
        using (public.is_platform_admin());
    $policy$;
    grant select on table public.translation_intelligence_records to authenticated;
    grant select on table public.translation_intelligence_index to authenticated;
    grant select on table public.translation_intelligence_external_candidates to authenticated;
  end if;
end $$;
