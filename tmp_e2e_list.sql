select pv.sku, sp.name as product_name, sp.status
from public.product_variants pv
join public.store_products sp on sp.id = pv.product_id
where pv.sku like 'UMTUBA_E2E_20260721-%'
order by pv.sku;
