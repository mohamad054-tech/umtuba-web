select pv.sku, sp.title, sp.status as product_status, s.name as store_name, s.status as store_status
from public.product_variants pv
join public.store_products sp on sp.id = pv.product_id
join public.stores s on s.id = sp.store_id
where pv.sku like 'UMTUBA_E2E_20260721-%'
order by pv.sku;
