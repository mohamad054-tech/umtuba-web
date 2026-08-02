-- Platform seed accounts from 22 §12 for active fiat
SELECT owner_type, account_kind, asset_code, product_scope, status, count(*)::int AS n
FROM public.ueos_accounts
WHERE owner_type='platform' AND product_scope='ueos'
  AND account_kind IN ('clearing','revenue','liability')
GROUP BY 1,2,3,4,5
ORDER BY asset_code, account_kind;

SELECT count(*)::int AS umt_accounts
FROM public.ueos_accounts WHERE asset_code='UMT';
