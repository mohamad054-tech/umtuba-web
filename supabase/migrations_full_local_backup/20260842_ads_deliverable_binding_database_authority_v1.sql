-- Ads Deliverable Binding Database Authority Hardening V1
-- Local migration only — do not apply to remote Supabase in this slice.
--
-- Hardens:
--   1) UNIQUE (ad_set_id, creative_id) on public.ads (after safe dedupe)
--   2) SECURITY DEFINER bind_ad_deliverable with ownership/moderation checks
--   3) Revoke insecure direct authenticated INSERT/UPDATE/DELETE on public.ads
--   4) activate_ad_campaign requires eligible ad set + valid deliverable binding
--
-- Does NOT enable live delivery or billing.

-- ---------------------------------------------------------------------------
-- 1) Deduplicate existing bindings (keep earliest created_at, then lowest id)
-- ---------------------------------------------------------------------------

with ranked as (
  select
    id,
    row_number() over (
      partition by ad_set_id, creative_id
      order by created_at asc nulls last, id asc
    ) as rn
  from public.ads
)
delete from public.ads a
using ranked r
where a.id = r.id
  and r.rn > 1;

-- ---------------------------------------------------------------------------
-- 2) Binding uniqueness (final authority)
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ads_ad_set_id_creative_id_key'
      and conrelid = 'public.ads'::regclass
  ) then
    alter table public.ads
      add constraint ads_ad_set_id_creative_id_key
      unique (ad_set_id, creative_id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Restrict direct client writes on ads (RPC is write authority)
-- ---------------------------------------------------------------------------

drop policy if exists "Managers write ads" on public.ads;

revoke insert, update, delete on table public.ads from authenticated;
revoke all on table public.ads from anon, public;

grant select on table public.ads to authenticated;
grant select, insert, update, delete on table public.ads to service_role;

-- Members read policy retained from foundation migration.

-- ---------------------------------------------------------------------------
-- 4) Placement ↔ creative-format compatibility (fail closed; DB-derived)
--     Must stay aligned with lib/ads/deliverableBindings.ts matrix helpers.
-- ---------------------------------------------------------------------------

