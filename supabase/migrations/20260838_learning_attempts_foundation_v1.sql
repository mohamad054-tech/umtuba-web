-- UM Learning OS — Attempts Foundation V1
-- Additive slice after 20260837 (Questions). Learner attempts under
-- learning_activities.
-- Hierarchy: Space → Program → Course → Section → Lesson → Activity → Attempt.
-- Depends on: 20260833_learning_activities_foundation_v1.sql (Activities +
--             settings: time_limit_seconds, max_attempts),
--             20260834_learning_enrollments_foundation_v1.sql (entitlement),
--             20260835_learning_progress_foundation_v1.sql
--             (has_learning_course_access, denormalized space/course scope,
--             learner-ownership pattern),
--             20260837_learning_questions_foundation_v1.sql (published questions,
--             LEARNER-VISIBLE content, SECRET answer keys).
--
-- An Attempt is a learner's server-owned session against ONE published Activity.
-- Model: Activity → Attempt → Attempt Answers. Exactly TWO tables:
--   1. learning_attempts
--   2. learning_attempt_answers
--
-- V1 does NOT: scoring, correctness flags, points, grades, pass/fail, partial
-- credit, manual/AI grading, certificates, assignments, question banks,
-- randomization, adaptive delivery, analytics, offline sync, background expiry
-- jobs, UI/routes/components, Progress mutations, or answer-key delivery. There
-- is NO score/passed column. There is NO separate events table (audit only via
-- learning_audit_write with SAFE metadata).
--
-- ANSWER-KEY FIREWALL (critical): this migration NEVER reads, joins, or returns
-- learning_question_answer_keys. Learner delivery uses a server-generated,
-- LEARNER-SAFE questions_snapshot embedded on the attempt at start (published
-- questions only, ordered, prompt + options/blanks — NEVER correct answers,
-- accepted answers, numeric answer/tolerance, or grading metadata). No learner
-- SELECT policy is added to learning_questions or learning_question_answer_keys.
--
-- SECURITY: ENABLE + FORCE RLS on both tables; no anon; no direct I/U/D for
-- authenticated (RPC-only writes). All functions are SECURITY DEFINER with
-- SET search_path = public; server identity via auth.uid() only.

-- ---------------------------------------------------------------------------
-- 1) learning_attempts
-- ---------------------------------------------------------------------------
-- Denormalizes space_id/course_id/lesson_id/activity_id (immutable) for
-- entitlement gating and scoped staff reads, mirroring the Progress foundation's
-- denormalization of space_id/course_id. Scope is derived DB-authoritatively
-- from the parent chain at start; it is never trusted from the client.

