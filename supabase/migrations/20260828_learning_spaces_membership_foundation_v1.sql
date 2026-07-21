-- UMTUBA Learning OS — Spaces & Membership Foundation V1
-- Additive. Spaces + membership + invites + settings + append-only audit.
-- Does NOT: programs, courses, lessons, enrollments, content, billing, UI.
--
-- World hardening lesson: public/anon SELECT policies on spaces must NEVER
-- call is_platform_admin(). Use a separate authenticated admin policy.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1) learning_spaces
-- ---------------------------------------------------------------------------

create table if not exists public.learning_spaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null
    references public.profiles (id) on delete restrict,
  slug text not null
    constraint learning_spaces_slug_format check (
      char_length(slug) between 3 and 64
      and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  name text not null
    constraint learning_spaces_name_len check (
      char_length(btrim(name)) between 1 and 120
    ),
  description text
    constraint learning_spaces_description_len check (
      description is null or char_length(description) <= 4000
    ),
  mode text not null
    constraint learning_spaces_mode_check check (
      mode in (
        'university',
        'school',
        'bootcamp',
        'company_training',
        'creator_academy',
        'personal_learning',
        'general_academy'
      )
    ),
  status text not null default 'draft'
    constraint learning_spaces_status_check check (
      status in ('draft', 'active', 'suspended', 'archived')
    ),
  visibility text not null default 'private'
    constraint learning_spaces_visibility_check check (
      visibility in ('private', 'unlisted', 'public')
    ),
  default_language text not null default 'en'
    constraint learning_spaces_default_language_check check (
      default_language ~ '^[a-z]{2}(-[A-Z]{2})?$'
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  suspended_at timestamptz,
  archived_at timestamptz,
  constraint learning_spaces_slug_unique unique (slug)
);

comment on table public.learning_spaces is
  'Learning OS spaces (universities/schools/academies). Client writes only via RPCs. owner_user_id changes only via transfer RPC (GUC gated).';

create index if not exists learning_spaces_status_visibility_idx
  on public.learning_spaces (status, visibility);

create index if not exists learning_spaces_owner_user_id_idx
  on public.learning_spaces (owner_user_id);

create index if not exists learning_spaces_mode_idx
  on public.learning_spaces (mode);

drop trigger if exists learning_spaces_set_updated_at on public.learning_spaces;
create trigger learning_spaces_set_updated_at
  before update on public.learning_spaces
  for each row execute function public.set_row_updated_at();

create or replace function public.learning_spaces_guard_owner_transfer()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.owner_user_id is distinct from old.owner_user_id
     and current_setting('umtuba.learning_ownership_transfer', true) is distinct from '1'
  then
    raise exception
      'owner_user_id can only change via transfer_learning_space_ownership';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_spaces_guard_owner_transfer
  on public.learning_spaces;
create trigger learning_spaces_guard_owner_transfer
  before update on public.learning_spaces
  for each row execute function public.learning_spaces_guard_owner_transfer();

alter table public.learning_spaces enable row level security;

revoke all on table public.learning_spaces from public, anon, authenticated;
grant select on table public.learning_spaces to anon, authenticated;
revoke insert, update, delete on table public.learning_spaces
  from anon, authenticated;
grant all on table public.learning_spaces to service_role;
-- RLS policies applied after helpers (section 6b).

-- ---------------------------------------------------------------------------
-- 2) learning_space_members
-- ---------------------------------------------------------------------------

create table if not exists public.learning_space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null
    references public.learning_spaces (id) on delete cascade,
  user_id uuid not null
    references public.profiles (id) on delete cascade,
  role text not null
    constraint learning_space_members_role_check check (
      role in (
        'owner',
        'admin',
        'instructor',
        'teaching_assistant',
        'content_editor',
        'reviewer',
        'viewer'
      )
    ),
  status text not null default 'invited'
    constraint learning_space_members_status_check check (
      status in ('invited', 'active', 'suspended', 'removed')
    ),
  invited_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_space_members_space_user_unique unique (space_id, user_id)
);

comment on table public.learning_space_members is
  'Membership rows for learning spaces. Exactly one active owner per space (partial unique). Client writes only via RPCs.';

create unique index if not exists learning_space_members_one_active_owner_uidx
  on public.learning_space_members (space_id)
  where role = 'owner' and status = 'active';

