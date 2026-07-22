-- UMTUBA Learning OS — Enrollments Foundation V1
-- Additive. Enrollment = ENTITLEMENT TO PARTICIPATE in a Program XOR a Course.
-- Depends on: 20260828..20260833 learning foundations.
-- Hierarchy target: Space → Program (XOR) Space → Program → Course.
--
-- An enrollment is NOT payment, progress, completion percentage, certificate,
-- attempt, submission, grade, seat/capacity, or membership. It is a distinct
-- entitlement record with its own lifecycle
-- (pending|active|suspended|expired|cancelled|completed) that is INDEPENDENT of
-- content lifecycle (draft|published|...) and INDEPENDENT of space membership.
--
-- Locked architecture defaults (approved review):
--  1. Target = Program XOR Course via nullable hard FKs + target_type +
--     denormalized space_id.
--  2. Membership is independent of enrollment; require_space_membership /
--     require_program_enrollment are enroll-time PRECONDITIONS only.
--  3. Distinct entitlement lifecycle (NOT content lifecycle).
--  4. No anonymous exposure (authenticated only — Activities-style).
--  5. One live enrollment per learner per target (partial unique on non-terminal
--     pending|active|suspended); re-enroll after a terminal row = a NEW row.
--  6. Payments/UEOS referenced via SOFT refs (source + source_reference_type/id);
--     NO cross-product FKs.
--  7. Dedicated append-only learning_enrollment_events + summary via
--     learning_audit_write.
--  8. Entitlement evaluated LIVE via has_learning_program_access /
--     has_learning_course_access.
--
-- World hardening lesson: public/anon SELECT policies must NEVER call
-- is_platform_admin(). Here there is NO anon path at all (no anon grant, no anon
-- policy), so is_platform_admin() is only ever reachable from authenticated
-- policies.
--
-- Explicit exclusions (NOT implemented here): payments, progress, certificates,
-- UI, marketplace, attempts, seats/capacity logic, auto-membership creation,
-- type-specific engines.

-- ---------------------------------------------------------------------------
-- 1) learning_enrollments
-- ---------------------------------------------------------------------------

