-- Referral Rewards V1 — Growth Mode (launch window ~2–3 months)
-- Additive / idempotent. Apply after 20260721_activity_tiers_event_wiring.sql.
--
-- Credits inviters immediately on successful account creation.
-- Does not aggressively block duplicate accounts; records risk signals silently.
-- Emergency rate limit only (per-inviter daily conversion cap).

-- ---------------------------------------------------------------------------
-- 1. Config
-- ---------------------------------------------------------------------------

insert into public.um_points_config (key, value, description)
values
  ('referral_signup', 20, 'UM Points credited to inviter on referred signup (Growth Mode)'),
  ('referral_attribution_ttl_days', 30, 'Days to keep first-touch referral attribution'),
  ('referral_growth_mode', 1, '1 = Growth Mode (immediate signup credit, permissive)'),
  ('referral_emergency_daily_cap_per_inviter', 100, 'Max rewarded referral conversions per inviter per UTC day'),
  ('referral_milestone_5', 0, 'Bonus at 5 referrals (0 = disabled)'),
  ('referral_milestone_10', 0, 'Bonus at 10 referrals (0 = disabled)'),
  ('referral_milestone_25', 0, 'Bonus at 25 referrals (0 = disabled)')
on conflict (key) do update
  set description = excluded.description;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint referral_codes_code_format check (
    code ~ '^[A-Z0-9]{6,16}$'
  ),
  constraint referral_codes_code_unique unique (code)
);

create unique index if not exists referral_codes_one_active_per_user_idx
  on public.referral_codes (user_id)
  where is_active = true;

create index if not exists referral_codes_user_id_idx
  on public.referral_codes (user_id);

alter table public.referral_codes enable row level security;

drop policy if exists "Users can view own referral codes" on public.referral_codes;
create policy "Users can view own referral codes"
  on public.referral_codes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.referral_codes from anon, authenticated;

create table if not exists public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users (id) on delete cascade,
  referral_code text not null,
  anonymous_visitor_id text,
  landing_path text,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  converted_user_id uuid references auth.users (id) on delete set null,
  status text not null default 'pending'
    constraint referral_attributions_status_check check (
      status in ('pending', 'converted', 'expired', 'superseded')
    )
);

create index if not exists referral_attributions_code_created_idx
  on public.referral_attributions (referral_code, created_at desc);

create index if not exists referral_attributions_anon_idx
  on public.referral_attributions (anonymous_visitor_id, created_at desc)
  where anonymous_visitor_id is not null;

create index if not exists referral_attributions_referrer_idx
  on public.referral_attributions (referrer_user_id, created_at desc);

alter table public.referral_attributions enable row level security;

revoke all on public.referral_attributions from anon, authenticated;

create table if not exists public.referral_conversions (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users (id) on delete cascade,
  referred_user_id uuid not null references auth.users (id) on delete cascade,
  referral_code text not null,
  attribution_id uuid references public.referral_attributions (id) on delete set null,
  points_awarded integer not null default 0
    constraint referral_conversions_points_nonneg check (points_awarded >= 0),
  status text not null default 'rewarded'
    constraint referral_conversions_status_check check (
      status in ('rewarded', 'skipped_self', 'skipped_rate_limit', 'skipped_inactive')
    ),
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  constraint referral_conversions_referred_unique unique (referred_user_id),
  constraint referral_conversions_dedupe_unique unique (dedupe_key),
  constraint referral_conversions_no_self check (referrer_user_id <> referred_user_id)
);

create index if not exists referral_conversions_referrer_created_idx
  on public.referral_conversions (referrer_user_id, created_at desc);

alter table public.referral_conversions enable row level security;

drop policy if exists "Users can view own referral conversions" on public.referral_conversions;
create policy "Users can view own referral conversions"
  on public.referral_conversions
  for select
  to authenticated
  using (
    (select auth.uid()) = referrer_user_id
    or (select auth.uid()) = referred_user_id
  );

revoke insert, update, delete on public.referral_conversions from anon, authenticated;

create table if not exists public.referral_risk_signals (
  id uuid primary key default gen_random_uuid(),
  signal_type text not null,
  referrer_user_id uuid references auth.users (id) on delete set null,
  referred_user_id uuid references auth.users (id) on delete set null,
  referral_code text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists referral_risk_signals_created_idx
  on public.referral_risk_signals (created_at desc);

create index if not exists referral_risk_signals_referrer_idx
  on public.referral_risk_signals (referrer_user_id, created_at desc);

alter table public.referral_risk_signals enable row level security;

revoke all on public.referral_risk_signals from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Notification type: referral_reward
-- ---------------------------------------------------------------------------

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'follow',
      'post_like',
      'comment',
      'reply',
      'mention',
      'live_started',
      'direct_message',
      'post_reached_country',
      'post_trending_country',
      'post_milestone',
      'post_journey_summary',
      'um_points_earned',
      'reward_milestone',
      'nearby_live_started',
      'ai_creator_insight',
      'post_save',
      'post_share',
      'referral_reward'
    )
  );