create table if not exists public.learning_attempts (
  id uuid primary key default gen_random_uuid(),
  -- Denormalized, immutable scope (derived from the parent chain at start).
  space_id uuid not null
    references public.learning_spaces (id) on delete restrict,
  course_id uuid not null
    references public.learning_courses (id) on delete restrict,
  lesson_id uuid not null
    references public.learning_lessons (id) on delete restrict,
  activity_id uuid not null
    references public.learning_activities (id) on delete restrict,
  -- Learner. Server identity only (auth.uid()); never client-supplied.
  user_id uuid not null
    references public.profiles (id) on delete restrict,
  -- Optional entitlement attribution (like Progress). Access is ALWAYS
  -- revalidated live via has_learning_course_access; this is attribution only.
  enrollment_id uuid
    references public.learning_enrollments (id) on delete set null,
  -- Lifecycle. NO draft. active is the only non-terminal state; submitted,
  -- expired, and cancelled are terminal (no reopen to active).
  status text not null default 'active'
    constraint learning_attempts_status_check check (
      status in ('active', 'submitted', 'expired', 'cancelled')
    ),
  -- Monotonic per (user, activity). Immutable after create.
  attempt_number integer not null
    constraint learning_attempts_attempt_number_positive check (
      attempt_number >= 1
    ),
  -- Lifecycle timestamps (DB-authored only).
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  submitted_at timestamptz,
  expired_at timestamptz,
  cancelled_at timestamptz,
  -- Immutable snapshots captured from learning_activity_settings at start. These
  -- drive lazy expiry and max-attempts bookkeeping; NO scoring/grading behavior.
  time_limit_seconds_snapshot integer
    constraint learning_attempts_time_limit_snapshot_check check (
      time_limit_seconds_snapshot is null
      or time_limit_seconds_snapshot between 1 and 1000000
    ),
  max_attempts_snapshot integer
    constraint learning_attempts_max_attempts_snapshot_check check (
      max_attempts_snapshot is null or max_attempts_snapshot >= 1
    ),
  -- Server-generated, LEARNER-SAFE ordered question payloads (published only).
  -- NEVER contains answer keys / correct answers / accepted answers / numeric
  -- answer or tolerance / secret grading metadata. Immutable after create.
  questions_snapshot jsonb not null default '[]'::jsonb
    constraint learning_attempts_questions_snapshot_array check (
      jsonb_typeof(questions_snapshot) = 'array'
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- At most one active attempt per learner per activity.
  constraint learning_attempts_user_activity_number_unique
    unique (user_id, activity_id, attempt_number)
);

comment on table public.learning_attempts is
  'Learning OS attempts — a learner''s server-owned session against exactly one published activity (Activity → Attempt). Client writes only via RPCs. space_id/course_id/lesson_id/activity_id/user_id/attempt_number/started_at/questions_snapshot/time_limit_seconds_snapshot/max_attempts_snapshot/created_at are immutable after creation. Lifecycle: active → submitted|expired|cancelled (terminal; no reopen). NO scoring/correctness/points/grades/pass-fail columns. questions_snapshot is a server-generated LEARNER-SAFE payload (published questions only) and NEVER contains answer keys.';

comment on column public.learning_attempts.status is
  'active|submitted|expired|cancelled. No draft. active is the only live state; the rest are terminal (no reopen to active). expired is applied lazily (no background job).';

comment on column public.learning_attempts.questions_snapshot is
  'Server-generated LEARNER-SAFE ordered array of published questions ({question_id, question_type, position, content}); content holds only prompt + options/blanks. NEVER answer keys, correct/accepted answers, numeric answer/tolerance, or grading metadata. Immutable after create so live question edits never change a started attempt.';

comment on column public.learning_attempts.time_limit_seconds_snapshot is
  'Immutable copy of learning_activity_settings.time_limit_seconds at start. Drives lazy expiry only (now() > started_at + interval). Not a scoring field.';

comment on column public.learning_attempts.max_attempts_snapshot is
  'Immutable copy of learning_activity_settings.max_attempts at start (for record). The live setting is what is enforced at each start.';

-- At most one ACTIVE attempt per learner per activity (partial unique). A
-- terminal (submitted|expired|cancelled) attempt frees the slot for a new one.
create unique index if not exists learning_attempts_one_active_uidx
  on public.learning_attempts (user_id, activity_id)
  where status = 'active';

create index if not exists learning_attempts_user_activity_status_idx
  on public.learning_attempts (user_id, activity_id, status);

create index if not exists learning_attempts_activity_status_idx
  on public.learning_attempts (activity_id, status);

create index if not exists learning_attempts_course_status_idx
  on public.learning_attempts (course_id, status);

create index if not exists learning_attempts_user_status_idx
  on public.learning_attempts (user_id, status);

create index if not exists learning_attempts_started_at_idx
  on public.learning_attempts (started_at);

create index if not exists learning_attempts_last_activity_at_idx
  on public.learning_attempts (last_activity_at);

create index if not exists learning_attempts_enrollment_idx
  on public.learning_attempts (enrollment_id)
  where enrollment_id is not null;

drop trigger if exists learning_attempts_set_updated_at
  on public.learning_attempts;
create trigger learning_attempts_set_updated_at
  before update on public.learning_attempts
  for each row execute function public.set_row_updated_at();

-- DB-level immutability guard. Defends the immutable contract even against
-- SECURITY DEFINER code paths (like Questions/Progress). started_at and the
-- snapshots can never change once the attempt exists, so a live question edit
-- can never rewrite a started attempt's delivered payload.
create or replace function public.learning_attempt_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.space_id is distinct from old.space_id
     or new.course_id is distinct from old.course_id
     or new.lesson_id is distinct from old.lesson_id
     or new.activity_id is distinct from old.activity_id
     or new.user_id is distinct from old.user_id
     or new.attempt_number is distinct from old.attempt_number
     or new.started_at is distinct from old.started_at
     or new.time_limit_seconds_snapshot is distinct from old.time_limit_seconds_snapshot
     or new.max_attempts_snapshot is distinct from old.max_attempts_snapshot
     or new.questions_snapshot is distinct from old.questions_snapshot
     or new.created_at is distinct from old.created_at
  then
    raise exception 'learning_attempts identity/snapshot columns are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_attempts_guard_immutable
  on public.learning_attempts;
create trigger learning_attempts_guard_immutable
  before update on public.learning_attempts
  for each row execute function public.learning_attempt_guard_immutable();

alter table public.learning_attempts enable row level security;
alter table public.learning_attempts force row level security;

-- NO anon grant: attempts (learner sessions) are never exposed anonymously.
revoke all on table public.learning_attempts
  from public, anon, authenticated;
grant select on table public.learning_attempts to authenticated;
revoke insert, update, delete on table public.learning_attempts
  from anon, authenticated;
grant all on table public.learning_attempts to service_role;

-- ---------------------------------------------------------------------------
-- 2) learning_attempt_answers
-- ---------------------------------------------------------------------------
-- One saved learner response per (attempt, question). Holds ONLY the learner's
-- response payload — NO answer key, correctness, score, or grade. Ownership is
-- derived via the parent attempt (RLS + RPC), so no denormalized user_id is
-- stored here.

