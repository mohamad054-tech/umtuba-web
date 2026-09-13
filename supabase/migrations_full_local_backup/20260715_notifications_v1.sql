-- UMTUBA Notifications V1
-- Additive / idempotent. Apply after social + messenger + live foundation migrations.
-- Creates: profile_follows, notifications, comment parent_id, triggers, RPCs, realtime.

-- ---------------------------------------------------------------------------
-- 1. Follow graph (needed for follow + live_started notifications)
-- ---------------------------------------------------------------------------

create table if not exists public.profile_follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint profile_follows_no_self check (follower_id <> following_id)
);

create index if not exists profile_follows_following_id_created_at_idx
  on public.profile_follows (following_id, created_at desc);

create index if not exists profile_follows_follower_id_created_at_idx
  on public.profile_follows (follower_id, created_at desc);

alter table public.profile_follows enable row level security;

drop policy if exists "Follows are viewable by everyone" on public.profile_follows;
create policy "Follows are viewable by everyone"
  on public.profile_follows
  for select
  to authenticated, anon
  using (true);

drop policy if exists "Users can follow others" on public.profile_follows;
create policy "Users can follow others"
  on public.profile_follows
  for insert
  to authenticated
  with check ((select auth.uid()) = follower_id);

drop policy if exists "Users can unfollow" on public.profile_follows;
create policy "Users can unfollow"
  on public.profile_follows
  for delete
  to authenticated
  using ((select auth.uid()) = follower_id);

-- ---------------------------------------------------------------------------
-- 2. Comment replies (parent_id)
-- ---------------------------------------------------------------------------

alter table public.post_comments
  add column if not exists parent_id bigint references public.post_comments (id) on delete cascade;

create index if not exists post_comments_parent_id_idx
  on public.post_comments (parent_id)
  where parent_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Notifications table
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id text,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (
    type in (
      'follow',
      'post_like',
      'comment',
      'reply',
      'mention',
      'live_started',
      'direct_message'
    )
  ),
  constraint notifications_title_length check (
    char_length(btrim(title)) between 1 and 200
  )
);

create index if not exists notifications_recipient_created_at_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

create index if not exists notifications_actor_id_idx
  on public.notifications (actor_id);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their notifications" on public.notifications;
create policy "Users can view their notifications"
  on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = recipient_id);

drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications"
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

-- Inserts happen via SECURITY DEFINER helpers / triggers only.
revoke insert, delete on public.notifications from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Helpers
-- ---------------------------------------------------------------------------

create or replace function public.notification_actor_label(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(btrim(p.full_name), ''),
    nullif(btrim(p.username), ''),
    'Someone'
  )
  from public.profiles p
  where p.id = p_user_id;
$$;

