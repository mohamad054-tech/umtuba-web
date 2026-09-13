-- =============================================================================
-- UMTUBA Learning AI Tutor — Thread Metadata Read V1
-- Migration: 20260873_learning_ai_tutor_thread_metadata_read_v1.sql
--
-- Lean owner-scoped thread metadata RPC for bridge pre-validation.
-- Does NOT return messages. Does NOT create tables. Does NOT alter stub/exchange RPCs.
-- Local file only — do NOT remote-apply without explicit approval.
-- =============================================================================

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

  -- Non-enumerating: missing and foreign threads share the same error.
  if not found or v_thread.user_id is distinct from v_uid then
    raise exception 'Thread not found';
  end if;

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'course_id', v_thread.course_id,
    'lesson_id', v_thread.lesson_id,
    'title', v_thread.title,
    'created_at', v_thread.created_at,
    'updated_at', v_thread.updated_at
  );
end;
$$;

comment on function public.get_my_learning_ai_tutor_thread(uuid) is
  'Lean owner-scoped AI Tutor thread metadata for validation. Auth.uid ownership; returns thread_id/course_id/lesson_id/title/timestamps only. Never returns messages or user_id. Non-enumerating Thread not found.';

revoke all on function public.get_my_learning_ai_tutor_thread(uuid)
  from public, anon;
grant execute on function public.get_my_learning_ai_tutor_thread(uuid)
  to authenticated, service_role;
