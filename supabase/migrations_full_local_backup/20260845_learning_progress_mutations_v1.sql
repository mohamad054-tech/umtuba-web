-- UM Learning OS — Progress Mutations After Scored Attempts V1
-- Additive only. Does NOT edit migrations 20260828–20260844 files.
-- Migration version 20260845: reserved after Games 42–43 and Result Policy 44.
--
-- Locked decisions:
--   1) passing_score IS NULL → scored result is enough when completion_mode='score'
--   2) Lesson-level progress only (no activity_progress table)
--
-- Constraints:
--   - Course rollup only after successful lesson progress update (same txn)
--   - Full rollback on failure → no orphan applications
--   - Applications insert-once / immutable; no update/delete in V1
--   - First qualifying attempt per (user, activity) wins; later attempts skip
--   - All scope from DB relationships only
--   - completion_mode view|submit|manual unchanged
--
-- Does NOT: UM Points, certificates, badges, AI/manual grading UI, Games, Ads,
-- public leaderboards, per-question learner exposure.
-- Migration apply status: NOT APPLIED (Git-only until explicitly approved).

-- ---------------------------------------------------------------------------
-- 1) Expand completion_source allowlist
-- ---------------------------------------------------------------------------

alter table public.learning_lesson_progress
  drop constraint if exists learning_lesson_progress_completion_source_check;

alter table public.learning_lesson_progress
  add constraint learning_lesson_progress_completion_source_check check (
    completion_source is null
    or completion_source in ('manual', 'scored_attempt')
  );

comment on column public.learning_lesson_progress.completion_source is
  'manual = learner/staff complete_learning_lesson; scored_attempt = Progress Mutations V1 after qualifying scored attempt. Null when not completed.';

-- ---------------------------------------------------------------------------
-- 2) learning_attempt_progress_applications — insert-once ledger
-- ---------------------------------------------------------------------------

create table if not exists public.learning_attempt_progress_applications (
  attempt_id uuid primary key
    references public.learning_attempts (id) on delete cascade,
  user_id uuid not null
    references public.profiles (id) on delete restrict,
  activity_id uuid not null
    references public.learning_activities (id) on delete restrict,
  lesson_id uuid not null
    references public.learning_lessons (id) on delete restrict,
  course_id uuid not null
    references public.learning_courses (id) on delete restrict,
  space_id uuid not null
    references public.learning_spaces (id) on delete restrict,
  applied_at timestamptz not null default now(),
  applied_by uuid not null
    references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint learning_attempt_progress_applications_user_activity_unique
    unique (user_id, activity_id)
);

comment on table public.learning_attempt_progress_applications is
  'Insert-once ledger: first qualifying scored attempt per (user, activity) that applied lesson progress. Immutable. No un-apply in V1.';

create index if not exists learning_attempt_progress_applications_lesson_idx
  on public.learning_attempt_progress_applications (lesson_id);

create index if not exists learning_attempt_progress_applications_course_idx
  on public.learning_attempt_progress_applications (course_id);

create or replace function public.learning_attempt_progress_application_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'learning_attempt_progress_applications rows are immutable';
end;
$$;

drop trigger if exists learning_attempt_progress_applications_guard_immutable
  on public.learning_attempt_progress_applications;
create trigger learning_attempt_progress_applications_guard_immutable
  before update or delete on public.learning_attempt_progress_applications
  for each row
  execute function public.learning_attempt_progress_application_guard_immutable();

alter table public.learning_attempt_progress_applications enable row level security;
alter table public.learning_attempt_progress_applications force row level security;

revoke all on table public.learning_attempt_progress_applications
  from public, anon, authenticated;
grant select on table public.learning_attempt_progress_applications to authenticated;
revoke insert, update, delete on table public.learning_attempt_progress_applications
  from anon, authenticated;
grant all on table public.learning_attempt_progress_applications to service_role;

drop policy if exists "Learners read own attempt progress applications"
  on public.learning_attempt_progress_applications;
create policy "Learners read own attempt progress applications"
  on public.learning_attempt_progress_applications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Managers read scoped attempt progress applications"
  on public.learning_attempt_progress_applications;
