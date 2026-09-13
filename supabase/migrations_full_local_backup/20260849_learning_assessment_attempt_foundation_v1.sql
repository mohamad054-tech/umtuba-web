-- =============================================================================
-- UM Learning OS — Assessment Attempt Foundation V1
-- Migration: 20260849_learning_assessment_attempt_foundation_v1.sql
--
-- Depends on:
--   20260838 Attempts Foundation (learning_attempts, start/cancel/get/expire)
--   20260848 Assessment Delivery Minimal
--     (get_my_learning_activity_assessment)
--
-- Adds assessment-scoped RPCs that:
--   1) Reuse Assessment Delivery for entitlement + published-chain + questions
--   2) Create/resume minimal attempt rows via existing start_learning_attempt
--   3) Expose lifecycle + expiration METADATA only (no answers / scores)
--
-- Does NOT:
--   create a second attempts table
--   save answers / submit / score / grade
--   mutate progress / certificates / analytics
--   return answer keys or correctness
--   apply background expiry jobs (lazy expire metadata only via existing helper)
-- =============================================================================

-- Start or resume a learner assessment attempt.
-- Reuses get_my_learning_activity_assessment (auth + entitlement + published
-- chain + published questions), then delegates record creation / one-active
-- resume to start_learning_attempt (existing partial unique + snapshots).
create or replace function public.start_my_learning_assessment_attempt(
  p_activity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_delivery jsonb;
  v_question_count integer;
  v_started jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_activity_id is null then
    raise exception 'activity_id is required';
  end if;

  -- Reuse Assessment Delivery RPC (same auth.uid() / entitlement / chain).
  v_delivery := public.get_my_learning_activity_assessment(p_activity_id);

  if v_delivery is null or jsonb_typeof(v_delivery) is distinct from 'object' then
    raise exception 'Assessment delivery payload is malformed';
  end if;

  v_question_count := coalesce((v_delivery ->> 'question_count')::integer, 0);
  if v_question_count < 1 then
    raise exception 'Activity has no published questions to attempt';
  end if;

  -- Creates or resumes the single active attempt row (DB one-active policy).
  v_started := public.start_learning_attempt(p_activity_id);

  return jsonb_build_object(
    'attempt_id', v_started -> 'attempt_id',
    'activity_id', v_started -> 'activity_id',
    'status', v_started -> 'status',
    'attempt_number', v_started -> 'attempt_number',
    'started_at', v_started -> 'started_at',
    'resumed', v_started -> 'resumed',
    'question_count', v_question_count
  );
end;
$$;

comment on function public.start_my_learning_assessment_attempt(uuid) is
  'Assessment Attempt Foundation V1 — start/resume. Reuses get_my_learning_activity_assessment then start_learning_attempt. One active attempt per learner+activity. No scoring, answers, or progress mutation.';

-- Read attempt lifecycle + expiration metadata + learner-safe questions.
-- NEVER returns answers, scores, keys, or correctness.
create or replace function public.get_my_learning_assessment_attempt(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.learning_attempts%rowtype;
  v_remaining integer;
  v_expires_at timestamptz;
  v_questions jsonb;
  v_question_count integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  -- Lazy expiry metadata transition only (existing Attempts helper).
  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  if v_attempt.user_id is distinct from v_uid then
    raise exception 'Not allowed to read this assessment attempt';
  end if;

  -- Live entitlement revalidation (fail closed if access revoked).
  if not public.has_learning_course_access(v_attempt.course_id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  v_questions := coalesce(v_attempt.questions_snapshot, '[]'::jsonb);
  if jsonb_typeof(v_questions) is distinct from 'array' then
    raise exception 'Attempt questions snapshot is malformed';
  end if;
  v_question_count := jsonb_array_length(v_questions);

  if v_attempt.time_limit_seconds_snapshot is not null then
    v_expires_at :=
      v_attempt.started_at
      + make_interval(secs => v_attempt.time_limit_seconds_snapshot);
  else
    v_expires_at := null;
  end if;

  if v_attempt.status = 'active'
     and v_attempt.time_limit_seconds_snapshot is not null
  then
    v_remaining := greatest(
      0,
      v_attempt.time_limit_seconds_snapshot
        - floor(extract(epoch from (now() - v_attempt.started_at)))::integer
    );
  else
    v_remaining := null;
  end if;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'activity_id', v_attempt.activity_id,
    'lesson_id', v_attempt.lesson_id,
    'course_id', v_attempt.course_id,
    'status', v_attempt.status,
    'attempt_number', v_attempt.attempt_number,
    'started_at', v_attempt.started_at,
    'last_activity_at', v_attempt.last_activity_at,
    'submitted_at', v_attempt.submitted_at,
    'expired_at', v_attempt.expired_at,
    'cancelled_at', v_attempt.cancelled_at,
    'time_limit_seconds', v_attempt.time_limit_seconds_snapshot,
    'max_attempts', v_attempt.max_attempts_snapshot,
    'expires_at', v_expires_at,
    'remaining_seconds', v_remaining,
    'questions', v_questions,
    'question_count', v_question_count
  );
end;
$$;

comment on function public.get_my_learning_assessment_attempt(uuid) is
  'Assessment Attempt Foundation V1 — owner read of attempt lifecycle + expiration metadata + learner-safe questions snapshot. NEVER returns answers, scores, keys, or correctness.';

-- Cancel an active assessment attempt (lifecycle only).
create or replace function public.cancel_my_learning_assessment_attempt(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cancelled jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  -- Ownership + active→cancelled enforced inside cancel_learning_attempt.
  v_cancelled := public.cancel_learning_attempt(p_attempt_id);

  return jsonb_build_object(
    'attempt_id', v_cancelled -> 'attempt_id',
    'status', v_cancelled -> 'status',
    'cancelled_at', v_cancelled -> 'cancelled_at'
  );
end;
$$;

comment on function public.cancel_my_learning_assessment_attempt(uuid) is
  'Assessment Attempt Foundation V1 — cancel active attempt via cancel_learning_attempt. No scoring or progress mutation.';

revoke all on function public.start_my_learning_assessment_attempt(uuid)
  from public, anon;
grant execute on function public.start_my_learning_assessment_attempt(uuid)
  to authenticated;
grant execute on function public.start_my_learning_assessment_attempt(uuid)
  to service_role;

revoke all on function public.get_my_learning_assessment_attempt(uuid)
  from public, anon;
grant execute on function public.get_my_learning_assessment_attempt(uuid)
  to authenticated;
grant execute on function public.get_my_learning_assessment_attempt(uuid)
  to service_role;

revoke all on function public.cancel_my_learning_assessment_attempt(uuid)
  from public, anon;
grant execute on function public.cancel_my_learning_assessment_attempt(uuid)
  to authenticated;
grant execute on function public.cancel_my_learning_assessment_attempt(uuid)
  to service_role;
