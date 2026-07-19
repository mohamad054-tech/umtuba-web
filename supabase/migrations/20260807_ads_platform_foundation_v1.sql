-- UMTUBA Ads Platform Foundation V1
-- Additive only. Advertiser accounts, campaigns, ad sets, creatives, ads,
-- review audit, event/metrics foundations, private ad-creatives bucket.
-- No live delivery, no payments, no demo seed rows.
-- Fail-closed RLS. Admin review RPCs are service_role only.

-- ---------------------------------------------------------------------------
-- 1) advertiser_accounts
-- ---------------------------------------------------------------------------

create table if not exists public.advertiser_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  business_name text not null
    check (char_length(btrim(business_name)) between 2 and 120),
  legal_name text
    check (legal_name is null or char_length(btrim(legal_name)) between 2 and 160),
  contact_email text not null
    check (char_length(contact_email) between 3 and 160 and position('@' in contact_email) > 1),
  contact_phone text
    check (contact_phone is null or char_length(btrim(contact_phone)) between 5 and 40),
  website_url text
    check (website_url is null or (
      char_length(website_url) between 1 and 500
      and website_url !~ '\s'
      and website_url ~* '^https?://'
    )),
  country_code text not null
    check (country_code ~ '^[A-Z]{2}$'),
  status text not null default 'draft'
    check (status in (
      'draft', 'pending_review', 'approved', 'rejected', 'suspended'
    )),
  review_note text
    check (review_note is null or char_length(review_note) <= 1000),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists advertiser_accounts_owner_id_idx
  on public.advertiser_accounts (owner_id);
create index if not exists advertiser_accounts_status_idx
  on public.advertiser_accounts (status);

drop trigger if exists advertiser_accounts_set_updated_at on public.advertiser_accounts;
create trigger advertiser_accounts_set_updated_at
  before update on public.advertiser_accounts
  for each row execute function public.set_row_updated_at();

-- ---------------------------------------------------------------------------
-- 2) advertiser_members
-- ---------------------------------------------------------------------------

create table if not exists public.advertiser_members (
  id uuid primary key default gen_random_uuid(),
  advertiser_account_id uuid not null
    references public.advertiser_accounts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null
    check (role in ('owner', 'admin', 'campaign_manager', 'analyst', 'viewer')),
  created_at timestamptz not null default now(),
  constraint advertiser_members_unique unique (advertiser_account_id, user_id)
);

create index if not exists advertiser_members_user_id_idx
  on public.advertiser_members (user_id);
create index if not exists advertiser_members_account_id_idx
  on public.advertiser_members (advertiser_account_id);

-- ---------------------------------------------------------------------------
-- 3) ad_campaigns
-- ---------------------------------------------------------------------------

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_account_id uuid not null
    references public.advertiser_accounts (id) on delete cascade,
  name text not null
    check (char_length(btrim(name)) between 2 and 120),
  objective text not null
    check (objective in (
      'awareness', 'traffic', 'engagement', 'video_views',
      'app_installs', 'store_visits', 'product_sales'
    )),
  status text not null default 'draft'
    check (status in (
      'draft', 'pending_review', 'approved', 'rejected',
      'paused', 'active', 'completed', 'suspended', 'archived'
    )),
  start_at timestamptz,
  end_at timestamptz,
  daily_budget_minor bigint
    check (
      daily_budget_minor is null
      or (daily_budget_minor > 0 and daily_budget_minor <= 1000000000000)
    ),
  total_budget_minor bigint
    check (
      total_budget_minor is null
      or (total_budget_minor > 0 and total_budget_minor <= 1000000000000)
    ),
  currency_code text not null default 'USD'
    check (currency_code ~ '^[A-Z]{3}$'),
  spent_minor bigint not null default 0
    check (spent_minor >= 0 and spent_minor <= 1000000000000),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_campaigns_dates_check check (
    start_at is null or end_at is null or end_at > start_at
  ),
  constraint ad_campaigns_budget_check check (
    total_budget_minor is null
    or daily_budget_minor is null
    or total_budget_minor >= daily_budget_minor
  )
);

create index if not exists ad_campaigns_account_id_idx
  on public.ad_campaigns (advertiser_account_id, created_at desc);
create index if not exists ad_campaigns_status_idx
  on public.ad_campaigns (status);

drop trigger if exists ad_campaigns_set_updated_at on public.ad_campaigns;
create trigger ad_campaigns_set_updated_at
  before update on public.ad_campaigns
  for each row execute function public.set_row_updated_at();

-- Prevent advertisers from mutating spent_minor.
create or replace function public.ad_campaigns_lock_spent()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.spent_minor is distinct from old.spent_minor then
    if auth.role() is distinct from 'service_role' then
      raise exception 'spent_minor is system-managed';
    end if;
  end if;
  if tg_op = 'INSERT' and new.spent_minor is distinct from 0 then
    if auth.role() is distinct from 'service_role' then
      new.spent_minor := 0;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ad_campaigns_lock_spent_trg on public.ad_campaigns;
