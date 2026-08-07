-- =============================================================================
-- UMTUBA Translation Studio Memory Identity Contract Align V1
-- Migration: 20260914_translation_studio_memory_identity_contract_align_v1.sql
--
-- Root cause of controlled baseline sync failure (23505):
--   Seed emits key-scoped memory rows (unique stable_id per catalog key + locale).
--   Multiple App Shell keys share source text, therefore share source_fingerprint.
--   UNIQUE (source_fingerprint, language) blocked the second INSERT for the same
--   fingerprint (first observed: fingerprint "cancel" / language "ar").
--
-- Intended Studio baseline identity is stable_id (already uniquely indexed).
-- This migration drops the obsolete natural-key unique so key-scoped memory
-- rows can coexist. No RLS/policy/grant/DML widening. No TI changes.
--
-- LOCAL ONLY until a separate targeted apply gate.
-- =============================================================================

alter table public.translation_studio_memory
  drop constraint if exists translation_studio_memory_fp_lang_unique;

comment on table public.translation_studio_memory is
  'Translation memory. Identity for Studio sync is stable_id. '
  'source_fingerprint+language may repeat across key-scoped App Shell memory rows.';

-- Keep a non-unique lookup index for fingerprint+language TM matching.
create index if not exists translation_studio_memory_fp_lang_idx
  on public.translation_studio_memory (source_fingerprint, language);
