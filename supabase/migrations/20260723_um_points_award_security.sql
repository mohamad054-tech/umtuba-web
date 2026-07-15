-- UM Points award security (Phase A1)
-- Additive hardening: authenticated/anon clients must not call generic award RPCs
-- or choose arbitrary points / reason / recipient / dedupe_key.
--
-- Trusted writers remain SECURITY DEFINER internals that call
-- public.award_um_points_to_user(...) from triggers and fixed-rule claim RPCs
-- (welcome bonus, referral claim, social/activity automation). Amounts and
-- reasons come from um_points_config / hardcoded event rules — never from
-- client RPC arguments on a generic award surface.
--
-- Does NOT modify balances, ledger rows, or reward amounts.

-- ---------------------------------------------------------------------------
-- 1. Harden generic self-award wrapper (defense in depth)
-- ---------------------------------------------------------------------------

create or replace function public.award_um_points(
  p_points integer,
  p_reason text,
  p_dedupe_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Parameters intentionally ignored: this entry point is retired for clients.
  raise exception 'UM Points awards are not available via client RPC'
    using errcode = '42501';
end;
$$;

revoke all on function public.award_um_points(integer, text, text, jsonb) from public;
revoke all on function public.award_um_points(integer, text, text, jsonb) from anon;
revoke all on function public.award_um_points(integer, text, text, jsonb) from authenticated;
-- No GRANT to anon/authenticated. Service role / table owners may still
-- execute if needed for ops; product awards must use award_um_points_to_user
-- from trusted SECURITY DEFINER callers only.

comment on function public.award_um_points(integer, text, text, jsonb) is
  'Retired client entry point. Always raises. Use award_um_points_to_user from trusted DEFINER flows only.';

-- ---------------------------------------------------------------------------
-- 2. Re-assert privileges on the internal award helper
-- ---------------------------------------------------------------------------

revoke all on function public.award_um_points_to_user(uuid, integer, text, text, jsonb, integer) from public;
revoke all on function public.award_um_points_to_user(uuid, integer, text, text, jsonb, integer) from anon;
revoke all on function public.award_um_points_to_user(uuid, integer, text, text, jsonb, integer) from authenticated;

comment on function public.award_um_points_to_user(uuid, integer, text, text, jsonb, integer) is
  'Internal UM Points writer. Not granted to anon/authenticated. Called only by trusted SECURITY DEFINER triggers and fixed-rule claim RPCs.';

-- ---------------------------------------------------------------------------
-- 3. Re-assert ledger / balance table write lockdown (read RLS unchanged)
-- ---------------------------------------------------------------------------

revoke insert, update, delete on public.um_point_balances from anon, authenticated;
revoke insert, update, delete on public.um_points_ledger from anon, authenticated;

-- SELECT policies remain owner-only as defined in 20260716_notifications_v2.sql.
