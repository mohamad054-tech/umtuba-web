-- UM Learning OS — Result Policy Completion V1
-- Additive only. Does NOT edit migrations 20260828–20260843.
-- Depends on: 20260833 (show_result_policy), 20260839 scoring results,
--             20260841 get_my_learning_attempt_result.
--
-- Completes show_result_policy gates:
--   after_close → unlock when now() >= results_available_at
--   manual      → unlock when learning_attempt_result_releases row exists
--
-- results_available_at is the authoritative RESULT AVAILABILITY timestamp for
-- the after_close policy only. It is NOT a general activity lifecycle closes_at.
--
-- Does NOT: per-question results, keys, Progress mutations, grading, analytics
-- UI, certificates, assignments, Games/Ads/UM Points.
-- Migration apply status: NOT APPLIED (Git-only until explicitly approved).

-- ---------------------------------------------------------------------------
-- 1) results_available_at on activity settings (after_close clock)
-- ---------------------------------------------------------------------------

alter table public.learning_activity_settings
  add column if not exists results_available_at timestamptz;

comment on column public.learning_activity_settings.results_available_at is
  'Authoritative RESULT AVAILABILITY timestamp for show_result_policy=after_close only. NOT a general activity lifecycle closes_at. Once now() >= results_available_at, the value is immutable (cannot clear or postpone).';

-- ---------------------------------------------------------------------------
-- 2) Manual release table (insert-once)
-- ---------------------------------------------------------------------------

