-- UM Learning OS — Progress Foundation V1
-- Additive slice after 20260834 (Enrollments).
--
-- Progress records LEARNING STATE for a learner in a Course / Lesson.
-- It is NOT payment, enrollment entitlement, certificate, attempt, submission,
-- grade, AI grading, or Activity progress (deferred to Attempts).
--
-- Locked decisions:
--  1. Expand has_learning_course_access to include ACTIVE parent Program
--     enrollment (in addition to admin / course manager / course enrollment).
--  2. learning_course_progress stores completed_lessons_count,
--     total_lessons_count, and DB-computed percent_complete (never client %).
--  3. V1 = lesson + course rollup only. No activity progress.
--  4. Writes require live has_learning_course_access; history is retained when
--     enrollment later suspends/expires/cancels (no auto-delete).
--  5. No anon SELECT. FORCE RLS. SECURITY DEFINER + search_path = public.
--  6. Client writes only via RPCs.

-- ---------------------------------------------------------------------------
-- 0) Expand course access helper (Program enrollment inheritance)
-- ---------------------------------------------------------------------------
-- Platform admin OR course manager OR active course enrollment OR active parent
-- program enrollment (when the course belongs to that program). Window checks
-- match the existing enrollments foundation (starts_at / expires_at).

create or replace function public.has_learning_course_access(
  p_course_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_course_id is not null
    and p_user_id is not null
    and (
      public.is_platform_admin(p_user_id)
      or public.can_manage_learning_course(p_course_id, p_user_id)
      or exists (
        select 1
        from public.learning_enrollments e
        where e.course_id = p_course_id
          and e.user_id = p_user_id
          and e.status = 'active'
          and (e.starts_at is null or e.starts_at <= now())
          and (e.expires_at is null or e.expires_at > now())
      )
      or exists (
        select 1
        from public.learning_courses c
        join public.learning_enrollments e
          on e.program_id = c.program_id
         and e.user_id = p_user_id
        where c.id = p_course_id
          and e.status = 'active'
          and (e.starts_at is null or e.starts_at <= now())
          and (e.expires_at is null or e.expires_at > now())
      )
    );
$$;

revoke all on function public.has_learning_course_access(uuid, uuid)
  from public, anon;
grant execute on function public.has_learning_course_access(uuid, uuid)
  to authenticated, service_role;

comment on function public.has_learning_course_access(uuid, uuid) is
  'Live course entitlement: platform admin OR course manager OR active course enrollment in window OR active parent program enrollment in window. Never cached.';

-- ---------------------------------------------------------------------------
-- 1) learning_lesson_progress (source of truth per lesson)
-- ---------------------------------------------------------------------------

create table if not exists public.learning_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null
    references public.learning_spaces (id) on delete restrict,
  course_id uuid not null
    references public.learning_courses (id) on delete restrict,
  lesson_id uuid not null
    references public.learning_lessons (id) on delete restrict,
  user_id uuid not null
    references public.profiles (id) on delete restrict,
  enrollment_id uuid
    references public.learning_enrollments (id) on delete set null,
  status text not null default 'not_started'
    constraint learning_lesson_progress_status_check check (
      status in ('not_started', 'in_progress', 'completed')
    ),
  completion_source text
    constraint learning_lesson_progress_completion_source_check check (
      completion_source is null
      or completion_source in ('manual')
    ),
  started_at timestamptz,
  last_activity_at timestamptz,
  completed_at timestamptz,
  first_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_lesson_progress_user_lesson_unique unique (user_id, lesson_id)
);

comment on table public.learning_lesson_progress is
  'Per-learner lesson progress. Source of truth for lesson status. Client writes only via RPCs. user_id/course_id/lesson_id/space_id immutable. Enrollment_id is optional attribution only — access is always revalidated live via has_learning_course_access.';

comment on column public.learning_lesson_progress.first_completed_at is
  'Set once on first completion; never cleared by reopen.';

create index if not exists learning_lesson_progress_user_course_idx
  on public.learning_lesson_progress (user_id, course_id, status);

