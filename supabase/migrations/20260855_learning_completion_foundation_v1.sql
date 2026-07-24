-- =============================================================================
-- UM Learning OS — Learning Completion Foundation V1
-- Migration: 20260855_learning_completion_foundation_v1.sql
--
-- Cohesive slice:
--   1) Certificates (metadata only; no PDF)
--   2) Transcript read model
--   3) Completion events (extend learning_progress_events)
--   4) In-platform completion notifications (extend notifications types)
--
-- Depends on: progress (20260835/45), assessment progress (20260854),
--             notifications (20260722), activities settings.
--
-- Does NOT: badges, rewards, analytics, AI, email/push, PDF, exports.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) Extend progress event types for completion
-- ---------------------------------------------------------------------------

alter table public.learning_progress_events
  drop constraint if exists learning_progress_events_type_check;

alter table public.learning_progress_events
  add constraint learning_progress_events_type_check check (
    event_type in (
      'lesson_started',
      'lesson_resumed',
      'lesson_completed',
      'lesson_reopened',
      'lesson_touched',
      'course_rollup_updated',
      'course_completed',
      'certificate_issued'
    )
  );

-- Idempotent completion events: one per (user, course, event_type).
create unique index if not exists learning_progress_events_completion_dedupe_idx
  on public.learning_progress_events (user_id, course_id, event_type)
  where event_type in ('course_completed', 'certificate_issued')
    and course_id is not null;

-- ---------------------------------------------------------------------------
-- 1) Certificates table (authoritative metadata only)
-- ---------------------------------------------------------------------------

create table if not exists public.learning_certificates (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null
    references public.learning_spaces (id) on delete restrict,
  course_id uuid not null
    references public.learning_courses (id) on delete restrict,
  user_id uuid not null
    references public.profiles (id) on delete restrict,
  -- Qualifying graded attempt when assessment was required; null if none.
  attempt_id uuid
    references public.learning_attempts (id) on delete set null,
  certificate_code text not null
    constraint learning_certificates_code_format check (
      certificate_code ~ '^[A-Z0-9-]{8,64}$'
    ),
  status text not null default 'issued'
    constraint learning_certificates_status_check check (
      status in ('issued')
    ),
  final_score numeric
    constraint learning_certificates_final_score_range check (
      final_score is null
      or (final_score >= 0 and final_score <= 100)
    ),
  final_points_earned numeric
    constraint learning_certificates_points_earned_nonneg check (
      final_points_earned is null or final_points_earned >= 0
    ),
  final_points_possible numeric
    constraint learning_certificates_points_possible_nonneg check (
      final_points_possible is null or final_points_possible >= 0
    ),
  issued_at timestamptz not null default now(),
  issued_by uuid
    references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint learning_certificates_user_course_unique unique (user_id, course_id),
  constraint learning_certificates_code_unique unique (certificate_code)
);

comment on table public.learning_certificates is
  'Learning Completion Foundation V1 — authoritative certificate metadata only. No PDF/assets. Issued once per learner+course when course progress is completed and assessment gates pass.';

create index if not exists learning_certificates_user_issued_idx
  on public.learning_certificates (user_id, issued_at desc);

create index if not exists learning_certificates_course_idx
  on public.learning_certificates (course_id);

alter table public.learning_certificates enable row level security;
alter table public.learning_certificates force row level security;

revoke all on table public.learning_certificates
  from public, anon, authenticated;
grant select on table public.learning_certificates to authenticated;
revoke insert, update, delete on table public.learning_certificates
  from anon, authenticated;
grant all on table public.learning_certificates to service_role;

drop policy if exists "Learners read own certificates"
  on public.learning_certificates;
create policy "Learners read own certificates"
  on public.learning_certificates for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Managers read scoped certificates"
  on public.learning_certificates;
create policy "Managers read scoped certificates"
  on public.learning_certificates for select
  to authenticated
  using (public.can_manage_learning_course(course_id));

drop policy if exists "Platform admins read all certificates"
  on public.learning_certificates;
