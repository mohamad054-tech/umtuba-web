-- =============================================================================
-- UM Learning OS — Structured Course Import Foundation V1
-- Migration: 20260918_learning_structured_course_import_foundation_v1.sql
--
-- Import-run ledger + external-id entity map for draft-first Course Manifest
-- imports. Does NOT create curriculum rows (courses/lessons/blocks) — those
-- continue to use existing create_* RPCs.
--
-- Safety:
-- - No auto-publish
-- - No learner progress mutation
-- - No secrets stored
-- - Mapping is for idempotency / conflict detection only
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) learning_course_import_runs
-- ---------------------------------------------------------------------------

create table if not exists public.learning_course_import_runs (
  id uuid primary key default gen_random_uuid(),
  manifest_version text not null
    constraint learning_course_import_runs_manifest_version_len check (
      char_length(manifest_version) between 1 and 64
    ),
  manifest_fingerprint text not null
    constraint learning_course_import_runs_fingerprint_len check (
      char_length(manifest_fingerprint) between 16 and 128
    ),
  target_program_id uuid not null
    references public.learning_programs (id) on delete restrict,
  target_course_id uuid null
    references public.learning_courses (id) on delete set null,
  status text not null
    constraint learning_course_import_runs_status_check check (
      status in (
        'planned',
        'running',
        'succeeded',
        'failed',
        'conflict',
        'rolled_back'
      )
    ),
  mode text not null
    constraint learning_course_import_runs_mode_check check (
      mode in ('validate', 'dry_run', 'import_draft')
    ),
  entity_counts jsonb not null default '{}'::jsonb
    constraint learning_course_import_runs_counts_object check (
      jsonb_typeof(entity_counts) = 'object'
    ),
  error_summary text null
    constraint learning_course_import_runs_error_summary_len check (
      error_summary is null or char_length(error_summary) <= 4000
    ),
  created_by uuid null
    references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  finished_at timestamptz null
);

comment on table public.learning_course_import_runs is
  'Structured Course Import Foundation V1: operator import-run audit ledger. Draft-first; no auto-publish.';

create index if not exists learning_course_import_runs_program_created_idx
  on public.learning_course_import_runs (target_program_id, created_at desc);

create index if not exists learning_course_import_runs_fingerprint_idx
  on public.learning_course_import_runs (manifest_fingerprint);

alter table public.learning_course_import_runs enable row level security;
alter table public.learning_course_import_runs force row level security;

revoke all on table public.learning_course_import_runs from public, anon, authenticated;
grant select, insert, update on table public.learning_course_import_runs to authenticated;
grant all on table public.learning_course_import_runs to service_role;

drop policy if exists "Course managers read import runs"
  on public.learning_course_import_runs;
create policy "Course managers read import runs"
  on public.learning_course_import_runs
  for select
  to authenticated
  using (
    public.can_manage_learning_program(target_program_id)
    or public.is_platform_admin((select auth.uid()))
  );

drop policy if exists "Course managers insert import runs"
  on public.learning_course_import_runs;
create policy "Course managers insert import runs"
  on public.learning_course_import_runs
  for insert
  to authenticated
  with check (
    public.can_manage_learning_program(target_program_id)
    or public.is_platform_admin((select auth.uid()))
  );

drop policy if exists "Course managers update import runs"
  on public.learning_course_import_runs;
