-- UM Games Catalog Foundation V1
-- Additive only. Does NOT edit 20260842 (Platform Foundation).
--
-- Extends public.games with authoritative catalog metadata so future games
-- (Kick Blast, Cards, Sudoku, …) register via catalog RPCs — not app code.
--
-- Does NOT: gameplay, economy, UM Points, Ads, matchmaking, public
-- leaderboards, anti-cheat, or game logic.
-- Migration apply status: NOT APPLIED (Git-only until explicitly approved).

-- ---------------------------------------------------------------------------
-- 1) Extend games with catalog metadata (defaults fail-closed / hidden)
-- ---------------------------------------------------------------------------

alter table public.games
  add column if not exists short_blurb text
    constraint games_short_blurb_len check (
      short_blurb is null or char_length(short_blurb) <= 280
    );

alter table public.games
  add column if not exists availability text not null default 'unavailable'
    constraint games_availability_check check (
      availability in (
        'available',
        'unavailable',
        'coming_soon',
        'maintenance'
      )
    );

alter table public.games
  add column if not exists visibility text not null default 'hidden'
    constraint games_visibility_check check (
      visibility in ('hidden', 'authenticated', 'listed')
    );

alter table public.games
  add column if not exists category text not null default 'other'
    constraint games_category_check check (
      category in (
        'action',
        'cards',
        'puzzle',
        'sports',
        'casual',
        'strategy',
        'other'
      )
    );

alter table public.games
  add column if not exists difficulty text not null default 'unset'
    constraint games_difficulty_check check (
      difficulty in ('unset', 'easy', 'medium', 'hard', 'expert')
    );

alter table public.games
  add column if not exists min_players integer not null default 1
    constraint games_min_players_check check (
      min_players between 1 and 64
    );

alter table public.games
  add column if not exists max_players integer not null default 1
    constraint games_max_players_check check (
      max_players between 1 and 64
    );

alter table public.games
  drop constraint if exists games_player_count_range_check;
alter table public.games
  add constraint games_player_count_range_check check (
    min_players <= max_players
  );

alter table public.games
  add column if not exists platforms jsonb not null default '["web"]'::jsonb
    constraint games_platforms_is_array check (
      jsonb_typeof(platforms) = 'array'
    );

alter table public.games
  add column if not exists feature_flags jsonb not null default jsonb_build_object(
      'sessions_enabled', true,
      'achievements_enabled', true,
      'progress_enabled', true,
      'privacy_settings_enabled', true
    )
    constraint games_feature_flags_is_object check (
      jsonb_typeof(feature_flags) = 'object'
    );

alter table public.games
  add column if not exists catalog_version integer not null default 1
    constraint games_catalog_version_check check (
      catalog_version between 1 and 1000000
    );

alter table public.games
  add column if not exists content_version text
    constraint games_content_version_format check (
      content_version is null
      or content_version ~ '^[A-Za-z0-9._+-]{1,64}$'
    );

alter table public.games
  add column if not exists sort_order integer not null default 0
    constraint games_sort_order_check check (
      sort_order between 0 and 1000000
    );

alter table public.games
  add column if not exists is_featured boolean not null default false;

comment on column public.games.availability is
  'Catalog availability UX. Sessions require available + status=active.';
comment on column public.games.visibility is
  'Catalog visibility: hidden|authenticated|listed. No public leaderboards.';
comment on column public.games.feature_flags is
  'Allowlisted boolean flags only. Unknown keys rejected by validators.';
comment on column public.games.platforms is
  'Allowlisted platforms array: web|ios|android.';
comment on column public.games.catalog_version is
  'Monotonic catalog definition version for this game_key.';

create index if not exists games_catalog_list_idx
  on public.games (status, availability, visibility, sort_order);

create index if not exists games_category_idx on public.games (category);
create index if not exists games_featured_idx
  on public.games (is_featured)
  where is_featured = true;

-- Replace read policy: active + visible catalog entries for players.
drop policy if exists "Authenticated read active games catalog" on public.games;
create policy "Authenticated read visible games catalog"
  on public.games for select
  to authenticated
  using (
    status in ('active', 'draft')
    and visibility in ('authenticated', 'listed')
    and not (status = 'draft' and visibility = 'authenticated')
  );

