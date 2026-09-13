-- =============================================================================
-- UMTUBA Learning AI Tutor — Thread Lesson Binding Hardening V1
-- Migration: 20260874_learning_ai_tutor_thread_lesson_binding_v1.sql
--
-- Revises append_my_learning_ai_tutor_exchange to require p_lesson_id and enforce
-- thread.lesson_id = p_lesson_id (+ lesson belongs to thread.course_id) in SQL.
-- Drops the old four-argument overload so callers cannot bypass lesson binding.
-- Does NOT create tables/columns. Does NOT alter stub append RPC.
-- Local file only — do NOT remote-apply without explicit approval.
-- =============================================================================

-- PostgreSQL CREATE OR REPLACE with a new signature would leave the old overload
-- callable. Drop the four-argument form explicitly before creating the five-arg RPC.
drop function if exists public.append_my_learning_ai_tutor_exchange(uuid, text, text, text);

create or replace function public.append_my_learning_ai_tutor_exchange(
  p_thread_id uuid,
  p_lesson_id uuid,
  p_kind text,
  p_user_content text,
  p_assistant_content text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_thread public.learning_ai_tutor_threads%rowtype;
  v_kind text := lower(nullif(btrim(coalesce(p_kind, '')), ''));
  v_user_content text := nullif(btrim(coalesce(p_user_content, '')), '');
  v_assistant_content text := nullif(btrim(coalesce(p_assistant_content, '')), '');
  v_user_msg public.learning_ai_tutor_messages%rowtype;
  v_asst_msg public.learning_ai_tutor_messages%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_lesson_id is null then
    raise exception 'lesson_id is required';
  end if;

  select * into v_thread
  from public.learning_ai_tutor_threads
  where id = p_thread_id
  for update;

  if not found or v_thread.user_id is distinct from v_uid then
    raise exception 'Thread not found';
  end if;

  -- Re-check live course entitlement (fail closed if revoked).
  if not public.has_learning_course_access(v_thread.course_id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  -- Exact lesson binding: caller lesson must match thread.lesson_id.
  if v_thread.lesson_id is distinct from p_lesson_id then
    raise exception 'Thread lesson mismatch';
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

  -- Bridge allowlist only (no code_review / other).
  if v_kind not in ('ask_question', 'explain_again', 'hint') then
    raise exception 'Invalid message_kind';
  end if;

  if v_user_content is null or char_length(v_user_content) > 20000 then
    raise exception 'user content must be 1..20000 chars';
  end if;
  if v_assistant_content is null or char_length(v_assistant_content) > 20000 then
    raise exception 'assistant content must be 1..20000 chars';
  end if;

  perform public.learning_lesson_content_block_assert_safe_text(
    'ai_tutor.user_content',
    v_user_content
  );
  perform public.learning_lesson_content_block_assert_safe_text(
    'ai_tutor.assistant_content',
    v_assistant_content
  );

  insert into public.learning_ai_tutor_messages (
    thread_id, role, message_kind, content
  )
  values (p_thread_id, 'user', v_kind, v_user_content)
  returning * into v_user_msg;

  -- Same message_kind on assistant row (matches existing stub append convention).
  insert into public.learning_ai_tutor_messages (
    thread_id, role, message_kind, content
  )
  values (p_thread_id, 'assistant', v_kind, v_assistant_content)
  returning * into v_asst_msg;

  update public.learning_ai_tutor_threads
  set updated_at = now()
  where id = p_thread_id;

  return jsonb_build_object(
    'thread_id', p_thread_id,
    'user_message', jsonb_build_object(
      'id', v_user_msg.id,
      'role', v_user_msg.role,
      'message_kind', v_user_msg.message_kind,
      'content', v_user_msg.content,
      'created_at', v_user_msg.created_at
    ),
    'assistant_message', jsonb_build_object(
      'id', v_asst_msg.id,
      'role', v_asst_msg.role,
      'message_kind', v_asst_msg.message_kind,
      'content', v_asst_msg.content,
      'created_at', v_asst_msg.created_at
    )
  );
end;
$$;

comment on function public.append_my_learning_ai_tutor_exchange(uuid, uuid, text, text, text) is
  'Persists one learner + one real assistant AI Tutor exchange with SQL lesson binding. Auth.uid ownership, course entitlement, thread.lesson_id = p_lesson_id, lesson in course, kind allowlist ask_question|explain_again|hint, content 1..20000 + safe-text. Old 4-arg overload dropped. No stub assistant text. No grades/progress/enrollment mutation.';

revoke all on function public.append_my_learning_ai_tutor_exchange(uuid, uuid, text, text, text)
  from public, anon;
grant execute on function public.append_my_learning_ai_tutor_exchange(uuid, uuid, text, text, text)
  to authenticated, service_role;
