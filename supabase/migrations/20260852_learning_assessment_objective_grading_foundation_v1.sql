-- =============================================================================
-- UM Learning OS — Assessment Objective Grading Foundation V1
-- Migration: 20260852_learning_assessment_objective_grading_foundation_v1.sql
--
-- Depends on:
--   20260838 Attempts (snapshot, answers, expire_if_due)
--   20260839 Scoring (result tables, learning_scoring_evaluate_answer)
--   20260841 Learner Result Delivery (shared apply helper — NOT called here)
--   20260851 Assessment Submission
--
-- Reuses:
--   learning_attempt_results / learning_attempt_answer_results
--   learning_question_answer_keys (SECURITY DEFINER read only)
--   learning_scoring_evaluate_answer for OBJECTIVE types only
--
-- Extends result tables minimally for:
--   grading_status lifecycle (partially_graded / graded / grading_failed)
--   objective vs pending-manual score breakdown
--   per-question result_state (pending_manual_review, not_answered, …)
--
-- Does NOT:
--   call progress / certificate / reward / analytics mutations
--   auto-grade short_answer or fill_blank (pending_manual_review)
--   return answer keys or expected answers
--   mutate learner answer payloads
--   require staff role (owner may grade own submitted attempt)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Minimal schema extensions on existing result tables
-- ---------------------------------------------------------------------------

alter table public.learning_attempt_results
  drop constraint if exists learning_attempt_results_status_check;

alter table public.learning_attempt_results
  add constraint learning_attempt_results_status_check check (
    status in ('scored', 'partially_graded', 'graded', 'grading_failed')
  );

comment on column public.learning_attempt_results.status is
  'scored = legacy staff auto-score (20260839/41); partially_graded = objective done with pending manual; graded = assessment objective path fully resolved (no pending manual); grading_failed = failed closed without trusted final score.';

alter table public.learning_attempt_results
  add column if not exists objective_points_earned numeric
    constraint learning_attempt_results_objective_earned_non_negative
      check (objective_points_earned is null or objective_points_earned >= 0);

alter table public.learning_attempt_results
  add column if not exists objective_points_possible numeric
    constraint learning_attempt_results_objective_possible_non_negative
      check (objective_points_possible is null or objective_points_possible >= 0);

alter table public.learning_attempt_results
  add column if not exists pending_manual_points numeric
    constraint learning_attempt_results_pending_manual_non_negative
      check (pending_manual_points is null or pending_manual_points >= 0);

alter table public.learning_attempt_results
  add column if not exists has_pending_manual_review boolean;

alter table public.learning_attempt_answer_results
  alter column is_correct drop not null;

alter table public.learning_attempt_answer_results
  add column if not exists result_state text;

-- Backfill legacy staff rows (is_correct was always set).
update public.learning_attempt_answer_results
set result_state = case
  when is_correct is true then 'correct'
  when is_correct is false then 'incorrect'
  else 'grading_error'
end
where result_state is null;

alter table public.learning_attempt_answer_results
  alter column result_state set default 'incorrect';

alter table public.learning_attempt_answer_results
  alter column result_state set not null;

alter table public.learning_attempt_answer_results
  drop constraint if exists learning_attempt_answer_results_result_state_check;

alter table public.learning_attempt_answer_results
  add constraint learning_attempt_answer_results_result_state_check check (
    result_state in (
      'correct',
      'incorrect',
      'pending_manual_review',
      'not_answered',
      'unsupported',
      'grading_error'
    )
  );

comment on column public.learning_attempt_answer_results.result_state is
  'Assessment Objective Grading V1 per-question state. Legacy scored rows map correct/incorrect. pending_manual_review never implies a final zero grade.';

comment on column public.learning_attempt_answer_results.is_correct is
  'true/false for objectively graded correctness; null for pending_manual_review / unsupported / grading_error (and may be false for not_answered).';

-- ---------------------------------------------------------------------------
-- 2) Internal helpers (revoked from clients)
-- ---------------------------------------------------------------------------

