-- =============================================================================
-- UMTUBA Learning remote smoke / E2E — session config (EXAMPLE)
-- Namespace: UMTUBA_LEARNING_E2E_20260803
--
-- Copy to config.local.sql (gitignored) and replace placeholders with real
-- Auth user UUIDs created via Supabase Auth UI / Admin API.
--
-- STOP: Do NOT run seed until dedicated test accounts exist.
-- Do NOT reuse personal gmails. Do NOT INSERT INTO auth.users from SQL.
-- Do NOT enroll or mutate real learner production rows.
-- Project (linked): tgucwnjwoyeqoxqaxmew
-- =============================================================================

-- Required: e2e learner (entitled) + outsider (must NOT have course access)
select set_config(
  'umtuba.learning_e2e_learner_user_id',
  '00000000-0000-4000-8000-0000000000a1', -- REPLACE with e2e-learner+20260803@… uuid
  false
);

select set_config(
  'umtuba.learning_e2e_outsider_user_id',
  '00000000-0000-4000-8000-0000000000b1', -- REPLACE with e2e-outsider+20260803@… uuid
  false
);

-- Optional instructor for queue visibility probes
select set_config(
  'umtuba.learning_e2e_instructor_user_id',
  '00000000-0000-4000-8000-0000000000c1', -- REPLACE with e2e-instructor+20260803@… uuid
  false
);

-- After loading config.local.sql in the same session:
--   begin;
--   \i scripts/learning-e2e/config.local.sql
--   \i scripts/learning-e2e/seed-learning-sandbox.sql
--   commit;
