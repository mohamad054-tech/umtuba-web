select count(*)::int as public_visible_e2e_products
from public.store_products sp
join public.stores s on s.id = sp.store_id
where s.status = 'active'
  and sp.status = 'active'
  and (
    sp.title ilike '%UMTUBA_E2E_20260721%'
    or s.name ilike '%UMTUBA_E2E_20260721%'
    or s.slug = 'umtuba-e2e-20260721'
    or exists (
      select 1 from public.product_variants pv
      where pv.product_id = sp.id and pv.sku like 'UMTUBA_E2E_20260721-%'
    )
  );
