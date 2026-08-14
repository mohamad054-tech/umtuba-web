select count(*)::int as e2e_order_items
from public.order_items oi
join public.product_variants pv on pv.id = oi.variant_id
where pv.sku like 'UMTUBA_E2E_20260721-%';
