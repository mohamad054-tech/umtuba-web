-- =============================================================================
-- UM Learning OS — Assessment Manual Review Foundation V1
-- Migration: 20260853_learning_assessment_manual_review_foundation_v1.sql
--
-- Depends on:
--   20260830 Courses (can_manage_learning_course — active staff / managers)
--   20260839 Scoring (result tables)
--   20260852 Assessment Objective Grading (pending_manual_review, objective totals)
--
-- Reuses learning_attempt_results / learning_attempt_answer_results.
-- Adds minimal reviewer/feedback/manual total columns + staff RPCs.
--
-- Does NOT:
--   mutate progress / certificates / rewards / analytics
--   override objective results
--   return answer keys
--   modify learner answer payloads
--   require service-role from application code
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Minimal schema extensions
-- ---------------------------------------------------------------------------

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
      'grading_error',
      'manually_reviewed'
    )
  );

alter table public.learning_attempt_answer_results
  add column if not exists reviewer_user_id uuid
    references public.profiles (id) on delete set null;

alter table public.learning_attempt_answer_results
  add column if not exists reviewed_at timestamptz;

alter table public.learning_attempt_answer_results
  add column if not exists learner_feedback text
    constraint learning_attempt_answer_results_learner_feedback_len
      check (
        learner_feedback is null
        or char_length(learner_feedback) <= 2000
      );

alter table public.learning_attempt_results
  add column if not exists manual_points_earned numeric
    constraint learning_attempt_results_manual_earned_non_negative
      check (manual_points_earned is null or manual_points_earned >= 0);

alter table public.learning_attempt_results
  add column if not exists final_percentage numeric
    constraint learning_attempt_results_final_percentage_range
      check (
        final_percentage is null
        or (final_percentage >= 0 and final_percentage <= 100)
      );

comment on column public.learning_attempt_answer_results.learner_feedback is
  'Optional learner-visible feedback from manual review. Never stores answer keys or hidden staff notes.';

comment on column public.learning_attempt_answer_results.reviewer_user_id is
  'Server-set reviewer identity (auth.uid() of authorized staff). Never client-supplied.';

-- ---------------------------------------------------------------------------
-- 2) Internal helpers
-- ---------------------------------------------------------------------------