create index if not exists learning_lesson_progress_course_status_idx
  on public.learning_lesson_progress (course_id, status);

create index if not exists learning_lesson_progress_lesson_idx
  on public.learning_lesson_progress (lesson_id);

create index if not exists learning_lesson_progress_enrollment_idx
  on public.learning_lesson_progress (enrollment_id)
  where enrollment_id is not null;

drop trigger if exists learning_lesson_progress_set_updated_at
  on public.learning_lesson_progress;
create trigger learning_lesson_progress_set_updated_at
  before update on public.learning_lesson_progress
  for each row execute function public.set_row_updated_at();

create or replace function public.learning_lesson_progress_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.space_id is distinct from old.space_id
     or new.course_id is distinct from old.course_id
     or new.lesson_id is distinct from old.lesson_id
     or new.user_id is distinct from old.user_id
     or new.created_at is distinct from old.created_at
  then
    raise exception
      'learning_lesson_progress identity columns are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_lesson_progress_guard_immutable
  on public.learning_lesson_progress;
create trigger learning_lesson_progress_guard_immutable
  before update on public.learning_lesson_progress
  for each row execute function public.learning_lesson_progress_guard_immutable();

alter table public.learning_lesson_progress enable row level security;
alter table public.learning_lesson_progress force row level security;

revoke all on table public.learning_lesson_progress
  from public, anon, authenticated;
grant select on table public.learning_lesson_progress to authenticated;
revoke insert, update, delete on table public.learning_lesson_progress
  from anon, authenticated;
grant all on table public.learning_lesson_progress to service_role;

-- ---------------------------------------------------------------------------
-- 2) learning_course_progress (server-maintained rollup cache)
-- ---------------------------------------------------------------------------

create table if not exists public.learning_course_progress (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null
    references public.learning_spaces (id) on delete restrict,
  course_id uuid not null
    references public.learning_courses (id) on delete restrict,
  user_id uuid not null
    references public.profiles (id) on delete restrict,
  enrollment_id uuid
    references public.learning_enrollments (id) on delete set null,
  status text not null default 'not_started'
    constraint learning_course_progress_status_check check (
      status in ('not_started', 'in_progress', 'completed')
    ),
  completed_lessons_count integer not null default 0
    constraint learning_course_progress_completed_nonneg check (
      completed_lessons_count >= 0
    ),
  total_lessons_count integer not null default 0
    constraint learning_course_progress_total_nonneg check (
      total_lessons_count >= 0
    ),
  percent_complete integer not null default 0
    constraint learning_course_progress_percent_bounds check (
      percent_complete >= 0 and percent_complete <= 100
    ),
  last_lesson_id uuid
    references public.learning_lessons (id) on delete set null,
  last_activity_id uuid,
  started_at timestamptz,
  last_activity_at timestamptz,
  completed_at timestamptz,
  first_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_course_progress_user_course_unique unique (user_id, course_id),
  constraint learning_course_progress_counts_consistent check (
    completed_lessons_count <= total_lessons_count
  )
);

comment on table public.learning_course_progress is
  'Per-learner course progress rollup. completed_lessons_count, total_lessons_count, and percent_complete are DB-authored only (never accepted from clients). last_activity_id reserved null in V1 (no activity progress).';

comment on column public.learning_course_progress.percent_complete is
  'Server-computed only: floor(100 * completed_lessons_count / total_lessons_count) when total > 0, else 0.';

comment on column public.learning_course_progress.last_activity_id is
  'Reserved for future Activity Progress / Attempts. Always null in V1 — no FK (table does not exist yet).';

create index if not exists learning_course_progress_user_status_idx
  on public.learning_course_progress (user_id, status);

create index if not exists learning_course_progress_course_status_idx
  on public.learning_course_progress (course_id, status);

create index if not exists learning_course_progress_enrollment_idx
  on public.learning_course_progress (enrollment_id)
  where enrollment_id is not null;

drop trigger if exists learning_course_progress_set_updated_at
  on public.learning_course_progress;
create trigger learning_course_progress_set_updated_at
  before update on public.learning_course_progress
  for each row execute function public.set_row_updated_at();

