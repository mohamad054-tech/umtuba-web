SELECT currency, count(*)::text AS active_count
FROM public.store_commission_policies
WHERE status = 'active'
GROUP BY currency
HAVING count(*) > 1
ORDER BY currency;
