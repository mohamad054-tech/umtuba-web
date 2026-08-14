-- Isolate verified E2E sandbox from public catalog only.
-- Does NOT delete immutable order evidence; does NOT touch payment logic;
-- scoped to fixed store id + SKU namespace UMTUBA_E2E_20260721.
begin;

update public.store_products sp
set status = 'archived',
    moderation_status = case
      when moderation_status = 'approved' then 'approved'
      else moderation_status
    end,
    updated_at = timezone('utc', now())
where sp.store_id = 'e2e02107-2026-4001-8000-000000000001'::uuid
   or sp.id in (
     'e2e02107-2026-4001-8000-000000000011'::uuid,
     'e2e02107-2026-4001-8000-000000000012'::uuid,
     'e2e02107-2026-4001-8000-000000000013'::uuid
   );

update public.stores s
set status = 'archived',
    updated_at = timezone('utc', now())
where s.id = 'e2e02107-2026-4001-8000-000000000001'::uuid
   or s.slug = 'umtuba-e2e-20260721';

commit;

select s.id, s.slug, s.name, s.status as store_status,
       (select count(*) from public.store_products sp where sp.store_id = s.id and sp.status = 'active') as active_products,
       (select count(*) from public.store_products sp where sp.store_id = s.id and sp.status = 'archived') as archived_products
from public.stores s
where s.id = 'e2e02107-2026-4001-8000-000000000001'::uuid;
