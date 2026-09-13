-- =============================================================================
-- UMTUBA Learning E2E — entitlement fail-closed probes (read-oriented)
-- Namespace: UMTUBA_LEARNING_E2E_20260803
-- Requires seeded sandbox. Does not mint JWTs (buyer/learner JWT out-of-band).
-- =============================================================================

select 'SEED_REQUIRED' as check_name,
  case when exists (
    select 1 from public.learning_courses
    where id = 'e2e60803-2026-4000-8000-000000000003'
      and slug = 'umtuba-learning-e2e-20260803'
  ) then 'ok' else 'SEED_REQUIRED' end as k,
  '' as v;

-- Structural: outsider must not have an enrollment on sandbox course
select 'outsider_enrollment_absent' as check_name,
  case when exists (
    select 1
    from public.learning_enrollments e
    where e.course_id = 'e2e60803-2026-4000-8000-000000000003'
      and e.user_id = nullif(current_setting('umtuba.learning_e2e_outsider_user_id', true), '')::uuid
      and e.status = 'active'
  ) then 'FAIL_OUTSIDER_ENROLLED' else 'ok' end as k,
  '' as v;

-- Learner enrollment present
select 'learner_enrollment_present' as check_name,
  case when exists (
    select 1
    from public.learning_enrollments e
    where e.id = 'e2e60803-2026-4000-8000-000000000010'
      and e.status = 'active'
  ) then 'ok' else 'FAIL_LEARNER_MISSING' end as k,
  '' as v;

-- Note: has_learning_course_access(user) requires auth.uid() JWT context.
-- Authenticated deny/allow probes run via scripts/learning-smoke/rpc-smoke.mjs
-- with learner/outsider sessions — not via this SQL file alone.
select 'jwt_probe_note' as check_name,
  'out_of_band' as k,
  'Use rpc-smoke.mjs with LEARNING_E2E learner/outsider passwords' as v;
