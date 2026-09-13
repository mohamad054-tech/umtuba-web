-- =============================================================================
-- UMTUBA Learning E2E sandbox seed — Namespace: UMTUBA_LEARNING_E2E_20260803
-- Creates ONLY fixed-UUID sandbox Space→Course→Lesson→Activity rows + enrollments
-- for dedicated e2e Auth users. Never touches unrelated production learner data.
-- Requires config.local.sql GUCs in the same session.
-- =============================================================================

do $$
declare
  v_learner uuid := nullif(current_setting('umtuba.learning_e2e_learner_user_id', true), '')::uuid;
  v_outsider uuid := nullif(current_setting('umtuba.learning_e2e_outsider_user_id', true), '')::uuid;
  v_instructor uuid := nullif(current_setting('umtuba.learning_e2e_instructor_user_id', true), '')::uuid;
  v_space uuid := 'e2e60803-2026-4000-8000-000000000001';
  v_program uuid := 'e2e60803-2026-4000-8000-000000000002';
  v_course uuid := 'e2e60803-2026-4000-8000-000000000003';
  v_section uuid := 'e2e60803-2026-4000-8000-000000000004';
  v_lesson uuid := 'e2e60803-2026-4000-8000-000000000005';
  v_lesson_locked uuid := 'e2e60803-2026-4000-8000-000000000006';
  v_activity uuid := 'e2e60803-2026-4000-8000-000000000007';
begin
  if v_learner is null or v_outsider is null then
    raise exception 'ACCOUNT_BLOCKER: set umtuba.learning_e2e_learner_user_id and umtuba.learning_e2e_outsider_user_id via config.local.sql';
  end if;

  if v_learner = v_outsider then
    raise exception 'SAFETY_ABORT: learner and outsider must be distinct Auth users';
  end if;

  if not exists (select 1 from auth.users where id = v_learner) then
    raise exception 'ACCOUNT_BLOCKER: learner uuid % missing from auth.users', v_learner;
  end if;
  if not exists (select 1 from auth.users where id = v_outsider) then
    raise exception 'ACCOUNT_BLOCKER: outsider uuid % missing from auth.users', v_outsider;
  end if;
  if v_instructor is not null and not exists (select 1 from auth.users where id = v_instructor) then
    raise exception 'ACCOUNT_BLOCKER: instructor uuid % missing from auth.users', v_instructor;
  end if;

  -- SAFETY: refuse if fixed course id already used by a non-sandbox slug
  if exists (
    select 1 from public.learning_courses c
    where c.id = v_course
      and c.slug is distinct from 'umtuba-learning-e2e-20260803'
  ) then
    raise exception 'SAFETY_ABORT: course id % exists with non-sandbox slug', v_course;
  end if;

  -- NOTE: Column sets vary by migration vintage; this seed targets the linked
  -- Learning tip schema (spaces/programs/courses/sections/lessons/activities).
  -- Operators must run against a project that already has Learning foundations applied.
  raise notice 'UMTUBA_LEARNING_E2E_20260803 seed starting for learner=%', v_learner;

  insert into public.learning_spaces (id, name, slug, status, visibility, created_by)
  values (v_space, 'Learning E2E Space 20260803', 'umtuba-learning-e2e-space-20260803', 'active', 'private', v_learner)
  on conflict (id) do update set name = excluded.name;

  insert into public.learning_programs (id, space_id, name, slug, status, visibility, created_by)
  values (v_program, v_space, 'Learning E2E Program 20260803', 'umtuba-learning-e2e-program-20260803', 'published', 'private', v_learner)
  on conflict (id) do update set name = excluded.name;

  insert into public.learning_courses (id, program_id, name, slug, status, visibility, created_by)
  values (v_course, v_program, 'Learning E2E Course 20260803', 'umtuba-learning-e2e-20260803', 'published', 'private', v_learner)
  on conflict (id) do update set name = excluded.name, status = 'published', visibility = 'private';

  insert into public.learning_sections (id, course_id, name, slug, status, visibility, position, created_by)
  values (v_section, v_course, 'E2E Section', 'e2e-section', 'published', 'private', 1, v_learner)
  on conflict (id) do update set name = excluded.name;

  insert into public.learning_lessons (id, section_id, name, slug, status, visibility, position, created_by)
  values
    (v_lesson, v_section, 'E2E Lesson Open', 'e2e-lesson-open', 'published', 'private', 1, v_learner),
    (v_lesson_locked, v_section, 'E2E Lesson Locked', 'e2e-lesson-locked', 'published', 'private', 2, v_learner)
  on conflict (id) do update set name = excluded.name, status = 'published';

  insert into public.learning_activities (id, lesson_id, name, slug, activity_type, status, position, created_by)
  values (v_activity, v_lesson, 'E2E Assessment', 'e2e-assessment', 'assessment', 'published', 1, v_learner)
  on conflict (id) do update set name = excluded.name;

  -- Entitlement: active enrollment for learner only (never outsider)
  insert into public.learning_enrollments (id, course_id, user_id, status)
  values ('e2e60803-2026-4000-8000-000000000010', v_course, v_learner, 'active')
  on conflict (id) do update set status = 'active', user_id = excluded.user_id;

  if v_instructor is not null then
    insert into public.learning_course_staff (id, course_id, user_id, role, status)
    values ('e2e60803-2026-4000-8000-000000000011', v_course, v_instructor, 'manager', 'active')
    on conflict (id) do update set status = 'active', role = 'manager';
  end if;

  -- Mark sandbox rows for cleanup (description tag)
  update public.learning_courses
  set description = coalesce(description, '') || ' [UMTUBA_LEARNING_E2E_20260803]'
  where id = v_course
    and coalesce(description, '') not like '%UMTUBA_LEARNING_E2E_20260803%';

  raise notice 'UMTUBA_LEARNING_E2E_20260803 seed complete course=% lesson=% activity=%', v_course, v_lesson, v_activity;
end $$;