create trigger ad_campaigns_lock_spent_trg
  before insert or update on public.ad_campaigns
  for each row execute function public.ad_campaigns_lock_spent();

-- ---------------------------------------------------------------------------
-- 4) ad_sets (targeting + delivery unit)
-- ---------------------------------------------------------------------------

create table if not exists public.ad_sets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns (id) on delete cascade,
  name text not null
    check (char_length(btrim(name)) between 2 and 120),
  status text not null default 'draft'
    check (status in (
      'draft', 'pending_review', 'approved', 'rejected',
      'paused', 'active', 'completed', 'suspended', 'archived'
    )),
  -- Targeting (generic JSON arrays / scalars). No PII user ids.
  countries text[] not null default '{}'
    check (cardinality(countries) <= 50),
  regions text[] not null default '{}'
    check (cardinality(regions) <= 50),
  cities text[] not null default '{}'
    check (cardinality(cities) <= 50),
  languages text[] not null default '{}'
    check (cardinality(languages) <= 50),
  age_min integer not null default 13
    check (age_min >= 13 and age_min <= 65),
  age_max integer not null default 65
    check (age_max >= 13 and age_max <= 65),
  gender text
    check (gender is null or gender in ('all', 'female', 'male', 'non_binary')),
  interests text[] not null default '{}'
    check (cardinality(interests) <= 30),
  user_segments text[] not null default '{}'
    check (cardinality(user_segments) <= 20),
  placements text[] not null default '{}'
    check (
      cardinality(placements) <= 7
      and placements <@ array[
        'discover_feed', 'watch_feed', 'stories', 'live_lobby',
        'search_results', 'store_catalog', 'profile_feed'
      ]::text[]
    ),
  devices text[] not null default '{}'
    check (cardinality(devices) <= 10),
  exclude_countries text[] not null default '{}'
    check (cardinality(exclude_countries) <= 50),
  exclude_regions text[] not null default '{}'
    check (cardinality(exclude_regions) <= 50),
  exclude_cities text[] not null default '{}'
    check (cardinality(exclude_cities) <= 50),
  exclude_interests text[] not null default '{}'
    check (cardinality(exclude_interests) <= 30),
  exclude_user_segments text[] not null default '{}'
    check (cardinality(exclude_user_segments) <= 20),
  frequency_cap integer
    check (frequency_cap is null or (frequency_cap >= 1 and frequency_cap <= 100)),
  dayparting jsonb
    check (
      dayparting is null
      or (
        jsonb_typeof(dayparting) = 'object'
        and pg_column_size(dayparting) <= 4096
      )
    ),
  -- Reserved: minimum audience size contract (not computed in V1).
  estimated_audience_min integer
    check (estimated_audience_min is null or estimated_audience_min >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_sets_age_range_check check (age_max >= age_min),
  -- Teen safety: when audience includes 13–17, ban precise gender/city/segment targeting.
  constraint ad_sets_teen_safety_check check (
    age_min >= 18
    or (
      (gender is null or gender = 'all')
      and cardinality(cities) = 0
      and cardinality(exclude_cities) = 0
      and cardinality(user_segments) = 0
      and cardinality(exclude_user_segments) = 0
    )
  )
);

create index if not exists ad_sets_campaign_id_idx
  on public.ad_sets (campaign_id);

drop trigger if exists ad_sets_set_updated_at on public.ad_sets;
create trigger ad_sets_set_updated_at
  before update on public.ad_sets
  for each row execute function public.set_row_updated_at();

-- ---------------------------------------------------------------------------
-- 5) ad_creatives
-- ---------------------------------------------------------------------------

create table if not exists public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  advertiser_account_id uuid not null
    references public.advertiser_accounts (id) on delete cascade,
  campaign_id uuid references public.ad_campaigns (id) on delete set null,
  ad_set_id uuid references public.ad_sets (id) on delete set null,
  creative_type text not null
    check (creative_type in ('image', 'video', 'story', 'native')),
  headline text not null
    check (char_length(btrim(headline)) between 1 and 80),
  body_text text
    check (body_text is null or char_length(body_text) <= 500),
  call_to_action text not null default 'learn_more'
    check (call_to_action in (
      'learn_more', 'shop_now', 'sign_up', 'watch_more',
      'install', 'contact_us', 'book_now'
    )),
  destination_url text not null
    check (
      char_length(destination_url) between 1 and 500
      and destination_url !~ '\s'
      and destination_url ~* '^https?://'
      and destination_url !~* '^https?://(localhost|127\.0\.0\.1)'
    ),
  media_path text not null
    check (
      char_length(btrim(media_path)) between 3 and 512
      and media_path !~ '\s'
      and media_path !~ '\.\.'
    ),
  thumbnail_path text
    check (
      thumbnail_path is null or (
        char_length(btrim(thumbnail_path)) between 3 and 512
        and thumbnail_path !~ '\s'
        and thumbnail_path !~ '\.\.'
      )
    ),
  status text not null default 'draft'
    check (status in (
      'draft', 'pending_review', 'approved', 'rejected', 'suspended'
    )),
  moderation_notes text
    check (moderation_notes is null or char_length(moderation_notes) <= 1000),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ad_creatives_account_id_idx
  on public.ad_creatives (advertiser_account_id, created_at desc);
