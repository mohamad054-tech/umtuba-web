-- =============================================================================
-- UM Learning OS — Assessment Delivery Minimal V1
-- Migration: 20260848_learning_assessment_delivery_minimal_v1.sql
--
-- Depends on:
--   20260835 has_learning_course_access (entitlement)
--   20260837 questions + answer-key firewall (staff-only keys)
--   20260838/39 learning_attempt_build_questions_snapshot (learner-safe published
--     questions; revoked from clients; reusable inside DEFINER)
--
-- Adds:
--   get_my_learning_activity_assessment(p_activity_id uuid) — authenticated
--   learner-safe READ of a published activity's published questions.
--
-- Does NOT:
--   create attempts / answers / submissions
--   score, grade, or mutate progress
--   return answer keys / correctness / grading / scoring internals
--   widen learner SELECT on learning_questions or learning_question_answer_keys
--   grant EXECUTE on learning_attempt_build_questions_snapshot to clients
-- =============================================================================

create or replace function public.get_my_learning_activity_assessment(
  p_activity_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_activity public.learning_activities%rowtype;
  v_lesson public.learning_lessons%rowtype;
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_space_status text;
  v_settings public.learning_activity_settings%rowtype;
  v_questions jsonb;
  v_question_count integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_activity_id is null then
    raise exception 'activity_id is required';
  end if;

  -- Read-only path: no FOR UPDATE (no attempt/session write serialization).
  select * into v_activity
  from public.learning_activities
  where id = p_activity_id;

  if not found then
    raise exception 'Learning activity not found';
  end if;

  select * into v_lesson
  from public.learning_lessons
  where id = v_activity.lesson_id;
  if not found then
    raise exception 'Learning lesson not found';
  end if;

  select * into v_section
  from public.learning_sections
  where id = v_lesson.section_id;
  if not found then
    raise exception 'Learning section not found';
  end if;

  select * into v_course
  from public.learning_courses
  where id = v_section.course_id;
  if not found then
    raise exception 'Learning course not found';
  end if;

  select * into v_program
  from public.learning_programs
  where id = v_course.program_id;
  if not found then
    raise exception 'Learning program not found';
  end if;

  select status into v_space_status
  from public.learning_spaces
  where id = v_program.space_id;
  if not found then
    raise exception 'Learning space not found';
  end if;

  if v_space_status is distinct from 'active' then
    raise exception 'Learning space must be active to view this assessment';
  end if;

  -- Live entitlement (admin / course manager / active course or parent program
  -- enrollment). Checked BEFORE reading settings or questions.
  if not public.has_learning_course_access(v_course.id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  -- Fully published parent chain + published activity.
  if v_program.status is distinct from 'published' then
    raise exception 'Parent program must be published to view this assessment';
  end if;
  if v_course.status is distinct from 'published' then
    raise exception 'Parent course must be published to view this assessment';
  end if;
  if v_section.status is distinct from 'published' then
    raise exception 'Parent section must be published to view this assessment';
  end if;
  if v_lesson.status is distinct from 'published' then
    raise exception 'Parent lesson must be published to view this assessment';
  end if;
  if v_activity.status is distinct from 'published' then
    raise exception 'Activity must be published to view this assessment';
  end if;

  select * into v_settings
  from public.learning_activity_settings
  where activity_id = p_activity_id;
  if not found then
    raise exception 'Learning activity settings not found';
  end if;

  -- Reuse the Attempts/Scoring learner-safe snapshot builder (published only;
  -- NEVER touches learning_question_answer_keys). Remains revoked from clients.
  v_questions := public.learning_attempt_build_questions_snapshot(p_activity_id);

  if v_questions is null
     or jsonb_typeof(v_questions) is distinct from 'array'
  then
    raise exception 'Assessment question payload is malformed';
  end if;

  v_question_count := jsonb_array_length(v_questions);

  -- Learner-safe activity hints only — never full settings / scoring / policies.
  return jsonb_build_object(
    'activity_id', v_activity.id,
    'lesson_id', v_activity.lesson_id,
    'course_id', v_course.id,
    'name', v_activity.name,
    'slug', v_activity.slug,
    'type', v_activity.type,
    'description', v_activity.description,
    'hints', jsonb_build_object(
      'is_required', v_settings.is_required,
      'max_attempts', v_settings.max_attempts,
      'time_limit_seconds', v_settings.time_limit_seconds
    ),
    'questions', v_questions,
    'question_count', v_question_count
  );
end;
$$;

comment on function public.get_my_learning_activity_assessment(uuid) is
  'Learner-safe read-only assessment delivery. Owner identity from auth.uid(); requires has_learning_course_access + active space + fully published program/course/section/lesson/activity. Returns published questions via learning_attempt_build_questions_snapshot (prompt/options/blanks/points only). NEVER returns answer keys, correctness, grades, scoring internals, or staff notes. Performs no writes and creates no attempts.';

revoke all on function public.get_my_learning_activity_assessment(uuid)
  from public, anon;
grant execute on function public.get_my_learning_activity_assessment(uuid)
  to authenticated;
grant execute on function public.get_my_learning_activity_assessment(uuid)
  to service_role;