-- Keep admin full read (recreate if dropped by name collision — already exists).
drop policy if exists "Platform admins read all games" on public.games;
create policy "Platform admins read all games"
  on public.games for select
  to authenticated
  using (public.is_platform_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 2) Internal helpers
-- ---------------------------------------------------------------------------

create or replace function public.game_catalog_validate_definition(p_def jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_allowed text[] := array[
    'game_key', 'slug', 'name', 'description', 'short_blurb',
    'status', 'availability', 'visibility', 'category', 'difficulty',
    'min_players', 'max_players', 'platforms', 'feature_flags',
    'catalog_version', 'content_version', 'sort_order', 'is_featured',
    'result_validation_mode', 'session_ttl_seconds'
  ];
  v_platforms jsonb;
  v_flags jsonb;
  v_flag_key text;
  v_flag_allowed text[] := array[
    'sessions_enabled',
    'achievements_enabled',
    'progress_enabled',
    'privacy_settings_enabled'
  ];
  v_platform text;
  v_seen text[] := array[]::text[];
  v_min integer;
  v_max integer;
  v_out jsonb;
begin
  if p_def is null or jsonb_typeof(p_def) is distinct from 'object' then
    raise exception 'definition_not_object';
  end if;

  for v_key in select jsonb_object_keys(p_def)
  loop
    if not (v_key = any (v_allowed)) then
      raise exception 'definition_unknown_field';
    end if;
  end loop;

  if coalesce(p_def ->> 'game_key', '') !~ '^[a-z][a-z0-9_]{1,62}[a-z0-9]$' then
    raise exception 'game_key_invalid';
  end if;
  if coalesce(p_def ->> 'slug', '') !~ '^[a-z][a-z0-9-]{1,62}[a-z0-9]$' then
    raise exception 'slug_invalid';
  end if;
  if coalesce(nullif(btrim(p_def ->> 'name'), ''), '') = '' then
    raise exception 'name_required';
  end if;
  if char_length(p_def ->> 'name') > 120 then
    raise exception 'name_too_long';
  end if;

  if p_def ? 'description'
     and p_def -> 'description' is not null
     and jsonb_typeof(p_def -> 'description') is distinct from 'string'
  then
    raise exception 'description_invalid';
  end if;
  if p_def ? 'description'
     and jsonb_typeof(p_def -> 'description') = 'string'
     and char_length(p_def ->> 'description') > 4000
  then
    raise exception 'description_too_long';
  end if;

  if p_def ? 'short_blurb'
     and p_def -> 'short_blurb' is not null
     and jsonb_typeof(p_def -> 'short_blurb') is distinct from 'string'
  then
    raise exception 'short_blurb_invalid';
  end if;
  if p_def ? 'short_blurb'
     and jsonb_typeof(p_def -> 'short_blurb') = 'string'
     and char_length(p_def ->> 'short_blurb') > 280
  then
    raise exception 'short_blurb_too_long';
  end if;

  if coalesce(p_def ->> 'status', '') not in ('draft', 'active', 'archived') then
    raise exception 'status_invalid';
  end if;
  if coalesce(p_def ->> 'availability', '') not in (
    'available', 'unavailable', 'coming_soon', 'maintenance'
  ) then
    raise exception 'availability_invalid';
  end if;
  if coalesce(p_def ->> 'visibility', '') not in (
    'hidden', 'authenticated', 'listed'
  ) then
    raise exception 'visibility_invalid';
  end if;
  if coalesce(p_def ->> 'category', '') not in (
    'action', 'cards', 'puzzle', 'sports', 'casual', 'strategy', 'other'
  ) then
    raise exception 'category_invalid';
  end if;
  if coalesce(p_def ->> 'difficulty', '') not in (
    'unset', 'easy', 'medium', 'hard', 'expert'
  ) then
    raise exception 'difficulty_invalid';
  end if;

  begin
    v_min := (p_def ->> 'min_players')::integer;
    v_max := (p_def ->> 'max_players')::integer;
  exception
    when others then
      raise exception 'player_count_invalid';
  end;
  if v_min is null or v_max is null
     or v_min < 1 or v_min > 64 or v_max < 1 or v_max > 64
  then
    raise exception 'player_count_invalid';
  end if;
  if v_min > v_max then
    raise exception 'player_count_range_invalid';
  end if;

  v_platforms := p_def -> 'platforms';
  if jsonb_typeof(v_platforms) is distinct from 'array'
     or jsonb_array_length(v_platforms) < 1
     or jsonb_array_length(v_platforms) > 8
  then
    raise exception 'platforms_required';
  end if;
  for v_platform in
    select jsonb_array_elements_text(v_platforms)
  loop
    if v_platform not in ('web', 'ios', 'android') then
      raise exception 'platform_unknown';
    end if;
    if v_platform = any (v_seen) then
      raise exception 'platform_duplicate';
    end if;
    v_seen := array_append(v_seen, v_platform);
  end loop;

  v_flags := coalesce(p_def -> 'feature_flags', '{}'::jsonb);
  if jsonb_typeof(v_flags) is distinct from 'object' then
    raise exception 'feature_flags_not_object';
  end if;
  if octet_length(v_flags::text) > 1024 then
    raise exception 'feature_flags_too_large';
  end if;
  for v_flag_key in select jsonb_object_keys(v_flags)
  loop
    if not (v_flag_key = any (v_flag_allowed)) then
      raise exception 'feature_flag_unknown';
    end if;
    if jsonb_typeof(v_flags -> v_flag_key) is distinct from 'boolean' then
      raise exception 'feature_flag_not_boolean';
    end if;
  end loop;

  -- Merge defaults.
  v_flags := jsonb_build_object(
    'sessions_enabled', coalesce((v_flags ->> 'sessions_enabled')::boolean, true),
    'achievements_enabled', coalesce((v_flags ->> 'achievements_enabled')::boolean, true),
    'progress_enabled', coalesce((v_flags ->> 'progress_enabled')::boolean, true),
    'privacy_settings_enabled', coalesce((v_flags ->> 'privacy_settings_enabled')::boolean, true)
  );

  if coalesce((p_def ->> 'catalog_version')::integer, 0) not between 1 and 1000000 then
    raise exception 'catalog_version_invalid';
  end if;

  if p_def ? 'content_version'
     and p_def -> 'content_version' is not null
     and (
       jsonb_typeof(p_def -> 'content_version') is distinct from 'string'
       or (p_def ->> 'content_version') !~ '^[A-Za-z0-9._+-]{1,64}$'
     )
  then
    raise exception 'content_version_invalid';
  end if;

  if p_def ? 'sort_order'
     and coalesce((p_def ->> 'sort_order')::integer, -1) not between 0 and 1000000
  then
    raise exception 'sort_order_invalid';
  end if;

  if p_def ? 'is_featured'
     and jsonb_typeof(p_def -> 'is_featured') is distinct from 'boolean'
  then
    raise exception 'is_featured_invalid';
  end if;

  if p_def ? 'result_validation_mode'
     and coalesce(p_def ->> 'result_validation_mode', '') is distinct from 'fail_closed'
  then
    raise exception 'result_validation_mode_invalid';
  end if;

  if p_def ? 'session_ttl_seconds'
     and coalesce((p_def ->> 'session_ttl_seconds')::integer, 0) not between 60 and 86400
  then
    raise exception 'session_ttl_invalid';
  end if;

  v_out := jsonb_build_object(
    'game_key', p_def ->> 'game_key',
    'slug', p_def ->> 'slug',
    'name', btrim(p_def ->> 'name'),
    'description', p_def -> 'description',
    'short_blurb', p_def -> 'short_blurb',
    'status', p_def ->> 'status',
    'availability', p_def ->> 'availability',
    'visibility', p_def ->> 'visibility',
    'category', p_def ->> 'category',
    'difficulty', p_def ->> 'difficulty',
    'min_players', v_min,
    'max_players', v_max,
    'platforms', v_platforms,
    'feature_flags', v_flags,
    'catalog_version', (p_def ->> 'catalog_version')::integer,
    'content_version', p_def -> 'content_version',
    'sort_order', coalesce((p_def ->> 'sort_order')::integer, 0),
    'is_featured', coalesce((p_def ->> 'is_featured')::boolean, false),
    'result_validation_mode', coalesce(p_def ->> 'result_validation_mode', 'fail_closed'),
    'session_ttl_seconds', coalesce((p_def ->> 'session_ttl_seconds')::integer, 3600)
  );

  return v_out;
end;
$$;

revoke all on function public.game_catalog_validate_definition(jsonb)
  from public, anon, authenticated;
grant execute on function public.game_catalog_validate_definition(jsonb)
  to service_role;

create or replace function public.game_catalog_row_to_json(p_row public.games)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object(
    'id', p_row.id,
    'game_key', p_row.game_key,
    'slug', p_row.slug,
    'name', p_row.name,
    'description', p_row.description,
    'short_blurb', p_row.short_blurb,
    'status', p_row.status,
    'availability', p_row.availability,
    'visibility', p_row.visibility,
    'category', p_row.category,
    'difficulty', p_row.difficulty,
    'min_players', p_row.min_players,
    'max_players', p_row.max_players,
    'platforms', p_row.platforms,
    'feature_flags', p_row.feature_flags,
    'catalog_version', p_row.catalog_version,
    'content_version', p_row.content_version,
    'sort_order', p_row.sort_order,
    'is_featured', p_row.is_featured,
    'result_validation_mode', p_row.result_validation_mode,
    'session_ttl_seconds', p_row.session_ttl_seconds,
    'created_at', p_row.created_at,
    'updated_at', p_row.updated_at
  );
end;
$$;

revoke all on function public.game_catalog_row_to_json(public.games)
  from public, anon, authenticated;
grant execute on function public.game_catalog_row_to_json(public.games)
  to service_role;

-- ---------------------------------------------------------------------------
-- 3) Player catalog RPCs
-- ---------------------------------------------------------------------------

