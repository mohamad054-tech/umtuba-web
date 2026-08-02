-- =============================================================================
-- UMTUBA Learning AI Tutor — Thread Resume / History Read Foundation V1
-- Migration: 20260896_learning_ai_tutor_thread_resume_history_read_v1.sql
--
-- Trusted-producer transcript integrity: resume a lesson-bound tutor thread with
-- bounded message history. Requires p_course_id + p_lesson_id and enforces
-- ownership, live course entitlement, exact lesson binding, and lesson∈course.
-- Drops unbounded get_my_learning_ai_tutor_thread_messages(uuid) so callers cannot
-- bypass lesson/course binding. Does NOT create tables/columns.
-- Local file only — do NOT remote-apply without explicit approval.
-- =============================================================================

drop function if exists public.get_my_learning_ai_tutor_thread_messages(uuid);

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

  -- Bound history: default 50, hard max 100. Reject non-positive.
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

  -- Non-enumerating: missing and foreign threads share the same error.
  if not found or v_thread.user_id is distinct from v_uid then
    raise exception 'Thread not found';
  end if;

  -- Exact course binding (no silent fallback to another course).
  if v_thread.course_id is distinct from p_course_id then
    raise exception 'Thread course mismatch';
  end if;

  -- Exact lesson binding (no silent fallback to another lesson).
  if v_thread.lesson_id is distinct from p_lesson_id then
    raise exception 'Thread lesson mismatch';
  end if;

  -- Live entitlement (fail closed if revoked).
  if not public.has_learning_course_access(v_thread.course_id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  -- Bound lesson must belong to the thread course.
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

  -- Lean thread identity only — never user_id, never provider/internal fields.
  return jsonb_build_object(
    'thread_id', v_thread.id,
    'course_id', v_thread.course_id,
    'lesson_id', v_thread.lesson_id,
    'title', v_thread.title,
    'created_at', v_thread.created_at,
    'updated_at', v_thread.updated_at,
    'messages', v_items,
    'limit', v_limit,
    'returned_count', v_count
  );
end;
$$;

comment on function public.resume_my_learning_ai_tutor_thread(uuid, uuid, uuid, integer) is
  'Resume lesson-bound AI Tutor thread with bounded message history. Auth.uid ownership, live course entitlement, exact course_id + lesson_id match, lesson in course. Messages ordered by created_at asc, id asc. Limit default 50 max 100. Lean thread fields only (no user_id). Old unbounded get_my_learning_ai_tutor_thread_messages(uuid) dropped.';

revoke all on function public.resume_my_learning_ai_tutor_thread(uuid, uuid, uuid, integer)
  from public, anon;
grant execute on function public.resume_my_learning_ai_tutor_thread(uuid, uuid, uuid, integer)
  to authenticated, service_role;