create or replace function public.learning_assessment_is_manual_review_type(
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

revoke all on function public.learning_assessment_is_manual_review_type(text)
  from public, anon, authenticated;

-- Recalculate attempt result totals from per-question rows under lock.
-- Caller must hold FOR UPDATE on the attempt (and typically the result row).
create or replace function public.learning_assessment_recalculate_manual_review_totals(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.learning_attempts%rowtype;
  v_settings public.learning_activity_settings%rowtype;
  v_snap_elem jsonb;
  v_qid uuid;
  v_qtype text;
  v_ar public.learning_attempt_answer_results%rowtype;
  v_objective_earned numeric := 0;
  v_objective_possible numeric := 0;
  v_manual_earned numeric := 0;
  v_pending_manual numeric := 0;
  v_total_possible numeric := 0;
  v_total_earned numeric := 0;
  v_pending_count integer := 0;
  v_has_pending boolean := false;
  v_status text;
  v_passed boolean := null;
  v_final_pct numeric := null;
  v_now timestamptz := now();
  v_passing numeric;
begin
  select * into v_attempt
  from public.learning_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception 'Learning attempt not found';
  end if;

  if jsonb_typeof(v_attempt.questions_snapshot) is distinct from 'array' then
    raise exception 'Attempt questions snapshot is malformed';
  end if;

  for v_snap_elem in
    select value
    from jsonb_array_elements(v_attempt.questions_snapshot)
      with ordinality as t(value, ord)
    order by ord
  loop
    if jsonb_typeof(v_snap_elem) is distinct from 'object' then
      raise exception 'Attempt questions snapshot is malformed';
    end if;

    begin
      v_qid := nullif(v_snap_elem ->> 'question_id', '')::uuid;
    exception
      when others then
        raise exception 'Attempt questions snapshot is malformed';
    end;

    if v_qid is null then
      raise exception 'Attempt questions snapshot is malformed';
    end if;

    v_qtype := v_snap_elem ->> 'question_type';

    select * into v_ar
    from public.learning_attempt_answer_results
    where attempt_id = p_attempt_id
      and question_id = v_qid;

    if not found then
      raise exception 'Attempt answer result record is malformed';
    end if;

    v_total_possible := v_total_possible + v_ar.points_possible;

    if public.learning_assessment_is_objective_type(v_qtype) then
      v_objective_possible := v_objective_possible + v_ar.points_possible;
      if v_ar.result_state in ('correct', 'incorrect', 'not_answered') then
        v_objective_earned := v_objective_earned + coalesce(v_ar.points_earned, 0);
      end if;
    elsif public.learning_assessment_is_manual_review_type(v_qtype) then
      if v_ar.result_state = 'pending_manual_review' then
        v_pending_count := v_pending_count + 1;
        v_pending_manual := v_pending_manual + v_ar.points_possible;
      elsif v_ar.result_state = 'manually_reviewed' then
        v_manual_earned := v_manual_earned + coalesce(v_ar.points_earned, 0);
      elsif v_ar.result_state = 'not_answered' then
        -- Unanswered subjective already resolved at 0; does not block finalization.
        null;
      end if;
    end if;
  end loop;

  v_total_earned := v_objective_earned + v_manual_earned;
  v_has_pending := v_pending_count > 0;

  if v_has_pending then
    v_status := 'partially_graded';
    v_passed := null;
    v_final_pct := null;
  else
    v_status := 'graded';
    if v_total_possible > 0 then
      v_final_pct := round((v_total_earned / v_total_possible) * 100, 2);
    else
      v_final_pct := null;
    end if;

    select * into v_settings
    from public.learning_activity_settings
    where activity_id = v_attempt.activity_id;

    if found and v_settings.passing_score is not null then
      v_passing := v_settings.passing_score;
      v_passed := v_total_earned >= v_passing;
    else
      v_passing := null;
      v_passed := null;
    end if;
  end if;

  update public.learning_attempt_results
  set status = v_status,
      score_earned = v_total_earned,
      score_max = v_total_possible,
      passed = v_passed,
      passing_score_snapshot = case
        when v_has_pending then passing_score_snapshot
        else v_passing
      end,
      objective_points_earned = v_objective_earned,
      objective_points_possible = v_objective_possible,
      pending_manual_points = v_pending_manual,
      has_pending_manual_review = v_has_pending,
      manual_points_earned = v_manual_earned,
      final_percentage = v_final_pct,
      scored_at = case when not v_has_pending then v_now else scored_at end,
      updated_at = v_now
  where attempt_id = p_attempt_id;

  if not found then
    raise exception 'Learning attempt result not found';
  end if;

  return jsonb_build_object(
    'grading_status', v_status,
    'objective_points_earned', v_objective_earned,
    'objective_points_possible', v_objective_possible,
    'manual_points_earned', v_manual_earned,
    'pending_manual_points', v_pending_manual,
    'total_points_earned', v_total_earned,
    'total_points_possible', v_total_possible,
    'final_percentage', v_final_pct,
    'passed', v_passed,
    'has_pending_manual_review', v_has_pending,
    'graded_at', case when not v_has_pending then v_now else null end
  );
end;
$$;

revoke all on function public.learning_assessment_recalculate_manual_review_totals(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Staff RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_learning_assessment_manual_review_queue(
  p_course_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_items jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_course_id is null then
    raise exception 'course_id is required';
  end if;

  if not (
    public.can_manage_learning_course(p_course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to review assessments for this course';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'attempt_id', a.id,
        'activity_id', a.activity_id,
        'learner_user_id', a.user_id,
        'submitted_at', a.submitted_at,
        'grading_status', r.status,
        'pending_question_count', (
          select count(*)::integer
          from public.learning_attempt_answer_results ar
          where ar.attempt_id = a.id
            and ar.result_state = 'pending_manual_review'
        ),
        'pending_manual_points', r.pending_manual_points
      )
      order by a.submitted_at nulls last, a.id
    ),
    '[]'::jsonb
  ) into v_items
  from public.learning_attempts a
  join public.learning_attempt_results r
    on r.attempt_id = a.id
  where a.course_id = p_course_id
    and a.status = 'submitted'
    and r.status = 'partially_graded'
    and coalesce(r.has_pending_manual_review, false) = true
    and exists (
      select 1
      from public.learning_attempt_answer_results ar
      where ar.attempt_id = a.id
        and ar.result_state = 'pending_manual_review'
    );

  return jsonb_build_object(
    'course_id', p_course_id,
    'items', v_items,
    'item_count', jsonb_array_length(v_items)
  );
end;
$$;

comment on function public.get_learning_assessment_manual_review_queue(uuid) is
  'Assessment Manual Review V1 — staff queue of partially_graded attempts with pending_manual_review. Auth via can_manage_learning_course / platform admin. Never returns keys.';

create or replace function public.get_learning_assessment_attempt_for_review(
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
  v_questions jsonb := '[]'::jsonb;
  v_elem jsonb;
  v_qid uuid;
  v_qtype text;
  v_content jsonb;
  v_points numeric;
  v_ar public.learning_attempt_answer_results%rowtype;
  v_payload jsonb;
  v_prompt text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  if not (
    public.can_manage_learning_course(v_attempt.course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to review this attempt';
  end if;

  if v_attempt.status is distinct from 'submitted' then
    raise exception 'Attempt is % and cannot be reviewed', v_attempt.status;
  end if;

  select * into v_result
  from public.learning_attempt_results
  where attempt_id = p_attempt_id;

  if not found then
    raise exception 'Learning attempt result not found';
  end if;

  if jsonb_typeof(v_attempt.questions_snapshot) is distinct from 'array' then
    raise exception 'Attempt questions snapshot is malformed';
  end if;

  for v_elem in
    select value
    from jsonb_array_elements(v_attempt.questions_snapshot)
      with ordinality as t(value, ord)
    order by ord
  loop
    v_qid := (v_elem ->> 'question_id')::uuid;
    v_qtype := v_elem ->> 'question_type';

    if not public.learning_assessment_is_manual_review_type(v_qtype) then
      continue;
    end if;

    select * into v_ar
    from public.learning_attempt_answer_results
    where attempt_id = p_attempt_id
      and question_id = v_qid;

    if not found then
      continue;
    end if;

    -- Staff review surface: pending + already manually reviewed (for correction).
    if v_ar.result_state not in ('pending_manual_review', 'manually_reviewed') then
      continue;
    end if;

    v_content := v_elem -> 'content';
    if jsonb_typeof(v_elem -> 'points') = 'number' then
      v_points := coalesce((v_elem ->> 'points')::numeric, v_ar.points_possible);
    else
      v_points := v_ar.points_possible;
    end if;

    select a.answer_payload into v_payload
    from public.learning_attempt_answers a
    where a.attempt_id = p_attempt_id
      and a.question_id = v_qid;

    if jsonb_typeof(v_content) = 'object' then
      v_prompt := v_content ->> 'prompt';
    else
      v_prompt := null;
    end if;

    v_questions := v_questions || jsonb_build_array(
      jsonb_build_object(
        'question_id', v_qid,
        'question_type', v_qtype,
        'prompt', v_prompt,
        'points_possible', v_points,
        'result_state', v_ar.result_state,
        'points_earned', v_ar.points_earned,
        'learner_feedback', v_ar.learner_feedback,
        'reviewed_at', v_ar.reviewed_at,
        'learner_answer', v_payload
      )
    );
  end loop;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'activity_id', v_attempt.activity_id,
    'course_id', v_attempt.course_id,
    'learner_user_id', v_attempt.user_id,
    'attempt_status', v_attempt.status,
    'submitted_at', v_attempt.submitted_at,
    'grading_status', v_result.status,
    'has_pending_manual_review', coalesce(v_result.has_pending_manual_review, false),
    'objective_points_earned', v_result.objective_points_earned,
    'objective_points_possible', v_result.objective_points_possible,
    'manual_points_earned', v_result.manual_points_earned,
    'pending_manual_points', v_result.pending_manual_points,
    'total_points_earned', v_result.score_earned,
    'total_points_possible', v_result.score_max,
    'questions', v_questions
  );
end;
$$;

comment on function public.get_learning_assessment_attempt_for_review(uuid) is
  'Assessment Manual Review V1 — staff read of subjective pending/reviewed answers for one submitted attempt. Shows learner answers + prompts. NEVER answer keys.';

create or replace function public.review_learning_assessment_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_points_earned numeric,
  p_feedback text default null
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
  v_ar public.learning_attempt_answer_results%rowtype;
  v_snap_elem jsonb;
  v_qtype text;
  v_found boolean := false;
  v_feedback text;
  v_now timestamptz := now();
  v_is_correct boolean;
  v_totals jsonb;
  v_identical boolean;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null or p_question_id is null then
    raise exception 'attempt_id and question_id are required';
  end if;

  if p_points_earned is null then
    raise exception 'points_earned is required';
  end if;

  if p_points_earned < 0 then
    raise exception 'points_earned cannot be negative';
  end if;

  -- Lock attempt (lazy expire) then result row.
  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  if not (
    public.can_manage_learning_course(v_attempt.course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to review this attempt';
  end if;

  if v_attempt.status is distinct from 'submitted' then
    raise exception 'Attempt is % and cannot be reviewed', v_attempt.status;
  end if;

  select * into v_result
  from public.learning_attempt_results
  where attempt_id = p_attempt_id
  for update;

  if not found then
    raise exception 'Learning attempt result not found';
  end if;

  if jsonb_typeof(v_attempt.questions_snapshot) is distinct from 'array' then
    raise exception 'Attempt questions snapshot is malformed';
  end if;

  for v_snap_elem in
    select value from jsonb_array_elements(v_attempt.questions_snapshot) as t(value)
  loop
    if (v_snap_elem ->> 'question_id')::uuid is not distinct from p_question_id then
      v_found := true;
      v_qtype := v_snap_elem ->> 'question_type';
      exit;
    end if;
  end loop;

  if not v_found then
    raise exception 'Question is not part of this attempt';
  end if;

  if not public.learning_assessment_is_manual_review_type(v_qtype) then
    raise exception 'Objective questions cannot be manually reviewed';
  end if;

  select * into v_ar
  from public.learning_attempt_answer_results
  where attempt_id = p_attempt_id
    and question_id = p_question_id
  for update;

  if not found then
    raise exception 'Attempt answer result record is malformed';
  end if;

  if p_points_earned > v_ar.points_possible then
    raise exception 'points_earned cannot exceed points_possible';
  end if;

  -- Feedback: optional, bounded, safe text. No hidden staff notes field in V1.
  if p_feedback is null or btrim(p_feedback) = '' then
    v_feedback := null;
  else
    if char_length(p_feedback) > 2000 then
      raise exception 'feedback exceeds maximum length';
    end if;
    perform public.learning_attempt_assert_safe_text('feedback', p_feedback);
    v_feedback := p_feedback;
  end if;

  v_identical :=
    v_ar.result_state = 'manually_reviewed'
    and v_ar.points_earned is not distinct from p_points_earned
    and v_ar.learner_feedback is not distinct from v_feedback;

  if v_result.status = 'graded' then
    if v_identical then
      return jsonb_build_object(
        'attempt_id', p_attempt_id,
        'question_id', p_question_id,
        'result_state', v_ar.result_state,
        'points_earned', v_ar.points_earned,
        'points_possible', v_ar.points_possible,
        'learner_feedback', v_ar.learner_feedback,
        'reviewed_at', v_ar.reviewed_at,
        'idempotent', true,
        'grading_status', v_result.status,
        'totals', jsonb_build_object(
          'objective_points_earned', v_result.objective_points_earned,
          'manual_points_earned', v_result.manual_points_earned,
          'total_points_earned', v_result.score_earned,
          'total_points_possible', v_result.score_max,
          'final_percentage', v_result.final_percentage,
          'passed', v_result.passed,
          'has_pending_manual_review', v_result.has_pending_manual_review
        )
      );
    end if;
    raise exception 'Attempt grading is finalized and cannot be changed';
  end if;

  if v_ar.result_state not in ('pending_manual_review', 'manually_reviewed') then
    raise exception 'Question is not pending manual review';
  end if;

  if v_identical then
    v_totals := public.learning_assessment_recalculate_manual_review_totals(p_attempt_id);
    return jsonb_build_object(
      'attempt_id', p_attempt_id,
      'question_id', p_question_id,
      'result_state', 'manually_reviewed',
      'points_earned', p_points_earned,
      'points_possible', v_ar.points_possible,
      'learner_feedback', v_feedback,
      'reviewed_at', v_ar.reviewed_at,
      'idempotent', true,
      'grading_status', v_totals ->> 'grading_status',
      'totals', v_totals
    );
  end if;

  if p_points_earned = v_ar.points_possible then
    v_is_correct := true;
  elsif p_points_earned = 0 then
    v_is_correct := false;
  else
    v_is_correct := null;
  end if;

  update public.learning_attempt_answer_results
  set result_state = 'manually_reviewed',
      points_earned = p_points_earned,
      is_correct = v_is_correct,
      reviewer_user_id = v_uid,
      reviewed_at = v_now,
      learner_feedback = v_feedback,
      updated_at = v_now
  where attempt_id = p_attempt_id
    and question_id = p_question_id;

  -- NEVER touch learning_attempt_answers.

  v_totals := public.learning_assessment_recalculate_manual_review_totals(p_attempt_id);

  update public.learning_attempt_results
  set scored_by = v_uid,
      updated_at = v_now
  where attempt_id = p_attempt_id;

  perform public.learning_audit_write(
    v_uid,
    v_attempt.space_id,
    'attempt.manual_review',
    'learning_attempt',
    p_attempt_id::text,
    jsonb_build_object(
      'attempt_id', p_attempt_id,
      'question_id', p_question_id,
      'points_earned', p_points_earned,
      'points_possible', v_ar.points_possible,
      'grading_status', v_totals ->> 'grading_status',
      'has_feedback', v_feedback is not null
    )
  );

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'question_id', p_question_id,
    'result_state', 'manually_reviewed',
    'points_earned', p_points_earned,
    'points_possible', v_ar.points_possible,
    'learner_feedback', v_feedback,
    'reviewed_at', v_now,
    'idempotent', false,
    'grading_status', v_totals ->> 'grading_status',
    'totals', v_totals
  );
end;
$$;

comment on function public.review_learning_assessment_answer(uuid, uuid, numeric, text) is
  'Assessment Manual Review V1 — staff assign points to pending/manual subjective answers. Recalculates totals; finalizes when no pending remain. Never overrides objective results. Never returns keys. No progress mutation.';

-- ---------------------------------------------------------------------------
-- 4) Extend learner grade read for manual feedback + finals
-- ---------------------------------------------------------------------------

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
      'manual_points_earned', null,
      'pending_manual_points', null,
      'total_points_earned', null,
      'total_points_possible', null,
      'objective_percentage', null,
      'final_percentage', null,
      'passed', null,
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
      when 'manually_reviewed' then 'RESULT_MANUALLY_REVIEWED'
      when 'not_answered' then 'RESULT_NOT_ANSWERED'
      when 'unsupported' then 'RESULT_UNSUPPORTED'
      else 'RESULT_GRADING_ERROR'
    end;

    if (
         public.learning_assessment_is_objective_type(v_qtype)
         and v_ar.result_state in ('correct', 'incorrect', 'not_answered')
       )
       or v_ar.result_state = 'manually_reviewed'
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
        'feedback_code', v_feedback,
        'learner_feedback', v_ar.learner_feedback
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
    'manual_points_earned', v_result.manual_points_earned,
    'pending_manual_points', v_result.pending_manual_points,
    'total_points_earned', v_result.score_earned,
    'total_points_possible', v_result.score_max,
    'objective_percentage', v_objective_pct,
    'final_percentage', v_result.final_percentage,
    'passed', v_result.passed,
    'has_pending_manual_review', v_has_pending,
    'is_final', not v_has_pending and v_result.status in ('graded', 'scored'),
    'question_results', v_qres
  );
end;
$$;

comment on function public.get_my_learning_assessment_grade(uuid) is
  'Assessment grade read (objective + manual review). Owner-only learner-safe summary with optional learner_feedback. NEVER keys, expected answers, or reviewer-private notes.';

-- ---------------------------------------------------------------------------
-- 5) Grants
-- ---------------------------------------------------------------------------

revoke all on function public.get_learning_assessment_manual_review_queue(uuid)
  from public, anon;
grant execute on function public.get_learning_assessment_manual_review_queue(uuid)
  to authenticated;
grant execute on function public.get_learning_assessment_manual_review_queue(uuid)
  to service_role;

revoke all on function public.get_learning_assessment_attempt_for_review(uuid)
  from public, anon;
grant execute on function public.get_learning_assessment_attempt_for_review(uuid)
  to authenticated;
grant execute on function public.get_learning_assessment_attempt_for_review(uuid)
  to service_role;

revoke all on function public.review_learning_assessment_answer(uuid, uuid, numeric, text)
  from public, anon;
grant execute on function public.review_learning_assessment_answer(uuid, uuid, numeric, text)
  to authenticated;
grant execute on function public.review_learning_assessment_answer(uuid, uuid, numeric, text)
  to service_role;

-- get_my already granted in 20260852; re-assert.
revoke all on function public.get_my_learning_assessment_grade(uuid)
  from public, anon;
grant execute on function public.get_my_learning_assessment_grade(uuid)
  to authenticated;
grant execute on function public.get_my_learning_assessment_grade(uuid)
  to service_role;
