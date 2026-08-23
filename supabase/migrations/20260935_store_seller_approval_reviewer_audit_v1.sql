-- UMTUBA Store seller approval reviewer audit V1
-- Local repo file only. Do not apply to remote Supabase in this GO.
-- Stamps reviewer identity on admin approve/reject/suspend.
-- Append-only events. Does not weaken RLS. No auto-approve.

alter table public.seller_applications
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null;

alter table public.seller_applications
  add column if not exists review_action text;

alter table public.seller_applications
  drop constraint if exists seller_applications_review_action_check;

alter table public.seller_applications
  add constraint seller_applications_review_action_check
  check (
    review_action is null
    or review_action in ('approved', 'rejected', 'suspended')
  );

create table if not exists public.seller_application_review_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.seller_applications (id) on delete cascade,
  action text not null check (action in ('approved', 'rejected', 'suspended')),
  reviewer_id uuid not null references auth.users (id) on delete restrict,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists seller_application_review_events_application_id_idx
  on public.seller_application_review_events (application_id, created_at desc);

alter table public.seller_application_review_events enable row level security;

revoke all on table public.seller_application_review_events from public, anon, authenticated;
grant select on table public.seller_application_review_events to authenticated;

drop policy if exists "Platform admins read seller application review events"
  on public.seller_application_review_events;
create policy "Platform admins read seller application review events"
  on public.seller_application_review_events
  for select
  to authenticated
  using (public.is_platform_admin());

create or replace function public.record_seller_application_review_event(
  p_application_id uuid,
  p_action text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer uuid := auth.uid();
begin
  if reviewer is null then
    raise exception 'Reviewer identity required';
  end if;
  if p_action not in ('approved', 'rejected', 'suspended') then
    raise exception 'Invalid seller review action';
  end if;

  insert into public.seller_application_review_events (
    application_id,
    action,
    reviewer_id,
    reason
  ) values (
    p_application_id,
    p_action,
    reviewer,
    nullif(btrim(coalesce(p_reason, '')), '')
  );
end;
$$;

revoke all on function public.record_seller_application_review_event(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.record_seller_application_review_event(uuid, text, text)
  to service_role;

create or replace function public.admin_approve_seller_application(p_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.seller_applications%rowtype;
  new_store_id uuid;
  reviewer uuid := auth.uid();
begin
  perform public.require_platform_admin();
  if reviewer is null then
    raise exception 'Reviewer identity required';
  end if;

  select * into app
  from public.seller_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Seller application not found';
  end if;

  if app.status is distinct from 'pending'
     and app.status is distinct from 'pending_review' then
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
    reviewed_at = now(),
    reviewed_by = reviewer,
    review_action = 'approved'
  where id = app.id;

  perform public.record_seller_application_review_event(app.id, 'approved', null);

  return new_store_id;
end;
$$;

revoke all on function public.admin_approve_seller_application(uuid) from public, anon;
grant execute on function public.admin_approve_seller_application(uuid) to authenticated, service_role;

create or replace function public.admin_reject_seller_application(
  p_application_id uuid,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  note text := nullif(btrim(coalesce(p_note, '')), '');
  reviewer uuid := auth.uid();
begin
  perform public.require_platform_admin();
  if reviewer is null then
    raise exception 'Reviewer identity required';
  end if;

  if note is null or char_length(note) < 3 then
    raise exception 'Rejection reason is required';
  end if;
  if char_length(note) > 1000 then
    raise exception 'Rejection reason is too long';
  end if;

  update public.seller_applications
  set
    status = 'rejected',
    review_note = note,
    reviewed_at = now(),
    reviewed_by = reviewer,
    review_action = 'rejected'
  where id = p_application_id
    and status in ('pending', 'pending_review');

  if not found then
    raise exception 'Pending seller application not found';
  end if;

  perform public.record_seller_application_review_event(
    p_application_id,
    'rejected',
    note
  );
end;
$$;

revoke all on function public.admin_reject_seller_application(uuid, text) from public, anon;
grant execute on function public.admin_reject_seller_application(uuid, text) to authenticated, service_role;

create or replace function public.admin_suspend_seller_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.seller_applications%rowtype;
  reviewer uuid := auth.uid();
begin
  perform public.require_platform_admin();
  if reviewer is null then
    raise exception 'Reviewer identity required';
  end if;

  select * into app
  from public.seller_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Seller application not found';
  end if;

  if app.status = 'suspended' then
    raise exception 'Seller application is already suspended';
  end if;

  if app.status not in ('pending', 'pending_review', 'approved') then
    raise exception 'Only pending or approved seller applications can be suspended';
  end if;

  update public.seller_applications
  set
    status = 'suspended',
    reviewed_at = now(),
    reviewed_by = reviewer,
    review_action = 'suspended'
  where id = app.id;

  if app.store_id is not null then
    update public.stores
    set status = 'suspended'
    where id = app.store_id;
  end if;

  perform public.record_seller_application_review_event(app.id, 'suspended', null);
end;
$$;

revoke all on function public.admin_suspend_seller_application(uuid) from public, anon;
grant execute on function public.admin_suspend_seller_application(uuid) to authenticated, service_role;

drop function if exists public.admin_list_seller_applications(text, integer, integer);

create function public.admin_list_seller_applications(
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
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_action text
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

  if st = 'pending_review' then
    st := 'pending';
  end if;

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
    a.reviewed_at,
    a.reviewed_by,
    a.review_action
  from public.seller_applications a
  left join public.profiles p on p.id = a.user_id
  where a.status is distinct from 'draft'
    and (st is null or a.status = st)
  order by
    case when a.status in ('pending', 'pending_review') then 0 else 1 end,
    a.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, least(coalesce(p_offset, 0), 5000));
end;
$$;

revoke all on function public.admin_list_seller_applications(text, integer, integer) from public, anon;
grant execute on function public.admin_list_seller_applications(text, integer, integer) to authenticated, service_role;
