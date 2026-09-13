-- UMTUBA Data Export Requests V1
-- Additive / idempotent. Fail-closed RLS. Request queue only.
--
-- This migration stores an identity-verified EXPORT REQUEST only.
-- It does not generate, package, or download user data.
-- Operator fulfillment of queued requests is a later controlled task.
--
-- Numbered 20260940 — after 20260939 (highest applied on production).
-- 20260939 is not present on origin/alpha-0.2.
--
-- Do NOT apply to the remote Supabase project from Desktop.
-- Do NOT run supabase db push.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

create table if not exists public.data_export_requests (
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
  constraint data_export_requests_processed_at_chk check (
    (status in ('pending') and processed_at is null)
    or (status in ('processing', 'completed', 'cancelled', 'rejected'))
  )
);

comment on table public.data_export_requests is
  'Authenticated data-export requests from the public web flow. Queued for operator fulfillment; does not export data by itself.';

create unique index if not exists data_export_requests_one_open_per_user_uidx
  on public.data_export_requests (user_id)
  where status in ('pending', 'processing');

create index if not exists data_export_requests_user_id_idx
  on public.data_export_requests (user_id, requested_at desc);

create index if not exists data_export_requests_status_idx
  on public.data_export_requests (status, requested_at desc);

-- ---------------------------------------------------------------------------
-- 2. Insert hardening — authenticated callers cannot spoof user_id or status
-- ---------------------------------------------------------------------------

create or replace function public.data_export_requests_before_write()
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
    raise exception 'Data export requests cannot be updated by the requester'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists data_export_requests_before_write
  on public.data_export_requests;
create trigger data_export_requests_before_write
  before insert or update on public.data_export_requests
  for each row execute function public.data_export_requests_before_write();

-- ---------------------------------------------------------------------------
-- 3. RLS (fail-closed for anon; owners insert/select only)
-- ---------------------------------------------------------------------------

alter table public.data_export_requests enable row level security;
alter table public.data_export_requests force row level security;

revoke all on table public.data_export_requests from public;
revoke all on table public.data_export_requests from anon;
revoke all on table public.data_export_requests from authenticated;

grant select, insert on table public.data_export_requests to authenticated;
grant all on table public.data_export_requests to service_role;

drop policy if exists "Users can read own data export requests"
  on public.data_export_requests;
create policy "Users can read own data export requests"
  on public.data_export_requests
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own data export requests"
  on public.data_export_requests;
create policy "Users can insert own data export requests"
  on public.data_export_requests
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
    and source = 'web'
  );

-- No authenticated UPDATE or DELETE policies.

revoke all on function public.data_export_requests_before_write() from public;
revoke all on function public.data_export_requests_before_write() from anon;
grant execute on function public.data_export_requests_before_write() to authenticated;
grant execute on function public.data_export_requests_before_write() to service_role;
