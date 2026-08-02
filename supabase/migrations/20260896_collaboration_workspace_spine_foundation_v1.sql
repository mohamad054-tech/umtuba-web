-- UMTUBA Collaboration Platform - Workspace Spine Foundation V1
-- Additive overlay. Does NOT replace Learning Spaces, Store members,
-- Advertiser accounts, UEOS, Wallet, or Messaging identity.
-- Does NOT bind Learning/Commerce/Ads products (resource_links schema only).
-- Does NOT extend UEOS account ownership model.
--
-- World hardening: anon/public SELECT must NEVER call is_platform_admin().

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1) collaboration_workspaces
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null
    references public.profiles (id) on delete restrict,
  slug text not null
    constraint collaboration_workspaces_slug_format check (
      char_length(slug) between 3 and 64
      and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  status text not null default 'draft'
    constraint collaboration_workspaces_status_check check (
      status in ('draft', 'active', 'suspended', 'archived')
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  suspended_at timestamptz,
  archived_at timestamptz,
  constraint collaboration_workspaces_slug_unique unique (slug)
);

comment on table public.collaboration_workspaces is
  'Collaboration Platform workspaces (team/company/school/academy). Client writes only via RPCs. owner_user_id changes only via transfer RPC (GUC gated).';

create index if not exists collaboration_workspaces_status_idx
  on public.collaboration_workspaces (status);

create index if not exists collaboration_workspaces_owner_user_id_idx
  on public.collaboration_workspaces (owner_user_id);

drop trigger if exists collaboration_workspaces_set_updated_at
  on public.collaboration_workspaces;
create trigger collaboration_workspaces_set_updated_at
  before update on public.collaboration_workspaces
  for each row execute function public.set_row_updated_at();

create or replace function public.collaboration_workspaces_guard_owner_transfer()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.owner_user_id is distinct from old.owner_user_id
     and current_setting('umtuba.collaboration_ownership_transfer', true)
       is distinct from '1'
  then
    raise exception
      'owner_user_id can only change via transfer_collaboration_workspace_ownership';
  end if;
  return new;
end;
$$;

drop trigger if exists collaboration_workspaces_guard_owner_transfer
  on public.collaboration_workspaces;
create trigger collaboration_workspaces_guard_owner_transfer
  before update on public.collaboration_workspaces
  for each row
  execute function public.collaboration_workspaces_guard_owner_transfer();

alter table public.collaboration_workspaces enable row level security;
alter table public.collaboration_workspaces force row level security;

revoke all on table public.collaboration_workspaces
  from public, anon, authenticated;
grant select on table public.collaboration_workspaces to authenticated;
revoke insert, update, delete on table public.collaboration_workspaces
  from authenticated;
grant all on table public.collaboration_workspaces to service_role;

-- ---------------------------------------------------------------------------
-- 2) collaboration_workspace_profiles (1:1)
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_workspace_profiles (
  workspace_id uuid primary key
    references public.collaboration_workspaces (id) on delete cascade,
  kind text not null
    constraint collaboration_workspace_profiles_kind_check check (
      kind in ('team', 'company', 'school', 'academy')
    ),
  display_name text not null
    constraint collaboration_workspace_profiles_display_name_len check (
      char_length(btrim(display_name)) between 1 and 120
    ),
  legal_name text
    constraint collaboration_workspace_profiles_legal_name_len check (
      legal_name is null or char_length(legal_name) <= 200
    ),
  description text
    constraint collaboration_workspace_profiles_description_len check (
      description is null or char_length(description) <= 4000
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.collaboration_workspace_profiles is
  'Workspace profile/kind metadata. Not a separate login identity.';

create index if not exists collaboration_workspace_profiles_kind_idx
  on public.collaboration_workspace_profiles (kind);

drop trigger if exists collaboration_workspace_profiles_set_updated_at
  on public.collaboration_workspace_profiles;
create trigger collaboration_workspace_profiles_set_updated_at
  before update on public.collaboration_workspace_profiles
  for each row execute function public.set_row_updated_at();

alter table public.collaboration_workspace_profiles enable row level security;
alter table public.collaboration_workspace_profiles force row level security;

revoke all on table public.collaboration_workspace_profiles
  from public, anon, authenticated;
grant select on table public.collaboration_workspace_profiles to authenticated;
revoke insert, update, delete on table public.collaboration_workspace_profiles
  from authenticated;
grant all on table public.collaboration_workspace_profiles to service_role;

-- ---------------------------------------------------------------------------
-- 3) collaboration_workspace_members
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.collaboration_workspaces (id) on delete cascade,
  user_id uuid not null
    references public.profiles (id) on delete cascade,
  role text not null
    constraint collaboration_workspace_members_role_check check (
      role in (
        'owner',
        'admin',
        'manager',
        'billing_manager',
        'member',
        'auditor'
      )
    ),
  status text not null default 'invited'
    constraint collaboration_workspace_members_status_check check (
      status in ('invited', 'active', 'suspended', 'removed', 'left')
    ),
  invited_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collaboration_workspace_members_workspace_user_unique
    unique (workspace_id, user_id)
);

comment on table public.collaboration_workspace_members is
  'Workspace membership. Exactly one active owner per workspace (partial unique).';

