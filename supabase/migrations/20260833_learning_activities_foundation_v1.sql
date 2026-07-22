-- UMTUBA Learning OS — Activities Foundation V1
-- Additive. Activities + settings under learning_lessons.
-- Hierarchy: Space → Program → Course → Section → Lesson → Activity.
-- Depends on: 20260832_learning_lessons_foundation_v1.sql
-- Does NOT: questions, banks, answers, attempts, submissions, grades, rubrics,
-- auto-eval engines, teacher workflows, coding execution, file storage, AI
-- execution, progress, completion behavior, certificates, enrollments, payments,
-- marketplace, booking, calendar, live delivery behavior, UI, search,
-- notifications, learning_lesson_items, type-specific engines.
--
-- Activity = generic educational INTERACTION CONTAINER under exactly one Lesson.
-- An Activity is NOT a question, attempt, submission, answer, grade, progress
-- record, certificate, live session, or AI execution. It only names a typed
-- interaction slot; behavior is deferred to later normalized child tables.
-- Authority is INHERITED from the parent Lesson → Section → Course → Space chain
-- — there is NO dedicated activity-level staff table. Space remains the hard
-- authority boundary and Course authority stays membership-revalidated: a stale
-- Course staff row must NOT grant Activity authority (helpers revalidate active
-- space membership via the Course helpers).
--
-- CRITICAL DIVERGENCE FROM LESSONS: there is NO anonymous/public SELECT policy
-- in V1 (privacy-safe for assessments). The visibility column is kept for
-- forward compatibility but has NO anon effect. Authenticated reads only.

-- ---------------------------------------------------------------------------
-- 1) learning_activities
-- ---------------------------------------------------------------------------

create table if not exists public.learning_activities (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null
    references public.learning_lessons (id) on delete restrict,
  -- Immutable typed interaction slot. Allowlist of 16 types; unknown values
  -- fail closed. There are NO type engines and NO type-specific columns here.
  type text not null
    constraint learning_activities_type_check check (
      type in (
        'quiz', 'assignment', 'practice', 'coding', 'essay', 'discussion',
        'reflection', 'survey', 'oral', 'upload', 'matching', 'flashcards',
        'ai_task', 'project', 'lab', 'live_check'
      )
    ),
  slug text not null
    constraint learning_activities_slug_format check (
      char_length(slug) between 3 and 64
      and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  name text not null
    constraint learning_activities_name_len check (
      char_length(btrim(name)) between 1 and 160
    ),
  description text
    constraint learning_activities_description_len check (
      description is null or char_length(description) <= 8000
    ),
  status text not null default 'draft'
    constraint learning_activities_status_check check (
      status in ('draft', 'published', 'suspended', 'archived')
    ),
  -- Kept for forward compatibility only. NO anon SELECT policy consumes it in V1.
  visibility text not null default 'private'
    constraint learning_activities_visibility_check check (
      visibility in ('private', 'unlisted', 'public')
    ),
  position integer not null default 0
    constraint learning_activities_position_non_negative check (position >= 0),
  -- Lean container metadata. Only ai_metadata (skills/outcomes/tags). There is
  -- NO branding, SEO, taxonomy, or marketplace surface on activities.
  ai_metadata jsonb not null default '{}'::jsonb
    constraint learning_activities_ai_object check (
      jsonb_typeof(ai_metadata) = 'object'
    ),
  created_by uuid not null
    references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  suspended_at timestamptz,
  archived_at timestamptz,
  constraint learning_activities_lesson_slug_unique unique (lesson_id, slug)
);

comment on table public.learning_activities is
  'Learning OS activities — generic educational interaction container under exactly one lesson. An activity is NOT a question, attempt, submission, answer, grade, progress record, certificate, live session, or AI execution. Client writes only via RPCs. Authority inherits from the parent lesson/section/course; there is no activity staff table. lesson_id and type are immutable after creation. No questions/rubrics/answers are stored on this table.';

comment on column public.learning_activities.lesson_id is
  'Immutable parent lesson. Cannot change via update or reorder.';

comment on column public.learning_activities.type is
  'Immutable activity type allowlist (16): quiz|assignment|practice|coding|essay|discussion|reflection|survey|oral|upload|matching|flashcards|ai_task|project|lab|live_check. Fail-closed; activates no type engine in V1.';

comment on column public.learning_activities.position is
  'Order within the parent lesson''s activity list for V1 — non-negative integer. NOT a global lesson-item order. There is no UNIQUE(lesson_id, position); the reserved future learning_lesson_items table (not implemented) will own cross-content ordering. Reorder via reorder_learning_activities.';

comment on column public.learning_activities.visibility is
  'Forward-compat only: private|unlisted|public. There is NO anonymous SELECT policy in V1, so visibility has no anon effect (privacy-safe for assessments).';

comment on column public.learning_activities.ai_metadata is
  'Foundation keys: skills, outcomes, tags (arrays of strings). Lean container — no branding, SEO, taxonomy, or marketplace metadata on activities.';

create index if not exists learning_activities_lesson_status_idx
  on public.learning_activities (lesson_id, status);

create index if not exists learning_activities_lesson_position_idx
  on public.learning_activities (lesson_id, position, id);

create index if not exists learning_activities_status_visibility_idx
  on public.learning_activities (status, visibility);

create index if not exists learning_activities_created_by_idx
  on public.learning_activities (created_by);

create index if not exists learning_activities_type_idx
  on public.learning_activities (type);

drop trigger if exists learning_activities_set_updated_at
  on public.learning_activities;
create trigger learning_activities_set_updated_at
  before update on public.learning_activities
  for each row execute function public.set_row_updated_at();

alter table public.learning_activities enable row level security;
alter table public.learning_activities force row level security;

-- NO anon grant: activities are never exposed to anonymous clients in V1.
revoke all on table public.learning_activities
  from public, anon, authenticated;
grant select on table public.learning_activities to authenticated;
revoke insert, update, delete on table public.learning_activities
  from authenticated;
grant all on table public.learning_activities to service_role;

-- ---------------------------------------------------------------------------
-- 2) learning_activity_settings (1:1)
-- ---------------------------------------------------------------------------
-- Inert scoring/attempt fields + bounded config. NONE of these fields drive any
-- attempt/submission/scoring/grading/completion/progress behavior in V1 — they
-- are forward contracts for later normalized child tables.