create index if not exists learning_space_members_user_idx
  on public.learning_space_members (user_id);

create index if not exists learning_space_members_space_status_idx
  on public.learning_space_members (space_id, status);

drop trigger if exists learning_space_members_set_updated_at
  on public.learning_space_members;
create trigger learning_space_members_set_updated_at
  before update on public.learning_space_members
  for each row execute function public.set_row_updated_at();

alter table public.learning_space_members enable row level security;
alter table public.learning_space_members force row level security;

revoke all on table public.learning_space_members
  from public, anon, authenticated;
grant select on table public.learning_space_members to authenticated;
revoke insert, update, delete on table public.learning_space_members
  from authenticated;
grant all on table public.learning_space_members to service_role;
-- RLS policies applied after helpers (section 6b).

-- ---------------------------------------------------------------------------
-- 3) learning_space_invites
-- ---------------------------------------------------------------------------

create table if not exists public.learning_space_invites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null
    references public.learning_spaces (id) on delete cascade,
  invited_user_id uuid references public.profiles (id) on delete cascade,
  invited_email text
    constraint learning_space_invites_email_len check (
      invited_email is null
      or char_length(btrim(invited_email)) between 3 and 320
    ),
  role text not null
    constraint learning_space_invites_role_check check (
      role in (
        'admin',
        'instructor',
        'teaching_assistant',
        'content_editor',
        'reviewer',
        'viewer'
      )
    ),
  token_hash text not null
    constraint learning_space_invites_token_hash_len check (
      char_length(token_hash) = 64
    ),
  status text not null default 'pending'
    constraint learning_space_invites_status_check check (
      status in ('pending', 'accepted', 'revoked', 'expired')
    ),
  invited_by uuid not null
    references public.profiles (id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint learning_space_invites_target_check check (
    invited_user_id is not null or invited_email is not null
  ),
  constraint learning_space_invites_token_hash_unique unique (token_hash)
);

comment on table public.learning_space_invites is
  'Pending membership invites. Store only sha256 hex of token; plaintext token returned once from invite RPC.';

create unique index if not exists learning_space_invites_pending_user_uidx
  on public.learning_space_invites (space_id, invited_user_id)
  where status = 'pending' and invited_user_id is not null;

create unique index if not exists learning_space_invites_pending_email_uidx
  on public.learning_space_invites (space_id, lower(invited_email))
  where status = 'pending' and invited_email is not null;

create index if not exists learning_space_invites_space_status_idx
  on public.learning_space_invites (space_id, status);

alter table public.learning_space_invites enable row level security;
alter table public.learning_space_invites force row level security;

revoke all on table public.learning_space_invites
  from public, anon, authenticated;
grant select on table public.learning_space_invites to authenticated;
revoke insert, update, delete on table public.learning_space_invites
  from authenticated;
grant all on table public.learning_space_invites to service_role;
-- RLS policies applied after helpers (section 6b).

-- ---------------------------------------------------------------------------
-- 4) learning_space_settings (1:1)
-- ---------------------------------------------------------------------------

create table if not exists public.learning_space_settings (
  space_id uuid primary key
    references public.learning_spaces (id) on delete cascade,
  allow_member_invites boolean not null default true,
  require_content_review boolean not null default false,
  default_member_role text not null default 'viewer'
    constraint learning_space_settings_default_role_check check (
      default_member_role in ('viewer', 'reviewer', 'content_editor')
    ),
  minor_safety_mode boolean not null default true,
  public_member_directory boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.learning_space_settings is
  '1:1 settings for a learning space. default_member_role never owner/admin.';

drop trigger if exists learning_space_settings_set_updated_at
  on public.learning_space_settings;
create trigger learning_space_settings_set_updated_at
  before update on public.learning_space_settings
  for each row execute function public.set_row_updated_at();

alter table public.learning_space_settings enable row level security;

revoke all on table public.learning_space_settings
  from public, anon, authenticated;
grant select on table public.learning_space_settings to authenticated;
revoke insert, update, delete on table public.learning_space_settings
  from authenticated;
grant all on table public.learning_space_settings to service_role;
-- RLS policies applied after helpers (section 6b).

-- ---------------------------------------------------------------------------
-- 5) learning_audit_events (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.learning_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  space_id uuid references public.learning_spaces (id) on delete set null,
  action text not null
    constraint learning_audit_events_action_len check (
      char_length(btrim(action)) between 1 and 120
    ),
  subject_type text not null
    constraint learning_audit_events_subject_type_len check (
      char_length(btrim(subject_type)) between 1 and 80
    ),
  subject_id text
    constraint learning_audit_events_subject_id_len check (
      subject_id is null or char_length(subject_id) <= 128
    ),
  metadata jsonb not null default '{}'::jsonb
    constraint learning_audit_events_metadata_object check (
      jsonb_typeof(metadata) = 'object'
    ),
  created_at timestamptz not null default now()
);

