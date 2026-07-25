-- UMTUBA Learning OS — Instructor Course Tree Read RPC optimization V1
-- Additive. One SECURITY DEFINER read RPC for course authoring tree.
-- Avoids nested FORCE RLS amplification from chained PostgREST SELECTs.
-- Depends on: 20260830..20260833 course/section/lesson/activity foundations,
--             20260856 instructor experience helpers (can_manage / staff).
-- Explicit exclusions: mutations, RLS policy rewrites, learner delivery.

-- ---------------------------------------------------------------------------
-- get_instructor_learning_course_tree
-- Auth (single gate): can_manage_learning_course OR is_learning_course_staff
-- (can_manage already includes platform admin + space/program manage paths).
-- Returns authoring fields only; no answer keys, grades, or learner PII.
-- ---------------------------------------------------------------------------

create or replace function public.get_instructor_learning_course_tree(
  p_course_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_can_manage boolean := false;
  v_payload jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_course_id is null then
    raise exception 'course_id is required';
  end if;

  -- Single authorization decision for this read.
  v_can_manage := public.can_manage_learning_course(p_course_id, v_uid);
  if not (
    v_can_manage
    or public.is_learning_course_staff(p_course_id, v_uid)
  ) then
    raise exception 'Not allowed to view this course authoring tree';
  end if;

  if not exists (
    select 1
    from public.learning_courses c
    where c.id = p_course_id
  ) then
    raise exception 'Learning course not found';
  end if;

  select jsonb_build_object(
    'tree', jsonb_build_object(
      'course', jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'status', c.status,
        'program_id', c.program_id,
        'description', c.description
      ),
      'sections', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', sec.id,
              'name', sec.name,
              'slug', sec.slug,
              'status', sec.status,
              'position', sec.position,
              'description', sec.description,
              'lessons', coalesce(
                (
                  select jsonb_agg(
                    jsonb_build_object(
                      'id', les.id,
                      'name', les.name,
                      'slug', les.slug,
                      'status', les.status,
                      'position', les.position,
                      'description', les.description,
                      'activities', coalesce(
                        (
                          select jsonb_agg(
                            jsonb_build_object(
                              'id', act.id,
                              'name', act.name,
                              'slug', act.slug,
                              'status', act.status,
                              'position', act.position,
                              'type', act.type,
                              'description', act.description
                            )
                            order by act.position asc, act.id asc
                          )
                          from public.learning_activities act
                          where act.lesson_id = les.id
                        ),
                        '[]'::jsonb
                      )
                    )
                    order by les.position asc, les.id asc
                  )
                  from public.learning_lessons les
                  where les.section_id = sec.id
                ),
                '[]'::jsonb
              )
            )
            order by sec.position asc, sec.id asc
          )
          from public.learning_sections sec
          where sec.course_id = c.id
        ),
        '[]'::jsonb
      )
    ),
    'can_manage', v_can_manage
  )
  into v_payload
  from public.learning_courses c
  where c.id = p_course_id;

  return v_payload;
end;
$$;

comment on function public.get_instructor_learning_course_tree(uuid) is
  'Instructor Course Tree Read V1 — single-auth SECURITY DEFINER read of course + sections + lessons + activities for authoring. Avoids nested FORCE RLS PostgREST selects. No mutations.';

revoke all on function public.get_instructor_learning_course_tree(uuid)
  from public, anon;
grant execute on function public.get_instructor_learning_course_tree(uuid)
  to authenticated;
grant execute on function public.get_instructor_learning_course_tree(uuid)
  to service_role;