create table if not exists public.learning_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null
    references public.learning_attempts (id) on delete cascade,
  -- The question must be part of the attempt's questions_snapshot (enforced by
  -- the save RPC). FK keeps referential integrity to the authored question.
  question_id uuid not null
    references public.learning_questions (id) on delete restrict,
  -- Learner response only (per-type validated by structure — NEVER compared to
  -- any answer key). No correctness/score/grade is ever stored.
  answer_payload jsonb not null default '{}'::jsonb
    constraint learning_attempt_answers_payload_object check (
      jsonb_typeof(answer_payload) = 'object'
    ),
  first_answered_at timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_attempt_answers_attempt_question_unique
    unique (attempt_id, question_id)
);

comment on table public.learning_attempt_answers is
  '1 saved learner response per (attempt, question). answer_payload holds ONLY the learner response (per-type structural validation) — NO answer key, correctness, score, or grade. attempt_id/question_id/first_answered_at/created_at are immutable. Ownership derives from the parent attempt; no denormalized user_id. Client writes only via save_learning_attempt_answer.';

comment on column public.learning_attempt_answers.answer_payload is
  'Learner response only, per-type validated by STRUCTURE (never compared to any answer key). multiple_choice_single: {selected_key}; multiple_choice_multiple: {selected_keys[]}; true_false: {value:boolean}; short_answer: {text}; fill_blank: {blanks:{key:text}}; numeric: {value:number}. NEVER correctness/score/grade.';

create index if not exists learning_attempt_answers_attempt_idx
  on public.learning_attempt_answers (attempt_id);

create index if not exists learning_attempt_answers_question_idx
  on public.learning_attempt_answers (question_id);

drop trigger if exists learning_attempt_answers_set_updated_at
  on public.learning_attempt_answers;
create trigger learning_attempt_answers_set_updated_at
  before update on public.learning_attempt_answers
  for each row execute function public.set_row_updated_at();

create or replace function public.learning_attempt_answer_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.attempt_id is distinct from old.attempt_id
     or new.question_id is distinct from old.question_id
     or new.first_answered_at is distinct from old.first_answered_at
     or new.created_at is distinct from old.created_at
  then
    raise exception
      'learning_attempt_answers identity columns are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_attempt_answers_guard_immutable
  on public.learning_attempt_answers;
create trigger learning_attempt_answers_guard_immutable
  before update on public.learning_attempt_answers
  for each row execute function public.learning_attempt_answer_guard_immutable();

alter table public.learning_attempt_answers enable row level security;
alter table public.learning_attempt_answers force row level security;

revoke all on table public.learning_attempt_answers
  from public, anon, authenticated;
grant select on table public.learning_attempt_answers to authenticated;
revoke insert, update, delete on table public.learning_attempt_answers
  from anon, authenticated;
grant all on table public.learning_attempt_answers to service_role;

-- ---------------------------------------------------------------------------
-- 3) Internal validators & helpers (SECURITY DEFINER; revoked from clients)
-- ---------------------------------------------------------------------------

-- Reject raw HTML / script / event-handler / dangerous scheme content in learner
-- free-text responses. Store display data only — never markup that could execute.
create or replace function public.learning_attempt_assert_safe_text(
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

-- Build the LEARNER-SAFE questions snapshot for an activity: published questions
-- only, ordered by position, carrying ONLY {question_id, question_type, position,
-- content}. content is already learner-visible (prompt + options/blanks). This
-- function NEVER touches learning_question_answer_keys — the answer-key firewall.
create or replace function public.learning_attempt_build_questions_snapshot(
  p_activity_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question_id', q.id,
        'question_type', q.question_type,
        'position', q.position,
        'content', q.content
      )
      order by q.position, q.id
    ),
    '[]'::jsonb
  )
  from public.learning_questions q
  where q.activity_id = p_activity_id
    and q.status = 'published';
$$;

