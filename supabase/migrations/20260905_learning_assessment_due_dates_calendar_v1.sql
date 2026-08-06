-- =============================================================================
-- UM Learning OS — Assessment Due Dates on Calendar V1
-- Migration: 20260905_learning_assessment_due_dates_calendar_v1.sql
--
-- Additive nullable due_at on learning_activity_settings for quiz assessments.
-- Calendar aggregation gains assessment_due events.
-- Does NOT change attempt / answer / submission / scoring / completion semantics.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Storage: nullable due_at on activity settings
-- ---------------------------------------------------------------------------

alter table public.learning_activity_settings
  add column if not exists due_at timestamptz;

comment on column public.learning_activity_settings.due_at is
  'Assessment Due Dates Calendar V1 — optional UTC due instant for quiz activities. Overdue is derived at read time; does not gate attempts/scoring in V1. Assignments continue to use learning_assignment_specs.due_at.';

create index if not exists learning_activity_settings_due_at_idx
  on public.learning_activity_settings (due_at)
  where due_at is not null;

-- ---------------------------------------------------------------------------
-- 2) Manage RPC: set / clear assessment due_at (quiz only)
-- ---------------------------------------------------------------------------

create or replace function public.set_learning_assessment_due_at(
  p_activity_id uuid,
  p_due_at timestamptz default null,
  p_clear_due boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_activity public.learning_activities%rowtype;
  v_settings public.learning_activity_settings%rowtype;
  v_lesson public.learning_lessons%rowtype;
  v_section public.learning_sections%rowtype;
  v_course_id uuid;
  v_next_due timestamptz;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_activity_id is null then
    raise exception 'activity_id is required';
  end if;

  if p_clear_due is not true and p_due_at is null then
    raise exception 'due_at is required unless clear is requested';
  end if;

  select * into v_activity
  from public.learning_activities
  where id = p_activity_id
  for update;

  if not found then
    raise exception 'Learning activity not found';
  end if;

  if v_activity.type is distinct from 'quiz' then
    raise exception 'Assessment due dates are only supported for quiz activities';
  end if;

  select * into v_lesson
  from public.learning_lessons
  where id = v_activity.lesson_id;

  if not found then
    raise exception 'Learning lesson not found';
  end if;

  select * into v_section
  from public.learning_sections
  where id = v_lesson.section_id;

  if not found then
    raise exception 'Learning section not found';
  end if;

  v_course_id := v_section.course_id;

  if not (
    public.can_manage_learning_course(v_course_id, v_uid)
    or public.is_learning_course_staff(v_course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to manage assessment due dates for this course';
  end if;

  select * into v_settings
  from public.learning_activity_settings
  where activity_id = p_activity_id
  for update;

  if not found then
    raise exception 'Learning activity settings not found';
  end if;

  if p_clear_due is true then
    v_next_due := null;
  else
    v_next_due := p_due_at;
  end if;

  update public.learning_activity_settings
  set
    due_at = v_next_due,
    updated_at = now()
  where activity_id = p_activity_id;

  return jsonb_build_object(
    'activity_id', p_activity_id,
    'course_id', v_course_id,
    'due_at', v_next_due,
    'cleared', (p_clear_due is true)
  );
end;
$$;

comment on function public.set_learning_assessment_due_at(uuid, timestamptz, boolean) is
  'Assessment Due Dates Calendar V1 — manage-only set/clear of quiz activity settings.due_at. No attempt/scoring side effects.';

revoke all on function public.set_learning_assessment_due_at(uuid, timestamptz, boolean)
  from public, anon;
grant execute on function public.set_learning_assessment_due_at(uuid, timestamptz, boolean)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Calendar aggregation: add assessment_due; keep live + assignment_due
-- ---------------------------------------------------------------------------

create or replace function public.get_my_learning_calendar(
  p_from timestamptz,
  p_to timestamptz,
  p_course_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_from timestamptz := coalesce(p_from, now() - interval '7 days');
  v_to timestamptz := coalesce(p_to, now() + interval '60 days');
  v_items jsonb := '[]'::jsonb;
  v_live jsonb;
  v_due jsonb;
  v_assessment jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if v_to <= v_from then raise exception 'Invalid calendar range'; end if;
  if (v_to - v_from) > interval '180 days' then
    raise exception 'Calendar range too large';
  end if;

  if p_course_id is not null then
    perform public.learning_live_assert_access(p_course_id, v_uid);
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_live
  from (
    select
      'live_session'::text as kind,
      s.id as item_id,
      s.course_id,
      s.title,
      s.starts_at as occurs_at,
      s.ends_at,
      s.status
    from public.learning_live_sessions s
    where s.starts_at >= v_from
      and s.starts_at <= v_to
      and (p_course_id is null or s.course_id = p_course_id)
      and (
        public.has_learning_course_access(s.course_id, v_uid)
        or public.can_manage_learning_course(s.course_id, v_uid)
        or public.is_learning_course_staff(s.course_id, v_uid)
        or public.is_platform_admin(v_uid)
      )
    order by s.starts_at
    limit 200
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_due
  from (
    select
      'assignment_due'::text as kind,
      a.id as item_id,
      c.id as course_id,
      coalesce(nullif(btrim(a.name), ''), 'Assignment') as title,
      sp.due_at as occurs_at,
      null::timestamptz as ends_at,
      'due'::text as status
    from public.learning_assignment_specs sp
    join public.learning_activities a on a.id = sp.activity_id
    join public.learning_lessons le on le.id = a.lesson_id
    join public.learning_sections sec on sec.id = le.section_id
    join public.learning_courses c on c.id = sec.course_id
    where sp.due_at is not null
      and sp.due_at >= v_from
      and sp.due_at <= v_to
      and (p_course_id is null or c.id = p_course_id)
      and (
        public.has_learning_course_access(c.id, v_uid)
        or public.can_manage_learning_course(c.id, v_uid)
        or public.is_platform_admin(v_uid)
      )
    order by sp.due_at
    limit 200
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_assessment
  from (
    select
      'assessment_due'::text as kind,
      a.id as item_id,
      c.id as course_id,
      coalesce(nullif(btrim(a.name), ''), 'Assessment') as title,
      st.due_at as occurs_at,
      null::timestamptz as ends_at,
      'due'::text as status
    from public.learning_activity_settings st
    join public.learning_activities a on a.id = st.activity_id
    join public.learning_lessons le on le.id = a.lesson_id
    join public.learning_sections sec on sec.id = le.section_id
    join public.learning_courses c on c.id = sec.course_id
    where a.type = 'quiz'
      and st.due_at is not null
      and st.due_at >= v_from
      and st.due_at <= v_to
      and (p_course_id is null or c.id = p_course_id)
      and (
        public.has_learning_course_access(c.id, v_uid)
        or public.can_manage_learning_course(c.id, v_uid)
        or public.is_platform_admin(v_uid)
      )
    order by st.due_at
    limit 200
  ) t;

  select coalesce(jsonb_agg(x.item order by (x.item->>'occurs_at')), '[]'::jsonb)
  into v_items
  from (
    select jsonb_array_elements(coalesce(v_live, '[]'::jsonb)) as item
    union all
    select jsonb_array_elements(coalesce(v_due, '[]'::jsonb)) as item
    union all
    select jsonb_array_elements(coalesce(v_assessment, '[]'::jsonb)) as item
  ) x;

  return jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'course_id', p_course_id,
    'items', coalesce(v_items, '[]'::jsonb),
    'item_count', jsonb_array_length(coalesce(v_items, '[]'::jsonb)),
    'assessment_due_supported', true
  );
end;
$$;

create or replace function public.get_instructor_learning_calendar(
  p_course_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_from timestamptz := coalesce(p_from, now() - interval '7 days');
  v_to timestamptz := coalesce(p_to, now() + interval '60 days');
  v_live jsonb;
  v_due jsonb;
  v_assessment jsonb;
  v_items jsonb;
begin
  perform public.learning_live_assert_manage(p_course_id, v_uid);
  if v_to <= v_from then raise exception 'Invalid calendar range'; end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_live
  from (
    select
      'live_session'::text as kind,
      s.id as item_id,
      s.course_id,
      s.title,
      s.starts_at as occurs_at,
      s.ends_at,
      s.status
    from public.learning_live_sessions s
    where s.course_id = p_course_id
      and s.starts_at >= v_from
      and s.starts_at <= v_to
    order by s.starts_at
    limit 200
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_due
  from (
    select
      'assignment_due'::text as kind,
      a.id as item_id,
      p_course_id as course_id,
      coalesce(nullif(btrim(a.name), ''), 'Assignment') as title,
      sp.due_at as occurs_at,
      null::timestamptz as ends_at,
      'due'::text as status
    from public.learning_assignment_specs sp
    join public.learning_activities a on a.id = sp.activity_id
    join public.learning_lessons le on le.id = a.lesson_id
    join public.learning_sections sec on sec.id = le.section_id
    where sec.course_id = p_course_id
      and sp.due_at is not null
      and sp.due_at >= v_from
      and sp.due_at <= v_to
    order by sp.due_at
    limit 200
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_assessment
  from (
    select
      'assessment_due'::text as kind,
      a.id as item_id,
      p_course_id as course_id,
      coalesce(nullif(btrim(a.name), ''), 'Assessment') as title,
      st.due_at as occurs_at,
      null::timestamptz as ends_at,
      'due'::text as status
    from public.learning_activity_settings st
    join public.learning_activities a on a.id = st.activity_id
    join public.learning_lessons le on le.id = a.lesson_id
    join public.learning_sections sec on sec.id = le.section_id
    where sec.course_id = p_course_id
      and a.type = 'quiz'
      and st.due_at is not null
      and st.due_at >= v_from
      and st.due_at <= v_to
    order by st.due_at
    limit 200
  ) t;

  select coalesce(jsonb_agg(x.item order by (x.item->>'occurs_at')), '[]'::jsonb)
  into v_items
  from (
    select jsonb_array_elements(coalesce(v_live, '[]'::jsonb)) as item
    union all
    select jsonb_array_elements(coalesce(v_due, '[]'::jsonb)) as item
    union all
    select jsonb_array_elements(coalesce(v_assessment, '[]'::jsonb)) as item
  ) x;

  return jsonb_build_object(
    'course_id', p_course_id,
    'from', v_from,
    'to', v_to,
    'items', coalesce(v_items, '[]'::jsonb),
    'item_count', jsonb_array_length(coalesce(v_items, '[]'::jsonb)),
    'assessment_due_supported', true
  );
end;
$$;

comment on function public.get_my_learning_calendar(timestamptz, timestamptz, uuid) is
  'Learner/staff calendar: live sessions, assignment dues, and quiz assessment dues. assessment_due_supported=true.';

comment on function public.get_instructor_learning_calendar(uuid, timestamptz, timestamptz) is
  'Instructor calendar: live sessions, assignment dues, and quiz assessment dues. assessment_due_supported=true.';
