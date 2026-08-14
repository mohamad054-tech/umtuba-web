-- UMTUBA UGC Safety: reports + blocks V1
-- Additive / idempotent. Fail-closed RLS. User JWT only (no service-role client).
--
-- Play UGC (9876937) requires in-app report of content and users, plus block,
-- for public social UGC and 1:1 Messages. This is the smallest server contract
-- for Android versionCode 4.
--
-- Do NOT apply to the remote Supabase project from Desktop.
-- Apply per docs/DEVELOPMENT_WORKFLOW.md (targeted migration; never supabase db push).

-- ---------------------------------------------------------------------------
-- 1. user_blocks
-- ---------------------------------------------------------------------------

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_not_self check (blocker_id <> blocked_id),
  constraint user_blocks_unique unique (blocker_id, blocked_id)
);

comment on table public.user_blocks is
  'Authenticated user-to-user blocks for Play UGC / messaging safety.';

create index if not exists user_blocks_blocker_idx
  on public.user_blocks (blocker_id, created_at desc);

create index if not exists user_blocks_blocked_idx
  on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;
alter table public.user_blocks force row level security;

revoke all on table public.user_blocks from public;
revoke all on table public.user_blocks from anon;
revoke all on table public.user_blocks from authenticated;

grant select, insert, delete on table public.user_blocks to authenticated;
grant all on table public.user_blocks to service_role;

drop policy if exists "Users read own block rows" on public.user_blocks;
create policy "Users read own block rows"
  on public.user_blocks
  for select
  to authenticated
  using (
    blocker_id = (select auth.uid())
    or blocked_id = (select auth.uid())
  );

drop policy if exists "Users insert own blocks" on public.user_blocks;
create policy "Users insert own blocks"
  on public.user_blocks
  for insert
  to authenticated
  with check (blocker_id = (select auth.uid()));

drop policy if exists "Users delete own blocks" on public.user_blocks;
create policy "Users delete own blocks"
  on public.user_blocks
  for delete
  to authenticated
  using (blocker_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. ugc_reports
-- ---------------------------------------------------------------------------

create table if not exists public.ugc_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null
    check (target_type in ('content', 'user')),
  target_user_id uuid references auth.users (id) on delete set null,
  target_post_id bigint,
  reason_code text not null
    check (
      reason_code in (
        'spam',
        'harassment',
        'hate',
        'sexual',
        'violence',
        'illegal',
        'impersonation',
        'other'
      )
    ),
  reason_detail text
    check (
      reason_detail is null
      or char_length(btrim(reason_detail)) between 1 and 1000
    ),
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint ugc_reports_target_shape check (
    (target_type = 'content' and target_post_id is not null)
    or (target_type = 'user' and target_user_id is not null)
  )
);

comment on table public.ugc_reports is
  'Authenticated UGC reports for Watch posts and users. Queued for operator review.';

create unique index if not exists ugc_reports_open_content_uidx
  on public.ugc_reports (reporter_id, target_post_id)
  where status = 'open' and target_type = 'content';

create unique index if not exists ugc_reports_open_user_uidx
  on public.ugc_reports (reporter_id, target_user_id)
  where status = 'open' and target_type = 'user';

create index if not exists ugc_reports_reporter_idx
  on public.ugc_reports (reporter_id, created_at desc);

create index if not exists ugc_reports_status_idx
  on public.ugc_reports (status, created_at desc);

alter table public.ugc_reports enable row level security;
alter table public.ugc_reports force row level security;

revoke all on table public.ugc_reports from public;
revoke all on table public.ugc_reports from anon;
revoke all on table public.ugc_reports from authenticated;

grant select, insert on table public.ugc_reports to authenticated;
grant all on table public.ugc_reports to service_role;

drop policy if exists "Users read own ugc reports" on public.ugc_reports;
create policy "Users read own ugc reports"
  on public.ugc_reports
  for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    or public.is_platform_admin()
  );

drop policy if exists "Users insert own ugc reports" on public.ugc_reports;
create policy "Users insert own ugc reports"
  on public.ugc_reports
  for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. Helpers
-- ---------------------------------------------------------------------------

