-- UMTUBA Live Streaming V1 Foundation (security-hardened)
-- Additive only. Safe to apply once on a fresh remote DB.
-- Safe to re-run: IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE.
-- Does NOT drop existing app tables or live data.
-- Apply manually in Supabase SQL Editor. Do NOT auto-apply from the app.
--
-- Lifecycle (V1):
--   idle (ready) → live → ended
--   Ended rooms cannot be restarted via go_live_room.
--   Ending stamps left_at on all open participants and zeros viewer_count.
--
-- Location privacy (V1):
--   Exact latitude/longitude live in live_room_precise_location (host/staff only).
--   Public discovery exposes city/country only (approximate area).
--
-- Retention (V1 policy — enforce with jobs later):
--   Chat: retain while room exists; soft-deleted bodies redacted immediately.
--   Reports: retain for moderation audit (staff/reporter only).
--   Bans: retain; expires_at null = permanent until host lifts.
--   Recordings/replays: metadata only in V1; no storage bucket yet.
--   User delete: participants CASCADE; chat sender_id SET NULL; host_id SET NULL.
--
-- SECURITY DEFINER rules:
--   search_path locked to public; EXECUTE revoked from PUBLIC;
--   grants to authenticated (and anon only where read-safe);
--   acting identity always from auth.uid() — never caller-supplied host_id.

-- ---------------------------------------------------------------------------
-- 1. live_rooms
-- ---------------------------------------------------------------------------

create table if not exists public.live_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references auth.users (id) on delete set null,
  title text not null
    constraint live_rooms_title_length check (
      char_length(btrim(title)) between 1 and 120
    ),
  description text
    constraint live_rooms_description_length check (
      description is null or char_length(description) <= 2000
    ),
  category text
    constraint live_rooms_category_length check (
      category is null or char_length(category) between 1 and 64
    ),
  visibility text not null default 'public'
    constraint live_rooms_visibility_check
      check (visibility in ('public', 'private', 'group')),
  -- idle = ready/scheduled; live = on air; ended = terminal in V1
  status text not null default 'idle'
    constraint live_rooms_status_check
      check (status in ('idle', 'live', 'ended')),
  -- Approximate area only (safe for public discovery)
  city text
    constraint live_rooms_city_length check (
      city is null or char_length(city) between 1 and 120
    ),
  country text
    constraint live_rooms_country_length check (
      country is null or char_length(country) between 1 and 120
    ),
  -- Media extension points (not exposed on public client selects)
  ingest_protocol text
    constraint live_rooms_ingest_protocol_check
      check (
        ingest_protocol is null
        or ingest_protocol in ('webrtc', 'rtmp', 'hls', 'whip')
      ),
  sfu_room_id text
    constraint live_rooms_sfu_room_id_length check (
      sfu_room_id is null or char_length(sfu_room_id) between 1 and 256
    ),
  media_metadata jsonb not null default '{}'::jsonb,
  viewer_count integer not null default 0
    constraint live_rooms_viewer_count_nonnegative check (viewer_count >= 0),
  peak_viewer_count integer not null default 0
    constraint live_rooms_peak_viewer_nonnegative check (peak_viewer_count >= 0),
  chat_message_count bigint not null default 0
    constraint live_rooms_chat_count_nonnegative check (chat_message_count >= 0),
  recording_status text not null default 'none'
    constraint live_rooms_recording_status_check
      check (
        recording_status in ('none', 'recording', 'processing', 'ready', 'failed')
      ),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint live_rooms_title_trimmed check (title = btrim(title)),
  constraint live_rooms_live_has_started check (
    status <> 'live' or started_at is not null
  ),
  constraint live_rooms_ended_has_ended_at check (
    status <> 'ended' or ended_at is not null
  )
);

create index if not exists live_rooms_status_started_at_idx
  on public.live_rooms (status, started_at desc nulls last)
  where status = 'live';

create index if not exists live_rooms_host_id_created_at_idx
  on public.live_rooms (host_id, created_at desc);

create index if not exists live_rooms_visibility_status_idx
  on public.live_rooms (visibility, status, started_at desc nulls last);

create index if not exists live_rooms_city_country_live_idx
  on public.live_rooms (lower(city), lower(country), started_at desc)
  where status = 'live' and city is not null;

alter table public.live_rooms enable row level security;

-- ---------------------------------------------------------------------------
-- 1b. live_room_precise_location — host/staff only (exact coords)
-- ---------------------------------------------------------------------------

create table if not exists public.live_room_precise_location (
  room_id uuid primary key
    references public.live_rooms (id) on delete cascade,
  latitude double precision not null
    constraint live_room_precise_latitude_check check (
      latitude >= -90 and latitude <= 90
    ),
  longitude double precision not null
    constraint live_room_precise_longitude_check check (
      longitude >= -180 and longitude <= 180
    ),
  updated_at timestamptz not null default now()
);

-- Host/staff geo ops only — not for public discovery
create index if not exists live_room_precise_location_geo_idx
  on public.live_room_precise_location (latitude, longitude);

alter table public.live_room_precise_location enable row level security;

