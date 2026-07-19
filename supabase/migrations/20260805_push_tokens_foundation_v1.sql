-- UMTUBA Push Tokens Backend Foundation V1
-- Additive / idempotent. Fail-closed RLS. No push sending.
-- Supports mobile Expo registration via RLS (direct upsert/delete) and preferred RPCs.
-- Requires public.set_row_updated_at() from 20260728_store_product_foundation_v1.sql.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null
    check (platform in ('ios', 'android', 'web')),
  provider text not null default 'expo'
    check (provider in ('expo', 'apns', 'fcm')),
  token text not null
    check (char_length(btrim(token)) between 8 and 512),
  device_id text
    check (device_id is null or char_length(btrim(device_id)) between 1 and 128),
  device_name text
    check (device_name is null or char_length(btrim(device_name)) between 1 and 120),
  app_version text
    check (app_version is null or char_length(btrim(app_version)) between 1 and 64),
  os_version text
    check (os_version is null or char_length(btrim(os_version)) between 1 and 64),
  locale text
    check (locale is null or char_length(btrim(locale)) between 2 and 32),
  timezone text
    check (timezone is null or char_length(btrim(timezone)) between 1 and 64),
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.push_tokens is
  'Device push tokens for mobile/web clients. No send pipeline in V1.';

-- One physical token string maps to one row (mobile onConflict: token).
-- Direct client upsert/delete is own-row RLS only: an inactive token still owned by
-- another user cannot be claimed via onConflict upsert; use register_push_token instead.
create unique index if not exists push_tokens_token_uidx
  on public.push_tokens (token);

-- Prevent duplicate active tokens for the same user + device when device_id is set.
create unique index if not exists push_tokens_user_device_active_uidx
  on public.push_tokens (user_id, device_id)
  where is_active and device_id is not null;

create index if not exists push_tokens_user_id_idx
  on public.push_tokens (user_id);

create index if not exists push_tokens_user_active_idx
  on public.push_tokens (user_id, last_seen_at desc)
  where is_active;

create index if not exists push_tokens_provider_platform_idx
  on public.push_tokens (provider, platform)
  where is_active;

create index if not exists push_tokens_last_seen_at_idx
  on public.push_tokens (last_seen_at desc);

-- ---------------------------------------------------------------------------
-- 2. updated_at + re-activate on owner write after soft-deactivate
-- ---------------------------------------------------------------------------

-- Do not redefine set_row_updated_at(); it already exists from store foundation.
drop trigger if exists push_tokens_set_updated_at on public.push_tokens;
create trigger push_tokens_set_updated_at
  before update on public.push_tokens
  for each row execute function public.set_row_updated_at();

-- When an authenticated owner upserts/updates their own soft-deactivated row
-- without explicitly changing is_active, treat it as re-registration.
create or replace function public.push_tokens_reactivate_on_owner_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and auth.uid() is not null
     and auth.uid() = new.user_id
     and old.is_active = false
     and new.is_active = false then
    new.is_active := true;
  end if;

  if tg_op = 'UPDATE'
     and auth.uid() is not null
     and auth.uid() = new.user_id
     and new.is_active = true then
    new.last_seen_at := now();
  end if;

  if tg_op = 'INSERT'
     and new.last_seen_at is null then
    new.last_seen_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists push_tokens_reactivate_on_owner_write on public.push_tokens;
create trigger push_tokens_reactivate_on_owner_write
  before insert or update on public.push_tokens
  for each row execute function public.push_tokens_reactivate_on_owner_write();

-- ---------------------------------------------------------------------------
-- 3. RLS (fail-closed for anon; owners only; service_role bypasses RLS)
-- ---------------------------------------------------------------------------

alter table public.push_tokens enable row level security;

revoke all on table public.push_tokens from public;
revoke all on table public.push_tokens from anon;
grant select, insert, update, delete on table public.push_tokens to authenticated;
grant all on table public.push_tokens to service_role;

drop policy if exists "Users can read own push tokens" on public.push_tokens;
create policy "Users can read own push tokens"
  on public.push_tokens
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own push tokens" on public.push_tokens;
create policy "Users can insert own push tokens"
  on public.push_tokens
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own push tokens" on public.push_tokens;
create policy "Users can update own push tokens"
  on public.push_tokens
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own push tokens" on public.push_tokens;
create policy "Users can delete own push tokens"
  on public.push_tokens
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Note: Supabase service_role bypasses RLS. Table grant above remains for clarity.

