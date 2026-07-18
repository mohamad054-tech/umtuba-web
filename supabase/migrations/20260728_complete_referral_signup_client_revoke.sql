-- Complete referral signup client revoke (B4 follow-up)
-- Idempotent. Matches verified production: internal SECURITY DEFINER helper only.
-- Called from claim_my_referral_signup / signup trigger — never by anon/authenticated.
--
-- Apply after 20260726_referral_claim_reliability.sql when rebuilding an environment.
-- Safe to re-run if production already revoked these privileges.

revoke all on function public.complete_referral_signup(uuid, text, text, text, text) from public;
revoke all on function public.complete_referral_signup(uuid, text, text, text, text) from anon;
revoke all on function public.complete_referral_signup(uuid, text, text, text, text) from authenticated;

comment on function public.complete_referral_signup(uuid, text, text, text, text) is
  'Internal Growth Mode referral award helper. Not granted to anon/authenticated. Invoke only via claim_my_referral_signup or trusted triggers.';
