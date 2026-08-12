-- =============================================================================
-- UM Learning OS — Learning Certification Persistence V1
-- Migration: 20260921_learning_certification_persistence_v1.sql
--
-- Allocation: WAVE8 ALLOCATE_NEXT + WAVE11 PACKET_READY
-- Packet: docs/learning/CERTIFICATION_MIGRATION_EXECUTION_PACKET_V1.md
-- Contract: lib/learning/certificationPersistenceMigrationReadiness.ts
--
-- Purpose:
--   Close the certification persistence contract on top of the existing
--   learning_certificates foundation (20260855). Adds revocation state,
--   opaque verification token, append-only events, and issue/verify/revoke RPCs.
--
-- Depends on (already applied remotely / Learning tip):
--   20260830 learning_courses, 20260834 enrollments, 20260835/45 progress,
--   20260855 learning_completion_foundation_v1 (learning_certificates),
--   20260856 instructor helpers (learner label).
--
-- Equivalent objects (pre-exist — DO NOT recreate/drop):
--   public.learning_certificates (table + RLS + unique(user_id, course_id))
--   public.learning_completion_try_finalize_course / finalize_my_learning_course_completion
--
-- Destructive ops: NONE (additive columns/constraints/RPCs/events only).
-- Data loss risk: NO (0 certificate rows at apply time expected; no DELETE/TRUNCATE).
-- Auth lockout risk: NO (no auth schema / session changes).
--
-- Rollback (manual, forward-only preferred):
--   1) DROP FUNCTION issue_certificate, verify_certificate, revoke_certificate,
--      learning_certificate_event_append, learning_certificates_audit_trigger_fn
--   2) DROP TRIGGER learning_certificates_audit_trg
--   3) DROP TABLE learning_certificate_events
--   4) DROP columns verification_token, revoked_at, revoked_by, revoke_reason,
--      idempotency_key
--   5) Restore status check to ('issued') only
--   6) DELETE schema_migrations WHERE version='20260921'
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Extend learning_certificates (additive; keep user_id as learner binding)
-- ---------------------------------------------------------------------------

alter table public.learning_certificates
  drop constraint if exists learning_certificates_status_check;

alter table public.learning_certificates
  add constraint learning_certificates_status_check check (
    status in ('issued', 'revoked')
  );

alter table public.learning_certificates
  add column if not exists verification_token text;

alter table public.learning_certificates
  add column if not exists revoked_at timestamptz;

alter table public.learning_certificates
  add column if not exists revoked_by uuid
    references public.profiles (id) on delete set null;

alter table public.learning_certificates
  add column if not exists revoke_reason text;

alter table public.learning_certificates
  add column if not exists idempotency_key text;

-- Backfill opaque verification tokens for any pre-existing rows.
update public.learning_certificates
set verification_token = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 32))
where verification_token is null;

alter table public.learning_certificates
  alter column verification_token set not null;

alter table public.learning_certificates
  alter column verification_token set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 32));

create unique index if not exists learning_certificates_verification_token_uidx
  on public.learning_certificates (verification_token);

create unique index if not exists learning_certificates_idempotency_key_uidx
  on public.learning_certificates (idempotency_key)
  where idempotency_key is not null;

comment on column public.learning_certificates.verification_token is
  'Learning Certification Persistence V1 — opaque public verification identity (not learner internal id).';
comment on column public.learning_certificates.idempotency_key is
  'Learning Certification Persistence V1 — optional durable issue idempotency key.';

-- Keep client write surface closed (select-only for authenticated; no direct inserts).
revoke insert, update, delete on table public.learning_certificates
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Append-only certificate events
-- ---------------------------------------------------------------------------

