-- =============================================================================
-- UMTUBA Collaboration Learning Link/Unlink E2E — cleanup (EXAMPLE)
-- Namespace: UMTUBA_COLLABORATION_LEARNING_LINK_E2E_20260808
--
-- Removes disposable sandbox resource links and (optionally) sandbox rows.
-- Does NOT delete Auth users (persistent E2E identities by convention).
-- =============================================================================

do $$
declare
  v_workspace uuid := 'e2e0808c-2026-4001-8000-000000000001'::uuid;
  v_space uuid := 'e2e0808c-2026-4001-8000-000000000011'::uuid;
  v_drop_rows text := coalesce(
    nullif(current_setting('umtuba.collaboration_e2e_drop_sandbox_rows', true), ''),
    '0'
  );
begin
  delete from public.collaboration_workspace_resource_links
  where workspace_id = v_workspace
     or (resource_type = 'learning_space' and resource_id = v_space);

  if v_drop_rows in ('1', 'true', 'TRUE') then
    delete from public.learning_space_members where space_id = v_space;
    delete from public.learning_space_settings where space_id = v_space;
    delete from public.learning_spaces where id = v_space;

    delete from public.collaboration_workspace_members where workspace_id = v_workspace;
    delete from public.collaboration_workspace_settings where workspace_id = v_workspace;
    delete from public.collaboration_workspace_profiles where workspace_id = v_workspace;
    delete from public.collaboration_workspaces where id = v_workspace;
    raise notice 'E2E sandbox rows dropped workspace=% space=%', v_workspace, v_space;
  else
    raise notice 'E2E sandbox links cleared; rows retained (set umtuba.collaboration_e2e_drop_sandbox_rows=1 to drop)';
  end if;
end $$;
