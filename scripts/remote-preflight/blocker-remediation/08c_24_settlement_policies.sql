SELECT policy_code, version, status
FROM public.ueos_policies
WHERE policy_code LIKE 'store.settlement%'
ORDER BY policy_code, version;
