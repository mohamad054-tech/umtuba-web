-- UMTUBA Social Interactions V1: likes, comments, saves, shares, views
-- Additive only. Safe to re-run. Does not drop existing tables or data.
-- Apply in Supabase SQL Editor after 20260713_video_posts_v1.sql.
--
-- Security notes (V1):
-- - Like/save toggles are SECURITY INVOKER (RLS applies; identity from auth.uid()).
-- - Share/view RPCs are SECURITY DEFINER with locked search_path; table access denied.
-- - Authenticated share/view keys are forced to u:{auth.uid()} (client cannot spoof).
-- - Anonymous share/view keys must be d:{uuid}; 1h share / 6h view dedupe windows.
-- - Post counter columns cannot be edited by clients (trigger-gated).

-- ---------------------------------------------------------------------------
-- 1. Denormalized counters on posts (saves + views; likes/comments/shares exist)
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists saves integer not null default 0,
  add column if not exists views integer not null default 0;

alter table public.posts
  drop constraint if exists posts_saves_nonnegative_check;

alter table public.posts
  add constraint posts_saves_nonnegative_check
  check (saves >= 0);

alter table public.posts
  drop constraint if exists posts_views_nonnegative_check;

alter table public.posts
  add constraint posts_views_nonnegative_check
  check (views >= 0);

alter table public.posts
  drop constraint if exists posts_likes_nonnegative_check;

alter table public.posts
  add constraint posts_likes_nonnegative_check
  check (likes >= 0);

alter table public.posts
  drop constraint if exists posts_comments_nonnegative_check;

alter table public.posts
  add constraint posts_comments_nonnegative_check
  check (comments >= 0);

alter table public.posts
  drop constraint if exists posts_shares_nonnegative_check;

alter table public.posts
  add constraint posts_shares_nonnegative_check
  check (shares >= 0);

-- Block clients from rewriting denormalized counters on posts they own.
create or replace function public.protect_post_interaction_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('umtuba.allow_counter_sync', true), '') = 'on' then
    return new;
  end if;

  if new.likes is distinct from old.likes
     or new.comments is distinct from old.comments
     or new.shares is distinct from old.shares
     or new.saves is distinct from old.saves
     or new.views is distinct from old.views then
    raise exception 'Post interaction counters are read-only';
  end if;

  return new;
end;
$$;

drop trigger if exists posts_protect_interaction_counters on public.posts;
create trigger posts_protect_interaction_counters
  before update on public.posts
  for each row execute function public.protect_post_interaction_counters();

-- ---------------------------------------------------------------------------
-- 2. post_likes — one like per user per post
-- ---------------------------------------------------------------------------

create table if not exists public.post_likes (
  post_id bigint not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_likes_user_id_created_at_idx
  on public.post_likes (user_id, created_at desc);

create index if not exists post_likes_post_id_idx
  on public.post_likes (post_id);

alter table public.post_likes enable row level security;

-- Own likes only — do not publish the full liker graph.
drop policy if exists "Likes are viewable by everyone" on public.post_likes;
drop policy if exists "Users can view their own likes" on public.post_likes;
create policy "Users can view their own likes"
  on public.post_likes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can like posts" on public.post_likes;
create policy "Users can like posts"
  on public.post_likes
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.posts p where p.id = post_id)
  );

drop policy if exists "Users can unlike their own likes" on public.post_likes;
create policy "Users can unlike their own likes"
  on public.post_likes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 3. post_comments — ordered newest first; delete own only
-- ---------------------------------------------------------------------------

create table if not exists public.post_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint post_comments_body_length check (
    char_length(body) between 1 and 500
  ),
  constraint post_comments_body_trimmed check (
    body = btrim(body)
  )
);

create index if not exists post_comments_post_id_created_at_idx
  on public.post_comments (post_id, created_at desc);

create index if not exists post_comments_user_id_idx
  on public.post_comments (user_id);

alter table public.post_comments enable row level security;

create or replace function public.trim_post_comment_body()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.body := btrim(new.body);
  return new;
end;
$$;