-- Extract the stable option keys from a LEARNER-SAFE snapshot content object
-- (mirrors the Questions options structure). Used to validate MCQ responses
-- WITHOUT any reference to the answer key.
create or replace function public.learning_attempt_snapshot_option_keys(
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
  v_keys text[] := array[]::text[];
begin
  if jsonb_typeof(v_options) is distinct from 'array' then
    raise exception 'snapshot question has no options';
  end if;
  for v_opt in select jsonb_array_elements(v_options)
  loop
    if jsonb_typeof(v_opt -> 'key') = 'string' then
      v_keys := array_append(v_keys, v_opt ->> 'key');
    end if;
  end loop;
  return v_keys;
end;
$$;

-- Extract the declared blank keys from a LEARNER-SAFE snapshot content object.
create or replace function public.learning_attempt_snapshot_blank_keys(
  p_content jsonb
)
returns text[]
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  v_blanks jsonb := p_content -> 'blanks';
  v_blank jsonb;
  v_keys text[] := array[]::text[];
begin
  if jsonb_typeof(v_blanks) is distinct from 'array' then
    raise exception 'snapshot question has no blanks';
  end if;
  for v_blank in select jsonb_array_elements(v_blanks)
  loop
    if jsonb_typeof(v_blank -> 'key') = 'string' then
      v_keys := array_append(v_keys, v_blank ->> 'key');
    end if;
  end loop;
  return v_keys;
end;
$$;

-- Per-type LEARNER-RESPONSE validator. Validates the answer payload by STRUCTURE
-- only against the (already validated) snapshot content. This NEVER compares the
-- response to any answer key, and NEVER reads learning_question_answer_keys —
-- correctness is deliberately out of scope for V1. Object-only; <= 16384 bytes;
-- strict per-type key allowlist; fail-closed.
create or replace function public.learning_attempt_validate_answer(
  p_type text,
  p_content jsonb,
  p_answer jsonb
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
  v_blank_keys text[];
  v_selected jsonb;
  v_elem text;
  v_seen text[] := array[]::text[];
  v_blanks jsonb;
  v_bkey text;
  v_btext text;
  v_max_bytes integer := 16384;
begin
  if p_answer is null or jsonb_typeof(p_answer) is distinct from 'object' then
    raise exception 'answer_payload must be a JSON object';
  end if;
  if octet_length(p_answer::text) > v_max_bytes then
    raise exception 'answer_payload exceeds maximum size of % bytes', v_max_bytes;
  end if;

  if p_type = 'multiple_choice_single' then
    v_allowed := array['selected_key'];
    if jsonb_typeof(p_answer -> 'selected_key') is distinct from 'string' then
      raise exception 'answer_payload.selected_key must be a string';
    end if;
    v_option_keys := public.learning_attempt_snapshot_option_keys(p_content);
    if not ((p_answer ->> 'selected_key') = any (v_option_keys)) then
      raise exception
        'answer_payload.selected_key must reference an existing option key';
    end if;

  elsif p_type = 'multiple_choice_multiple' then
    v_allowed := array['selected_keys'];
    v_selected := p_answer -> 'selected_keys';
    if jsonb_typeof(v_selected) is distinct from 'array' then
      raise exception 'answer_payload.selected_keys must be an array';
    end if;
    v_option_keys := public.learning_attempt_snapshot_option_keys(p_content);
    if jsonb_array_length(v_selected) > coalesce(cardinality(v_option_keys), 0)
    then
      raise exception
        'answer_payload.selected_keys exceeds the number of options';
    end if;
    for v_elem in select jsonb_array_elements_text(v_selected)
    loop
      if not (v_elem = any (v_option_keys)) then
        raise exception
          'answer_payload.selected_keys must reference existing option keys';
      end if;
      if v_elem = any (v_seen) then
        raise exception 'answer_payload.selected_keys must be unique';
      end if;
      v_seen := array_append(v_seen, v_elem);
    end loop;

  elsif p_type = 'true_false' then
    v_allowed := array['value'];
    if jsonb_typeof(p_answer -> 'value') is distinct from 'boolean' then
      raise exception 'answer_payload.value must be a boolean';
    end if;

  elsif p_type = 'short_answer' then
    v_allowed := array['text'];
    if jsonb_typeof(p_answer -> 'text') is distinct from 'string' then
      raise exception 'answer_payload.text must be a string';
    end if;
    if char_length(p_answer ->> 'text') > 5000 then
      raise exception 'answer_payload.text exceeds the maximum of 5000 chars';
    end if;
    perform public.learning_attempt_assert_safe_text(
      'answer_payload.text', p_answer ->> 'text'
    );

  elsif p_type = 'fill_blank' then
    v_allowed := array['blanks'];
    v_blanks := p_answer -> 'blanks';
    if jsonb_typeof(v_blanks) is distinct from 'object' then
      raise exception 'answer_payload.blanks must be a JSON object';
    end if;
    v_blank_keys := public.learning_attempt_snapshot_blank_keys(p_content);
    -- Learner may leave blanks empty, but every provided key must be declared,
    -- and each value must be a bounded, safe string.
    for v_bkey in select jsonb_object_keys(v_blanks)
    loop
      if not (v_bkey = any (v_blank_keys)) then
        raise exception
          'answer_payload.blanks references unknown blank %', v_bkey;
      end if;
      if jsonb_typeof(v_blanks -> v_bkey) is distinct from 'string' then
        raise exception 'answer_payload.blanks.% must be a string', v_bkey;
      end if;
      v_btext := v_blanks ->> v_bkey;
      if char_length(v_btext) > 1000 then
        raise exception
          'answer_payload.blanks.% exceeds the maximum of 1000 chars', v_bkey;
      end if;
      perform public.learning_attempt_assert_safe_text(
        'answer_payload.blanks.' || v_bkey, v_btext
      );
    end loop;

  elsif p_type = 'numeric' then
    v_allowed := array['value'];
    -- Valid JSON number only — no expression/JS, no NaN/Infinity (not
    -- representable in JSON), no string coercion.
    if jsonb_typeof(p_answer -> 'value') is distinct from 'number' then
      raise exception 'answer_payload.value must be a number';
    end if;

  else
    -- Reserved/deferred question types can never appear in a snapshot (only
    -- published creatable questions are snapshotted); fail closed defensively.
    raise exception 'Unsupported question type for answer validation';
  end if;

  -- Strict per-type key allowlist — reject any unexpected key.
  for v_key in select jsonb_object_keys(p_answer)
  loop
    if not (v_key = any (v_allowed)) then
      raise exception
        'answer_payload contains unexpected key % for type %', v_key, p_type;
    end if;
  end loop;
end;
$$;

-- Lazy expiry: lock the attempt row FOR UPDATE and, if it is active and its
-- snapshot time limit has elapsed (now() > started_at + interval), transition it
-- to expired (DB clock only). Returns the current (possibly updated) row. There
-- is NO background job — expiry is applied on the next read/save/submit/cancel.
create or replace function public.learning_attempt_expire_if_due(
  p_attempt_id uuid
)
returns public.learning_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.learning_attempts%rowtype;
begin
  select * into v_attempt
  from public.learning_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception 'Learning attempt not found';
  end if;

  if v_attempt.status = 'active'
     and v_attempt.time_limit_seconds_snapshot is not null
     and now() > v_attempt.started_at
        + make_interval(secs => v_attempt.time_limit_seconds_snapshot)
  then
    update public.learning_attempts
    set status = 'expired',
        expired_at = now(),
        updated_at = now()
    where id = p_attempt_id
    returning * into v_attempt;

    perform public.learning_audit_write(
      v_attempt.user_id,
      v_attempt.space_id,
      'attempt.expire',
      'learning_attempt',
      p_attempt_id::text,
      jsonb_build_object(
        'attempt_id', p_attempt_id,
        'activity_id', v_attempt.activity_id,
        'course_id', v_attempt.course_id,
        'from_status', 'active',
        'to_status', 'expired'
      )
    );
  end if;

  return v_attempt;
end;
$$;

revoke all on function public.learning_attempt_assert_safe_text(text, text)
  from public, anon, authenticated;
revoke all on function public.learning_attempt_build_questions_snapshot(uuid)
  from public, anon, authenticated;
revoke all on function public.learning_attempt_snapshot_option_keys(jsonb)
  from public, anon, authenticated;
revoke all on function public.learning_attempt_snapshot_blank_keys(jsonb)
  from public, anon, authenticated;
revoke all on function public.learning_attempt_validate_answer(text, jsonb, jsonb)
  from public, anon, authenticated;
revoke all on function public.learning_attempt_expire_if_due(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) RLS policies (authenticated only — NO anon)
-- ---------------------------------------------------------------------------
-- Learners read ONLY their own attempts/answers. Authorized staff (course
-- managers) and platform admins may read attempts/answers within scope for
-- future audit. Ordinary space members canNOT see others' attempts. Answer keys
-- live in a separate table and are NEVER joined here.

drop policy if exists "Learners read own attempts"
  on public.learning_attempts;
create policy "Learners read own attempts"
  on public.learning_attempts for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Managers read scoped attempts"
  on public.learning_attempts;
create policy "Managers read scoped attempts"
  on public.learning_attempts for select
  to authenticated
  using (public.can_manage_learning_course(course_id));

drop policy if exists "Platform admins read all attempts"
  on public.learning_attempts;
create policy "Platform admins read all attempts"
  on public.learning_attempts for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Learners read own attempt answers"
  on public.learning_attempt_answers;
create policy "Learners read own attempt answers"
  on public.learning_attempt_answers for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_attempts a
      where a.id = learning_attempt_answers.attempt_id
        and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "Managers read scoped attempt answers"
  on public.learning_attempt_answers;
create policy "Managers read scoped attempt answers"
  on public.learning_attempt_answers for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_attempts a
      where a.id = learning_attempt_answers.attempt_id
        and public.can_manage_learning_course(a.course_id)
    )
  );