create table if not exists public.learning_enrollments (
  id uuid primary key default gen_random_uuid(),
  -- Denormalized authority boundary; always equals the target's space.
  space_id uuid not null
    references public.learning_spaces (id) on delete restrict,
  -- Program XOR Course target (nullable hard FKs + discriminator).
  target_type text not null
    constraint learning_enrollments_target_type_check check (
      target_type in ('program', 'course')
    ),
  program_id uuid
    references public.learning_programs (id) on delete restrict,
  course_id uuid
    references public.learning_courses (id) on delete restrict,
  -- Learner.
  user_id uuid not null
    references public.profiles (id) on delete restrict,
  -- Entitlement lifecycle — distinct from content lifecycle.
  status text not null default 'pending'
    constraint learning_enrollments_status_check check (
      status in (
        'pending',
        'active',
        'suspended',
        'expired',
        'cancelled',
        'completed'
      )
    ),
  -- Immutable provenance (enforced by trigger). Allowlist below.
  source text not null
    constraint learning_enrollments_source_check check (
      source in (
        'self_enrollment',
        'invitation',
        'admin_assignment',
        'institution_assignment',
        'corporate_assignment',
        'scholarship',
        'voucher',
        'gift',
        'bundle',
        'migration'
      )
    ),
  -- Soft references to other products (payments/UEOS/bundles) — NO FKs.
  source_reference_type text
    constraint learning_enrollments_source_reference_type_len check (
      source_reference_type is null
      or char_length(btrim(source_reference_type)) between 1 and 80
    ),
  source_reference_id text
    constraint learning_enrollments_source_reference_id_len check (
      source_reference_id is null
      or char_length(source_reference_id) between 1 and 128
    ),
  enrolled_by uuid references public.profiles (id) on delete set null,
  starts_at timestamptz,
  expires_at timestamptz,
  -- Lifecycle timestamps.
  activated_at timestamptz,
  suspended_at timestamptz,
  expired_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    constraint learning_enrollments_metadata_object check (
      jsonb_typeof(metadata) = 'object'
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Program XOR Course: exactly one target FK set, matching target_type.
  constraint learning_enrollments_target_xor check (
    (
      target_type = 'program'
      and program_id is not null
      and course_id is null
    )
    or (
      target_type = 'course'
      and course_id is not null
      and program_id is null
    )
  ),
  -- Window sanity: expiry after start when both present.
  constraint learning_enrollments_window_check check (
    starts_at is null
    or expires_at is null
    or expires_at > starts_at
  )
);

comment on table public.learning_enrollments is
  'Learning OS enrollments — ENTITLEMENT to participate in a Program XOR a Course. Not payment/progress/certificate/membership. Client writes only via RPCs. space_id/user_id/target_type/program_id/course_id/source are immutable after creation.';

comment on column public.learning_enrollments.space_id is
  'Denormalized authority boundary; always equals the target program/course space. Immutable.';

comment on column public.learning_enrollments.source is
  'Immutable provenance. Payments/UEOS/bundles are referenced only via source + source_reference_type/id soft refs (no cross-product FKs).';

comment on column public.learning_enrollments.metadata is
  'Bounded free-form object (<= 4096 bytes, <= 32 keys, depth <= 2). Never store payments/progress/certificates/PII dumps.';

-- One LIVE enrollment per learner per target (non-terminal statuses only).
-- Re-enrolling after a terminal row (expired|cancelled|completed) makes a NEW row.
create unique index if not exists learning_enrollments_one_live_program_uidx
  on public.learning_enrollments (user_id, program_id)
  where program_id is not null
    and status in ('pending', 'active', 'suspended');

create unique index if not exists learning_enrollments_one_live_course_uidx
  on public.learning_enrollments (user_id, course_id)
  where course_id is not null
    and status in ('pending', 'active', 'suspended');

create index if not exists learning_enrollments_user_status_idx
  on public.learning_enrollments (user_id, status);

create index if not exists learning_enrollments_space_status_idx
  on public.learning_enrollments (space_id, status);

create index if not exists learning_enrollments_program_status_idx
  on public.learning_enrollments (program_id, status)
  where program_id is not null;

create index if not exists learning_enrollments_course_status_idx
  on public.learning_enrollments (course_id, status)
  where course_id is not null;

-- Maintenance sweep support (expire_due_learning_enrollments).
create index if not exists learning_enrollments_expiry_idx
  on public.learning_enrollments (status, expires_at)
  where expires_at is not null;

create index if not exists learning_enrollments_source_ref_idx
  on public.learning_enrollments (source_reference_type, source_reference_id)
  where source_reference_type is not null;

drop trigger if exists learning_enrollments_set_updated_at
  on public.learning_enrollments;
create trigger learning_enrollments_set_updated_at
  before update on public.learning_enrollments
  for each row execute function public.set_row_updated_at();

-- Immutability guard: identity/provenance columns never change after creation.
create or replace function public.learning_enrollments_guard_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.space_id is distinct from old.space_id
     or new.target_type is distinct from old.target_type
     or new.program_id is distinct from old.program_id
     or new.course_id is distinct from old.course_id
     or new.user_id is distinct from old.user_id
     or new.source is distinct from old.source
     or new.created_at is distinct from old.created_at
  then
    raise exception
      'learning_enrollments identity/provenance columns are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_enrollments_guard_immutable
  on public.learning_enrollments;
create trigger learning_enrollments_guard_immutable
  before update on public.learning_enrollments
  for each row execute function public.learning_enrollments_guard_immutable();

alter table public.learning_enrollments enable row level security;
alter table public.learning_enrollments force row level security;

revoke all on table public.learning_enrollments
  from public, anon, authenticated;
-- No anon: enrollments (learner entitlements) are never exposed anonymously.
grant select on table public.learning_enrollments to authenticated;
revoke insert, update, delete on table public.learning_enrollments
  from anon, authenticated;
grant all on table public.learning_enrollments to service_role;

-- ---------------------------------------------------------------------------
-- 2) learning_enrollment_events (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.learning_enrollment_events (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null
    references public.learning_enrollments (id) on delete cascade,
  space_id uuid
    references public.learning_spaces (id) on delete set null,
  actor_user_id uuid references public.profiles (id) on delete set null,
  event_type text not null
    constraint learning_enrollment_events_type_check check (
      event_type in (
        'created',
        'activated',
        'suspended',
        'reinstated',
        'cancelled',
        'completed',
        'moderated',
        'expired'
      )
    ),
  from_status text
    constraint learning_enrollment_events_from_status_check check (
      from_status is null
      or from_status in (
        'pending',
        'active',
        'suspended',
        'expired',
        'cancelled',
        'completed'
      )
    ),
  to_status text
    constraint learning_enrollment_events_to_status_check check (
      to_status is null
      or to_status in (
        'pending',
        'active',
        'suspended',
        'expired',
        'cancelled',
        'completed'
      )
    ),
  metadata jsonb not null default '{}'::jsonb
    constraint learning_enrollment_events_metadata_object check (
      jsonb_typeof(metadata) = 'object'
    ),
  created_at timestamptz not null default now()
);

comment on table public.learning_enrollment_events is
  'Append-only per-enrollment lifecycle event log. Inserts only via SECURITY DEFINER RPCs. No client/anon writes; update/delete forbidden by trigger.';

create index if not exists learning_enrollment_events_enrollment_created_idx
  on public.learning_enrollment_events (enrollment_id, created_at desc);

create index if not exists learning_enrollment_events_space_created_idx
  on public.learning_enrollment_events (space_id, created_at desc);

create or replace function public.learning_enrollment_events_forbid_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'learning_enrollment_events is append-only';
end;
$$;

drop trigger if exists learning_enrollment_events_forbid_update
  on public.learning_enrollment_events;
create trigger learning_enrollment_events_forbid_update
  before update on public.learning_enrollment_events
  for each row execute function public.learning_enrollment_events_forbid_mutation();

drop trigger if exists learning_enrollment_events_forbid_delete
  on public.learning_enrollment_events;
create trigger learning_enrollment_events_forbid_delete
  before delete on public.learning_enrollment_events
  for each row execute function public.learning_enrollment_events_forbid_mutation();

alter table public.learning_enrollment_events enable row level security;
alter table public.learning_enrollment_events force row level security;

revoke all on table public.learning_enrollment_events
  from public, anon, authenticated;
grant select on table public.learning_enrollment_events to authenticated;
revoke insert, update, delete on table public.learning_enrollment_events
  from anon, authenticated;
grant all on table public.learning_enrollment_events to service_role;

-- ---------------------------------------------------------------------------
-- 3) Internal validators & event writer
-- ---------------------------------------------------------------------------