comment on table public.learning_audit_events is
  'Append-only learning OS audit log. Inserts only via learning_audit_write (DEFINER). No client update/delete.';

create index if not exists learning_audit_events_space_created_idx
  on public.learning_audit_events (space_id, created_at desc);

create index if not exists learning_audit_events_actor_created_idx
  on public.learning_audit_events (actor_user_id, created_at desc);

create or replace function public.learning_audit_events_forbid_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'learning_audit_events is append-only';
end;
$$;

drop trigger if exists learning_audit_events_forbid_update
  on public.learning_audit_events;
create trigger learning_audit_events_forbid_update
  before update on public.learning_audit_events
  for each row execute function public.learning_audit_events_forbid_mutation();

drop trigger if exists learning_audit_events_forbid_delete
  on public.learning_audit_events;
create trigger learning_audit_events_forbid_delete
  before delete on public.learning_audit_events
  for each row execute function public.learning_audit_events_forbid_mutation();

alter table public.learning_audit_events enable row level security;
alter table public.learning_audit_events force row level security;

revoke all on table public.learning_audit_events
  from public, anon, authenticated;
grant select on table public.learning_audit_events to authenticated;
revoke insert, update, delete on table public.learning_audit_events
  from authenticated;
grant all on table public.learning_audit_events to service_role;
-- RLS policies applied after helpers (section 6b).

