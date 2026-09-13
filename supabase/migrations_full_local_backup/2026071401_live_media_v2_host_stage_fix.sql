-- Live Media V2 follow-up: create_live_room must put host on stage when going live.
-- Without this, go-live-on-create leaves stage_status=off_stage and can_publish_*=false,
-- so LiveKit tokens are subscribe-only and host cam/mic controls never render.
-- Idempotent. Apply after 20260714_live_media_v2_multi_guest.sql.

create or replace function public.ensure_live_host_on_stage(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_host_id uuid;
  v_sfu text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select host_id into v_host_id
  from public.live_rooms
  where id = p_room_id;

  if v_host_id is null then
    raise exception 'Room not found';
  end if;

  if v_host_id is distinct from v_uid then
    raise exception 'Only the host can claim the stage this way';
  end if;

  v_sfu := 'umtuba-live-' || p_room_id::text;

  insert into public.live_participants (
    room_id, user_id, role, joined_at, left_at, last_seen_at, is_banned,
    stage_status, can_publish_audio, can_publish_video, can_share_screen,
    stage_joined_at, queue_position
  )
  values (
    p_room_id, v_uid, 'host', now(), null, now(), false,
    'on_stage', true, true, true, now(), null
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
    muted_by_host = false,
    camera_disabled_by_host = false,
    queue_position = null,
    stage_joined_at = coalesce(live_participants.stage_joined_at, now()),
    stage_left_at = null;

  update public.live_rooms
  set
    ingest_protocol = coalesce(ingest_protocol, 'webrtc'),
    sfu_room_id = coalesce(sfu_room_id, v_sfu),
    media_metadata = coalesce(media_metadata, '{}'::jsonb)
      || jsonb_build_object(
        'provider', 'livekit',
        'mediaVersion', 2
      ),
    updated_at = now()
  where id = p_room_id
    and status = 'live';
end;
$$;

revoke all on function public.ensure_live_host_on_stage(uuid) from public;
grant execute on function public.ensure_live_host_on_stage(uuid) to authenticated;

-- Repair create_live_room so instant go-live sets host publish flags + SFU id.
create or replace function public.create_live_room(
  p_title text,
  p_visibility text default 'public',
  p_category text default null,
  p_description text default null,
  p_city text default null,
  p_country text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_go_live boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room_id uuid;
  v_title text := btrim(p_title);
  v_visibility text := coalesce(nullif(btrim(p_visibility), ''), 'public');
  v_now timestamptz := now();
  v_sfu text;
  v_session_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_title is null or char_length(v_title) < 1 or char_length(v_title) > 120 then
    raise exception 'Invalid title';
  end if;

  if v_visibility not in ('public', 'private', 'group') then
    raise exception 'Invalid visibility';
  end if;

  insert into public.live_rooms (
    host_id,
    title,
    description,
    category,
    visibility,
    status,
    city,
    country,
    started_at,
    viewer_count,
    peak_viewer_count
  )
  values (
    v_uid,
    v_title,
    nullif(btrim(coalesce(p_description, '')), ''),
    nullif(btrim(coalesce(p_category, '')), ''),
    v_visibility,
    case when p_go_live then 'live' else 'idle' end,
    nullif(btrim(coalesce(p_city, '')), ''),
    nullif(btrim(coalesce(p_country, '')), ''),
    case when p_go_live then v_now else null end,
    1,
    1
  )
  returning id into v_room_id;

  v_sfu := 'umtuba-live-' || v_room_id::text;

  insert into public.live_participants (
    room_id, user_id, role, joined_at, last_seen_at,
    stage_status, can_publish_audio, can_publish_video, can_share_screen,
    stage_joined_at
  )
  values (
    v_room_id,
    v_uid,
    'host',
    v_now,
    v_now,
    case when p_go_live then 'on_stage' else 'off_stage' end,
    p_go_live,
    p_go_live,
    p_go_live,
    case when p_go_live then v_now else null end
  );

  if p_go_live then
    update public.live_rooms
    set
      ingest_protocol = 'webrtc',
      sfu_room_id = v_sfu,
      media_metadata = jsonb_build_object(
        'provider', 'livekit',
        'mediaVersion', 2
      ),
      updated_at = v_now
    where id = v_room_id;

    insert into public.live_sessions (
      room_id, session_index, title, status, started_by
    )
    values (v_room_id, 1, 'Session 1', 'active', v_uid)
    on conflict (room_id, session_index) do update
    set status = 'active', ended_at = null
    returning id into v_session_id;

    if v_session_id is null then
      select id into v_session_id
      from public.live_sessions
      where room_id = v_room_id and session_index = 1;
    end if;

    update public.live_rooms
    set current_session_id = v_session_id, updated_at = v_now
    where id = v_room_id;
  end if;

  if p_latitude is not null and p_longitude is not null then
    insert into public.live_room_precise_location (room_id, latitude, longitude)
    values (v_room_id, p_latitude, p_longitude);
  end if;

  return v_room_id;
end;
$$;

revoke all on function public.create_live_room(
  text, text, text, text, text, text, double precision, double precision, boolean
) from public;
grant execute on function public.create_live_room(
  text, text, text, text, text, text, double precision, double precision, boolean
) to authenticated;

-- One-time repair for already-live hosts stuck off-stage without publish flags.
update public.live_participants p
set
  stage_status = 'on_stage',
  can_publish_audio = true,
  can_publish_video = true,
  can_share_screen = true,
  stage_joined_at = coalesce(p.stage_joined_at, p.joined_at),
  queue_position = null
from public.live_rooms r
where p.room_id = r.id
  and r.status = 'live'
  and r.host_id = p.user_id
  and p.left_at is null
  and p.is_banned = false
  and (
    p.stage_status is distinct from 'on_stage'
    or p.can_publish_audio = false
    or p.can_publish_video = false
    or p.can_share_screen = false
  );

update public.live_rooms r
set
  ingest_protocol = coalesce(r.ingest_protocol, 'webrtc'),
  sfu_room_id = coalesce(r.sfu_room_id, 'umtuba-live-' || r.id::text),
  media_metadata = coalesce(r.media_metadata, '{}'::jsonb)
    || jsonb_build_object('provider', 'livekit', 'mediaVersion', 2),
  updated_at = now()
where r.status = 'live'
  and (r.sfu_room_id is null or r.ingest_protocol is null);