create policy "Course managers update import runs"
  on public.learning_course_import_runs
  for update
  to authenticated
  using (
    public.can_manage_learning_program(target_program_id)
    or public.is_platform_admin((select auth.uid()))
  )
  with check (
    public.can_manage_learning_program(target_program_id)
    or public.is_platform_admin((select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 2) learning_course_import_entity_map
-- ---------------------------------------------------------------------------

create table if not exists public.learning_course_import_entity_map (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null
    references public.learning_course_import_runs (id) on delete cascade,
  program_id uuid not null
    references public.learning_programs (id) on delete restrict,
  entity_kind text not null
    constraint learning_course_import_entity_map_kind_check check (
      entity_kind in (
        'course',
        'section',
        'lesson',
        'content_block',
        'activity',
        'resource'
      )
    ),
  external_id text not null
    constraint learning_course_import_entity_map_external_id_len check (
      char_length(external_id) between 1 and 128
    ),
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  constraint learning_course_import_entity_map_program_ext_unique
    unique (program_id, entity_kind, external_id)
);

comment on table public.learning_course_import_entity_map is
  'Maps Course Manifest V1 external_id values to created Learning entity UUIDs for idempotency/conflict detection.';

create index if not exists learning_course_import_entity_map_run_idx
  on public.learning_course_import_entity_map (import_run_id);

create index if not exists learning_course_import_entity_map_entity_idx
  on public.learning_course_import_entity_map (entity_kind, entity_id);

alter table public.learning_course_import_entity_map enable row level security;
alter table public.learning_course_import_entity_map force row level security;

revoke all on table public.learning_course_import_entity_map from public, anon, authenticated;
grant select, insert on table public.learning_course_import_entity_map to authenticated;
grant all on table public.learning_course_import_entity_map to service_role;

drop policy if exists "Course managers read import entity map"
  on public.learning_course_import_entity_map;
create policy "Course managers read import entity map"
  on public.learning_course_import_entity_map
  for select
  to authenticated
  using (
    public.can_manage_learning_program(program_id)
    or public.is_platform_admin((select auth.uid()))
  );

drop policy if exists "Course managers insert import entity map"
  on public.learning_course_import_entity_map;
create policy "Course managers insert import entity map"
  on public.learning_course_import_entity_map
  for insert
  to authenticated
  with check (
    public.can_manage_learning_program(program_id)
    or public.is_platform_admin((select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 3) Lookup helpers (security definer; no secrets)
-- ---------------------------------------------------------------------------

create or replace function public.lookup_learning_course_import_entity(
  p_program_id uuid,
  p_entity_kind text,
  p_external_id text
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_entity_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_program_id is null or p_entity_kind is null or p_external_id is null then
    raise exception 'program_id, entity_kind, and external_id are required';
  end if;
  if not (
    public.can_manage_learning_program(p_program_id)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not authorized to lookup import entity map';
  end if;

  select entity_id into v_entity_id
  from public.learning_course_import_entity_map
  where program_id = p_program_id
    and entity_kind = p_entity_kind
    and external_id = btrim(p_external_id);

  return v_entity_id;
end;
$$;

revoke all on function public.lookup_learning_course_import_entity(uuid, text, text)
  from public, anon;
grant execute on function public.lookup_learning_course_import_entity(uuid, text, text)
  to authenticated, service_role;

comment on function public.lookup_learning_course_import_entity(uuid, text, text) is
  'Returns mapped entity UUID for a manifest external_id within a program, or null.';

create or replace function public.start_learning_course_import_run(
  p_program_id uuid,
  p_manifest_version text,
  p_manifest_fingerprint text,
  p_mode text default 'import_draft'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if not (
    public.can_manage_learning_program(p_program_id)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not authorized to start import run';
  end if;

  insert into public.learning_course_import_runs (
    manifest_version,
    manifest_fingerprint,
    target_program_id,
    status,
    mode,
    created_by
  )
  values (
    btrim(p_manifest_version),
    btrim(p_manifest_fingerprint),
    p_program_id,
    'running',
    coalesce(nullif(btrim(p_mode), ''), 'import_draft'),
    v_uid
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.start_learning_course_import_run(uuid, text, text, text)
  from public, anon;
grant execute on function public.start_learning_course_import_run(uuid, text, text, text)
  to authenticated, service_role;

create or replace function public.finish_learning_course_import_run(
  p_run_id uuid,
  p_status text,
  p_target_course_id uuid default null,
  p_entity_counts jsonb default '{}'::jsonb,
  p_error_summary text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_program uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select target_program_id into v_program
  from public.learning_course_import_runs
  where id = p_run_id;

  if v_program is null then
    raise exception 'Import run not found';
  end if;
  if not (
    public.can_manage_learning_program(v_program)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not authorized to finish import run';
  end if;

  update public.learning_course_import_runs
  set
    status = p_status,
    target_course_id = coalesce(p_target_course_id, target_course_id),
    entity_counts = coalesce(p_entity_counts, '{}'::jsonb),
    error_summary = p_error_summary,
    finished_at = now()
  where id = p_run_id;
end;
$$;

revoke all on function public.finish_learning_course_import_run(uuid, text, uuid, jsonb, text)
  from public, anon;
grant execute on function public.finish_learning_course_import_run(uuid, text, uuid, jsonb, text)
  to authenticated, service_role;

create or replace function public.record_learning_course_import_entity_map(
  p_program_id uuid,
  p_entity_kind text,
  p_external_id text,
  p_entity_id uuid,
  p_import_run_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_import_run_id is null then
    raise exception 'import_run_id is required';
  end if;
  if not (
    public.can_manage_learning_program(p_program_id)
    or public.is_platform_admin(v_uid)
  ) then
    raise exception 'Not authorized to record import entity map';
  end if;

  insert into public.learning_course_import_entity_map (
    import_run_id,
    program_id,
    entity_kind,
    external_id,
    entity_id
  )
  values (
    p_import_run_id,
    p_program_id,
    p_entity_kind,
    btrim(p_external_id),
    p_entity_id
  )
  on conflict (program_id, entity_kind, external_id) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from public.learning_course_import_entity_map
    where program_id = p_program_id
      and entity_kind = p_entity_kind
      and external_id = btrim(p_external_id);
  end if;

  return v_id;
end;
$$;

revoke all on function public.record_learning_course_import_entity_map(uuid, text, text, uuid, uuid)
  from public, anon;
grant execute on function public.record_learning_course_import_entity_map(uuid, text, text, uuid, uuid)
  to authenticated, service_role;
