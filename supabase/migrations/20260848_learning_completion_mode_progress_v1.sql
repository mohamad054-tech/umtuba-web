-- UM Learning OS — Completion-mode Progress V1
-- Additive only. Does NOT edit migration 20260845 (Progress Mutations V1).
-- Migration version 20260848: after Games catalog 20260847.
--
-- Locked decisions:
--   1) completion_mode='score' path unchanged (scored helpers + scoring hook)
--   2) completion_mode='submit' → attempt.status='submitted' is enough
--   3) completion_mode='manual' blocked (no auto-apply)
--   4) completion_mode='view' blocked (no trusted view tracking)
--   5) Reuse learning_attempt_progress_applications ledger (first-winner)
--
-- Constraints:
--   - Lesson then course rollup in same txn as ledger insert
--   - Full rollback on failure → no orphan applications
--   - Applications insert-once / immutable (existing triggers)
--   - All scope from DB relationships only
--
-- Does NOT: UM Points, certificates, badges, view tracking, Games, Ads,
-- public leaderboards, rewrite of scored progress helpers.
-- Migration apply status: NOT APPLIED (Git-only until explicitly approved).

-- ---------------------------------------------------------------------------
-- 1) Expand completion_source allowlist (additive)
-- ---------------------------------------------------------------------------

alter table public.learning_lesson_progress
  drop constraint if exists learning_lesson_progress_completion_source_check;

alter table public.learning_lesson_progress
  add constraint learning_lesson_progress_completion_source_check check (
    completion_source is null
    or completion_source in ('manual', 'scored_attempt', 'submitted_attempt')
  );

comment on column public.learning_lesson_progress.completion_source is
  'manual = complete_learning_lesson; scored_attempt = Progress Mutations V1 after qualifying scored attempt; submitted_attempt = Completion-mode Progress V1 after trusted submit when completion_mode=submit. Null when not completed.';

-- ---------------------------------------------------------------------------
-- 2) Internal: complete lesson from submitted attempt (then course rollup)
-- ---------------------------------------------------------------------------

create or replace function public.learning_progress_complete_lesson_from_submitted_attempt(
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
      'submitted_attempt',
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
        'completion_source', 'submitted_attempt',
        'activity_id', p_activity_id
      )
    );
  elsif v_row.status = 'completed' then
    update public.learning_lesson_progress
    set
      last_activity_at = v_now,
      enrollment_id = coalesce(v_enrollment_id, enrollment_id),
      completion_source = coalesce(completion_source, 'submitted_attempt')
    where id = v_row.id
    returning * into v_row;
  else
    v_from := v_row.status;
    update public.learning_lesson_progress
    set
      status = 'completed',
      completion_source = 'submitted_attempt',
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
        'completion_source', 'submitted_attempt',
        'activity_id', p_activity_id
      )
    );
  end if;

  -- Course rollup ONLY after successful lesson progress write (same txn).
  v_course := public.learning_progress_recompute_course(
    p_user_id, v_ctx.o_course.id, p_lesson_id, p_actor_id
  );

  update public.learning_course_progress
  set last_activity_id = p_activity_id,
      updated_at = v_now
  where user_id = p_user_id
    and course_id = v_ctx.o_course.id;

  perform public.learning_audit_write(
    p_actor_id,
    v_ctx.o_space_id,
    'progress.lesson_complete_submitted_attempt',
    'learning_lesson_progress',
    v_row.id::text,
    jsonb_build_object(
      'course_id', v_ctx.o_course.id,
      'lesson_id', p_lesson_id,
      'activity_id', p_activity_id,
      'user_id', p_user_id,
      'completion_source', 'submitted_attempt',
      'percent_complete', v_course.percent_complete
    )
  );
end;
$$;

revoke all on function public.learning_progress_complete_lesson_from_submitted_attempt(
  uuid, uuid, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.learning_progress_complete_lesson_from_submitted_attempt(
  uuid, uuid, uuid, uuid
) to service_role;

comment on function public.learning_progress_complete_lesson_from_submitted_attempt(
  uuid, uuid, uuid, uuid
) is
  'Internal Completion-mode Progress V1. Completes lesson from submitted attempt when completion_mode=submit. Revoked from authenticated.';

-- ---------------------------------------------------------------------------
-- 3) Internal: try apply progress from submitted attempt (fail-closed gates)
-- ---------------------------------------------------------------------------

create or replace function public.learning_progress_try_apply_from_submitted_attempt(
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

  -- Only completion_mode=submit. score/manual/view remain blocked here.
  if v_settings.completion_mode is distinct from 'submit' then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'completion_mode_not_submit'
    );
  end if;

  -- Same attempt already applied (idempotent re-submit).
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
  perform public.learning_progress_complete_lesson_from_submitted_attempt(
    v_attempt.lesson_id,
    v_attempt.user_id,
    p_actor_id,
    v_attempt.activity_id
  );

  perform public.learning_audit_write(
    p_actor_id,
    v_attempt.space_id,
    'progress.attempt_submitted_apply',
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

revoke all on function public.learning_progress_try_apply_from_submitted_attempt(
  uuid, uuid
) from public, anon, authenticated;
grant execute on function public.learning_progress_try_apply_from_submitted_attempt(
  uuid, uuid
) to service_role;

comment on function public.learning_progress_try_apply_from_submitted_attempt(
  uuid, uuid
) is
  'Internal Completion-mode Progress V1. Applies lesson progress from first trusted submitted attempt when completion_mode=submit. Revoked from authenticated.';

-- ---------------------------------------------------------------------------
-- 4) REPLACE submit_learning_attempt — hook after trusted submitted state
--     Lifecycle return unchanged; best-effort auto-score still after hook.
-- ---------------------------------------------------------------------------

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
  -- Recovery: try submit-mode progress apply, then best-effort auto-score.
  if v_attempt.status = 'submitted' then
    perform public.learning_progress_try_apply_from_submitted_attempt(
      p_attempt_id,
      v_uid
    );
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

  -- Completion-mode Progress V1: same transaction as trusted submit.
  -- Score / manual / view modes skip inside the helper (fail-closed).
  perform public.learning_progress_try_apply_from_submitted_attempt(
    p_attempt_id,
    v_uid
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

comment on function public.submit_learning_attempt(uuid) is
  'Learner submit attempt. Completion-mode Progress V1 hooks submit-mode progress apply before best-effort auto-score. Learner-safe lifecycle return only.';
