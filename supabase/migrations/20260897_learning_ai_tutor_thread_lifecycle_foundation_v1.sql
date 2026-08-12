-- =============================================================================
-- UMTUBA Learning AI Tutor — Thread Lifecycle Foundation V1
-- Migration: 20260897_learning_ai_tutor_thread_lifecycle_foundation_v1.sql
--
-- Adds lifecycle_status (active|archived), one-active-thread uniqueness per
-- learner+course+lesson, ensure (get-or-create) + archive RPCs.
-- Race-safe via partial unique index + unique_violation retry.
-- Does NOT delete messages/threads. Local only — do NOT remote-apply without GO.
-- =============================================================================

alter table public.learning_ai_tutor_threads
  add column if not exists lifecycle_status text;

update public.learning_ai_tutor_threads
set lifecycle_status = 'active'
where lifecycle_status is null;

alter table public.learning_ai_tutor_threads
  alter column lifecycle_status set default 'active';

alter table public.learning_ai_tutor_threads
  alter column lifecycle_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'learning_ai_tutor_threads_lifecycle_status_check'
  ) then
    alter table public.learning_ai_tutor_threads
      add constraint learning_ai_tutor_threads_lifecycle_status_check
      check (lifecycle_status in ('active', 'archived'));
  end if;
end $$;

comment on column public.learning_ai_tutor_threads.lifecycle_status is
  'Tutor thread lifecycle: active (reusable for learner+course+lesson) | archived (terminal; ensure creates a replacement).';

-- At most one active thread per learner + course + lesson.
create unique index if not exists learning_ai_tutor_threads_one_active_per_lesson_idx
  on public.learning_ai_tutor_threads (user_id, course_id, lesson_id)
  where lifecycle_status = 'active' and lesson_id is not null;

create index if not exists learning_ai_tutor_threads_user_course_lesson_lifecycle_idx
  on public.learning_ai_tutor_threads (user_id, course_id, lesson_id, lifecycle_status);