create table if not exists public.learning_certificate_events (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null
    references public.learning_certificates (id) on delete restrict,
  space_id uuid not null
    references public.learning_spaces (id) on delete restrict,
  course_id uuid not null
    references public.learning_courses (id) on delete restrict,
  learner_id uuid not null
    references public.profiles (id) on delete restrict,
  actor_user_id uuid
    references public.profiles (id) on delete set null,
  event_type text not null
    constraint learning_certificate_events_type_check check (
      event_type in ('issued', 'verified_lookup', 'revoked', 'already_issued')
    ),
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.learning_certificate_events is
  'Learning Certification Persistence V1 — append-only certificate audit events. No client writes.';

create index if not exists learning_certificate_events_cert_created_idx
  on public.learning_certificate_events (certificate_id, created_at desc);

create index if not exists learning_certificate_events_learner_course_idx
  on public.learning_certificate_events (learner_id, course_id, created_at desc);

alter table public.learning_certificate_events enable row level security;
alter table public.learning_certificate_events force row level security;

revoke all on table public.learning_certificate_events
  from public, anon, authenticated;
grant select on table public.learning_certificate_events to authenticated;
grant all on table public.learning_certificate_events to service_role;

drop policy if exists "Learners read own certificate events"
  on public.learning_certificate_events;
create policy "Learners read own certificate events"
  on public.learning_certificate_events for select
  to authenticated
  using (learner_id = (select auth.uid()));

drop policy if exists "Managers read scoped certificate events"
  on public.learning_certificate_events;
create policy "Managers read scoped certificate events"
  on public.learning_certificate_events for select
  to authenticated
  using (public.can_manage_learning_course(course_id));

drop policy if exists "Platform admins read all certificate events"
  on public.learning_certificate_events;
create policy "Platform admins read all certificate events"
  on public.learning_certificate_events for select
  to authenticated
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 3) Internal helpers
-- ---------------------------------------------------------------------------