-- ---------------------------------------------------------------------------
-- 2. live_participants
-- ---------------------------------------------------------------------------

create table if not exists public.live_participants (
  room_id uuid not null
    references public.live_rooms (id) on delete cascade,
  user_id uuid not null
    references auth.users (id) on delete cascade,
  role text not null default 'viewer'
    constraint live_participants_role_check
      check (role in ('host', 'co_host', 'moderator', 'viewer')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  last_seen_at timestamptz not null default now(),
  is_banned boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  primary key (room_id, user_id),
  constraint live_participants_left_after_joined check (
    left_at is null or left_at >= joined_at
  )
);

create index if not exists live_participants_room_active_idx
  on public.live_participants (room_id, joined_at desc)
  where left_at is null and is_banned = false;

create index if not exists live_participants_user_active_idx
  on public.live_participants (user_id, joined_at desc)
  where left_at is null;

create index if not exists live_participants_room_role_idx
  on public.live_participants (room_id, role)
  where left_at is null;

alter table public.live_participants enable row level security;

-- ---------------------------------------------------------------------------
-- 3. live_chat_messages
-- ---------------------------------------------------------------------------

create table if not exists public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.live_rooms (id) on delete cascade,
  sender_id uuid references auth.users (id) on delete set null,
  body text,
  message_type text not null default 'text'
    constraint live_chat_messages_type_check
      check (
        message_type in (
          'text',
          'system',
          'gift',
          'reaction',
          'moderation'
        )
      ),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete set null,
  deletion_reason text
    constraint live_chat_messages_deletion_reason_length check (
      deletion_reason is null or char_length(deletion_reason) <= 500
    ),
  client_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint live_chat_messages_text_body_check check (
    message_type is distinct from 'text'
    or deleted_at is not null
    or (
      body is not null
      and char_length(btrim(body)) between 1 and 500
      and body = btrim(body)
    )
  )
);

create index if not exists live_chat_messages_room_created_at_id_idx
  on public.live_chat_messages (room_id, created_at desc, id desc);

create index if not exists live_chat_messages_sender_id_created_at_idx
  on public.live_chat_messages (sender_id, created_at desc);

create unique index if not exists live_chat_messages_room_sender_client_id_uidx
  on public.live_chat_messages (room_id, sender_id, client_id)
  where client_id is not null and sender_id is not null;

create index if not exists live_chat_messages_room_active_idx
  on public.live_chat_messages (room_id, created_at desc, id desc)
  where deleted_at is null;

-- Spam / burst assist: recent sends by sender in a room
create index if not exists live_chat_messages_room_sender_created_at_idx
  on public.live_chat_messages (room_id, sender_id, created_at desc);

alter table public.live_chat_messages enable row level security;

-- ---------------------------------------------------------------------------
-- 4. live_reports
-- ---------------------------------------------------------------------------

create table if not exists public.live_reports (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.live_rooms (id) on delete cascade,
  reporter_id uuid not null
    references auth.users (id) on delete cascade,
  target_user_id uuid references auth.users (id) on delete set null,
  target_message_id uuid
    references public.live_chat_messages (id) on delete set null,
  reason text not null
    constraint live_reports_reason_length check (
      char_length(btrim(reason)) between 1 and 1000
    ),
  status text not null default 'open'
    constraint live_reports_status_check
      check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);

create index if not exists live_reports_room_status_created_at_idx
  on public.live_reports (room_id, status, created_at desc);

create index if not exists live_reports_reporter_id_idx
  on public.live_reports (reporter_id, created_at desc);

-- One open report per reporter/target-message (null target → per room)
create unique index if not exists live_reports_open_message_uidx
  on public.live_reports (room_id, reporter_id, target_message_id)
  where status = 'open' and target_message_id is not null;

create unique index if not exists live_reports_open_room_uidx
  on public.live_reports (room_id, reporter_id)
  where status = 'open' and target_message_id is null;

alter table public.live_reports enable row level security;

-- ---------------------------------------------------------------------------
-- 5. live_bans — expires_at null = permanent until lifted
-- ---------------------------------------------------------------------------

create table if not exists public.live_bans (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.live_rooms (id) on delete cascade,
  user_id uuid not null
    references auth.users (id) on delete cascade,
  banned_by uuid references auth.users (id) on delete set null,
  reason text
    constraint live_bans_reason_length check (
      reason is null or char_length(reason) <= 1000
    ),
  -- null expires_at = permanent; non-null = temporary until that instant
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  lifted_at timestamptz,
  lifted_by uuid references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  constraint live_bans_room_user_unique unique (room_id, user_id)
);

create index if not exists live_bans_user_id_idx
  on public.live_bans (user_id, created_at desc);

create index if not exists live_bans_room_created_at_idx
  on public.live_bans (room_id, created_at desc);

-- Active bans (permanent or not yet expired). No now() in predicate (not immutable).
create index if not exists live_bans_room_active_permanent_idx
  on public.live_bans (room_id)
  where lifted_at is null and expires_at is null;

create index if not exists live_bans_room_expires_at_idx
  on public.live_bans (room_id, expires_at)
  where lifted_at is null and expires_at is not null;