create table if not exists public.learning_attempt_result_releases (
  attempt_id uuid primary key
    references public.learning_attempts (id) on delete cascade,
  activity_id uuid not null
    references public.learning_activities (id) on delete restrict,
  course_id uuid not null
    references public.learning_courses (id) on delete restrict,
  space_id uuid not null
    references public.learning_spaces (id) on delete restrict,
  learner_user_id uuid not null
    references public.profiles (id) on delete restrict,
  release_source text not null default 'manual'
    constraint learning_attempt_result_releases_source_check check (
      release_source = 'manual'
    ),
  released_at timestamptz not null default now(),
  released_by uuid not null
    references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.learning_attempt_result_releases is
  'Manual learner-result release records. Insert-once per attempt. No unrelease in V1. released_at/released_by immutable after insert.';

create index if not exists learning_attempt_result_releases_activity_idx
  on public.learning_attempt_result_releases (activity_id);

create index if not exists learning_attempt_result_releases_course_idx
  on public.learning_attempt_result_releases (course_id);

create index if not exists learning_attempt_result_releases_learner_idx
  on public.learning_attempt_result_releases (learner_user_id);

-- Immutable guard: never alter identity/timestamps after insert.
create or replace function public.learning_attempt_result_release_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'learning_attempt_result_releases rows are immutable';
end;
$$;

drop trigger if exists learning_attempt_result_releases_guard_immutable
  on public.learning_attempt_result_releases;
create trigger learning_attempt_result_releases_guard_immutable
  before update or delete on public.learning_attempt_result_releases
  for each row execute function public.learning_attempt_result_release_guard_immutable();

alter table public.learning_attempt_result_releases enable row level security;
alter table public.learning_attempt_result_releases force row level security;

revoke all on table public.learning_attempt_result_releases
  from public, anon, authenticated;
grant select on table public.learning_attempt_result_releases to authenticated;
revoke insert, update, delete on table public.learning_attempt_result_releases
  from anon, authenticated;
grant all on table public.learning_attempt_result_releases to service_role;

-- Learners may see that their own attempt was released (no score payload here).
drop policy if exists "Learners read own attempt result releases"
  on public.learning_attempt_result_releases;
create policy "Learners read own attempt result releases"
  on public.learning_attempt_result_releases for select
  to authenticated
  using (learner_user_id = auth.uid());

drop policy if exists "Managers read scoped attempt result releases"
  on public.learning_attempt_result_releases;
create policy "Managers read scoped attempt result releases"
  on public.learning_attempt_result_releases for select
  to authenticated
  using (public.can_manage_learning_course(course_id));

drop policy if exists "Platform admins read all attempt result releases"
  on public.learning_attempt_result_releases;
create policy "Platform admins read all attempt result releases"
  on public.learning_attempt_result_releases for select
  to authenticated
  using (public.is_platform_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 3) set_learning_activity_results_available_at
-- ---------------------------------------------------------------------------

create or replace function public.set_learning_activity_results_available_at(
  p_activity_id uuid,
  p_results_available_at timestamptz
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
  v_prev timestamptz;
  v_now timestamptz := now();
  v_deny constant text := 'Not allowed to manage this activity result policy';
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_activity_id is null then
    raise exception 'activity_id is required';
  end if;
  if p_results_available_at is null then
    raise exception 'results_available_at is required';
  end if;

  select * into v_activity
  from public.learning_activities
  where id = p_activity_id;

  if not found then
    raise exception '%', v_deny;
  end if;

  if not (
    public.can_manage_learning_course(v_activity.course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception '%', v_deny;
  end if;

  select * into v_settings
  from public.learning_activity_settings
  where activity_id = p_activity_id
  for update;

  if not found then
    raise exception 'Learning activity settings not found';
  end if;

  v_prev := v_settings.results_available_at;

  -- Once the availability timestamp has been reached, cannot clear or postpone.
  if v_prev is not null and v_now >= v_prev then
    if p_results_available_at is distinct from v_prev then
      raise exception 'results_available_at is immutable after it has been reached';
    end if;
    return jsonb_build_object(
      'activity_id', p_activity_id,
      'results_available_at', v_prev,
      'unchanged', true
    );
  end if;

  -- Before reached: allow authorized change (including earlier/later future).
  update public.learning_activity_settings
  set results_available_at = p_results_available_at,
      updated_at = v_now
  where activity_id = p_activity_id
  returning * into v_settings;

  perform public.learning_audit_write(
    v_uid,
    v_activity.space_id,
    'activity.results_available_at.set',
    'learning_activity',
    p_activity_id::text,
    jsonb_build_object(
      'activity_id', p_activity_id,
      'course_id', v_activity.course_id,
      'previous_results_available_at', v_prev,
      'results_available_at', p_results_available_at
    )
  );

  return jsonb_build_object(
    'activity_id', p_activity_id,
    'results_available_at', v_settings.results_available_at,
    'unchanged', false
  );
end;
$$;

revoke all on function public.set_learning_activity_results_available_at(
  uuid, timestamptz
) from public, anon;
grant execute on function public.set_learning_activity_results_available_at(
  uuid, timestamptz
) to authenticated, service_role;

comment on function public.set_learning_activity_results_available_at(
  uuid, timestamptz
) is
  'Staff sets after_close result availability timestamp. Audited. Immutable once reached. Not a general activity closes_at.';

-- ---------------------------------------------------------------------------
-- 4) release_learning_attempt_result — insert-once manual release
-- ---------------------------------------------------------------------------

create or replace function public.release_learning_attempt_result(
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
  v_existing public.learning_attempt_result_releases%rowtype;
  v_row public.learning_attempt_result_releases%rowtype;
  v_now timestamptz := now();
  v_deny constant text := 'Not allowed to release this attempt result';
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  -- Derive attempt/activity/course/space entirely from DB — no client scope.
  select * into v_attempt
  from public.learning_attempts
  where id = p_attempt_id;

  if not found then
    raise exception '%', v_deny;
  end if;

  if not (
    public.can_manage_learning_course(v_attempt.course_id, v_uid)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception '%', v_deny;
  end if;

  -- Idempotent insert-once: concurrent callers must not alter released_at/by.
  insert into public.learning_attempt_result_releases (
    attempt_id,
    activity_id,
    course_id,
    space_id,
    learner_user_id,
    release_source,
    released_at,
    released_by
  ) values (
    v_attempt.id,
    v_attempt.activity_id,
    v_attempt.course_id,
    v_attempt.space_id,
    v_attempt.user_id,
    'manual',
    v_now,
    v_uid
  )
  on conflict (attempt_id) do nothing
  returning * into v_row;

  if not found then
    select * into v_existing
    from public.learning_attempt_result_releases
    where attempt_id = p_attempt_id;

    return jsonb_build_object(
      'attempt_id', v_existing.attempt_id,
      'activity_id', v_existing.activity_id,
      'released_at', v_existing.released_at,
      'released_by', v_existing.released_by,
      'release_source', v_existing.release_source,
      'idempotent_replay', true
    );
  end if;

  perform public.learning_audit_write(
    v_uid,
    v_attempt.space_id,
    'attempt.result_release',
    'learning_attempt',
    p_attempt_id::text,
    jsonb_build_object(
      'attempt_id', p_attempt_id,
      'activity_id', v_attempt.activity_id,
      'course_id', v_attempt.course_id,
      'learner_user_id', v_attempt.user_id,
      'release_source', 'manual',
      'released_at', v_row.released_at
    )
  );

  return jsonb_build_object(
    'attempt_id', v_row.attempt_id,
    'activity_id', v_row.activity_id,
    'released_at', v_row.released_at,
    'released_by', v_row.released_by,
    'release_source', v_row.release_source,
    'idempotent_replay', false
  );
end;
$$;

revoke all on function public.release_learning_attempt_result(uuid)
  from public, anon;
grant execute on function public.release_learning_attempt_result(uuid)
  to authenticated, service_role;

comment on function public.release_learning_attempt_result(uuid) is
  'Staff manual release of learner aggregate result visibility. Insert-once idempotent. No unrelease. Scope derived from attempt row only.';

-- ---------------------------------------------------------------------------
-- 5) REPLACE get_my_learning_attempt_result — policy completion
--     Aggregate payload EXACTLY preserved from 20260841.
-- ---------------------------------------------------------------------------

create or replace function public.get_my_learning_attempt_result(
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
  v_settings public.learning_activity_settings%rowtype;
  v_result public.learning_attempt_results%rowtype;
  v_policy text;
  v_visibility text;
  v_message text;
  v_result_json jsonb := null;
  v_percentage numeric;
  v_has_result boolean := false;
  v_policy_unlocked boolean := false;
  v_has_release boolean := false;
  v_now timestamptz := now();
  v_deny constant text := 'Not allowed to read this attempt result';
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  select * into v_attempt
  from public.learning_attempts
  where id = p_attempt_id;

  if not found or v_attempt.user_id is distinct from v_uid then
    raise exception '%', v_deny;
  end if;

  if not public.has_learning_course_access(v_attempt.course_id, v_uid) then
    raise exception '%', v_deny;
  end if;

  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  if v_attempt.user_id is distinct from v_uid then
    raise exception '%', v_deny;
  end if;

  select * into v_settings
  from public.learning_activity_settings
  where activity_id = v_attempt.activity_id;

  if found then
    v_policy := v_settings.show_result_policy;
  else
    v_policy := 'never';
  end if;

  select * into v_result
  from public.learning_attempt_results
  where attempt_id = p_attempt_id
    and status = 'scored';

  v_has_result := found;

  select exists (
    select 1
    from public.learning_attempt_result_releases r
    where r.attempt_id = p_attempt_id
  ) into v_has_release;

  -- Policy unlock gate (independent of score). Non-submitted never unlocks.
  if v_attempt.status is distinct from 'submitted' then
    v_policy_unlocked := false;
  elsif v_policy in ('immediately', 'after_submit') then
    v_policy_unlocked := true;
  elsif v_policy = 'after_close' then
    v_policy_unlocked := (
      v_settings.results_available_at is not null
      and v_now >= v_settings.results_available_at
    );
  elsif v_policy = 'manual' then
    v_policy_unlocked := v_has_release;
  else
    -- never | unknown → fail closed
    v_policy_unlocked := false;
  end if;

  if v_attempt.status is distinct from 'submitted' then
    v_visibility := 'hidden';
    v_message := 'Results are not available.';
  elsif not v_policy_unlocked then
    v_visibility := 'hidden';
    v_message := 'Results are not available.';
  elsif not v_has_result then
    v_visibility := 'pending_score';
    v_message := 'Submitted — your result is being prepared.';
  else
    v_visibility := 'available';
    v_message := 'Your result is ready.';

    if v_result.score_max = 0 then
      v_percentage := 0;
    else
      v_percentage := round((v_result.score_earned / v_result.score_max) * 100, 2);
    end if;

    v_result_json := jsonb_build_object(
      'status', 'scored',
      'score_earned', v_result.score_earned,
      'score_max', v_result.score_max,
      'percentage', v_percentage,
      'passed', to_jsonb(v_result.passed),
      'scored_at', v_result.scored_at
    );
  end if;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'activity_id', v_attempt.activity_id,
    'attempt_status', v_attempt.status,
    'visibility', v_visibility,
    'result', v_result_json,
    'message', v_message
  );
end;
$$;

revoke all on function public.get_my_learning_attempt_result(uuid)
  from public, anon;
grant execute on function public.get_my_learning_attempt_result(uuid)
  to authenticated, service_role;

comment on function public.get_my_learning_attempt_result(uuid) is
  'Learner-safe aggregate attempt result with Result Policy Completion V1 gates (after_close/manual). Aggregate payload unchanged. NEVER keys, per-question correctness, or staff identity fields.';
