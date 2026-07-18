-- UMTUBA Messenger Production Phase 2
-- Additive only. Safe to re-run. Does not drop existing tables or data.
-- Apply manually in Supabase SQL Editor. Do NOT auto-apply from the app.
--
-- Adds: message reactions, delete-for-me hides, timed mute, edit/delete RPCs,
-- mute-aware DM notifications, Realtime publication for messenger tables.
-- Preserves soft-delete rows (no hard-delete of messages needed for replies/receipts).

-- ---------------------------------------------------------------------------
-- 1. Timed mute on participants
-- ---------------------------------------------------------------------------

alter table public.conversation_participants
  add column if not exists muted_until timestamptz;

comment on column public.conversation_participants.muted_until is
  'When is_muted and muted_until is null: muted until manually unmuted. '
  'When is_muted and muted_until is set: muted until that timestamp. '
  'Unread counters and messages continue normally while muted.';

-- Clients may update mute columns directly (own-row RLS). Prefer set_conversation_mute RPC.
revoke update on table public.conversation_participants from authenticated;
grant update (is_muted, muted_until, is_archived, typing_at)
  on table public.conversation_participants
  to authenticated;

create or replace function public.is_conversation_muted_for_user(
  p_conversation_id uuid,
  p_user_id uuid default auth.uid()
)
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
      and cp.user_id = p_user_id
      and cp.is_muted = true
      and (cp.muted_until is null or cp.muted_until > now())
  );
$$;

revoke all on function public.is_conversation_muted_for_user(uuid, uuid) from public;
grant execute on function public.is_conversation_muted_for_user(uuid, uuid) to authenticated;