alter table public.live_bans enable row level security;

-- ---------------------------------------------------------------------------
-- 6. live_gifts — no real-money movement in V1 (coin_value must stay null)
-- ---------------------------------------------------------------------------

create table if not exists public.live_gifts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.live_rooms (id) on delete cascade,
  sender_id uuid not null
    references auth.users (id) on delete cascade,
  gift_type text not null
    constraint live_gifts_type_length check (
      char_length(btrim(gift_type)) between 1 and 64
    ),
  quantity integer not null default 1
    constraint live_gifts_quantity_positive check (quantity > 0 and quantity <= 99),
  -- V1: must be null (no balances / payments). Economy later via RPC.
  coin_value integer
    constraint live_gifts_coin_value_null_v1 check (coin_value is null),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists live_gifts_room_created_at_idx
  on public.live_gifts (room_id, created_at desc);

create index if not exists live_gifts_sender_id_idx
  on public.live_gifts (sender_id, created_at desc);

alter table public.live_gifts enable row level security;

-- ---------------------------------------------------------------------------
-- 7. live_reactions
-- ---------------------------------------------------------------------------

create table if not exists public.live_reactions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.live_rooms (id) on delete cascade,
  user_id uuid not null
    references auth.users (id) on delete cascade,
  emoji text not null
    constraint live_reactions_emoji_length check (
      char_length(emoji) between 1 and 16
    ),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists live_reactions_room_created_at_idx
  on public.live_reactions (room_id, created_at desc);

create index if not exists live_reactions_user_room_created_at_idx
  on public.live_reactions (room_id, user_id, created_at desc);

alter table public.live_reactions enable row level security;

-- ---------------------------------------------------------------------------
-- 8–9. recordings / replays
-- ---------------------------------------------------------------------------

create table if not exists public.live_recordings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.live_rooms (id) on delete cascade,
  status text not null default 'pending'
    constraint live_recordings_status_check
      check (
        status in ('pending', 'recording', 'processing', 'ready', 'failed')
      ),
  storage_bucket text
    constraint live_recordings_bucket_length check (
      storage_bucket is null or char_length(storage_bucket) between 1 and 128
    ),
  storage_path text
    constraint live_recordings_path_length check (
      storage_path is null or char_length(storage_path) between 1 and 1024
    ),
  duration_ms integer
    constraint live_recordings_duration_check check (
      duration_ms is null or duration_ms >= 0
    ),
  byte_size bigint
    constraint live_recordings_byte_size_check check (
      byte_size is null or byte_size > 0
    ),
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists live_recordings_room_created_at_idx
  on public.live_recordings (room_id, created_at desc);

alter table public.live_recordings enable row level security;

create table if not exists public.live_replays (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.live_rooms (id) on delete cascade,
  recording_id uuid
    references public.live_recordings (id) on delete set null,
  title text
    constraint live_replays_title_length check (
      title is null or char_length(title) between 1 and 120
    ),
  playback_url text
    constraint live_replays_playback_url_length check (
      playback_url is null or char_length(playback_url) between 1 and 2048
    ),
  thumbnail_url text
    constraint live_replays_thumbnail_url_length check (
      thumbnail_url is null or char_length(thumbnail_url) between 1 and 2048
    ),
  view_count bigint not null default 0
    constraint live_replays_view_count_nonnegative check (view_count >= 0),
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists live_replays_room_published_at_idx
  on public.live_replays (room_id, published_at desc nulls last);

alter table public.live_replays enable row level security;

-- ---------------------------------------------------------------------------
-- 9b. live_moderation_events — auditable host/staff actions
-- ---------------------------------------------------------------------------

create table if not exists public.live_moderation_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.live_rooms (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null
    constraint live_moderation_events_action_check
      check (
        action in (
          'chat_soft_delete',
          'role_change',
          'ban',
          'unban',
          'end_room',
          'report_filed'
        )
      ),
  target_user_id uuid references auth.users (id) on delete set null,
  target_message_id uuid
    references public.live_chat_messages (id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists live_moderation_events_room_created_at_idx
  on public.live_moderation_events (room_id, created_at desc);

alter table public.live_moderation_events enable row level security;

-- ---------------------------------------------------------------------------
-- 10. Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_live_room_host(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.live_rooms r
    where r.id = p_room_id
      and r.host_id = (select auth.uid())
  );
$$;

revoke all on function public.is_live_room_host(uuid) from public;
grant execute on function public.is_live_room_host(uuid) to authenticated;

create or replace function public.is_active_live_participant(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.live_participants p
    where p.room_id = p_room_id
      and p.user_id = (select auth.uid())
      and p.left_at is null
      and p.is_banned = false
  );
$$;

revoke all on function public.is_active_live_participant(uuid) from public;
grant execute on function public.is_active_live_participant(uuid) to authenticated;

-- Chat moderation staff only (host / co_host / moderator). Not for end-room/roles.
create or replace function public.is_live_room_staff(p_room_id uuid)
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
      and p.role in ('host', 'co_host', 'moderator')
  );
$$;

revoke all on function public.is_live_room_staff(uuid) from public;
grant execute on function public.is_live_room_staff(uuid) to authenticated;

create or replace function public.is_user_banned_from_live_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.live_bans b
    where b.room_id = p_room_id
      and b.user_id = (select auth.uid())
      and b.lifted_at is null
      and (b.expires_at is null or b.expires_at > now())
  )
  or exists (
    select 1
    from public.live_participants p
    where p.room_id = p_room_id
      and p.user_id = (select auth.uid())
      and p.is_banned = true
  );
$$;

revoke all on function public.is_user_banned_from_live_room(uuid) from public;
grant execute on function public.is_user_banned_from_live_room(uuid) to authenticated;

-- Discoverable public live rooms; host always; active non-banned participants
-- while room is not ended. Banned users never. Ended non-host: not visible.
create or replace function public.can_view_live_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.live_rooms r
    where r.id = p_room_id
      and not public.is_user_banned_from_live_room(p_room_id)
      and (
        r.host_id = (select auth.uid())
        or (
          r.visibility = 'public'
          and r.status = 'live'
        )
        or (
          (select auth.uid()) is not null
          and r.status in ('idle', 'live')
          and public.is_active_live_participant(p_room_id)
        )
      )
  );