create or replace function public.learning_course_progress_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.space_id is distinct from old.space_id
     or new.course_id is distinct from old.course_id
     or new.user_id is distinct from old.user_id
     or new.created_at is distinct from old.created_at
  then
    raise exception
      'learning_course_progress identity columns are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_course_progress_guard_immutable
  on public.learning_course_progress;
create trigger learning_course_progress_guard_immutable
  before update on public.learning_course_progress
  for each row execute function public.learning_course_progress_guard_immutable();

alter table public.learning_course_progress enable row level security;
alter table public.learning_course_progress force row level security;

revoke all on table public.learning_course_progress
  from public, anon, authenticated;
grant select on table public.learning_course_progress to authenticated;
revoke insert, update, delete on table public.learning_course_progress
  from anon, authenticated;
grant all on table public.learning_course_progress to service_role;

-- ---------------------------------------------------------------------------
-- 3) learning_progress_events (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.learning_progress_events (
  id uuid primary key default gen_random_uuid(),
  space_id uuid
    references public.learning_spaces (id) on delete set null,
  course_id uuid
    references public.learning_courses (id) on delete set null,
  lesson_id uuid
    references public.learning_lessons (id) on delete set null,
  user_id uuid not null
    references public.profiles (id) on delete restrict,
  actor_user_id uuid references public.profiles (id) on delete set null,
  event_type text not null
    constraint learning_progress_events_type_check check (
      event_type in (
        'lesson_started',
        'lesson_resumed',
        'lesson_completed',
        'lesson_reopened',
        'lesson_touched',
        'course_rollup_updated'
      )
    ),
  from_status text
    constraint learning_progress_events_from_status_check check (
      from_status is null
      or from_status in ('not_started', 'in_progress', 'completed')
    ),
  to_status text
    constraint learning_progress_events_to_status_check check (
      to_status is null
      or to_status in ('not_started', 'in_progress', 'completed')
    ),
  metadata jsonb not null default '{}'::jsonb
    constraint learning_progress_events_metadata_object check (
      jsonb_typeof(metadata) = 'object'
    ),
  created_at timestamptz not null default now()
);

comment on table public.learning_progress_events is
  'Append-only progress event log. Inserts only via SECURITY DEFINER helpers. Update/delete forbidden.';

create index if not exists learning_progress_events_user_created_idx
  on public.learning_progress_events (user_id, created_at desc);

create index if not exists learning_progress_events_course_created_idx
  on public.learning_progress_events (course_id, created_at desc);

create index if not exists learning_progress_events_lesson_created_idx
  on public.learning_progress_events (lesson_id, created_at desc);

create or replace function public.learning_progress_events_forbid_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'learning_progress_events is append-only';
end;
$$;

drop trigger if exists learning_progress_events_forbid_update
  on public.learning_progress_events;
create trigger learning_progress_events_forbid_update
  before update on public.learning_progress_events
  for each row execute function public.learning_progress_events_forbid_mutation();

drop trigger if exists learning_progress_events_forbid_delete
  on public.learning_progress_events;
create trigger learning_progress_events_forbid_delete
  before delete on public.learning_progress_events
  for each row execute function public.learning_progress_events_forbid_mutation();

alter table public.learning_progress_events enable row level security;
alter table public.learning_progress_events force row level security;

revoke all on table public.learning_progress_events
  from public, anon, authenticated;
grant select on table public.learning_progress_events to authenticated;
revoke insert, update, delete on table public.learning_progress_events
  from anon, authenticated;
grant all on table public.learning_progress_events to service_role;

-- ---------------------------------------------------------------------------
-- 4) Internal helpers
-- ---------------------------------------------------------------------------

