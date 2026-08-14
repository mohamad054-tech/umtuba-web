-- LEARNING_LESSON_ENGINE_O_COURSE_RPC_HOTFIX_V1
--
-- Root cause:
--   Callers do SELECT * INTO v_ctx (record) from helpers that return composite OUT
--   columns (o_course / o_lesson / o_activity / o_settings / ...). PL/pgSQL then
--   rejects nested access such as v_ctx.o_course.id with:
--     missing FROM-clause entry for table "o_course"
--   Scalar OUT fields (e.g. v_ctx.o_space_id) remain valid; only composite.field fails.
--
-- Fix:
--   1) Add immutable jsonb helpers that read composite fields via to_jsonb(v_ctx).
--   2) Rewrite all affected SECURITY DEFINER RPCs to use those helpers.
--   Preserves RPC signatures, auth checks, unlock/points semantics, and grants.
--   No table / RLS / content / enrollment model changes.
-- =====================================================================

create or replace function public.learning_composite_id(p_ctx jsonb, p_composite text)
returns uuid
language sql
immutable
parallel safe
as $$
  select nullif(btrim(coalesce(p_ctx -> p_composite ->> 'id', '')), '')::uuid;
$$;

comment on function public.learning_composite_id(jsonb, text) is
  'HOTFIX helper: extract uuid id from a composite field inside to_jsonb(record). Avoids PL/pgSQL v_ctx.o_course.id parse error.';

revoke all on function public.learning_composite_id(jsonb, text) from public, anon;
grant execute on function public.learning_composite_id(jsonb, text) to authenticated, service_role;

create or replace function public.learning_composite_text(p_ctx jsonb, p_composite text, p_field text)
returns text
language sql
immutable
parallel safe
as $$
  select p_ctx -> p_composite ->> p_field;
$$;

comment on function public.learning_composite_text(jsonb, text, text) is
  'HOTFIX helper: extract text field from a composite inside to_jsonb(record). Avoids PL/pgSQL nested composite field access bug.';