create policy "Platform admins read all certificates"
  on public.learning_certificates for select
  to authenticated
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 2) Notification type: learning_course_completed
-- ---------------------------------------------------------------------------

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'follow',
      'post_like',
      'comment',
      'reply',
      'mention',
      'live_started',
      'direct_message',
      'post_reached_country',
      'post_trending_country',
      'post_milestone',
      'post_journey_summary',
      'um_points_earned',
      'reward_milestone',
      'nearby_live_started',
      'ai_creator_insight',
      'post_save',
      'post_share',
      'referral_reward',
      'learning_course_completed'
    )
  );

-- ---------------------------------------------------------------------------
-- 3) Internal helpers
-- ---------------------------------------------------------------------------

create or replace function public.learning_completion_generate_certificate_code(
  p_course_id uuid,
  p_user_id uuid
)
returns text
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  return upper(
    'LC-'
    || substr(replace(p_course_id::text, '-', ''), 1, 8)
    || '-'
    || substr(replace(p_user_id::text, '-', ''), 1, 8)
  );
end;
$$;

revoke all on function public.learning_completion_generate_certificate_code(uuid, uuid)
  from public, anon, authenticated;

-- Write completion event once (unique index enforces idempotency).
create or replace function public.learning_completion_event_write_once(
  p_space_id uuid,
  p_course_id uuid,
  p_user_id uuid,
  p_actor_user_id uuid,
  p_event_type text,
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
  if p_event_type not in ('course_completed', 'certificate_issued') then
    raise exception 'Unsupported completion event type';
  end if;

  select e.id into v_id
  from public.learning_progress_events e
  where e.user_id = p_user_id
    and e.course_id = p_course_id
    and e.event_type = p_event_type
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  begin
    insert into public.learning_progress_events (
      space_id,
      course_id,
      lesson_id,
      user_id,
      actor_user_id,
      event_type,
      from_status,
      to_status,
      metadata
    ) values (
      p_space_id,
      p_course_id,
      null,
      p_user_id,
      p_actor_user_id,
      p_event_type,
      case when p_event_type = 'course_completed' then 'in_progress' else null end,
      case when p_event_type = 'course_completed' then 'completed' else null end,
      coalesce(p_metadata, '{}'::jsonb)
    )
    returning id into v_id;
  exception
    when unique_violation then
      select e.id into v_id
      from public.learning_progress_events e
      where e.user_id = p_user_id
        and e.course_id = p_course_id
        and e.event_type = p_event_type
      limit 1;
  end;

  return v_id;
end;
$$;

revoke all on function public.learning_completion_event_write_once(
  uuid, uuid, uuid, uuid, text, jsonb
) from public, anon, authenticated;

-- Assessment gate: every score-mode activity in the course must have a
-- progress application for this learner (implies graded+passed apply path).
create or replace function public.learning_completion_assessment_gate_ok(
  p_course_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_score_activity uuid;
  v_missing integer := 0;
begin
  for v_score_activity in
    select a.id
    from public.learning_activities a
    join public.learning_activity_settings s
      on s.activity_id = a.id
    join public.learning_lessons l
      on l.id = a.lesson_id
    join public.learning_sections sec
      on sec.id = l.section_id
    where sec.course_id = p_course_id
      and a.status = 'published'
      and s.completion_mode = 'score'
  loop
    if not exists (
      select 1
      from public.learning_attempt_progress_applications app
      where app.user_id = p_user_id
        and app.activity_id = v_score_activity
    ) then
      v_missing := v_missing + 1;
    end if;
  end loop;

  return v_missing = 0;
end;
$$;

revoke all on function public.learning_completion_assessment_gate_ok(uuid, uuid)
  from public, anon, authenticated;

-- Pick best qualifying graded+passed attempt for score snapshot (optional).
create or replace function public.learning_completion_best_passed_attempt(
  p_course_id uuid,
  p_user_id uuid
)
returns public.learning_attempt_results
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.learning_attempt_results%rowtype;
begin
  select r.* into v_row
  from public.learning_attempt_results r
  join public.learning_attempts a
    on a.id = r.attempt_id
  where a.course_id = p_course_id
    and a.user_id = p_user_id
    and a.status = 'submitted'
    and r.status = 'graded'
    and r.passed is true
  order by coalesce(r.final_percentage, 0) desc, r.scored_at desc
  limit 1;

  return v_row;
end;
$$;

revoke all on function public.learning_completion_best_passed_attempt(uuid, uuid)
  from public, anon, authenticated;

-- Core finalize: events + certificate + notification (idempotent).
create or replace function public.learning_completion_try_finalize_course(
  p_course_id uuid,
  p_user_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course public.learning_courses%rowtype;
  v_space_id uuid;
  v_prog public.learning_course_progress%rowtype;
  v_cert public.learning_certificates%rowtype;
  v_result public.learning_attempt_results%rowtype;
  v_code text;
  v_event_id uuid;
  v_cert_event_id uuid;
  v_notif uuid;
  v_now timestamptz := now();
  v_created boolean := false;
begin
  if p_course_id is null or p_user_id is null or p_actor_id is null then
    raise exception 'course_id, user_id, and actor_id are required';
  end if;

  select * into v_course
  from public.learning_courses
  where id = p_course_id;

  if not found then
    raise exception 'Learning course not found';
  end if;

  select p.space_id into v_space_id
  from public.learning_programs p
  where p.id = v_course.program_id;

  if v_space_id is null then
    raise exception 'Learning course relationship is malformed';
  end if;

  select * into v_prog
  from public.learning_course_progress
  where course_id = p_course_id
    and user_id = p_user_id
  for update;

  if not found or v_prog.status is distinct from 'completed' then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'course_progress_not_completed',
      'certificate_issued', false,
      'completion_event', false,
      'notification_sent', false
    );
  end if;

  if not public.learning_completion_assessment_gate_ok(p_course_id, p_user_id) then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'assessment_requirements_unmet',
      'certificate_issued', false,
      'completion_event', false,
      'notification_sent', false
    );
  end if;

  -- Completion event (idempotent).
  v_event_id := public.learning_completion_event_write_once(
    v_space_id,
    p_course_id,
    p_user_id,
    p_actor_id,
    'course_completed',
    jsonb_build_object(
      'course_id', p_course_id,
      'completed_at', v_prog.completed_at
    )
  );

  -- Existing certificate?
  select * into v_cert
  from public.learning_certificates
  where user_id = p_user_id
    and course_id = p_course_id;

  if found then
    return jsonb_build_object(
      'status', 'idempotent',
      'reason', null,
      'certificate_id', v_cert.id,
      'certificate_code', v_cert.certificate_code,
      'certificate_issued', true,
      'completion_event', v_event_id is not null,
      'notification_sent', false,
      'issued_at', v_cert.issued_at
    );
  end if;

  v_result := public.learning_completion_best_passed_attempt(p_course_id, p_user_id);
  v_code := public.learning_completion_generate_certificate_code(
    p_course_id,
    p_user_id
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
      issued_by
    ) values (
      v_space_id,
      p_course_id,
      p_user_id,
      v_result.attempt_id,
      v_code,
      'issued',
      v_result.final_percentage,
      v_result.score_earned,
      v_result.score_max,
      v_now,
      p_actor_id
    )
    returning * into v_cert;
    v_created := true;
  exception
    when unique_violation then
      select * into v_cert
      from public.learning_certificates
      where user_id = p_user_id
        and course_id = p_course_id;
      return jsonb_build_object(
        'status', 'idempotent',
        'certificate_id', v_cert.id,
        'certificate_code', v_cert.certificate_code,
        'certificate_issued', true,
        'completion_event', true,
        'notification_sent', false,
        'issued_at', v_cert.issued_at
      );
  end;

  v_cert_event_id := public.learning_completion_event_write_once(
    v_space_id,
    p_course_id,
    p_user_id,
    p_actor_id,
    'certificate_issued',
    jsonb_build_object(
      'certificate_id', v_cert.id,
      'certificate_code', v_cert.certificate_code
    )
  );

  -- In-platform notification only (actor null so self-recipient is allowed).
  v_notif := public.create_notification(
    p_user_id,
    null,
    'learning_course_completed',
    'Course completed',
    'You completed a course and earned a certificate.',
    'learning_course',
    p_course_id::text,
    '/learning/transcript',
    jsonb_build_object(
      'course_id', p_course_id,
      'certificate_id', v_cert.id,
      'certificate_code', v_cert.certificate_code
    ),
    'learning_course_completed:' || p_course_id::text
  );

  perform public.learning_audit_write(
    p_actor_id,
    v_space_id,
    'completion.certificate_issued',
    'learning_certificate',
    v_cert.id::text,
    jsonb_build_object(
      'course_id', p_course_id,
      'user_id', p_user_id,
      'certificate_code', v_cert.certificate_code,
      'created', v_created
    )
  );

  return jsonb_build_object(
    'status', 'applied',
    'certificate_id', v_cert.id,
    'certificate_code', v_cert.certificate_code,
    'certificate_issued', true,
    'completion_event', v_event_id is not null,
    'certificate_event', v_cert_event_id is not null,
    'notification_sent', v_notif is not null,
    'issued_at', v_cert.issued_at
  );
end;
$$;

revoke all on function public.learning_completion_try_finalize_course(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.learning_completion_try_finalize_course(uuid, uuid, uuid)
  to service_role;

comment on function public.learning_completion_try_finalize_course(uuid, uuid, uuid) is
  'Learning Completion Foundation V1 — internal finalize: course_completed event, certificate, in-app notification. Idempotent. Revoked from authenticated.';

-- ---------------------------------------------------------------------------
-- 4) Learner RPCs
-- ---------------------------------------------------------------------------

create or replace function public.finalize_my_learning_course_completion(
  p_course_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_out jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_course_id is null then
    raise exception 'course_id is required';
  end if;

  if not public.has_learning_course_access(p_course_id, v_uid) then
    raise exception 'Not entitled to this course';
  end if;

  v_out := public.learning_completion_try_finalize_course(
    p_course_id,
    v_uid,
    v_uid
  );

  return jsonb_build_object(
    'course_id', p_course_id,
    'status', v_out ->> 'status',
    'reason', v_out ->> 'reason',
    'certificate_id', v_out ->> 'certificate_id',
    'certificate_code', v_out ->> 'certificate_code',
    'certificate_issued', coalesce((v_out ->> 'certificate_issued')::boolean, false),
    'completion_event', coalesce((v_out ->> 'completion_event')::boolean, false),
    'notification_sent', coalesce((v_out ->> 'notification_sent')::boolean, false),
    'issued_at', v_out ->> 'issued_at'
  );
end;
$$;

comment on function public.finalize_my_learning_course_completion(uuid) is
  'Learning Completion Foundation V1 — owner finalize course completion package (event + certificate + notification).';

-- Auto-attempt finalize when course progress first becomes completed.
-- Idempotent / fail-soft when assessment gate is not yet satisfied.
create or replace function public.learning_completion_after_course_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status = 'completed'
     and (
       TG_OP = 'INSERT'
       or OLD.status is distinct from 'completed'
     )
  then
    perform public.learning_completion_try_finalize_course(
      NEW.course_id,
      NEW.user_id,
      NEW.user_id
    );
  end if;
  return NEW;
end;
$$;

revoke all on function public.learning_completion_after_course_progress()
  from public, anon, authenticated;

drop trigger if exists learning_completion_after_course_progress_trg
  on public.learning_course_progress;
create trigger learning_completion_after_course_progress_trg
  after insert or update of status on public.learning_course_progress
  for each row
  execute function public.learning_completion_after_course_progress();

-- Hook assessment progress apply: after applied/idempotent with recorded completion,
-- try course finalize when course rollup is complete (covers gate satisfied later).
create or replace function public.apply_my_learning_assessment_progress(
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
  v_out jsonb;
  v_finalize jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;

  v_attempt := public.learning_attempt_expire_if_due(p_attempt_id);

  if v_attempt.user_id is distinct from v_uid then
    raise exception 'Not allowed to apply progress for this attempt';
  end if;

  v_out := public.learning_progress_try_apply_from_graded_assessment(
    p_attempt_id,
    v_uid
  );

  if coalesce((v_out ->> 'completion_recorded')::boolean, false) then
    v_finalize := public.learning_completion_try_finalize_course(
      v_attempt.course_id,
      v_uid,
      v_uid
    );
  else
    v_finalize := jsonb_build_object(
      'status', 'skipped',
      'reason', 'progress_not_recorded'
    );
  end if;

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'activity_id', v_attempt.activity_id,
    'status', v_out ->> 'status',
    'reason', v_out -> 'reason',
    'completion_recorded', coalesce((v_out ->> 'completion_recorded')::boolean, false),
    'applied_at', v_out -> 'applied_at',
    'lesson_id', v_out -> 'lesson_id',
    'course_completion', v_finalize
  );
end;
$$;

create or replace function public.get_my_learning_transcript()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_entries jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'course_id', c.id,
        'course_name', c.name,
        'course_slug', c.slug,
        'space_id', p.space_id,
        'progress_status', cp.status,
        'percent_complete', cp.percent_complete,
        'completed_at', cp.completed_at,
        'final_score', cert.final_score,
        'final_points_earned', cert.final_points_earned,
        'final_points_possible', cert.final_points_possible,
        'certificate_status', case
          when cert.id is not null then 'issued'
          else 'none'
        end,
        'certificate_code', cert.certificate_code,
        'certificate_issued_at', cert.issued_at
      )
      order by coalesce(cp.completed_at, cp.updated_at) desc nulls last, c.name
    ),
    '[]'::jsonb
  ) into v_entries
  from public.learning_course_progress cp
  join public.learning_courses c
    on c.id = cp.course_id
  join public.learning_programs p
    on p.id = c.program_id
  left join public.learning_certificates cert
    on cert.course_id = cp.course_id
   and cert.user_id = cp.user_id
  where cp.user_id = v_uid
    and cp.status = 'completed';

  return jsonb_build_object(
    'learner_user_id', v_uid,
    'entries', v_entries,
    'entry_count', jsonb_array_length(v_entries)
  );