-- ---------------------------------------------------------------------------
-- 6) Helpers (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

create or replace function public.learning_space_role_rank(p_role text)
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
    when 'instructor' then 60
    when 'teaching_assistant' then 50
    when 'content_editor' then 40
    when 'reviewer' then 30
    when 'viewer' then 20
    else null
  end;
end;
$$;

create or replace function public.learning_space_role_at_least(
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
  v_role_rank := public.learning_space_role_rank(p_role);
  v_min_rank := public.learning_space_role_rank(p_minimum);
  if v_role_rank is null or v_min_rank is null then
    return false;
  end if;
  return v_role_rank >= v_min_rank;
end;
$$;

create or replace function public.is_learning_space_member(
  p_space_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_space_id is not null
    and p_user_id is not null
    and exists (
      select 1
      from public.learning_space_members m
      where m.space_id = p_space_id
        and m.user_id = p_user_id
        and m.status = 'active'
    );
$$;

create or replace function public.learning_space_member_role(
  p_space_id uuid,
  p_user_id uuid default auth.uid()
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.learning_space_members m
  where m.space_id = p_space_id
    and m.user_id = p_user_id
    and m.status = 'active'
  limit 1;
$$;

create or replace function public.can_manage_learning_space(
  p_space_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_space_id is not null
    and p_user_id is not null
    and (
      public.is_platform_admin(p_user_id)
      or exists (
        select 1
        from public.learning_space_members m
        where m.space_id = p_space_id
          and m.user_id = p_user_id
          and m.status = 'active'
          and m.role in ('owner', 'admin')
      )
    );
$$;

create or replace function public.learning_audit_write(
  p_actor_user_id uuid,
  p_space_id uuid,
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
  insert into public.learning_audit_events (
    actor_user_id,
    space_id,
    action,
    subject_type,
    subject_id,
    metadata
  ) values (
    p_actor_user_id,
    p_space_id,
    p_action,
    p_subject_type,
    p_subject_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.learning_space_role_rank(text)
  from public, anon;
grant execute on function public.learning_space_role_rank(text)
  to authenticated, service_role;

revoke all on function public.learning_space_role_at_least(text, text)
  from public, anon;
grant execute on function public.learning_space_role_at_least(text, text)
  to authenticated, service_role;

revoke all on function public.is_learning_space_member(uuid, uuid)
  from public, anon;
grant execute on function public.is_learning_space_member(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.learning_space_member_role(uuid, uuid)
  from public, anon;
grant execute on function public.learning_space_member_role(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.can_manage_learning_space(uuid, uuid)
  from public, anon;
grant execute on function public.can_manage_learning_space(uuid, uuid)
  to authenticated, service_role;

-- Internal only — no client execute grant.
revoke all on function public.learning_audit_write(uuid, uuid, text, text, text, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6b) RLS policies (after helpers exist)
-- ---------------------------------------------------------------------------
-- Public/anon path: NEVER call is_platform_admin() here.

drop policy if exists "Public read active public spaces"
  on public.learning_spaces;
create policy "Public read active public spaces"
  on public.learning_spaces for select
  to anon, authenticated
  using (status = 'active' and visibility = 'public');

drop policy if exists "Members read own spaces" on public.learning_spaces;
create policy "Members read own spaces"
  on public.learning_spaces for select
  to authenticated
  using (public.is_learning_space_member(id));

drop policy if exists "Platform admins read all spaces"
  on public.learning_spaces;
create policy "Platform admins read all spaces"
  on public.learning_spaces for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Members read space memberships"
  on public.learning_space_members;
create policy "Members read space memberships"
  on public.learning_space_members for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_learning_space_member(space_id)
    or public.can_manage_learning_space(space_id)
    or public.is_platform_admin()
  );

drop policy if exists "Managers and invitees read invites"
  on public.learning_space_invites;
create policy "Managers and invitees read invites"
  on public.learning_space_invites for select
  to authenticated
  using (
    public.can_manage_learning_space(space_id)
    or public.is_platform_admin()
    or (
      invited_user_id = (select auth.uid())
      and status = 'pending'
    )
  );

drop policy if exists "Members read space settings"
  on public.learning_space_settings;
create policy "Members read space settings"
  on public.learning_space_settings for select
  to authenticated
  using (
    public.is_learning_space_member(space_id)
    or public.is_platform_admin()
  );

drop policy if exists "Managers read learning audit events"
  on public.learning_audit_events;
create policy "Managers read learning audit events"
  on public.learning_audit_events for select
  to authenticated
  using (
    (
      space_id is not null
      and public.can_manage_learning_space(space_id)
    )
    or public.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- 7) Client-facing RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_learning_space(
  p_slug text,
  p_name text,
  p_description text,
  p_mode text,
  p_visibility text default 'private',
  p_default_language text default 'en'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_space_id uuid;
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_name text := btrim(coalesce(p_name, ''));
  v_visibility text := coalesce(nullif(btrim(p_visibility), ''), 'private');
  v_language text := coalesce(nullif(btrim(p_default_language), ''), 'en');
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or char_length(v_slug) not between 3 and 64
  then
    raise exception 'Invalid learning space slug';
  end if;

  if char_length(v_name) not between 1 and 120 then
    raise exception 'Invalid learning space name';
  end if;

  if p_mode not in (
    'university',
    'school',
    'bootcamp',
    'company_training',
    'creator_academy',
    'personal_learning',
    'general_academy'
  ) then
    raise exception 'Invalid learning space mode';
  end if;

  if v_visibility not in ('private', 'unlisted', 'public') then
    raise exception 'Invalid learning space visibility';
  end if;

  if v_language !~ '^[a-z]{2}(-[A-Z]{2})?$' then
    raise exception 'Invalid default_language';
  end if;

  if p_description is not null and char_length(p_description) > 4000 then
    raise exception 'Description too long';
  end if;

  insert into public.learning_spaces (
    owner_user_id,
    slug,
    name,
    description,
    mode,
    status,
    visibility,
    default_language
  ) values (
    v_uid,
    v_slug,
    v_name,
    nullif(p_description, ''),
    p_mode,
    'draft',
    v_visibility,
    v_language
  )
  returning id into v_space_id;

  insert into public.learning_space_members (
    space_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at
  ) values (
    v_space_id,
    v_uid,
    'owner',
    'active',
    v_uid,
    now()
  );

  insert into public.learning_space_settings (space_id)
  values (v_space_id);

  perform public.learning_audit_write(
    v_uid,
    v_space_id,
    'space.create',
    'learning_space',
    v_space_id::text,
    jsonb_build_object(
      'slug', v_slug,
      'mode', p_mode,
      'visibility', v_visibility
    )
  );

  return jsonb_build_object('space_id', v_space_id);
end;
$$;

create or replace function public.invite_learning_space_member(
  p_space_id uuid,
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
  v_email text;
  v_token text;
  v_hash text;
  v_invite_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_space_id is null then
    raise exception 'space_id is required';
  end if;

  if not public.can_manage_learning_space(p_space_id, v_uid) then
    raise exception 'Not allowed to invite members for this space';
  end if;

  v_caller_role := public.learning_space_member_role(p_space_id, v_uid);
  if not public.is_platform_admin(v_uid)
     and not public.learning_space_role_at_least(v_caller_role, 'admin')
  then
    -- Instructors cannot invite in V1; owner/admin (or platform admin) only.
    raise exception 'Only owner or admin can invite members';
  end if;

  if p_role is null or p_role = 'owner' then
    raise exception 'Invite role cannot be owner';
  end if;

  if p_role not in (
    'admin',
    'instructor',
    'teaching_assistant',
    'content_editor',
    'reviewer',
    'viewer'
  ) then
    raise exception 'Invalid invite role';
  end if;

  v_email := nullif(lower(btrim(coalesce(p_invited_email, ''))), '');
  if p_invited_user_id is null and v_email is null then
    raise exception 'invited_user_id or invited_email is required';
  end if;

  if p_invited_user_id is not null then
    update public.learning_space_invites
    set status = 'revoked',
        revoked_at = now()
    where space_id = p_space_id
      and invited_user_id = p_invited_user_id
      and status = 'pending';
  end if;

  if v_email is not null then
    update public.learning_space_invites
    set status = 'revoked',
        revoked_at = now()
    where space_id = p_space_id
      and lower(invited_email) = v_email
      and status = 'pending';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  insert into public.learning_space_invites (
    space_id,
    invited_user_id,
    invited_email,
    role,
    token_hash,
    status,
    invited_by,
    expires_at
  ) values (
    p_space_id,
    p_invited_user_id,
    v_email,
    p_role,
    v_hash,
    'pending',
    v_uid,
    now() + interval '7 days'
  )
  returning id into v_invite_id;

  perform public.learning_audit_write(
    v_uid,
    p_space_id,
    'invite.create',
    'learning_space_invite',
    v_invite_id::text,
    jsonb_build_object(
      'role', p_role,
      'invited_user_id', p_invited_user_id,
      'invited_email', v_email
    )
  );

  -- Plaintext token returned once; never stored.
  return jsonb_build_object(
    'invite_id', v_invite_id,
    'token', v_token
  );
end;
$$;

create or replace function public.accept_learning_space_invite(
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
  v_invite public.learning_space_invites%rowtype;
  v_jwt_email text;
  v_member_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_token is null or btrim(p_token) = '' then
    raise exception 'Invite token is required';
  end if;

  v_hash := encode(extensions.digest(btrim(p_token), 'sha256'), 'hex');

  select *
  into v_invite
  from public.learning_space_invites
  where token_hash = v_hash
  for update;

  if not found then
    raise exception 'Invite not found';
  end if;

  if v_invite.status = 'expired'
     or v_invite.status = 'revoked'
     or v_invite.status = 'accepted'
  then
    raise exception 'Invite is %', v_invite.status;
  end if;

  if v_invite.status is distinct from 'pending' then
    raise exception 'Invite is not pending';
  end if;

  if v_invite.expires_at <= now() then
    update public.learning_space_invites
    set status = 'expired'
    where id = v_invite.id;
    raise exception 'Invite expired';
  end if;

  v_jwt_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if v_invite.invited_user_id is not null then
    if v_invite.invited_user_id is distinct from v_uid then
      raise exception 'Invite is not addressed to this user';
    end if;
  elsif v_invite.invited_email is not null then
    if v_jwt_email = ''
       or lower(v_invite.invited_email) is distinct from v_jwt_email
    then
      raise exception 'Invite email does not match authenticated user';
    end if;
  else
    raise exception 'Invite has no accept target';
  end if;

  update public.learning_space_invites
  set status = 'accepted',
      accepted_at = now(),
      invited_user_id = coalesce(invited_user_id, v_uid)
  where id = v_invite.id;

  insert into public.learning_space_members (
    space_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at
  ) values (
    v_invite.space_id,
    v_uid,
    v_invite.role,
    'active',
    v_invite.invited_by,
    now()
  )
  on conflict (space_id, user_id) do update
  set role = excluded.role,
      status = 'active',
      invited_by = coalesce(
        public.learning_space_members.invited_by,
        excluded.invited_by
      ),
      joined_at = coalesce(
        public.learning_space_members.joined_at,
        excluded.joined_at
      ),
      updated_at = now()
  where public.learning_space_members.role is distinct from 'owner'
     or public.learning_space_members.status is distinct from 'active'
  returning id into v_member_id;

  if v_member_id is null then
    select id into v_member_id
    from public.learning_space_members
    where space_id = v_invite.space_id
      and user_id = v_uid;
  end if;

  perform public.learning_audit_write(
    v_uid,
    v_invite.space_id,
    'invite.accept',
    'learning_space_invite',
    v_invite.id::text,
    jsonb_build_object(
      'member_id', v_member_id,
      'role', v_invite.role
    )
  );

  return jsonb_build_object(
    'space_id', v_invite.space_id,
    'member_id', v_member_id,
    'role', v_invite.role
  );
end;
$$;

create or replace function public.update_learning_space_member_role(
  p_space_id uuid,
  p_user_id uuid,
  p_new_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_caller_role text;
  v_target public.learning_space_members%rowtype;
  v_caller_rank integer;
  v_new_rank integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.can_manage_learning_space(p_space_id, v_uid) then
    raise exception 'Not allowed to update member roles';
  end if;

  if p_new_role = 'owner' then
    raise exception 'Cannot set owner via update_learning_space_member_role; use transfer';
  end if;

  if public.learning_space_role_rank(p_new_role) is null
     or p_new_role = 'owner'
  then
    raise exception 'Invalid member role';
  end if;

  select * into v_target
  from public.learning_space_members
  where space_id = p_space_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Member not found';
  end if;

  if v_target.role = 'owner' and v_target.status = 'active' then
    raise exception 'Cannot change the active owner via this RPC';
  end if;

  if v_target.role = 'owner' then
    raise exception 'Cannot change owner role membership via this RPC';
  end if;

  v_caller_role := public.learning_space_member_role(p_space_id, v_uid);
  v_caller_rank := public.learning_space_role_rank(v_caller_role);
  v_new_rank := public.learning_space_role_rank(p_new_role);

  if not public.is_platform_admin(v_uid) then
    if v_caller_rank is null or v_new_rank is null then
      raise exception 'Role escalation check failed';
    end if;
    -- Cannot escalate target (or self) above caller's own rank.
    if v_new_rank > v_caller_rank then
      raise exception 'Cannot assign a role above your own';
    end if;
    if p_user_id = v_uid and v_new_rank > v_caller_rank then
      raise exception 'Cannot escalate own role';
    end if;
  end if;

  update public.learning_space_members
  set role = p_new_role,
      updated_at = now()
  where id = v_target.id;

  perform public.learning_audit_write(
    v_uid,
    p_space_id,
    'member.role_update',
    'learning_space_member',
    v_target.id::text,
    jsonb_build_object(
      'user_id', p_user_id,
      'old_role', v_target.role,
      'new_role', p_new_role
    )
  );

  return jsonb_build_object(
    'space_id', p_space_id,
    'user_id', p_user_id,
    'role', p_new_role
  );
end;
$$;

create or replace function public.suspend_learning_space_member(
  p_space_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_target public.learning_space_members%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.can_manage_learning_space(p_space_id, v_uid) then
    raise exception 'Not allowed to suspend members';
  end if;

  select * into v_target
  from public.learning_space_members
  where space_id = p_space_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Member not found';
  end if;

  if v_target.role = 'owner' and v_target.status = 'active' then
    raise exception 'Cannot suspend the active owner';
  end if;

  update public.learning_space_members
  set status = 'suspended',
      updated_at = now()
  where id = v_target.id;

  perform public.learning_audit_write(
    v_uid,
    p_space_id,
    'member.suspend',
    'learning_space_member',
    v_target.id::text,
    jsonb_build_object('user_id', p_user_id)
  );

  return jsonb_build_object(
    'space_id', p_space_id,
    'user_id', p_user_id,
    'status', 'suspended'
  );
end;
$$;

create or replace function public.remove_learning_space_member(
  p_space_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_target public.learning_space_members%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.can_manage_learning_space(p_space_id, v_uid) then
    raise exception 'Not allowed to remove members';
  end if;

  select * into v_target
  from public.learning_space_members
  where space_id = p_space_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Member not found';
  end if;

  if v_target.role = 'owner' and v_target.status = 'active' then
    raise exception 'Cannot remove the active owner';
  end if;

  update public.learning_space_members
  set status = 'removed',
      updated_at = now()
  where id = v_target.id;

  perform public.learning_audit_write(
    v_uid,
    p_space_id,
    'member.remove',
    'learning_space_member',
    v_target.id::text,
    jsonb_build_object('user_id', p_user_id)
  );

  return jsonb_build_object(
    'space_id', p_space_id,
    'user_id', p_user_id,
    'status', 'removed'
  );
end;
$$;

create or replace function public.transfer_learning_space_ownership(
  p_space_id uuid,
  p_new_owner_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_space public.learning_spaces%rowtype;
  v_prev_owner uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_space_id is null or p_new_owner_user_id is null then
    raise exception 'space_id and new owner are required';
  end if;

  select * into v_space
  from public.learning_spaces
  where id = p_space_id
  for update;

  if not found then
    raise exception 'Learning space not found';
  end if;

  v_prev_owner := v_space.owner_user_id;

  if v_uid is distinct from v_prev_owner
     and not public.is_platform_admin(v_uid)
  then
    raise exception 'Only the current owner or platform admin can transfer ownership';
  end if;

  if p_new_owner_user_id = v_prev_owner then
    return jsonb_build_object(
      'space_id', p_space_id,
      'owner_user_id', v_prev_owner,
      'unchanged', true
    );
  end if;

  perform set_config('umtuba.learning_ownership_transfer', '1', true);

  update public.learning_spaces
  set owner_user_id = p_new_owner_user_id
  where id = p_space_id;

  -- Demote previous owner membership to admin (keep active).
  update public.learning_space_members
  set role = 'admin',
      status = 'active',
      updated_at = now()
  where space_id = p_space_id
    and user_id = v_prev_owner
    and role = 'owner'
    and status = 'active';

  insert into public.learning_space_members (
    space_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at
  ) values (
    p_space_id,
    p_new_owner_user_id,
    'owner',
    'active',
    v_uid,
    now()
  )
  on conflict (space_id, user_id) do update
  set role = 'owner',
      status = 'active',
      joined_at = coalesce(
        public.learning_space_members.joined_at,
        excluded.joined_at
      ),
      updated_at = now();

  perform set_config('umtuba.learning_ownership_transfer', '0', true);

  perform public.learning_audit_write(
    v_uid,
    p_space_id,
    'ownership.transfer',
    'learning_space',
    p_space_id::text,
    jsonb_build_object(
      'previous_owner_user_id', v_prev_owner,
      'new_owner_user_id', p_new_owner_user_id
    )
  );

  return jsonb_build_object(
    'space_id', p_space_id,
    'previous_owner_user_id', v_prev_owner,
    'owner_user_id', p_new_owner_user_id
  );
exception
  when others then
    perform set_config('umtuba.learning_ownership_transfer', '0', true);
    raise;
end;
$$;

create or replace function public.publish_learning_space(
  p_space_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_space public.learning_spaces%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_space
  from public.learning_spaces
  where id = p_space_id
  for update;

  if not found then
    raise exception 'Learning space not found';
  end if;

  if v_space.owner_user_id is distinct from v_uid
     and not public.is_platform_admin(v_uid)
  then
    raise exception 'Only the owner can publish this space';
  end if;

  if v_space.status is distinct from 'draft' then
    raise exception 'Only draft spaces can be published';
  end if;

  update public.learning_spaces
  set status = 'active',
      suspended_at = null
  where id = p_space_id;

  perform public.learning_audit_write(
    v_uid,
    p_space_id,
    'space.publish',
    'learning_space',
    p_space_id::text,
    jsonb_build_object('from_status', v_space.status, 'to_status', 'active')
  );

  return jsonb_build_object('space_id', p_space_id, 'status', 'active');
end;
$$;

create or replace function public.archive_learning_space(
  p_space_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_space public.learning_spaces%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_space
  from public.learning_spaces
  where id = p_space_id
  for update;

  if not found then
    raise exception 'Learning space not found';
  end if;

  if v_space.owner_user_id is distinct from v_uid
     and not public.is_platform_admin(v_uid)
  then
    raise exception 'Only the owner can archive this space';
  end if;

  if v_space.status = 'archived' then
    return jsonb_build_object('space_id', p_space_id, 'status', 'archived');
  end if;

  update public.learning_spaces
  set status = 'archived',
      archived_at = now()
  where id = p_space_id;

  perform public.learning_audit_write(
    v_uid,
    p_space_id,
    'space.archive',
    'learning_space',
    p_space_id::text,
    jsonb_build_object('from_status', v_space.status, 'to_status', 'archived')
  );

  return jsonb_build_object('space_id', p_space_id, 'status', 'archived');
end;
$$;

create or replace function public.moderate_learning_space(
  p_space_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_space public.learning_spaces%rowtype;
  v_to text := btrim(coalesce(p_status, ''));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_platform_admin(v_uid) then
    raise exception 'Platform admin required';
  end if;

  if v_to not in ('suspended', 'active', 'archived') then
    raise exception 'moderate_learning_space status must be suspended|active|archived';
  end if;

  select * into v_space
  from public.learning_spaces
  where id = p_space_id
  for update;

  if not found then
    raise exception 'Learning space not found';
  end if;

  if v_to = 'suspended' then
    update public.learning_spaces
    set status = 'suspended',
        suspended_at = now()
    where id = p_space_id;
  elsif v_to = 'active' then
    -- unsuspend / restore to active
    update public.learning_spaces
    set status = 'active',
        suspended_at = null
    where id = p_space_id;
  else
    update public.learning_spaces
    set status = 'archived',
        archived_at = coalesce(archived_at, now())
    where id = p_space_id;
  end if;

  perform public.learning_audit_write(
    v_uid,
    p_space_id,
    'space.moderation',
    'learning_space',
    p_space_id::text,
    jsonb_build_object(
      'from_status', v_space.status,
      'to_status', v_to
    )
  );

  return jsonb_build_object('space_id', p_space_id, 'status', v_to);
end;
$$;

-- RPC grants: revoke public/anon; grant authenticated + service_role
revoke all on function public.create_learning_space(text, text, text, text, text, text)
  from public, anon;
grant execute on function public.create_learning_space(text, text, text, text, text, text)
  to authenticated, service_role;

revoke all on function public.invite_learning_space_member(uuid, text, uuid, text)
  from public, anon;
grant execute on function public.invite_learning_space_member(uuid, text, uuid, text)
  to authenticated, service_role;

revoke all on function public.accept_learning_space_invite(text)
  from public, anon;
grant execute on function public.accept_learning_space_invite(text)
  to authenticated, service_role;

revoke all on function public.update_learning_space_member_role(uuid, uuid, text)
  from public, anon;
grant execute on function public.update_learning_space_member_role(uuid, uuid, text)
  to authenticated, service_role;

revoke all on function public.suspend_learning_space_member(uuid, uuid)
  from public, anon;
grant execute on function public.suspend_learning_space_member(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.remove_learning_space_member(uuid, uuid)
  from public, anon;
grant execute on function public.remove_learning_space_member(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.transfer_learning_space_ownership(uuid, uuid)
  from public, anon;
grant execute on function public.transfer_learning_space_ownership(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.publish_learning_space(uuid)
  from public, anon;
grant execute on function public.publish_learning_space(uuid)
  to authenticated, service_role;

revoke all on function public.archive_learning_space(uuid)
  from public, anon;
grant execute on function public.archive_learning_space(uuid)
  to authenticated, service_role;

revoke all on function public.moderate_learning_space(uuid, text)
  from public, anon;
grant execute on function public.moderate_learning_space(uuid, text)
  to authenticated, service_role;
