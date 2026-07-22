-- UMTUBA Learning OS — Sections Foundation V1
-- Additive. Sections + settings under learning_courses.
-- Hierarchy: Space → Program → Course → Section.
-- Depends on: 20260830_learning_courses_foundation_v1.sql
-- Does NOT: lessons, activities, assessments, assignments, quizzes, homework,
-- progress, enrollments, certificates, payments, marketplace, booking, calendar,
-- live delivery, AI tutor, UI, search, notifications.
--
-- Section = organizational educational module under exactly one Course (NOT a
-- lesson). Authority is INHERITED from the parent Course — there is NO dedicated
-- section-level staff table. Space remains the hard authority boundary and
-- Course authority stays membership-revalidated: a stale Course staff row must
-- NOT grant Section authority (helpers revalidate active space membership via
-- the Course helpers).
--
-- World hardening lesson: public/anon SELECT policies must NEVER call
-- is_platform_admin(). Use a separate authenticated admin policy.

-- ---------------------------------------------------------------------------
-- 1) learning_sections
-- ---------------------------------------------------------------------------

create table if not exists public.learning_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null
    references public.learning_courses (id) on delete restrict,
  slug text not null
    constraint learning_sections_slug_format check (
      char_length(slug) between 3 and 64
      and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  name text not null
    constraint learning_sections_name_len check (
      char_length(btrim(name)) between 1 and 160
    ),
  description text
    constraint learning_sections_description_len check (
      description is null or char_length(description) <= 8000
    ),
  status text not null default 'draft'
    constraint learning_sections_status_check check (
      status in ('draft', 'published', 'suspended', 'archived')
    ),
  visibility text not null default 'private'
    constraint learning_sections_visibility_check check (
      visibility in ('private', 'unlisted', 'public')
    ),
  position integer not null default 0
    constraint learning_sections_position_non_negative check (position >= 0),
  default_language text not null default 'en'
    constraint learning_sections_default_language_check check (
      default_language ~ '^[a-z]{2}(-[A-Z]{2})?$'
    ),
  -- Foundation metadata for future phases (no dependent features implemented).
  -- Section-appropriate surface only: readiness flags are limited to ai_ready and
  -- live_ready; marketplace/certification readiness stays on the parent Course.
  category text
    constraint learning_sections_category_len check (
      category is null or char_length(btrim(category)) between 1 and 80
    ),
  difficulty text
    constraint learning_sections_difficulty_check check (
      difficulty is null
      or difficulty in ('beginner', 'intermediate', 'advanced', 'expert')
    ),
  estimated_duration_minutes integer
    constraint learning_sections_duration_check check (
      estimated_duration_minutes is null
      or estimated_duration_minutes between 1 and 1000000
    ),
  target_audience text
    constraint learning_sections_target_audience_len check (
      target_audience is null or char_length(target_audience) <= 2000
    ),
  supported_languages text[] not null default '{}'::text[]
    constraint learning_sections_supported_languages_len check (
      cardinality(supported_languages) <= 32
    ),
  ai_ready boolean not null default false,
  live_ready boolean not null default false,
  branding_metadata jsonb not null default '{}'::jsonb
    constraint learning_sections_branding_object check (
      jsonb_typeof(branding_metadata) = 'object'
    ),
  seo_metadata jsonb not null default '{}'::jsonb
    constraint learning_sections_seo_object check (
      jsonb_typeof(seo_metadata) = 'object'
    ),
  ai_metadata jsonb not null default '{}'::jsonb
    constraint learning_sections_ai_object check (
      jsonb_typeof(ai_metadata) = 'object'
    ),
  created_by uuid not null
    references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  suspended_at timestamptz,
  archived_at timestamptz,
  constraint learning_sections_course_slug_unique unique (course_id, slug)
);

comment on table public.learning_sections is
  'Learning OS sections — organizational educational module under exactly one course. A section is NOT a lesson. Client writes only via RPCs. Authority inherits from the parent course; there is no section staff table. course_id is immutable after creation.';

