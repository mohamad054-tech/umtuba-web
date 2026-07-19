-- UMTUBA Store Seller Self-Service V1
-- Store Setup Wizard: draft-only client writes, atomic submit RPC,
-- DB checklist enforcement, approve defense-in-depth.
-- Additive on Marketplace Foundation + Admin Moderation. Fail-closed RLS.
-- No checkout / orders / shipping / payments.

-- ---------------------------------------------------------------------------
-- 1) Seller application: draft status + wizard fields
-- ---------------------------------------------------------------------------

alter table public.seller_applications
  drop constraint if exists seller_applications_status_check;

alter table public.seller_applications
  add constraint seller_applications_status_check
  check (status in ('draft', 'pending', 'approved', 'rejected', 'suspended'));

alter table public.seller_applications
  add column if not exists proposed_tagline text;

alter table public.seller_applications
  drop constraint if exists seller_applications_proposed_tagline_check;
alter table public.seller_applications
  add constraint seller_applications_proposed_tagline_check
  check (proposed_tagline is null or char_length(proposed_tagline) <= 160);

alter table public.seller_applications
  add column if not exists public_contact_url text;

alter table public.seller_applications
  drop constraint if exists seller_applications_public_contact_url_check;
alter table public.seller_applications
  add constraint seller_applications_public_contact_url_check
  check (
    public_contact_url is null
    or (
      char_length(public_contact_url) between 1 and 300
      and public_contact_url !~ '\s'
      and public_contact_url ~* '^https?://'
      and lower(public_contact_url) !~ '^(javascript|data|file):'
    )
  );

alter table public.seller_applications
  add column if not exists store_template text;

alter table public.seller_applications
  drop constraint if exists seller_applications_store_template_check;
alter table public.seller_applications
  add constraint seller_applications_store_template_check
  check (
    store_template is null
    or store_template in (
      'boutique', 'marketplace', 'digital', 'services', 'general'
    )
  );

alter table public.seller_applications
  add column if not exists return_policy text;

alter table public.seller_applications
  drop constraint if exists seller_applications_return_policy_check;
alter table public.seller_applications
  add constraint seller_applications_return_policy_check
  check (return_policy is null or char_length(return_policy) <= 5000);

alter table public.seller_applications
  add column if not exists shipping_policy text;

alter table public.seller_applications
  drop constraint if exists seller_applications_shipping_policy_check;
alter table public.seller_applications
  add constraint seller_applications_shipping_policy_check
  check (shipping_policy is null or char_length(shipping_policy) <= 5000);

alter table public.seller_applications
  add column if not exists privacy_policy text;

alter table public.seller_applications
  drop constraint if exists seller_applications_privacy_policy_check;
alter table public.seller_applications
  add constraint seller_applications_privacy_policy_check
  check (privacy_policy is null or char_length(privacy_policy) <= 5000);

alter table public.seller_applications
  add column if not exists wizard_step integer not null default 1;

alter table public.seller_applications
  drop constraint if exists seller_applications_wizard_step_check;
alter table public.seller_applications
  add constraint seller_applications_wizard_step_check
  check (wizard_step >= 1 and wizard_step <= 6);

-- Tighten phone format when present (length already constrained by foundation).
alter table public.seller_applications
  drop constraint if exists seller_applications_public_contact_phone_format_check;
alter table public.seller_applications
  add constraint seller_applications_public_contact_phone_format_check
  check (
    public_contact_phone is null
    or (
      char_length(btrim(public_contact_phone)) between 1 and 40
      and public_contact_phone ~ '^[0-9+()[:space:].-]+$'
    )
  );

-- One open application per user (draft counts as open).
drop index if exists public.seller_applications_one_open_per_user_uidx;
create unique index seller_applications_one_open_per_user_uidx
  on public.seller_applications (user_id)
  where status in ('draft', 'pending', 'approved', 'suspended');

-- Reserve slugs while drafting or pending review.
drop index if exists public.seller_applications_pending_slug_uidx;
drop index if exists public.seller_applications_open_slug_uidx;
create unique index seller_applications_open_slug_uidx
  on public.seller_applications (lower(proposed_store_slug))
  where status in ('draft', 'pending');