revoke all on function public.learning_composite_text(jsonb, text, text) from public, anon;
grant execute on function public.learning_composite_text(jsonb, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: complete_learning_lesson_p_lesson_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_learning_lesson(p_lesson_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_row public.learning_lesson_progress%rowtype;
  v_from text;
  v_enrollment_id uuid;
  v_now timestamptz := now();
  v_course public.learning_course_progress%rowtype;
  v_min_seconds integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_ctx
  from public.learning_progress_load_lesson_context(p_lesson_id);

  if not public.has_learning_course_access(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  -- Optional reserved contract: min_completion_seconds (inert unless set).
  select ls.min_completion_seconds into v_min_seconds
  from public.learning_lesson_settings ls
  where ls.lesson_id = p_lesson_id;

  v_enrollment_id := public.learning_progress_resolve_enrollment_id(
    public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid
  );

  select * into v_row
  from public.learning_lesson_progress
  where user_id = v_uid and lesson_id = p_lesson_id
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
      public.learning_composite_id(to_jsonb(v_ctx), 'o_course'),
      p_lesson_id,
      v_uid,
      v_enrollment_id,
      'completed',
      'manual',
      v_now,
      v_now,
      v_now,
      v_now
    )
    returning * into v_row;

    perform public.learning_progress_event_write(
      v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, v_uid, v_uid,
      'lesson_completed', 'not_started', 'completed',
      jsonb_build_object('completion_source', 'manual')
    );
  elsif v_row.status = 'completed' then
    -- Idempotent: keep completed_at / first_completed_at stable.
    update public.learning_lesson_progress
    set
      last_activity_at = v_now,
      enrollment_id = coalesce(v_enrollment_id, enrollment_id),
      completion_source = coalesce(completion_source, 'manual')
    where id = v_row.id
    returning * into v_row;
  else
    if v_min_seconds is not null
       and v_row.started_at is not null
       and extract(epoch from (v_now - v_row.started_at)) < v_min_seconds
    then
      raise exception
        'Lesson cannot be completed before min_completion_seconds (%)',
        v_min_seconds;
    end if;

    v_from := v_row.status;
    update public.learning_lesson_progress
    set
      status = 'completed',
      completion_source = 'manual',
      started_at = coalesce(started_at, v_now),
      last_activity_at = v_now,
      completed_at = v_now,
      first_completed_at = coalesce(first_completed_at, v_now),
      enrollment_id = coalesce(v_enrollment_id, enrollment_id)
    where id = v_row.id
    returning * into v_row;

    perform public.learning_progress_event_write(
      v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, v_uid, v_uid,
      'lesson_completed', v_from, 'completed',
      jsonb_build_object('completion_source', 'manual')
    );
  end if;

  v_course := public.learning_progress_recompute_course(
    v_uid, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, v_uid
  );

  perform public.learning_audit_write(
    v_uid,
    v_ctx.o_space_id,
    'progress.lesson_complete',
    'learning_lesson_progress',
    v_row.id::text,
    jsonb_build_object(
      'course_id', public.learning_composite_id(to_jsonb(v_ctx), 'o_course'),
      'lesson_id', p_lesson_id,
      'status', v_row.status,
      'percent_complete', v_course.percent_complete
    )
  );

  return jsonb_build_object(
    'lesson_progress', to_jsonb(v_row),
    'course_progress', to_jsonb(v_course)
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: complete_my_learning_lab_p_activity_id_uuid_p_validation_result_jsonb_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_my_learning_lab(p_activity_id uuid, p_validation_result jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_row public.learning_lab_completions%rowtype;
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_lab_load_context(p_activity_id);
  if not public.has_learning_course_access(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) then
    raise exception 'Not entitled to this course';
  end if;
  if p_validation_result is not null and jsonb_typeof(p_validation_result) is distinct from 'object' then
    raise exception 'validation_result must be an object';
  end if;
  insert into public.learning_lab_completions (
    user_id, activity_id, status, started_at, completed_at, validation_result
  ) values (
    v_uid, p_activity_id, 'completed', v_now, v_now, p_validation_result
  )
  on conflict (user_id, activity_id) do update set
    status = 'completed',
    completed_at = coalesce(public.learning_lab_completions.completed_at, v_now),
    validation_result = coalesce(excluded.validation_result, public.learning_lab_completions.validation_result)
  returning * into v_row;
  return to_jsonb(v_row);
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: get_learning_assignment_for_manage_p_activity_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_learning_assignment_for_manage(p_activity_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_spec public.learning_assignment_specs%rowtype;
  v_resources jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  perform public.learning_assignment_assert_manage(p_activity_id, v_uid);
  select * into v_ctx from public.learning_assignment_load_context(p_activity_id);

  select * into v_spec from public.learning_assignment_specs where activity_id = p_activity_id;

  select coalesce(jsonb_agg(
    jsonb_build_object('id', r.id, 'label', r.label, 'url', r.url, 'position', r.position)
    order by r.position
  ), '[]'::jsonb)
  into v_resources
  from public.learning_assignment_resources r
  where r.activity_id = p_activity_id;

  return jsonb_build_object(
    'activity_id', p_activity_id,
    'activity_name', public.learning_composite_text(to_jsonb(v_ctx), 'o_activity', 'name'),
    'activity_status', public.learning_composite_text(to_jsonb(v_ctx), 'o_activity', 'status'),
    'course_id', public.learning_composite_id(to_jsonb(v_ctx), 'o_course'),
    'lesson_id', public.learning_composite_id(to_jsonb(v_ctx), 'o_lesson'),
    'max_score', nullif(public.learning_composite_text(to_jsonb(v_ctx), 'o_settings', 'max_score'), '')::integer,
    'passing_score', nullif(public.learning_composite_text(to_jsonb(v_ctx), 'o_settings', 'passing_score'), '')::integer,
    'allow_late_submission', coalesce(nullif(public.learning_composite_text(to_jsonb(v_ctx), 'o_settings', 'allow_late_submission'), '')::boolean, false),
    'completion_mode', public.learning_composite_text(to_jsonb(v_ctx), 'o_settings', 'completion_mode'),
    'evaluation_mode', public.learning_composite_text(to_jsonb(v_ctx), 'o_settings', 'evaluation_mode'),
    'instructions', coalesce(v_spec.instructions, ''),
    'due_at', v_spec.due_at,
    'max_submissions', v_spec.max_submissions,
    'resources', v_resources
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: get_my_learning_assignment_p_activity_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_learning_assignment(p_activity_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_spec public.learning_assignment_specs%rowtype;
  v_resources jsonb;
  v_submitted_count integer := 0;
  v_draft public.learning_assignment_submissions%rowtype;
  v_latest public.learning_assignment_submissions%rowtype;
  v_review public.learning_assignment_reviews%rowtype;
  v_remaining integer;
  v_status text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_assignment_load_context(p_activity_id);

  if not public.has_learning_course_access(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  if public.learning_composite_text(to_jsonb(v_ctx), 'o_activity', 'status') is distinct from 'published' then
    raise exception 'Assignment is not published';
  end if;

  select * into v_spec from public.learning_assignment_specs where activity_id = p_activity_id;

  select coalesce(jsonb_agg(
    jsonb_build_object('id', r.id, 'label', r.label, 'url', r.url, 'position', r.position)
    order by r.position
  ), '[]'::jsonb)
  into v_resources
  from public.learning_assignment_resources r
  where r.activity_id = p_activity_id;

  select count(*)::integer into v_submitted_count
  from public.learning_assignment_submissions s
  where s.activity_id = p_activity_id
    and s.user_id = v_uid
    and s.status in ('submitted', 'reviewed');

  select * into v_draft
  from public.learning_assignment_submissions s
  where s.activity_id = p_activity_id
    and s.user_id = v_uid
    and s.status = 'draft'
  order by s.attempt_number desc
  limit 1;

  select * into v_latest
  from public.learning_assignment_submissions s
  where s.activity_id = p_activity_id
    and s.user_id = v_uid
    and s.status in ('submitted', 'reviewed')
  order by s.attempt_number desc
  limit 1;

  if found then
    select * into v_review from public.learning_assignment_reviews
    where submission_id = v_latest.id;
  end if;

  if v_spec.max_submissions is null then
    v_remaining := null;
  else
    v_remaining := greatest(v_spec.max_submissions - v_submitted_count, 0);
  end if;

  v_status := case
    when v_latest.status = 'reviewed' then 'reviewed'
    when v_latest.status = 'submitted' then 'submitted'
    when v_draft.id is not null then 'draft'
    else 'not_started'
  end;

  return jsonb_build_object(
    'activity_id', p_activity_id,
    'activity_name', public.learning_composite_text(to_jsonb(v_ctx), 'o_activity', 'name'),
    'course_id', public.learning_composite_id(to_jsonb(v_ctx), 'o_course'),
    'lesson_id', public.learning_composite_id(to_jsonb(v_ctx), 'o_lesson'),
    'instructions', coalesce(v_spec.instructions, ''),
    'due_at', v_spec.due_at,
    'max_submissions', v_spec.max_submissions,
    'allow_late_submission', coalesce(nullif(public.learning_composite_text(to_jsonb(v_ctx), 'o_settings', 'allow_late_submission'), '')::boolean, false),
    'max_score', nullif(public.learning_composite_text(to_jsonb(v_ctx), 'o_settings', 'max_score'), '')::integer,
    'resources', v_resources,
    'status', v_status,
    'submitted_count', v_submitted_count,
    'remaining_submissions', v_remaining,
    'draft_submission_id', v_draft.id,
    'latest_submission_id', v_latest.id,
    'latest_submitted_at', v_latest.submitted_at,
    'latest_is_late', coalesce(v_latest.is_late, false),
    'result', case
      when v_review.submission_id is null then null
      else jsonb_build_object(
        'status', 'reviewed',
        'points_earned', v_review.points_earned,
        'points_possible', v_review.points_possible,
        'passed', v_review.passed,
        'learner_feedback', v_review.learner_feedback,
        'reviewed_at', v_review.reviewed_at
      )
    end
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: get_my_learning_assignment_result_p_activity_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_learning_assignment_result(p_activity_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_latest public.learning_assignment_submissions%rowtype;
  v_review public.learning_assignment_reviews%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_assignment_load_context(p_activity_id);
  if not public.has_learning_course_access(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  select * into v_latest
  from public.learning_assignment_submissions
  where activity_id = p_activity_id
    and user_id = v_uid
    and status = 'reviewed'
  order by attempt_number desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'activity_id', p_activity_id,
      'status', 'not_reviewed',
      'result', null
    );
  end if;

  select * into v_review from public.learning_assignment_reviews
  where submission_id = v_latest.id;

  return jsonb_build_object(
    'activity_id', p_activity_id,
    'submission_id', v_latest.id,
    'status', 'reviewed',
    'result', jsonb_build_object(
      'points_earned', v_review.points_earned,
      'points_possible', v_review.points_possible,
      'passed', v_review.passed,
      'learner_feedback', v_review.learner_feedback,
      'reviewed_at', v_review.reviewed_at
    )
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: get_my_learning_lab_p_activity_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_learning_lab(p_activity_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_spec public.learning_lab_specs%rowtype;
  v_comp public.learning_lab_completions%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_lab_load_context(p_activity_id);
  if not public.has_learning_course_access(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) then
    raise exception 'Not entitled to this course';
  end if;
  select * into v_spec from public.learning_lab_specs where activity_id = p_activity_id;
  select * into v_comp from public.learning_lab_completions
  where user_id = v_uid and activity_id = p_activity_id;
  return jsonb_build_object(
    'activity_id', p_activity_id,
    'activity_name', public.learning_composite_text(to_jsonb(v_ctx), 'o_activity', 'name'),
    'instructions', coalesce(v_spec.instructions, ''),
    'starter_files', coalesce(v_spec.starter_files, '[]'::jsonb),
    'resources', coalesce(v_spec.resources, '[]'::jsonb),
    'validation_hook', v_spec.validation_hook,
    'completion', case when v_comp.user_id is null then null else to_jsonb(v_comp) end
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: get_my_learning_lesson_engine_p_lesson_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_learning_lesson_engine(p_lesson_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_manage boolean := false;
  v_unlock jsonb;
  v_locked boolean := false;
  v_objectives jsonb;
  v_prereqs jsonb;
  v_blocks jsonb := '[]'::jsonb;
  v_media jsonb;
  v_activities jsonb;
  v_lp public.learning_lesson_progress%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_progress_load_lesson_context(p_lesson_id);
  if not (
    public.has_learning_course_access(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid)
    or public.can_manage_learning_course(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not entitled to this course';
  end if;

  v_manage := public.can_manage_learning_course(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid)
    or public.is_platform_admin(v_uid);
  v_unlock := public.get_my_learning_lesson_unlock_state(p_lesson_id);
  v_locked := coalesce((v_unlock->>'locked')::boolean, false);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', o.id, 'position', o.position, 'objective_text', o.objective_text
    ) order by o.position
  ), '[]'::jsonb)
  into v_objectives
  from public.learning_lesson_objectives o
  where o.lesson_id = p_lesson_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'prerequisite_lesson_id', pr.prerequisite_lesson_id,
      'name', les.name,
      'satisfied', exists (
        select 1 from public.learning_lesson_progress lp
        where lp.lesson_id = pr.prerequisite_lesson_id
          and lp.user_id = v_uid and lp.status = 'completed'
      )
    ) order by les.position, les.id
  ), '[]'::jsonb)
  into v_prereqs
  from public.learning_lesson_prerequisites pr
  join public.learning_lessons les on les.id = pr.prerequisite_lesson_id
  where pr.lesson_id = p_lesson_id;

  if v_locked and not v_manage then
    return jsonb_build_object(
      'lesson_id', p_lesson_id,
      'lesson', jsonb_build_object(
        'name', public.learning_composite_text(to_jsonb(v_ctx), 'o_lesson', 'name'),
        'difficulty', public.learning_composite_text(to_jsonb(v_ctx), 'o_lesson', 'difficulty'),
        'estimated_duration_minutes', nullif(public.learning_composite_text(to_jsonb(v_ctx), 'o_lesson', 'estimated_duration_minutes'), '')::integer,
        'description', public.learning_composite_text(to_jsonb(v_ctx), 'o_lesson', 'description'),
        'status', public.learning_composite_text(to_jsonb(v_ctx), 'o_lesson', 'status')
      ),
      'objectives', v_objectives,
      'prerequisites', v_prereqs,
      'unlock', v_unlock,
      'unlock_required', true,
      'blocks', '[]'::jsonb,
      'media_position', null,
      'activities', '[]'::jsonb,
      'ai_tutor_enabled', true
    );
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', b.id, 'block_type', b.block_type, 'position', b.position,
      'status', b.status, 'content', b.content
    ) order by b.position, b.id
  ), '[]'::jsonb)
  into v_blocks
  from public.learning_lesson_content_blocks b
  where b.lesson_id = p_lesson_id and b.status = 'published';

  select * into v_lp from public.learning_lesson_progress
  where user_id = v_uid and lesson_id = p_lesson_id;
  if found then
    v_media := jsonb_build_object(
      'last_media_position_seconds', v_lp.last_media_position_seconds,
      'last_content_block_id', v_lp.last_content_block_id,
      'status', v_lp.status
    );
  else
    v_media := null;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', a.id, 'type', a.type, 'name', a.name, 'status', a.status
    ) order by a.position, a.id
  ), '[]'::jsonb)
  into v_activities
  from public.learning_activities a
  where a.lesson_id = p_lesson_id
    and a.type in ('quiz', 'assignment', 'lab', 'project')
    and (v_manage or a.status = 'published');

  return jsonb_build_object(
    'lesson_id', p_lesson_id,
    'lesson', jsonb_build_object(
      'name', public.learning_composite_text(to_jsonb(v_ctx), 'o_lesson', 'name'),
      'difficulty', public.learning_composite_text(to_jsonb(v_ctx), 'o_lesson', 'difficulty'),
      'estimated_duration_minutes', nullif(public.learning_composite_text(to_jsonb(v_ctx), 'o_lesson', 'estimated_duration_minutes'), '')::integer,
      'description', public.learning_composite_text(to_jsonb(v_ctx), 'o_lesson', 'description'),
      'status', public.learning_composite_text(to_jsonb(v_ctx), 'o_lesson', 'status')
    ),
    'objectives', v_objectives,
    'prerequisites', v_prereqs,
    'unlock', v_unlock,
    'unlock_required', false,
    'blocks', v_blocks,
    'media_position', v_media,
    'activities', v_activities,
    'ai_tutor_enabled', true
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: get_my_learning_lesson_unlock_state_p_lesson_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_learning_lesson_unlock_state(p_lesson_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_cost public.learning_lesson_point_costs%rowtype;
  v_unlocked boolean := false;
  v_balance bigint := 0;
  v_manage boolean := false;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_progress_load_lesson_context(p_lesson_id);
  if not (
    public.has_learning_course_access(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid)
    or public.can_manage_learning_course(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not entitled to this course';
  end if;
  v_manage := public.can_manage_learning_course(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid)
    or public.is_platform_admin(v_uid);
  select * into v_cost from public.learning_lesson_point_costs where lesson_id = p_lesson_id;
  select coalesce(b.balance, 0) into v_balance
  from public.um_point_balances b where b.user_id = v_uid;
  if not found then v_balance := 0; end if;
  select exists (
    select 1 from public.learning_lesson_unlocks u
    where u.user_id = v_uid and u.lesson_id = p_lesson_id
  ) into v_unlocked;
  return jsonb_build_object(
    'lesson_id', p_lesson_id,
    'locked', case
      when v_manage then false
      when v_cost.lesson_id is null or not v_cost.enabled then false
      when v_unlocked then false
      else true
    end,
    'cost', case when v_cost.enabled then v_cost.unlock_cost else null end,
    'balance', v_balance,
    'unlocked', v_unlocked or v_manage
      or v_cost.lesson_id is null or not coalesce(v_cost.enabled, false)
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: get_my_learning_project_p_activity_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_learning_project(p_activity_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_spec public.learning_project_specs%rowtype;
  v_sub public.learning_project_submissions%rowtype;
  v_review public.learning_project_reviews%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_project_load_context(p_activity_id);
  if not public.has_learning_course_access(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) then
    raise exception 'Not entitled to this course';
  end if;
  select * into v_spec from public.learning_project_specs where activity_id = p_activity_id;
  select * into v_sub from public.learning_project_submissions
  where activity_id = p_activity_id and user_id = v_uid
  order by attempt_number desc limit 1;
  if found then
    select * into v_review from public.learning_project_reviews where submission_id = v_sub.id;
  end if;
  return jsonb_build_object(
    'activity_id', p_activity_id,
    'activity_name', public.learning_composite_text(to_jsonb(v_ctx), 'o_activity', 'name'),
    'activity_status', public.learning_composite_text(to_jsonb(v_ctx), 'o_activity', 'status'),
    'instructions', coalesce(v_spec.instructions, ''),
    'submission', case when v_sub.id is null then null else to_jsonb(v_sub) end,
    'review', case when v_review.submission_id is null then null else to_jsonb(v_review) end
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: learning_assignment_assert_manage_p_activity_id_uuid_p_user_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.learning_assignment_assert_manage(p_activity_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ctx record;
begin
  if p_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_ctx from public.learning_assignment_load_context(p_activity_id);

  if not (
    public.can_manage_learning_course(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_user_id)
    or public.is_platform_admin(p_user_id)
  ) then
    raise exception 'Not allowed to manage this assignment';
  end if;
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: learning_progress_complete_lesson_from_assignment_p_lesson_id_uuid_p_user_id_uuid_p_actor_id_uuid_p_activity_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.learning_progress_complete_lesson_from_assignment(p_lesson_id uuid, p_user_id uuid, p_actor_id uuid, p_activity_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_user_id
  );

  select * into v_row
  from public.learning_lesson_progress
  where user_id = p_user_id and lesson_id = p_lesson_id
  for update;

  if not found then
    insert into public.learning_lesson_progress (
      space_id, course_id, lesson_id, user_id, enrollment_id,
      status, completion_source, started_at, last_activity_at,
      completed_at, first_completed_at
    ) values (
      v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, p_user_id, v_enrollment_id,
      'completed', 'assignment_review', v_now, v_now, v_now, v_now
    )
    returning * into v_row;

    perform public.learning_progress_event_write(
      v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, p_user_id, p_actor_id,
      'lesson_completed', 'not_started', 'completed',
      jsonb_build_object(
        'completion_source', 'assignment_review',
        'activity_id', p_activity_id
      )
    );
  elsif v_row.status = 'completed' then
    update public.learning_lesson_progress
    set
      last_activity_at = v_now,
      enrollment_id = coalesce(v_enrollment_id, enrollment_id),
      completion_source = coalesce(completion_source, 'assignment_review')
    where id = v_row.id;
  else
    v_from := v_row.status;
    update public.learning_lesson_progress
    set
      status = 'completed',
      completion_source = 'assignment_review',
      started_at = coalesce(started_at, v_now),
      last_activity_at = v_now,
      completed_at = v_now,
      first_completed_at = coalesce(first_completed_at, v_now),
      enrollment_id = coalesce(v_enrollment_id, enrollment_id)
    where id = v_row.id
    returning * into v_row;

    perform public.learning_progress_event_write(
      v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, p_user_id, p_actor_id,
      'lesson_completed', v_from, 'completed',
      jsonb_build_object(
        'completion_source', 'assignment_review',
        'activity_id', p_activity_id
      )
    );
  end if;

  v_course := public.learning_progress_recompute_course(
    p_user_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, p_actor_id
  );

  update public.learning_course_progress
  set last_activity_id = p_activity_id, updated_at = v_now
  where user_id = p_user_id and course_id = public.learning_composite_id(to_jsonb(v_ctx), 'o_course');

  perform public.learning_audit_write(
    p_actor_id,
    v_ctx.o_space_id,
    'progress.lesson_complete_assignment_review',
    'learning_lesson_progress',
    v_row.id::text,
    jsonb_build_object(
      'course_id', public.learning_composite_id(to_jsonb(v_ctx), 'o_course'),
      'lesson_id', p_lesson_id,
      'activity_id', p_activity_id,
      'user_id', p_user_id,
      'percent_complete', v_course.percent_complete
    )
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: learning_progress_complete_lesson_from_scored_attempt_p_lesson_id_uuid_p_user_id_uuid_p_actor_id_uuid_p_activity_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.learning_progress_complete_lesson_from_scored_attempt(p_lesson_id uuid, p_user_id uuid, p_actor_id uuid, p_activity_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_user_id
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
      public.learning_composite_id(to_jsonb(v_ctx), 'o_course'),
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
      v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, p_user_id, p_actor_id,
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
      v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, p_user_id, p_actor_id,
      'lesson_completed', v_from, 'completed',
      jsonb_build_object(
        'completion_source', 'scored_attempt',
        'activity_id', p_activity_id
      )
    );
  end if;

  -- Course rollup ONLY after successful lesson progress write (same txn).
  v_course := public.learning_progress_recompute_course(
    p_user_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, p_actor_id
  );

  -- Optional: record last activity id on course rollup (reserved column).
  update public.learning_course_progress
  set last_activity_id = p_activity_id,
      updated_at = v_now
  where user_id = p_user_id
    and course_id = public.learning_composite_id(to_jsonb(v_ctx), 'o_course');

  perform public.learning_audit_write(
    p_actor_id,
    v_ctx.o_space_id,
    'progress.lesson_complete_scored_attempt',
    'learning_lesson_progress',
    v_row.id::text,
    jsonb_build_object(
      'course_id', public.learning_composite_id(to_jsonb(v_ctx), 'o_course'),
      'lesson_id', p_lesson_id,
      'activity_id', p_activity_id,
      'user_id', p_user_id,
      'completion_source', 'scored_attempt',
      'percent_complete', v_course.percent_complete
    )
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: learning_progress_complete_lesson_from_submitted_attempt_p_lesson_id_uuid_p_user_id_uuid_p_actor_id_uuid_p_activity_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.learning_progress_complete_lesson_from_submitted_attempt(p_lesson_id uuid, p_user_id uuid, p_actor_id uuid, p_activity_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_user_id
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
      public.learning_composite_id(to_jsonb(v_ctx), 'o_course'),
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
      v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, p_user_id, p_actor_id,
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
      v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, p_user_id, p_actor_id,
      'lesson_completed', v_from, 'completed',
      jsonb_build_object(
        'completion_source', 'submitted_attempt',
        'activity_id', p_activity_id
      )
    );
  end if;

  -- Course rollup ONLY after successful lesson progress write (same txn).
  v_course := public.learning_progress_recompute_course(
    p_user_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, p_actor_id
  );

  update public.learning_course_progress
  set last_activity_id = p_activity_id,
      updated_at = v_now
  where user_id = p_user_id
    and course_id = public.learning_composite_id(to_jsonb(v_ctx), 'o_course');

  perform public.learning_audit_write(
    p_actor_id,
    v_ctx.o_space_id,
    'progress.lesson_complete_submitted_attempt',
    'learning_lesson_progress',
    v_row.id::text,
    jsonb_build_object(
      'course_id', public.learning_composite_id(to_jsonb(v_ctx), 'o_course'),
      'lesson_id', p_lesson_id,
      'activity_id', p_activity_id,
      'user_id', p_user_id,
      'completion_source', 'submitted_attempt',
      'percent_complete', v_course.percent_complete
    )
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: reopen_learning_lesson_p_lesson_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reopen_learning_lesson(p_lesson_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_row public.learning_lesson_progress%rowtype;
  v_from text;
  v_now timestamptz := now();
  v_course public.learning_course_progress%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_ctx
  from public.learning_progress_load_lesson_context(p_lesson_id);

  if not public.has_learning_course_access(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  select * into v_row
  from public.learning_lesson_progress
  where user_id = v_uid and lesson_id = p_lesson_id
  for update;

  if not found then
    raise exception 'Lesson progress not found';
  end if;

  if v_row.status is distinct from 'completed' then
    raise exception 'Only completed lessons can be reopened';
  end if;

  v_from := v_row.status;
  update public.learning_lesson_progress
  set
    status = 'in_progress',
    completed_at = null,
    last_activity_at = v_now
    -- first_completed_at retained; started_at retained
  where id = v_row.id
  returning * into v_row;

  perform public.learning_progress_event_write(
    v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, v_uid, v_uid,
    'lesson_reopened', v_from, 'in_progress', '{}'::jsonb
  );

  v_course := public.learning_progress_recompute_course(
    v_uid, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, v_uid
  );

  perform public.learning_audit_write(
    v_uid,
    v_ctx.o_space_id,
    'progress.lesson_reopen',
    'learning_lesson_progress',
    v_row.id::text,
    jsonb_build_object(
      'course_id', public.learning_composite_id(to_jsonb(v_ctx), 'o_course'),
      'lesson_id', p_lesson_id,
      'status', v_row.status
    )
  );

  return jsonb_build_object(
    'lesson_progress', to_jsonb(v_row),
    'course_progress', to_jsonb(v_course)
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: set_learning_lesson_objectives_p_lesson_id_uuid_p_objectives_jsonb_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_learning_lesson_objectives(p_lesson_id uuid, p_objectives jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_elem jsonb;
  v_idx integer := 0;
  v_text text;
  v_items jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_lesson_id is null then raise exception 'lesson_id is required'; end if;
  select * into v_ctx from public.learning_progress_load_lesson_context(p_lesson_id);
  if not (
    public.can_manage_learning_course(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to manage this lesson';
  end if;
  if p_objectives is null or jsonb_typeof(p_objectives) is distinct from 'array' then
    raise exception 'objectives must be a JSON array';
  end if;
  if jsonb_array_length(p_objectives) > 64 then
    raise exception 'Too many objectives';
  end if;

  delete from public.learning_lesson_objectives where lesson_id = p_lesson_id;

  for v_elem in select * from jsonb_array_elements(p_objectives)
  loop
    if jsonb_typeof(v_elem) is distinct from 'string' then
      raise exception 'Each objective must be a string';
    end if;
    v_text := nullif(btrim(v_elem #>> '{}'), '');
    if v_text is null or char_length(v_text) > 500 then
      raise exception 'objective_text must be 1..500 chars';
    end if;
    perform public.learning_lesson_content_block_assert_safe_text('objective_text', v_text);
    insert into public.learning_lesson_objectives (lesson_id, position, objective_text)
    values (p_lesson_id, v_idx, v_text);
    v_idx := v_idx + 1;
  end loop;

  select coalesce(jsonb_agg(
    jsonb_build_object('id', o.id, 'position', o.position, 'objective_text', o.objective_text)
    order by o.position
  ), '[]'::jsonb)
  into v_items
  from public.learning_lesson_objectives o
  where o.lesson_id = p_lesson_id;

  perform public.learning_audit_write(
    v_uid, v_ctx.o_space_id, 'lesson.objectives_set',
    'learning_lesson', p_lesson_id::text,
    jsonb_build_object('count', v_idx)
  );

  return jsonb_build_object('lesson_id', p_lesson_id, 'objectives', v_items);
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: set_learning_lesson_point_cost_p_lesson_id_uuid_p_unlock_cost_integer_p_enabled_boolean_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_learning_lesson_point_cost(p_lesson_id uuid, p_unlock_cost integer, p_enabled boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_row public.learning_lesson_point_costs%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_progress_load_lesson_context(p_lesson_id);
  if not (public.can_manage_learning_course(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) or public.is_platform_admin(v_uid)) then
    raise exception 'Not allowed to manage this lesson';
  end if;
  if p_unlock_cost is null or p_unlock_cost <= 0 then
    raise exception 'unlock_cost must be > 0';
  end if;
  insert into public.learning_lesson_point_costs (lesson_id, unlock_cost, enabled)
  values (p_lesson_id, p_unlock_cost, coalesce(p_enabled, true))
  on conflict (lesson_id) do update set
    unlock_cost = excluded.unlock_cost,
    enabled = excluded.enabled,
    updated_at = now()
  returning * into v_row;
  perform public.learning_audit_write(
    v_uid, v_ctx.o_space_id, 'lesson.point_cost_set',
    'learning_lesson', p_lesson_id::text,
    jsonb_build_object('unlock_cost', v_row.unlock_cost, 'enabled', v_row.enabled)
  );
  return to_jsonb(v_row);
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: set_learning_lesson_prerequisites_p_lesson_id_uuid_p_prerequisite_lesson_ids_jsonb_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_learning_lesson_prerequisites(p_lesson_id uuid, p_prerequisite_lesson_ids jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_elem jsonb;
  v_prereq uuid;
  v_prereq_course uuid;
  v_items jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_progress_load_lesson_context(p_lesson_id);
  if not (
    public.can_manage_learning_course(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to manage this lesson';
  end if;
  if p_prerequisite_lesson_ids is null
     or jsonb_typeof(p_prerequisite_lesson_ids) is distinct from 'array'
  then
    raise exception 'prerequisite_lesson_ids must be a JSON array';
  end if;
  if jsonb_array_length(p_prerequisite_lesson_ids) > 32 then
    raise exception 'Too many prerequisites';
  end if;

  delete from public.learning_lesson_prerequisites where lesson_id = p_lesson_id;

  for v_elem in select * from jsonb_array_elements(p_prerequisite_lesson_ids)
  loop
    begin
      v_prereq := (v_elem #>> '{}')::uuid;
    exception when others then
      raise exception 'Invalid prerequisite lesson id';
    end;
    if v_prereq is null or v_prereq = p_lesson_id then
      raise exception 'Invalid prerequisite lesson id';
    end if;
    select sec.course_id into v_prereq_course
    from public.learning_lessons les
    join public.learning_sections sec on sec.id = les.section_id
    where les.id = v_prereq;
    if v_prereq_course is null then
      raise exception 'Prerequisite lesson not found';
    end if;
    if v_prereq_course is distinct from public.learning_composite_id(to_jsonb(v_ctx), 'o_course') then
      raise exception 'Prerequisite must be in the same course';
    end if;
    insert into public.learning_lesson_prerequisites (lesson_id, prerequisite_lesson_id)
    values (p_lesson_id, v_prereq)
    on conflict do nothing;
  end loop;

  select coalesce(jsonb_agg(pr.prerequisite_lesson_id order by pr.prerequisite_lesson_id), '[]'::jsonb)
  into v_items
  from public.learning_lesson_prerequisites pr
  where pr.lesson_id = p_lesson_id;

  perform public.learning_audit_write(
    v_uid, v_ctx.o_space_id, 'lesson.prerequisites_set',
    'learning_lesson', p_lesson_id::text,
    jsonb_build_object('count', jsonb_array_length(v_items))
  );

  return jsonb_build_object('lesson_id', p_lesson_id, 'prerequisite_lesson_ids', v_items);
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: start_learning_lesson_p_lesson_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_learning_lesson(p_lesson_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_row public.learning_lesson_progress%rowtype;
  v_from text;
  v_enrollment_id uuid;
  v_now timestamptz := now();
  v_course public.learning_course_progress%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_ctx
  from public.learning_progress_load_lesson_context(p_lesson_id);

  if not public.has_learning_course_access(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  v_enrollment_id := public.learning_progress_resolve_enrollment_id(
    public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid
  );

  select * into v_row
  from public.learning_lesson_progress
  where user_id = v_uid and lesson_id = p_lesson_id
  for update;

  if not found then
    insert into public.learning_lesson_progress (
      space_id,
      course_id,
      lesson_id,
      user_id,
      enrollment_id,
      status,
      started_at,
      last_activity_at
    ) values (
      v_ctx.o_space_id,
      public.learning_composite_id(to_jsonb(v_ctx), 'o_course'),
      p_lesson_id,
      v_uid,
      v_enrollment_id,
      'in_progress',
      v_now,
      v_now
    )
    returning * into v_row;

    perform public.learning_progress_event_write(
      v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, v_uid, v_uid,
      'lesson_started', 'not_started', 'in_progress', '{}'::jsonb
    );
  else
    v_from := v_row.status;
    if v_row.status = 'completed' then
      -- Already complete: touch last_activity only (do not downgrade).
      update public.learning_lesson_progress
      set
        last_activity_at = v_now,
        enrollment_id = coalesce(v_enrollment_id, enrollment_id)
      where id = v_row.id
      returning * into v_row;
    elsif v_row.status = 'not_started' then
      update public.learning_lesson_progress
      set
        status = 'in_progress',
        started_at = coalesce(started_at, v_now),
        last_activity_at = v_now,
        enrollment_id = coalesce(v_enrollment_id, enrollment_id)
      where id = v_row.id
      returning * into v_row;

      perform public.learning_progress_event_write(
        v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, v_uid, v_uid,
        'lesson_started', v_from, 'in_progress', '{}'::jsonb
      );
    else
      update public.learning_lesson_progress
      set
        last_activity_at = v_now,
        enrollment_id = coalesce(v_enrollment_id, enrollment_id)
      where id = v_row.id
      returning * into v_row;

      perform public.learning_progress_event_write(
        v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, v_uid, v_uid,
        'lesson_resumed', v_from, v_row.status, '{}'::jsonb
      );
    end if;
  end if;

  v_course := public.learning_progress_recompute_course(
    v_uid, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, v_uid
  );

  perform public.learning_audit_write(
    v_uid,
    v_ctx.o_space_id,
    'progress.lesson_start',
    'learning_lesson_progress',
    v_row.id::text,
    jsonb_build_object(
      'course_id', public.learning_composite_id(to_jsonb(v_ctx), 'o_course'),
      'lesson_id', p_lesson_id,
      'status', v_row.status
    )
  );

  return jsonb_build_object(
    'lesson_progress', to_jsonb(v_row),
    'course_progress', to_jsonb(v_course)
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: start_my_learning_assignment_submission_p_activity_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_my_learning_assignment_submission(p_activity_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_spec public.learning_assignment_specs%rowtype;
  v_draft public.learning_assignment_submissions%rowtype;
  v_submitted_count integer := 0;
  v_next integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_assignment_load_context(p_activity_id);

  if not public.has_learning_course_access(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) then
    raise exception 'Not entitled to this course';
  end if;
  if public.learning_composite_text(to_jsonb(v_ctx), 'o_activity', 'status') is distinct from 'published' then
    raise exception 'Assignment is not published';
  end if;

  select * into v_spec from public.learning_assignment_specs where activity_id = p_activity_id;

  select * into v_draft
  from public.learning_assignment_submissions
  where activity_id = p_activity_id and user_id = v_uid and status = 'draft'
  order by attempt_number desc limit 1;

  if found then
    return jsonb_build_object(
      'submission_id', v_draft.id,
      'attempt_number', v_draft.attempt_number,
      'status', v_draft.status,
      'idempotent', true
    );
  end if;

  select count(*)::integer into v_submitted_count
  from public.learning_assignment_submissions
  where activity_id = p_activity_id
    and user_id = v_uid
    and status in ('submitted', 'reviewed');

  if v_spec.max_submissions is not null and v_submitted_count >= v_spec.max_submissions then
    raise exception 'Maximum submissions reached';
  end if;

  if v_spec.due_at is not null
     and now() > v_spec.due_at
     and coalesce(nullif(public.learning_composite_text(to_jsonb(v_ctx), 'o_settings', 'allow_late_submission'), '')::boolean, false) is false
  then
    raise exception 'Assignment is past due';
  end if;

  v_next := v_submitted_count + 1;

  insert into public.learning_assignment_submissions (
    space_id, course_id, lesson_id, activity_id, user_id,
    attempt_number, status
  ) values (
    v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), public.learning_composite_id(to_jsonb(v_ctx), 'o_lesson'), p_activity_id, v_uid,
    v_next, 'draft'
  )
  returning * into v_draft;

  return jsonb_build_object(
    'submission_id', v_draft.id,
    'attempt_number', v_draft.attempt_number,
    'status', v_draft.status,
    'idempotent', false
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: start_my_learning_lab_p_activity_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_my_learning_lab(p_activity_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_row public.learning_lab_completions%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_lab_load_context(p_activity_id);
  if not public.has_learning_course_access(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) then
    raise exception 'Not entitled to this course';
  end if;
  insert into public.learning_lab_completions (user_id, activity_id, status)
  values (v_uid, p_activity_id, 'in_progress')
  on conflict (user_id, activity_id) do update set
    status = case
      when public.learning_lab_completions.status = 'completed' then 'completed'
      else 'in_progress'
    end
  returning * into v_row;
  return to_jsonb(v_row);
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: start_my_learning_project_submission_p_activity_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_my_learning_project_submission(p_activity_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_attempt integer;
  v_row public.learning_project_submissions%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_project_load_context(p_activity_id);
  if not public.has_learning_course_access(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) then
    raise exception 'Not entitled to this course';
  end if;
  select * into v_row
  from public.learning_project_submissions
  where user_id = v_uid and activity_id = p_activity_id and status = 'draft'
  order by attempt_number desc limit 1;
  if found then
    return to_jsonb(v_row);
  end if;
  select coalesce(max(attempt_number), 0) + 1 into v_attempt
  from public.learning_project_submissions
  where user_id = v_uid and activity_id = p_activity_id;
  insert into public.learning_project_submissions (
    space_id, course_id, lesson_id, activity_id, user_id, attempt_number, status
  ) values (
    v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), public.learning_composite_id(to_jsonb(v_ctx), 'o_lesson'), p_activity_id,
    v_uid, v_attempt, 'draft'
  )
  returning * into v_row;
  return to_jsonb(v_row);
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: touch_learning_lesson_p_lesson_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_learning_lesson(p_lesson_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_row public.learning_lesson_progress%rowtype;
  v_course public.learning_course_progress%rowtype;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_ctx
  from public.learning_progress_load_lesson_context(p_lesson_id);

  if not public.has_learning_course_access(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  select * into v_row
  from public.learning_lesson_progress
  where user_id = v_uid and lesson_id = p_lesson_id
  for update;

  if not found then
    -- Touch implies activity ΓÇö bootstrap via start semantics.
    return public.start_learning_lesson(p_lesson_id);
  end if;

  update public.learning_lesson_progress
  set last_activity_at = v_now
  where id = v_row.id
  returning * into v_row;

  perform public.learning_progress_event_write(
    v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, v_uid, v_uid,
    'lesson_touched', v_row.status, v_row.status, '{}'::jsonb
  );

  update public.learning_course_progress
  set
    last_lesson_id = p_lesson_id,
    last_activity_at = v_now
  where user_id = v_uid and course_id = public.learning_composite_id(to_jsonb(v_ctx), 'o_course')
  returning * into v_course;

  if not found then
    v_course := public.learning_progress_recompute_course(
      v_uid, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, v_uid
    );
  end if;

  return jsonb_build_object(
    'lesson_progress', to_jsonb(v_row),
    'course_progress', to_jsonb(v_course)
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: unlock_my_learning_lesson_with_um_points_p_lesson_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlock_my_learning_lesson_with_um_points(p_lesson_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_cost public.learning_lesson_point_costs%rowtype;
  v_balance bigint;
  v_dedupe text;
  v_updated integer;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'authentication_required');
  end if;
  select * into v_ctx from public.learning_progress_load_lesson_context(p_lesson_id);
  if not public.has_learning_course_access(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) then
    return jsonb_build_object('success', false, 'error', 'not_entitled');
  end if;
  if public.can_manage_learning_course(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) or public.is_platform_admin(v_uid) then
    return jsonb_build_object('success', true, 'unlocked', true, 'reason', 'manager_bypass');
  end if;
  select * into v_cost from public.learning_lesson_point_costs where lesson_id = p_lesson_id;
  if not found or not v_cost.enabled then
    return jsonb_build_object('success', true, 'unlocked', true, 'reason', 'no_cost');
  end if;
  if exists (
    select 1 from public.learning_lesson_unlocks u
    where u.user_id = v_uid and u.lesson_id = p_lesson_id
  ) then
    return jsonb_build_object('success', true, 'unlocked', true, 'reason', 'already_unlocked');
  end if;

  v_dedupe := 'learning_lesson_unlock:' || p_lesson_id::text;
  update public.um_point_balances
  set balance = balance - v_cost.unlock_cost, updated_at = now()
  where user_id = v_uid and balance >= v_cost.unlock_cost;
  get diagnostics v_updated = row_count;
  if v_updated < 1 then
    select coalesce(balance, 0) into v_balance from public.um_point_balances where user_id = v_uid;
    return jsonb_build_object(
      'success', false, 'error', 'insufficient_balance',
      'cost', v_cost.unlock_cost, 'balance', coalesce(v_balance, 0)
    );
  end if;

  begin
    insert into public.learning_lesson_unlocks (
      user_id, lesson_id, points_spent, dedupe_key
    ) values (
      v_uid, p_lesson_id, v_cost.unlock_cost, v_dedupe
    );
  exception when unique_violation then
    update public.um_point_balances
    set balance = balance + v_cost.unlock_cost, updated_at = now()
    where user_id = v_uid;
    return jsonb_build_object('success', true, 'unlocked', true, 'reason', 'already_unlocked');
  end;

  select balance into v_balance from public.um_point_balances where user_id = v_uid;
  perform public.learning_audit_write(
    v_uid, v_ctx.o_space_id, 'lesson.um_points_unlock',
    'learning_lesson', p_lesson_id::text,
    jsonb_build_object('points_spent', v_cost.unlock_cost)
  );
  return jsonb_build_object(
    'success', true, 'unlocked', true,
    'points_spent', v_cost.unlock_cost, 'balance', v_balance
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: upsert_learning_lab_spec_p_activity_id_uuid_p_instructions_text_p_starter_files_jsonb_p_resources_jsonb_p_validation_hook_text_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_learning_lab_spec(p_activity_id uuid, p_instructions text DEFAULT ''::text, p_starter_files jsonb DEFAULT '[]'::jsonb, p_resources jsonb DEFAULT '[]'::jsonb, p_validation_hook text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_row public.learning_lab_specs%rowtype;
  v_elem jsonb;
  v_files jsonb := coalesce(p_starter_files, '[]'::jsonb);
  v_res jsonb := coalesce(p_resources, '[]'::jsonb);
  v_hook text := nullif(btrim(coalesce(p_validation_hook, '')), '');
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_lab_load_context(p_activity_id);
  if not (public.can_manage_learning_course(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) or public.is_platform_admin(v_uid)) then
    raise exception 'Not allowed to manage this lab';
  end if;
  if jsonb_typeof(v_files) is distinct from 'array' or jsonb_typeof(v_res) is distinct from 'array' then
    raise exception 'starter_files and resources must be arrays';
  end if;
  if jsonb_array_length(v_files) > 32 or jsonb_array_length(v_res) > 32 then
    raise exception 'Too many starter_files or resources';
  end if;
  for v_elem in select * from jsonb_array_elements(v_files)
  loop
    if nullif(btrim(coalesce(v_elem->>'label', '')), '') is null then
      raise exception 'starter_files.label is required';
    end if;
    perform public.learning_lesson_content_block_assert_safe_url('starter_files.url', v_elem->>'url');
  end loop;
  for v_elem in select * from jsonb_array_elements(v_res)
  loop
    if nullif(btrim(coalesce(v_elem->>'label', '')), '') is null then
      raise exception 'resources.label is required';
    end if;
    perform public.learning_lesson_content_block_assert_safe_url('resources.url', v_elem->>'url');
  end loop;
  if v_hook is not null and v_hook !~ '^[a-z][a-z0-9_]{0,63}$' then
    raise exception 'Invalid validation_hook';
  end if;
  insert into public.learning_lab_specs (
    activity_id, instructions, starter_files, resources, validation_hook, created_by
  ) values (
    p_activity_id, coalesce(p_instructions, ''), v_files, v_res, v_hook, v_uid
  )
  on conflict (activity_id) do update set
    instructions = excluded.instructions,
    starter_files = excluded.starter_files,
    resources = excluded.resources,
    validation_hook = excluded.validation_hook,
    updated_at = now()
  returning * into v_row;
  perform public.learning_audit_write(
    v_uid, v_ctx.o_space_id, 'lab.spec_upsert',
    'learning_lab_spec', p_activity_id::text, '{}'::jsonb
  );
  return to_jsonb(v_row);
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: upsert_learning_project_spec_p_activity_id_uuid_p_instructions_text_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_learning_project_spec(p_activity_id uuid, p_instructions text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_row public.learning_project_specs%rowtype;
  v_instructions text := coalesce(p_instructions, '');
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_project_load_context(p_activity_id);
  if not (
    public.can_manage_learning_course(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to manage this project';
  end if;
  if char_length(v_instructions) > 20000 then
    raise exception 'instructions exceeds maximum length';
  end if;
  insert into public.learning_project_specs (activity_id, instructions, created_by)
  values (p_activity_id, v_instructions, v_uid)
  on conflict (activity_id) do update set
    instructions = excluded.instructions,
    updated_at = now()
  returning * into v_row;
  perform public.learning_audit_write(
    v_uid, v_ctx.o_space_id, 'project.spec_upsert',
    'learning_project_spec', p_activity_id::text, '{}'::jsonb
  );
  return jsonb_build_object(
    'activity_id', v_row.activity_id,
    'instructions', v_row.instructions
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- Rewritten affected RPC (live body; nested composite access replaced)
-- Dump: upsert_my_learning_lesson_media_position_p_lesson_id_uuid_p_position_seconds_integer_p_content_block_id_uuid_.sql
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_my_learning_lesson_media_position(p_lesson_id uuid, p_position_seconds integer, p_content_block_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_enrollment_id uuid;
  v_now timestamptz := now();
  v_row public.learning_lesson_progress%rowtype;
  v_block_lesson uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_lesson_id is null then raise exception 'lesson_id is required'; end if;
  if p_position_seconds is null or p_position_seconds < 0 then
    raise exception 'position_seconds must be >= 0';
  end if;

  select * into v_ctx from public.learning_progress_load_lesson_context(p_lesson_id);
  if not public.has_learning_course_access(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  if p_content_block_id is not null then
    select b.lesson_id into v_block_lesson
    from public.learning_lesson_content_blocks b
    where b.id = p_content_block_id;
    if v_block_lesson is distinct from p_lesson_id then
      raise exception 'content_block_id is not in this lesson';
    end if;
  end if;

  v_enrollment_id := public.learning_progress_resolve_enrollment_id(public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), v_uid);

  select * into v_row
  from public.learning_lesson_progress
  where user_id = v_uid and lesson_id = p_lesson_id
  for update;

  if not found then
    insert into public.learning_lesson_progress (
      space_id, course_id, lesson_id, user_id, enrollment_id,
      status, started_at, last_activity_at,
      last_media_position_seconds, last_content_block_id
    ) values (
      v_ctx.o_space_id, public.learning_composite_id(to_jsonb(v_ctx), 'o_course'), p_lesson_id, v_uid, v_enrollment_id,
      'in_progress', v_now, v_now,
      p_position_seconds, p_content_block_id
    )
    returning * into v_row;
  else
    update public.learning_lesson_progress
    set
      last_media_position_seconds = p_position_seconds,
      last_content_block_id = coalesce(p_content_block_id, last_content_block_id),
      last_activity_at = v_now,
      status = case when status = 'not_started' then 'in_progress' else status end,
      started_at = coalesce(started_at, v_now),
      enrollment_id = coalesce(v_enrollment_id, enrollment_id)
    where id = v_row.id
    returning * into v_row;
  end if;

  return jsonb_build_object(
    'lesson_id', p_lesson_id,
    'last_media_position_seconds', v_row.last_media_position_seconds,
    'last_content_block_id', v_row.last_content_block_id,
    'status', v_row.status
  );
end;
$function$;

