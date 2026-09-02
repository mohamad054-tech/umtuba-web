-- UMTUBA Communications V1 Part 1B — Identity + Discovery + Privacy
-- AUTHORIZED_MIGRATION_SCOPE = COMMUNICATIONS_IDENTITY_DISCOVERY_ONLY
-- Additive only. Separate from 20260935_rich_personal_profile_foundation_v1.sql.
-- Does NOT add phone/email to public.profiles.
-- Does NOT create groups, calls, RTC, message-media, friends, or communities.
-- Does NOT copy auth.users.email to any public table.
-- Local/dev apply only — never remote production from this task.
--
-- MUTE != BLOCK. Phone discovery fail-closes via existing
-- public.ugc_users_are_blocked (generic not-found). Email discovery is
-- unchanged. Message send still uses the 20260928 block trigger.
--
-- CONTACT_SYNC = FOUNDATION_ONLY. State + revoke only. No raw address book.
-- PHONE_VERIFICATION_RUNTIME = FOUNDATION_ONLY. phone_verified_at stays null
-- until a real OTP bind exists. Do not mark verified from this migration.
--
-- Hash pepper: required Vault secret named communications_identity_pepper.
-- Read only inside SECURITY DEFINER helpers via vault.decrypted_secrets.
-- This migration never inserts a pepper value. Operators create the named
-- secret out-of-band. If the secret is missing or empty, phone hash and
-- phone discovery fail closed and write no hash. There is no public
-- domain-separator fallback and no app.settings.comms_identity_pepper /
-- ALTER DATABASE pepper.

-- ---------------------------------------------------------------------------
-- 1. Internal digest (never granted to clients)
-- ---------------------------------------------------------------------------

-- Vault is INTERNAL only. Clients must never read secrets.
-- Do not revoke pgsodium/vault internals (permission denied on some hosts).
do $$
begin
  if to_regnamespace('vault') is null then
    raise exception 'vault schema is required for communications identity pepper';
  end if;

  revoke usage on schema vault from public, anon, authenticated;
  grant usage on schema vault to current_user;

  if to_regclass('vault.decrypted_secrets') is not null then
    execute 'revoke all on table vault.decrypted_secrets from public, anon, authenticated';
    execute 'grant select on table vault.decrypted_secrets to current_user';
  end if;
  if to_regclass('vault.secrets') is not null then
    execute 'revoke all on table vault.secrets from public, anon, authenticated';
  end if;

  begin
    execute 'revoke all on function vault.create_secret(text, text, text) from public, anon, authenticated';
  exception
    when undefined_function then
      null;
  end;
  begin
    execute 'revoke all on function vault.create_secret(text, text, text, uuid) from public, anon, authenticated';
  exception
    when undefined_function then
      null;
  end;
  begin
    execute 'revoke all on function vault.update_secret(uuid, text, text, text) from public, anon, authenticated';
  exception
    when undefined_function then
      null;
  end;
end;
$$;