drop trigger if exists post_comments_trim_body on public.post_comments;
create trigger post_comments_trim_body
  before insert or update of body on public.post_comments
  for each row execute function public.trim_post_comment_body();

drop policy if exists "Comments are viewable by everyone" on public.post_comments;
create policy "Comments are viewable by everyone"
  on public.post_comments
  for select
  using (
    exists (select 1 from public.posts p where p.id = post_id)
  );

drop policy if exists "Users can create comments" on public.post_comments;
create policy "Users can create comments"
  on public.post_comments
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.posts p where p.id = post_id)
  );

drop policy if exists "Users can delete their own comments" on public.post_comments;
create policy "Users can delete their own comments"
  on public.post_comments
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- No UPDATE policy: comments are immutable after create (except denied).

-- ---------------------------------------------------------------------------
-- 4. post_saves — personal saved collection
-- ---------------------------------------------------------------------------

create table if not exists public.post_saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id bigint not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists post_saves_user_id_created_at_idx
  on public.post_saves (user_id, created_at desc);

create index if not exists post_saves_post_id_idx
  on public.post_saves (post_id);

alter table public.post_saves enable row level security;

drop policy if exists "Users can view their own saves" on public.post_saves;
create policy "Users can view their own saves"
  on public.post_saves
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can save posts" on public.post_saves;
create policy "Users can save posts"
  on public.post_saves
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.posts p where p.id = post_id)
  );

drop policy if exists "Users can unsave their own saves" on public.post_saves;
create policy "Users can unsave their own saves"
  on public.post_saves
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 5. post_shares — deduped share ledger (count on posts.shares)
-- ---------------------------------------------------------------------------

-- Replace open-ended event log if an older draft shape already exists.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'post_shares'
      and column_name = 'id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'post_shares'
      and column_name = 'viewer_key'
  ) then
    drop table public.post_shares cascade;
  end if;
end $$;

create table if not exists public.post_shares (
  post_id bigint not null references public.posts (id) on delete cascade,
  viewer_key text not null,
  user_id uuid references auth.users (id) on delete set null,
  last_shared_at timestamptz not null default now(),
  primary key (post_id, viewer_key),
  constraint post_shares_viewer_key_length check (
    char_length(viewer_key) between 8 and 128
  ),
  constraint post_shares_viewer_key_format check (
    viewer_key ~ '^(u|d):[0-9a-fA-F-]{8,122}$'
  )
);

create index if not exists post_shares_last_shared_at_idx
  on public.post_shares (last_shared_at desc);

create index if not exists post_shares_user_id_idx
  on public.post_shares (user_id)
  where user_id is not null;

alter table public.post_shares enable row level security;

-- RPC-only access (no direct client SELECT/INSERT/UPDATE/DELETE policies).
drop policy if exists "Share events are viewable by everyone" on public.post_shares;
drop policy if exists "Anyone can record a share event" on public.post_shares;
drop policy if exists "Users can view their own share events" on public.post_shares;

-- ---------------------------------------------------------------------------
-- 6. post_views — one counted view per viewer_key within a time window
-- ---------------------------------------------------------------------------

create table if not exists public.post_views (
  post_id bigint not null references public.posts (id) on delete cascade,
  viewer_key text not null,
  last_viewed_at timestamptz not null default now(),
  primary key (post_id, viewer_key),
  constraint post_views_viewer_key_length check (
    char_length(viewer_key) between 8 and 128
  ),
  constraint post_views_viewer_key_format check (
    viewer_key ~ '^(u|d):[0-9a-fA-F-]{8,122}$'
  )
);

create index if not exists post_views_last_viewed_at_idx
  on public.post_views (last_viewed_at desc);

alter table public.post_views enable row level security;

-- Direct table access denied; use record_post_view() RPC.
drop policy if exists "No direct select on post views" on public.post_views;
drop policy if exists "No direct insert on post views" on public.post_views;
drop policy if exists "No direct update on post views" on public.post_views;
drop policy if exists "No direct delete on post views" on public.post_views;

