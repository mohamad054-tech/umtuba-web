-- Collaboration Workspace Membership & Invitation Runtime V1
-- Additive RPCs on the workspace spine (20260896):
--   - revoke_collaboration_workspace_invite
--   - leave_collaboration_workspace
-- No Learning / Commerce / Creator / UEOS / resource-link binding.

-- ---------------------------------------------------------------------------
-- revoke_collaboration_workspace_invite
-- ---------------------------------------------------------------------------

create or replace function public.revoke_collaboration_workspace_invite(
  p_invite_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.collaboration_workspace_invites%rowtype;
  v_workspace_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_invite_id is null then
    raise exception 'invite_id is required';
  end if;

  select * into v_invite
  from public.collaboration_workspace_invites
  where id = p_invite_id
  for update;

  if not found then
    raise exception 'Invite not found';
  end if;

  select status into v_workspace_status
  from public.collaboration_workspaces
  where id = v_invite.workspace_id;

  if not found then
    raise exception 'Workspace not found';
  end if;

  if v_workspace_status is distinct from 'active' then
    raise exception 'Workspace must be active for membership changes';
  end if;

  if not (
    public.can_manage_collaboration_workspace(v_invite.workspace_id, v_uid)
    or (
      v_invite.invited_by = v_uid
      and public.is_collaboration_workspace_member(v_invite.workspace_id, v_uid)
    )
  ) then
    raise exception 'Not allowed to revoke this invite';
  end if;

  if v_invite.status is distinct from 'pending' then
    raise exception 'Invite not found or already used';
  end if;

  if v_invite.expires_at <= now() then
    update public.collaboration_workspace_invites
    set status = 'expired'
    where id = v_invite.id;
    raise exception 'Invite has expired';
  end if;

  update public.collaboration_workspace_invites
  set status = 'revoked',
      revoked_at = now()
  where id = v_invite.id;

  perform public.collaboration_workspace_audit_write(
    v_uid,
    v_invite.workspace_id,
    'invite.revoke',
    'collaboration_workspace_invite',
    v_invite.id::text,
    jsonb_build_object('role', v_invite.role)
  );

  return jsonb_build_object(
    'invite_id', v_invite.id,
    'status', 'revoked'
  );
end;
$$;

revoke all on function public.revoke_collaboration_workspace_invite(uuid)
  from public, anon;
grant execute on function public.revoke_collaboration_workspace_invite(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- leave_collaboration_workspace
-- ---------------------------------------------------------------------------

create or replace function public.leave_collaboration_workspace(
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
  v_workspace_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_workspace_id is null then
    raise exception 'workspace_id is required';
  end if;

  select status into v_workspace_status
  from public.collaboration_workspaces
  where id = p_workspace_id
  for update;

  if not found then
    raise exception 'Workspace not found';
  end if;

  if v_workspace_status is distinct from 'active' then
    raise exception 'Workspace must be active for membership changes';
  end if;

  select role into v_role
  from public.collaboration_workspace_members
  where workspace_id = p_workspace_id
    and user_id = v_uid
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active membership not found';
  end if;

  -- Last-owner protection: sole active owner cannot leave without transfer.
  if v_role = 'owner' then
    raise exception 'Transfer ownership before leaving the workspace';
  end if;

  update public.collaboration_workspace_members
  set status = 'left',
      updated_at = now()
  where workspace_id = p_workspace_id
    and user_id = v_uid;

  perform public.collaboration_workspace_audit_write(
    v_uid,
    p_workspace_id,
    'member.leave',
    'collaboration_workspace_member',
    v_uid::text,
    jsonb_build_object('role', v_role)
  );

  return jsonb_build_object(
    'workspace_id', p_workspace_id,
    'user_id', v_uid,
    'status', 'left'
  );
end;
$$;

revoke all on function public.leave_collaboration_workspace(uuid)
  from public, anon;
grant execute on function public.leave_collaboration_workspace(uuid)
  to authenticated, service_role;