comment on column public.learning_sections.course_id is
  'Immutable parent course. Cannot change via update or reorder.';

comment on column public.learning_sections.position is
  'Deterministic order within course; non-negative integer. Reorder via reorder_learning_sections.';

comment on column public.learning_sections.branding_metadata is
  'Foundation keys: cover_url, thumbnail_url, intro_video_url, logo_url (strings).';

comment on column public.learning_sections.seo_metadata is
  'Foundation keys: title, description, keywords (array of strings).';

comment on column public.learning_sections.ai_metadata is
  'Foundation keys: skills, outcomes, tags (arrays of strings).';

create index if not exists learning_sections_course_status_idx
  on public.learning_sections (course_id, status);

create index if not exists learning_sections_course_position_idx
  on public.learning_sections (course_id, position, id);

create index if not exists learning_sections_status_visibility_idx
  on public.learning_sections (status, visibility);

create index if not exists learning_sections_created_by_idx
  on public.learning_sections (created_by);

drop trigger if exists learning_sections_set_updated_at on public.learning_sections;
create trigger learning_sections_set_updated_at
  before update on public.learning_sections
  for each row execute function public.set_row_updated_at();

alter table public.learning_sections enable row level security;
alter table public.learning_sections force row level security;

revoke all on table public.learning_sections
  from public, anon, authenticated;
grant select on table public.learning_sections to anon, authenticated;
revoke insert, update, delete on table public.learning_sections
  from anon, authenticated;
grant all on table public.learning_sections to service_role;

-- ---------------------------------------------------------------------------
-- 2) learning_section_settings (1:1)
-- ---------------------------------------------------------------------------
-- Reserved settings are contracts only in V1 — INERT. No lesson unlock /
-- progress / ordering behavior is implemented anywhere yet.