create or replace function public.notification_profile_href(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.username is not null and btrim(p.username) <> ''
      then '/profile/' || lower(btrim(p.username))
    else '/discover'
  end
  from public.profiles p
  where p.id = p_user_id;
$$;

create or replace function public.create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_entity_type text default null,
  p_entity_id text default null,
  p_href text default null,
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
  if p_recipient_id is null then
    return null;
  end if;

  -- Never notify yourself.
  if p_actor_id is not null and p_actor_id = p_recipient_id then
    return null;
  end if;

  insert into public.notifications (
    recipient_id, actor_id, type, title, body,
    entity_type, entity_id, href, metadata
  )
  values (
    p_recipient_id,
    p_actor_id,
    p_type,
    btrim(p_title),
    nullif(btrim(coalesce(p_body, '')), ''),
    p_entity_type,
    p_entity_id,
    p_href,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_notification(
  uuid, uuid, text, text, text, text, text, text, jsonb
) from public;

-- ---------------------------------------------------------------------------
-- 5. Event triggers
-- ---------------------------------------------------------------------------

-- Follow
create or replace function public.notify_on_profile_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text := public.notification_actor_label(new.follower_id);
begin
  perform public.create_notification(
    new.following_id,
    new.follower_id,
    'follow',
    v_label || ' started following you',
    null,
    'profile',
    new.follower_id::text,
    public.notification_profile_href(new.follower_id),
    jsonb_build_object('followerId', new.follower_id)
  );
  return new;
end;
$$;

drop trigger if exists profile_follows_notify on public.profile_follows;
create trigger profile_follows_notify
  after insert on public.profile_follows
  for each row execute function public.notify_on_profile_follow();

-- Post like
create or replace function public.notify_on_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_label text := public.notification_actor_label(new.user_id);
begin
  select user_id into v_owner from public.posts where id = new.post_id;
  if v_owner is null then
    return new;
  end if;

  perform public.create_notification(
    v_owner,
    new.user_id,
    'post_like',
    v_label || ' liked your post',
    null,
    'post',
    new.post_id::text,
    '/discover?post=' || new.post_id::text,
    jsonb_build_object('postId', new.post_id)
  );
  return new;
end;
$$;

drop trigger if exists post_likes_notify on public.post_likes;
create trigger post_likes_notify
  after insert on public.post_likes
  for each row execute function public.notify_on_post_like();

-- Comment / reply / mentions
create or replace function public.notify_on_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_parent_author uuid;
  v_label text := public.notification_actor_label(new.user_id);
  v_snippet text := left(btrim(new.body), 120);
  v_mention text;
  v_mentioned_id uuid;
begin
  select user_id into v_owner from public.posts where id = new.post_id;

  if new.parent_id is not null then
    select user_id into v_parent_author
    from public.post_comments
    where id = new.parent_id;

    if v_parent_author is not null then
      perform public.create_notification(
        v_parent_author,
        new.user_id,
        'reply',
        v_label || ' replied to your comment',
        v_snippet,
        'comment',
        new.id::text,
        '/discover?post=' || new.post_id::text || '&comment=' || new.id::text,
        jsonb_build_object(
          'postId', new.post_id,
          'commentId', new.id,
          'parentId', new.parent_id
        )
      );
    end if;
  elsif v_owner is not null then
    perform public.create_notification(
      v_owner,
      new.user_id,
      'comment',
      v_label || ' commented on your post',
      v_snippet,
      'comment',
      new.id::text,
      '/discover?post=' || new.post_id::text || '&comment=' || new.id::text,
      jsonb_build_object('postId', new.post_id, 'commentId', new.id)
    );
  end if;

  -- Mentions: @username tokens in body
  for v_mention in
    select distinct m[1]
    from regexp_matches(new.body, '@([A-Za-z0-9_]{3,30})', 'g') as m
  loop
    select id into v_mentioned_id
    from public.profiles
    where lower(username) = lower(v_mention)
    limit 1;

    if v_mentioned_id is not null
       and v_mentioned_id is distinct from new.user_id
       and v_mentioned_id is distinct from v_owner
       and v_mentioned_id is distinct from v_parent_author then
      perform public.create_notification(
        v_mentioned_id,
        new.user_id,
        'mention',
        v_label || ' mentioned you',
        v_snippet,
        'comment',
        new.id::text,
        '/discover?post=' || new.post_id::text || '&comment=' || new.id::text,
        jsonb_build_object(
          'postId', new.post_id,
          'commentId', new.id,
          'username', v_mention
        )
      );
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists post_comments_notify on public.post_comments;
create trigger post_comments_notify
  after insert on public.post_comments
  for each row execute function public.notify_on_post_comment();

-- Direct message
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
  for r in
    select cp.user_id
    from public.conversation_participants cp
    where cp.conversation_id = new.conversation_id
      and cp.user_id is distinct from new.sender_id
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

drop trigger if exists messages_notify on public.messages;
create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_on_direct_message();

-- Live started by followed creator
create or replace function public.notify_on_live_started()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
  r record;
begin
  if tg_op = 'UPDATE'
     and old.status is distinct from 'live'
     and new.status = 'live' then
    v_label := public.notification_actor_label(new.host_id);

    for r in
      select follower_id
      from public.profile_follows
      where following_id = new.host_id
    loop
      perform public.create_notification(
        r.follower_id,
        new.host_id,
        'live_started',
        v_label || ' is live now',
        nullif(btrim(coalesce(new.title, '')), ''),
        'live_room',
        new.id::text,
        '/live/' || new.id::text,
        jsonb_build_object('roomId', new.id, 'title', new.title)
      );
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists live_rooms_notify_started on public.live_rooms;
create trigger live_rooms_notify_started
  after update of status on public.live_rooms
  for each row execute function public.notify_on_live_started();

-- ---------------------------------------------------------------------------
-- 6. Client RPCs
-- ---------------------------------------------------------------------------

create or replace function public.list_my_notifications(
  p_limit int default 20,
  p_before timestamptz default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit int := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(x) order by x."createdAt" desc)
      from (
        select
          n.id,
          n.type,
          n.title,
          n.body,
          n.entity_type as "entityType",
          n.entity_id as "entityId",
          n.href,
          n.metadata,
          n.read_at as "readAt",
          n.created_at as "createdAt",
          n.actor_id as "actorId",
          case
            when p.id is null then null
            else jsonb_build_object(
              'id', p.id,
              'username', p.username,
              'displayName', coalesce(
                nullif(btrim(p.full_name), ''),
                nullif(btrim(p.username), ''),
                'Someone'
              ),
              'avatarUrl', null,
              'avatarInitial', coalesce(
                nullif(btrim(p.avatar_initial), ''),
                upper(left(coalesce(p.username, 'U'), 1))
              )
            )
          end as actor
        from public.notifications n
        left join public.profiles p on p.id = n.actor_id
        where n.recipient_id = v_uid
          and (p_before is null or n.created_at < p_before)
        order by n.created_at desc
        limit v_limit
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.list_my_notifications(int, timestamptz) from public;
grant execute on function public.list_my_notifications(int, timestamptz) to authenticated;

create or replace function public.get_unread_notification_count()
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
begin
  if v_uid is null then
    return 0;
  end if;

  select count(*)::int into v_count
  from public.notifications
  where recipient_id = v_uid
    and read_at is null;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.get_unread_notification_count() from public;
grant execute on function public.get_unread_notification_count() to authenticated;

create or replace function public.mark_notification_read(p_id uuid)
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

  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_id
    and recipient_id = v_uid;
end;
$$;

revoke all on function public.mark_notification_read(uuid) from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.mark_all_notifications_read()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  with updated as (
    update public.notifications
    set read_at = now()
    where recipient_id = v_uid
      and read_at is null
    returning 1
  )
  select count(*)::int into v_count from updated;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.mark_all_notifications_read() from public;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- Follow helpers (so the product can create follow notifications)
create or replace function public.toggle_profile_follow(p_following_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_following boolean;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_following_id is null or p_following_id = v_uid then
    raise exception 'Invalid follow target';
  end if;

  if exists (
    select 1 from public.profile_follows
    where follower_id = v_uid and following_id = p_following_id
  ) then
    delete from public.profile_follows
    where follower_id = v_uid and following_id = p_following_id;
    v_following := false;
  else
    insert into public.profile_follows (follower_id, following_id)
    values (v_uid, p_following_id);
    v_following := true;
  end if;

  return jsonb_build_object('following', v_following);
end;
$$;

revoke all on function public.toggle_profile_follow(uuid) from public;
grant execute on function public.toggle_profile_follow(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception
    when duplicate_object then null;
  end;
end;
$$;

alter table public.notifications replica identity full;
