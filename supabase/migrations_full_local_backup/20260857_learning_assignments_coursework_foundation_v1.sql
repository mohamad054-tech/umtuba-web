-- =============================================================================
-- UM Learning OS — Assignments & Coursework Foundation V1
-- Migration: 20260857_learning_assignments_coursework_foundation_v1.sql
--
-- Parallel coursework vertical for activity type = assignment.
-- Reuses activities/settings, auth, progress lesson-complete, URL safety.
-- Separate from question-assessment grading.
--
-- Does NOT: AI, plagiarism, PDF, OCR, parsing, realtime, messaging, calendar.
-- =============================================================================

-- Expand lesson completion_source for assignment reviews.
alter table public.learning_lesson_progress
  drop constraint if exists learning_lesson_progress_completion_source_check;

alter table public.learning_lesson_progress
  add constraint learning_lesson_progress_completion_source_check check (
    completion_source is null
    or completion_source in ('manual', 'scored_attempt', 'assignment_review')
  );

-- ---------------------------------------------------------------------------
-- 1) Spec + resources
-- ---------------------------------------------------------------------------

create table if not exists public.learning_assignment_specs (
  activity_id uuid primary key
    references public.learning_activities (id) on delete cascade,
  instructions text not null default ''
    constraint learning_assignment_specs_instructions_len check (
      char_length(instructions) <= 20000
    ),
  due_at timestamptz,
  max_submissions integer
    constraint learning_assignment_specs_max_submissions_pos check (
      max_submissions is null or max_submissions >= 1
    ),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.learning_assignment_specs is
  'Assignments V1 — authoring sidecar for type=assignment activities. Instructions, due date, max submissions. Score/late flags live on learning_activity_settings.';

create trigger learning_assignment_specs_set_updated_at
  before update on public.learning_assignment_specs
  for each row execute function public.set_row_updated_at();

alter table public.learning_assignment_specs enable row level security;
alter table public.learning_assignment_specs force row level security;

revoke all on table public.learning_assignment_specs
  from public, anon, authenticated;
grant select on table public.learning_assignment_specs to authenticated;
revoke insert, update, delete on table public.learning_assignment_specs
  from anon, authenticated;
grant all on table public.learning_assignment_specs to service_role;

create table if not exists public.learning_assignment_resources (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null
    references public.learning_activities (id) on delete cascade,
  label text not null
    constraint learning_assignment_resources_label_len check (
      char_length(btrim(label)) between 1 and 160
    ),
  url text not null,
  position integer not null default 0
    constraint learning_assignment_resources_position_nonneg check (position >= 0),
  created_at timestamptz not null default now(),
  constraint learning_assignment_resources_activity_position_unique
    unique (activity_id, position)
);

comment on table public.learning_assignment_resources is
  'Assignments V1 — reference resource links for an assignment (not learner submissions).';

create index if not exists learning_assignment_resources_activity_idx
  on public.learning_assignment_resources (activity_id, position);

alter table public.learning_assignment_resources enable row level security;
alter table public.learning_assignment_resources force row level security;

revoke all on table public.learning_assignment_resources
  from public, anon, authenticated;
grant select on table public.learning_assignment_resources to authenticated;
revoke insert, update, delete on table public.learning_assignment_resources
  from anon, authenticated;
grant all on table public.learning_assignment_resources to service_role;

-- ---------------------------------------------------------------------------
-- 2) Submissions + artifacts + reviews
-- ---------------------------------------------------------------------------

create table if not exists public.learning_assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null
    references public.learning_spaces (id) on delete restrict,
  course_id uuid not null
    references public.learning_courses (id) on delete restrict,
  lesson_id uuid not null
    references public.learning_lessons (id) on delete restrict,
  activity_id uuid not null
    references public.learning_activities (id) on delete restrict,
  user_id uuid not null
    references public.profiles (id) on delete restrict,
  attempt_number integer not null
    constraint learning_assignment_submissions_attempt_pos check (attempt_number >= 1),
  status text not null default 'draft'
    constraint learning_assignment_submissions_status_check check (
      status in ('draft', 'submitted', 'reviewed')
    ),
  is_late boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_assignment_submissions_user_activity_attempt_unique
    unique (user_id, activity_id, attempt_number)
);

comment on table public.learning_assignment_submissions is
  'Assignments V1 — learner coursework submissions (separate from assessment attempts).';

create index if not exists learning_assignment_submissions_activity_status_idx
  on public.learning_assignment_submissions (activity_id, status, submitted_at desc);

create index if not exists learning_assignment_submissions_course_status_idx
  on public.learning_assignment_submissions (course_id, status, submitted_at desc);

create index if not exists learning_assignment_submissions_user_idx
  on public.learning_assignment_submissions (user_id, activity_id);

create trigger learning_assignment_submissions_set_updated_at
  before update on public.learning_assignment_submissions
  for each row execute function public.set_row_updated_at();

alter table public.learning_assignment_submissions enable row level security;
alter table public.learning_assignment_submissions force row level security;

revoke all on table public.learning_assignment_submissions
  from public, anon, authenticated;
grant select on table public.learning_assignment_submissions to authenticated;
revoke insert, update, delete on table public.learning_assignment_submissions
  from anon, authenticated;
grant all on table public.learning_assignment_submissions to service_role;

create table if not exists public.learning_assignment_artifacts (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null
    references public.learning_assignment_submissions (id) on delete cascade,
  kind text not null
    constraint learning_assignment_artifacts_kind_check check (
      kind in ('text', 'link', 'file')
    ),
  position integer not null default 0
    constraint learning_assignment_artifacts_position_nonneg check (position >= 0),
  text_body text
    constraint learning_assignment_artifacts_text_len check (
      text_body is null or char_length(text_body) <= 50000
    ),
  link_url text,
  storage_bucket text,
  storage_path text,
  file_name text
    constraint learning_assignment_artifacts_file_name_len check (
      file_name is null or char_length(btrim(file_name)) between 1 and 255
    ),
  mime_type text
    constraint learning_assignment_artifacts_mime_len check (
      mime_type is null or char_length(mime_type) between 3 and 128
    ),
  byte_size bigint
    constraint learning_assignment_artifacts_byte_size_nonneg check (
      byte_size is null or byte_size >= 0
    ),
  created_at timestamptz not null default now(),
  constraint learning_assignment_artifacts_payload_check check (
    (kind = 'text' and text_body is not null and link_url is null and storage_path is null)
    or (kind = 'link' and link_url is not null and text_body is null and storage_path is null)
    or (
      kind = 'file'
      and storage_bucket is not null
      and storage_path is not null
      and text_body is null
      and link_url is null
    )
  )
);