-- Bounded metadata: object-only, <= 4096 bytes, <= 32 top-level keys, depth <=2,
-- scalar or short-array values (arrays <= 64 scalars), strings <= 512 chars.
-- Must NOT store payments/progress/certificates or large content.
create or replace function public.learning_enrollment_validate_metadata(
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
  v_max_bytes integer := 4096;
  v_max_keys integer := 32;
begin
  if p_value is null or jsonb_typeof(p_value) is distinct from 'object' then
    raise exception 'metadata must be a JSON object';
  end if;

  if octet_length(p_value::text) > v_max_bytes then
    raise exception 'metadata exceeds maximum size of % bytes', v_max_bytes;
  end if;

  if (select count(*) from jsonb_object_keys(p_value)) > v_max_keys then
    raise exception 'metadata exceeds maximum of % top-level keys', v_max_keys;
  end if;

  for v_key in select jsonb_object_keys(p_value)
  loop
    v_elem := p_value -> v_key;

    if jsonb_typeof(v_elem) = 'object' then
      raise exception 'metadata nested objects not allowed (key %)', v_key;
    elsif jsonb_typeof(v_elem) = 'array' then
      if jsonb_array_length(v_elem) > 64 then
        raise exception 'metadata.% exceeds maximum item count', v_key;
      end if;
      if exists (
        select 1
        from jsonb_array_elements(v_elem) as t(val)
        where jsonb_typeof(t.val) in ('object', 'array')
      ) then
        raise exception 'metadata.% array items must be scalars', v_key;
      end if;
    elsif jsonb_typeof(v_elem) = 'string' then
      if char_length(v_elem #>> '{}') > 512 then
        raise exception 'metadata.% exceeds maximum length', v_key;
      end if;
    end if;
  end loop;
end;
$$;

-- Validate source against the immutable allowlist (fail-closed).
create or replace function public.learning_enrollment_validate_source(
  p_source text
)
returns void
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  if p_source is null or p_source not in (
    'self_enrollment',
    'invitation',
    'admin_assignment',
    'institution_assignment',
    'corporate_assignment',
    'scholarship',
    'voucher',
    'gift',
    'bundle',
    'migration'
  ) then
    raise exception 'Invalid enrollment source';
  end if;
end;
$$;

-- Append a lifecycle event. Internal only (DEFINER; never granted to clients).
create or replace function public.learning_enrollment_event_write(
  p_enrollment_id uuid,
  p_space_id uuid,
  p_actor_user_id uuid,
  p_event_type text,
  p_from_status text default null,
  p_to_status text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.learning_enrollment_events (
    enrollment_id,
    space_id,
    actor_user_id,
    event_type,
    from_status,
    to_status,
    metadata
  ) values (
    p_enrollment_id,
    p_space_id,
    p_actor_user_id,
    p_event_type,
    p_from_status,
    p_to_status,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.learning_enrollment_validate_metadata(jsonb)
  from public, anon, authenticated;
revoke all on function public.learning_enrollment_validate_source(text)
  from public, anon, authenticated;
revoke all on function public.learning_enrollment_event_write(
  uuid, uuid, uuid, text, text, text, jsonb
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Authority & entitlement helpers (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

-- Manage an enrollment = platform admin OR manager of the target program/course.
-- Delegated managers are membership-revalidated by the underlying helpers
-- (a stale staff row grants no authority).
create or replace function public.can_manage_learning_enrollment(
  p_enrollment_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_enrollment_id is not null
    and p_user_id is not null
    and (
      public.is_platform_admin(p_user_id)
      or exists (
        select 1
        from public.learning_enrollments e
        where e.id = p_enrollment_id
          and e.target_type = 'program'
          and e.program_id is not null
          and public.can_manage_learning_program(e.program_id, p_user_id)
      )
      or exists (
        select 1
        from public.learning_enrollments e
        where e.id = p_enrollment_id
          and e.target_type = 'course'
          and e.course_id is not null
          and public.can_manage_learning_course(e.course_id, p_user_id)
      )
    );
$$;

-- Live entitlement to a PROGRAM: platform admin OR program manager OR an ACTIVE
-- enrollment currently inside its start/expiry window. Evaluated live — never
-- cached; managers implicitly have access.
create or replace function public.has_learning_program_access(
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
      or public.can_manage_learning_program(p_program_id, p_user_id)
      or exists (
        select 1
        from public.learning_enrollments e
        where e.program_id = p_program_id
          and e.user_id = p_user_id
          and e.status = 'active'
          and (e.starts_at is null or e.starts_at <= now())
          and (e.expires_at is null or e.expires_at > now())
      )
    );
$$;

-- Live entitlement to a COURSE: platform admin OR course manager OR an ACTIVE
-- course enrollment currently inside its start/expiry window.
create or replace function public.has_learning_course_access(
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
    and (
      public.is_platform_admin(p_user_id)
      or public.can_manage_learning_course(p_course_id, p_user_id)
      or exists (
        select 1
        from public.learning_enrollments e
        where e.course_id = p_course_id
          and e.user_id = p_user_id
          and e.status = 'active'
          and (e.starts_at is null or e.starts_at <= now())
          and (e.expires_at is null or e.expires_at > now())
      )
    );
$$;

-- Self-enroll eligibility for a PROGRAM: program published, space active,
-- allow_self_enroll enabled; require_space_membership is an enroll-time
-- precondition (revalidated live), NOT an ongoing coupling.
create or replace function public.can_enroll_in_learning_program(
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
    and exists (
      select 1
      from public.learning_programs p
      join public.learning_spaces s
        on s.id = p.space_id
      join public.learning_program_settings ps
        on ps.program_id = p.id
      where p.id = p_program_id
        and p.status = 'published'
        and s.status = 'active'
        and ps.allow_self_enroll is true
        and (
          ps.require_space_membership is not true
          or public.is_learning_space_member(p.space_id, p_user_id)
        )
    );
$$;

-- Self-enroll eligibility for a COURSE: course + program published, space active,
-- allow_self_enroll enabled; require_program_enrollment is an enroll-time
-- precondition satisfied by live program access.
create or replace function public.can_enroll_in_learning_course(
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
      join public.learning_programs p
        on p.id = c.program_id
      join public.learning_spaces s
        on s.id = p.space_id
      join public.learning_course_settings cs
        on cs.course_id = c.id
      where c.id = p_course_id
        and c.status = 'published'
        and p.status = 'published'
        and s.status = 'active'
        and cs.allow_self_enroll is true
        and (
          cs.require_program_enrollment is not true
          or public.has_learning_program_access(c.program_id, p_user_id)
        )
    );
$$;

revoke all on function public.can_manage_learning_enrollment(uuid, uuid)
  from public, anon;
grant execute on function public.can_manage_learning_enrollment(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.has_learning_program_access(uuid, uuid)
  from public, anon;
grant execute on function public.has_learning_program_access(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.has_learning_course_access(uuid, uuid)
  from public, anon;
grant execute on function public.has_learning_course_access(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.can_enroll_in_learning_program(uuid, uuid)
  from public, anon;
grant execute on function public.can_enroll_in_learning_program(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.can_enroll_in_learning_course(uuid, uuid)
  from public, anon;
grant execute on function public.can_enroll_in_learning_course(uuid, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) RLS policies (authenticated only — NO anon)
-- ---------------------------------------------------------------------------

drop policy if exists "Learners read own enrollments"
  on public.learning_enrollments;
create policy "Learners read own enrollments"
  on public.learning_enrollments for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Managers read scoped enrollments"
  on public.learning_enrollments;
create policy "Managers read scoped enrollments"
  on public.learning_enrollments for select
  to authenticated
  using (
    (
      target_type = 'program'
      and program_id is not null
      and public.can_manage_learning_program(program_id)
    )
    or (
      target_type = 'course'
      and course_id is not null
      and public.can_manage_learning_course(course_id)
    )
  );

drop policy if exists "Platform admins read all enrollments"
  on public.learning_enrollments;
create policy "Platform admins read all enrollments"
  on public.learning_enrollments for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Learners read own enrollment events"
  on public.learning_enrollment_events;
create policy "Learners read own enrollment events"
  on public.learning_enrollment_events for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_enrollments e
      where e.id = learning_enrollment_events.enrollment_id
        and e.user_id = (select auth.uid())
    )
  );

drop policy if exists "Managers read scoped enrollment events"
  on public.learning_enrollment_events;
create policy "Managers read scoped enrollment events"
  on public.learning_enrollment_events for select
  to authenticated
  using (public.can_manage_learning_enrollment(enrollment_id));

drop policy if exists "Platform admins read all enrollment events"
  on public.learning_enrollment_events;
create policy "Platform admins read all enrollment events"
  on public.learning_enrollment_events for select
  to authenticated
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 6) RPCs
-- ---------------------------------------------------------------------------

-- 6a) Self-enrollment (learner-driven) --------------------------------------

create or replace function public.enroll_in_learning_program(
  p_program_id uuid,
  p_metadata jsonb default '{}'::jsonb
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
  v_enrollment_id uuid;
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_program_id is null then
    raise exception 'program_id is required';
  end if;

  perform public.learning_enrollment_validate_metadata(v_metadata);

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
    raise exception 'Learning space must be active for enrollment';
  end if;

  -- Precondition gate: published program, allow_self_enroll, membership if required.
  if not public.can_enroll_in_learning_program(p_program_id, v_uid) then
    raise exception 'Not eligible to self-enroll in this program';
  end if;

  -- One live enrollment per learner per target (partial unique enforces this too).
  if exists (
    select 1
    from public.learning_enrollments e
    where e.program_id = p_program_id
      and e.user_id = v_uid
      and e.status in ('pending', 'active', 'suspended')
  ) then
    raise exception 'A live enrollment already exists for this program';
  end if;

  insert into public.learning_enrollments (
    space_id,
    target_type,
    program_id,
    user_id,
    status,
    source,
    enrolled_by,
    activated_at,
    metadata
  ) values (
    v_program.space_id,
    'program',
    p_program_id,
    v_uid,
    'active',
    'self_enrollment',
    v_uid,
    now(),
    v_metadata
  )
  returning id into v_enrollment_id;

  perform public.learning_enrollment_event_write(
    v_enrollment_id,
    v_program.space_id,
    v_uid,
    'created',
    null,
    'active',
    jsonb_build_object('source', 'self_enrollment')
  );

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'enrollment.create',
    'learning_enrollment',
    v_enrollment_id::text,
    jsonb_build_object(
      'target_type', 'program',
      'program_id', p_program_id,
      'user_id', v_uid,
      'source', 'self_enrollment',
      'status', 'active'
    )
  );

  return jsonb_build_object(
    'enrollment_id', v_enrollment_id,
    'target_type', 'program',
    'program_id', p_program_id,
    'status', 'active'
  );
end;
$$;

create or replace function public.enroll_in_learning_course(
  p_course_id uuid,
  p_metadata jsonb default '{}'::jsonb
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
  v_enrollment_id uuid;
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_course_id is null then
    raise exception 'course_id is required';
  end if;

  perform public.learning_enrollment_validate_metadata(v_metadata);

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
    raise exception 'Learning space must be active for enrollment';
  end if;

  if not public.can_enroll_in_learning_course(p_course_id, v_uid) then
    raise exception 'Not eligible to self-enroll in this course';
  end if;

  if exists (
    select 1
    from public.learning_enrollments e
    where e.course_id = p_course_id
      and e.user_id = v_uid
      and e.status in ('pending', 'active', 'suspended')
  ) then
    raise exception 'A live enrollment already exists for this course';
  end if;

  insert into public.learning_enrollments (
    space_id,
    target_type,
    course_id,
    user_id,
    status,
    source,
    enrolled_by,
    activated_at,
    metadata
  ) values (
    v_program.space_id,
    'course',
    p_course_id,
    v_uid,
    'active',
    'self_enrollment',
    v_uid,
    now(),
    v_metadata
  )
  returning id into v_enrollment_id;

  perform public.learning_enrollment_event_write(
    v_enrollment_id,
    v_program.space_id,
    v_uid,
    'created',
    null,
    'active',
    jsonb_build_object('source', 'self_enrollment')
  );

  perform public.learning_audit_write(
    v_uid,
    v_program.space_id,
    'enrollment.create',
    'learning_enrollment',
    v_enrollment_id::text,
    jsonb_build_object(
      'target_type', 'course',
      'course_id', p_course_id,
      'user_id', v_uid,
      'source', 'self_enrollment',
      'status', 'active'
    )
  );

  return jsonb_build_object(
    'enrollment_id', v_enrollment_id,
    'target_type', 'course',
    'course_id', p_course_id,
    'status', 'active'
  );
end;
$$;

-- 6b) Manager-assigned enrollment -------------------------------------------

create or replace function public.create_learning_enrollment(
  p_target_type text,
  p_target_id uuid,
  p_user_id uuid,
  p_source text,
  p_status text default 'pending',
  p_source_reference_type text default null,
  p_source_reference_id text default null,
  p_starts_at timestamptz default null,
  p_expires_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_target_type text := btrim(coalesce(p_target_type, ''));
  v_status text := coalesce(nullif(btrim(p_status), ''), 'pending');
  v_source text := btrim(coalesce(p_source, ''));
  v_space_id uuid;
  v_program_id uuid;
  v_course_id uuid;
  v_program public.learning_programs%rowtype;
  v_course public.learning_courses%rowtype;
  v_space_status text;
  v_can_manage boolean;
  v_enrollment_id uuid;
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_ref_type text := nullif(btrim(coalesce(p_source_reference_type, '')), '');
  v_ref_id text := nullif(btrim(coalesce(p_source_reference_id, '')), '');
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_target_type not in ('program', 'course') then
    raise exception 'target_type must be program or course';
  end if;

  if p_target_id is null or p_user_id is null then
    raise exception 'target_id and user_id are required';
  end if;

  if v_status not in ('pending', 'active') then
    raise exception 'create_learning_enrollment status must be pending or active';
  end if;

  -- Managers may assign any allowlisted source EXCEPT self_enrollment
  -- (reserved for the learner-driven enroll_in_* RPCs).
  perform public.learning_enrollment_validate_source(v_source);
  if v_source = 'self_enrollment' then
    raise exception 'self_enrollment is reserved for learner self-enrollment';
  end if;

  perform public.learning_enrollment_validate_metadata(v_metadata);

  if p_starts_at is not null
     and p_expires_at is not null
     and p_expires_at <= p_starts_at
  then
    raise exception 'expires_at must be after starts_at';
  end if;

  if v_ref_type is not null and char_length(v_ref_type) > 80 then
    raise exception 'source_reference_type too long';
  end if;
  if v_ref_id is not null and char_length(v_ref_id) > 128 then
    raise exception 'source_reference_id too long';
  end if;

  if v_target_type = 'program' then
    select * into v_program
    from public.learning_programs
    where id = p_target_id
    for update;

    if not found then
      raise exception 'Learning program not found';
    end if;

    v_space_id := v_program.space_id;
    v_program_id := v_program.id;

    -- Parent gate: program must be draft|published (not suspended/archived).
    if v_program.status is distinct from 'draft'
       and v_program.status is distinct from 'published'
    then
      raise exception 'Program must be draft or published for enrollment';
    end if;

    v_can_manage := public.can_manage_learning_program(v_program_id, v_uid);
  else
    select * into v_course
    from public.learning_courses
    where id = p_target_id
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

    v_space_id := v_program.space_id;
    v_course_id := v_course.id;

    if v_course.status is distinct from 'draft'
       and v_course.status is distinct from 'published'
    then
      raise exception 'Course must be draft or published for enrollment';
    end if;
    if v_program.status is distinct from 'draft'
       and v_program.status is distinct from 'published'
    then
      raise exception 'Parent program must be draft or published for enrollment';
    end if;

    v_can_manage := public.can_manage_learning_course(v_course_id, v_uid);
  end if;

  select status into v_space_status
  from public.learning_spaces
  where id = v_space_id;

  if not found then
    raise exception 'Learning space not found';
  end if;

  if v_space_status is distinct from 'active' then
    raise exception 'Learning space must be active for enrollment';
  end if;

  if not v_can_manage then
    raise exception 'Not allowed to assign enrollments for this target';
  end if;

  -- Learner must exist.
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Learner profile not found';
  end if;

  if exists (
    select 1
    from public.learning_enrollments e
    where e.user_id = p_user_id
      and (
        (v_target_type = 'program' and e.program_id = v_program_id)
        or (v_target_type = 'course' and e.course_id = v_course_id)
      )
      and e.status in ('pending', 'active', 'suspended')
  ) then
    raise exception 'A live enrollment already exists for this learner and target';
  end if;

  insert into public.learning_enrollments (
    space_id,
    target_type,
    program_id,
    course_id,
    user_id,
    status,
    source,
    source_reference_type,
    source_reference_id,
    enrolled_by,
    starts_at,
    expires_at,
    activated_at,
    metadata
  ) values (
    v_space_id,
    v_target_type,
    v_program_id,
    v_course_id,
    p_user_id,
    v_status,
    v_source,
    v_ref_type,
    v_ref_id,
    v_uid,
    p_starts_at,
    p_expires_at,
    case when v_status = 'active' then now() else null end,
    v_metadata
  )
  returning id into v_enrollment_id;

  perform public.learning_enrollment_event_write(
    v_enrollment_id,
    v_space_id,
    v_uid,
    'created',
    null,
    v_status,
    jsonb_build_object('source', v_source)
  );

  perform public.learning_audit_write(
    v_uid,
    v_space_id,
    'enrollment.create',
    'learning_enrollment',
    v_enrollment_id::text,
    jsonb_build_object(
      'target_type', v_target_type,
      'program_id', v_program_id,
      'course_id', v_course_id,
      'user_id', p_user_id,
      'source', v_source,
      'status', v_status
    )
  );

  return jsonb_build_object(
    'enrollment_id', v_enrollment_id,
    'target_type', v_target_type,
    'program_id', v_program_id,
    'course_id', v_course_id,
    'user_id', p_user_id,
    'status', v_status
  );
end;
$$;

-- 6c) Lifecycle transitions --------------------------------------------------

create or replace function public.activate_learning_enrollment(
  p_enrollment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_enrollment public.learning_enrollments%rowtype;
  v_space_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_enrollment
  from public.learning_enrollments
  where id = p_enrollment_id
  for update;

  if not found then
    raise exception 'Enrollment not found';
  end if;

  if not public.can_manage_learning_enrollment(p_enrollment_id, v_uid) then
    raise exception 'Not allowed to manage this enrollment';
  end if;

  select status into v_space_status
  from public.learning_spaces
  where id = v_enrollment.space_id;

  if v_space_status is distinct from 'active' then
    raise exception 'Learning space must be active for enrollment changes';
  end if;

  if v_enrollment.status = 'active' then
    return jsonb_build_object('enrollment_id', p_enrollment_id, 'status', 'active');
  end if;

  if v_enrollment.status is distinct from 'pending' then
    raise exception 'Only pending enrollments can be activated';
  end if;

  update public.learning_enrollments
  set status = 'active',
      activated_at = coalesce(activated_at, now()),
      updated_at = now()
  where id = p_enrollment_id;

  perform public.learning_enrollment_event_write(
    p_enrollment_id,
    v_enrollment.space_id,
    v_uid,
    'activated',
    v_enrollment.status,
    'active'
  );

  perform public.learning_audit_write(
    v_uid,
    v_enrollment.space_id,
    'enrollment.activate',
    'learning_enrollment',
    p_enrollment_id::text,
    jsonb_build_object('from_status', v_enrollment.status, 'to_status', 'active')
  );

  return jsonb_build_object('enrollment_id', p_enrollment_id, 'status', 'active');
end;
$$;

create or replace function public.suspend_learning_enrollment(
  p_enrollment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_enrollment public.learning_enrollments%rowtype;
  v_space_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_enrollment
  from public.learning_enrollments
  where id = p_enrollment_id
  for update;

  if not found then
    raise exception 'Enrollment not found';
  end if;

  if not public.can_manage_learning_enrollment(p_enrollment_id, v_uid) then
    raise exception 'Not allowed to manage this enrollment';
  end if;

  select status into v_space_status
  from public.learning_spaces
  where id = v_enrollment.space_id;

  if v_space_status is distinct from 'active' then
    raise exception 'Learning space must be active for enrollment changes';
  end if;

  if v_enrollment.status not in ('pending', 'active') then
    raise exception 'Only pending or active enrollments can be suspended';
  end if;

  update public.learning_enrollments
  set status = 'suspended',
      suspended_at = now(),
      updated_at = now()
  where id = p_enrollment_id;

  perform public.learning_enrollment_event_write(
    p_enrollment_id,
    v_enrollment.space_id,
    v_uid,
    'suspended',
    v_enrollment.status,
    'suspended'
  );

  perform public.learning_audit_write(
    v_uid,
    v_enrollment.space_id,
    'enrollment.suspend',
    'learning_enrollment',
    p_enrollment_id::text,
    jsonb_build_object('from_status', v_enrollment.status, 'to_status', 'suspended')
  );

  return jsonb_build_object('enrollment_id', p_enrollment_id, 'status', 'suspended');
end;
$$;

create or replace function public.reinstate_learning_enrollment(
  p_enrollment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_enrollment public.learning_enrollments%rowtype;
  v_space_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_enrollment
  from public.learning_enrollments
  where id = p_enrollment_id
  for update;

  if not found then
    raise exception 'Enrollment not found';
  end if;

  if not public.can_manage_learning_enrollment(p_enrollment_id, v_uid) then
    raise exception 'Not allowed to manage this enrollment';
  end if;

  select status into v_space_status
  from public.learning_spaces
  where id = v_enrollment.space_id;

  if v_space_status is distinct from 'active' then
    raise exception 'Learning space must be active for enrollment changes';
  end if;

  if v_enrollment.status is distinct from 'suspended' then
    raise exception 'Only suspended enrollments can be reinstated';
  end if;

  -- Reinstating must not collide with another live enrollment for the target.
  if exists (
    select 1
    from public.learning_enrollments e
    where e.id is distinct from v_enrollment.id
      and e.user_id = v_enrollment.user_id
      and (
        (v_enrollment.target_type = 'program' and e.program_id = v_enrollment.program_id)
        or (v_enrollment.target_type = 'course' and e.course_id = v_enrollment.course_id)
      )
      and e.status in ('pending', 'active', 'suspended')
  ) then
    raise exception 'Another live enrollment already exists for this target';
  end if;

  update public.learning_enrollments
  set status = 'active',
      activated_at = coalesce(activated_at, now()),
      suspended_at = null,
      updated_at = now()
  where id = p_enrollment_id;

  perform public.learning_enrollment_event_write(
    p_enrollment_id,
    v_enrollment.space_id,
    v_uid,
    'reinstated',
    v_enrollment.status,
    'active'
  );

  perform public.learning_audit_write(
    v_uid,
    v_enrollment.space_id,
    'enrollment.reinstate',
    'learning_enrollment',
    p_enrollment_id::text,
    jsonb_build_object('from_status', v_enrollment.status, 'to_status', 'active')
  );

  return jsonb_build_object('enrollment_id', p_enrollment_id, 'status', 'active');
end;
$$;

create or replace function public.cancel_learning_enrollment(
  p_enrollment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_enrollment public.learning_enrollments%rowtype;
  v_is_learner boolean;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_enrollment
  from public.learning_enrollments
  where id = p_enrollment_id
  for update;

  if not found then
    raise exception 'Enrollment not found';
  end if;

  -- Learner may cancel own enrollment; managers may cancel in scope.
  v_is_learner := v_enrollment.user_id = v_uid;
  if not v_is_learner
     and not public.can_manage_learning_enrollment(p_enrollment_id, v_uid)
  then
    raise exception 'Not allowed to cancel this enrollment';
  end if;

  if v_enrollment.status not in ('pending', 'active', 'suspended') then
    raise exception 'Only live enrollments can be cancelled';
  end if;

  update public.learning_enrollments
  set status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  where id = p_enrollment_id;

  perform public.learning_enrollment_event_write(
    p_enrollment_id,
    v_enrollment.space_id,
    v_uid,
    'cancelled',
    v_enrollment.status,
    'cancelled',
    jsonb_build_object('by_learner', v_is_learner)
  );

  perform public.learning_audit_write(
    v_uid,
    v_enrollment.space_id,
    'enrollment.cancel',
    'learning_enrollment',
    p_enrollment_id::text,
    jsonb_build_object(
      'from_status', v_enrollment.status,
      'to_status', 'cancelled',
      'by_learner', v_is_learner
    )
  );

  return jsonb_build_object('enrollment_id', p_enrollment_id, 'status', 'cancelled');
end;
$$;

-- complete is INERT: it records a terminal entitlement state only. It does NOT
-- read or write any progress/attempt/grade/certificate data (none exists).
create or replace function public.complete_learning_enrollment(
  p_enrollment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_enrollment public.learning_enrollments%rowtype;
  v_space_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_enrollment
  from public.learning_enrollments
  where id = p_enrollment_id
  for update;

  if not found then
    raise exception 'Enrollment not found';
  end if;

  if not public.can_manage_learning_enrollment(p_enrollment_id, v_uid) then
    raise exception 'Not allowed to manage this enrollment';
  end if;

  select status into v_space_status
  from public.learning_spaces
  where id = v_enrollment.space_id;

  if v_space_status is distinct from 'active' then
    raise exception 'Learning space must be active for enrollment changes';
  end if;

  if v_enrollment.status is distinct from 'active' then
    raise exception 'Only active enrollments can be completed';
  end if;

  update public.learning_enrollments
  set status = 'completed',
      completed_at = now(),
      updated_at = now()
  where id = p_enrollment_id;

  perform public.learning_enrollment_event_write(
    p_enrollment_id,
    v_enrollment.space_id,
    v_uid,
    'completed',
    v_enrollment.status,
    'completed'
  );

  perform public.learning_audit_write(
    v_uid,
    v_enrollment.space_id,
    'enrollment.complete',
    'learning_enrollment',
    p_enrollment_id::text,
    jsonb_build_object('from_status', v_enrollment.status, 'to_status', 'completed')
  );

  return jsonb_build_object('enrollment_id', p_enrollment_id, 'status', 'completed');
end;
$$;

-- 6d) Platform moderation ----------------------------------------------------

create or replace function public.moderate_learning_enrollment(
  p_enrollment_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_enrollment public.learning_enrollments%rowtype;
  v_to text := btrim(coalesce(p_status, ''));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_platform_admin(v_uid) then
    raise exception 'Platform admin required';
  end if;

  if v_to not in ('active', 'suspended', 'cancelled') then
    raise exception
      'moderate_learning_enrollment status must be active|suspended|cancelled';
  end if;

  select * into v_enrollment
  from public.learning_enrollments
  where id = p_enrollment_id
  for update;

  if not found then
    raise exception 'Enrollment not found';
  end if;

  if v_to = 'active' then
    if v_enrollment.status not in ('pending', 'suspended') then
      raise exception 'Only pending or suspended enrollments can be set active';
    end if;
    -- Guard the live-uniqueness invariant even for platform admins.
    if exists (
      select 1
      from public.learning_enrollments e
      where e.id is distinct from v_enrollment.id
        and e.user_id = v_enrollment.user_id
        and (
          (v_enrollment.target_type = 'program' and e.program_id = v_enrollment.program_id)
          or (v_enrollment.target_type = 'course' and e.course_id = v_enrollment.course_id)
        )
        and e.status in ('pending', 'active', 'suspended')
    ) then
      raise exception 'Another live enrollment already exists for this target';
    end if;
    update public.learning_enrollments
    set status = 'active',
        activated_at = coalesce(activated_at, now()),
        suspended_at = null,
        updated_at = now()
    where id = p_enrollment_id;
  elsif v_to = 'suspended' then
    if v_enrollment.status not in ('pending', 'active') then
      raise exception 'Only pending or active enrollments can be suspended';
    end if;
    update public.learning_enrollments
    set status = 'suspended',
        suspended_at = now(),
        updated_at = now()
    where id = p_enrollment_id;
  else
    if v_enrollment.status not in ('pending', 'active', 'suspended') then
      raise exception 'Only live enrollments can be cancelled';
    end if;
    update public.learning_enrollments
    set status = 'cancelled',
        cancelled_at = now(),
        updated_at = now()
    where id = p_enrollment_id;
  end if;

  perform public.learning_enrollment_event_write(
    p_enrollment_id,
    v_enrollment.space_id,
    v_uid,
    'moderated',
    v_enrollment.status,
    v_to
  );

  perform public.learning_audit_write(
    v_uid,
    v_enrollment.space_id,
    'enrollment.moderation',
    'learning_enrollment',
    p_enrollment_id::text,
    jsonb_build_object('from_status', v_enrollment.status, 'to_status', v_to)
  );

  return jsonb_build_object('enrollment_id', p_enrollment_id, 'status', v_to);
end;
$$;

-- 6e) Maintenance: expire due enrollments ------------------------------------
-- Platform-admin (or service_role) maintenance sweep. Marks active/pending
-- enrollments whose expires_at has passed as 'expired' and logs one event each.
create or replace function public.expire_due_learning_enrollments(
  p_limit integer default 1000
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 1000), 1), 10000);
  v_row public.learning_enrollments%rowtype;
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_platform_admin(v_uid) then
    raise exception 'Platform admin required';
  end if;

  for v_row in
    select *
    from public.learning_enrollments
    where status in ('pending', 'active')
      and expires_at is not null
      and expires_at <= now()
    order by expires_at asc
    limit v_limit
    for update skip locked
  loop
    update public.learning_enrollments
    set status = 'expired',
        expired_at = now(),
        updated_at = now()
    where id = v_row.id;

    perform public.learning_enrollment_event_write(
      v_row.id,
      v_row.space_id,
      v_uid,
      'expired',
      v_row.status,
      'expired'
    );

    perform public.learning_audit_write(
      v_uid,
      v_row.space_id,
      'enrollment.expire',
      'learning_enrollment',
      v_row.id::text,
      jsonb_build_object('from_status', v_row.status, 'to_status', 'expired')
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('expired', v_count);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) RPC grants (revoke public/anon; grant authenticated + service_role)
-- ---------------------------------------------------------------------------

revoke all on function public.enroll_in_learning_program(uuid, jsonb)
  from public, anon;
grant execute on function public.enroll_in_learning_program(uuid, jsonb)
  to authenticated, service_role;

revoke all on function public.enroll_in_learning_course(uuid, jsonb)
  from public, anon;
grant execute on function public.enroll_in_learning_course(uuid, jsonb)
  to authenticated, service_role;

revoke all on function public.create_learning_enrollment(
  text, uuid, uuid, text, text, text, text, timestamptz, timestamptz, jsonb
) from public, anon;
grant execute on function public.create_learning_enrollment(
  text, uuid, uuid, text, text, text, text, timestamptz, timestamptz, jsonb
) to authenticated, service_role;

revoke all on function public.activate_learning_enrollment(uuid)
  from public, anon;
grant execute on function public.activate_learning_enrollment(uuid)
  to authenticated, service_role;

revoke all on function public.suspend_learning_enrollment(uuid)
  from public, anon;
grant execute on function public.suspend_learning_enrollment(uuid)
  to authenticated, service_role;

revoke all on function public.reinstate_learning_enrollment(uuid)
  from public, anon;
grant execute on function public.reinstate_learning_enrollment(uuid)
  to authenticated, service_role;

revoke all on function public.cancel_learning_enrollment(uuid)
  from public, anon;
grant execute on function public.cancel_learning_enrollment(uuid)
  to authenticated, service_role;

revoke all on function public.complete_learning_enrollment(uuid)
  from public, anon;
grant execute on function public.complete_learning_enrollment(uuid)
  to authenticated, service_role;

revoke all on function public.moderate_learning_enrollment(uuid, text)
  from public, anon;
grant execute on function public.moderate_learning_enrollment(uuid, text)
  to authenticated, service_role;

revoke all on function public.expire_due_learning_enrollments(integer)
  from public, anon;
grant execute on function public.expire_due_learning_enrollments(integer)
  to authenticated, service_role;
