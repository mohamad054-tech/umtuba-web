-- UMTUBA Learning OS — Programs Foundation V1
-- Additive. Programs + staff + settings under learning_spaces.
-- Depends on: 20260828_learning_spaces_membership_foundation_v1.sql
-- Does NOT: courses, enrollments, progress, certificates, payments, marketplace,
-- calendar, booking, live delivery, AI tutor, UI.
--
-- World hardening lesson: public/anon SELECT policies must NEVER call
-- is_platform_admin(). Use a separate authenticated admin policy.

-- ---------------------------------------------------------------------------
-- 1) learning_programs
-- ---------------------------------------------------------------------------

create table if not exists public.learning_programs (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null
    references public.learning_spaces (id) on delete restrict,
  slug text not null
    constraint learning_programs_slug_format check (
      char_length(slug) between 3 and 64
      and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  name text not null
    constraint learning_programs_name_len check (
      char_length(btrim(name)) between 1 and 160
    ),
  description text
    constraint learning_programs_description_len check (
      description is null or char_length(description) <= 8000
    ),
  format text not null
    constraint learning_programs_format_check check (
      format in (
        'self_paced',
        'cohort',
        'live_group',
        'tutoring_1to1',
        'hybrid'
      )
    ),
  status text not null default 'draft'
    constraint learning_programs_status_check check (
      status in ('draft', 'published', 'suspended', 'archived')
    ),
  visibility text not null default 'private'
    constraint learning_programs_visibility_check check (
      visibility in ('private', 'unlisted', 'public')
    ),
  default_language text not null default 'en'
    constraint learning_programs_default_language_check check (
      default_language ~ '^[a-z]{2}(-[A-Z]{2})?$'
    ),
  -- Foundation metadata for future phases (no dependent features implemented).
  category text
    constraint learning_programs_category_len check (
      category is null or char_length(btrim(category)) between 1 and 80
    ),
  difficulty text
    constraint learning_programs_difficulty_check check (
      difficulty is null
      or difficulty in ('beginner', 'intermediate', 'advanced', 'expert')
    ),
  estimated_duration_minutes integer
    constraint learning_programs_duration_check check (
      estimated_duration_minutes is null
      or estimated_duration_minutes between 1 and 1000000
    ),
  target_audience text
    constraint learning_programs_target_audience_len check (
      target_audience is null or char_length(target_audience) <= 2000
    ),
  supported_languages text[] not null default '{}'::text[]
    constraint learning_programs_supported_languages_len check (
      cardinality(supported_languages) <= 32
    ),
  ai_ready boolean not null default false,
  marketplace_ready boolean not null default false,
  certification_ready boolean not null default false,
  live_ready boolean not null default false,
  branding_metadata jsonb not null default '{}'::jsonb
    constraint learning_programs_branding_object check (
      jsonb_typeof(branding_metadata) = 'object'
    ),
  seo_metadata jsonb not null default '{}'::jsonb
    constraint learning_programs_seo_object check (
      jsonb_typeof(seo_metadata) = 'object'
    ),
  ai_metadata jsonb not null default '{}'::jsonb
    constraint learning_programs_ai_object check (
      jsonb_typeof(ai_metadata) = 'object'
    ),
  created_by uuid not null
    references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  suspended_at timestamptz,
  archived_at timestamptz,
  constraint learning_programs_space_slug_unique unique (space_id, slug)
);

comment on table public.learning_programs is
  'Learning OS programs — content/offering root under a space. Client writes only via RPCs. No program ownership transfer in V1.';

comment on column public.learning_programs.branding_metadata is
  'Foundation keys: cover_url, thumbnail_url, intro_video_url, logo_url (strings).';

comment on column public.learning_programs.seo_metadata is
  'Foundation keys: title, description, keywords (array of strings).';

comment on column public.learning_programs.ai_metadata is
  'Foundation keys: skills, outcomes, tags (arrays of strings).';

create index if not exists learning_programs_space_status_idx
  on public.learning_programs (space_id, status);

create index if not exists learning_programs_status_visibility_idx
  on public.learning_programs (status, visibility);

create index if not exists learning_programs_format_idx
  on public.learning_programs (format);

create index if not exists learning_programs_created_by_idx
  on public.learning_programs (created_by);

drop trigger if exists learning_programs_set_updated_at on public.learning_programs;
create trigger learning_programs_set_updated_at
  before update on public.learning_programs
  for each row execute function public.set_row_updated_at();

alter table public.learning_programs enable row level security;
alter table public.learning_programs force row level security;

revoke all on table public.learning_programs
  from public, anon, authenticated;
grant select on table public.learning_programs to anon, authenticated;
revoke insert, update, delete on table public.learning_programs
  from anon, authenticated;
grant all on table public.learning_programs to service_role;

-- ---------------------------------------------------------------------------
-- 2) learning_program_staff
-- ---------------------------------------------------------------------------

