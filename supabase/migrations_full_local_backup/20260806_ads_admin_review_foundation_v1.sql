-- UMTUBA Ads Admin Review Foundation V1
-- Additive. Platform-admin identity + admin review RPCs with reviewer_id = auth.uid().
-- No seed rows. No delivery. No payments.
-- Existing service_role approve_* RPCs remain for automation/tooling.

-- ---------------------------------------------------------------------------
-- 1) platform_admins
-- ---------------------------------------------------------------------------

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text
    check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

alter table public.platform_admins enable row level security;
alter table public.platform_admins force row level security;

revoke all on table public.platform_admins from anon, public;
-- Authenticated may only SELECT own membership row (no insert/update/delete).
grant select on table public.platform_admins to authenticated;
revoke insert, update, delete on table public.platform_admins from authenticated;
grant all on table public.platform_admins to service_role;

drop policy if exists "Platform admins read own row" on public.platform_admins;
create policy "Platform admins read own row"
  on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- No INSERT/UPDATE/DELETE policies for authenticated — self-promotion impossible via RLS.

-- ---------------------------------------------------------------------------
-- 2) is_platform_admin() — table is the sole DB authority (not JWT/env)
-- ---------------------------------------------------------------------------

create or replace function public.is_platform_admin(
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id is not null
    and exists (
      select 1
      from public.platform_admins a
      where a.user_id = p_user_id
    );
$$;

revoke all on function public.is_platform_admin(uuid) from public, anon;
grant execute on function public.is_platform_admin(uuid) to authenticated, service_role;

create or replace function public.require_platform_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  -- Authenticated admin RPCs always require a real session user in platform_admins.
  -- service_role may call for automation; reviewer_id then comes from auth.uid() when present.
  if auth.role() is distinct from 'service_role' then
    if uid is null then
      raise exception 'Authentication required';
    end if;
    if not public.is_platform_admin(uid) then
      raise exception 'Platform admin required';
    end if;
    return uid;
  end if;

  -- service_role path: prefer JWT subject when present; otherwise null reviewer.
  return uid;
end;
$$;

revoke all on function public.require_platform_admin() from public, anon;
grant execute on function public.require_platform_admin() to authenticated, service_role;

-- Escape LIKE wildcards and bound search length for admin list RPCs.
create or replace function public.admin_sanitize_search(p_query text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(
    left(
      replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_'),
      80
    ),
    ''
  );
$$;

revoke all on function public.admin_sanitize_search(text) from public, anon;
grant execute on function public.admin_sanitize_search(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Allow platform-admin status transitions in existing guards
-- ---------------------------------------------------------------------------

create or replace function public.advertiser_accounts_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.role() is not distinct from 'service_role'
     or public.is_platform_admin() then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.owner_id is distinct from old.owner_id then
      raise exception 'owner_id is immutable';
    end if;
    if new.status is distinct from old.status then
      if not (
        old.status in ('draft', 'rejected')
        and new.status = 'pending_review'
      ) then
        raise exception 'Advertiser status transition not allowed';
      end if;
    end if;
  end if;

  if tg_op = 'INSERT' and new.status is distinct from 'draft' then
    raise exception 'Advertiser accounts must be created as draft';
  end if;

  return new;
end;
$$;

create or replace function public.ad_campaigns_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  acct_status text;
  approved_creatives integer;
begin
  if auth.role() is not distinct from 'service_role'
     or public.is_platform_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.created_by is distinct from auth.uid() then
      raise exception 'created_by must equal auth.uid()';
    end if;
    if new.status is distinct from 'draft' then
      raise exception 'Campaigns must be created as draft';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.created_by is distinct from old.created_by then
      raise exception 'created_by is immutable';
    end if;
    if new.advertiser_account_id is distinct from old.advertiser_account_id then
      raise exception 'advertiser_account_id is immutable';
    end if;
    if new.status is distinct from old.status then
      if not (
        (old.status in ('draft', 'rejected') and new.status = 'pending_review')
        or (old.status in ('active', 'approved') and new.status = 'paused')
        or (
          old.status in ('draft', 'approved', 'paused', 'rejected', 'completed')
          and new.status = 'archived'
        )
        or (old.status in ('approved', 'paused') and new.status = 'active')
      ) then
        raise exception 'Campaign status transition not allowed';
      end if;

      if new.status = 'active' then
        select a.status into acct_status
        from public.advertiser_accounts a
        where a.id = new.advertiser_account_id;
        if acct_status is distinct from 'approved' then
          raise exception 'Advertiser account must be approved';
        end if;
        if new.daily_budget_minor is null and new.total_budget_minor is null then
          raise exception 'Campaign budget is incomplete';
        end if;
        if new.start_at is not null
           and new.end_at is not null
           and new.end_at <= new.start_at then
          raise exception 'Campaign schedule is invalid';
        end if;
        select count(*)::integer into approved_creatives
        from public.ad_creatives c
        where c.campaign_id = new.id
          and c.status = 'approved';
        if approved_creatives < 1 then
          raise exception 'At least one approved creative is required';
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.ad_creatives_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.role() is not distinct from 'service_role'
     or public.is_platform_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.created_by is distinct from auth.uid() then
      raise exception 'created_by must equal auth.uid()';
    end if;
    if new.status is distinct from 'draft' then
      raise exception 'Creatives must be created as draft';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.created_by is distinct from old.created_by then
      raise exception 'created_by is immutable';
    end if;
    if new.advertiser_account_id is distinct from old.advertiser_account_id then
      raise exception 'advertiser_account_id is immutable';
    end if;
    if old.status = 'approved' then
      raise exception 'Approved creatives are immutable';
    end if;
    if new.status is distinct from old.status then
      if not (
        old.status in ('draft', 'rejected')
        and new.status = 'pending_review'
      ) then
        raise exception 'Creative status transition not allowed';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Admin review RPCs (platform admin OR service_role; reviewer from auth)
-- ---------------------------------------------------------------------------

create or replace function public.admin_approve_advertiser_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer uuid;
begin
  reviewer := public.require_platform_admin();

  update public.advertiser_accounts
  set status = 'approved', reviewed_at = now(), updated_at = now(), review_note = null
  where id = p_account_id and status = 'pending_review';

  if not found then
    raise exception 'Pending advertiser account not found';
  end if;

  insert into public.ad_review_events (
    entity_type, entity_id, action, reviewer_id, actor_id
  ) values (
    'advertiser', p_account_id, 'approved', reviewer, reviewer
  );
end;
$$;

create or replace function public.admin_reject_advertiser_account(
  p_account_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer uuid;
  note text := nullif(trim(coalesce(p_note, '')), '');
begin
  reviewer := public.require_platform_admin();
  if note is null or char_length(note) < 3 then
    raise exception 'Rejection reason is required';
  end if;

  update public.advertiser_accounts
  set
    status = 'rejected',
    review_note = note,
    reviewed_at = now(),
    updated_at = now()
  where id = p_account_id and status = 'pending_review';

  if not found then
    raise exception 'Pending advertiser account not found';
  end if;

  insert into public.ad_review_events (
    entity_type, entity_id, action, reason, reviewer_id, actor_id
  ) values (
    'advertiser', p_account_id, 'rejected', note, reviewer, reviewer
  );
end;
$$;

create or replace function public.admin_suspend_advertiser_account(
  p_account_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer uuid;
  note text := nullif(trim(coalesce(p_note, '')), '');
begin
  reviewer := public.require_platform_admin();

  update public.advertiser_accounts
  set
    status = 'suspended',
    review_note = coalesce(note, review_note),
    reviewed_at = now(),
    updated_at = now()
  where id = p_account_id
    and status in ('approved', 'pending_review', 'rejected');

  if not found then
    raise exception 'Advertiser account cannot be suspended';
  end if;

  update public.ad_campaigns
  set status = 'suspended', updated_at = now()
  where advertiser_account_id = p_account_id
    and status in ('active', 'approved', 'paused');

  insert into public.ad_review_events (
    entity_type, entity_id, action, reason, reviewer_id, actor_id
  ) values (
    'advertiser', p_account_id, 'suspended', note, reviewer, reviewer
  );
end;
$$;

create or replace function public.admin_restore_advertiser_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer uuid;
begin
  reviewer := public.require_platform_admin();

  update public.advertiser_accounts
  set status = 'approved', reviewed_at = now(), updated_at = now()
  where id = p_account_id and status = 'suspended';

  if not found then
    raise exception 'Suspended advertiser account not found';
  end if;

  insert into public.ad_review_events (
    entity_type, entity_id, action, reviewer_id, actor_id
  ) values (
    'advertiser', p_account_id, 'restored', reviewer, reviewer
  );
end;
$$;

create or replace function public.admin_approve_ad_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer uuid;
  camp public.ad_campaigns%rowtype;
  acct_status text;
begin
  reviewer := public.require_platform_admin();

  select * into camp from public.ad_campaigns where id = p_campaign_id for update;
  if not found then
    raise exception 'Campaign not found';
  end if;
  if camp.status is distinct from 'pending_review' then
    raise exception 'Campaign is not pending review';
  end if;

  select status into acct_status
  from public.advertiser_accounts where id = camp.advertiser_account_id;
  if acct_status is distinct from 'approved' then
    raise exception 'Advertiser account is not approved';
  end if;

  update public.ad_campaigns
  set status = 'approved', updated_at = now()
  where id = p_campaign_id;

  insert into public.ad_review_events (
    entity_type, entity_id, action, reviewer_id, actor_id
  ) values (
    'campaign', p_campaign_id, 'approved', reviewer, reviewer
  );
end;
$$;

create or replace function public.admin_reject_ad_campaign(
  p_campaign_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer uuid;
  note text := nullif(trim(coalesce(p_note, '')), '');
begin
  reviewer := public.require_platform_admin();
  if note is null or char_length(note) < 3 then
    raise exception 'Rejection reason is required';
  end if;

  update public.ad_campaigns
  set status = 'rejected', updated_at = now()
  where id = p_campaign_id and status = 'pending_review';

  if not found then
    raise exception 'Pending campaign not found';
  end if;

  insert into public.ad_review_events (
    entity_type, entity_id, action, reason, reviewer_id, actor_id
  ) values (
    'campaign', p_campaign_id, 'rejected', note, reviewer, reviewer
  );
end;
$$;

create or replace function public.admin_pause_ad_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer uuid;
begin
  reviewer := public.require_platform_admin();

  update public.ad_campaigns
  set status = 'paused', updated_at = now()
  where id = p_campaign_id
    and status in ('active', 'approved');

  if not found then
    raise exception 'Campaign cannot be paused';
  end if;

  insert into public.ad_review_events (
    entity_type, entity_id, action, reviewer_id, actor_id
  ) values (
    'campaign', p_campaign_id, 'suspended', reviewer, reviewer
  );
end;
$$;

create or replace function public.admin_restore_ad_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer uuid;
begin
  reviewer := public.require_platform_admin();

  update public.ad_campaigns
  set status = 'paused', updated_at = now()
  where id = p_campaign_id and status = 'suspended';

  if not found then
    raise exception 'Suspended campaign not found';
  end if;

  insert into public.ad_review_events (
    entity_type, entity_id, action, reviewer_id, actor_id
  ) values (
    'campaign', p_campaign_id, 'restored', reviewer, reviewer
  );
end;
$$;

create or replace function public.admin_approve_ad_creative(p_creative_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer uuid;
begin
  reviewer := public.require_platform_admin();

  update public.ad_creatives
  set status = 'approved', updated_at = now()
  where id = p_creative_id and status = 'pending_review';

  if not found then
    raise exception 'Pending creative not found';
  end if;

  insert into public.ad_review_events (
    entity_type, entity_id, action, reviewer_id, actor_id
  ) values (
    'creative', p_creative_id, 'approved', reviewer, reviewer
  );
end;
$$;

create or replace function public.admin_reject_ad_creative(
  p_creative_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer uuid;
  note text := nullif(trim(coalesce(p_note, '')), '');
begin
  reviewer := public.require_platform_admin();
  if note is null or char_length(note) < 3 then
    raise exception 'Rejection reason is required';
  end if;

  update public.ad_creatives
  set
    status = 'rejected',
    moderation_notes = note,
    updated_at = now()
  where id = p_creative_id and status = 'pending_review';

  if not found then
    raise exception 'Pending creative not found';
  end if;

  insert into public.ad_review_events (
    entity_type, entity_id, action, reason, reviewer_id, actor_id
  ) values (
    'creative', p_creative_id, 'rejected', note, reviewer, reviewer
  );
end;
$$;

create or replace function public.admin_suspend_ad_creative(
  p_creative_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer uuid;
  note text := nullif(trim(coalesce(p_note, '')), '');
begin
  reviewer := public.require_platform_admin();

  update public.ad_creatives
  set
    status = 'suspended',
    moderation_notes = coalesce(note, moderation_notes),
    updated_at = now()
  where id = p_creative_id
    and status in ('approved', 'pending_review');

  if not found then
    raise exception 'Creative cannot be suspended';
  end if;

  insert into public.ad_review_events (
    entity_type, entity_id, action, reason, reviewer_id, actor_id
  ) values (
    'creative', p_creative_id, 'suspended', note, reviewer, reviewer
  );
end;
$$;

create or replace function public.admin_restore_ad_creative(p_creative_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer uuid;
begin
  reviewer := public.require_platform_admin();

  update public.ad_creatives
  set status = 'draft', updated_at = now()
  where id = p_creative_id and status = 'suspended';

  if not found then
    raise exception 'Suspended creative not found';
  end if;

  insert into public.ad_review_events (
    entity_type, entity_id, action, reviewer_id, actor_id
  ) values (
    'creative', p_creative_id, 'restored', reviewer, reviewer
  );
end;
$$;

-- Grants: authenticated may execute; body enforces platform admin.
revoke all on function public.admin_approve_advertiser_account(uuid) from public, anon;
grant execute on function public.admin_approve_advertiser_account(uuid) to authenticated, service_role;

revoke all on function public.admin_reject_advertiser_account(uuid, text) from public, anon;
grant execute on function public.admin_reject_advertiser_account(uuid, text) to authenticated, service_role;

revoke all on function public.admin_suspend_advertiser_account(uuid, text) from public, anon;
grant execute on function public.admin_suspend_advertiser_account(uuid, text) to authenticated, service_role;

revoke all on function public.admin_restore_advertiser_account(uuid) from public, anon;
grant execute on function public.admin_restore_advertiser_account(uuid) to authenticated, service_role;

revoke all on function public.admin_approve_ad_campaign(uuid) from public, anon;
grant execute on function public.admin_approve_ad_campaign(uuid) to authenticated, service_role;

revoke all on function public.admin_reject_ad_campaign(uuid, text) from public, anon;
grant execute on function public.admin_reject_ad_campaign(uuid, text) to authenticated, service_role;

revoke all on function public.admin_pause_ad_campaign(uuid) from public, anon;
grant execute on function public.admin_pause_ad_campaign(uuid) to authenticated, service_role;

revoke all on function public.admin_restore_ad_campaign(uuid) from public, anon;
grant execute on function public.admin_restore_ad_campaign(uuid) to authenticated, service_role;

revoke all on function public.admin_approve_ad_creative(uuid) from public, anon;
grant execute on function public.admin_approve_ad_creative(uuid) to authenticated, service_role;

revoke all on function public.admin_reject_ad_creative(uuid, text) from public, anon;
grant execute on function public.admin_reject_ad_creative(uuid, text) to authenticated, service_role;

revoke all on function public.admin_suspend_ad_creative(uuid, text) from public, anon;
grant execute on function public.admin_suspend_ad_creative(uuid, text) to authenticated, service_role;

revoke all on function public.admin_restore_ad_creative(uuid) from public, anon;
grant execute on function public.admin_restore_ad_creative(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Admin read helpers (queue / detail / audit) — SECURITY DEFINER
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_advertiser_accounts(
  p_status text default null,
  p_country text default null,
  p_query text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns setof public.advertiser_accounts
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := public.admin_sanitize_search(p_query);
  st text := nullif(btrim(coalesce(p_status, '')), '');
  cc text := nullif(upper(btrim(coalesce(p_country, ''))), '');
begin
  perform public.require_platform_admin();
  if st is not null and st not in (
    'draft', 'pending_review', 'approved', 'rejected', 'suspended'
  ) then
    raise exception 'Invalid status filter';
  end if;
  if cc is not null and cc !~ '^[A-Z]{2}$' then
    raise exception 'Invalid country filter';
  end if;

  return query
  select a.*
  from public.advertiser_accounts a
  where (st is null or a.status = st)
    and (cc is null or a.country_code = cc)
    and (
      q is null
      or a.business_name ilike '%' || q || '%' escape '\'
      or a.contact_email ilike '%' || q || '%' escape '\'
      or a.legal_name ilike '%' || q || '%' escape '\'
    )
  order by
    case when a.status = 'pending_review' then 0 else 1 end,
    a.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, least(coalesce(p_offset, 0), 5000));
end;
$$;

create or replace function public.admin_get_advertiser_account(p_account_id uuid)
returns setof public.advertiser_accounts
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_platform_admin();
  return query
  select a.* from public.advertiser_accounts a where a.id = p_account_id;
end;
$$;

create or replace function public.admin_list_ad_campaigns(
  p_status text default null,
  p_objective text default null,
  p_query text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  advertiser_account_id uuid,
  business_name text,
  name text,
  objective text,
  status text,
  start_at timestamptz,
  end_at timestamptz,
  daily_budget_minor bigint,
  total_budget_minor bigint,
  currency_code text,
  spent_minor bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := public.admin_sanitize_search(p_query);
  st text := nullif(btrim(coalesce(p_status, '')), '');
  obj text := nullif(btrim(coalesce(p_objective, '')), '');
begin
  perform public.require_platform_admin();
  if st is not null and st not in (
    'draft', 'pending_review', 'approved', 'rejected',
    'paused', 'active', 'completed', 'suspended', 'archived'
  ) then
    raise exception 'Invalid status filter';
  end if;
  if obj is not null and obj not in (
    'awareness', 'traffic', 'engagement', 'video_views',
    'app_installs', 'store_visits', 'product_sales'
  ) then
    raise exception 'Invalid objective filter';
  end if;

  return query
  select
    c.id,
    c.advertiser_account_id,
    a.business_name,
    c.name,
    c.objective,
    c.status,
    c.start_at,
    c.end_at,
    c.daily_budget_minor,
    c.total_budget_minor,
    c.currency_code,
    c.spent_minor,
    c.created_at,
    c.updated_at
  from public.ad_campaigns c
  join public.advertiser_accounts a on a.id = c.advertiser_account_id
  where (st is null or c.status = st)
    and (obj is null or c.objective = obj)
    and (
      q is null
      or c.name ilike '%' || q || '%' escape '\'
      or a.business_name ilike '%' || q || '%' escape '\'
    )
  order by
    case when c.status = 'pending_review' then 0 else 1 end,
    c.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, least(coalesce(p_offset, 0), 5000));
end;
$$;

create or replace function public.admin_get_ad_campaign(p_campaign_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  perform public.require_platform_admin();

  select jsonb_build_object(
    'campaign', to_jsonb(c),
    'advertiser', to_jsonb(a),
    'ad_sets', coalesce(
      (
        select jsonb_agg(to_jsonb(s) order by s.created_at)
        from public.ad_sets s
        where s.campaign_id = c.id
      ),
      '[]'::jsonb
    ),
    'creatives', coalesce(
      (
        select jsonb_agg(to_jsonb(cr) order by cr.created_at desc)
        from public.ad_creatives cr
        where cr.campaign_id = c.id
      ),
      '[]'::jsonb
    )
  )
  into result
  from public.ad_campaigns c
  join public.advertiser_accounts a on a.id = c.advertiser_account_id
  where c.id = p_campaign_id;

  if result is null then
    raise exception 'Campaign not found';
  end if;
  return result;
end;
$$;

create or replace function public.admin_list_ad_creatives(
  p_status text default null,
  p_query text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  advertiser_account_id uuid,
  business_name text,
  campaign_id uuid,
  campaign_name text,
  creative_type text,
  headline text,
  body_text text,
  call_to_action text,
  destination_url text,
  media_path text,
  thumbnail_path text,
  status text,
  moderation_notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := public.admin_sanitize_search(p_query);
  st text := nullif(btrim(coalesce(p_status, '')), '');
begin
  perform public.require_platform_admin();
  if st is not null and st not in (
    'draft', 'pending_review', 'approved', 'rejected', 'suspended', 'archived'
  ) then
    raise exception 'Invalid status filter';
  end if;

  return query
  select
    cr.id,
    cr.advertiser_account_id,
    a.business_name,
    cr.campaign_id,
    c.name as campaign_name,
    cr.creative_type,
    cr.headline,
    cr.body_text,
    cr.call_to_action,
    cr.destination_url,
    cr.media_path,
    cr.thumbnail_path,
    cr.status,
    cr.moderation_notes,
    cr.created_at,
    cr.updated_at
  from public.ad_creatives cr
  join public.advertiser_accounts a on a.id = cr.advertiser_account_id
  left join public.ad_campaigns c on c.id = cr.campaign_id
  where (st is null or cr.status = st)
    and (
      q is null
      or cr.headline ilike '%' || q || '%' escape '\'
      or a.business_name ilike '%' || q || '%' escape '\'
      or cr.destination_url ilike '%' || q || '%' escape '\'
    )
  order by
    case when cr.status = 'pending_review' then 0 else 1 end,
    cr.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, least(coalesce(p_offset, 0), 5000));
end;
$$;

create or replace function public.admin_get_ad_creative(p_creative_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  perform public.require_platform_admin();

  select jsonb_build_object(
    'creative', to_jsonb(cr),
    'advertiser', to_jsonb(a),
    'campaign', to_jsonb(c)
  )
  into result
  from public.ad_creatives cr
  join public.advertiser_accounts a on a.id = cr.advertiser_account_id
  left join public.ad_campaigns c on c.id = cr.campaign_id
  where cr.id = p_creative_id;

  if result is null then
    raise exception 'Creative not found';
  end if;
  return result;
end;
$$;

create or replace function public.admin_list_review_events(
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_reviewer_id uuid default null,
  p_action text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns setof public.ad_review_events
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  et text := nullif(btrim(coalesce(p_entity_type, '')), '');
  act text := nullif(btrim(coalesce(p_action, '')), '');
begin
  perform public.require_platform_admin();
  if et is not null and et not in ('advertiser', 'campaign', 'ad_set', 'creative') then
    raise exception 'Invalid entity_type filter';
  end if;
  if act is not null and act not in (
    'submitted', 'approved', 'rejected', 'suspended', 'restored',
    'paused', 'note', 'flagged'
  ) then
    raise exception 'Invalid action filter';
  end if;

  return query
  select e.*
  from public.ad_review_events e
  where (et is null or e.entity_type = et)
    and (p_entity_id is null or e.entity_id = p_entity_id)
    and (p_reviewer_id is null or e.reviewer_id = p_reviewer_id)
    and (act is null or e.action = act)
  order by e.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, least(coalesce(p_offset, 0), 5000));
end;
$$;

create or replace function public.admin_review_queue_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_platform_admin();
  return jsonb_build_object(
    'advertisers_pending', (
      select count(*)::int from public.advertiser_accounts where status = 'pending_review'
    ),
    'campaigns_pending', (
      select count(*)::int from public.ad_campaigns where status = 'pending_review'
    ),
    'creatives_pending', (
      select count(*)::int from public.ad_creatives where status = 'pending_review'
    ),
    'advertisers_suspended', (
      select count(*)::int from public.advertiser_accounts where status = 'suspended'
    ),
    'campaigns_suspended', (
      select count(*)::int from public.ad_campaigns where status = 'suspended'
    )
  );
end;
$$;

revoke all on function public.admin_list_advertiser_accounts(text, text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_advertiser_accounts(text, text, text, integer, integer) to authenticated, service_role;

revoke all on function public.admin_get_advertiser_account(uuid) from public, anon;
grant execute on function public.admin_get_advertiser_account(uuid) to authenticated, service_role;

revoke all on function public.admin_list_ad_campaigns(text, text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_ad_campaigns(text, text, text, integer, integer) to authenticated, service_role;

revoke all on function public.admin_get_ad_campaign(uuid) from public, anon;
grant execute on function public.admin_get_ad_campaign(uuid) to authenticated, service_role;

revoke all on function public.admin_list_ad_creatives(text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_ad_creatives(text, text, integer, integer) to authenticated, service_role;

revoke all on function public.admin_get_ad_creative(uuid) from public, anon;
grant execute on function public.admin_get_ad_creative(uuid) to authenticated, service_role;

revoke all on function public.admin_list_review_events(text, uuid, uuid, text, integer, integer) from public, anon;
grant execute on function public.admin_list_review_events(text, uuid, uuid, text, integer, integer) to authenticated, service_role;

revoke all on function public.admin_review_queue_counts() from public, anon;
grant execute on function public.admin_review_queue_counts() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Storage: platform admins may read creative objects (signed URLs)
-- ---------------------------------------------------------------------------

drop policy if exists "Platform admins read ad creatives" on storage.objects;
create policy "Platform admins read ad creatives"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ad-creatives'
    and public.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- 7) Audit trail: enforce append-only (no UPDATE/DELETE for anyone)
-- ---------------------------------------------------------------------------

create or replace function public.ad_review_events_append_only()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'ad_review_events is append-only';
end;
$$;

drop trigger if exists ad_review_events_no_update on public.ad_review_events;
create trigger ad_review_events_no_update
  before update on public.ad_review_events
  for each row execute function public.ad_review_events_append_only();

drop trigger if exists ad_review_events_no_delete on public.ad_review_events;
create trigger ad_review_events_no_delete
  before delete on public.ad_review_events
  for each row execute function public.ad_review_events_append_only();
