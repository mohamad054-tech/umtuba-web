-- =============================================================================
-- UMTUBA Learning E2E — read-only sandbox verification
-- Namespace: UMTUBA_LEARNING_E2E_20260803
-- =============================================================================

select 'sandbox_course' as check_name,
  id::text as k,
  slug || '|' || status || '|' || visibility as v
from public.learning_courses
where id = 'e2e60803-2026-4000-8000-000000000003';

select 'sandbox_lessons' as check_name,
  count(*)::text as k,
  string_agg(slug, ',' order by position) as v
from public.learning_lessons
where id in (
  'e2e60803-2026-4000-8000-000000000005',
  'e2e60803-2026-4000-8000-000000000006'
);

select 'sandbox_enrollment' as check_name,
  user_id::text as k,
  status as v
from public.learning_enrollments
where id = 'e2e60803-2026-4000-8000-000000000010';

select 'namespace_marker' as check_name,
  case when description like '%UMTUBA_LEARNING_E2E_20260803%' then 'present' else 'missing' end as k,
  '' as v
from public.learning_courses
where id = 'e2e60803-2026-4000-8000-000000000003';
