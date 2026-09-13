-- UM Learning OS — Scoring Foundation V1
-- Additive slice after 20260838 (Attempts). Auto-scores a submitted Attempt
-- against STAFF-ONLY answer keys into separate result tables.
-- Hierarchy: Space → Program → Course → Section → Lesson → Activity → Attempt
--                                                      ↘ Attempt Answers
--                                                      ↘ Attempt Result
--                                                         ↘ Answer Results
-- Depends on: 20260833_learning_activities_foundation_v1.sql (settings:
--             evaluation_mode, max_score, passing_score),
--             20260837_learning_questions_foundation_v1.sql (inert points,
--             STAFF-ONLY learning_question_answer_keys),
--             20260838_learning_attempts_foundation_v1.sql (attempts, answers,
--             LEARNER-SAFE questions_snapshot, submit_learning_attempt).
--
-- Exactly TWO new tables (separate from attempt session tables — Decision D1):
--   1. learning_attempt_results
--   2. learning_attempt_answer_results
--
-- V1 does NOT: learner result delivery, Progress mutations, partial credit,
-- manual/AI grading, certificates, analytics, assignments, UI/routes/components,
-- or remote migration apply. Scoring is staff-only auto evaluation of submitted
-- attempts with evaluation_mode = 'auto'.
--
-- Locked decisions (D1–D10): separate result tables; score_learning_attempt RPC
-- (not inside submit); snapshot gains points only (never answer keys); fail
-- closed on missing keys; exact match only; staff-only result RLS; auto only;
-- no Progress; no learner delivery; submitted attempts only.
--
-- SECURITY: ENABLE + FORCE RLS on both result tables; no anon; no learner SELECT
-- policy; no direct I/U/D for authenticated (RPC-only writes). Answer keys are
-- read ONLY inside SECURITY DEFINER scoring helpers — never returned, never
-- audited as payloads. All functions are SECURITY DEFINER with
-- SET search_path = public; server identity via auth.uid() only.

-- ---------------------------------------------------------------------------
-- 0) Snapshot extension: points only (additive REPLACE of Attempts builder)
-- ---------------------------------------------------------------------------
-- Extend LEARNER-SAFE questions_snapshot elements with snapshotted `points`
-- from learning_questions at attempt start. NEVER includes answer keys,
-- correct_*, accepted, tolerance, or any key material (Decision D3).
-- Pre-extension snapshots (missing the points key) are not scoreable — the
-- score RPC fail-closes (see score_learning_attempt).

create or replace function public.learning_attempt_build_questions_snapshot(
  p_activity_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question_id', q.id,
        'question_type', q.question_type,
        'position', q.position,
        'content', q.content,
        'points', q.points
      )
      order by q.position, q.id
    ),
    '[]'::jsonb
  )
  from public.learning_questions q
  where q.activity_id = p_activity_id
    and q.status = 'published';
$$;

-- Keep the snapshot builder revoked from clients (Attempts contract).
revoke all on function public.learning_attempt_build_questions_snapshot(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1) learning_attempt_results (1:1 with scored attempt)
-- ---------------------------------------------------------------------------
-- attempt_id is PK/FK → learning_attempts ON DELETE CASCADE. Scope
-- (space_id/course_id/activity_id/user_id) is copied from the attempt at score
-- time — never client-supplied — for staff RLS (same denormalization pattern as
-- Attempts).

