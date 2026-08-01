-- Soft-fail when foundation table is absent (expected before 20260884).
-- When TABLE_PRESENT, re-run 07b_multi_active_detail.sql before applying 20260891.
SELECT
  CASE
    WHEN to_regclass('public.store_commission_policies') IS NULL THEN 'N/A_TABLE_MISSING'
    ELSE 'TABLE_PRESENT'
  END AS multi_active_preflight;