end;
$$;

comment on function public.get_my_learning_transcript() is
  'Learning Completion Foundation V1 — owner read-only transcript of completed courses, scores, and certificate status.';

create or replace function public.get_my_learning_certificates()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_items jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'certificate_id', cert.id,
        'certificate_code', cert.certificate_code,
        'course_id', cert.course_id,
        'course_name', c.name,
        'status', cert.status,
        'final_score', cert.final_score,
        'issued_at', cert.issued_at
      )
      order by cert.issued_at desc
    ),
    '[]'::jsonb
  ) into v_items
  from public.learning_certificates cert
  join public.learning_courses c
    on c.id = cert.course_id
  where cert.user_id = v_uid;

  return jsonb_build_object(
    'certificates', v_items,
    'certificate_count', jsonb_array_length(v_items)
  );
end;
$$;

revoke all on function public.finalize_my_learning_course_completion(uuid)
  from public, anon;
grant execute on function public.finalize_my_learning_course_completion(uuid)
  to authenticated;
grant execute on function public.finalize_my_learning_course_completion(uuid)
  to service_role;

revoke all on function public.get_my_learning_transcript()
  from public, anon;
grant execute on function public.get_my_learning_transcript()
  to authenticated;
grant execute on function public.get_my_learning_transcript()
  to service_role;

revoke all on function public.get_my_learning_certificates()
  from public, anon;
grant execute on function public.get_my_learning_certificates()
  to authenticated;
grant execute on function public.get_my_learning_certificates()
  to service_role;

-- Re-assert assessment progress grants after REPLACE.
revoke all on function public.apply_my_learning_assessment_progress(uuid)
  from public, anon;
grant execute on function public.apply_my_learning_assessment_progress(uuid)
  to authenticated;
grant execute on function public.apply_my_learning_assessment_progress(uuid)
  to service_role;