create or replace function public.comms_identity_digest(p_normalized text)
returns text
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_pepper text;
  v_hash text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select ds.decrypted_secret
    into v_pepper
  from vault.decrypted_secrets as ds
  where ds.name = 'communications_identity_pepper'
  limit 1;

  if v_pepper is null or btrim(v_pepper) = '' then
    raise exception 'Communications identity pepper is not configured';
  end if;

  v_hash := encode(
    extensions.digest(
      convert_to(v_pepper || chr(31) || p_normalized, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
  v_pepper := null;
  return v_hash;
end;
$$;

comment on function public.comms_identity_digest(text) is
  'Internal Vault-peppered SHA-256. Reads named secret communications_identity_pepper from vault.decrypted_secrets. Fails closed if missing. Never expose to clients. Never returns the secret.';

revoke all on function public.comms_identity_digest(text) from public;
revoke all on function public.comms_identity_digest(text) from anon, authenticated, service_role;

create or replace function public.comms_normalize_email(p_email text)
returns text
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when p_email is null then null
    when btrim(p_email) = '' then null
    else lower(btrim(p_email))
  end;
$$;

revoke all on function public.comms_normalize_email(text) from public;
revoke all on function public.comms_normalize_email(text) from anon, authenticated;

create or replace function public.comms_normalize_e164(p_phone text)
returns text
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when p_phone is null then null
    when btrim(p_phone) ~ '^\+[1-9][0-9]{7,14}$' then btrim(p_phone)
    else null
  end;
$$;

revoke all on function public.comms_normalize_e164(text) from public;
revoke all on function public.comms_normalize_e164(text) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Private phone identity (owner-only). Never on public.profiles.
-- ---------------------------------------------------------------------------

create table if not exists public.communication_phone_identities (
  user_id uuid primary key references auth.users (id) on delete cascade,
  phone_e164 text not null,
  phone_e164_hash text not null,
  phone_country_code text not null,
  phone_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_phone_identities_e164_check check (
    phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  ),
  constraint communication_phone_identities_cc_check check (
    phone_country_code ~ '^\+[1-9][0-9]{0,3}$'
  ),
  constraint communication_phone_identities_hash_len check (
    char_length(phone_e164_hash) = 64
  )
);

create unique index if not exists communication_phone_identities_e164_uidx
  on public.communication_phone_identities (phone_e164);

create unique index if not exists communication_phone_identities_hash_uidx
  on public.communication_phone_identities (phone_e164_hash);

comment on table public.communication_phone_identities is
  'Person-to-person phone identity. Private. Not Store/Ads/World phones. Not public.profiles.';

comment on column public.communication_phone_identities.phone_verified_at is
  'Null until a real SMS/OTP bind exists. This migration never sets it.';

alter table public.communication_phone_identities enable row level security;
alter table public.communication_phone_identities force row level security;

drop policy if exists communication_phone_identities_owner_all
  on public.communication_phone_identities;
create policy communication_phone_identities_owner_all
  on public.communication_phone_identities
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.communication_phone_identities from public, anon;
-- Owner reads own row via RLS. Mutations go through bind/unbind RPCs only.
-- Direct INSERT/UPDATE would let a client set phone_verified_at without OTP.
revoke insert, update, delete on table public.communication_phone_identities
  from authenticated;
grant select on table public.communication_phone_identities to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Discovery privacy + prepared (unenforced) comms prefs
-- ---------------------------------------------------------------------------

create table if not exists public.communication_privacy_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  find_by_phone text not null default 'nobody',
  find_by_email text not null default 'nobody',
  who_can_message text not null default 'everyone',
  who_can_call text not null default 'nobody',
  read_receipts_enabled boolean not null default true,
  last_seen_visible text not null default 'nobody',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_privacy_find_phone_check check (
    find_by_phone in ('nobody', 'contacts', 'everyone')
  ),
  constraint communication_privacy_find_email_check check (
    find_by_email in ('nobody', 'everyone')
  ),
  constraint communication_privacy_who_message_check check (
    who_can_message in ('nobody', 'contacts', 'everyone')
  ),
  constraint communication_privacy_who_call_check check (
    who_can_call in ('nobody', 'contacts', 'everyone')
  ),
  constraint communication_privacy_last_seen_check check (
    last_seen_visible in ('nobody', 'contacts', 'everyone')
  )
);

comment on table public.communication_privacy_settings is
  'Discovery privacy. Email default nobody. Phone default nobody because contact-sync matching is not available. Connections is not a stored email option. who_can_message / who_can_call / read_receipts / last_seen are prepared storage only and are not enforced by messenger RPCs.';

comment on column public.communication_privacy_settings.find_by_phone is
  'nobody | contacts | everyone. contacts is stored but treated as nobody until verified contact-sync matching exists.';

alter table public.communication_privacy_settings enable row level security;
alter table public.communication_privacy_settings force row level security;

drop policy if exists communication_privacy_settings_owner_all
  on public.communication_privacy_settings;
create policy communication_privacy_settings_owner_all
  on public.communication_privacy_settings
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.communication_privacy_settings from public, anon;
grant select, insert, update, delete on table public.communication_privacy_settings
  to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Contact-sync foundation (no raw book, no hash dump product)
-- ---------------------------------------------------------------------------

create table if not exists public.communication_contact_sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  permission_granted_at timestamptz,
  sync_enabled boolean not null default false,
  last_sync_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.communication_contact_sync_state is
  'CONTACT_SYNC foundation. Explicit permission + revoke only. No raw address book. No contact hash upload in this part.';

alter table public.communication_contact_sync_state enable row level security;
alter table public.communication_contact_sync_state force row level security;

drop policy if exists communication_contact_sync_state_owner_all
  on public.communication_contact_sync_state;
create policy communication_contact_sync_state_owner_all
  on public.communication_contact_sync_state
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.communication_contact_sync_state from public, anon;
-- Permission/revoke only via RPCs. Clients must not flip sync_enabled.
revoke insert, update, delete on table public.communication_contact_sync_state
  from authenticated;
grant select on table public.communication_contact_sync_state to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Helpers: own privacy row, public identity
-- ---------------------------------------------------------------------------

create or replace function public.ensure_own_communication_privacy()
returns public.communication_privacy_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.communication_privacy_settings;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  insert into public.communication_privacy_settings (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  select * into v_row
  from public.communication_privacy_settings
  where user_id = v_uid;

  return v_row;
end;
$$;

revoke all on function public.ensure_own_communication_privacy() from public;
grant execute on function public.ensure_own_communication_privacy() to authenticated;

create or replace function public.comms_public_identity(p_user_id uuid)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.full_name), ''), p.username),
    p.avatar_url
  from public.profiles p
  where p.id = p_user_id
    and p.username is not null
    and btrim(p.username) <> '';
