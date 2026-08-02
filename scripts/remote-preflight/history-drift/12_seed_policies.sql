SELECT policy_code, version, status, left(description,80) AS description_prefix
FROM public.ueos_policies
WHERE policy_code IN ('ueos.foundation','ueos.manual_adjustment')
   OR policy_code LIKE 'store.payment%'
   OR policy_code LIKE 'store.settlement%'
ORDER BY policy_code, version;