create or replace function public.ugc_users_are_blocked(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_a is not null
    and p_b is not null
    and p_a <> p_b
    and exists (
      select 1
      from public.user_blocks b
      where (b.blocker_id = p_a and b.blocked_id = p_b)
         or (b.blocker_id = p_b and b.blocked_id = p_a)
    );
$$;

revoke all on function public.ugc_users_are_blocked(uuid, uuid) from public, anon;
grant execute on function public.ugc_users_are_blocked(uuid, uuid) to authenticated, service_role;

create or replace function public.ugc_reject_blocked_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_peer uuid;
begin
  select cp.user_id
    into v_peer
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.user_id is distinct from new.sender_id
  limit 1;

  if v_peer is not null and public.ugc_users_are_blocked(new.sender_id, v_peer) then
    raise exception 'Cannot message a blocked user'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists ugc_reject_blocked_message on public.messages;
create trigger ugc_reject_blocked_message
  before insert on public.messages
  for each row execute function public.ugc_reject_blocked_message();

-- ---------------------------------------------------------------------------
-- 4. RPCs (SECURITY DEFINER; auth.uid() only)
-- ---------------------------------------------------------------------------

create or replace function public.report_ugc_content(
  p_post_id bigint,
  p_reason_code text,
  p_reason_detail text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := lower(btrim(coalesce(p_reason_code, '')));
  v_detail text := nullif(btrim(coalesce(p_reason_detail, '')), '');
  v_author uuid;
  v_open integer;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if v_reason not in (
    'spam', 'harassment', 'hate', 'sexual', 'violence', 'illegal', 'impersonation', 'other'
  ) then
    raise exception 'Invalid reason'
      using errcode = '22023';
  end if;

  if v_detail is not null and char_length(v_detail) > 1000 then
    raise exception 'Reason detail is too long'
      using errcode = '22023';
  end if;

  select p.user_id into v_author
  from public.posts p
  where p.id = p_post_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  if v_author is not null and v_author = v_uid then
    raise exception 'Cannot report your own content'
      using errcode = '42501';
  end if;

  select count(*)::integer into v_open
  from public.ugc_reports r
  where r.reporter_id = v_uid
    and r.status = 'open'
    and r.created_at > now() - interval '24 hours';

  if v_open >= 20 then
    raise exception 'Too many reports'
      using errcode = '54000';
  end if;

  if exists (
    select 1
    from public.ugc_reports r
    where r.reporter_id = v_uid
      and r.target_type = 'content'
      and r.target_post_id = p_post_id
      and r.status = 'open'
  ) then
    raise exception 'Already reported'
      using errcode = '23505';
  end if;

  insert into public.ugc_reports (
    reporter_id, target_type, target_user_id, target_post_id, reason_code, reason_detail
  )
  values (v_uid, 'content', v_author, p_post_id, v_reason, v_detail)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.report_ugc_content(bigint, text, text) from public, anon;
grant execute on function public.report_ugc_content(bigint, text, text) to authenticated;

create or replace function public.report_ugc_user(
  p_user_id uuid,
  p_reason_code text,
  p_reason_detail text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := lower(btrim(coalesce(p_reason_code, '')));
  v_detail text := nullif(btrim(coalesce(p_reason_detail, '')), '');
  v_open integer;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'User not found'
      using errcode = 'P0002';
  end if;

  if p_user_id = v_uid then
    raise exception 'Cannot report yourself'
      using errcode = '42501';
  end if;

  if v_reason not in (
    'spam', 'harassment', 'hate', 'sexual', 'violence', 'illegal', 'impersonation', 'other'
  ) then
    raise exception 'Invalid reason'
      using errcode = '22023';
  end if;

  if v_detail is not null and char_length(v_detail) > 1000 then
    raise exception 'Reason detail is too long'
      using errcode = '22023';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'User not found'
      using errcode = 'P0002';
  end if;

  select count(*)::integer into v_open
  from public.ugc_reports r
  where r.reporter_id = v_uid
    and r.status = 'open'
    and r.created_at > now() - interval '24 hours';

  if v_open >= 20 then
    raise exception 'Too many reports'
      using errcode = '54000';
  end if;

  if exists (
    select 1
    from public.ugc_reports r
    where r.reporter_id = v_uid
      and r.target_type = 'user'
      and r.target_user_id = p_user_id
      and r.status = 'open'
  ) then
    raise exception 'Already reported'
      using errcode = '23505';
  end if;

  insert into public.ugc_reports (
    reporter_id, target_type, target_user_id, target_post_id, reason_code, reason_detail
  )
  values (v_uid, 'user', p_user_id, null, v_reason, v_detail)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.report_ugc_user(uuid, text, text) from public, anon;
grant execute on function public.report_ugc_user(uuid, text, text) to authenticated;

create or replace function public.block_ugc_user(p_user_id uuid)
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
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'User not found'
      using errcode = 'P0002';
  end if;

  if p_user_id = v_uid then
    raise exception 'Cannot block yourself'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'User not found'
      using errcode = 'P0002';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (v_uid, p_user_id)
  on conflict (blocker_id, blocked_id) do update
    set blocker_id = excluded.blocker_id
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.block_ugc_user(uuid) from public, anon;
grant execute on function public.block_ugc_user(uuid) to authenticated;

create or replace function public.unblock_ugc_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_deleted integer;
begin
  if v_uid is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  delete from public.user_blocks
  where blocker_id = v_uid
    and blocked_id = p_user_id;

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.unblock_ugc_user(uuid) from public, anon;
grant execute on function public.unblock_ugc_user(uuid) to authenticated;

create or replace function public.list_my_blocked_users()
returns table (
  user_id uuid,
  username text,
  display_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.blocked_id as user_id,
    p.username,
    coalesce(nullif(p.display_name, ''), nullif(p.full_name, ''), p.username) as display_name,
    b.created_at
  from public.user_blocks b
  left join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

revoke all on function public.list_my_blocked_users() from public, anon;
grant execute on function public.list_my_blocked_users() to authenticated;

create or replace function public.list_ugc_block_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(distinct other_id),
    '{}'::uuid[]
  )
  from (
    select blocked_id as other_id
    from public.user_blocks
    where blocker_id = auth.uid()
    union
    select blocker_id as other_id
    from public.user_blocks
    where blocked_id = auth.uid()
  ) pairs;
$$;

revoke all on function public.list_ugc_block_ids() from public, anon;
grant execute on function public.list_ugc_block_ids() to authenticated;
