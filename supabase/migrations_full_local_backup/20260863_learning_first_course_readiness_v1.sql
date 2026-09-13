-- =============================================================================
-- UM Learning OS — First Course Readiness V1
-- Migration: 20260863_learning_first_course_readiness_v1.sql
--
-- Additive only. Lesson engine, section progress, continue watching, resources,
-- projects, labs, UM Points lesson unlock, AI Tutor stubs.
-- Style: SECURITY DEFINER RPCs, FORCE RLS, revoke client I/U/D, auth.uid() fail-closed.
-- Does NOT: external AI providers, alter um_points_ledger positive check, Discover/Ads/Games.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) Content block types expansion
-- ---------------------------------------------------------------------------

alter table public.learning_lesson_content_blocks
  drop constraint if exists learning_lesson_content_blocks_type_check;

alter table public.learning_lesson_content_blocks
  add constraint learning_lesson_content_blocks_type_check check (
    block_type in (
      'rich_text', 'heading', 'image', 'video', 'audio', 'quote',
      'divider', 'callout', 'external_link', 'code_block',
      'transcript', 'pdf', 'downloadable_file',
      'ai_block', 'interactive_block'
    )
  );

comment on column public.learning_lesson_content_blocks.block_type is
  'Immutable content type allowlist. Creatable: rich_text|heading|image|video|audio|quote|divider|callout|external_link|code_block|transcript|pdf|downloadable_file. Reserved (create rejected): ai_block|interactive_block.';

