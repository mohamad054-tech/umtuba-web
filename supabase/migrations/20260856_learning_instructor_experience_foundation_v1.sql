-- =============================================================================
-- UM Learning OS — Instructor Experience Foundation V1
-- Migration: 20260856_learning_instructor_experience_foundation_v1.sql
--
-- Staff read-only workspace surfaces:
--   1) Instructor dashboard
--   2) Manual review queue (filters; reuses review tables / auth)
--   3) Learner progress monitor
--   4) Course overview
--   5) Learner details (read-only)
--   6) Completion overview
--
-- Reuses: progress, enrollments, attempts/results, manual review, certificates.
-- Does NOT: mutate grades/progress/certificates, author content, notify, AI.
-- Auth: can_manage_learning_course OR is_platform_admin (same as manual review).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) Shared helpers (internal)
-- ---------------------------------------------------------------------------

create or replace function public.learning_instructor_assert_course_manage(
  p_course_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_course_id is null then
    raise exception 'course_id is required';
  end if;
  if not (
    public.can_manage_learning_course(p_course_id, p_user_id)
    or public.is_platform_admin(p_user_id)
  ) then
    raise exception 'Not allowed to manage this course';
  end if;
end;
$$;

revoke all on function public.learning_instructor_assert_course_manage(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.learning_instructor_learner_label(
  p_user_id uuid
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(btrim(p.display_name), ''),
    nullif(btrim(p.full_name), ''),
    nullif(btrim(p.username), ''),
    p.id::text
  )
  from public.profiles p
  where p.id = p_user_id;
$$;

revoke all on function public.learning_instructor_learner_label(uuid)
  from public, anon, authenticated;

-- Active course/program enrollments for a course (cohort base).
create or replace function public.learning_instructor_course_learners(
  p_course_id uuid
)
returns table (
  learner_user_id uuid,
  enrollment_id uuid,
  enrollment_status text,
  enrollment_target_type text,
  enrolled_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (e.user_id)
    e.user_id,
    e.id,
    e.status,
    e.target_type,
    coalesce(e.activated_at, e.created_at) as enrolled_at
  from public.learning_enrollments e
  where e.status in ('pending', 'active', 'suspended', 'completed')
    and (
      e.course_id = p_course_id
      or e.program_id = (
        select c.program_id from public.learning_courses c where c.id = p_course_id
      )
    )
  order by
    e.user_id,
    case when e.course_id = p_course_id then 0 else 1 end,
    case e.status
      when 'active' then 0
      when 'completed' then 1
      when 'pending' then 2
      when 'suspended' then 3
      else 4
    end,
    e.created_at;
$$;

revoke all on function public.learning_instructor_course_learners(uuid)
  from public, anon, authenticated;

create or replace function public.learning_instructor_pending_review_count(
  p_course_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.learning_attempts a
  join public.learning_attempt_results r
    on r.attempt_id = a.id
  where a.course_id = p_course_id
    and a.status = 'submitted'
    and r.status = 'partially_graded'
    and coalesce(r.has_pending_manual_review, false) = true;
$$;

revoke all on function public.learning_instructor_pending_review_count(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1) Dashboard
-- ---------------------------------------------------------------------------

create or replace function public.get_instructor_learning_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_courses jsonb;
  v_pending jsonb;
  v_recent jsonb;
  v_course_count integer := 0;
  v_enrollment_count integer := 0;
  v_pending_total integer := 0;
  v_completed_total integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'course_id', x.course_id,
        'course_name', x.course_name,
        'course_slug', x.course_slug,
        'course_status', x.course_status,
        'enrollment_count', x.enrollment_count,
        'active_learners', x.active_learners,
        'completion_count', x.completion_count,
        'pending_reviews', x.pending_reviews,
        'avg_percent_complete', x.avg_percent_complete
      )
      order by x.course_name
    ),
    '[]'::jsonb
  ),
  coalesce(sum(x.enrollment_count), 0)::integer,
  coalesce(sum(x.pending_reviews), 0)::integer,
  coalesce(sum(x.completion_count), 0)::integer,
  count(*)::integer
  into
    v_courses,
    v_enrollment_count,
    v_pending_total,
    v_completed_total,
    v_course_count
  from (
    select
      c.id as course_id,
      c.name as course_name,
      c.slug as course_slug,
      c.status as course_status,
      (
        select count(*)::integer
        from public.learning_instructor_course_learners(c.id)
      ) as enrollment_count,
      (
        select count(*)::integer
        from public.learning_course_progress cp
        where cp.course_id = c.id
          and cp.status = 'in_progress'
      ) as active_learners,
      (
        select count(*)::integer
        from public.learning_course_progress cp
        where cp.course_id = c.id
          and cp.status = 'completed'
      ) as completion_count,
      public.learning_instructor_pending_review_count(c.id) as pending_reviews,
      (
        select round(avg(cp.percent_complete)::numeric, 1)
        from public.learning_course_progress cp
        where cp.course_id = c.id
      ) as avg_percent_complete
    from public.learning_courses c
    where public.can_manage_learning_course(c.id, v_uid)
       or public.is_platform_admin(v_uid)
  ) x;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_pending
  from (
    select
      'manual_review'::text as kind,
      a.course_id,
      c.name as course_name,
      a.id as attempt_id,
      a.user_id as learner_user_id,
      public.learning_instructor_learner_label(a.user_id) as learner_label,
      a.submitted_at,
      r.status as grading_status
    from public.learning_attempts a
    join public.learning_attempt_results r on r.attempt_id = a.id
    join public.learning_courses c on c.id = a.course_id
    where a.status = 'submitted'
      and r.status = 'partially_graded'
      and coalesce(r.has_pending_manual_review, false) = true
      and (
        public.can_manage_learning_course(a.course_id, v_uid)
        or public.is_platform_admin(v_uid)
      )
    order by a.submitted_at desc nulls last
    limit 25
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_recent
  from (
    select
      e.event_type,
      e.course_id,
      c.name as course_name,
      e.user_id as learner_user_id,
      public.learning_instructor_learner_label(e.user_id) as learner_label,
      e.created_at,
      e.from_status,
      e.to_status
    from public.learning_progress_events e
    join public.learning_courses c on c.id = e.course_id
    where e.course_id is not null
      and (
        public.can_manage_learning_course(e.course_id, v_uid)
        or public.is_platform_admin(v_uid)
      )
    order by e.created_at desc
    limit 25
  ) t;

  return jsonb_build_object(
    'instructor_user_id', v_uid,
    'totals', jsonb_build_object(
      'course_count', coalesce(v_course_count, 0),
      'enrollment_count', coalesce(v_enrollment_count, 0),
      'pending_reviews', coalesce(v_pending_total, 0),
      'completion_count', coalesce(v_completed_total, 0)
    ),
    'courses', coalesce(v_courses, '[]'::jsonb),
    'pending_work', coalesce(v_pending, '[]'::jsonb),
    'recent_activity', coalesce(v_recent, '[]'::jsonb)
  );
end;
$$;

comment on function public.get_instructor_learning_dashboard() is
  'Instructor Experience V1 — staff dashboard: courses, quick stats, pending review work, recent progress events. Read-only.';

-- ---------------------------------------------------------------------------
-- 2) Manual review queue (hub + filters; reuses review foundation data)
-- ---------------------------------------------------------------------------

create or replace function public.get_instructor_learning_review_queue(
  p_course_id uuid default null,
  p_status text default 'pending',
  p_search text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text := lower(nullif(btrim(coalesce(p_status, 'pending')), ''));
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_items jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_course_id is not null then
    perform public.learning_instructor_assert_course_manage(p_course_id, v_uid);
  end if;

  if v_status is null or v_status not in ('pending', 'partially_graded', 'graded', 'all') then
    raise exception 'Invalid status filter';
  end if;

  if v_status = 'pending' then
    v_status := 'partially_graded';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_items
  from (
    select
      a.id as attempt_id,
      a.course_id,
      c.name as course_name,
      a.activity_id,
      a.user_id as learner_user_id,
      public.learning_instructor_learner_label(a.user_id) as learner_label,
      a.submitted_at,
      r.status as grading_status,
      (
        select count(*)::integer
        from public.learning_attempt_answer_results ar
        where ar.attempt_id = a.id
          and ar.result_state = 'pending_manual_review'
      ) as pending_question_count,
      r.pending_manual_points,
      coalesce(r.has_pending_manual_review, false) as has_pending_manual_review
    from public.learning_attempts a
    join public.learning_attempt_results r on r.attempt_id = a.id
    join public.learning_courses c on c.id = a.course_id
    where a.status = 'submitted'
      and (p_course_id is null or a.course_id = p_course_id)
      and (
        public.can_manage_learning_course(a.course_id, v_uid)
        or public.is_platform_admin(v_uid)
      )
      and (
        (v_status = 'all' and r.status in ('partially_graded', 'graded', 'scored'))
        or (v_status = 'partially_graded'
            and r.status = 'partially_graded'
            and coalesce(r.has_pending_manual_review, false) = true)
        or (v_status = 'graded' and r.status = 'graded')
      )
      and (
        v_search is null
        or a.id::text ilike '%' || v_search || '%'
        or a.user_id::text ilike '%' || v_search || '%'
        or coalesce(public.learning_instructor_learner_label(a.user_id), '')
             ilike '%' || v_search || '%'
        or c.name ilike '%' || v_search || '%'
      )
    order by
      case when r.status = 'partially_graded' then 0 else 1 end,
      a.submitted_at desc nulls last,
      a.id
    limit 200
  ) t;

  return jsonb_build_object(
    'course_id', p_course_id,
    'status_filter', coalesce(nullif(btrim(coalesce(p_status, 'pending')), ''), 'pending'),
    'search', v_search,
    'items', coalesce(v_items, '[]'::jsonb),
    'item_count', jsonb_array_length(coalesce(v_items, '[]'::jsonb))
  );
end;
$$;

comment on function public.get_instructor_learning_review_queue(uuid, text, text) is
  'Instructor Experience V1 — staff review queue with optional course/status/search filters. Reuses attempt results; does not mutate. Links into existing manual review attempt UI.';

-- ---------------------------------------------------------------------------
-- 3) Course overview
-- ---------------------------------------------------------------------------

create or replace function public.get_instructor_learning_course_overview(
  p_course_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_course public.learning_courses%rowtype;
  v_enrollment_count integer := 0;
  v_active integer := 0;
  v_completed integer := 0;
  v_pending integer := 0;
  v_avg numeric;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  perform public.learning_instructor_assert_course_manage(p_course_id, v_uid);

  select * into v_course
  from public.learning_courses
  where id = p_course_id;

  if not found then
    raise exception 'Learning course not found';
  end if;

  select count(*)::integer into v_enrollment_count
  from public.learning_instructor_course_learners(p_course_id);

  select count(*)::integer into v_active
  from public.learning_course_progress cp
  where cp.course_id = p_course_id
    and cp.status = 'in_progress';

  select count(*)::integer into v_completed
  from public.learning_course_progress cp
  where cp.course_id = p_course_id
    and cp.status = 'completed';

  v_pending := public.learning_instructor_pending_review_count(p_course_id);

  select round(avg(cp.percent_complete)::numeric, 1) into v_avg
  from public.learning_course_progress cp
  where cp.course_id = p_course_id;

  return jsonb_build_object(
    'course_id', v_course.id,
    'course_name', v_course.name,
    'course_slug', v_course.slug,
    'course_status', v_course.status,
    'enrollment_count', v_enrollment_count,
    'active_learners', v_active,
    'completion_count', v_completed,
    'pending_reviews', v_pending,
    'avg_percent_complete', v_avg,
    'certificate_count', (
      select count(*)::integer
      from public.learning_certificates cert
      where cert.course_id = p_course_id
    )
  );
end;
$$;

comment on function public.get_instructor_learning_course_overview(uuid) is
  'Instructor Experience V1 — per-course ops overview (enrollments, completion, pending reviews, average progress). Read-only.';

-- ---------------------------------------------------------------------------
-- 4) Learner progress monitor
-- ---------------------------------------------------------------------------

create or replace function public.get_instructor_learning_learner_progress(
  p_course_id uuid,
  p_bucket text default null,
  p_search text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_bucket text := lower(nullif(btrim(coalesce(p_bucket, '')), ''));
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_items jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  perform public.learning_instructor_assert_course_manage(p_course_id, v_uid);

  if v_bucket is not null
     and v_bucket not in (
       'enrolled', 'active', 'completed', 'pending_review', 'failed', 'passed'
     )
  then
    raise exception 'Invalid progress bucket';
  end if;

  select coalesce(jsonb_agg(row_to_json(filtered)::jsonb), '[]'::jsonb)
  into v_items
  from (
    select *
    from (
      select
        l.learner_user_id,
        public.learning_instructor_learner_label(l.learner_user_id) as learner_label,
        l.enrollment_status,
        l.enrollment_target_type,
        l.enrolled_at,
        coalesce(cp.status, 'not_started') as progress_status,
        cp.percent_complete,
        cp.completed_lessons_count,
        cp.total_lessons_count,
        cp.last_activity_at,
        cp.completed_at,
        exists (
          select 1
          from public.learning_attempts a
          join public.learning_attempt_results r on r.attempt_id = a.id
          where a.course_id = p_course_id
            and a.user_id = l.learner_user_id
            and a.status = 'submitted'
            and r.status = 'partially_graded'
            and coalesce(r.has_pending_manual_review, false) = true
        ) as has_pending_review,
        exists (
          select 1
          from public.learning_attempts a
          join public.learning_attempt_results r on r.attempt_id = a.id
          where a.course_id = p_course_id
            and a.user_id = l.learner_user_id
            and a.status = 'submitted'
            and r.status = 'graded'
            and r.passed is true
        ) as has_passed_assessment,
        exists (
          select 1
          from public.learning_attempts a
          join public.learning_attempt_results r on r.attempt_id = a.id
          where a.course_id = p_course_id
            and a.user_id = l.learner_user_id
            and a.status = 'submitted'
            and r.status = 'graded'
            and r.passed is false
        ) as has_failed_assessment,
        exists (
          select 1
          from public.learning_certificates cert
          where cert.course_id = p_course_id
            and cert.user_id = l.learner_user_id
        ) as has_certificate,
        case
          when coalesce(cp.status, 'not_started') = 'completed' then 'completed'
          when exists (
            select 1
            from public.learning_attempts a
            join public.learning_attempt_results r on r.attempt_id = a.id
            where a.course_id = p_course_id
              and a.user_id = l.learner_user_id
              and a.status = 'submitted'
              and r.status = 'partially_graded'
              and coalesce(r.has_pending_manual_review, false) = true
          ) then 'pending_review'
          when exists (
            select 1
            from public.learning_attempts a
            join public.learning_attempt_results r on r.attempt_id = a.id
            where a.course_id = p_course_id
              and a.user_id = l.learner_user_id
              and a.status = 'submitted'
              and r.status = 'graded'
              and r.passed is true
          ) then 'passed'
          when exists (
            select 1
            from public.learning_attempts a
            join public.learning_attempt_results r on r.attempt_id = a.id
            where a.course_id = p_course_id
              and a.user_id = l.learner_user_id
              and a.status = 'submitted'
              and r.status = 'graded'
              and r.passed is false
          ) then 'failed'
          when coalesce(cp.status, 'not_started') = 'in_progress' then 'active'
          else 'enrolled'
        end as monitor_bucket
      from public.learning_instructor_course_learners(p_course_id) l
      left join public.learning_course_progress cp
        on cp.course_id = p_course_id
       and cp.user_id = l.learner_user_id
    ) s
    where (v_bucket is null or s.monitor_bucket = v_bucket)
      and (
        v_search is null
        or s.learner_user_id::text ilike '%' || v_search || '%'
        or coalesce(s.learner_label, '') ilike '%' || v_search || '%'
      )
    order by
      case s.monitor_bucket
        when 'pending_review' then 0
        when 'failed' then 1
        when 'active' then 2
        when 'passed' then 3
        when 'completed' then 4
        else 5
      end,
      s.learner_label
    limit 500
  ) filtered;

  return jsonb_build_object(
    'course_id', p_course_id,
    'bucket_filter', v_bucket,
    'search', v_search,
    'learners', coalesce(v_items, '[]'::jsonb),
    'learner_count', jsonb_array_length(coalesce(v_items, '[]'::jsonb))
  );
end;
$$;

comment on function public.get_instructor_learning_learner_progress(uuid, text, text) is
  'Instructor Experience V1 — per-course learner progress monitor with bucket/search filters. Read-only.';

-- ---------------------------------------------------------------------------
-- 5) Learner details (read-only)
-- ---------------------------------------------------------------------------

create or replace function public.get_instructor_learning_learner_detail(
  p_course_id uuid,
  p_learner_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_progress public.learning_course_progress%rowtype;
  v_lessons jsonb;
  v_activities jsonb;
  v_assessments jsonb;
  v_cert public.learning_certificates%rowtype;
  v_enrollment_status text;
  v_enrollment_target_type text;
  v_enrolled_at timestamptz;
  v_found_enrollment boolean := false;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_learner_user_id is null then
    raise exception 'learner_user_id is required';
  end if;

  perform public.learning_instructor_assert_course_manage(p_course_id, v_uid);

  select
    l.enrollment_status,
    l.enrollment_target_type,
    l.enrolled_at
  into
    v_enrollment_status,
    v_enrollment_target_type,
    v_enrolled_at
  from public.learning_instructor_course_learners(p_course_id) l
  where l.learner_user_id = p_learner_user_id;

  v_found_enrollment := found;

  if not v_found_enrollment then
    if not exists (
      select 1 from public.learning_course_progress cp
      where cp.course_id = p_course_id and cp.user_id = p_learner_user_id
    ) and not exists (
      select 1 from public.learning_attempts a
      where a.course_id = p_course_id and a.user_id = p_learner_user_id
    ) then
      raise exception 'Learner not found in this course';
    end if;
  end if;

  select * into v_progress
  from public.learning_course_progress
  where course_id = p_course_id
    and user_id = p_learner_user_id;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_lessons
  from (
    select
      lp.lesson_id,
      les.name as lesson_name,
      lp.status,
      lp.completed_at,
      lp.last_activity_at
    from public.learning_lesson_progress lp
    join public.learning_lessons les on les.id = lp.lesson_id
    where lp.course_id = p_course_id
      and lp.user_id = p_learner_user_id
    order by lp.completed_at desc nulls last, les.name
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_activities
  from (
    select
      app.activity_id,
      act.name as activity_name,
      app.applied_at,
      app.attempt_id,
      app.lesson_id
    from public.learning_attempt_progress_applications app
    join public.learning_activities act on act.id = app.activity_id
    where app.course_id = p_course_id
      and app.user_id = p_learner_user_id
    order by app.applied_at desc
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_assessments
  from (
    select
      a.id as attempt_id,
      a.activity_id,
      act.name as activity_name,
      a.status as attempt_status,
      a.submitted_at,
      r.status as grading_status,
      r.passed,
      r.final_percentage,
      r.score_earned,
      r.score_max,
      coalesce(r.has_pending_manual_review, false) as has_pending_manual_review
    from public.learning_attempts a
    left join public.learning_attempt_results r on r.attempt_id = a.id
    left join public.learning_activities act on act.id = a.activity_id
    where a.course_id = p_course_id
      and a.user_id = p_learner_user_id
    order by coalesce(a.submitted_at, a.created_at) desc
    limit 50
  ) t;

  select * into v_cert
  from public.learning_certificates
  where course_id = p_course_id
    and user_id = p_learner_user_id;

  return jsonb_build_object(
    'course_id', p_course_id,
    'learner_user_id', p_learner_user_id,
    'learner_label', public.learning_instructor_learner_label(p_learner_user_id),
    'enrollment_status', v_enrollment_status,
    'enrollment_target_type', v_enrollment_target_type,
    'enrolled_at', v_enrolled_at,
    'progress_status', coalesce(v_progress.status, 'not_started'),
    'percent_complete', v_progress.percent_complete,
    'completed_lessons_count', v_progress.completed_lessons_count,
    'total_lessons_count', v_progress.total_lessons_count,
    'completed_at', v_progress.completed_at,
    'last_activity_at', v_progress.last_activity_at,
    'lessons', coalesce(v_lessons, '[]'::jsonb),
    'completed_activities', coalesce(v_activities, '[]'::jsonb),
    'assessments', coalesce(v_assessments, '[]'::jsonb),
    'certificate_status', case when v_cert.id is not null then 'issued' else 'none' end,
    'certificate_code', v_cert.certificate_code,
    'certificate_issued_at', v_cert.issued_at
  );
end;
$$;

comment on function public.get_instructor_learning_learner_detail(uuid, uuid) is
  'Instructor Experience V1 — read-only learner detail: lessons, activities, assessment/grading/completion status.';

-- ---------------------------------------------------------------------------
-- 6) Completion overview
-- ---------------------------------------------------------------------------

create or replace function public.get_instructor_learning_completion_overview(
  p_course_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_completed jsonb;
  v_failed jsonb;
  v_waiting jsonb;
  v_inactive jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  perform public.learning_instructor_assert_course_manage(p_course_id, v_uid);

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_completed
  from (
    select
      cp.user_id as learner_user_id,
      public.learning_instructor_learner_label(cp.user_id) as learner_label,
      cp.completed_at,
      cp.percent_complete,
      cert.certificate_code,
      cert.issued_at as certificate_issued_at
    from public.learning_course_progress cp
    left join public.learning_certificates cert
      on cert.course_id = cp.course_id
     and cert.user_id = cp.user_id
    where cp.course_id = p_course_id
      and cp.status = 'completed'
    order by cp.completed_at desc nulls last
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_failed
  from (
    select distinct on (a.user_id)
      a.user_id as learner_user_id,
      public.learning_instructor_learner_label(a.user_id) as learner_label,
      a.id as attempt_id,
      r.final_percentage,
      r.scored_at,
      r.passed
    from public.learning_attempts a
    join public.learning_attempt_results r on r.attempt_id = a.id
    left join public.learning_course_progress cp
      on cp.course_id = a.course_id
     and cp.user_id = a.user_id
    where a.course_id = p_course_id
      and a.status = 'submitted'
      and r.status = 'graded'
      and r.passed is false
      and coalesce(cp.status, 'not_started') is distinct from 'completed'
    order by a.user_id, r.scored_at desc nulls last
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_waiting
  from (
    select
      a.user_id as learner_user_id,
      public.learning_instructor_learner_label(a.user_id) as learner_label,
      a.id as attempt_id,
      a.activity_id,
      a.submitted_at,
      r.status as grading_status
    from public.learning_attempts a
    join public.learning_attempt_results r on r.attempt_id = a.id
    where a.course_id = p_course_id
      and a.status = 'submitted'
      and r.status = 'partially_graded'
      and coalesce(r.has_pending_manual_review, false) = true
    order by a.submitted_at asc nulls last
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_inactive
  from (
    select
      l.learner_user_id,
      public.learning_instructor_learner_label(l.learner_user_id) as learner_label,
      l.enrollment_status,
      cp.status as progress_status,
      cp.last_activity_at,
      cp.percent_complete
    from public.learning_instructor_course_learners(p_course_id) l
    left join public.learning_course_progress cp
      on cp.course_id = p_course_id
     and cp.user_id = l.learner_user_id
    where l.enrollment_status = 'active'
      and coalesce(cp.status, 'not_started') is distinct from 'completed'
      and (
        cp.last_activity_at is null
        or cp.last_activity_at < (now() - interval '14 days')
      )
      and not exists (
        select 1
        from public.learning_attempts a
        join public.learning_attempt_results r on r.attempt_id = a.id
        where a.course_id = p_course_id
          and a.user_id = l.learner_user_id
          and a.status = 'submitted'
          and r.status = 'partially_graded'
          and coalesce(r.has_pending_manual_review, false) = true
      )
    order by cp.last_activity_at nulls first, learner_label
  ) t;

  return jsonb_build_object(
    'course_id', p_course_id,
    'completed', coalesce(v_completed, '[]'::jsonb),
    'failed', coalesce(v_failed, '[]'::jsonb),
    'waiting_grading', coalesce(v_waiting, '[]'::jsonb),
    'inactive', coalesce(v_inactive, '[]'::jsonb),
    'counts', jsonb_build_object(
      'completed', jsonb_array_length(coalesce(v_completed, '[]'::jsonb)),
      'failed', jsonb_array_length(coalesce(v_failed, '[]'::jsonb)),
      'waiting_grading', jsonb_array_length(coalesce(v_waiting, '[]'::jsonb)),
      'inactive', jsonb_array_length(coalesce(v_inactive, '[]'::jsonb))
    )
  );
end;
$$;

comment on function public.get_instructor_learning_completion_overview(uuid) is
  'Instructor Experience V1 — completion overview: completed, failed, waiting grading, inactive. Read-only.';

-- ---------------------------------------------------------------------------
-- 7) Grants
-- ---------------------------------------------------------------------------

revoke all on function public.get_instructor_learning_dashboard()
  from public, anon;
grant execute on function public.get_instructor_learning_dashboard()
  to authenticated;
grant execute on function public.get_instructor_learning_dashboard()
  to service_role;

revoke all on function public.get_instructor_learning_review_queue(uuid, text, text)
  from public, anon;
grant execute on function public.get_instructor_learning_review_queue(uuid, text, text)
  to authenticated;
grant execute on function public.get_instructor_learning_review_queue(uuid, text, text)
  to service_role;

revoke all on function public.get_instructor_learning_course_overview(uuid)
  from public, anon;
grant execute on function public.get_instructor_learning_course_overview(uuid)
  to authenticated;
grant execute on function public.get_instructor_learning_course_overview(uuid)
  to service_role;

revoke all on function public.get_instructor_learning_learner_progress(uuid, text, text)
  from public, anon;
grant execute on function public.get_instructor_learning_learner_progress(uuid, text, text)
  to authenticated;
grant execute on function public.get_instructor_learning_learner_progress(uuid, text, text)
  to service_role;

revoke all on function public.get_instructor_learning_learner_detail(uuid, uuid)
  from public, anon;
grant execute on function public.get_instructor_learning_learner_detail(uuid, uuid)
  to authenticated;
grant execute on function public.get_instructor_learning_learner_detail(uuid, uuid)
  to service_role;

revoke all on function public.get_instructor_learning_completion_overview(uuid)
  from public, anon;
grant execute on function public.get_instructor_learning_completion_overview(uuid)
  to authenticated;
grant execute on function public.get_instructor_learning_completion_overview(uuid)
  to service_role;