create or replace function public.list_games_catalog()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_items jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(jsonb_agg(public.game_catalog_row_to_json(g) order by g.sort_order asc, g.name asc), '[]'::jsonb)
  into v_items
  from public.games g
  where g.visibility in ('authenticated', 'listed')
    and (
      g.status = 'active'
      or (g.status = 'draft' and g.visibility = 'listed')
    )
    and g.status is distinct from 'archived';

  return jsonb_build_object('games', v_items);
end;
$$;

revoke all on function public.list_games_catalog() from public, anon;
grant execute on function public.list_games_catalog()
  to authenticated, service_role;

create or replace function public.get_game_catalog_by_key(p_game_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.games%rowtype;
  v_deny constant text := 'Game not available';
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_game_key is null or length(p_game_key) < 1 then
    raise exception 'game_key is required';
  end if;

  select * into v_row from public.games where game_key = p_game_key;
  if not found then
    raise exception '%', v_deny;
  end if;

  if public.is_platform_admin(v_uid) then
    return public.game_catalog_row_to_json(v_row);
  end if;

  if v_row.status = 'archived'
     or v_row.visibility = 'hidden'
     or (
       v_row.status = 'draft'
       and v_row.visibility is distinct from 'listed'
     )
  then
    raise exception '%', v_deny;
  end if;

  if v_row.visibility not in ('authenticated', 'listed') then
    raise exception '%', v_deny;
  end if;

  return public.game_catalog_row_to_json(v_row);
end;
$$;

revoke all on function public.get_game_catalog_by_key(text) from public, anon;
grant execute on function public.get_game_catalog_by_key(text)
  to authenticated, service_role;

create or replace function public.get_game_catalog_by_id(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.games%rowtype;
  v_deny constant text := 'Game not available';
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_game_id is null then
    raise exception 'game_id is required';
  end if;

  select * into v_row from public.games where id = p_game_id;
  if not found then
    raise exception '%', v_deny;
  end if;

  if public.is_platform_admin(v_uid) then
    return public.game_catalog_row_to_json(v_row);
  end if;

  if v_row.status = 'archived'
     or v_row.visibility = 'hidden'
     or (
       v_row.status = 'draft'
       and v_row.visibility is distinct from 'listed'
     )
     or v_row.visibility not in ('authenticated', 'listed')
  then
    raise exception '%', v_deny;
  end if;

  return public.game_catalog_row_to_json(v_row);
end;
$$;

revoke all on function public.get_game_catalog_by_id(uuid) from public, anon;
grant execute on function public.get_game_catalog_by_id(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Admin catalog management (no app-code changes for new games)
-- ---------------------------------------------------------------------------

create or replace function public.upsert_game_catalog_entry(p_def jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_norm jsonb;
  v_row public.games%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_platform_admin(v_uid) then
    raise exception 'Not allowed to manage game catalog';
  end if;

  v_norm := public.game_catalog_validate_definition(p_def);

  insert into public.games as g (
    game_key,
    slug,
    name,
    description,
    short_blurb,
    status,
    availability,
    visibility,
    category,
    difficulty,
    min_players,
    max_players,
    platforms,
    feature_flags,
    catalog_version,
    content_version,
    sort_order,
    is_featured,
    result_validation_mode,
    session_ttl_seconds
  ) values (
    v_norm ->> 'game_key',
    v_norm ->> 'slug',
    v_norm ->> 'name',
    case
      when v_norm -> 'description' is null
        or jsonb_typeof(v_norm -> 'description') = 'null'
      then null
      else v_norm ->> 'description'
    end,
    case
      when v_norm -> 'short_blurb' is null
        or jsonb_typeof(v_norm -> 'short_blurb') = 'null'
      then null
      else v_norm ->> 'short_blurb'
    end,
    v_norm ->> 'status',
    v_norm ->> 'availability',
    v_norm ->> 'visibility',
    v_norm ->> 'category',
    v_norm ->> 'difficulty',
    (v_norm ->> 'min_players')::integer,
    (v_norm ->> 'max_players')::integer,
    v_norm -> 'platforms',
    v_norm -> 'feature_flags',
    (v_norm ->> 'catalog_version')::integer,
    case
      when v_norm -> 'content_version' is null
        or jsonb_typeof(v_norm -> 'content_version') = 'null'
      then null
      else v_norm ->> 'content_version'
    end,
    (v_norm ->> 'sort_order')::integer,
    (v_norm ->> 'is_featured')::boolean,
    v_norm ->> 'result_validation_mode',
    (v_norm ->> 'session_ttl_seconds')::integer
  )
  on conflict (game_key) do update
  set slug = excluded.slug,
      name = excluded.name,
      description = excluded.description,
      short_blurb = excluded.short_blurb,
      status = excluded.status,
      availability = excluded.availability,
      visibility = excluded.visibility,
      category = excluded.category,
      difficulty = excluded.difficulty,
      min_players = excluded.min_players,
      max_players = excluded.max_players,
      platforms = excluded.platforms,
      feature_flags = excluded.feature_flags,
      catalog_version = excluded.catalog_version,
      content_version = excluded.content_version,
      sort_order = excluded.sort_order,
      is_featured = excluded.is_featured,
      result_validation_mode = excluded.result_validation_mode,
      session_ttl_seconds = excluded.session_ttl_seconds,
      updated_at = now()
  returning * into v_row;

  return public.game_catalog_row_to_json(v_row);
end;
$$;

revoke all on function public.upsert_game_catalog_entry(jsonb) from public, anon;
grant execute on function public.upsert_game_catalog_entry(jsonb)
  to authenticated, service_role;

create or replace function public.set_game_catalog_lifecycle(
  p_game_key text,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.games%rowtype;
  v_key text;
  v_allowed text[] := array['status', 'availability', 'visibility'];
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_platform_admin(v_uid) then
    raise exception 'Not allowed to manage game catalog';
  end if;
  if p_game_key is null or length(p_game_key) < 1 then
    raise exception 'game_key is required';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) is distinct from 'object' then
    raise exception 'lifecycle_not_object';
  end if;

  for v_key in select jsonb_object_keys(p_patch)
  loop
    if not (v_key = any (v_allowed)) then
      raise exception 'lifecycle_unknown_field';
    end if;
  end loop;

  if not (p_patch ? 'status')
     and not (p_patch ? 'availability')
     and not (p_patch ? 'visibility')
  then
    raise exception 'lifecycle_empty';
  end if;

  if p_patch ? 'status'
     and coalesce(p_patch ->> 'status', '') not in ('draft', 'active', 'archived')
  then
    raise exception 'status_invalid';
  end if;
  if p_patch ? 'availability'
     and coalesce(p_patch ->> 'availability', '') not in (
       'available', 'unavailable', 'coming_soon', 'maintenance'
     )
  then
    raise exception 'availability_invalid';
  end if;
  if p_patch ? 'visibility'
     and coalesce(p_patch ->> 'visibility', '') not in (
       'hidden', 'authenticated', 'listed'
     )
  then
    raise exception 'visibility_invalid';
  end if;

  update public.games
  set status = case
        when p_patch ? 'status' then p_patch ->> 'status'
        else status
      end,
      availability = case
        when p_patch ? 'availability' then p_patch ->> 'availability'
        else availability
      end,
      visibility = case
        when p_patch ? 'visibility' then p_patch ->> 'visibility'
        else visibility
      end,
      updated_at = now()
  where game_key = p_game_key
  returning * into v_row;

  if not found then
    raise exception 'Game not available';
  end if;

  return public.game_catalog_row_to_json(v_row);
end;
$$;

revoke all on function public.set_game_catalog_lifecycle(text, jsonb)
  from public, anon;
grant execute on function public.set_game_catalog_lifecycle(text, jsonb)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Gate session start on catalog availability + feature flag
--     (REPLACE Platform RPC; body extended — 20260842 file untouched)
-- ---------------------------------------------------------------------------

create or replace function public.start_game_session(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_game public.games%rowtype;
  v_session public.game_sessions%rowtype;
  v_now timestamptz := now();
  v_ttl integer;
  v_sessions_enabled boolean;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_game_id is null then
    raise exception 'game_id is required';
  end if;

  select * into v_game
  from public.games
  where id = p_game_id;

  if not found then
    raise exception 'Game not available';
  end if;

  if v_game.status is distinct from 'active'
     or v_game.availability is distinct from 'available'
  then
    raise exception 'Game not available';
  end if;

  v_sessions_enabled := coalesce(
    (v_game.feature_flags ->> 'sessions_enabled')::boolean,
    true
  );
  if v_sessions_enabled is distinct from true then
    raise exception 'Game sessions disabled';
  end if;

  perform public.game_ensure_player_profile(v_uid);

  select * into v_session
  from public.game_sessions
  where user_id = v_uid
    and game_id = p_game_id
    and status = 'active'
  for update;

  if found then
    v_session := public.game_session_expire_if_due(v_session.id);
    if v_session.status = 'active' then
      return jsonb_build_object(
        'session_id', v_session.id,
        'game_id', v_session.game_id,
        'status', v_session.status,
        'started_at', v_session.started_at,
        'expires_at', v_session.expires_at,
        'resumed', true
      );
    end if;
  end if;

  v_ttl := v_game.session_ttl_seconds;

  insert into public.game_sessions (
    game_id,
    user_id,
    status,
    started_at,
    expires_at,
    session_ttl_seconds_snapshot,
    city_id,
    world_event_id,
    live_room_id,
    community_project_id
  ) values (
    p_game_id,
    v_uid,
    'active',
    v_now,
    v_now + make_interval(secs => v_ttl),
    v_ttl,
    v_game.city_id,
    v_game.world_event_id,
    v_game.live_room_id,
    v_game.community_project_id
  )
  returning * into v_session;

  return jsonb_build_object(
    'session_id', v_session.id,
    'game_id', v_session.game_id,
    'status', v_session.status,
    'started_at', v_session.started_at,
    'expires_at', v_session.expires_at,
    'resumed', false
  );
end;
$$;

revoke all on function public.start_game_session(uuid) from public, anon;
grant execute on function public.start_game_session(uuid)
  to authenticated, service_role;