$$;

revoke all on function public.can_view_live_room(uuid) from public;
grant execute on function public.can_view_live_room(uuid) to authenticated, anon;

create or replace function public.trim_live_chat_body()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.body is not null then
    new.body := btrim(new.body);
  end if;
  return new;
end;
$$;

drop trigger if exists live_chat_messages_trim_body on public.live_chat_messages;
create trigger live_chat_messages_trim_body
  before insert or update of body on public.live_chat_messages
  for each row execute function public.trim_live_chat_body();

create or replace function public.redact_soft_deleted_live_chat()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.deleted_at is not null then
    new.body := null;
  end if;
  return new;
end;
$$;

drop trigger if exists live_chat_messages_redact_soft_delete
  on public.live_chat_messages;
create trigger live_chat_messages_redact_soft_delete
  before update of deleted_at, body on public.live_chat_messages
  for each row execute function public.redact_soft_deleted_live_chat();

create or replace function public.touch_live_room_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists live_rooms_touch_updated_at on public.live_rooms;
create trigger live_rooms_touch_updated_at
  before update on public.live_rooms
  for each row execute function public.touch_live_room_updated_at();

create or replace function public.sync_live_room_on_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.deleted_at is null then
    update public.live_rooms
    set
      chat_message_count = chat_message_count + 1,
      updated_at = new.created_at
    where id = new.room_id;
  end if;
  return new;
end;
$$;

drop trigger if exists live_chat_messages_sync_room on public.live_chat_messages;
create trigger live_chat_messages_sync_room
  after insert on public.live_chat_messages
  for each row execute function public.sync_live_room_on_chat_message();

-- Authoritative recompute; never goes negative. Internal use only.
create or replace function public.refresh_live_room_viewer_count(p_room_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*)::integer into v_count
  from public.live_participants p
  where p.room_id = p_room_id
    and p.left_at is null
    and p.is_banned = false;

  update public.live_rooms
  set
    viewer_count = greatest(v_count, 0),
    peak_viewer_count = greatest(peak_viewer_count, greatest(v_count, 0)),
    updated_at = now()
  where id = p_room_id;

  return greatest(v_count, 0);
end;
$$;

revoke all on function public.refresh_live_room_viewer_count(uuid) from public;
-- No grant to authenticated/anon — called only by other SECURITY DEFINER RPCs.

-- ---------------------------------------------------------------------------
-- 11. RLS
-- ---------------------------------------------------------------------------

drop policy if exists "Anyone can view public live rooms" on public.live_rooms;
drop policy if exists "View live rooms by visibility rules" on public.live_rooms;
create policy "View live rooms by visibility rules"
  on public.live_rooms
  for select
  using (
    host_id = (select auth.uid())
    or (
      visibility = 'public'
      and status = 'live'
      and not public.is_user_banned_from_live_room(id)
    )
    or (
      (select auth.uid()) is not null
      and status in ('idle', 'live')
      and public.is_active_live_participant(id)
    )
  );

drop policy if exists "Host and staff can view precise location"
  on public.live_room_precise_location;
create policy "Host and staff can view precise location"
  on public.live_room_precise_location
  for select
  to authenticated
  using (public.is_live_room_staff(room_id));

-- No client INSERT/UPDATE/DELETE on rooms or precise location — RPCs only.

drop policy if exists "View live participants in visible rooms"
  on public.live_participants;
create policy "View live participants in visible rooms"
  on public.live_participants
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.can_view_live_room(room_id)
  );

drop policy if exists "Participants can update own presence"
  on public.live_participants;
create policy "Participants can update own presence"
  on public.live_participants
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and left_at is null
    and is_banned = false
  )
  with check (
    user_id = (select auth.uid())
  );

revoke update on table public.live_participants from authenticated;
grant update (last_seen_at)
  on table public.live_participants
  to authenticated;

