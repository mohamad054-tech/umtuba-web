select sp.id::text, sp.title, sp.status::text, sp.moderation_status::text, sp.store_id::text,
       s.name as store_name, s.status::text as store_status, s.verification_status::text as store_verification
from public.store_products sp
join public.stores s on s.id = sp.store_id
where sp.store_id = 'e2e02107-2026-4001-8000-000000000001'::uuid
order by sp.title;
