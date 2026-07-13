-- UMTUBA Messenger V1 Foundation
-- Additive only. Safe to re-run. Does not drop existing tables or data.
-- Apply manually in Supabase SQL Editor after social interactions migration.
-- Do NOT auto-apply from the app.
--
-- Designed for later: attachments, voice/video, reactions, replies, edit/delete,
-- forwarding, group/channel/phone conversations, encryption metadata.
--
-- Deletion / lifecycle (V1):
-- - auth.users delete → participants CASCADE; direct pairs CASCADE;
--   messages.sender_id SET NULL (content preserved, sender anonymized);
--   conversations.created_by SET NULL.
-- - Soft-delete (messages.deleted_at): body is redacted to null; clients show placeholder.
-- - Hard-delete message → attachments CASCADE.
-- - No storage buckets or public object URLs are created in this migration.
-- - Mute / archive / unread are private to each participant row (own-row RLS).

-- ---------------------------------------------------------------------------
-- 1. conversations
-- ---------------------------------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct'
    constraint conversations_kind_check
      check (kind in ('direct', 'group', 'channel', 'phone')),
  title text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_preview text,
  metadata jsonb not null default '{}'::jsonb,
  constraint conversations_direct_title_null check (
    kind <> 'direct' or title is null
  )
);

create index if not exists conversations_last_message_at_idx
  on public.conversations (last_message_at desc nulls last);

create index if not exists conversations_kind_updated_at_idx
  on public.conversations (kind, updated_at desc);

alter table public.conversations enable row level security;

-- ---------------------------------------------------------------------------
-- 2. conversation_participants
-- ---------------------------------------------------------------------------

create table if not exists public.conversation_participants (
  conversation_id uuid not null
    references public.conversations (id) on delete cascade,
  user_id uuid not null
    references auth.users (id) on delete cascade,
  role text not null default 'member'
    constraint conversation_participants_role_check
      check (role in ('member', 'admin', 'owner')),
  joined_at timestamptz not null default now(),
  -- Read-receipt architecture (V1 stores cursors; UI may not show them yet)
  last_read_at timestamptz,
  last_read_message_id uuid,
  unread_count integer not null default 0
    constraint conversation_participants_unread_nonnegative
      check (unread_count >= 0),
  is_muted boolean not null default false,
  is_archived boolean not null default false,
  -- Typing-ready architecture (clients may write typing_at; no UI requirement yet)
  typing_at timestamptz,
  primary key (conversation_id, user_id)
);

create index if not exists conversation_participants_user_id_idx
  on public.conversation_participants (user_id, is_archived, joined_at desc);

create index if not exists conversation_participants_conversation_id_idx
  on public.conversation_participants (conversation_id);

-- Inbox unread filtering for the current user
create index if not exists conversation_participants_user_unread_idx
  on public.conversation_participants (user_id, unread_count desc)
  where unread_count > 0;

alter table public.conversation_participants enable row level security;

-- ---------------------------------------------------------------------------
-- 3. direct_conversation_pairs — unique 1:1 lookup (normalized user order)
-- ---------------------------------------------------------------------------

create table if not exists public.direct_conversation_pairs (
  user_low uuid not null references auth.users (id) on delete cascade,
  user_high uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null unique
    references public.conversations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high),
  constraint direct_conversation_pairs_order check (user_low < user_high)
);

create index if not exists direct_conversation_pairs_conversation_id_idx
  on public.direct_conversation_pairs (conversation_id);

alter table public.direct_conversation_pairs enable row level security;

-- ---------------------------------------------------------------------------
-- 4. messages — extensible body + type for media/calls later
-- ---------------------------------------------------------------------------

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations (id) on delete cascade,
  sender_id uuid references auth.users (id) on delete set null,
  body text,
  message_type text not null default 'text'
    constraint messages_type_check
      check (
        message_type in (
          'text',
          'image',
          'video',
          'file',
          'audio',
          'system',
          'call'
        )
      ),
  reply_to_message_id uuid references public.messages (id) on delete set null,
  forwarded_from_message_id uuid references public.messages (id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_for text
    constraint messages_deleted_for_check
      check (
        deleted_for is null
        or deleted_for in ('sender', 'everyone')
      ),
  client_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint messages_text_body_check check (
    message_type is distinct from 'text'
    or (
      body is not null
      and char_length(btrim(body)) between 1 and 4000
      and body = btrim(body)
    )
  )
);

