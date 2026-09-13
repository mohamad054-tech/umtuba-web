-- UMTUBA Learning OS — Lesson Content Blocks Foundation V1
-- Additive slice after 20260835 (Progress). Content blocks under learning_lessons.
-- Hierarchy: Space → Program → Course → Section → Lesson → Content Block.
-- Depends on: 20260832_learning_lessons_foundation_v1.sql (Lessons),
--             20260833_learning_activities_foundation_v1.sql (ordering pattern),
--             20260835_learning_progress_foundation_v1.sql (has_learning_course_access).
-- Does NOT: learning_lesson_items, activity progress, block-level progress,
-- questions, attempts, submissions, assignments, grades, certificates, AI
-- execution, analytics, media upload/storage buckets, signed URLs, offline sync,
-- UI/routes/React components, notifications, search.
--
-- A Content Block is a display CONTENT BODY unit belonging to exactly one Lesson.
-- It is NOT an activity, an interaction result, progress, a question, an attempt,
-- a certificate, or media storage. It only carries bounded, validated display
-- data (text, headings, opaque media references, code, callouts, links) inside a
-- per-type content jsonb. Authority is INHERITED from the parent
-- Lesson → Section → Course → Space chain — there is NO block-level staff table.
-- Space remains the hard authority boundary and Course authority stays
-- membership-revalidated (a stale Course staff row grants NO block authority).
--
-- LEARNER READ DIVERGENCE FROM LESSONS: learner reads of the content body use
-- public.has_learning_course_access(course_id) (admin OR course manager OR active
-- course enrollment OR active parent program enrollment). This deliberately does
-- NOT copy the Lessons "any space member" SELECT — plain space members without
-- entitlement or staff role cannot read the content body. The Activities M1
-- draft-visibility surface is NOT widened here.
--
-- NO anonymous SELECT policy in V1 (privacy-safe, consistent with Activities).
-- is_platform_admin() is only ever called from authenticated policies.

-- ---------------------------------------------------------------------------
-- 1) learning_lesson_content_blocks
-- ---------------------------------------------------------------------------

create table if not exists public.learning_lesson_content_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null
    references public.learning_lessons (id) on delete restrict,
  -- Immutable typed content slot. Allowlist of 12 (10 creatable + 2 reserved);
  -- unknown/deferred values fail closed via this check. Reserved types are
  -- accepted by the check but REJECTED at create time by the RPC/validator.
  block_type text not null
    constraint learning_lesson_content_blocks_type_check check (
      block_type in (
        -- V1 creatable
        'rich_text', 'heading', 'image', 'video', 'audio', 'quote',
        'divider', 'callout', 'external_link', 'code_block',
        -- reserved (enum-only; create rejected in V1)
        'ai_block', 'interactive_block'
      )
    ),
  status text not null default 'draft'
    constraint learning_lesson_content_blocks_status_check check (
      status in ('draft', 'published', 'suspended', 'archived')
    ),
  position integer not null default 0
    constraint learning_lesson_content_blocks_position_non_negative check (
      position >= 0
    ),
  -- Bounded, per-type validated display data. NOT a general content store: no
  -- raw HTML/JS/iframe, no uploads, no signed URLs. Media types (image/video/
  -- audio) hold opaque, validated http(s) reference strings only.
  content jsonb not null default '{}'::jsonb
    constraint learning_lesson_content_blocks_content_object check (
      jsonb_typeof(content) = 'object'
    ),
  created_by uuid not null
    references public.profiles (id) on delete restrict,
  updated_by uuid
    references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  suspended_at timestamptz,
  archived_at timestamptz
);

comment on table public.learning_lesson_content_blocks is
  'Learning OS lesson content blocks — display content body units under exactly one lesson. A block is NOT an activity, interaction result, progress, question, attempt, certificate, or media storage. Client writes only via RPCs. Authority inherits from the parent lesson/section/course; there is no block staff table. lesson_id, block_type, and created_by are immutable after creation. There is NO UNIQUE(lesson_id, position): the reserved future table learning_lesson_items (NOT implemented) will own cross-content ordering.';

comment on column public.learning_lesson_content_blocks.lesson_id is
  'Immutable parent lesson (ON DELETE RESTRICT). Cannot change via update or reorder. Course/space scope is derived DB-authoritatively from this parent chain; it is never stored or trusted from the client.';

comment on column public.learning_lesson_content_blocks.block_type is
  'Immutable content type allowlist. V1 creatable: rich_text|heading|image|video|audio|quote|divider|callout|external_link|code_block. Reserved (enum-only, create rejected in V1): ai_block|interactive_block. Fully deferred (fail closed, not in allowlist): gallery|pdf|downloadable_file|table|embed|html.';

