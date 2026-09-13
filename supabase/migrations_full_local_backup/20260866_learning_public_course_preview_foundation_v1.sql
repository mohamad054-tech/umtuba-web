-- UMTUBA Learning OS — Public Course Preview Foundation V1
-- Additive. Git-only until explicit remote apply GO.
-- Fail-closed marketing preview for publicly published courses.
-- NEVER exposes learning_lesson_content_blocks or learning_course_resources.
--
-- Video Preview streaming is OUT OF SCOPE (future feature).
-- Depends on: 20260828..20260832 spaces/programs/courses/sections/lessons.

-- ---------------------------------------------------------------------------
-- 1) learning_course_public_previews
-- ---------------------------------------------------------------------------

create table if not exists public.learning_course_public_previews (
  course_id uuid primary key
    references public.learning_courses (id) on delete cascade,
  -- Optional reference only — NOT an auto-preview of lesson content.
  lesson_id uuid
    references public.learning_lessons (id) on delete set null,
  title text not null
    constraint learning_course_public_previews_title_len check (
      char_length(btrim(title)) between 1 and 200
    ),
  summary text not null
    constraint learning_course_public_previews_summary_len check (
      char_length(btrim(summary)) between 1 and 500
    ),
  -- Independent marketing excerpt — NOT a content-block copy requirement.
  body_excerpt text not null
    constraint learning_course_public_previews_body_excerpt_len check (
      char_length(btrim(body_excerpt)) between 1 and 1200
    ),
  -- FAIL CLOSED: disabled until explicitly enabled.
  enabled boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.learning_course_public_previews is
  'Fail-closed public marketing preview for a course. enabled defaults false. Never stores content blocks or resource URLs. Video Preview streaming is OUT OF SCOPE (future feature).';

comment on column public.learning_course_public_previews.lesson_id is
  'Optional lesson reference only. Does NOT auto-expose lesson content as a preview.';

comment on column public.learning_course_public_previews.body_excerpt is
  'Independent marketing excerpt (1–1200). Not required to copy from content blocks.';

comment on column public.learning_course_public_previews.enabled is
  'FAIL CLOSED. Public SELECT only when true AND parent course/program/space are publicly published.';

create index if not exists learning_course_public_previews_enabled_idx
  on public.learning_course_public_previews (enabled)
  where enabled = true;

create index if not exists learning_course_public_previews_lesson_id_idx
  on public.learning_course_public_previews (lesson_id)
  where lesson_id is not null;

drop trigger if exists learning_course_public_previews_set_updated_at
  on public.learning_course_public_previews;
create trigger learning_course_public_previews_set_updated_at
  before update on public.learning_course_public_previews
  for each row execute function public.set_row_updated_at();

alter table public.learning_course_public_previews enable row level security;
alter table public.learning_course_public_previews force row level security;

-- SELECT for discovery; writes only via SECURITY DEFINER RPC (managers) or service_role.
revoke all on table public.learning_course_public_previews
  from public, anon, authenticated;
grant select on table public.learning_course_public_previews
  to anon, authenticated;
revoke insert, update, delete on table public.learning_course_public_previews
  from anon, authenticated;
grant all on table public.learning_course_public_previews to service_role;

-- Public SELECT: enabled + published public course + published public program + active public space.
-- NEVER call is_platform_admin() on anon paths.
drop policy if exists "Public read enabled course previews"
  on public.learning_course_public_previews;
create policy "Public read enabled course previews"
  on public.learning_course_public_previews for select
  to anon, authenticated
  using (
    enabled = true
    and exists (
      select 1
      from public.learning_courses c
      join public.learning_programs p
        on p.id = c.program_id
      join public.learning_spaces s
        on s.id = p.space_id
      where c.id = learning_course_public_previews.course_id
        and c.status = 'published'
        and c.visibility = 'public'
        and p.status = 'published'
        and p.visibility = 'public'
        and s.status = 'active'
        and s.visibility = 'public'
    )
  );

-- Managers may read drafts / disabled previews for their courses.
drop policy if exists "Course managers read course previews"
  on public.learning_course_public_previews;
create policy "Course managers read course previews"
  on public.learning_course_public_previews for select
  to authenticated
  using (public.can_manage_learning_course(course_id));

-- Manager write policies exist for completeness; table grants revoke client writes.
-- Authenticated managers write via upsert_learning_course_public_preview RPC.
drop policy if exists "Course managers insert course previews"
  on public.learning_course_public_previews;
create policy "Course managers insert course previews"
  on public.learning_course_public_previews for insert
  to authenticated
  with check (public.can_manage_learning_course(course_id));

drop policy if exists "Course managers update course previews"
  on public.learning_course_public_previews;
create policy "Course managers update course previews"
  on public.learning_course_public_previews for update
  to authenticated
  using (public.can_manage_learning_course(course_id))
  with check (public.can_manage_learning_course(course_id));

drop policy if exists "Course managers delete course previews"
  on public.learning_course_public_previews;
create policy "Course managers delete course previews"
  on public.learning_course_public_previews for delete
  to authenticated
  using (public.can_manage_learning_course(course_id));

-- ---------------------------------------------------------------------------
-- 2) upsert_learning_course_public_preview (managers)
-- ---------------------------------------------------------------------------