-- ---------------------------------------------------------------------------
-- 7. Counter sync triggers (likes, comments, saves)
-- ---------------------------------------------------------------------------

create or replace function public.sync_post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('umtuba.allow_counter_sync', 'on', true);

  if tg_op = 'INSERT' then
    update public.posts
    set likes = likes + 1
    where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts
    set likes = greatest(likes - 1, 0)
    where id = old.post_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists post_likes_count_sync on public.post_likes;
create trigger post_likes_count_sync
  after insert or delete on public.post_likes
  for each row execute function public.sync_post_likes_count();

create or replace function public.sync_post_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('umtuba.allow_counter_sync', 'on', true);

  if tg_op = 'INSERT' then
    update public.posts
    set comments = comments + 1
    where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts
    set comments = greatest(comments - 1, 0)
    where id = old.post_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists post_comments_count_sync on public.post_comments;
create trigger post_comments_count_sync
  after insert or delete on public.post_comments
  for each row execute function public.sync_post_comments_count();

create or replace function public.sync_post_saves_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('umtuba.allow_counter_sync', 'on', true);

  if tg_op = 'INSERT' then
    update public.posts
    set saves = saves + 1
    where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts
    set saves = greatest(saves - 1, 0)
    where id = old.post_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists post_saves_count_sync on public.post_saves;
create trigger post_saves_count_sync
  after insert or delete on public.post_saves
  for each row execute function public.sync_post_saves_count();

-- Shares/views increment inside their RPCs (with allow_counter_sync), not triggers.

drop trigger if exists post_shares_count_sync on public.post_shares;
drop function if exists public.sync_post_shares_count();

-- ---------------------------------------------------------------------------
-- 8. RPCs
-- ---------------------------------------------------------------------------

-- Resolve a safe viewer key: auth users always keyed by auth.uid().
-- Anonymous callers may only supply d:{uuid}.
create or replace function public.resolve_interaction_viewer_key(p_viewer_key text)
returns text
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_key text := btrim(coalesce(p_viewer_key, ''));
begin
  if v_uid is not null then
    return 'u:' || v_uid::text;
  end if;

  if v_key ~ '^d:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return lower(v_key);
  end if;

  raise exception 'Invalid viewer key';
end;
$$;

revoke all on function public.resolve_interaction_viewer_key(text) from public;
revoke all on function public.resolve_interaction_viewer_key(text) from anon, authenticated;
-- Callable only by privileged owners / nested SECURITY DEFINER RPCs.

create or replace function public.toggle_post_like(p_post_id bigint)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_liked boolean;
  v_count integer;
  v_deleted integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.posts
    where id = p_post_id
  ) then
    raise exception 'Post not found';
  end if;

  delete from public.post_likes
  where post_id = p_post_id
    and user_id = v_uid;

  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    v_liked := false;
  else
    insert into public.post_likes (post_id, user_id)
    values (p_post_id, v_uid)
    on conflict (post_id, user_id) do nothing;

    -- Concurrency-safe: report actual row presence after the race.
    v_liked := exists (
      select 1
      from public.post_likes
      where post_id = p_post_id
        and user_id = v_uid
    );
  end if;

  select likes into v_count from public.posts where id = p_post_id;

  return jsonb_build_object(
    'liked', v_liked,
    'likes', coalesce(v_count, 0)
  );
end;
$$;

revoke all on function public.toggle_post_like(bigint) from public;
grant execute on function public.toggle_post_like(bigint) to authenticated;

create or replace function public.toggle_post_save(p_post_id bigint)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_saved boolean;
  v_count integer;
  v_deleted integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.posts
    where id = p_post_id
  ) then
    raise exception 'Post not found';
  end if;

  delete from public.post_saves
  where post_id = p_post_id
    and user_id = v_uid;

  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    v_saved := false;
  else
    insert into public.post_saves (user_id, post_id)
    values (v_uid, p_post_id)
    on conflict (user_id, post_id) do nothing;

    v_saved := exists (
      select 1
      from public.post_saves
      where post_id = p_post_id
        and user_id = v_uid
    );
  end if;

  select saves into v_count from public.posts where id = p_post_id;

  return jsonb_build_object(
    'saved', v_saved,
    'saves', coalesce(v_count, 0)
  );
