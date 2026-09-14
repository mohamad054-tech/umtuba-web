select
  to_regclass('auth.users') is not null as auth_users_exists,
  to_regclass('public.communication_phone_identities') is not null as phone_identities_exists,
  to_regclass('public.communication_privacy_settings') is not null as privacy_settings_exists,
  to_regclass('public.communication_contact_sync_state') is not null as contact_sync_exists,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'extensions' and p.proname = 'digest'
  ) as extensions_digest_exists,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'comms_identity_digest'
  ) as comms_identity_digest_exists,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'discover_user_by_email'
  ) as discover_user_by_email_exists,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'discover_user_by_username'
  ) as discover_user_by_username_exists,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'discover_user_by_phone'
  ) as discover_user_by_phone_exists,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'ensure_own_communication_privacy'
  ) as ensure_own_communication_privacy_exists,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'bind_own_phone'
  ) as bind_own_phone_exists;