$$;

revoke all on function public.comms_public_identity(uuid) from public;
revoke all on function public.comms_public_identity(uuid) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Discovery RPCs — public identity only, generic not-found
-- ---------------------------------------------------------------------------

create or replace function public.discover_user_by_username(p_username text)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_key text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_key := lower(btrim(regexp_replace(coalesce(p_username, ''), '^@+', '')));
  if v_key is null or v_key !~ '^[a-z0-9._]{3,24}$' then
    return;
  end if;

  return query
  select i.user_id, i.username, i.display_name, i.avatar_url
  from public.profiles p
  join lateral public.comms_public_identity(p.id) i on true
  where p.username = v_key;
end;
$$;

comment on function public.discover_user_by_username(text) is
  'Signed-in username discovery. Returns public identity only.';

revoke all on function public.discover_user_by_username(text) from public;
grant execute on function public.discover_user_by_username(text) to authenticated;

create or replace function public.discover_user_by_email(p_email text)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_target uuid;
  v_find text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_email := public.comms_normalize_email(p_email);
  if v_email is null or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return;
  end if;

  -- Confirmed/eligible auth email only. Never select email into the result.
  select u.id into v_target
  from auth.users u
  where lower(btrim(u.email)) = v_email
    and u.email_confirmed_at is not null
  limit 1;

  if v_target is null then
    return;
  end if;

  insert into public.communication_privacy_settings (user_id)
  values (v_target)
  on conflict on constraint communication_privacy_settings_pkey do nothing;

  select s.find_by_email into v_find
  from public.communication_privacy_settings s
  where s.user_id = v_target;

  -- Default nobody. connections is not a stored value.
  if coalesce(v_find, 'nobody') <> 'everyone' then
    return;
  end if;

  return query
  select i.user_id, i.username, i.display_name, i.avatar_url
  from public.comms_public_identity(v_target) i;
end;
$$;

comment on function public.discover_user_by_email(text) is
  'Exact confirmed-email match inside SECURITY DEFINER. Returns public identity only. Same empty result for unknown and privacy-hidden.';

revoke all on function public.discover_user_by_email(text) from public;
grant execute on function public.discover_user_by_email(text) to authenticated;

