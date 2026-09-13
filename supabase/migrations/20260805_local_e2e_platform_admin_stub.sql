-- LOCAL E2E ONLY — minimal platform_admins + is_platform_admin from ads admin foundation.
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
grant select on table public.platform_admins to authenticated;
revoke insert, update, delete on table public.platform_admins from authenticated;
grant all on table public.platform_admins to service_role;

drop policy if exists "Platform admins read own row" on public.platform_admins;
create policy "Platform admins read own row"
  on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

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
