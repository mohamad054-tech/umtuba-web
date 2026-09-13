-- Collaboration Workspace Settings & Lifecycle UI V1
-- Additive settings-update RPC on the workspace spine (20260896).
-- Lifecycle leave/suspend/remove/transfer/archive already exist; this fills the
-- profile/settings write gap only. No Learning / Commerce / UEOS / binding.
-- No direct table UPDATE grants to authenticated.

-- ---------------------------------------------------------------------------
-- update_collaboration_workspace_settings
-- ---------------------------------------------------------------------------

create or replace function public.update_collaboration_workspace_settings(
  p_workspace_id uuid,
  p_display_name text,
  p_description text default null,
  p_kind text default null,
  p_allow_member_invites boolean default null,
  p_public_member_directory boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_workspace_status text;
  v_name text := btrim(coalesce(p_display_name, ''));
  v_kind text;
  v_prev_kind text;
  v_prev_name text;
  v_prev_description text;
  v_prev_allow boolean;
  v_prev_directory boolean;
  v_new_kind text;
  v_new_description text;
  v_new_allow boolean;
  v_new_directory boolean;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_workspace_id is null then
    raise exception 'workspace_id is required';
  end if;

  select w.status into v_workspace_status
  from public.collaboration_workspaces w
  where w.id = p_workspace_id
  for update;

  if not found then
    raise exception 'Workspace not found';
  end if;

  if v_workspace_status not in ('draft', 'active') then
    raise exception 'Workspace is not available for settings updates';
  end if;

  if not public.can_manage_collaboration_workspace(p_workspace_id, v_uid) then
    raise exception 'Not allowed to update workspace settings';
  end if;

  if char_length(v_name) not between 1 and 120 then
    raise exception 'Invalid workspace display_name';
  end if;

  if p_description is not null and char_length(p_description) > 4000 then
    raise exception 'Description too long';
  end if;

  select
    p.kind,
    p.display_name,
    p.description
  into
    v_prev_kind,
    v_prev_name,
    v_prev_description
  from public.collaboration_workspace_profiles p
  where p.workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception 'Workspace profile not found';
  end if;

  select
    s.allow_member_invites,
    s.public_member_directory
  into
    v_prev_allow,
    v_prev_directory
  from public.collaboration_workspace_settings s
  where s.workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception 'Workspace settings not found';
  end if;

  if p_kind is null then
    v_new_kind := v_prev_kind;
  else
    v_kind := btrim(p_kind);
    if v_kind not in ('team', 'company', 'school', 'academy') then
      raise exception 'Invalid workspace kind';
    end if;
    -- Allowed kind transitions: any supported kind <-> any supported kind
    -- while workspace is draft/active. No other kinds.
    v_new_kind := v_kind;
  end if;

  v_new_description := nullif(p_description, '');
  v_new_allow := coalesce(p_allow_member_invites, v_prev_allow);
  v_new_directory := coalesce(p_public_member_directory, v_prev_directory);

  update public.collaboration_workspace_profiles
  set
    display_name = v_name,
    description = v_new_description,
    kind = v_new_kind,
    updated_at = now()
  where workspace_id = p_workspace_id;

  update public.collaboration_workspace_settings
  set
    allow_member_invites = v_new_allow,
    public_member_directory = v_new_directory,
    updated_at = now()
  where workspace_id = p_workspace_id;

  perform public.collaboration_workspace_audit_write(
    v_uid,
    p_workspace_id,
    'workspace.settings_update',
    'collaboration_workspace',
    p_workspace_id::text,
    jsonb_build_object(
      'display_name', jsonb_build_object('from', v_prev_name, 'to', v_name),
      'kind', jsonb_build_object('from', v_prev_kind, 'to', v_new_kind),
      'description_changed',
        coalesce(v_prev_description, '') is distinct from coalesce(v_new_description, ''),
      'allow_member_invites',
        jsonb_build_object('from', v_prev_allow, 'to', v_new_allow),
      'public_member_directory',
        jsonb_build_object('from', v_prev_directory, 'to', v_new_directory)
    )
  );

  return jsonb_build_object(
    'workspace_id', p_workspace_id,
    'display_name', v_name,
    'description', v_new_description,
    'kind', v_new_kind,
    'allow_member_invites', v_new_allow,
    'public_member_directory', v_new_directory
  );
end;
$$;

revoke all on function public.update_collaboration_workspace_settings(
  uuid, text, text, text, boolean, boolean
) from public, anon;
grant execute on function public.update_collaboration_workspace_settings(
  uuid, text, text, text, boolean, boolean
) to authenticated, service_role;