create unique index if not exists collaboration_workspace_members_one_active_owner_uidx
  on public.collaboration_workspace_members (workspace_id)
  where role = 'owner' and status = 'active';

create index if not exists collaboration_workspace_members_user_idx
  on public.collaboration_workspace_members (user_id);

create index if not exists collaboration_workspace_members_workspace_status_idx
  on public.collaboration_workspace_members (workspace_id, status);

drop trigger if exists collaboration_workspace_members_set_updated_at
  on public.collaboration_workspace_members;
create trigger collaboration_workspace_members_set_updated_at
  before update on public.collaboration_workspace_members
  for each row execute function public.set_row_updated_at();

alter table public.collaboration_workspace_members enable row level security;
alter table public.collaboration_workspace_members force row level security;

revoke all on table public.collaboration_workspace_members
  from public, anon, authenticated;
grant select on table public.collaboration_workspace_members to authenticated;
revoke insert, update, delete on table public.collaboration_workspace_members
  from authenticated;
grant all on table public.collaboration_workspace_members to service_role;

-- ---------------------------------------------------------------------------
-- 4) collaboration_workspace_invites
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.collaboration_workspaces (id) on delete cascade,
  invited_user_id uuid references public.profiles (id) on delete cascade,
  invited_email text
    constraint collaboration_workspace_invites_email_check check (
      invited_email is null
      or (
        char_length(btrim(invited_email)) between 3 and 320
        and btrim(invited_email) ~ '^\S+@\S+\.\S+$'
      )
    ),
  role text not null
    constraint collaboration_workspace_invites_role_check check (
      role in (
        'admin',
        'manager',
        'billing_manager',
        'member',
        'auditor'
      )
    ),
  token_hash text not null
    constraint collaboration_workspace_invites_token_hash_len check (
      char_length(token_hash) = 64
    ),
  status text not null default 'pending'
    constraint collaboration_workspace_invites_status_check check (
      status in ('pending', 'accepted', 'declined', 'revoked', 'expired')
    ),
  invited_by uuid not null
    references public.profiles (id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  declined_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint collaboration_workspace_invites_target_check check (
    invited_user_id is not null or invited_email is not null
  ),
  constraint collaboration_workspace_invites_token_hash_unique unique (token_hash)
);

comment on table public.collaboration_workspace_invites is
  'Workspace invites. Store sha256 hex of token only; plaintext returned once.';

create unique index if not exists collaboration_workspace_invites_pending_user_uidx
  on public.collaboration_workspace_invites (workspace_id, invited_user_id)
  where status = 'pending' and invited_user_id is not null;

create unique index if not exists collaboration_workspace_invites_pending_email_uidx
  on public.collaboration_workspace_invites (workspace_id, lower(invited_email))
  where status = 'pending' and invited_email is not null;

create index if not exists collaboration_workspace_invites_workspace_status_idx
  on public.collaboration_workspace_invites (workspace_id, status);

alter table public.collaboration_workspace_invites enable row level security;
alter table public.collaboration_workspace_invites force row level security;

revoke all on table public.collaboration_workspace_invites
  from public, anon, authenticated;
grant select on table public.collaboration_workspace_invites to authenticated;
revoke insert, update, delete on table public.collaboration_workspace_invites
  from authenticated;
grant all on table public.collaboration_workspace_invites to service_role;

-- ---------------------------------------------------------------------------
-- 5) collaboration_workspace_settings (1:1)
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_workspace_settings (
  workspace_id uuid primary key
    references public.collaboration_workspaces (id) on delete cascade,
  allow_member_invites boolean not null default false,
  public_member_directory boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.collaboration_workspace_settings is
  'Safe defaults for workspace membership behavior.';

drop trigger if exists collaboration_workspace_settings_set_updated_at
  on public.collaboration_workspace_settings;
create trigger collaboration_workspace_settings_set_updated_at
  before update on public.collaboration_workspace_settings
  for each row execute function public.set_row_updated_at();

alter table public.collaboration_workspace_settings enable row level security;
alter table public.collaboration_workspace_settings force row level security;

revoke all on table public.collaboration_workspace_settings
  from public, anon, authenticated;
grant select on table public.collaboration_workspace_settings to authenticated;
revoke insert, update, delete on table public.collaboration_workspace_settings
  from authenticated;
grant all on table public.collaboration_workspace_settings to service_role;

-- ---------------------------------------------------------------------------
-- 6) collaboration_workspace_audit_events (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_workspace_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid
    references public.profiles (id) on delete set null,
  workspace_id uuid
    references public.collaboration_workspaces (id) on delete set null,
  action text not null
    constraint collaboration_workspace_audit_action_len check (
      char_length(btrim(action)) between 1 and 80
    ),
  subject_type text not null
    constraint collaboration_workspace_audit_subject_type_len check (
      char_length(btrim(subject_type)) between 1 and 80
    ),
  subject_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.collaboration_workspace_audit_events is
  'Append-only collaboration audit. No client writes.';

create index if not exists collaboration_workspace_audit_workspace_idx
  on public.collaboration_workspace_audit_events (workspace_id, created_at desc);

create or replace function public.collaboration_workspace_audit_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'collaboration_workspace_audit_events is append-only';
end;
$$;

drop trigger if exists collaboration_workspace_audit_no_update
  on public.collaboration_workspace_audit_events;
create trigger collaboration_workspace_audit_no_update
  before update or delete on public.collaboration_workspace_audit_events
  for each row execute function public.collaboration_workspace_audit_immutable();

alter table public.collaboration_workspace_audit_events enable row level security;
alter table public.collaboration_workspace_audit_events force row level security;

revoke all on table public.collaboration_workspace_audit_events
  from public, anon, authenticated;
grant select on table public.collaboration_workspace_audit_events to authenticated;
revoke insert, update, delete on table public.collaboration_workspace_audit_events
  from authenticated;
grant all on table public.collaboration_workspace_audit_events to service_role;

-- ---------------------------------------------------------------------------
-- 7) collaboration_workspace_resource_links (schema foundation only)
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_workspace_resource_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.collaboration_workspaces (id) on delete cascade,
  resource_type text not null
    constraint collaboration_workspace_resource_links_type_check check (
      resource_type in ('learning_space', 'store', 'advertiser_account')
    ),
  resource_id uuid not null,
  relationship_type text not null default 'linked'
    constraint collaboration_workspace_resource_links_rel_check check (
      relationship_type in ('linked', 'manages', 'owns')
    ),
  status text not null default 'active'
    constraint collaboration_workspace_resource_links_status_check check (
      status in ('active', 'revoked')
    ),
  linked_by uuid references public.profiles (id) on delete set null,
  linked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collaboration_workspace_resource_links_resource_unique
    unique (resource_type, resource_id)
);

