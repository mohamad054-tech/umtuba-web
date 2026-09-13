-- Collaboration Workspace Resource Link Mutation Runtime V1
-- Additive SECURITY DEFINER RPCs over existing
-- public.collaboration_workspace_resource_links (20260896 schema).
-- Authenticated table grants remain SELECT-only (no direct client writes).
-- No Learning / Commerce / advertiser product binding RPCs.
-- Local migration only — do not apply remotely in this milestone.

-- ---------------------------------------------------------------------------
-- Metadata validation (opaque flat bag; not a product payload)
-- ---------------------------------------------------------------------------

create or replace function public.collaboration_resource_link_normalize_metadata(
  p_metadata jsonb
)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = public
as $$
declare
  v_key text;
  v_val jsonb;
  v_out jsonb := '{}'::jsonb;
  v_count integer := 0;
begin
  if p_metadata is null or jsonb_typeof(p_metadata) is distinct from 'object' then
    raise exception 'metadata must be an object';
  end if;

  for v_key, v_val in
    select key, value from jsonb_each(p_metadata)
  loop
    if v_key is null or char_length(v_key) < 1 or char_length(v_key) > 64 then
      raise exception 'metadata key is invalid';
    end if;
    if jsonb_typeof(v_val) not in ('string', 'number', 'boolean', 'null') then
      raise exception 'metadata values must be string, number, boolean, or null';
    end if;
    v_out := v_out || jsonb_build_object(v_key, v_val);
    v_count := v_count + 1;
    if v_count > 64 then
      raise exception 'metadata has too many keys';
    end if;
  end loop;

  return v_out;
end;
$$;

revoke all on function public.collaboration_resource_link_normalize_metadata(jsonb)
  from public, anon, authenticated;