-- ---------------------------------------------------------------------------
-- 4. RPCs
-- Ownership always from auth.uid() for authenticated callers.
-- Active tokens owned by another user cannot be taken over by authenticated clients.
-- Inactive foreign tokens may be reassigned (shared device after prior unregister).
-- ---------------------------------------------------------------------------

create or replace function public.register_push_token(
  p_token text,
  p_platform text,
  p_provider text default 'expo',
  p_device_id text default null,
  p_device_name text default null,
  p_app_version text default null,
  p_os_version text default null,
  p_locale text default null,
  p_timezone text default null
)
returns public.push_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_token text := nullif(btrim(p_token), '');
  v_platform text := lower(nullif(btrim(p_platform), ''));
  v_provider text := lower(nullif(btrim(coalesce(p_provider, 'expo')), ''));
  v_device_id text := nullif(btrim(p_device_id), '');
  v_existing public.push_tokens;
  v_row public.push_tokens;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_token is null or char_length(v_token) < 8 then
    raise exception 'Invalid push token';
  end if;

  if v_platform is null or v_platform not in ('ios', 'android', 'web') then
    raise exception 'Invalid platform';
  end if;

  if v_provider is null or v_provider not in ('expo', 'apns', 'fcm') then
    raise exception 'Invalid provider';
  end if;

  -- Soft-deactivate older active tokens for the same device on this user only.
  if v_device_id is not null then
    update public.push_tokens t
    set is_active = false,
        updated_at = now()
    where t.user_id = v_uid
      and t.device_id = v_device_id
      and t.is_active = true
      and t.token is distinct from v_token;
  end if;

  select * into v_existing
  from public.push_tokens t
  where t.token = v_token
  for update;

  if found then
    if v_existing.user_id = v_uid then
      -- Same user: refresh / reactivate safely.
      update public.push_tokens t
      set platform = v_platform,
          provider = v_provider,
          device_id = v_device_id,
          device_name = nullif(btrim(p_device_name), ''),
          app_version = nullif(btrim(p_app_version), ''),
          os_version = nullif(btrim(p_os_version), ''),
          locale = nullif(btrim(p_locale), ''),
          timezone = nullif(btrim(p_timezone), ''),
          is_active = true,
          last_seen_at = now(),
          updated_at = now()
      where t.id = v_existing.id
      returning * into v_row;
      return v_row;
    end if;

    if v_existing.is_active = false then
      -- Prior owner unregistered / soft-deactivated: safe shared-device reassignment.
      update public.push_tokens t
      set user_id = v_uid,
          platform = v_platform,
          provider = v_provider,
          device_id = v_device_id,
          device_name = nullif(btrim(p_device_name), ''),
          app_version = nullif(btrim(p_app_version), ''),
          os_version = nullif(btrim(p_os_version), ''),
          locale = nullif(btrim(p_locale), ''),
          timezone = nullif(btrim(p_timezone), ''),
          is_active = true,
          last_seen_at = now(),
          updated_at = now()
      where t.id = v_existing.id
        and t.is_active = false
      returning * into v_row;
      return v_row;
    end if;

    -- Active token still owned by another user: refuse takeover.
    raise exception
      'Push token is already active for another account'
      using errcode = 'P0001';
  end if;

  insert into public.push_tokens (
    user_id,
    platform,
    provider,
    token,
    device_id,
    device_name,
    app_version,
    os_version,
    locale,
    timezone,
    is_active,
    last_seen_at
  )
  values (
    v_uid,
    v_platform,
    v_provider,
    v_token,
    v_device_id,
    nullif(btrim(p_device_name), ''),
    nullif(btrim(p_app_version), ''),
    nullif(btrim(p_os_version), ''),
    nullif(btrim(p_locale), ''),
    nullif(btrim(p_timezone), ''),
    true,
    now()
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- Explicit active-token transfer: service_role only (never auth.uid() clients).
create or replace function public.transfer_active_push_token(
  p_token text,
  p_to_user_id uuid,
  p_platform text default null,
  p_provider text default null,
  p_device_id text default null
)
returns public.push_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text := nullif(btrim(p_token), '');
  v_row public.push_tokens;
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role' then
    raise exception 'Only service_role may transfer active push tokens'
      using errcode = '42501';
  end if;

  if v_token is null or char_length(v_token) < 8 then
    raise exception 'Invalid push token';
  end if;

  if p_to_user_id is null then
    raise exception 'Target user is required';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_to_user_id) then
    raise exception 'Target user not found';
  end if;

  update public.push_tokens t
  set user_id = p_to_user_id,
      platform = coalesce(lower(nullif(btrim(p_platform), '')), t.platform),
      provider = coalesce(lower(nullif(btrim(p_provider), '')), t.provider),
      device_id = coalesce(nullif(btrim(p_device_id), ''), t.device_id),
      is_active = true,
      last_seen_at = now(),
      updated_at = now()
  where t.token = v_token
  returning * into v_row;

  if not found then
    raise exception 'Push token not found';
  end if;

  return v_row;