create index if not exists ad_creatives_campaign_id_idx
  on public.ad_creatives (campaign_id);
create index if not exists ad_creatives_status_idx
  on public.ad_creatives (status);

drop trigger if exists ad_creatives_set_updated_at on public.ad_creatives;
create trigger ad_creatives_set_updated_at
  before update on public.ad_creatives
  for each row execute function public.set_row_updated_at();

-- ---------------------------------------------------------------------------
-- 6) ads (deliverable unit — not delivered in V1)
-- ---------------------------------------------------------------------------

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  ad_set_id uuid not null references public.ad_sets (id) on delete cascade,
  creative_id uuid not null references public.ad_creatives (id) on delete restrict,
  name text not null
    check (char_length(btrim(name)) between 2 and 120),
  status text not null default 'draft'
    check (status in (
      'draft', 'pending_review', 'approved', 'rejected',
      'paused', 'active', 'completed', 'suspended', 'archived'
    )),
  delivery_priority integer not null default 100
    check (delivery_priority between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ads_ad_set_id_idx on public.ads (ad_set_id);
create index if not exists ads_creative_id_idx on public.ads (creative_id);
create index if not exists ads_status_idx on public.ads (status);

drop trigger if exists ads_set_updated_at on public.ads;
create trigger ads_set_updated_at
  before update on public.ads
  for each row execute function public.set_row_updated_at();

-- ---------------------------------------------------------------------------
-- 7) ad_review_events (audit trail)
-- ---------------------------------------------------------------------------

create table if not exists public.ad_review_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in ('advertiser', 'campaign', 'creative', 'ad', 'ad_set')),
  entity_id uuid not null,
  action text not null
    check (action in (
      'submitted', 'approved', 'rejected', 'suspended', 'restored'
    )),
  reviewer_id uuid references auth.users (id),
  actor_id uuid references auth.users (id),
  reason text
    check (reason is null or char_length(reason) <= 1000),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists ad_review_events_entity_idx
  on public.ad_review_events (entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 8) Event foundations (no public ingestion in V1)
-- ---------------------------------------------------------------------------

create table if not exists public.ad_impression_events (
  id uuid primary key default gen_random_uuid(),
  advertiser_account_id uuid not null
    references public.advertiser_accounts (id) on delete cascade,
  campaign_id uuid references public.ad_campaigns (id) on delete set null,
  ad_id uuid references public.ads (id) on delete set null,
  placement text not null,
  viewer_id uuid,
  dedupe_key text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ad_impression_events_dedupe unique (dedupe_key)
);

create table if not exists public.ad_click_events (
  id uuid primary key default gen_random_uuid(),
  advertiser_account_id uuid not null
    references public.advertiser_accounts (id) on delete cascade,
  campaign_id uuid references public.ad_campaigns (id) on delete set null,
  ad_id uuid references public.ads (id) on delete set null,
  placement text not null,
  viewer_id uuid,
  dedupe_key text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ad_click_events_dedupe unique (dedupe_key)
);

create index if not exists ad_impression_events_account_day_idx
  on public.ad_impression_events (advertiser_account_id, occurred_at desc);
create index if not exists ad_click_events_account_day_idx
  on public.ad_click_events (advertiser_account_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- 9) ad_daily_metrics (foundation; no aggregation job in V1)
-- ---------------------------------------------------------------------------

create table if not exists public.ad_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  advertiser_account_id uuid not null
    references public.advertiser_accounts (id) on delete cascade,
  campaign_id uuid references public.ad_campaigns (id) on delete cascade,
  ad_id uuid references public.ads (id) on delete cascade,
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  unique_reach bigint not null default 0 check (unique_reach >= 0),
  video_views bigint not null default 0 check (video_views >= 0),
  spend_minor bigint not null default 0 check (spend_minor >= 0),
  conversions bigint not null default 0 check (conversions >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_daily_metrics_unique unique (
    day, advertiser_account_id, campaign_id, ad_id
  )
);

create index if not exists ad_daily_metrics_account_day_idx
  on public.ad_daily_metrics (advertiser_account_id, day desc);

-- ---------------------------------------------------------------------------
-- 10) Wire membership helper after tables exist
-- ---------------------------------------------------------------------------