create or replace function public.notification_pref_allows(
  p_user_id uuid,
  p_type text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefs public.notification_preferences;
begin
  v_prefs := public.ensure_notification_preferences(p_user_id);

  if p_type in (
    'follow', 'post_like', 'comment', 'reply', 'mention',
    'live_started', 'direct_message', 'post_save', 'post_share'
  ) then
    return coalesce(v_prefs.social_enabled, true);
  end if;

  if p_type in (
    'post_reached_country', 'post_trending_country',
    'post_milestone', 'post_journey_summary'
  ) then
    return coalesce(v_prefs.journey_enabled, true);
  end if;

  if p_type in ('um_points_earned', 'reward_milestone', 'referral_reward') then
    return coalesce(v_prefs.rewards_enabled, true);
  end if;

  if p_type = 'nearby_live_started' then
    return coalesce(v_prefs.nearby_live_enabled, false);
  end if;

  if p_type = 'ai_creator_insight' then
    return coalesce(v_prefs.ai_insights_enabled, true);
  end if;

  return true;
end;
$$;

revoke all on function public.notification_pref_allows(uuid, text) from public;

-- ---------------------------------------------------------------------------
-- 4. award_um_points_to_user — skip_notification + bypass_daily_cap
-- ---------------------------------------------------------------------------

create or replace function public.award_um_points_to_user(
  p_user_id uuid,
  p_points integer,
  p_reason text,
  p_dedupe_key text,
  p_metadata jsonb default '{}'::jsonb,
  p_category_daily_cap integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer := coalesce(p_points, 0);
  v_reason text := btrim(coalesce(p_reason, ''));
  v_dedupe text := nullif(btrim(coalesce(p_dedupe_key, '')), '');
  v_ledger_id uuid;
  v_balance bigint;
  v_notif uuid;
  v_threshold bigint;
  v_earned_today integer;
  v_daily_cap integer := public.um_points_config_value('daily_earn_cap', 200);
  v_category_earned integer := 0;
  v_category text := coalesce(p_metadata->>'category', '');
  v_skip_notification boolean := coalesce((p_metadata->>'skip_notification')::boolean, false);
  v_bypass_daily_cap boolean := coalesce((p_metadata->>'bypass_daily_cap')::boolean, false);
begin
  if p_user_id is null or v_points <= 0 or v_reason = '' or v_dedupe is null then
    return jsonb_build_object('created', false, 'reason', 'invalid');
  end if;

  if not v_bypass_daily_cap then
    v_earned_today := public.um_points_earned_today(p_user_id);
    if v_earned_today >= v_daily_cap then
      return jsonb_build_object(
        'created', false,
        'reason', 'daily_cap',
        'balance', coalesce((select balance from public.um_point_balances where user_id = p_user_id), 0)
      );
    end if;

    if v_points > (v_daily_cap - v_earned_today) then
      v_points := greatest(0, v_daily_cap - v_earned_today);
    end if;

    if v_points <= 0 then
      return jsonb_build_object('created', false, 'reason', 'daily_cap');
    end if;
  end if;

  if p_category_daily_cap is not null and v_category <> '' then
    select coalesce(sum(points), 0)::integer into v_category_earned
    from public.um_points_ledger
    where user_id = p_user_id
      and created_at >= date_trunc('day', timezone('utc', now()))
      and metadata->>'category' = v_category;

    if v_category_earned >= p_category_daily_cap then
      return jsonb_build_object('created', false, 'reason', 'category_cap');
    end if;

    if v_points > (p_category_daily_cap - v_category_earned) then
      v_points := greatest(0, p_category_daily_cap - v_category_earned);
    end if;

    if v_points <= 0 then
      return jsonb_build_object('created', false, 'reason', 'category_cap');
    end if;
  end if;

  insert into public.um_points_ledger (
    user_id, points, reason, dedupe_key, metadata
  )
  values (
    p_user_id, v_points, v_reason, v_dedupe, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, dedupe_key) do nothing
  returning id into v_ledger_id;

  if v_ledger_id is null then
    return jsonb_build_object(
      'created', false,
      'reason', 'deduped',
      'balance', coalesce((select balance from public.um_point_balances where user_id = p_user_id), 0)
    );
  end if;

  insert into public.um_point_balances (user_id, balance, updated_at)
  values (p_user_id, v_points, now())
  on conflict (user_id) do update
    set balance = public.um_point_balances.balance + excluded.balance,
        updated_at = now()
  returning balance into v_balance;

  if not v_skip_notification then
    v_notif := public.create_notification(
      p_user_id,
      null,
      'um_points_earned',
      'You earned ' || v_points::text || ' UM Points for ' || v_reason || '.',
      null,
      'reward',
      v_ledger_id::text,
      '/rewards',
      jsonb_build_object(
        'points', v_points,
        'reason', v_reason,
        'balance', v_balance,
        'ledgerId', v_ledger_id
      ) || coalesce(p_metadata, '{}'::jsonb),
      'um_points_earned:' || v_dedupe
    );
  end if;

  foreach v_threshold in array array[1000, 5000, 10000, 50000, 100000]::bigint[]
  loop
    if v_balance >= v_threshold then
      perform public.create_notification(
        p_user_id,
        null,
        'reward_milestone',
        'You reached ' || trim(to_char(v_threshold, 'FM999,999,999')) || ' UM Points.',
        null,
        'reward',
        p_user_id::text,
        '/rewards',
        jsonb_build_object(
          'points', v_threshold,
          'milestoneKind', 'um_points',
          'milestoneValue', v_threshold,
          'balance', v_balance
        ),
        'reward_milestone:um_points:' || p_user_id::text || ':' || v_threshold::text
      );
    end if;
  end loop;

  return jsonb_build_object(
    'created', true,
    'balance', v_balance,
    'ledgerId', v_ledger_id,
    'points', v_points,
    'notificationId', v_notif
  );
end;
$$;

revoke all on function public.award_um_points_to_user(uuid, integer, text, text, jsonb, integer) from public;

-- ---------------------------------------------------------------------------
-- 5. Helpers: codes + risk signals
-- ---------------------------------------------------------------------------

create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_attempt integer := 0;
begin
  loop
    v_attempt := v_attempt + 1;
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when v_code ~ '^[A-Z0-9]{6,16}$'
      and not exists (
        select 1 from public.referral_codes where code = v_code
      );
    if v_attempt > 25 then
      raise exception 'Unable to generate unique referral code';
    end if;
  end loop;
  return v_code;
end;
$$;

revoke all on function public.generate_referral_code() from public;

create or replace function public.ensure_referral_code_for_user(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if p_user_id is null then
    return null;
  end if;

  select code into v_code
  from public.referral_codes
  where user_id = p_user_id
    and is_active = true
  order by created_at asc
  limit 1;

  if v_code is not null then
    return v_code;
  end if;

  v_code := public.generate_referral_code();

  insert into public.referral_codes (user_id, code, is_active)
  values (p_user_id, v_code, true)
  on conflict do nothing;

  select code into v_code
  from public.referral_codes
  where user_id = p_user_id
    and is_active = true
  order by created_at asc
  limit 1;

  return v_code;
end;
$$;

revoke all on function public.ensure_referral_code_for_user(uuid) from public;

create or replace function public.ensure_my_referral_code()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_created boolean := false;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select code into v_code
  from public.referral_codes
  where user_id = v_uid
    and is_active = true
  order by created_at asc
  limit 1;

  if v_code is null then
    v_code := public.ensure_referral_code_for_user(v_uid);
    v_created := true;
  end if;

  return jsonb_build_object(
    'code', v_code,
    'invitePath', '/invite/' || v_code,
    'created', v_created
  );
end;
$$;

revoke all on function public.ensure_my_referral_code() from public;
grant execute on function public.ensure_my_referral_code() to authenticated;

create or replace function public.record_referral_risk_signal(
  p_signal_type text,
  p_referrer_user_id uuid default null,
  p_referred_user_id uuid default null,
  p_referral_code text default null,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_type text := nullif(btrim(coalesce(p_signal_type, '')), '');
begin
  if v_type is null then
    return null;
  end if;

  insert into public.referral_risk_signals (
    signal_type,
    referrer_user_id,
    referred_user_id,
    referral_code,
    details
  )
  values (
    v_type,
    p_referrer_user_id,
    p_referred_user_id,
    nullif(upper(btrim(coalesce(p_referral_code, ''))), ''),
    coalesce(p_details, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_referral_risk_signal(text, uuid, uuid, text, jsonb) from public;

-- ---------------------------------------------------------------------------
-- 6. record_referral_attribution — first-touch by anonymous_visitor_id
-- ---------------------------------------------------------------------------

create or replace function public.record_referral_attribution(
  p_referral_code text,
  p_anonymous_visitor_id text default null,
  p_landing_path text default null,
  p_ip_hash text default null,
  p_user_agent_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(btrim(coalesce(p_referral_code, '')));
  v_visitor text := nullif(btrim(coalesce(p_anonymous_visitor_id, '')), '');
  v_referrer uuid;
  v_ttl_days integer := public.um_points_config_value('referral_attribution_ttl_days', 30);
  v_existing public.referral_attributions%rowtype;
  v_id uuid;
  v_expires timestamptz;
begin
  if v_code !~ '^[A-Z0-9]{6,16}$' then
    return jsonb_build_object('recorded', false, 'reason', 'invalid_code');
  end if;

  select user_id into v_referrer
  from public.referral_codes
  where code = v_code
    and is_active = true
  limit 1;

  if v_referrer is null then
    return jsonb_build_object('recorded', false, 'reason', 'unknown_code');
  end if;

  -- First-touch: keep existing pending attribution for this visitor.
  if v_visitor is not null then
    select * into v_existing
    from public.referral_attributions
    where anonymous_visitor_id = v_visitor
      and status = 'pending'
      and expires_at > now()
    order by created_at asc
    limit 1;

    if v_existing.id is not null then
      return jsonb_build_object(
        'recorded', false,
        'reason', 'first_touch_kept',
        'attributionId', v_existing.id,
        'referralCode', v_existing.referral_code,
        'referrerUserId', v_existing.referrer_user_id,
        'expiresAt', v_existing.expires_at
      );
    end if;
  end if;

  v_expires := now() + make_interval(days => greatest(1, v_ttl_days));

  insert into public.referral_attributions (
    referrer_user_id,
    referral_code,
    anonymous_visitor_id,
    landing_path,
    ip_hash,
    user_agent_hash,
    expires_at,
    status
  )
  values (
    v_referrer,
    v_code,
    v_visitor,
    nullif(btrim(coalesce(p_landing_path, '')), ''),
    nullif(btrim(coalesce(p_ip_hash, '')), ''),
    nullif(btrim(coalesce(p_user_agent_hash, '')), ''),
    v_expires,
    'pending'
  )
  returning id into v_id;

  return jsonb_build_object(
    'recorded', true,
    'attributionId', v_id,
    'referralCode', v_code,
    'referrerUserId', v_referrer,
    'expiresAt', v_expires
  );
end;
$$;

revoke all on function public.record_referral_attribution(text, text, text, text, text) from public;
grant execute on function public.record_referral_attribution(text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. referral_notification_copy (EN title + AR body)
-- ---------------------------------------------------------------------------

create or replace function public.referral_notification_copy(
  p_signup_count integer,
  p_points_awarded integer
)
returns jsonb
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  v_count integer := greatest(1, coalesce(p_signup_count, 1));
  v_points integer := greatest(0, coalesce(p_points_awarded, 0));
  v_title_en text;
  v_title_ar text;
begin
  if v_count <= 1 then
    v_title_en :=
      '🎉 A new member created an account through your invitation link. You earned '
      || v_points::text || ' UM Points.';
    v_title_ar :=
      '🎉 أنشأ عضو جديد حسابًا من خلال رابط دعوتك. حصلت على '
      || v_points::text || ' نقطة UM.';
  elsif v_count = 2 then
    v_title_en :=
      '🚀 2 members created accounts through your invitation link. You earned '
      || v_points::text || ' UM Points.';
    v_title_ar :=
      '🚀 أنشأ عضوان حسابين من خلال رابط دعوتك. حصلت على '
      || v_points::text || ' نقطة UM.';
  else
    v_title_en :=
      '🚀 ' || v_count::text
      || ' members created accounts through your invitation link. You earned '
      || v_points::text || ' UM Points.';
    v_title_ar :=
      '🚀 أنشأ ' || v_count::text
      || ' أعضاء حسابات من خلال رابط دعوتك. حصلت على '
      || v_points::text || ' نقطة UM.';
  end if;

  return jsonb_build_object(
    'titleEn', v_title_en,
    'titleAr', v_title_ar,
    'signupCount', v_count,
    'pointsAwarded', v_points
  );
end;
$$;

revoke all on function public.referral_notification_copy(integer, integer) from public;

-- Allow skipped_self rows (self-referral audit) despite equal user ids.
alter table public.referral_conversions
  drop constraint if exists referral_conversions_no_self;

alter table public.referral_conversions
  add constraint referral_conversions_no_self check (
    referrer_user_id <> referred_user_id
    or status = 'skipped_self'
  );

-- ---------------------------------------------------------------------------
-- 8. complete_referral_signup — Growth Mode immediate award
-- ---------------------------------------------------------------------------

create or replace function public.complete_referral_signup(
  p_referred_user_id uuid,
  p_referral_code text,
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
  v_code text := upper(btrim(coalesce(p_referral_code, '')));
  v_visitor text := nullif(btrim(coalesce(p_anonymous_visitor_id, '')), '');
  v_ip text := nullif(btrim(coalesce(p_ip_hash, '')), '');
  v_ua text := nullif(btrim(coalesce(p_user_agent_hash, '')), '');
  v_referrer uuid;
  v_code_active boolean := false;
  v_points integer := public.um_points_config_value('referral_signup', 20);
  v_daily_cap integer := public.um_points_config_value('referral_emergency_daily_cap_per_inviter', 100);
  v_rewarded_today integer := 0;
  v_attribution_id uuid;
  v_conversion_id uuid;
  v_dedupe text;
  v_award jsonb;
  v_batch_key text;
  v_hour text := to_char(timezone('utc', now()), 'YYYYMMDDHH24');
  v_copy jsonb;
  v_signup_count integer := 1;
  v_points_total integer;
  v_notif_id uuid;
  v_existing_meta jsonb;
  v_rewarded_total integer := 0;
  v_milestone_points integer;
  v_milestone_key text;
  v_same_ip_count integer := 0;
begin
  if p_referred_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_user');
  end if;

  if v_code !~ '^[A-Z0-9]{6,16}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  -- Already converted for this invitee (unique referred_user_id).
  if exists (
    select 1 from public.referral_conversions
    where referred_user_id = p_referred_user_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_converted');
  end if;

  select user_id, is_active into v_referrer, v_code_active
  from public.referral_codes
  where code = v_code
  order by is_active desc, created_at asc
  limit 1;

  if v_referrer is null then
    perform public.record_referral_risk_signal(
      'unknown_code',
      null,
      p_referred_user_id,
      v_code,
      jsonb_build_object('source', 'complete_referral_signup')
    );
    return jsonb_build_object('ok', false, 'reason', 'unknown_code');
  end if;

  if not coalesce(v_code_active, false) then
    perform public.record_referral_risk_signal(
      'inactive_code',
      v_referrer,
      p_referred_user_id,
      v_code,
      '{}'::jsonb
    );
    v_dedupe := 'referral_signup:' || p_referred_user_id::text;
    insert into public.referral_conversions (
      referrer_user_id, referred_user_id, referral_code,
      points_awarded, status, dedupe_key, rewarded_at
    )
    values (
      v_referrer, p_referred_user_id, v_code,
      0, 'skipped_inactive', v_dedupe, null
    )
    on conflict do nothing;
    return jsonb_build_object('ok', false, 'reason', 'skipped_inactive');
  end if;

  -- Self-referral: risk + skipped_self, no points.
  if v_referrer = p_referred_user_id then
    perform public.record_referral_risk_signal(
      'self_referral',
      v_referrer,
      p_referred_user_id,
      v_code,
      '{}'::jsonb
    );
    v_dedupe := 'referral_signup:' || p_referred_user_id::text;
    insert into public.referral_conversions (
      referrer_user_id, referred_user_id, referral_code,
      points_awarded, status, dedupe_key, rewarded_at
    )
    values (
      v_referrer, p_referred_user_id, v_code,
      0, 'skipped_self', v_dedupe, null
    )
    on conflict do nothing
    returning id into v_conversion_id;
    return jsonb_build_object(
      'ok', false,
      'reason', 'skipped_self',
      'conversionId', v_conversion_id
    );
  end if;

  -- Silent risk: repeated IP hash under same inviter (do not block).
  if v_ip is not null then
    select count(*)::integer into v_same_ip_count
    from public.referral_attributions a
    where a.referrer_user_id = v_referrer
      and a.ip_hash = v_ip
      and a.created_at >= now() - interval '7 days';

    if v_same_ip_count >= 3 then
      perform public.record_referral_risk_signal(
        'repeated_ip_hash',
        v_referrer,
        p_referred_user_id,
        v_code,
        jsonb_build_object('ipHash', v_ip, 'recentCount', v_same_ip_count)
      );
    end if;
  end if;

  if v_visitor is not null then
    if exists (
      select 1
      from public.referral_attributions a
      join public.referral_conversions c on c.attribution_id = a.id
      where a.anonymous_visitor_id = v_visitor
        and c.status = 'rewarded'
    ) then
      perform public.record_referral_risk_signal(
        'duplicate_visitor_conversion',
        v_referrer,
        p_referred_user_id,
        v_code,
        jsonb_build_object('anonymousVisitorId', v_visitor)
      );
    end if;
  end if;

  -- Bind first-touch attribution when available.
  if v_visitor is not null then
    select id into v_attribution_id
    from public.referral_attributions
    where anonymous_visitor_id = v_visitor
      and status = 'pending'
      and expires_at > now()
      and referrer_user_id = v_referrer
    order by created_at asc
    limit 1;
  end if;

  if v_attribution_id is null then
    select id into v_attribution_id
    from public.referral_attributions
    where referral_code = v_code
      and status = 'pending'
      and expires_at > now()
      and referrer_user_id = v_referrer
      and (
        v_visitor is null
        or anonymous_visitor_id is null
        or anonymous_visitor_id = v_visitor
      )
    order by created_at asc
    limit 1;
  end if;

  select count(*)::integer into v_rewarded_today
  from public.referral_conversions
  where referrer_user_id = v_referrer
    and status = 'rewarded'
    and created_at >= date_trunc('day', timezone('utc', now()));

  if v_rewarded_today >= v_daily_cap then
    perform public.record_referral_risk_signal(
      'emergency_daily_cap',
      v_referrer,
      p_referred_user_id,
      v_code,
      jsonb_build_object('rewardedToday', v_rewarded_today, 'cap', v_daily_cap)
    );
    v_dedupe := 'referral_signup:' || p_referred_user_id::text;
    insert into public.referral_conversions (
      referrer_user_id, referred_user_id, referral_code, attribution_id,
      points_awarded, status, dedupe_key, rewarded_at
    )
    values (
      v_referrer, p_referred_user_id, v_code, v_attribution_id,
      0, 'skipped_rate_limit', v_dedupe, null
    )
    on conflict do nothing
    returning id into v_conversion_id;

    if v_attribution_id is not null then
      update public.referral_attributions
      set status = 'converted',
          converted_user_id = p_referred_user_id
      where id = v_attribution_id
        and status = 'pending';
    end if;

    return jsonb_build_object(
      'ok', false,
      'reason', 'skipped_rate_limit',
      'conversionId', v_conversion_id
    );
  end if;

  v_dedupe := 'referral_signup:' || p_referred_user_id::text;

  insert into public.referral_conversions (
    referrer_user_id, referred_user_id, referral_code, attribution_id,
    points_awarded, status, dedupe_key, rewarded_at
  )
  values (
    v_referrer, p_referred_user_id, v_code, v_attribution_id,
    0, 'rewarded', v_dedupe, null
  )
  on conflict do nothing
  returning id into v_conversion_id;

  if v_conversion_id is null then
    return jsonb_build_object('ok', false, 'reason', 'already_converted');
  end if;

  v_award := public.award_um_points_to_user(
    v_referrer,
    v_points,
    'referral signup',
    v_dedupe,
    jsonb_build_object(
      'category', 'referral',
      'skip_notification', true,
      'bypass_daily_cap', true,
      'referredUserId', p_referred_user_id,
      'referralCode', v_code,
      'referralConversionId', v_conversion_id,
      'rewardType', 'referral_signup'
    ),
    null
  );

  if coalesce((v_award->>'created')::boolean, false) then
    update public.referral_conversions
    set points_awarded = coalesce((v_award->>'points')::integer, v_points),
        rewarded_at = now(),
        status = 'rewarded'
    where id = v_conversion_id;
    v_points := coalesce((v_award->>'points')::integer, v_points);
  else
    -- Ledger deduped or failed: keep conversion but zero points if not created.
    if coalesce(v_award->>'reason', '') = 'deduped' then
      update public.referral_conversions
      set points_awarded = v_points,
          rewarded_at = coalesce(rewarded_at, now()),
          status = 'rewarded'
      where id = v_conversion_id;
    else
      update public.referral_conversions
      set points_awarded = 0,
          status = 'rewarded',
          rewarded_at = now()
      where id = v_conversion_id;
      v_points := 0;
      perform public.record_referral_risk_signal(
        'award_failed',
        v_referrer,
        p_referred_user_id,
        v_code,
        jsonb_build_object('award', v_award, 'conversionId', v_conversion_id)
      );
    end if;
  end if;

  if v_attribution_id is not null then
    update public.referral_attributions
    set status = 'converted',
        converted_user_id = p_referred_user_id
    where id = v_attribution_id
      and status = 'pending';
  end if;

  -- Grouped notification within the same UTC hour batch.
  v_batch_key := 'referral_reward_batch:' || v_referrer::text || ':' || v_hour;

  select id, metadata into v_notif_id, v_existing_meta
  from public.notifications
  where recipient_id = v_referrer
    and dedupe_key = v_batch_key
  limit 1;

  if v_notif_id is not null then
    v_signup_count := greatest(1, coalesce((v_existing_meta->>'signupCount')::integer, 1)) + 1;
    v_points_total := coalesce((v_existing_meta->>'pointsAwarded')::integer, 0) + v_points;
  else
    v_signup_count := 1;
    v_points_total := v_points;
  end if;

  v_copy := public.referral_notification_copy(v_signup_count, v_points_total);

  if v_notif_id is not null then
    update public.notifications
    set title = v_copy->>'titleEn',
        body = v_copy->>'titleAr',
        actor_id = p_referred_user_id,
        entity_id = v_conversion_id::text,
        metadata = jsonb_build_object(
          'inviterId', v_referrer,
          'referredUserId', p_referred_user_id,
          'referralCode', v_code,
          'referralConversionId', v_conversion_id,
          'signupCount', v_signup_count,
          'pointsAwarded', v_points_total,
          'rewardType', 'referral_signup',
          'titleAr', v_copy->>'titleAr',
          'titleEn', v_copy->>'titleEn'
        ),
        read_at = null
    where id = v_notif_id;
  else
    v_notif_id := public.create_notification(
      v_referrer,
      p_referred_user_id,
      'referral_reward',
      v_copy->>'titleEn',
      v_copy->>'titleAr',
      'reward',
      v_conversion_id::text,
      '/rewards',
      jsonb_build_object(
        'inviterId', v_referrer,
        'referredUserId', p_referred_user_id,
        'referralCode', v_code,
        'referralConversionId', v_conversion_id,
        'signupCount', v_signup_count,
        'pointsAwarded', v_points_total,
        'rewardType', 'referral_signup',
        'titleAr', v_copy->>'titleAr',
        'titleEn', v_copy->>'titleEn'
      ),
      v_batch_key
    );
  end if;

  -- Optional milestones only when config value > 0.
  select count(*)::integer into v_rewarded_total
  from public.referral_conversions
  where referrer_user_id = v_referrer
    and status = 'rewarded'
    and points_awarded > 0;

  foreach v_milestone_key in array array['referral_milestone_5', 'referral_milestone_10', 'referral_milestone_25']
  loop
    v_milestone_points := public.um_points_config_value(v_milestone_key, 0);
    if v_milestone_points > 0 then
      if (
        (v_milestone_key = 'referral_milestone_5' and v_rewarded_total = 5)
        or (v_milestone_key = 'referral_milestone_10' and v_rewarded_total = 10)
        or (v_milestone_key = 'referral_milestone_25' and v_rewarded_total = 25)
      ) then
        perform public.award_um_points_to_user(
          v_referrer,
          v_milestone_points,
          'referral milestone',
          v_milestone_key || ':' || v_referrer::text,
          jsonb_build_object(
            'category', 'referral',
            'skip_notification', false,
            'bypass_daily_cap', true,
            'rewardType', v_milestone_key,
            'referralCount', v_rewarded_total
          ),
          null
        );
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'reason', 'rewarded',
    'conversionId', v_conversion_id,
    'referrerUserId', v_referrer,
    'pointsAwarded', v_points,
    'notificationId', v_notif_id,
    'award', v_award
  );
end;
$$;

revoke all on function public.complete_referral_signup(uuid, text, text, text, text) from public;

-- ---------------------------------------------------------------------------
-- 9. claim_my_referral_signup wrapper
-- ---------------------------------------------------------------------------

create or replace function public.claim_my_referral_signup(
  p_referral_code text,
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
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  return public.complete_referral_signup(
    v_uid,
    p_referral_code,
    p_anonymous_visitor_id,
    p_ip_hash,
    p_user_agent_hash
  );
end;
$$;

revoke all on function public.claim_my_referral_signup(text, text, text, text) from public;
grant execute on function public.claim_my_referral_signup(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. handle_new_user_referral trigger + backfill codes
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user_referral()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_visitor text;
  v_ip text;
  v_ua text;
begin
  perform public.ensure_referral_code_for_user(new.id);

  v_code := nullif(upper(btrim(coalesce(new.raw_user_meta_data->>'referral_code', ''))), '');
  if v_code is null then
    v_code := nullif(upper(btrim(coalesce(new.raw_user_meta_data->>'ref', ''))), '');
  end if;

  if v_code is not null then
    v_visitor := nullif(btrim(coalesce(new.raw_user_meta_data->>'anonymous_visitor_id', '')), '');
    v_ip := nullif(btrim(coalesce(new.raw_user_meta_data->>'referral_ip_hash', '')), '');
    v_ua := nullif(btrim(coalesce(new.raw_user_meta_data->>'referral_ua_hash', '')), '');

    perform public.complete_referral_signup(
      new.id,
      v_code,
      v_visitor,
      v_ip,
      v_ua
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_referral on auth.users;
create trigger on_auth_user_created_referral
  after insert on auth.users
  for each row execute function public.handle_new_user_referral();

revoke all on function public.handle_new_user_referral() from public;

-- Backfill active referral codes for existing users.
do $$
declare
  r record;
begin
  for r in
    select u.id
    from auth.users u
    where not exists (
      select 1
      from public.referral_codes rc
      where rc.user_id = u.id
        and rc.is_active = true
    )
  loop
    perform public.ensure_referral_code_for_user(r.id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. notify_on_first_post_of_day — skip invite_active if referral rewarded
-- ---------------------------------------------------------------------------

create or replace function public.notify_on_first_post_of_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer := public.um_points_config_value('first_post_of_day', 25);
  v_invite_points integer := public.um_points_config_value('invite_active', 50);
  v_day text := to_char((timezone('utc', now()))::date, 'YYYY-MM-DD');
  v_inviter uuid;
  v_invite_id uuid;
  v_created timestamptz;
  v_age_days integer;
  v_referral_rewarded boolean := false;
begin
  if new.user_id is null then
    return new;
  end if;

  perform public.award_um_points_to_user(
    new.user_id,
    v_points,
    'first post of the day',
    'first_post_of_day:' || new.user_id::text || ':' || v_day,
    jsonb_build_object('category', 'create', 'postId', new.id),
    null
  );

  perform public.try_award_activity_score(
    new.user_id,
    public.activity_tier_config_value('score_quality_post', 40),
    'quality_posts',
    'published quality post',
    'activity_quality_post:' || new.id::text,
    jsonb_build_object('postId', new.id),
    null,
    public.activity_tier_config_value('cap_quality_posts', 120)
  );

  perform public.try_award_activity_score(
    new.user_id,
    public.activity_tier_config_value('score_consistency_day', 15),
    'consistency_tenure',
    'daily posting consistency',
    'activity_consistency_day:' || new.user_id::text || ':' || v_day,
    jsonb_build_object('postId', new.id),
    null,
    public.activity_tier_config_value('cap_consistency_tenure', 30)
  );

  select created_at into v_created from public.profiles where id = new.user_id;
  if v_created is not null then
    v_age_days := greatest(
      0,
      floor(extract(epoch from (now() - v_created)) / 86400)::integer
    );
    if v_age_days >= 30 then
      perform public.try_award_activity_score(
        new.user_id,
        public.activity_tier_config_value('score_tenure_milestone', 20),
        'consistency_tenure',
        'account tenure milestone (30d+)',
        'activity_tenure_30d:' || new.user_id::text,
        jsonb_build_object('ageDays', v_age_days),
        null,
        public.activity_tier_config_value('cap_consistency_tenure', 30)
      );
    end if;
  end if;

  select exists (
    select 1
    from public.referral_conversions rc
    where rc.referred_user_id = new.user_id
      and rc.status = 'rewarded'
      and rc.points_awarded > 0
  ) into v_referral_rewarded;

  -- Growth Mode already credited the inviter on signup; skip legacy invite_active.
  if not v_referral_rewarded then
    select id, inviter_id into v_invite_id, v_inviter
    from public.user_invites
    where invitee_id = new.user_id
      and rewarded_at is null
      and claimed_at is not null
    limit 1;

    if v_inviter is not null and v_invite_id is not null then
      update public.user_invites
      set rewarded_at = now()
      where id = v_invite_id
        and rewarded_at is null;

      if found then
        perform public.award_um_points_to_user(
          v_inviter,
          v_invite_points,
          'invited user became active',
          'invite_active:' || v_invite_id::text,
          jsonb_build_object(
            'category', 'invite',
            'inviteeId', new.user_id,
            'inviteId', v_invite_id
          ),
          null
        );

        perform public.try_award_activity_score(
          v_inviter,
          public.activity_tier_config_value('score_verified_referral', 75),
          'verified_referrals',
          'verified active referral',
          'activity_referral:' || v_invite_id::text,
          jsonb_build_object('inviteeId', new.user_id, 'inviteId', v_invite_id),
          new.user_id,
          public.activity_tier_config_value('cap_verified_referrals', 150)
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 12. get_my_referral_stats
-- ---------------------------------------------------------------------------

create or replace function public.get_my_referral_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_total integer := 0;
  v_points integer := 0;
  v_today integer := 0;
  v_cap integer := public.um_points_config_value('referral_emergency_daily_cap_per_inviter', 100);
  v_signup_points integer := public.um_points_config_value('referral_signup', 20);
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_code := public.ensure_referral_code_for_user(v_uid);

  select
    count(*) filter (where status = 'rewarded' and points_awarded > 0)::integer,
    coalesce(sum(points_awarded) filter (where status = 'rewarded'), 0)::integer,
    count(*) filter (
      where status = 'rewarded'
        and points_awarded > 0
        and created_at >= date_trunc('day', timezone('utc', now()))
    )::integer
  into v_total, v_points, v_today
  from public.referral_conversions
  where referrer_user_id = v_uid;

  return jsonb_build_object(
    'code', v_code,
    'invitePath', '/invite/' || v_code,
    'signupPoints', v_signup_points,
    'totalRewardedReferrals', coalesce(v_total, 0),
    'pointsEarned', coalesce(v_points, 0),
    'rewardedToday', coalesce(v_today, 0),
    'emergencyDailyCap', v_cap,
    'remainingToday', greatest(0, v_cap - coalesce(v_today, 0)),
    'recent', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'conversionId', c.id,
            'referredUserId', c.referred_user_id,
            'referralCode', c.referral_code,
            'pointsAwarded', c.points_awarded,
            'status', c.status,
            'createdAt', c.created_at,
            'rewardedAt', c.rewarded_at
          )
          order by c.created_at desc
        )
        from (
          select *
          from public.referral_conversions
          where referrer_user_id = v_uid
          order by created_at desc
          limit 20
        ) c
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.get_my_referral_stats() from public;
grant execute on function public.get_my_referral_stats() to authenticated;
