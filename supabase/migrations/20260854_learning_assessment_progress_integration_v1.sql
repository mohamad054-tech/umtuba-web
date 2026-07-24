-- =============================================================================
-- UM Learning OS — Assessment Result → Progress Integration V1
-- Migration: 20260854_learning_assessment_progress_integration_v1.sql
--
-- Depends on:
--   20260845 Progress Mutations (applications ledger + scored-attempt complete)
--   20260852/53 Assessment grading (status graded, passed)
--
-- When a fully graded assessment result has passed=true, the attempt owner may
-- apply lesson completion via existing progress helpers. No new progress system.
--
-- Gates (fail closed / skip):
--   - attempt submitted
--   - result.status = 'graded'
--   - result.passed IS TRUE (null/false do nothing)
--   - completion_mode = 'score'
--   - owner-only for learner RPC
-- Idempotent via learning_attempt_progress_applications.
--
-- Does NOT: certificates, rewards, analytics, mutate grades/answers.
-- =============================================================================

-- Internal apply: reuse applications ledger + lesson complete from scored attempt.
create or replace function public.learning_progress_try_apply_from_graded_assessment(
  p_attempt_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.learning_attempts%rowtype;
  v_settings public.learning_activity_settings%rowtype;
  v_result public.learning_attempt_results%rowtype;
  v_app public.learning_attempt_progress_applications%rowtype;
  v_now timestamptz := now();
begin
  if p_attempt_id is null or p_actor_id is null then
    raise exception 'attempt_id and actor_id are required';
  end if;

  select * into v_attempt
  from public.learning_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception 'Learning attempt not found';
  end if;

  if v_attempt.lesson_id is null
     or v_attempt.activity_id is null
     or v_attempt.course_id is null
     or v_attempt.user_id is null
  then
    raise exception 'Learning attempt relationship is malformed';
  end if;

  if v_attempt.status is distinct from 'submitted' then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'attempt_not_submitted',
      'completion_recorded', false
    );
  end if;

  select * into v_settings
  from public.learning_activity_settings
  where activity_id = v_attempt.activity_id;

  if not found then
    raise exception 'Learning activity settings not found';
  end if;

  if v_settings.completion_mode is distinct from 'score' then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'completion_mode_not_score',
      'completion_recorded', false
    );
  end if;

  select * into v_result
  from public.learning_attempt_results
  where attempt_id = p_attempt_id
  for update;

  if not found then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'attempt_not_graded',
      'completion_recorded', false
    );
  end if;

  -- Fully graded assessment path only (not legacy scored / partially_graded).
  if v_result.status is distinct from 'graded' then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', case
        when v_result.status = 'partially_graded' then 'grading_incomplete'
        else 'attempt_not_graded'
      end,
      'completion_recorded', false
    );
  end if;

  -- Authoritative pass required (null and false do nothing).
  if v_result.passed is distinct from true then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', case
        when v_result.passed is null then 'passed_null'
        else 'passed_false'
      end,
      'completion_recorded', false
    );
  end if;

  if exists (
    select 1
    from public.learning_attempt_progress_applications a
    where a.attempt_id = p_attempt_id
  ) then
    select * into v_app
    from public.learning_attempt_progress_applications
    where attempt_id = p_attempt_id;

    return jsonb_build_object(
      'status', 'idempotent',
      'attempt_id', v_app.attempt_id,
      'activity_id', v_app.activity_id,
      'lesson_id', v_app.lesson_id,
      'applied_at', v_app.applied_at,
      'completion_recorded', true
    );
  end if;

  if exists (
    select 1
    from public.learning_attempt_progress_applications a
    where a.user_id = v_attempt.user_id
      and a.activity_id = v_attempt.activity_id
  ) then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'activity_already_applied',
      'completion_recorded', true
    );
  end if;

  begin
    insert into public.learning_attempt_progress_applications (
      attempt_id,
      user_id,
      activity_id,
      lesson_id,
      course_id,
      space_id,
      applied_at,
      applied_by
    ) values (
      v_attempt.id,
      v_attempt.user_id,
      v_attempt.activity_id,
      v_attempt.lesson_id,
      v_attempt.course_id,
      v_attempt.space_id,
      v_now,
      p_actor_id
    )
    returning * into v_app;
  exception
    when unique_violation then
      return jsonb_build_object(
        'status', 'skipped',
        'reason', 'activity_already_applied_concurrent',
        'completion_recorded', true
      );
  end;

  -- Existing progress write path (does not reduce completed lessons).
  perform public.learning_progress_complete_lesson_from_scored_attempt(
    v_attempt.lesson_id,
    v_attempt.user_id,
    p_actor_id,
    v_attempt.activity_id
  );

  perform public.learning_audit_write(
    p_actor_id,
    v_attempt.space_id,
    'progress.attempt_graded_assessment_apply',
    'learning_attempt',
    p_attempt_id::text,
    jsonb_build_object(
      'attempt_id', p_attempt_id,
      'activity_id', v_attempt.activity_id,
      'lesson_id', v_attempt.lesson_id,
      'course_id', v_attempt.course_id,
      'user_id', v_attempt.user_id,
      'applied_at', v_app.applied_at
    )
  );

  return jsonb_build_object(
    'status', 'applied',
    'attempt_id', v_app.attempt_id,
    'activity_id', v_app.activity_id,
    'lesson_id', v_app.lesson_id,
    'applied_at', v_app.applied_at,
    'completion_recorded', true
  );
