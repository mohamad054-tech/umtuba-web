-- Store E2E sandbox visibility probe (read-only)
select 'variants' as kind, count(*)::int as n
from public.product_variants
where sku like 'UMTUBA_E2E_20260721-%'
union all
select 'products', count(*)::int
from public.store_products
where id in (
  'e2e02107-2026-4001-8000-000000000011'::uuid,
  'e2e02107-2026-4001-8000-000000000012'::uuid,
  'e2e02107-2026-4001-8000-000000000013'::uuid
)
or store_id = 'e2e02107-2026-4001-8000-000000000001'::uuid
union all
select 'stores', count(*)::int
from public.stores
where id = 'e2e02107-2026-4001-8000-000000000001'::uuid
or name ilike '%UMTUBA_E2E_20260721%'
or name ilike '%E2E%sandbox%'
union all
select 'other_e2e_sku', count(*)::int
from public.product_variants
where sku ilike '%E2E%' or sku ilike '%SANDBOX%' or sku ilike '%TEST%';

select sp.id, sp.title, sp.status, sp.moderation_status, sp.store_id, s.name as store_name, s.status as store_status
from public.store_products sp
left join public.stores s on s.id = sp.store_id
where sp.store_id = 'e2e02107-2026-4001-8000-000000000001'::uuid
   or sp.id in (
     'e2e02107-2026-4001-8000-000000000011'::uuid,
     'e2e02107-2026-4001-8000-000000000012'::uuid,
     'e2e02107-2026-4001-8000-000000000013'::uuid
   )
   or sp.title ilike '%UMTUBA_E2E%'
   or sp.title ilike '%E2E%20260721%';

select pv.sku, pv.id, pv.product_id, pv.is_active
from public.product_variants pv
where pv.sku like 'UMTUBA_E2E_20260721-%'
order by pv.sku;

select id, name, status, verification_status
from public.stores
where id = 'e2e02107-2026-4001-8000-000000000001'::uuid
   or name ilike '%UMTUBA_E2E_20260721%'
   or name ilike '%Sandbox%';
