-- UMTUBA UGC operator moderation V1
-- Additive only. Fail-closed RLS. No seed rows.
-- Depends on: 20260928 (ugc_reports, user_blocks, is_platform_admin)
--             20260939 (posts.deleted_at, profiles.moderation_status)
--
-- Do NOT apply from this task.
-- Apply per docs/DEVELOPMENT_WORKFLOW.md (targeted migration; never supabase db push).

-- ---------------------------------------------------------------------------
-- 0) Ensure columns the RPCs write (idempotent if 20260939 already applied)
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists deleted_at timestamptz;

alter table public.profiles
  add column if not exists moderation_status text;

update public.profiles
set moderation_status = 'active'
where moderation_status is null;

alter table public.profiles
  alter column moderation_status set default 'active';

alter table public.profiles
  alter column moderation_status set not null;

alter table public.profiles
  drop constraint if exists profiles_moderation_status_check;

alter table public.profiles
  add constraint profiles_moderation_status_check
  check (moderation_status in ('active', 'shadowbanned', 'suspended', 'banned'));

-- ---------------------------------------------------------------------------
-- 1) ugc_reports operator columns
-- ---------------------------------------------------------------------------

alter table public.ugc_reports
  add column if not exists resolved_by uuid references auth.users (id) on delete set null;

alter table public.ugc_reports
  add column if not exists resolved_at timestamptz;

alter table public.ugc_reports
  add column if not exists operator_note text;

alter table public.ugc_reports
  drop constraint if exists ugc_reports_operator_note_len;

alter table public.ugc_reports
  add constraint ugc_reports_operator_note_len
  check (
    operator_note is null
    or char_length(btrim(operator_note)) between 1 and 2000
  );

-- ---------------------------------------------------------------------------
-- 2) moderation_actions — append-only operator log
-- ---------------------------------------------------------------------------

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users (id) on delete restrict,
  action text not null
    check (
      action in (
        'dismiss_report',
        'remove_post',
        'restore_post',
        'suspend_user',
        'shadowban_user',
        'ban_user',
        'reinstate_user'
      )
    ),
  target_user_id uuid references auth.users (id) on delete set null,
  target_post_id bigint,
  reason text,
  created_at timestamptz not null default now()
);

comment on table public.moderation_actions is
  'Platform-admin UGC actions. Written only by SECURITY DEFINER RPCs.';

create index if not exists moderation_actions_created_idx
  on public.moderation_actions (created_at desc);

create index if not exists moderation_actions_actor_idx
  on public.moderation_actions (actor_id, created_at desc);

create index if not exists moderation_actions_target_user_idx
  on public.moderation_actions (target_user_id)
  where target_user_id is not null;

create index if not exists moderation_actions_target_post_idx
  on public.moderation_actions (target_post_id)
  where target_post_id is not null;

alter table public.moderation_actions enable row level security;
alter table public.moderation_actions force row level security;

revoke all on table public.moderation_actions from public;
revoke all on table public.moderation_actions from anon;
revoke all on table public.moderation_actions from authenticated;

grant select on table public.moderation_actions to authenticated;
grant all on table public.moderation_actions to service_role;

drop policy if exists "Platform admins read moderation actions"
  on public.moderation_actions;
create policy "Platform admins read moderation actions"
  on public.moderation_actions
  for select
  to authenticated
  using (public.is_platform_admin((select auth.uid())));

-- ---------------------------------------------------------------------------
-- 3) Helpers
-- ---------------------------------------------------------------------------

create or replace function public.moderation_trim_note(p_note text, p_max integer)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_note is not null and char_length(v_note) > p_max then
    raise exception 'Note is too long'
      using errcode = '22023';
  end if;
  return v_note;
end;
$$;

revoke all on function public.moderation_trim_note(text, integer) from public, anon, authenticated;
grant execute on function public.moderation_trim_note(text, integer) to service_role;