create or replace function public.set_conversation_mute(
  p_conversation_id uuid,
  p_mute_option text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_option text := lower(btrim(coalesce(p_mute_option, '')));
  v_is_muted boolean := false;
  v_until timestamptz := null;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_conversation_participant(p_conversation_id) then
    raise exception 'Not a participant';
  end if;

  if v_option in ('off', 'unmute', 'none') then
    v_is_muted := false;
    v_until := null;
  elsif v_option in ('1h', '1_hour', 'hour') then
    v_is_muted := true;
    v_until := now() + interval '1 hour';
  elsif v_option in ('8h', '8_hours') then
    v_is_muted := true;
    v_until := now() + interval '8 hours';
  elsif v_option in ('1w', '1_week', 'week') then
    v_is_muted := true;
    v_until := now() + interval '1 week';
  elsif v_option in ('forever', 'until_enabled', 'manual') then
    v_is_muted := true;
    v_until := null;
  else
    raise exception 'Invalid mute option';
  end if;

  update public.conversation_participants
  set
    is_muted = v_is_muted,
    muted_until = v_until
  where conversation_id = p_conversation_id
    and user_id = v_uid;
end;
$$;

revoke all on function public.set_conversation_mute(uuid, text) from public;
grant execute on function public.set_conversation_mute(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Delete for me — per-user hide (keeps message row for replies/receipts)
-- ---------------------------------------------------------------------------

create table if not exists public.message_hides (
  message_id uuid not null
    references public.messages (id) on delete cascade,
  user_id uuid not null
    references auth.users (id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists message_hides_user_id_idx
  on public.message_hides (user_id, hidden_at desc);

alter table public.message_hides enable row level security;

drop policy if exists "Users can view own message hides" on public.message_hides;
create policy "Users can view own message hides"
  on public.message_hides
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can hide messages for themselves" on public.message_hides;
create policy "Users can hide messages for themselves"
  on public.message_hides
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.messages m
      where m.id = message_id
        and public.is_conversation_participant(m.conversation_id)
    )
  );

drop policy if exists "Users can unhide own message hides" on public.message_hides;
create policy "Users can unhide own message hides"
  on public.message_hides
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on table public.message_hides from anon;
-- authenticated inserts/deletes via RLS policies above

create or replace function public.hide_message_for_me(p_message_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select m.conversation_id into v_conversation_id
  from public.messages m
  where m.id = p_message_id;

  if v_conversation_id is null then
    raise exception 'Message not found';
  end if;

  if not public.is_conversation_participant(v_conversation_id) then
    raise exception 'Not a participant';
  end if;

  insert into public.message_hides (message_id, user_id)
  values (p_message_id, v_uid)
  on conflict (message_id, user_id) do nothing;
end;
$$;

revoke all on function public.hide_message_for_me(uuid) from public;
grant execute on function public.hide_message_for_me(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Soft-delete for everyone + edit (SECURITY DEFINER; no open UPDATE)
-- ---------------------------------------------------------------------------

create or replace function public.edit_own_text_message(
  p_message_id uuid,
  p_body text
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.messages;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if char_length(v_body) < 1 or char_length(v_body) > 4000 then
    raise exception 'Invalid message body';
  end if;

  select * into v_row
  from public.messages m
  where m.id = p_message_id
  for update;

  if not found then
    raise exception 'Message not found';
  end if;

  if v_row.sender_id is distinct from v_uid then
    raise exception 'Only the sender can edit this message';
  end if;

  if not public.is_conversation_participant(v_row.conversation_id) then
    raise exception 'Not a participant';
  end if;

  if v_row.deleted_at is not null then
    raise exception 'Deleted messages cannot be edited';
  end if;

  if v_row.message_type is distinct from 'text' then
    raise exception 'Only text messages can be edited';
  end if;

  if exists (
    select 1 from public.message_attachments a where a.message_id = p_message_id
  ) then
    raise exception 'Messages with attachments cannot be edited';
  end if;

  update public.messages
  set
    body = v_body,
    edited_at = now()
  where id = p_message_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.edit_own_text_message(uuid, text) from public;
grant execute on function public.edit_own_text_message(uuid, text) to authenticated;

create or replace function public.soft_delete_message_for_everyone(p_message_id uuid)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.messages;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_row
  from public.messages m
  where m.id = p_message_id
  for update;

  if not found then
    raise exception 'Message not found';
  end if;

  if v_row.sender_id is distinct from v_uid then
    raise exception 'Only the sender can delete this message for everyone';
  end if;

  if not public.is_conversation_participant(v_row.conversation_id) then
    raise exception 'Not a participant';
  end if;

  if v_row.deleted_at is not null then
    return v_row;
  end if;

  update public.messages
  set
    deleted_at = now(),
    deleted_for = 'everyone',
    body = null
  where id = p_message_id
  returning * into v_row;

  -- Keep conversation preview honest when the last message is deleted.
  update public.conversations c
  set
    last_message_preview = 'Message deleted',
    updated_at = now()
  where c.id = v_row.conversation_id
    and c.last_message_at is not distinct from v_row.created_at;

  return v_row;
end;
$$;

revoke all on function public.soft_delete_message_for_everyone(uuid) from public;
grant execute on function public.soft_delete_message_for_everyone(uuid) to authenticated;

-- No direct client UPDATE/DELETE on messages — mutations go through RPCs.
revoke update, delete on table public.messages from authenticated, anon;

-- ---------------------------------------------------------------------------
-- 4. Message reactions
-- ---------------------------------------------------------------------------

create table if not exists public.message_reactions (
  message_id uuid not null
    references public.messages (id) on delete cascade,
  user_id uuid not null
    references auth.users (id) on delete cascade,
  emoji text not null
    constraint message_reactions_emoji_check
      check (emoji in ('👍', '❤️', '😂', '😮', '😢')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create index if not exists message_reactions_message_id_idx
  on public.message_reactions (message_id, created_at desc);

create index if not exists message_reactions_user_id_idx
  on public.message_reactions (user_id, created_at desc);

alter table public.message_reactions enable row level security;

drop policy if exists "Participants can view message reactions"
  on public.message_reactions;
create policy "Participants can view message reactions"
  on public.message_reactions
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

drop policy if exists "Participants can add own reactions"
  on public.message_reactions;
create policy "Participants can add own reactions"
  on public.message_reactions
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.messages m
      where m.id = message_id
        and m.deleted_at is null
        and public.is_conversation_participant(m.conversation_id)
    )
  );

drop policy if exists "Users can remove own reactions"
  on public.message_reactions;
create policy "Users can remove own reactions"
  on public.message_reactions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke update on table public.message_reactions from authenticated, anon;

create or replace function public.toggle_message_reaction(
  p_message_id uuid,
  p_emoji text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_emoji text := btrim(coalesce(p_emoji, ''));
  v_conversation_id uuid;
  v_deleted_at timestamptz;
  v_removed boolean := false;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_emoji not in ('👍', '❤️', '😂', '😮', '😢') then
    raise exception 'Invalid reaction';
  end if;

  select m.conversation_id, m.deleted_at
  into v_conversation_id, v_deleted_at
  from public.messages m
  where m.id = p_message_id;

  if v_conversation_id is null then
    raise exception 'Message not found';
  end if;

  if not public.is_conversation_participant(v_conversation_id) then
    raise exception 'Not a participant';
  end if;

  if v_deleted_at is not null then
    raise exception 'Cannot react to a deleted message';
  end if;

  delete from public.message_reactions
  where message_id = p_message_id
    and user_id = v_uid
    and emoji = v_emoji;

  if found then
    v_removed := true;
  else
    insert into public.message_reactions (message_id, user_id, emoji)
    values (p_message_id, v_uid, v_emoji);
  end if;

  return jsonb_build_object(
    'messageId', p_message_id,
    'emoji', v_emoji,
    'removed', v_removed,
    'userId', v_uid
  );
end;
$$;

revoke all on function public.toggle_message_reaction(uuid, text) from public;
grant execute on function public.toggle_message_reaction(uuid, text) to authenticated;

create or replace function public.list_message_reactions(
  p_conversation_id uuid,
  p_message_ids uuid[] default null
)
returns table (
  message_id uuid,
  emoji text,
  count bigint,
  reacted_by_me boolean
)
language plpgsql
stable
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

  return query
  select
    r.message_id,
    r.emoji,
    count(*)::bigint as count,
    bool_or(r.user_id = v_uid) as reacted_by_me
  from public.message_reactions r
  join public.messages m on m.id = r.message_id
  where m.conversation_id = p_conversation_id
    and m.deleted_at is null
    and (
      p_message_ids is null
      or cardinality(p_message_ids) = 0
      or r.message_id = any (p_message_ids)
    )
  group by r.message_id, r.emoji
  order by r.message_id, r.emoji;
end;
$$;

revoke all on function public.list_message_reactions(uuid, uuid[]) from public;
grant execute on function public.list_message_reactions(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. List messages — exclude delete-for-me hides; keep soft-deleted placeholders
-- ---------------------------------------------------------------------------

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
    m.created_at
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
-- 6. Mute-aware direct message notifications
-- ---------------------------------------------------------------------------

create or replace function public.notify_on_direct_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text := public.notification_actor_label(new.sender_id);
  v_snippet text := left(btrim(coalesce(new.body, 'Sent an attachment')), 120);
  r record;
begin
  -- Skip system / already-deleted inserts
  if new.message_type = 'system' or new.deleted_at is not null then
    return new;
  end if;

  for r in
    select cp.user_id
    from public.conversation_participants cp
    where cp.conversation_id = new.conversation_id
      and cp.user_id is distinct from new.sender_id
      and not (
        cp.is_muted = true
        and (cp.muted_until is null or cp.muted_until > now())
      )
  loop
    perform public.create_notification(
      r.user_id,
      new.sender_id,
      'direct_message',
      v_label || ' sent you a message',
      v_snippet,
      'conversation',
      new.conversation_id::text,
      '/messages?conversation=' || new.conversation_id::text,
      jsonb_build_object(
        'conversationId', new.conversation_id,
        'messageId', new.id
      )
    );
  end loop;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Peer read cursors for Sent / Delivered / Seen (no mute/unread leakage)
-- ---------------------------------------------------------------------------

-- Return-type change requires drop (additive column: last_read_at).
drop function if exists public.list_conversation_peers(uuid[]);

create or replace function public.list_conversation_peers(p_conversation_ids uuid[])
returns table (
  conversation_id uuid,
  user_id uuid,
  role text,
  typing_at timestamptz,
  last_read_at timestamptz
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
    cp.typing_at,
    cp.last_read_at
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

-- ---------------------------------------------------------------------------
-- 8. Realtime publication (idempotent)
-- ---------------------------------------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.message_reactions;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.conversation_participants;
  exception
    when duplicate_object then null;
  end;
end;
$$;