create or replace function public.is_advertiser_member(
  p_account_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select
    p_user_id is not null
    and exists (
      select 1
      from public.advertiser_members m
      where m.advertiser_account_id = p_account_id
        and m.user_id = p_user_id
    );
$$;

create or replace function public.advertiser_has_role(
  p_account_id uuid,
  p_roles text[],
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select
    p_user_id is not null
    and exists (
      select 1
      from public.advertiser_members m
      where m.advertiser_account_id = p_account_id
        and m.user_id = p_user_id
        and m.role = any (p_roles)
    );
$$;

revoke all on function public.is_advertiser_member(uuid, uuid) from public;
grant execute on function public.is_advertiser_member(uuid, uuid) to authenticated;
revoke execute on function public.is_advertiser_member(uuid, uuid) from anon;

revoke all on function public.advertiser_has_role(uuid, text[], uuid) from public;
grant execute on function public.advertiser_has_role(uuid, text[], uuid) to authenticated;
revoke execute on function public.advertiser_has_role(uuid, text[], uuid) from anon;

-- Auto-add owner membership on account create (definer bypasses membership chicken/egg).
create or replace function public.advertiser_accounts_add_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.advertiser_members (advertiser_account_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (advertiser_account_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists advertiser_accounts_add_owner_member_trg on public.advertiser_accounts;
create trigger advertiser_accounts_add_owner_member_trg
  after insert on public.advertiser_accounts
  for each row execute function public.advertiser_accounts_add_owner_member();

-- ---------------------------------------------------------------------------
-- 11) RLS
-- ---------------------------------------------------------------------------

alter table public.advertiser_accounts enable row level security;
alter table public.advertiser_accounts force row level security;
alter table public.advertiser_members enable row level security;
alter table public.advertiser_members force row level security;
alter table public.ad_campaigns enable row level security;
alter table public.ad_campaigns force row level security;
alter table public.ad_sets enable row level security;
alter table public.ad_sets force row level security;
alter table public.ad_creatives enable row level security;
alter table public.ad_creatives force row level security;
alter table public.ads enable row level security;
alter table public.ads force row level security;
alter table public.ad_review_events enable row level security;
alter table public.ad_review_events force row level security;
alter table public.ad_impression_events enable row level security;
alter table public.ad_impression_events force row level security;
alter table public.ad_click_events enable row level security;
alter table public.ad_click_events force row level security;
alter table public.ad_daily_metrics enable row level security;
alter table public.ad_daily_metrics force row level security;

-- Accounts
drop policy if exists "Members read advertiser accounts" on public.advertiser_accounts;
drop policy if exists "Users create own advertiser accounts" on public.advertiser_accounts;
drop policy if exists "Owners admins update advertiser accounts" on public.advertiser_accounts;

create policy "Members read advertiser accounts"
  on public.advertiser_accounts for select to authenticated
  using (public.is_advertiser_member(id));

create policy "Users create own advertiser accounts"
  on public.advertiser_accounts for insert to authenticated
  with check (owner_id = (select auth.uid()) and status = 'draft');

create policy "Owners admins update advertiser accounts"
  on public.advertiser_accounts for update to authenticated
  using (public.advertiser_has_role(id, array['owner', 'admin']))
  with check (public.advertiser_has_role(id, array['owner', 'admin']));

-- Members
drop policy if exists "Members read memberships" on public.advertiser_members;
drop policy if exists "Owners admins manage memberships" on public.advertiser_members;

create policy "Members read memberships"
  on public.advertiser_members for select to authenticated
  using (public.is_advertiser_member(advertiser_account_id));

create policy "Owners admins manage memberships"
  on public.advertiser_members for all to authenticated
  using (public.advertiser_has_role(advertiser_account_id, array['owner', 'admin']))
  with check (
    public.advertiser_has_role(advertiser_account_id, array['owner', 'admin'])
    -- Client cannot assign/transfer ownership via membership writes.
    and role is distinct from 'owner'
    and user_id is distinct from (select auth.uid())
  );

-- Campaigns
drop policy if exists "Members read campaigns" on public.ad_campaigns;
drop policy if exists "Managers write campaigns" on public.ad_campaigns;
drop policy if exists "Managers insert campaigns" on public.ad_campaigns;
drop policy if exists "Managers update campaigns" on public.ad_campaigns;
drop policy if exists "Managers delete draft campaigns" on public.ad_campaigns;

create policy "Members read campaigns"
  on public.ad_campaigns for select to authenticated
  using (public.is_advertiser_member(advertiser_account_id));

create policy "Managers insert campaigns"
  on public.ad_campaigns for insert to authenticated
  with check (
    public.advertiser_has_role(
      advertiser_account_id,
      array['owner', 'admin', 'campaign_manager']
    )
    and created_by = (select auth.uid())
  );

create policy "Managers update campaigns"
  on public.ad_campaigns for update to authenticated
  using (
    public.advertiser_has_role(
      advertiser_account_id,
      array['owner', 'admin', 'campaign_manager']
    )
  )
  with check (
    public.advertiser_has_role(
      advertiser_account_id,
      array['owner', 'admin', 'campaign_manager']
    )
  );

create policy "Managers delete draft campaigns"
  on public.ad_campaigns for delete to authenticated
  using (
    status = 'draft'
    and public.advertiser_has_role(
      advertiser_account_id,
      array['owner', 'admin', 'campaign_manager']
    )
  );

-- Ad sets (via campaign membership)
drop policy if exists "Members read ad sets" on public.ad_sets;
drop policy if exists "Managers write ad sets" on public.ad_sets;

create policy "Members read ad sets"
  on public.ad_sets for select to authenticated
  using (
    exists (
      select 1 from public.ad_campaigns c
      where c.id = campaign_id
        and public.is_advertiser_member(c.advertiser_account_id)
    )
  );

create policy "Managers write ad sets"
  on public.ad_sets for all to authenticated
  using (
    exists (
      select 1 from public.ad_campaigns c
      where c.id = campaign_id
        and public.advertiser_has_role(
          c.advertiser_account_id,
          array['owner', 'admin', 'campaign_manager']
        )
    )
  )
  with check (
    exists (
      select 1 from public.ad_campaigns c
      where c.id = campaign_id
        and public.advertiser_has_role(
          c.advertiser_account_id,
          array['owner', 'admin', 'campaign_manager']
        )
    )
  );

-- Creatives
drop policy if exists "Members read creatives" on public.ad_creatives;
drop policy if exists "Managers write creatives" on public.ad_creatives;

create policy "Members read creatives"
  on public.ad_creatives for select to authenticated
  using (public.is_advertiser_member(advertiser_account_id));

create policy "Managers write creatives"
  on public.ad_creatives for all to authenticated
  using (
    public.advertiser_has_role(
      advertiser_account_id,
      array['owner', 'admin', 'campaign_manager']
    )
  )
  with check (
    public.advertiser_has_role(
      advertiser_account_id,
      array['owner', 'admin', 'campaign_manager']
    )
  );

-- Ads
drop policy if exists "Members read ads" on public.ads;
drop policy if exists "Managers write ads" on public.ads;

create policy "Members read ads"
  on public.ads for select to authenticated
  using (
    exists (
      select 1
      from public.ad_sets s
      join public.ad_campaigns c on c.id = s.campaign_id
      where s.id = ad_set_id
        and public.is_advertiser_member(c.advertiser_account_id)
    )
  );

create policy "Managers write ads"
  on public.ads for all to authenticated
  using (
    exists (
      select 1
      from public.ad_sets s
      join public.ad_campaigns c on c.id = s.campaign_id
      where s.id = ad_set_id
        and public.advertiser_has_role(
          c.advertiser_account_id,
          array['owner', 'admin', 'campaign_manager']
        )
    )
  )
  with check (
    exists (
      select 1
      from public.ad_sets s
      join public.ad_campaigns c on c.id = s.campaign_id
      where s.id = ad_set_id
        and public.advertiser_has_role(
          c.advertiser_account_id,
          array['owner', 'admin', 'campaign_manager']
        )
    )
  );

-- Review events: members read; inserts via trusted RPCs / service_role only
drop policy if exists "Members read review events" on public.ad_review_events;
create policy "Members read review events"
  on public.ad_review_events for select to authenticated
  using (
    (
      entity_type = 'advertiser'
      and public.is_advertiser_member(entity_id)
    )
    or (
      entity_type = 'campaign'
      and exists (
        select 1 from public.ad_campaigns c
        where c.id = entity_id and public.is_advertiser_member(c.advertiser_account_id)
      )
    )
    or (
      entity_type = 'creative'
      and exists (
        select 1 from public.ad_creatives cr
        where cr.id = entity_id and public.is_advertiser_member(cr.advertiser_account_id)
      )
    )
    or (
      entity_type = 'ad'
      and exists (
        select 1
        from public.ads a
        join public.ad_sets s on s.id = a.ad_set_id
        join public.ad_campaigns c on c.id = s.campaign_id
        where a.id = entity_id and public.is_advertiser_member(c.advertiser_account_id)
      )
    )
    or (
      entity_type = 'ad_set'
      and exists (
        select 1
        from public.ad_sets s
        join public.ad_campaigns c on c.id = s.campaign_id
        where s.id = entity_id and public.is_advertiser_member(c.advertiser_account_id)
      )
    )
  );

-- Metrics / events: members read only; no client writes
drop policy if exists "Members read impression events" on public.ad_impression_events;
create policy "Members read impression events"
  on public.ad_impression_events for select to authenticated
  using (public.is_advertiser_member(advertiser_account_id));

drop policy if exists "Members read click events" on public.ad_click_events;
create policy "Members read click events"
  on public.ad_click_events for select to authenticated
  using (public.is_advertiser_member(advertiser_account_id));

drop policy if exists "Members read daily metrics" on public.ad_daily_metrics;
create policy "Members read daily metrics"
  on public.ad_daily_metrics for select to authenticated
  using (public.is_advertiser_member(advertiser_account_id));

-- Grants: revoke anon everywhere sensitive
revoke all on table public.advertiser_accounts from anon, public;
revoke all on table public.advertiser_members from anon, public;
revoke all on table public.ad_campaigns from anon, public;
revoke all on table public.ad_sets from anon, public;
revoke all on table public.ad_creatives from anon, public;
revoke all on table public.ads from anon, public;
revoke all on table public.ad_review_events from anon, public;
revoke all on table public.ad_impression_events from anon, public;
revoke all on table public.ad_click_events from anon, public;
revoke all on table public.ad_daily_metrics from anon, public;

grant select, insert, update on table public.advertiser_accounts to authenticated;
grant select, insert, update, delete on table public.advertiser_members to authenticated;
grant select, insert, update, delete on table public.ad_campaigns to authenticated;
grant select, insert, update, delete on table public.ad_sets to authenticated;
grant select, insert, update, delete on table public.ad_creatives to authenticated;
grant select, insert, update, delete on table public.ads to authenticated;
grant select on table public.ad_review_events to authenticated;
grant select on table public.ad_impression_events to authenticated;
grant select on table public.ad_click_events to authenticated;
grant select on table public.ad_daily_metrics to authenticated;

revoke insert, update, delete on table public.ad_review_events from authenticated;
revoke insert, update, delete on table public.ad_impression_events from authenticated;
revoke insert, update, delete on table public.ad_click_events from authenticated;
revoke insert, update, delete on table public.ad_daily_metrics from authenticated;

-- ---------------------------------------------------------------------------
-- 12) Submit / pause helpers (authenticated, membership-gated)
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so review_event inserts succeed; auth.uid() still enforced.
create or replace function public.submit_advertiser_for_review(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.advertiser_has_role(p_account_id, array['owner', 'admin']) then
    raise exception 'Not authorized';
  end if;

  update public.advertiser_accounts
  set status = 'pending_review', updated_at = now()
  where id = p_account_id
    and status in ('draft', 'rejected');

  if not found then
    raise exception 'Advertiser account cannot be submitted';
  end if;

  insert into public.ad_review_events (entity_type, entity_id, action, actor_id)
  values ('advertiser', p_account_id, 'submitted', auth.uid());
end;
$$;

create or replace function public.submit_campaign_for_review(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  camp public.ad_campaigns%rowtype;
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

  update public.ad_campaigns
  set status = 'pending_review', updated_at = now()
  where id = p_campaign_id
    and status in ('draft', 'rejected');

  if not found then
    raise exception 'Campaign cannot be submitted';
  end if;

  insert into public.ad_review_events (entity_type, entity_id, action, actor_id)
  values ('campaign', p_campaign_id, 'submitted', auth.uid());
end;
$$;

create or replace function public.submit_creative_for_review(p_creative_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cr public.ad_creatives%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into cr from public.ad_creatives where id = p_creative_id;
  if not found then
    raise exception 'Creative not found';
  end if;
  if not public.advertiser_has_role(
    cr.advertiser_account_id,
    array['owner', 'admin', 'campaign_manager']
  ) then
    raise exception 'Not authorized';
  end if;

  update public.ad_creatives
  set status = 'pending_review', updated_at = now()
  where id = p_creative_id
    and status in ('draft', 'rejected');

  if not found then
    raise exception 'Creative cannot be submitted';
  end if;

  insert into public.ad_review_events (entity_type, entity_id, action, actor_id)
  values ('creative', p_creative_id, 'submitted', auth.uid());
end;
$$;

create or replace function public.pause_ad_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  camp public.ad_campaigns%rowtype;
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

  update public.ad_campaigns
  set status = 'paused', updated_at = now()
  where id = p_campaign_id
    and status in ('active', 'approved');

  if not found then
    raise exception 'Campaign cannot be paused';
  end if;
end;
$$;

revoke all on function public.submit_advertiser_for_review(uuid) from public, anon;
grant execute on function public.submit_advertiser_for_review(uuid) to authenticated;

revoke all on function public.submit_campaign_for_review(uuid) from public, anon;
grant execute on function public.submit_campaign_for_review(uuid) to authenticated;

revoke all on function public.submit_creative_for_review(uuid) from public, anon;
grant execute on function public.submit_creative_for_review(uuid) to authenticated;

revoke all on function public.pause_ad_campaign(uuid) from public, anon;
grant execute on function public.pause_ad_campaign(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 13) Admin review RPCs (service_role only)
-- ---------------------------------------------------------------------------

create or replace function public.approve_advertiser_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'approve_advertiser_account is service_role only';
  end if;

  update public.advertiser_accounts
  set status = 'approved', reviewed_at = now(), updated_at = now()
  where id = p_account_id and status = 'pending_review';

  if not found then
    raise exception 'Pending advertiser account not found';
  end if;

  insert into public.ad_review_events (entity_type, entity_id, action, reviewer_id)
  values ('advertiser', p_account_id, 'approved', null);
end;
$$;

create or replace function public.reject_advertiser_account(
  p_account_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'reject_advertiser_account is service_role only';
  end if;

  update public.advertiser_accounts
  set
    status = 'rejected',
    review_note = nullif(trim(p_note), ''),
    reviewed_at = now(),
    updated_at = now()
  where id = p_account_id and status = 'pending_review';

  if not found then
    raise exception 'Pending advertiser account not found';
  end if;

  insert into public.ad_review_events (
    entity_type, entity_id, action, reason, reviewer_id
  ) values (
    'advertiser', p_account_id, 'rejected', nullif(trim(p_note), ''), null
  );
end;
$$;

create or replace function public.suspend_advertiser_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'suspend_advertiser_account is service_role only';
  end if;

  update public.advertiser_accounts
  set status = 'suspended', reviewed_at = now(), updated_at = now()
  where id = p_account_id;

  if not found then
    raise exception 'Advertiser account not found';
  end if;

  update public.ad_campaigns
  set status = 'suspended', updated_at = now()
  where advertiser_account_id = p_account_id
    and status in ('active', 'approved', 'paused');

  insert into public.ad_review_events (entity_type, entity_id, action)
  values ('advertiser', p_account_id, 'suspended');
end;
$$;

create or replace function public.approve_ad_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  camp public.ad_campaigns%rowtype;
  acct_status text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'approve_ad_campaign is service_role only';
  end if;

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

  insert into public.ad_review_events (entity_type, entity_id, action)
  values ('campaign', p_campaign_id, 'approved');
end;
$$;

create or replace function public.reject_ad_campaign(
  p_campaign_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'reject_ad_campaign is service_role only';
  end if;

  update public.ad_campaigns
  set status = 'rejected', updated_at = now()
  where id = p_campaign_id and status = 'pending_review';

  if not found then
    raise exception 'Pending campaign not found';
  end if;

  insert into public.ad_review_events (entity_type, entity_id, action, reason)
  values ('campaign', p_campaign_id, 'rejected', nullif(trim(p_note), ''));
end;
$$;

create or replace function public.approve_ad_creative(p_creative_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'approve_ad_creative is service_role only';
  end if;

  update public.ad_creatives
  set status = 'approved', updated_at = now()
  where id = p_creative_id and status = 'pending_review';

  if not found then
    raise exception 'Pending creative not found';
  end if;

  insert into public.ad_review_events (entity_type, entity_id, action)
  values ('creative', p_creative_id, 'approved');
end;
$$;

create or replace function public.reject_ad_creative(
  p_creative_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'reject_ad_creative is service_role only';
  end if;

  update public.ad_creatives
  set
    status = 'rejected',
    moderation_notes = nullif(trim(p_note), ''),
    updated_at = now()
  where id = p_creative_id and status = 'pending_review';

  if not found then
    raise exception 'Pending creative not found';
  end if;

  insert into public.ad_review_events (entity_type, entity_id, action, reason)
  values ('creative', p_creative_id, 'rejected', nullif(trim(p_note), ''));
end;
$$;

-- Allow SECURITY DEFINER to insert review events
grant insert on table public.ad_review_events to postgres, service_role;

revoke all on function public.approve_advertiser_account(uuid) from public, anon, authenticated;
grant execute on function public.approve_advertiser_account(uuid) to service_role;

revoke all on function public.reject_advertiser_account(uuid, text) from public, anon, authenticated;
grant execute on function public.reject_advertiser_account(uuid, text) to service_role;

revoke all on function public.suspend_advertiser_account(uuid) from public, anon, authenticated;
grant execute on function public.suspend_advertiser_account(uuid) to service_role;

revoke all on function public.approve_ad_campaign(uuid) from public, anon, authenticated;
grant execute on function public.approve_ad_campaign(uuid) to service_role;

revoke all on function public.reject_ad_campaign(uuid, text) from public, anon, authenticated;
grant execute on function public.reject_ad_campaign(uuid, text) to service_role;

revoke all on function public.approve_ad_creative(uuid) from public, anon, authenticated;
grant execute on function public.approve_ad_creative(uuid) to service_role;

revoke all on function public.reject_ad_creative(uuid, text) from public, anon, authenticated;
grant execute on function public.reject_ad_creative(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 14) Storage: private ad-creatives bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ad-creatives',
  'ad-creatives',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path: {advertiser_account_id}/{user_id}/{filename}
drop policy if exists "Advertiser members read ad creatives" on storage.objects;
drop policy if exists "Advertiser managers upload ad creatives" on storage.objects;
drop policy if exists "Advertiser managers update ad creatives" on storage.objects;
drop policy if exists "Advertiser managers delete ad creatives" on storage.objects;

create policy "Advertiser members read ad creatives"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ad-creatives'
    and public.is_advertiser_member(((storage.foldername(name))[1])::uuid)
  );

create policy "Advertiser managers upload ad creatives"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ad-creatives'
    and public.advertiser_has_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'campaign_manager']
    )
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );

create policy "Advertiser managers update ad creatives"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'ad-creatives'
    and public.advertiser_has_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'campaign_manager']
    )
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'ad-creatives'
    and public.advertiser_has_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'campaign_manager']
    )
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );

