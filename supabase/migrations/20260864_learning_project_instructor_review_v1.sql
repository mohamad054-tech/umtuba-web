-- UM Learning OS — Project instructor review queue (First Course Readiness gap close)
-- Additive: queue + get-for-review SECURITY DEFINER RPCs (FORCE RLS retained on tables).
-- Does not touch Discover / Ads / Games / um_points_ledger CHECKs.

create or replace function public.get_learning_project_submission_queue(
  p_course_id uuid,
  p_status text default 'pending',
  p_search text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text := lower(nullif(btrim(coalesce(p_status, 'pending')), ''));
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_items jsonb := '[]'::jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_course_id is null then raise exception 'course_id is required'; end if;

  if not (
    public.can_manage_learning_course(p_course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to manage this course';
  end if;

  if v_status is null or v_status not in ('pending', 'reviewed', 'all') then
    raise exception 'Invalid status filter';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_items
  from (
    select
      s.id as submission_id,
      s.activity_id,
      a.name as activity_name,
      s.user_id as learner_user_id,
      public.learning_instructor_learner_label(s.user_id) as learner_label,
      s.status,
      s.submitted_at,
      s.attempt_number,
      exists (
        select 1 from public.learning_project_reviews r
        where r.submission_id = s.id
      ) as has_review
    from public.learning_project_submissions s
    join public.learning_activities a on a.id = s.activity_id
    where s.course_id = p_course_id
      and (
        (v_status = 'pending' and s.status = 'submitted')
        or (v_status = 'reviewed' and s.status = 'reviewed')
        or (v_status = 'all' and s.status in ('submitted', 'reviewed'))
      )
      and (
        v_search is null
        or s.id::text ilike '%' || v_search || '%'
        or s.user_id::text ilike '%' || v_search || '%'
        or coalesce(public.learning_instructor_learner_label(s.user_id), '')
             ilike '%' || v_search || '%'
        or a.name ilike '%' || v_search || '%'
      )
    order by
      case when s.status = 'submitted' then 0 else 1 end,
      s.submitted_at asc nulls last
    limit 200
  ) t;

  return jsonb_build_object(
    'course_id', p_course_id,
    'status', v_status,
    'items', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_learning_project_submission_for_review(
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.learning_project_submissions%rowtype;
  v_review public.learning_project_reviews%rowtype;
  v_spec public.learning_project_specs%rowtype;
  v_activity public.learning_activities%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_submission_id is null then raise exception 'submission_id is required'; end if;

  select * into v_sub from public.learning_project_submissions where id = p_submission_id;
  if not found then raise exception 'Submission not found'; end if;

  if not (
    public.can_manage_learning_course(v_sub.course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to review this submission';
  end if;

  select * into v_activity from public.learning_activities where id = v_sub.activity_id;
  select * into v_spec from public.learning_project_specs where activity_id = v_sub.activity_id;
  select * into v_review from public.learning_project_reviews where submission_id = p_submission_id;

  return jsonb_build_object(
    'submission_id', v_sub.id,
    'activity_id', v_sub.activity_id,
    'activity_name', v_activity.name,
    'course_id', v_sub.course_id,
    'learner_user_id', v_sub.user_id,
    'learner_label', public.learning_instructor_learner_label(v_sub.user_id),
    'status', v_sub.status,
    'attempt_number', v_sub.attempt_number,
    'submitted_at', v_sub.submitted_at,
    'body_text', v_sub.body_text,
    'artifact_url', v_sub.artifact_url,
    'instructions', coalesce(v_spec.instructions, ''),
    'review', case
      when v_review.submission_id is null then null
      else jsonb_build_object(
        'status', v_review.status,
        'feedback', v_review.feedback,
        'reviewer_user_id', v_review.reviewer_user_id,
        'reviewed_at', v_review.reviewed_at
      )
    end
  );
end;
$$;

revoke all on function public.get_learning_project_submission_queue(uuid, text, text)
  from public, anon;
grant execute on function public.get_learning_project_submission_queue(uuid, text, text)
  to authenticated, service_role;

revoke all on function public.get_learning_project_submission_for_review(uuid)
  from public, anon;
grant execute on function public.get_learning_project_submission_for_review(uuid)
  to authenticated, service_role;
