-- =============================================================================
-- UMTUBA Learning AI Tutor — Thread Persistence Bridge V1
-- Migration: 20260872_learning_ai_tutor_thread_persistence_bridge_v1.sql
--
-- Adds one authenticated SECURITY DEFINER RPC that persists a real learner +
-- assistant exchange into existing learning_ai_tutor_threads / messages.
-- Does NOT create tables. Does NOT replace stub append_my_learning_ai_tutor_message.
-- Local file only — do NOT remote-apply without explicit approval.
-- =============================================================================

create or replace function public.append_my_learning_ai_tutor_exchange(
  p_thread_id uuid,
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

  -- Linked lesson must still belong to the thread course when present.
  if v_thread.lesson_id is not null then
    if not exists (
      select 1
      from public.learning_lessons les
      join public.learning_sections sec on sec.id = les.section_id
      where les.id = v_thread.lesson_id
        and sec.course_id = v_thread.course_id
    ) then
      raise exception 'Thread lesson is invalid';
    end if;
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

comment on function public.append_my_learning_ai_tutor_exchange(uuid, text, text, text) is
  'Persists one learner + one real assistant AI Tutor exchange. Auth.uid ownership, course entitlement, kind allowlist ask_question|explain_again|hint, content 1..20000 + safe-text. No stub assistant text. No grades/progress/enrollment mutation.';

revoke all on function public.append_my_learning_ai_tutor_exchange(uuid, text, text, text)
  from public, anon;
grant execute on function public.append_my_learning_ai_tutor_exchange(uuid, text, text, text)
  to authenticated, service_role;