create or replace function public.learning_certificate_event_append(
  p_certificate_id uuid,
  p_space_id uuid,
  p_course_id uuid,
  p_learner_id uuid,
  p_actor_user_id uuid,
  p_event_type text,
  p_idempotency_key text default null,
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
  if p_event_type not in ('issued', 'verified_lookup', 'revoked', 'already_issued') then
    raise exception 'Unsupported certificate event type';
  end if;

  insert into public.learning_certificate_events (
    certificate_id,
    space_id,
    course_id,
    learner_id,
    actor_user_id,
    event_type,
    idempotency_key,
    metadata
  ) values (
    p_certificate_id,
    p_space_id,
    p_course_id,
    p_learner_id,
    p_actor_user_id,
    p_event_type,
    nullif(btrim(coalesce(p_idempotency_key, '')), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.learning_certificate_event_append(
  uuid, uuid, uuid, uuid, uuid, text, text, jsonb
) from public, anon, authenticated;

create or replace function public.learning_certificates_audit_trigger_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.learning_certificate_event_append(
      new.id,
      new.space_id,
      new.course_id,
      new.user_id,
      new.issued_by,
      'issued',
      new.idempotency_key,
      jsonb_build_object(
        'source', 'learning_certificates_insert',
        'certificate_code', new.certificate_code,
        'status', new.status
      )
    );
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.status is distinct from new.status
     and new.status = 'revoked' then
    perform public.learning_certificate_event_append(
      new.id,
      new.space_id,
      new.course_id,
      new.user_id,
      new.revoked_by,
      'revoked',
      new.idempotency_key,
      jsonb_build_object(
        'source', 'learning_certificates_update',
        'revoke_reason', new.revoke_reason,
        'prior_status', old.status
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists learning_certificates_audit_trg
  on public.learning_certificates;
create trigger learning_certificates_audit_trg
  after insert or update on public.learning_certificates
  for each row
  execute function public.learning_certificates_audit_trigger_fn();

-- ---------------------------------------------------------------------------
-- 4) issue_certificate — instructor/admin/service after ELIGIBLE; no learner mint
-- ---------------------------------------------------------------------------

create or replace function public.issue_certificate(
  p_learner_id uuid,
  p_course_id uuid,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := coalesce(auth.jwt() ->> 'role', '');
  v_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_course public.learning_courses%rowtype;
  v_space_id uuid;
  v_prog public.learning_course_progress%rowtype;
  v_cert public.learning_certificates%rowtype;
  v_result public.learning_attempt_results%rowtype;
  v_code text;
  v_now timestamptz := now();
  v_authorized boolean := false;
begin
  if p_learner_id is null then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_LEARNER');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_COURSE');
  end if;

  if v_role = 'service_role' then
    v_authorized := true;
  elsif v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'UNAUTHORIZED');
  elsif public.is_platform_admin() then
    v_authorized := true;
  elsif public.can_manage_learning_course(p_course_id) then
    v_authorized := true;
  else
    -- Learners cannot mint certificates (packet auth boundary).
    return jsonb_build_object('ok', false, 'reason', 'UNAUTHORIZED');
  end if;

  if not v_authorized then
    return jsonb_build_object('ok', false, 'reason', 'UNAUTHORIZED');
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_learner_id) then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_LEARNER');
  end if;

  select * into v_course
  from public.learning_courses
  where id = p_course_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_COURSE');
  end if;

  select p.space_id into v_space_id
  from public.learning_programs p
  where p.id = v_course.program_id;

  if v_space_id is null then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_COURSE');
  end if;

  -- Idempotency key hit (deterministic return).
  if v_key is not null then
    select * into v_cert
    from public.learning_certificates
    where idempotency_key = v_key
    limit 1;

    if found then
      perform public.learning_certificate_event_append(
        v_cert.id,
        v_cert.space_id,
        v_cert.course_id,
        v_cert.user_id,
        v_uid,
        'already_issued',
        v_key,
        jsonb_build_object('source', 'idempotency_key')
      );
      return jsonb_build_object(
        'ok', true,
        'status', 'idempotent',
        'reason', 'ALREADY_ISSUED',
        'certificate_id', v_cert.id,
        'verification_token', v_cert.verification_token,
        'issued_at', v_cert.issued_at,
        'certificate_status', v_cert.status
      );
    end if;
  end if;

  -- One row per (learner, course) via existing unique constraint.
  select * into v_cert
  from public.learning_certificates
  where user_id = p_learner_id
    and course_id = p_course_id;

  if found then
    perform public.learning_certificate_event_append(
      v_cert.id,
      v_cert.space_id,
      v_cert.course_id,
      v_cert.user_id,
      v_uid,
      'already_issued',
      v_key,
      jsonb_build_object('source', 'learner_course_unique', 'status', v_cert.status)
    );
    return jsonb_build_object(
      'ok', false,
      'reason', 'ALREADY_ISSUED',
      'certificate_id', v_cert.id,
      'verification_token', v_cert.verification_token,
      'certificate_status', v_cert.status,
      'issued_at', v_cert.issued_at
    );
  end if;

  -- Eligibility gate remains separate from issuance product UX, but RPC fails closed.
  select * into v_prog
  from public.learning_course_progress
  where course_id = p_course_id
    and user_id = p_learner_id;

  if not found or v_prog.status is distinct from 'completed' then
    return jsonb_build_object('ok', false, 'reason', 'NOT_ELIGIBLE');
  end if;

  if not public.learning_completion_assessment_gate_ok(p_course_id, p_learner_id) then
    return jsonb_build_object('ok', false, 'reason', 'NOT_ELIGIBLE');
  end if;

  if not public.has_learning_course_access(p_course_id, p_learner_id) then
    return jsonb_build_object('ok', false, 'reason', 'NOT_ELIGIBLE');
  end if;

  v_result := public.learning_completion_best_passed_attempt(p_course_id, p_learner_id);
  v_code := public.learning_completion_generate_certificate_code(
    p_course_id,
    p_learner_id
  );

  begin
    insert into public.learning_certificates (
      space_id,
      course_id,
      user_id,
      attempt_id,
      certificate_code,
      status,
      final_score,
      final_points_earned,
      final_points_possible,
      issued_at,
      issued_by,
      idempotency_key
    ) values (
      v_space_id,
      p_course_id,
      p_learner_id,
      v_result.attempt_id,
      v_code,
      'issued',
      v_result.final_percentage,
      v_result.score_earned,
      v_result.score_max,
      v_now,
      coalesce(v_uid, p_learner_id),
      v_key
    )
    returning * into v_cert;
  exception
    when unique_violation then
      select * into v_cert
      from public.learning_certificates
      where user_id = p_learner_id
        and course_id = p_course_id;
      return jsonb_build_object(
        'ok', false,
        'reason', 'ALREADY_ISSUED',
        'certificate_id', v_cert.id,
        'verification_token', v_cert.verification_token,
        'certificate_status', v_cert.status,
        'issued_at', v_cert.issued_at
      );
  end;

  return jsonb_build_object(
    'ok', true,
    'status', 'issued',
    'certificate_id', v_cert.id,
    'verification_token', v_cert.verification_token,
    'certificate_code', v_cert.certificate_code,
    'issued_at', v_cert.issued_at,
    'certificate_status', v_cert.status
  );
end;
$$;

comment on function public.issue_certificate(uuid, uuid, text) is
  'Learning Certification Persistence V1 — authorized issue after ELIGIBLE; learners cannot mint; idempotency_key optional.';

revoke all on function public.issue_certificate(uuid, uuid, text)
  from public, anon;
grant execute on function public.issue_certificate(uuid, uuid, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) verify_certificate — public-safe read model (fail closed)
-- ---------------------------------------------------------------------------

create or replace function public.verify_certificate(
  p_certificate_id uuid default null,
  p_verification_token text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_token text := nullif(btrim(coalesce(p_verification_token, '')), '');
  v_cert public.learning_certificates%rowtype;
  v_learner_display text;
  v_course_display text;
begin
  if p_certificate_id is null and v_token is null then
    return jsonb_build_object(
      'ok', false,
      'verification_status', 'INVALID',
      'reason', 'INVALID_CERTIFICATE',
      'certificate_id', null,
      'learner_display', null,
      'course_display', null,
      'issued_at', null,
      'revocation_status', 'UNKNOWN',
      'private_exposed', false
    );
  end if;

  if p_certificate_id is not null then
    select * into v_cert
    from public.learning_certificates
    where id = p_certificate_id;
  else
    select * into v_cert
    from public.learning_certificates
    where verification_token = v_token;
  end if;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'verification_status', 'UNKNOWN',
      'reason', 'UNKNOWN_CERTIFICATE',
      'certificate_id', p_certificate_id,
      'learner_display', null,
      'course_display', null,
      'issued_at', null,
      'revocation_status', 'UNKNOWN',
      'private_exposed', false
    );
  end if;

  v_learner_display := public.learning_instructor_learner_label(v_cert.user_id);
  select c.name into v_course_display
  from public.learning_courses c
  where c.id = v_cert.course_id;

  if v_cert.status = 'revoked' then
    return jsonb_build_object(
      'ok', false,
      'verification_status', 'REVOKED',
      'reason', 'REVOKED_CERTIFICATE',
      'certificate_id', v_cert.id,
      'learner_display', v_learner_display,
      'course_display', v_course_display,
      'issued_at', v_cert.issued_at,
      'revocation_status', 'REVOKED',
      'private_exposed', false
    );
  end if;

  if v_cert.status is distinct from 'issued' then
    return jsonb_build_object(
      'ok', false,
      'verification_status', 'INVALID',
      'reason', 'INVALID_CERTIFICATE',
      'certificate_id', v_cert.id,
      'learner_display', null,
      'course_display', null,
      'issued_at', null,
      'revocation_status', 'UNKNOWN',
      'private_exposed', false
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'verification_status', 'VALID',
    'certificate_id', v_cert.id,
    'learner_display', v_learner_display,
    'course_display', v_course_display,
    'issued_at', v_cert.issued_at,
    'revocation_status', 'NONE',
    'private_exposed', false
  );
end;
$$;

comment on function public.verify_certificate(uuid, text) is
  'Learning Certification Persistence V1 — public-safe verification; never exposes private learner internals.';

revoke all on function public.verify_certificate(uuid, text)
  from public;
grant execute on function public.verify_certificate(uuid, text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) revoke_certificate — admin/instructor/service only
-- ---------------------------------------------------------------------------

create or replace function public.revoke_certificate(
  p_certificate_id uuid,
  p_revoke_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := coalesce(auth.jwt() ->> 'role', '');
  v_cert public.learning_certificates%rowtype;
  v_reason text := nullif(btrim(coalesce(p_revoke_reason, '')), '');
begin
  if p_certificate_id is null then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_CERTIFICATE');
  end if;

  select * into v_cert
  from public.learning_certificates
  where id = p_certificate_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'UNKNOWN_CERTIFICATE');
  end if;

  if v_role is distinct from 'service_role' then
    if v_uid is null then
      return jsonb_build_object('ok', false, 'reason', 'UNAUTHORIZED');
    end if;
    if not (
      public.is_platform_admin()
      or public.can_manage_learning_course(v_cert.course_id)
    ) then
      return jsonb_build_object('ok', false, 'reason', 'UNAUTHORIZED');
    end if;
  end if;

  if v_cert.status = 'revoked' then
    return jsonb_build_object(
      'ok', true,
      'status', 'idempotent',
      'certificate_id', v_cert.id,
      'certificate_status', 'revoked',
      'revoked_at', v_cert.revoked_at
    );
  end if;

  update public.learning_certificates
  set status = 'revoked',
      revoked_at = now(),
      revoked_by = v_uid,
      revoke_reason = v_reason
  where id = v_cert.id
  returning * into v_cert;

  return jsonb_build_object(
    'ok', true,
    'status', 'revoked',
    'certificate_id', v_cert.id,
    'certificate_status', v_cert.status,
    'revoked_at', v_cert.revoked_at
  );
end;
$$;

comment on function public.revoke_certificate(uuid, text) is
  'Learning Certification Persistence V1 — admin/instructor/service revoke; revoked never verifies VALID.';

revoke all on function public.revoke_certificate(uuid, text)
  from public, anon;
grant execute on function public.revoke_certificate(uuid, text)
  to authenticated, service_role;
