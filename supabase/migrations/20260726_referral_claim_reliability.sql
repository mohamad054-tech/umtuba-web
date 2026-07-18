-- Referral claim reliability (Phase B4)
-- Reviewed and approved for invite-alpha. Apply manually in Supabase SQL Editor
-- after 20260722–20260725. Do not auto-apply from the Next.js app.
--
-- Changes:
-- 1) claim_my_referral_signup resolves pending attribution by visitor when
--    p_referral_code is null/empty (survives cookie loss within TTL).
-- 2) Rejects claims for accounts older than referral_attribution_ttl_days
--    (existing users opening an invite must not earn a new-signup reward).
-- 3) Returns stable machine reasons for the app claim coordinator.
--
-- Preserves: Growth Mode immediate award, fixed DB amounts, ledger dedupe,
-- self-referral skip, emergency daily cap, no client-chosen points.

create or replace function public.claim_my_referral_signup(
  p_referral_code text default null,
  p_anonymous_visitor_id text default null,
  p_ip_hash text default null,
  p_user_agent_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_referral_code, '')));
  v_visitor text := nullif(btrim(coalesce(p_anonymous_visitor_id, '')), '');
  v_ttl_days integer := public.um_points_config_value(
    'referral_attribution_ttl_days',
    30
  );
  v_created_at timestamptz;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  -- Resolve first-touch code from pending visitor attribution when cookie missing.
  if v_code = '' and v_visitor is not null then
    select a.referral_code into v_code
    from public.referral_attributions a
    where a.anonymous_visitor_id = v_visitor
      and a.status = 'pending'
      and a.expires_at > now()
    order by a.created_at asc
    limit 1;

    v_code := upper(btrim(coalesce(v_code, '')));
  end if;

  if v_code = '' or v_code !~ '^[A-Z0-9]{6,16}$' then
    if v_code <> '' and v_code !~ '^[A-Z0-9]{6,16}$' then
      return jsonb_build_object('ok', false, 'reason', 'invalid_code');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'no_pending_attribution');
  end if;

  -- New-signup window only (Growth Mode signup reward).
  select u.created_at into v_created_at
  from auth.users u
  where u.id = v_uid;

  if v_created_at is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_user');
  end if;

  if v_created_at < (now() - make_interval(days => greatest(1, v_ttl_days))) then
    perform public.record_referral_risk_signal(
      'existing_account_invite',
      null,
      v_uid,
      v_code,
      jsonb_build_object(
        'source', 'claim_my_referral_signup',
        'accountCreatedAt', v_created_at,
        'ttlDays', v_ttl_days
      )
    );
    return jsonb_build_object(
      'ok', false,
      'reason', 'not_eligible_existing_account'
    );
  end if;

  return public.complete_referral_signup(
    v_uid,
    v_code,
    v_visitor,
    p_ip_hash,
    p_user_agent_hash
  );
end;
$$;

revoke all on function public.claim_my_referral_signup(text, text, text, text) from public;
revoke all on function public.claim_my_referral_signup(text, text, text, text) from anon;
grant execute on function public.claim_my_referral_signup(text, text, text, text) to authenticated;

comment on function public.claim_my_referral_signup(text, text, text, text) is
  'Authenticated invitee claim. Resolves code from visitor attribution when needed; rejects accounts older than attribution TTL. Amounts fixed in complete_referral_signup.';