create or replace function public.discover_user_by_phone(p_phone text)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_e164 text;
  v_hash text;
  v_target uuid;
  v_find text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_e164 := public.comms_normalize_e164(p_phone);
  if v_e164 is null then
    return;
  end if;

  v_hash := public.comms_identity_digest(v_e164);

  select i.user_id into v_target
  from public.communication_phone_identities i
  where i.phone_e164_hash = v_hash
    and i.phone_verified_at is not null
  limit 1;

  if v_target is null then
    return;
  end if;

  if public.ugc_users_are_blocked(v_uid, v_target) then
    return;
  end if;

  insert into public.communication_privacy_settings (user_id)
  values (v_target)
  on conflict on constraint communication_privacy_settings_pkey do nothing;

  select s.find_by_phone into v_find
  from public.communication_privacy_settings s
  where s.user_id = v_target;

  -- contacts is reserved until verified mutual contact-sync exists.
  if coalesce(v_find, 'nobody') <> 'everyone' then
    return;
  end if;

  return query
  select ident.user_id, ident.username, ident.display_name, ident.avatar_url
  from public.comms_public_identity(v_target) ident;
end;
$$;

comment on function public.discover_user_by_phone(text) is
  'Verified + everyone-privacy phone lookup. Vault pepper required. Never returns the number. Unverified, contacts-mode, missing pepper, and blocked pairs are not-found / fail-closed.';

