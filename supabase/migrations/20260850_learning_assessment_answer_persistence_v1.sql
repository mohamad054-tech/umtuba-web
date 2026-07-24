-- =============================================================================
-- UM Learning OS — Assessment Answer Persistence Foundation V1
-- Migration: 20260850_learning_assessment_answer_persistence_v1.sql
--
-- Depends on:
--   20260838 Attempts Foundation
--     (learning_attempt_answers, save_learning_attempt_answer,
--      learning_attempt_validate_answer, expire_if_due)
--   20260849 Assessment Attempt Foundation
--
-- Reuses learning_attempt_answers (UNIQUE attempt_id+question_id). No new table.
--
-- Adds assessment-scoped RPCs:
--   save_my_learning_assessment_answer(attempt_id, question_id, answer)
--   get_my_learning_assessment_answers(attempt_id)
--
-- Does NOT:
--   grade / score / evaluate correctness
--   read answer keys
--   submit / complete attempts
--   mutate progress / certificates
--   add background expiry jobs
--   create a second attempts/answers system
-- =============================================================================

-- Persist (upsert) a learner answer for one snapshotted question on the caller's
-- own active attempt. Delegates to save_learning_attempt_answer (ownership,
-- active-only after lazy expiry, snapshot membership, structural validation,
-- idempotent upsert, server timestamps).
create or replace function public.save_my_learning_assessment_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_answer jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_saved jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null or p_question_id is null then
    raise exception 'attempt_id and question_id are required';
  end if;

  if p_answer is null or jsonb_typeof(p_answer) is distinct from 'object' then
    raise exception 'answer must be a JSON object';
  end if;

  -- Reject client-injected authoritative / scoring / correctness keys.
  if p_answer ? 'user_id'
     or p_answer ? 'learner_id'
     or p_answer ? 'attempt_id'
     or p_answer ? 'question_id'
     or p_answer ? 'status'
     or p_answer ? 'score'
     or p_answer ? 'points'
     or p_answer ? 'points_earned'
     or p_answer ? 'correct'
     or p_answer ? 'correct_key'
     or p_answer ? 'correct_keys'
     or p_answer ? 'is_correct'
     or p_answer ? 'answer_key'
     or p_answer ? 'grading'
     or p_answer ? 'graded'
     or p_answer ? 'created_by'
     or p_answer ? 'owner_id'
  then
    raise exception 'answer contains forbidden authoritative fields';
  end if;

  v_saved := public.save_learning_attempt_answer(
    p_attempt_id,
    p_question_id,
    p_answer
  );

  return jsonb_build_object(
    'attempt_id', v_saved -> 'attempt_id',
    'question_id', v_saved -> 'question_id',
    'saved', v_saved -> 'saved',
    'first_answered_at', v_saved -> 'first_answered_at',
    'last_saved_at', v_saved -> 'last_saved_at'
  );
end;
$$;

comment on function public.save_my_learning_assessment_answer(uuid, uuid, jsonb) is
  'Assessment Answer Persistence V1 — upsert learner answer via save_learning_attempt_answer. Owner + active attempt only; question must be in snapshot; structural validation only; NEVER keys/correctness/scores. Idempotent per (attempt, question).';

-- Read the caller's saved answers for their own attempt.
-- Does NOT call expire_if_due (no automatic expiration mutation on read).
-- NEVER returns answer keys, scores, or correctness.
create or replace function public.get_my_learning_assessment_answers(
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
  v_answers jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  -- Read-only: no FOR UPDATE / no expire_if_due mutation.
  select * into v_attempt
  from public.learning_attempts
  where id = p_attempt_id;

  if not found then
    raise exception 'Learning attempt not found';
  end if;

  if v_attempt.user_id is distinct from v_uid then
    raise exception 'Not allowed to read answers for this attempt';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question_id', ans.question_id,
        'answer_payload', ans.answer_payload,
        'first_answered_at', ans.first_answered_at,
        'last_saved_at', ans.last_saved_at
      )
      order by ans.first_answered_at, ans.question_id
    ),
    '[]'::jsonb
  ) into v_answers
  from public.learning_attempt_answers ans
  where ans.attempt_id = p_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'activity_id', v_attempt.activity_id,
    'status', v_attempt.status,
    'answers', v_answers,
    'answer_count', jsonb_array_length(v_answers)
  );
end;
$$;

comment on function public.get_my_learning_assessment_answers(uuid) is
  'Assessment Answer Persistence V1 — owner read of saved learner answers only. No expire mutation, no keys, no scores, no correctness.';

revoke all on function public.save_my_learning_assessment_answer(uuid, uuid, jsonb)
  from public, anon;
grant execute on function public.save_my_learning_assessment_answer(uuid, uuid, jsonb)
  to authenticated;
grant execute on function public.save_my_learning_assessment_answer(uuid, uuid, jsonb)
  to service_role;

revoke all on function public.get_my_learning_assessment_answers(uuid)
  from public, anon;
grant execute on function public.get_my_learning_assessment_answers(uuid)
  to authenticated;
grant execute on function public.get_my_learning_assessment_answers(uuid)
  to service_role;