create policy "Advertiser managers delete ad creatives"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'ad-creatives'
    and public.advertiser_has_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'campaign_manager']
    )
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );

-- ---------------------------------------------------------------------------
-- 15) Hardening: immutable fields, status guards, membership, activation
-- ---------------------------------------------------------------------------

-- Lock owner_id / privileged status on advertiser accounts for non-service roles.
create or replace function public.advertiser_accounts_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.role() is not distinct from 'service_role' then
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

drop trigger if exists advertiser_accounts_guard_trg on public.advertiser_accounts;
create trigger advertiser_accounts_guard_trg
  before insert or update on public.advertiser_accounts
  for each row execute function public.advertiser_accounts_guard();

-- Campaign status / created_by guards + activation business gates.
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
  if auth.role() is not distinct from 'service_role' then
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

      -- Defense in depth: even a direct UPDATE to active must pass gates.
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

drop trigger if exists ad_campaigns_guard_trg on public.ad_campaigns;
create trigger ad_campaigns_guard_trg
  before insert or update on public.ad_campaigns
  for each row execute function public.ad_campaigns_guard();

-- Creative status / created_by / approved immutability.
create or replace function public.ad_creatives_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.role() is not distinct from 'service_role' then
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

drop trigger if exists ad_creatives_guard_trg on public.ad_creatives;
create trigger ad_creatives_guard_trg
  before insert or update on public.ad_creatives
  for each row execute function public.ad_creatives_guard();