drop policy if exists "View chat in visible live rooms"
  on public.live_chat_messages;
create policy "View chat in visible live rooms"
  on public.live_chat_messages
  for select
  using (public.can_view_live_room(room_id));

drop policy if exists "Active participants can send live chat"
  on public.live_chat_messages;
create policy "Active participants can send live chat"
  on public.live_chat_messages
  for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and public.is_active_live_participant(room_id)
    and not public.is_user_banned_from_live_room(room_id)
    and message_type = 'text'
  );

-- Soft-delete columns only — no body rewrite via client UPDATE
drop policy if exists "Staff or author can moderate live chat"
  on public.live_chat_messages;
create policy "Staff or author can moderate live chat"
  on public.live_chat_messages
  for update
  to authenticated
  using (
    (
      sender_id = (select auth.uid())
      or public.is_live_room_staff(room_id)
    )
    and public.can_view_live_room(room_id)
  )
  with check (
    sender_id = (select auth.uid())
    or public.is_live_room_staff(room_id)
  );

revoke update on table public.live_chat_messages from authenticated;
grant update (deleted_at, deleted_by, deletion_reason)
  on table public.live_chat_messages
  to authenticated;

-- Reports: reporter identity never readable by ordinary participants
drop policy if exists "Authenticated users can create live reports"
  on public.live_reports;
create policy "Authenticated users can create live reports"
  on public.live_reports
  for insert
  to authenticated
  with check (
    (select auth.uid()) = reporter_id
    and public.can_view_live_room(room_id)
    and not public.is_user_banned_from_live_room(room_id)
  );

drop policy if exists "Reporters and staff can view live reports"
  on public.live_reports;
create policy "Reporters and staff can view live reports"
  on public.live_reports
  for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    or public.is_live_room_staff(room_id)
  );

drop policy if exists "Staff can view live bans" on public.live_bans;
create policy "Staff can view live bans"
  on public.live_bans
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_live_room_staff(room_id)
  );

drop policy if exists "View gifts in visible live rooms" on public.live_gifts;
create policy "View gifts in visible live rooms"
  on public.live_gifts
  for select
  using (public.can_view_live_room(room_id));

-- No direct gift INSERT — use send_live_gift RPC (auth + rate limits)
drop policy if exists "Participants can send live gifts" on public.live_gifts;

drop policy if exists "View reactions in visible live rooms"
  on public.live_reactions;
create policy "View reactions in visible live rooms"
  on public.live_reactions
  for select
  using (public.can_view_live_room(room_id));

-- No direct reaction INSERT — use send_live_reaction RPC
drop policy if exists "Participants can send live reactions"
  on public.live_reactions;

drop policy if exists "View recordings for visible live rooms"
  on public.live_recordings;
create policy "View recordings for visible live rooms"
  on public.live_recordings
  for select
  using (public.can_view_live_room(room_id));

drop policy if exists "View replays for visible live rooms"
  on public.live_replays;
create policy "View replays for visible live rooms"
  on public.live_replays
  for select
  using (public.can_view_live_room(room_id));

drop policy if exists "Staff can view moderation events"
  on public.live_moderation_events;
create policy "Staff can view moderation events"
  on public.live_moderation_events
  for select
  to authenticated
  using (public.is_live_room_staff(room_id));

-- Clients must not insert/update counters or privileged rows directly.
-- SECURITY DEFINER RPCs run as owner and remain able to write.
revoke insert, update, delete on table public.live_rooms from authenticated, anon;
revoke insert, update, delete on table public.live_room_precise_location from authenticated, anon;
revoke insert, delete on table public.live_participants from authenticated, anon;
revoke insert, update, delete on table public.live_bans from authenticated, anon;
revoke insert, update, delete on table public.live_gifts from authenticated, anon;
revoke insert, update, delete on table public.live_reactions from authenticated, anon;
revoke insert, update, delete on table public.live_recordings from authenticated, anon;
revoke insert, update, delete on table public.live_replays from authenticated, anon;
revoke insert, update, delete on table public.live_moderation_events from authenticated, anon;
revoke update, delete on table public.live_reports from authenticated, anon;

-- ---------------------------------------------------------------------------
-- 12. RPCs
-- ---------------------------------------------------------------------------

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
  v_title text := btrim(coalesce(p_title, ''));
  v_visibility text := coalesce(nullif(btrim(p_visibility), ''), 'public');
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if char_length(v_title) < 1 or char_length(v_title) > 120 then
    raise exception 'Title must be 1–120 characters';
  end if;

  if v_visibility not in ('public', 'private', 'group') then
    raise exception 'Invalid visibility';
  end if;

  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'Latitude and longitude must both be set or both omitted';
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

  insert into public.live_participants (
    room_id, user_id, role, joined_at, last_seen_at
  )
  values (v_room_id, v_uid, 'host', v_now, v_now);

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

