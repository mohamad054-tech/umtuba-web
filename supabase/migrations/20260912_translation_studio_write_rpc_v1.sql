-- =============================================================================
-- UMTUBA Translation Studio Write RPC V1
-- Migration: 20260912_translation_studio_write_rpc_v1.sql
--
-- One SECURITY DEFINER write RPC for future JSON→DB / shadow dual-write.
-- Does NOT: widen table grants, weaken RLS, touch Intelligence, remote-apply
-- guidance, prune_missing deletes, or change runtime adapters.
--
-- Contract (camelCase snapshot matching PersistedStudioState):
--   public.translation_studio_upsert_snapshot(p_snapshot jsonb, p_options jsonb)
-- =============================================================================

create or replace function public.translation_studio_upsert_snapshot(
  p_snapshot jsonb,
  p_options jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_dry_run boolean := coalesce((p_options ->> 'dry_run')::boolean, false);
  v_prune boolean := coalesce((p_options ->> 'prune_missing')::boolean, false);
  v_schema int;
  v_now timestamptz := timezone('utc', now());

  v_inserted int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  v_planned_insert int := 0;
  v_planned_update int := 0;

  v_lang jsonb;
  v_ns jsonb;
  v_key jsonb;
  v_sug jsonb;
  v_val jsonb;
  v_ver jsonb;
  v_mem jsonb;
  v_term jsonb;
  v_audit jsonb;

  v_ns_id uuid;
  v_key_id uuid;
  v_value_id uuid;
  v_sug_id uuid;
  v_row_id uuid;
  v_stable text;
  v_ns_stable text;
  v_key_stable text;
  v_value_stable text;
  v_status text;
  v_exists boolean;

  v_actor_uuid uuid;
  v_actor_kind text;
  v_actor_ref text;
  v_detail jsonb;
  v_created_by uuid;
  v_updated_by_uuid uuid;
  v_approved_by uuid;
  v_version_num int;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_platform_admin(v_uid) then
    raise exception 'Not allowed: platform admin required';
  end if;

  if p_snapshot is null or jsonb_typeof(p_snapshot) is distinct from 'object' then
    raise exception 'Invalid snapshot: object required';
  end if;

  if v_prune then
    raise exception 'prune_missing is not supported in write RPC v1';
  end if;

  begin
    v_schema := (p_snapshot ->> 'schemaVersion')::int;
  exception when others then
    raise exception 'Invalid snapshot: schemaVersion must be integer 1';
  end;

  if v_schema is distinct from 1 then
    raise exception 'Unsupported schemaVersion: %', coalesce(v_schema::text, 'null');
  end if;

  -- -------------------------------------------------------------------------
  -- Languages (identity = code)
  -- -------------------------------------------------------------------------
  for v_lang in
    select value from jsonb_array_elements(coalesce(p_snapshot -> 'languages', '[]'::jsonb))
  loop
    if coalesce(v_lang ->> 'code', '') = '' then
      raise exception 'Invalid language: code required';
    end if;
    if coalesce(v_lang ->> 'name', '') = ''
       or coalesce(v_lang ->> 'nativeName', '') = ''
       or coalesce(v_lang ->> 'direction', '') not in ('ltr', 'rtl') then
      raise exception 'Invalid language payload for code %', v_lang ->> 'code';
    end if;

    select exists(
      select 1 from public.translation_studio_languages l
      where l.code = v_lang ->> 'code'
    ) into v_exists;

    if v_dry_run then
      if v_exists then
        v_planned_update := v_planned_update + 1;
      else
        v_planned_insert := v_planned_insert + 1;
      end if;
    elsif v_exists then
      update public.translation_studio_languages
      set
        name = left(v_lang ->> 'name', 120),
        native_name = left(v_lang ->> 'nativeName', 120),
        direction = v_lang ->> 'direction',
        enabled = coalesce((v_lang ->> 'enabled')::boolean, true),
        updated_at = v_now
      where code = v_lang ->> 'code';
      v_updated := v_updated + 1;
    else
      insert into public.translation_studio_languages (
        code, name, native_name, direction, enabled, created_at, updated_at
      ) values (
        left(v_lang ->> 'code', 16),
        left(v_lang ->> 'name', 120),
        left(v_lang ->> 'nativeName', 120),
        v_lang ->> 'direction',
        coalesce((v_lang ->> 'enabled')::boolean, true),
        v_now,
        v_now
      );
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  -- -------------------------------------------------------------------------
  -- Namespaces (stable_id = runtime id)
  -- -------------------------------------------------------------------------
  for v_ns in
    select value from jsonb_array_elements(coalesce(p_snapshot -> 'namespaces', '[]'::jsonb))
  loop
    v_stable := nullif(btrim(coalesce(v_ns ->> 'id', '')), '');
    if v_stable is null or coalesce(v_ns ->> 'name', '') = '' then
      raise exception 'Invalid namespace: id and name required';
    end if;

    select n.id into v_ns_id
    from public.translation_studio_namespaces n
    where n.stable_id = v_stable;

    if v_dry_run then
      if v_ns_id is null then
        v_planned_insert := v_planned_insert + 1;
      else
        v_planned_update := v_planned_update + 1;
      end if;
    elsif v_ns_id is null then
      insert into public.translation_studio_namespaces (
        name, description, stable_id, created_at, updated_at
      ) values (
        left(v_ns ->> 'name', 120),
        left(coalesce(v_ns ->> 'description', ''), 2000),
        left(v_stable, 128),
        v_now,
        v_now
      );
      v_inserted := v_inserted + 1;
    else
      update public.translation_studio_namespaces
      set
        name = left(v_ns ->> 'name', 120),
        description = left(coalesce(v_ns ->> 'description', ''), 2000),
        updated_at = v_now
      where id = v_ns_id;
      v_updated := v_updated + 1;
    end if;
  end loop;

  -- -------------------------------------------------------------------------
  -- Keys
  -- -------------------------------------------------------------------------
  for v_key in
    select value from jsonb_array_elements(coalesce(p_snapshot -> 'keys', '[]'::jsonb))
  loop
    v_stable := nullif(btrim(coalesce(v_key ->> 'id', '')), '');
    v_ns_stable := nullif(btrim(coalesce(v_key ->> 'namespaceId', '')), '');
    if v_stable is null or v_ns_stable is null or coalesce(v_key ->> 'key', '') = '' then
      raise exception 'Invalid key: id, namespaceId, and key required';
    end if;

    select n.id into v_ns_id
    from public.translation_studio_namespaces n
    where n.stable_id = v_ns_stable;
    if v_ns_id is null and not v_dry_run then
      raise exception 'Unknown namespace stable_id: %', v_ns_stable;
    end if;
    if v_ns_id is null and v_dry_run then
      -- allow dry-run planning when parent arrives in same payload
      select n.id into v_ns_id
      from public.translation_studio_namespaces n
      where n.stable_id = v_ns_stable;
    end if;

    select k.id into v_key_id
    from public.translation_studio_keys k
    where k.stable_id = v_stable;

    if v_dry_run then
      if v_key_id is null then
        v_planned_insert := v_planned_insert + 1;
      else
        v_planned_update := v_planned_update + 1;
      end if;
    elsif v_ns_id is null then
      raise exception 'Unknown namespace stable_id: %', v_ns_stable;
    elsif v_key_id is null then
      insert into public.translation_studio_keys (
        namespace_id, key, source_text, description, stable_id, created_at, updated_at
      ) values (
        v_ns_id,
        left(v_key ->> 'key', 256),
        left(coalesce(v_key ->> 'sourceText', ''), 8000),
        case
          when v_key ->> 'description' is null then null
          else left(v_key ->> 'description', 2000)
        end,
        left(v_stable, 256),
        v_now,
        v_now
      );
      v_inserted := v_inserted + 1;
    else
      update public.translation_studio_keys
      set
        namespace_id = v_ns_id,
        key = left(v_key ->> 'key', 256),
        source_text = left(coalesce(v_key ->> 'sourceText', ''), 8000),
        description = case
          when v_key ->> 'description' is null then null
          else left(v_key ->> 'description', 2000)
        end,
        updated_at = v_now
      where id = v_key_id;
      v_updated := v_updated + 1;
    end if;
  end loop;

  -- -------------------------------------------------------------------------
  -- Suggestions (before values so suggestion_stable_id can resolve later)
  -- -------------------------------------------------------------------------
  for v_sug in
    select value from jsonb_array_elements(coalesce(p_snapshot -> 'suggestions', '[]'::jsonb))
  loop
    v_stable := nullif(btrim(coalesce(v_sug ->> 'id', '')), '');
    if v_stable is null or coalesce(v_sug ->> 'sourceText', '') = ''
       or coalesce(v_sug ->> 'targetLanguage', '') = ''
       or coalesce(v_sug ->> 'candidateText', '') = '' then
      raise exception 'Invalid suggestion: id/sourceText/targetLanguage/candidateText required';
    end if;

    v_status := coalesce(v_sug ->> 'status', 'pending_review');
    if v_status not in ('pending_review', 'accepted', 'rejected', 'superseded') then
      raise exception 'Invalid suggestion status: %', v_status;
    end if;

    v_key_stable := nullif(btrim(coalesce(v_sug ->> 'keyId', '')), '');
    v_value_stable := nullif(btrim(coalesce(v_sug ->> 'valueId', '')), '');
    v_key_id := null;
    v_value_id := null;
    if v_key_stable is not null then
      select k.id into v_key_id from public.translation_studio_keys k where k.stable_id = v_key_stable;
    end if;
    if v_value_stable is not null then
      select v.id into v_value_id from public.translation_studio_values v where v.stable_id = v_value_stable;
    end if;

    select s.id into v_sug_id
    from public.translation_studio_suggestions s
    where s.stable_id = v_stable;

    v_actor_uuid := null;
    begin
      if coalesce(v_sug ->> 'createdBy', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        v_actor_uuid := (v_sug ->> 'createdBy')::uuid;
      end if;
    exception when others then
      v_actor_uuid := null;
    end;

    if v_dry_run then
      if v_sug_id is null then
        v_planned_insert := v_planned_insert + 1;
      else
        v_planned_update := v_planned_update + 1;
      end if;
    elsif v_sug_id is null then
      insert into public.translation_studio_suggestions (
        key_id, value_id, source_text, target_language, candidate_text,
        status, quality, created_by, created_at, stable_id
      ) values (
        v_key_id,
        v_value_id,
        v_sug ->> 'sourceText',
        left(v_sug ->> 'targetLanguage', 16),
        v_sug ->> 'candidateText',
        v_status,
        coalesce(v_sug -> 'quality', '{}'::jsonb),
        v_actor_uuid,
        coalesce((v_sug ->> 'createdAt')::timestamptz, v_now),
        left(v_stable, 128)
      );
      v_inserted := v_inserted + 1;
    else
      update public.translation_studio_suggestions
      set
        key_id = v_key_id,
        value_id = v_value_id,
        source_text = v_sug ->> 'sourceText',
        target_language = left(v_sug ->> 'targetLanguage', 16),
        candidate_text = v_sug ->> 'candidateText',
        status = v_status,
        quality = coalesce(v_sug -> 'quality', '{}'::jsonb),
        created_by = coalesce(v_actor_uuid, created_by)
      where id = v_sug_id;
      v_updated := v_updated + 1;
    end if;
  end loop;

  -- -------------------------------------------------------------------------
  -- Values
  -- -------------------------------------------------------------------------
  for v_val in
    select value from jsonb_array_elements(coalesce(p_snapshot -> 'values', '[]'::jsonb))
  loop
    v_stable := nullif(btrim(coalesce(v_val ->> 'id', '')), '');
    v_key_stable := nullif(btrim(coalesce(v_val ->> 'keyId', '')), '');
    if v_stable is null or v_key_stable is null or coalesce(v_val ->> 'language', '') = '' then
      raise exception 'Invalid value: id, keyId, and language required';
    end if;

    v_status := coalesce(v_val ->> 'status', 'missing');
    if v_status not in (
      'missing', 'draft', 'ai_suggested', 'needs_review',
      'approved', 'rejected', 'deprecated', 'ready_for_publish'
    ) then
      raise exception 'Invalid value status: %', v_status;
    end if;

    select k.id into v_key_id
    from public.translation_studio_keys k
    where k.stable_id = v_key_stable;
    if v_key_id is null and not v_dry_run then
      raise exception 'Unknown key stable_id: %', v_key_stable;
    end if;

    if not exists (
      select 1 from public.translation_studio_languages l
      where l.code = v_val ->> 'language'
    ) and not v_dry_run then
      raise exception 'Unknown language code: %', v_val ->> 'language';
    end if;

    select v.id into v_value_id
    from public.translation_studio_values v
    where v.stable_id = v_stable;

    if v_dry_run then
      if v_value_id is null then
        v_planned_insert := v_planned_insert + 1;
      else
        v_planned_update := v_planned_update + 1;
      end if;
      continue;
    end if;

    v_created_by := null;
    v_updated_by_uuid := null;
    v_approved_by := null;
    begin
      if coalesce(v_val ->> 'createdBy', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        v_created_by := (v_val ->> 'createdBy')::uuid;
      end if;
      if coalesce(v_val ->> 'updatedBy', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        v_updated_by_uuid := (v_val ->> 'updatedBy')::uuid;
      end if;
      if coalesce(v_val ->> 'approvedBy', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        v_approved_by := (v_val ->> 'approvedBy')::uuid;
      end if;
    exception when others then
      v_created_by := null;
      v_updated_by_uuid := null;
      v_approved_by := null;
    end;

    begin
      v_version_num := greatest(coalesce((v_val ->> 'version')::int, 1), 1);
    exception when others then
      raise exception 'Invalid value version for %', v_stable;
    end;

    if v_value_id is null then
      insert into public.translation_studio_values (
        key_id, language, value, status, version, suggestion_id,
        created_by, updated_by, approved_by, created_at, updated_at,
        stable_id, suggestion_stable_id
      ) values (
        v_key_id,
        v_val ->> 'language',
        left(coalesce(v_val ->> 'value', ''), 8000),
        v_status,
        v_version_num,
        null,
        v_created_by,
        v_updated_by_uuid,
        v_approved_by,
        coalesce((v_val ->> 'createdAt')::timestamptz, v_now),
        coalesce((v_val ->> 'updatedAt')::timestamptz, v_now),
        left(v_stable, 256),
        nullif(btrim(coalesce(v_val ->> 'suggestionId', '')), '')
      );
      v_inserted := v_inserted + 1;
    else
      update public.translation_studio_values
      set
        key_id = v_key_id,
        language = v_val ->> 'language',
        value = left(coalesce(v_val ->> 'value', ''), 8000),
        status = v_status,
        version = v_version_num,
        updated_by = coalesce(v_updated_by_uuid, updated_by),
        approved_by = coalesce(v_approved_by, approved_by),
        updated_at = coalesce((v_val ->> 'updatedAt')::timestamptz, v_now),
        suggestion_stable_id = nullif(btrim(coalesce(v_val ->> 'suggestionId', '')), '')
      where id = v_value_id;
      v_updated := v_updated + 1;
    end if;
  end loop;

  -- -------------------------------------------------------------------------
  -- Versions
  -- -------------------------------------------------------------------------
  for v_ver in
    select value from jsonb_array_elements(coalesce(p_snapshot -> 'versions', '[]'::jsonb))
  loop
    v_stable := nullif(btrim(coalesce(v_ver ->> 'id', '')), '');
    v_value_stable := nullif(btrim(coalesce(v_ver ->> 'valueId', '')), '');
    v_key_stable := nullif(btrim(coalesce(v_ver ->> 'keyId', '')), '');
    if v_stable is null or v_value_stable is null or v_key_stable is null then
      raise exception 'Invalid version: id, valueId, and keyId required';
    end if;

    select v.id into v_value_id from public.translation_studio_values v where v.stable_id = v_value_stable;
    select k.id into v_key_id from public.translation_studio_keys k where k.stable_id = v_key_stable;
    if (v_value_id is null or v_key_id is null) and not v_dry_run then
      raise exception 'Unknown value/key for version %', v_stable;
    end if;

    select x.id into v_row_id
    from public.translation_studio_versions x
    where x.stable_id = v_stable;

    v_actor_uuid := null;
    begin
      if coalesce(v_ver ->> 'changedBy', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        v_actor_uuid := (v_ver ->> 'changedBy')::uuid;
      end if;
    exception when others then
      v_actor_uuid := null;
    end;

    if v_dry_run then
      if v_row_id is null then
        v_planned_insert := v_planned_insert + 1;
      else
        v_planned_update := v_planned_update + 1;
      end if;
    elsif v_row_id is null then
      insert into public.translation_studio_versions (
        value_id, key_id, language, value, status, version,
        changed_by, change_action, change_note, created_at, stable_id
      ) values (
        v_value_id,
        v_key_id,
        coalesce(v_ver ->> 'language', ''),
        coalesce(v_ver ->> 'value', ''),
        coalesce(v_ver ->> 'status', 'draft'),
        greatest(coalesce((v_ver ->> 'version')::int, 1), 1),
        v_actor_uuid,
        left(coalesce(v_ver ->> 'changeAction', 'upsert'), 64),
        case
          when v_ver ->> 'changeNote' is null then null
          else left(v_ver ->> 'changeNote', 2000)
        end,
        coalesce((v_ver ->> 'createdAt')::timestamptz, v_now),
        left(v_stable, 128)
      );
      v_inserted := v_inserted + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  -- -------------------------------------------------------------------------
  -- Memory
  -- -------------------------------------------------------------------------
  for v_mem in
    select value from jsonb_array_elements(coalesce(p_snapshot -> 'memory', '[]'::jsonb))
  loop
    v_stable := nullif(btrim(coalesce(v_mem ->> 'id', '')), '');
    if v_stable is null
       or coalesce(v_mem ->> 'sourceFingerprint', '') = ''
       or coalesce(v_mem ->> 'language', '') = ''
       or coalesce(v_mem ->> 'translatedText', '') = '' then
      raise exception 'Invalid memory entry';
    end if;

    v_ns_stable := nullif(btrim(coalesce(v_mem ->> 'namespaceId', '')), '');
    v_ns_id := null;
    if v_ns_stable is not null then
      select n.id into v_ns_id from public.translation_studio_namespaces n where n.stable_id = v_ns_stable;
    end if;

    select m.id into v_row_id
    from public.translation_studio_memory m
    where m.stable_id = v_stable;

    v_actor_uuid := null;
    begin
      if coalesce(v_mem ->> 'createdBy', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        v_actor_uuid := (v_mem ->> 'createdBy')::uuid;
      end if;
    exception when others then
      v_actor_uuid := null;
    end;

    if v_dry_run then
      if v_row_id is null then
        v_planned_insert := v_planned_insert + 1;
      else
        v_planned_update := v_planned_update + 1;
      end if;
    elsif v_row_id is null then
      insert into public.translation_studio_memory (
        source_fingerprint, source_text, language, translated_text,
        status, namespace_id, created_by, created_at, stable_id
      ) values (
        left(v_mem ->> 'sourceFingerprint', 128),
        coalesce(v_mem ->> 'sourceText', ''),
        v_mem ->> 'language',
        v_mem ->> 'translatedText',
        'approved',
        v_ns_id,
        v_actor_uuid,
        coalesce((v_mem ->> 'createdAt')::timestamptz, v_now),
        left(v_stable, 128)
      );
      v_inserted := v_inserted + 1;
    else
      update public.translation_studio_memory
      set
        source_fingerprint = left(v_mem ->> 'sourceFingerprint', 128),
        source_text = coalesce(v_mem ->> 'sourceText', ''),
        language = v_mem ->> 'language',
        translated_text = v_mem ->> 'translatedText',
        namespace_id = v_ns_id,
        created_by = coalesce(v_actor_uuid, created_by)
      where id = v_row_id;
      v_updated := v_updated + 1;
    end if;
  end loop;

  -- -------------------------------------------------------------------------
  -- Terminology
  -- -------------------------------------------------------------------------
  for v_term in
    select value from jsonb_array_elements(coalesce(p_snapshot -> 'terminology', '[]'::jsonb))
  loop
    v_stable := nullif(btrim(coalesce(v_term ->> 'id', '')), '');
    if v_stable is null or coalesce(v_term ->> 'term', '') = '' then
      raise exception 'Invalid terminology: id and term required';
    end if;
    v_status := coalesce(v_term ->> 'status', 'draft');
    if v_status not in ('draft', 'approved', 'deprecated') then
      raise exception 'Invalid terminology status: %', v_status;
    end if;

    select t.id into v_row_id
    from public.translation_studio_terminology t
    where t.stable_id = v_stable;

    if v_dry_run then
      if v_row_id is null then
        v_planned_insert := v_planned_insert + 1;
      else
        v_planned_update := v_planned_update + 1;
      end if;
    elsif v_row_id is null then
      insert into public.translation_studio_terminology (
        term, definition, notes, status, translations, created_at, updated_at, stable_id
      ) values (
        left(v_term ->> 'term', 200),
        coalesce(v_term ->> 'definition', ''),
        v_term ->> 'notes',
        v_status,
        coalesce(v_term -> 'translations', '{}'::jsonb),
        v_now,
        v_now,
        left(v_stable, 128)
      );
      v_inserted := v_inserted + 1;
    else
      update public.translation_studio_terminology
      set
        term = left(v_term ->> 'term', 200),
        definition = coalesce(v_term ->> 'definition', ''),
        notes = v_term ->> 'notes',
        status = v_status,
        translations = coalesce(v_term -> 'translations', '{}'::jsonb),
        updated_at = v_now
      where id = v_row_id;
      v_updated := v_updated + 1;
    end if;
  end loop;

  -- -------------------------------------------------------------------------
  -- Audit log (append-only by stable_id; skip if already present)
  -- -------------------------------------------------------------------------
  for v_audit in
    select value from jsonb_array_elements(coalesce(p_snapshot -> 'auditLog', '[]'::jsonb))
  loop
    v_stable := nullif(btrim(coalesce(v_audit ->> 'id', '')), '');
    if v_stable is null
       or coalesce(v_audit ->> 'entityType', '') = ''
       or coalesce(v_audit ->> 'entityId', '') = ''
       or coalesce(v_audit ->> 'action', '') = '' then
      raise exception 'Invalid audit entry';
    end if;

    if (v_audit ->> 'entityType') not in (
      'translation_value', 'suggestion', 'terminology', 'memory', 'publish'
    ) then
      raise exception 'Invalid audit entityType: %', v_audit ->> 'entityType';
    end if;

    select a.id into v_row_id
    from public.translation_studio_audit_log a
    where a.stable_id = v_stable;

    -- Resolve actor metadata
    v_actor_uuid := null;
    v_actor_kind := 'user';
    v_actor_ref := null;
    begin
      if coalesce(v_audit ->> 'actorId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        v_actor_uuid := (v_audit ->> 'actorId')::uuid;
        v_actor_kind := 'user';
        v_actor_ref := null;
      elsif coalesce(v_audit ->> 'actorId', '') like 'system:%' then
        v_actor_kind := 'system';
        v_actor_ref := left(v_audit ->> 'actorId', 200);
      elsif coalesce(v_audit ->> 'actorId', '') <> '' then
        v_actor_kind := 'system';
        v_actor_ref := left(v_audit ->> 'actorId', 200);
      end if;
    exception when others then
      v_actor_kind := 'system';
      v_actor_ref := left(coalesce(v_audit ->> 'actorId', 'system:unknown'), 200);
    end;

    v_detail := coalesce(v_audit -> 'detail', '{}'::jsonb);

    if v_dry_run then
      if v_row_id is null then
        v_planned_insert := v_planned_insert + 1;
      else
        v_skipped := v_skipped + 1;
      end if;
    elsif v_row_id is null then
      insert into public.translation_studio_audit_log (
        entity_type, entity_id, action, actor_id, detail, created_at,
        stable_id, actor_kind, actor_ref
      ) values (
        v_audit ->> 'entityType',
        v_audit ->> 'entityId',
        left(v_audit ->> 'action', 64),
        v_actor_uuid,
        v_detail,
        coalesce((v_audit ->> 'createdAt')::timestamptz, v_now),
        left(v_stable, 160),
        v_actor_kind,
        v_actor_ref
      );
      v_inserted := v_inserted + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'dry_run', v_dry_run,
    'schema_version', 1,
    'inserted', case when v_dry_run then v_planned_insert else v_inserted end,
    'updated', case when v_dry_run then v_planned_update else v_updated end,
    'skipped', v_skipped,
    'prune_missing', false,
    'caller_user_id', v_uid
  );
end;
$$;

comment on function public.translation_studio_upsert_snapshot(jsonb, jsonb) is
  'Platform-admin SECURITY DEFINER upsert for Translation Studio snapshots. Uses stable_id for idempotent identity. Does not grant table writes to authenticated. prune_missing unsupported in v1.';

revoke all on function public.translation_studio_upsert_snapshot(jsonb, jsonb) from public;
revoke all on function public.translation_studio_upsert_snapshot(jsonb, jsonb) from anon;
grant execute on function public.translation_studio_upsert_snapshot(jsonb, jsonb) to authenticated;
