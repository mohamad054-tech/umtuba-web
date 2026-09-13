-- UMTUBA Live Media V2 — multi-guest stage, queue, sessions, interactive foundations
-- Additive / idempotent. Apply manually in Supabase SQL Editor after V1–V3 live migrations.
-- Does NOT drop existing live data.
--
-- Product decisions (M1):
--   - LiveKit Cloud SFU; Supabase is source of truth for roles/stage/queue/moderation.
--   - 1 host + up to 7 additional publishers (max_on_stage default 8, headroom to 16).
--   - Stage full → waiting queue with positions (not hard reject).
--   - Co-host: admit/reject/invite/mute/remove guests; cannot end stream, transfer host, delete room.
--   - Sessions/chapters + polls/quizzes/questions + AI artifact hooks for later features.
--
-- SECURITY DEFINER rules: search_path=public; EXECUTE revoked from PUBLIC;
-- acting identity always from auth.uid().

-- ---------------------------------------------------------------------------
-- 0. Helpers: co-host stage staff (admit/mute/remove — not end-room)
-- ---------------------------------------------------------------------------

create or replace function public.is_live_stage_manager(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_live_room_host(p_room_id)
  or exists (
    select 1
    from public.live_participants p
    where p.room_id = p_room_id
      and p.user_id = (select auth.uid())
      and p.left_at is null
      and p.is_banned = false
      and p.role in ('host', 'co_host')
  );
$$;

revoke all on function public.is_live_stage_manager(uuid) from public;
grant execute on function public.is_live_stage_manager(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 1. live_rooms — capacity + media defaults
-- ---------------------------------------------------------------------------

alter table public.live_rooms
  add column if not exists max_on_stage integer not null default 8;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'live_rooms_max_on_stage_check'
  ) then
    alter table public.live_rooms
      add constraint live_rooms_max_on_stage_check
      check (max_on_stage between 2 and 16);
  end if;
end;
$$;

alter table public.live_rooms
  add column if not exists pinned_participant_id uuid
    references auth.users (id) on delete set null;

alter table public.live_rooms
  add column if not exists stage_layout_mode text not null default 'auto';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'live_rooms_stage_layout_mode_check'
  ) then
    alter table public.live_rooms
      add constraint live_rooms_stage_layout_mode_check
      check (stage_layout_mode in ('auto', 'active_speaker', 'pinned', 'grid'));
  end if;
end;
$$;

alter table public.live_rooms
  add column if not exists auto_admit_from_queue boolean not null default false;

alter table public.live_rooms
  add column if not exists current_session_id uuid;

-- ---------------------------------------------------------------------------
-- 2. live_participants — guest role + stage / publish flags
-- ---------------------------------------------------------------------------

alter table public.live_participants
  drop constraint if exists live_participants_role_check;

alter table public.live_participants
  add constraint live_participants_role_check
  check (role in ('host', 'co_host', 'guest', 'moderator', 'viewer'));

alter table public.live_participants
  add column if not exists stage_status text not null default 'off_stage';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'live_participants_stage_status_check'
  ) then
    alter table public.live_participants
      add constraint live_participants_stage_status_check
      check (
        stage_status in (
          'off_stage',
          'queued',
          'invited',
          'on_stage'
        )
      );
  end if;
end;
$$;

alter table public.live_participants
  add column if not exists can_publish_audio boolean not null default false;

alter table public.live_participants
  add column if not exists can_publish_video boolean not null default false;

alter table public.live_participants
  add column if not exists can_share_screen boolean not null default false;

alter table public.live_participants
  add column if not exists muted_by_host boolean not null default false;

alter table public.live_participants
  add column if not exists camera_disabled_by_host boolean not null default false;

alter table public.live_participants
  add column if not exists stage_joined_at timestamptz;

alter table public.live_participants
  add column if not exists stage_left_at timestamptz;

alter table public.live_participants
  add column if not exists queue_position integer;

create index if not exists live_participants_room_on_stage_idx
  on public.live_participants (room_id, stage_joined_at)
  where left_at is null and stage_status = 'on_stage' and is_banned = false;

create index if not exists live_participants_room_queued_idx
  on public.live_participants (room_id, queue_position)
  where left_at is null and stage_status = 'queued' and is_banned = false;

-- Host rows should be publish-capable when live
update public.live_participants p
set
  stage_status = 'on_stage',
  can_publish_audio = true,
  can_publish_video = true,
  can_share_screen = true,
  stage_joined_at = coalesce(p.stage_joined_at, p.joined_at)
where p.role = 'host'
  and p.left_at is null
  and p.stage_status = 'off_stage';

-- ---------------------------------------------------------------------------
-- 3. Stage requests (viewer → queue / admit)
-- ---------------------------------------------------------------------------

create table if not exists public.live_stage_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.live_rooms (id) on delete cascade,
  requester_id uuid not null
    references auth.users (id) on delete cascade,
  status text not null default 'pending'
    constraint live_stage_requests_status_check
      check (
        status in (
          'pending',
          'queued',
          'accepted',
          'rejected',
          'cancelled',
          'expired'
        )
      ),
  queue_position integer,
  message text
    constraint live_stage_requests_message_length check (
      message is null or char_length(message) <= 280
    ),
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_stage_requests_queue_pos_positive check (
    queue_position is null or queue_position >= 1
  )
);

