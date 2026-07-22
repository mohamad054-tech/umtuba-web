-- UMTUBA Learning OS — Questions Foundation V1
-- Additive slice after 20260836 (Lesson Content Blocks). Questions under
-- learning_activities.
-- Hierarchy: Space → Program → Course → Section → Lesson → Activity → Question.
-- Depends on: 20260833_learning_activities_foundation_v1.sql (Activities,
--             can_manage/can_create_learning_activity, ordering pattern),
--             20260836_learning_lesson_content_blocks_foundation_v1.sql
--             (guard trigger, safe-text, per-type validator template).
-- Does NOT: attempts, learner responses, grades, scores, pass/fail, certificates,
-- assignments, question banks, join/reuse tables, pools, randomization, time
-- limits, adaptive, analytics, AI generation/grading, media uploads, UI/routes/
-- components, block/question-level progress, matching/ordering validators.
--
-- A Question is a single authored assessment definition belonging to EXACTLY ONE
-- Activity. There are NO banks, NO shared/reused questions, NO cross-activity
-- reuse, and NO pools — the relationship is strictly Activity → Question. A
-- Question is NOT an attempt, a learner response, a grade, a score, a
-- certificate, or an assignment. It carries only bounded, validated,
-- LEARNER-VISIBLE structure (prompt + options/blanks) in `content`; correctness
-- lives in a separate 1:1 answer-key table that is NEVER exposed to learners and
-- NEVER returned from public display RPCs.
--
-- Authority is INHERITED from the parent Activity → Lesson → Section → Course →
-- Space chain (there is NO question-level staff table). Space remains the hard
-- authority boundary and Course authority stays membership-revalidated (a stale
-- Course staff row grants NO question authority).
--
-- READS ARE STAFF-ONLY IN V1: there is NO learner SELECT policy on questions or
-- answer keys, and NO learner-facing RPC returning a question or an answer key.
-- Ordinary space members do NOT get draft/question/answer_key reads. Learner
-- delivery is deliberately deferred to the future Attempts slice. This does NOT
-- widen the Activities M1 draft-settings surface.
--
-- NO anonymous SELECT policy in V1. is_platform_admin() is only ever called from
-- authenticated policies.

-- ---------------------------------------------------------------------------
-- 1) learning_questions
-- ---------------------------------------------------------------------------