create table if not exists public.learning_attempt_results (
  attempt_id uuid primary key
    references public.learning_attempts (id) on delete cascade,
  -- Denormalized, immutable scope copied from the parent attempt at score time.
  space_id uuid not null
    references public.learning_spaces (id) on delete restrict,
  course_id uuid not null
    references public.learning_courses (id) on delete restrict,
  activity_id uuid not null
    references public.learning_activities (id) on delete restrict,
  user_id uuid not null
    references public.profiles (id) on delete restrict,
  -- V1 single successful outcome state.
  status text not null default 'scored'
    constraint learning_attempt_results_status_check check (
      status = 'scored'
    ),
  score_earned numeric not null
    constraint learning_attempt_results_score_earned_non_negative check (
      score_earned >= 0
    ),
  score_max numeric not null
    constraint learning_attempt_results_score_max_non_negative check (
      score_max >= 0
    ),
  -- null when activity passing_score is null at score time.
  passed boolean,
  -- Immutable snapshots of settings used for the pass decision.
  max_score_snapshot numeric,
  passing_score_snapshot numeric,
  evaluation_mode_snapshot text not null
    constraint learning_attempt_results_evaluation_mode_snapshot_check check (
      evaluation_mode_snapshot = 'auto'
    ),
  scored_at timestamptz not null default now(),
  scored_by uuid
    references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.learning_attempt_results is
  'Learning OS attempt results — 1:1 evaluation record for a scored attempt (separate from the attempt session). Client writes only via score_learning_attempt. Staff-only SELECT (FORCE RLS). NO learner owner policy. score_earned/score_max are sums of per-answer points; passed is null when passing_score was null at score time. evaluation_mode_snapshot is always auto in V1. Never stores answer keys, grade letters, rubrics, manual overrides, or AI fields.';

comment on column public.learning_attempt_results.passed is
  'null when activity passing_score is null at score time; otherwise score_earned >= passing_score.';

comment on column public.learning_attempt_results.score_max is
  'Sum of snapshotted question points (null points count as 0). Not rescaled by activity max_score in V1.';

comment on column public.learning_attempt_results.evaluation_mode_snapshot is
  'Must be auto in V1. Snapshotted from live learning_activity_settings at score time.';

create index if not exists learning_attempt_results_course_idx
  on public.learning_attempt_results (course_id);

create index if not exists learning_attempt_results_activity_idx
  on public.learning_attempt_results (activity_id);

create index if not exists learning_attempt_results_user_idx
  on public.learning_attempt_results (user_id);

create index if not exists learning_attempt_results_space_idx
  on public.learning_attempt_results (space_id);

create index if not exists learning_attempt_results_scored_at_idx
  on public.learning_attempt_results (scored_at);

drop trigger if exists learning_attempt_results_set_updated_at
  on public.learning_attempt_results;
create trigger learning_attempt_results_set_updated_at
  before update on public.learning_attempt_results
  for each row execute function public.set_row_updated_at();

-- Immutable identity/scope once written (re-score updates scores/timestamps only).
create or replace function public.learning_attempt_result_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.attempt_id is distinct from old.attempt_id
     or new.space_id is distinct from old.space_id
     or new.course_id is distinct from old.course_id
     or new.activity_id is distinct from old.activity_id
     or new.user_id is distinct from old.user_id
     or new.created_at is distinct from old.created_at
  then
    raise exception
      'learning_attempt_results identity/scope columns are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_attempt_results_guard_immutable
  on public.learning_attempt_results;
create trigger learning_attempt_results_guard_immutable
  before update on public.learning_attempt_results
  for each row execute function public.learning_attempt_result_guard_immutable();

alter table public.learning_attempt_results enable row level security;
alter table public.learning_attempt_results force row level security;

-- NO anon; NO learner owner policy (Decision D6 / D9). Staff SELECT only.
revoke all on table public.learning_attempt_results
  from public, anon, authenticated;
grant select on table public.learning_attempt_results to authenticated;
revoke insert, update, delete on table public.learning_attempt_results
  from anon, authenticated;
grant all on table public.learning_attempt_results to service_role;

-- ---------------------------------------------------------------------------
-- 2) learning_attempt_answer_results
-- ---------------------------------------------------------------------------
-- One row per (attempt_id, question_id) for every snapshotted question
-- (including unanswered). No answer-key copy, no learner payload copy, no
-- partial-credit fraction.

create table if not exists public.learning_attempt_answer_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null
    references public.learning_attempts (id) on delete cascade,
  question_id uuid not null
    references public.learning_questions (id) on delete restrict,
  is_correct boolean not null,
  points_possible numeric not null
    constraint learning_attempt_answer_results_points_possible_non_negative
      check (points_possible >= 0),
  points_earned numeric not null
    constraint learning_attempt_answer_results_points_earned_non_negative
      check (points_earned >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_attempt_answer_results_attempt_question_unique
    unique (attempt_id, question_id),
  constraint learning_attempt_answer_results_earned_lte_possible check (
    points_earned <= points_possible
  )
);

