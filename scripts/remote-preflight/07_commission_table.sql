SELECT CASE
  WHEN to_regclass('public.store_commission_policies') IS NULL THEN 'MISSING'
  ELSE 'PRESENT'
END AS store_commission_policies;