revoke all on function public.discover_user_by_phone(text) from public;
grant execute on function public.discover_user_by_phone(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Own privacy / phone / contact-sync RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_own_communication_privacy()
returns public.communication_privacy_settings
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.ensure_own_communication_privacy();
end;
$$;

revoke all on function public.get_own_communication_privacy() from public;
grant execute on function public.get_own_communication_privacy() to authenticated;

create or replace function public.set_own_communication_privacy(
  p_find_by_phone text default null,
  p_find_by_email text default null,
  p_who_can_message text default null,
  p_who_can_call text default null,
  p_read_receipts_enabled boolean default null,
  p_last_seen_visible text default null
)
returns public.communication_privacy_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.communication_privacy_settings;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_find_by_phone is not null and p_find_by_phone not in ('nobody', 'contacts', 'everyone') then
    raise exception 'Invalid phone privacy';
  end if;
  if p_find_by_email is not null and p_find_by_email not in ('nobody', 'everyone') then
    raise exception 'Invalid email privacy';
  end if;
  if p_who_can_message is not null and p_who_can_message not in ('nobody', 'contacts', 'everyone') then
    raise exception 'Invalid message privacy';
  end if;
  if p_who_can_call is not null and p_who_can_call not in ('nobody', 'contacts', 'everyone') then
    raise exception 'Invalid call privacy';
  end if;
  if p_last_seen_visible is not null and p_last_seen_visible not in ('nobody', 'contacts', 'everyone') then
    raise exception 'Invalid last-seen privacy';
  end if;

  perform public.ensure_own_communication_privacy();

  update public.communication_privacy_settings
  set
    find_by_phone = coalesce(p_find_by_phone, find_by_phone),
    find_by_email = coalesce(p_find_by_email, find_by_email),
    who_can_message = coalesce(p_who_can_message, who_can_message),
    who_can_call = coalesce(p_who_can_call, who_can_call),
    read_receipts_enabled = coalesce(p_read_receipts_enabled, read_receipts_enabled),
    last_seen_visible = coalesce(p_last_seen_visible, last_seen_visible),
    updated_at = now()
  where user_id = v_uid
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.set_own_communication_privacy(text, text, text, text, boolean, text) from public;
grant execute on function public.set_own_communication_privacy(text, text, text, text, boolean, text)
  to authenticated;

create or replace function public.get_own_phone_identity()
returns table (
  phone_e164 text,
  phone_country_code text,
  phone_verified_at timestamptz,
  created_at timestamptz
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

  return query
  select i.phone_e164, i.phone_country_code, i.phone_verified_at, i.created_at
  from public.communication_phone_identities i
  where i.user_id = v_uid;
end;
$$;

revoke all on function public.get_own_phone_identity() from public;
grant execute on function public.get_own_phone_identity() to authenticated;

create or replace function public.bind_own_phone(
  p_phone_e164 text,
  p_country_code text
)
returns table (
  phone_e164 text,
  phone_country_code text,
  phone_verified_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_e164 text;
  v_cc text;
  v_hash text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_e164 := public.comms_normalize_e164(p_phone_e164);
  v_cc := btrim(coalesce(p_country_code, ''));

  if v_e164 is null or v_cc !~ '^\+[1-9][0-9]{0,3}$' or position(v_cc in v_e164) <> 1 then
    raise exception 'Invalid phone';
  end if;

  v_hash := public.comms_identity_digest(v_e164);

  -- Unique ownership. Generic error — do not reveal another account.
  if exists (
    select 1
    from public.communication_phone_identities i
    where i.phone_e164_hash = v_hash
      and i.user_id <> v_uid
  ) then
    raise exception 'Phone unavailable';
  end if;

  insert into public.communication_phone_identities (
    user_id,
    phone_e164,
    phone_e164_hash,
    phone_country_code,
    phone_verified_at
  )
  values (v_uid, v_e164, v_hash, v_cc, null)
  on conflict (user_id) do update
    set
      phone_e164 = excluded.phone_e164,
      phone_e164_hash = excluded.phone_e164_hash,
      phone_country_code = excluded.phone_country_code,
      phone_verified_at = null,
      updated_at = now();

  return query
  select i.phone_e164, i.phone_country_code, i.phone_verified_at
  from public.communication_phone_identities i
  where i.user_id = v_uid;
end;
$$;

comment on function public.bind_own_phone(text, text) is
  'Owner bind of an unverified E.164. Never sets phone_verified_at. OTP infra is not in this part.';

revoke all on function public.bind_own_phone(text, text) from public;
grant execute on function public.bind_own_phone(text, text) to authenticated;

create or replace function public.unbind_own_phone()
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

  delete from public.communication_phone_identities
  where user_id = v_uid;
end;
$$;

revoke all on function public.unbind_own_phone() from public;
grant execute on function public.unbind_own_phone() to authenticated;

create or replace function public.get_own_contact_sync_state()
returns public.communication_contact_sync_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.communication_contact_sync_state;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  insert into public.communication_contact_sync_state (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  select * into v_row
  from public.communication_contact_sync_state
  where user_id = v_uid;

  return v_row;
end;
$$;

revoke all on function public.get_own_contact_sync_state() from public;
grant execute on function public.get_own_contact_sync_state() to authenticated;

create or replace function public.set_own_contact_sync_permission(p_granted boolean)
returns public.communication_contact_sync_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.communication_contact_sync_state;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  insert into public.communication_contact_sync_state (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  if p_granted then
    update public.communication_contact_sync_state
    set
      permission_granted_at = coalesce(permission_granted_at, now()),
      sync_enabled = false,
      revoked_at = null,
      updated_at = now()
    where user_id = v_uid
    returning * into v_row;
  else
    update public.communication_contact_sync_state
    set
      permission_granted_at = null,
      sync_enabled = false,
      revoked_at = now(),
      updated_at = now()
    where user_id = v_uid
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

comment on function public.set_own_contact_sync_permission(boolean) is
  'Foundation permission / revoke. Does not upload contacts. sync_enabled stays false until a safe matcher exists.';

revoke all on function public.set_own_contact_sync_permission(boolean) from public;
grant execute on function public.set_own_contact_sync_permission(boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Defense in depth: clients cannot self-verify a phone
-- ---------------------------------------------------------------------------

create or replace function public.comms_phone_identity_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Future OTP bind may set app.comms_allow_phone_verify = 'on' inside a
  -- privileged DEFINER function. This part never sets that flag.
  if coalesce(current_setting('app.comms_allow_phone_verify', true), '') <> 'on' then
    if TG_OP = 'INSERT' then
      NEW.phone_verified_at := null;
    elsif TG_OP = 'UPDATE' then
      NEW.phone_verified_at := OLD.phone_verified_at;
    end if;
  end if;
  return NEW;
end;
$$;

comment on function public.comms_phone_identity_guard() is
  'Blocks client self-verify of phone_verified_at. OTP is not in this part.';

revoke all on function public.comms_phone_identity_guard() from public;
revoke all on function public.comms_phone_identity_guard() from anon, authenticated;

drop trigger if exists comms_phone_identity_guard_trg
  on public.communication_phone_identities;
create trigger comms_phone_identity_guard_trg
  before insert or update on public.communication_phone_identities
  for each row
  execute function public.comms_phone_identity_guard();