comment on column public.learning_lesson_content_blocks.position is
  'Order within the parent lesson''s content-block list for V1 — non-negative integer. NOT a global lesson-item order. There is no UNIQUE(lesson_id, position); the reserved future learning_lesson_items table (not implemented) will own cross-content ordering. Reorder via reorder_learning_lesson_content_blocks.';

comment on column public.learning_lesson_content_blocks.content is
  'Per-type validated display data (bounded jsonb). No raw HTML/JS/iframe. Media blocks hold opaque, validated http(s) reference strings only — no upload, storage buckets, or signed URLs.';

create index if not exists learning_lesson_content_blocks_lesson_status_idx
  on public.learning_lesson_content_blocks (lesson_id, status);

create index if not exists learning_lesson_content_blocks_lesson_position_idx
  on public.learning_lesson_content_blocks (lesson_id, position, id);

create index if not exists learning_lesson_content_blocks_status_idx
  on public.learning_lesson_content_blocks (status);

create index if not exists learning_lesson_content_blocks_type_idx
  on public.learning_lesson_content_blocks (block_type);

create index if not exists learning_lesson_content_blocks_created_by_idx
  on public.learning_lesson_content_blocks (created_by);

drop trigger if exists learning_lesson_content_blocks_set_updated_at
  on public.learning_lesson_content_blocks;
create trigger learning_lesson_content_blocks_set_updated_at
  before update on public.learning_lesson_content_blocks
  for each row execute function public.set_row_updated_at();

-- DB-level immutability guard for identity columns. Defends the immutable
-- contract even against SECURITY DEFINER code paths.
create or replace function public.learning_lesson_content_block_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.lesson_id is distinct from old.lesson_id
     or new.block_type is distinct from old.block_type
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at
  then
    raise exception
      'learning_lesson_content_blocks identity columns are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_lesson_content_blocks_guard_immutable
  on public.learning_lesson_content_blocks;
create trigger learning_lesson_content_blocks_guard_immutable
  before update on public.learning_lesson_content_blocks
  for each row
  execute function public.learning_lesson_content_block_guard_immutable();

alter table public.learning_lesson_content_blocks enable row level security;
alter table public.learning_lesson_content_blocks force row level security;

-- NO anon grant: content blocks are never exposed to anonymous clients in V1.
revoke all on table public.learning_lesson_content_blocks
  from public, anon, authenticated;
grant select on table public.learning_lesson_content_blocks to authenticated;
revoke insert, update, delete on table public.learning_lesson_content_blocks
  from anon, authenticated;
grant all on table public.learning_lesson_content_blocks to service_role;

