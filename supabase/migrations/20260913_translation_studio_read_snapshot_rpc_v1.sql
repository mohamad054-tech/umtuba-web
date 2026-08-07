-- =============================================================================
-- UMTUBA Translation Studio Read Snapshot RPC V1
-- Migration: 20260913_translation_studio_read_snapshot_rpc_v1.sql
--
-- SECURITY DEFINER platform-admin read of normalized Studio snapshot for
-- JSON-authoritative reconciliation. Does NOT: widen table DML grants,
-- change RLS/policies, prune/delete, touch Intelligence, or make DB authoritative.
--
-- Contract:
--   public.translation_studio_read_snapshot(p_options jsonb default '{}')
-- =============================================================================

create or replace function public.translation_studio_read_snapshot(
  p_options jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_platform_admin(v_uid) then
    raise exception 'Not allowed: platform admin required';
  end if;

  -- p_options reserved for future filters; unused in v1 (fail closed if prune requested)
  if coalesce((p_options ->> 'prune_missing')::boolean, false) then
    raise exception 'prune_missing is not supported in read snapshot RPC v1';
  end if;

  select jsonb_build_object(
    'schemaVersion', 1,
    'languages', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'code', l.code,
          'name', l.name,
          'nativeName', l.native_name,
          'direction', l.direction,
          'enabled', l.enabled
        )
        order by l.code
      )
      from public.translation_studio_languages l
    ), '[]'::jsonb),
    'namespaces', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stable_id', n.stable_id,
          'id', n.id,
          'name', n.name,
          'description', coalesce(n.description, '')
        )
        order by n.stable_id
      )
      from public.translation_studio_namespaces n
      where n.stable_id is not null
    ), '[]'::jsonb),
    'keys', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stable_id', k.stable_id,
          'id', k.id,
          'namespaceStableId', ns.stable_id,
          'key', k.key,
          'sourceText', k.source_text,
          'description', k.description
        )
        order by k.stable_id
      )
      from public.translation_studio_keys k
      join public.translation_studio_namespaces ns on ns.id = k.namespace_id
      where k.stable_id is not null
    ), '[]'::jsonb),
    'suggestions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stable_id', s.stable_id,
          'id', s.id,
          'keyStableId', k.stable_id,
          'valueStableId', v.stable_id,
          'sourceText', s.source_text,
          'targetLanguage', s.target_language,
          'candidateText', s.candidate_text,
          'status', s.status,
          'createdAt', s.created_at,
          'createdBy', s.created_by
        )
        order by s.stable_id
      )
      from public.translation_studio_suggestions s
      left join public.translation_studio_keys k on k.id = s.key_id
      left join public.translation_studio_values v on v.id = s.value_id
      where s.stable_id is not null
    ), '[]'::jsonb),
    'values', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stable_id', v.stable_id,
          'id', v.id,
          'keyStableId', k.stable_id,
          'language', v.language,
          'value', v.value,
          'status', v.status,
          'version', v.version,
          'suggestion_stable_id', v.suggestion_stable_id,
          'createdAt', v.created_at,
          'updatedAt', v.updated_at,
          'createdBy', v.created_by,
          'updatedBy', v.updated_by,
          'approvedBy', v.approved_by
        )
        order by v.stable_id
      )
      from public.translation_studio_values v
      join public.translation_studio_keys k on k.id = v.key_id
      where v.stable_id is not null
    ), '[]'::jsonb),
    'versions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stable_id', x.stable_id,
          'id', x.id,
          'valueStableId', v.stable_id,
          'keyStableId', k.stable_id,
          'language', x.language,
          'value', x.value,
          'status', x.status,
          'version', x.version,
          'changedBy', x.changed_by,
          'changeAction', x.change_action,
          'changeNote', x.change_note,
          'createdAt', x.created_at
        )
        order by x.stable_id
      )
      from public.translation_studio_versions x
      left join public.translation_studio_values v on v.id = x.value_id
      left join public.translation_studio_keys k on k.id = x.key_id
      where x.stable_id is not null
    ), '[]'::jsonb),
    'memory', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stable_id', m.stable_id,
          'id', m.id,
          'sourceFingerprint', m.source_fingerprint,
          'sourceText', m.source_text,
          'language', m.language,
          'translatedText', m.translated_text,
          'status', m.status,
          'namespaceStableId', ns.stable_id,
          'createdAt', m.created_at,
          'createdBy', m.created_by
        )
        order by m.stable_id
      )
      from public.translation_studio_memory m
      left join public.translation_studio_namespaces ns on ns.id = m.namespace_id
      where m.stable_id is not null
    ), '[]'::jsonb),
    'terminology', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stable_id', t.stable_id,
          'id', t.id,
          'term', t.term,
          'definition', t.definition,
          'notes', t.notes,
          'status', t.status,
          'translations', t.translations
        )
        order by t.stable_id
      )
      from public.translation_studio_terminology t
      where t.stable_id is not null
    ), '[]'::jsonb),
    'auditLog', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stable_id', a.stable_id,
          'id', a.id,
          'entityType', a.entity_type,
          'entityId', a.entity_id,
          'action', a.action,
          'actorId', a.actor_id,
          'actor_kind', a.actor_kind,
          'actor_ref', a.actor_ref,
          'detail', coalesce(a.detail, '{}'::jsonb),
          'createdAt', a.created_at
        )
        order by a.stable_id
      )
      from public.translation_studio_audit_log a
      where a.stable_id is not null
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

comment on function public.translation_studio_read_snapshot(jsonb) is
  'Platform-admin read of normalized Translation Studio snapshot for JSON-authoritative reconciliation. Not a dual_read load path.';

revoke all on function public.translation_studio_read_snapshot(jsonb) from public;
revoke all on function public.translation_studio_read_snapshot(jsonb) from anon;
grant execute on function public.translation_studio_read_snapshot(jsonb) to authenticated;