drop policy if exists "Platform admins read all attempt answers"
  on public.learning_attempt_answers;
create policy "Platform admins read all attempt answers"
  on public.learning_attempt_answers for select
  to authenticated
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 5) RPCs
-- ---------------------------------------------------------------------------

-- Start (or resume) an attempt for an activity. Idempotent: a live active
-- attempt (after lazy expiry) is returned instead of creating a new one.
--
-- Concurrency contract: the parent activity row is locked FOR UPDATE for the
-- duration of the start, so concurrent starts by the same learner serialize —
-- at most one active attempt is created (also enforced by the partial unique
-- index learning_attempts_one_active_uidx). max_attempts is counted under this
-- lock so it is race-free.
--
-- Parent-status decision (documented): starting a learner attempt requires an
-- active space and a fully PUBLISHED chain — program, course, section, lesson,
-- and the activity itself must be published — plus live course entitlement. A
-- draft/suspended/archived activity cannot be attempted. Only published
-- questions are snapshotted; start is rejected if there are none.
--
-- Client NEVER supplies user_id/course_id/space_id/lesson_id/max_attempts/
-- time_limit — all are server-derived.
create or replace function public.start_learning_attempt(
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
  v_settings public.learning_activity_settings%rowtype;
  v_existing public.learning_attempts%rowtype;
  v_enrollment_id uuid;
  v_snapshot jsonb;
  v_used integer;
  v_attempt_number integer;
  v_attempt_id uuid;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_activity_id is null then
    raise exception 'activity_id is required';
  end if;

  -- Lock the parent activity: serializes this learner's concurrent starts and
  -- keeps the published-question set stable while the snapshot is built.
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
    raise exception 'Learning space must be active to start an attempt';
  end if;

  -- Live entitlement gate (admin / course manager / active course or parent
  -- program enrollment). Checked BEFORE reading settings.
  if not public.has_learning_course_access(v_course.id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  -- Learner attempts require a fully published chain + published activity.
  if v_program.status is distinct from 'published' then
    raise exception 'Parent program must be published to start an attempt';
  end if;
  if v_course.status is distinct from 'published' then
    raise exception 'Parent course must be published to start an attempt';
  end if;
  if v_section.status is distinct from 'published' then
    raise exception 'Parent section must be published to start an attempt';
  end if;
  if v_lesson.status is distinct from 'published' then
    raise exception 'Parent lesson must be published to start an attempt';
  end if;
  if v_activity.status is distinct from 'published' then
    raise exception 'Activity must be published to start an attempt';
  end if;

  -- Read activity settings AFTER entitlement (inside DEFINER). This does NOT
  -- widen ordinary members' visibility of draft settings — it is read only for
  -- an entitled learner starting a published activity.
  select * into v_settings
  from public.learning_activity_settings
  where activity_id = p_activity_id
  for update;
  if not found then
    raise exception 'Learning activity settings not found';
  end if;

  -- Idempotent resume: if a live active attempt exists, apply lazy expiry; if it
  -- is still active, return it unchanged; if it just expired, fall through to a
  -- new attempt (subject to max_attempts).
  select * into v_existing
  from public.learning_attempts
  where user_id = v_uid
    and activity_id = p_activity_id
    and status = 'active'
  for update;

  if found then
    v_existing := public.learning_attempt_expire_if_due(v_existing.id);
    if v_existing.status = 'active' then
      return jsonb_build_object(
        'attempt_id', v_existing.id,
        'activity_id', v_existing.activity_id,
        'status', v_existing.status,
        'attempt_number', v_existing.attempt_number,
        'started_at', v_existing.started_at,
        'resumed', true
      );
    end if;
  end if;

  -- Enforce max_attempts against the LIVE setting. Counts terminal attempts
  -- (submitted + expired + cancelled) that count toward the limit; the active
  -- one is returned above, never created twice.
  select count(*)::integer into v_used
  from public.learning_attempts
  where user_id = v_uid
    and activity_id = p_activity_id
    and status in ('submitted', 'expired', 'cancelled');

  if v_settings.max_attempts is not null
     and v_used >= v_settings.max_attempts
  then
    raise exception 'Maximum attempts reached for this activity';
  end if;

  -- Build the LEARNER-SAFE snapshot from published questions only.
  v_snapshot := public.learning_attempt_build_questions_snapshot(p_activity_id);
  if v_snapshot is null or jsonb_array_length(v_snapshot) < 1 then
    raise exception 'Activity has no published questions to attempt';
  end if;

  v_enrollment_id := public.learning_progress_resolve_enrollment_id(
    v_course.id, v_uid
  );

  select coalesce(max(attempt_number), 0) + 1 into v_attempt_number
  from public.learning_attempts
  where user_id = v_uid
    and activity_id = p_activity_id;

  insert into public.learning_attempts (
    space_id,
    course_id,
    lesson_id,
    activity_id,
    user_id,
    enrollment_id,
    status,
    attempt_number,
    started_at,
    last_activity_at,
    time_limit_seconds_snapshot,
    max_attempts_snapshot,
    questions_snapshot
  ) values (
    v_program.space_id,
    v_course.id,
    v_lesson.id,
    p_activity_id,
    v_uid,
    v_enrollment_id,
    'active',
    v_attempt_number,
    v_now,
    v_now,
    v_settings.time_limit_seconds,
    v_settings.max_attempts,
    v_snapshot
  )
  returning id into v_attempt_id;

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'attempt.start',
    'learning_attempt',
    v_attempt_id::text,
    jsonb_build_object(
      'attempt_id', v_attempt_id,
      'activity_id', p_activity_id,
      'lesson_id', v_lesson.id,
      'section_id', v_section.id,
      'course_id', v_course.id,
      'program_id', v_program.id,
      'attempt_number', v_attempt_number,
      'question_count', jsonb_array_length(v_snapshot)
    )
  );

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'activity_id', p_activity_id,
    'status', 'active',
    'attempt_number', v_attempt_number,
    'started_at', v_now,
    'resumed', false
  );