comment on table public.collaboration_workspace_resource_links is
  'Optional future product binds. V1: schema only — no link/unlink RPCs; no client writes.';

create index if not exists collaboration_workspace_resource_links_workspace_idx
  on public.collaboration_workspace_resource_links (workspace_id, status);

drop trigger if exists collaboration_workspace_resource_links_set_updated_at
  on public.collaboration_workspace_resource_links;
create trigger collaboration_workspace_resource_links_set_updated_at
  before update on public.collaboration_workspace_resource_links
  for each row execute function public.set_row_updated_at();

alter table public.collaboration_workspace_resource_links enable row level security;
alter table public.collaboration_workspace_resource_links force row level security;

revoke all on table public.collaboration_workspace_resource_links
  from public, anon, authenticated;
grant select on table public.collaboration_workspace_resource_links to authenticated;
revoke insert, update, delete on table public.collaboration_workspace_resource_links
  from authenticated;
grant all on table public.collaboration_workspace_resource_links to service_role;

-- ---------------------------------------------------------------------------
-- 8) Helpers
-- ---------------------------------------------------------------------------

create or replace function public.collaboration_workspace_role_rank(p_role text)
returns integer
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  return case p_role
    when 'owner' then 100
    when 'admin' then 80
    when 'manager' then 60
    when 'billing_manager' then 50
    when 'member' then 40
    when 'auditor' then 30
    else null
  end;
end;
$$;

create or replace function public.collaboration_workspace_role_at_least(
  p_role text,
  p_minimum text
)
returns boolean
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  v_role_rank integer;
  v_min_rank integer;
begin
  v_role_rank := public.collaboration_workspace_role_rank(p_role);
  v_min_rank := public.collaboration_workspace_role_rank(p_minimum);
  if v_role_rank is null or v_min_rank is null then
    return false;
  end if;
  return v_role_rank >= v_min_rank;
end;
$$;

