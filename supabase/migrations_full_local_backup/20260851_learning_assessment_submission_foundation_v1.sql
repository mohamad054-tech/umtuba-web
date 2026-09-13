-- =============================================================================
-- UM Learning OS — Assessment Submission Foundation V1
-- Migration: 20260851_learning_assessment_submission_foundation_v1.sql
--
-- Depends on:
--   20260838 Attempts Foundation
--     (learning_attempts, learning_attempt_answers, expire_if_due,
--      submit_learning_attempt lifecycle semantics)
--   20260849 Assessment Attempt Foundation
--   20260850 Assessment Answer Persistence
--
-- Reuses learning_attempts.status / submitted_at as the authoritative
-- submission state. No new submission table. No second attempts system.
--
-- Adds assessment-scoped RPCs:
--   submit_my_learning_assessment_attempt(p_attempt_id)
--   get_my_learning_assessment_submission(p_attempt_id)
--
-- Completeness policy (snapshot-only):
--   - Every snapshotted question is REQUIRED by default.
--   - A question is OPTIONAL only when the snapshot object explicitly sets
--     boolean is_required=false OR required=false.
--   - Optional questions may remain unanswered.
--   - Required questions must have a persisted learning_attempt_answers row.
--   - Malformed snapshot structure fails closed (no submit).
--   - NEVER validates against answer keys / correctness / scores.
--
-- Concurrency:
--   learning_attempt_expire_if_due locks the attempt FOR UPDATE before
--   completeness checks and the active→submitted transition. Concurrent
--   save_learning_attempt_answer also locks via expire_if_due and rejects
--   non-active attempts — so a post-submit answer write cannot commit.
--
-- Does NOT:
--   grade / score / evaluate correctness
--   read answer keys
--   mutate progress / certificates / analytics
--   reopen submitted attempts
--   create background grading jobs
-- =============================================================================

-- Submit the caller's own active assessment attempt.
-- Locks attempt row (via expire_if_due), validates ownership + lifecycle,
-- enforces snapshot completeness, then transitions active → submitted with
-- server-authoritative submitted_at. Idempotent if already submitted.
create or replace function public.submit_my_learning_assessment_attempt(
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
  v_now timestamptz := now();
  v_elem jsonb;
  v_qid uuid;
  v_required boolean;
  v_has_answer boolean;
  v_question_count integer := 0;
  v_required_count integer := 0;
  v_answered_required integer := 0;
  v_answer_count integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  -- Row lock + lazy expiry (active → expired when due). Serializes with
  -- concurrent answer-save / submit / cancel on the same attempt.
  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  if v_attempt.user_id is distinct from v_uid then
    raise exception 'Not allowed to submit this attempt';
  end if;

  -- Idempotent: already submitted returns authoritative state (no timestamp change).
  if v_attempt.status = 'submitted' then
    select count(*)::integer into v_answer_count
    from public.learning_attempt_answers
    where attempt_id = p_attempt_id;

    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'activity_id', v_attempt.activity_id,
      'status', 'submitted',
      'submitted_at', v_attempt.submitted_at,
      'started_at', v_attempt.started_at,
      'question_count', jsonb_array_length(
        coalesce(v_attempt.questions_snapshot, '[]'::jsonb)
      ),
      'answer_count', coalesce(v_answer_count, 0),
      'is_submitted', true,
      'idempotent', true
    );
  end if;

  if v_attempt.status is distinct from 'active' then
    raise exception 'Attempt is % and cannot be submitted', v_attempt.status;
  end if;

  -- Fail closed: immutable snapshot must be a non-empty JSON array of objects.
  if jsonb_typeof(v_attempt.questions_snapshot) is distinct from 'array' then
    raise exception 'Attempt questions snapshot is malformed';
  end if;

  for v_elem in
    select value
    from jsonb_array_elements(v_attempt.questions_snapshot) as t(value)
  loop
    v_question_count := v_question_count + 1;

    if jsonb_typeof(v_elem) is distinct from 'object' then
      raise exception 'Attempt questions snapshot is malformed';
    end if;

    begin
      v_qid := nullif(v_elem ->> 'question_id', '')::uuid;
    exception
      when others then
        raise exception 'Attempt questions snapshot is malformed';
    end;

    if v_qid is null then
      raise exception 'Attempt questions snapshot is malformed';
    end if;

    -- Required by default. Optional only when an explicit boolean false is set.
    if (v_elem ? 'is_required'
        and jsonb_typeof(v_elem -> 'is_required') is distinct from 'boolean')
       or (v_elem ? 'required'
        and jsonb_typeof(v_elem -> 'required') is distinct from 'boolean')
    then
      raise exception 'Attempt questions snapshot is malformed';
    end if;

    v_required := true;
    if v_elem ? 'is_required' then
      v_required := (v_elem ->> 'is_required')::boolean;
    elsif v_elem ? 'required' then
      v_required := (v_elem ->> 'required')::boolean;
    end if;

    if v_required then
      v_required_count := v_required_count + 1;
      select exists(
        select 1
        from public.learning_attempt_answers ans
        where ans.attempt_id = p_attempt_id
          and ans.question_id = v_qid
      ) into v_has_answer;

      if not coalesce(v_has_answer, false) then
        raise exception 'Required question is unanswered';
      end if;

      v_answered_required := v_answered_required + 1;
    end if;
  end loop;

  if v_question_count < 1 then
    raise exception 'Attempt questions snapshot is malformed';
  end if;

  -- Atomic active → submitted under the FOR UPDATE lock held above.
  update public.learning_attempts
  set status = 'submitted',
      submitted_at = v_now,
      last_activity_at = v_now,
      updated_at = v_now
  where id = p_attempt_id
    and status = 'active'
  returning * into v_attempt;

  if not found then
    -- Concurrent cancel/expire/submit won the race after our earlier read.
    raise exception 'Attempt is no longer active and cannot be submitted';
  end if;

  select count(*)::integer into v_answer_count
  from public.learning_attempt_answers
  where attempt_id = p_attempt_id;

  perform public.learning_audit_write(
    v_uid,
    v_attempt.space_id,
    'attempt.submit',
    'learning_attempt',
    p_attempt_id::text,
    jsonb_build_object(
      'attempt_id', p_attempt_id,
      'activity_id', v_attempt.activity_id,
      'course_id', v_attempt.course_id,
      'from_status', 'active',
      'to_status', 'submitted',
      'question_count', v_question_count,
      'required_count', v_required_count,
      'answered_required', v_answered_required,
      'answer_count', coalesce(v_answer_count, 0)
    )
  );

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'activity_id', v_attempt.activity_id,
    'status', 'submitted',
    'submitted_at', v_attempt.submitted_at,
    'started_at', v_attempt.started_at,
    'question_count', v_question_count,
    'answer_count', coalesce(v_answer_count, 0),
    'is_submitted', true,
    'idempotent', false
  );