create table if not exists public.learning_questions (
  id uuid primary key default gen_random_uuid(),
  -- Immutable parent activity (ON DELETE RESTRICT). Each question belongs to
  -- exactly one activity; there are no banks, joins, or cross-activity reuse.
  activity_id uuid not null
    references public.learning_activities (id) on delete restrict,
  -- Immutable typed question slot. Allowlist of 8 (6 creatable + 2 reserved);
  -- unknown/deferred values fail closed via this check. Reserved types are
  -- accepted by the check but REJECTED at create time by the RPC/validator.
  -- Deferred types (matching, ordering, file_upload, code_execution,
  -- audio_response, video_response, composite, adaptive, AI types) are
  -- intentionally ABSENT from the allowlist and fail closed here.
  question_type text not null
    constraint learning_questions_type_check check (
      question_type in (
        -- V1 creatable
        'multiple_choice_single', 'multiple_choice_multiple', 'true_false',
        'short_answer', 'fill_blank', 'numeric',
        -- reserved (enum-only; create rejected in V1)
        'long_answer', 'essay'
      )
    ),
  status text not null default 'draft'
    constraint learning_questions_status_check check (
      status in ('draft', 'published', 'suspended', 'archived')
    ),
  position integer not null default 0
    constraint learning_questions_position_non_negative check (
      position >= 0
    ),
  -- Bounded, per-type validated LEARNER-VISIBLE structure (prompt + options/
  -- blanks). NO correctness flags live here — correct answers/criteria live in
  -- learning_question_answer_keys only. No raw HTML/JS/iframe; no uploads.
  content jsonb not null default '{}'::jsonb
    constraint learning_questions_content_object check (
      jsonb_typeof(content) = 'object'
    ),
  -- Optional inert definition weight (like Activity settings scoring fields).
  -- Drives NO scoring/grading/pass-fail behavior in V1.
  points numeric
    constraint learning_questions_points_non_negative check (
      points is null or points >= 0
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

comment on table public.learning_questions is
  'Learning OS questions — authored assessment definitions belonging to exactly one activity. Activity → Question only: no banks, joins, shared/reused questions, cross-activity reuse, or pools. A question is NOT an attempt, learner response, grade, score, certificate, or assignment. Client writes only via RPCs. Authority inherits from the parent activity/lesson/section/course; there is no question staff table. activity_id, question_type, and created_by are immutable after creation. content holds only bounded, validated, LEARNER-VISIBLE structure; correctness lives in learning_question_answer_keys and is never stored here. There is NO UNIQUE(activity_id, position) (Plan-B compatible, like Activities/Content Blocks).';

comment on column public.learning_questions.activity_id is
  'Immutable parent activity (ON DELETE RESTRICT). Cannot change via update or reorder — a question can never be moved to another activity. Course/space/lesson scope is derived DB-authoritatively from this parent chain; it is never stored or trusted from the client.';

comment on column public.learning_questions.question_type is
  'Immutable question type allowlist. V1 creatable: multiple_choice_single|multiple_choice_multiple|true_false|short_answer|fill_blank|numeric. Reserved (enum-only, create rejected in V1): long_answer|essay. Fully deferred (fail closed, not in allowlist): matching|ordering|file_upload|code_execution|audio_response|video_response|composite|adaptive|AI types.';

comment on column public.learning_questions.position is
  'Order within the parent activity''s question list for V1 — non-negative integer. There is no UNIQUE(activity_id, position) (Plan-B compatible, like Activities/Content Blocks). Reorder via reorder_learning_questions.';

comment on column public.learning_questions.content is
  'Per-type validated, LEARNER-VISIBLE structure (bounded jsonb): prompt + options/blanks. NO correctness flags. No raw HTML/JS/iframe, no uploads. Correct answers/criteria live only in learning_question_answer_keys.';

comment on column public.learning_questions.points is
  'Optional inert definition weight. Drives NO scoring/grading/pass-fail behavior in V1 (deferred to Attempts).';

create index if not exists learning_questions_activity_status_idx
  on public.learning_questions (activity_id, status);

create index if not exists learning_questions_activity_position_idx
  on public.learning_questions (activity_id, position, id);

create index if not exists learning_questions_status_idx
  on public.learning_questions (status);

create index if not exists learning_questions_type_idx
  on public.learning_questions (question_type);

create index if not exists learning_questions_created_by_idx
  on public.learning_questions (created_by);

drop trigger if exists learning_questions_set_updated_at
  on public.learning_questions;
create trigger learning_questions_set_updated_at
  before update on public.learning_questions
  for each row execute function public.set_row_updated_at();

-- DB-level immutability guard for identity columns. Defends the immutable
-- contract even against SECURITY DEFINER code paths (like 20260836).
create or replace function public.learning_question_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.activity_id is distinct from old.activity_id
     or new.question_type is distinct from old.question_type
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at
  then
    raise exception
      'learning_questions identity columns are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_questions_guard_immutable
  on public.learning_questions;
create trigger learning_questions_guard_immutable
  before update on public.learning_questions
  for each row
  execute function public.learning_question_guard_immutable();

alter table public.learning_questions enable row level security;
alter table public.learning_questions force row level security;

-- NO anon grant: anonymous clients never receive question access in V1.
revoke all on table public.learning_questions
  from public, anon, authenticated;
grant select on table public.learning_questions to authenticated;
revoke insert, update, delete on table public.learning_questions
  from anon, authenticated;
grant all on table public.learning_questions to service_role;

-- ---------------------------------------------------------------------------
-- 2) learning_question_answer_keys (1:1 with question)
-- ---------------------------------------------------------------------------
-- Holds ONLY the correct answers / grading criteria for a question. This table
-- is STAFF/PLATFORM-ONLY: it is NEVER exposed to learners via RLS, and its
-- contents are NEVER returned from any non-key RPC (create/update/publish return
-- the question row WITHOUT answer-key fields). There are NO attempt grades or
-- user results here. No learner-facing read RPC exists in V1.

create table if not exists public.learning_question_answer_keys (
  question_id uuid primary key
    references public.learning_questions (id) on delete cascade,
  -- Correct answers / criteria only (per-type validated). NEVER learner results.
  answer_key jsonb not null default '{}'::jsonb
    constraint learning_question_answer_keys_object check (
      jsonb_typeof(answer_key) = 'object'
    ),
  created_by uuid
    references public.profiles (id) on delete set null,
  updated_by uuid
    references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.learning_question_answer_keys is
  '1:1 answer key for a learning_question (question_id PK FK ON DELETE CASCADE). Holds ONLY correct answers / grading criteria — NO attempt grades or user results. STAFF/PLATFORM-ONLY: never exposed to learners via RLS and never returned from public display RPCs. Written only via set_learning_question_answer_key. There is NO learner-facing read RPC in V1.';

comment on column public.learning_question_answer_keys.answer_key is
  'Per-type validated correct answers/criteria. NEVER contains learner responses, grades, or scores. NEVER returned to learners or from non-key RPCs.';

create index if not exists learning_question_answer_keys_updated_by_idx
  on public.learning_question_answer_keys (updated_by);

drop trigger if exists learning_question_answer_keys_set_updated_at
  on public.learning_question_answer_keys;
create trigger learning_question_answer_keys_set_updated_at
  before update on public.learning_question_answer_keys
  for each row execute function public.set_row_updated_at();

alter table public.learning_question_answer_keys enable row level security;
alter table public.learning_question_answer_keys force row level security;

-- NO anon grant: anonymous clients never receive answer-key access, and neither
-- do learners. Only staff/platform readers via the SELECT policies below.
revoke all on table public.learning_question_answer_keys
  from public, anon, authenticated;
grant select on table public.learning_question_answer_keys to authenticated;
revoke insert, update, delete on table public.learning_question_answer_keys
  from anon, authenticated;
grant all on table public.learning_question_answer_keys to service_role;

-- ---------------------------------------------------------------------------
-- 3) Helpers (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
-- No question staff table: authority is inherited from the parent activity
-- (which itself inherits from lesson → section → course). Course helpers already
-- revalidate active space membership, so a stale course staff row cannot grant
-- question authority.

create or replace function public.can_manage_learning_question(
  p_question_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Platform admin OR whoever can manage the parent activity (which itself
  -- inherits from the parent lesson/section/course and revalidates active space
  -- membership for delegated course staff).
  select
    p_question_id is not null
    and p_user_id is not null
    and (
      public.is_platform_admin(p_user_id)
      or exists (
        select 1
        from public.learning_questions q
        where q.id = p_question_id
          and public.can_manage_learning_activity(q.activity_id, p_user_id)
      )
    );
$$;

-- Create: can_manage_learning_activity OR active course staff rank >= instructor.
-- Mirrors can_create_learning_activity / content block create. Course staff
-- helpers revalidate active space membership (stale staff row => no authority).
-- The course is resolved through the parent activity → lesson → section.
create or replace function public.can_create_learning_question(
  p_activity_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_activity_id is not null
    and p_user_id is not null
    and exists (
      select 1
      from public.learning_activities act
      join public.learning_lessons les
        on les.id = act.lesson_id
      join public.learning_sections sec
        on sec.id = les.section_id
      where act.id = p_activity_id
        and (
          public.can_manage_learning_activity(p_activity_id, p_user_id)
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

revoke all on function public.can_manage_learning_question(uuid, uuid)
  from public, anon;
grant execute on function public.can_manage_learning_question(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.can_create_learning_question(uuid, uuid)
  from public, anon;
grant execute on function public.can_create_learning_question(uuid, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) RLS policies — STAFF-ONLY (no learner reads in V1)
-- ---------------------------------------------------------------------------
-- CRITICAL: there is NO anon/public SELECT policy and NO learner SELECT policy.
-- Ordinary space members do NOT get question or answer_key reads. Only managers,
-- course staff, and platform admins may read. is_platform_admin() is only
-- reachable from authenticated policies. Learner delivery is deferred to the
-- future Attempts slice; this does NOT widen the Activities M1 draft surface.
-- Deliberately does NOT call is_learning_space_member — plain space membership
-- grants nothing here.

drop policy if exists "Course staff read scoped questions"
  on public.learning_questions;
create policy "Course staff read scoped questions"
  on public.learning_questions for select
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
      where act.id = learning_questions.activity_id
        and (
          public.can_manage_learning_space(p.space_id)
          or public.can_manage_learning_program(p.id)
          or public.can_manage_learning_course(c.id)
          or public.is_learning_course_staff(c.id)
        )
    )
  );

drop policy if exists "Question managers read questions"
  on public.learning_questions;
create policy "Question managers read questions"
  on public.learning_questions for select
  to authenticated
  using (public.can_manage_learning_question(id));

drop policy if exists "Platform admins read all questions"
  on public.learning_questions;
create policy "Platform admins read all questions"
  on public.learning_questions for select
  to authenticated
  using (public.is_platform_admin());

-- Answer keys: STAFF/PLATFORM-ONLY reads, mirroring the question staff scope.
-- NEVER a learner policy. NEVER is_learning_space_member. NEVER anon.

drop policy if exists "Course staff read scoped answer keys"
  on public.learning_question_answer_keys;
create policy "Course staff read scoped answer keys"
  on public.learning_question_answer_keys for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_questions q
      join public.learning_activities act
        on act.id = q.activity_id
      join public.learning_lessons les
        on les.id = act.lesson_id
      join public.learning_sections sec
        on sec.id = les.section_id
      join public.learning_courses c
        on c.id = sec.course_id
      join public.learning_programs p
        on p.id = c.program_id
      where q.id = learning_question_answer_keys.question_id
        and (
          public.can_manage_learning_space(p.space_id)
          or public.can_manage_learning_program(p.id)
          or public.can_manage_learning_course(c.id)
          or public.is_learning_course_staff(c.id)
        )
    )
  );

drop policy if exists "Question managers read answer keys"
  on public.learning_question_answer_keys;
create policy "Question managers read answer keys"
  on public.learning_question_answer_keys for select
  to authenticated
  using (public.can_manage_learning_question(question_id));

drop policy if exists "Platform admins read all answer keys"
  on public.learning_question_answer_keys;
create policy "Platform admins read all answer keys"
  on public.learning_question_answer_keys for select
  to authenticated
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 5) Internal validators
-- ---------------------------------------------------------------------------

-- Reject raw HTML / script / event-handler / dangerous scheme content in any
-- display text field. Store display data only — never markup that could execute.
create or replace function public.learning_question_assert_safe_text(
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

-- Immutable type allowlist gate. Rejects deferred/unknown types fail-closed and
-- (on create) rejects reserved types that are enum-only in V1.
create or replace function public.learning_question_validate_type(
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
    raise exception 'question_type is required';
  end if;
  if p_type not in (
    'multiple_choice_single', 'multiple_choice_multiple', 'true_false',
    'short_answer', 'fill_blank', 'numeric',
    'long_answer', 'essay'
  ) then
    raise exception 'Invalid question type';
  end if;
  if p_is_create and p_type in ('long_answer', 'essay') then
    raise exception
      'Question type % is reserved and cannot be created in V1', p_type;
  end if;
end;
$$;

-- Validate the ordered option array shared by MCQ single/multiple. Returns the
-- set of stable option keys (as a text[]) for the answer-key validator to check
-- against. Enforces: array of objects; 2..26 options; each option is an object
-- with exactly {key, text}; key matches a bounded identifier and is unique;
-- text is bounded and safe.
create or replace function public.learning_question_validate_options(
  p_content jsonb
)
returns text[]
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  v_options jsonb := p_content -> 'options';
  v_opt jsonb;
  v_key text;
  v_text text;
  v_okey text;
  v_keys text[] := array[]::text[];
  v_count integer;
begin
  if jsonb_typeof(v_options) is distinct from 'array' then
    raise exception 'options must be an array';
  end if;
  v_count := jsonb_array_length(v_options);
  if v_count < 2 then
    raise exception 'options must contain at least 2 entries';
  end if;
  if v_count > 26 then
    raise exception 'options exceeds the maximum of 26 entries';
  end if;

  for v_opt in select jsonb_array_elements(v_options)
  loop
    if jsonb_typeof(v_opt) is distinct from 'object' then
      raise exception 'each option must be a JSON object';
    end if;
    -- Strict per-option key allowlist: exactly key + text.
    for v_okey in select jsonb_object_keys(v_opt)
    loop
      if v_okey not in ('key', 'text') then
        raise exception 'option contains unexpected key %', v_okey;
      end if;
    end loop;

    if jsonb_typeof(v_opt -> 'key') is distinct from 'string' then
      raise exception 'option.key must be a string';
    end if;
    v_key := v_opt ->> 'key';
    if v_key !~ '^[A-Za-z0-9_-]{1,64}$' then
      raise exception 'option.key must match ^[A-Za-z0-9_-]{1,64}$';
    end if;
    if v_key = any (v_keys) then
      raise exception 'option keys must be unique (duplicate: %)', v_key;
    end if;
    v_keys := array_append(v_keys, v_key);

    if jsonb_typeof(v_opt -> 'text') is distinct from 'string' then
      raise exception 'option.text must be a string';
    end if;
    v_text := v_opt ->> 'text';
    if char_length(v_text) not between 1 and 1000 then
      raise exception 'option.text must be between 1 and 1000 chars';
    end if;
    perform public.learning_question_assert_safe_text('option.text', v_text);
  end loop;

  return v_keys;
end;
$$;

-- Per-type bounded, LEARNER-VISIBLE content validator. Object-only; <= 16384
-- bytes serialized; strict per-type key allowlist; length/enum/count checks;
-- rejects unsafe HTML/JS/iframe in text fields. NO correctness flags allowed.
-- Only ever invoked for creatable types (reserved/deferred never reach create/
-- update).
create or replace function public.learning_question_validate_content(
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
  v_prompt text;
  v_blanks jsonb;
  v_blank jsonb;
  v_blank_key text;
  v_blank_keys text[] := array[]::text[];
  v_bkey text;
  v_max_bytes integer := 16384;
begin
  if p_content is null or jsonb_typeof(p_content) is distinct from 'object' then
    raise exception 'content must be a JSON object';
  end if;
  if octet_length(p_content::text) > v_max_bytes then
    raise exception 'content exceeds maximum size of % bytes', v_max_bytes;
  end if;

  -- Every creatable type carries a bounded, safe prompt.
  if jsonb_typeof(p_content -> 'prompt') is distinct from 'string' then
    raise exception 'prompt must be a string';
  end if;
  v_prompt := p_content ->> 'prompt';
  if char_length(v_prompt) not between 1 and 4000 then
    raise exception 'prompt must be between 1 and 4000 chars';
  end if;
  perform public.learning_question_assert_safe_text('prompt', v_prompt);

  if p_type in ('multiple_choice_single', 'multiple_choice_multiple') then
    v_allowed := array['prompt', 'options'];
    -- Validate options structure (keys/uniqueness/text). Correctness is NOT
    -- stored here — it lives only in the answer key.
    perform public.learning_question_validate_options(p_content);

  elsif p_type = 'true_false' then
    -- Learner-visible structure is just the prompt; correctness (the boolean)
    -- lives only in the answer key.
    v_allowed := array['prompt'];

  elsif p_type = 'short_answer' then
    -- Prompt only; accepted answers + normalization live in the answer key.
    v_allowed := array['prompt'];

  elsif p_type = 'fill_blank' then
    v_allowed := array['prompt', 'blanks'];
    v_blanks := p_content -> 'blanks';
    if jsonb_typeof(v_blanks) is distinct from 'array' then
      raise exception 'blanks must be an array';
    end if;
    if jsonb_array_length(v_blanks) < 1 then
      raise exception 'blanks must contain at least 1 entry';
    end if;
    if jsonb_array_length(v_blanks) > 20 then
      raise exception 'blanks exceeds the maximum of 20 entries';
    end if;
    for v_blank in select jsonb_array_elements(v_blanks)
    loop
      if jsonb_typeof(v_blank) is distinct from 'object' then
        raise exception 'each blank must be a JSON object';
      end if;
      for v_bkey in select jsonb_object_keys(v_blank)
      loop
        if v_bkey <> 'key' then
          raise exception 'blank contains unexpected key %', v_bkey;
        end if;
      end loop;
      if jsonb_typeof(v_blank -> 'key') is distinct from 'string' then
        raise exception 'blank.key must be a string';
      end if;
      v_blank_key := v_blank ->> 'key';
      if v_blank_key !~ '^[A-Za-z0-9_-]{1,64}$' then
        raise exception 'blank.key must match ^[A-Za-z0-9_-]{1,64}$';
      end if;
      if v_blank_key = any (v_blank_keys) then
        raise exception 'blank keys must be unique (duplicate: %)', v_blank_key;
      end if;
      v_blank_keys := array_append(v_blank_keys, v_blank_key);
    end loop;

  elsif p_type = 'numeric' then
    -- Prompt only (optional bounded unit label); the numeric answer + tolerance
    -- live in the answer key. NO equation/expression evaluator.
    v_allowed := array['prompt', 'unit'];
    if p_content ? 'unit' then
      if jsonb_typeof(p_content -> 'unit') is distinct from 'string'
         or char_length(p_content ->> 'unit') > 64
      then
        raise exception 'unit must be a string up to 64 chars';
      end if;
      perform public.learning_question_assert_safe_text(
        'unit', p_content ->> 'unit'
      );
    end if;

  else
    -- Reserved (long_answer/essay) and deferred types never reach here; fail
    -- closed defensively.
    raise exception 'Unsupported question type for content validation';
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

-- Per-type answer-key validator. Cross-checks against the (already validated)
-- content where relevant (e.g. MCQ correct keys must exist among the option
-- keys; fill_blank answers must cover exactly the declared blank keys). Object-
-- only; <= 16384 bytes; strict per-type key allowlist; NO client regex; NO
-- equation/expression evaluator. Correct answers/criteria only — NEVER learner
-- results.
create or replace function public.learning_question_validate_answer_key(
  p_type text,
  p_content jsonb,
  p_answer_key jsonb
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
  v_option_keys text[];
  v_correct text;
  v_correct_arr jsonb;
  v_elem text;
  v_seen text[] := array[]::text[];
  v_accepted jsonb;
  v_norm jsonb;
  v_nkey text;
  v_blanks jsonb;
  v_blank jsonb;
  v_blank_key text;
  v_blank_keys text[] := array[]::text[];
  v_answers jsonb;
  v_akey text;
  v_ans_arr jsonb;
  v_max_bytes integer := 16384;
begin
  if p_answer_key is null
     or jsonb_typeof(p_answer_key) is distinct from 'object'
  then
    raise exception 'answer_key must be a JSON object';
  end if;
  if octet_length(p_answer_key::text) > v_max_bytes then
    raise exception 'answer_key exceeds maximum size of % bytes', v_max_bytes;
  end if;

  if p_type = 'multiple_choice_single' then
    v_allowed := array['correct_key'];
    v_option_keys := public.learning_question_validate_options(p_content);
    if jsonb_typeof(p_answer_key -> 'correct_key') is distinct from 'string' then
      raise exception 'answer_key.correct_key must be a string';
    end if;
    v_correct := p_answer_key ->> 'correct_key';
    if not (v_correct = any (v_option_keys)) then
      raise exception 'answer_key.correct_key must reference an existing option key';
    end if;

  elsif p_type = 'multiple_choice_multiple' then
    v_allowed := array['correct_keys'];
    v_option_keys := public.learning_question_validate_options(p_content);
    v_correct_arr := p_answer_key -> 'correct_keys';
    if jsonb_typeof(v_correct_arr) is distinct from 'array' then
      raise exception 'answer_key.correct_keys must be an array';
    end if;
    if jsonb_array_length(v_correct_arr) < 1 then
      raise exception 'answer_key.correct_keys must contain at least 1 key';
    end if;
    for v_elem in select jsonb_array_elements_text(v_correct_arr)
    loop
      if not (v_elem = any (v_option_keys)) then
        raise exception 'answer_key.correct_keys must reference existing option keys';
      end if;
      if v_elem = any (v_seen) then
        raise exception 'answer_key.correct_keys must be unique';
      end if;
      v_seen := array_append(v_seen, v_elem);
    end loop;

  elsif p_type = 'true_false' then
    v_allowed := array['correct'];
    if jsonb_typeof(p_answer_key -> 'correct') is distinct from 'boolean' then
      raise exception 'answer_key.correct must be a boolean';
    end if;

  elsif p_type = 'short_answer' then
    v_allowed := array['accepted', 'normalization'];
    v_accepted := p_answer_key -> 'accepted';
    if jsonb_typeof(v_accepted) is distinct from 'array' then
      raise exception 'answer_key.accepted must be an array';
    end if;
    if jsonb_array_length(v_accepted) < 1 then
      raise exception 'answer_key.accepted must contain at least 1 entry';
    end if;
    if jsonb_array_length(v_accepted) > 20 then
      raise exception 'answer_key.accepted exceeds the maximum of 20 entries';
    end if;
    for v_elem in select jsonb_array_elements_text(v_accepted)
    loop
      if char_length(v_elem) not between 1 and 200 then
        raise exception 'answer_key.accepted entries must be 1..200 chars';
      end if;
    end loop;
    -- normalization allowlist: only trim / case_sensitive booleans. NO regex.
    if p_answer_key ? 'normalization' then
      v_norm := p_answer_key -> 'normalization';
      if jsonb_typeof(v_norm) is distinct from 'object' then
        raise exception 'answer_key.normalization must be a JSON object';
      end if;
      for v_nkey in select jsonb_object_keys(v_norm)
      loop
        if v_nkey not in ('trim', 'case_sensitive') then
          raise exception 'answer_key.normalization contains unexpected key %', v_nkey;
        end if;
        if jsonb_typeof(v_norm -> v_nkey) is distinct from 'boolean' then
          raise exception 'answer_key.normalization.% must be a boolean', v_nkey;
        end if;
      end loop;
    end if;

  elsif p_type = 'fill_blank' then
    v_allowed := array['answers'];
    -- Collect the declared blank keys from the (validated) content.
    v_blanks := p_content -> 'blanks';
    if jsonb_typeof(v_blanks) is distinct from 'array' then
      raise exception 'content.blanks must be an array';
    end if;
    for v_blank in select jsonb_array_elements(v_blanks)
    loop
      v_blank_keys := array_append(v_blank_keys, v_blank ->> 'key');
    end loop;

    v_answers := p_answer_key -> 'answers';
    if jsonb_typeof(v_answers) is distinct from 'object' then
      raise exception 'answer_key.answers must be a JSON object';
    end if;
    -- Every answer key must reference a declared blank, and be a bounded array
    -- of accepted strings.
    for v_akey in select jsonb_object_keys(v_answers)
    loop
      if not (v_akey = any (v_blank_keys)) then
        raise exception 'answer_key.answers references unknown blank %', v_akey;
      end if;
      v_ans_arr := v_answers -> v_akey;
      if jsonb_typeof(v_ans_arr) is distinct from 'array' then
        raise exception 'answer_key.answers.% must be an array', v_akey;
      end if;
      if jsonb_array_length(v_ans_arr) < 1 then
        raise exception 'answer_key.answers.% must contain at least 1 entry', v_akey;
      end if;
      if jsonb_array_length(v_ans_arr) > 20 then
        raise exception 'answer_key.answers.% exceeds the maximum of 20 entries', v_akey;
      end if;
      for v_elem in select jsonb_array_elements_text(v_ans_arr)
      loop
        if char_length(v_elem) not between 1 and 200 then
          raise exception 'answer_key.answers.% entries must be 1..200 chars', v_akey;
        end if;
      end loop;
    end loop;
    -- Answer key must cover ALL declared blanks (complete).
    foreach v_blank_key in array v_blank_keys
    loop
      if not (v_answers ? v_blank_key) then
        raise exception 'answer_key.answers must cover all blanks (missing %)', v_blank_key;
      end if;
    end loop;

  elsif p_type = 'numeric' then
    v_allowed := array['value', 'tolerance'];
    if jsonb_typeof(p_answer_key -> 'value') is distinct from 'number' then
      raise exception 'answer_key.value must be a number';
    end if;
    if p_answer_key ? 'tolerance' then
      if jsonb_typeof(p_answer_key -> 'tolerance') is distinct from 'number' then
        raise exception 'answer_key.tolerance must be a number';
      end if;
      if (p_answer_key ->> 'tolerance')::numeric < 0 then
        raise exception 'answer_key.tolerance must be non-negative';
      end if;
    end if;

  else
    -- Reserved (long_answer/essay) and deferred types have no V1 answer-key
    -- contract; fail closed defensively.
    raise exception 'Unsupported question type for answer key validation';
  end if;

  -- Strict per-type answer_key key allowlist — reject any unexpected key.
  for v_key in select jsonb_object_keys(p_answer_key)
  loop
    if not (v_key = any (v_allowed)) then
      raise exception 'answer_key contains unexpected key % for type %', v_key, p_type;
    end if;
  end loop;
end;
$$;

create or replace function public.learning_question_require_mutable_status(
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
      'Question is %; only platform moderation may change it',
      p_status;
  end if;
  if p_status is distinct from 'draft'
     and p_status is distinct from 'published'
  then
    raise exception 'Invalid question status for mutation';
  end if;
end;
$$;

create or replace function public.learning_question_require_parent_program_status(
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
      'Parent program must be draft or published for question changes';
  end if;
end;
$$;

create or replace function public.learning_question_require_parent_course_status(
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
      'Parent course must be draft or published for question changes';
  end if;
end;
$$;

create or replace function public.learning_question_require_parent_section_status(
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
      'Parent section must be draft or published for question changes';
  end if;
end;
$$;

create or replace function public.learning_question_require_parent_lesson_status(
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
      'Parent lesson must be draft or published for question changes';
  end if;
end;
$$;

-- Parent activity must be draft|published (not suspended/archived). NOTE: a
-- published question does NOT require a *published* activity — only a mutable
-- one. Learner delivery is deferred to Attempts, so there is no read-time
-- intersection concern in V1.
create or replace function public.learning_question_require_parent_activity_status(
  p_activity_status text
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  if p_activity_status is distinct from 'draft'
     and p_activity_status is distinct from 'published'
  then
    raise exception
      'Parent activity must be draft or published for question changes';
  end if;
end;
$$;

revoke all on function public.learning_question_assert_safe_text(text, text)
  from public, anon, authenticated;
revoke all on function public.learning_question_validate_type(text, boolean)
  from public, anon, authenticated;
revoke all on function public.learning_question_validate_options(jsonb)
  from public, anon, authenticated;
revoke all on function public.learning_question_validate_content(text, jsonb)
  from public, anon, authenticated;
revoke all on function public.learning_question_validate_answer_key(text, jsonb, jsonb)
  from public, anon, authenticated;
revoke all on function public.learning_question_require_mutable_status(text)
  from public, anon, authenticated;
revoke all on function public.learning_question_require_parent_program_status(text)
  from public, anon, authenticated;
revoke all on function public.learning_question_require_parent_course_status(text)
  from public, anon, authenticated;
revoke all on function public.learning_question_require_parent_section_status(text)
  from public, anon, authenticated;
revoke all on function public.learning_question_require_parent_lesson_status(text)
  from public, anon, authenticated;
revoke all on function public.learning_question_require_parent_activity_status(text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) RPCs
-- ---------------------------------------------------------------------------
-- Every mutation revalidates the full parent chain (space active; program,
-- course, section, lesson, activity each draft|published) and actor authority
-- inherited from the activity/course. activity_id, question_type, and created_by
-- are immutable — no RPC accepts them for mutation. Course/space/lesson scope is
-- derived DB-authoritatively from the parent chain; clients never supply
-- course_id/space_id/lesson_id/created_by/updated_by. A question can NEVER be
-- moved to another activity. Answer keys are NEVER returned from non-key RPCs.

create or replace function public.create_learning_question(
  p_activity_id uuid,
  p_question_type text,
  p_content jsonb default '{}'::jsonb,
  p_points numeric default null
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
  v_question_id uuid;
  v_type text := lower(btrim(coalesce(p_question_type, '')));
  v_content jsonb := coalesce(p_content, '{}'::jsonb);
  v_position integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_activity_id is null then
    raise exception 'activity_id is required';
  end if;

  if p_points is not null and p_points < 0 then
    raise exception 'points must be non-negative';
  end if;

  -- Lock the parent activity row: serializes position assignment and prevents
  -- the activity from being mutated out from under this insert.
  select * into v_activity
  from public.learning_activities
  where id = p_activity_id
  for update;

  if not found then
    raise exception 'Learning activity not found';
  end if;

  select * into v_lesson
  from public.learning_lessons
  where id = v_activity.lesson_id
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
    raise exception 'Learning space must be active for question changes';
  end if;

  perform public.learning_question_require_parent_program_status(v_program.status);
  perform public.learning_question_require_parent_course_status(v_course.status);
  perform public.learning_question_require_parent_section_status(v_section.status);
  perform public.learning_question_require_parent_lesson_status(v_lesson.status);
  perform public.learning_question_require_parent_activity_status(v_activity.status);

  if not public.can_create_learning_question(p_activity_id, v_uid) then
    raise exception 'Not allowed to create questions in this activity';
  end if;

  -- Immutable type — validated on create; reserved types rejected here.
  perform public.learning_question_validate_type(v_type, true);
  perform public.learning_question_validate_content(v_type, v_content);

  select coalesce(max(q.position), -1) + 1
  into v_position
  from public.learning_questions q
  where q.activity_id = p_activity_id;

  insert into public.learning_questions (
    activity_id,
    question_type,
    status,
    position,
    content,
    points,
    created_by
  ) values (
    p_activity_id,
    v_type,
    'draft',
    v_position,
    v_content,
    p_points,
    v_uid
  )
  returning id into v_question_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'question.create',
    'learning_question',
    v_question_id::text,
    jsonb_build_object(
      'question_id', v_question_id,
      'activity_id', p_activity_id,
      'lesson_id', v_activity.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'question_type', v_type,
      'position', v_position
    )
  );

  -- NOTE: never returns answer-key fields.
  return jsonb_build_object(
    'question_id', v_question_id,
    'activity_id', p_activity_id,
    'question_type', v_type,
    'status', 'draft',
    'position', v_position
  );
end;
$$;

-- Update content/prompt/config only. question_type, activity_id, created_by,
-- position, and status are NOT accepted here (position via reorder; status via
-- publish/unpublish/archive/moderate; ownership/type/activity are immutable).
-- Sets server-authoritative updated_by = auth.uid(). Never touches the answer
-- key and never returns it.
create or replace function public.update_learning_question(
  p_question_id uuid,
  p_content jsonb default null,
  p_points numeric default null,
  p_clear_points boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_question public.learning_questions%rowtype;
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

  if p_content is null and not p_clear_points and p_points is null then
    raise exception 'Nothing to update';
  end if;

  if p_points is not null and p_points < 0 then
    raise exception 'points must be non-negative';
  end if;

  select * into v_question
  from public.learning_questions
  where id = p_question_id
  for update;

  if not found then
    raise exception 'Learning question not found';
  end if;

  select * into v_activity
  from public.learning_activities
  where id = v_question.activity_id;

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
    raise exception 'Learning space must be active for question changes';
  end if;

  perform public.learning_question_require_parent_program_status(v_program.status);
  perform public.learning_question_require_parent_course_status(v_course.status);
  perform public.learning_question_require_parent_section_status(v_section.status);
  perform public.learning_question_require_parent_lesson_status(v_lesson.status);
  perform public.learning_question_require_parent_activity_status(v_activity.status);

  -- draft|published only; suspended/archived → platform moderate only
  perform public.learning_question_require_mutable_status(v_question.status);

  -- Authority inherited from activity/course: manage the question, or be active
  -- course staff (instructor / content_editor / lead_instructor). Course staff
  -- helpers revalidate active space membership.
  if not public.can_manage_learning_question(p_question_id, v_uid)
     and not (
       public.is_learning_course_staff(v_section.course_id, v_uid)
       and public.learning_course_staff_role(v_section.course_id, v_uid)
           in ('instructor', 'content_editor', 'lead_instructor')
     )
  then
    raise exception 'Not allowed to update this question';
  end if;

  -- Re-validate content against the existing (immutable) question_type.
  if p_content is not null then
    perform public.learning_question_validate_content(
      v_question.question_type, p_content
    );
  end if;

  update public.learning_questions
  set
    content = coalesce(p_content, content),
    points = case
      when p_clear_points then null
      when p_points is not null then p_points
      else points
    end,
    updated_by = v_uid,
    updated_at = now()
  where id = p_question_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'question.update',
    'learning_question',
    p_question_id::text,
    jsonb_build_object(
      'question_id', p_question_id,
      'activity_id', v_question.activity_id,
      'lesson_id', v_activity.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'updated', true
    )
  );

  return jsonb_build_object('question_id', p_question_id, 'updated', true);
end;
$$;

-- Set (upsert) the 1:1 answer key for a question. STAFF-only. Validates the key
-- against the question's immutable type and current content (e.g. MCQ correct
-- keys must exist; fill_blank must cover all blanks). Never returns the key from
-- other RPCs. This is the ONLY write path for answer keys.
create or replace function public.set_learning_question_answer_key(
  p_question_id uuid,
  p_answer_key jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_question public.learning_questions%rowtype;
  v_activity public.learning_activities%rowtype;
  v_lesson public.learning_lessons%rowtype;
  v_section public.learning_sections%rowtype;
  v_course public.learning_courses%rowtype;
  v_program public.learning_programs%rowtype;
  v_space_status text;
  v_answer_key jsonb := coalesce(p_answer_key, '{}'::jsonb);
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_answer_key is null then
    raise exception 'answer_key is required';
  end if;

  select * into v_question
  from public.learning_questions
  where id = p_question_id
  for update;

  if not found then
    raise exception 'Learning question not found';
  end if;

  select * into v_activity
  from public.learning_activities
  where id = v_question.activity_id;

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
    raise exception 'Learning space must be active for question changes';
  end if;

  perform public.learning_question_require_parent_program_status(v_program.status);
  perform public.learning_question_require_parent_course_status(v_course.status);
  perform public.learning_question_require_parent_section_status(v_section.status);
  perform public.learning_question_require_parent_lesson_status(v_lesson.status);
  perform public.learning_question_require_parent_activity_status(v_activity.status);

  perform public.learning_question_require_mutable_status(v_question.status);

  if not public.can_manage_learning_question(p_question_id, v_uid)
     and not (
       public.is_learning_course_staff(v_section.course_id, v_uid)
       and public.learning_course_staff_role(v_section.course_id, v_uid)
           in ('instructor', 'content_editor', 'lead_instructor')
     )
  then
    raise exception 'Not allowed to set the answer key for this question';
  end if;

  -- Validate against the immutable type + current content. Reserved/deferred
  -- types never reach here (their questions cannot be created).
  perform public.learning_question_validate_answer_key(
    v_question.question_type, v_question.content, v_answer_key
  );

  insert into public.learning_question_answer_keys (
    question_id, answer_key, created_by, updated_by
  ) values (
    p_question_id, v_answer_key, v_uid, v_uid
  )
  on conflict (question_id) do update
  set answer_key = excluded.answer_key,
      updated_by = v_uid,
      updated_at = now();

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'question.answer_key_set',
    'learning_question',
    p_question_id::text,
    jsonb_build_object(
      'question_id', p_question_id,
      'activity_id', v_question.activity_id,
      'lesson_id', v_activity.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'answer_key_set', true
    )
  );

  -- Deliberately does NOT return the answer_key payload.
  return jsonb_build_object('question_id', p_question_id, 'answer_key_set', true);
end;
$$;

create or replace function public.publish_learning_question(
  p_question_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_question public.learning_questions%rowtype;
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

  select * into v_question
  from public.learning_questions
  where id = p_question_id
  for update;

  if not found then
    raise exception 'Learning question not found';
  end if;

  select * into v_activity
  from public.learning_activities
  where id = v_question.activity_id;
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
    raise exception 'Learning space must be active for question changes';
  end if;

  perform public.learning_question_require_parent_program_status(v_program.status);
  perform public.learning_question_require_parent_course_status(v_course.status);
  perform public.learning_question_require_parent_section_status(v_section.status);
  perform public.learning_question_require_parent_lesson_status(v_lesson.status);
  perform public.learning_question_require_parent_activity_status(v_activity.status);

  if not public.can_manage_learning_question(p_question_id, v_uid) then
    raise exception 'Not allowed to publish this question';
  end if;

  -- Suspended/archived → platform moderation only.
  if v_question.status in ('suspended', 'archived') then
    raise exception
      'Question is %; only platform moderation may change it',
      v_question.status;
  end if;

  -- Idempotent: publishing an already-published question is a no-op success.
  if v_question.status = 'published' then
    return jsonb_build_object('question_id', p_question_id, 'status', 'published');
  end if;

  update public.learning_questions
  set status = 'published',
      published_at = coalesce(published_at, now()),
      suspended_at = null,
      archived_at = null,
      updated_by = v_uid,
      updated_at = now()
  where id = p_question_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'question.publish',
    'learning_question',
    p_question_id::text,
    jsonb_build_object(
      'question_id', p_question_id,
      'activity_id', v_question.activity_id,
      'lesson_id', v_activity.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'from_status', v_question.status,
      'to_status', 'published'
    )
  );

  return jsonb_build_object('question_id', p_question_id, 'status', 'published');
end;
$$;

create or replace function public.unpublish_learning_question(
  p_question_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_question public.learning_questions%rowtype;
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

  select * into v_question
  from public.learning_questions
  where id = p_question_id
  for update;

  if not found then
    raise exception 'Learning question not found';
  end if;

  select * into v_activity
  from public.learning_activities
  where id = v_question.activity_id;
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
    raise exception 'Learning space must be active for question changes';
  end if;

  perform public.learning_question_require_parent_program_status(v_program.status);
  perform public.learning_question_require_parent_course_status(v_course.status);
  perform public.learning_question_require_parent_section_status(v_section.status);
  perform public.learning_question_require_parent_lesson_status(v_lesson.status);
  perform public.learning_question_require_parent_activity_status(v_activity.status);

  if not public.can_manage_learning_question(p_question_id, v_uid) then
    raise exception 'Not allowed to unpublish this question';
  end if;

  -- Suspended/archived → platform moderation only.
  if v_question.status in ('suspended', 'archived') then
    raise exception
      'Question is %; only platform moderation may change it',
      v_question.status;
  end if;

  -- Idempotent: unpublishing an already-draft question is a no-op success.
  if v_question.status = 'draft' then
    return jsonb_build_object('question_id', p_question_id, 'status', 'draft');
  end if;

  update public.learning_questions
  set status = 'draft',
      published_at = null,
      suspended_at = null,
      archived_at = null,
      updated_by = v_uid,
      updated_at = now()
  where id = p_question_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'question.unpublish',
    'learning_question',
    p_question_id::text,
    jsonb_build_object(
      'question_id', p_question_id,
      'activity_id', v_question.activity_id,
      'lesson_id', v_activity.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'from_status', v_question.status,
      'to_status', 'draft'
    )
  );

  return jsonb_build_object('question_id', p_question_id, 'status', 'draft');
end;
$$;

create or replace function public.archive_learning_question(
  p_question_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_question public.learning_questions%rowtype;
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

  select * into v_question
  from public.learning_questions
  where id = p_question_id
  for update;

  if not found then
    raise exception 'Learning question not found';
  end if;

  select * into v_activity
  from public.learning_activities
  where id = v_question.activity_id;
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
    raise exception 'Learning space must be active for question changes';
  end if;

  -- Suspended questions: platform moderate only (no owner/lead archive bypass).
  if v_question.status = 'suspended' then
    raise exception
      'Question is suspended; only platform moderation may change it';
  end if;

  perform public.learning_question_require_parent_program_status(v_program.status);
  perform public.learning_question_require_parent_course_status(v_course.status);
  perform public.learning_question_require_parent_section_status(v_section.status);
  perform public.learning_question_require_parent_lesson_status(v_lesson.status);
  perform public.learning_question_require_parent_activity_status(v_activity.status);

  if not public.can_manage_learning_question(p_question_id, v_uid) then
    raise exception 'Not allowed to archive this question';
  end if;

  -- Idempotent.
  if v_question.status = 'archived' then
    return jsonb_build_object('question_id', p_question_id, 'status', 'archived');
  end if;

  update public.learning_questions
  set status = 'archived',
      archived_at = now(),
      suspended_at = null,
      updated_by = v_uid,
      updated_at = now()
  where id = p_question_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'question.archive',
    'learning_question',
    p_question_id::text,
    jsonb_build_object(
      'question_id', p_question_id,
      'activity_id', v_question.activity_id,
      'lesson_id', v_activity.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'from_status', v_question.status,
      'to_status', 'archived'
    )
  );

  return jsonb_build_object('question_id', p_question_id, 'status', 'archived');
end;
$$;

create or replace function public.moderate_learning_question(
  p_question_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_question public.learning_questions%rowtype;
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
      'moderate_learning_question status must be suspended|published|archived';
  end if;

  select * into v_question
  from public.learning_questions
  where id = p_question_id
  for update;

  if not found then
    raise exception 'Learning question not found';
  end if;

  select * into v_activity
  from public.learning_activities
  where id = v_question.activity_id;
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
    update public.learning_questions
    set status = 'suspended',
        suspended_at = now(),
        archived_at = null,
        updated_by = v_uid,
        updated_at = now()
    where id = p_question_id;
  elsif v_to = 'published' then
    update public.learning_questions
    set status = 'published',
        published_at = coalesce(published_at, now()),
        suspended_at = null,
        archived_at = null,
        updated_by = v_uid,
        updated_at = now()
    where id = p_question_id;
  else
    update public.learning_questions
    set status = 'archived',
        archived_at = coalesce(archived_at, now()),
        suspended_at = null,
        updated_by = v_uid,
        updated_at = now()
    where id = p_question_id;
  end if;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'question.moderation',
    'learning_question',
    p_question_id::text,
    jsonb_build_object(
      'question_id', p_question_id,
      'activity_id', v_question.activity_id,
      'lesson_id', v_activity.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'from_status', v_question.status,
      'to_status', v_to
    )
  );

  return jsonb_build_object('question_id', p_question_id, 'status', v_to);
end;
$$;

-- Transactional reorder within a single activity. Positions become 0..n-1.
-- Prevents unsafe cross-activity reorder: every id must belong to the activity
-- and the full unique set of the activity's question ids is required.
-- activity_id cannot change here — a question can never be moved to another
-- activity. Follows the Content Blocks/Activities pattern: reorder is blocked
-- while any question is suspended/archived.
create or replace function public.reorder_learning_questions(
  p_activity_id uuid,
  p_question_ids uuid[]
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
  v_expected_count integer;
  v_provided_count integer;
  v_distinct_count integer;
  v_offset integer := 1000000;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_activity_id is null then
    raise exception 'activity_id is required';
  end if;

  if p_question_ids is null then
    raise exception 'question_ids is required';
  end if;

  -- Lock the parent activity row for the duration of the two-phase update.
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
    raise exception 'Learning space must be active for question changes';
  end if;

  perform public.learning_question_require_parent_program_status(v_program.status);
  perform public.learning_question_require_parent_course_status(v_course.status);
  perform public.learning_question_require_parent_section_status(v_section.status);
  perform public.learning_question_require_parent_lesson_status(v_lesson.status);
  perform public.learning_question_require_parent_activity_status(v_activity.status);

  if not public.can_manage_learning_activity(p_activity_id, v_uid)
     and not public.can_manage_learning_space(v_program.space_id, v_uid)
  then
    raise exception 'Not allowed to reorder questions in this activity';
  end if;

  select count(*)::integer
  into v_expected_count
  from public.learning_questions
  where activity_id = p_activity_id;

  v_provided_count := coalesce(cardinality(p_question_ids), 0);

  if v_provided_count is distinct from v_expected_count then
    raise exception 'reorder_learning_questions requires all question ids for the activity';
  end if;

  select count(distinct x)::integer
  into v_distinct_count
  from unnest(p_question_ids) as t(x);

  if v_distinct_count is distinct from v_provided_count then
    raise exception 'reorder_learning_questions question_ids must be unique';
  end if;

  if exists (
    select 1
    from unnest(p_question_ids) as t(id)
    where not exists (
      select 1
      from public.learning_questions q
      where q.id = t.id
        and q.activity_id = p_activity_id
    )
  ) then
    raise exception 'All question_ids must belong to the activity';
  end if;

  -- Reject if any question is suspended/archived (normal mutation gate).
  if exists (
    select 1
    from public.learning_questions q
    where q.activity_id = p_activity_id
      and q.status in ('suspended', 'archived')
  ) then
    raise exception
      'Cannot reorder while a question is suspended or archived';
  end if;

  -- Two-phase update avoids non-negative check conflicts during swap.
  update public.learning_questions q
  set position = v_offset + u.ord::integer,
      updated_at = now()
  from unnest(p_question_ids) with ordinality as u(id, ord)
  where q.id = u.id
    and q.activity_id = p_activity_id;

  update public.learning_questions q
  set position = (u.ord::integer - 1),
      updated_at = now()
  from unnest(p_question_ids) with ordinality as u(id, ord)
  where q.id = u.id
    and q.activity_id = p_activity_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'question.reorder',
    'learning_activity',
    p_activity_id::text,
    jsonb_build_object(
      'activity_id', p_activity_id,
      'lesson_id', v_activity.lesson_id,
      'section_id', v_lesson.section_id,
      'course_id', v_section.course_id,
      'program_id', v_course.program_id,
      'question_ids', to_jsonb(p_question_ids)
    )
  );

  return jsonb_build_object(
    'activity_id', p_activity_id,
    'count', v_provided_count,
    'reordered', true
  );
end;
$$;

-- RPC grants
revoke all on function public.create_learning_question(
  uuid, text, jsonb, numeric
) from public, anon;
grant execute on function public.create_learning_question(
  uuid, text, jsonb, numeric
) to authenticated, service_role;

revoke all on function public.update_learning_question(
  uuid, jsonb, numeric, boolean
) from public, anon;
grant execute on function public.update_learning_question(
  uuid, jsonb, numeric, boolean
) to authenticated, service_role;

revoke all on function public.set_learning_question_answer_key(uuid, jsonb)
  from public, anon;
grant execute on function public.set_learning_question_answer_key(uuid, jsonb)
  to authenticated, service_role;

revoke all on function public.publish_learning_question(uuid)
  from public, anon;
grant execute on function public.publish_learning_question(uuid)
  to authenticated, service_role;

revoke all on function public.unpublish_learning_question(uuid)
  from public, anon;
grant execute on function public.unpublish_learning_question(uuid)
  to authenticated, service_role;

revoke all on function public.archive_learning_question(uuid)
  from public, anon;
grant execute on function public.archive_learning_question(uuid)
  to authenticated, service_role;

revoke all on function public.moderate_learning_question(uuid, text)
  from public, anon;
grant execute on function public.moderate_learning_question(uuid, text)
  to authenticated, service_role;

revoke all on function public.reorder_learning_questions(uuid, uuid[])
  from public, anon;
grant execute on function public.reorder_learning_questions(uuid, uuid[])
  to authenticated, service_role;