comment on table public.learning_assignment_artifacts is
  'Assignments V1 — text/link/file-reference artifacts on a submission. File blobs are storage references only; no processing.';

create index if not exists learning_assignment_artifacts_submission_idx
  on public.learning_assignment_artifacts (submission_id, position);

alter table public.learning_assignment_artifacts enable row level security;
alter table public.learning_assignment_artifacts force row level security;

revoke all on table public.learning_assignment_artifacts
  from public, anon, authenticated;
grant select on table public.learning_assignment_artifacts to authenticated;
revoke insert, update, delete on table public.learning_assignment_artifacts
  from anon, authenticated;
grant all on table public.learning_assignment_artifacts to service_role;

create table if not exists public.learning_assignment_reviews (
  submission_id uuid primary key
    references public.learning_assignment_submissions (id) on delete cascade,
  points_earned numeric not null
    constraint learning_assignment_reviews_points_earned_nonneg check (points_earned >= 0),
  points_possible numeric
    constraint learning_assignment_reviews_points_possible_nonneg check (
      points_possible is null or points_possible >= 0
    ),
  passed boolean,
  learner_feedback text
    constraint learning_assignment_reviews_feedback_len check (
      learner_feedback is null or char_length(learner_feedback) <= 2000
    ),
  reviewer_user_id uuid not null
    references public.profiles (id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.learning_assignment_reviews is
  'Assignments V1 — whole-submission manual review (points + optional feedback). Separate from assessment answer review.';

alter table public.learning_assignment_reviews enable row level security;
alter table public.learning_assignment_reviews force row level security;

revoke all on table public.learning_assignment_reviews
  from public, anon, authenticated;
grant select on table public.learning_assignment_reviews to authenticated;
revoke insert, update, delete on table public.learning_assignment_reviews
  from anon, authenticated;
grant all on table public.learning_assignment_reviews to service_role;

create table if not exists public.learning_assignment_progress_applications (
  submission_id uuid primary key
    references public.learning_assignment_submissions (id) on delete restrict,
  user_id uuid not null
    references public.profiles (id) on delete restrict,
  activity_id uuid not null
    references public.learning_activities (id) on delete restrict,
  lesson_id uuid not null
    references public.learning_lessons (id) on delete restrict,
  course_id uuid not null
    references public.learning_courses (id) on delete restrict,
  space_id uuid not null
    references public.learning_spaces (id) on delete restrict,
  applied_at timestamptz not null default now(),
  applied_by uuid
    references public.profiles (id) on delete set null,
  constraint learning_assignment_progress_applications_user_activity_unique
    unique (user_id, activity_id)
);

comment on table public.learning_assignment_progress_applications is
  'Assignments V1 — idempotent progress apply ledger after passed assignment review (score-mode).';

alter table public.learning_assignment_progress_applications enable row level security;
alter table public.learning_assignment_progress_applications force row level security;

revoke all on table public.learning_assignment_progress_applications
  from public, anon, authenticated;
grant select on table public.learning_assignment_progress_applications to authenticated;
revoke insert, update, delete on table public.learning_assignment_progress_applications
  from anon, authenticated;
grant all on table public.learning_assignment_progress_applications to service_role;

-- RLS policies (read)
drop policy if exists "Learners read own assignment specs via access"
  on public.learning_assignment_specs;
create policy "Learners read own assignment specs via access"
  on public.learning_assignment_specs for select to authenticated
  using (
    exists (
      select 1
      from public.learning_activities a
      join public.learning_lessons les on les.id = a.lesson_id
      join public.learning_sections sec on sec.id = les.section_id
      where a.id = activity_id
        and (
          public.has_learning_course_access(sec.course_id)
          or public.can_manage_learning_course(sec.course_id)
          or public.is_platform_admin()
        )
    )
  );

drop policy if exists "Learners read assignment resources via access"
  on public.learning_assignment_resources;
create policy "Learners read assignment resources via access"
  on public.learning_assignment_resources for select to authenticated
  using (
    exists (
      select 1
      from public.learning_activities a
      join public.learning_lessons les on les.id = a.lesson_id
      join public.learning_sections sec on sec.id = les.section_id
      where a.id = activity_id
        and (
          public.has_learning_course_access(sec.course_id)
          or public.can_manage_learning_course(sec.course_id)
          or public.is_platform_admin()
        )
    )
  );

drop policy if exists "Learners read own assignment submissions"
  on public.learning_assignment_submissions;
create policy "Learners read own assignment submissions"
  on public.learning_assignment_submissions for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Managers read scoped assignment submissions"
  on public.learning_assignment_submissions;
create policy "Managers read scoped assignment submissions"
  on public.learning_assignment_submissions for select to authenticated
  using (
    public.can_manage_learning_course(course_id)
    or public.is_platform_admin()
  );

drop policy if exists "Learners read own assignment artifacts"
  on public.learning_assignment_artifacts;
create policy "Learners read own assignment artifacts"
  on public.learning_assignment_artifacts for select to authenticated
  using (
    exists (
      select 1 from public.learning_assignment_submissions s
      where s.id = submission_id and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "Managers read scoped assignment artifacts"
  on public.learning_assignment_artifacts;
create policy "Managers read scoped assignment artifacts"
  on public.learning_assignment_artifacts for select to authenticated
  using (
    exists (
      select 1 from public.learning_assignment_submissions s
      where s.id = submission_id
        and (
          public.can_manage_learning_course(s.course_id)
          or public.is_platform_admin()
        )
    )
  );

drop policy if exists "Learners read own assignment reviews"
  on public.learning_assignment_reviews;
create policy "Learners read own assignment reviews"
  on public.learning_assignment_reviews for select to authenticated
  using (
    exists (
      select 1 from public.learning_assignment_submissions s
      where s.id = submission_id and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "Managers read scoped assignment reviews"
  on public.learning_assignment_reviews;
create policy "Managers read scoped assignment reviews"
  on public.learning_assignment_reviews for select to authenticated
  using (
    exists (
      select 1 from public.learning_assignment_submissions s
      where s.id = submission_id
        and (
          public.can_manage_learning_course(s.course_id)
          or public.is_platform_admin()
        )
    )
  );

drop policy if exists "Learners read own assignment progress apps"
  on public.learning_assignment_progress_applications;
create policy "Learners read own assignment progress apps"
  on public.learning_assignment_progress_applications for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Managers read scoped assignment progress apps"
  on public.learning_assignment_progress_applications;
create policy "Managers read scoped assignment progress apps"
  on public.learning_assignment_progress_applications for select to authenticated
  using (
    public.can_manage_learning_course(course_id)
    or public.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- 3) Storage bucket (file references only)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'learning-assignment-files',
  'learning-assignment-files',
  false,
  26214400,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Learners upload own assignment files" on storage.objects;
drop policy if exists "Learners read own assignment files" on storage.objects;
drop policy if exists "Managers read assignment files" on storage.objects;

create policy "Learners upload own assignment files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'learning-assignment-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Learners read own assignment files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'learning-assignment-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Managers read assignment files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'learning-assignment-files'
    and exists (
      select 1
      from public.learning_assignment_artifacts art
      join public.learning_assignment_submissions s on s.id = art.submission_id
      where art.storage_bucket = 'learning-assignment-files'
        and art.storage_path = name
        and (
          public.can_manage_learning_course(s.course_id)
          or public.is_platform_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 4) Internal helpers
-- ---------------------------------------------------------------------------

create or replace function public.learning_assignment_require_activity(
  p_activity_id uuid
)
returns public.learning_activities
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_activity public.learning_activities%rowtype;
begin
  if p_activity_id is null then
    raise exception 'activity_id is required';
  end if;

  select * into v_activity
  from public.learning_activities
  where id = p_activity_id;

  if not found then
    raise exception 'Learning activity not found';
  end if;

  if v_activity.type is distinct from 'assignment' then
    raise exception 'Activity is not an assignment';
  end if;

  return v_activity;
end;
$$;

revoke all on function public.learning_assignment_require_activity(uuid)
  from public, anon, authenticated;

create or replace function public.learning_assignment_load_context(
  p_activity_id uuid
)
returns table (
  o_activity public.learning_activities,
  o_lesson public.learning_lessons,
  o_section public.learning_sections,
  o_course public.learning_courses,
  o_space_id uuid,
  o_settings public.learning_activity_settings
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_activity public.learning_activities%rowtype;
  v_lesson public.learning_lessons%rowtype;
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_space_id uuid;
  v_settings public.learning_activity_settings%rowtype;
begin
  v_activity := public.learning_assignment_require_activity(p_activity_id);

  select * into v_lesson from public.learning_lessons where id = v_activity.lesson_id;
  if not found then raise exception 'Learning lesson not found'; end if;

  select * into v_section from public.learning_sections where id = v_lesson.section_id;
  if not found then raise exception 'Learning section not found'; end if;

  select * into v_course from public.learning_courses where id = v_section.course_id;
  if not found then raise exception 'Learning course not found'; end if;

  select p.space_id into v_space_id
  from public.learning_programs p
  where p.id = v_course.program_id;
  if v_space_id is null then raise exception 'Learning course relationship is malformed'; end if;

  select * into v_settings
  from public.learning_activity_settings
  where activity_id = p_activity_id;

  return query
  select v_activity, v_lesson, v_section, v_course, v_space_id, v_settings;
end;
$$;

revoke all on function public.learning_assignment_load_context(uuid)
  from public, anon, authenticated;

create or replace function public.learning_assignment_assert_manage(
  p_activity_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ctx record;
begin
  if p_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_ctx from public.learning_assignment_load_context(p_activity_id);

  if not (
    public.can_manage_learning_course(v_ctx.o_course.id, p_user_id)
    or public.is_platform_admin(p_user_id)
  ) then
    raise exception 'Not allowed to manage this assignment';
  end if;
end;
$$;

revoke all on function public.learning_assignment_assert_manage(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.learning_progress_complete_lesson_from_assignment(
  p_lesson_id uuid,
  p_user_id uuid,
  p_actor_id uuid,
  p_activity_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_row public.learning_lesson_progress%rowtype;
  v_from text;
  v_enrollment_id uuid;
  v_now timestamptz := now();
  v_course public.learning_course_progress%rowtype;
begin
  if p_lesson_id is null or p_user_id is null or p_actor_id is null then
    raise exception 'lesson_id, user_id, and actor_id are required';
  end if;

  select * into v_ctx
  from public.learning_progress_load_lesson_context(p_lesson_id);

  v_enrollment_id := public.learning_progress_resolve_enrollment_id(
    v_ctx.o_course.id, p_user_id
  );

  select * into v_row
  from public.learning_lesson_progress
  where user_id = p_user_id and lesson_id = p_lesson_id
  for update;

  if not found then
    insert into public.learning_lesson_progress (
      space_id, course_id, lesson_id, user_id, enrollment_id,
      status, completion_source, started_at, last_activity_at,
      completed_at, first_completed_at
    ) values (
      v_ctx.o_space_id, v_ctx.o_course.id, p_lesson_id, p_user_id, v_enrollment_id,
      'completed', 'assignment_review', v_now, v_now, v_now, v_now
    )
    returning * into v_row;

    perform public.learning_progress_event_write(
      v_ctx.o_space_id, v_ctx.o_course.id, p_lesson_id, p_user_id, p_actor_id,
      'lesson_completed', 'not_started', 'completed',
      jsonb_build_object(
        'completion_source', 'assignment_review',
        'activity_id', p_activity_id
      )
    );
  elsif v_row.status = 'completed' then
    update public.learning_lesson_progress
    set
      last_activity_at = v_now,
      enrollment_id = coalesce(v_enrollment_id, enrollment_id),
      completion_source = coalesce(completion_source, 'assignment_review')
    where id = v_row.id;
  else
    v_from := v_row.status;
    update public.learning_lesson_progress
    set
      status = 'completed',
      completion_source = 'assignment_review',
      started_at = coalesce(started_at, v_now),
      last_activity_at = v_now,
      completed_at = v_now,
      first_completed_at = coalesce(first_completed_at, v_now),
      enrollment_id = coalesce(v_enrollment_id, enrollment_id)
    where id = v_row.id
    returning * into v_row;

    perform public.learning_progress_event_write(
      v_ctx.o_space_id, v_ctx.o_course.id, p_lesson_id, p_user_id, p_actor_id,
      'lesson_completed', v_from, 'completed',
      jsonb_build_object(
        'completion_source', 'assignment_review',
        'activity_id', p_activity_id
      )
    );
  end if;

  v_course := public.learning_progress_recompute_course(
    p_user_id, v_ctx.o_course.id, p_lesson_id, p_actor_id
  );

  update public.learning_course_progress
  set last_activity_id = p_activity_id, updated_at = v_now
  where user_id = p_user_id and course_id = v_ctx.o_course.id;

  perform public.learning_audit_write(
    p_actor_id,
    v_ctx.o_space_id,
    'progress.lesson_complete_assignment_review',
    'learning_lesson_progress',
    v_row.id::text,
    jsonb_build_object(
      'course_id', v_ctx.o_course.id,
      'lesson_id', p_lesson_id,
      'activity_id', p_activity_id,
      'user_id', p_user_id,
      'percent_complete', v_course.percent_complete
    )
  );
end;
$$;

revoke all on function public.learning_progress_complete_lesson_from_assignment(
  uuid, uuid, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.learning_progress_complete_lesson_from_assignment(
  uuid, uuid, uuid, uuid
) to service_role;

create or replace function public.learning_assignment_try_apply_progress(
  p_submission_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.learning_assignment_submissions%rowtype;
  v_review public.learning_assignment_reviews%rowtype;
  v_settings public.learning_activity_settings%rowtype;
  v_app public.learning_assignment_progress_applications%rowtype;
  v_now timestamptz := now();
begin
  select * into v_sub from public.learning_assignment_submissions
  where id = p_submission_id for update;
  if not found then
    return jsonb_build_object('status', 'skipped', 'reason', 'submission_not_found');
  end if;

  select * into v_review from public.learning_assignment_reviews
  where submission_id = p_submission_id;
  if not found then
    return jsonb_build_object('status', 'skipped', 'reason', 'not_reviewed');
  end if;

  select * into v_settings from public.learning_activity_settings
  where activity_id = v_sub.activity_id;

  if coalesce(v_settings.completion_mode, 'view') is distinct from 'score' then
    return jsonb_build_object('status', 'skipped', 'reason', 'completion_mode_not_score');
  end if;

  if v_review.passed is distinct from true then
    return jsonb_build_object('status', 'skipped', 'reason', 'not_passed');
  end if;

  if exists (
    select 1 from public.learning_assignment_progress_applications a
    where a.user_id = v_sub.user_id and a.activity_id = v_sub.activity_id
  ) then
    select * into v_app from public.learning_assignment_progress_applications
    where user_id = v_sub.user_id and activity_id = v_sub.activity_id;
    return jsonb_build_object(
      'status', 'idempotent',
      'completion_recorded', true,
      'applied_at', v_app.applied_at
    );
  end if;

  insert into public.learning_assignment_progress_applications (
    submission_id, user_id, activity_id, lesson_id, course_id, space_id,
    applied_at, applied_by
  ) values (
    v_sub.id, v_sub.user_id, v_sub.activity_id, v_sub.lesson_id,
    v_sub.course_id, v_sub.space_id, v_now, p_actor_id
  )
  returning * into v_app;

  perform public.learning_progress_complete_lesson_from_assignment(
    v_sub.lesson_id, v_sub.user_id, p_actor_id, v_sub.activity_id
  );

  return jsonb_build_object(
    'status', 'applied',
    'completion_recorded', true,
    'applied_at', v_app.applied_at
  );
exception
  when unique_violation then
    return jsonb_build_object('status', 'idempotent', 'completion_recorded', true);
end;
$$;

revoke all on function public.learning_assignment_try_apply_progress(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.learning_assignment_try_apply_progress(uuid, uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- 5) Authoring RPCs
-- ---------------------------------------------------------------------------

create or replace function public.upsert_learning_assignment_spec(
  p_activity_id uuid,
  p_instructions text default '',
  p_due_at timestamptz default null,
  p_max_submissions integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_assignment_specs%rowtype;
  v_instructions text := coalesce(p_instructions, '');
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  perform public.learning_assignment_assert_manage(p_activity_id, v_uid);

  if char_length(v_instructions) > 20000 then
    raise exception 'instructions exceeds maximum length';
  end if;

  if p_max_submissions is not null and p_max_submissions < 1 then
    raise exception 'max_submissions must be >= 1 or null';
  end if;

  insert into public.learning_assignment_specs (
    activity_id, instructions, due_at, max_submissions, created_by, updated_by
  ) values (
    p_activity_id, v_instructions, p_due_at, p_max_submissions, v_uid, v_uid
  )
  on conflict (activity_id) do update set
    instructions = excluded.instructions,
    due_at = excluded.due_at,
    max_submissions = excluded.max_submissions,
    updated_by = v_uid,
    updated_at = now()
  returning * into v_row;

  perform public.learning_audit_write(
    v_uid,
    (select o_space_id from public.learning_assignment_load_context(p_activity_id)),
    'assignment.spec_upsert',
    'learning_assignment_spec',
    p_activity_id::text,
    jsonb_build_object('due_at', v_row.due_at, 'max_submissions', v_row.max_submissions)
  );

  return jsonb_build_object(
    'activity_id', v_row.activity_id,
    'instructions', v_row.instructions,
    'due_at', v_row.due_at,
    'max_submissions', v_row.max_submissions
  );
end;
$$;

create or replace function public.set_learning_assignment_resources(
  p_activity_id uuid,
  p_resources jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_elem jsonb;
  v_idx integer := 0;
  v_label text;
  v_url text;
  v_items jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  perform public.learning_assignment_assert_manage(p_activity_id, v_uid);

  if p_resources is null or jsonb_typeof(p_resources) is distinct from 'array' then
    raise exception 'resources must be a JSON array';
  end if;

  if jsonb_array_length(p_resources) > 32 then
    raise exception 'Too many resources';
  end if;

  delete from public.learning_assignment_resources where activity_id = p_activity_id;

  for v_elem in select * from jsonb_array_elements(p_resources)
  loop
    v_label := nullif(btrim(coalesce(v_elem->>'label', '')), '');
    v_url := nullif(btrim(coalesce(v_elem->>'url', '')), '');
    if v_label is null then raise exception 'resource label is required'; end if;
    perform public.learning_lesson_content_block_assert_safe_url('resource url', v_url);

    insert into public.learning_assignment_resources (
      activity_id, label, url, position
    ) values (
      p_activity_id, v_label, v_url, v_idx
    );
    v_idx := v_idx + 1;
  end loop;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'label', r.label,
      'url', r.url,
      'position', r.position
    ) order by r.position
  ), '[]'::jsonb)
  into v_items
  from public.learning_assignment_resources r
  where r.activity_id = p_activity_id;

  return jsonb_build_object(
    'activity_id', p_activity_id,
    'resources', v_items,
    'resource_count', jsonb_array_length(v_items)
  );
end;
$$;

create or replace function public.get_learning_assignment_for_manage(
  p_activity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_spec public.learning_assignment_specs%rowtype;
  v_resources jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  perform public.learning_assignment_assert_manage(p_activity_id, v_uid);
  select * into v_ctx from public.learning_assignment_load_context(p_activity_id);

  select * into v_spec from public.learning_assignment_specs where activity_id = p_activity_id;

  select coalesce(jsonb_agg(
    jsonb_build_object('id', r.id, 'label', r.label, 'url', r.url, 'position', r.position)
    order by r.position
  ), '[]'::jsonb)
  into v_resources
  from public.learning_assignment_resources r
  where r.activity_id = p_activity_id;

  return jsonb_build_object(
    'activity_id', p_activity_id,
    'activity_name', v_ctx.o_activity.name,
    'activity_status', v_ctx.o_activity.status,
    'course_id', v_ctx.o_course.id,
    'lesson_id', v_ctx.o_lesson.id,
    'max_score', v_ctx.o_settings.max_score,
    'passing_score', v_ctx.o_settings.passing_score,
    'allow_late_submission', coalesce(v_ctx.o_settings.allow_late_submission, false),
    'completion_mode', v_ctx.o_settings.completion_mode,
    'evaluation_mode', v_ctx.o_settings.evaluation_mode,
    'instructions', coalesce(v_spec.instructions, ''),
    'due_at', v_spec.due_at,
    'max_submissions', v_spec.max_submissions,
    'resources', v_resources
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) Learner RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_my_learning_assignment(
  p_activity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_spec public.learning_assignment_specs%rowtype;
  v_resources jsonb;
  v_submitted_count integer := 0;
  v_draft public.learning_assignment_submissions%rowtype;
  v_latest public.learning_assignment_submissions%rowtype;
  v_review public.learning_assignment_reviews%rowtype;
  v_remaining integer;
  v_status text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_assignment_load_context(p_activity_id);

  if not public.has_learning_course_access(v_ctx.o_course.id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  if v_ctx.o_activity.status is distinct from 'published' then
    raise exception 'Assignment is not published';
  end if;

  select * into v_spec from public.learning_assignment_specs where activity_id = p_activity_id;

  select coalesce(jsonb_agg(
    jsonb_build_object('id', r.id, 'label', r.label, 'url', r.url, 'position', r.position)
    order by r.position
  ), '[]'::jsonb)
  into v_resources
  from public.learning_assignment_resources r
  where r.activity_id = p_activity_id;

  select count(*)::integer into v_submitted_count
  from public.learning_assignment_submissions s
  where s.activity_id = p_activity_id
    and s.user_id = v_uid
    and s.status in ('submitted', 'reviewed');

  select * into v_draft
  from public.learning_assignment_submissions s
  where s.activity_id = p_activity_id
    and s.user_id = v_uid
    and s.status = 'draft'
  order by s.attempt_number desc
  limit 1;

  select * into v_latest
  from public.learning_assignment_submissions s
  where s.activity_id = p_activity_id
    and s.user_id = v_uid
    and s.status in ('submitted', 'reviewed')
  order by s.attempt_number desc
  limit 1;

  if found then
    select * into v_review from public.learning_assignment_reviews
    where submission_id = v_latest.id;
  end if;

  if v_spec.max_submissions is null then
    v_remaining := null;
  else
    v_remaining := greatest(v_spec.max_submissions - v_submitted_count, 0);
  end if;

  v_status := case
    when v_latest.status = 'reviewed' then 'reviewed'
    when v_latest.status = 'submitted' then 'submitted'
    when v_draft.id is not null then 'draft'
    else 'not_started'
  end;

  return jsonb_build_object(
    'activity_id', p_activity_id,
    'activity_name', v_ctx.o_activity.name,
    'course_id', v_ctx.o_course.id,
    'lesson_id', v_ctx.o_lesson.id,
    'instructions', coalesce(v_spec.instructions, ''),
    'due_at', v_spec.due_at,
    'max_submissions', v_spec.max_submissions,
    'allow_late_submission', coalesce(v_ctx.o_settings.allow_late_submission, false),
    'max_score', v_ctx.o_settings.max_score,
    'resources', v_resources,
    'status', v_status,
    'submitted_count', v_submitted_count,
    'remaining_submissions', v_remaining,
    'draft_submission_id', v_draft.id,
    'latest_submission_id', v_latest.id,
    'latest_submitted_at', v_latest.submitted_at,
    'latest_is_late', coalesce(v_latest.is_late, false),
    'result', case
      when v_review.submission_id is null then null
      else jsonb_build_object(
        'status', 'reviewed',
        'points_earned', v_review.points_earned,
        'points_possible', v_review.points_possible,
        'passed', v_review.passed,
        'learner_feedback', v_review.learner_feedback,
        'reviewed_at', v_review.reviewed_at
      )
    end
  );
end;
$$;

create or replace function public.start_my_learning_assignment_submission(
  p_activity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_spec public.learning_assignment_specs%rowtype;
  v_draft public.learning_assignment_submissions%rowtype;
  v_submitted_count integer := 0;
  v_next integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_assignment_load_context(p_activity_id);

  if not public.has_learning_course_access(v_ctx.o_course.id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;
  if v_ctx.o_activity.status is distinct from 'published' then
    raise exception 'Assignment is not published';
  end if;

  select * into v_spec from public.learning_assignment_specs where activity_id = p_activity_id;

  select * into v_draft
  from public.learning_assignment_submissions
  where activity_id = p_activity_id and user_id = v_uid and status = 'draft'
  order by attempt_number desc limit 1;

  if found then
    return jsonb_build_object(
      'submission_id', v_draft.id,
      'attempt_number', v_draft.attempt_number,
      'status', v_draft.status,
      'idempotent', true
    );
  end if;

  select count(*)::integer into v_submitted_count
  from public.learning_assignment_submissions
  where activity_id = p_activity_id
    and user_id = v_uid
    and status in ('submitted', 'reviewed');

  if v_spec.max_submissions is not null and v_submitted_count >= v_spec.max_submissions then
    raise exception 'Maximum submissions reached';
  end if;

  if v_spec.due_at is not null
     and now() > v_spec.due_at
     and coalesce(v_ctx.o_settings.allow_late_submission, false) is false
  then
    raise exception 'Assignment is past due';
  end if;

  v_next := v_submitted_count + 1;

  insert into public.learning_assignment_submissions (
    space_id, course_id, lesson_id, activity_id, user_id,
    attempt_number, status
  ) values (
    v_ctx.o_space_id, v_ctx.o_course.id, v_ctx.o_lesson.id, p_activity_id, v_uid,
    v_next, 'draft'
  )
  returning * into v_draft;

  return jsonb_build_object(
    'submission_id', v_draft.id,
    'attempt_number', v_draft.attempt_number,
    'status', v_draft.status,
    'idempotent', false
  );
end;
$$;

create or replace function public.save_my_learning_assignment_submission(
  p_submission_id uuid,
  p_artifacts jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.learning_assignment_submissions%rowtype;
  v_elem jsonb;
  v_idx integer := 0;
  v_kind text;
  v_text text;
  v_url text;
  v_bucket text;
  v_path text;
  v_file_name text;
  v_mime text;
  v_size bigint;
  v_items jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_submission_id is null then raise exception 'submission_id is required'; end if;

  select * into v_sub from public.learning_assignment_submissions
  where id = p_submission_id for update;
  if not found then raise exception 'Submission not found'; end if;
  if v_sub.user_id is distinct from v_uid then
    raise exception 'Not allowed to edit this submission';
  end if;
  if v_sub.status is distinct from 'draft' then
    raise exception 'Only draft submissions can be edited';
  end if;

  if p_artifacts is null or jsonb_typeof(p_artifacts) is distinct from 'array' then
    raise exception 'artifacts must be a JSON array';
  end if;
  if jsonb_array_length(p_artifacts) > 16 then
    raise exception 'Too many artifacts';
  end if;

  delete from public.learning_assignment_artifacts where submission_id = p_submission_id;

  for v_elem in select * from jsonb_array_elements(p_artifacts)
  loop
    v_kind := lower(nullif(btrim(coalesce(v_elem->>'kind', '')), ''));
    if v_kind is null or v_kind not in ('text', 'link', 'file') then
      raise exception 'Invalid artifact kind';
    end if;

    if v_kind = 'text' then
      v_text := coalesce(v_elem->>'text_body', '');
      if char_length(btrim(v_text)) = 0 then raise exception 'text_body is required'; end if;
      if char_length(v_text) > 50000 then raise exception 'text_body too long'; end if;
      insert into public.learning_assignment_artifacts (
        submission_id, kind, position, text_body
      ) values (p_submission_id, 'text', v_idx, v_text);
    elsif v_kind = 'link' then
      v_url := nullif(btrim(coalesce(v_elem->>'link_url', '')), '');
      perform public.learning_lesson_content_block_assert_safe_url('link_url', v_url);
      insert into public.learning_assignment_artifacts (
        submission_id, kind, position, link_url
      ) values (p_submission_id, 'link', v_idx, v_url);
    else
      v_bucket := coalesce(nullif(btrim(coalesce(v_elem->>'storage_bucket', '')), ''), 'learning-assignment-files');
      v_path := nullif(btrim(coalesce(v_elem->>'storage_path', '')), '');
      v_file_name := nullif(btrim(coalesce(v_elem->>'file_name', '')), '');
      v_mime := nullif(btrim(coalesce(v_elem->>'mime_type', '')), '');
      v_size := nullif(v_elem->>'byte_size', '')::bigint;
      if v_bucket is distinct from 'learning-assignment-files' then
        raise exception 'Invalid storage bucket';
      end if;
      if v_path is null or v_file_name is null then
        raise exception 'file path and file_name are required';
      end if;
      if split_part(v_path, '/', 1) is distinct from v_uid::text then
        raise exception 'File path is not owned by the learner';
      end if;
      insert into public.learning_assignment_artifacts (
        submission_id, kind, position,
        storage_bucket, storage_path, file_name, mime_type, byte_size
      ) values (
        p_submission_id, 'file', v_idx,
        v_bucket, v_path, v_file_name, v_mime, v_size
      );
    end if;
    v_idx := v_idx + 1;
  end loop;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_items
  from (
    select id, kind, position, text_body, link_url,
           storage_bucket, storage_path, file_name, mime_type, byte_size
    from public.learning_assignment_artifacts
    where submission_id = p_submission_id
    order by position
  ) t;

  return jsonb_build_object(
    'submission_id', p_submission_id,
    'status', 'draft',
    'artifacts', v_items,
    'artifact_count', jsonb_array_length(v_items)
  );
end;
$$;

create or replace function public.submit_my_learning_assignment_submission(
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.learning_assignment_submissions%rowtype;
  v_ctx record;
  v_spec public.learning_assignment_specs%rowtype;
  v_count integer := 0;
  v_late boolean := false;
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;

  select * into v_sub from public.learning_assignment_submissions
  where id = p_submission_id for update;
  if not found then raise exception 'Submission not found'; end if;
  if v_sub.user_id is distinct from v_uid then
    raise exception 'Not allowed to submit this submission';
  end if;
  if v_sub.status is distinct from 'draft' then
    raise exception 'Submission is not a draft';
  end if;

  select count(*)::integer into v_count
  from public.learning_assignment_artifacts
  where submission_id = p_submission_id;
  if v_count < 1 then
    raise exception 'Add at least one artifact before submitting';
  end if;

  select * into v_ctx from public.learning_assignment_load_context(v_sub.activity_id);
  select * into v_spec from public.learning_assignment_specs where activity_id = v_sub.activity_id;

  if v_spec.due_at is not null and v_now > v_spec.due_at then
    v_late := true;
    if coalesce(v_ctx.o_settings.allow_late_submission, false) is false then
      raise exception 'Assignment is past due';
    end if;
  end if;

  update public.learning_assignment_submissions
  set status = 'submitted',
      submitted_at = v_now,
      is_late = v_late,
      updated_at = v_now
  where id = p_submission_id
  returning * into v_sub;

  perform public.learning_audit_write(
    v_uid, v_sub.space_id, 'assignment.submission_submitted',
    'learning_assignment_submission', p_submission_id::text,
    jsonb_build_object('activity_id', v_sub.activity_id, 'is_late', v_late)
  );

  return jsonb_build_object(
    'submission_id', v_sub.id,
    'status', v_sub.status,
    'submitted_at', v_sub.submitted_at,
    'is_late', v_sub.is_late
  );
end;
$$;

create or replace function public.get_my_learning_assignment_result(
  p_activity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_latest public.learning_assignment_submissions%rowtype;
  v_review public.learning_assignment_reviews%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_assignment_load_context(p_activity_id);
  if not public.has_learning_course_access(v_ctx.o_course.id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  select * into v_latest
  from public.learning_assignment_submissions
  where activity_id = p_activity_id
    and user_id = v_uid
    and status = 'reviewed'
  order by attempt_number desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'activity_id', p_activity_id,
      'status', 'not_reviewed',
      'result', null
    );
  end if;

  select * into v_review from public.learning_assignment_reviews
  where submission_id = v_latest.id;

  return jsonb_build_object(
    'activity_id', p_activity_id,
    'submission_id', v_latest.id,
    'status', 'reviewed',
    'result', jsonb_build_object(
      'points_earned', v_review.points_earned,
      'points_possible', v_review.points_possible,
      'passed', v_review.passed,
      'learner_feedback', v_review.learner_feedback,
      'reviewed_at', v_review.reviewed_at
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) Instructor queue + review
-- ---------------------------------------------------------------------------

create or replace function public.get_learning_assignment_submission_queue(
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

  if v_status is null or v_status not in (
    'pending', 'reviewed', 'overdue', 'late', 'all'
  ) then
    raise exception 'Invalid status filter';
  end if;

  if v_status in ('pending', 'reviewed', 'late', 'all') then
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
        s.is_late,
        s.attempt_number,
        spec.due_at,
        exists (
          select 1 from public.learning_assignment_reviews r
          where r.submission_id = s.id
        ) as has_review
      from public.learning_assignment_submissions s
      join public.learning_activities a on a.id = s.activity_id
      left join public.learning_assignment_specs spec on spec.activity_id = s.activity_id
      where s.course_id = p_course_id
        and (
          (v_status = 'pending' and s.status = 'submitted')
          or (v_status = 'reviewed' and s.status = 'reviewed')
          or (v_status = 'late' and s.status in ('submitted', 'reviewed') and s.is_late)
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
  else
    -- overdue: published assignments past due with no submitted/reviewed work
    select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    into v_items
    from (
      select
        null::uuid as submission_id,
        act.id as activity_id,
        act.name as activity_name,
        l.learner_user_id,
        public.learning_instructor_learner_label(l.learner_user_id) as learner_label,
        'overdue'::text as status,
        null::timestamptz as submitted_at,
        true as is_late,
        null::integer as attempt_number,
        spec.due_at,
        false as has_review
      from public.learning_activities act
      join public.learning_lessons les on les.id = act.lesson_id
      join public.learning_sections sec on sec.id = les.section_id
      join public.learning_assignment_specs spec on spec.activity_id = act.id
      join lateral public.learning_instructor_course_learners(p_course_id) l on true
      where sec.course_id = p_course_id
        and act.type = 'assignment'
        and act.status = 'published'
        and spec.due_at is not null
        and spec.due_at < now()
        and not exists (
          select 1
          from public.learning_assignment_submissions s
          where s.activity_id = act.id
            and s.user_id = l.learner_user_id
            and s.status in ('submitted', 'reviewed')
        )
        and (
          v_search is null
          or l.learner_user_id::text ilike '%' || v_search || '%'
          or coalesce(public.learning_instructor_learner_label(l.learner_user_id), '')
               ilike '%' || v_search || '%'
          or act.name ilike '%' || v_search || '%'
        )
      order by spec.due_at asc
      limit 200
    ) t;
  end if;

  return jsonb_build_object(
    'course_id', p_course_id,
    'status_filter', v_status,
    'search', v_search,
    'items', coalesce(v_items, '[]'::jsonb),
    'item_count', jsonb_array_length(coalesce(v_items, '[]'::jsonb))
  );
end;
$$;

create or replace function public.get_learning_assignment_submission_for_review(
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.learning_assignment_submissions%rowtype;
  v_artifacts jsonb;
  v_review public.learning_assignment_reviews%rowtype;
  v_spec public.learning_assignment_specs%rowtype;
  v_settings public.learning_activity_settings%rowtype;
  v_activity public.learning_activities%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_submission_id is null then raise exception 'submission_id is required'; end if;

  select * into v_sub from public.learning_assignment_submissions where id = p_submission_id;
  if not found then raise exception 'Submission not found'; end if;

  if not (
    public.can_manage_learning_course(v_sub.course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to review this submission';
  end if;

  select * into v_activity from public.learning_activities where id = v_sub.activity_id;
  select * into v_spec from public.learning_assignment_specs where activity_id = v_sub.activity_id;
  select * into v_settings from public.learning_activity_settings where activity_id = v_sub.activity_id;
  select * into v_review from public.learning_assignment_reviews where submission_id = p_submission_id;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_artifacts
  from (
    select id, kind, position, text_body, link_url,
           storage_bucket, storage_path, file_name, mime_type, byte_size
    from public.learning_assignment_artifacts
    where submission_id = p_submission_id
    order by position
  ) t;

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
    'is_late', v_sub.is_late,
    'due_at', v_spec.due_at,
    'instructions', coalesce(v_spec.instructions, ''),
    'max_score', v_settings.max_score,
    'passing_score', v_settings.passing_score,
    'artifacts', v_artifacts,
    'review', case
      when v_review.submission_id is null then null
      else jsonb_build_object(
        'points_earned', v_review.points_earned,
        'points_possible', v_review.points_possible,
        'passed', v_review.passed,
        'learner_feedback', v_review.learner_feedback,
        'reviewer_user_id', v_review.reviewer_user_id,
        'reviewed_at', v_review.reviewed_at
      )
    end
  );
end;
$$;

create or replace function public.review_learning_assignment_submission(
  p_submission_id uuid,
  p_points_earned numeric,
  p_feedback text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.learning_assignment_submissions%rowtype;
  v_settings public.learning_activity_settings%rowtype;
  v_review public.learning_assignment_reviews%rowtype;
  v_feedback text := nullif(btrim(coalesce(p_feedback, '')), '');
  v_possible numeric;
  v_passed boolean;
  v_now timestamptz := now();
  v_progress jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_submission_id is null then raise exception 'submission_id is required'; end if;
  if p_points_earned is null or p_points_earned < 0 then
    raise exception 'points_earned must be a non-negative number';
  end if;
  if v_feedback is not null and char_length(v_feedback) > 2000 then
    raise exception 'feedback is too long';
  end if;

  select * into v_sub from public.learning_assignment_submissions
  where id = p_submission_id for update;
  if not found then raise exception 'Submission not found'; end if;

  if not (
    public.can_manage_learning_course(v_sub.course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to review this submission';
  end if;

  if v_sub.status not in ('submitted', 'reviewed') then
    raise exception 'Submission is not ready for review';
  end if;

  select * into v_settings from public.learning_activity_settings
  where activity_id = v_sub.activity_id;

  v_possible := v_settings.max_score;
  if v_possible is not null and p_points_earned > v_possible then
    raise exception 'points_earned exceeds max_score';
  end if;

  if v_settings.passing_score is null then
    v_passed := null;
  else
    v_passed := p_points_earned >= v_settings.passing_score;
  end if;

  insert into public.learning_assignment_reviews (
    submission_id, points_earned, points_possible, passed,
    learner_feedback, reviewer_user_id, reviewed_at
  ) values (
    p_submission_id, p_points_earned, v_possible, v_passed,
    v_feedback, v_uid, v_now
  )
  on conflict (submission_id) do update set
    points_earned = excluded.points_earned,
    points_possible = excluded.points_possible,
    passed = excluded.passed,
    learner_feedback = excluded.learner_feedback,
    reviewer_user_id = v_uid,
    reviewed_at = v_now
  returning * into v_review;

  update public.learning_assignment_submissions
  set status = 'reviewed', updated_at = v_now
  where id = p_submission_id;

  v_progress := public.learning_assignment_try_apply_progress(p_submission_id, v_uid);

  perform public.learning_audit_write(
    v_uid, v_sub.space_id, 'assignment.submission_reviewed',
    'learning_assignment_submission', p_submission_id::text,
    jsonb_build_object(
      'points_earned', v_review.points_earned,
      'passed', v_review.passed,
      'progress', v_progress
    )
  );

  return jsonb_build_object(
    'submission_id', p_submission_id,
    'status', 'reviewed',
    'points_earned', v_review.points_earned,
    'points_possible', v_review.points_possible,
    'passed', v_review.passed,
    'learner_feedback', v_review.learner_feedback,
    'reviewed_at', v_review.reviewed_at,
    'progress', v_progress
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) Grants
-- ---------------------------------------------------------------------------

revoke all on function public.upsert_learning_assignment_spec(uuid, text, timestamptz, integer)
  from public, anon;
grant execute on function public.upsert_learning_assignment_spec(uuid, text, timestamptz, integer)
  to authenticated, service_role;

revoke all on function public.set_learning_assignment_resources(uuid, jsonb)
  from public, anon;
grant execute on function public.set_learning_assignment_resources(uuid, jsonb)
  to authenticated, service_role;

revoke all on function public.get_learning_assignment_for_manage(uuid)
  from public, anon;
grant execute on function public.get_learning_assignment_for_manage(uuid)
  to authenticated, service_role;

revoke all on function public.get_my_learning_assignment(uuid)
  from public, anon;
grant execute on function public.get_my_learning_assignment(uuid)
  to authenticated, service_role;

revoke all on function public.start_my_learning_assignment_submission(uuid)
  from public, anon;
grant execute on function public.start_my_learning_assignment_submission(uuid)
  to authenticated, service_role;

revoke all on function public.save_my_learning_assignment_submission(uuid, jsonb)
  from public, anon;
grant execute on function public.save_my_learning_assignment_submission(uuid, jsonb)
  to authenticated, service_role;

revoke all on function public.submit_my_learning_assignment_submission(uuid)
  from public, anon;
grant execute on function public.submit_my_learning_assignment_submission(uuid)
  to authenticated, service_role;

revoke all on function public.get_my_learning_assignment_result(uuid)
  from public, anon;
grant execute on function public.get_my_learning_assignment_result(uuid)
  to authenticated, service_role;

revoke all on function public.get_learning_assignment_submission_queue(uuid, text, text)
  from public, anon;
grant execute on function public.get_learning_assignment_submission_queue(uuid, text, text)
  to authenticated, service_role;

revoke all on function public.get_learning_assignment_submission_for_review(uuid)
  from public, anon;
grant execute on function public.get_learning_assignment_submission_for_review(uuid)
  to authenticated, service_role;

revoke all on function public.review_learning_assignment_submission(uuid, numeric, text)
  from public, anon;
grant execute on function public.review_learning_assignment_submission(uuid, numeric, text)
  to authenticated, service_role;