-- Cursor pagination: newest first within a conversation
create index if not exists messages_conversation_created_at_id_idx
  on public.messages (conversation_id, created_at desc, id desc);

create index if not exists messages_sender_id_created_at_idx
  on public.messages (sender_id, created_at desc);

-- Optimistic send idempotency
create unique index if not exists messages_conversation_sender_client_id_uidx
  on public.messages (conversation_id, sender_id, client_id)
  where client_id is not null and sender_id is not null;

alter table public.messages enable row level security;

-- FK for last_read_message_id (added after messages exists)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'conversation_participants_last_read_message_id_fkey'
  ) then
    alter table public.conversation_participants
      add constraint conversation_participants_last_read_message_id_fkey
      foreign key (last_read_message_id)
      references public.messages (id)
      on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. message_attachments — empty foundation for media/voice later
-- ---------------------------------------------------------------------------

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null
    references public.messages (id) on delete cascade,
  kind text not null
    constraint message_attachments_kind_check
      check (kind in ('image', 'video', 'file', 'audio')),
  storage_bucket text,
  storage_path text,
  mime_type text,
  byte_size bigint
    constraint message_attachments_byte_size_check
      check (byte_size is null or byte_size > 0),
  duration_ms integer
    constraint message_attachments_duration_check
      check (duration_ms is null or duration_ms >= 0),
  width integer
    constraint message_attachments_width_check
      check (width is null or width > 0),
  height integer
    constraint message_attachments_height_check
      check (height is null or height > 0),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint message_attachments_mime_type_length check (
    mime_type is null or char_length(mime_type) between 1 and 200
  ),
  constraint message_attachments_storage_path_length check (
    storage_path is null or char_length(storage_path) between 1 and 1024
  ),
  constraint message_attachments_storage_bucket_length check (
    storage_bucket is null or char_length(storage_bucket) between 1 and 128
  )
);

create index if not exists message_attachments_message_id_idx
  on public.message_attachments (message_id, sort_order);

alter table public.message_attachments enable row level security;

-- ---------------------------------------------------------------------------
-- 6. Helpers
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER avoids RLS recursion when policies call this helper.
create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_conversation_participant(uuid) from public;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

create or replace function public.trim_message_body()
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

drop trigger if exists messages_trim_body on public.messages;
create trigger messages_trim_body
  before insert or update of body on public.messages
  for each row execute function public.trim_message_body();

-- Soft-delete must not leave deleted content readable via SELECT.
create or replace function public.redact_soft_deleted_message()
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

drop trigger if exists messages_redact_soft_delete on public.messages;
create trigger messages_redact_soft_delete
  before update of deleted_at, body on public.messages
  for each row execute function public.redact_soft_deleted_message();

-- Reply / forward targets must stay inside the same conversation.
create or replace function public.validate_message_references()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.reply_to_message_id is not null then
    if not exists (
      select 1
      from public.messages m
      where m.id = new.reply_to_message_id
        and m.conversation_id = new.conversation_id
    ) then
      raise exception 'reply_to_message_id must reference the same conversation';
    end if;
  end if;

  if new.forwarded_from_message_id is not null then
    if not exists (
      select 1
      from public.messages m
      where m.id = new.forwarded_from_message_id
        and m.conversation_id = new.conversation_id
    ) then
      raise exception 'forwarded_from_message_id must reference the same conversation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists messages_validate_references on public.messages;
create trigger messages_validate_references
  before insert or update of reply_to_message_id, forwarded_from_message_id, conversation_id
  on public.messages
  for each row execute function public.validate_message_references();

-- last_read_message_id must belong to the same conversation.
create or replace function public.validate_participant_last_read()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.last_read_message_id is not null then
    if not exists (
      select 1
      from public.messages m
      where m.id = new.last_read_message_id
        and m.conversation_id = new.conversation_id
    ) then
      raise exception 'last_read_message_id must belong to the same conversation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists conversation_participants_validate_last_read
  on public.conversation_participants;