create or replace function public.learning_lesson_content_block_validate_type(
  p_type text,
  p_is_create boolean default false
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  if p_type is null then
    raise exception 'block_type is required';
  end if;
  if p_type not in (
    'rich_text', 'heading', 'image', 'video', 'audio', 'quote',
    'divider', 'callout', 'external_link', 'code_block',
    'transcript', 'pdf', 'downloadable_file',
    'ai_block', 'interactive_block'
  ) then
    raise exception 'Invalid content block type';
  end if;
  if p_is_create and p_type in ('ai_block', 'interactive_block') then
    raise exception
      'Content block type % is reserved and cannot be created in V1', p_type;
  end if;
end;
$$;

create or replace function public.learning_lesson_content_block_validate_content(
  p_type text,
  p_content jsonb
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  v_key text;
  v_allowed text[];
  v_text text;
  v_level integer;
  v_max_bytes integer := 16384;
  v_uuid uuid;
  v_num numeric;
begin
  if p_content is null or jsonb_typeof(p_content) is distinct from 'object' then
    raise exception 'content must be a JSON object';
  end if;
  if octet_length(p_content::text) > v_max_bytes then
    raise exception 'content exceeds maximum size of % bytes', v_max_bytes;
  end if;

  if p_type = 'rich_text' then
    v_allowed := array['text', 'format'];
    if jsonb_typeof(p_content -> 'text') is distinct from 'string' then
      raise exception 'rich_text.text must be a string';
    end if;
    v_text := p_content ->> 'text';
    if char_length(v_text) > 10000 then
      raise exception 'rich_text.text exceeds maximum length';
    end if;
    perform public.learning_lesson_content_block_assert_safe_text('rich_text.text', v_text);
    if p_content ? 'format' and (p_content ->> 'format') not in ('plain', 'markdown') then
      raise exception 'rich_text.format must be plain or markdown';
    end if;

  elsif p_type = 'heading' then
    v_allowed := array['text', 'level'];
    if jsonb_typeof(p_content -> 'text') is distinct from 'string' then
      raise exception 'heading.text must be a string';
    end if;
    v_text := p_content ->> 'text';
    if char_length(v_text) not between 1 and 300 then
      raise exception 'heading.text must be between 1 and 300 chars';
    end if;
    perform public.learning_lesson_content_block_assert_safe_text('heading.text', v_text);
    if jsonb_typeof(p_content -> 'level') is distinct from 'number' then
      raise exception 'heading.level must be a number';
    end if;
    v_level := floor((p_content ->> 'level')::numeric)::integer;
    if v_level not between 1 and 6
       or v_level::numeric is distinct from (p_content ->> 'level')::numeric
    then
      raise exception 'heading.level must be an integer between 1 and 6';
    end if;

  elsif p_type = 'image' then
    v_allowed := array['url', 'alt', 'caption'];
    perform public.learning_lesson_content_block_assert_safe_url('image.url', p_content ->> 'url');
    if p_content ? 'alt' then
      if jsonb_typeof(p_content -> 'alt') is distinct from 'string' or char_length(p_content ->> 'alt') > 500 then
        raise exception 'image.alt must be a string up to 500 chars';
      end if;
      perform public.learning_lesson_content_block_assert_safe_text('image.alt', p_content ->> 'alt');
    end if;
    if p_content ? 'caption' then
      if jsonb_typeof(p_content -> 'caption') is distinct from 'string' or char_length(p_content ->> 'caption') > 1000 then
        raise exception 'image.caption must be a string up to 1000 chars';
      end if;
      perform public.learning_lesson_content_block_assert_safe_text('image.caption', p_content ->> 'caption');
    end if;

  elsif p_type = 'video' then
    v_allowed := array['url', 'provider', 'caption'];
    perform public.learning_lesson_content_block_assert_safe_url('video.url', p_content ->> 'url');
    if p_content ? 'provider' and (p_content ->> 'provider') not in ('file', 'url', 'youtube', 'vimeo') then
      raise exception 'video.provider must be file|url|youtube|vimeo';
    end if;
    if p_content ? 'caption' then
      if jsonb_typeof(p_content -> 'caption') is distinct from 'string' or char_length(p_content ->> 'caption') > 1000 then
        raise exception 'video.caption must be a string up to 1000 chars';
      end if;
      perform public.learning_lesson_content_block_assert_safe_text('video.caption', p_content ->> 'caption');
    end if;

  elsif p_type = 'audio' then
    v_allowed := array['url', 'caption'];
    perform public.learning_lesson_content_block_assert_safe_url('audio.url', p_content ->> 'url');
    if p_content ? 'caption' then
      if jsonb_typeof(p_content -> 'caption') is distinct from 'string' or char_length(p_content ->> 'caption') > 1000 then
        raise exception 'audio.caption must be a string up to 1000 chars';
      end if;
      perform public.learning_lesson_content_block_assert_safe_text('audio.caption', p_content ->> 'caption');
    end if;

  elsif p_type = 'quote' then
    v_allowed := array['text', 'attribution'];
    if jsonb_typeof(p_content -> 'text') is distinct from 'string' then
      raise exception 'quote.text must be a string';
    end if;
    v_text := p_content ->> 'text';
    if char_length(v_text) not between 1 and 2000 then
      raise exception 'quote.text must be between 1 and 2000 chars';
    end if;
    perform public.learning_lesson_content_block_assert_safe_text('quote.text', v_text);
    if p_content ? 'attribution' then
      if jsonb_typeof(p_content -> 'attribution') is distinct from 'string' or char_length(p_content ->> 'attribution') > 300 then
        raise exception 'quote.attribution must be a string up to 300 chars';
      end if;
      perform public.learning_lesson_content_block_assert_safe_text('quote.attribution', p_content ->> 'attribution');
    end if;

  elsif p_type = 'divider' then
    v_allowed := array['style'];
    if p_content ? 'style' and (p_content ->> 'style') not in ('solid', 'dashed', 'dotted') then
      raise exception 'divider.style must be solid|dashed|dotted';
    end if;

  elsif p_type = 'callout' then
    v_allowed := array['text', 'variant'];
    if jsonb_typeof(p_content -> 'text') is distinct from 'string' then
      raise exception 'callout.text must be a string';
    end if;
    v_text := p_content ->> 'text';
    if char_length(v_text) not between 1 and 4000 then
      raise exception 'callout.text must be between 1 and 4000 chars';
    end if;
    perform public.learning_lesson_content_block_assert_safe_text('callout.text', v_text);
    if (p_content ->> 'variant') is null
       or (p_content ->> 'variant') not in ('info', 'note', 'tip', 'success', 'warning', 'danger')
    then
      raise exception 'callout.variant must be info|note|tip|success|warning|danger';
    end if;

  elsif p_type = 'external_link' then
    v_allowed := array['url', 'label', 'description'];
    perform public.learning_lesson_content_block_assert_safe_url('external_link.url', p_content ->> 'url');
    if p_content ? 'label' then
      if jsonb_typeof(p_content -> 'label') is distinct from 'string' or char_length(p_content ->> 'label') > 300 then
        raise exception 'external_link.label must be a string up to 300 chars';
      end if;
      perform public.learning_lesson_content_block_assert_safe_text('external_link.label', p_content ->> 'label');
    end if;
    if p_content ? 'description' then
      if jsonb_typeof(p_content -> 'description') is distinct from 'string' or char_length(p_content ->> 'description') > 1000 then
        raise exception 'external_link.description must be a string up to 1000 chars';
      end if;
      perform public.learning_lesson_content_block_assert_safe_text('external_link.description', p_content ->> 'description');
    end if;

  elsif p_type = 'code_block' then
    v_allowed := array['code', 'language'];
    if jsonb_typeof(p_content -> 'code') is distinct from 'string' then
      raise exception 'code_block.code must be a string';
    end if;
    if char_length(p_content ->> 'code') > 20000 then
      raise exception 'code_block.code exceeds maximum length';
    end if;
    if p_content ? 'language' and (p_content ->> 'language') !~ '^[a-z0-9+#.-]{1,32}$' then
      raise exception 'code_block.language must be a short identifier';
    end if;

  elsif p_type = 'transcript' then
    v_allowed := array['text', 'language', 'video_block_id'];
    if jsonb_typeof(p_content -> 'text') is distinct from 'string' then
      raise exception 'transcript.text must be a string';
    end if;
    v_text := p_content ->> 'text';
    if char_length(v_text) not between 1 and 100000 then
      raise exception 'transcript.text must be between 1 and 100000 chars';
    end if;
    perform public.learning_lesson_content_block_assert_safe_text('transcript.text', v_text);
    if p_content ? 'language' and (p_content ->> 'language') !~ '^[a-z]{2}(-[A-Z]{2})?$' then
      raise exception 'transcript.language must be a language tag';
    end if;
    if p_content ? 'video_block_id' then
      begin
        v_uuid := (p_content ->> 'video_block_id')::uuid;
      exception when others then
        raise exception 'transcript.video_block_id must be a uuid';
      end;
      if v_uuid is null then
        raise exception 'transcript.video_block_id must be a uuid';
      end if;
    end if;

  elsif p_type = 'pdf' then
    v_allowed := array['url', 'title', 'page_count'];
    perform public.learning_lesson_content_block_assert_safe_url('pdf.url', p_content ->> 'url');
    if jsonb_typeof(p_content -> 'title') is distinct from 'string'
       or char_length(btrim(p_content ->> 'title')) not between 1 and 300
    then
      raise exception 'pdf.title must be a string 1..300 chars';
    end if;
    perform public.learning_lesson_content_block_assert_safe_text('pdf.title', p_content ->> 'title');
    if p_content ? 'page_count' then
      if jsonb_typeof(p_content -> 'page_count') is distinct from 'number' then
        raise exception 'pdf.page_count must be a number';
      end if;
      v_num := (p_content ->> 'page_count')::numeric;
      if v_num < 1 or v_num <> floor(v_num) or v_num > 100000 then
        raise exception 'pdf.page_count must be an integer 1..100000';
      end if;
    end if;

  elsif p_type = 'downloadable_file' then
    v_allowed := array['url', 'title', 'filename', 'mime_type', 'size_bytes'];
    perform public.learning_lesson_content_block_assert_safe_url('downloadable_file.url', p_content ->> 'url');
    if jsonb_typeof(p_content -> 'title') is distinct from 'string'
       or char_length(btrim(p_content ->> 'title')) not between 1 and 300
    then
      raise exception 'downloadable_file.title must be a string 1..300 chars';
    end if;
    perform public.learning_lesson_content_block_assert_safe_text('downloadable_file.title', p_content ->> 'title');
    if jsonb_typeof(p_content -> 'filename') is distinct from 'string'
       or char_length(btrim(p_content ->> 'filename')) not between 1 and 255
    then
      raise exception 'downloadable_file.filename must be a string 1..255 chars';
    end if;
    if p_content ? 'mime_type' then
      if jsonb_typeof(p_content -> 'mime_type') is distinct from 'string'
         or char_length(p_content ->> 'mime_type') not between 3 and 128
      then
        raise exception 'downloadable_file.mime_type invalid';
      end if;
    end if;
    if p_content ? 'size_bytes' then
      if jsonb_typeof(p_content -> 'size_bytes') is distinct from 'number' then
        raise exception 'downloadable_file.size_bytes must be a number';
      end if;
      v_num := (p_content ->> 'size_bytes')::numeric;
      if v_num < 0 or v_num <> floor(v_num) then
        raise exception 'downloadable_file.size_bytes must be a non-negative integer';
      end if;
    end if;

  else
    raise exception 'Unsupported content block type for content validation';
  end if;

  for v_key in select jsonb_object_keys(p_content)
  loop
    if not (v_key = any (v_allowed)) then
      raise exception 'content contains unexpected key % for type %', v_key, p_type;
    end if;
  end loop;
end;
$$;

revoke all on function public.learning_lesson_content_block_validate_type(text, boolean)
  from public, anon, authenticated;
revoke all on function public.learning_lesson_content_block_validate_content(text, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- B) learning_lesson_objectives
-- ---------------------------------------------------------------------------

create table if not exists public.learning_lesson_objectives (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null
    references public.learning_lessons (id) on delete cascade,
  position integer not null
    constraint learning_lesson_objectives_position_nonneg check (position >= 0),
  objective_text text not null
    constraint learning_lesson_objectives_text_len check (
      char_length(btrim(objective_text)) between 1 and 500
    ),
  created_at timestamptz not null default now(),
  constraint learning_lesson_objectives_lesson_position_unique unique (lesson_id, position)
);

comment on table public.learning_lesson_objectives is
  'Per-lesson learning objectives. Replace-all via set_learning_lesson_objectives. Client writes only via RPCs.';

create index if not exists learning_lesson_objectives_lesson_idx
  on public.learning_lesson_objectives (lesson_id, position);

alter table public.learning_lesson_objectives enable row level security;
alter table public.learning_lesson_objectives force row level security;
revoke all on table public.learning_lesson_objectives from public, anon, authenticated;
grant select on table public.learning_lesson_objectives to authenticated;
revoke insert, update, delete on table public.learning_lesson_objectives from anon, authenticated;
grant all on table public.learning_lesson_objectives to service_role;

drop policy if exists "Entitled readers select lesson objectives"
  on public.learning_lesson_objectives;
create policy "Entitled readers select lesson objectives"
  on public.learning_lesson_objectives for select to authenticated
  using (
    exists (
      select 1
      from public.learning_lessons les
      join public.learning_sections sec on sec.id = les.section_id
      where les.id = lesson_id
        and (
          public.has_learning_course_access(sec.course_id)
          or public.can_manage_learning_course(sec.course_id)
          or public.is_learning_course_staff(sec.course_id)
          or public.is_platform_admin()
        )
    )
  );

create or replace function public.set_learning_lesson_objectives(
  p_lesson_id uuid,
  p_objectives jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_elem jsonb;
  v_idx integer := 0;
  v_text text;
  v_items jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_lesson_id is null then raise exception 'lesson_id is required'; end if;
  select * into v_ctx from public.learning_progress_load_lesson_context(p_lesson_id);
  if not (
    public.can_manage_learning_course(v_ctx.o_course.id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to manage this lesson';
  end if;
  if p_objectives is null or jsonb_typeof(p_objectives) is distinct from 'array' then
    raise exception 'objectives must be a JSON array';
  end if;
  if jsonb_array_length(p_objectives) > 64 then
    raise exception 'Too many objectives';
  end if;

  delete from public.learning_lesson_objectives where lesson_id = p_lesson_id;

  for v_elem in select * from jsonb_array_elements(p_objectives)
  loop
    if jsonb_typeof(v_elem) is distinct from 'string' then
      raise exception 'Each objective must be a string';
    end if;
    v_text := nullif(btrim(v_elem #>> '{}'), '');
    if v_text is null or char_length(v_text) > 500 then
      raise exception 'objective_text must be 1..500 chars';
    end if;
    perform public.learning_lesson_content_block_assert_safe_text('objective_text', v_text);
    insert into public.learning_lesson_objectives (lesson_id, position, objective_text)
    values (p_lesson_id, v_idx, v_text);
    v_idx := v_idx + 1;
  end loop;

  select coalesce(jsonb_agg(
    jsonb_build_object('id', o.id, 'position', o.position, 'objective_text', o.objective_text)
    order by o.position
  ), '[]'::jsonb)
  into v_items
  from public.learning_lesson_objectives o
  where o.lesson_id = p_lesson_id;

  perform public.learning_audit_write(
    v_uid, v_ctx.o_space_id, 'lesson.objectives_set',
    'learning_lesson', p_lesson_id::text,
    jsonb_build_object('count', v_idx)
  );

  return jsonb_build_object('lesson_id', p_lesson_id, 'objectives', v_items);
end;
$$;

revoke all on function public.set_learning_lesson_objectives(uuid, jsonb) from public, anon;
grant execute on function public.set_learning_lesson_objectives(uuid, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- C) learning_lesson_prerequisites
-- ---------------------------------------------------------------------------

create table if not exists public.learning_lesson_prerequisites (
  lesson_id uuid not null
    references public.learning_lessons (id) on delete cascade,
  prerequisite_lesson_id uuid not null
    references public.learning_lessons (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint learning_lesson_prerequisites_pk primary key (lesson_id, prerequisite_lesson_id),
  constraint learning_lesson_prerequisites_no_self check (lesson_id <> prerequisite_lesson_id)
);

comment on table public.learning_lesson_prerequisites is
  'Same-course lesson prerequisites. Pair unique. Client writes via set_learning_lesson_prerequisites.';

create index if not exists learning_lesson_prerequisites_prereq_idx
  on public.learning_lesson_prerequisites (prerequisite_lesson_id);

alter table public.learning_lesson_prerequisites enable row level security;
alter table public.learning_lesson_prerequisites force row level security;
revoke all on table public.learning_lesson_prerequisites from public, anon, authenticated;
grant select on table public.learning_lesson_prerequisites to authenticated;
revoke insert, update, delete on table public.learning_lesson_prerequisites from anon, authenticated;
grant all on table public.learning_lesson_prerequisites to service_role;

drop policy if exists "Entitled readers select lesson prerequisites"
  on public.learning_lesson_prerequisites;
create policy "Entitled readers select lesson prerequisites"
  on public.learning_lesson_prerequisites for select to authenticated
  using (
    exists (
      select 1
      from public.learning_lessons les
      join public.learning_sections sec on sec.id = les.section_id
      where les.id = lesson_id
        and (
          public.has_learning_course_access(sec.course_id)
          or public.can_manage_learning_course(sec.course_id)
          or public.is_learning_course_staff(sec.course_id)
          or public.is_platform_admin()
        )
    )
  );

create or replace function public.learning_lesson_prerequisites_satisfied(
  p_lesson_id uuid,
  p_user_id uuid
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
    and not exists (
      select 1
      from public.learning_lesson_prerequisites pr
      where pr.lesson_id = p_lesson_id
        and not exists (
          select 1
          from public.learning_lesson_progress lp
          where lp.lesson_id = pr.prerequisite_lesson_id
            and lp.user_id = p_user_id
            and lp.status = 'completed'
        )
    );
$$;

revoke all on function public.learning_lesson_prerequisites_satisfied(uuid, uuid) from public, anon;
grant execute on function public.learning_lesson_prerequisites_satisfied(uuid, uuid) to authenticated, service_role;

create or replace function public.set_learning_lesson_prerequisites(
  p_lesson_id uuid,
  p_prerequisite_lesson_ids jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_elem jsonb;
  v_prereq uuid;
  v_prereq_course uuid;
  v_items jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_progress_load_lesson_context(p_lesson_id);
  if not (
    public.can_manage_learning_course(v_ctx.o_course.id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to manage this lesson';
  end if;
  if p_prerequisite_lesson_ids is null
     or jsonb_typeof(p_prerequisite_lesson_ids) is distinct from 'array'
  then
    raise exception 'prerequisite_lesson_ids must be a JSON array';
  end if;
  if jsonb_array_length(p_prerequisite_lesson_ids) > 32 then
    raise exception 'Too many prerequisites';
  end if;

  delete from public.learning_lesson_prerequisites where lesson_id = p_lesson_id;

  for v_elem in select * from jsonb_array_elements(p_prerequisite_lesson_ids)
  loop
    begin
      v_prereq := (v_elem #>> '{}')::uuid;
    exception when others then
      raise exception 'Invalid prerequisite lesson id';
    end;
    if v_prereq is null or v_prereq = p_lesson_id then
      raise exception 'Invalid prerequisite lesson id';
    end if;
    select sec.course_id into v_prereq_course
    from public.learning_lessons les
    join public.learning_sections sec on sec.id = les.section_id
    where les.id = v_prereq;
    if v_prereq_course is null then
      raise exception 'Prerequisite lesson not found';
    end if;
    if v_prereq_course is distinct from v_ctx.o_course.id then
      raise exception 'Prerequisite must be in the same course';
    end if;
    insert into public.learning_lesson_prerequisites (lesson_id, prerequisite_lesson_id)
    values (p_lesson_id, v_prereq)
    on conflict do nothing;
  end loop;

  select coalesce(jsonb_agg(pr.prerequisite_lesson_id order by pr.prerequisite_lesson_id), '[]'::jsonb)
  into v_items
  from public.learning_lesson_prerequisites pr
  where pr.lesson_id = p_lesson_id;

  perform public.learning_audit_write(
    v_uid, v_ctx.o_space_id, 'lesson.prerequisites_set',
    'learning_lesson', p_lesson_id::text,
    jsonb_build_object('count', jsonb_array_length(v_items))
  );

  return jsonb_build_object('lesson_id', p_lesson_id, 'prerequisite_lesson_ids', v_items);
end;
$$;

revoke all on function public.set_learning_lesson_prerequisites(uuid, jsonb) from public, anon;
grant execute on function public.set_learning_lesson_prerequisites(uuid, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- D) Continue watching (media position on lesson progress)
-- ---------------------------------------------------------------------------

alter table public.learning_lesson_progress
  add column if not exists last_media_position_seconds integer
    constraint learning_lesson_progress_media_pos_nonneg check (
      last_media_position_seconds is null or last_media_position_seconds >= 0
    );

alter table public.learning_lesson_progress
  add column if not exists last_content_block_id uuid
    references public.learning_lesson_content_blocks (id) on delete set null;

comment on column public.learning_lesson_progress.last_media_position_seconds is
  'Continue-watching media offset in seconds. Learner-owned via upsert_my_learning_lesson_media_position.';

create or replace function public.upsert_my_learning_lesson_media_position(
  p_lesson_id uuid,
  p_position_seconds integer,
  p_content_block_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_enrollment_id uuid;
  v_now timestamptz := now();
  v_row public.learning_lesson_progress%rowtype;
  v_block_lesson uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_lesson_id is null then raise exception 'lesson_id is required'; end if;
  if p_position_seconds is null or p_position_seconds < 0 then
    raise exception 'position_seconds must be >= 0';
  end if;

  select * into v_ctx from public.learning_progress_load_lesson_context(p_lesson_id);
  if not public.has_learning_course_access(v_ctx.o_course.id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  if p_content_block_id is not null then
    select b.lesson_id into v_block_lesson
    from public.learning_lesson_content_blocks b
    where b.id = p_content_block_id;
    if v_block_lesson is distinct from p_lesson_id then
      raise exception 'content_block_id is not in this lesson';
    end if;
  end if;

  v_enrollment_id := public.learning_progress_resolve_enrollment_id(v_ctx.o_course.id, v_uid);

  select * into v_row
  from public.learning_lesson_progress
  where user_id = v_uid and lesson_id = p_lesson_id
  for update;

  if not found then
    insert into public.learning_lesson_progress (
      space_id, course_id, lesson_id, user_id, enrollment_id,
      status, started_at, last_activity_at,
      last_media_position_seconds, last_content_block_id
    ) values (
      v_ctx.o_space_id, v_ctx.o_course.id, p_lesson_id, v_uid, v_enrollment_id,
      'in_progress', v_now, v_now,
      p_position_seconds, p_content_block_id
    )
    returning * into v_row;
  else
    update public.learning_lesson_progress
    set
      last_media_position_seconds = p_position_seconds,
      last_content_block_id = coalesce(p_content_block_id, last_content_block_id),
      last_activity_at = v_now,
      status = case when status = 'not_started' then 'in_progress' else status end,
      started_at = coalesce(started_at, v_now),
      enrollment_id = coalesce(v_enrollment_id, enrollment_id)
    where id = v_row.id
    returning * into v_row;
  end if;

  return jsonb_build_object(
    'lesson_id', p_lesson_id,
    'last_media_position_seconds', v_row.last_media_position_seconds,
    'last_content_block_id', v_row.last_content_block_id,
    'status', v_row.status
  );
end;
$$;

revoke all on function public.upsert_my_learning_lesson_media_position(uuid, integer, uuid)
  from public, anon;
grant execute on function public.upsert_my_learning_lesson_media_position(uuid, integer, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- E) learning_section_progress
-- ---------------------------------------------------------------------------

create table if not exists public.learning_section_progress (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null
    references public.learning_spaces (id) on delete restrict,
  course_id uuid not null
    references public.learning_courses (id) on delete restrict,
  section_id uuid not null
    references public.learning_sections (id) on delete restrict,
  user_id uuid not null
    references public.profiles (id) on delete restrict,
  status text not null default 'not_started'
    constraint learning_section_progress_status_check check (
      status in ('not_started', 'in_progress', 'completed')
    ),
  completed_lessons_count integer not null default 0
    constraint learning_section_progress_completed_nonneg check (completed_lessons_count >= 0),
  total_lessons_count integer not null default 0
    constraint learning_section_progress_total_nonneg check (total_lessons_count >= 0),
  percent_complete integer not null default 0
    constraint learning_section_progress_percent_bounds check (
      percent_complete >= 0 and percent_complete <= 100
    ),
  last_lesson_id uuid
    references public.learning_lessons (id) on delete set null,
  started_at timestamptz,
  last_activity_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_section_progress_user_section_unique unique (user_id, section_id),
  constraint learning_section_progress_counts_consistent check (
    completed_lessons_count <= total_lessons_count
  )
);

comment on table public.learning_section_progress is
  'Per-learner section progress rollup. Server-maintained via recompute_learning_section_progress.';

create index if not exists learning_section_progress_user_course_idx
  on public.learning_section_progress (user_id, course_id, status);

drop trigger if exists learning_section_progress_set_updated_at on public.learning_section_progress;
create trigger learning_section_progress_set_updated_at
  before update on public.learning_section_progress
  for each row execute function public.set_row_updated_at();

alter table public.learning_section_progress enable row level security;
alter table public.learning_section_progress force row level security;
revoke all on table public.learning_section_progress from public, anon, authenticated;
grant select on table public.learning_section_progress to authenticated;
revoke insert, update, delete on table public.learning_section_progress from anon, authenticated;
grant all on table public.learning_section_progress to service_role;

drop policy if exists "Learners read own section progress"
  on public.learning_section_progress;
create policy "Learners read own section progress"
  on public.learning_section_progress for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Managers read scoped section progress"
  on public.learning_section_progress;
create policy "Managers read scoped section progress"
  on public.learning_section_progress for select to authenticated
  using (
    public.can_manage_learning_course(course_id)
    or public.is_platform_admin()
  );

create or replace function public.recompute_learning_section_progress(
  p_section_id uuid,
  p_user_id uuid default null
)
returns public.learning_section_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(p_user_id, auth.uid());
  v_section public.learning_sections%rowtype;
  v_space_id uuid;
  v_total integer := 0;
  v_completed integer := 0;
  v_percent integer := 0;
  v_status text := 'not_started';
  v_last_lesson uuid;
  v_started timestamptz;
  v_last_act timestamptz;
  v_completed_at timestamptz;
  v_now timestamptz := now();
  v_row public.learning_section_progress%rowtype;
begin
  if p_section_id is null or v_uid is null then
    raise exception 'section_id and user_id are required';
  end if;

  select * into v_section from public.learning_sections where id = p_section_id;
  if not found then raise exception 'Section not found'; end if;

  select p.space_id into v_space_id
  from public.learning_courses c
  join public.learning_programs p on p.id = c.program_id
  where c.id = v_section.course_id;

  select count(*)::integer into v_total
  from public.learning_lessons les
  where les.section_id = p_section_id and les.status = 'published';

  select count(*)::integer into v_completed
  from public.learning_lesson_progress lp
  join public.learning_lessons les on les.id = lp.lesson_id
  where lp.user_id = v_uid
    and les.section_id = p_section_id
    and les.status = 'published'
    and lp.status = 'completed';

  if v_total > 0 then
    v_percent := floor(100.0 * v_completed / v_total)::integer;
  end if;

  if v_completed >= v_total and v_total > 0 then
    v_status := 'completed';
  elsif v_completed > 0 or exists (
    select 1 from public.learning_lesson_progress lp
    join public.learning_lessons les on les.id = lp.lesson_id
    where lp.user_id = v_uid and les.section_id = p_section_id
      and lp.status in ('in_progress', 'completed')
  ) then
    v_status := 'in_progress';
  end if;

  select lp.lesson_id, lp.started_at, lp.last_activity_at, lp.completed_at
  into v_last_lesson, v_started, v_last_act, v_completed_at
  from public.learning_lesson_progress lp
  join public.learning_lessons les on les.id = lp.lesson_id
  where lp.user_id = v_uid and les.section_id = p_section_id
  order by coalesce(lp.last_activity_at, lp.updated_at) desc nulls last
  limit 1;

  if v_status = 'completed' then
    v_completed_at := coalesce(v_completed_at, v_now);
  else
    v_completed_at := null;
  end if;

  insert into public.learning_section_progress (
    space_id, course_id, section_id, user_id, status,
    completed_lessons_count, total_lessons_count, percent_complete,
    last_lesson_id, started_at, last_activity_at, completed_at
  ) values (
    v_space_id, v_section.course_id, p_section_id, v_uid, v_status,
    v_completed, v_total, v_percent,
    v_last_lesson, v_started, coalesce(v_last_act, v_now), v_completed_at
  )
  on conflict (user_id, section_id) do update set
    status = excluded.status,
    completed_lessons_count = excluded.completed_lessons_count,
    total_lessons_count = excluded.total_lessons_count,
    percent_complete = excluded.percent_complete,
    last_lesson_id = excluded.last_lesson_id,
    started_at = coalesce(public.learning_section_progress.started_at, excluded.started_at),
    last_activity_at = excluded.last_activity_at,
    completed_at = excluded.completed_at,
    updated_at = v_now
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.recompute_learning_section_progress(uuid, uuid) from public, anon;
grant execute on function public.recompute_learning_section_progress(uuid, uuid)
  to authenticated, service_role;

create or replace function public.get_my_learning_section_progress(p_section_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_section public.learning_sections%rowtype;
  v_row public.learning_section_progress%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_section from public.learning_sections where id = p_section_id;
  if not found then raise exception 'Section not found'; end if;
  if not public.has_learning_course_access(v_section.course_id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;
  v_row := public.recompute_learning_section_progress(p_section_id, v_uid);
  return jsonb_build_object(
    'section_id', v_row.section_id,
    'course_id', v_row.course_id,
    'status', v_row.status,
    'completed_lessons_count', v_row.completed_lessons_count,
    'total_lessons_count', v_row.total_lessons_count,
    'percent_complete', v_row.percent_complete,
    'last_lesson_id', v_row.last_lesson_id,
    'last_activity_at', v_row.last_activity_at,
    'completed_at', v_row.completed_at
  );
end;
$$;

revoke all on function public.get_my_learning_section_progress(uuid) from public, anon;
grant execute on function public.get_my_learning_section_progress(uuid) to authenticated, service_role;

create or replace function public.learning_progress_after_lesson_change(
  p_lesson_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_section_id uuid;
begin
  if p_lesson_id is null or p_user_id is null then
    return;
  end if;
  select section_id into v_section_id from public.learning_lessons where id = p_lesson_id;
  if v_section_id is not null then
    perform public.recompute_learning_section_progress(v_section_id, p_user_id);
  end if;
end;
$$;

revoke all on function public.learning_progress_after_lesson_change(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.learning_progress_after_lesson_change(uuid, uuid)
  to service_role;

create or replace function public.learning_lesson_progress_section_recompute_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.learning_progress_after_lesson_change(new.lesson_id, new.user_id);
  return new;
end;
$$;

drop trigger if exists learning_lesson_progress_section_recompute
  on public.learning_lesson_progress;
create trigger learning_lesson_progress_section_recompute
  after insert or update on public.learning_lesson_progress
  for each row
  execute function public.learning_lesson_progress_section_recompute_trg();

-- ---------------------------------------------------------------------------
-- F) Course resources
-- ---------------------------------------------------------------------------

create table if not exists public.learning_course_resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null
    references public.learning_courses (id) on delete cascade,
  title text not null
    constraint learning_course_resources_title_len check (
      char_length(btrim(title)) between 1 and 200
    ),
  resource_kind text not null
    constraint learning_course_resources_kind_check check (
      resource_kind in ('pdf', 'zip', 'image', 'external_link', 'other')
    ),
  url text not null,
  filename text
    constraint learning_course_resources_filename_len check (
      filename is null or char_length(btrim(filename)) between 1 and 255
    ),
  mime_type text
    constraint learning_course_resources_mime_len check (
      mime_type is null or char_length(mime_type) between 3 and 128
    ),
  size_bytes bigint
    constraint learning_course_resources_size_nonneg check (
      size_bytes is null or size_bytes >= 0
    ),
  position integer not null default 0
    constraint learning_course_resources_position_nonneg check (position >= 0),
  status text not null default 'draft'
    constraint learning_course_resources_status_check check (
      status in ('draft', 'published', 'archived')
    ),
  created_by uuid
    references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.learning_course_resources is
  'Course-level downloadable/external resources. Manager-authored; learners see published.';

create index if not exists learning_course_resources_course_pos_idx
  on public.learning_course_resources (course_id, position, id);

drop trigger if exists learning_course_resources_set_updated_at on public.learning_course_resources;
create trigger learning_course_resources_set_updated_at
  before update on public.learning_course_resources
  for each row execute function public.set_row_updated_at();

alter table public.learning_course_resources enable row level security;
alter table public.learning_course_resources force row level security;
revoke all on table public.learning_course_resources from public, anon, authenticated;
grant select on table public.learning_course_resources to authenticated;
revoke insert, update, delete on table public.learning_course_resources from anon, authenticated;
grant all on table public.learning_course_resources to service_role;

drop policy if exists "Learners read published course resources"
  on public.learning_course_resources;
create policy "Learners read published course resources"
  on public.learning_course_resources for select to authenticated
  using (
    status = 'published'
    and public.has_learning_course_access(course_id)
  );

drop policy if exists "Managers read scoped course resources"
  on public.learning_course_resources;
create policy "Managers read scoped course resources"
  on public.learning_course_resources for select to authenticated
  using (
    public.can_manage_learning_course(course_id)
    or public.is_learning_course_staff(course_id)
    or public.is_platform_admin()
  );

create table if not exists public.learning_course_resource_downloads (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null
    references public.learning_course_resources (id) on delete cascade,
  user_id uuid not null
    references public.profiles (id) on delete cascade,
  downloaded_at timestamptz not null default now()
);

create index if not exists learning_course_resource_downloads_user_resource_idx
  on public.learning_course_resource_downloads (user_id, resource_id, downloaded_at desc);

alter table public.learning_course_resource_downloads enable row level security;
alter table public.learning_course_resource_downloads force row level security;
revoke all on table public.learning_course_resource_downloads from public, anon, authenticated;
grant select on table public.learning_course_resource_downloads to authenticated;
revoke insert, update, delete on table public.learning_course_resource_downloads from anon, authenticated;
grant all on table public.learning_course_resource_downloads to service_role;

drop policy if exists "Learners read own resource downloads"
  on public.learning_course_resource_downloads;
create policy "Learners read own resource downloads"
  on public.learning_course_resource_downloads for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.upsert_learning_course_resource(
  p_course_id uuid,
  p_title text,
  p_resource_kind text,
  p_url text,
  p_filename text default null,
  p_mime_type text default null,
  p_size_bytes bigint default null,
  p_position integer default 0,
  p_resource_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_space_id uuid;
  v_row public.learning_course_resources%rowtype;
  v_kind text := lower(nullif(btrim(coalesce(p_resource_kind, '')), ''));
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not (
    public.can_manage_learning_course(p_course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to manage this course';
  end if;
  if v_title is null then raise exception 'title is required'; end if;
  if v_kind not in ('pdf', 'zip', 'image', 'external_link', 'other') then
    raise exception 'Invalid resource_kind';
  end if;
  perform public.learning_lesson_content_block_assert_safe_url('resource.url', p_url);

  select p.space_id into v_space_id
  from public.learning_courses c
  join public.learning_programs p on p.id = c.program_id
  where c.id = p_course_id;

  if p_resource_id is null then
    insert into public.learning_course_resources (
      course_id, title, resource_kind, url, filename, mime_type, size_bytes,
      position, status, created_by
    ) values (
      p_course_id, v_title, v_kind, p_url, nullif(btrim(coalesce(p_filename, '')), ''),
      nullif(btrim(coalesce(p_mime_type, '')), ''), p_size_bytes,
      coalesce(p_position, 0), 'draft', v_uid
    )
    returning * into v_row;
  else
    update public.learning_course_resources
    set title = v_title,
        resource_kind = v_kind,
        url = p_url,
        filename = nullif(btrim(coalesce(p_filename, '')), ''),
        mime_type = nullif(btrim(coalesce(p_mime_type, '')), ''),
        size_bytes = p_size_bytes,
        position = coalesce(p_position, position),
        updated_at = now()
    where id = p_resource_id and course_id = p_course_id
    returning * into v_row;
    if not found then raise exception 'Resource not found'; end if;
  end if;

  perform public.learning_audit_write(
    v_uid, v_space_id, 'course.resource_upsert',
    'learning_course_resource', v_row.id::text,
    jsonb_build_object('course_id', p_course_id, 'kind', v_kind)
  );

  return to_jsonb(v_row);
end;
$$;

create or replace function public.publish_learning_course_resource(p_resource_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_course_resources%rowtype;
  v_space_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_row from public.learning_course_resources where id = p_resource_id for update;
  if not found then raise exception 'Resource not found'; end if;
  if not (
    public.can_manage_learning_course(v_row.course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to manage this course';
  end if;
  update public.learning_course_resources
  set status = 'published', updated_at = now()
  where id = p_resource_id
  returning * into v_row;
  select p.space_id into v_space_id
  from public.learning_courses c
  join public.learning_programs p on p.id = c.program_id
  where c.id = v_row.course_id;
  perform public.learning_audit_write(
    v_uid, v_space_id, 'course.resource_publish',
    'learning_course_resource', p_resource_id::text, '{}'::jsonb
  );
  return to_jsonb(v_row);
end;
$$;

create or replace function public.archive_learning_course_resource(p_resource_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_course_resources%rowtype;
  v_space_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_row from public.learning_course_resources where id = p_resource_id for update;
  if not found then raise exception 'Resource not found'; end if;
  if not (
    public.can_manage_learning_course(v_row.course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to manage this course';
  end if;
  update public.learning_course_resources
  set status = 'archived', updated_at = now()
  where id = p_resource_id
  returning * into v_row;
  select p.space_id into v_space_id
  from public.learning_courses c
  join public.learning_programs p on p.id = c.program_id
  where c.id = v_row.course_id;
  perform public.learning_audit_write(
    v_uid, v_space_id, 'course.resource_archive',
    'learning_course_resource', p_resource_id::text, '{}'::jsonb
  );
  return to_jsonb(v_row);
end;
$$;

create or replace function public.list_my_learning_course_resources(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_items jsonb;
  v_manage boolean;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not (
    public.has_learning_course_access(p_course_id, v_uid)
    or public.can_manage_learning_course(p_course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not entitled to this course';
  end if;
  v_manage := public.can_manage_learning_course(p_course_id, v_uid)
    or public.is_platform_admin(v_uid)
    or public.is_learning_course_staff(p_course_id, v_uid);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id, 'title', r.title, 'resource_kind', r.resource_kind,
      'url', r.url, 'filename', r.filename, 'mime_type', r.mime_type,
      'size_bytes', r.size_bytes, 'position', r.position, 'status', r.status
    ) order by r.position, r.created_at
  ), '[]'::jsonb)
  into v_items
  from public.learning_course_resources r
  where r.course_id = p_course_id
    and (v_manage or r.status = 'published');

  return jsonb_build_object('course_id', p_course_id, 'resources', v_items);
end;
$$;

create or replace function public.track_my_learning_course_resource_download(p_resource_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_res public.learning_course_resources%rowtype;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_res from public.learning_course_resources where id = p_resource_id;
  if not found then raise exception 'Resource not found'; end if;
  if v_res.status is distinct from 'published' then
    raise exception 'Resource is not published';
  end if;
  if not public.has_learning_course_access(v_res.course_id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;
  insert into public.learning_course_resource_downloads (resource_id, user_id)
  values (p_resource_id, v_uid)
  returning id into v_id;
  return jsonb_build_object(
    'download_id', v_id,
    'resource_id', p_resource_id,
    'downloaded_at', now()
  );
end;
$$;

revoke all on function public.upsert_learning_course_resource(
  uuid, text, text, text, text, text, bigint, integer, uuid
) from public, anon;
grant execute on function public.upsert_learning_course_resource(
  uuid, text, text, text, text, text, bigint, integer, uuid
) to authenticated, service_role;
revoke all on function public.publish_learning_course_resource(uuid) from public, anon;
grant execute on function public.publish_learning_course_resource(uuid) to authenticated, service_role;
revoke all on function public.archive_learning_course_resource(uuid) from public, anon;
grant execute on function public.archive_learning_course_resource(uuid) to authenticated, service_role;
revoke all on function public.list_my_learning_course_resources(uuid) from public, anon;
grant execute on function public.list_my_learning_course_resources(uuid) to authenticated, service_role;
revoke all on function public.track_my_learning_course_resource_download(uuid) from public, anon;
grant execute on function public.track_my_learning_course_resource_download(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- G) Projects (activity type = project)
-- ---------------------------------------------------------------------------

create table if not exists public.learning_project_specs (
  activity_id uuid primary key
    references public.learning_activities (id) on delete cascade,
  instructions text not null default ''
    constraint learning_project_specs_instructions_len check (
      char_length(instructions) <= 20000
    ),
  created_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

drop trigger if exists learning_project_specs_set_updated_at on public.learning_project_specs;
create trigger learning_project_specs_set_updated_at
  before update on public.learning_project_specs
  for each row execute function public.set_row_updated_at();

alter table public.learning_project_specs enable row level security;
alter table public.learning_project_specs force row level security;
revoke all on table public.learning_project_specs from public, anon, authenticated;
grant select on table public.learning_project_specs to authenticated;
revoke insert, update, delete on table public.learning_project_specs from anon, authenticated;
grant all on table public.learning_project_specs to service_role;

create table if not exists public.learning_project_submissions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.learning_spaces (id) on delete restrict,
  course_id uuid not null references public.learning_courses (id) on delete restrict,
  lesson_id uuid not null references public.learning_lessons (id) on delete restrict,
  activity_id uuid not null references public.learning_activities (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  attempt_number integer not null
    constraint learning_project_submissions_attempt_pos check (attempt_number >= 1),
  status text not null default 'draft'
    constraint learning_project_submissions_status_check check (
      status in ('draft', 'submitted', 'reviewed', 'completed')
    ),
  submitted_at timestamptz,
  body_text text
    constraint learning_project_submissions_body_len check (
      body_text is null or char_length(body_text) <= 50000
    ),
  artifact_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_project_submissions_user_activity_attempt_unique
    unique (user_id, activity_id, attempt_number)
);

create index if not exists learning_project_submissions_activity_idx
  on public.learning_project_submissions (activity_id, status);

drop trigger if exists learning_project_submissions_set_updated_at
  on public.learning_project_submissions;
create trigger learning_project_submissions_set_updated_at
  before update on public.learning_project_submissions
  for each row execute function public.set_row_updated_at();

alter table public.learning_project_submissions enable row level security;
alter table public.learning_project_submissions force row level security;
revoke all on table public.learning_project_submissions from public, anon, authenticated;
grant select on table public.learning_project_submissions to authenticated;
revoke insert, update, delete on table public.learning_project_submissions from anon, authenticated;
grant all on table public.learning_project_submissions to service_role;

create table if not exists public.learning_project_reviews (
  submission_id uuid primary key
    references public.learning_project_submissions (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete restrict,
  status text not null
    constraint learning_project_reviews_status_check check (
      status in ('approved', 'needs_changes')
    ),
  feedback text
    constraint learning_project_reviews_feedback_len check (
      feedback is null or char_length(feedback) <= 4000
    ),
  reviewed_at timestamptz not null default now()
);

alter table public.learning_project_reviews enable row level security;
alter table public.learning_project_reviews force row level security;
revoke all on table public.learning_project_reviews from public, anon, authenticated;
grant select on table public.learning_project_reviews to authenticated;
revoke insert, update, delete on table public.learning_project_reviews from anon, authenticated;
grant all on table public.learning_project_reviews to service_role;

drop policy if exists "Access project specs via course"
  on public.learning_project_specs;
create policy "Access project specs via course"
  on public.learning_project_specs for select to authenticated
  using (
    exists (
      select 1 from public.learning_activities a
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

drop policy if exists "Learners read own project submissions"
  on public.learning_project_submissions;
create policy "Learners read own project submissions"
  on public.learning_project_submissions for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Managers read scoped project submissions"
  on public.learning_project_submissions;
create policy "Managers read scoped project submissions"
  on public.learning_project_submissions for select to authenticated
  using (
    public.can_manage_learning_course(course_id) or public.is_platform_admin()
  );

drop policy if exists "Learners read own project reviews"
  on public.learning_project_reviews;
create policy "Learners read own project reviews"
  on public.learning_project_reviews for select to authenticated
  using (
    exists (
      select 1 from public.learning_project_submissions s
      where s.id = submission_id and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "Managers read scoped project reviews"
  on public.learning_project_reviews;
create policy "Managers read scoped project reviews"
  on public.learning_project_reviews for select to authenticated
  using (
    exists (
      select 1 from public.learning_project_submissions s
      where s.id = submission_id
        and (public.can_manage_learning_course(s.course_id) or public.is_platform_admin())
    )
  );

create or replace function public.learning_project_load_context(p_activity_id uuid)
returns table (
  o_activity public.learning_activities,
  o_lesson public.learning_lessons,
  o_section public.learning_sections,
  o_course public.learning_courses,
  o_space_id uuid
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
begin
  if p_activity_id is null then raise exception 'activity_id is required'; end if;
  select * into v_activity from public.learning_activities where id = p_activity_id;
  if not found then raise exception 'Learning activity not found'; end if;
  if v_activity.type is distinct from 'project' then
    raise exception 'Activity is not a project';
  end if;
  select * into v_lesson from public.learning_lessons where id = v_activity.lesson_id;
  select * into v_section from public.learning_sections where id = v_lesson.section_id;
  select * into v_course from public.learning_courses where id = v_section.course_id;
  select p.space_id into v_space_id from public.learning_programs p where p.id = v_course.program_id;
  return query select v_activity, v_lesson, v_section, v_course, v_space_id;
end;
$$;

revoke all on function public.learning_project_load_context(uuid)
  from public, anon, authenticated;

create or replace function public.upsert_learning_project_spec(
  p_activity_id uuid,
  p_instructions text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_row public.learning_project_specs%rowtype;
  v_instructions text := coalesce(p_instructions, '');
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_project_load_context(p_activity_id);
  if not (
    public.can_manage_learning_course(v_ctx.o_course.id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to manage this project';
  end if;
  if char_length(v_instructions) > 20000 then
    raise exception 'instructions exceeds maximum length';
  end if;
  insert into public.learning_project_specs (activity_id, instructions, created_by)
  values (p_activity_id, v_instructions, v_uid)
  on conflict (activity_id) do update set
    instructions = excluded.instructions,
    updated_at = now()
  returning * into v_row;
  perform public.learning_audit_write(
    v_uid, v_ctx.o_space_id, 'project.spec_upsert',
    'learning_project_spec', p_activity_id::text, '{}'::jsonb
  );
  return jsonb_build_object(
    'activity_id', v_row.activity_id,
    'instructions', v_row.instructions
  );
end;
$$;

create or replace function public.start_my_learning_project_submission(p_activity_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_attempt integer;
  v_row public.learning_project_submissions%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_project_load_context(p_activity_id);
  if not public.has_learning_course_access(v_ctx.o_course.id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;
  select * into v_row
  from public.learning_project_submissions
  where user_id = v_uid and activity_id = p_activity_id and status = 'draft'
  order by attempt_number desc limit 1;
  if found then
    return to_jsonb(v_row);
  end if;
  select coalesce(max(attempt_number), 0) + 1 into v_attempt
  from public.learning_project_submissions
  where user_id = v_uid and activity_id = p_activity_id;
  insert into public.learning_project_submissions (
    space_id, course_id, lesson_id, activity_id, user_id, attempt_number, status
  ) values (
    v_ctx.o_space_id, v_ctx.o_course.id, v_ctx.o_lesson.id, p_activity_id,
    v_uid, v_attempt, 'draft'
  )
  returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.save_my_learning_project_submission(
  p_submission_id uuid,
  p_body_text text default null,
  p_artifact_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_project_submissions%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_row from public.learning_project_submissions
  where id = p_submission_id for update;
  if not found then raise exception 'Submission not found'; end if;
  if v_row.user_id is distinct from v_uid then
    raise exception 'Not allowed';
  end if;
  if v_row.status is distinct from 'draft' then
    raise exception 'Submission is not a draft';
  end if;
  if p_artifact_url is not null then
    perform public.learning_lesson_content_block_assert_safe_url('artifact_url', p_artifact_url);
  end if;
  if p_body_text is not null then
    perform public.learning_lesson_content_block_assert_safe_text('body_text', p_body_text);
  end if;
  update public.learning_project_submissions
  set body_text = coalesce(p_body_text, body_text),
      artifact_url = coalesce(p_artifact_url, artifact_url),
      updated_at = now()
  where id = p_submission_id
  returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.submit_my_learning_project_submission(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_project_submissions%rowtype;
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_row from public.learning_project_submissions
  where id = p_submission_id for update;
  if not found then raise exception 'Submission not found'; end if;
  if v_row.user_id is distinct from v_uid then raise exception 'Not allowed'; end if;
  if v_row.status is distinct from 'draft' then
    raise exception 'Submission is not a draft';
  end if;
  if coalesce(nullif(btrim(coalesce(v_row.body_text, '')), ''), null) is null
     and v_row.artifact_url is null
  then
    raise exception 'Add body_text or artifact_url before submitting';
  end if;
  update public.learning_project_submissions
  set status = 'submitted', submitted_at = v_now, updated_at = v_now
  where id = p_submission_id
  returning * into v_row;
  perform public.learning_audit_write(
    v_uid, v_row.space_id, 'project.submission_submitted',
    'learning_project_submission', p_submission_id::text,
    jsonb_build_object('activity_id', v_row.activity_id)
  );
  return to_jsonb(v_row);
end;
$$;

create or replace function public.get_my_learning_project(p_activity_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_spec public.learning_project_specs%rowtype;
  v_sub public.learning_project_submissions%rowtype;
  v_review public.learning_project_reviews%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_project_load_context(p_activity_id);
  if not public.has_learning_course_access(v_ctx.o_course.id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;
  select * into v_spec from public.learning_project_specs where activity_id = p_activity_id;
  select * into v_sub from public.learning_project_submissions
  where activity_id = p_activity_id and user_id = v_uid
  order by attempt_number desc limit 1;
  if found then
    select * into v_review from public.learning_project_reviews where submission_id = v_sub.id;
  end if;
  return jsonb_build_object(
    'activity_id', p_activity_id,
    'activity_name', v_ctx.o_activity.name,
    'activity_status', v_ctx.o_activity.status,
    'instructions', coalesce(v_spec.instructions, ''),
    'submission', case when v_sub.id is null then null else to_jsonb(v_sub) end,
    'review', case when v_review.submission_id is null then null else to_jsonb(v_review) end
  );
end;
$$;

create or replace function public.review_learning_project_submission(
  p_submission_id uuid,
  p_status text,
  p_feedback text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.learning_project_submissions%rowtype;
  v_status text := lower(nullif(btrim(coalesce(p_status, '')), ''));
  v_review public.learning_project_reviews%rowtype;
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if v_status not in ('approved', 'needs_changes') then
    raise exception 'status must be approved|needs_changes';
  end if;
  select * into v_sub from public.learning_project_submissions
  where id = p_submission_id for update;
  if not found then raise exception 'Submission not found'; end if;
  if not (
    public.can_manage_learning_course(v_sub.course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not allowed to review this project';
  end if;
  if v_sub.status not in ('submitted', 'reviewed') then
    raise exception 'Submission is not reviewable';
  end if;
  if p_feedback is not null then
    perform public.learning_lesson_content_block_assert_safe_text('feedback', p_feedback);
  end if;

  insert into public.learning_project_reviews (
    submission_id, reviewer_id, status, feedback, reviewed_at
  ) values (
    p_submission_id, v_uid, v_status, p_feedback, v_now
  )
  on conflict (submission_id) do update set
    reviewer_id = excluded.reviewer_id,
    status = excluded.status,
    feedback = excluded.feedback,
    reviewed_at = excluded.reviewed_at
  returning * into v_review;

  update public.learning_project_submissions
  set status = case when v_status = 'approved' then 'completed' else 'reviewed' end,
      updated_at = v_now
  where id = p_submission_id
  returning * into v_sub;

  perform public.learning_audit_write(
    v_uid, v_sub.space_id, 'project.submission_reviewed',
    'learning_project_submission', p_submission_id::text,
    jsonb_build_object('review_status', v_status)
  );

  return jsonb_build_object(
    'submission', to_jsonb(v_sub),
    'review', to_jsonb(v_review)
  );
end;
$$;

revoke all on function public.upsert_learning_project_spec(uuid, text) from public, anon;
grant execute on function public.upsert_learning_project_spec(uuid, text) to authenticated, service_role;
revoke all on function public.start_my_learning_project_submission(uuid) from public, anon;
grant execute on function public.start_my_learning_project_submission(uuid) to authenticated, service_role;
revoke all on function public.save_my_learning_project_submission(uuid, text, text) from public, anon;
grant execute on function public.save_my_learning_project_submission(uuid, text, text)
  to authenticated, service_role;
revoke all on function public.submit_my_learning_project_submission(uuid) from public, anon;
grant execute on function public.submit_my_learning_project_submission(uuid)
  to authenticated, service_role;
revoke all on function public.get_my_learning_project(uuid) from public, anon;
grant execute on function public.get_my_learning_project(uuid) to authenticated, service_role;
revoke all on function public.review_learning_project_submission(uuid, text, text) from public, anon;
grant execute on function public.review_learning_project_submission(uuid, text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- H) Labs (activity type = lab)
-- ---------------------------------------------------------------------------

create table if not exists public.learning_lab_specs (
  activity_id uuid primary key
    references public.learning_activities (id) on delete cascade,
  instructions text not null default ''
    constraint learning_lab_specs_instructions_len check (
      char_length(instructions) <= 20000
    ),
  starter_files jsonb not null default '[]'::jsonb
    constraint learning_lab_specs_starter_files_array check (
      jsonb_typeof(starter_files) = 'array'
    ),
  resources jsonb not null default '[]'::jsonb
    constraint learning_lab_specs_resources_array check (
      jsonb_typeof(resources) = 'array'
    ),
  validation_hook text
    constraint learning_lab_specs_hook_len check (
      validation_hook is null
      or validation_hook ~ '^[a-z][a-z0-9_]{0,63}$'
    ),
  created_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

drop trigger if exists learning_lab_specs_set_updated_at on public.learning_lab_specs;
create trigger learning_lab_specs_set_updated_at
  before update on public.learning_lab_specs
  for each row execute function public.set_row_updated_at();

alter table public.learning_lab_specs enable row level security;
alter table public.learning_lab_specs force row level security;
revoke all on table public.learning_lab_specs from public, anon, authenticated;
grant select on table public.learning_lab_specs to authenticated;
revoke insert, update, delete on table public.learning_lab_specs from anon, authenticated;
grant all on table public.learning_lab_specs to service_role;

create table if not exists public.learning_lab_completions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_id uuid not null references public.learning_activities (id) on delete cascade,
  status text not null default 'in_progress'
    constraint learning_lab_completions_status_check check (
      status in ('in_progress', 'completed')
    ),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  validation_result jsonb
    constraint learning_lab_completions_validation_object check (
      validation_result is null or jsonb_typeof(validation_result) = 'object'
    ),
  primary key (user_id, activity_id)
);

alter table public.learning_lab_completions enable row level security;
alter table public.learning_lab_completions force row level security;
revoke all on table public.learning_lab_completions from public, anon, authenticated;
grant select on table public.learning_lab_completions to authenticated;
revoke insert, update, delete on table public.learning_lab_completions from anon, authenticated;
grant all on table public.learning_lab_completions to service_role;

drop policy if exists "Access lab specs via course" on public.learning_lab_specs;
create policy "Access lab specs via course"
  on public.learning_lab_specs for select to authenticated
  using (
    exists (
      select 1 from public.learning_activities a
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

drop policy if exists "Learners read own lab completions" on public.learning_lab_completions;
create policy "Learners read own lab completions"
  on public.learning_lab_completions for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Managers read scoped lab completions" on public.learning_lab_completions;
create policy "Managers read scoped lab completions"
  on public.learning_lab_completions for select to authenticated
  using (
    exists (
      select 1 from public.learning_activities a
      join public.learning_lessons les on les.id = a.lesson_id
      join public.learning_sections sec on sec.id = les.section_id
      where a.id = activity_id
        and (public.can_manage_learning_course(sec.course_id) or public.is_platform_admin())
    )
  );

create or replace function public.learning_lab_load_context(p_activity_id uuid)
returns table (
  o_activity public.learning_activities,
  o_lesson public.learning_lessons,
  o_section public.learning_sections,
  o_course public.learning_courses,
  o_space_id uuid
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_activity public.learning_activities%rowtype;
  v_lesson public.learning_lessons%rowtype;
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_space_id uuid;
begin
  select * into v_activity from public.learning_activities where id = p_activity_id;
  if not found then raise exception 'Learning activity not found'; end if;
  if v_activity.type is distinct from 'lab' then raise exception 'Activity is not a lab'; end if;
  select * into v_lesson from public.learning_lessons where id = v_activity.lesson_id;
  select * into v_section from public.learning_sections where id = v_lesson.section_id;
  select * into v_course from public.learning_courses where id = v_section.course_id;
  select p.space_id into v_space_id from public.learning_programs p where p.id = v_course.program_id;
  return query select v_activity, v_lesson, v_section, v_course, v_space_id;
end;
$$;
revoke all on function public.learning_lab_load_context(uuid) from public, anon, authenticated;

create or replace function public.upsert_learning_lab_spec(
  p_activity_id uuid,
  p_instructions text default '',
  p_starter_files jsonb default '[]'::jsonb,
  p_resources jsonb default '[]'::jsonb,
  p_validation_hook text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_row public.learning_lab_specs%rowtype;
  v_elem jsonb;
  v_files jsonb := coalesce(p_starter_files, '[]'::jsonb);
  v_res jsonb := coalesce(p_resources, '[]'::jsonb);
  v_hook text := nullif(btrim(coalesce(p_validation_hook, '')), '');
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_lab_load_context(p_activity_id);
  if not (public.can_manage_learning_course(v_ctx.o_course.id, v_uid) or public.is_platform_admin(v_uid)) then
    raise exception 'Not allowed to manage this lab';
  end if;
  if jsonb_typeof(v_files) is distinct from 'array' or jsonb_typeof(v_res) is distinct from 'array' then
    raise exception 'starter_files and resources must be arrays';
  end if;
  if jsonb_array_length(v_files) > 32 or jsonb_array_length(v_res) > 32 then
    raise exception 'Too many starter_files or resources';
  end if;
  for v_elem in select * from jsonb_array_elements(v_files)
  loop
    if nullif(btrim(coalesce(v_elem->>'label', '')), '') is null then
      raise exception 'starter_files.label is required';
    end if;
    perform public.learning_lesson_content_block_assert_safe_url('starter_files.url', v_elem->>'url');
  end loop;
  for v_elem in select * from jsonb_array_elements(v_res)
  loop
    if nullif(btrim(coalesce(v_elem->>'label', '')), '') is null then
      raise exception 'resources.label is required';
    end if;
    perform public.learning_lesson_content_block_assert_safe_url('resources.url', v_elem->>'url');
  end loop;
  if v_hook is not null and v_hook !~ '^[a-z][a-z0-9_]{0,63}$' then
    raise exception 'Invalid validation_hook';
  end if;
  insert into public.learning_lab_specs (
    activity_id, instructions, starter_files, resources, validation_hook, created_by
  ) values (
    p_activity_id, coalesce(p_instructions, ''), v_files, v_res, v_hook, v_uid
  )
  on conflict (activity_id) do update set
    instructions = excluded.instructions,
    starter_files = excluded.starter_files,
    resources = excluded.resources,
    validation_hook = excluded.validation_hook,
    updated_at = now()
  returning * into v_row;
  perform public.learning_audit_write(
    v_uid, v_ctx.o_space_id, 'lab.spec_upsert',
    'learning_lab_spec', p_activity_id::text, '{}'::jsonb
  );
  return to_jsonb(v_row);
end;
$$;

create or replace function public.start_my_learning_lab(p_activity_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_row public.learning_lab_completions%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_lab_load_context(p_activity_id);
  if not public.has_learning_course_access(v_ctx.o_course.id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;
  insert into public.learning_lab_completions (user_id, activity_id, status)
  values (v_uid, p_activity_id, 'in_progress')
  on conflict (user_id, activity_id) do update set
    status = case
      when public.learning_lab_completions.status = 'completed' then 'completed'
      else 'in_progress'
    end
  returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.complete_my_learning_lab(
  p_activity_id uuid,
  p_validation_result jsonb default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_row public.learning_lab_completions%rowtype;
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_lab_load_context(p_activity_id);
  if not public.has_learning_course_access(v_ctx.o_course.id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;
  if p_validation_result is not null and jsonb_typeof(p_validation_result) is distinct from 'object' then
    raise exception 'validation_result must be an object';
  end if;
  insert into public.learning_lab_completions (
    user_id, activity_id, status, started_at, completed_at, validation_result
  ) values (
    v_uid, p_activity_id, 'completed', v_now, v_now, p_validation_result
  )
  on conflict (user_id, activity_id) do update set
    status = 'completed',
    completed_at = coalesce(public.learning_lab_completions.completed_at, v_now),
    validation_result = coalesce(excluded.validation_result, public.learning_lab_completions.validation_result)
  returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.get_my_learning_lab(p_activity_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_spec public.learning_lab_specs%rowtype;
  v_comp public.learning_lab_completions%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_lab_load_context(p_activity_id);
  if not public.has_learning_course_access(v_ctx.o_course.id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;
  select * into v_spec from public.learning_lab_specs where activity_id = p_activity_id;
  select * into v_comp from public.learning_lab_completions
  where user_id = v_uid and activity_id = p_activity_id;
  return jsonb_build_object(
    'activity_id', p_activity_id,
    'activity_name', v_ctx.o_activity.name,
    'instructions', coalesce(v_spec.instructions, ''),
    'starter_files', coalesce(v_spec.starter_files, '[]'::jsonb),
    'resources', coalesce(v_spec.resources, '[]'::jsonb),
    'validation_hook', v_spec.validation_hook,
    'completion', case when v_comp.user_id is null then null else to_jsonb(v_comp) end
  );
end;
$$;

revoke all on function public.upsert_learning_lab_spec(uuid, text, jsonb, jsonb, text) from public, anon;
grant execute on function public.upsert_learning_lab_spec(uuid, text, jsonb, jsonb, text) to authenticated, service_role;
revoke all on function public.start_my_learning_lab(uuid) from public, anon;
grant execute on function public.start_my_learning_lab(uuid) to authenticated, service_role;
revoke all on function public.complete_my_learning_lab(uuid, jsonb) from public, anon;
grant execute on function public.complete_my_learning_lab(uuid, jsonb) to authenticated, service_role;
revoke all on function public.get_my_learning_lab(uuid) from public, anon;
grant execute on function public.get_my_learning_lab(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- I) UM Points lesson unlock (no um_points_ledger positive-check change)
-- ---------------------------------------------------------------------------

create table if not exists public.learning_lesson_point_costs (
  lesson_id uuid primary key
    references public.learning_lessons (id) on delete cascade,
  unlock_cost integer not null
    constraint learning_lesson_point_costs_cost_pos check (unlock_cost > 0),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

drop trigger if exists learning_lesson_point_costs_set_updated_at on public.learning_lesson_point_costs;
create trigger learning_lesson_point_costs_set_updated_at
  before update on public.learning_lesson_point_costs
  for each row execute function public.set_row_updated_at();

alter table public.learning_lesson_point_costs enable row level security;
alter table public.learning_lesson_point_costs force row level security;
revoke all on table public.learning_lesson_point_costs from public, anon, authenticated;
grant select on table public.learning_lesson_point_costs to authenticated;
revoke insert, update, delete on table public.learning_lesson_point_costs from anon, authenticated;
grant all on table public.learning_lesson_point_costs to service_role;

create table if not exists public.learning_lesson_unlocks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.learning_lessons (id) on delete cascade,
  points_spent integer not null
    constraint learning_lesson_unlocks_points_pos check (points_spent > 0),
  unlocked_at timestamptz not null default now(),
  dedupe_key text not null,
  constraint learning_lesson_unlocks_pk primary key (user_id, lesson_id),
  constraint learning_lesson_unlocks_dedupe_unique unique (user_id, dedupe_key)
);

alter table public.learning_lesson_unlocks enable row level security;
alter table public.learning_lesson_unlocks force row level security;
revoke all on table public.learning_lesson_unlocks from public, anon, authenticated;
grant select on table public.learning_lesson_unlocks to authenticated;
revoke insert, update, delete on table public.learning_lesson_unlocks from anon, authenticated;
grant all on table public.learning_lesson_unlocks to service_role;

drop policy if exists "Entitled readers select lesson point costs"
  on public.learning_lesson_point_costs;
create policy "Entitled readers select lesson point costs"
  on public.learning_lesson_point_costs for select to authenticated
  using (
    exists (
      select 1 from public.learning_lessons les
      join public.learning_sections sec on sec.id = les.section_id
      where les.id = lesson_id
        and (
          public.has_learning_course_access(sec.course_id)
          or public.can_manage_learning_course(sec.course_id)
          or public.is_platform_admin()
        )
    )
  );

drop policy if exists "Learners read own lesson unlocks" on public.learning_lesson_unlocks;
create policy "Learners read own lesson unlocks"
  on public.learning_lesson_unlocks for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.set_learning_lesson_point_cost(
  p_lesson_id uuid,
  p_unlock_cost integer,
  p_enabled boolean default true
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_row public.learning_lesson_point_costs%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_progress_load_lesson_context(p_lesson_id);
  if not (public.can_manage_learning_course(v_ctx.o_course.id, v_uid) or public.is_platform_admin(v_uid)) then
    raise exception 'Not allowed to manage this lesson';
  end if;
  if p_unlock_cost is null or p_unlock_cost <= 0 then
    raise exception 'unlock_cost must be > 0';
  end if;
  insert into public.learning_lesson_point_costs (lesson_id, unlock_cost, enabled)
  values (p_lesson_id, p_unlock_cost, coalesce(p_enabled, true))
  on conflict (lesson_id) do update set
    unlock_cost = excluded.unlock_cost,
    enabled = excluded.enabled,
    updated_at = now()
  returning * into v_row;
  perform public.learning_audit_write(
    v_uid, v_ctx.o_space_id, 'lesson.point_cost_set',
    'learning_lesson', p_lesson_id::text,
    jsonb_build_object('unlock_cost', v_row.unlock_cost, 'enabled', v_row.enabled)
  );
  return to_jsonb(v_row);
end;
$$;

create or replace function public.get_my_learning_lesson_unlock_state(p_lesson_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_cost public.learning_lesson_point_costs%rowtype;
  v_unlocked boolean := false;
  v_balance bigint := 0;
  v_manage boolean := false;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_progress_load_lesson_context(p_lesson_id);
  if not (
    public.has_learning_course_access(v_ctx.o_course.id, v_uid)
    or public.can_manage_learning_course(v_ctx.o_course.id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not entitled to this course';
  end if;
  v_manage := public.can_manage_learning_course(v_ctx.o_course.id, v_uid)
    or public.is_platform_admin(v_uid);
  select * into v_cost from public.learning_lesson_point_costs where lesson_id = p_lesson_id;
  select coalesce(b.balance, 0) into v_balance
  from public.um_point_balances b where b.user_id = v_uid;
  if not found then v_balance := 0; end if;
  select exists (
    select 1 from public.learning_lesson_unlocks u
    where u.user_id = v_uid and u.lesson_id = p_lesson_id
  ) into v_unlocked;
  return jsonb_build_object(
    'lesson_id', p_lesson_id,
    'locked', case
      when v_manage then false
      when v_cost.lesson_id is null or not v_cost.enabled then false
      when v_unlocked then false
      else true
    end,
    'cost', case when v_cost.enabled then v_cost.unlock_cost else null end,
    'balance', v_balance,
    'unlocked', v_unlocked or v_manage
      or v_cost.lesson_id is null or not coalesce(v_cost.enabled, false)
  );
end;
$$;

create or replace function public.unlock_my_learning_lesson_with_um_points(p_lesson_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_cost public.learning_lesson_point_costs%rowtype;
  v_balance bigint;
  v_dedupe text;
  v_updated integer;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'authentication_required');
  end if;
  select * into v_ctx from public.learning_progress_load_lesson_context(p_lesson_id);
  if not public.has_learning_course_access(v_ctx.o_course.id, v_uid) then
    return jsonb_build_object('success', false, 'error', 'not_entitled');
  end if;
  if public.can_manage_learning_course(v_ctx.o_course.id, v_uid) or public.is_platform_admin(v_uid) then
    return jsonb_build_object('success', true, 'unlocked', true, 'reason', 'manager_bypass');
  end if;
  select * into v_cost from public.learning_lesson_point_costs where lesson_id = p_lesson_id;
  if not found or not v_cost.enabled then
    return jsonb_build_object('success', true, 'unlocked', true, 'reason', 'no_cost');
  end if;
  if exists (
    select 1 from public.learning_lesson_unlocks u
    where u.user_id = v_uid and u.lesson_id = p_lesson_id
  ) then
    return jsonb_build_object('success', true, 'unlocked', true, 'reason', 'already_unlocked');
  end if;

  v_dedupe := 'learning_lesson_unlock:' || p_lesson_id::text;
  update public.um_point_balances
  set balance = balance - v_cost.unlock_cost, updated_at = now()
  where user_id = v_uid and balance >= v_cost.unlock_cost;
  get diagnostics v_updated = row_count;
  if v_updated < 1 then
    select coalesce(balance, 0) into v_balance from public.um_point_balances where user_id = v_uid;
    return jsonb_build_object(
      'success', false, 'error', 'insufficient_balance',
      'cost', v_cost.unlock_cost, 'balance', coalesce(v_balance, 0)
    );
  end if;

  begin
    insert into public.learning_lesson_unlocks (
      user_id, lesson_id, points_spent, dedupe_key
    ) values (
      v_uid, p_lesson_id, v_cost.unlock_cost, v_dedupe
    );
  exception when unique_violation then
    update public.um_point_balances
    set balance = balance + v_cost.unlock_cost, updated_at = now()
    where user_id = v_uid;
    return jsonb_build_object('success', true, 'unlocked', true, 'reason', 'already_unlocked');
  end;

  select balance into v_balance from public.um_point_balances where user_id = v_uid;
  perform public.learning_audit_write(
    v_uid, v_ctx.o_space_id, 'lesson.um_points_unlock',
    'learning_lesson', p_lesson_id::text,
    jsonb_build_object('points_spent', v_cost.unlock_cost)
  );
  return jsonb_build_object(
    'success', true, 'unlocked', true,
    'points_spent', v_cost.unlock_cost, 'balance', v_balance
  );
end;
$$;

revoke all on function public.set_learning_lesson_point_cost(uuid, integer, boolean) from public, anon;
grant execute on function public.set_learning_lesson_point_cost(uuid, integer, boolean) to authenticated, service_role;
revoke all on function public.get_my_learning_lesson_unlock_state(uuid) from public, anon;
grant execute on function public.get_my_learning_lesson_unlock_state(uuid) to authenticated, service_role;
revoke all on function public.unlock_my_learning_lesson_with_um_points(uuid) from public, anon;
grant execute on function public.unlock_my_learning_lesson_with_um_points(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- J) AI Tutor integration layer (stubs; no provider)
-- ---------------------------------------------------------------------------

create table if not exists public.learning_ai_tutor_threads (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.learning_courses (id) on delete cascade,
  lesson_id uuid references public.learning_lessons (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'AI Tutor'
    constraint learning_ai_tutor_threads_title_len check (
      char_length(btrim(title)) between 1 and 160
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_ai_tutor_threads_user_course_idx
  on public.learning_ai_tutor_threads (user_id, course_id, updated_at desc);

drop trigger if exists learning_ai_tutor_threads_set_updated_at on public.learning_ai_tutor_threads;
create trigger learning_ai_tutor_threads_set_updated_at
  before update on public.learning_ai_tutor_threads
  for each row execute function public.set_row_updated_at();

alter table public.learning_ai_tutor_threads enable row level security;
alter table public.learning_ai_tutor_threads force row level security;
revoke all on table public.learning_ai_tutor_threads from public, anon, authenticated;
grant select on table public.learning_ai_tutor_threads to authenticated;
revoke insert, update, delete on table public.learning_ai_tutor_threads from anon, authenticated;
grant all on table public.learning_ai_tutor_threads to service_role;

create table if not exists public.learning_ai_tutor_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null
    references public.learning_ai_tutor_threads (id) on delete cascade,
  role text not null
    constraint learning_ai_tutor_messages_role_check check (
      role in ('user', 'assistant', 'system')
    ),
  message_kind text not null default 'other'
    constraint learning_ai_tutor_messages_kind_check check (
      message_kind in ('ask_question', 'explain_again', 'code_review', 'hint', 'other')
    ),
  content text not null
    constraint learning_ai_tutor_messages_content_len check (
      char_length(content) between 1 and 20000
    ),
  created_at timestamptz not null default now()
);

create index if not exists learning_ai_tutor_messages_thread_idx
  on public.learning_ai_tutor_messages (thread_id, created_at);

alter table public.learning_ai_tutor_messages enable row level security;
alter table public.learning_ai_tutor_messages force row level security;
revoke all on table public.learning_ai_tutor_messages from public, anon, authenticated;
grant select on table public.learning_ai_tutor_messages to authenticated;
revoke insert, update, delete on table public.learning_ai_tutor_messages from anon, authenticated;
grant all on table public.learning_ai_tutor_messages to service_role;

drop policy if exists "Learners read own ai tutor threads" on public.learning_ai_tutor_threads;
create policy "Learners read own ai tutor threads"
  on public.learning_ai_tutor_threads for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Learners read own ai tutor messages" on public.learning_ai_tutor_messages;
create policy "Learners read own ai tutor messages"
  on public.learning_ai_tutor_messages for select to authenticated
  using (
    exists (
      select 1 from public.learning_ai_tutor_threads t
      where t.id = thread_id and t.user_id = (select auth.uid())
    )
  );

create or replace function public.create_my_learning_ai_tutor_thread(
  p_course_id uuid,
  p_lesson_id uuid default null,
  p_title text default 'AI Tutor'
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_ai_tutor_threads%rowtype;
  v_title text := coalesce(nullif(btrim(coalesce(p_title, '')), ''), 'AI Tutor');
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_learning_course_access(p_course_id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;
  if p_lesson_id is not null then
    if not exists (
      select 1 from public.learning_lessons les
      join public.learning_sections sec on sec.id = les.section_id
      where les.id = p_lesson_id and sec.course_id = p_course_id
    ) then
      raise exception 'lesson_id is not in this course';
    end if;
  end if;
  insert into public.learning_ai_tutor_threads (course_id, lesson_id, user_id, title)
  values (p_course_id, p_lesson_id, v_uid, v_title)
  returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.append_my_learning_ai_tutor_message(
  p_thread_id uuid,
  p_kind text,
  p_content text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_thread public.learning_ai_tutor_threads%rowtype;
  v_kind text := lower(nullif(btrim(coalesce(p_kind, '')), ''));
  v_content text := nullif(btrim(coalesce(p_content, '')), '');
  v_user_msg public.learning_ai_tutor_messages%rowtype;
  v_asst_msg public.learning_ai_tutor_messages%rowtype;
  v_stub text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_thread from public.learning_ai_tutor_threads
  where id = p_thread_id for update;
  if not found or v_thread.user_id is distinct from v_uid then
    raise exception 'Thread not found';
  end if;
  if v_kind not in ('ask_question', 'explain_again', 'code_review', 'hint', 'other') then
    raise exception 'Invalid message_kind';
  end if;
  if v_content is null or char_length(v_content) > 20000 then
    raise exception 'content must be 1..20000 chars';
  end if;
  perform public.learning_lesson_content_block_assert_safe_text('ai_tutor.content', v_content);

  v_stub := case v_kind
    when 'ask_question' then 'AI Tutor is not connected yet. Your question was saved.'
    when 'explain_again' then 'AI Tutor is not connected yet. Your explain-again request was saved.'
    when 'code_review' then 'AI Tutor is not connected yet. Your code review request was saved.'
    when 'hint' then 'AI Tutor is not connected yet. Your hint request was saved.'
    else 'AI Tutor is not connected yet. Your message was saved.'
  end;

  insert into public.learning_ai_tutor_messages (thread_id, role, message_kind, content)
  values (p_thread_id, 'user', v_kind, v_content)
  returning * into v_user_msg;

  insert into public.learning_ai_tutor_messages (thread_id, role, message_kind, content)
  values (p_thread_id, 'assistant', v_kind, v_stub)
  returning * into v_asst_msg;

  update public.learning_ai_tutor_threads set updated_at = now() where id = p_thread_id;

  return jsonb_build_object(
    'thread_id', p_thread_id,
    'user_message', to_jsonb(v_user_msg),
    'assistant_message', to_jsonb(v_asst_msg)
  );
end;
$$;

create or replace function public.list_my_learning_ai_tutor_threads(
  p_course_id uuid default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_items jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id, 'course_id', t.course_id, 'lesson_id', t.lesson_id,
      'title', t.title, 'created_at', t.created_at, 'updated_at', t.updated_at
    ) order by t.updated_at desc
  ), '[]'::jsonb)
  into v_items
  from public.learning_ai_tutor_threads t
  where t.user_id = v_uid
    and (p_course_id is null or t.course_id = p_course_id);
  return jsonb_build_object('threads', v_items);
end;
$$;

create or replace function public.get_my_learning_ai_tutor_thread_messages(p_thread_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_thread public.learning_ai_tutor_threads%rowtype;
  v_items jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_thread from public.learning_ai_tutor_threads where id = p_thread_id;
  if not found or v_thread.user_id is distinct from v_uid then
    raise exception 'Thread not found';
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id, 'role', m.role, 'message_kind', m.message_kind,
      'content', m.content, 'created_at', m.created_at
    ) order by m.created_at
  ), '[]'::jsonb)
  into v_items
  from public.learning_ai_tutor_messages m
  where m.thread_id = p_thread_id;
  return jsonb_build_object('thread', to_jsonb(v_thread), 'messages', v_items);
end;
$$;

revoke all on function public.create_my_learning_ai_tutor_thread(uuid, uuid, text) from public, anon;
grant execute on function public.create_my_learning_ai_tutor_thread(uuid, uuid, text) to authenticated, service_role;
revoke all on function public.append_my_learning_ai_tutor_message(uuid, text, text) from public, anon;
grant execute on function public.append_my_learning_ai_tutor_message(uuid, text, text) to authenticated, service_role;
revoke all on function public.list_my_learning_ai_tutor_threads(uuid) from public, anon;
grant execute on function public.list_my_learning_ai_tutor_threads(uuid) to authenticated, service_role;
revoke all on function public.get_my_learning_ai_tutor_thread_messages(uuid) from public, anon;
grant execute on function public.get_my_learning_ai_tutor_thread_messages(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- K) Aggregated learner lesson engine + course progress bundle
-- ---------------------------------------------------------------------------

create or replace function public.get_my_learning_lesson_engine(p_lesson_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx record;
  v_manage boolean := false;
  v_unlock jsonb;
  v_locked boolean := false;
  v_objectives jsonb;
  v_prereqs jsonb;
  v_blocks jsonb := '[]'::jsonb;
  v_media jsonb;
  v_activities jsonb;
  v_lp public.learning_lesson_progress%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_ctx from public.learning_progress_load_lesson_context(p_lesson_id);
  if not (
    public.has_learning_course_access(v_ctx.o_course.id, v_uid)
    or public.can_manage_learning_course(v_ctx.o_course.id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not entitled to this course';
  end if;

  v_manage := public.can_manage_learning_course(v_ctx.o_course.id, v_uid)
    or public.is_platform_admin(v_uid);
  v_unlock := public.get_my_learning_lesson_unlock_state(p_lesson_id);
  v_locked := coalesce((v_unlock->>'locked')::boolean, false);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', o.id, 'position', o.position, 'objective_text', o.objective_text
    ) order by o.position
  ), '[]'::jsonb)
  into v_objectives
  from public.learning_lesson_objectives o
  where o.lesson_id = p_lesson_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'prerequisite_lesson_id', pr.prerequisite_lesson_id,
      'name', les.name,
      'satisfied', exists (
        select 1 from public.learning_lesson_progress lp
        where lp.lesson_id = pr.prerequisite_lesson_id
          and lp.user_id = v_uid and lp.status = 'completed'
      )
    ) order by les.position, les.id
  ), '[]'::jsonb)
  into v_prereqs
  from public.learning_lesson_prerequisites pr
  join public.learning_lessons les on les.id = pr.prerequisite_lesson_id
  where pr.lesson_id = p_lesson_id;

  if v_locked and not v_manage then
    return jsonb_build_object(
      'lesson_id', p_lesson_id,
      'lesson', jsonb_build_object(
        'name', v_ctx.o_lesson.name,
        'difficulty', v_ctx.o_lesson.difficulty,
        'estimated_duration_minutes', v_ctx.o_lesson.estimated_duration_minutes,
        'description', v_ctx.o_lesson.description,
        'status', v_ctx.o_lesson.status
      ),
      'objectives', v_objectives,
      'prerequisites', v_prereqs,
      'unlock', v_unlock,
      'unlock_required', true,
      'blocks', '[]'::jsonb,
      'media_position', null,
      'activities', '[]'::jsonb,
      'ai_tutor_enabled', true
    );
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', b.id, 'block_type', b.block_type, 'position', b.position,
      'status', b.status, 'content', b.content
    ) order by b.position, b.id
  ), '[]'::jsonb)
  into v_blocks
  from public.learning_lesson_content_blocks b
  where b.lesson_id = p_lesson_id and b.status = 'published';

  select * into v_lp from public.learning_lesson_progress
  where user_id = v_uid and lesson_id = p_lesson_id;
  if found then
    v_media := jsonb_build_object(
      'last_media_position_seconds', v_lp.last_media_position_seconds,
      'last_content_block_id', v_lp.last_content_block_id,
      'status', v_lp.status
    );
  else
    v_media := null;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', a.id, 'type', a.type, 'name', a.name, 'status', a.status
    ) order by a.position, a.id
  ), '[]'::jsonb)
  into v_activities
  from public.learning_activities a
  where a.lesson_id = p_lesson_id
    and a.type in ('quiz', 'assignment', 'lab', 'project')
    and (v_manage or a.status = 'published');

  return jsonb_build_object(
    'lesson_id', p_lesson_id,
    'lesson', jsonb_build_object(
      'name', v_ctx.o_lesson.name,
      'difficulty', v_ctx.o_lesson.difficulty,
      'estimated_duration_minutes', v_ctx.o_lesson.estimated_duration_minutes,
      'description', v_ctx.o_lesson.description,
      'status', v_ctx.o_lesson.status
    ),
    'objectives', v_objectives,
    'prerequisites', v_prereqs,
    'unlock', v_unlock,
    'unlock_required', false,
    'blocks', v_blocks,
    'media_position', v_media,
    'activities', v_activities,
    'ai_tutor_enabled', true
  );
end;
$$;

create or replace function public.get_my_learning_course_progress_bundle(p_course_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_course public.learning_course_progress%rowtype;
  v_sections jsonb;
  v_continue jsonb;
  v_lp public.learning_lesson_progress%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.has_learning_course_access(p_course_id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  select * into v_course from public.learning_course_progress
  where user_id = v_uid and course_id = p_course_id;

  perform public.recompute_learning_section_progress(sec.id, v_uid)
  from public.learning_sections sec
  where sec.course_id = p_course_id and sec.status = 'published';

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'section_id', sp.section_id,
      'status', sp.status,
      'completed_lessons_count', sp.completed_lessons_count,
      'total_lessons_count', sp.total_lessons_count,
      'percent_complete', sp.percent_complete,
      'last_lesson_id', sp.last_lesson_id,
      'last_activity_at', sp.last_activity_at
    ) order by s.position, s.id
  ), '[]'::jsonb)
  into v_sections
  from public.learning_section_progress sp
  join public.learning_sections s on s.id = sp.section_id
  where sp.user_id = v_uid and sp.course_id = p_course_id;

  select * into v_lp
  from public.learning_lesson_progress lp
  where lp.user_id = v_uid and lp.course_id = p_course_id
  order by coalesce(lp.last_activity_at, lp.updated_at) desc nulls last
  limit 1;

  if found then
    v_continue := jsonb_build_object(
      'lesson_id', v_lp.lesson_id,
      'last_media_position_seconds', v_lp.last_media_position_seconds,
      'last_content_block_id', v_lp.last_content_block_id,
      'status', v_lp.status,
      'last_activity_at', v_lp.last_activity_at
    );
  else
    v_continue := null;
  end if;

  return jsonb_build_object(
    'course_id', p_course_id,
    'course_progress', case when v_course.id is null then null else jsonb_build_object(
      'status', v_course.status,
      'completed_lessons_count', v_course.completed_lessons_count,
      'total_lessons_count', v_course.total_lessons_count,
      'percent_complete', v_course.percent_complete,
      'last_lesson_id', v_course.last_lesson_id,
      'last_activity_at', v_course.last_activity_at
    ) end,
    'section_progresses', v_sections,
    'continue_target', v_continue
  );
end;
$$;

revoke all on function public.get_my_learning_lesson_engine(uuid) from public, anon;
grant execute on function public.get_my_learning_lesson_engine(uuid) to authenticated, service_role;
revoke all on function public.get_my_learning_course_progress_bundle(uuid) from public, anon;
grant execute on function public.get_my_learning_course_progress_bundle(uuid) to authenticated, service_role;

create or replace function public.create_learning_course_resource(
  p_course_id uuid,
  p_title text,
  p_resource_kind text,
  p_url text,
  p_filename text default null,
  p_mime_type text default null,
  p_size_bytes bigint default null,
  p_position integer default 0
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  return public.upsert_learning_course_resource(
    p_course_id, p_title, p_resource_kind, p_url,
    p_filename, p_mime_type, p_size_bytes, p_position, null
  );
end;
$$;

create or replace function public.update_learning_course_resource(
  p_resource_id uuid,
  p_title text,
  p_resource_kind text,
  p_url text,
  p_filename text default null,
  p_mime_type text default null,
  p_size_bytes bigint default null,
  p_position integer default 0
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_course_id uuid;
begin
  select course_id into v_course_id from public.learning_course_resources where id = p_resource_id;
  if v_course_id is null then raise exception 'Resource not found'; end if;
  return public.upsert_learning_course_resource(
    v_course_id, p_title, p_resource_kind, p_url,
    p_filename, p_mime_type, p_size_bytes, p_position, p_resource_id
  );
end;
$$;

revoke all on function public.create_learning_course_resource(
  uuid, text, text, text, text, text, bigint, integer
) from public, anon;
grant execute on function public.create_learning_course_resource(
  uuid, text, text, text, text, text, bigint, integer
) to authenticated, service_role;
revoke all on function public.update_learning_course_resource(
  uuid, text, text, text, text, text, bigint, integer
) from public, anon;
grant execute on function public.update_learning_course_resource(
  uuid, text, text, text, text, text, bigint, integer
) to authenticated, service_role;