end;
$$;

revoke all on function public.toggle_post_save(bigint) from public;
grant execute on function public.toggle_post_save(bigint) to authenticated;

-- Deduped share recording (1-hour window). Anonymous allowed with device key only.
create or replace function public.record_post_share(
  p_post_id bigint,
  p_viewer_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_key text;
  v_window interval := interval '1 hour';
  v_prev timestamptz;
  v_counted boolean := false;
  v_count integer;
  v_inserted integer;
begin
  v_key := public.resolve_interaction_viewer_key(p_viewer_key);

  if not exists (select 1 from public.posts where id = p_post_id) then
    raise exception 'Post not found';
  end if;

  -- Serialize per post+viewer to avoid double-count races.
  perform pg_advisory_xact_lock(
    hashtext('post_share:' || p_post_id::text || ':' || v_key)
  );

  select last_shared_at into v_prev
  from public.post_shares
  where post_id = p_post_id
    and viewer_key = v_key;

  if v_prev is null then
    insert into public.post_shares (post_id, viewer_key, user_id, last_shared_at)
    values (p_post_id, v_key, v_uid, now())
    on conflict (post_id, viewer_key) do nothing;

    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      perform set_config('umtuba.allow_counter_sync', 'on', true);
      update public.posts set shares = shares + 1 where id = p_post_id;
      v_counted := true;
    end if;
  elsif now() - v_prev >= v_window then
    update public.post_shares
    set last_shared_at = now(),
        user_id = coalesce(v_uid, user_id)
    where post_id = p_post_id
      and viewer_key = v_key
      and last_shared_at = v_prev;

    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      perform set_config('umtuba.allow_counter_sync', 'on', true);
      update public.posts set shares = shares + 1 where id = p_post_id;
      v_counted := true;
    end if;
  end if;

  select shares into v_count from public.posts where id = p_post_id;

  return jsonb_build_object(
    'counted', v_counted,
    'shares', coalesce(v_count, 0)
  );
end;
$$;

-- Drop older single-arg overload if present.
drop function if exists public.record_post_share(bigint);

revoke all on function public.record_post_share(bigint, text) from public;
grant execute on function public.record_post_share(bigint, text) to anon, authenticated;

-- Deduped view recording (6-hour window).
create or replace function public.record_post_view(
  p_post_id bigint,
  p_viewer_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_window interval := interval '6 hours';
  v_prev timestamptz;
  v_counted boolean := false;
  v_count integer;
  v_inserted integer;
begin
  v_key := public.resolve_interaction_viewer_key(p_viewer_key);

  if not exists (select 1 from public.posts where id = p_post_id) then
    raise exception 'Post not found';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('post_view:' || p_post_id::text || ':' || v_key)
  );

  select last_viewed_at into v_prev
  from public.post_views
  where post_id = p_post_id
    and viewer_key = v_key;

  if v_prev is null then
    insert into public.post_views (post_id, viewer_key, last_viewed_at)
    values (p_post_id, v_key, now())
    on conflict (post_id, viewer_key) do nothing;

    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      perform set_config('umtuba.allow_counter_sync', 'on', true);
      update public.posts set views = views + 1 where id = p_post_id;
      v_counted := true;
    end if;
  elsif now() - v_prev >= v_window then
    update public.post_views
    set last_viewed_at = now()
    where post_id = p_post_id
      and viewer_key = v_key
      and last_viewed_at = v_prev;

    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      perform set_config('umtuba.allow_counter_sync', 'on', true);
      update public.posts set views = views + 1 where id = p_post_id;
      v_counted := true;
    end if;
  end if;

  select views into v_count from public.posts where id = p_post_id;

  return jsonb_build_object(
    'counted', v_counted,
    'views', coalesce(v_count, 0)
  );
end;
$$;

revoke all on function public.record_post_view(bigint, text) from public;
grant execute on function public.record_post_view(bigint, text) to anon, authenticated;
