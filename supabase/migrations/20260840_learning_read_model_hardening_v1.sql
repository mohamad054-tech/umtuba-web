-- UMTUBA Learning OS — Read Model Hardening V1
-- Additive. Aligns learner-facing SELECT on the course tree + settings with
-- has_learning_course_access / has_learning_program_access.
-- Depends on: 20260828..20260839 Learning foundations (esp. enrollments +
-- progress expansion of has_learning_course_access).
--
-- Locked decisions (approved readiness audit):
--  1. Keep space-member catalog browse of published programs (NOT entitlement-only).
--  2. Course tree learner SELECT (courses/sections/lessons/activities) uses
--     has_learning_course_access — NOT plain is_learning_space_member.
--  3. Learner reads require a fully published parent chain (space active +
--     program/course/section/lesson/activity published as applicable).
--  4. Settings SELECT: staff OR entitled only (no plain space-member path).
--  5. Additive migration only — do NOT edit 20260828–20260839.
--
-- Explicit exclusions: Attempts, Scoring, Questions, Progress, UI, routes,
-- TypeScript authorization, remote Supabase apply, program catalog entitlement.

-- ---------------------------------------------------------------------------
-- 1) learning_courses — replace space-member learner SELECT
-- ---------------------------------------------------------------------------
-- Public discovery policy ("Public read published public courses") UNCHANGED.
-- "Course managers read courses" / "Platform admins read all courses" UNCHANGED.

drop policy if exists "Space members read accessible courses"
  on public.learning_courses;

drop policy if exists "Entitled learners read published courses"
  on public.learning_courses;
create policy "Entitled learners read published courses"
  on public.learning_courses for select
  to authenticated
  using (
    status = 'published'
    and exists (
      select 1
      from public.learning_programs p
      join public.learning_spaces s
        on s.id = p.space_id
      where p.id = learning_courses.program_id
        and p.status = 'published'
        and s.status = 'active'
        and public.has_learning_course_access(learning_courses.id)
    )
  );

-- Course staff / space-program managers: drafts in scope. Deliberately does NOT
-- call is_learning_space_member as a learner substitute — staff helpers already
-- revalidate active membership where required.
drop policy if exists "Course staff read scoped courses"
  on public.learning_courses;
create policy "Course staff read scoped courses"
  on public.learning_courses for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_programs p
      where p.id = learning_courses.program_id
        and (
          public.can_manage_learning_space(p.space_id)
          or public.can_manage_learning_program(p.id)
          or public.can_manage_learning_course(learning_courses.id)
          or public.is_learning_course_staff(learning_courses.id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 2) learning_course_settings — entitled or staff (no plain space member)
-- ---------------------------------------------------------------------------

drop policy if exists "Members read course settings"
  on public.learning_course_settings;

drop policy if exists "Entitled learners read published course settings"
  on public.learning_course_settings;
create policy "Entitled learners read published course settings"
  on public.learning_course_settings for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_courses c
      join public.learning_programs p
        on p.id = c.program_id
      join public.learning_spaces s
        on s.id = p.space_id
      where c.id = learning_course_settings.course_id
        and c.status = 'published'
        and p.status = 'published'
        and s.status = 'active'
        and public.has_learning_course_access(c.id)
    )
  );

drop policy if exists "Staff read course settings"
  on public.learning_course_settings;
create policy "Staff read course settings"
  on public.learning_course_settings for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_courses c
      join public.learning_programs p
        on p.id = c.program_id
      where c.id = learning_course_settings.course_id
        and (
          public.can_manage_learning_space(p.space_id)
          or public.can_manage_learning_program(p.id)
          or public.can_manage_learning_course(c.id)
          or public.is_learning_course_staff(c.id)
          or public.is_platform_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 3) learning_sections
-- ---------------------------------------------------------------------------
-- Public discovery policy UNCHANGED.
-- "Section managers read sections" / "Platform admins read all sections" UNCHANGED.

drop policy if exists "Space members read accessible sections"
  on public.learning_sections;

drop policy if exists "Entitled learners read published sections"
  on public.learning_sections;
create policy "Entitled learners read published sections"
  on public.learning_sections for select
  to authenticated
  using (
    status = 'published'
    and exists (
      select 1
      from public.learning_courses c
      join public.learning_programs p
        on p.id = c.program_id
      join public.learning_spaces s
        on s.id = p.space_id
      where c.id = learning_sections.course_id
        and c.status = 'published'
        and p.status = 'published'
        and s.status = 'active'
        and public.has_learning_course_access(c.id)
    )
  );

drop policy if exists "Course staff read scoped sections"
  on public.learning_sections;