end;
$$;

-- Save (upsert) a learner response for one question in an active attempt. Lazy
-- expiry runs first; saves are blocked on any non-active status. The question
-- must be part of the attempt's snapshot and the payload is validated by type.
-- NEVER compares to an answer key. Preserves first_answered_at; updates
-- last_saved_at and the attempt's last_activity_at.
create or replace function public.save_learning_attempt_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_answer_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.learning_attempts%rowtype;
  v_snap_q jsonb;
  v_type text;
  v_content jsonb;
  v_answer public.learning_attempt_answers%rowtype;
  v_payload jsonb := coalesce(p_answer_payload, '{}'::jsonb);
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null or p_question_id is null then
    raise exception 'attempt_id and question_id are required';
  end if;

  -- Lock the attempt and apply lazy expiry first.
  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  if v_attempt.user_id is distinct from v_uid then
    raise exception 'Not allowed to modify this attempt';
  end if;

  if v_attempt.status is distinct from 'active' then
    raise exception 'Attempt is % and can no longer be modified', v_attempt.status;
  end if;

  -- The question must be part of the attempt's LEARNER-SAFE snapshot.
  select elem into v_snap_q
  from jsonb_array_elements(v_attempt.questions_snapshot) as elem
  where elem ->> 'question_id' = p_question_id::text
  limit 1;

  if v_snap_q is null then
    raise exception 'Question is not part of this attempt';
  end if;

  v_type := v_snap_q ->> 'question_type';
  v_content := v_snap_q -> 'content';

  -- Structural validation only — NEVER compared to any answer key.
  perform public.learning_attempt_validate_answer(v_type, v_content, v_payload);

  insert into public.learning_attempt_answers (
    attempt_id,
    question_id,
    answer_payload,
    first_answered_at,
    last_saved_at
  ) values (
    p_attempt_id,
    p_question_id,
    v_payload,
    v_now,
    v_now
  )
  on conflict (attempt_id, question_id) do update
  set answer_payload = excluded.answer_payload,
      last_saved_at = v_now,
      updated_at = v_now
  returning * into v_answer;

  update public.learning_attempts
  set last_activity_at = v_now,
      updated_at = v_now
  where id = p_attempt_id;

  -- SAFE audit metadata only — NEVER the answer payload.
  perform public.learning_audit_write(
    v_uid,
    v_attempt.space_id,
    'attempt.answer_save',
    'learning_attempt',
    p_attempt_id::text,
    jsonb_build_object(
      'attempt_id', p_attempt_id,
      'activity_id', v_attempt.activity_id,
      'course_id', v_attempt.course_id,
      'question_id', p_question_id,
      'saved', true
    )
  );

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'question_id', p_question_id,
    'saved', true,
    'first_answered_at', v_answer.first_answered_at,
    'last_saved_at', v_answer.last_saved_at
  );