create policy "Managers read scoped attempt progress applications"
  on public.learning_attempt_progress_applications for select
  to authenticated
  using (public.can_manage_learning_course(course_id));

drop policy if exists "Platform admins read all attempt progress applications"
  on public.learning_attempt_progress_applications;
create policy "Platform admins read all attempt progress applications"
  on public.learning_attempt_progress_applications for select
  to authenticated
  using (public.is_platform_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 3) Internal: complete lesson from scored attempt (then course rollup)
-- ---------------------------------------------------------------------------

create or replace function public.learning_progress_complete_lesson_from_scored_attempt(
  p_lesson_id uuid,
  p_user_id uuid,
  p_actor_id uuid,
  p_activity_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_row public.learning_lesson_progress%rowtype;
  v_from text;
  v_enrollment_id uuid;
  v_now timestamptz := now();
  v_course public.learning_course_progress%rowtype;
begin
  if p_lesson_id is null or p_user_id is null or p_actor_id is null then
    raise exception 'lesson_id, user_id, and actor_id are required';
  end if;

  select * into v_ctx
  from public.learning_progress_load_lesson_context(p_lesson_id);

  v_enrollment_id := public.learning_progress_resolve_enrollment_id(
    v_ctx.o_course.id, p_user_id
  );

  select * into v_row
  from public.learning_lesson_progress
  where user_id = p_user_id and lesson_id = p_lesson_id
  for update;

  if not found then
    insert into public.learning_lesson_progress (
      space_id,
      course_id,
      lesson_id,
      user_id,
      enrollment_id,
      status,
      completion_source,
      started_at,
      last_activity_at,
      completed_at,
      first_completed_at
    ) values (
      v_ctx.o_space_id,
      v_ctx.o_course.id,
      p_lesson_id,
      p_user_id,
      v_enrollment_id,
      'completed',
      'scored_attempt',
      v_now,
      v_now,
      v_now,
      v_now
    )
    returning * into v_row;

    perform public.learning_progress_event_write(
      v_ctx.o_space_id, v_ctx.o_course.id, p_lesson_id, p_user_id, p_actor_id,
      'lesson_completed', 'not_started', 'completed',
      jsonb_build_object(
        'completion_source', 'scored_attempt',
        'activity_id', p_activity_id
      )
    );
  elsif v_row.status = 'completed' then
    update public.learning_lesson_progress
    set
      last_activity_at = v_now,
      enrollment_id = coalesce(v_enrollment_id, enrollment_id),
      completion_source = coalesce(completion_source, 'scored_attempt')
    where id = v_row.id
    returning * into v_row;
  else
    v_from := v_row.status;
    update public.learning_lesson_progress
    set
      status = 'completed',
      completion_source = 'scored_attempt',
      started_at = coalesce(started_at, v_now),
      last_activity_at = v_now,
      completed_at = v_now,
      first_completed_at = coalesce(first_completed_at, v_now),
      enrollment_id = coalesce(v_enrollment_id, enrollment_id)
    where id = v_row.id
    returning * into v_row;

    perform public.learning_progress_event_write(
      v_ctx.o_space_id, v_ctx.o_course.id, p_lesson_id, p_user_id, p_actor_id,
      'lesson_completed', v_from, 'completed',
      jsonb_build_object(
        'completion_source', 'scored_attempt',
        'activity_id', p_activity_id
      )
    );
  end if;

  -- Course rollup ONLY after successful lesson progress write (same txn).
  v_course := public.learning_progress_recompute_course(
    p_user_id, v_ctx.o_course.id, p_lesson_id, p_actor_id
  );

  -- Optional: record last activity id on course rollup (reserved column).
  update public.learning_course_progress
  set last_activity_id = p_activity_id,
      updated_at = v_now
  where user_id = p_user_id
    and course_id = v_ctx.o_course.id;

  perform public.learning_audit_write(
    p_actor_id,
    v_ctx.o_space_id,
    'progress.lesson_complete_scored_attempt',
    'learning_lesson_progress',
    v_row.id::text,
    jsonb_build_object(
      'course_id', v_ctx.o_course.id,
      'lesson_id', p_lesson_id,
      'activity_id', p_activity_id,
      'user_id', p_user_id,
      'completion_source', 'scored_attempt',
      'percent_complete', v_course.percent_complete
    )
  );
end;
$$;

revoke all on function public.learning_progress_complete_lesson_from_scored_attempt(
  uuid, uuid, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.learning_progress_complete_lesson_from_scored_attempt(
  uuid, uuid, uuid, uuid
) to service_role;

-- ---------------------------------------------------------------------------
-- 4) Internal: try apply progress from scored attempt (fail-closed gates)
-- ---------------------------------------------------------------------------

create or replace function public.learning_progress_try_apply_from_scored_attempt(
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
  where id = p_attempt_id;

  if not found then
    raise exception 'Learning attempt not found';
  end if;

  -- Fail closed: only submitted attempts.
  if v_attempt.status is distinct from 'submitted' then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'attempt_not_submitted'
    );
  end if;

  select * into v_settings
  from public.learning_activity_settings
  where activity_id = v_attempt.activity_id;

  if not found then
    raise exception 'Learning activity settings not found';
  end if;

  -- Do not change view|submit|manual behavior.
  if v_settings.completion_mode is distinct from 'score' then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'completion_mode_not_score'
    );
  end if;

  select * into v_result
  from public.learning_attempt_results
  where attempt_id = p_attempt_id
    and status = 'scored';

  if not found then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'attempt_not_scored'
    );
  end if;

  -- Pass gate: NULL passing_score → scored is enough; else require passed=true.
  if v_settings.passing_score is not null
     and v_result.passed is distinct from true
  then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'passing_score_not_met'
    );
  end if;

  -- Same attempt already applied (idempotent re-score).
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
      'applied_at', v_app.applied_at
    );
  end if;

  -- Another attempt for this user+activity already applied (first wins).
  if exists (
    select 1
    from public.learning_attempt_progress_applications a
    where a.user_id = v_attempt.user_id
      and a.activity_id = v_attempt.activity_id
  ) then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'activity_already_applied'
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
      -- Concurrent first-winner race: no orphan partial lesson write yet.
      return jsonb_build_object(
        'status', 'skipped',
        'reason', 'activity_already_applied_concurrent'
      );
  end;

  -- Lesson then course (same txn). Any raise rolls back the insert above.
  perform public.learning_progress_complete_lesson_from_scored_attempt(
    v_attempt.lesson_id,
    v_attempt.user_id,
    p_actor_id,
    v_attempt.activity_id
  );

  perform public.learning_audit_write(
    p_actor_id,
    v_attempt.space_id,
    'progress.attempt_scored_apply',
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
    'lesson_id', v_app.lesson_id,
    'activity_id', v_app.activity_id,
    'applied_at', v_app.applied_at
  );
end;
$$;

revoke all on function public.learning_progress_try_apply_from_scored_attempt(
  uuid, uuid
) from public, anon, authenticated;
grant execute on function public.learning_progress_try_apply_from_scored_attempt(
  uuid, uuid
) to service_role;

comment on function public.learning_progress_try_apply_from_scored_attempt(
  uuid, uuid
) is
  'Internal Progress Mutations V1. Applies lesson progress from first qualifying scored attempt when completion_mode=score. Revoked from authenticated.';

-- ---------------------------------------------------------------------------
-- 5) REPLACE learning_scoring_apply_attempt_result — hook after score write
--     Algorithm unchanged from 20260841; only adds progress apply before return.
-- ---------------------------------------------------------------------------

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

  -- Progress Mutations V1: same transaction as score write.
  perform public.learning_progress_try_apply_from_scored_attempt(
    p_attempt_id,
    p_scored_by
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
grant execute on function public.learning_scoring_apply_attempt_result(uuid, uuid)
  to service_role;

comment on function public.learning_scoring_apply_attempt_result(uuid, uuid) is
  'Internal Scoring apply + Progress Mutations V1 hook. Revoked from authenticated. Progress apply is transactional with score write.';