create policy "Course staff read scoped sections"
  on public.learning_sections for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_courses c
      join public.learning_programs p
        on p.id = c.program_id
      where c.id = learning_sections.course_id
        and (
          public.can_manage_learning_space(p.space_id)
          or public.can_manage_learning_program(p.id)
          or public.can_manage_learning_course(c.id)
          or public.is_learning_course_staff(c.id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 4) learning_section_settings
-- ---------------------------------------------------------------------------

drop policy if exists "Members read section settings"
  on public.learning_section_settings;

drop policy if exists "Entitled learners read published section settings"
  on public.learning_section_settings;
create policy "Entitled learners read published section settings"
  on public.learning_section_settings for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_sections sec
      join public.learning_courses c
        on c.id = sec.course_id
      join public.learning_programs p
        on p.id = c.program_id
      join public.learning_spaces s
        on s.id = p.space_id
      where sec.id = learning_section_settings.section_id
        and sec.status = 'published'
        and c.status = 'published'
        and p.status = 'published'
        and s.status = 'active'
        and public.has_learning_course_access(c.id)
    )
  );

drop policy if exists "Staff read section settings"
  on public.learning_section_settings;
create policy "Staff read section settings"
  on public.learning_section_settings for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_sections sec
      join public.learning_courses c
        on c.id = sec.course_id
      join public.learning_programs p
        on p.id = c.program_id
      where sec.id = learning_section_settings.section_id
        and (
          public.can_manage_learning_space(p.space_id)
          or public.can_manage_learning_program(p.id)
          or public.can_manage_learning_course(c.id)
          or public.is_learning_course_staff(c.id)
          or public.can_manage_learning_section(sec.id)
          or public.is_platform_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 5) learning_lessons
-- ---------------------------------------------------------------------------
-- Public discovery policy UNCHANGED.
-- "Lesson managers read lessons" / "Platform admins read all lessons" UNCHANGED.

drop policy if exists "Space members read accessible lessons"
  on public.learning_lessons;

drop policy if exists "Entitled learners read published lessons"
  on public.learning_lessons;
create policy "Entitled learners read published lessons"
  on public.learning_lessons for select
  to authenticated
  using (
    status = 'published'
    and exists (
      select 1
      from public.learning_sections sec
      join public.learning_courses c
        on c.id = sec.course_id
      join public.learning_programs p
        on p.id = c.program_id
      join public.learning_spaces s
        on s.id = p.space_id
      where sec.id = learning_lessons.section_id
        and sec.status = 'published'
        and c.status = 'published'
        and p.status = 'published'
        and s.status = 'active'
        and public.has_learning_course_access(c.id)
    )
  );

drop policy if exists "Course staff read scoped lessons"
  on public.learning_lessons;
create policy "Course staff read scoped lessons"
  on public.learning_lessons for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_sections sec
      join public.learning_courses c
        on c.id = sec.course_id
      join public.learning_programs p
        on p.id = c.program_id
      where sec.id = learning_lessons.section_id
        and (
          public.can_manage_learning_space(p.space_id)
          or public.can_manage_learning_program(p.id)
          or public.can_manage_learning_course(c.id)
          or public.is_learning_course_staff(c.id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 6) learning_lesson_settings
-- ---------------------------------------------------------------------------

drop policy if exists "Members read lesson settings"
  on public.learning_lesson_settings;

drop policy if exists "Entitled learners read published lesson settings"
  on public.learning_lesson_settings;
create policy "Entitled learners read published lesson settings"
  on public.learning_lesson_settings for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_lessons les
      join public.learning_sections sec
        on sec.id = les.section_id
      join public.learning_courses c
        on c.id = sec.course_id
      join public.learning_programs p
        on p.id = c.program_id
      join public.learning_spaces s
        on s.id = p.space_id
      where les.id = learning_lesson_settings.lesson_id
        and les.status = 'published'
        and sec.status = 'published'
        and c.status = 'published'
        and p.status = 'published'
        and s.status = 'active'
        and public.has_learning_course_access(c.id)
    )
  );

drop policy if exists "Staff read lesson settings"
  on public.learning_lesson_settings;
create policy "Staff read lesson settings"
  on public.learning_lesson_settings for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_lessons les
      join public.learning_sections sec
        on sec.id = les.section_id
      join public.learning_courses c
        on c.id = sec.course_id
      join public.learning_programs p
        on p.id = c.program_id
      where les.id = learning_lesson_settings.lesson_id
        and (
          public.can_manage_learning_space(p.space_id)
          or public.can_manage_learning_program(p.id)
          or public.can_manage_learning_course(c.id)
          or public.is_learning_course_staff(c.id)
          or public.can_manage_learning_lesson(les.id)
          or public.is_platform_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 7) learning_activities — still NO anon SELECT (privacy-safe)
