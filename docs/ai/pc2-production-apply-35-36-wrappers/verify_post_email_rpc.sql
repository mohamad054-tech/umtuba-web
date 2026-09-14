select
  pg_get_functiondef('public.discover_user_by_email(text)'::regprocedure) like '%on constraint communication_privacy_settings_pkey%' as uses_named_pkey,
  pg_get_functiondef('public.discover_user_by_email(text)'::regprocedure) like '%on conflict (user_id)%' as uses_user_id_conflict,
  pg_get_functiondef('public.comms_identity_digest(text)'::regprocedure) like '%vault.decrypted_secrets%' as digest_reads_vault,
  pg_get_functiondef('public.comms_identity_digest(text)'::regprocedure) like '%communications_identity_pepper%' as digest_uses_pepper_name,
  pg_get_functiondef('public.discover_user_by_phone(text)'::regprocedure) like '%comms_identity_digest%' as phone_uses_digest;