create or replace function public.join_live_room(p_room_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.live_rooms%rowtype;
  v_existing public.live_participants%rowtype;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  -- Serialize join/leave/end against the same room
  select * into v_room
  from public.live_rooms
  where id = p_room_id
  for update;

  if not found then
    raise exception 'Live room not found or not available';
  end if;

  if v_room.status = 'ended' then
    raise exception 'Live room not found or not available';
  end if;

  if public.is_user_banned_from_live_room(p_room_id) then
    raise exception 'Live room not found or not available';
  end if;

  select * into v_existing
  from public.live_participants
  where room_id = p_room_id and user_id = v_uid;

  if found and v_existing.is_banned then
    raise exception 'Live room not found or not available';
  end if;

  -- Private/group: only host or previously invited participant rows
  if v_room.visibility <> 'public'
     and v_room.host_id is distinct from v_uid
     and not found then
    raise exception 'Live room not found or not available';
  end if;

  insert into public.live_participants (
    room_id, user_id, role, joined_at, left_at, last_seen_at, is_banned
  )
  values (
    p_room_id,
    v_uid,
    case when v_room.host_id = v_uid then 'host' else 'viewer' end,
    now(),
    null,
    now(),
    false
  )
  on conflict (room_id, user_id) do update
  set
    left_at = null,
    last_seen_at = now(),
    joined_at = case
      when live_participants.left_at is not null then now()
      else live_participants.joined_at
    end,
    role = case
      when v_room.host_id = v_uid then 'host'
      when live_participants.role in ('co_host', 'moderator')
        then live_participants.role
      else 'viewer'
    end
  where live_participants.is_banned = false;

  -- Banned rows are never cleared by join; fail closed if still inactive
  if not exists (
    select 1
    from public.live_participants p
    where p.room_id = p_room_id
      and p.user_id = v_uid
      and p.left_at is null
      and p.is_banned = false
  ) then
    raise exception 'Live room not found or not available';
  end if;

  v_count := public.refresh_live_room_viewer_count(p_room_id);
  return v_count;
end;
$$;

revoke all on function public.join_live_room(uuid) from public;
grant execute on function public.join_live_room(uuid) to authenticated;

create or replace function public.leave_live_room(p_room_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.live_rooms%rowtype;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_room
  from public.live_rooms
  where id = p_room_id
  for update;

  if not found then
    return 0;
  end if;

  -- Host must remain a participant while the room exists
  if v_room.host_id = v_uid then
    update public.live_participants
    set last_seen_at = now()
    where room_id = p_room_id
      and user_id = v_uid
      and left_at is null;

    return public.refresh_live_room_viewer_count(p_room_id);
  end if;

  update public.live_participants
  set left_at = now(), last_seen_at = now()
  where room_id = p_room_id
    and user_id = v_uid
    and left_at is null;

  v_count := public.refresh_live_room_viewer_count(p_room_id);
  return v_count;
end;
$$;

revoke all on function public.leave_live_room(uuid) from public;
grant execute on function public.leave_live_room(uuid) to authenticated;

create or replace function public.go_live_room(p_room_id uuid)
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

  if not public.is_live_room_host(p_room_id) then
    raise exception 'Only the host can go live';
  end if;

  -- Ensure host participant row is active
  insert into public.live_participants (
    room_id, user_id, role, joined_at, left_at, last_seen_at, is_banned
  )
  values (p_room_id, v_uid, 'host', now(), null, now(), false)
  on conflict (room_id, user_id) do update
  set
    role = 'host',
    left_at = null,
    last_seen_at = now(),
    is_banned = false;

  update public.live_rooms
  set
    status = 'live',
    started_at = coalesce(started_at, now()),
    updated_at = now()
  where id = p_room_id
    and status = 'idle';

  if not found then
    if exists (
      select 1 from public.live_rooms where id = p_room_id and status = 'live'
    ) then
      return; -- idempotent
    end if;
    raise exception 'Ended rooms cannot be restarted';
  end if;

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

  if not public.is_live_room_host(p_room_id) then
    raise exception 'Only the host can end the live room';
  end if;

  update public.live_rooms
  set
    status = 'ended',
    ended_at = v_now,
    viewer_count = 0,
    updated_at = v_now
  where id = p_room_id
    and status <> 'ended';

  update public.live_participants
  set left_at = coalesce(left_at, v_now), last_seen_at = v_now
  where room_id = p_room_id
    and left_at is null
    and user_id is distinct from v_uid;

  -- Host stays as participant with left_at set after end (inactive)
  update public.live_participants
  set left_at = coalesce(left_at, v_now), last_seen_at = v_now
  where room_id = p_room_id
    and user_id = v_uid
    and left_at is null;

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

create or replace function public.heartbeat_live_participant(p_room_id uuid)
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

  update public.live_participants
  set last_seen_at = now()
  where room_id = p_room_id
    and user_id = v_uid
    and left_at is null
    and is_banned = false;
end;
$$;

revoke all on function public.heartbeat_live_participant(uuid) from public;
grant execute on function public.heartbeat_live_participant(uuid) to authenticated;

create or replace function public.send_live_chat_message(
  p_room_id uuid,
  p_body text,
  p_client_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_client_id text := nullif(btrim(coalesce(p_client_id, '')), '');
  v_id uuid;
  v_room_status text;
  v_recent integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if char_length(v_body) < 1 or char_length(v_body) > 500 then
    raise exception 'Message must be 1–500 characters';
  end if;

  if not public.is_active_live_participant(p_room_id) then
    raise exception 'Join the live room before chatting';
  end if;

  if public.is_user_banned_from_live_room(p_room_id) then
    raise exception 'You are banned from this live room';
  end if;

  select status into v_room_status from public.live_rooms where id = p_room_id;
  if v_room_status is distinct from 'live' then
    raise exception 'Chat is only available while the room is live';
  end if;

  -- Burst limit: max 5 messages / 10 seconds / user / room
  select count(*)::integer into v_recent
  from public.live_chat_messages m
  where m.room_id = p_room_id
    and m.sender_id = v_uid
    and m.created_at > now() - interval '10 seconds';

  if v_recent >= 5 then
    raise exception 'You are sending messages too quickly';
  end if;

  if v_client_id is not null then
    select id into v_id
    from public.live_chat_messages
    where room_id = p_room_id
      and sender_id = v_uid
      and client_id = v_client_id;

    if v_id is not null then
      return v_id;
    end if;
  end if;

  insert into public.live_chat_messages (
    room_id, sender_id, body, message_type, client_id
  )
  values (p_room_id, v_uid, v_body, 'text', v_client_id)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.send_live_chat_message(uuid, text, text) from public;
grant execute on function public.send_live_chat_message(uuid, text, text)
  to authenticated;

create or replace function public.moderate_live_chat_message(
  p_message_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_msg public.live_chat_messages%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_msg from public.live_chat_messages where id = p_message_id;
  if not found then
    raise exception 'Message not found';
  end if;

  if not public.can_view_live_room(v_msg.room_id) then
    raise exception 'Not allowed to moderate this message';
  end if;

  if v_msg.sender_id is distinct from v_uid
     and not public.is_live_room_staff(v_msg.room_id) then
    raise exception 'Not allowed to moderate this message';
  end if;

  update public.live_chat_messages
  set
    deleted_at = now(),
    deleted_by = v_uid,
    deletion_reason = nullif(btrim(coalesce(p_reason, '')), ''),
    body = null
  where id = p_message_id
    and deleted_at is null;

  insert into public.live_moderation_events (
    room_id, actor_id, action, target_message_id, detail
  )
  values (
    v_msg.room_id,
    v_uid,
    'chat_soft_delete',
    p_message_id,
    jsonb_build_object(
      'reason', nullif(btrim(coalesce(p_reason, '')), '')
    )
  );
end;
$$;

revoke all on function public.moderate_live_chat_message(uuid, text) from public;
grant execute on function public.moderate_live_chat_message(uuid, text)
  to authenticated;

create or replace function public.list_live_chat_messages(
  p_room_id uuid,
  p_limit integer default 40,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  id uuid,
  room_id uuid,
  sender_id uuid,
  body text,
  message_type text,
  deleted_at timestamptz,
  client_id text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 50);
begin
  if not public.can_view_live_room(p_room_id) then
    raise exception 'Live room not found or not visible';
  end if;

  return query
  select
    m.id,
    m.room_id,
    m.sender_id,
    case when m.deleted_at is not null then null else m.body end,
    m.message_type,
    m.deleted_at,
    m.client_id,
    m.created_at
  from public.live_chat_messages m
  where m.room_id = p_room_id
    and (
      p_before_created_at is null
      or (m.created_at, m.id) < (p_before_created_at, p_before_id)
    )
  order by m.created_at desc, m.id desc
  limit v_limit;
end;
$$;

revoke all on function public.list_live_chat_messages(
  uuid, integer, timestamptz, uuid
) from public;
grant execute on function public.list_live_chat_messages(
  uuid, integer, timestamptz, uuid
) to authenticated, anon;

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

  if p_role not in ('co_host', 'moderator', 'viewer') then
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
  set role = p_role
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

revoke all on function public.set_live_participant_role(uuid, uuid, text) from public;
grant execute on function public.set_live_participant_role(uuid, uuid, text)
  to authenticated;

-- Host-only ban. expires_at null = permanent until unban.
create or replace function public.ban_live_participant(
  p_room_id uuid,
  p_user_id uuid,
  p_reason text default null,
  p_expires_at timestamptz default null
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

  if not public.is_live_room_host(p_room_id) then
    raise exception 'Only the host can ban participants';
  end if;

  select host_id into v_host_id from public.live_rooms where id = p_room_id;
  if p_user_id is null or p_user_id = v_uid or p_user_id = v_host_id then
    raise exception 'Cannot ban the room host';
  end if;

  insert into public.live_bans (
    room_id, user_id, banned_by, reason, expires_at, lifted_at, lifted_by
  )
  values (
    p_room_id,
    p_user_id,
    v_uid,
    nullif(btrim(coalesce(p_reason, '')), ''),
    p_expires_at,
    null,
    null
  )
  on conflict (room_id, user_id) do update
  set
    banned_by = v_uid,
    reason = excluded.reason,
    expires_at = excluded.expires_at,
    lifted_at = null,
    lifted_by = null,
    created_at = now();

  update public.live_participants
  set
    is_banned = true,
    left_at = coalesce(left_at, now()),
    last_seen_at = now(),
    role = case when role = 'host' then role else 'viewer' end
  where room_id = p_room_id
    and user_id = p_user_id;

  perform public.refresh_live_room_viewer_count(p_room_id);

  insert into public.live_moderation_events (
    room_id, actor_id, action, target_user_id, detail
  )
  values (
    p_room_id,
    v_uid,
    'ban',
    p_user_id,
    jsonb_build_object(
      'reason', nullif(btrim(coalesce(p_reason, '')), ''),
      'expires_at', p_expires_at
    )
  );
end;
$$;

revoke all on function public.ban_live_participant(
  uuid, uuid, text, timestamptz
) from public;
grant execute on function public.ban_live_participant(
  uuid, uuid, text, timestamptz
) to authenticated;

create or replace function public.send_live_reaction(
  p_room_id uuid,
  p_emoji text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_emoji text := btrim(coalesce(p_emoji, ''));
  v_recent integer;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if char_length(v_emoji) < 1 or char_length(v_emoji) > 16 then
    raise exception 'Invalid reaction';
  end if;

  if not public.is_active_live_participant(p_room_id) then
    raise exception 'Join the live room before reacting';
  end if;

  if public.is_user_banned_from_live_room(p_room_id) then
    raise exception 'You are banned from this live room';
  end if;

  select count(*)::integer into v_recent
  from public.live_reactions r
  where r.room_id = p_room_id
    and r.user_id = v_uid
    and r.created_at > now() - interval '3 seconds';

  if v_recent >= 3 then
    raise exception 'You are reacting too quickly';
  end if;

  insert into public.live_reactions (room_id, user_id, emoji)
  values (p_room_id, v_uid, v_emoji)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.send_live_reaction(uuid, text) from public;
grant execute on function public.send_live_reaction(uuid, text) to authenticated;

create or replace function public.send_live_gift(
  p_room_id uuid,
  p_gift_type text,
  p_quantity integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_type text := btrim(coalesce(p_gift_type, ''));
  v_qty integer := coalesce(p_quantity, 1);
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if char_length(v_type) < 1 or char_length(v_type) > 64 then
    raise exception 'Invalid gift type';
  end if;

  if v_qty < 1 or v_qty > 99 then
    raise exception 'Invalid gift quantity';
  end if;

  if not public.is_active_live_participant(p_room_id) then
    raise exception 'Join the live room before sending gifts';
  end if;

  if public.is_user_banned_from_live_room(p_room_id) then
    raise exception 'You are banned from this live room';
  end if;

  -- V1: cosmetic only — coin_value forced null (no balances)
  insert into public.live_gifts (
    room_id, sender_id, gift_type, quantity, coin_value
  )
  values (p_room_id, v_uid, v_type, v_qty, null)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.send_live_gift(uuid, text, integer) from public;
grant execute on function public.send_live_gift(uuid, text, integer) to authenticated;

create or replace function public.create_live_report(
  p_room_id uuid,
  p_reason text,
  p_target_user_id uuid default null,
  p_target_message_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_id uuid;
  v_open integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if char_length(v_reason) < 1 or char_length(v_reason) > 1000 then
    raise exception 'Reason must be 1–1000 characters';
  end if;

  if not public.can_view_live_room(p_room_id) then
    raise exception 'Live room not found or not available';
  end if;

  if public.is_user_banned_from_live_room(p_room_id) then
    raise exception 'Live room not found or not available';
  end if;

  if p_target_message_id is not null then
    if not exists (
      select 1 from public.live_chat_messages m
      where m.id = p_target_message_id and m.room_id = p_room_id
    ) then
      raise exception 'Invalid report target';
    end if;
  end if;

  -- Soft rate limit: max 5 open reports / reporter / room
  select count(*)::integer into v_open
  from public.live_reports r
  where r.room_id = p_room_id
    and r.reporter_id = v_uid
    and r.status = 'open';

  if v_open >= 5 then
    raise exception 'Too many open reports for this room';
  end if;

  insert into public.live_reports (
    room_id, reporter_id, target_user_id, target_message_id, reason
  )
  values (
    p_room_id, v_uid, p_target_user_id, p_target_message_id, v_reason
  )
  returning id into v_id;

  insert into public.live_moderation_events (
    room_id, actor_id, action, target_user_id, target_message_id, detail
  )
  values (
    p_room_id,
    v_uid,
    'report_filed',
    p_target_user_id,
    p_target_message_id,
    jsonb_build_object('report_id', v_id)
  );

  return v_id;
end;
$$;

revoke all on function public.create_live_report(
  uuid, text, uuid, uuid
) from public;
grant execute on function public.create_live_report(
  uuid, text, uuid, uuid
) to authenticated;

-- ---------------------------------------------------------------------------
-- 13. Realtime (RLS still filters rows per subscriber)
-- ---------------------------------------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.live_chat_messages;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.live_rooms;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.live_reactions;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
