-- UM Streak + private visual message foundation (candidate only).
-- DO NOT APPLY TO PRODUCTION from this task.
-- Numbering: 20260935 / 20260936 are reserved for a separate rich-profile /
-- identity-discovery GO. This file uses the next free version 20260937.
--
-- Extends existing Communications (messages / message_attachments).
-- Does not create a parallel messenger.
-- Private media is never public. View-once is enforced server-side.
-- Streak days are UTC calendar dates. Clients cannot supply a streak count.

-- ---------------------------------------------------------------------------
-- 1) Message lifecycle columns
-- ---------------------------------------------------------------------------

alter table public.messages
  add column if not exists visual_opened_at timestamptz,
  add column if not exists visual_expires_at timestamptz,
  add column if not exists visual_expiration_policy text;

alter table public.messages
  drop constraint if exists messages_visual_expiration_policy_check;

alter table public.messages
  add constraint messages_visual_expiration_policy_check
  check (
    visual_expiration_policy is null
    or visual_expiration_policy in ('view_once', 'disappear_after_view')
  );

create or replace function public.list_conversation_messages(
  p_conversation_id uuid,
  p_limit integer default 40,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns setof public.messages
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 40), 100));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_conversation_participant(p_conversation_id) then
    raise exception 'Not a participant';
  end if;

  return query
  select
    m.id,
    m.conversation_id,
    m.sender_id,
    case when m.deleted_at is not null then null else m.body end as body,
    m.message_type,
    m.reply_to_message_id,
    m.forwarded_from_message_id,
    m.edited_at,
    m.deleted_at,
    m.deleted_for,
    m.client_id,
    m.metadata,
    m.created_at,
    m.visual_opened_at,
    m.visual_expires_at,
    m.visual_expiration_policy
  from public.messages m
  where m.conversation_id = p_conversation_id
    and not exists (
      select 1
      from public.message_hides h
      where h.message_id = m.id
        and h.user_id = v_uid
    )
    and (
      p_before_created_at is null
      or m.created_at < p_before_created_at
      or (
        m.created_at = p_before_created_at
        and p_before_id is not null
        and m.id < p_before_id
      )
    )
  order by m.created_at desc, m.id desc
  limit v_limit;
end;
$$;

revoke all on function public.list_conversation_messages(uuid, integer, timestamptz, uuid) from public;
grant execute on function public.list_conversation_messages(uuid, integer, timestamptz, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) UM Streak tables
-- ---------------------------------------------------------------------------