-- ---------------------------------------------------------------------------
-- 2) Store public profile: template + policies + contact URL
-- ---------------------------------------------------------------------------

alter table public.stores
  add column if not exists public_contact_url text;

alter table public.stores
  drop constraint if exists stores_public_contact_url_check;
alter table public.stores
  add constraint stores_public_contact_url_check
  check (
    public_contact_url is null
    or (
      char_length(public_contact_url) between 1 and 300
      and public_contact_url !~ '\s'
      and public_contact_url ~* '^https?://'
      and lower(public_contact_url) !~ '^(javascript|data|file):'
    )
  );

alter table public.stores
  add column if not exists store_template text;

alter table public.stores
  drop constraint if exists stores_store_template_check;
alter table public.stores
  add constraint stores_store_template_check
  check (
    store_template is null
    or store_template in (
      'boutique', 'marketplace', 'digital', 'services', 'general'
    )
  );

alter table public.stores
  add column if not exists tagline text;

alter table public.stores
  drop constraint if exists stores_tagline_check;
alter table public.stores
  add constraint stores_tagline_check
  check (tagline is null or char_length(tagline) <= 160);

alter table public.stores
  add column if not exists return_policy text;

alter table public.stores
  drop constraint if exists stores_return_policy_check;
alter table public.stores
  add constraint stores_return_policy_check
  check (return_policy is null or char_length(return_policy) <= 5000);

alter table public.stores
  add column if not exists shipping_policy text;

alter table public.stores
  drop constraint if exists stores_shipping_policy_check;
alter table public.stores
  add constraint stores_shipping_policy_check
  check (shipping_policy is null or char_length(shipping_policy) <= 5000);

alter table public.stores
  add column if not exists privacy_policy text;

alter table public.stores
  drop constraint if exists stores_privacy_policy_check;
alter table public.stores
  add constraint stores_privacy_policy_check
  check (privacy_policy is null or char_length(privacy_policy) <= 5000);

-- ---------------------------------------------------------------------------
-- 3) Completeness guard (submit + approve defense in depth)
-- ---------------------------------------------------------------------------

create or replace function public.assert_seller_application_ready_for_review(
  app public.seller_applications
)
returns void
language plpgsql
as $$
begin
  if app.proposed_store_name is null
     or char_length(btrim(app.proposed_store_name)) < 2
     or char_length(btrim(app.proposed_store_name)) > 80 then
    raise exception 'Store name must be 2–80 characters';
  end if;

  if app.proposed_store_slug is null
     or app.proposed_store_slug !~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$' then
    raise exception 'Store slug is invalid';
  end if;

  if app.proposed_description is null
     or char_length(btrim(app.proposed_description)) < 20
     or char_length(app.proposed_description) > 2000 then
    raise exception 'Store description must be at least 20 characters';
  end if;

  if app.proposed_tagline is not null
     and char_length(app.proposed_tagline) > 160 then
    raise exception 'Store tagline is too long';
  end if;

  if app.city is null or char_length(btrim(app.city)) < 1 then
    raise exception 'City is required';
  end if;

  if app.country_code is null or app.country_code !~ '^[A-Z]{2}$' then
    raise exception 'Country code is required';
  end if;

  if app.default_currency is null or app.default_currency !~ '^[A-Z]{3}$' then
    raise exception 'Default currency is invalid';
  end if;

  if app.store_template is null
     or app.store_template not in (
       'boutique', 'marketplace', 'digital', 'services', 'general'
     ) then
    raise exception 'Store template is required';
  end if;

  if (app.public_contact_email is null or btrim(app.public_contact_email) = '')
     and (app.public_contact_phone is null or btrim(app.public_contact_phone) = '') then
    raise exception 'Public contact email or phone is required';
  end if;

  if app.public_contact_email is not null
     and btrim(app.public_contact_email) <> ''
     and app.public_contact_email !~ '^\S+@\S+\.\S+$' then
    raise exception 'Contact email is invalid';
  end if;

  if app.public_contact_phone is not null
     and btrim(app.public_contact_phone) <> ''
     and (
       char_length(btrim(app.public_contact_phone)) > 40
       or app.public_contact_phone !~ '^[0-9+()[:space:].-]+$'
     ) then
    raise exception 'Contact phone is invalid';
  end if;

  if app.public_contact_url is not null
     and btrim(app.public_contact_url) <> ''
     and (
       app.public_contact_url ~ '\s'
       or app.public_contact_url !~* '^https?://'
       or lower(app.public_contact_url) ~ '^(javascript|data|file):'
     ) then
    raise exception 'Contact link must be a valid http or https URL';
  end if;

  if app.return_policy is null
     or char_length(btrim(app.return_policy)) < 20
     or char_length(app.return_policy) > 5000 then
    raise exception 'Return policy must be at least 20 characters';
  end if;

  if app.shipping_policy is null
     or char_length(btrim(app.shipping_policy)) < 20
     or char_length(app.shipping_policy) > 5000 then
    raise exception 'Shipping policy must be at least 20 characters';
  end if;