create unique index if not exists live_stage_requests_one_open_per_user_idx
  on public.live_stage_requests (room_id, requester_id)
  where status in ('pending', 'queued');

create index if not exists live_stage_requests_room_queue_idx
  on public.live_stage_requests (room_id, queue_position nulls last, created_at)
  where status in ('pending', 'queued');

alter table public.live_stage_requests enable row level security;

drop policy if exists "View stage requests in visible rooms"
  on public.live_stage_requests;
create policy "View stage requests in visible rooms"
  on public.live_stage_requests
  for select
  to authenticated
  using (
    public.can_view_live_room(room_id)
    and (
      requester_id = (select auth.uid())
      or public.is_live_stage_manager(room_id)
    )
  );

revoke insert, update, delete on table public.live_stage_requests
  from authenticated, anon;

-- ---------------------------------------------------------------------------
-- 4. Stage invitations (host/co-host → viewer)
-- ---------------------------------------------------------------------------

create table if not exists public.live_stage_invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.live_rooms (id) on delete cascade,
  invitee_id uuid not null
    references auth.users (id) on delete cascade,
  invited_by uuid not null
    references auth.users (id) on delete cascade,
  status text not null default 'pending'
    constraint live_stage_invitations_status_check
      check (
        status in (
          'pending',
          'accepted',
          'declined',
          'revoked',
          'expired'
        )
      ),
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists live_stage_invitations_one_pending_idx
  on public.live_stage_invitations (room_id, invitee_id)
  where status = 'pending';

create index if not exists live_stage_invitations_room_created_idx
  on public.live_stage_invitations (room_id, created_at desc);

alter table public.live_stage_invitations enable row level security;

drop policy if exists "View stage invitations in room"
  on public.live_stage_invitations;
create policy "View stage invitations in room"
  on public.live_stage_invitations
  for select
  to authenticated
  using (
    public.can_view_live_room(room_id)
    and (
      invitee_id = (select auth.uid())
      or invited_by = (select auth.uid())
      or public.is_live_stage_manager(room_id)
    )
  );

revoke insert, update, delete on table public.live_stage_invitations
  from authenticated, anon;