create trigger conversation_participants_validate_last_read
  before insert or update of last_read_message_id, conversation_id
  on public.conversation_participants
  for each row execute function public.validate_participant_last_read();

-- Direct pair rows may only point at direct conversations.
create or replace function public.validate_direct_conversation_pair()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.conversations c
    where c.id = new.conversation_id
      and c.kind = 'direct'
  ) then
    raise exception 'direct_conversation_pairs require a direct conversation';
  end if;

  return new;
end;
$$;

drop trigger if exists direct_conversation_pairs_validate_kind
  on public.direct_conversation_pairs;
create trigger direct_conversation_pairs_validate_kind
  before insert or update of conversation_id
  on public.direct_conversation_pairs
  for each row execute function public.validate_direct_conversation_pair();

-- Keep conversation preview / activity in sync on new messages
create or replace function public.sync_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preview text;
begin
  if tg_op = 'INSERT' and new.deleted_at is null then
    v_preview := case
      when new.message_type = 'text' then left(coalesce(new.body, ''), 180)
      when new.message_type = 'image' then 'Sent a photo'
      when new.message_type = 'video' then 'Sent a video'
      when new.message_type = 'audio' then 'Sent a voice message'
      when new.message_type = 'file' then 'Sent a file'
      when new.message_type = 'call' then 'Call'
      else 'New message'
    end;

    update public.conversations
    set
      last_message_at = new.created_at,
      last_message_preview = v_preview,
      updated_at = new.created_at
    where id = new.conversation_id;

    update public.conversation_participants
    set unread_count = unread_count + 1
    where conversation_id = new.conversation_id
      and user_id is distinct from new.sender_id;

    -- Sender has read their own outbound message
    update public.conversation_participants
    set
      last_read_at = new.created_at,
      last_read_message_id = new.id,
      unread_count = 0,
      typing_at = null
    where conversation_id = new.conversation_id
      and user_id = new.sender_id;
  end if;

  return new;
end;
$$;

drop trigger if exists messages_sync_conversation on public.messages;
create trigger messages_sync_conversation
  after insert on public.messages
  for each row execute function public.sync_conversation_on_message();

-- ---------------------------------------------------------------------------
-- 7. RLS — participants only; no anonymous access
-- ---------------------------------------------------------------------------

drop policy if exists "Participants can view conversations" on public.conversations;
create policy "Participants can view conversations"
  on public.conversations
  for select
  to authenticated
  using (public.is_conversation_participant(id));

-- Own participant row only: mute / archive / unread stay private.
drop policy if exists "Participants can view members" on public.conversation_participants;
drop policy if exists "Users can view own participant row" on public.conversation_participants;
create policy "Users can view own participant row"
  on public.conversation_participants
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can update own participant row" on public.conversation_participants;
create policy "Users can update own participant row"
  on public.conversation_participants
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Clients may only mutate mute/archive/typing directly.
-- unread / last_read are updated via SECURITY DEFINER RPCs and triggers.
revoke update on table public.conversation_participants from authenticated;
grant update (is_muted, is_archived, typing_at)
  on table public.conversation_participants
  to authenticated;

drop policy if exists "Pair members can view direct pairs" on public.direct_conversation_pairs;
create policy "Pair members can view direct pairs"
  on public.direct_conversation_pairs
  for select
  to authenticated
  using (
    (select auth.uid()) = user_low
    or (select auth.uid()) = user_high
  );

drop policy if exists "Participants can view messages" on public.messages;
create policy "Participants can view messages"
  on public.messages
  for select
  to authenticated
  using (public.is_conversation_participant(conversation_id));

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages
  for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and public.is_conversation_participant(conversation_id)
  );

drop policy if exists "Participants can view attachments" on public.message_attachments;
create policy "Participants can view attachments"
  on public.message_attachments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.messages m
      where m.id = message_id
        and public.is_conversation_participant(m.conversation_id)
    )
  );

-- No open INSERT on conversations / participants / pairs — use RPCs below.