-- Objective types graded automatically in this foundation.
create or replace function public.learning_assessment_is_objective_type(
  p_question_type text
)
returns boolean
language sql
immutable
security definer
set search_path = public
as $$
  select p_question_type in (
    'multiple_choice_single',
    'multiple_choice_multiple',
    'true_false',
    'numeric'
  );
$$;

-- Subjective types → pending_manual_review when answered (never auto-marked).
create or replace function public.learning_assessment_is_subjective_type(
  p_question_type text
)
returns boolean
language sql
immutable
security definer
set search_path = public
as $$
  select p_question_type in ('short_answer', 'fill_blank');
$$;

-- Fail-closed structural validation of objective answer keys (never returns key).
create or replace function public.learning_assessment_objective_key_is_valid(
  p_question_type text,
  p_answer_key jsonb
)
returns boolean
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  if p_answer_key is null or jsonb_typeof(p_answer_key) is distinct from 'object' then
    return false;
  end if;

  if p_question_type = 'multiple_choice_single' then
    return jsonb_typeof(p_answer_key -> 'correct_key') = 'string'
      and length(coalesce(p_answer_key ->> 'correct_key', '')) > 0;

  elsif p_question_type = 'multiple_choice_multiple' then
    return jsonb_typeof(p_answer_key -> 'correct_keys') = 'array';

  elsif p_question_type = 'true_false' then
    return jsonb_typeof(p_answer_key -> 'correct') = 'boolean';

  elsif p_question_type = 'numeric' then
    if jsonb_typeof(p_answer_key -> 'value') is distinct from 'number' then
      return false;
    end if;
    if p_answer_key ? 'tolerance'
       and jsonb_typeof(p_answer_key -> 'tolerance') is distinct from 'number'
    then
      return false;
    end if;
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.learning_assessment_is_objective_type(text)
  from public, anon, authenticated;
revoke all on function public.learning_assessment_is_subjective_type(text)
  from public, anon, authenticated;
revoke all on function public.learning_assessment_objective_key_is_valid(text, jsonb)
  from public, anon, authenticated;