-- ---------------------------------------------------------------------------
-- 5. Live sessions / chapters (AI-ready; host can start without ending stream)
-- ---------------------------------------------------------------------------

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.live_rooms (id) on delete cascade,
  session_index integer not null default 1
    constraint live_sessions_index_positive check (session_index >= 1),
  title text
    constraint live_sessions_title_length check (
      title is null or char_length(btrim(title)) between 1 and 120
    ),
  status text not null default 'active'
    constraint live_sessions_status_check
      check (status in ('active', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  started_by uuid references auth.users (id) on delete set null,
  summary_status text not null default 'none'
    constraint live_sessions_summary_status_check
      check (
        summary_status in (
          'none',
          'pending',
          'processing',
          'ready',
          'failed'
        )
      ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint live_sessions_ended_has_ended_at check (
    status <> 'ended' or ended_at is not null
  ),
  unique (room_id, session_index)
);

create index if not exists live_sessions_room_started_idx
  on public.live_sessions (room_id, started_at desc);

alter table public.live_sessions enable row level security;

drop policy if exists "View live sessions in visible rooms"
  on public.live_sessions;
create policy "View live sessions in visible rooms"
  on public.live_sessions
  for select
  to authenticated, anon
  using (public.can_view_live_room(room_id));

revoke insert, update, delete on table public.live_sessions
  from authenticated, anon;

-- FK from rooms.current_session_id (deferred until table exists)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'live_rooms_current_session_id_fkey'
  ) then
    alter table public.live_rooms
      add constraint live_rooms_current_session_id_fkey
      foreign key (current_session_id)
      references public.live_sessions (id)
      on delete set null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Interactive foundations: polls, quizzes, audience questions
-- ---------------------------------------------------------------------------

create table if not exists public.live_polls (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.live_rooms (id) on delete cascade,
  session_id uuid references public.live_sessions (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  question text not null
    constraint live_polls_question_length check (
      char_length(btrim(question)) between 1 and 280
    ),
  options jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    constraint live_polls_status_check
      check (status in ('draft', 'open', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists live_polls_room_created_idx
  on public.live_polls (room_id, created_at desc);

alter table public.live_polls enable row level security;

drop policy if exists "View live polls in visible rooms" on public.live_polls;
create policy "View live polls in visible rooms"
  on public.live_polls
  for select
  to authenticated, anon
  using (public.can_view_live_room(room_id));

revoke insert, update, delete on table public.live_polls
  from authenticated, anon;

create table if not exists public.live_poll_votes (
  poll_id uuid not null
    references public.live_polls (id) on delete cascade,
  user_id uuid not null
    references auth.users (id) on delete cascade,
  option_index integer not null
    constraint live_poll_votes_option_nonnegative check (option_index >= 0),
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

alter table public.live_poll_votes enable row level security;

drop policy if exists "View own poll votes" on public.live_poll_votes;
create policy "View own poll votes"
  on public.live_poll_votes
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on table public.live_poll_votes
  from authenticated, anon;

create table if not exists public.live_quizzes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.live_rooms (id) on delete cascade,
  session_id uuid references public.live_sessions (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  title text not null
    constraint live_quizzes_title_length check (
      char_length(btrim(title)) between 1 and 120
    ),
  questions jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    constraint live_quizzes_status_check
      check (status in ('draft', 'open', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists live_quizzes_room_created_idx
  on public.live_quizzes (room_id, created_at desc);

alter table public.live_quizzes enable row level security;

drop policy if exists "View live quizzes in visible rooms"
  on public.live_quizzes;
create policy "View live quizzes in visible rooms"
  on public.live_quizzes
  for select
  to authenticated, anon
  using (public.can_view_live_room(room_id));

revoke insert, update, delete on table public.live_quizzes
  from authenticated, anon;

create table if not exists public.live_audience_questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.live_rooms (id) on delete cascade,
  session_id uuid references public.live_sessions (id) on delete set null,
  asker_id uuid references auth.users (id) on delete set null,
  body text not null
    constraint live_audience_questions_body_length check (
      char_length(btrim(body)) between 1 and 500
    ),
  status text not null default 'open'
    constraint live_audience_questions_status_check
      check (
        status in (
          'open',
          'highlighted',
          'answered',
          'dismissed'
        )
      ),
  upvotes integer not null default 0
    constraint live_audience_questions_upvotes_nonnegative check (upvotes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists live_audience_questions_room_status_idx
  on public.live_audience_questions (room_id, status, upvotes desc);

alter table public.live_audience_questions enable row level security;

drop policy if exists "View audience questions in visible rooms"
  on public.live_audience_questions;
create policy "View audience questions in visible rooms"
  on public.live_audience_questions
  for select
  to authenticated, anon
  using (public.can_view_live_room(room_id));

revoke insert, update, delete on table public.live_audience_questions
  from authenticated, anon;

-- ---------------------------------------------------------------------------
-- 7. AI artifact hooks (pipeline plug-in points; no processing in M1)
-- ---------------------------------------------------------------------------

create table if not exists public.live_ai_artifacts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.live_rooms (id) on delete cascade,
  session_id uuid references public.live_sessions (id) on delete set null,
  artifact_type text not null
    constraint live_ai_artifacts_type_check
      check (
        artifact_type in (
          'live_summary',
          'chapter',
          'highlight',
          'translation',
          'suggested_question',
          'moderation_assist'
        )
      ),
  status text not null default 'pending'
    constraint live_ai_artifacts_status_check
      check (
        status in ('pending', 'processing', 'ready', 'failed')
      ),
  payload jsonb not null default '{}'::jsonb,
  source_refs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_ai_artifacts_room_type_idx
  on public.live_ai_artifacts (room_id, artifact_type, created_at desc);

alter table public.live_ai_artifacts enable row level security;

drop policy if exists "Host staff view ai artifacts"
  on public.live_ai_artifacts;
create policy "Host staff view ai artifacts"
  on public.live_ai_artifacts
  for select
  to authenticated
  using (public.is_live_room_staff(room_id));

revoke insert, update, delete on table public.live_ai_artifacts
  from authenticated, anon;

-- ---------------------------------------------------------------------------
-- 8. Internal counters / helpers
-- ---------------------------------------------------------------------------

create or replace function public.count_live_on_stage(p_room_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.live_participants p
  where p.room_id = p_room_id
    and p.left_at is null
    and p.is_banned = false
    and p.stage_status = 'on_stage';
$$;

revoke all on function public.count_live_on_stage(uuid) from public;
grant execute on function public.count_live_on_stage(uuid) to authenticated;

create or replace function public.resequence_live_stage_queue(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_pos integer := 0;
begin
  for r in
    select id, requester_id
    from public.live_stage_requests
    where room_id = p_room_id
      and status = 'queued'
    order by coalesce(queue_position, 2147483647), created_at
  loop
    v_pos := v_pos + 1;
    update public.live_stage_requests
    set queue_position = v_pos, updated_at = now()
    where id = r.id;

    update public.live_participants
    set queue_position = v_pos
    where room_id = p_room_id
      and user_id = r.requester_id
      and left_at is null
      and stage_status = 'queued';
  end loop;
end;
$$;

revoke all on function public.resequence_live_stage_queue(uuid) from public;
-- internal; called from other SECURITY DEFINER fns only

create or replace function public.promote_participant_to_stage(
  p_room_id uuid,
  p_user_id uuid,
  p_role text default 'guest'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_on_stage integer;
begin
  if p_role not in ('guest', 'co_host') then
    raise exception 'Invalid on-stage role';
  end if;

  select max_on_stage into v_max from public.live_rooms where id = p_room_id;
  if v_max is null then
    raise exception 'Room not found';
  end if;

  v_on_stage := public.count_live_on_stage(p_room_id);
  if v_on_stage >= v_max then
    raise exception 'STAGE_FULL';
  end if;

  update public.live_participants
  set
    role = case
      when live_participants.role in ('host', 'co_host') then live_participants.role
      when p_role = 'co_host' then 'co_host'
      else 'guest'
    end,
    stage_status = 'on_stage',
    can_publish_audio = true,
    can_publish_video = true,
    can_share_screen = (
      live_participants.role in ('host', 'co_host') or p_role = 'co_host'
    ),
    muted_by_host = false,
    camera_disabled_by_host = false,
    queue_position = null,
    stage_joined_at = now(),
    stage_left_at = null,
    last_seen_at = now()
  where room_id = p_room_id
    and user_id = p_user_id
    and left_at is null
    and is_banned = false;

  if not found then
    raise exception 'Active participant not found';
  end if;
end;
$$;

revoke all on function public.promote_participant_to_stage(uuid, uuid, text)
  from public;

-- ---------------------------------------------------------------------------
-- 9. go_live / end_live — media fields + first session + host on stage
-- ---------------------------------------------------------------------------

create or replace function public.go_live_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session_id uuid;
  v_sfu text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_live_room_host(p_room_id) then
    raise exception 'Only the host can go live';
  end if;

  v_sfu := 'umtuba-live-' || p_room_id::text;

  insert into public.live_participants (
    room_id, user_id, role, joined_at, left_at, last_seen_at, is_banned,
    stage_status, can_publish_audio, can_publish_video, can_share_screen,
    stage_joined_at
  )
  values (
    p_room_id, v_uid, 'host', now(), null, now(), false,
    'on_stage', true, true, true, now()
  )
  on conflict (room_id, user_id) do update
  set
    role = 'host',
    left_at = null,
    last_seen_at = now(),
    is_banned = false,
    stage_status = 'on_stage',
    can_publish_audio = true,
    can_publish_video = true,
    can_share_screen = true,
    stage_joined_at = coalesce(live_participants.stage_joined_at, now()),
    stage_left_at = null,
    queue_position = null;

  update public.live_rooms
  set
    status = 'live',
    started_at = coalesce(started_at, now()),
    ingest_protocol = coalesce(ingest_protocol, 'webrtc'),
    sfu_room_id = coalesce(sfu_room_id, v_sfu),
    media_metadata = coalesce(media_metadata, '{}'::jsonb)
      || jsonb_build_object(
        'provider', 'livekit',
        'mediaVersion', 2,
        'maxOnStage', max_on_stage
      ),
    updated_at = now()
  where id = p_room_id
    and status = 'idle';

  if not found then
    if exists (
      select 1 from public.live_rooms where id = p_room_id and status = 'live'
    ) then
      return;
    end if;
    raise exception 'Ended rooms cannot be restarted';
  end if;

  insert into public.live_sessions (
    room_id, session_index, title, status, started_by
  )
  values (p_room_id, 1, 'Session 1', 'active', v_uid)
  on conflict (room_id, session_index) do update
  set status = 'active', ended_at = null
  returning id into v_session_id;

  if v_session_id is null then
    select id into v_session_id
    from public.live_sessions
    where room_id = p_room_id and session_index = 1;
  end if;

  update public.live_rooms
  set current_session_id = v_session_id, updated_at = now()
  where id = p_room_id;

  perform public.refresh_live_room_viewer_count(p_room_id);
end;
$$;

revoke all on function public.go_live_room(uuid) from public;
grant execute on function public.go_live_room(uuid) to authenticated;

create or replace function public.end_live_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  -- Host only — co-hosts cannot end the stream
  if not public.is_live_room_host(p_room_id) then
    raise exception 'Only the host can end the live room';
  end if;

  update public.live_sessions
  set status = 'ended', ended_at = coalesce(ended_at, v_now)
  where room_id = p_room_id
    and status = 'active';

  update public.live_rooms
  set
    status = 'ended',
    ended_at = v_now,
    viewer_count = 0,
    pinned_participant_id = null,
    updated_at = v_now
  where id = p_room_id
    and status <> 'ended';

  update public.live_participants
  set
    left_at = coalesce(left_at, v_now),
    last_seen_at = v_now,
    stage_status = case
      when stage_status = 'on_stage' then 'off_stage'
      else stage_status
    end,
    can_publish_audio = false,
    can_publish_video = false,
    can_share_screen = false,
    stage_left_at = case
      when stage_status = 'on_stage' then coalesce(stage_left_at, v_now)
      else stage_left_at
    end,
    queue_position = null
  where room_id = p_room_id
    and left_at is null;

  update public.live_stage_requests
  set status = 'expired', updated_at = v_now
  where room_id = p_room_id
    and status in ('pending', 'queued');

  update public.live_stage_invitations
  set status = 'expired', updated_at = v_now
  where room_id = p_room_id
    and status = 'pending';

  insert into public.live_moderation_events (
    room_id, actor_id, action, detail
  )
  values (
    p_room_id, v_uid, 'end_room', jsonb_build_object('at', v_now)
  );
end;
$$;

revoke all on function public.end_live_room(uuid) from public;
grant execute on function public.end_live_room(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Start new session without ending the stream (host only)
-- ---------------------------------------------------------------------------

create or replace function public.start_live_session(
  p_room_id uuid,
  p_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_next integer;
  v_id uuid;
  v_title text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_live_room_host(p_room_id) then
    raise exception 'Only the host can start a new session';
  end if;

  if not exists (
    select 1 from public.live_rooms
    where id = p_room_id and status = 'live'
  ) then
    raise exception 'Room is not live';
  end if;

  update public.live_sessions
  set status = 'ended', ended_at = now()
  where room_id = p_room_id and status = 'active';

  select coalesce(max(session_index), 0) + 1
  into v_next
  from public.live_sessions
  where room_id = p_room_id;

  v_title := nullif(btrim(coalesce(p_title, '')), '');
  if v_title is null then
    v_title := 'Session ' || v_next::text;
  end if;

  insert into public.live_sessions (
    room_id, session_index, title, status, started_by
  )
  values (p_room_id, v_next, v_title, 'active', v_uid)
  returning id into v_id;

  update public.live_rooms
  set current_session_id = v_id, updated_at = now()
  where id = p_room_id;

  return v_id;
end;
$$;

revoke all on function public.start_live_session(uuid, text) from public;
grant execute on function public.start_live_session(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 11. Stage request / queue / admit / invite / remove / media flags / pin
-- ---------------------------------------------------------------------------

create or replace function public.request_live_stage(
  p_room_id uuid,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_max integer;
  v_on_stage integer;
  v_req_id uuid;
  v_pos integer;
  v_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if public.is_user_banned_from_live_room(p_room_id) then
    raise exception 'Banned from this room';
  end if;

  if not exists (
    select 1 from public.live_rooms
    where id = p_room_id and status = 'live'
  ) then
    raise exception 'Room is not live';
  end if;

  if not public.is_active_live_participant(p_room_id) then
    raise exception 'Join the room before requesting the stage';
  end if;

  if exists (
    select 1 from public.live_participants
    where room_id = p_room_id
      and user_id = v_uid
      and left_at is null
      and stage_status = 'on_stage'
  ) then
    raise exception 'Already on stage';
  end if;

  select max_on_stage into v_max from public.live_rooms where id = p_room_id;
  v_on_stage := public.count_live_on_stage(p_room_id);

  -- Always enter queue when full OR when seats free (host still admits).
  -- Pending = awaiting host decision; queued = seat full, waiting for seat + notify.
  if v_on_stage >= v_max then
    v_status := 'queued';
    select coalesce(max(queue_position), 0) + 1
    into v_pos
    from public.live_stage_requests
    where room_id = p_room_id and status = 'queued';
  else
    v_status := 'pending';
    v_pos := null;
  end if;

  select id, status, queue_position
  into v_req_id, v_status, v_pos
  from public.live_stage_requests
  where room_id = p_room_id
    and requester_id = v_uid
    and status in ('pending', 'queued')
  limit 1;

  if v_req_id is not null then
    update public.live_stage_requests
    set
      updated_at = now(),
      message = coalesce(
        nullif(btrim(coalesce(p_message, '')), ''),
        message
      )
    where id = v_req_id
    returning status, queue_position into v_status, v_pos;
  else
    insert into public.live_stage_requests (
      room_id, requester_id, status, queue_position, message
    )
    values (
      p_room_id,
      v_uid,
      v_status,
      v_pos,
      nullif(btrim(coalesce(p_message, '')), '')
    )
    returning id, status, queue_position
    into v_req_id, v_status, v_pos;
  end if;

  update public.live_participants
  set
    stage_status = case when v_status = 'queued' then 'queued' else 'off_stage' end,
    queue_position = v_pos,
    last_seen_at = now()
  where room_id = p_room_id
    and user_id = v_uid
    and left_at is null;

  -- If free seat path: keep participant off_stage until accepted;
  -- request stays pending for host notification.
  if v_status = 'pending' then
    update public.live_participants
    set stage_status = 'off_stage', queue_position = null
    where room_id = p_room_id and user_id = v_uid and left_at is null;
  end if;

  return jsonb_build_object(
    'requestId', v_req_id,
    'status', v_status,
    'queuePosition', v_pos,
    'onStageCount', v_on_stage,
    'maxOnStage', v_max,
    'seatAvailable', v_on_stage < v_max
  );
end;
$$;

revoke all on function public.request_live_stage(uuid, text) from public;
grant execute on function public.request_live_stage(uuid, text) to authenticated;

create or replace function public.cancel_live_stage_request(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  update public.live_stage_requests
  set status = 'cancelled', updated_at = now()
  where room_id = p_room_id
    and requester_id = v_uid
    and status in ('pending', 'queued');

  update public.live_participants
  set stage_status = 'off_stage', queue_position = null, last_seen_at = now()
  where room_id = p_room_id
    and user_id = v_uid
    and left_at is null
    and stage_status in ('queued', 'off_stage');

  perform public.resequence_live_stage_queue(p_room_id);
end;
$$;

revoke all on function public.cancel_live_stage_request(uuid) from public;
grant execute on function public.cancel_live_stage_request(uuid) to authenticated;

create or replace function public.respond_live_stage_request(
  p_request_id uuid,
  p_accept boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.live_stage_requests%rowtype;
  v_max integer;
  v_on_stage integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_req
  from public.live_stage_requests
  where id = p_request_id;

  if not found then
    raise exception 'Request not found';
  end if;

  if not public.is_live_stage_manager(v_req.room_id) then
    raise exception 'Only host or co-host can respond to stage requests';
  end if;

  if v_req.status not in ('pending', 'queued') then
    raise exception 'Request is no longer open';
  end if;

  if not p_accept then
    update public.live_stage_requests
    set
      status = 'rejected',
      handled_by = v_uid,
      handled_at = now(),
      updated_at = now(),
      queue_position = null
    where id = p_request_id;

    update public.live_participants
    set stage_status = 'off_stage', queue_position = null, last_seen_at = now()
    where room_id = v_req.room_id
      and user_id = v_req.requester_id
      and left_at is null;

    perform public.resequence_live_stage_queue(v_req.room_id);

    return jsonb_build_object('accepted', false, 'requestId', p_request_id);
  end if;

  select max_on_stage into v_max
  from public.live_rooms where id = v_req.room_id;
  v_on_stage := public.count_live_on_stage(v_req.room_id);

  if v_on_stage >= v_max then
    -- Keep/move to queue; notify host that seat is still full
    update public.live_stage_requests
    set
      status = 'queued',
      updated_at = now()
    where id = p_request_id;

    update public.live_participants
    set stage_status = 'queued', last_seen_at = now()
    where room_id = v_req.room_id
      and user_id = v_req.requester_id
      and left_at is null;

    perform public.resequence_live_stage_queue(v_req.room_id);

    select queue_position into v_req.queue_position
    from public.live_stage_requests where id = p_request_id;

    return jsonb_build_object(
      'accepted', false,
      'queued', true,
      'queuePosition', v_req.queue_position,
      'reason', 'STAGE_FULL',
      'notifyHost', true
    );
  end if;

  perform public.promote_participant_to_stage(
    v_req.room_id, v_req.requester_id, 'guest'
  );

  update public.live_stage_requests
  set
    status = 'accepted',
    handled_by = v_uid,
    handled_at = now(),
    updated_at = now(),
    queue_position = null
  where id = p_request_id;

  insert into public.live_moderation_events (
    room_id, actor_id, action, target_user_id, detail
  )
  values (
    v_req.room_id,
    v_uid,
    'stage_admit',
    v_req.requester_id,
    jsonb_build_object('requestId', p_request_id)
  );

  return jsonb_build_object(
    'accepted', true,
    'requestId', p_request_id,
    'userId', v_req.requester_id
  );
end;
$$;

revoke all on function public.respond_live_stage_request(uuid, boolean)
  from public;
grant execute on function public.respond_live_stage_request(uuid, boolean)
  to authenticated;

create or replace function public.invite_live_stage(
  p_room_id uuid,
  p_invitee_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_live_stage_manager(p_room_id) then
    raise exception 'Only host or co-host can invite to stage';
  end if;

  if p_invitee_id is null or p_invitee_id = v_uid then
    raise exception 'Invalid invitee';
  end if;

  if not exists (
    select 1 from public.live_rooms
    where id = p_room_id and status = 'live'
  ) then
    raise exception 'Room is not live';
  end if;

  if not exists (
    select 1 from public.live_participants
    where room_id = p_room_id
      and user_id = p_invitee_id
      and left_at is null
      and is_banned = false
  ) then
    raise exception 'Invitee must be an active participant';
  end if;

  select id into v_id
  from public.live_stage_invitations
  where room_id = p_room_id
    and invitee_id = p_invitee_id
    and status = 'pending'
  limit 1;

  if v_id is null then
    insert into public.live_stage_invitations (
      room_id, invitee_id, invited_by, status
    )
    values (p_room_id, p_invitee_id, v_uid, 'pending')
    returning id into v_id;
  end if;

  update public.live_participants
  set stage_status = 'invited', last_seen_at = now()
  where room_id = p_room_id
    and user_id = p_invitee_id
    and left_at is null
    and stage_status <> 'on_stage';

  return v_id;
end;
$$;

revoke all on function public.invite_live_stage(uuid, uuid) from public;
grant execute on function public.invite_live_stage(uuid, uuid) to authenticated;

create or replace function public.respond_live_stage_invite(
  p_invite_id uuid,
  p_accept boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.live_stage_invitations%rowtype;
  v_max integer;
  v_on_stage integer;
  v_pos integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_inv
  from public.live_stage_invitations
  where id = p_invite_id;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if v_inv.invitee_id is distinct from v_uid then
    raise exception 'Not your invitation';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'Invitation is no longer pending';
  end if;

  if not p_accept then
    update public.live_stage_invitations
    set status = 'declined', handled_at = now(), updated_at = now()
    where id = p_invite_id;

    update public.live_participants
    set stage_status = 'off_stage', last_seen_at = now()
    where room_id = v_inv.room_id
      and user_id = v_uid
      and left_at is null
      and stage_status = 'invited';

    return jsonb_build_object('accepted', false);
  end if;

  select max_on_stage into v_max
  from public.live_rooms where id = v_inv.room_id;
  v_on_stage := public.count_live_on_stage(v_inv.room_id);

  if v_on_stage >= v_max then
    -- Accept intent but queue until a seat opens; notify host
    update public.live_stage_invitations
    set status = 'accepted', handled_at = now(), updated_at = now()
    where id = p_invite_id;

    select coalesce(max(queue_position), 0) + 1
    into v_pos
    from public.live_stage_requests
    where room_id = v_inv.room_id and status = 'queued';

    insert into public.live_stage_requests (
      room_id, requester_id, status, queue_position, message
    )
    values (
      v_inv.room_id, v_uid, 'queued', v_pos, 'From invitation'
    )
    on conflict do nothing;

    update public.live_participants
    set stage_status = 'queued', queue_position = v_pos, last_seen_at = now()
    where room_id = v_inv.room_id and user_id = v_uid and left_at is null;

    perform public.resequence_live_stage_queue(v_inv.room_id);

    return jsonb_build_object(
      'accepted', false,
      'queued', true,
      'notifyHost', true,
      'reason', 'STAGE_FULL'
    );
  end if;

  perform public.promote_participant_to_stage(v_inv.room_id, v_uid, 'guest');

  update public.live_stage_invitations
  set status = 'accepted', handled_at = now(), updated_at = now()
  where id = p_invite_id;

  return jsonb_build_object('accepted', true, 'userId', v_uid);
end;
$$;

revoke all on function public.respond_live_stage_invite(uuid, boolean)
  from public;
grant execute on function public.respond_live_stage_invite(uuid, boolean)
  to authenticated;

create or replace function public.remove_from_live_stage(
  p_room_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_host_id uuid;
  v_role text;
  v_seat_now_free boolean := false;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_live_stage_manager(p_room_id) then
    raise exception 'Only host or co-host can remove from stage';
  end if;

  select host_id into v_host_id from public.live_rooms where id = p_room_id;
  if p_user_id = v_host_id then
    raise exception 'Cannot remove the room host from stage';
  end if;

  select role into v_role
  from public.live_participants
  where room_id = p_room_id and user_id = p_user_id and left_at is null;

  -- Co-host cannot remove another co_host; host can
  if v_role = 'co_host' and not public.is_live_room_host(p_room_id) then
    raise exception 'Only the host can remove a co-host';
  end if;

  update public.live_participants
  set
    role = 'viewer',
    stage_status = 'off_stage',
    can_publish_audio = false,
    can_publish_video = false,
    can_share_screen = false,
    muted_by_host = false,
    camera_disabled_by_host = false,
    queue_position = null,
    stage_left_at = now(),
    last_seen_at = now()
  where room_id = p_room_id
    and user_id = p_user_id
    and left_at is null
    and stage_status = 'on_stage';

  if found then
    v_seat_now_free := true;
  end if;

  update public.live_rooms
  set pinned_participant_id = null, updated_at = now()
  where id = p_room_id
    and pinned_participant_id = p_user_id;

  insert into public.live_moderation_events (
    room_id, actor_id, action, target_user_id, detail
  )
  values (
    p_room_id, v_uid, 'stage_remove', p_user_id, '{}'::jsonb
  );

  -- Seat freed → host notification signal via room metadata bump
  if v_seat_now_free then
    update public.live_rooms
    set
      media_metadata = coalesce(media_metadata, '{}'::jsonb)
        || jsonb_build_object(
          'stageSeatAvailableAt', to_jsonb(now()),
          'queueWaiting', (
            select count(*)::integer
            from public.live_stage_requests
            where room_id = p_room_id and status = 'queued'
          )
        ),
      updated_at = now()
    where id = p_room_id;
  end if;
end;
$$;

revoke all on function public.remove_from_live_stage(uuid, uuid) from public;
grant execute on function public.remove_from_live_stage(uuid, uuid)
  to authenticated;

create or replace function public.set_live_stage_media_flags(
  p_room_id uuid,
  p_user_id uuid,
  p_muted_by_host boolean default null,
  p_camera_disabled_by_host boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_host_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_live_stage_manager(p_room_id) then
    raise exception 'Only host or co-host can change stage media flags';
  end if;

  select host_id into v_host_id from public.live_rooms where id = p_room_id;
  if p_user_id = v_host_id then
    raise exception 'Cannot force-mute the room host';
  end if;

  update public.live_participants
  set
    muted_by_host = coalesce(p_muted_by_host, muted_by_host),
    camera_disabled_by_host = coalesce(
      p_camera_disabled_by_host,
      camera_disabled_by_host
    ),
    can_publish_audio = case
      when coalesce(p_muted_by_host, muted_by_host) then false
      when stage_status = 'on_stage' then true
      else can_publish_audio
    end,
    can_publish_video = case
      when coalesce(p_camera_disabled_by_host, camera_disabled_by_host)
        then false
      when stage_status = 'on_stage' then true
      else can_publish_video
    end,
    last_seen_at = now()
  where room_id = p_room_id
    and user_id = p_user_id
    and left_at is null
    and stage_status = 'on_stage';

  if not found then
    raise exception 'On-stage participant not found';
  end if;
end;
$$;

revoke all on function public.set_live_stage_media_flags(
  uuid, uuid, boolean, boolean
) from public;
grant execute on function public.set_live_stage_media_flags(
  uuid, uuid, boolean, boolean
) to authenticated;

create or replace function public.pin_live_stage_participant(
  p_room_id uuid,
  p_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  -- Pin is host-only control (layout authority)
  if not public.is_live_room_host(p_room_id) then
    raise exception 'Only the host can pin a participant';
  end if;

  if p_user_id is not null then
    if not exists (
      select 1 from public.live_participants
      where room_id = p_room_id
        and user_id = p_user_id
        and left_at is null
        and stage_status = 'on_stage'
    ) then
      raise exception 'Pinned user must be on stage';
    end if;
  end if;

  update public.live_rooms
  set
    pinned_participant_id = p_user_id,
    stage_layout_mode = case
      when p_user_id is null then 'auto'
      else 'pinned'
    end,
    updated_at = now()
  where id = p_room_id;
end;
$$;

revoke all on function public.pin_live_stage_participant(uuid, uuid)
  from public;
grant execute on function public.pin_live_stage_participant(uuid, uuid)
  to authenticated;

create or replace function public.set_live_stage_layout_mode(
  p_room_id uuid,
  p_mode text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_live_room_host(p_room_id) then
    raise exception 'Only the host can change layout mode';
  end if;

  if p_mode not in ('auto', 'active_speaker', 'pinned', 'grid') then
    raise exception 'Invalid layout mode';
  end if;

  update public.live_rooms
  set stage_layout_mode = p_mode, updated_at = now()
  where id = p_room_id;
end;
$$;

revoke all on function public.set_live_stage_layout_mode(uuid, text)
  from public;
grant execute on function public.set_live_stage_layout_mode(uuid, text)
  to authenticated;

-- Extend role setter: allow guest; host-only; no ownership transfer
create or replace function public.set_live_participant_role(
  p_room_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_host_id uuid;
  v_prev text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_live_room_host(p_room_id) then
    raise exception 'Only the host can change roles';
  end if;

  if p_role not in ('co_host', 'guest', 'moderator', 'viewer') then
    raise exception 'Invalid role';
  end if;

  if p_user_id is null or p_user_id = v_uid then
    raise exception 'Host role cannot be changed this way';
  end if;

  select host_id into v_host_id from public.live_rooms where id = p_room_id;
  if v_host_id is not distinct from p_user_id then
    raise exception 'Cannot demote the room host';
  end if;

  select role into v_prev
  from public.live_participants
  where room_id = p_room_id
    and user_id = p_user_id
    and left_at is null;

  if not found then
    raise exception 'Active participant not found in this room';
  end if;

  if v_prev = 'host' then
    raise exception 'Cannot demote the room host';
  end if;

  update public.live_participants
  set
    role = p_role,
    can_share_screen = (p_role = 'co_host'),
    -- Promoting to co_host/guest while off stage does not auto-admit
    can_publish_audio = case
      when stage_status = 'on_stage' and p_role in ('co_host', 'guest')
        then not muted_by_host
      else false
    end,
    can_publish_video = case
      when stage_status = 'on_stage' and p_role in ('co_host', 'guest')
        then not camera_disabled_by_host
      else false
    end,
    last_seen_at = now()
  where room_id = p_room_id
    and user_id = p_user_id
    and left_at is null;

  insert into public.live_moderation_events (
    room_id, actor_id, action, target_user_id, detail
  )
  values (
    p_room_id,
    v_uid,
    'role_change',
    p_user_id,
    jsonb_build_object('from', v_prev, 'to', p_role)
  );
end;
$$;

revoke all on function public.set_live_participant_role(uuid, uuid, text)
  from public;
grant execute on function public.set_live_participant_role(uuid, uuid, text)
  to authenticated;

-- Grants snapshot for LiveKit token issuer (server uses user JWT)
create or replace function public.get_live_media_grants(p_room_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.live_rooms%rowtype;
  v_part public.live_participants%rowtype;
begin
  select * into v_room from public.live_rooms where id = p_room_id;
  if not found then
    raise exception 'Room not found';
  end if;

  if v_uid is not null then
    select * into v_part
    from public.live_participants
    where room_id = p_room_id
      and user_id = v_uid
      and left_at is null
      and is_banned = false;
  end if;

  return jsonb_build_object(
    'roomId', v_room.id,
    'status', v_room.status,
    'sfuRoomId', v_room.sfu_room_id,
    'maxOnStage', v_room.max_on_stage,
    'pinnedParticipantId', v_room.pinned_participant_id,
    'stageLayoutMode', v_room.stage_layout_mode,
    'currentSessionId', v_room.current_session_id,
    'identity', v_uid,
    'role', coalesce(v_part.role, 'viewer'),
    'stageStatus', coalesce(v_part.stage_status, 'off_stage'),
    'canSubscribe', v_room.status = 'live' and public.can_view_live_room(p_room_id),
    'canPublishAudio', coalesce(v_part.can_publish_audio, false)
      and coalesce(v_part.stage_status, '') = 'on_stage'
      and coalesce(v_part.role, '') in ('host', 'co_host', 'guest')
      and not coalesce(v_part.muted_by_host, false),
    'canPublishVideo', coalesce(v_part.can_publish_video, false)
      and coalesce(v_part.stage_status, '') = 'on_stage'
      and coalesce(v_part.role, '') in ('host', 'co_host', 'guest')
      and not coalesce(v_part.camera_disabled_by_host, false),
    'canShareScreen', coalesce(v_part.can_share_screen, false)
      and coalesce(v_part.stage_status, '') = 'on_stage'
      and coalesce(v_part.role, '') in ('host', 'co_host'),
    'mutedByHost', coalesce(v_part.muted_by_host, false),
    'cameraDisabledByHost', coalesce(v_part.camera_disabled_by_host, false),
    'queuePosition', v_part.queue_position
  );
end;
$$;

revoke all on function public.get_live_media_grants(uuid) from public;
grant execute on function public.get_live_media_grants(uuid)
  to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 12. Realtime publication
-- ---------------------------------------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.live_stage_requests;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.live_stage_invitations;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.live_sessions;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.live_polls;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.live_audience_questions;
  exception when duplicate_object then null;
  end;
end;
$$;
