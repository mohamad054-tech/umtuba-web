-- =============================================================================
-- UMTUBA Collaboration Learning Link/Unlink E2E — session config (EXAMPLE)
-- Namespace: UMTUBA_COLLABORATION_LEARNING_LINK_E2E_20260808
--
-- Copy to config.local.sql (gitignored) and replace placeholders with real
-- Auth user UUIDs created via Supabase Auth UI / Admin API.
--
-- STOP: Do NOT run seed until dedicated test accounts exist.
-- Do NOT reuse personal gmails. Do NOT INSERT INTO auth.users from SQL.
-- Do NOT create Auth users on production without explicit operator approval.
-- Prefer LOCAL Supabase or an approved NON-PRODUCTION project.
-- =============================================================================

select set_config(
  'umtuba.collaboration_e2e_owner_user_id',
  '00000000-0000-4000-8000-0000000000a1', -- REPLACE with e2e-collab-owner+20260808@… uuid
  false
);

select set_config(
  'umtuba.collaboration_e2e_peer_user_id',
  '00000000-0000-4000-8000-0000000000b1', -- REPLACE with e2e-collab-peer+20260808@… uuid
  false
);

-- Guardrail: seed scripts raise ACCOUNT_BLOCKER if placeholders remain.
-- After loading config.local.sql in the same session:
--   \i scripts/collaboration-e2e/config.local.sql
--   begin;
--   \i scripts/collaboration-e2e/seed-learning-link-unlink-sandbox.example.sql
--   -- inspect notices; abort on ACCOUNT_BLOCKER
--   commit;  -- or rollback;
