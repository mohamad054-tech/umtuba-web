-- UM Learning OS — Learner Result Delivery V1
-- Additive only. Does NOT edit migrations 20260828–20260840.
--
-- Depends on:
--   20260833 activities (show_result_policy, evaluation_mode)
--   20260834/35 entitlement (has_learning_course_access)
--   20260838 attempts (submit_learning_attempt, learning_attempt_expire_if_due)
--   20260839 scoring (result tables, evaluate helpers, score_learning_attempt)
--   20260840 read model hardening
--
-- Provides:
--   1. learning_scoring_apply_attempt_result — internal shared scorer (revoked)
--   2. Refactor score_learning_attempt to call the shared scorer (staff auth unchanged)
--   3. learning_scoring_try_auto_score_submitted_attempt — best-effort auto-score
--      after submit (revoked from clients; called only from submit path)
--   4. REPLACE submit_learning_attempt — lifecycle return unchanged; best-effort
--      auto-score when evaluation_mode = auto (failure leaves pending_score)
--   5. get_my_learning_attempt_result — learner-safe aggregate result RPC
--
-- Does NOT: learner SELECT on result tables; extend get_my_learning_attempt;
-- per-question learner results; after_close / manual release; Progress mutations;
-- grant learners EXECUTE on score_learning_attempt or internal helpers.

-- ---------------------------------------------------------------------------
-- 1) Shared apply helper (Scoring V1 algorithm — single source of truth)
-- ---------------------------------------------------------------------------
-- Caller must authorize. Requires attempt status = submitted and
-- evaluation_mode = auto. Idempotent re-score replaces answer results + upserts
-- attempt result. NEVER returns answer keys or answer payloads.
-- EXECUTE revoked from public/anon/authenticated.