create table if not exists public.learning_program_staff (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null
    references public.learning_programs (id) on delete cascade,
  user_id uuid not null
    references public.profiles (id) on delete cascade,
  role text not null
    constraint learning_program_staff_role_check check (
      role in (
        'lead_instructor',
        'instructor',
        'teaching_assistant',
        'content_editor'
      )
    ),
  status text not null default 'active'
    constraint learning_program_staff_status_check check (
      status in ('active', 'removed')
    ),
  assigned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_program_staff_program_user_unique unique (program_id, user_id)
);

comment on table public.learning_program_staff is
  'Program staff assignments. Space ownership remains authoritative; no program ownership transfer.';

create index if not exists learning_program_staff_user_idx
  on public.learning_program_staff (user_id);

create index if not exists learning_program_staff_program_status_idx
  on public.learning_program_staff (program_id, status);

drop trigger if exists learning_program_staff_set_updated_at
  on public.learning_program_staff;
create trigger learning_program_staff_set_updated_at
  before update on public.learning_program_staff
  for each row execute function public.set_row_updated_at();

alter table public.learning_program_staff enable row level security;
alter table public.learning_program_staff force row level security;

revoke all on table public.learning_program_staff
  from public, anon, authenticated;
grant select on table public.learning_program_staff to authenticated;
revoke insert, update, delete on table public.learning_program_staff
  from authenticated;
grant all on table public.learning_program_staff to service_role;

-- ---------------------------------------------------------------------------
-- 3) learning_program_settings (1:1)
-- ---------------------------------------------------------------------------