end;
$$;

create or replace function public.unregister_push_token(
  p_token text,
  p_hard_delete boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_token text := nullif(btrim(p_token), '');
  v_count int := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_token is null then
    raise exception 'Invalid push token';
  end if;

  if coalesce(p_hard_delete, false) then
    delete from public.push_tokens t
    where t.user_id = v_uid
      and t.token = v_token;
    get diagnostics v_count = row_count;
    return v_count > 0;
  end if;

  update public.push_tokens t
  set is_active = false,
      updated_at = now()
  where t.user_id = v_uid
    and t.token = v_token
    and t.is_active = true;
  get diagnostics v_count = row_count;

  -- Idempotent logout cleanup: already-inactive still counts as success.
  if v_count = 0 then
    select count(*)::int into v_count
    from public.push_tokens t
    where t.user_id = v_uid
      and t.token = v_token;
    return v_count > 0;
  end if;

  return true;
end;
$$;

create or replace function public.touch_push_token(
  p_token text
)
returns public.push_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_token text := nullif(btrim(p_token), '');
  v_row public.push_tokens;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_token is null then
    raise exception 'Invalid push token';
  end if;

  update public.push_tokens t
  set last_seen_at = now(),
      is_active = true,
      updated_at = now()
  where t.user_id = v_uid
    and t.token = v_token
  returning * into v_row;

  if not found then
    raise exception 'Push token not found';
  end if;

  return v_row;
end;
$$;

revoke all on function public.register_push_token(
  text, text, text, text, text, text, text, text, text
) from public;
revoke all on function public.transfer_active_push_token(
  text, uuid, text, text, text
) from public;
revoke all on function public.unregister_push_token(text, boolean) from public;
revoke all on function public.touch_push_token(text) from public;

revoke all on function public.register_push_token(
  text, text, text, text, text, text, text, text, text
) from anon;
revoke all on function public.transfer_active_push_token(
  text, uuid, text, text, text
) from anon;
revoke all on function public.unregister_push_token(text, boolean) from anon;
revoke all on function public.touch_push_token(text) from anon;

grant execute on function public.register_push_token(
  text, text, text, text, text, text, text, text, text
) to authenticated;
grant execute on function public.unregister_push_token(text, boolean) to authenticated;
grant execute on function public.touch_push_token(text) to authenticated;

-- Authenticated must NOT execute transfer.
revoke all on function public.transfer_active_push_token(
  text, uuid, text, text, text
) from authenticated;
grant execute on function public.transfer_active_push_token(
  text, uuid, text, text, text
) to service_role;

grant execute on function public.register_push_token(
  text, text, text, text, text, text, text, text, text
) to service_role;
grant execute on function public.unregister_push_token(text, boolean) to service_role;
grant execute on function public.touch_push_token(text) to service_role;

comment on function public.register_push_token(
  text, text, text, text, text, text, text, text, text
) is
  'Register/refresh caller push token via auth.uid(). Refuses takeover of another user''s active token; may reassign inactive tokens.';

comment on function public.transfer_active_push_token(
  text, uuid, text, text, text
) is
  'service_role only. Explicitly transfer an active push token to another user.';

comment on function public.unregister_push_token(text, boolean) is
  'Logout cleanup: soft-deactivate (default) or hard-delete the caller''s push token.';

comment on function public.touch_push_token(text) is
  'Refresh last_seen_at for an existing caller-owned push token.';