create or replace function public.learning_scoring_apply_attempt_result(
  p_attempt_id uuid,
  p_scored_by uuid
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
  v_question_id uuid;
  v_question_type text;
  v_payload jsonb;
  v_answer_key jsonb;
  v_is_correct boolean;
  v_points_possible numeric;
  v_points_earned numeric;
  v_score_earned numeric := 0;
  v_score_max numeric := 0;
  v_passed boolean;
  v_now timestamptz := now();
  v_answer_results jsonb := '[]'::jsonb;
  v_missing_key boolean := false;
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
    raise exception 'Attempt must be submitted to score';
  end if;

  select * into v_settings
  from public.learning_activity_settings
  where activity_id = v_attempt.activity_id;

  if not found then
    raise exception 'Learning activity settings not found';
  end if;

  if v_settings.evaluation_mode is distinct from 'auto' then
    raise exception 'evaluation_mode must be auto';
  end if;

  if jsonb_typeof(v_attempt.questions_snapshot) is distinct from 'array' then
    raise exception 'questions_snapshot must be an array';
  end if;

  v_snap_count := jsonb_array_length(v_attempt.questions_snapshot);
  if v_snap_count < 1 then
    raise exception 'Attempt has no questions to score';
  end if;

  for v_snap_elem in
    select jsonb_array_elements(v_attempt.questions_snapshot)
  loop
    if not (v_snap_elem ? 'points') then
      raise exception
        'questions_snapshot is missing points; attempt is not scoreable';
    end if;
  end loop;

  for v_snap_elem in
    select jsonb_array_elements(v_attempt.questions_snapshot)
  loop
    v_question_id := (v_snap_elem ->> 'question_id')::uuid;
    if v_question_id is null then
      raise exception 'questions_snapshot element missing question_id';
    end if;
    if not exists (
      select 1
      from public.learning_question_answer_keys k
      where k.question_id = v_question_id
    ) then
      v_missing_key := true;
      exit;
    end if;
  end loop;

  if v_missing_key then
    raise exception 'Answer key missing for one or more questions';
  end if;

  delete from public.learning_attempt_answer_results
  where attempt_id = p_attempt_id;

  for v_snap_elem in
    select value
    from jsonb_array_elements(v_attempt.questions_snapshot) with ordinality as t(value, ord)
    order by ord
  loop
    v_question_id := (v_snap_elem ->> 'question_id')::uuid;
    v_question_type := v_snap_elem ->> 'question_type';

    if jsonb_typeof(v_snap_elem -> 'points') = 'null'
       or not (v_snap_elem ? 'points')
       or v_snap_elem -> 'points' is null
    then
      v_points_possible := 0;
    elsif jsonb_typeof(v_snap_elem -> 'points') = 'number' then
      v_points_possible := coalesce((v_snap_elem ->> 'points')::numeric, 0);
    else
      v_points_possible := 0;
    end if;

    select a.answer_payload into v_payload
    from public.learning_attempt_answers a
    where a.attempt_id = p_attempt_id
      and a.question_id = v_question_id;

    if not found then
      v_payload := null;
    end if;

    select k.answer_key into v_answer_key
    from public.learning_question_answer_keys k
    where k.question_id = v_question_id;

    v_is_correct := public.learning_scoring_evaluate_answer(
      v_question_type,
      v_payload,
      v_answer_key
    );

    if v_is_correct then
      v_points_earned := v_points_possible;
    else
      v_points_earned := 0;
    end if;

    insert into public.learning_attempt_answer_results (
      attempt_id,
      question_id,
      is_correct,
      points_possible,
      points_earned
    ) values (
      p_attempt_id,
      v_question_id,
      v_is_correct,
      v_points_possible,
      v_points_earned
    );

    v_score_earned := v_score_earned + v_points_earned;
    v_score_max := v_score_max + v_points_possible;

    v_answer_results := v_answer_results || jsonb_build_array(
      jsonb_build_object(
        'question_id', v_question_id,
        'is_correct', v_is_correct,
        'points_earned', v_points_earned,
        'points_possible', v_points_possible
      )
    );
  end loop;

  if v_settings.passing_score is null then
    v_passed := null;
  else
    v_passed := v_score_earned >= v_settings.passing_score;
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
    scored_by
  ) values (
    p_attempt_id,
    v_attempt.space_id,
    v_attempt.course_id,
    v_attempt.activity_id,
    v_attempt.user_id,
    'scored',
    v_score_earned,
    v_score_max,
    v_passed,
    v_settings.max_score,
    v_settings.passing_score,
    'auto',
    v_now,
    p_scored_by
  )
  on conflict (attempt_id) do update
  set status = excluded.status,
      score_earned = excluded.score_earned,
      score_max = excluded.score_max,
      passed = excluded.passed,
      max_score_snapshot = excluded.max_score_snapshot,
      passing_score_snapshot = excluded.passing_score_snapshot,
      evaluation_mode_snapshot = excluded.evaluation_mode_snapshot,
      scored_at = excluded.scored_at,
      scored_by = excluded.scored_by,
      updated_at = now();

  perform public.learning_audit_write(
    p_scored_by,
    v_attempt.space_id,
    'attempt.score',
    'learning_attempt',
    p_attempt_id::text,
    jsonb_build_object(
      'attempt_id', p_attempt_id,
      'activity_id', v_attempt.activity_id,
      'course_id', v_attempt.course_id,
      'score_earned', v_score_earned,
      'score_max', v_score_max,
      'passed', v_passed
    )
  );

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'score_earned', v_score_earned,
    'score_max', v_score_max,
    'passed', v_passed,
    'scored_at', v_now,
    'answer_results', v_answer_results
  );
end;
$$;

revoke all on function public.learning_scoring_apply_attempt_result(uuid, uuid)
  from public, anon, authenticated;
-- service_role may execute for trusted server paths; learners never get this.
grant execute on function public.learning_scoring_apply_attempt_result(uuid, uuid)
  to service_role;

comment on function public.learning_scoring_apply_attempt_result(uuid, uuid) is
  'Internal Scoring V1 apply helper. Writes attempt/answer results. Revoked from authenticated. Called by score_learning_attempt (staff) and learning_scoring_try_auto_score_submitted_attempt (submit path). NEVER expose to learners.';

-- ---------------------------------------------------------------------------
-- 2) score_learning_attempt — staff auth + shared apply (behavior preserved)
-- ---------------------------------------------------------------------------