-- ---------------------------------------------------------------------------
-- Ensure active thread (get-or-create) — requires course + lesson.
-- ---------------------------------------------------------------------------
create or replace function public.ensure_my_learning_ai_tutor_active_thread(
  p_course_id uuid,
  p_lesson_id uuid,
  p_title text default 'AI Tutor'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_ai_tutor_threads%rowtype;
  v_title text := coalesce(nullif(btrim(coalesce(p_title, '')), ''), 'AI Tutor');
  v_created boolean := false;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_course_id is null then
    raise exception 'course_id is required';
  end if;
  if p_lesson_id is null then
    raise exception 'lesson_id is required';
  end if;

  if not public.has_learning_course_access(p_course_id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  if not exists (
    select 1
    from public.learning_lessons les
    join public.learning_sections sec on sec.id = les.section_id
    where les.id = p_lesson_id
      and sec.course_id = p_course_id
  ) then
    raise exception 'lesson_id is not in this course';
  end if;

  if char_length(v_title) > 160 then
    raise exception 'title must be 1..160 chars';
  end if;

  select * into v_row
  from public.learning_ai_tutor_threads
  where user_id = v_uid
    and course_id = p_course_id
    and lesson_id = p_lesson_id
    and lifecycle_status = 'active'
  order by updated_at desc, created_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'thread_id', v_row.id,
      'course_id', v_row.course_id,
      'lesson_id', v_row.lesson_id,
      'title', v_row.title,
      'lifecycle_status', v_row.lifecycle_status,
      'created_at', v_row.created_at,
      'updated_at', v_row.updated_at,
      'created', false
    );
  end if;

  begin
    insert into public.learning_ai_tutor_threads (
      course_id, lesson_id, user_id, title, lifecycle_status
    )
    values (p_course_id, p_lesson_id, v_uid, v_title, 'active')
    returning * into v_row;
    v_created := true;
  exception
    when unique_violation then
      select * into v_row
      from public.learning_ai_tutor_threads
      where user_id = v_uid
        and course_id = p_course_id
        and lesson_id = p_lesson_id
        and lifecycle_status = 'active'
      order by updated_at desc, created_at desc
      limit 1;
      if not found then
        raise exception 'Thread not found';
      end if;
      v_created := false;
  end;

  return jsonb_build_object(
    'thread_id', v_row.id,
    'course_id', v_row.course_id,
    'lesson_id', v_row.lesson_id,
    'title', v_row.title,
    'lifecycle_status', v_row.lifecycle_status,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'created', v_created
  );
end;
$$;

comment on function public.ensure_my_learning_ai_tutor_active_thread(uuid, uuid, text) is
  'Get-or-create the single active AI Tutor thread for auth.uid + course + lesson. Entitlement + lesson∈course. Race-safe via unique active index. Never reuses archived or other learners. Lean fields only.';

revoke all on function public.ensure_my_learning_ai_tutor_active_thread(uuid, uuid, text)
  from public, anon;
grant execute on function public.ensure_my_learning_ai_tutor_active_thread(uuid, uuid, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Archive active thread (owner only). Enables a replacement active thread.
-- ---------------------------------------------------------------------------
create or replace function public.archive_my_learning_ai_tutor_thread(
  p_thread_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_ai_tutor_threads%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_thread_id is null then
    raise exception 'thread_id is required';
  end if;

  select * into v_row
  from public.learning_ai_tutor_threads
  where id = p_thread_id
  for update;

  if not found or v_row.user_id is distinct from v_uid then
    raise exception 'Thread not found';
  end if;

  if not public.has_learning_course_access(v_row.course_id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  if v_row.lifecycle_status = 'archived' then
    return jsonb_build_object(
      'thread_id', v_row.id,
      'course_id', v_row.course_id,
      'lesson_id', v_row.lesson_id,
      'title', v_row.title,
      'lifecycle_status', v_row.lifecycle_status,
      'created_at', v_row.created_at,
      'updated_at', v_row.updated_at,
      'archived', false
    );
  end if;

  update public.learning_ai_tutor_threads
  set lifecycle_status = 'archived',
      updated_at = now()
  where id = p_thread_id
  returning * into v_row;

  return jsonb_build_object(
    'thread_id', v_row.id,
    'course_id', v_row.course_id,
    'lesson_id', v_row.lesson_id,
    'title', v_row.title,
    'lifecycle_status', v_row.lifecycle_status,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'archived', true
  );
end;
$$;

comment on function public.archive_my_learning_ai_tutor_thread(uuid) is
  'Archive owner AI Tutor thread. Auth.uid ownership + course entitlement. Idempotent if already archived. Does not delete messages.';

revoke all on function public.archive_my_learning_ai_tutor_thread(uuid)
  from public, anon;
grant execute on function public.archive_my_learning_ai_tutor_thread(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- create_my_learning_ai_tutor_thread: when lesson provided, ensure semantics
-- (no duplicate actives). Null lesson keeps insert path (no unique active key).
-- ---------------------------------------------------------------------------
create or replace function public.create_my_learning_ai_tutor_thread(
  p_course_id uuid,
  p_lesson_id uuid default null,
  p_title text default 'AI Tutor'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_ai_tutor_threads%rowtype;
  v_title text := coalesce(nullif(btrim(coalesce(p_title, '')), ''), 'AI Tutor');
  v_ensured jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_lesson_id is not null then
    v_ensured := public.ensure_my_learning_ai_tutor_active_thread(
      p_course_id,
      p_lesson_id,
      v_title
    );
    return v_ensured;
  end if;

  if not public.has_learning_course_access(p_course_id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  insert into public.learning_ai_tutor_threads (
    course_id, lesson_id, user_id, title, lifecycle_status
  )
  values (p_course_id, null, v_uid, v_title, 'active')
  returning * into v_row;

  return jsonb_build_object(
    'thread_id', v_row.id,
    'course_id', v_row.course_id,
    'lesson_id', v_row.lesson_id,
    'title', v_row.title,
    'lifecycle_status', v_row.lifecycle_status,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'created', true
  );
end;
$$;

comment on function public.create_my_learning_ai_tutor_thread(uuid, uuid, text) is
  'Create AI Tutor thread. When p_lesson_id set: ensure active (get-or-create, no duplicate actives). When null: insert course-scoped active thread. Auth + entitlement.';

-- ---------------------------------------------------------------------------
-- Surface lifecycle_status on lean metadata + resume (compat, no behavior break).
-- ---------------------------------------------------------------------------
create or replace function public.get_my_learning_ai_tutor_thread(
  p_thread_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_thread public.learning_ai_tutor_threads%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_thread
  from public.learning_ai_tutor_threads
  where id = p_thread_id;

  if not found or v_thread.user_id is distinct from v_uid then
    raise exception 'Thread not found';
  end if;

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'course_id', v_thread.course_id,
    'lesson_id', v_thread.lesson_id,
    'title', v_thread.title,
    'lifecycle_status', v_thread.lifecycle_status,
    'created_at', v_thread.created_at,
    'updated_at', v_thread.updated_at
  );
end;
$$;

create or replace function public.resume_my_learning_ai_tutor_thread(
  p_thread_id uuid,
  p_course_id uuid,
  p_lesson_id uuid,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_thread public.learning_ai_tutor_threads%rowtype;
  v_limit integer;
  v_items jsonb;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_thread_id is null then
    raise exception 'thread_id is required';
  end if;
  if p_course_id is null then
    raise exception 'course_id is required';
  end if;
  if p_lesson_id is null then
    raise exception 'lesson_id is required';
  end if;

  v_limit := coalesce(p_limit, 50);
  if v_limit < 1 then
    raise exception 'limit must be at least 1';
  end if;
  if v_limit > 100 then
    v_limit := 100;
  end if;

  select * into v_thread
  from public.learning_ai_tutor_threads
  where id = p_thread_id;

  if not found or v_thread.user_id is distinct from v_uid then
    raise exception 'Thread not found';
  end if;

  if v_thread.course_id is distinct from p_course_id then
    raise exception 'Thread course mismatch';
  end if;

  if v_thread.lesson_id is distinct from p_lesson_id then
    raise exception 'Thread lesson mismatch';
  end if;

  if not public.has_learning_course_access(v_thread.course_id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  if not exists (
    select 1
    from public.learning_lessons les
    join public.learning_sections sec on sec.id = les.section_id
    where les.id = p_lesson_id
      and sec.course_id = v_thread.course_id
  ) then
    raise exception 'Thread lesson is invalid';
  end if;

  select coalesce(jsonb_agg(row_msg.msg order by row_msg.ord), '[]'::jsonb)
  into v_items
  from (
    select
      m.created_at as ord,
      jsonb_build_object(
        'id', m.id,
        'role', m.role,
        'message_kind', m.message_kind,
        'content', m.content,
        'created_at', m.created_at
      ) as msg
    from public.learning_ai_tutor_messages m
    where m.thread_id = p_thread_id
    order by m.created_at asc, m.id asc
    limit v_limit
  ) row_msg;

  v_count := coalesce(jsonb_array_length(v_items), 0);

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'course_id', v_thread.course_id,
    'lesson_id', v_thread.lesson_id,
    'title', v_thread.title,
    'lifecycle_status', v_thread.lifecycle_status,
    'created_at', v_thread.created_at,
    'updated_at', v_thread.updated_at,
    'messages', v_items,
    'limit', v_limit,
    'returned_count', v_count
  );
end;
$$;
