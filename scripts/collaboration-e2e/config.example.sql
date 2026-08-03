-- =============================================================================
-- UMTUBA Collaboration E2E — session config (EXAMPLE)
-- Namespace: UMTUBA_COLLABORATION_E2E_20260803
--
-- Copy to config.local.sql (gitignored) and replace placeholders with real
-- Auth user UUIDs created via Supabase Auth UI / Admin API.
--
-- STOP: Do NOT run any seed until dedicated test accounts exist.
-- Do NOT reuse personal gmails. Do NOT create Auth users via SQL.
-- Do NOT mutate production learner or commerce rows.
-- Credentialed sandbox seed is DEFERRED in Smoke & E2E Readiness V1.
-- =============================================================================

-- Required when a future seed GO is issued:
select set_config(
  'umtuba.collaboration_e2e_owner_user_id',
  '00000000-0000-4000-8000-0000000000a1', -- REPLACE with e2e-collab-owner+20260803@… uuid
  false
);

select set_config(
  'umtuba.collaboration_e2e_peer_user_id',
  '00000000-0000-4000-8000-0000000000b1', -- REPLACE with e2e-collab-peer+20260803@… uuid
  false
);

-- Guardrail reminder for operators (readiness only — no seed in this file):
-- RAISE ACCOUNT_BLOCKER if Auth users are missing before any future seed GO.
