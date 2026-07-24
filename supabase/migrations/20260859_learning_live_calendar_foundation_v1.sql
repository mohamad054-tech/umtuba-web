-- =============================================================================
-- UM Learning OS — Live Learning & Calendar Foundation V1
-- Migration: 20260859_learning_live_calendar_foundation_v1.sql
--
-- Course-scoped live class scheduling, join gate, attendance, calendar.
-- Reuses courses/sections/lessons/enrollments/auth/notifications/audit.
-- Does NOT: recording, chat redesign, whiteboard, breakouts, Zoom/Teams,
-- external calendar sync, email/push, attendance grading, AI, analytics.
-- LiveKit tokens are minted in app code from join-gate safe metadata only.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) Notification types
-- ---------------------------------------------------------------------------

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'follow',
      'post_like',
      'comment',
      'reply',
      'mention',
      'live_started',
      'direct_message',
      'post_reached_country',
      'post_trending_country',
      'post_milestone',
      'post_journey_summary',
      'um_points_earned',
      'reward_milestone',
      'nearby_live_started',
      'ai_creator_insight',
      'post_save',
      'post_share',
      'referral_reward',
      'learning_course_completed',
      'learning_announcement_posted',
      'learning_discussion_reply',
      'learning_qa_answered',
      'learning_live_session_scheduled',
      'learning_live_session_updated',
      'learning_live_session_cancelled'
    )
  );

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------