create table if not exists public.learning_activity_settings (
  activity_id uuid primary key
    references public.learning_activities (id) on delete cascade,
  is_required boolean not null default true,
  max_score numeric
    constraint learning_activity_settings_max_score_check check (
      max_score is null or max_score >= 0
    ),
  passing_score numeric
    constraint learning_activity_settings_passing_score_check check (
      passing_score is null or passing_score >= 0
    ),
  max_attempts integer
    constraint learning_activity_settings_max_attempts_check check (
      max_attempts is null or max_attempts >= 1
    ),
  time_limit_seconds integer
    constraint learning_activity_settings_time_limit_check check (
      time_limit_seconds is null
      or time_limit_seconds between 1 and 1000000
    ),
  evaluation_mode text not null default 'none'
    constraint learning_activity_settings_evaluation_mode_check check (
      evaluation_mode in ('none', 'auto', 'manual', 'hybrid')
    ),
  completion_mode text not null default 'view'
    constraint learning_activity_settings_completion_mode_check check (
      completion_mode in ('view', 'submit', 'score', 'manual')
    ),
  allow_late_submission boolean not null default false,
  show_result_policy text not null default 'never'
    constraint learning_activity_settings_show_result_policy_check check (
      show_result_policy in (
        'never', 'immediately', 'after_submit', 'after_close', 'manual'
      )
    ),
  config jsonb not null default '{}'::jsonb
    constraint learning_activity_settings_config_object check (
      jsonb_typeof(config) = 'object'
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Cross-field bound: passing_score must fit within max_score when both set.
  constraint learning_activity_settings_score_bounds check (
    passing_score is null
    or max_score is null
    or passing_score <= max_score
  )
);

comment on table public.learning_activity_settings is
  '1:1 activity settings. Inert scoring/attempt fields (is_required, max_score, passing_score, max_attempts, time_limit_seconds, evaluation_mode, completion_mode, allow_late_submission, show_result_policy) plus a bounded shallow config jsonb. NONE of these drive attempt/submission/scoring/grading/completion/progress behavior in V1 — they are forward contracts for later normalized child tables. config is object-only, <= 8192 bytes, max depth 2, <= 32 top-level keys, scalar or short-array values.';

drop trigger if exists learning_activity_settings_set_updated_at
  on public.learning_activity_settings;
create trigger learning_activity_settings_set_updated_at
  before update on public.learning_activity_settings
  for each row execute function public.set_row_updated_at();

alter table public.learning_activity_settings enable row level security;

revoke all on table public.learning_activity_settings
  from public, anon, authenticated;
grant select on table public.learning_activity_settings to authenticated;
revoke insert, update, delete on table public.learning_activity_settings
  from authenticated;
grant all on table public.learning_activity_settings to service_role;

-- ---------------------------------------------------------------------------
-- 3) Helpers (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
-- No activity staff table: authority is inherited from the parent lesson (which
-- itself inherits from section → course). Course helpers already revalidate
-- active space membership, so a stale course staff row cannot grant activity
-- authority.

create or replace function public.can_manage_learning_activity(
  p_activity_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Platform admin OR whoever can manage the parent lesson (which itself
  -- inherits from the parent section/course and revalidates active space
  -- membership for delegated course staff).
  select
    p_activity_id is not null
    and p_user_id is not null
    and (
      public.is_platform_admin(p_user_id)
      or exists (
        select 1
        from public.learning_activities act
        where act.id = p_activity_id
          and public.can_manage_learning_lesson(act.lesson_id, p_user_id)
      )
    );
$$;

-- Create: can_manage_learning_lesson OR active course staff rank >= instructor.
-- Mirrors can_create_learning_lesson one level down. Course staff helpers
-- revalidate active space membership (stale staff row => no authority). The
-- course is resolved through the parent lesson → section.
create or replace function public.can_create_learning_activity(
  p_lesson_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_lesson_id is not null
    and p_user_id is not null
    and exists (
      select 1
      from public.learning_lessons les
      join public.learning_sections sec
        on sec.id = les.section_id
      where les.id = p_lesson_id
        and (
          public.can_manage_learning_lesson(p_lesson_id, p_user_id)
          or (
            public.is_learning_course_staff(sec.course_id, p_user_id)
            and coalesce(
              public.learning_course_staff_role_rank(
                public.learning_course_staff_role(sec.course_id, p_user_id)
              ),
              0
            ) >= public.learning_course_staff_role_rank('instructor')
          )
        )
    );
$$;

revoke all on function public.can_manage_learning_activity(uuid, uuid)
  from public, anon;
grant execute on function public.can_manage_learning_activity(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.can_create_learning_activity(uuid, uuid)
  from public, anon;
grant execute on function public.can_create_learning_activity(uuid, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) RLS policies
-- ---------------------------------------------------------------------------
-- CRITICAL: there is NO anon/public SELECT policy here (privacy-safe). Only
-- authenticated readers are considered. is_platform_admin is only ever called
-- from authenticated policies — never structurally reachable by anon.

-- Authenticated space members: read published activities in their space, and
-- read draft/etc when they can manage the space/program/course or are course
-- staff. The full parent chain (lesson → section → course → program → space) is
-- resolved to find the owning space.
drop policy if exists "Space members read accessible activities"
  on public.learning_activities;
create policy "Space members read accessible activities"
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
        and public.is_learning_space_member(p.space_id)
        and (
          learning_activities.status = 'published'
          or public.can_manage_learning_space(p.space_id)
          or public.can_manage_learning_program(p.id)
          or public.can_manage_learning_course(c.id)
          or public.is_learning_course_staff(c.id)
        )
    )
  );

drop policy if exists "Activity managers read activities"
  on public.learning_activities;
create policy "Activity managers read activities"
  on public.learning_activities for select
  to authenticated
  using (public.can_manage_learning_activity(id));

drop policy if exists "Platform admins read all activities"
  on public.learning_activities;
create policy "Platform admins read all activities"
  on public.learning_activities for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Members read activity settings"
  on public.learning_activity_settings;
create policy "Members read activity settings"
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
          public.is_learning_space_member(p.space_id)
          or public.can_manage_learning_activity(act.id)
          or public.is_platform_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Internal validators
-- ---------------------------------------------------------------------------

-- Immutable type allowlist — fail closed on unknown values.
create or replace function public.learning_activity_validate_type(
  p_type text
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  if p_type is null
     or p_type not in (
       'quiz', 'assignment', 'practice', 'coding', 'essay', 'discussion',
       'reflection', 'survey', 'oral', 'upload', 'matching', 'flashcards',
       'ai_task', 'project', 'lab', 'live_check'
     )
  then
    raise exception 'Invalid activity type';
  end if;
end;
$$;

-- ai_metadata JSON limits (lean foundation, not content storage):
-- - type: object only
-- - max serialized size: 8192 bytes (octet_length of jsonb::text)
-- - keys allowlist: skills, outcomes, tags
--   (each: array <= 64 strings, each <= 120 chars; no nesting)
create or replace function public.learning_activity_validate_ai_metadata(
  p_value jsonb
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  v_key text;
  v_elem jsonb;
  v_allowed text[] := array['skills', 'outcomes', 'tags'];
  v_max_bytes integer := 8192;
begin
  if p_value is null or jsonb_typeof(p_value) is distinct from 'object' then
    raise exception 'ai_metadata must be a JSON object';
  end if;

  if octet_length(p_value::text) > v_max_bytes then
    raise exception 'ai_metadata exceeds maximum size of % bytes', v_max_bytes;
  end if;

  for v_key in select jsonb_object_keys(p_value)
  loop
    if not (v_key = any (v_allowed)) then
      raise exception 'ai_metadata contains unexpected key: %', v_key;
    end if;

    v_elem := p_value -> v_key;

    if jsonb_typeof(v_elem) is distinct from 'array' then
      raise exception 'ai_metadata.% must be an array', v_key;
    end if;
    if jsonb_array_length(v_elem) > 64 then
      raise exception 'ai_metadata.% exceeds maximum item count', v_key;
    end if;
    if exists (
      select 1
      from jsonb_array_elements_text(v_elem) as t(val)
      where char_length(t.val) > 120
    ) then
      raise exception 'ai_metadata.% item exceeds maximum length', v_key;
    end if;
  end loop;
end;
$$;

-- config JSON limits (inert settings sidecar, NOT content storage):
-- - type: object only
-- - max serialized size: 8192 bytes
-- - max top-level keys: 32
-- - max depth: 2 (top-level object + scalar or single-level array values)
-- - values: scalar (string/number/boolean/null) OR array of scalars only
--   (no nested objects/arrays; array <= 64 items; strings <= 512 chars)
-- Fail closed. Must NOT store questions/answers/submissions/rubrics/files/code/
-- large content/AI outputs.
create or replace function public.learning_activity_validate_config(
  p_value jsonb
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  v_key text;
  v_elem jsonb;
  v_arr_elem jsonb;
  v_max_bytes integer := 8192;
  v_max_keys integer := 32;
  v_max_array_items integer := 64;
  v_max_string_chars integer := 512;
  v_key_count integer := 0;
begin
  if p_value is null or jsonb_typeof(p_value) is distinct from 'object' then
    raise exception 'config must be a JSON object';
  end if;

  if octet_length(p_value::text) > v_max_bytes then
    raise exception 'config exceeds maximum size of % bytes', v_max_bytes;
  end if;

  select count(*) into v_key_count
  from jsonb_object_keys(p_value);

  if v_key_count > v_max_keys then
    raise exception 'config exceeds maximum of % top-level keys', v_max_keys;
  end if;

  for v_key in select jsonb_object_keys(p_value)
  loop
    if char_length(v_key) > v_max_string_chars then
      raise exception 'config key exceeds maximum length';
    end if;

    v_elem := p_value -> v_key;

    if jsonb_typeof(v_elem) = 'object' then
      raise exception
        'config.% must be a scalar or array of scalars (nested objects not allowed)',
        v_key;
    elsif jsonb_typeof(v_elem) = 'array' then
      if jsonb_array_length(v_elem) > v_max_array_items then
        raise exception 'config.% exceeds maximum array length', v_key;
      end if;
      for v_arr_elem in select jsonb_array_elements(v_elem)
      loop
        if jsonb_typeof(v_arr_elem) in ('object', 'array') then
          raise exception 'config.% array items must be scalars', v_key;
        end if;
        if jsonb_typeof(v_arr_elem) = 'string'
           and char_length(v_arr_elem #>> '{}') > v_max_string_chars
        then
          raise exception 'config.% array string exceeds maximum length', v_key;
        end if;
      end loop;
    elsif jsonb_typeof(v_elem) = 'string' then
      if char_length(v_elem #>> '{}') > v_max_string_chars then
        raise exception 'config.% string exceeds maximum length', v_key;
      end if;
    end if;
    -- number / boolean / null scalars need no further checks.
  end loop;
end;
$$;

-- Scoring/attempt bound validator used by the settings RPC. Mirrors the DB
-- check constraints but produces explicit, testable error messages.
create or replace function public.learning_activity_validate_scoring(
  p_max_score numeric,
  p_passing_score numeric,
  p_max_attempts integer,
  p_time_limit_seconds integer
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  if p_max_score is not null and p_max_score < 0 then
    raise exception 'max_score must be >= 0';
  end if;
  if p_passing_score is not null and p_passing_score < 0 then
    raise exception 'passing_score must be >= 0';
  end if;
  if p_passing_score is not null
     and p_max_score is not null
     and p_passing_score > p_max_score
  then
    raise exception 'passing_score must be <= max_score';
  end if;
  if p_max_attempts is not null and p_max_attempts < 1 then
    raise exception 'max_attempts must be >= 1';
  end if;
  if p_time_limit_seconds is not null
     and p_time_limit_seconds not between 1 and 1000000
  then
    raise exception 'time_limit_seconds must be between 1 and 1000000';
  end if;
end;
$$;

create or replace function public.learning_activity_require_mutable_status(
  p_status text
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  -- Suspended/archived: platform moderate RPC only. No normal mutations.
  if p_status in ('suspended', 'archived') then
    raise exception
      'Activity is %; only platform moderation may change it',
      p_status;
  end if;
  if p_status is distinct from 'draft'
     and p_status is distinct from 'published'
  then
    raise exception 'Invalid activity status for mutation';
  end if;
end;
$$;

-- Parent program must be draft|published (not suspended/archived).
create or replace function public.learning_activity_require_parent_program_status(
  p_program_status text
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  if p_program_status is distinct from 'draft'
     and p_program_status is distinct from 'published'
  then
    raise exception
      'Parent program must be draft or published for activity changes';
  end if;
end;
$$;

-- Parent course must be draft|published (not suspended/archived).
create or replace function public.learning_activity_require_parent_course_status(
  p_course_status text
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  if p_course_status is distinct from 'draft'
     and p_course_status is distinct from 'published'
  then
    raise exception
      'Parent course must be draft or published for activity changes';
  end if;
end;
$$;

-- Parent section must be draft|published (not suspended/archived).
create or replace function public.learning_activity_require_parent_section_status(
  p_section_status text
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  if p_section_status is distinct from 'draft'
     and p_section_status is distinct from 'published'
  then
    raise exception
      'Parent section must be draft or published for activity changes';
  end if;
end;
$$;

-- Parent lesson must be draft|published (not suspended/archived). NOTE: a
-- published activity does NOT require a *published* lesson — only that the
-- lesson is in a mutable (draft|published) state. Chain intersection at read
-- time handles actual exposure (same rule as Lessons→Sections).
create or replace function public.learning_activity_require_parent_lesson_status(
  p_lesson_status text
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  if p_lesson_status is distinct from 'draft'
     and p_lesson_status is distinct from 'published'
  then
    raise exception
      'Parent lesson must be draft or published for activity changes';
  end if;
end;
$$;

revoke all on function public.learning_activity_validate_type(text)
  from public, anon, authenticated;
revoke all on function public.learning_activity_validate_ai_metadata(jsonb)
  from public, anon, authenticated;
revoke all on function public.learning_activity_validate_config(jsonb)
  from public, anon, authenticated;
revoke all on function public.learning_activity_validate_scoring(
  numeric, numeric, integer, integer
) from public, anon, authenticated;
revoke all on function public.learning_activity_require_mutable_status(text)
  from public, anon, authenticated;
revoke all on function public.learning_activity_require_parent_program_status(text)
  from public, anon, authenticated;
revoke all on function public.learning_activity_require_parent_course_status(text)
  from public, anon, authenticated;
revoke all on function public.learning_activity_require_parent_section_status(text)
  from public, anon, authenticated;
revoke all on function public.learning_activity_require_parent_lesson_status(text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) RPCs
-- ---------------------------------------------------------------------------
-- Every mutation revalidates the full 6-level parent chain (space active;
-- program draft|published; course draft|published; section draft|published;
-- lesson draft|published) and actor authority inherited from the lesson/course.
-- lesson_id and type are immutable — no RPC accepts a new lesson_id or type.

create or replace function public.create_learning_activity(
  p_lesson_id uuid,
  p_type text,
  p_slug text,
  p_name text,
  p_description text default null,
  p_visibility text default 'private'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lesson public.learning_lessons%rowtype;
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_space_status text;
  v_activity_id uuid;
  v_type text := lower(btrim(coalesce(p_type, '')));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_name text := btrim(coalesce(p_name, ''));
  v_visibility text := coalesce(nullif(btrim(p_visibility), ''), 'private');
  v_position integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_lesson_id is null then
    raise exception 'lesson_id is required';
  end if;

  -- Lock the parent lesson row: serializes position assignment and prevents the
  -- lesson from being mutated out from under this insert.
  select * into v_lesson
  from public.learning_lessons
  where id = p_lesson_id
  for update;

  if not found then
    raise exception 'Learning lesson not found';
  end if;

  select * into v_section
  from public.learning_sections
  where id = v_lesson.section_id
  for update;

  if not found then
    raise exception 'Learning section not found';
  end if;

  select * into v_course
  from public.learning_courses
  where id = v_section.course_id
  for update;

  if not found then
    raise exception 'Learning course not found';
  end if;

  select * into v_program
  from public.learning_programs
  where id = v_course.program_id
  for update;

  if not found then
    raise exception 'Learning program not found';
  end if;

  select status into v_space_status
  from public.learning_spaces
  where id = v_program.space_id
  for update;

  if not found then
    raise exception 'Learning space not found';
  end if;

  if v_space_status is distinct from 'active' then
    raise exception 'Learning space must be active for activity changes';
  end if;

  perform public.learning_activity_require_parent_program_status(v_program.status);
  perform public.learning_activity_require_parent_course_status(v_course.status);
  perform public.learning_activity_require_parent_section_status(v_section.status);
  perform public.learning_activity_require_parent_lesson_status(v_lesson.status);

  if not public.can_create_learning_activity(p_lesson_id, v_uid) then
    raise exception 'Not allowed to create activities in this lesson';
  end if;

  -- Immutable type — validated on create; never mutated afterward.
  perform public.learning_activity_validate_type(v_type);

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or char_length(v_slug) not between 3 and 64
  then
    raise exception 'Invalid learning activity slug';
  end if;

  if char_length(v_name) not between 1 and 160 then
    raise exception 'Invalid learning activity name';
  end if;

  if v_visibility not in ('private', 'unlisted', 'public') then
    raise exception 'Invalid learning activity visibility';
  end if;

  if p_description is not null and char_length(p_description) > 8000 then
    raise exception 'Description too long';
  end if;

  select coalesce(max(a.position), -1) + 1
  into v_position
  from public.learning_activities a
  where a.lesson_id = p_lesson_id;

  insert into public.learning_activities (
    lesson_id,
    type,
    slug,
    name,
    description,
    status,
    visibility,
    position,
    created_by
  ) values (
    p_lesson_id,
    v_type,
    v_slug,
    v_name,
    nullif(p_description, ''),
    'draft',
    v_visibility,
    v_position,
    v_uid
  )
  returning id into v_activity_id;

  insert into public.learning_activity_settings (activity_id)
  values (v_activity_id);

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'activity.create',
    'learning_activity',
    v_activity_id::text,
    jsonb_build_object(
      'activity_id', v_activity_id,
      'lesson_id', p_lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'type', v_type,
      'slug', v_slug,
      'visibility', v_visibility,
      'position', v_position
    )
  );

  return jsonb_build_object(
    'activity_id', v_activity_id,
    'lesson_id', p_lesson_id,
    'type', v_type,
    'status', 'draft',
    'position', v_position
  );
end;
$$;

-- Update mutable attributes only. type and lesson_id are NOT accepted here.
create or replace function public.update_learning_activity(
  p_activity_id uuid,
  p_name text default null,
  p_description text default null,
  p_visibility text default null,
  p_ai_metadata jsonb default null,
  p_clear_description boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_activity public.learning_activities%rowtype;
  v_lesson public.learning_lessons%rowtype;
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_space_status text;
  v_name text;
  v_visibility text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_activity
  from public.learning_activities
  where id = p_activity_id
  for update;

  if not found then
    raise exception 'Learning activity not found';
  end if;

  select * into v_lesson
  from public.learning_lessons
  where id = v_activity.lesson_id;

  if not found then
    raise exception 'Learning lesson not found';
  end if;

  select * into v_section
  from public.learning_sections
  where id = v_lesson.section_id;

  if not found then
    raise exception 'Learning section not found';
  end if;

  select * into v_course
  from public.learning_courses
  where id = v_section.course_id;

  if not found then
    raise exception 'Learning course not found';
  end if;

  select * into v_program
  from public.learning_programs
  where id = v_course.program_id;

  if not found then
    raise exception 'Learning program not found';
  end if;

  select status into v_space_status
  from public.learning_spaces
  where id = v_program.space_id;

  if not found then
    raise exception 'Learning space not found';
  end if;

  if v_space_status is distinct from 'active' then
    raise exception 'Learning space must be active for activity changes';
  end if;

  perform public.learning_activity_require_parent_program_status(v_program.status);
  perform public.learning_activity_require_parent_course_status(v_course.status);
  perform public.learning_activity_require_parent_section_status(v_section.status);
  perform public.learning_activity_require_parent_lesson_status(v_lesson.status);

  -- draft|published only; suspended/archived → platform moderate only
  perform public.learning_activity_require_mutable_status(v_activity.status);

  -- Authority inherited from lesson/course: manage the activity, or be active
  -- course staff (instructor / content_editor / lead_instructor) — course staff
  -- helpers revalidate active space membership.
  if not public.can_manage_learning_activity(p_activity_id, v_uid)
     and not (
       public.is_learning_course_staff(v_section.course_id, v_uid)
       and public.learning_course_staff_role(v_section.course_id, v_uid)
           in ('instructor', 'content_editor', 'lead_instructor')
     )
  then
    raise exception 'Not allowed to update this activity';
  end if;

  if p_name is not null then
    v_name := btrim(p_name);
    if char_length(v_name) not between 1 and 160 then
      raise exception 'Invalid learning activity name';
    end if;
  end if;

  if p_visibility is not null then
    v_visibility := btrim(p_visibility);
    if v_visibility not in ('private', 'unlisted', 'public') then
      raise exception 'Invalid learning activity visibility';
    end if;
  end if;

  if p_description is not null and char_length(p_description) > 8000 then
    raise exception 'Description too long';
  end if;

  if p_ai_metadata is not null then
    perform public.learning_activity_validate_ai_metadata(p_ai_metadata);
  end if;

  update public.learning_activities
  set
    name = coalesce(v_name, name),
    description = case
      when p_clear_description then null
      when p_description is not null then nullif(p_description, '')
      else description
    end,
    visibility = coalesce(v_visibility, visibility),
    ai_metadata = coalesce(p_ai_metadata, ai_metadata),
    updated_at = now()
  where id = p_activity_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'activity.update',
    'learning_activity',
    p_activity_id::text,
    jsonb_build_object(
      'activity_id', p_activity_id,
      'lesson_id', v_activity.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'updated', true
    )
  );

  return jsonb_build_object('activity_id', p_activity_id, 'updated', true);
end;
$$;

-- Dedicated settings RPC. Validates scoring bounds + enum modes + config. Does
-- NOT drive any attempt/submission/scoring/grading/completion/progress behavior.
create or replace function public.update_learning_activity_settings(
  p_activity_id uuid,
  p_is_required boolean default null,
  p_max_score numeric default null,
  p_passing_score numeric default null,
  p_max_attempts integer default null,
  p_time_limit_seconds integer default null,
  p_evaluation_mode text default null,
  p_completion_mode text default null,
  p_allow_late_submission boolean default null,
  p_show_result_policy text default null,
  p_config jsonb default null,
  p_clear_max_score boolean default false,
  p_clear_passing_score boolean default false,
  p_clear_max_attempts boolean default false,
  p_clear_time_limit boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_activity public.learning_activities%rowtype;
  v_settings public.learning_activity_settings%rowtype;
  v_lesson public.learning_lessons%rowtype;
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_space_status text;
  v_evaluation_mode text;
  v_completion_mode text;
  v_show_result_policy text;
  v_final_max_score numeric;
  v_final_passing_score numeric;
  v_final_max_attempts integer;
  v_final_time_limit integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_activity
  from public.learning_activities
  where id = p_activity_id
  for update;

  if not found then
    raise exception 'Learning activity not found';
  end if;

  select * into v_settings
  from public.learning_activity_settings
  where activity_id = p_activity_id
  for update;

  if not found then
    raise exception 'Learning activity settings not found';
  end if;

  select * into v_lesson
  from public.learning_lessons
  where id = v_activity.lesson_id;

  if not found then
    raise exception 'Learning lesson not found';
  end if;

  select * into v_section
  from public.learning_sections
  where id = v_lesson.section_id;

  if not found then
    raise exception 'Learning section not found';
  end if;

  select * into v_course
  from public.learning_courses
  where id = v_section.course_id;

  if not found then
    raise exception 'Learning course not found';
  end if;

  select * into v_program
  from public.learning_programs
  where id = v_course.program_id;

  if not found then
    raise exception 'Learning program not found';
  end if;

  select status into v_space_status
  from public.learning_spaces
  where id = v_program.space_id;

  if not found then
    raise exception 'Learning space not found';
  end if;

  if v_space_status is distinct from 'active' then
    raise exception 'Learning space must be active for activity changes';
  end if;

  perform public.learning_activity_require_parent_program_status(v_program.status);
  perform public.learning_activity_require_parent_course_status(v_course.status);
  perform public.learning_activity_require_parent_section_status(v_section.status);
  perform public.learning_activity_require_parent_lesson_status(v_lesson.status);

  perform public.learning_activity_require_mutable_status(v_activity.status);

  if not public.can_manage_learning_activity(p_activity_id, v_uid)
     and not (
       public.is_learning_course_staff(v_section.course_id, v_uid)
       and public.learning_course_staff_role(v_section.course_id, v_uid)
           in ('instructor', 'content_editor', 'lead_instructor')
     )
  then
    raise exception 'Not allowed to update this activity settings';
  end if;

  -- Resolve the effective (post-update) numeric fields, honoring clear flags,
  -- then validate the combined scoring bounds fail-closed.
  v_final_max_score := case
    when p_clear_max_score then null
    when p_max_score is not null then p_max_score
    else v_settings.max_score
  end;
  v_final_passing_score := case
    when p_clear_passing_score then null
    when p_passing_score is not null then p_passing_score
    else v_settings.passing_score
  end;
  v_final_max_attempts := case
    when p_clear_max_attempts then null
    when p_max_attempts is not null then p_max_attempts
    else v_settings.max_attempts
  end;
  v_final_time_limit := case
    when p_clear_time_limit then null
    when p_time_limit_seconds is not null then p_time_limit_seconds
    else v_settings.time_limit_seconds
  end;

  perform public.learning_activity_validate_scoring(
    v_final_max_score,
    v_final_passing_score,
    v_final_max_attempts,
    v_final_time_limit
  );

  if p_evaluation_mode is not null then
    v_evaluation_mode := btrim(p_evaluation_mode);
    if v_evaluation_mode not in ('none', 'auto', 'manual', 'hybrid') then
      raise exception 'Invalid evaluation_mode';
    end if;
  end if;

  if p_completion_mode is not null then
    v_completion_mode := btrim(p_completion_mode);
    if v_completion_mode not in ('view', 'submit', 'score', 'manual') then
      raise exception 'Invalid completion_mode';
    end if;
  end if;

  if p_show_result_policy is not null then
    v_show_result_policy := btrim(p_show_result_policy);
    if v_show_result_policy not in (
      'never', 'immediately', 'after_submit', 'after_close', 'manual'
    ) then
      raise exception 'Invalid show_result_policy';
    end if;
  end if;

  if p_config is not null then
    perform public.learning_activity_validate_config(p_config);
  end if;

  update public.learning_activity_settings
  set
    is_required = coalesce(p_is_required, is_required),
    max_score = v_final_max_score,
    passing_score = v_final_passing_score,
    max_attempts = v_final_max_attempts,
    time_limit_seconds = v_final_time_limit,
    evaluation_mode = coalesce(v_evaluation_mode, evaluation_mode),
    completion_mode = coalesce(v_completion_mode, completion_mode),
    allow_late_submission = coalesce(
      p_allow_late_submission, allow_late_submission
    ),
    show_result_policy = coalesce(v_show_result_policy, show_result_policy),
    config = coalesce(p_config, config),
    updated_at = now()
  where activity_id = p_activity_id;

  -- Audit intentionally omits the config payload (may be large-ish; bounded but
  -- not stored in the audit trail).
  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'activity.settings_update',
    'learning_activity',
    p_activity_id::text,
    jsonb_build_object(
      'activity_id', p_activity_id,
      'lesson_id', v_activity.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'settings_updated', true
    )
  );

  return jsonb_build_object('activity_id', p_activity_id, 'settings_updated', true);
end;
$$;

create or replace function public.publish_learning_activity(
  p_activity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_activity public.learning_activities%rowtype;
  v_lesson public.learning_lessons%rowtype;
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_space_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_activity
  from public.learning_activities
  where id = p_activity_id
  for update;

  if not found then
    raise exception 'Learning activity not found';
  end if;

  select * into v_lesson
  from public.learning_lessons
  where id = v_activity.lesson_id;

  if not found then
    raise exception 'Learning lesson not found';
  end if;

  select * into v_section
  from public.learning_sections
  where id = v_lesson.section_id;

  if not found then
    raise exception 'Learning section not found';
  end if;

  select * into v_course
  from public.learning_courses
  where id = v_section.course_id;

  if not found then
    raise exception 'Learning course not found';
  end if;

  select * into v_program
  from public.learning_programs
  where id = v_course.program_id;

  if not found then
    raise exception 'Learning program not found';
  end if;

  select status into v_space_status
  from public.learning_spaces
  where id = v_program.space_id;

  if not found then
    raise exception 'Learning space not found';
  end if;

  if v_space_status is distinct from 'active' then
    raise exception 'Learning space must be active for activity changes';
  end if;

  -- Publishing fails closed when any parent is not in a mutable/published state.
  -- NOTE: a published activity does NOT require a *published* lesson — only that
  -- the lesson (and rest of the chain) is draft|published. Chain intersection
  -- at read time handles actual exposure.
  perform public.learning_activity_require_parent_program_status(v_program.status);
  perform public.learning_activity_require_parent_course_status(v_course.status);
  perform public.learning_activity_require_parent_section_status(v_section.status);
  perform public.learning_activity_require_parent_lesson_status(v_lesson.status);

  if not public.can_manage_learning_activity(p_activity_id, v_uid) then
    raise exception 'Not allowed to publish this activity';
  end if;

  if v_activity.status is distinct from 'draft' then
    raise exception 'Only draft activities can be published';
  end if;

  update public.learning_activities
  set status = 'published',
      published_at = coalesce(published_at, now()),
      suspended_at = null,
      archived_at = null,
      updated_at = now()
  where id = p_activity_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'activity.publish',
    'learning_activity',
    p_activity_id::text,
    jsonb_build_object(
      'activity_id', p_activity_id,
      'lesson_id', v_activity.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'from_status', v_activity.status,
      'to_status', 'published'
    )
  );

  return jsonb_build_object('activity_id', p_activity_id, 'status', 'published');
end;
$$;

create or replace function public.archive_learning_activity(
  p_activity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_activity public.learning_activities%rowtype;
  v_lesson public.learning_lessons%rowtype;
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_space_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_activity
  from public.learning_activities
  where id = p_activity_id
  for update;

  if not found then
    raise exception 'Learning activity not found';
  end if;

  select * into v_lesson
  from public.learning_lessons
  where id = v_activity.lesson_id;

  if not found then
    raise exception 'Learning lesson not found';
  end if;

  select * into v_section
  from public.learning_sections
  where id = v_lesson.section_id;

  if not found then
    raise exception 'Learning section not found';
  end if;

  select * into v_course
  from public.learning_courses
  where id = v_section.course_id;

  if not found then
    raise exception 'Learning course not found';
  end if;

  select * into v_program
  from public.learning_programs
  where id = v_course.program_id;

  if not found then
    raise exception 'Learning program not found';
  end if;

  select status into v_space_status
  from public.learning_spaces
  where id = v_program.space_id;

  if not found then
    raise exception 'Learning space not found';
  end if;

  if v_space_status is distinct from 'active' then
    raise exception 'Learning space must be active for activity changes';
  end if;

  -- Suspended activities: platform moderate only (no owner/lead archive bypass).
  if v_activity.status = 'suspended' then
    raise exception
      'Activity is suspended; only platform moderation may change it';
  end if;

  -- Parent gates still apply for normal archive.
  perform public.learning_activity_require_parent_program_status(v_program.status);
  perform public.learning_activity_require_parent_course_status(v_course.status);
  perform public.learning_activity_require_parent_section_status(v_section.status);
  perform public.learning_activity_require_parent_lesson_status(v_lesson.status);

  if not public.can_manage_learning_activity(p_activity_id, v_uid) then
    raise exception 'Not allowed to archive this activity';
  end if;

  if v_activity.status = 'archived' then
    return jsonb_build_object('activity_id', p_activity_id, 'status', 'archived');
  end if;

  update public.learning_activities
  set status = 'archived',
      archived_at = now(),
      suspended_at = null,
      updated_at = now()
  where id = p_activity_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'activity.archive',
    'learning_activity',
    p_activity_id::text,
    jsonb_build_object(
      'activity_id', p_activity_id,
      'lesson_id', v_activity.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'from_status', v_activity.status,
      'to_status', 'archived'
    )
  );

  return jsonb_build_object('activity_id', p_activity_id, 'status', 'archived');
end;
$$;

create or replace function public.moderate_learning_activity(
  p_activity_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_activity public.learning_activities%rowtype;
  v_lesson public.learning_lessons%rowtype;
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_to text := btrim(coalesce(p_status, ''));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_platform_admin(v_uid) then
    raise exception 'Platform admin required';
  end if;

  if v_to not in ('suspended', 'published', 'archived') then
    raise exception
      'moderate_learning_activity status must be suspended|published|archived';
  end if;

  select * into v_activity
  from public.learning_activities
  where id = p_activity_id
  for update;

  if not found then
    raise exception 'Learning activity not found';
  end if;

  select * into v_lesson
  from public.learning_lessons
  where id = v_activity.lesson_id;

  if not found then
    raise exception 'Learning lesson not found';
  end if;

  select * into v_section
  from public.learning_sections
  where id = v_lesson.section_id;

  if not found then
    raise exception 'Learning section not found';
  end if;

  select * into v_course
  from public.learning_courses
  where id = v_section.course_id;

  if not found then
    raise exception 'Learning course not found';
  end if;

  select * into v_program
  from public.learning_programs
  where id = v_course.program_id;

  if not found then
    raise exception 'Learning program not found';
  end if;

  if v_to = 'suspended' then
    update public.learning_activities
    set status = 'suspended',
        suspended_at = now(),
        archived_at = null,
        updated_at = now()
    where id = p_activity_id;
  elsif v_to = 'published' then
    update public.learning_activities
    set status = 'published',
        published_at = coalesce(published_at, now()),
        suspended_at = null,
        archived_at = null,
        updated_at = now()
    where id = p_activity_id;
  else
    update public.learning_activities
    set status = 'archived',
        archived_at = coalesce(archived_at, now()),
        suspended_at = null,
        updated_at = now()
    where id = p_activity_id;
  end if;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'activity.moderation',
    'learning_activity',
    p_activity_id::text,
    jsonb_build_object(
      'activity_id', p_activity_id,
      'lesson_id', v_activity.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'from_status', v_activity.status,
      'to_status', v_to
    )
  );

  return jsonb_build_object('activity_id', p_activity_id, 'status', v_to);
end;
$$;

-- Transactional reorder within a single lesson. Positions become 0..n-1.
-- Prevents unsafe cross-lesson reorder: every id must belong to the lesson and
-- the full unique set of the lesson's activity ids is required. lesson_id cannot
-- change here. This is the "order within the lesson's activity list for V1" — it
-- is NOT a global lesson-item order (see learning_lesson_items, not implemented).
create or replace function public.reorder_learning_activities(
  p_lesson_id uuid,
  p_activity_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lesson public.learning_lessons%rowtype;
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_space_status text;
  v_expected_count integer;
  v_provided_count integer;
  v_distinct_count integer;
  v_offset integer := 1000000;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_lesson_id is null then
    raise exception 'lesson_id is required';
  end if;

  if p_activity_ids is null then
    raise exception 'activity_ids is required';
  end if;

  -- Lock the parent lesson row for the duration of the two-phase update.
  select * into v_lesson
  from public.learning_lessons
  where id = p_lesson_id
  for update;

  if not found then
    raise exception 'Learning lesson not found';
  end if;

  select * into v_section
  from public.learning_sections
  where id = v_lesson.section_id;

  if not found then
    raise exception 'Learning section not found';
  end if;

  select * into v_course
  from public.learning_courses
  where id = v_section.course_id;

  if not found then
    raise exception 'Learning course not found';
  end if;

  select * into v_program
  from public.learning_programs
  where id = v_course.program_id;

  if not found then
    raise exception 'Learning program not found';
  end if;

  select status into v_space_status
  from public.learning_spaces
  where id = v_program.space_id;

  if not found then
    raise exception 'Learning space not found';
  end if;

  if v_space_status is distinct from 'active' then
    raise exception 'Learning space must be active for activity changes';
  end if;

  perform public.learning_activity_require_parent_program_status(v_program.status);
  perform public.learning_activity_require_parent_course_status(v_course.status);
  perform public.learning_activity_require_parent_section_status(v_section.status);
  perform public.learning_activity_require_parent_lesson_status(v_lesson.status);

  if not public.can_manage_learning_lesson(p_lesson_id, v_uid)
     and not public.can_manage_learning_space(v_program.space_id, v_uid)
  then
    raise exception 'Not allowed to reorder activities in this lesson';
  end if;

  select count(*)::integer
  into v_expected_count
  from public.learning_activities
  where lesson_id = p_lesson_id;

  v_provided_count := coalesce(cardinality(p_activity_ids), 0);

  if v_provided_count is distinct from v_expected_count then
    raise exception 'reorder_learning_activities requires all activity ids for the lesson';
  end if;

  select count(distinct x)::integer
  into v_distinct_count
  from unnest(p_activity_ids) as t(x);

  if v_distinct_count is distinct from v_provided_count then
    raise exception 'reorder_learning_activities activity_ids must be unique';
  end if;

  if exists (
    select 1
    from unnest(p_activity_ids) as t(id)
    where not exists (
      select 1
      from public.learning_activities act
      where act.id = t.id
        and act.lesson_id = p_lesson_id
    )
  ) then
    raise exception 'All activity_ids must belong to the lesson';
  end if;

  -- Reject if any activity is suspended/archived (normal mutation gate).
  if exists (
    select 1
    from public.learning_activities act
    where act.lesson_id = p_lesson_id
      and act.status in ('suspended', 'archived')
  ) then
    raise exception
      'Cannot reorder while an activity is suspended or archived';
  end if;

  -- Two-phase update avoids non-negative check conflicts during swap.
  update public.learning_activities act
  set position = v_offset + u.ord::integer,
      updated_at = now()
  from unnest(p_activity_ids) with ordinality as u(id, ord)
  where act.id = u.id
    and act.lesson_id = p_lesson_id;

  update public.learning_activities act
  set position = (u.ord::integer - 1),
      updated_at = now()
  from unnest(p_activity_ids) with ordinality as u(id, ord)
  where act.id = u.id
    and act.lesson_id = p_lesson_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'activity.reorder',
    'learning_lesson',
    p_lesson_id::text,
    jsonb_build_object(
      'lesson_id', p_lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'activity_ids', to_jsonb(p_activity_ids)
    )
  );

  return jsonb_build_object(
    'lesson_id', p_lesson_id,
    'count', v_provided_count,
    'reordered', true
  );
end;
$$;

-- RPC grants
revoke all on function public.create_learning_activity(
  uuid, text, text, text, text, text
) from public, anon;
grant execute on function public.create_learning_activity(
  uuid, text, text, text, text, text
) to authenticated, service_role;

revoke all on function public.update_learning_activity(
  uuid, text, text, text, jsonb, boolean
) from public, anon;
grant execute on function public.update_learning_activity(
  uuid, text, text, text, jsonb, boolean
) to authenticated, service_role;

revoke all on function public.update_learning_activity_settings(
  uuid, boolean, numeric, numeric, integer, integer, text, text, boolean, text,
  jsonb, boolean, boolean, boolean, boolean
) from public, anon;
grant execute on function public.update_learning_activity_settings(
  uuid, boolean, numeric, numeric, integer, integer, text, text, boolean, text,
  jsonb, boolean, boolean, boolean, boolean
) to authenticated, service_role;

revoke all on function public.publish_learning_activity(uuid)
  from public, anon;
grant execute on function public.publish_learning_activity(uuid)
  to authenticated, service_role;

revoke all on function public.archive_learning_activity(uuid)
  from public, anon;
grant execute on function public.archive_learning_activity(uuid)
  to authenticated, service_role;

revoke all on function public.moderate_learning_activity(uuid, text)
  from public, anon;
grant execute on function public.moderate_learning_activity(uuid, text)
  to authenticated, service_role;

revoke all on function public.reorder_learning_activities(uuid, uuid[])
  from public, anon;
grant execute on function public.reorder_learning_activities(uuid, uuid[])
  to authenticated, service_role;