create or replace function public.upsert_learning_course_public_preview(
  p_course_id uuid,
  p_lesson_id uuid default null,
  p_title text default null,
  p_summary text default null,
  p_body_excerpt text default null,
  p_enabled boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_summary text := nullif(btrim(coalesce(p_summary, '')), '');
  v_body text := nullif(btrim(coalesce(p_body_excerpt, '')), '');
  -- FAIL CLOSED: only true when explicitly true.
  v_enabled boolean := coalesce(p_enabled, false) is true;
  v_lesson_id uuid := p_lesson_id;
  v_row public.learning_course_public_previews%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_course_id is null then
    raise exception 'course_id is required';
  end if;

  if not public.can_manage_learning_course(p_course_id, v_uid) then
    raise exception 'Not authorized to manage this course preview';
  end if;

  if not exists (
    select 1 from public.learning_courses c where c.id = p_course_id
  ) then
    raise exception 'Learning course not found';
  end if;

  if v_title is null or char_length(v_title) > 200 then
    raise exception 'title is required (1–200 chars)';
  end if;
  if v_summary is null or char_length(v_summary) > 500 then
    raise exception 'summary is required (1–500 chars)';
  end if;
  if v_body is null or char_length(v_body) > 1200 then
    raise exception 'body_excerpt is required (1–1200 chars)';
  end if;

  if v_lesson_id is not null then
    if not exists (
      select 1
      from public.learning_lessons les
      join public.learning_sections sec
        on sec.id = les.section_id
      where les.id = v_lesson_id
        and sec.course_id = p_course_id
    ) then
      raise exception 'lesson_id must belong to the course';
    end if;
  end if;

  insert into public.learning_course_public_previews (
    course_id,
    lesson_id,
    title,
    summary,
    body_excerpt,
    enabled,
    created_by
  ) values (
    p_course_id,
    v_lesson_id,
    v_title,
    v_summary,
    v_body,
    v_enabled,
    v_uid
  )
  on conflict (course_id) do update
  set
    lesson_id = excluded.lesson_id,
    title = excluded.title,
    summary = excluded.summary,
    body_excerpt = excluded.body_excerpt,
    enabled = excluded.enabled,
    updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'course_id', v_row.course_id,
    'lesson_id', v_row.lesson_id,
    'title', v_row.title,
    'summary', v_row.summary,
    'body_excerpt', v_row.body_excerpt,
    'enabled', v_row.enabled,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.upsert_learning_course_public_preview(
  uuid, uuid, text, text, text, boolean
) from public, anon;
grant execute on function public.upsert_learning_course_public_preview(
  uuid, uuid, text, text, text, boolean
) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) get_learning_course_public_preview (anon + authenticated)
-- ---------------------------------------------------------------------------
-- Returns null jsonb when disabled or course is not publicly published.
-- NEVER joins content_blocks or resources.
-- Video Preview streaming is OUT OF SCOPE (future feature).

create or replace function public.get_learning_course_public_preview(
  p_course_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.learning_course_public_previews%rowtype;
begin
  if p_course_id is null then
    return null;
  end if;

  select pv.*
  into v_row
  from public.learning_course_public_previews pv
  join public.learning_courses c
    on c.id = pv.course_id
  join public.learning_programs p
    on p.id = c.program_id
  join public.learning_spaces s
    on s.id = p.space_id
  where pv.course_id = p_course_id
    and pv.enabled = true
    and c.status = 'published'
    and c.visibility = 'public'
    and p.status = 'published'
    and p.visibility = 'public'
    and s.status = 'active'
    and s.visibility = 'public';

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'course_id', v_row.course_id,
    'lesson_id', v_row.lesson_id,
    'title', v_row.title,
    'summary', v_row.summary,
    'body_excerpt', v_row.body_excerpt,
    'enabled', v_row.enabled
  );
end;
$$;

revoke all on function public.get_learning_course_public_preview(uuid)
  from public;
grant execute on function public.get_learning_course_public_preview(uuid)
  to anon, authenticated, service_role;