create table if not exists public.learning_live_sessions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.learning_spaces (id) on delete restrict,
  course_id uuid not null references public.learning_courses (id) on delete restrict,
  section_id uuid references public.learning_sections (id) on delete set null,
  lesson_id uuid references public.learning_lessons (id) on delete set null,
  title text not null
    constraint learning_live_sessions_title_len check (
      char_length(btrim(title)) between 1 and 200
    ),
  description text
    constraint learning_live_sessions_description_len check (
      description is null or char_length(description) <= 10000
    ),
  -- All session times stored as timestamptz (UTC absolute). Display converts client-side.
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  constraint learning_live_sessions_time_order check (ends_at > starts_at),
  status text not null default 'scheduled'
    constraint learning_live_sessions_status_check check (
      status in ('scheduled', 'live', 'cancelled', 'completed')
    ),
  -- Non-secret provider metadata only (never API keys / tokens / passwords).
  provider_kind text
    constraint learning_live_sessions_provider_kind_check check (
      provider_kind is null
      or provider_kind in ('livekit', 'external', 'none')
    ),
  provider_ref text
    constraint learning_live_sessions_provider_ref_len check (
      provider_ref is null or char_length(provider_ref) <= 200
    ),
  -- Server-authored SFU room name; never accepted from clients.
  sfu_room_id text
    constraint learning_live_sessions_sfu_room_len check (
      sfu_room_id is null or char_length(sfu_room_id) between 8 and 200
    ),
  reminder_minutes_before integer
    constraint learning_live_sessions_reminder_range check (
      reminder_minutes_before is null
      or reminder_minutes_before between 5 and 1440
    ),
  created_by uuid not null references public.profiles (id) on delete restrict,
  started_at timestamptz,
  started_by uuid references public.profiles (id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete set null,
  cancellation_reason text
    constraint learning_live_sessions_cancel_reason_len check (
      cancellation_reason is null or char_length(cancellation_reason) <= 500
    ),
  completed_at timestamptz,
  completed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_live_sessions_course_starts_idx
  on public.learning_live_sessions (course_id, starts_at);

create index if not exists learning_live_sessions_status_starts_idx
  on public.learning_live_sessions (status, starts_at);

create trigger learning_live_sessions_set_updated_at
  before update on public.learning_live_sessions
  for each row execute function public.set_row_updated_at();

create table if not exists public.learning_live_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.learning_live_sessions (id) on delete cascade,
  space_id uuid not null references public.learning_spaces (id) on delete restrict,
  course_id uuid not null references public.learning_courses (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  left_at timestamptz,
  duration_seconds integer
    constraint learning_live_attendance_duration_nonneg check (
      duration_seconds is null or duration_seconds >= 0
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_live_attendance_user_session_uniq unique (session_id, user_id)
);

create index if not exists learning_live_attendance_session_idx
  on public.learning_live_attendance (session_id, joined_at);

create index if not exists learning_live_attendance_user_idx
  on public.learning_live_attendance (user_id, session_id);

create trigger learning_live_attendance_set_updated_at
  before update on public.learning_live_attendance
  for each row execute function public.set_row_updated_at();

-- ---------------------------------------------------------------------------
-- 2) RLS
-- ---------------------------------------------------------------------------

alter table public.learning_live_sessions enable row level security;
alter table public.learning_live_sessions force row level security;
alter table public.learning_live_attendance enable row level security;
alter table public.learning_live_attendance force row level security;

revoke all on table public.learning_live_sessions from public, anon, authenticated;
grant select on table public.learning_live_sessions to authenticated;
revoke insert, update, delete on table public.learning_live_sessions from anon, authenticated;
grant all on table public.learning_live_sessions to service_role;

revoke all on table public.learning_live_attendance from public, anon, authenticated;
grant select on table public.learning_live_attendance to authenticated;
revoke insert, update, delete on table public.learning_live_attendance from anon, authenticated;
grant all on table public.learning_live_attendance to service_role;

drop policy if exists "Course members read live sessions"
  on public.learning_live_sessions;
create policy "Course members read live sessions"
  on public.learning_live_sessions for select to authenticated
  using (
    public.has_learning_course_access(course_id)
    or public.can_manage_learning_course(course_id)
    or public.is_learning_course_staff(course_id)
    or public.is_platform_admin()
  );

drop policy if exists "Own attendance readable"
  on public.learning_live_attendance;
create policy "Own attendance readable"
  on public.learning_live_attendance for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Staff read session attendance"
  on public.learning_live_attendance;
create policy "Staff read session attendance"
  on public.learning_live_attendance for select to authenticated
  using (
    public.can_manage_learning_course(course_id)
    or public.is_learning_course_staff(course_id)
    or public.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- 3) Helpers
-- ---------------------------------------------------------------------------

create or replace function public.learning_live_course_space_id(p_course_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.space_id
  from public.learning_courses c
  join public.learning_programs p on p.id = c.program_id
  where c.id = p_course_id;
$$;

revoke all on function public.learning_live_course_space_id(uuid)
  from public, anon, authenticated;

create or replace function public.learning_live_assert_access(
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
    public.has_learning_course_access(p_course_id, p_user_id)
    or public.can_manage_learning_course(p_course_id, p_user_id)
    or public.is_learning_course_staff(p_course_id, p_user_id)
    or public.is_platform_admin(p_user_id)
  ) then
    raise exception 'Not entitled to this course';
  end if;
end;
$$;

revoke all on function public.learning_live_assert_access(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.learning_live_assert_manage(
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
  if not (
    public.can_manage_learning_course(p_course_id, p_user_id)
    or public.is_learning_course_staff(p_course_id, p_user_id)
    or public.is_platform_admin(p_user_id)
  ) then
    raise exception 'Not allowed to manage live sessions for this course';
  end if;
end;
$$;

revoke all on function public.learning_live_assert_manage(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.learning_live_sfu_room_name(p_session_id uuid)
returns text
language sql
immutable
as $$
  select 'umtuba-learning-live-' || p_session_id::text;
$$;

revoke all on function public.learning_live_sfu_room_name(uuid)
  from public, anon;

create or replace function public.learning_live_in_join_window(
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_now timestamptz default now()
)
returns boolean
language sql
stable
as $$
  select
    p_starts_at is not null
    and p_ends_at is not null
    and p_now >= (p_starts_at - interval '15 minutes')
    and p_now <= (p_ends_at + interval '15 minutes');
$$;

revoke all on function public.learning_live_in_join_window(timestamptz, timestamptz, timestamptz)
  from public, anon;

create or replace function public.learning_live_session_public_json(
  p_row public.learning_live_sessions,
  p_include_manage boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_can_join boolean;
begin
  v_can_join :=
    p_row.status in ('scheduled', 'live')
    and public.learning_live_in_join_window(p_row.starts_at, p_row.ends_at, now());

  return jsonb_build_object(
    'session_id', p_row.id,
    'course_id', p_row.course_id,
    'section_id', p_row.section_id,
    'lesson_id', p_row.lesson_id,
    'title', p_row.title,
    'description', p_row.description,
    'starts_at', p_row.starts_at,
    'ends_at', p_row.ends_at,
    'status', p_row.status,
    'provider_kind', p_row.provider_kind,
    'provider_ref', case when p_include_manage then p_row.provider_ref else null end,
    'sfu_room_id', case when p_include_manage then p_row.sfu_room_id else null end,
    'reminder_minutes_before', p_row.reminder_minutes_before,
    'join_eligible', v_can_join,
    'cancelled_at', p_row.cancelled_at,
    'completed_at', p_row.completed_at,
    'created_at', p_row.created_at,
    'updated_at', p_row.updated_at
  );
end;
$$;

revoke all on function public.learning_live_session_public_json(public.learning_live_sessions, boolean)
  from public, anon, authenticated;

create or replace function public.learning_live_session_public_json_by_id(
  p_session_id uuid,
  p_include_manage boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.learning_live_sessions%rowtype;
begin
  select * into v_row from public.learning_live_sessions where id = p_session_id;
  if not found then
    return null;
  end if;
  return public.learning_live_session_public_json(v_row, p_include_manage);
end;
$$;

revoke all on function public.learning_live_session_public_json_by_id(uuid, boolean)
  from public, anon, authenticated;

create or replace function public.learning_live_notify_learners(
  p_course_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_learner record;
begin
  for v_learner in
    select l.learner_user_id
    from public.learning_instructor_course_learners(p_course_id) l
    where l.enrollment_status = 'active'
      and l.learner_user_id is distinct from p_actor_id
    limit 200
  loop
    perform public.create_notification(
      v_learner.learner_user_id,
      p_actor_id,
      p_type,
      p_title,
      p_body,
      'learning_live_session',
      p_session_id::text,
      '/learning/courses/' || p_course_id::text || '/live/' || p_session_id::text,
      jsonb_build_object(
        'session_id', p_session_id,
        'course_id', p_course_id
      ),
      p_type || ':' || p_session_id::text || ':' || v_learner.learner_user_id::text
    );
  end loop;
end;
$$;

revoke all on function public.learning_live_notify_learners(uuid, uuid, text, text, text, uuid)
  from public, anon, authenticated;

create or replace function public.learning_live_validate_associations(
  p_course_id uuid,
  p_section_id uuid,
  p_lesson_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_section_id is not null and not exists (
    select 1 from public.learning_sections s
    where s.id = p_section_id and s.course_id = p_course_id
  ) then
    raise exception 'section_id does not belong to course';
  end if;

  if p_lesson_id is not null then
    if p_section_id is null then
      raise exception 'section_id is required when lesson_id is set';
    end if;
    if not exists (
      select 1
      from public.learning_lessons le
      where le.id = p_lesson_id and le.section_id = p_section_id
    ) then
      raise exception 'lesson_id does not belong to section';
    end if;
  end if;
end;
$$;

revoke all on function public.learning_live_validate_associations(uuid, uuid, uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Instructor session RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_learning_live_session(
  p_course_id uuid,
  p_title text,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_section_id uuid default null,
  p_lesson_id uuid default null,
  p_provider_kind text default 'livekit',
  p_provider_ref text default null,
  p_reminder_minutes_before integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_space uuid;
  v_title text := btrim(coalesce(p_title, ''));
  v_desc text := nullif(btrim(coalesce(p_description, '')), '');
  v_kind text := lower(nullif(btrim(coalesce(p_provider_kind, 'livekit')), ''));
  v_row public.learning_live_sessions%rowtype;
begin
  perform public.learning_live_assert_manage(p_course_id, v_uid);
  v_space := public.learning_live_course_space_id(p_course_id);
  if v_space is null then raise exception 'Learning course not found'; end if;
  if char_length(v_title) < 1 then raise exception 'Invalid title'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'Invalid session time range';
  end if;
  if p_starts_at < (now() - interval '5 minutes') then
    raise exception 'Session start must be in the future';
  end if;
  perform public.learning_live_validate_associations(p_course_id, p_section_id, p_lesson_id);
  if v_kind is null then v_kind := 'livekit'; end if;
  if v_kind not in ('livekit', 'external', 'none') then
    raise exception 'Invalid provider_kind';
  end if;

  insert into public.learning_live_sessions (
    space_id, course_id, section_id, lesson_id,
    title, description, starts_at, ends_at, status,
    provider_kind, provider_ref, reminder_minutes_before, created_by
  ) values (
    v_space, p_course_id, p_section_id, p_lesson_id,
    v_title, v_desc, p_starts_at, p_ends_at, 'scheduled',
    v_kind, nullif(btrim(coalesce(p_provider_ref, '')), ''),
    p_reminder_minutes_before, v_uid
  ) returning * into v_row;

  update public.learning_live_sessions
  set sfu_room_id = public.learning_live_sfu_room_name(v_row.id)
  where id = v_row.id
  returning * into v_row;

  perform public.learning_audit_write(
    v_uid, v_space, 'live.session_create',
    'learning_live_session', v_row.id::text,
    jsonb_build_object('course_id', p_course_id, 'starts_at', p_starts_at)
  );

  perform public.learning_live_notify_learners(
    p_course_id, v_uid,
    'learning_live_session_scheduled',
    'Live class scheduled',
    v_title,
    v_row.id
  );

  return public.learning_live_session_public_json(v_row, true);
end;
$$;

create or replace function public.update_learning_live_session(
  p_session_id uuid,
  p_title text default null,
  p_description text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_section_id uuid default null,
  p_lesson_id uuid default null,
  p_provider_kind text default null,
  p_provider_ref text default null,
  p_reminder_minutes_before integer default null,
  p_clear_section boolean default false,
  p_clear_lesson boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_live_sessions%rowtype;
  v_title text;
  v_starts timestamptz;
  v_ends timestamptz;
  v_section uuid;
  v_lesson uuid;
  v_kind text;
begin
  select * into v_row from public.learning_live_sessions
  where id = p_session_id for update;
  if not found then raise exception 'Live session not found'; end if;
  perform public.learning_live_assert_manage(v_row.course_id, v_uid);

  if v_row.status in ('cancelled', 'completed') then
    raise exception 'Terminal session cannot be updated';
  end if;
  if v_row.status = 'live' and (p_starts_at is not null or p_ends_at is not null) then
    raise exception 'Cannot change times after session has started';
  end if;
  if v_row.status is distinct from 'scheduled' and (
    p_starts_at is not null or p_ends_at is not null
  ) then
    raise exception 'Session times can only be updated before start';
  end if;

  v_title := coalesce(nullif(btrim(coalesce(p_title, '')), ''), v_row.title);
  v_starts := coalesce(p_starts_at, v_row.starts_at);
  v_ends := coalesce(p_ends_at, v_row.ends_at);
  if v_ends <= v_starts then raise exception 'Invalid session time range'; end if;

  v_section := case
    when p_clear_section then null
    when p_section_id is not null then p_section_id
    else v_row.section_id
  end;
  v_lesson := case
    when p_clear_lesson or p_clear_section then null
    when p_lesson_id is not null then p_lesson_id
    else v_row.lesson_id
  end;
  perform public.learning_live_validate_associations(v_row.course_id, v_section, v_lesson);

  v_kind := coalesce(
    lower(nullif(btrim(coalesce(p_provider_kind, '')), '')),
    v_row.provider_kind
  );
  if v_kind is not null and v_kind not in ('livekit', 'external', 'none') then
    raise exception 'Invalid provider_kind';
  end if;

  update public.learning_live_sessions
  set title = v_title,
      description = case
        when p_description is null then description
        else nullif(btrim(p_description), '')
      end,
      starts_at = v_starts,
      ends_at = v_ends,
      section_id = v_section,
      lesson_id = v_lesson,
      provider_kind = v_kind,
      provider_ref = case
        when p_provider_ref is null then provider_ref
        else nullif(btrim(p_provider_ref), '')
      end,
      reminder_minutes_before = coalesce(p_reminder_minutes_before, reminder_minutes_before),
      updated_at = now()
  where id = p_session_id
  returning * into v_row;

  perform public.learning_audit_write(
    v_uid, v_row.space_id, 'live.session_update',
    'learning_live_session', p_session_id::text,
    jsonb_build_object('course_id', v_row.course_id)
  );

  perform public.learning_live_notify_learners(
    v_row.course_id, v_uid,
    'learning_live_session_updated',
    'Live class updated',
    v_row.title,
    v_row.id
  );

  return public.learning_live_session_public_json(v_row, true);
end;
$$;

create or replace function public.cancel_learning_live_session(
  p_session_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_live_sessions%rowtype;
begin
  select * into v_row from public.learning_live_sessions
  where id = p_session_id for update;
  if not found then raise exception 'Live session not found'; end if;
  perform public.learning_live_assert_manage(v_row.course_id, v_uid);
  if v_row.status in ('cancelled', 'completed') then
    raise exception 'Session is already terminal';
  end if;

  update public.learning_live_sessions
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = v_uid,
      cancellation_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      updated_at = now()
  where id = p_session_id
  returning * into v_row;

  perform public.learning_audit_write(
    v_uid, v_row.space_id, 'live.session_cancel',
    'learning_live_session', p_session_id::text,
    jsonb_build_object('course_id', v_row.course_id)
  );

  perform public.learning_live_notify_learners(
    v_row.course_id, v_uid,
    'learning_live_session_cancelled',
    'Live class cancelled',
    v_row.title,
    v_row.id
  );

  return public.learning_live_session_public_json(v_row, true);
end;
$$;

create or replace function public.start_learning_live_session(
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_live_sessions%rowtype;
begin
  select * into v_row from public.learning_live_sessions
  where id = p_session_id for update;
  if not found then raise exception 'Live session not found'; end if;
  perform public.learning_live_assert_manage(v_row.course_id, v_uid);
  if v_row.status is distinct from 'scheduled' then
    raise exception 'Only scheduled sessions can go live';
  end if;
  if not public.learning_live_in_join_window(v_row.starts_at, v_row.ends_at, now()) then
    raise exception 'Session is outside the live window';
  end if;

  update public.learning_live_sessions
  set status = 'live',
      started_at = now(),
      started_by = v_uid,
      sfu_room_id = coalesce(sfu_room_id, public.learning_live_sfu_room_name(id)),
      updated_at = now()
  where id = p_session_id
  returning * into v_row;

  perform public.learning_audit_write(
    v_uid, v_row.space_id, 'live.session_start',
    'learning_live_session', p_session_id::text,
    jsonb_build_object('course_id', v_row.course_id)
  );

  return public.learning_live_session_public_json(v_row, true);
end;
$$;

create or replace function public.complete_learning_live_session(
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_live_sessions%rowtype;
begin
  select * into v_row from public.learning_live_sessions
  where id = p_session_id for update;
  if not found then raise exception 'Live session not found'; end if;
  perform public.learning_live_assert_manage(v_row.course_id, v_uid);
  if v_row.status not in ('scheduled', 'live') then
    raise exception 'Session cannot be completed from current status';
  end if;

  update public.learning_live_sessions
  set status = 'completed',
      completed_at = now(),
      completed_by = v_uid,
      updated_at = now()
  where id = p_session_id
  returning * into v_row;

  perform public.learning_audit_write(
    v_uid, v_row.space_id, 'live.session_complete',
    'learning_live_session', p_session_id::text,
    jsonb_build_object('course_id', v_row.course_id)
  );

  return public.learning_live_session_public_json(v_row, true);
end;
$$;

create or replace function public.list_learning_live_sessions_for_manage(
  p_course_id uuid,
  p_scope text default 'upcoming',
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_scope text := lower(coalesce(nullif(btrim(p_scope), ''), 'upcoming'));
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_items jsonb;
begin
  perform public.learning_live_assert_manage(p_course_id, v_uid);
  if v_scope not in ('upcoming', 'past', 'all') then
    raise exception 'Invalid scope';
  end if;

  select coalesce(jsonb_agg(
    public.learning_live_session_public_json_by_id(s.id, true)
    order by s.starts_at
  ), '[]'::jsonb)
  into v_items
  from (
    select s.id, s.starts_at
    from public.learning_live_sessions s
    where s.course_id = p_course_id
      and (
        (v_scope = 'upcoming' and s.status in ('scheduled', 'live') and s.ends_at >= now())
        or (v_scope = 'past' and (
          s.status in ('cancelled', 'completed') or s.ends_at < now()
        ))
        or v_scope = 'all'
      )
    order by
      case when v_scope = 'past' then s.starts_at end desc nulls last,
      case when v_scope <> 'past' then s.starts_at end asc nulls last
    limit v_limit
  ) s;

  return jsonb_build_object(
    'course_id', p_course_id,
    'scope', v_scope,
    'sessions', coalesce(v_items, '[]'::jsonb),
    'session_count', jsonb_array_length(coalesce(v_items, '[]'::jsonb))
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Learner schedule + get
-- ---------------------------------------------------------------------------

create or replace function public.list_my_learning_live_sessions(
  p_course_id uuid,
  p_scope text default 'upcoming',
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_scope text := lower(coalesce(nullif(btrim(p_scope), ''), 'upcoming'));
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_items jsonb;
begin
  perform public.learning_live_assert_access(p_course_id, v_uid);
  if v_scope not in ('upcoming', 'past', 'all') then
    raise exception 'Invalid scope';
  end if;

  select coalesce(jsonb_agg(
    public.learning_live_session_public_json_by_id(s.id, false)
    order by s.starts_at
  ), '[]'::jsonb)
  into v_items
  from (
    select s.id, s.starts_at
    from public.learning_live_sessions s
    where s.course_id = p_course_id
      and (
        (v_scope = 'upcoming' and s.status in ('scheduled', 'live', 'cancelled')
          and s.starts_at >= (now() - interval '1 day')
          and (s.status = 'cancelled' or s.ends_at >= now()))
        or (v_scope = 'past' and (
          s.status in ('completed') or (s.ends_at < now() and s.status <> 'cancelled')
        ))
        or v_scope = 'all'
      )
    order by s.starts_at asc
    limit v_limit
  ) s;

  return jsonb_build_object(
    'course_id', p_course_id,
    'scope', v_scope,
    'sessions', coalesce(v_items, '[]'::jsonb),
    'session_count', jsonb_array_length(coalesce(v_items, '[]'::jsonb))
  );
end;
$$;

create or replace function public.get_learning_live_session(
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_live_sessions%rowtype;
  v_manage boolean;
begin
  select * into v_row from public.learning_live_sessions where id = p_session_id;
  if not found then raise exception 'Live session not found'; end if;
  perform public.learning_live_assert_access(v_row.course_id, v_uid);
  v_manage := public.can_manage_learning_course(v_row.course_id, v_uid)
    or public.is_learning_course_staff(v_row.course_id, v_uid)
    or public.is_platform_admin(v_uid);
  return public.learning_live_session_public_json(v_row, v_manage);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) Join gate + attendance
-- ---------------------------------------------------------------------------

create or replace function public.get_learning_live_session_join_gate(
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_live_sessions%rowtype;
  v_staff boolean;
  v_in_window boolean;
  v_can_join boolean;
  v_reason text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_row from public.learning_live_sessions where id = p_session_id;
  if not found then raise exception 'Live session not found'; end if;
  perform public.learning_live_assert_access(v_row.course_id, v_uid);

  v_staff := public.can_manage_learning_course(v_row.course_id, v_uid)
    or public.is_learning_course_staff(v_row.course_id, v_uid)
    or public.is_platform_admin(v_uid);

  v_in_window := public.learning_live_in_join_window(v_row.starts_at, v_row.ends_at, now());

  if v_row.status = 'cancelled' then
    v_can_join := false;
    v_reason := 'cancelled';
  elsif v_row.status = 'completed' then
    v_can_join := false;
    v_reason := 'completed';
  elsif v_row.status not in ('scheduled', 'live') then
    v_can_join := false;
    v_reason := 'unavailable';
  elsif not v_in_window then
    v_can_join := false;
    v_reason := case
      when now() < (v_row.starts_at - interval '15 minutes') then 'too_early'
      else 'too_late'
    end;
  else
    v_can_join := true;
    v_reason := 'ready';
  end if;

  -- Safe join metadata only. Room identity is server-derived. No secrets.
  return jsonb_build_object(
    'session_id', v_row.id,
    'course_id', v_row.course_id,
    'status', v_row.status,
    'can_join', v_can_join,
    'reason', v_reason,
    'in_join_window', v_in_window,
    'starts_at', v_row.starts_at,
    'ends_at', v_row.ends_at,
    'early_join_minutes', 15,
    'late_join_minutes', 15,
    'role', case when v_staff then 'instructor' else 'learner' end,
    'identity', v_uid::text,
    'sfu_room_name', coalesce(v_row.sfu_room_id, public.learning_live_sfu_room_name(v_row.id)),
    'provider_kind', v_row.provider_kind,
    'can_publish_audio', v_staff,
    'can_publish_video', v_staff,
    'can_share_screen', v_staff,
    'can_subscribe', v_can_join,
    'media_token_issuance', 'app_layer',
    'title', v_row.title
  );
end;
$$;

create or replace function public.upsert_learning_live_attendance(
  p_session_id uuid,
  p_action text default 'join'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_live_sessions%rowtype;
  v_att public.learning_live_attendance%rowtype;
  v_action text := lower(btrim(coalesce(p_action, 'join')));
  v_gate jsonb;
  v_duration integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if v_action not in ('join', 'heartbeat', 'leave') then
    raise exception 'Invalid attendance action';
  end if;

  select * into v_row from public.learning_live_sessions where id = p_session_id;
  if not found then raise exception 'Live session not found'; end if;
  perform public.learning_live_assert_access(v_row.course_id, v_uid);

  if v_action = 'join' then
    v_gate := public.get_learning_live_session_join_gate(p_session_id);
    if coalesce((v_gate->>'can_join')::boolean, false) is not true then
      raise exception 'Not eligible to join this session';
    end if;

    insert into public.learning_live_attendance (
      session_id, space_id, course_id, user_id, joined_at, last_seen_at
    ) values (
      p_session_id, v_row.space_id, v_row.course_id, v_uid, now(), now()
    )
    on conflict (session_id, user_id) do update
      set last_seen_at = now(),
          left_at = null,
          updated_at = now()
    returning * into v_att;
  elsif v_action = 'heartbeat' then
    update public.learning_live_attendance
    set last_seen_at = now(),
        left_at = null,
        updated_at = now()
    where session_id = p_session_id and user_id = v_uid
    returning * into v_att;
    if not found then
      raise exception 'Attendance record not found';
    end if;
  else
    update public.learning_live_attendance
    set left_at = now(),
        last_seen_at = now(),
        duration_seconds = greatest(
          0,
          floor(extract(epoch from (now() - joined_at)))::integer
        ),
        updated_at = now()
    where session_id = p_session_id and user_id = v_uid
    returning * into v_att;
    if not found then
      raise exception 'Attendance record not found';
    end if;
  end if;

  v_duration := coalesce(
    v_att.duration_seconds,
    greatest(0, floor(extract(epoch from (v_att.last_seen_at - v_att.joined_at)))::integer)
  );

  return jsonb_build_object(
    'attendance_id', v_att.id,
    'session_id', v_att.session_id,
    'user_id', v_att.user_id,
    'joined_at', v_att.joined_at,
    'last_seen_at', v_att.last_seen_at,
    'left_at', v_att.left_at,
    'duration_seconds', v_duration
  );
end;
$$;

create or replace function public.get_my_learning_live_attendance(
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_live_sessions%rowtype;
  v_att public.learning_live_attendance%rowtype;
begin
  select * into v_row from public.learning_live_sessions where id = p_session_id;
  if not found then raise exception 'Live session not found'; end if;
  perform public.learning_live_assert_access(v_row.course_id, v_uid);

  select * into v_att
  from public.learning_live_attendance
  where session_id = p_session_id and user_id = v_uid;

  if not found then
    return jsonb_build_object(
      'session_id', p_session_id,
      'attendance', null
    );
  end if;

  return jsonb_build_object(
    'session_id', p_session_id,
    'attendance', jsonb_build_object(
      'attendance_id', v_att.id,
      'joined_at', v_att.joined_at,
      'last_seen_at', v_att.last_seen_at,
      'left_at', v_att.left_at,
      'duration_seconds', v_att.duration_seconds
    )
  );
end;
$$;

create or replace function public.list_learning_live_session_attendance(
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_live_sessions%rowtype;
  v_items jsonb;
begin
  select * into v_row from public.learning_live_sessions where id = p_session_id;
  if not found then raise exception 'Live session not found'; end if;
  perform public.learning_live_assert_manage(v_row.course_id, v_uid);

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.joined_at), '[]'::jsonb)
  into v_items
  from (
    select
      a.id as attendance_id,
      a.user_id,
      public.learning_instructor_learner_label(a.user_id) as learner_label,
      a.joined_at,
      a.last_seen_at,
      a.left_at,
      a.duration_seconds
    from public.learning_live_attendance a
    where a.session_id = p_session_id
  ) t;

  return jsonb_build_object(
    'session_id', p_session_id,
    'course_id', v_row.course_id,
    'attendance', coalesce(v_items, '[]'::jsonb),
    'attendance_count', jsonb_array_length(coalesce(v_items, '[]'::jsonb))
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) Calendar aggregation (read-only)
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

  select coalesce(jsonb_agg(x.item order by (x.item->>'occurs_at')), '[]'::jsonb)
  into v_items
  from (
    select jsonb_array_elements(coalesce(v_live, '[]'::jsonb)) as item
    union all
    select jsonb_array_elements(coalesce(v_due, '[]'::jsonb)) as item
  ) x;

  return jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'course_id', p_course_id,
    'items', coalesce(v_items, '[]'::jsonb),
    'item_count', jsonb_array_length(coalesce(v_items, '[]'::jsonb)),
    'assessment_due_supported', false
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

  select coalesce(jsonb_agg(x.item order by (x.item->>'occurs_at')), '[]'::jsonb)
  into v_items
  from (
    select jsonb_array_elements(coalesce(v_live, '[]'::jsonb)) as item
    union all
    select jsonb_array_elements(coalesce(v_due, '[]'::jsonb)) as item
  ) x;

  return jsonb_build_object(
    'course_id', p_course_id,
    'from', v_from,
    'to', v_to,
    'items', coalesce(v_items, '[]'::jsonb),
    'item_count', jsonb_array_length(coalesce(v_items, '[]'::jsonb)),
    'assessment_due_supported', false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) Grants
-- ---------------------------------------------------------------------------

revoke all on function public.create_learning_live_session(uuid, text, text, timestamptz, timestamptz, uuid, uuid, text, text, integer) from public, anon;
grant execute on function public.create_learning_live_session(uuid, text, text, timestamptz, timestamptz, uuid, uuid, text, text, integer) to authenticated, service_role;

revoke all on function public.update_learning_live_session(uuid, text, text, timestamptz, timestamptz, uuid, uuid, text, text, integer, boolean, boolean) from public, anon;
grant execute on function public.update_learning_live_session(uuid, text, text, timestamptz, timestamptz, uuid, uuid, text, text, integer, boolean, boolean) to authenticated, service_role;

revoke all on function public.cancel_learning_live_session(uuid, text) from public, anon;
grant execute on function public.cancel_learning_live_session(uuid, text) to authenticated, service_role;

revoke all on function public.start_learning_live_session(uuid) from public, anon;
grant execute on function public.start_learning_live_session(uuid) to authenticated, service_role;

revoke all on function public.complete_learning_live_session(uuid) from public, anon;
grant execute on function public.complete_learning_live_session(uuid) to authenticated, service_role;

revoke all on function public.list_learning_live_sessions_for_manage(uuid, text, integer) from public, anon;
grant execute on function public.list_learning_live_sessions_for_manage(uuid, text, integer) to authenticated, service_role;

revoke all on function public.list_my_learning_live_sessions(uuid, text, integer) from public, anon;
grant execute on function public.list_my_learning_live_sessions(uuid, text, integer) to authenticated, service_role;

revoke all on function public.get_learning_live_session(uuid) from public, anon;
grant execute on function public.get_learning_live_session(uuid) to authenticated, service_role;

revoke all on function public.get_learning_live_session_join_gate(uuid) from public, anon;
grant execute on function public.get_learning_live_session_join_gate(uuid) to authenticated, service_role;

revoke all on function public.upsert_learning_live_attendance(uuid, text) from public, anon;
grant execute on function public.upsert_learning_live_attendance(uuid, text) to authenticated, service_role;

revoke all on function public.get_my_learning_live_attendance(uuid) from public, anon;
grant execute on function public.get_my_learning_live_attendance(uuid) to authenticated, service_role;

revoke all on function public.list_learning_live_session_attendance(uuid) from public, anon;
grant execute on function public.list_learning_live_session_attendance(uuid) to authenticated, service_role;

revoke all on function public.get_my_learning_calendar(timestamptz, timestamptz, uuid) from public, anon;
grant execute on function public.get_my_learning_calendar(timestamptz, timestamptz, uuid) to authenticated, service_role;

revoke all on function public.get_instructor_learning_calendar(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.get_instructor_learning_calendar(uuid, timestamptz, timestamptz) to authenticated, service_role;
