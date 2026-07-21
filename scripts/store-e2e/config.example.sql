-- =============================================================================
-- UMTUBA Store remote E2E sandbox — session config (EXAMPLE)
-- Namespace: UMTUBA_E2E_20260721
--
-- Copy this file to config.local.sql (gitignored) and replace placeholders with
-- real Auth user UUIDs created via Supabase Auth UI / Admin API.
--
-- STOP: Do NOT run seed until dedicated test accounts exist.
-- Do NOT reuse personal gmails. Do NOT INSERT INTO auth.users from SQL.
-- Project (linked): tgucwnjwoyeqoxqaxmew
-- =============================================================================

-- Required: seller / buyer / admin Auth users must already exist in auth.users.
select set_config(
  'umtuba.e2e_seller_user_id',
  '00000000-0000-4000-8000-0000000000a1', -- REPLACE with e2e-seller+20260721@… uuid
  false
);

select set_config(
  'umtuba.e2e_buyer_user_id',
  '00000000-0000-4000-8000-0000000000b1', -- REPLACE with e2e-buyer+20260721@… uuid
  false
);

select set_config(
  'umtuba.e2e_admin_user_id',
  '00000000-0000-4000-8000-0000000000c1', -- REPLACE with e2e-admin+20260721@… uuid
  false
);

-- Optional second buyer (multi-buyer / coupon / cart isolation probes)
-- select set_config(
--   'umtuba.e2e_buyer2_user_id',
--   '00000000-0000-4000-8000-0000000000b2', -- REPLACE with e2e-buyer2+20260721@… uuid
--   false
-- );

-- Optional cleanup flag (default leave platform_admins row for admin user):
-- select set_config('umtuba.e2e_cleanup_admin', '0', false);
-- select set_config('umtuba.e2e_cleanup_admin', '1', false); -- allow cleanup to delete admin row

-- After loading config.local.sql in the same session:
--   \i scripts/store-e2e/config.local.sql
--   begin;
--   \i scripts/store-e2e/seed-store-sandbox.sql
--   commit;