-- Membership: first owner bootstrap only; protect last owner; no self role changes.
create or replace function public.advertiser_members_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  owner_count integer;
begin
  if auth.role() is not distinct from 'service_role' then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    if new.role = 'owner' then
      if not exists (
        select 1
        from public.advertiser_accounts a
        where a.id = new.advertiser_account_id
          and a.owner_id = new.user_id
      ) then
        raise exception 'Cannot assign owner role';
      end if;
      select count(*)::integer into owner_count
      from public.advertiser_members m
      where m.advertiser_account_id = new.advertiser_account_id
        and m.role = 'owner';
      if owner_count > 0 then
        raise exception 'Cannot assign owner role';
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'Membership user_id is immutable';
    end if;
    if new.advertiser_account_id is distinct from old.advertiser_account_id then
      raise exception 'Membership account is immutable';
    end if;
    if new.user_id = auth.uid() and new.role is distinct from old.role then
      raise exception 'Cannot change your own role';
    end if;
    if new.role = 'owner' and old.role is distinct from 'owner' then
      raise exception 'Cannot promote to owner';
    end if;
    if old.role = 'owner' and new.role is distinct from 'owner' then
      select count(*)::integer into owner_count
      from public.advertiser_members m
      where m.advertiser_account_id = old.advertiser_account_id
        and m.role = 'owner'
        and m.user_id is distinct from old.user_id;
      if owner_count < 1 then
        raise exception 'Cannot demote the last owner';
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.role = 'owner' then
      select count(*)::integer into owner_count
      from public.advertiser_members m
      where m.advertiser_account_id = old.advertiser_account_id
        and m.role = 'owner'
        and m.user_id is distinct from old.user_id;
      if owner_count < 1 then
        raise exception 'Cannot remove the last owner';
      end if;
    end if;
    return old;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists advertiser_members_guard_trg on public.advertiser_members;
create trigger advertiser_members_guard_trg
  before insert or update or delete on public.advertiser_members
  for each row execute function public.advertiser_members_guard();

create or replace function public.archive_ad_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  camp public.ad_campaigns%rowtype;
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

  update public.ad_campaigns
  set status = 'archived', updated_at = now()
  where id = p_campaign_id
    and status in ('draft', 'approved', 'paused', 'rejected', 'completed');

  if not found then
    raise exception 'Campaign cannot be archived';
  end if;
end;
$$;

create or replace function public.activate_ad_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  camp public.ad_campaigns%rowtype;
  acct public.advertiser_accounts%rowtype;
  approved_creatives integer;
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
  if camp.status is distinct from 'approved' and camp.status is distinct from 'paused' then
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

  select count(*)::integer into approved_creatives
  from public.ad_creatives c
  where c.campaign_id = camp.id
    and c.status = 'approved';
  if approved_creatives < 1 then
    raise exception 'At least one approved creative is required';
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

revoke all on function public.archive_ad_campaign(uuid) from public, anon;
grant execute on function public.archive_ad_campaign(uuid) to authenticated;

revoke all on function public.activate_ad_campaign(uuid) from public, anon;
grant execute on function public.activate_ad_campaign(uuid) to authenticated;