comment on table public.learning_attempt_answer_results is
  'Per-question exact-match result for a scored attempt. One row per snapshotted question (including unanswered → is_correct false, points_earned 0). Holds ONLY correctness + points — never answer keys or learner payloads. Client writes only via score_learning_attempt. Staff-only SELECT.';

create index if not exists learning_attempt_answer_results_attempt_idx
  on public.learning_attempt_answer_results (attempt_id);

create index if not exists learning_attempt_answer_results_question_idx
  on public.learning_attempt_answer_results (question_id);

drop trigger if exists learning_attempt_answer_results_set_updated_at
  on public.learning_attempt_answer_results;
create trigger learning_attempt_answer_results_set_updated_at
  before update on public.learning_attempt_answer_results
  for each row execute function public.set_row_updated_at();

create or replace function public.learning_attempt_answer_result_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.attempt_id is distinct from old.attempt_id
     or new.question_id is distinct from old.question_id
     or new.created_at is distinct from old.created_at
  then
    raise exception
      'learning_attempt_answer_results identity columns are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_attempt_answer_results_guard_immutable
  on public.learning_attempt_answer_results;
create trigger learning_attempt_answer_results_guard_immutable
  before update on public.learning_attempt_answer_results
  for each row
  execute function public.learning_attempt_answer_result_guard_immutable();

alter table public.learning_attempt_answer_results enable row level security;
alter table public.learning_attempt_answer_results force row level security;

revoke all on table public.learning_attempt_answer_results
  from public, anon, authenticated;
grant select on table public.learning_attempt_answer_results to authenticated;
revoke insert, update, delete on table public.learning_attempt_answer_results
  from anon, authenticated;
grant all on table public.learning_attempt_answer_results to service_role;

-- ---------------------------------------------------------------------------
-- 3) Exact-match evaluators (SECURITY DEFINER; revoked from clients)
-- ---------------------------------------------------------------------------
-- Decision D5: exact match only — no partial credit. Answer keys are read only
-- by these helpers / the score RPC. Never return keys to callers.

-- Normalize short_answer text per answer_key.normalization (trim /
-- case_sensitive booleans only — NO regex). Missing normalization → no trim,
-- case-sensitive exact compare.
create or replace function public.learning_scoring_normalize_short_answer(
  p_text text,
  p_normalization jsonb
)
returns text
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  v_out text := coalesce(p_text, '');
  v_trim boolean := false;
  v_case_sensitive boolean := true;
begin
  if p_normalization is not null
     and jsonb_typeof(p_normalization) = 'object'
  then
    if jsonb_typeof(p_normalization -> 'trim') = 'boolean' then
      v_trim := (p_normalization ->> 'trim')::boolean;
    end if;
    if jsonb_typeof(p_normalization -> 'case_sensitive') = 'boolean' then
      v_case_sensitive := (p_normalization ->> 'case_sensitive')::boolean;
    end if;
  end if;

  if v_trim then
    v_out := btrim(v_out);
  end if;
  if not v_case_sensitive then
    v_out := lower(v_out);
  end if;
  return v_out;
end;
$$;

-- Exact-match evaluator for one question. Returns true/false. Unanswered
-- (null payload) → false. Never raises with key material in the message.
create or replace function public.learning_scoring_evaluate_answer(
  p_question_type text,
  p_answer_payload jsonb,
  p_answer_key jsonb
)
returns boolean
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  v_selected_keys text[];
  v_correct_keys text[];
  v_accepted jsonb;
  v_norm jsonb;
  v_learner text;
  v_accepted_elem text;
  v_answers jsonb;
  v_blank_key text;
  v_blank_accepted jsonb;
  v_blank_learner text;
  v_blank_ok boolean;
  v_tolerance numeric;
  v_learner_num numeric;
  v_key_num numeric;
