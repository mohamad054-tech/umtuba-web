-- Public catalog free-course self-enroll contract.
-- Published + public + not marketplace_ready courses are authenticated
-- self-enrollable. Settings defaults (allow_self_enroll=false,
-- require_program_enrollment=true) stay the gate for private / cohort /
-- paid courses. Does not weaken RLS or grant anonymous enrollment.

create or replace function public.can_enroll_in_learning_course(
  p_course_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_course_id is not null
    and p_user_id is not null
    and exists (
      select 1
      from public.learning_courses c
      join public.learning_programs p
        on p.id = c.program_id
      join public.learning_spaces s
        on s.id = p.space_id
      join public.learning_course_settings cs
        on cs.course_id = c.id
      where c.id = p_course_id
        and c.status = 'published'
        and p.status = 'published'
        and s.status = 'active'
        and (
          (
            cs.allow_self_enroll is true
            and (
              cs.require_program_enrollment is not true
              or public.has_learning_program_access(c.program_id, p_user_id)
            )
          )
          or (
            c.visibility = 'public'
            and p.visibility = 'public'
            and s.visibility = 'public'
            and coalesce(c.marketplace_ready, false) is not true
          )
        )
    );
$$;

revoke all on function public.can_enroll_in_learning_course(uuid, uuid)
  from public, anon;
grant execute on function public.can_enroll_in_learning_course(uuid, uuid)
  to authenticated, service_role;

comment on function public.can_enroll_in_learning_course(uuid, uuid) is
  'Self-enroll eligibility: settings flags OR published public free catalog contract.';

update public.learning_course_settings cs
set
  allow_self_enroll = true,
  require_program_enrollment = false
from public.learning_courses c
join public.learning_programs p
  on p.id = c.program_id
join public.learning_spaces s
  on s.id = p.space_id
where cs.course_id = c.id
  and c.status = 'published'
  and c.visibility = 'public'
  and coalesce(c.marketplace_ready, false) is not true
  and p.status = 'published'
  and p.visibility = 'public'
  and s.status = 'active'
  and s.visibility = 'public';