create or replace function public.learning_progress_event_write(
  p_space_id uuid,
  p_course_id uuid,
  p_lesson_id uuid,
  p_user_id uuid,
  p_actor_user_id uuid,
  p_event_type text,
  p_from_status text,
  p_to_status text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.learning_progress_events (
    space_id,
    course_id,
    lesson_id,
    user_id,
    actor_user_id,
    event_type,
    from_status,
    to_status,
    metadata
  ) values (
    p_space_id,
    p_course_id,
    p_lesson_id,
    p_user_id,
    p_actor_user_id,
    p_event_type,
    p_from_status,
    p_to_status,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.learning_progress_event_write(
  uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb
) from public, anon, authenticated;

-- Resolve optional enrollment attribution (course first, then parent program).
create or replace function public.learning_progress_resolve_enrollment_id(
  p_course_id uuid,
  p_user_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.learning_enrollments e
  where e.user_id = p_user_id
    and e.status = 'active'
    and (e.starts_at is null or e.starts_at <= now())
    and (e.expires_at is null or e.expires_at > now())
    and (
      e.course_id = p_course_id
      or e.program_id = (
        select c.program_id from public.learning_courses c where c.id = p_course_id
      )
    )
  order by
    case when e.course_id = p_course_id then 0 else 1 end,
    e.activated_at nulls last,
    e.created_at
  limit 1;
$$;

revoke all on function public.learning_progress_resolve_enrollment_id(uuid, uuid)
  from public, anon, authenticated;

-- Recompute course rollup from published lessons + lesson_progress rows.
create or replace function public.learning_progress_recompute_course(
  p_user_id uuid,
  p_course_id uuid,
  p_last_lesson_id uuid default null,
  p_actor_user_id uuid default null
)
returns public.learning_course_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  v_space_id uuid;
  v_total integer := 0;
  v_completed integer := 0;
  v_percent integer := 0;
  v_status text;
  v_row public.learning_course_progress%rowtype;
  v_enrollment_id uuid;
  v_now timestamptz := now();
  v_from_status text;
  v_exists boolean := false;
begin
  if p_user_id is null or p_course_id is null then
    raise exception 'user_id and course_id are required';
  end if;

  perform 1
  from public.learning_courses c
  where c.id = p_course_id
  for update;

  select p.space_id into v_space_id
  from public.learning_courses c
  join public.learning_programs p on p.id = c.program_id
  where c.id = p_course_id;

  if v_space_id is null then
    raise exception 'course not found';
  end if;

  select count(*)::integer into v_total
  from public.learning_lessons les
  join public.learning_sections sec on sec.id = les.section_id
  where sec.course_id = p_course_id
    and les.status = 'published';

  select count(*)::integer into v_completed
  from public.learning_lesson_progress lp
  join public.learning_lessons les on les.id = lp.lesson_id
  join public.learning_sections sec on sec.id = les.section_id
  where lp.user_id = p_user_id
    and lp.course_id = p_course_id
    and lp.status = 'completed'
    and sec.course_id = p_course_id
    and les.status = 'published';

  if v_total > 0 then
    v_percent := floor((100.0 * v_completed) / v_total)::integer;
  else
    v_percent := 0;
  end if;

  if v_completed <= 0 then
    if exists (
      select 1
      from public.learning_lesson_progress lp
      where lp.user_id = p_user_id
        and lp.course_id = p_course_id
        and lp.status in ('in_progress', 'completed')
    ) then
      v_status := 'in_progress';
    else
      v_status := 'not_started';
    end if;
  elsif v_total > 0 and v_completed >= v_total then
    v_status := 'completed';
  else
    v_status := 'in_progress';
  end if;

  select * into v_row
  from public.learning_course_progress
  where user_id = p_user_id and course_id = p_course_id
  for update;
  v_exists := found;

  v_enrollment_id := public.learning_progress_resolve_enrollment_id(
    p_course_id, p_user_id
  );

  if not v_exists then
    insert into public.learning_course_progress (
      space_id,
      course_id,
      user_id,
      enrollment_id,
      status,
      completed_lessons_count,
      total_lessons_count,
      percent_complete,
      last_lesson_id,
      last_activity_id,
      started_at,
      last_activity_at,
      completed_at,
      first_completed_at
    ) values (
      v_space_id,
      p_course_id,
      p_user_id,
      v_enrollment_id,
      v_status,
      v_completed,
      v_total,
      v_percent,
      p_last_lesson_id,
      null,
      case when v_status = 'not_started' then null else v_now end,
      case when v_status = 'not_started' then null else v_now end,
      case when v_status = 'completed' then v_now else null end,
      case when v_status = 'completed' then v_now else null end
    )
    returning * into v_row;
  else
    v_from_status := v_row.status;

    update public.learning_course_progress
    set
      enrollment_id = coalesce(v_enrollment_id, enrollment_id),
      status = v_status,
      completed_lessons_count = v_completed,
      total_lessons_count = v_total,
      percent_complete = v_percent,
      last_lesson_id = coalesce(p_last_lesson_id, last_lesson_id),
      last_activity_id = null,
      started_at = case
        when started_at is not null then started_at
        when v_status = 'not_started' then null
        else v_now
      end,
      last_activity_at = case
        when v_status = 'not_started' and v_completed = 0 then last_activity_at
        else v_now
      end,
      completed_at = case
        when v_status = 'completed' then coalesce(completed_at, v_now)
        else null
      end,
      first_completed_at = case
        when v_status = 'completed' then coalesce(first_completed_at, v_now)
        else first_completed_at
      end
    where id = v_row.id
    returning * into v_row;

    perform public.learning_progress_event_write(
      v_space_id,
      p_course_id,
      p_last_lesson_id,
      p_user_id,
      coalesce(p_actor_user_id, p_user_id),
      'course_rollup_updated',
      v_from_status,
      v_status,
      jsonb_build_object(
        'completed_lessons_count', v_completed,
        'total_lessons_count', v_total,
        'percent_complete', v_percent
      )
    );
  end if;

  return v_row;
end;
$$;

revoke all on function public.learning_progress_recompute_course(
  uuid, uuid, uuid, uuid
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) RLS policies (authenticated only — NO anon)
-- ---------------------------------------------------------------------------

drop policy if exists "Learners read own lesson progress"
  on public.learning_lesson_progress;
create policy "Learners read own lesson progress"
  on public.learning_lesson_progress for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Managers read scoped lesson progress"
  on public.learning_lesson_progress;
create policy "Managers read scoped lesson progress"
  on public.learning_lesson_progress for select
  to authenticated
  using (public.can_manage_learning_course(course_id));

drop policy if exists "Platform admins read all lesson progress"
  on public.learning_lesson_progress;
create policy "Platform admins read all lesson progress"
  on public.learning_lesson_progress for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Learners read own course progress"
  on public.learning_course_progress;
create policy "Learners read own course progress"
  on public.learning_course_progress for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Managers read scoped course progress"
  on public.learning_course_progress;
create policy "Managers read scoped course progress"
  on public.learning_course_progress for select
  to authenticated
  using (public.can_manage_learning_course(course_id));

drop policy if exists "Platform admins read all course progress"
  on public.learning_course_progress;
create policy "Platform admins read all course progress"
  on public.learning_course_progress for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Learners read own progress events"
  on public.learning_progress_events;
create policy "Learners read own progress events"
  on public.learning_progress_events for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Managers read scoped progress events"
  on public.learning_progress_events;
create policy "Managers read scoped progress events"
  on public.learning_progress_events for select
  to authenticated
  using (
    course_id is not null
    and public.can_manage_learning_course(course_id)
  );

drop policy if exists "Platform admins read all progress events"
  on public.learning_progress_events;
create policy "Platform admins read all progress events"
  on public.learning_progress_events for select
  to authenticated
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 6) RPCs
-- ---------------------------------------------------------------------------

-- Resolve lesson → course/space; refuse forged ownership.
create or replace function public.learning_progress_load_lesson_context(
  p_lesson_id uuid,
  out o_lesson public.learning_lessons,
  out o_section public.learning_sections,
  out o_course public.learning_courses,
  out o_space_id uuid
)
returns record
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_lesson_id is null then
    raise exception 'lesson_id is required';
  end if;

  select * into o_lesson
  from public.learning_lessons
  where id = p_lesson_id;

  if not found then
    raise exception 'lesson not found';
  end if;

  select * into o_section
  from public.learning_sections
  where id = o_lesson.section_id;

  if not found then
    raise exception 'section not found';
  end if;

  select * into o_course
  from public.learning_courses
  where id = o_section.course_id;

  if not found then
    raise exception 'course not found';
  end if;

  select p.space_id into o_space_id
  from public.learning_programs p
  where p.id = o_course.program_id;

  if o_space_id is null then
    raise exception 'space not found for course';
  end if;
end;
$$;

revoke all on function public.learning_progress_load_lesson_context(uuid)
  from public, anon, authenticated;

create or replace function public.start_learning_lesson(
  p_lesson_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

  if not public.has_learning_course_access(v_ctx.o_course.id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  v_enrollment_id := public.learning_progress_resolve_enrollment_id(
    v_ctx.o_course.id, v_uid
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
      v_ctx.o_course.id,
      p_lesson_id,
      v_uid,
      v_enrollment_id,
      'in_progress',
      v_now,
      v_now
    )
    returning * into v_row;

    perform public.learning_progress_event_write(
      v_ctx.o_space_id, v_ctx.o_course.id, p_lesson_id, v_uid, v_uid,
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
        v_ctx.o_space_id, v_ctx.o_course.id, p_lesson_id, v_uid, v_uid,
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
        v_ctx.o_space_id, v_ctx.o_course.id, p_lesson_id, v_uid, v_uid,
        'lesson_resumed', v_from, v_row.status, '{}'::jsonb
      );
    end if;
  end if;

  v_course := public.learning_progress_recompute_course(
    v_uid, v_ctx.o_course.id, p_lesson_id, v_uid
  );

  perform public.learning_audit_write(
    v_uid,
    v_ctx.o_space_id,
    'progress.lesson_start',
    'learning_lesson_progress',
    v_row.id::text,
    jsonb_build_object(
      'course_id', v_ctx.o_course.id,
      'lesson_id', p_lesson_id,
      'status', v_row.status
    )
  );

  return jsonb_build_object(
    'lesson_progress', to_jsonb(v_row),
    'course_progress', to_jsonb(v_course)
  );
end;
$$;

create or replace function public.touch_learning_lesson(
  p_lesson_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

  if not public.has_learning_course_access(v_ctx.o_course.id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  select * into v_row
  from public.learning_lesson_progress
  where user_id = v_uid and lesson_id = p_lesson_id
  for update;

  if not found then
    -- Touch implies activity — bootstrap via start semantics.
    return public.start_learning_lesson(p_lesson_id);
  end if;

  update public.learning_lesson_progress
  set last_activity_at = v_now
  where id = v_row.id
  returning * into v_row;

  perform public.learning_progress_event_write(
    v_ctx.o_space_id, v_ctx.o_course.id, p_lesson_id, v_uid, v_uid,
    'lesson_touched', v_row.status, v_row.status, '{}'::jsonb
  );

  update public.learning_course_progress
  set
    last_lesson_id = p_lesson_id,
    last_activity_at = v_now
  where user_id = v_uid and course_id = v_ctx.o_course.id
  returning * into v_course;

  if not found then
    v_course := public.learning_progress_recompute_course(
      v_uid, v_ctx.o_course.id, p_lesson_id, v_uid
    );
  end if;

  return jsonb_build_object(
    'lesson_progress', to_jsonb(v_row),
    'course_progress', to_jsonb(v_course)
  );
end;
$$;

create or replace function public.complete_learning_lesson(
  p_lesson_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

  if not public.has_learning_course_access(v_ctx.o_course.id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  -- Optional reserved contract: min_completion_seconds (inert unless set).
  select ls.min_completion_seconds into v_min_seconds
  from public.learning_lesson_settings ls
  where ls.lesson_id = p_lesson_id;

  v_enrollment_id := public.learning_progress_resolve_enrollment_id(
    v_ctx.o_course.id, v_uid
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
      v_ctx.o_course.id,
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
      v_ctx.o_space_id, v_ctx.o_course.id, p_lesson_id, v_uid, v_uid,
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
      v_ctx.o_space_id, v_ctx.o_course.id, p_lesson_id, v_uid, v_uid,
      'lesson_completed', v_from, 'completed',
      jsonb_build_object('completion_source', 'manual')
    );
  end if;

  v_course := public.learning_progress_recompute_course(
    v_uid, v_ctx.o_course.id, p_lesson_id, v_uid
  );

  perform public.learning_audit_write(
    v_uid,
    v_ctx.o_space_id,
    'progress.lesson_complete',
    'learning_lesson_progress',
    v_row.id::text,
    jsonb_build_object(
      'course_id', v_ctx.o_course.id,
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
$$;

create or replace function public.reopen_learning_lesson(
  p_lesson_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

  if not public.has_learning_course_access(v_ctx.o_course.id, v_uid) then
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
    v_ctx.o_space_id, v_ctx.o_course.id, p_lesson_id, v_uid, v_uid,
    'lesson_reopened', v_from, 'in_progress', '{}'::jsonb
  );

  v_course := public.learning_progress_recompute_course(
    v_uid, v_ctx.o_course.id, p_lesson_id, v_uid
  );

  perform public.learning_audit_write(
    v_uid,
    v_ctx.o_space_id,
    'progress.lesson_reopen',
    'learning_lesson_progress',
    v_row.id::text,
    jsonb_build_object(
      'course_id', v_ctx.o_course.id,
      'lesson_id', p_lesson_id,
      'status', v_row.status
    )
  );

  return jsonb_build_object(
    'lesson_progress', to_jsonb(v_row),
    'course_progress', to_jsonb(v_course)
  );
end;
$$;

create or replace function public.get_learning_course_progress(
  p_course_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_course_progress%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_course_id is null then
    raise exception 'course_id is required';
  end if;

  -- Own row always readable; managers may read any learner later via SELECT RLS.
  -- This RPC returns the caller's own rollup (recomputed for freshness).
  if not (
    public.has_learning_course_access(p_course_id, v_uid)
    or public.can_manage_learning_course(p_course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not entitled to this course';
  end if;

  v_row := public.learning_progress_recompute_course(
    v_uid, p_course_id, null, v_uid
  );

  return to_jsonb(v_row);
end;
$$;

create or replace function public.recompute_learning_course_progress(
  p_course_id uuid,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_target uuid;
  v_row public.learning_course_progress%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_course_id is null then
    raise exception 'course_id is required';
  end if;

  v_target := coalesce(p_user_id, v_uid);

  if v_target = v_uid then
    if not public.has_learning_course_access(p_course_id, v_uid)
       and not public.can_manage_learning_course(p_course_id, v_uid)
       and not public.is_platform_admin(v_uid)
    then
      raise exception 'Not entitled to this course';
    end if;
  else
    if not public.can_manage_learning_course(p_course_id, v_uid)
       and not public.is_platform_admin(v_uid)
    then
      raise exception 'Not authorized to recompute another learner progress';
    end if;
  end if;

  v_row := public.learning_progress_recompute_course(
    v_target, p_course_id, null, v_uid
  );

  return to_jsonb(v_row);
end;
$$;

-- Grants for RPCs
revoke all on function public.start_learning_lesson(uuid) from public, anon;
grant execute on function public.start_learning_lesson(uuid)
  to authenticated, service_role;

revoke all on function public.touch_learning_lesson(uuid) from public, anon;
grant execute on function public.touch_learning_lesson(uuid)
  to authenticated, service_role;

revoke all on function public.complete_learning_lesson(uuid) from public, anon;
grant execute on function public.complete_learning_lesson(uuid)
  to authenticated, service_role;

revoke all on function public.reopen_learning_lesson(uuid) from public, anon;
grant execute on function public.reopen_learning_lesson(uuid)
  to authenticated, service_role;

revoke all on function public.get_learning_course_progress(uuid)
  from public, anon;
grant execute on function public.get_learning_course_progress(uuid)
  to authenticated, service_role;

revoke all on function public.recompute_learning_course_progress(uuid, uuid)
  from public, anon;
grant execute on function public.recompute_learning_course_progress(uuid, uuid)
  to authenticated, service_role;