create or replace function public.ads_deliverable_binding_placement_supported(
  p_placement text
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_placement in (
    'discover_feed',
    'watch_feed',
    'stories',
    'live_lobby',
    'search_results',
    'store_catalog',
    'profile_feed'
  );
$$;

create or replace function public.ads_deliverable_binding_selection_format(
  p_creative_type text
)
returns text
language sql
immutable
set search_path = public
as $$
  -- story → image; native/unknown → null (fail closed). Selection-eligible: image|video.
  select case p_creative_type
    when 'image' then 'image'
    when 'story' then 'image'
    when 'video' then 'video'
    else null
  end;
$$;

create or replace function public.ads_deliverable_binding_format_compatible(
  p_placement text,
  p_selection_format text
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when p_selection_format is distinct from 'image'
     and p_selection_format is distinct from 'video' then false
    when not public.ads_deliverable_binding_placement_supported(p_placement)
      then false
    -- Image-only domain placements (platform SEARCH / STORE_HOME deny video).
    when p_placement in ('search_results', 'store_catalog')
      and p_selection_format = 'video' then false
    when p_selection_format = 'image' then true
    when p_selection_format = 'video' then true
    else false
  end;
$$;

revoke all on function public.ads_deliverable_binding_placement_supported(text)
  from public, anon, authenticated;
revoke all on function public.ads_deliverable_binding_selection_format(text)
  from public, anon, authenticated;
revoke all on function public.ads_deliverable_binding_format_compatible(text, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Authoritative bind RPC
-- ---------------------------------------------------------------------------

create or replace function public.bind_ad_deliverable(
  p_campaign_id uuid,
  p_ad_set_id uuid,
  p_creative_id uuid,
  p_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  camp public.ad_campaigns%rowtype;
  aset public.ad_sets%rowtype;
  cr public.ad_creatives%rowtype;
  existing_row public.ads%rowtype;
  inserted_row public.ads%rowtype;
  binding_name text;
  created boolean := false;
  selection_format text;
  placement text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into camp from public.ad_campaigns where id = p_campaign_id;
  if not found then
    raise exception 'Campaign not found';
  end if;

  if not public.advertiser_has_role(
    camp.advertiser_account_id,
    array['owner', 'admin', 'campaign_manager']
  ) then
    raise exception 'Not authorized';
  end if;

  if camp.status in ('rejected', 'suspended', 'archived', 'completed')
     or camp.status not in ('draft', 'approved', 'active', 'paused') then
    raise exception 'Campaign status is not valid for deliverable binding';
  end if;

  select * into aset from public.ad_sets where id = p_ad_set_id;
  if not found then
    raise exception 'Ad set not found';
  end if;

  if aset.campaign_id is distinct from camp.id then
    raise exception 'Ad set does not belong to this campaign';
  end if;

  if aset.status in ('rejected', 'suspended', 'archived', 'completed')
     or aset.status not in (
       'draft', 'pending_review', 'approved', 'active', 'paused'
     ) then
    raise exception 'Ad set status is not valid for deliverable binding';
  end if;

  select * into cr from public.ad_creatives where id = p_creative_id;
  if not found then
    raise exception 'Creative not found';
  end if;

  if cr.advertiser_account_id is distinct from camp.advertiser_account_id then
    raise exception 'Creative does not belong to this advertiser account';
  end if;

  if cr.campaign_id is not null and cr.campaign_id is distinct from camp.id then
    raise exception 'Creative is bound to a different campaign';
  end if;

  if cr.ad_set_id is not null and cr.ad_set_id is distinct from aset.id then
    raise exception 'Creative is bound to a different ad set';
  end if;

  if cr.status is distinct from 'approved' then
    raise exception 'Only approved creatives can be bound';
  end if;

  -- Placement / format authority: derive only from ad_sets.placements and
  -- ad_creatives.creative_type (never from caller-provided placement metadata).
  if aset.placements is null or cardinality(aset.placements) < 1 then
    raise exception 'Ad set must include at least one placement';
  end if;

  selection_format := public.ads_deliverable_binding_selection_format(
    cr.creative_type
  );
  if selection_format is null then
    raise exception
      'Creative format is not selection-eligible for diagnostic inventory';
  end if;

  foreach placement in array aset.placements loop
    if placement is null
       or btrim(placement) = ''
       or not public.ads_deliverable_binding_placement_supported(placement) then
      raise exception 'Unsupported placement "%"', coalesce(placement, '');
    end if;
    if not public.ads_deliverable_binding_format_compatible(
      placement,
      selection_format
    ) then
      raise exception
        'Creative format is incompatible with placement "%"',
        placement;
    end if;
  end loop;

  select * into existing_row
  from public.ads
  where ad_set_id = aset.id
    and creative_id = cr.id;

  if found then
    return jsonb_build_object(
      'created', false,
      'binding', to_jsonb(existing_row)
    );
  end if;

  binding_name := nullif(trim(coalesce(p_name, '')), '');
  if binding_name is null then
    binding_name := left(coalesce(cr.headline, 'creative') || ' · binding', 120);
  end if;
  if char_length(binding_name) < 2 then
    raise exception 'Binding name must be at least 2 characters';
  end if;

  begin
    insert into public.ads (
      ad_set_id,
      creative_id,
      name,
      status,
      delivery_priority
    )
    values (
      aset.id,
      cr.id,
      binding_name,
      'approved',
      100
    )
    returning * into inserted_row;

    created := true;
  exception
    when unique_violation then
      select * into inserted_row
      from public.ads
      where ad_set_id = aset.id
        and creative_id = cr.id;
      if not found then
        raise;
      end if;
      created := false;
  end;

  -- Align creative linkage when unset (ownership already validated).
  if cr.ad_set_id is null then
    update public.ad_creatives
    set
      ad_set_id = aset.id,
      campaign_id = camp.id,
      updated_at = now()
    where id = cr.id
      and status = 'approved'
      and ad_set_id is null;
  end if;

  return jsonb_build_object(
    'created', created,
    'binding', to_jsonb(inserted_row)
  );
end;
$$;

revoke all on function public.bind_ad_deliverable(uuid, uuid, uuid, text)
  from public, anon;
grant execute on function public.bind_ad_deliverable(uuid, uuid, uuid, text)
  to authenticated;
grant execute on function public.bind_ad_deliverable(uuid, uuid, uuid, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 6) Harden activate_ad_campaign (diagnostics status only; no delivery/billing)
-- ---------------------------------------------------------------------------

create or replace function public.activate_ad_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  camp public.ad_campaigns%rowtype;
  acct public.advertiser_accounts%rowtype;
  eligible_ad_sets integer;
  approved_creatives integer;
  valid_bindings integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into camp from public.ad_campaigns where id = p_campaign_id;
  if not found then
    raise exception 'Campaign not found';
  end if;

  if not public.advertiser_has_role(
    camp.advertiser_account_id,
    array['owner', 'admin', 'campaign_manager']
  ) then
    raise exception 'Not authorized';
  end if;

  select * into acct
  from public.advertiser_accounts
  where id = camp.advertiser_account_id;

  if acct.status is distinct from 'approved' then
    raise exception 'Advertiser account must be approved';
  end if;

  if camp.status is distinct from 'approved'
     and camp.status is distinct from 'paused' then
    raise exception 'Campaign must be approved before activation';
  end if;

  if camp.daily_budget_minor is null and camp.total_budget_minor is null then
    raise exception 'Campaign budget is incomplete';
  end if;

  if camp.start_at is not null
     and camp.end_at is not null
     and camp.end_at <= camp.start_at then
    raise exception 'Campaign schedule is invalid';
  end if;

  select count(*)::integer into eligible_ad_sets
  from public.ad_sets s
  where s.campaign_id = camp.id
    and s.status not in ('rejected', 'suspended', 'archived', 'completed');

  if eligible_ad_sets < 1 then
    raise exception 'At least one eligible ad set is required';
  end if;

  select count(*)::integer into approved_creatives
  from public.ad_creatives c
  where c.advertiser_account_id = camp.advertiser_account_id
    and c.status = 'approved'
    and (
      c.campaign_id = camp.id
      or exists (
        select 1
        from public.ads a
        join public.ad_sets s on s.id = a.ad_set_id
        where a.creative_id = c.id
          and s.campaign_id = camp.id
          and a.status in ('approved', 'active')
      )
    );

  if approved_creatives < 1 then
    raise exception 'At least one approved creative is required';
  end if;

  select count(*)::integer into valid_bindings
  from public.ads a
  join public.ad_sets s on s.id = a.ad_set_id
  join public.ad_creatives cr on cr.id = a.creative_id
  where s.campaign_id = camp.id
    and a.status in ('approved', 'active')
    and cr.status = 'approved'
    and cr.advertiser_account_id = camp.advertiser_account_id
    and (cr.campaign_id is null or cr.campaign_id = camp.id)
    and (cr.ad_set_id is null or cr.ad_set_id = a.ad_set_id)
    and s.status not in ('rejected', 'suspended', 'archived', 'completed');

  if valid_bindings < 1 then
    raise exception 'At least one valid deliverable binding is required';
  end if;

  update public.ad_campaigns
  set status = 'active', updated_at = now()
  where id = p_campaign_id
    and status in ('approved', 'paused');

  if not found then
    raise exception 'Campaign cannot be activated';
  end if;
end;
$$;

revoke all on function public.activate_ad_campaign(uuid) from public, anon;
grant execute on function public.activate_ad_campaign(uuid) to authenticated;
grant execute on function public.activate_ad_campaign(uuid) to service_role;