begin
  -- Unanswered → incorrect (Decision D5).
  if p_answer_payload is null
     or jsonb_typeof(p_answer_payload) is distinct from 'object'
  then
    return false;
  end if;

  if p_answer_key is null
     or jsonb_typeof(p_answer_key) is distinct from 'object'
  then
    return false;
  end if;

  if p_question_type = 'multiple_choice_single' then
    if jsonb_typeof(p_answer_payload -> 'selected_key') is distinct from 'string'
    then
      return false;
    end if;
    return (p_answer_payload ->> 'selected_key')
      is not distinct from (p_answer_key ->> 'correct_key');

  elsif p_question_type = 'multiple_choice_multiple' then
    -- Set equality: selected_keys ≡ correct_keys (order irrelevant).
    if jsonb_typeof(p_answer_payload -> 'selected_keys') is distinct from 'array'
       or jsonb_typeof(p_answer_key -> 'correct_keys') is distinct from 'array'
    then
      return false;
    end if;
    select coalesce(array_agg(x order by x), array[]::text[])
      into v_selected_keys
    from (
      select distinct jsonb_array_elements_text(p_answer_payload -> 'selected_keys') as x
    ) s;
    select coalesce(array_agg(x order by x), array[]::text[])
      into v_correct_keys
    from (
      select distinct jsonb_array_elements_text(p_answer_key -> 'correct_keys') as x
    ) c;
    return v_selected_keys = v_correct_keys;

  elsif p_question_type = 'true_false' then
    if jsonb_typeof(p_answer_payload -> 'value') is distinct from 'boolean'
       or jsonb_typeof(p_answer_key -> 'correct') is distinct from 'boolean'
    then
      return false;
    end if;
    return (p_answer_payload ->> 'value')::boolean
      is not distinct from (p_answer_key ->> 'correct')::boolean;

  elsif p_question_type = 'short_answer' then
    if jsonb_typeof(p_answer_payload -> 'text') is distinct from 'string' then
      return false;
    end if;
    v_accepted := p_answer_key -> 'accepted';
    if jsonb_typeof(v_accepted) is distinct from 'array' then
      return false;
    end if;
    v_norm := p_answer_key -> 'normalization';
    v_learner := public.learning_scoring_normalize_short_answer(
      p_answer_payload ->> 'text',
      v_norm
    );
    for v_accepted_elem in select jsonb_array_elements_text(v_accepted)
    loop
      if v_learner = public.learning_scoring_normalize_short_answer(
        v_accepted_elem,
        v_norm
      ) then
        return true;
      end if;
    end loop;
    return false;

  elsif p_question_type = 'fill_blank' then
    -- All blanks in answer_key.answers must match exactly one accepted string
    -- each. No per-blank partial credit.
    v_answers := p_answer_key -> 'answers';
    if jsonb_typeof(v_answers) is distinct from 'object' then
      return false;
    end if;
    if jsonb_typeof(p_answer_payload -> 'blanks') is distinct from 'object' then
      return false;
    end if;

    for v_blank_key in select jsonb_object_keys(v_answers)
    loop
      v_blank_accepted := v_answers -> v_blank_key;
      if jsonb_typeof(v_blank_accepted) is distinct from 'array' then
        return false;
      end if;
      if jsonb_typeof(p_answer_payload -> 'blanks' -> v_blank_key)
         is distinct from 'string'
      then
        return false;
      end if;
      v_blank_learner := p_answer_payload -> 'blanks' ->> v_blank_key;
      v_blank_ok := false;
      for v_accepted_elem in select jsonb_array_elements_text(v_blank_accepted)
      loop
        if v_blank_learner is not distinct from v_accepted_elem then
          v_blank_ok := true;
          exit;
        end if;
      end loop;
      if not v_blank_ok then
        return false;
      end if;
    end loop;
    return true;

  elsif p_question_type = 'numeric' then
    if jsonb_typeof(p_answer_payload -> 'value') is distinct from 'number'
       or jsonb_typeof(p_answer_key -> 'value') is distinct from 'number'
    then
      return false;
    end if;
    v_learner_num := (p_answer_payload ->> 'value')::numeric;
    v_key_num := (p_answer_key ->> 'value')::numeric;
    if jsonb_typeof(p_answer_key -> 'tolerance') = 'number' then
      v_tolerance := (p_answer_key ->> 'tolerance')::numeric;
    else
      v_tolerance := 0;
    end if;
    return abs(v_learner_num - v_key_num) <= coalesce(v_tolerance, 0);

  else
    -- Reserved/deferred types never appear in a snapshot; fail closed.
    return false;
  end if;
