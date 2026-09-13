-- =============================================================================
-- UMTUBA Learning E2E cleanup — Namespace: UMTUBA_LEARNING_E2E_20260803
-- Deletes ONLY fixed sandbox UUIDs / namespace marker rows.
-- Never truncate. Never DELETE without sandbox identifiers.
-- Never deletes auth.users. Optional staff cleanup only for sandbox staff id.
-- =============================================================================

do $$
begin
  -- Child tables first (best-effort; ignore missing relations)
  delete from public.learning_ai_tutor_messages
  where thread_id in (
    select id from public.learning_ai_tutor_threads
    where course_id = 'e2e60803-2026-4000-8000-000000000003'
  );

  delete from public.learning_ai_tutor_threads
  where course_id = 'e2e60803-2026-4000-8000-000000000003';

  delete from public.learning_discussion_replies
  where thread_id in (
    select id from public.learning_discussion_threads
    where course_id = 'e2e60803-2026-4000-8000-000000000003'
  );

  delete from public.learning_discussion_threads
  where course_id = 'e2e60803-2026-4000-8000-000000000003';

  delete from public.learning_project_submissions
  where activity_id = 'e2e60803-2026-4000-8000-000000000007';

  delete from public.learning_assignment_submissions
  where activity_id in (
    select id from public.learning_activities
    where lesson_id in (
      'e2e60803-2026-4000-8000-000000000005',
      'e2e60803-2026-4000-8000-000000000006'
    )
  );

  delete from public.learning_attempt_answers
  where attempt_id in (
    select id from public.learning_attempts
    where activity_id = 'e2e60803-2026-4000-8000-000000000007'
  );

  delete from public.learning_attempts
  where activity_id = 'e2e60803-2026-4000-8000-000000000007';

  delete from public.learning_lesson_progress
  where lesson_id in (
    'e2e60803-2026-4000-8000-000000000005',
    'e2e60803-2026-4000-8000-000000000006'
  );

  delete from public.learning_enrollments
  where id = 'e2e60803-2026-4000-8000-000000000010'
     or (
       course_id = 'e2e60803-2026-4000-8000-000000000003'
       and id::text like 'e2e60803-%'
     );

  delete from public.learning_course_staff
  where id = 'e2e60803-2026-4000-8000-000000000011';

  delete from public.learning_activities
  where id = 'e2e60803-2026-4000-8000-000000000007';

  delete from public.learning_lessons
  where id in (
    'e2e60803-2026-4000-8000-000000000005',
    'e2e60803-2026-4000-8000-000000000006'
  );

  delete from public.learning_sections
  where id = 'e2e60803-2026-4000-8000-000000000004';

  delete from public.learning_courses
  where id = 'e2e60803-2026-4000-8000-000000000003'
    and slug = 'umtuba-learning-e2e-20260803';

  delete from public.learning_programs
  where id = 'e2e60803-2026-4000-8000-000000000002'
    and slug = 'umtuba-learning-e2e-program-20260803';

  delete from public.learning_spaces
  where id = 'e2e60803-2026-4000-8000-000000000001'
    and slug = 'umtuba-learning-e2e-space-20260803';

  raise notice 'UMTUBA_LEARNING_E2E_20260803 cleanup complete';
end $$;