end;
$$;

revoke all on function public.learning_progress_try_apply_from_graded_assessment(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.learning_progress_try_apply_from_graded_assessment(uuid, uuid)
  to service_role;

comment on function public.learning_progress_try_apply_from_graded_assessment(uuid, uuid) is
  'Assessment Progress Integration V1 — internal. Applies lesson completion for graded+passed assessment attempts via existing applications ledger. Revoked from authenticated.';

-- Owner applies completion for own fully graded + passed attempt.
create or replace function public.apply_my_learning_assessment_progress(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.learning_attempts%rowtype;
  v_out jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  if v_attempt.user_id is distinct from v_uid then
    raise exception 'Not allowed to apply progress for this attempt';
  end if;

  v_out := public.learning_progress_try_apply_from_graded_assessment(
    p_attempt_id,
    v_uid
  );

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'activity_id', v_attempt.activity_id,
    'status', v_out ->> 'status',
    'reason', v_out -> 'reason',
    'completion_recorded', coalesce((v_out ->> 'completion_recorded')::boolean, false),
    'applied_at', v_out -> 'applied_at',
    'lesson_id', v_out -> 'lesson_id'
  );
end;
$$;

comment on function public.apply_my_learning_assessment_progress(uuid) is
  'Assessment Progress Integration V1 — owner applies lesson completion when attempt is graded and passed=true. Idempotent. Never mutates grades/answers. No certificates.';

-- Owner read: whether progress completion was recorded for this attempt.
create or replace function public.get_my_learning_assessment_progress_status(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.learning_attempts%rowtype;
  v_result public.learning_attempt_results%rowtype;
  v_applied_at timestamptz;
  v_completion_recorded boolean := false;
  v_eligible boolean := false;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  select * into v_attempt
  from public.learning_attempts
  where id = p_attempt_id;

  if not found then
    raise exception 'Learning attempt not found';
  end if;

  if v_attempt.user_id is distinct from v_uid then
    raise exception 'Not allowed to read progress status for this attempt';
  end if;

  select * into v_result
  from public.learning_attempt_results
  where attempt_id = p_attempt_id;

  select a.applied_at into v_applied_at
  from public.learning_attempt_progress_applications a
  where a.attempt_id = p_attempt_id
     or (
       a.user_id = v_attempt.user_id
       and a.activity_id = v_attempt.activity_id
     )
  order by a.applied_at
  limit 1;

  v_completion_recorded := v_applied_at is not null;

  v_eligible :=
    v_result.attempt_id is not null
    and v_result.status = 'graded'
    and v_result.passed is true
    and not v_completion_recorded;

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'activity_id', v_attempt.activity_id,
    'grading_status', coalesce(v_result.status, 'not_graded'),
    'passed', v_result.passed,
    'completion_recorded', v_completion_recorded,
    'applied_at', v_applied_at,
    'can_apply', v_eligible
  );
end;
$$;

comment on function public.get_my_learning_assessment_progress_status(uuid) is
  'Assessment Progress Integration V1 — owner read of whether lesson completion was recorded for the graded attempt.';

revoke all on function public.apply_my_learning_assessment_progress(uuid)
  from public, anon;
grant execute on function public.apply_my_learning_assessment_progress(uuid)
  to authenticated;
grant execute on function public.apply_my_learning_assessment_progress(uuid)
  to service_role;

revoke all on function public.get_my_learning_assessment_progress_status(uuid)
  from public, anon;
grant execute on function public.get_my_learning_assessment_progress_status(uuid)
  to authenticated;
grant execute on function public.get_my_learning_assessment_progress_status(uuid)
  to service_role;
