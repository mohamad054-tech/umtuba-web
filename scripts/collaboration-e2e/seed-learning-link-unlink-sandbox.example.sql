-- =============================================================================
-- UMTUBA Collaboration Learning Link/Unlink E2E — sandbox seed (EXAMPLE)
-- Namespace: UMTUBA_COLLABORATION_LEARNING_LINK_E2E_20260808
--
-- Operator-run only against LOCAL or approved NON-PRODUCTION.
-- Requires config.local.sql GUCs in the same session.
-- Service-role / linked SQL session may provision fixtures only.
-- Authenticated browser path still exercises real user authz/RLS.
--
-- Does NOT insert into auth.users.
-- Does NOT touch unrelated workspaces / learning spaces.
-- =============================================================================

do $$
declare
  v_owner uuid := nullif(current_setting('umtuba.collaboration_e2e_owner_user_id', true), '')::uuid;
  v_peer uuid := nullif(current_setting('umtuba.collaboration_e2e_peer_user_id', true), '')::uuid;
  v_workspace uuid := 'e2e0808c-2026-4001-8000-000000000001'::uuid;
  v_space uuid := 'e2e0808c-2026-4001-8000-000000000011'::uuid;
  v_placeholder_owner uuid := '00000000-0000-4000-8000-0000000000a1'::uuid;
  v_placeholder_peer uuid := '00000000-0000-4000-8000-0000000000b1'::uuid;
begin
  if v_owner is null or v_peer is null
     or v_owner = v_placeholder_owner
     or v_peer = v_placeholder_peer then
    raise exception 'ACCOUNT_BLOCKER: set real owner/peer Auth UUIDs in config.local.sql';
  end if;

  if not exists (select 1 from public.profiles p where p.id = v_owner) then
    raise exception 'ACCOUNT_BLOCKER: owner profile missing for %', v_owner;
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_peer) then
    raise exception 'ACCOUNT_BLOCKER: peer profile missing for %', v_peer;
  end if;

  -- Disposable Collaboration workspace (owner manages).
  insert into public.collaboration_workspaces (
    id, owner_user_id, slug, status
  ) values (
    v_workspace, v_owner, 'e2e-collab-ws-link-20260808', 'active'
  )
  on conflict (id) do update
    set owner_user_id = excluded.owner_user_id,
        slug = excluded.slug,
        status = 'active',
        updated_at = now();

  insert into public.collaboration_workspace_profiles (
    workspace_id, kind, display_name, description
  ) values (
    v_workspace,
    'team',
    'E2E Collab Learning Link WS',
    'Disposable sandbox for Learning link/unlink E2E'
  )
  on conflict (workspace_id) do update
    set kind = excluded.kind,
        display_name = excluded.display_name,
        description = excluded.description,
        updated_at = now();

  insert into public.collaboration_workspace_settings (
    workspace_id, allow_member_invites, public_member_directory
  ) values (
    v_workspace, false, false
  )
  on conflict (workspace_id) do update
    set allow_member_invites = false,
        public_member_directory = false,
        updated_at = now();

  insert into public.collaboration_workspace_members (
    workspace_id, user_id, role, status, joined_at
  ) values (
    v_workspace, v_owner, 'owner', 'active', now()
  )
  on conflict (workspace_id, user_id) do update
    set role = 'owner',
        status = 'active',
        joined_at = coalesce(public.collaboration_workspace_members.joined_at, now()),
        updated_at = now();

  insert into public.collaboration_workspace_members (
    workspace_id, user_id, role, status, joined_at
  ) values (
    v_workspace, v_peer, 'member', 'active', now()
  )
  on conflict (workspace_id, user_id) do update
    set role = 'member',
        status = 'active',
        joined_at = coalesce(public.collaboration_workspace_members.joined_at, now()),
        updated_at = now();

  -- Disposable Learning Space manageable by owner only.
  insert into public.learning_spaces (
    id, owner_user_id, slug, name, mode, status, visibility
  ) values (
    v_space,
    v_owner,
    'e2e-collab-learning-link-20260808',
    'E2E Collab Learning Link Space',
    'general_academy',
    'active',
    'private'
  )
  on conflict (id) do update
    set owner_user_id = excluded.owner_user_id,
        slug = excluded.slug,
        name = excluded.name,
        mode = excluded.mode,
        status = 'active',
        visibility = 'private',
        updated_at = now();

  insert into public.learning_space_settings (space_id)
  values (v_space)
  on conflict (space_id) do nothing;

  insert into public.learning_space_members (
    space_id, user_id, role, status, joined_at
  ) values (
    v_space, v_owner, 'owner', 'active', now()
  )
  on conflict (space_id, user_id) do update
    set role = 'owner',
        status = 'active',
        joined_at = coalesce(public.learning_space_members.joined_at, now()),
        updated_at = now();

  -- Ensure no pre-existing target link at test start.
  delete from public.collaboration_workspace_resource_links
  where workspace_id = v_workspace
    and resource_type = 'learning_space'
    and resource_id = v_space;

  raise notice 'E2E sandbox ready workspace=% space=%', v_workspace, v_space;
end $$;
