-- =============================================================================
-- UM Learning OS — Beta Readiness Auth Alignment V1
-- Migration: 20260860_learning_beta_readiness_auth_alignment_v1.sql
--
-- Release-hardening only (no product features):
-- 1) Shared learning_course_space_id helper (dedupe community/live copies)
-- 2) Align community course access with live: course staff may access community
--    surfaces (same entitlement set as learning_live_assert_access)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Shared course → space helper
-- ---------------------------------------------------------------------------

create or replace function public.learning_course_space_id(p_course_id uuid)
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

revoke all on function public.learning_course_space_id(uuid)
  from public, anon, authenticated;

-- Keep domain wrappers as thin aliases (callers unchanged).
create or replace function public.learning_community_course_space_id(p_course_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select public.learning_course_space_id(p_course_id);
$$;

create or replace function public.learning_live_course_space_id(p_course_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select public.learning_course_space_id(p_course_id);
$$;

-- ---------------------------------------------------------------------------
-- 2) Align community access with live access (include course staff)
-- ---------------------------------------------------------------------------

create or replace function public.learning_community_assert_access(
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

revoke all on function public.learning_community_assert_access(uuid, uuid)
  from public, anon, authenticated;