create or replace function public.moderation_log_action(
  p_actor uuid,
  p_action text,
  p_target_user uuid,
  p_target_post bigint,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.moderation_actions (
    actor_id, action, target_user_id, target_post_id, reason
  )
  values (p_actor, p_action, p_target_user, p_target_post, p_reason)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.moderation_log_action(uuid, text, uuid, bigint, text)
  from public, anon, authenticated;
grant execute on function public.moderation_log_action(uuid, text, uuid, bigint, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 4) admin_list_ugc_reports — queue read (no internal post columns)
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_ugc_reports(
  p_status text default 'open',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  reporter_id uuid,
  reporter_username text,
  target_type text,
  target_user_id uuid,
  target_username text,
  target_post_id bigint,
  post_content text,
  post_author_username text,
  post_deleted_at timestamptz,
  reason_code text,
  reason_detail text,
  status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text := lower(btrim(coalesce(p_status, 'open')));
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if auth.uid() is null or not public.is_platform_admin(auth.uid()) then
    raise exception 'Platform admin required'
      using errcode = '42501';
  end if;

  if v_status not in ('open', 'reviewing', 'resolved', 'dismissed', 'all') then
    raise exception 'Invalid status'
      using errcode = '22023';
  end if;

  return query
  select
    r.id,
    r.reporter_id,
    nullif(rp.username, '') as reporter_username,
    r.target_type,
    r.target_user_id,
    nullif(tp.username, '') as target_username,
    r.target_post_id,
    case
      when p.id is null then null
      else left(btrim(coalesce(p.content, '')), 500)
    end as post_content,
    nullif(ap.username, '') as post_author_username,
    p.deleted_at as post_deleted_at,
    r.reason_code,
    r.reason_detail,
    r.status,
    r.created_at
  from public.ugc_reports r
  left join public.profiles rp on rp.id = r.reporter_id
  left join public.profiles tp on tp.id = r.target_user_id
  left join public.posts p on p.id = r.target_post_id
  left join public.profiles ap on ap.id = p.user_id
  where v_status = 'all' or r.status = v_status
  order by r.created_at desc
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.admin_list_ugc_reports(text, integer, integer)
  from public, anon;
grant execute on function public.admin_list_ugc_reports(text, integer, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 5) admin_resolve_ugc_report
-- ---------------------------------------------------------------------------

create or replace function public.admin_resolve_ugc_report(
  p_report_id uuid,
  p_new_status text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
  v_status text := lower(btrim(coalesce(p_new_status, '')));
  v_note text;
  v_row public.ugc_reports%rowtype;
begin
  if auth.uid() is null or not public.is_platform_admin(auth.uid()) then
    raise exception 'Platform admin required'
      using errcode = '42501';
  end if;
  v_admin := auth.uid();

  if v_status not in ('reviewing', 'resolved', 'dismissed') then
    raise exception 'Invalid status'
      using errcode = '22023';
  end if;

  v_note := public.moderation_trim_note(p_note, 2000);

  select * into v_row
  from public.ugc_reports
  where id = p_report_id;

  if not found then
    raise exception 'Report not found'
      using errcode = 'P0002';
  end if;

  update public.ugc_reports
  set
    status = v_status,
    operator_note = v_note,
    resolved_by = case
      when v_status in ('resolved', 'dismissed') then v_admin
      else resolved_by
    end,
    resolved_at = case
      when v_status in ('resolved', 'dismissed') then now()
      else resolved_at
    end
  where id = p_report_id;

  if v_status = 'dismissed' then
    perform public.moderation_log_action(
      v_admin,
      'dismiss_report',
      v_row.target_user_id,
      v_row.target_post_id,
      v_note
    );
  end if;

  return p_report_id;
end;
$$;

revoke all on function public.admin_resolve_ugc_report(uuid, text, text)
  from public, anon;
grant execute on function public.admin_resolve_ugc_report(uuid, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 6) admin_set_user_moderation_status
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_user_moderation_status(
  p_target_user_id uuid,
  p_new_status text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
  v_status text := lower(btrim(coalesce(p_new_status, '')));
  v_reason text;
  v_action text;
begin
  if auth.uid() is null or not public.is_platform_admin(auth.uid()) then
    raise exception 'Platform admin required'
      using errcode = '42501';
  end if;
  v_admin := auth.uid();

  if p_target_user_id is null then
    raise exception 'User not found'
      using errcode = 'P0002';
  end if;

  if p_target_user_id = v_admin then
    raise exception 'Cannot moderate your own account'
      using errcode = '42501';
  end if;

  if public.is_platform_admin(p_target_user_id) then
    raise exception 'Cannot moderate a platform admin'
      using errcode = '42501';
  end if;

  if v_status not in ('active', 'shadowbanned', 'suspended', 'banned') then
    raise exception 'Invalid status'
      using errcode = '22023';
  end if;

  v_reason := public.moderation_trim_note(p_reason, 2000);
  if v_reason is null then
    raise exception 'Reason is required'
      using errcode = '22023';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_target_user_id) then
    raise exception 'User not found'
      using errcode = 'P0002';
  end if;

  update public.profiles
  set moderation_status = v_status
  where id = p_target_user_id;

  v_action := case v_status
    when 'active' then 'reinstate_user'
    when 'shadowbanned' then 'shadowban_user'
    when 'suspended' then 'suspend_user'
    when 'banned' then 'ban_user'
  end;

  return public.moderation_log_action(
    v_admin,
    v_action,
    p_target_user_id,
    null,
    v_reason
  );
end;
$$;

revoke all on function public.admin_set_user_moderation_status(uuid, text, text)
  from public, anon;
grant execute on function public.admin_set_user_moderation_status(uuid, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 7) admin_takedown_post / admin_restore_post
-- ---------------------------------------------------------------------------

create or replace function public.admin_takedown_post(
  p_post_id bigint,
  p_reason text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
  v_reason text;
  v_author uuid;
begin
  if auth.uid() is null or not public.is_platform_admin(auth.uid()) then
    raise exception 'Platform admin required'
      using errcode = '42501';
  end if;
  v_admin := auth.uid();

  v_reason := public.moderation_trim_note(p_reason, 2000);
  if v_reason is null then
    raise exception 'Reason is required'
      using errcode = '22023';
  end if;

  select p.user_id into v_author
  from public.posts p
  where p.id = p_post_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  update public.posts
  set deleted_at = now()
  where id = p_post_id;

  perform public.moderation_log_action(
    v_admin,
    'remove_post',
    v_author,
    p_post_id,
    v_reason
  );

  return p_post_id;
end;
$$;

revoke all on function public.admin_takedown_post(bigint, text) from public, anon;
grant execute on function public.admin_takedown_post(bigint, text) to authenticated;

create or replace function public.admin_restore_post(
  p_post_id bigint,
  p_reason text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
  v_reason text;
  v_author uuid;
begin
  if auth.uid() is null or not public.is_platform_admin(auth.uid()) then
    raise exception 'Platform admin required'
      using errcode = '42501';
  end if;
  v_admin := auth.uid();

  v_reason := public.moderation_trim_note(p_reason, 2000);
  if v_reason is null then
    raise exception 'Reason is required'
      using errcode = '22023';
  end if;

  select p.user_id into v_author
  from public.posts p
  where p.id = p_post_id;

  if not found then
    raise exception 'Content not found'
      using errcode = 'P0002';
  end if;

  update public.posts
  set deleted_at = null
  where id = p_post_id;

  perform public.moderation_log_action(
    v_admin,
    'restore_post',
    v_author,
    p_post_id,
    v_reason
  );

  return p_post_id;
end;
$$;

revoke all on function public.admin_restore_post(bigint, text) from public, anon;
grant execute on function public.admin_restore_post(bigint, text) to authenticated;
