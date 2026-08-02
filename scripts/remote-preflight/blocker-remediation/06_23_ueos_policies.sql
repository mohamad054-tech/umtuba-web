-- Read-only: UEOS policies seeded by 20260823
SELECT policy_code, version, status, effective_from, effective_to,
       left(description, 120) AS description_prefix
FROM public.ueos_policies
WHERE policy_code IN (
  'store.payment.authorized',
  'store.payment.captured',
  'store.payment.refunded'
)
ORDER BY policy_code, version;