-- ---------------------------------------------------------------------------
-- 8. RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_or_create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_low uuid;
  v_high uuid;
  v_conversation_id uuid;
  v_orphan_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_other_user_id is null or p_other_user_id = v_uid then
    raise exception 'Invalid conversation peer';
  end if;

  if not exists (select 1 from public.profiles where id = p_other_user_id) then
    raise exception 'User not found';
  end if;

  if p_other_user_id < v_uid then
    v_low := p_other_user_id;
    v_high := v_uid;
  else
    v_low := v_uid;
    v_high := p_other_user_id;
  end if;

  -- Serialize concurrent creates for the same canonical pair.
  perform pg_advisory_xact_lock(hashtext(v_low::text), hashtext(v_high::text));

  select conversation_id into v_conversation_id
  from public.direct_conversation_pairs
  where user_low = v_low and user_high = v_high;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (kind, created_by)
  values ('direct', v_uid)
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id, role)
  values
    (v_conversation_id, v_uid, 'member'),
    (v_conversation_id, p_other_user_id, 'member');

  begin
    insert into public.direct_conversation_pairs (user_low, user_high, conversation_id)
    values (v_low, v_high, v_conversation_id);
  exception
    when unique_violation then
      v_orphan_id := v_conversation_id;
      select conversation_id into v_conversation_id
      from public.direct_conversation_pairs
      where user_low = v_low and user_high = v_high;

      if v_orphan_id is distinct from v_conversation_id then
        delete from public.conversations where id = v_orphan_id;
      end if;
  end;

  select conversation_id into v_conversation_id
  from public.direct_conversation_pairs
  where user_low = v_low and user_high = v_high;

  return v_conversation_id;
end;
$$;

revoke all on function public.get_or_create_direct_conversation(uuid) from public;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

create or replace function public.mark_conversation_read(
  p_conversation_id uuid,
  p_message_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_message_id uuid := p_message_id;
  v_read_at timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = v_uid
  ) then
    raise exception 'Not a participant';
  end if;

  if v_message_id is null then
    select id into v_message_id
    from public.messages
    where conversation_id = p_conversation_id
      and deleted_at is null
    order by created_at desc, id desc
    limit 1;
  elsif not exists (
    select 1
    from public.messages
    where id = v_message_id
      and conversation_id = p_conversation_id
  ) then
    raise exception 'Message not found';
  end if;

  update public.conversation_participants
  set
    unread_count = 0,
    last_read_at = v_read_at,
    last_read_message_id = coalesce(v_message_id, last_read_message_id),
    typing_at = null
  where conversation_id = p_conversation_id
    and user_id = v_uid;
end;
$$;

revoke all on function public.mark_conversation_read(uuid, uuid) from public;
grant execute on function public.mark_conversation_read(uuid, uuid) to authenticated;

create or replace function public.set_conversation_typing(
  p_conversation_id uuid,
  p_is_typing boolean default true
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_conversation_participant(p_conversation_id) then
    raise exception 'Not a participant';
  end if;

  update public.conversation_participants
  set typing_at = case when p_is_typing then now() else null end
  where conversation_id = p_conversation_id
    and user_id = v_uid;
end;
$$;

revoke all on function public.set_conversation_typing(uuid, boolean) from public;
grant execute on function public.set_conversation_typing(uuid, boolean) to authenticated;

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
  v_limit integer := greatest(1, least(coalesce(p_limit, 40), 100));
begin
  if auth.uid() is null then
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
    m.created_at
  from public.messages m
  where m.conversation_id = p_conversation_id
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

-- Peer discovery without exposing mute / archive / unread of other participants.
create or replace function public.list_conversation_peers(p_conversation_ids uuid[])
returns table (
  conversation_id uuid,
  user_id uuid,
  role text,
  typing_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_conversation_ids is null or cardinality(p_conversation_ids) = 0 then
    return;
  end if;

  return query
  select
    cp.conversation_id,
    cp.user_id,
    cp.role,
    cp.typing_at
  from public.conversation_participants cp
  where cp.conversation_id = any (p_conversation_ids)
    and cp.user_id is distinct from v_uid
    and exists (
      select 1
      from public.conversation_participants me
      where me.conversation_id = cp.conversation_id
        and me.user_id = v_uid
    );
end;
$$;

revoke all on function public.list_conversation_peers(uuid[]) from public;
grant execute on function public.list_conversation_peers(uuid[]) to authenticated;