end;
$$;

revoke all on function public.assert_seller_application_ready_for_review(public.seller_applications)
  from public, anon, authenticated;
grant execute on function public.assert_seller_application_ready_for_review(public.seller_applications)
  to service_role;

-- ---------------------------------------------------------------------------
-- 4) RLS: draft-only client writes (no direct pending insert/update)
-- ---------------------------------------------------------------------------

drop policy if exists "Users insert own pending seller applications"
  on public.seller_applications;
drop policy if exists "Users insert own draft or pending seller applications"
  on public.seller_applications;
drop policy if exists "Users insert own draft seller applications"
  on public.seller_applications;
create policy "Users insert own draft seller applications"
  on public.seller_applications
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'draft'
  );

drop policy if exists "Users update own pending seller applications"
  on public.seller_applications;
drop policy if exists "Users update own draft seller applications"
  on public.seller_applications;
create policy "Users update own draft seller applications"
  on public.seller_applications
  for update
  to authenticated
  using (user_id = auth.uid() and status = 'draft')
  with check (
    user_id = auth.uid()
    and status = 'draft'
  );

-- ---------------------------------------------------------------------------
-- 5) Atomic submit RPC — only path from draft → pending for sellers
-- ---------------------------------------------------------------------------

create or replace function public.submit_my_seller_application()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  app public.seller_applications%rowtype;
  updated_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock the caller's draft only (never accept foreign application ids).
  select *
  into app
  from public.seller_applications
  where user_id = uid
    and status = 'draft'
  order by created_at desc
  limit 1
  for update;

  if not found then
    -- Distinguish "already pending" from "no draft" for safer client messaging.
    if exists (
      select 1
      from public.seller_applications
      where user_id = uid
        and status = 'pending'
    ) then
      raise exception 'Seller application is already pending review';
    end if;
    raise exception 'No draft seller application found';
  end if;

  perform public.assert_seller_application_ready_for_review(app);

  update public.seller_applications
  set
    status = 'pending',
    wizard_step = 6,
    updated_at = now()
  where id = app.id
    and user_id = uid
    and status = 'draft'
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Seller application is no longer a draft';
  end if;

  return updated_id;
end;
$$;

revoke all on function public.submit_my_seller_application() from public, anon;
grant execute on function public.submit_my_seller_application() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Approve RPCs: copy setup fields + reject incomplete pending
-- ---------------------------------------------------------------------------