create table if not exists public.learning_section_settings (
  section_id uuid primary key
    references public.learning_sections (id) on delete cascade,
  is_required boolean not null default true,
  enforce_lesson_order boolean not null default false,
  visible_when_locked boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.learning_section_settings is
  '1:1 section settings. Reserved flags (is_required, enforce_lesson_order, visible_when_locked) are inert contracts for a later Lessons slice.';

drop trigger if exists learning_section_settings_set_updated_at
  on public.learning_section_settings;
create trigger learning_section_settings_set_updated_at
  before update on public.learning_section_settings
  for each row execute function public.set_row_updated_at();

alter table public.learning_section_settings enable row level security;

revoke all on table public.learning_section_settings
  from public, anon, authenticated;
grant select on table public.learning_section_settings to authenticated;
revoke insert, update, delete on table public.learning_section_settings
  from authenticated;
grant all on table public.learning_section_settings to service_role;

-- ---------------------------------------------------------------------------
-- 3) Helpers (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
-- No section staff table: authority is inherited from the parent course.
-- Course helpers already revalidate active space membership, so a stale course
-- staff row cannot grant section authority through these helpers.

create or replace function public.can_manage_learning_section(
  p_section_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Platform admin OR whoever can manage the parent course (which itself
  -- revalidates active space membership for delegated course staff).
  select
    p_section_id is not null
    and p_user_id is not null
    and (
      public.is_platform_admin(p_user_id)
      or exists (
        select 1
        from public.learning_sections sec
        where sec.id = p_section_id
          and public.can_manage_learning_course(sec.course_id, p_user_id)
      )
    );
$$;

-- Create: can_manage_learning_course OR active course staff rank >= instructor.
-- Mirrors can_create_learning_course one level down. Course staff helpers
-- revalidate active space membership (stale staff row => no authority).
create or replace function public.can_create_learning_section(
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
      where c.id = p_course_id
        and (
          public.can_manage_learning_course(p_course_id, p_user_id)
          or (
            public.is_learning_course_staff(p_course_id, p_user_id)
            and coalesce(
              public.learning_course_staff_role_rank(
                public.learning_course_staff_role(p_course_id, p_user_id)
              ),
              0
            ) >= public.learning_course_staff_role_rank('instructor')
          )
        )
    );
$$;

revoke all on function public.can_manage_learning_section(uuid, uuid)
  from public, anon;
grant execute on function public.can_manage_learning_section(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.can_create_learning_section(uuid, uuid)
  from public, anon;
grant execute on function public.can_create_learning_section(uuid, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) RLS policies
-- ---------------------------------------------------------------------------
-- Public/anon path: NEVER call is_platform_admin() here.
-- Public discovery: section published+public AND course published+public
-- AND program published+public AND space active+public.

drop policy if exists "Public read published public sections"
  on public.learning_sections;
create policy "Public read published public sections"
  on public.learning_sections for select
  to anon, authenticated
  using (
    status = 'published'
    and visibility = 'public'
    and exists (
      select 1
      from public.learning_courses c
      join public.learning_programs p
        on p.id = c.program_id
      join public.learning_spaces s
        on s.id = p.space_id
      where c.id = learning_sections.course_id
        and c.status = 'published'
        and c.visibility = 'public'
        and p.status = 'published'
        and p.visibility = 'public'
        and s.status = 'active'
        and s.visibility = 'public'
    )
  );

drop policy if exists "Space members read accessible sections"
  on public.learning_sections;
create policy "Space members read accessible sections"
  on public.learning_sections for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_courses c
      join public.learning_programs p
        on p.id = c.program_id
      where c.id = learning_sections.course_id
        and public.is_learning_space_member(p.space_id)
        and (
          learning_sections.status = 'published'
          or public.can_manage_learning_space(p.space_id)
          or public.can_manage_learning_program(p.id)
          or public.can_manage_learning_course(c.id)
          or public.is_learning_course_staff(c.id)
        )
    )
  );

drop policy if exists "Section managers read sections"
  on public.learning_sections;
create policy "Section managers read sections"
  on public.learning_sections for select
  to authenticated
  using (public.can_manage_learning_section(id));

drop policy if exists "Platform admins read all sections"
  on public.learning_sections;
create policy "Platform admins read all sections"
  on public.learning_sections for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Members read section settings"
  on public.learning_section_settings;
create policy "Members read section settings"
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
          public.is_learning_space_member(p.space_id)
          or public.can_manage_learning_section(sec.id)
          or public.is_platform_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Internal validators
-- ---------------------------------------------------------------------------

create or replace function public.learning_section_validate_supported_languages(
  p_langs text[]
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  v_lang text;
begin
  if p_langs is null then
    raise exception 'supported_languages is required';
  end if;
  if cardinality(p_langs) > 32 then
    raise exception 'Too many supported languages';
  end if;
  foreach v_lang in array p_langs loop
    if v_lang is null or v_lang !~ '^[a-z]{2}(-[A-Z]{2})?$' then
      raise exception 'Invalid supported language';
    end if;
  end loop;
end;
$$;

-- Metadata JSON limits (foundation, not content storage) — same as Courses:
-- - type: object only
-- - max serialized size: 8192 bytes (octet_length of jsonb::text)
-- - branding keys allowlist: cover_url, thumbnail_url, intro_video_url, logo_url
--   (values: text, max 2048 chars each; no nesting)
-- - seo keys allowlist: title, description, keywords
--   (title/description: text max 512/2000; keywords: array <= 32 strings, each <= 80)
-- - ai keys allowlist: skills, outcomes, tags
--   (each: array <= 64 strings, each <= 120; no nesting)
create or replace function public.learning_section_validate_metadata_object(
  p_label text,
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
  v_allowed text[];
  v_max_bytes integer := 8192;
begin
  if p_value is null or jsonb_typeof(p_value) is distinct from 'object' then
    raise exception '% must be a JSON object', p_label;
  end if;

  if octet_length(p_value::text) > v_max_bytes then
    raise exception '% exceeds maximum size of % bytes', p_label, v_max_bytes;
  end if;

  if p_label = 'branding_metadata' then
    v_allowed := array[
      'cover_url',
      'thumbnail_url',
      'intro_video_url',
      'logo_url'
    ];
  elsif p_label = 'seo_metadata' then
    v_allowed := array['title', 'description', 'keywords'];
  elsif p_label = 'ai_metadata' then
    v_allowed := array['skills', 'outcomes', 'tags'];
  else
    raise exception 'Unknown metadata label: %', p_label;
  end if;

  for v_key in select jsonb_object_keys(p_value)
  loop
    if not (v_key = any (v_allowed)) then
      raise exception '% contains unexpected key: %', p_label, v_key;
    end if;

    v_elem := p_value -> v_key;

    if p_label = 'branding_metadata' then
      if jsonb_typeof(v_elem) is distinct from 'string' then
        raise exception '%.% must be a string', p_label, v_key;
      end if;
      if char_length(v_elem #>> '{}') > 2048 then
        raise exception '%.% exceeds maximum length', p_label, v_key;
      end if;

    elsif p_label = 'seo_metadata' then
      if v_key in ('title', 'description') then
        if jsonb_typeof(v_elem) is distinct from 'string' then
          raise exception '%.% must be a string', p_label, v_key;
        end if;
        if v_key = 'title' and char_length(v_elem #>> '{}') > 512 then
          raise exception '%.% exceeds maximum length', p_label, v_key;
        end if;
        if v_key = 'description' and char_length(v_elem #>> '{}') > 2000 then
          raise exception '%.% exceeds maximum length', p_label, v_key;
        end if;
      else
        -- keywords
        if jsonb_typeof(v_elem) is distinct from 'array' then
          raise exception '%.keywords must be an array', p_label;
        end if;
        if jsonb_array_length(v_elem) > 32 then
          raise exception '%.keywords exceeds maximum item count', p_label;
        end if;
        if exists (
          select 1
          from jsonb_array_elements_text(v_elem) as t(val)
          where char_length(t.val) > 80
        ) then
          raise exception '%.keywords item exceeds maximum length', p_label;
        end if;
      end if;

    else
      -- ai_metadata arrays
      if jsonb_typeof(v_elem) is distinct from 'array' then
        raise exception '%.% must be an array', p_label, v_key;
      end if;
      if jsonb_array_length(v_elem) > 64 then
        raise exception '%.% exceeds maximum item count', p_label, v_key;
      end if;
      if exists (
        select 1
        from jsonb_array_elements_text(v_elem) as t(val)
        where char_length(t.val) > 120
      ) then
        raise exception '%.% item exceeds maximum length', p_label, v_key;
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.learning_section_require_mutable_status(
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
      'Section is %; only platform moderation may change it',
      p_status;
  end if;
  if p_status is distinct from 'draft'
     and p_status is distinct from 'published'
  then
    raise exception 'Invalid section status for mutation';
  end if;
end;
$$;

-- Parent program must be draft|published (not suspended/archived).
create or replace function public.learning_section_require_parent_program_status(
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
      'Parent program must be draft or published for section changes';
  end if;
end;
$$;

-- Parent course must be draft|published (not suspended/archived).
create or replace function public.learning_section_require_parent_course_status(
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
      'Parent course must be draft or published for section changes';
  end if;
end;
$$;

revoke all on function public.learning_section_validate_supported_languages(text[])
  from public, anon, authenticated;
revoke all on function public.learning_section_validate_metadata_object(text, jsonb)
  from public, anon, authenticated;
revoke all on function public.learning_section_require_mutable_status(text)
  from public, anon, authenticated;
revoke all on function public.learning_section_require_parent_program_status(text)
  from public, anon, authenticated;
revoke all on function public.learning_section_require_parent_course_status(text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) RPCs
-- ---------------------------------------------------------------------------
-- Every mutation revalidates the full parent chain (space active; program
-- draft|published; course draft|published) and actor authority inherited from
-- the course. course_id is immutable — no RPC accepts a new course_id.

create or replace function public.create_learning_section(
  p_course_id uuid,
  p_slug text,
  p_name text,
  p_description text default null,
  p_visibility text default 'private',
  p_default_language text default 'en'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_space_status text;
  v_section_id uuid;
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_name text := btrim(coalesce(p_name, ''));
  v_visibility text := coalesce(nullif(btrim(p_visibility), ''), 'private');
  v_language text := coalesce(nullif(btrim(p_default_language), ''), 'en');
  v_position integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_course_id is null then
    raise exception 'course_id is required';
  end if;

  -- Lock the parent course row: serializes position assignment and prevents the
  -- course from being mutated out from under this insert.
  select * into v_course
  from public.learning_courses
  where id = p_course_id
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
    raise exception 'Learning space must be active for section changes';
  end if;

  perform public.learning_section_require_parent_program_status(v_program.status);
  perform public.learning_section_require_parent_course_status(v_course.status);

  if not public.can_create_learning_section(p_course_id, v_uid) then
    raise exception 'Not allowed to create sections in this course';
  end if;

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or char_length(v_slug) not between 3 and 64
  then
    raise exception 'Invalid learning section slug';
  end if;

  if char_length(v_name) not between 1 and 160 then
    raise exception 'Invalid learning section name';
  end if;

  if v_visibility not in ('private', 'unlisted', 'public') then
    raise exception 'Invalid learning section visibility';
  end if;

  if v_language !~ '^[a-z]{2}(-[A-Z]{2})?$' then
    raise exception 'Invalid default_language';
  end if;

  if p_description is not null and char_length(p_description) > 8000 then
    raise exception 'Description too long';
  end if;

  select coalesce(max(sec.position), -1) + 1
  into v_position
  from public.learning_sections sec
  where sec.course_id = p_course_id;

  insert into public.learning_sections (
    course_id,
    slug,
    name,
    description,
    status,
    visibility,
    position,
    default_language,
    created_by
  ) values (
    p_course_id,
    v_slug,
    v_name,
    nullif(p_description, ''),
    'draft',
    v_visibility,
    v_position,
    v_language,
    v_uid
  )
  returning id into v_section_id;

  insert into public.learning_section_settings (section_id)
  values (v_section_id);

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'section.create',
    'learning_section',
    v_section_id::text,
    jsonb_build_object(
      'course_id', p_course_id,
      'slug', v_slug,
      'visibility', v_visibility,
      'position', v_position
    )
  );

  return jsonb_build_object(
    'section_id', v_section_id,
    'course_id', p_course_id,
    'status', 'draft',
    'position', v_position
  );
end;
$$;

create or replace function public.update_learning_section(
  p_section_id uuid,
  p_name text default null,
  p_description text default null,
  p_visibility text default null,
  p_default_language text default null,
  p_category text default null,
  p_difficulty text default null,
  p_estimated_duration_minutes integer default null,
  p_target_audience text default null,
  p_supported_languages text[] default null,
  p_ai_ready boolean default null,
  p_live_ready boolean default null,
  p_branding_metadata jsonb default null,
  p_seo_metadata jsonb default null,
  p_ai_metadata jsonb default null,
  p_clear_description boolean default false,
  p_clear_category boolean default false,
  p_clear_difficulty boolean default false,
  p_clear_duration boolean default false,
  p_clear_target_audience boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_space_status text;
  v_name text;
  v_visibility text;
  v_language text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_section
  from public.learning_sections
  where id = p_section_id
  for update;

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
    raise exception 'Learning space must be active for section changes';
  end if;

  perform public.learning_section_require_parent_program_status(v_program.status);
  perform public.learning_section_require_parent_course_status(v_course.status);

  -- draft|published only; suspended/archived → platform moderate only
  perform public.learning_section_require_mutable_status(v_section.status);

  -- Authority inherited from course: manage the section, or be active course
  -- staff (instructor / content_editor / lead_instructor) — course staff helpers
  -- revalidate active space membership.
  if not public.can_manage_learning_section(p_section_id, v_uid)
     and not (
       public.is_learning_course_staff(v_section.course_id, v_uid)
       and public.learning_course_staff_role(v_section.course_id, v_uid)
           in ('instructor', 'content_editor', 'lead_instructor')
     )
  then
    raise exception 'Not allowed to update this section';
  end if;

  if p_name is not null then
    v_name := btrim(p_name);
    if char_length(v_name) not between 1 and 160 then
      raise exception 'Invalid learning section name';
    end if;
  end if;

  if p_visibility is not null then
    v_visibility := btrim(p_visibility);
    if v_visibility not in ('private', 'unlisted', 'public') then
      raise exception 'Invalid learning section visibility';
    end if;
  end if;

  if p_default_language is not null then
    v_language := btrim(p_default_language);
    if v_language !~ '^[a-z]{2}(-[A-Z]{2})?$' then
      raise exception 'Invalid default_language';
    end if;
  end if;

  if p_description is not null and char_length(p_description) > 8000 then
    raise exception 'Description too long';
  end if;

  if p_category is not null
     and char_length(btrim(p_category)) not between 1 and 80
  then
    raise exception 'Invalid category';
  end if;

  if p_difficulty is not null
     and p_difficulty not in ('beginner', 'intermediate', 'advanced', 'expert')
  then
    raise exception 'Invalid difficulty';
  end if;

  if p_estimated_duration_minutes is not null
     and p_estimated_duration_minutes not between 1 and 1000000
  then
    raise exception 'Invalid estimated_duration_minutes';
  end if;

  if p_target_audience is not null and char_length(p_target_audience) > 2000 then
    raise exception 'target_audience too long';
  end if;

  if p_supported_languages is not null then
    perform public.learning_section_validate_supported_languages(
      p_supported_languages
    );
  end if;

  if p_branding_metadata is not null then
    perform public.learning_section_validate_metadata_object(
      'branding_metadata',
      p_branding_metadata
    );
  end if;
  if p_seo_metadata is not null then
    perform public.learning_section_validate_metadata_object(
      'seo_metadata',
      p_seo_metadata
    );
  end if;
  if p_ai_metadata is not null then
    perform public.learning_section_validate_metadata_object(
      'ai_metadata',
      p_ai_metadata
    );
  end if;

  update public.learning_sections
  set
    name = coalesce(v_name, name),
    description = case
      when p_clear_description then null
      when p_description is not null then nullif(p_description, '')
      else description
    end,
    visibility = coalesce(v_visibility, visibility),
    default_language = coalesce(v_language, default_language),
    category = case
      when p_clear_category then null
      when p_category is not null then btrim(p_category)
      else category
    end,
    difficulty = case
      when p_clear_difficulty then null
      when p_difficulty is not null then p_difficulty
      else difficulty
    end,
    estimated_duration_minutes = case
      when p_clear_duration then null
      when p_estimated_duration_minutes is not null then p_estimated_duration_minutes
      else estimated_duration_minutes
    end,
    target_audience = case
      when p_clear_target_audience then null
      when p_target_audience is not null then nullif(p_target_audience, '')
      else target_audience
    end,
    supported_languages = coalesce(p_supported_languages, supported_languages),
    ai_ready = coalesce(p_ai_ready, ai_ready),
    live_ready = coalesce(p_live_ready, live_ready),
    branding_metadata = coalesce(p_branding_metadata, branding_metadata),
    seo_metadata = coalesce(p_seo_metadata, seo_metadata),
    ai_metadata = coalesce(p_ai_metadata, ai_metadata),
    updated_at = now()
  where id = p_section_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'section.update',
    'learning_section',
    p_section_id::text,
    jsonb_build_object('updated', true)
  );

  return jsonb_build_object('section_id', p_section_id, 'updated', true);
end;
$$;

create or replace function public.publish_learning_section(
  p_section_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_space_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_section
  from public.learning_sections
  where id = p_section_id
  for update;

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
    raise exception 'Learning space must be active for section changes';
  end if;

  -- Publishing fails closed when any parent is not in a mutable/published state.
  perform public.learning_section_require_parent_program_status(v_program.status);
  perform public.learning_section_require_parent_course_status(v_course.status);

  if not public.can_manage_learning_section(p_section_id, v_uid) then
    raise exception 'Not allowed to publish this section';
  end if;

  if v_section.status is distinct from 'draft' then
    raise exception 'Only draft sections can be published';
  end if;

  update public.learning_sections
  set status = 'published',
      published_at = coalesce(published_at, now()),
      suspended_at = null,
      archived_at = null,
      updated_at = now()
  where id = p_section_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'section.publish',
    'learning_section',
    p_section_id::text,
    jsonb_build_object(
      'from_status', v_section.status,
      'to_status', 'published'
    )
  );

  return jsonb_build_object('section_id', p_section_id, 'status', 'published');
end;
$$;

create or replace function public.archive_learning_section(
  p_section_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_space_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_section
  from public.learning_sections
  where id = p_section_id
  for update;

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
    raise exception 'Learning space must be active for section changes';
  end if;

  -- Suspended sections: platform moderate only (no owner/lead archive bypass).
  if v_section.status = 'suspended' then
    raise exception
      'Section is suspended; only platform moderation may change it';
  end if;

  -- Parent gates still apply for normal archive.
  perform public.learning_section_require_parent_program_status(v_program.status);
  perform public.learning_section_require_parent_course_status(v_course.status);

  if not public.can_manage_learning_section(p_section_id, v_uid) then
    raise exception 'Not allowed to archive this section';
  end if;

  if v_section.status = 'archived' then
    return jsonb_build_object('section_id', p_section_id, 'status', 'archived');
  end if;

  update public.learning_sections
  set status = 'archived',
      archived_at = now(),
      suspended_at = null,
      updated_at = now()
  where id = p_section_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'section.archive',
    'learning_section',
    p_section_id::text,
    jsonb_build_object(
      'from_status', v_section.status,
      'to_status', 'archived'
    )
  );

  return jsonb_build_object('section_id', p_section_id, 'status', 'archived');
end;
$$;

create or replace function public.moderate_learning_section(
  p_section_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
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
      'moderate_learning_section status must be suspended|published|archived';
  end if;

  select * into v_section
  from public.learning_sections
  where id = p_section_id
  for update;

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
    update public.learning_sections
    set status = 'suspended',
        suspended_at = now(),
        archived_at = null,
        updated_at = now()
    where id = p_section_id;
  elsif v_to = 'published' then
    update public.learning_sections
    set status = 'published',
        published_at = coalesce(published_at, now()),
        suspended_at = null,
        archived_at = null,
        updated_at = now()
    where id = p_section_id;
  else
    update public.learning_sections
    set status = 'archived',
        archived_at = coalesce(archived_at, now()),
        suspended_at = null,
        updated_at = now()
    where id = p_section_id;
  end if;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'section.moderation',
    'learning_section',
    p_section_id::text,
    jsonb_build_object(
      'from_status', v_section.status,
      'to_status', v_to
    )
  );

  return jsonb_build_object('section_id', p_section_id, 'status', v_to);
end;
$$;

-- Transactional reorder within a single course. Positions become 0..n-1.
-- Prevents unsafe cross-course reorder: every id must belong to the course and
-- the full unique set of the course's section ids is required. course_id cannot
-- change here.
create or replace function public.reorder_learning_sections(
  p_course_id uuid,
  p_section_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
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

  if p_course_id is null then
    raise exception 'course_id is required';
  end if;

  if p_section_ids is null then
    raise exception 'section_ids is required';
  end if;

  -- Lock the parent course row for the duration of the two-phase update.
  select * into v_course
  from public.learning_courses
  where id = p_course_id
  for update;

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
    raise exception 'Learning space must be active for section changes';
  end if;

  perform public.learning_section_require_parent_program_status(v_program.status);
  perform public.learning_section_require_parent_course_status(v_course.status);

  if not public.can_manage_learning_course(p_course_id, v_uid)
     and not public.can_manage_learning_space(v_program.space_id, v_uid)
  then
    raise exception 'Not allowed to reorder sections in this course';
  end if;

  select count(*)::integer
  into v_expected_count
  from public.learning_sections
  where course_id = p_course_id;

  v_provided_count := coalesce(cardinality(p_section_ids), 0);

  if v_provided_count is distinct from v_expected_count then
    raise exception 'reorder_learning_sections requires all section ids for the course';
  end if;

  select count(distinct x)::integer
  into v_distinct_count
  from unnest(p_section_ids) as t(x);

  if v_distinct_count is distinct from v_provided_count then
    raise exception 'reorder_learning_sections section_ids must be unique';
  end if;

  if exists (
    select 1
    from unnest(p_section_ids) as t(id)
    where not exists (
      select 1
      from public.learning_sections sec
      where sec.id = t.id
        and sec.course_id = p_course_id
    )
  ) then
    raise exception 'All section_ids must belong to the course';
  end if;

  -- Reject if any section is suspended/archived (normal mutation gate).
  if exists (
    select 1
    from public.learning_sections sec
    where sec.course_id = p_course_id
      and sec.status in ('suspended', 'archived')
  ) then
    raise exception
      'Cannot reorder while a section is suspended or archived';
  end if;

  -- Two-phase update avoids non-negative check conflicts during swap.
  update public.learning_sections sec
  set position = v_offset + u.ord::integer,
      updated_at = now()
  from unnest(p_section_ids) with ordinality as u(id, ord)
  where sec.id = u.id
    and sec.course_id = p_course_id;

  update public.learning_sections sec
  set position = (u.ord::integer - 1),
      updated_at = now()
  from unnest(p_section_ids) with ordinality as u(id, ord)
  where sec.id = u.id
    and sec.course_id = p_course_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'section.reorder',
    'learning_course',
    p_course_id::text,
    jsonb_build_object(
      'course_id', p_course_id,
      'section_ids', to_jsonb(p_section_ids)
    )
  );

  return jsonb_build_object(
    'course_id', p_course_id,
    'count', v_provided_count,
    'reordered', true
  );
end;
$$;

-- RPC grants
revoke all on function public.create_learning_section(
  uuid, text, text, text, text, text
) from public, anon;
grant execute on function public.create_learning_section(
  uuid, text, text, text, text, text
) to authenticated, service_role;

revoke all on function public.update_learning_section(
  uuid, text, text, text, text, text, text, integer, text, text[],
  boolean, boolean, jsonb, jsonb, jsonb,
  boolean, boolean, boolean, boolean, boolean
) from public, anon;
grant execute on function public.update_learning_section(
  uuid, text, text, text, text, text, text, integer, text, text[],
  boolean, boolean, jsonb, jsonb, jsonb,
  boolean, boolean, boolean, boolean, boolean
) to authenticated, service_role;

revoke all on function public.publish_learning_section(uuid)
  from public, anon;
grant execute on function public.publish_learning_section(uuid)
  to authenticated, service_role;

revoke all on function public.archive_learning_section(uuid)
  from public, anon;
grant execute on function public.archive_learning_section(uuid)
  to authenticated, service_role;

revoke all on function public.moderate_learning_section(uuid, text)
  from public, anon;
grant execute on function public.moderate_learning_section(uuid, text)
  to authenticated, service_role;

revoke all on function public.reorder_learning_sections(uuid, uuid[])
  from public, anon;
grant execute on function public.reorder_learning_sections(uuid, uuid[])
  to authenticated, service_role;