end;
$$;

revoke all on function public.learning_scoring_normalize_short_answer(text, jsonb)
  from public, anon, authenticated;
revoke all on function public.learning_scoring_evaluate_answer(text, jsonb, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) RLS policies — staff only (Decision D6 / D9)
-- ---------------------------------------------------------------------------
-- Managers (can_manage_learning_course) and platform admins may SELECT.
-- Learners (attempt owners) get NO result policy. Ordinary space members get
-- nothing. is_learning_space_member / has_learning_course_access are NEVER used
-- to widen result reads.

drop policy if exists "Managers read scoped attempt results"
  on public.learning_attempt_results;
create policy "Managers read scoped attempt results"
  on public.learning_attempt_results for select
  to authenticated
  using (public.can_manage_learning_course(course_id));

drop policy if exists "Platform admins read all attempt results"
  on public.learning_attempt_results;
create policy "Platform admins read all attempt results"
  on public.learning_attempt_results for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Managers read scoped attempt answer results"
  on public.learning_attempt_answer_results;
create policy "Managers read scoped attempt answer results"
  on public.learning_attempt_answer_results for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_attempts a
      where a.id = learning_attempt_answer_results.attempt_id
        and public.can_manage_learning_course(a.course_id)
    )
  );

drop policy if exists "Platform admins read all attempt answer results"
  on public.learning_attempt_answer_results;
create policy "Platform admins read all attempt answer results"
  on public.learning_attempt_answer_results for select
  to authenticated
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 5) score_learning_attempt RPC (Decision D2)
-- ---------------------------------------------------------------------------
-- Staff-only (course manager or platform admin). Learners always get
-- "Not allowed…". Writes ONLY to result tables. Idempotent re-score replaces
-- answer results + attempt result atomically. Fail closed on missing keys,
-- non-auto evaluation_mode, non-submitted status, or pre-extension snapshots
-- missing the points key. NO Progress mutations. NO learner delivery. NEVER
-- returns answer keys or raw answer_payload.

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
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  -- Lazy expiry first (may flip active → expired before the submitted check).
  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  -- Staff only — never the learner (Decision D6 / D9).
  if not (
    public.can_manage_learning_course(v_attempt.course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to score this attempt';
  end if;

  -- Submitted attempts only (Decision D10).
  if v_attempt.status is distinct from 'submitted' then
    raise exception 'Attempt must be submitted to score';
  end if;

  select * into v_settings
  from public.learning_activity_settings
  where activity_id = v_attempt.activity_id;

  if not found then
    raise exception 'Learning activity settings not found';
  end if;

  -- Auto evaluation only (Decision D7).
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

  -- Require every snapshot element has a points key (pre-extension fail-closed).
  for v_snap_elem in
    select jsonb_array_elements(v_attempt.questions_snapshot)
  loop
    if not (v_snap_elem ? 'points') then
      raise exception
        'questions_snapshot is missing points; attempt is not scoreable';
    end if;
  end loop;

  -- Fail closed if any snapshotted question lacks an answer-key row (D4).
  -- No result rows are written until this gate passes.
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
    -- Generic message — never include question ids or key material.
    raise exception 'Answer key missing for one or more questions';
  end if;

  -- Replace prior results atomically (idempotent re-score).
  delete from public.learning_attempt_answer_results
  where attempt_id = p_attempt_id;

  -- Evaluate each snapshotted question in snapshot order.
  for v_snap_elem in
    select value
    from jsonb_array_elements(v_attempt.questions_snapshot) with ordinality as t(value, ord)
    order by ord
  loop
    v_question_id := (v_snap_elem ->> 'question_id')::uuid;
    v_question_type := v_snap_elem ->> 'question_type';

    -- null points → 0 (Decision / score_max contract).
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

    -- Missing answer row → unanswered → incorrect.
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
    v_uid
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

  -- Audit SAFE metadata only — never keys, payloads, or accepted strings.
  perform public.learning_audit_write(
    v_uid,
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

  -- Staff-safe summary only (Decision D9).
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

revoke all on function public.score_learning_attempt(uuid)
  from public, anon;
grant execute on function public.score_learning_attempt(uuid)
  to authenticated, service_role;