-- ---------------------------------------------------------------------------
-- "Activity managers read activities" / "Platform admins read all activities"
-- UNCHANGED. There is still NO public/anon SELECT policy.

drop policy if exists "Space members read accessible activities"
  on public.learning_activities;

drop policy if exists "Entitled learners read published activities"
  on public.learning_activities;
create policy "Entitled learners read published activities"
  on public.learning_activities for select
  to authenticated
  using (
    status = 'published'
    and exists (
      select 1
      from public.learning_lessons les
      join public.learning_sections sec
        on sec.id = les.section_id
      join public.learning_courses c
        on c.id = sec.course_id
      join public.learning_programs p
        on p.id = c.program_id
      join public.learning_spaces s
        on s.id = p.space_id
      where les.id = learning_activities.lesson_id
        and les.status = 'published'
        and sec.status = 'published'
        and c.status = 'published'
        and p.status = 'published'
        and s.status = 'active'
        and public.has_learning_course_access(c.id)
    )
  );

drop policy if exists "Course staff read scoped activities"
  on public.learning_activities;
create policy "Course staff read scoped activities"
  on public.learning_activities for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_lessons les
      join public.learning_sections sec
        on sec.id = les.section_id
      join public.learning_courses c
        on c.id = sec.course_id
      join public.learning_programs p
        on p.id = c.program_id
      where les.id = learning_activities.lesson_id
        and (
          public.can_manage_learning_space(p.space_id)
          or public.can_manage_learning_program(p.id)
          or public.can_manage_learning_course(c.id)
          or public.is_learning_course_staff(c.id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 8) learning_activity_settings
-- ---------------------------------------------------------------------------

drop policy if exists "Members read activity settings"
  on public.learning_activity_settings;

drop policy if exists "Entitled learners read published activity settings"
  on public.learning_activity_settings;
create policy "Entitled learners read published activity settings"
  on public.learning_activity_settings for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_activities act
      join public.learning_lessons les
        on les.id = act.lesson_id
      join public.learning_sections sec
        on sec.id = les.section_id
      join public.learning_courses c
        on c.id = sec.course_id
      join public.learning_programs p
        on p.id = c.program_id
      join public.learning_spaces s
        on s.id = p.space_id
      where act.id = learning_activity_settings.activity_id
        and act.status = 'published'
        and les.status = 'published'
        and sec.status = 'published'
        and c.status = 'published'
        and p.status = 'published'
        and s.status = 'active'
        and public.has_learning_course_access(c.id)
    )
  );

drop policy if exists "Staff read activity settings"
  on public.learning_activity_settings;
create policy "Staff read activity settings"
  on public.learning_activity_settings for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_activities act
      join public.learning_lessons les
        on les.id = act.lesson_id
      join public.learning_sections sec
        on sec.id = les.section_id
      join public.learning_courses c
        on c.id = sec.course_id
      join public.learning_programs p
        on p.id = c.program_id
      where act.id = learning_activity_settings.activity_id
        and (
          public.can_manage_learning_space(p.space_id)
          or public.can_manage_learning_program(p.id)
          or public.can_manage_learning_course(c.id)
          or public.is_learning_course_staff(c.id)
          or public.can_manage_learning_activity(act.id)
          or public.is_platform_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 9) learning_program_settings — entitled (program access) or staff
-- ---------------------------------------------------------------------------
-- Program CATALOG policy "Space members read accessible programs" is INTENTIONALLY
-- left unchanged (browse published programs without entitlement).

drop policy if exists "Members read program settings"
  on public.learning_program_settings;

drop policy if exists "Entitled learners read published program settings"
  on public.learning_program_settings;
create policy "Entitled learners read published program settings"
  on public.learning_program_settings for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_programs p
      join public.learning_spaces s
        on s.id = p.space_id
      where p.id = learning_program_settings.program_id
        and p.status = 'published'
        and s.status = 'active'
        and public.has_learning_program_access(p.id)
    )
  );

drop policy if exists "Staff read program settings"
  on public.learning_program_settings;
create policy "Staff read program settings"
  on public.learning_program_settings for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_programs p
      where p.id = learning_program_settings.program_id
        and (
          public.can_manage_learning_space(p.space_id)
          or public.can_manage_learning_program(p.id)
          or public.is_learning_program_staff(p.id)
          or public.is_platform_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- End Read Model Hardening V1
-- No table/schema/RPC changes. No prior migration edits.
-- ---------------------------------------------------------------------------