create or replace function public.score_learning_attempt(
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
    raise exception 'Not allowed to score this attempt';
  end if;

  if v_attempt.status is distinct from 'submitted' then
    raise exception 'Attempt must be submitted to score';
  end if;

  return public.learning_scoring_apply_attempt_result(p_attempt_id, v_uid);
end;
$$;

revoke all on function public.score_learning_attempt(uuid)
  from public, anon;
grant execute on function public.score_learning_attempt(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Best-effort auto-score after submit (internal only)
-- ---------------------------------------------------------------------------
-- Skips when evaluation_mode <> auto or a scored result already exists
-- (avoids needless scored_at churn on idempotent re-submit). Failures are
-- swallowed so submit stays successful → learner sees pending_score.

create or replace function public.learning_scoring_try_auto_score_submitted_attempt(
  p_attempt_id uuid,
  p_actor uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.learning_attempts%rowtype;
  v_settings public.learning_activity_settings%rowtype;
begin
  if p_attempt_id is null then
    return;
  end if;

  select * into v_attempt
  from public.learning_attempts
  where id = p_attempt_id;

  if not found then
    return;
  end if;

  if v_attempt.status is distinct from 'submitted' then
    return;
  end if;

  select * into v_settings
  from public.learning_activity_settings
  where activity_id = v_attempt.activity_id;

  if not found then
    return;
  end if;

  if v_settings.evaluation_mode is distinct from 'auto' then
    return;
  end if;

  if exists (
    select 1
    from public.learning_attempt_results r
    where r.attempt_id = p_attempt_id
      and r.status = 'scored'
  ) then
    return;
  end if;

  begin
    perform public.learning_scoring_apply_attempt_result(p_attempt_id, p_actor);
  exception
    when others then
      -- Safe audit only — never keys, payloads, or exception detail that might
      -- echo key material. Submit path must remain successful.
      perform public.learning_audit_write(
        p_actor,
        v_attempt.space_id,
        'attempt.auto_score_failed',
        'learning_attempt',
        p_attempt_id::text,
        jsonb_build_object(
          'attempt_id', p_attempt_id,
          'activity_id', v_attempt.activity_id,
          'course_id', v_attempt.course_id,
          'reason', 'auto_score_unavailable'
        )
      );
  end;
end;
$$;

revoke all on function public.learning_scoring_try_auto_score_submitted_attempt(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.learning_scoring_try_auto_score_submitted_attempt(uuid, uuid)
  to service_role;

comment on function public.learning_scoring_try_auto_score_submitted_attempt(uuid, uuid) is
  'Internal best-effort auto-score for submitted attempts when evaluation_mode=auto. Revoked from authenticated. Called only from submit_learning_attempt. Never raises to the caller.';

-- ---------------------------------------------------------------------------
-- 4) submit_learning_attempt — lifecycle unchanged + best-effort auto-score
-- ---------------------------------------------------------------------------
-- Return payload remains learner-safe lifecycle only (no scores/results).
-- Auto-score failures do NOT roll back submission.

create or replace function public.submit_learning_attempt(
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
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  if v_attempt.user_id is distinct from v_uid then
    raise exception 'Not allowed to submit this attempt';
  end if;

  -- Idempotent: already submitted returns the same state (no timestamp change).
  -- Still attempt best-effort auto-score if no result yet (pending recovery).
  if v_attempt.status = 'submitted' then
    perform public.learning_scoring_try_auto_score_submitted_attempt(
      p_attempt_id,
      v_uid
    );
    return jsonb_build_object(
      'attempt_id', p_attempt_id,
      'status', 'submitted',
      'submitted_at', v_attempt.submitted_at
    );
  end if;

  if v_attempt.status is distinct from 'active' then
    raise exception 'Attempt is % and cannot be submitted', v_attempt.status;
  end if;

  update public.learning_attempts
  set status = 'submitted',
      submitted_at = v_now,
      last_activity_at = v_now,
      updated_at = v_now
  where id = p_attempt_id
  returning * into v_attempt;

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
      'to_status', 'submitted'
    )
  );

  -- Best-effort auto-score in the same transaction when evaluation_mode=auto.
  -- On failure the exception is caught inside try_* so this submit stays OK.
  perform public.learning_scoring_try_auto_score_submitted_attempt(
    p_attempt_id,
    v_uid
  );

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'status', 'submitted',
    'submitted_at', v_attempt.submitted_at
  );
end;
$$;

revoke all on function public.submit_learning_attempt(uuid)
  from public, anon;
grant execute on function public.submit_learning_attempt(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) get_my_learning_attempt_result — learner-safe aggregate only
-- ---------------------------------------------------------------------------
-- Uniform response shape always. No learner SELECT on result tables.
-- Does NOT modify get_my_learning_attempt.
-- IDOR: missing attempt and non-owner use the same generic denial.

create or replace function public.get_my_learning_attempt_result(
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
  v_settings public.learning_activity_settings%rowtype;
  v_result public.learning_attempt_results%rowtype;
  v_policy text;
  v_visibility text;
  v_message text;
  v_result_json jsonb := null;
  v_percentage numeric;
  v_has_result boolean := false;
  v_deny constant text := 'Not allowed to read this attempt result';
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  -- Ownership before lazy expiry / existence differentiation.
  select * into v_attempt
  from public.learning_attempts
  where id = p_attempt_id;

  if not found or v_attempt.user_id is distinct from v_uid then
    raise exception '%', v_deny;
  end if;

  if not public.has_learning_course_access(v_attempt.course_id, v_uid) then
    raise exception '%', v_deny;
  end if;

  -- Owner path: keep expiry consistent with other attempt RPCs.
  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  -- Re-check ownership after lock (defensive).
  if v_attempt.user_id is distinct from v_uid then
    raise exception '%', v_deny;
  end if;

  select * into v_settings
  from public.learning_activity_settings
  where activity_id = v_attempt.activity_id;

  if found then
    v_policy := v_settings.show_result_policy;
  else
    v_policy := 'never';
  end if;

  select * into v_result
  from public.learning_attempt_results
  where attempt_id = p_attempt_id
    and status = 'scored';

  v_has_result := found;

  -- Visibility matrix (V1).
  if v_attempt.status is distinct from 'submitted' then
    v_visibility := 'hidden';
    v_message := 'Results are not available.';
  elsif v_policy is distinct from 'immediately'
        and v_policy is distinct from 'after_submit'
  then
    -- never | after_close | manual | unknown → fail closed
    v_visibility := 'hidden';
    v_message := 'Results are not available.';
  elsif not v_has_result then
    v_visibility := 'pending_score';
    v_message := 'Submitted — your result is being prepared.';
  else
    v_visibility := 'available';
    v_message := 'Your result is ready.';

    if v_result.score_max = 0 then
      v_percentage := 0;
    else
      v_percentage := round((v_result.score_earned / v_result.score_max) * 100, 2);
    end if;

    -- to_jsonb keeps explicit JSON null for passed when unset.
    v_result_json := jsonb_build_object(
      'status', 'scored',
      'score_earned', v_result.score_earned,
      'score_max', v_result.score_max,
      'percentage', v_percentage,
      'passed', to_jsonb(v_result.passed),
      'scored_at', v_result.scored_at
    );
  end if;

  -- Uniform shape always (oracle / timing reduction).
  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'activity_id', v_attempt.activity_id,
    'attempt_status', v_attempt.status,
    'visibility', v_visibility,
    'result', v_result_json,
    'message', v_message
  );
end;
$$;

revoke all on function public.get_my_learning_attempt_result(uuid)
  from public, anon;
grant execute on function public.get_my_learning_attempt_result(uuid)
  to authenticated, service_role;

comment on function public.get_my_learning_attempt_result(uuid) is
  'Learner-safe aggregate attempt result. Owner + has_learning_course_access only. Returns visibility hidden|pending_score|available and aggregate scores when allowed. NEVER returns keys, per-question results, scored_by, or grading snapshots. Does not widen result-table RLS.';