-- Apply objective grading under an already-locked submitted attempt.
-- NEVER mutates learning_attempt_answers. NEVER returns keys.
-- NEVER calls progress/certificate helpers.
create or replace function public.learning_assessment_grade_apply_attempt(
  p_attempt_id uuid,
  p_graded_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.learning_attempts%rowtype;
  v_snap_elem jsonb;
  v_question_id uuid;
  v_question_type text;
  v_content jsonb;
  v_payload jsonb;
  v_answer_key jsonb;
  v_has_answer boolean;
  v_is_correct boolean;
  v_result_state text;
  v_points_possible numeric;
  v_points_earned numeric;
  v_feedback_code text;
  v_objective_earned numeric := 0;
  v_objective_possible numeric := 0;
  v_pending_manual numeric := 0;
  v_total_possible numeric := 0;
  v_has_pending boolean := false;
  v_status text;
  v_now timestamptz := now();
  v_question_results jsonb := '[]'::jsonb;
  v_objective_pct numeric;
  v_snap_count integer;
begin
  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  select * into v_attempt
  from public.learning_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception 'Learning attempt not found';
  end if;

  if v_attempt.status is distinct from 'submitted' then
    raise exception 'Attempt must be submitted to grade';
  end if;

  if jsonb_typeof(v_attempt.questions_snapshot) is distinct from 'array' then
    raise exception 'Attempt questions snapshot is malformed';
  end if;

  v_snap_count := jsonb_array_length(v_attempt.questions_snapshot);
  if v_snap_count < 1 then
    raise exception 'Attempt questions snapshot is malformed';
  end if;

  -- Fail-closed preflight: snapshot shape + objective keys.
  for v_snap_elem in
    select value
    from jsonb_array_elements(v_attempt.questions_snapshot) as t(value)
  loop
    if jsonb_typeof(v_snap_elem) is distinct from 'object' then
      raise exception 'Attempt questions snapshot is malformed';
    end if;

    begin
      v_question_id := nullif(v_snap_elem ->> 'question_id', '')::uuid;
    exception
      when others then
        raise exception 'Attempt questions snapshot is malformed';
    end;

    if v_question_id is null then
      raise exception 'Attempt questions snapshot is malformed';
    end if;

    v_question_type := v_snap_elem ->> 'question_type';
    if v_question_type is null or length(v_question_type) = 0 then
      raise exception 'Attempt questions snapshot is malformed';
    end if;

    if not (v_snap_elem ? 'points') then
      raise exception 'Attempt questions snapshot is malformed';
    end if;

    if public.learning_assessment_is_objective_type(v_question_type) then
      select k.answer_key into v_answer_key
      from public.learning_question_answer_keys k
      where k.question_id = v_question_id;

      if not found then
        raise exception 'Answer key missing for one or more objective questions';
      end if;

      if not public.learning_assessment_objective_key_is_valid(
        v_question_type,
        v_answer_key
      ) then
        raise exception 'Answer key is malformed for one or more objective questions';
      end if;
    end if;
  end loop;

  -- Replace prior per-question results atomically (idempotent re-grade).
  delete from public.learning_attempt_answer_results
  where attempt_id = p_attempt_id;

  for v_snap_elem in
    select value
    from jsonb_array_elements(v_attempt.questions_snapshot)
      with ordinality as t(value, ord)
    order by ord
  loop
    v_question_id := (v_snap_elem ->> 'question_id')::uuid;
    v_question_type := v_snap_elem ->> 'question_type';
    v_content := v_snap_elem -> 'content';

    if jsonb_typeof(v_snap_elem -> 'points') = 'number' then
      v_points_possible := coalesce((v_snap_elem ->> 'points')::numeric, 0);
    else
      v_points_possible := 0;
    end if;
    if v_points_possible < 0 then
      raise exception 'Attempt questions snapshot is malformed';
    end if;

    v_total_possible := v_total_possible + v_points_possible;

    select a.answer_payload into v_payload
    from public.learning_attempt_answers a
    where a.attempt_id = p_attempt_id
      and a.question_id = v_question_id;

    v_has_answer := found
      and v_payload is not null
      and jsonb_typeof(v_payload) = 'object';

    v_is_correct := null;
    v_points_earned := 0;
    v_result_state := 'grading_error';
    v_feedback_code := 'RESULT_GRADING_ERROR';

    if not v_has_answer then
      -- Documented unanswered policy (objective + subjective).
      v_result_state := 'not_answered';
      v_is_correct := false;
      v_points_earned := 0;
      v_feedback_code := 'RESULT_NOT_ANSWERED';

      if public.learning_assessment_is_objective_type(v_question_type) then
        v_objective_possible := v_objective_possible + v_points_possible;
      elsif public.learning_assessment_is_subjective_type(v_question_type) then
        v_pending_manual := v_pending_manual + v_points_possible;
        v_has_pending := true;
      else
        v_result_state := 'unsupported';
        v_is_correct := null;
        v_feedback_code := 'RESULT_UNSUPPORTED';
        v_pending_manual := v_pending_manual + v_points_possible;
        v_has_pending := true;
      end if;

    elsif public.learning_assessment_is_objective_type(v_question_type) then
      v_objective_possible := v_objective_possible + v_points_possible;

      -- Structural validate against snapshot content (fail closed).
      begin
        perform public.learning_attempt_validate_answer(
          v_question_type,
          coalesce(v_content, '{}'::jsonb),
          v_payload
        );
      exception
        when others then
          raise exception 'Learner answer payload is malformed';
      end;

      select k.answer_key into v_answer_key
      from public.learning_question_answer_keys k
      where k.question_id = v_question_id;

      v_is_correct := public.learning_scoring_evaluate_answer(
        v_question_type,
        v_payload,
        v_answer_key
      );

      if v_is_correct then
        v_result_state := 'correct';
        v_points_earned := v_points_possible;
        v_feedback_code := 'RESULT_CORRECT';
      else
        v_result_state := 'incorrect';
        v_points_earned := 0;
        v_feedback_code := 'RESULT_INCORRECT';
      end if;

      v_objective_earned := v_objective_earned + v_points_earned;

    elsif public.learning_assessment_is_subjective_type(v_question_type) then
      -- Never auto-mark subjective; do not read keys for grading decisions.
      begin
        perform public.learning_attempt_validate_answer(
          v_question_type,
          coalesce(v_content, '{}'::jsonb),
          v_payload
        );
      exception
        when others then
          raise exception 'Learner answer payload is malformed';
      end;

      v_result_state := 'pending_manual_review';
      v_is_correct := null;
      v_points_earned := 0;
      v_feedback_code := 'RESULT_PENDING_MANUAL_REVIEW';
      v_pending_manual := v_pending_manual + v_points_possible;
      v_has_pending := true;

    else
      v_result_state := 'unsupported';
      v_is_correct := null;
      v_points_earned := 0;
      v_feedback_code := 'RESULT_UNSUPPORTED';
      v_pending_manual := v_pending_manual + v_points_possible;
      v_has_pending := true;
    end if;

    insert into public.learning_attempt_answer_results (
      attempt_id,
      question_id,
      is_correct,
      points_possible,
      points_earned,
      result_state
    ) values (
      p_attempt_id,
      v_question_id,
      v_is_correct,
      v_points_possible,
      v_points_earned,
      v_result_state
    );

    v_question_results := v_question_results || jsonb_build_array(
      jsonb_build_object(
        'question_id', v_question_id,
        'question_type', v_question_type,
        'result_state', v_result_state,
        'points_possible', v_points_possible,
        'points_earned', case
          when public.learning_assessment_is_objective_type(v_question_type)
               and v_result_state in ('correct', 'incorrect', 'not_answered')
            then v_points_earned
          else null
        end,
        'feedback_code', v_feedback_code
      )
    );
  end loop;

  if v_has_pending then
    v_status := 'partially_graded';
  else
    v_status := 'graded';
  end if;

  if v_objective_possible > 0 then
    v_objective_pct := round(
      (v_objective_earned / v_objective_possible) * 100,
      2
    );
  else
    v_objective_pct := null;
  end if;

  insert into public.learning_attempt_results (
    attempt_id,
    space_id,
    course_id,
    activity_id,
    user_id,
    status,
    score_earned,
    score_max,
    passed,
    max_score_snapshot,
    passing_score_snapshot,
    evaluation_mode_snapshot,
    scored_at,
    scored_by,
    objective_points_earned,
    objective_points_possible,
    pending_manual_points,
    has_pending_manual_review
  ) values (
    p_attempt_id,
    v_attempt.space_id,
    v_attempt.course_id,
    v_attempt.activity_id,
    v_attempt.user_id,
    v_status,
    v_objective_earned,
    v_total_possible,
    null,
    null,
    null,
    'auto',
    v_now,
    p_graded_by,
    v_objective_earned,
    v_objective_possible,
    v_pending_manual,
    v_has_pending
  )
  on conflict (attempt_id) do update
  set status = excluded.status,
      score_earned = excluded.score_earned,
      score_max = excluded.score_max,
      passed = null,
      max_score_snapshot = excluded.max_score_snapshot,
      passing_score_snapshot = excluded.passing_score_snapshot,
      evaluation_mode_snapshot = excluded.evaluation_mode_snapshot,
      scored_at = excluded.scored_at,
      scored_by = excluded.scored_by,
      objective_points_earned = excluded.objective_points_earned,
      objective_points_possible = excluded.objective_points_possible,
      pending_manual_points = excluded.pending_manual_points,
      has_pending_manual_review = excluded.has_pending_manual_review,
      updated_at = now();

  perform public.learning_audit_write(
    p_graded_by,
    v_attempt.space_id,
    'attempt.assessment_grade',
    'learning_attempt',
    p_attempt_id::text,
    jsonb_build_object(
      'attempt_id', p_attempt_id,
      'activity_id', v_attempt.activity_id,
      'course_id', v_attempt.course_id,
      'grading_status', v_status,
      'objective_points_earned', v_objective_earned,
      'objective_points_possible', v_objective_possible,
      'pending_manual_points', v_pending_manual,
      'has_pending_manual_review', v_has_pending
    )
  );

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'activity_id', v_attempt.activity_id,
    'grading_status', v_status,
    'graded_at', v_now,
    'objective_points_earned', v_objective_earned,
    'objective_points_possible', v_objective_possible,
    'pending_manual_points', v_pending_manual,
    'total_points_possible', v_total_possible,
    'objective_percentage', v_objective_pct,
    'has_pending_manual_review', v_has_pending,
    'is_final', not v_has_pending,
    'question_results', v_question_results
  );