end;
$$;

comment on function public.submit_my_learning_assessment_attempt(uuid) is
  'Assessment Submission Foundation V1 — owner submit of own active attempt. Lazy expire + FOR UPDATE lock; snapshot completeness (required by default, optional when is_required/required=false); server submitted_at; idempotent re-submit. NEVER keys/scores/progress.';

-- Owner read of submission lifecycle metadata only.
-- Applies lazy expiry for consistent lifecycle status. NEVER returns answers,
-- answer keys, scores, or correctness.
create or replace function public.get_my_learning_assessment_submission(
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
  v_answer_count integer;
  v_question_count integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  -- Lazy expiry for authoritative lifecycle (locks row briefly).
  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  if v_attempt.user_id is distinct from v_uid then
    raise exception 'Not allowed to read this submission';
  end if;

  if jsonb_typeof(v_attempt.questions_snapshot) is distinct from 'array' then
    raise exception 'Attempt questions snapshot is malformed';
  end if;

  v_question_count := jsonb_array_length(v_attempt.questions_snapshot);

  select count(*)::integer into v_answer_count
  from public.learning_attempt_answers
  where attempt_id = p_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'activity_id', v_attempt.activity_id,
    'status', v_attempt.status,
    'started_at', v_attempt.started_at,
    'submitted_at', v_attempt.submitted_at,
    'expired_at', v_attempt.expired_at,
    'cancelled_at', v_attempt.cancelled_at,
    'last_activity_at', v_attempt.last_activity_at,
    'question_count', v_question_count,
    'answer_count', coalesce(v_answer_count, 0),
    'is_submitted', v_attempt.status = 'submitted'
  );
end;
$$;

comment on function public.get_my_learning_assessment_submission(uuid) is
  'Assessment Submission Foundation V1 — owner read of submission lifecycle metadata only. Lazy expire for status consistency. NEVER answers, keys, scores, or correctness.';

revoke all on function public.submit_my_learning_assessment_attempt(uuid)
  from public, anon;
grant execute on function public.submit_my_learning_assessment_attempt(uuid)
  to authenticated;
grant execute on function public.submit_my_learning_assessment_attempt(uuid)
  to service_role;

revoke all on function public.get_my_learning_assessment_submission(uuid)
  from public, anon;
grant execute on function public.get_my_learning_assessment_submission(uuid)
  to authenticated;
grant execute on function public.get_my_learning_assessment_submission(uuid)
  to service_role;
