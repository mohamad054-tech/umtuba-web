-- UMTUBA Unified Content Foundation V1
-- Additive. Git-only until explicit remote apply GO.
-- Thin content_registry index — domains remain authoritative.
-- No Learning/Store/Games/Live adapters in this migration.

-- ---------------------------------------------------------------------------
-- 1. content_registry
-- ---------------------------------------------------------------------------

create table if not exists public.content_registry (
  id uuid primary key default gen_random_uuid(),
  content_kind text not null
    constraint content_registry_kind_check check (
      content_kind in ('article', 'video')
    ),
  source_entity_id text not null
    constraint content_registry_source_id_len check (
      char_length(btrim(source_entity_id)) between 1 and 64
    ),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  visibility text not null default 'public'
    constraint content_registry_visibility_check check (
      visibility in ('public', 'unlisted', 'private')
    ),
  publish_state text not null default 'draft'
    constraint content_registry_publish_state_check check (
      publish_state in ('draft', 'published', 'unpublished')
    ),
  canonical_href text not null
    constraint content_registry_href_len check (
      char_length(btrim(canonical_href)) between 1 and 500
    ),
  discovery_post_id bigint references public.posts (id) on delete set null,
  title text not null default ''
    constraint content_registry_title_len check (char_length(title) <= 300),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.content_registry is
  'Unified Content Foundation V1 — thin index only. Domains remain source of truth. No article body / course / product payloads.';

create unique index if not exists content_registry_kind_source_uidx
  on public.content_registry (content_kind, source_entity_id);

create index if not exists content_registry_owner_published_idx
  on public.content_registry (owner_user_id, published_at desc nulls last, created_at desc);

create index if not exists content_registry_discovery_post_idx
  on public.content_registry (discovery_post_id)
  where discovery_post_id is not null;

create index if not exists content_registry_public_feed_idx
  on public.content_registry (published_at desc nulls last)
  where visibility = 'public' and publish_state = 'published';

drop trigger if exists content_registry_set_updated_at on public.content_registry;
create trigger content_registry_set_updated_at
  before update on public.content_registry
  for each row execute function public.set_row_updated_at();

alter table public.content_registry enable row level security;
alter table public.content_registry force row level security;

revoke all on table public.content_registry from public, anon, authenticated;
grant select on table public.content_registry to anon, authenticated;
grant all on table public.content_registry to service_role;

-- Public may read only published+public rows. Owners may read their own (any state).
drop policy if exists "Public read published content registry" on public.content_registry;
create policy "Public read published content registry"
  on public.content_registry for select to anon, authenticated
  using (
    (visibility = 'public' and publish_state = 'published')
    or owner_user_id = (select auth.uid())
  );

-- No direct client INSERT/UPDATE/DELETE — mutations via SECURITY DEFINER RPCs only.

-- ---------------------------------------------------------------------------
-- 2. Upsert / deactivate / discovery link RPCs
-- ---------------------------------------------------------------------------

create or replace function public.upsert_content_registry_item(
  p_content_kind text,
  p_source_entity_id text,
  p_owner_user_id uuid,
  p_visibility text,
  p_publish_state text,
  p_canonical_href text,
  p_discovery_post_id bigint default null,
  p_title text default '',
  p_published_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.content_registry%rowtype;
  v_kind text := nullif(btrim(coalesce(p_content_kind, '')), '');
  v_source text := nullif(btrim(coalesce(p_source_entity_id, '')), '');
  v_href text := nullif(btrim(coalesce(p_canonical_href, '')), '');
  v_title text := left(coalesce(p_title, ''), 300);
  v_vis text := coalesce(nullif(btrim(p_visibility), ''), 'public');
  v_pub text := coalesce(nullif(btrim(p_publish_state), ''), 'draft');
begin
  if v_kind is null or v_kind not in ('article', 'video') then
    raise exception 'Invalid content_kind';
  end if;
  if v_source is null or char_length(v_source) > 64 then
    raise exception 'Invalid source_entity_id';
  end if;
  if v_href is null or char_length(v_href) > 500 then
    raise exception 'Invalid canonical_href';
  end if;
  if v_vis not in ('public', 'unlisted', 'private') then
    raise exception 'Invalid visibility';
  end if;
  if v_pub not in ('draft', 'published', 'unpublished') then
    raise exception 'Invalid publish_state';
  end if;
  if p_owner_user_id is null then
    raise exception 'owner_user_id required';
  end if;

  -- Caller must be owner session or service_role (auth.uid() null under service role JWT is rare;
  -- allow when v_uid is null only for service_role connections via bypass — require match when uid present).
  if v_uid is not null and v_uid <> p_owner_user_id then
    raise exception 'Forbidden';
  end if;

  insert into public.content_registry (
    content_kind,
    source_entity_id,
    owner_user_id,
    visibility,
    publish_state,
    canonical_href,
    discovery_post_id,
    title,
    published_at
  )
  values (
    v_kind,
    v_source,
    p_owner_user_id,
    v_vis,
    v_pub,
    v_href,
    p_discovery_post_id,
    v_title,
    p_published_at
  )
  on conflict (content_kind, source_entity_id)
  do update set
    owner_user_id = excluded.owner_user_id,
    visibility = excluded.visibility,
    publish_state = excluded.publish_state,
    canonical_href = excluded.canonical_href,
    discovery_post_id = coalesce(excluded.discovery_post_id, public.content_registry.discovery_post_id),
    title = excluded.title,
    published_at = excluded.published_at,
    updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'content_kind', v_row.content_kind,
    'source_entity_id', v_row.source_entity_id,
    'discovery_post_id', v_row.discovery_post_id,
    'publish_state', v_row.publish_state,
    'visibility', v_row.visibility
  );
end;
$$;

create or replace function public.deactivate_content_registry_item(
  p_content_kind text,
  p_source_entity_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.content_registry%rowtype;
begin
  select * into v_row
  from public.content_registry
  where content_kind = btrim(p_content_kind)
    and source_entity_id = btrim(p_source_entity_id)
  for update;
  if not found then
    return jsonb_build_object('ok', true, 'found', false);
  end if;
  if v_uid is not null and v_uid <> v_row.owner_user_id then
    raise exception 'Forbidden';
  end if;

  update public.content_registry
  set
    publish_state = 'unpublished',
    visibility = 'private',
    updated_at = now()
  where id = v_row.id
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'found', true,
    'id', v_row.id,
    'publish_state', v_row.publish_state
  );
end;
$$;

create or replace function public.set_content_registry_discovery_post(
  p_content_kind text,
  p_source_entity_id text,
  p_discovery_post_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.content_registry%rowtype;
begin
  select * into v_row
  from public.content_registry
  where content_kind = btrim(p_content_kind)
    and source_entity_id = btrim(p_source_entity_id)
  for update;
  if not found then
    raise exception 'Registry item not found';
  end if;
  if v_uid is not null and v_uid <> v_row.owner_user_id then
    raise exception 'Forbidden';
  end if;

  update public.content_registry
  set
    discovery_post_id = p_discovery_post_id,
    updated_at = now()
  where id = v_row.id
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'discovery_post_id', v_row.discovery_post_id
  );
end;
$$;

-- Idempotent backfill for published articles + independent ready videos.
create or replace function public.backfill_content_registry_v1()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_articles integer := 0;
  v_videos integer := 0;
begin
  -- Published articles
  insert into public.content_registry (
    content_kind,
    source_entity_id,
    owner_user_id,
    visibility,
    publish_state,
    canonical_href,
    discovery_post_id,
    title,
    published_at
  )
  select
    'article',
    a.id::text,
    a.user_id,
    'public',
    'published',
    '/articles/' || a.id::text,
    (
      select p.id
      from public.posts p
      where p.article_id = a.id
        and p.post_type = 'video'
        and p.media_status = 'ready'
        and p.video_path is not null
      order by p.created_at asc
      limit 1
    ),
    left(a.title, 300),
    a.published_at
  from public.articles a
  where a.status = 'published'
  on conflict (content_kind, source_entity_id) do update set
    owner_user_id = excluded.owner_user_id,
    visibility = excluded.visibility,
    publish_state = excluded.publish_state,
    canonical_href = excluded.canonical_href,
    discovery_post_id = coalesce(excluded.discovery_post_id, public.content_registry.discovery_post_id),
    title = excluded.title,
    published_at = excluded.published_at,
    updated_at = now();

  get diagnostics v_articles = row_count;

  -- Independent ready videos (no article_id) — not teaser duplicates
  insert into public.content_registry (
    content_kind,
    source_entity_id,
    owner_user_id,
    visibility,
    publish_state,
    canonical_href,
    discovery_post_id,
    title,
    published_at
  )
  select
    'video',
    p.id::text,
    p.user_id,
    'public',
    'published',
    '/watch?post=' || p.id::text,
    p.id,
    left(coalesce(nullif(btrim(p.content), ''), 'Video'), 300),
    p.created_at
  from public.posts p
  where p.post_type = 'video'
    and p.media_status = 'ready'
    and p.video_path is not null
    and p.article_id is null
  on conflict (content_kind, source_entity_id) do update set
    owner_user_id = excluded.owner_user_id,
    visibility = excluded.visibility,
    publish_state = excluded.publish_state,
    canonical_href = excluded.canonical_href,
    discovery_post_id = excluded.discovery_post_id,
    title = excluded.title,
    published_at = excluded.published_at,
    updated_at = now();

  get diagnostics v_videos = row_count;

  return jsonb_build_object(
    'articles_upserted', v_articles,
    'videos_upserted', v_videos
  );
end;
$$;

revoke all on function public.upsert_content_registry_item(text, text, uuid, text, text, text, bigint, text, timestamptz)
  from public, anon;
grant execute on function public.upsert_content_registry_item(text, text, uuid, text, text, text, bigint, text, timestamptz)
  to authenticated, service_role;

revoke all on function public.deactivate_content_registry_item(text, text)
  from public, anon;
grant execute on function public.deactivate_content_registry_item(text, text)
  to authenticated, service_role;

revoke all on function public.set_content_registry_discovery_post(text, text, bigint)
  from public, anon;
grant execute on function public.set_content_registry_discovery_post(text, text, bigint)
  to authenticated, service_role;

revoke all on function public.backfill_content_registry_v1()
  from public, anon, authenticated;
grant execute on function public.backfill_content_registry_v1()
  to service_role;
