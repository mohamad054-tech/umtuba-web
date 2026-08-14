select pv.sku, pv.id::text, pv.product_id::text, pv.is_active
from public.product_variants pv
where pv.sku like 'UMTUBA_E2E_20260721-%'
order by pv.sku;