create or replace function public.approve_seller_application(p_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.seller_applications%rowtype;
  new_store_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'approve_seller_application is service_role only';
  end if;

  select * into app
  from public.seller_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Seller application not found';
  end if;

  if app.status is distinct from 'pending' then
    raise exception 'Seller application is not pending';
  end if;

  if app.store_id is not null then
    raise exception 'Seller application already linked to a store';
  end if;

  perform public.assert_seller_application_ready_for_review(app);

  insert into public.stores (
    owner_user_id,
    slug,
    name,
    description,
    status,
    verification_status,
    default_currency,
    country_code,
    city,
    public_contact_email,
    public_contact_phone,
    public_contact_url,
    store_template,
    tagline,
    return_policy,
    shipping_policy,
    privacy_policy
  ) values (
    app.user_id,
    app.proposed_store_slug,
    app.proposed_store_name,
    app.proposed_description,
    'active',
    'verified',
    app.default_currency,
    app.country_code,
    app.city,
    app.public_contact_email,
    app.public_contact_phone,
    app.public_contact_url,
    app.store_template,
    app.proposed_tagline,
    app.return_policy,
    app.shipping_policy,
    app.privacy_policy
  )
  returning id into new_store_id;

  insert into public.store_members (store_id, user_id, role, status)
  values (new_store_id, app.user_id, 'owner', 'active')
  on conflict do nothing;

  update public.seller_applications
  set
    status = 'approved',
    store_id = new_store_id,
    reviewed_at = now()
  where id = app.id;

  return new_store_id;
end;
$$;

revoke all on function public.approve_seller_application(uuid) from public;
revoke all on function public.approve_seller_application(uuid) from anon, authenticated;
grant execute on function public.approve_seller_application(uuid) to service_role;

create or replace function public.admin_approve_seller_application(p_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.seller_applications%rowtype;
  new_store_id uuid;
begin
  perform public.require_platform_admin();

  select * into app
  from public.seller_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Seller application not found';
  end if;

  if app.status is distinct from 'pending' then
    raise exception 'Seller application is not pending';
  end if;

  if app.store_id is not null then
    raise exception 'Seller application already linked to a store';
  end if;

  perform public.assert_seller_application_ready_for_review(app);

  insert into public.stores (
    owner_user_id,
    slug,
    name,
    description,
    status,
    verification_status,
    default_currency,
    country_code,
    city,
    public_contact_email,
    public_contact_phone,
    public_contact_url,
    store_template,
    tagline,
    return_policy,
    shipping_policy,
    privacy_policy
  ) values (
    app.user_id,
    app.proposed_store_slug,
    app.proposed_store_name,
    app.proposed_description,
    'active',
    'verified',
    app.default_currency,
    app.country_code,
    app.city,
    app.public_contact_email,
    app.public_contact_phone,
    app.public_contact_url,
    app.store_template,
    app.proposed_tagline,
    app.return_policy,
    app.shipping_policy,
    app.privacy_policy
  )
  returning id into new_store_id;

  insert into public.store_members (store_id, user_id, role, status)
  values (new_store_id, app.user_id, 'owner', 'active')
  on conflict do nothing;

  update public.seller_applications
  set
    status = 'approved',
    store_id = new_store_id,
    reviewed_at = now()
  where id = app.id;

  return new_store_id;
end;
$$;

revoke all on function public.admin_approve_seller_application(uuid) from public, anon;
grant execute on function public.admin_approve_seller_application(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) Admin list excludes in-progress drafts from the "all" filter
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_seller_applications(
  p_status text default 'pending',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  user_id uuid,
  applicant_username text,
  applicant_display_name text,
  proposed_store_name text,
  proposed_store_slug text,
  city text,
  country_code text,
  public_contact_email text,
  public_contact_phone text,
  default_currency text,
  status text,
  review_note text,
  store_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  st text := nullif(btrim(coalesce(p_status, '')), '');
begin
  perform public.require_platform_admin();

  if st is not null and st not in ('pending', 'approved', 'rejected', 'suspended', 'all') then
    raise exception 'Invalid status filter';
  end if;
  if st = 'all' then
    st := null;
  end if;

  return query
  select
    a.id,
    a.user_id,
    p.username::text as applicant_username,
    coalesce(p.display_name, p.full_name)::text as applicant_display_name,
    a.proposed_store_name,
    a.proposed_store_slug,
    a.city,
    a.country_code,
    a.public_contact_email,
    a.public_contact_phone,
    a.default_currency,
    a.status,
    a.review_note,
    a.store_id,
    a.created_at,
    a.updated_at,
    a.reviewed_at
  from public.seller_applications a
  left join public.profiles p on p.id = a.user_id
  where a.status is distinct from 'draft'
    and (st is null or a.status = st)
  order by
    case when a.status = 'pending' then 0 else 1 end,
    a.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, least(coalesce(p_offset, 0), 5000));
end;
$$;

revoke all on function public.admin_list_seller_applications(text, integer, integer) from public, anon;
grant execute on function public.admin_list_seller_applications(text, integer, integer) to authenticated, service_role;
