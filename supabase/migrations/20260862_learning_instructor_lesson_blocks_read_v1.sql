-- UMTUBA Learning OS — Instructor Lesson Blocks Read RPC optimization V1
-- Additive. One SECURITY DEFINER read RPC for lesson content-block editor.
-- Avoids nested FORCE RLS amplification on learning_lessons +
-- learning_lesson_content_blocks PostgREST SELECTs.
-- Depends on: 20260832 lessons, 20260836 content blocks,
--             20260830 can_manage_learning_course / is_learning_course_staff.
-- Explicit exclusions: mutations, RLS rewrites, learner delivery, media.

-- ---------------------------------------------------------------------------
-- get_instructor_learning_lesson_blocks
-- Auth (single gate via lesson → section → course):
--   can_manage_learning_course OR is_learning_course_staff
-- Returns lesson metadata + ordered content blocks for the instructor editor.
-- ---------------------------------------------------------------------------

create or replace function public.get_instructor_learning_lesson_blocks(
  p_lesson_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_course_id uuid;
  v_can_manage boolean := false;
  v_payload jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_lesson_id is null then
    raise exception 'lesson_id is required';
  end if;

  select sec.course_id
  into v_course_id
  from public.learning_lessons les
  join public.learning_sections sec
    on sec.id = les.section_id
  where les.id = p_lesson_id;

  if v_course_id is null then
    raise exception 'Learning lesson not found';
  end if;

  -- Single authorization decision for this read.
  v_can_manage := public.can_manage_learning_course(v_course_id, v_uid);
  if not (
    v_can_manage
    or public.is_learning_course_staff(v_course_id, v_uid)
  ) then
    raise exception 'Not allowed to view this lesson authoring content';
  end if;

  select jsonb_build_object(
    'lesson', jsonb_build_object(
      'id', les.id,
      'name', les.name,
      'slug', les.slug,
      'status', les.status,
      'section_id', les.section_id,
      'course_id', sec.course_id,
      'description', les.description,
      'position', les.position
    ),
    'blocks', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', b.id,
            'lesson_id', b.lesson_id,
            'block_type', b.block_type,
            'status', b.status,
            'position', b.position,
            'content', b.content,
            'created_at', b.created_at,
            'updated_at', b.updated_at
          )
          order by b.position asc, b.id asc
        )
        from public.learning_lesson_content_blocks b
        where b.lesson_id = les.id
      ),
      '[]'::jsonb
    ),
    'can_manage', v_can_manage
  )
  into v_payload
  from public.learning_lessons les
  join public.learning_sections sec
    on sec.id = les.section_id
  where les.id = p_lesson_id;

  return v_payload;
end;
$$;

comment on function public.get_instructor_learning_lesson_blocks(uuid) is
  'Instructor Lesson Blocks Read V1 — single-auth SECURITY DEFINER read of lesson metadata + ordered content blocks for authoring. Avoids nested FORCE RLS PostgREST selects. No mutations.';

revoke all on function public.get_instructor_learning_lesson_blocks(uuid)
  from public, anon;
grant execute on function public.get_instructor_learning_lesson_blocks(uuid)
  to authenticated;
grant execute on function public.get_instructor_learning_lesson_blocks(uuid)
  to service_role;
