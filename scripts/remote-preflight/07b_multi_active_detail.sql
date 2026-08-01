-- Only run when store_commission_policies exists (after 20260884).
SELECT currency, count(*)::text AS active_count
FROM public.store_commission_policies
WHERE status = 'active'
GROUP BY currency
HAVING count(*) > 1
ORDER BY currency;