create or replace function public.is_collaboration_workspace_member(
  p_workspace_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_workspace_id is not null
    and p_user_id is not null
    and exists (
      select 1
      from public.collaboration_workspace_members m
      where m.workspace_id = p_workspace_id
        and m.user_id = p_user_id
        and m.status = 'active'
    );
$$;

create or replace function public.collaboration_workspace_member_role(
  p_workspace_id uuid,
  p_user_id uuid default auth.uid()
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.collaboration_workspace_members m
  where m.workspace_id = p_workspace_id
    and m.user_id = p_user_id
    and m.status = 'active'
  limit 1;
$$;

create or replace function public.can_manage_collaboration_workspace(
  p_workspace_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_workspace_id is not null
    and p_user_id is not null
    and (
      public.is_platform_admin(p_user_id)
      or exists (
        select 1
        from public.collaboration_workspace_members m
        where m.workspace_id = p_workspace_id
          and m.user_id = p_user_id
          and m.status = 'active'
          and m.role in ('owner', 'admin')
      )
    );
$$;

create or replace function public.collaboration_workspace_audit_write(
  p_actor_user_id uuid,
  p_workspace_id uuid,
  p_action text,
  p_subject_type text,
  p_subject_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.collaboration_workspace_audit_events (
    actor_user_id,
    workspace_id,
    action,
    subject_type,
    subject_id,
    metadata
  ) values (
    p_actor_user_id,
    p_workspace_id,
    p_action,
    p_subject_type,
    p_subject_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.collaboration_workspace_role_rank(text)
  from public, anon;
grant execute on function public.collaboration_workspace_role_rank(text)
  to authenticated, service_role;

revoke all on function public.collaboration_workspace_role_at_least(text, text)
  from public, anon;
grant execute on function public.collaboration_workspace_role_at_least(text, text)
  to authenticated, service_role;

revoke all on function public.is_collaboration_workspace_member(uuid, uuid)
  from public, anon;
grant execute on function public.is_collaboration_workspace_member(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.collaboration_workspace_member_role(uuid, uuid)
  from public, anon;
grant execute on function public.collaboration_workspace_member_role(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.can_manage_collaboration_workspace(uuid, uuid)
  from public, anon;
grant execute on function public.can_manage_collaboration_workspace(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.collaboration_workspace_audit_write(
  uuid, uuid, text, text, text, jsonb
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9) RLS policies (never call is_platform_admin on anon paths)
-- ---------------------------------------------------------------------------

drop policy if exists "Members read own workspaces"
  on public.collaboration_workspaces;
create policy "Members read own workspaces"
  on public.collaboration_workspaces for select
  to authenticated
  using (
    public.is_collaboration_workspace_member(id, (select auth.uid()))
  );

drop policy if exists "Platform admin read workspaces"
  on public.collaboration_workspaces;
create policy "Platform admin read workspaces"
  on public.collaboration_workspaces for select
  to authenticated
  using (public.is_platform_admin((select auth.uid())));

drop policy if exists "Members read workspace profiles"
  on public.collaboration_workspace_profiles;
create policy "Members read workspace profiles"
  on public.collaboration_workspace_profiles for select
  to authenticated
  using (
    public.is_collaboration_workspace_member(workspace_id, (select auth.uid()))
    or public.is_platform_admin((select auth.uid()))
  );

drop policy if exists "Members read own membership row"
  on public.collaboration_workspace_members;
create policy "Members read own membership row"
  on public.collaboration_workspace_members for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Managers or directory read memberships"
  on public.collaboration_workspace_members;
create policy "Managers or directory read memberships"
  on public.collaboration_workspace_members for select
  to authenticated
  using (
    public.can_manage_collaboration_workspace(workspace_id, (select auth.uid()))
    or (
      public.is_collaboration_workspace_member(workspace_id, (select auth.uid()))
      and exists (
        select 1
        from public.collaboration_workspace_settings s
        where s.workspace_id = collaboration_workspace_members.workspace_id
          and s.public_member_directory = true
      )
    )
  );

drop policy if exists "Invitees and managers read invites"
  on public.collaboration_workspace_invites;
create policy "Invitees and managers read invites"
  on public.collaboration_workspace_invites for select
  to authenticated
  using (
    public.can_manage_collaboration_workspace(workspace_id, (select auth.uid()))
    or invited_user_id = (select auth.uid())
    or (
      invited_email is not null
      and lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

drop policy if exists "Members read workspace settings"
  on public.collaboration_workspace_settings;
create policy "Members read workspace settings"
  on public.collaboration_workspace_settings for select
  to authenticated
  using (
    public.is_collaboration_workspace_member(workspace_id, (select auth.uid()))
    or public.is_platform_admin((select auth.uid()))
  );

drop policy if exists "Managers and auditors read workspace audit"
  on public.collaboration_workspace_audit_events;
create policy "Managers and auditors read workspace audit"
  on public.collaboration_workspace_audit_events for select
  to authenticated
  using (
    public.can_manage_collaboration_workspace(workspace_id, (select auth.uid()))
    or exists (
      select 1
      from public.collaboration_workspace_members m
      where m.workspace_id = collaboration_workspace_audit_events.workspace_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role = 'auditor'
    )
  );

drop policy if exists "Members read workspace resource links"
  on public.collaboration_workspace_resource_links;
create policy "Members read workspace resource links"
  on public.collaboration_workspace_resource_links for select
  to authenticated
  using (
    public.is_collaboration_workspace_member(workspace_id, (select auth.uid()))
    or public.is_platform_admin((select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 10) RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_collaboration_workspace(
  p_slug text,
  p_display_name text,
  p_kind text,
  p_description text default null,
  p_legal_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_name text := btrim(coalesce(p_display_name, ''));
  v_workspace_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or char_length(v_slug) not between 3 and 64
  then
    raise exception 'Invalid workspace slug';
  end if;

  if char_length(v_name) not between 1 and 120 then
    raise exception 'Invalid workspace display_name';
  end if;

  if p_kind not in ('team', 'company', 'school', 'academy') then
    raise exception 'Invalid workspace kind';
  end if;

  if p_description is not null and char_length(p_description) > 4000 then
    raise exception 'Description too long';
  end if;

  if p_legal_name is not null and char_length(p_legal_name) > 200 then
    raise exception 'Legal name too long';
  end if;

  insert into public.collaboration_workspaces (
    owner_user_id,
    slug,
    status
  ) values (
    v_uid,
    v_slug,
    'draft'
  )
  returning id into v_workspace_id;

  insert into public.collaboration_workspace_profiles (
    workspace_id,
    kind,
    display_name,
    legal_name,
    description
  ) values (
    v_workspace_id,
    p_kind,
    v_name,
    nullif(btrim(coalesce(p_legal_name, '')), ''),
    nullif(p_description, '')
  );

  insert into public.collaboration_workspace_members (
    workspace_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at
  ) values (
    v_workspace_id,
    v_uid,
    'owner',
    'active',
    v_uid,
    now()
  );

  insert into public.collaboration_workspace_settings (workspace_id)
  values (v_workspace_id);

  perform public.collaboration_workspace_audit_write(
    v_uid,
    v_workspace_id,
    'workspace.create',
    'collaboration_workspace',
    v_workspace_id::text,
    jsonb_build_object('slug', v_slug, 'kind', p_kind)
  );

  return jsonb_build_object('workspace_id', v_workspace_id);
end;
$$;

create or replace function public.activate_collaboration_workspace(
  p_workspace_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select status into v_status
  from public.collaboration_workspaces
  where id = p_workspace_id;

  if not found then
    raise exception 'Workspace not found';
  end if;

  v_role := public.collaboration_workspace_member_role(p_workspace_id, v_uid);
  if v_role is distinct from 'owner'
     and not public.is_platform_admin(v_uid)
  then
    raise exception 'Only the workspace owner can activate';
  end if;

  if v_status is distinct from 'draft' then
    raise exception 'Only draft workspaces can be activated';
  end if;

  update public.collaboration_workspaces
  set status = 'active',
      suspended_at = null,
      archived_at = null
  where id = p_workspace_id;

  perform public.collaboration_workspace_audit_write(
    v_uid,
    p_workspace_id,
    'workspace.activate',
    'collaboration_workspace',
    p_workspace_id::text,
    '{}'::jsonb
  );

  return jsonb_build_object('workspace_id', p_workspace_id, 'status', 'active');
end;
$$;

create or replace function public.archive_collaboration_workspace(
  p_workspace_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.collaboration_workspaces where id = p_workspace_id
  ) then
    raise exception 'Workspace not found';
  end if;

  v_role := public.collaboration_workspace_member_role(p_workspace_id, v_uid);
  if v_role is distinct from 'owner'
     and not public.is_platform_admin(v_uid)
  then
    raise exception 'Only the workspace owner can archive';
  end if;

  update public.collaboration_workspaces
  set status = 'archived',
      archived_at = now()
  where id = p_workspace_id;

  perform public.collaboration_workspace_audit_write(
    v_uid,
    p_workspace_id,
    'workspace.archive',
    'collaboration_workspace',
    p_workspace_id::text,
    '{}'::jsonb
  );

  return jsonb_build_object('workspace_id', p_workspace_id, 'status', 'archived');
end;
$$;

create or replace function public.moderate_collaboration_workspace(
  p_workspace_id uuid,
  p_status text
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

  if not public.is_platform_admin(v_uid) then
    raise exception 'Platform admin required';
  end if;

  if p_status not in ('active', 'suspended', 'archived') then
    raise exception 'Invalid moderation status';
  end if;

  if not exists (
    select 1 from public.collaboration_workspaces where id = p_workspace_id
  ) then
    raise exception 'Workspace not found';
  end if;

  update public.collaboration_workspaces
  set status = p_status,
      suspended_at = case when p_status = 'suspended' then now() else null end,
      archived_at = case when p_status = 'archived' then now() else archived_at end
  where id = p_workspace_id;

  perform public.collaboration_workspace_audit_write(
    v_uid,
    p_workspace_id,
    'workspace.moderation',
    'collaboration_workspace',
    p_workspace_id::text,
    jsonb_build_object('status', p_status)
  );

  return jsonb_build_object('workspace_id', p_workspace_id, 'status', p_status);
end;
$$;

create or replace function public.invite_collaboration_workspace_member(
  p_workspace_id uuid,
  p_role text,
  p_invited_user_id uuid default null,
  p_invited_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_caller_role text;
  v_caller_rank integer;
  v_invite_rank integer;
  v_workspace_status text;
  v_allow_member_invites boolean;
  v_is_manager boolean;
  v_email text;
  v_token text;
  v_hash text;
  v_invite_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select status into v_workspace_status
  from public.collaboration_workspaces
  where id = p_workspace_id;

  if not found then
    raise exception 'Workspace not found';
  end if;

  if v_workspace_status is distinct from 'active' then
    raise exception 'Workspace must be active for membership changes';
  end if;

  v_is_manager := public.can_manage_collaboration_workspace(p_workspace_id, v_uid);
  v_caller_role := public.collaboration_workspace_member_role(p_workspace_id, v_uid);

  -- owner/admin always; manager always (workspace invite_members); other
  -- members only when settings.allow_member_invites.
  if v_is_manager or v_caller_role = 'manager' then
    null;
  elsif public.is_collaboration_workspace_member(p_workspace_id, v_uid) then
    select s.allow_member_invites into v_allow_member_invites
    from public.collaboration_workspace_settings s
    where s.workspace_id = p_workspace_id;

    if not coalesce(v_allow_member_invites, false) then
      raise exception 'Member invites are disabled for this workspace';
    end if;

    if p_role = 'admin' then
      raise exception 'Only owner or admin can invite administrators';
    end if;
  else
    raise exception 'Not allowed to invite members for this workspace';
  end if;

  if p_role is null or p_role = 'owner' then
    raise exception 'Invite role cannot be owner';
  end if;

  if p_role not in (
    'admin', 'manager', 'billing_manager', 'member', 'auditor'
  ) then
    raise exception 'Invalid invite role';
  end if;

  if not v_is_manager and p_role = 'admin' then
    raise exception 'Only owner or admin can invite administrators';
  end if;

  v_caller_rank := public.collaboration_workspace_role_rank(v_caller_role);
  v_invite_rank := public.collaboration_workspace_role_rank(p_role);

  if not public.is_platform_admin(v_uid) then
    if v_caller_rank is null or v_invite_rank is null then
      raise exception 'Role escalation check failed';
    end if;
    if v_invite_rank > v_caller_rank then
      raise exception 'Cannot assign a role above your own';
    end if;
  end if;

  v_email := nullif(lower(btrim(coalesce(p_invited_email, ''))), '');
  if p_invited_user_id is null and v_email is null then
    raise exception 'invited_user_id or invited_email is required';
  end if;

  if v_email is not null
     and (
       char_length(v_email) not between 3 and 320
       or v_email !~ '^\S+@\S+\.\S+$'
     )
  then
    raise exception 'Invite email is invalid';
  end if;

  if p_invited_user_id is not null then
    if exists (
      select 1
      from public.collaboration_workspace_members m
      where m.workspace_id = p_workspace_id
        and m.user_id = p_invited_user_id
        and m.status = 'active'
    ) then
      raise exception 'User is already an active member';
    end if;
  end if;

  update public.collaboration_workspace_invites
  set status = 'revoked',
      revoked_at = now()
  where workspace_id = p_workspace_id
    and status = 'pending'
    and (
      (p_invited_user_id is not null and invited_user_id = p_invited_user_id)
      or (v_email is not null and lower(invited_email) = v_email)
    );

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  insert into public.collaboration_workspace_invites (
    workspace_id,
    invited_user_id,
    invited_email,
    role,
    token_hash,
    status,
    invited_by,
    expires_at
  ) values (
    p_workspace_id,
    p_invited_user_id,
    v_email,
    p_role,
    v_hash,
    'pending',
    v_uid,
    now() + interval '7 days'
  )
  returning id into v_invite_id;

  perform public.collaboration_workspace_audit_write(
    v_uid,
    p_workspace_id,
    'invite.create',
    'collaboration_workspace_invite',
    v_invite_id::text,
    jsonb_build_object('role', p_role)
  );

  return jsonb_build_object(
    'invite_id', v_invite_id,
    'token', v_token,
    'expires_at', (now() + interval '7 days')
  );
end;
$$;

create or replace function public.accept_collaboration_workspace_invite(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_invite public.collaboration_workspace_invites%rowtype;
  v_workspace_status text;
  v_email text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_token is null or char_length(btrim(p_token)) = 0 then
    raise exception 'Invite token is required';
  end if;

  v_hash := encode(extensions.digest(btrim(p_token), 'sha256'), 'hex');
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  select * into v_invite
  from public.collaboration_workspace_invites
  where token_hash = v_hash
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Invite not found or already used';
  end if;

  if v_invite.expires_at <= now() then
    update public.collaboration_workspace_invites
    set status = 'expired'
    where id = v_invite.id;
    raise exception 'Invite has expired';
  end if;

  if v_invite.invited_user_id is not null
     and v_invite.invited_user_id is distinct from v_uid
  then
    raise exception 'Invite is not addressed to this user';
  end if;

  if v_invite.invited_user_id is null
     and (
       v_invite.invited_email is null
       or lower(v_invite.invited_email) is distinct from v_email
     )
  then
    raise exception 'Invite email does not match authenticated user';
  end if;

  select status into v_workspace_status
  from public.collaboration_workspaces
  where id = v_invite.workspace_id;

  if v_workspace_status is distinct from 'active' then
    raise exception 'Workspace must be active for membership changes';
  end if;

  insert into public.collaboration_workspace_members (
    workspace_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at
  ) values (
    v_invite.workspace_id,
    v_uid,
    v_invite.role,
    'active',
    v_invite.invited_by,
    now()
  )
  on conflict (workspace_id, user_id) do update
  set role = excluded.role,
      status = 'active',
      invited_by = excluded.invited_by,
      joined_at = coalesce(
        public.collaboration_workspace_members.joined_at,
        excluded.joined_at
      ),
      updated_at = now()
  where public.collaboration_workspace_members.role is distinct from 'owner';

  update public.collaboration_workspace_invites
  set status = 'accepted',
      accepted_at = now(),
      invited_user_id = coalesce(invited_user_id, v_uid)
  where id = v_invite.id;

  perform public.collaboration_workspace_audit_write(
    v_uid,
    v_invite.workspace_id,
    'invite.accept',
    'collaboration_workspace_invite',
    v_invite.id::text,
    jsonb_build_object('role', v_invite.role)
  );

  return jsonb_build_object(
    'workspace_id', v_invite.workspace_id,
    'role', v_invite.role
  );
end;
$$;

create or replace function public.decline_collaboration_workspace_invite(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_invite public.collaboration_workspace_invites%rowtype;
  v_email text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_hash := encode(extensions.digest(btrim(coalesce(p_token, '')), 'sha256'), 'hex');
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  select * into v_invite
  from public.collaboration_workspace_invites
  where token_hash = v_hash
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Invite not found or already used';
  end if;

  if v_invite.invited_user_id is not null
     and v_invite.invited_user_id is distinct from v_uid
  then
    raise exception 'Invite is not addressed to this user';
  end if;

  if v_invite.invited_user_id is null
     and lower(coalesce(v_invite.invited_email, '')) is distinct from v_email
  then
    raise exception 'Invite email does not match authenticated user';
  end if;

  update public.collaboration_workspace_invites
  set status = 'declined',
      declined_at = now()
  where id = v_invite.id;

  perform public.collaboration_workspace_audit_write(
    v_uid,
    v_invite.workspace_id,
    'invite.decline',
    'collaboration_workspace_invite',
    v_invite.id::text,
    '{}'::jsonb
  );

  return jsonb_build_object('invite_id', v_invite.id, 'status', 'declined');
end;
$$;

create or replace function public.update_collaboration_workspace_member_role(
  p_workspace_id uuid,
  p_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_actor_role text;
  v_target_role text;
  v_workspace_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select status into v_workspace_status
  from public.collaboration_workspaces
  where id = p_workspace_id;

  if not found then
    raise exception 'Workspace not found';
  end if;

  if v_workspace_status is distinct from 'active' then
    raise exception 'Workspace must be active for membership changes';
  end if;

  if not public.can_manage_collaboration_workspace(p_workspace_id, v_uid) then
    raise exception 'Not allowed to update member roles';
  end if;

  if p_role = 'owner' then
    raise exception 'Use transfer ownership to assign owner';
  end if;

  if p_role not in (
    'admin', 'manager', 'billing_manager', 'member', 'auditor'
  ) then
    raise exception 'Invalid role';
  end if;

  select role into v_target_role
  from public.collaboration_workspace_members
  where workspace_id = p_workspace_id
    and user_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active member not found';
  end if;

  if v_target_role = 'owner' then
    raise exception 'Cannot change the active owner role';
  end if;

  v_actor_role := public.collaboration_workspace_member_role(p_workspace_id, v_uid);

  if not public.is_platform_admin(v_uid) then
    if public.collaboration_workspace_role_rank(v_actor_role)
       <= public.collaboration_workspace_role_rank(v_target_role)
    then
      raise exception 'Peer-admin protection: cannot mutate equal or higher rank';
    end if;
    if public.collaboration_workspace_role_rank(p_role)
       > public.collaboration_workspace_role_rank(v_actor_role)
    then
      raise exception 'Cannot assign a role above your own';
    end if;
  end if;

  update public.collaboration_workspace_members
  set role = p_role,
      updated_at = now()
  where workspace_id = p_workspace_id
    and user_id = p_user_id;

  perform public.collaboration_workspace_audit_write(
    v_uid,
    p_workspace_id,
    'member.role_update',
    'collaboration_workspace_member',
    p_user_id::text,
    jsonb_build_object('from', v_target_role, 'to', p_role)
  );

  return jsonb_build_object(
    'workspace_id', p_workspace_id,
    'user_id', p_user_id,
    'role', p_role
  );
end;
$$;

create or replace function public.suspend_collaboration_workspace_member(
  p_workspace_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_actor_role text;
  v_target_role text;
  v_workspace_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select status into v_workspace_status
  from public.collaboration_workspaces
  where id = p_workspace_id;

  if not found then
    raise exception 'Workspace not found';
  end if;

  if v_workspace_status is distinct from 'active' then
    raise exception 'Workspace must be active for membership changes';
  end if;

  if not public.can_manage_collaboration_workspace(p_workspace_id, v_uid) then
    raise exception 'Not allowed to suspend members';
  end if;

  select role into v_target_role
  from public.collaboration_workspace_members
  where workspace_id = p_workspace_id
    and user_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active member not found';
  end if;

  if v_target_role = 'owner' then
    raise exception 'Cannot suspend the active owner';
  end if;

  v_actor_role := public.collaboration_workspace_member_role(p_workspace_id, v_uid);

  if not public.is_platform_admin(v_uid) then
    if public.collaboration_workspace_role_rank(v_actor_role)
       <= public.collaboration_workspace_role_rank(v_target_role)
    then
      raise exception 'Peer-admin protection: cannot mutate equal or higher rank';
    end if;
  end if;

  update public.collaboration_workspace_members
  set status = 'suspended',
      updated_at = now()
  where workspace_id = p_workspace_id
    and user_id = p_user_id;

  perform public.collaboration_workspace_audit_write(
    v_uid,
    p_workspace_id,
    'member.suspend',
    'collaboration_workspace_member',
    p_user_id::text,
    jsonb_build_object('role', v_target_role)
  );

  return jsonb_build_object(
    'workspace_id', p_workspace_id,
    'user_id', p_user_id,
    'status', 'suspended'
  );
end;
$$;

create or replace function public.remove_collaboration_workspace_member(
  p_workspace_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_actor_role text;
  v_target_role text;
  v_workspace_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select status into v_workspace_status
  from public.collaboration_workspaces
  where id = p_workspace_id;

  if not found then
    raise exception 'Workspace not found';
  end if;

  if v_workspace_status is distinct from 'active' then
    raise exception 'Workspace must be active for membership changes';
  end if;

  if not public.can_manage_collaboration_workspace(p_workspace_id, v_uid) then
    raise exception 'Not allowed to remove members';
  end if;

  select role into v_target_role
  from public.collaboration_workspace_members
  where workspace_id = p_workspace_id
    and user_id = p_user_id
    and status in ('active', 'suspended')
  for update;

  if not found then
    raise exception 'Member not found';
  end if;

  if v_target_role = 'owner' then
    raise exception 'Cannot remove the active owner';
  end if;

  v_actor_role := public.collaboration_workspace_member_role(p_workspace_id, v_uid);

  if not public.is_platform_admin(v_uid) then
    if public.collaboration_workspace_role_rank(v_actor_role)
       <= public.collaboration_workspace_role_rank(v_target_role)
    then
      raise exception 'Peer-admin protection: cannot mutate equal or higher rank';
    end if;
  end if;

  update public.collaboration_workspace_members
  set status = 'removed',
      updated_at = now()
  where workspace_id = p_workspace_id
    and user_id = p_user_id;

  perform public.collaboration_workspace_audit_write(
    v_uid,
    p_workspace_id,
    'member.remove',
    'collaboration_workspace_member',
    p_user_id::text,
    jsonb_build_object('role', v_target_role)
  );

  return jsonb_build_object(
    'workspace_id', p_workspace_id,
    'user_id', p_user_id,
    'status', 'removed'
  );
end;
$$;

create or replace function public.transfer_collaboration_workspace_ownership(
  p_workspace_id uuid,
  p_new_owner_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_workspace_status text;
  v_old_owner uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_new_owner_user_id is null then
    raise exception 'new owner is required';
  end if;

  select status, owner_user_id
  into v_workspace_status, v_old_owner
  from public.collaboration_workspaces
  where id = p_workspace_id
  for update;

  if not found then
    raise exception 'Workspace not found';
  end if;

  if v_workspace_status is distinct from 'active' then
    raise exception 'Workspace must be active for membership changes';
  end if;

  v_role := public.collaboration_workspace_member_role(p_workspace_id, v_uid);
  if v_role is distinct from 'owner'
     and not public.is_platform_admin(v_uid)
  then
    raise exception 'Only the current owner can transfer ownership';
  end if;

  if not exists (
    select 1
    from public.collaboration_workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id = p_new_owner_user_id
      and m.status = 'active'
  ) then
    raise exception 'New owner must be an active workspace member';
  end if;

  perform set_config('umtuba.collaboration_ownership_transfer', '1', true);

  update public.collaboration_workspaces
  set owner_user_id = p_new_owner_user_id
  where id = p_workspace_id;

  update public.collaboration_workspace_members
  set role = 'admin',
      updated_at = now()
  where workspace_id = p_workspace_id
    and user_id = v_old_owner
    and status = 'active';

  update public.collaboration_workspace_members
  set role = 'owner',
      status = 'active',
      updated_at = now()
  where workspace_id = p_workspace_id
    and user_id = p_new_owner_user_id;

  perform set_config('umtuba.collaboration_ownership_transfer', '0', true);

  perform public.collaboration_workspace_audit_write(
    v_uid,
    p_workspace_id,
    'ownership.transfer',
    'collaboration_workspace',
    p_workspace_id::text,
    jsonb_build_object(
      'from', v_old_owner,
      'to', p_new_owner_user_id
    )
  );

  return jsonb_build_object(
    'workspace_id', p_workspace_id,
    'owner_user_id', p_new_owner_user_id
  );
end;
$$;

revoke all on function public.create_collaboration_workspace(text, text, text, text, text)
  from public, anon;
grant execute on function public.create_collaboration_workspace(text, text, text, text, text)
  to authenticated, service_role;

revoke all on function public.activate_collaboration_workspace(uuid)
  from public, anon;
grant execute on function public.activate_collaboration_workspace(uuid)
  to authenticated, service_role;

revoke all on function public.archive_collaboration_workspace(uuid)
  from public, anon;
grant execute on function public.archive_collaboration_workspace(uuid)
  to authenticated, service_role;

revoke all on function public.moderate_collaboration_workspace(uuid, text)
  from public, anon;
grant execute on function public.moderate_collaboration_workspace(uuid, text)
  to authenticated, service_role;

revoke all on function public.invite_collaboration_workspace_member(uuid, text, uuid, text)
  from public, anon;
grant execute on function public.invite_collaboration_workspace_member(uuid, text, uuid, text)
  to authenticated, service_role;

revoke all on function public.accept_collaboration_workspace_invite(text)
  from public, anon;
grant execute on function public.accept_collaboration_workspace_invite(text)
  to authenticated, service_role;

revoke all on function public.decline_collaboration_workspace_invite(text)
  from public, anon;
grant execute on function public.decline_collaboration_workspace_invite(text)
  to authenticated, service_role;

revoke all on function public.update_collaboration_workspace_member_role(uuid, uuid, text)
  from public, anon;
grant execute on function public.update_collaboration_workspace_member_role(uuid, uuid, text)
  to authenticated, service_role;

revoke all on function public.suspend_collaboration_workspace_member(uuid, uuid)
  from public, anon;
grant execute on function public.suspend_collaboration_workspace_member(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.remove_collaboration_workspace_member(uuid, uuid)
  from public, anon;
grant execute on function public.remove_collaboration_workspace_member(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.transfer_collaboration_workspace_ownership(uuid, uuid)
  from public, anon;
grant execute on function public.transfer_collaboration_workspace_ownership(uuid, uuid)
  to authenticated, service_role;
