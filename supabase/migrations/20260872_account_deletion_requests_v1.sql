-- UMTUBA Account Deletion Requests V1
-- Additive / idempotent. Fail-closed RLS. Request queue only.
--
-- This migration stores an identity-verified DELETION REQUEST only.
-- It does not delete auth users, profiles, posts, storage, messages, or orders.
-- Operator/Central fulfillment of queued requests is a later controlled cleanup.
--
-- Do NOT apply to the remote Supabase project from Desktop.
-- Apply per docs/DEVELOPMENT_WORKFLOW.md (targeted migration; never supabase db push).

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text
    check (
      email is null
      or char_length(btrim(email)) between 3 and 320
    ),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'cancelled', 'rejected')),
  source text not null default 'web'
    check (source in ('web')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  operator_note text
    check (
      operator_note is null
      or char_length(operator_note) <= 2000
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_deletion_requests_processed_at_chk check (
    (status in ('pending') and processed_at is null)
    or (status in ('processing', 'completed', 'cancelled', 'rejected'))
  )
);

comment on table public.account_deletion_requests is
  'Authenticated account-deletion requests from the public web flow. Queued for operator fulfillment; does not delete accounts by itself.';

create unique index if not exists account_deletion_requests_one_open_per_user_uidx
  on public.account_deletion_requests (user_id)
  where status in ('pending', 'processing');

create index if not exists account_deletion_requests_user_id_idx
  on public.account_deletion_requests (user_id, requested_at desc);

create index if not exists account_deletion_requests_status_idx
  on public.account_deletion_requests (status, requested_at desc);

-- ---------------------------------------------------------------------------
-- 2. Insert hardening — authenticated callers cannot spoof user_id or status
-- ---------------------------------------------------------------------------

create or replace function public.account_deletion_requests_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if v_role = 'service_role' then
    if new.user_id is null then
      raise exception 'user_id is required'
        using errcode = '23502';
    end if;
    if tg_op = 'UPDATE' then
      new.updated_at := now();
    end if;
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'Not authenticated'
      using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.status := 'pending';
    new.source := 'web';
    new.requested_at := now();
    new.processed_at := null;
    new.operator_note := null;
  elsif tg_op = 'UPDATE' then
    -- Authenticated users cannot change status, ownership, or operator fields.
    raise exception 'Account deletion requests cannot be updated by the requester'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists account_deletion_requests_before_write
  on public.account_deletion_requests;
create trigger account_deletion_requests_before_write
  before insert or update on public.account_deletion_requests
  for each row execute function public.account_deletion_requests_before_write();

-- ---------------------------------------------------------------------------
-- 3. RLS (fail-closed for anon; owners insert/select only)
-- ---------------------------------------------------------------------------

alter table public.account_deletion_requests enable row level security;
alter table public.account_deletion_requests force row level security;

revoke all on table public.account_deletion_requests from public;
revoke all on table public.account_deletion_requests from anon;
revoke all on table public.account_deletion_requests from authenticated;

grant select, insert on table public.account_deletion_requests to authenticated;
grant all on table public.account_deletion_requests to service_role;

drop policy if exists "Users can read own account deletion requests"
  on public.account_deletion_requests;
create policy "Users can read own account deletion requests"
  on public.account_deletion_requests
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own account deletion requests"
  on public.account_deletion_requests;
create policy "Users can insert own account deletion requests"
  on public.account_deletion_requests
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
    and source = 'web'
  );

-- No authenticated UPDATE or DELETE policies.

revoke all on function public.account_deletion_requests_before_write() from public;
revoke all on function public.account_deletion_requests_before_write() from anon;
grant execute on function public.account_deletion_requests_before_write() to authenticated;
grant execute on function public.account_deletion_requests_before_write() to service_role;