end;
$$;

-- Learner-safe read of the caller's OWN attempt: lifecycle, timestamps, the
-- LEARNER-SAFE questions snapshot, the caller's saved answers, and remaining
-- time. Applies lazy expiry first. NEVER returns answer keys / correct answers.
create or replace function public.get_my_learning_attempt(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.learning_attempts%rowtype;
  v_answers jsonb;
  v_remaining integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  -- Lazy expiry first (locks the row; may transition active → expired).
  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  -- Own attempt only. Staff/platform read via table SELECT policies, not here.
  if v_attempt.user_id is distinct from v_uid then
    raise exception 'Not allowed to read this attempt';
  end if;

  -- The caller's own saved responses (learner-safe — no keys).
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question_id', ans.question_id,
        'answer_payload', ans.answer_payload,
        'first_answered_at', ans.first_answered_at,
        'last_saved_at', ans.last_saved_at
      )
      order by ans.first_answered_at, ans.question_id
    ),
    '[]'::jsonb
  ) into v_answers
  from public.learning_attempt_answers ans
  where ans.attempt_id = p_attempt_id;

  if v_attempt.status = 'active'
     and v_attempt.time_limit_seconds_snapshot is not null
  then
    v_remaining := greatest(
      0,
      v_attempt.time_limit_seconds_snapshot
        - floor(extract(epoch from (now() - v_attempt.started_at)))::integer
    );
  else
    v_remaining := null;
  end if;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'activity_id', v_attempt.activity_id,
    'course_id', v_attempt.course_id,
    'status', v_attempt.status,
    'attempt_number', v_attempt.attempt_number,
    'started_at', v_attempt.started_at,
    'last_activity_at', v_attempt.last_activity_at,
    'submitted_at', v_attempt.submitted_at,
    'expired_at', v_attempt.expired_at,
    'cancelled_at', v_attempt.cancelled_at,
    'time_limit_seconds', v_attempt.time_limit_seconds_snapshot,
    'max_attempts', v_attempt.max_attempts_snapshot,
    'remaining_seconds', v_remaining,
    'questions_snapshot', v_attempt.questions_snapshot,
    'answers', v_answers
  );