create table if not exists public.um_streaks (
  pair_key text primary key,
  user_low_id uuid not null references auth.users (id) on delete cascade,
  user_high_id uuid not null references auth.users (id) on delete cascade,
  current_streak integer not null default 0
    check (current_streak >= 0),
  longest_streak integer not null default 0
    check (longest_streak >= 0),
  last_qualifying_day_low date,
  last_qualifying_day_high date,
  last_completed_streak_day date,
  streak_state text not null default 'none'
    check (
      streak_state in (
        'none',
        'started',
        'active_today',
        'waiting_for_friend',
        'you_need_to_reply',
        'at_risk'
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint um_streaks_pair_order_check check (user_low_id < user_high_id),
  constraint um_streaks_pair_key_check check (
    pair_key = (user_low_id::text || ':' || user_high_id::text)
  )
);

create unique index if not exists um_streaks_users_uidx
  on public.um_streaks (user_low_id, user_high_id);

create table if not exists public.um_streak_events (
  event_id uuid primary key,
  pair_key text not null references public.um_streaks (pair_key) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  qualifying_day date not null,
  message_id uuid references public.messages (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists um_streak_events_sender_day_uidx
  on public.um_streak_events (pair_key, sender_id, qualifying_day);

create table if not exists public.um_streak_badges (
  pair_key text not null references public.um_streaks (pair_key) on delete cascade,
  days integer not null
    check (days in (3, 7, 30, 100, 365)),
  earned_at timestamptz not null default now(),
  primary key (pair_key, days)
);

alter table public.um_streaks enable row level security;
alter table public.um_streaks force row level security;
alter table public.um_streak_events enable row level security;
alter table public.um_streak_events force row level security;
alter table public.um_streak_badges enable row level security;
alter table public.um_streak_badges force row level security;

drop policy if exists "Participants read own um streaks" on public.um_streaks;
create policy "Participants read own um streaks"
  on public.um_streaks
  for select
  to authenticated
  using (
    auth.uid() = user_low_id
    or auth.uid() = user_high_id
  );

drop policy if exists "Participants read own um streak events" on public.um_streak_events;
create policy "Participants read own um streak events"
  on public.um_streak_events
  for select
  to authenticated
  using (
    auth.uid() = sender_id
    or auth.uid() = recipient_id
  );

drop policy if exists "Participants read own um streak badges" on public.um_streak_badges;
create policy "Participants read own um streak badges"
  on public.um_streak_badges
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.um_streaks s
      where s.pair_key = um_streak_badges.pair_key
        and (s.user_low_id = auth.uid() or s.user_high_id = auth.uid())
    )
  );

revoke all on table public.um_streaks from anon, public;
revoke all on table public.um_streak_events from anon, public;
revoke all on table public.um_streak_badges from anon, public;
grant select on table public.um_streaks to authenticated;
grant select on table public.um_streak_events to authenticated;
grant select on table public.um_streak_badges to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Helpers
-- ---------------------------------------------------------------------------

create or replace function public.um_streak_utc_day(p_at timestamptz)
returns date
language sql
immutable
set search_path = public
as $$
  select (timezone('utc', p_at))::date;
$$;

create or replace function public.um_streak_pair_key(p_a uuid, p_b uuid)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_a < p_b then p_a::text || ':' || p_b::text
    else p_b::text || ':' || p_a::text
  end;
$$;

create or replace function public.can_read_message_media(p_message_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.messages%rowtype;
begin
  if v_uid is null then
    return false;
  end if;

  select *
    into v_row
  from public.messages
  where id = p_message_id;

  if not found then
    return false;
  end if;

  if not public.is_conversation_participant(v_row.conversation_id) then
    return false;
  end if;

  if v_row.sender_id is not null
     and public.ugc_users_are_blocked(v_uid, v_row.sender_id) then
    return false;
  end if;

  if v_row.deleted_at is not null then
    return false;
  end if;

  if v_row.message_type not in ('image', 'video') then
    return v_uid = v_row.sender_id;
  end if;

  if v_row.visual_expires_at is not null and v_row.visual_expires_at <= now() then
    return v_uid = v_row.sender_id;
  end if;

  if v_row.visual_opened_at is not null then
    return v_uid = v_row.sender_id;
  end if;

  return true;
end;
$$;

revoke all on function public.can_read_message_media(uuid) from public, anon;
grant execute on function public.can_read_message_media(uuid) to authenticated;

create or replace function public.um_streak_apply_visual_event(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_event_id uuid,
  p_message_id uuid,
  p_occurred_at timestamptz
)
returns public.um_streaks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_low uuid;
  v_high uuid;
  v_key text;
  v_today date := public.um_streak_utc_day(p_occurred_at);
  v_yesterday date := public.um_streak_utc_day(p_occurred_at) - 1;
  v_row public.um_streaks%rowtype;
  v_sender_is_low boolean;
  v_sender_day date;
  v_badge integer;
begin
  if p_sender_id is null or p_recipient_id is null or p_sender_id = p_recipient_id then
    raise exception 'Invalid streak pair' using errcode = '22023';
  end if;

  if public.ugc_users_are_blocked(p_sender_id, p_recipient_id) then
    raise exception 'Cannot message a blocked user' using errcode = '42501';
  end if;

  if p_sender_id < p_recipient_id then
    v_low := p_sender_id;
    v_high := p_recipient_id;
  else
    v_low := p_recipient_id;
    v_high := p_sender_id;
  end if;
  v_key := v_low::text || ':' || v_high::text;

  insert into public.um_streaks (
    pair_key, user_low_id, user_high_id
  ) values (
    v_key, v_low, v_high
  )
  on conflict (pair_key) do update
    set updated_at = public.um_streaks.updated_at
  returning * into v_row;

  if exists (
    select 1 from public.um_streak_events e where e.event_id = p_event_id
  ) then
    return v_row;
  end if;

  v_sender_is_low := p_sender_id = v_low;
  v_sender_day := case
    when v_sender_is_low then v_row.last_qualifying_day_low
    else v_row.last_qualifying_day_high
  end;

  if v_sender_day is distinct from v_today then
    insert into public.um_streak_events (
      event_id, pair_key, sender_id, recipient_id, qualifying_day, message_id
    ) values (
      p_event_id, v_key, p_sender_id, p_recipient_id, v_today, p_message_id
    )
    on conflict (pair_key, sender_id, qualifying_day) do nothing;
  end if;

  if v_sender_day is distinct from v_today then
    if v_sender_is_low then
      v_row.last_qualifying_day_low := v_today;
    else
      v_row.last_qualifying_day_high := v_today;
    end if;
  end if;

  if v_row.last_completed_streak_day is not null
     and v_row.last_completed_streak_day < v_yesterday then
    v_row.current_streak := 0;
    v_row.last_completed_streak_day := null;
  end if;

  if v_row.last_qualifying_day_low = v_today
     and v_row.last_qualifying_day_high = v_today
     and v_row.last_completed_streak_day is distinct from v_today then
    if v_row.last_completed_streak_day = v_yesterday then
      v_row.current_streak := v_row.current_streak + 1;
    else
      v_row.current_streak := 1;
    end if;
    v_row.last_completed_streak_day := v_today;
    if v_row.longest_streak < v_row.current_streak then
      v_row.longest_streak := v_row.current_streak;
    end if;
  end if;

  if v_row.last_completed_streak_day = v_today then
    v_row.streak_state := case
      when v_row.current_streak <= 1 then 'started'
      else 'active_today'
    end;
  elsif (v_row.last_qualifying_day_low = v_today)
     <> (v_row.last_qualifying_day_high = v_today) then
    v_row.streak_state := 'waiting_for_friend';
  elsif v_row.last_completed_streak_day = v_yesterday and v_row.current_streak > 0 then
    v_row.streak_state := 'at_risk';
  else
    v_row.streak_state := 'none';
  end if;

  v_row.updated_at := now();

  update public.um_streaks
  set
    current_streak = v_row.current_streak,
    longest_streak = v_row.longest_streak,
    last_qualifying_day_low = v_row.last_qualifying_day_low,
    last_qualifying_day_high = v_row.last_qualifying_day_high,
    last_completed_streak_day = v_row.last_completed_streak_day,
    streak_state = v_row.streak_state,
    updated_at = v_row.updated_at
  where pair_key = v_key;

  foreach v_badge in array array[3, 7, 30, 100, 365]
  loop
    if v_row.longest_streak >= v_badge then
      insert into public.um_streak_badges (pair_key, days)
      values (v_key, v_badge)
      on conflict (pair_key, days) do nothing;
    end if;
  end loop;

  return v_row;
end;
$$;

revoke all on function public.um_streak_apply_visual_event(uuid, uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.um_streak_apply_visual_event(uuid, uuid, uuid, uuid, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- 4) Send / open RPCs
-- ---------------------------------------------------------------------------

create or replace function public.send_um_visual_message(
  p_conversation_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_media_type text,
  p_caption text default null,
  p_client_id text default null,
  p_byte_size bigint default null,
  p_width integer default null,
  p_height integer default null,
  p_duration_ms integer default null,
  p_expiration_policy text default 'view_once'
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_peer uuid;
  v_body text := nullif(btrim(coalesce(p_caption, '')), '');
  v_policy text := lower(btrim(coalesce(p_expiration_policy, 'view_once')));
  v_path text := btrim(coalesce(p_storage_path, ''));
  v_client text := nullif(btrim(coalesce(p_client_id, '')), '');
  v_row public.messages%rowtype;
  v_event uuid := gen_random_uuid();
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.is_conversation_participant(p_conversation_id) then
    raise exception 'Not a participant' using errcode = '42501';
  end if;

  select cp.user_id
    into v_peer
  from public.conversation_participants cp
  where cp.conversation_id = p_conversation_id
    and cp.user_id <> v_uid
  limit 1;

  if v_peer is null then
    raise exception 'Direct conversation required' using errcode = '22023';
  end if;

  if public.ugc_users_are_blocked(v_uid, v_peer) then
    raise exception 'Cannot message a blocked user' using errcode = '42501';
  end if;

  if p_media_type not in ('image', 'video') then
    raise exception 'Unsupported visual media type' using errcode = '22023';
  end if;

  if v_policy not in ('view_once', 'disappear_after_view') then
    raise exception 'Unsupported expiration policy' using errcode = '22023';
  end if;

  if v_body is not null and char_length(v_body) > 280 then
    raise exception 'Caption is too long' using errcode = '22023';
  end if;

  if v_path !~ ('^' || v_uid::text || '/' || p_conversation_id::text || '/[^/]+$')
     or v_path ~ '\.\.' then
    raise exception 'Invalid media path' using errcode = '22023';
  end if;

  if v_client is not null then
    select *
      into v_row
    from public.messages
    where conversation_id = p_conversation_id
      and sender_id = v_uid
      and client_id = v_client
    limit 1;
    if found then
      return v_row;
    end if;
  end if;

  insert into public.messages (
    conversation_id,
    sender_id,
    body,
    message_type,
    client_id,
    visual_expiration_policy
  ) values (
    p_conversation_id,
    v_uid,
    coalesce(v_body, ''),
    p_media_type,
    v_client,
    v_policy
  )
  returning * into v_row;

  insert into public.message_attachments (
    message_id,
    kind,
    storage_bucket,
    storage_path,
    mime_type,
    byte_size,
    duration_ms,
    width,
    height,
    metadata
  ) values (
    v_row.id,
    p_media_type,
    'message-media',
    v_path,
    p_mime_type,
    p_byte_size,
    p_duration_ms,
    p_width,
    p_height,
    jsonb_build_object('expiration_policy', v_policy)
  );

  perform public.um_streak_apply_visual_event(
    v_uid,
    v_peer,
    v_event,
    v_row.id,
    v_row.created_at
  );

  return v_row;
end;
$$;

revoke all on function public.send_um_visual_message(
  uuid, text, text, text, text, text, bigint, integer, integer, integer, text
) from public, anon;
grant execute on function public.send_um_visual_message(
  uuid, text, text, text, text, text, bigint, integer, integer, integer, text
) to authenticated;

create or replace function public.open_um_visual_message(p_message_id uuid)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.messages%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
    into v_row
  from public.messages
  where id = p_message_id
  for update;

  if not found then
    raise exception 'Message not found' using errcode = '02000';
  end if;

  if not public.is_conversation_participant(v_row.conversation_id) then
    raise exception 'Not a participant' using errcode = '42501';
  end if;

  if v_row.sender_id is not null
     and public.ugc_users_are_blocked(v_uid, v_row.sender_id) then
    raise exception 'Cannot message a blocked user' using errcode = '42501';
  end if;

  if v_row.sender_id = v_uid then
    return v_row;
  end if;

  if v_row.message_type not in ('image', 'video') then
    raise exception 'Not a visual message' using errcode = '22023';
  end if;

  if v_row.visual_opened_at is null then
    update public.messages
    set
      visual_opened_at = now(),
      visual_expires_at = now()
    where id = p_message_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke all on function public.open_um_visual_message(uuid) from public, anon;
grant execute on function public.open_um_visual_message(uuid) to authenticated;

create or replace function public.get_um_streak_for_conversation(p_conversation_id uuid)
returns table (
  pair_key text,
  current_streak integer,
  longest_streak integer,
  last_qualifying_day_low date,
  last_qualifying_day_high date,
  last_completed_streak_day date,
  streak_state text,
  user_low_id uuid,
  user_high_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_peer uuid;
  v_key text;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.is_conversation_participant(p_conversation_id) then
    raise exception 'Not a participant' using errcode = '42501';
  end if;

  select cp.user_id
    into v_peer
  from public.conversation_participants cp
  where cp.conversation_id = p_conversation_id
    and cp.user_id <> v_uid
  limit 1;

  if v_peer is null then
    return;
  end if;

  if public.ugc_users_are_blocked(v_uid, v_peer) then
    return;
  end if;

  v_key := public.um_streak_pair_key(v_uid, v_peer);

  return query
  select
    s.pair_key,
    s.current_streak,
    s.longest_streak,
    s.last_qualifying_day_low,
    s.last_qualifying_day_high,
    s.last_completed_streak_day,
    s.streak_state,
    s.user_low_id,
    s.user_high_id
  from public.um_streaks s
  where s.pair_key = v_key;
end;
$$;

revoke all on function public.get_um_streak_for_conversation(uuid) from public, anon;
grant execute on function public.get_um_streak_for_conversation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Attachment insert stays RPC-only
-- ---------------------------------------------------------------------------

drop policy if exists "Senders insert own visual attachments" on public.message_attachments;
-- No direct INSERT policy. send_um_visual_message is SECURITY DEFINER.

-- ---------------------------------------------------------------------------
-- 6) Private message-media bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-media',
  'message-media',
  false,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners upload message media" on storage.objects;
create policy "Owners upload message media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'message-media'
    and auth.uid()::text = (storage.foldername(name))[1]
    and public.is_conversation_participant(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "Participants read unopened message media" on storage.objects;
create policy "Participants read unopened message media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'message-media'
    and exists (
      select 1
      from public.message_attachments a
      join public.messages m on m.id = a.message_id
      where a.storage_bucket = 'message-media'
        and a.storage_path = name
        and public.can_read_message_media(m.id)
    )
  );

drop policy if exists "Owners delete own message media" on storage.objects;
create policy "Owners delete own message media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'message-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