-- ---------------------------------------------------------------------------
-- 2) Helpers (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
-- No block staff table: authority is inherited from the parent lesson (which
-- itself inherits from section → course). Course helpers already revalidate
-- active space membership, so a stale course staff row cannot grant block
-- authority.

create or replace function public.can_manage_learning_lesson_content_block(
  p_block_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_block_id is not null
    and p_user_id is not null
    and (
      public.is_platform_admin(p_user_id)
      or exists (
        select 1
        from public.learning_lesson_content_blocks b
        where b.id = p_block_id
          and public.can_manage_learning_lesson(b.lesson_id, p_user_id)
      )
    );
$$;

-- Create: can_manage_learning_lesson OR active course staff rank >= instructor.
-- Mirrors can_create_learning_activity. Course staff helpers revalidate active
-- space membership (stale staff row => no authority). The course is resolved
-- through the parent lesson → section.
create or replace function public.can_create_learning_lesson_content_block(
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

revoke all on function public.can_manage_learning_lesson_content_block(uuid, uuid)
  from public, anon;
grant execute on function public.can_manage_learning_lesson_content_block(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.can_create_learning_lesson_content_block(uuid, uuid)
  from public, anon;
grant execute on function public.can_create_learning_lesson_content_block(uuid, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) RLS policies
-- ---------------------------------------------------------------------------
-- CRITICAL: there is NO anon/public SELECT policy here. Only authenticated
-- readers are considered. is_platform_admin() is only reachable from
-- authenticated policies.
--
-- Learner content-body reads gate on has_learning_course_access(course_id) +
-- published lesson + published block — NOT plain space membership. Managers and
-- course staff may read drafts within their scope; platform admins read all.

-- Entitled learners: published block under a published lesson in a course they
-- have live access to (admin/manager/course-enrollment/parent-program-enrollment
-- via has_learning_course_access, which includes program enrollment inheritance).
drop policy if exists "Entitled learners read published content blocks"
  on public.learning_lesson_content_blocks;
create policy "Entitled learners read published content blocks"
  on public.learning_lesson_content_blocks for select
  to authenticated
  using (
    status = 'published'
    and exists (
      select 1
      from public.learning_lessons les
      join public.learning_sections sec
        on sec.id = les.section_id
      where les.id = learning_lesson_content_blocks.lesson_id
        and les.status = 'published'
        and public.has_learning_course_access(sec.course_id)
    )
  );

-- Authorized managers / course staff: read blocks (including drafts) within
-- their scope. Deliberately does NOT include is_learning_space_member — plain
-- space members are not granted content-body draft (or published) access here.
drop policy if exists "Course staff read scoped content blocks"
  on public.learning_lesson_content_blocks;
create policy "Course staff read scoped content blocks"
  on public.learning_lesson_content_blocks for select
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
      where les.id = learning_lesson_content_blocks.lesson_id
        and (
          public.can_manage_learning_space(p.space_id)
          or public.can_manage_learning_program(p.id)
          or public.can_manage_learning_course(c.id)
          or public.is_learning_course_staff(c.id)
        )
    )
  );

drop policy if exists "Content block managers read blocks"
  on public.learning_lesson_content_blocks;
create policy "Content block managers read blocks"
  on public.learning_lesson_content_blocks for select
  to authenticated
  using (public.can_manage_learning_lesson_content_block(id));

drop policy if exists "Platform admins read all content blocks"
  on public.learning_lesson_content_blocks;
create policy "Platform admins read all content blocks"
  on public.learning_lesson_content_blocks for select
  to authenticated
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 4) Internal validators
-- ---------------------------------------------------------------------------

-- Reject raw HTML / script / event-handler / dangerous scheme content in any
-- display text field. Store display data only — never markup that could execute.
create or replace function public.learning_lesson_content_block_assert_safe_text(
  p_label text,
  p_value text
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  if p_value is null then
    return;
  end if;
  if p_value ~* '<\s*/?\s*(script|iframe|object|embed|html|body|head|link|meta|style|svg|form|input|base|applet)\b'
     or p_value ~* '(javascript|vbscript)\s*:'
     or p_value ~* 'data\s*:\s*text/html'
     or p_value ~* '\son[a-z]+\s*='
  then
    raise exception '% contains unsafe HTML or script content', p_label;
  end if;
end;
$$;

-- Validate an opaque media / link reference: http(s) only, bounded, no unsafe
-- scheme. No upload, storage bucket, or signed-URL behavior is implied.
create or replace function public.learning_lesson_content_block_assert_safe_url(
  p_label text,
  p_url text
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  if p_url is null or char_length(btrim(p_url)) = 0 then
    raise exception '% is required', p_label;
  end if;
  if char_length(p_url) > 2048 then
    raise exception '% exceeds maximum length', p_label;
  end if;
  if p_url !~* '^https?://[^\s<>"'']+$' then
    raise exception '% must be a valid http(s) URL', p_label;
  end if;
  if p_url ~* '(javascript|vbscript|data)\s*:' then
    raise exception '% contains an unsafe scheme', p_label;
  end if;
end;
$$;

-- Immutable type allowlist gate. Rejects deferred/unknown types fail-closed and
-- (on create) rejects reserved types that are enum-only in V1.
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

-- Per-type bounded content validator. Object-only; <= 16384 bytes serialized;
-- strict per-type key allowlist; length/enum/URL/heading-level/language checks;
-- rejects unsafe HTML/JS/iframe in text fields. Only ever invoked for creatable
-- types (reserved/deferred types never reach create/update).
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
    perform public.learning_lesson_content_block_assert_safe_text(
      'rich_text.text', v_text
    );
    if p_content ? 'format'
       and (p_content ->> 'format') not in ('plain', 'markdown')
    then
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
    perform public.learning_lesson_content_block_assert_safe_text(
      'heading.text', v_text
    );
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
    perform public.learning_lesson_content_block_assert_safe_url(
      'image.url', p_content ->> 'url'
    );
    if p_content ? 'alt' then
      if jsonb_typeof(p_content -> 'alt') is distinct from 'string'
         or char_length(p_content ->> 'alt') > 500
      then
        raise exception 'image.alt must be a string up to 500 chars';
      end if;
      perform public.learning_lesson_content_block_assert_safe_text(
        'image.alt', p_content ->> 'alt'
      );
    end if;
    if p_content ? 'caption' then
      if jsonb_typeof(p_content -> 'caption') is distinct from 'string'
         or char_length(p_content ->> 'caption') > 1000
      then
        raise exception 'image.caption must be a string up to 1000 chars';
      end if;
      perform public.learning_lesson_content_block_assert_safe_text(
        'image.caption', p_content ->> 'caption'
      );
    end if;

  elsif p_type = 'video' then
    v_allowed := array['url', 'provider', 'caption'];
    perform public.learning_lesson_content_block_assert_safe_url(
      'video.url', p_content ->> 'url'
    );
    if p_content ? 'provider'
       and (p_content ->> 'provider') not in ('file', 'url', 'youtube', 'vimeo')
    then
      raise exception 'video.provider must be file|url|youtube|vimeo';
    end if;
    if p_content ? 'caption' then
      if jsonb_typeof(p_content -> 'caption') is distinct from 'string'
         or char_length(p_content ->> 'caption') > 1000
      then
        raise exception 'video.caption must be a string up to 1000 chars';
      end if;
      perform public.learning_lesson_content_block_assert_safe_text(
        'video.caption', p_content ->> 'caption'
      );
    end if;

  elsif p_type = 'audio' then
    v_allowed := array['url', 'caption'];
    perform public.learning_lesson_content_block_assert_safe_url(
      'audio.url', p_content ->> 'url'
    );
    if p_content ? 'caption' then
      if jsonb_typeof(p_content -> 'caption') is distinct from 'string'
         or char_length(p_content ->> 'caption') > 1000
      then
        raise exception 'audio.caption must be a string up to 1000 chars';
      end if;
      perform public.learning_lesson_content_block_assert_safe_text(
        'audio.caption', p_content ->> 'caption'
      );
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
    perform public.learning_lesson_content_block_assert_safe_text(
      'quote.text', v_text
    );
    if p_content ? 'attribution' then
      if jsonb_typeof(p_content -> 'attribution') is distinct from 'string'
         or char_length(p_content ->> 'attribution') > 300
      then
        raise exception 'quote.attribution must be a string up to 300 chars';
      end if;
      perform public.learning_lesson_content_block_assert_safe_text(
        'quote.attribution', p_content ->> 'attribution'
      );
    end if;

  elsif p_type = 'divider' then
    v_allowed := array['style'];
    if p_content ? 'style'
       and (p_content ->> 'style') not in ('solid', 'dashed', 'dotted')
    then
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
    perform public.learning_lesson_content_block_assert_safe_text(
      'callout.text', v_text
    );
    if (p_content ->> 'variant') is null
       or (p_content ->> 'variant') not in (
         'info', 'note', 'tip', 'success', 'warning', 'danger'
       )
    then
      raise exception
        'callout.variant must be info|note|tip|success|warning|danger';
    end if;

  elsif p_type = 'external_link' then
    v_allowed := array['url', 'label', 'description'];
    perform public.learning_lesson_content_block_assert_safe_url(
      'external_link.url', p_content ->> 'url'
    );
    if p_content ? 'label' then
      if jsonb_typeof(p_content -> 'label') is distinct from 'string'
         or char_length(p_content ->> 'label') > 300
      then
        raise exception 'external_link.label must be a string up to 300 chars';
      end if;
      perform public.learning_lesson_content_block_assert_safe_text(
        'external_link.label', p_content ->> 'label'
      );
    end if;
    if p_content ? 'description' then
      if jsonb_typeof(p_content -> 'description') is distinct from 'string'
         or char_length(p_content ->> 'description') > 1000
      then
        raise exception
          'external_link.description must be a string up to 1000 chars';
      end if;
      perform public.learning_lesson_content_block_assert_safe_text(
        'external_link.description', p_content ->> 'description'
      );
    end if;

  elsif p_type = 'code_block' then
    -- code is display text rendered escaped; bounded but not HTML-scanned (code
    -- legitimately contains angle brackets). language is a bounded identifier.
    v_allowed := array['code', 'language'];
    if jsonb_typeof(p_content -> 'code') is distinct from 'string' then
      raise exception 'code_block.code must be a string';
    end if;
    if char_length(p_content ->> 'code') > 20000 then
      raise exception 'code_block.code exceeds maximum length';
    end if;
    if p_content ? 'language'
       and (p_content ->> 'language') !~ '^[a-z0-9+#.-]{1,32}$'
    then
      raise exception 'code_block.language must be a short identifier';
    end if;

  else
    -- Reserved (ai_block/interactive_block) and deferred types never reach here;
    -- fail closed defensively.
    raise exception 'Unsupported content block type for content validation';
  end if;

  -- Strict per-type key allowlist — reject any unexpected key.
  for v_key in select jsonb_object_keys(p_content)
  loop
    if not (v_key = any (v_allowed)) then
      raise exception 'content contains unexpected key % for type %', v_key, p_type;
    end if;
  end loop;
end;
$$;

create or replace function public.learning_lesson_content_block_require_mutable_status(
  p_status text
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  if p_status in ('suspended', 'archived') then
    raise exception
      'Content block is %; only platform moderation may change it',
      p_status;
  end if;
  if p_status is distinct from 'draft'
     and p_status is distinct from 'published'
  then
    raise exception 'Invalid content block status for mutation';
  end if;
end;
$$;

create or replace function public.learning_lesson_content_block_require_parent_program_status(
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
      'Parent program must be draft or published for content block changes';
  end if;
end;
$$;

create or replace function public.learning_lesson_content_block_require_parent_course_status(
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
      'Parent course must be draft or published for content block changes';
  end if;
end;
$$;

create or replace function public.learning_lesson_content_block_require_parent_section_status(
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
      'Parent section must be draft or published for content block changes';
  end if;
end;
$$;

-- Parent lesson must be draft|published (not suspended/archived). NOTE: a
-- published block does NOT require a *published* lesson — only a mutable one.
-- Chain intersection at read time handles actual exposure (learner reads still
-- require a published lesson via the RLS policy).
create or replace function public.learning_lesson_content_block_require_parent_lesson_status(
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
      'Parent lesson must be draft or published for content block changes';
  end if;
end;
$$;

revoke all on function public.learning_lesson_content_block_assert_safe_text(text, text)
  from public, anon, authenticated;
revoke all on function public.learning_lesson_content_block_assert_safe_url(text, text)
  from public, anon, authenticated;
revoke all on function public.learning_lesson_content_block_validate_type(text, boolean)
  from public, anon, authenticated;
revoke all on function public.learning_lesson_content_block_validate_content(text, jsonb)
  from public, anon, authenticated;
revoke all on function public.learning_lesson_content_block_require_mutable_status(text)
  from public, anon, authenticated;
revoke all on function public.learning_lesson_content_block_require_parent_program_status(text)
  from public, anon, authenticated;
revoke all on function public.learning_lesson_content_block_require_parent_course_status(text)
  from public, anon, authenticated;
revoke all on function public.learning_lesson_content_block_require_parent_section_status(text)
  from public, anon, authenticated;
revoke all on function public.learning_lesson_content_block_require_parent_lesson_status(text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) RPCs
-- ---------------------------------------------------------------------------
-- Every mutation revalidates the full parent chain (space active; program
-- draft|published; course draft|published; section draft|published; lesson
-- draft|published) and actor authority inherited from the lesson/course.
-- lesson_id, block_type, and created_by are immutable — no RPC accepts them for
-- mutation. Course/space scope is derived DB-authoritatively from the parent
-- chain; clients never supply course_id/space_id.

create or replace function public.create_learning_lesson_content_block(
  p_lesson_id uuid,
  p_block_type text,
  p_content jsonb default '{}'::jsonb
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
  v_block_id uuid;
  v_type text := lower(btrim(coalesce(p_block_type, '')));
  v_content jsonb := coalesce(p_content, '{}'::jsonb);
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
    raise exception 'Learning space must be active for content block changes';
  end if;

  perform public.learning_lesson_content_block_require_parent_program_status(v_program.status);
  perform public.learning_lesson_content_block_require_parent_course_status(v_course.status);
  perform public.learning_lesson_content_block_require_parent_section_status(v_section.status);
  perform public.learning_lesson_content_block_require_parent_lesson_status(v_lesson.status);

  if not public.can_create_learning_lesson_content_block(p_lesson_id, v_uid) then
    raise exception 'Not allowed to create content blocks in this lesson';
  end if;

  -- Immutable type — validated on create; reserved types rejected here.
  perform public.learning_lesson_content_block_validate_type(v_type, true);
  perform public.learning_lesson_content_block_validate_content(v_type, v_content);

  select coalesce(max(b.position), -1) + 1
  into v_position
  from public.learning_lesson_content_blocks b
  where b.lesson_id = p_lesson_id;

  insert into public.learning_lesson_content_blocks (
    lesson_id,
    block_type,
    status,
    position,
    content,
    created_by
  ) values (
    p_lesson_id,
    v_type,
    'draft',
    v_position,
    v_content,
    v_uid
  )
  returning id into v_block_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'content_block.create',
    'learning_lesson_content_block',
    v_block_id::text,
    jsonb_build_object(
      'block_id', v_block_id,
      'lesson_id', p_lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'block_type', v_type,
      'position', v_position
    )
  );

  return jsonb_build_object(
    'block_id', v_block_id,
    'lesson_id', p_lesson_id,
    'block_type', v_type,
    'status', 'draft',
    'position', v_position
  );
end;
$$;

-- Update content only. block_type, lesson_id, created_by, position, and status
-- are NOT accepted here (position via reorder; status via publish/unpublish/
-- archive/moderate). Sets server-authoritative updated_by = auth.uid().
create or replace function public.update_learning_lesson_content_block(
  p_block_id uuid,
  p_content jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_block public.learning_lesson_content_blocks%rowtype;
  v_lesson public.learning_lessons%rowtype;
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_space_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_content is null then
    raise exception 'content is required';
  end if;

  select * into v_block
  from public.learning_lesson_content_blocks
  where id = p_block_id
  for update;

  if not found then
    raise exception 'Learning lesson content block not found';
  end if;

  select * into v_lesson
  from public.learning_lessons
  where id = v_block.lesson_id;

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
    raise exception 'Learning space must be active for content block changes';
  end if;

  perform public.learning_lesson_content_block_require_parent_program_status(v_program.status);
  perform public.learning_lesson_content_block_require_parent_course_status(v_course.status);
  perform public.learning_lesson_content_block_require_parent_section_status(v_section.status);
  perform public.learning_lesson_content_block_require_parent_lesson_status(v_lesson.status);

  -- draft|published only; suspended/archived → platform moderate only
  perform public.learning_lesson_content_block_require_mutable_status(v_block.status);

  -- Authority inherited from lesson/course: manage the block, or be active
  -- course staff (instructor / content_editor / lead_instructor). Course staff
  -- helpers revalidate active space membership.
  if not public.can_manage_learning_lesson_content_block(p_block_id, v_uid)
     and not (
       public.is_learning_course_staff(v_section.course_id, v_uid)
       and public.learning_course_staff_role(v_section.course_id, v_uid)
           in ('instructor', 'content_editor', 'lead_instructor')
     )
  then
    raise exception 'Not allowed to update this content block';
  end if;

  -- Re-validate content against the existing (immutable) block_type.
  perform public.learning_lesson_content_block_validate_content(
    v_block.block_type, p_content
  );

  update public.learning_lesson_content_blocks
  set
    content = p_content,
    updated_by = v_uid,
    updated_at = now()
  where id = p_block_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'content_block.update',
    'learning_lesson_content_block',
    p_block_id::text,
    jsonb_build_object(
      'block_id', p_block_id,
      'lesson_id', v_block.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'updated', true
    )
  );

  return jsonb_build_object('block_id', p_block_id, 'updated', true);
end;
$$;

create or replace function public.publish_learning_lesson_content_block(
  p_block_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_block public.learning_lesson_content_blocks%rowtype;
  v_lesson public.learning_lessons%rowtype;
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_space_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_block
  from public.learning_lesson_content_blocks
  where id = p_block_id
  for update;

  if not found then
    raise exception 'Learning lesson content block not found';
  end if;

  select * into v_lesson
  from public.learning_lessons
  where id = v_block.lesson_id;
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
    raise exception 'Learning space must be active for content block changes';
  end if;

  perform public.learning_lesson_content_block_require_parent_program_status(v_program.status);
  perform public.learning_lesson_content_block_require_parent_course_status(v_course.status);
  perform public.learning_lesson_content_block_require_parent_section_status(v_section.status);
  perform public.learning_lesson_content_block_require_parent_lesson_status(v_lesson.status);

  if not public.can_manage_learning_lesson_content_block(p_block_id, v_uid) then
    raise exception 'Not allowed to publish this content block';
  end if;

  -- Suspended/archived → platform moderation only.
  if v_block.status in ('suspended', 'archived') then
    raise exception
      'Content block is %; only platform moderation may change it',
      v_block.status;
  end if;

  -- Idempotent: publishing an already-published block is a no-op success.
  if v_block.status = 'published' then
    return jsonb_build_object('block_id', p_block_id, 'status', 'published');
  end if;

  update public.learning_lesson_content_blocks
  set status = 'published',
      published_at = coalesce(published_at, now()),
      suspended_at = null,
      archived_at = null,
      updated_by = v_uid,
      updated_at = now()
  where id = p_block_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'content_block.publish',
    'learning_lesson_content_block',
    p_block_id::text,
    jsonb_build_object(
      'block_id', p_block_id,
      'lesson_id', v_block.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'from_status', v_block.status,
      'to_status', 'published'
    )
  );

  return jsonb_build_object('block_id', p_block_id, 'status', 'published');
end;
$$;

create or replace function public.unpublish_learning_lesson_content_block(
  p_block_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_block public.learning_lesson_content_blocks%rowtype;
  v_lesson public.learning_lessons%rowtype;
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_space_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_block
  from public.learning_lesson_content_blocks
  where id = p_block_id
  for update;

  if not found then
    raise exception 'Learning lesson content block not found';
  end if;

  select * into v_lesson
  from public.learning_lessons
  where id = v_block.lesson_id;
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
    raise exception 'Learning space must be active for content block changes';
  end if;

  perform public.learning_lesson_content_block_require_parent_program_status(v_program.status);
  perform public.learning_lesson_content_block_require_parent_course_status(v_course.status);
  perform public.learning_lesson_content_block_require_parent_section_status(v_section.status);
  perform public.learning_lesson_content_block_require_parent_lesson_status(v_lesson.status);

  if not public.can_manage_learning_lesson_content_block(p_block_id, v_uid) then
    raise exception 'Not allowed to unpublish this content block';
  end if;

  -- Suspended/archived → platform moderation only.
  if v_block.status in ('suspended', 'archived') then
    raise exception
      'Content block is %; only platform moderation may change it',
      v_block.status;
  end if;

  -- Idempotent: unpublishing an already-draft block is a no-op success.
  if v_block.status = 'draft' then
    return jsonb_build_object('block_id', p_block_id, 'status', 'draft');
  end if;

  update public.learning_lesson_content_blocks
  set status = 'draft',
      published_at = null,
      suspended_at = null,
      archived_at = null,
      updated_by = v_uid,
      updated_at = now()
  where id = p_block_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'content_block.unpublish',
    'learning_lesson_content_block',
    p_block_id::text,
    jsonb_build_object(
      'block_id', p_block_id,
      'lesson_id', v_block.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'from_status', v_block.status,
      'to_status', 'draft'
    )
  );

  return jsonb_build_object('block_id', p_block_id, 'status', 'draft');
end;
$$;

create or replace function public.archive_learning_lesson_content_block(
  p_block_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_block public.learning_lesson_content_blocks%rowtype;
  v_lesson public.learning_lessons%rowtype;
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_space_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_block
  from public.learning_lesson_content_blocks
  where id = p_block_id
  for update;

  if not found then
    raise exception 'Learning lesson content block not found';
  end if;

  select * into v_lesson
  from public.learning_lessons
  where id = v_block.lesson_id;
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
    raise exception 'Learning space must be active for content block changes';
  end if;

  -- Suspended blocks: platform moderate only (no owner/lead archive bypass).
  if v_block.status = 'suspended' then
    raise exception
      'Content block is suspended; only platform moderation may change it';
  end if;

  perform public.learning_lesson_content_block_require_parent_program_status(v_program.status);
  perform public.learning_lesson_content_block_require_parent_course_status(v_course.status);
  perform public.learning_lesson_content_block_require_parent_section_status(v_section.status);
  perform public.learning_lesson_content_block_require_parent_lesson_status(v_lesson.status);

  if not public.can_manage_learning_lesson_content_block(p_block_id, v_uid) then
    raise exception 'Not allowed to archive this content block';
  end if;

  -- Idempotent.
  if v_block.status = 'archived' then
    return jsonb_build_object('block_id', p_block_id, 'status', 'archived');
  end if;

  update public.learning_lesson_content_blocks
  set status = 'archived',
      archived_at = now(),
      suspended_at = null,
      updated_by = v_uid,
      updated_at = now()
  where id = p_block_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'content_block.archive',
    'learning_lesson_content_block',
    p_block_id::text,
    jsonb_build_object(
      'block_id', p_block_id,
      'lesson_id', v_block.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'from_status', v_block.status,
      'to_status', 'archived'
    )
  );

  return jsonb_build_object('block_id', p_block_id, 'status', 'archived');
end;
$$;

create or replace function public.moderate_learning_lesson_content_block(
  p_block_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_block public.learning_lesson_content_blocks%rowtype;
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
      'moderate_learning_lesson_content_block status must be suspended|published|archived';
  end if;

  select * into v_block
  from public.learning_lesson_content_blocks
  where id = p_block_id
  for update;

  if not found then
    raise exception 'Learning lesson content block not found';
  end if;

  select * into v_lesson
  from public.learning_lessons
  where id = v_block.lesson_id;
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
    update public.learning_lesson_content_blocks
    set status = 'suspended',
        suspended_at = now(),
        archived_at = null,
        updated_by = v_uid,
        updated_at = now()
    where id = p_block_id;
  elsif v_to = 'published' then
    update public.learning_lesson_content_blocks
    set status = 'published',
        published_at = coalesce(published_at, now()),
        suspended_at = null,
        archived_at = null,
        updated_by = v_uid,
        updated_at = now()
    where id = p_block_id;
  else
    update public.learning_lesson_content_blocks
    set status = 'archived',
        archived_at = coalesce(archived_at, now()),
        suspended_at = null,
        updated_by = v_uid,
        updated_at = now()
    where id = p_block_id;
  end if;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'content_block.moderation',
    'learning_lesson_content_block',
    p_block_id::text,
    jsonb_build_object(
      'block_id', p_block_id,
      'lesson_id', v_block.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'from_status', v_block.status,
      'to_status', v_to
    )
  );

  return jsonb_build_object('block_id', p_block_id, 'status', v_to);
end;
$$;

-- Transactional reorder within a single lesson. Positions become 0..n-1.
-- Prevents unsafe cross-lesson reorder: every id must belong to the lesson and
-- the full unique set of the lesson's content block ids is required. lesson_id
-- cannot change here. This is the "order within the lesson's content-block list
-- for V1" — NOT a global lesson-item order (see learning_lesson_items, not
-- implemented).
create or replace function public.reorder_learning_lesson_content_blocks(
  p_lesson_id uuid,
  p_block_ids uuid[]
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

  if p_block_ids is null then
    raise exception 'block_ids is required';
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
    raise exception 'Learning space must be active for content block changes';
  end if;

  perform public.learning_lesson_content_block_require_parent_program_status(v_program.status);
  perform public.learning_lesson_content_block_require_parent_course_status(v_course.status);
  perform public.learning_lesson_content_block_require_parent_section_status(v_section.status);
  perform public.learning_lesson_content_block_require_parent_lesson_status(v_lesson.status);

  if not public.can_manage_learning_lesson(p_lesson_id, v_uid)
     and not public.can_manage_learning_space(v_program.space_id, v_uid)
  then
    raise exception 'Not allowed to reorder content blocks in this lesson';
  end if;

  select count(*)::integer
  into v_expected_count
  from public.learning_lesson_content_blocks
  where lesson_id = p_lesson_id;

  v_provided_count := coalesce(cardinality(p_block_ids), 0);

  if v_provided_count is distinct from v_expected_count then
    raise exception 'reorder_learning_lesson_content_blocks requires all block ids for the lesson';
  end if;

  select count(distinct x)::integer
  into v_distinct_count
  from unnest(p_block_ids) as t(x);

  if v_distinct_count is distinct from v_provided_count then
    raise exception 'reorder_learning_lesson_content_blocks block_ids must be unique';
  end if;

  if exists (
    select 1
    from unnest(p_block_ids) as t(id)
    where not exists (
      select 1
      from public.learning_lesson_content_blocks b
      where b.id = t.id
        and b.lesson_id = p_lesson_id
    )
  ) then
    raise exception 'All block_ids must belong to the lesson';
  end if;

  -- Reject if any block is suspended/archived (normal mutation gate).
  if exists (
    select 1
    from public.learning_lesson_content_blocks b
    where b.lesson_id = p_lesson_id
      and b.status in ('suspended', 'archived')
  ) then
    raise exception
      'Cannot reorder while a content block is suspended or archived';
  end if;

  -- Two-phase update avoids non-negative check conflicts during swap.
  update public.learning_lesson_content_blocks b
  set position = v_offset + u.ord::integer,
      updated_at = now()
  from unnest(p_block_ids) with ordinality as u(id, ord)
  where b.id = u.id
    and b.lesson_id = p_lesson_id;

  update public.learning_lesson_content_blocks b
  set position = (u.ord::integer - 1),
      updated_at = now()
  from unnest(p_block_ids) with ordinality as u(id, ord)
  where b.id = u.id
    and b.lesson_id = p_lesson_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'content_block.reorder',
    'learning_lesson',
    p_lesson_id::text,
    jsonb_build_object(
      'lesson_id', p_lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'block_ids', to_jsonb(p_block_ids)
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
revoke all on function public.create_learning_lesson_content_block(
  uuid, text, jsonb
) from public, anon;
grant execute on function public.create_learning_lesson_content_block(
  uuid, text, jsonb
) to authenticated, service_role;

revoke all on function public.update_learning_lesson_content_block(
  uuid, jsonb
) from public, anon;
grant execute on function public.update_learning_lesson_content_block(
  uuid, jsonb
) to authenticated, service_role;

revoke all on function public.publish_learning_lesson_content_block(uuid)
  from public, anon;
grant execute on function public.publish_learning_lesson_content_block(uuid)
  to authenticated, service_role;

revoke all on function public.unpublish_learning_lesson_content_block(uuid)
  from public, anon;
grant execute on function public.unpublish_learning_lesson_content_block(uuid)
  to authenticated, service_role;

revoke all on function public.archive_learning_lesson_content_block(uuid)
  from public, anon;
grant execute on function public.archive_learning_lesson_content_block(uuid)
  to authenticated, service_role;

revoke all on function public.moderate_learning_lesson_content_block(uuid, text)
  from public, anon;
grant execute on function public.moderate_learning_lesson_content_block(uuid, text)
  to authenticated, service_role;

revoke all on function public.reorder_learning_lesson_content_blocks(uuid, uuid[])
  from public, anon;
grant execute on function public.reorder_learning_lesson_content_blocks(uuid, uuid[])
  to authenticated, service_role;