end;
$$;

-- Submit an attempt: active → submitted (once). Lazy expiry first. Idempotent
-- re-submit returns the same state without changing submitted_at. Expired or
-- cancelled attempts can NEVER become submitted. NO scoring, NO answer keys, NO
-- Progress mutation, NO certificates.
create or replace function public.submit_learning_attempt(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.learning_attempts%rowtype;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  if v_attempt.user_id is distinct from v_uid then
    raise exception 'Not allowed to submit this attempt';
  end if;

  -- Idempotent: already submitted returns the same state (no timestamp change).
  if v_attempt.status = 'submitted' then
    return jsonb_build_object(
      'attempt_id', p_attempt_id,
      'status', 'submitted',
      'submitted_at', v_attempt.submitted_at
    );
  end if;

  if v_attempt.status is distinct from 'active' then
    raise exception 'Attempt is % and cannot be submitted', v_attempt.status;
  end if;

  update public.learning_attempts
  set status = 'submitted',
      submitted_at = v_now,
      last_activity_at = v_now,
      updated_at = v_now
  where id = p_attempt_id
  returning * into v_attempt;

  perform public.learning_audit_write(
    v_uid,
    v_attempt.space_id,
    'attempt.submit',
    'learning_attempt',
    p_attempt_id::text,
    jsonb_build_object(
      'attempt_id', p_attempt_id,
      'activity_id', v_attempt.activity_id,
      'course_id', v_attempt.course_id,
      'from_status', 'active',
      'to_status', 'submitted'
    )
  );

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'status', 'submitted',
    'submitted_at', v_attempt.submitted_at
  );
end;
$$;

-- Cancel an attempt: active → cancelled (only). Lazy expiry first. Idempotent
-- re-cancel returns the same state. Cancelled attempts keep their saved answers
-- and can never reopen. Cancelled COUNTS toward max_attempts (documented).
create or replace function public.cancel_learning_attempt(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.learning_attempts%rowtype;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  if v_attempt.user_id is distinct from v_uid then
    raise exception 'Not allowed to cancel this attempt';
  end if;

  -- Idempotent: already cancelled returns the same state.
  if v_attempt.status = 'cancelled' then
    return jsonb_build_object(
      'attempt_id', p_attempt_id,
      'status', 'cancelled',
      'cancelled_at', v_attempt.cancelled_at
    );
  end if;

  if v_attempt.status is distinct from 'active' then
    raise exception 'Attempt is % and cannot be cancelled', v_attempt.status;
  end if;

  update public.learning_attempts
  set status = 'cancelled',
      cancelled_at = v_now,
      last_activity_at = v_now,
      updated_at = v_now
  where id = p_attempt_id
  returning * into v_attempt;

  perform public.learning_audit_write(
    v_uid,
    v_attempt.space_id,
    'attempt.cancel',
    'learning_attempt',
    p_attempt_id::text,
    jsonb_build_object(
      'attempt_id', p_attempt_id,
      'activity_id', v_attempt.activity_id,
      'course_id', v_attempt.course_id,
      'from_status', 'active',
      'to_status', 'cancelled'
    )
  );

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'status', 'cancelled',
    'cancelled_at', v_attempt.cancelled_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) RPC grants (revoke public/anon; grant authenticated + service_role)
-- ---------------------------------------------------------------------------

revoke all on function public.start_learning_attempt(uuid)
  from public, anon;
grant execute on function public.start_learning_attempt(uuid)
  to authenticated, service_role;

revoke all on function public.save_learning_attempt_answer(uuid, uuid, jsonb)
  from public, anon;
grant execute on function public.save_learning_attempt_answer(uuid, uuid, jsonb)
  to authenticated, service_role;

revoke all on function public.get_my_learning_attempt(uuid)
  from public, anon;
grant execute on function public.get_my_learning_attempt(uuid)
  to authenticated, service_role;

revoke all on function public.submit_learning_attempt(uuid)
  from public, anon;
grant execute on function public.submit_learning_attempt(uuid)
  to authenticated, service_role;

revoke all on function public.cancel_learning_attempt(uuid)
  from public, anon;
grant execute on function public.cancel_learning_attempt(uuid)
  to authenticated, service_role;