grant execute on function public.collaboration_resource_link_normalize_metadata(jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- create_collaboration_workspace_resource_link
-- ---------------------------------------------------------------------------

create or replace function public.create_collaboration_workspace_resource_link(
  p_workspace_id uuid,
  p_resource_type text,
  p_resource_id uuid,
  p_relationship_type text default 'linked',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_workspace_status text;
  v_rel text := coalesce(nullif(btrim(p_relationship_type), ''), 'linked');
  v_type text := btrim(coalesce(p_resource_type, ''));
  v_metadata jsonb;
  v_row public.collaboration_workspace_resource_links%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_workspace_id is null then
    raise exception 'workspace_id is required';
  end if;

  if p_resource_id is null then
    raise exception 'resource_id is required';
  end if;

  if v_type not in ('learning_space', 'store', 'advertiser_account') then
    raise exception 'Unsupported collaboration resource type';
  end if;

  if v_rel not in ('linked', 'manages', 'owns') then
    raise exception 'Unsupported collaboration resource relationship';
  end if;

  v_metadata := public.collaboration_resource_link_normalize_metadata(
    coalesce(p_metadata, '{}'::jsonb)
  );

  select w.status into v_workspace_status
  from public.collaboration_workspaces w
  where w.id = p_workspace_id
  for update;

  if not found then
    raise exception 'Workspace not found';
  end if;

  if v_workspace_status not in ('draft', 'active') then
    raise exception 'Workspace is not available for resource link changes';
  end if;

  if not public.can_manage_collaboration_workspace(p_workspace_id, v_uid) then
    raise exception 'Not allowed to manage workspace resource links';
  end if;

  begin
    insert into public.collaboration_workspace_resource_links (
      workspace_id,
      resource_type,
      resource_id,
      relationship_type,
      status,
      linked_by,
      linked_at,
      metadata
    ) values (
      p_workspace_id,
      v_type,
      p_resource_id,
      v_rel,
      'active',
      v_uid,
      now(),
      v_metadata
    )
    returning * into v_row;
  exception
    when unique_violation then
      raise exception 'Resource is already linked to a workspace';
  end;

  perform public.collaboration_workspace_audit_write(
    v_uid,
    p_workspace_id,
    'workspace.resource_link_create',
    'collaboration_workspace_resource_link',
    v_row.id::text,
    jsonb_build_object(
      'resource_type', v_row.resource_type,
      'resource_id', v_row.resource_id,
      'relationship_type', v_row.relationship_type,
      'status', v_row.status
    )
  );

  return jsonb_build_object(
    'id', v_row.id,
    'workspace_id', v_row.workspace_id,
    'resource_type', v_row.resource_type,
    'resource_id', v_row.resource_id,
    'relationship_type', v_row.relationship_type,
    'status', v_row.status,
    'linked_by', v_row.linked_by,
    'linked_at', v_row.linked_at,
    'metadata', v_row.metadata,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.create_collaboration_workspace_resource_link(
  uuid, text, uuid, text, jsonb
) from public, anon;
grant execute on function public.create_collaboration_workspace_resource_link(
  uuid, text, uuid, text, jsonb
) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- update_collaboration_workspace_resource_link
-- Whitelist: status, relationship_type, metadata (full replace when provided)
-- ---------------------------------------------------------------------------

create or replace function public.update_collaboration_workspace_resource_link(
  p_workspace_id uuid,
  p_link_id uuid,
  p_status text default null,
  p_relationship_type text default null,
  p_metadata jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_workspace_status text;
  v_row public.collaboration_workspace_resource_links%rowtype;
  v_new_status text;
  v_new_rel text;
  v_new_metadata jsonb;
  v_has_change boolean := false;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_workspace_id is null then
    raise exception 'workspace_id is required';
  end if;

  if p_link_id is null then
    raise exception 'link_id is required';
  end if;

  if p_status is null and p_relationship_type is null and p_metadata is null then
    raise exception 'No supported resource link fields to update';
  end if;

  select w.status into v_workspace_status
  from public.collaboration_workspaces w
  where w.id = p_workspace_id
  for update;

  if not found then
    raise exception 'Workspace not found';
  end if;

  if v_workspace_status not in ('draft', 'active') then
    raise exception 'Workspace is not available for resource link changes';
  end if;

  if not public.can_manage_collaboration_workspace(p_workspace_id, v_uid) then
    raise exception 'Not allowed to manage workspace resource links';
  end if;

  select * into v_row
  from public.collaboration_workspace_resource_links l
  where l.id = p_link_id
    and l.workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception 'Resource link not found';
  end if;

  v_new_status := v_row.status;
  v_new_rel := v_row.relationship_type;
  v_new_metadata := v_row.metadata;

  if p_status is not null then
    v_new_status := btrim(p_status);
    if v_new_status not in ('active', 'revoked') then
      raise exception 'Unsupported collaboration resource status';
    end if;
    v_has_change := true;
  end if;

  if p_relationship_type is not null then
    v_new_rel := btrim(p_relationship_type);
    if v_new_rel not in ('linked', 'manages', 'owns') then
      raise exception 'Unsupported collaboration resource relationship';
    end if;
    v_has_change := true;
  end if;

  if p_metadata is not null then
    v_new_metadata := public.collaboration_resource_link_normalize_metadata(p_metadata);
    v_has_change := true;
  end if;

  if not v_has_change then
    raise exception 'No supported resource link fields to update';
  end if;

  update public.collaboration_workspace_resource_links
  set
    status = v_new_status,
    relationship_type = v_new_rel,
    metadata = v_new_metadata,
    updated_at = now()
  where id = p_link_id
    and workspace_id = p_workspace_id
  returning * into v_row;

  perform public.collaboration_workspace_audit_write(
    v_uid,
    p_workspace_id,
    'workspace.resource_link_update',
    'collaboration_workspace_resource_link',
    v_row.id::text,
    jsonb_build_object(
      'status', v_row.status,
      'relationship_type', v_row.relationship_type,
      'metadata_updated', p_metadata is not null
    )
  );

  return jsonb_build_object(
    'id', v_row.id,
    'workspace_id', v_row.workspace_id,
    'resource_type', v_row.resource_type,
    'resource_id', v_row.resource_id,
    'relationship_type', v_row.relationship_type,
    'status', v_row.status,
    'linked_by', v_row.linked_by,
    'linked_at', v_row.linked_at,
    'metadata', v_row.metadata,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.update_collaboration_workspace_resource_link(
  uuid, uuid, text, text, jsonb
) from public, anon;
grant execute on function public.update_collaboration_workspace_resource_link(
  uuid, uuid, text, text, jsonb
) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- delete_collaboration_workspace_resource_link (hard unlink; frees unique key)
-- ---------------------------------------------------------------------------

create or replace function public.delete_collaboration_workspace_resource_link(
  p_workspace_id uuid,
  p_link_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_workspace_status text;
  v_row public.collaboration_workspace_resource_links%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_workspace_id is null then
    raise exception 'workspace_id is required';
  end if;

  if p_link_id is null then
    raise exception 'link_id is required';
  end if;

  select w.status into v_workspace_status
  from public.collaboration_workspaces w
  where w.id = p_workspace_id
  for update;

  if not found then
    raise exception 'Workspace not found';
  end if;

  if v_workspace_status not in ('draft', 'active') then
    raise exception 'Workspace is not available for resource link changes';
  end if;

  if not public.can_manage_collaboration_workspace(p_workspace_id, v_uid) then
    raise exception 'Not allowed to manage workspace resource links';
  end if;

  select * into v_row
  from public.collaboration_workspace_resource_links l
  where l.id = p_link_id
    and l.workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception 'Resource link not found';
  end if;

  delete from public.collaboration_workspace_resource_links
  where id = p_link_id
    and workspace_id = p_workspace_id;

  perform public.collaboration_workspace_audit_write(
    v_uid,
    p_workspace_id,
    'workspace.resource_link_delete',
    'collaboration_workspace_resource_link',
    v_row.id::text,
    jsonb_build_object(
      'resource_type', v_row.resource_type,
      'resource_id', v_row.resource_id,
      'status_before', v_row.status
    )
  );

  return jsonb_build_object(
    'workspace_id', p_workspace_id,
    'link_id', p_link_id,
    'deleted', true
  );
end;
$$;

revoke all on function public.delete_collaboration_workspace_resource_link(
  uuid, uuid
) from public, anon;
grant execute on function public.delete_collaboration_workspace_resource_link(
  uuid, uuid
) to authenticated, service_role;
