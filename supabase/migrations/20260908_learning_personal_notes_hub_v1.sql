-- UM Learning OS — Learner Personal Notes Hub V1
-- Additive. Git-only until explicit remote apply GO.
--
-- Cross-lesson index of the caller's private lesson notes with course/lesson
-- context. Does not change existing per-lesson CRUD RPCs or ownership model.
--
-- Locked decisions:
--  1. Owner-only: n.user_id = auth.uid(); no instructor/admin cross-user read.
--  2. Live has_learning_course_access required for each returned note.
--  3. Optional p_course_id filter; hard limit 1..100 with limit+1 → has_more.
--  4. Order: updated_at desc, id desc. No offset/cursor. No DB free-text search.
--  5. Join lesson → section → course (never learning_lessons.course_id).

-- ---------------------------------------------------------------------------
-- 1) Supporting index for hub ordering (user_id, updated_at desc)
-- ---------------------------------------------------------------------------

create index if not exists learning_lesson_notes_user_updated_idx
  on public.learning_lesson_notes (user_id, updated_at desc);

comment on index public.learning_lesson_notes_user_updated_idx is
  'Personal Notes Hub V1: caller-scoped updated_at ordering.';

-- ---------------------------------------------------------------------------
-- 2) list_my_learning_notes_hub
-- ---------------------------------------------------------------------------

create or replace function public.list_my_learning_notes_hub(
  p_course_id uuid default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer;
  v_fetch integer;
  v_items jsonb;
  v_count integer;
  v_has_more boolean := false;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_fetch := v_limit + 1;

  with ranked as (
    select
      n.id,
      n.lesson_id,
      c.id as course_id,
      c.name as course_name,
      l.name as lesson_name,
      n.body,
      n.lesson_position_seconds,
      n.created_at,
      n.updated_at
    from public.learning_lesson_notes n
    join public.learning_lessons l on l.id = n.lesson_id
    join public.learning_sections s on s.id = l.section_id
    join public.learning_courses c on c.id = s.course_id
    where n.user_id = v_uid
      and public.has_learning_course_access(c.id, v_uid)
      and (p_course_id is null or c.id = p_course_id)
    order by n.updated_at desc, n.id desc
    limit v_fetch
  ),
  capped as (
    select * from ranked limit v_limit
  )
  select
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'lesson_id', c.lesson_id,
            'course_id', c.course_id,
            'course_name', c.course_name,
            'lesson_name', c.lesson_name,
            'body', c.body,
            'lesson_position_seconds', c.lesson_position_seconds,
            'created_at', c.created_at,
            'updated_at', c.updated_at
          )
          order by c.updated_at desc, c.id desc
        )
        from capped c
      ),
      '[]'::jsonb
    ),
    (select count(*)::integer from ranked)
  into v_items, v_count;

  v_has_more := v_count > v_limit;

  return jsonb_build_object(
    'notes', v_items,
    'limit', v_limit,
    'has_more', v_has_more
  );
end;
$$;

revoke all on function public.list_my_learning_notes_hub(uuid, integer)
  from public, anon;
grant execute on function public.list_my_learning_notes_hub(uuid, integer)
  to authenticated, service_role;

comment on function public.list_my_learning_notes_hub(uuid, integer) is
  'Personal Notes Hub V1: list auth.uid() notes across accessible courses. Owner-only. Optional course filter. Limit 1..100 with has_more. Ordered updated_at desc, id desc.';