create table if not exists public.learning_program_settings (
  program_id uuid primary key
    references public.learning_programs (id) on delete cascade,
  allow_self_enroll boolean not null default false,
  require_space_membership boolean not null default true,
  public_syllabus boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.learning_program_settings is
  '1:1 program settings. Enrollment flags are reserved for a later slice.';

drop trigger if exists learning_program_settings_set_updated_at
  on public.learning_program_settings;
create trigger learning_program_settings_set_updated_at
  before update on public.learning_program_settings
  for each row execute function public.set_row_updated_at();

alter table public.learning_program_settings enable row level security;

revoke all on table public.learning_program_settings
  from public, anon, authenticated;
grant select on table public.learning_program_settings to authenticated;
revoke insert, update, delete on table public.learning_program_settings
  from authenticated;
grant all on table public.learning_program_settings to service_role;

-- ---------------------------------------------------------------------------
-- 4) Helpers (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

create or replace function public.learning_program_staff_role_rank(p_role text)
returns integer
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  return case p_role
    when 'lead_instructor' then 80
    when 'instructor' then 60
    when 'teaching_assistant' then 50
    when 'content_editor' then 40
    else null
  end;
end;
$$;

create or replace function public.is_learning_program_staff(
  p_program_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Fail-closed: active staff row alone is insufficient; parent space
  -- membership must also be active (revalidated on every check).
  select
    p_program_id is not null
    and p_user_id is not null
    and exists (
      select 1
      from public.learning_program_staff s
      join public.learning_programs p
        on p.id = s.program_id
      where s.program_id = p_program_id
        and s.user_id = p_user_id
        and s.status = 'active'
        and public.is_learning_space_member(p.space_id, p_user_id)
    );
$$;

create or replace function public.learning_program_staff_role(
  p_program_id uuid,
  p_user_id uuid default auth.uid()
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  -- Returns null unless staff row is active AND space membership is active.
  select s.role
  from public.learning_program_staff s
  join public.learning_programs p
    on p.id = s.program_id
  where s.program_id = p_program_id
    and s.user_id = p_user_id
    and s.status = 'active'
    and public.is_learning_space_member(p.space_id, p_user_id)
  limit 1;
$$;

create or replace function public.can_manage_learning_program(
  p_program_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_program_id is not null
    and p_user_id is not null
    and (
      public.is_platform_admin(p_user_id)
      or exists (
        select 1
        from public.learning_programs p
        where p.id = p_program_id
          and public.can_manage_learning_space(p.space_id, p_user_id)
      )
      or exists (
        select 1
        from public.learning_program_staff s
        join public.learning_programs p
          on p.id = s.program_id
        where s.program_id = p_program_id
          and s.user_id = p_user_id
          and s.status = 'active'
          and s.role = 'lead_instructor'
          and public.is_learning_space_member(p.space_id, p_user_id)
      )
    );
$$;

create or replace function public.can_create_learning_program(
  p_space_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_space_id is not null
    and p_user_id is not null
    and (
      public.can_manage_learning_space(p_space_id, p_user_id)
      or (
        public.is_learning_space_member(p_space_id, p_user_id)
        and public.learning_space_role_at_least(
          public.learning_space_member_role(p_space_id, p_user_id),
          'instructor'
        )
      )
    );
$$;

revoke all on function public.learning_program_staff_role_rank(text)
  from public, anon;
grant execute on function public.learning_program_staff_role_rank(text)
  to authenticated, service_role;

revoke all on function public.is_learning_program_staff(uuid, uuid)
  from public, anon;
grant execute on function public.is_learning_program_staff(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.learning_program_staff_role(uuid, uuid)
  from public, anon;
grant execute on function public.learning_program_staff_role(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.can_manage_learning_program(uuid, uuid)
  from public, anon;
grant execute on function public.can_manage_learning_program(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.can_create_learning_program(uuid, uuid)
  from public, anon;
grant execute on function public.can_create_learning_program(uuid, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) RLS policies
-- ---------------------------------------------------------------------------
-- Public/anon path: NEVER call is_platform_admin() here.

drop policy if exists "Public read published public programs"
  on public.learning_programs;
create policy "Public read published public programs"
  on public.learning_programs for select
  to anon, authenticated
  using (
    status = 'published'
    and visibility = 'public'
    and exists (
      select 1
      from public.learning_spaces s
      where s.id = learning_programs.space_id
        and s.status = 'active'
        and s.visibility = 'public'
    )
  );

drop policy if exists "Space members read accessible programs"
  on public.learning_programs;
create policy "Space members read accessible programs"
  on public.learning_programs for select
  to authenticated
  using (
    public.is_learning_space_member(space_id)
    and (
      status = 'published'
      or public.can_manage_learning_space(space_id)
      or public.is_learning_program_staff(id)
    )
  );

drop policy if exists "Program managers read programs"
  on public.learning_programs;
create policy "Program managers read programs"
  on public.learning_programs for select
  to authenticated
  using (public.can_manage_learning_program(id));

drop policy if exists "Platform admins read all programs"
  on public.learning_programs;
create policy "Platform admins read all programs"
  on public.learning_programs for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Staff and managers read program staff"
  on public.learning_program_staff;
create policy "Staff and managers read program staff"
  on public.learning_program_staff for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.can_manage_learning_program(program_id)
    or public.is_learning_program_staff(program_id)
    or public.is_platform_admin()
  );

drop policy if exists "Members read program settings"
  on public.learning_program_settings;
create policy "Members read program settings"
  on public.learning_program_settings for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_programs p
      where p.id = learning_program_settings.program_id
        and (
          public.is_learning_space_member(p.space_id)
          or public.can_manage_learning_program(p.id)
          or public.is_platform_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 6) Internal validators
-- ---------------------------------------------------------------------------

create or replace function public.learning_program_validate_supported_languages(
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

-- Metadata JSON limits (foundation, not content storage):
-- - type: object only
-- - max serialized size: 8192 bytes (octet_length of jsonb::text)
-- - branding keys allowlist: cover_url, thumbnail_url, intro_video_url, logo_url
--   (values: text, max 2048 chars each; no nesting)
-- - seo keys allowlist: title, description, keywords
--   (title/description: text max 512/2000; keywords: array <= 32 strings, each <= 80)
-- - ai keys allowlist: skills, outcomes, tags
--   (each: array <= 64 strings, each <= 120; no nesting)
create or replace function public.learning_program_validate_metadata_object(
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

create or replace function public.learning_program_require_mutable_status(
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
      'Program is %; only platform moderation may change it',
      p_status;
  end if;
  if p_status is distinct from 'draft'
     and p_status is distinct from 'published'
  then
    raise exception 'Invalid program status for mutation';
  end if;
end;
$$;

revoke all on function public.learning_program_validate_supported_languages(text[])
  from public, anon, authenticated;
revoke all on function public.learning_program_validate_metadata_object(text, jsonb)
  from public, anon, authenticated;
revoke all on function public.learning_program_require_mutable_status(text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7) RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_learning_program(
  p_space_id uuid,
  p_slug text,
  p_name text,
  p_format text,
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
  v_space public.learning_spaces%rowtype;
  v_program_id uuid;
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_name text := btrim(coalesce(p_name, ''));
  v_visibility text := coalesce(nullif(btrim(p_visibility), ''), 'private');
  v_language text := coalesce(nullif(btrim(p_default_language), ''), 'en');
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_space_id is null then
    raise exception 'space_id is required';
  end if;

  select * into v_space
  from public.learning_spaces
  where id = p_space_id
  for update;

  if not found then
    raise exception 'Learning space not found';
  end if;

  if v_space.status is distinct from 'active' then
    raise exception 'Learning space must be active for program changes';
  end if;

  if not public.can_create_learning_program(p_space_id, v_uid) then
    raise exception 'Not allowed to create programs in this space';
  end if;

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or char_length(v_slug) not between 3 and 64
  then
    raise exception 'Invalid learning program slug';
  end if;

  if char_length(v_name) not between 1 and 160 then
    raise exception 'Invalid learning program name';
  end if;

  if p_format not in (
    'self_paced',
    'cohort',
    'live_group',
    'tutoring_1to1',
    'hybrid'
  ) then
    raise exception 'Invalid learning program format';
  end if;

  if v_visibility not in ('private', 'unlisted', 'public') then
    raise exception 'Invalid learning program visibility';
  end if;

  if v_language !~ '^[a-z]{2}(-[A-Z]{2})?$' then
    raise exception 'Invalid default_language';
  end if;

  if p_description is not null and char_length(p_description) > 8000 then
    raise exception 'Description too long';
  end if;

  insert into public.learning_programs (
    space_id,
    slug,
    name,
    description,
    format,
    status,
    visibility,
    default_language,
    created_by
  ) values (
    p_space_id,
    v_slug,
    v_name,
    nullif(p_description, ''),
    p_format,
    'draft',
    v_visibility,
    v_language,
    v_uid
  )
  returning id into v_program_id;

  insert into public.learning_program_settings (program_id)
  values (v_program_id);

  -- Creator who is instructor+ becomes lead_instructor when not a space manager.
  if not public.can_manage_learning_space(p_space_id, v_uid) then
    insert into public.learning_program_staff (
      program_id,
      user_id,
      role,
      status,
      assigned_by
    ) values (
      v_program_id,
      v_uid,
      'lead_instructor',
      'active',
      v_uid
    );
  end if;

  perform public.learning_audit_write(
    v_uid,
    p_space_id,
    'program.create',
    'learning_program',
    v_program_id::text,
    jsonb_build_object(
      'slug', v_slug,
      'format', p_format,
      'visibility', v_visibility
    )
  );

  return jsonb_build_object(
    'program_id', v_program_id,
    'space_id', p_space_id,
    'status', 'draft'
  );
end;
$$;

create or replace function public.update_learning_program(
  p_program_id uuid,
  p_name text default null,
  p_description text default null,
  p_format text default null,
  p_visibility text default null,
  p_default_language text default null,
  p_category text default null,
  p_difficulty text default null,
  p_estimated_duration_minutes integer default null,
  p_target_audience text default null,
  p_supported_languages text[] default null,
  p_ai_ready boolean default null,
  p_marketplace_ready boolean default null,
  p_certification_ready boolean default null,
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
  v_program public.learning_programs%rowtype;
  v_space_status text;
  v_name text;
  v_visibility text;
  v_language text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_program
  from public.learning_programs
  where id = p_program_id
  for update;

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
    raise exception 'Learning space must be active for program changes';
  end if;

  -- draft|published only; suspended/archived → platform moderate only
  perform public.learning_program_require_mutable_status(v_program.status);

  if not public.can_manage_learning_program(p_program_id, v_uid)
     and not (
       public.is_learning_program_staff(p_program_id, v_uid)
       and public.learning_program_staff_role(p_program_id, v_uid)
           in ('instructor', 'content_editor', 'lead_instructor')
     )
  then
    raise exception 'Not allowed to update this program';
  end if;

  if p_format is not null then
    if v_program.status is distinct from 'draft' then
      raise exception 'Format can only change while program is draft';
    end if;
    if p_format not in (
      'self_paced',
      'cohort',
      'live_group',
      'tutoring_1to1',
      'hybrid'
    ) then
      raise exception 'Invalid learning program format';
    end if;
  end if;

  if p_name is not null then
    v_name := btrim(p_name);
    if char_length(v_name) not between 1 and 160 then
      raise exception 'Invalid learning program name';
    end if;
  end if;

  if p_visibility is not null then
    v_visibility := btrim(p_visibility);
    if v_visibility not in ('private', 'unlisted', 'public') then
      raise exception 'Invalid learning program visibility';
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
    perform public.learning_program_validate_supported_languages(
      p_supported_languages
    );
  end if;

  if p_branding_metadata is not null then
    perform public.learning_program_validate_metadata_object(
      'branding_metadata',
      p_branding_metadata
    );
  end if;
  if p_seo_metadata is not null then
    perform public.learning_program_validate_metadata_object(
      'seo_metadata',
      p_seo_metadata
    );
  end if;
  if p_ai_metadata is not null then
    perform public.learning_program_validate_metadata_object(
      'ai_metadata',
      p_ai_metadata
    );
  end if;

  update public.learning_programs
  set
    name = coalesce(v_name, name),
    description = case
      when p_clear_description then null
      when p_description is not null then nullif(p_description, '')
      else description
    end,
    format = coalesce(p_format, format),
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
    marketplace_ready = coalesce(p_marketplace_ready, marketplace_ready),
    certification_ready = coalesce(p_certification_ready, certification_ready),
    live_ready = coalesce(p_live_ready, live_ready),
    branding_metadata = coalesce(p_branding_metadata, branding_metadata),
    seo_metadata = coalesce(p_seo_metadata, seo_metadata),
    ai_metadata = coalesce(p_ai_metadata, ai_metadata),
    updated_at = now()
  where id = p_program_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'program.update',
    'learning_program',
    p_program_id::text,
    jsonb_build_object('updated', true)
  );

  return jsonb_build_object('program_id', p_program_id, 'updated', true);
end;
$$;

create or replace function public.assign_learning_program_staff(
  p_program_id uuid,
  p_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_program public.learning_programs%rowtype;
  v_space_status text;
  v_actor_is_space_manager boolean;
  v_actor_staff_role text;
  v_target_space_role text;
  v_staff_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_program_id is null or p_user_id is null then
    raise exception 'program_id and user_id are required';
  end if;

  if p_role not in (
    'lead_instructor',
    'instructor',
    'teaching_assistant',
    'content_editor'
  ) then
    raise exception 'Invalid program staff role';
  end if;

  select * into v_program
  from public.learning_programs
  where id = p_program_id
  for update;

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
    raise exception 'Learning space must be active for program changes';
  end if;

  perform public.learning_program_require_mutable_status(v_program.status);

  v_actor_is_space_manager := public.can_manage_learning_space(
    v_program.space_id,
    v_uid
  );
  v_actor_staff_role := public.learning_program_staff_role(p_program_id, v_uid);

  if not v_actor_is_space_manager
     and not public.is_platform_admin(v_uid)
  then
    if v_actor_staff_role is distinct from 'lead_instructor' then
      raise exception 'Not allowed to assign program staff';
    end if;
    -- Lead instructor may assign assistants/editors only.
    if p_role not in ('teaching_assistant', 'content_editor') then
      raise exception 'Lead instructor cannot assign this staff role';
    end if;
  end if;

  if not public.is_learning_space_member(v_program.space_id, p_user_id) then
    raise exception 'Staff must be an active space member';
  end if;

  v_target_space_role := public.learning_space_member_role(
    v_program.space_id,
    p_user_id
  );

  if p_role in ('lead_instructor', 'instructor')
     and not public.learning_space_role_at_least(v_target_space_role, 'instructor')
  then
    raise exception 'Teaching staff require space instructor rank or higher';
  end if;

  insert into public.learning_program_staff (
    program_id,
    user_id,
    role,
    status,
    assigned_by
  ) values (
    p_program_id,
    p_user_id,
    p_role,
    'active',
    v_uid
  )
  on conflict (program_id, user_id) do update
  set role = excluded.role,
      status = 'active',
      assigned_by = excluded.assigned_by,
      updated_at = now()
  returning id into v_staff_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'program.staff_assign',
    'learning_program_staff',
    v_staff_id::text,
    jsonb_build_object(
      'program_id', p_program_id,
      'user_id', p_user_id,
      'role', p_role
    )
  );

  return jsonb_build_object(
    'program_id', p_program_id,
    'user_id', p_user_id,
    'role', p_role,
    'status', 'active'
  );
end;
$$;

create or replace function public.remove_learning_program_staff(
  p_program_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_program public.learning_programs%rowtype;
  v_space_status text;
  v_target public.learning_program_staff%rowtype;
  v_actor_is_space_manager boolean;
  v_actor_staff_role text;
  v_target_rank integer;
  v_actor_rank integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_program
  from public.learning_programs
  where id = p_program_id
  for update;

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
    raise exception 'Learning space must be active for program changes';
  end if;

  perform public.learning_program_require_mutable_status(v_program.status);

  select * into v_target
  from public.learning_program_staff
  where program_id = p_program_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Program staff member not found';
  end if;

  v_actor_is_space_manager := public.can_manage_learning_space(
    v_program.space_id,
    v_uid
  );
  v_actor_staff_role := public.learning_program_staff_role(p_program_id, v_uid);

  if not v_actor_is_space_manager
     and not public.is_platform_admin(v_uid)
  then
    if v_actor_staff_role is distinct from 'lead_instructor' then
      raise exception 'Not allowed to remove program staff';
    end if;
    v_actor_rank := public.learning_program_staff_role_rank(v_actor_staff_role);
    v_target_rank := public.learning_program_staff_role_rank(v_target.role);
    if v_actor_rank is null
       or v_target_rank is null
       or not (v_target_rank < v_actor_rank)
    then
      raise exception 'Cannot manage a peer or higher-ranked program staff member';
    end if;
  end if;

  update public.learning_program_staff
  set status = 'removed',
      updated_at = now()
  where id = v_target.id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'program.staff_remove',
    'learning_program_staff',
    v_target.id::text,
    jsonb_build_object(
      'program_id', p_program_id,
      'user_id', p_user_id
    )
  );

  return jsonb_build_object(
    'program_id', p_program_id,
    'user_id', p_user_id,
    'status', 'removed'
  );
end;
$$;

create or replace function public.publish_learning_program(
  p_program_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_program public.learning_programs%rowtype;
  v_space_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_program
  from public.learning_programs
  where id = p_program_id
  for update;

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
    raise exception 'Learning space must be active for program changes';
  end if;

  if not public.can_manage_learning_program(p_program_id, v_uid) then
    raise exception 'Not allowed to publish this program';
  end if;

  if v_program.status is distinct from 'draft' then
    raise exception 'Only draft programs can be published';
  end if;

  update public.learning_programs
  set status = 'published',
      published_at = coalesce(published_at, now()),
      suspended_at = null,
      archived_at = null,
      updated_at = now()
  where id = p_program_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'program.publish',
    'learning_program',
    p_program_id::text,
    jsonb_build_object(
      'from_status', v_program.status,
      'to_status', 'published'
    )
  );

  return jsonb_build_object('program_id', p_program_id, 'status', 'published');
end;
$$;

create or replace function public.archive_learning_program(
  p_program_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_program public.learning_programs%rowtype;
  v_space_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_program
  from public.learning_programs
  where id = p_program_id
  for update;

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
    raise exception 'Learning space must be active for program changes';
  end if;

  -- Suspended programs: platform moderate only (no owner/lead archive bypass).
  if v_program.status = 'suspended' then
    raise exception
      'Program is suspended; only platform moderation may change it';
  end if;

  if not public.can_manage_learning_program(p_program_id, v_uid) then
    raise exception 'Not allowed to archive this program';
  end if;

  if v_program.status = 'archived' then
    return jsonb_build_object('program_id', p_program_id, 'status', 'archived');
  end if;

  update public.learning_programs
  set status = 'archived',
      archived_at = now(),
      suspended_at = null,
      updated_at = now()
  where id = p_program_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'program.archive',
    'learning_program',
    p_program_id::text,
    jsonb_build_object(
      'from_status', v_program.status,
      'to_status', 'archived'
    )
  );

  return jsonb_build_object('program_id', p_program_id, 'status', 'archived');
end;
$$;

create or replace function public.moderate_learning_program(
  p_program_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
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
      'moderate_learning_program status must be suspended|published|archived';
  end if;

  select * into v_program
  from public.learning_programs
  where id = p_program_id
  for update;

  if not found then
    raise exception 'Learning program not found';
  end if;

  if v_to = 'suspended' then
    update public.learning_programs
    set status = 'suspended',
        suspended_at = now(),
        archived_at = null,
        updated_at = now()
    where id = p_program_id;
  elsif v_to = 'published' then
    update public.learning_programs
    set status = 'published',
        published_at = coalesce(published_at, now()),
        suspended_at = null,
        archived_at = null,
        updated_at = now()
    where id = p_program_id;
  else
    update public.learning_programs
    set status = 'archived',
        archived_at = coalesce(archived_at, now()),
        suspended_at = null,
        updated_at = now()
    where id = p_program_id;
  end if;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'program.moderation',
    'learning_program',
    p_program_id::text,
    jsonb_build_object(
      'from_status', v_program.status,
      'to_status', v_to
    )
  );

  return jsonb_build_object('program_id', p_program_id, 'status', v_to);
end;
$$;

-- RPC grants
revoke all on function public.create_learning_program(
  uuid, text, text, text, text, text, text
) from public, anon;
grant execute on function public.create_learning_program(
  uuid, text, text, text, text, text, text
) to authenticated, service_role;

revoke all on function public.update_learning_program(
  uuid, text, text, text, text, text, text, text, integer, text, text[],
  boolean, boolean, boolean, boolean, jsonb, jsonb, jsonb,
  boolean, boolean, boolean, boolean, boolean
) from public, anon;
grant execute on function public.update_learning_program(
  uuid, text, text, text, text, text, text, text, integer, text, text[],
  boolean, boolean, boolean, boolean, jsonb, jsonb, jsonb,
  boolean, boolean, boolean, boolean, boolean
) to authenticated, service_role;

revoke all on function public.assign_learning_program_staff(uuid, uuid, text)
  from public, anon;
grant execute on function public.assign_learning_program_staff(uuid, uuid, text)
  to authenticated, service_role;

revoke all on function public.remove_learning_program_staff(uuid, uuid)
  from public, anon;
grant execute on function public.remove_learning_program_staff(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.publish_learning_program(uuid)
  from public, anon;
grant execute on function public.publish_learning_program(uuid)
  to authenticated, service_role;

revoke all on function public.archive_learning_program(uuid)
  from public, anon;
grant execute on function public.archive_learning_program(uuid)
  to authenticated, service_role;

revoke all on function public.moderate_learning_program(uuid, text)
  from public, anon;
grant execute on function public.moderate_learning_program(uuid, text)
  to authenticated, service_role;
