-- UMTUBA Store — Category Taxonomy Seed V1
-- Additive seed of minimal trusted active product_categories for real product loading.
-- Does NOT: Dashboard/Admin taxonomy editor, AI categorization, catalog redesign,
-- delete unknown categories, auto-publish products, or weaken physical/digital publish gates.
-- Category presence alone does not enable physical checkout (commerce_confirm stays gated).

-- Schema fields used (Product Foundation + Marketplace sort_order):
--   id, parent_id, slug, name, status, sort_order
-- No locale labels / marketplace flags on this table.

-- Idempotent: upsert by deterministic primary key.
-- Fail closed: if a seeded slug is already owned by a different id, raise.

-- ---------------------------------------------------------------------------
-- 1) Conflict guard + upsert helper
-- ---------------------------------------------------------------------------

create or replace function public.store_catalog_seed_category_v1(
  p_id uuid,
  p_parent_id uuid,
  p_slug text,
  p_name text,
  p_sort_order integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_existing_slug text;
begin
  if p_id is null or p_slug is null or p_name is null then
    raise exception 'category seed requires id, slug, and name';
  end if;
  if p_sort_order is null or p_sort_order < 0 or p_sort_order > 999999 then
    raise exception 'category seed sort_order out of range for %', p_slug;
  end if;

  -- Slug owned by a different row → fail closed (do not steal / overwrite).
  select c.id into v_existing_id
  from public.product_categories c
  where lower(c.slug) = lower(btrim(p_slug))
    and c.id is distinct from p_id
  limit 1;

  if v_existing_id is not null then
    raise exception
      'category taxonomy seed conflict: slug % already owned by % (seed id %)',
      p_slug,
      v_existing_id,
      p_id;
  end if;

  -- Parent integrity (when set) — parents must already exist in this transaction.
  if p_parent_id is not null
     and not exists (
       select 1 from public.product_categories p where p.id = p_parent_id
     ) then
    raise exception
      'category taxonomy seed hierarchy invalid: parent % missing for %',
      p_parent_id,
      p_slug;
  end if;

  insert into public.product_categories (
    id,
    parent_id,
    slug,
    name,
    status,
    sort_order
  ) values (
    p_id,
    p_parent_id,
    lower(btrim(p_slug)),
    btrim(p_name),
    'active',
    p_sort_order
  )
  on conflict (id) do update set
    parent_id = excluded.parent_id,
    slug = excluded.slug,
    name = excluded.name,
    status = 'active',
    sort_order = excluded.sort_order,
    updated_at = now();

  -- Guard: our deterministic id must keep the intended slug after upsert.
  select c.slug into v_existing_slug
  from public.product_categories c
  where c.id = p_id;

  if v_existing_slug is distinct from lower(btrim(p_slug)) then
    raise exception
      'category taxonomy seed failed: id % slug diverged to %',
      p_id,
      v_existing_slug;
  end if;
end;
$$;

revoke all on function public.store_catalog_seed_category_v1(uuid, uuid, text, text, integer)
  from public, anon, authenticated;

comment on function public.store_catalog_seed_category_v1(uuid, uuid, text, text, integer) is
  'Category Taxonomy Seed V1 — idempotent upsert of one launch taxonomy row. service/migration only.';

-- ---------------------------------------------------------------------------
-- 2) Launch taxonomy (deterministic UUIDs under c47a1000-0001-4000-8000-*)
-- Digital Products root + children; Services; physical roots for future
-- physical commerce (presence does not enable checkout/publish by itself).
-- ---------------------------------------------------------------------------

do $$
declare
  -- Roots
  v_digital uuid := 'c47a1000-0001-4000-8000-000000000001';
  v_services uuid := 'c47a1000-0001-4000-8000-000000000010';
  v_electronics uuid := 'c47a1000-0001-4000-8000-000000000020';
  v_fashion uuid := 'c47a1000-0001-4000-8000-000000000021';
  v_beauty uuid := 'c47a1000-0001-4000-8000-000000000022';
  v_home uuid := 'c47a1000-0001-4000-8000-000000000023';
  v_sports uuid := 'c47a1000-0001-4000-8000-000000000024';
  v_food uuid := 'c47a1000-0001-4000-8000-000000000025';
  -- Digital children
  v_education uuid := 'c47a1000-0001-4000-8000-000000000002';
  v_software uuid := 'c47a1000-0001-4000-8000-000000000003';
  v_books uuid := 'c47a1000-0001-4000-8000-000000000004';
  v_design uuid := 'c47a1000-0001-4000-8000-000000000005';
begin
  -- Roots first (parent_id null)
  perform public.store_catalog_seed_category_v1(
    v_digital, null, 'digital-products', 'Digital Products', 10
  );
  perform public.store_catalog_seed_category_v1(
    v_services, null, 'services', 'Services', 20
  );
  perform public.store_catalog_seed_category_v1(
    v_electronics, null, 'electronics', 'Electronics', 30
  );
  perform public.store_catalog_seed_category_v1(
    v_fashion, null, 'fashion', 'Fashion', 40
  );
  perform public.store_catalog_seed_category_v1(
    v_beauty, null, 'beauty-personal-care', 'Beauty & Personal Care', 50
  );
  perform public.store_catalog_seed_category_v1(
    v_home, null, 'home-living', 'Home & Living', 60
  );
  perform public.store_catalog_seed_category_v1(
    v_sports, null, 'sports-outdoors', 'Sports & Outdoors', 70
  );
  perform public.store_catalog_seed_category_v1(
    v_food, null, 'food-beverage', 'Food & Beverage', 80
  );

  -- Digital children
  perform public.store_catalog_seed_category_v1(
    v_education, v_digital, 'education-courses', 'Education & Courses', 11
  );
  perform public.store_catalog_seed_category_v1(
    v_software, v_digital, 'software-digital-tools', 'Software & Digital Tools', 12
  );
  perform public.store_catalog_seed_category_v1(
    v_books, v_digital, 'books-documents', 'Books & Documents', 13
  );
  perform public.store_catalog_seed_category_v1(
    v_design, v_digital, 'design-creative-assets', 'Design & Creative Assets', 14
  );
end;
$$;

-- Helper remains for re-runs / ops; not granted to authenticated.
-- (Migration re-apply of this file re-runs the DO block safely via upsert.)
