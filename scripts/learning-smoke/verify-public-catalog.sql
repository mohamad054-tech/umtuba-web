-- =============================================================================
-- Learning public catalog / preview — READ-ONLY structural smoke
-- Namespace note: UMTUBA_LEARNING_E2E_20260803 (harness marker; no writes)
-- Safe on production: selects only.
-- =============================================================================

select 'published_public_courses' as check_name,
  count(*)::text as k,
  coalesce(string_agg(slug, ',' order by slug), '') as v
from public.learning_courses
where status = 'published' and visibility = 'public';

select 'preview_rows' as check_name,
  count(*)::text as k,
  '' as v
from public.learning_course_public_previews;

select 'catalog_smoke' as check_name,
  case when exists (
    select 1 from public.learning_courses
    where status = 'published' and visibility = 'public'
  ) then 'PASS' else 'FAIL_NO_PUBLIC_COURSE' end as k,
  'UMTUBA_LEARNING_E2E_20260803' as v;