end;
$$;

revoke all on function public.learning_assessment_grade_apply_attempt(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.learning_assessment_grade_apply_attempt(uuid, uuid)
  to service_role;

comment on function public.learning_assessment_grade_apply_attempt(uuid, uuid) is
  'Internal Assessment Objective Grading V1 apply. Objective exact-match only; subjective → pending_manual_review. Never returns keys. Never mutates answers/progress/certificates.';

-- ---------------------------------------------------------------------------
-- 3) Learner-facing RPCs
-- ---------------------------------------------------------------------------

create or replace function public.grade_my_learning_assessment_attempt(
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
  v_existing public.learning_attempt_results%rowtype;
  v_out jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  -- Lazy expire + FOR UPDATE (serializes concurrent grade / lifecycle ops).
  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  if v_attempt.user_id is distinct from v_uid then
    raise exception 'Not allowed to grade this attempt';
  end if;

  if v_attempt.status is distinct from 'submitted' then
    raise exception 'Attempt is % and cannot be graded', v_attempt.status;
  end if;

  -- Idempotent: if already graded/partially_graded by assessment path, rebuild
  -- deterministically via apply (same inputs → same outputs). Concurrent callers
  -- serialize on the attempt row lock held through expire_if_due.

  begin
    v_out := public.learning_assessment_grade_apply_attempt(p_attempt_id, v_uid);
  exception
    when others then
      -- Persist grading_failed without a trusted score when apply fails after lock.
      -- If apply failed before writes, still record failure state when possible.
      begin
        select * into v_existing
        from public.learning_attempt_results
        where attempt_id = p_attempt_id;

        if found then
          update public.learning_attempt_results
          set status = 'grading_failed',
              passed = null,
              has_pending_manual_review = coalesce(has_pending_manual_review, false),
              updated_at = now()
          where attempt_id = p_attempt_id;
        else
          insert into public.learning_attempt_results (
            attempt_id,
            space_id,
            course_id,
            activity_id,
            user_id,
            status,
            score_earned,
            score_max,
            passed,
            evaluation_mode_snapshot,
            scored_at,
            scored_by,
            objective_points_earned,
            objective_points_possible,
            pending_manual_points,
            has_pending_manual_review
          ) values (
            p_attempt_id,
            v_attempt.space_id,
            v_attempt.course_id,
            v_attempt.activity_id,
            v_attempt.user_id,
            'grading_failed',
            0,
            0,
            null,
            'auto',
            now(),
            v_uid,
            0,
            0,
            0,
            false
          );
        end if;
      exception
        when others then
          null;
      end;
      raise;
  end;

  return v_out;
end;
$$;

comment on function public.grade_my_learning_assessment_attempt(uuid) is
  'Assessment Objective Grading V1 — owner grades own submitted attempt. Objective types via evaluate_answer; subjective pending_manual_review. Never returns keys. No progress mutation.';

create or replace function public.get_my_learning_assessment_grade(
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
  v_questions jsonb;
  v_qres jsonb := '[]'::jsonb;
  v_elem jsonb;
  v_qid uuid;
  v_qtype text;
  v_ar public.learning_attempt_answer_results%rowtype;
  v_feedback text;
  v_points_earned numeric;
  v_objective_pct numeric;
  v_has_pending boolean;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  if v_attempt.user_id is distinct from v_uid then
    raise exception 'Not allowed to read this grade';
  end if;

  select * into v_result
  from public.learning_attempt_results
  where attempt_id = p_attempt_id;

  if not found then
    return jsonb_build_object(
      'attempt_id', p_attempt_id,
      'activity_id', v_attempt.activity_id,
      'grading_status', 'not_graded',
      'graded_at', null,
      'objective_points_earned', null,
      'objective_points_possible', null,
      'pending_manual_points', null,
      'total_points_possible', null,
      'objective_percentage', null,
      'has_pending_manual_review', false,
      'is_final', false,
      'question_results', '[]'::jsonb
    );
  end if;

  if jsonb_typeof(v_attempt.questions_snapshot) is distinct from 'array' then
    raise exception 'Attempt questions snapshot is malformed';
  end if;

  v_questions := v_attempt.questions_snapshot;
  v_has_pending := coalesce(v_result.has_pending_manual_review, false);

  for v_elem in
    select value
    from jsonb_array_elements(v_questions) with ordinality as t(value, ord)
    order by ord
  loop
    v_qid := (v_elem ->> 'question_id')::uuid;
    v_qtype := v_elem ->> 'question_type';

    select * into v_ar
    from public.learning_attempt_answer_results
    where attempt_id = p_attempt_id
      and question_id = v_qid;

    if not found then
      continue;
    end if;

    v_feedback := case v_ar.result_state
      when 'correct' then 'RESULT_CORRECT'
      when 'incorrect' then 'RESULT_INCORRECT'
      when 'pending_manual_review' then 'RESULT_PENDING_MANUAL_REVIEW'
      when 'not_answered' then 'RESULT_NOT_ANSWERED'
      when 'unsupported' then 'RESULT_UNSUPPORTED'
      else 'RESULT_GRADING_ERROR'
    end;

    if v_ar.result_state in ('correct', 'incorrect', 'not_answered')
       and public.learning_assessment_is_objective_type(v_qtype)
    then
      v_points_earned := v_ar.points_earned;
    else
      v_points_earned := null;
    end if;

    v_qres := v_qres || jsonb_build_array(
      jsonb_build_object(
        'question_id', v_qid,
        'question_type', v_qtype,
        'result_state', v_ar.result_state,
        'points_possible', v_ar.points_possible,
        'points_earned', v_points_earned,
        'feedback_code', v_feedback
      )
    );
  end loop;

  if coalesce(v_result.objective_points_possible, 0) > 0 then
    v_objective_pct := round(
      (
        coalesce(v_result.objective_points_earned, 0)
        / v_result.objective_points_possible
      ) * 100,
      2
    );
  else
    v_objective_pct := null;
  end if;

  return jsonb_build_object(
    'attempt_id', v_result.attempt_id,
    'activity_id', v_result.activity_id,
    'grading_status', v_result.status,
    'graded_at', v_result.scored_at,
    'objective_points_earned', v_result.objective_points_earned,
    'objective_points_possible', v_result.objective_points_possible,
    'pending_manual_points', v_result.pending_manual_points,
    'total_points_possible', v_result.score_max,
    'objective_percentage', v_objective_pct,
    'has_pending_manual_review', v_has_pending,
    'is_final', not v_has_pending and v_result.status in ('graded', 'scored'),
    'question_results', v_qres
  );
end;
$$;

comment on function public.get_my_learning_assessment_grade(uuid) is
  'Assessment Objective Grading V1 — owner read of learner-safe grade summary + per-question result_state. NEVER keys, expected answers, or staff notes.';

revoke all on function public.grade_my_learning_assessment_attempt(uuid)
  from public, anon;
grant execute on function public.grade_my_learning_assessment_attempt(uuid)
  to authenticated;
grant execute on function public.grade_my_learning_assessment_attempt(uuid)
  to service_role;

revoke all on function public.get_my_learning_assessment_grade(uuid)
  from public, anon;
grant execute on function public.get_my_learning_assessment_grade(uuid)
  to authenticated;
grant execute on function public.get_my_learning_assessment_grade(uuid)
  to service_role;
