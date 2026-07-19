-- UMTUBA Global Search Foundation V1
-- Additive only. Indexes + recent-search history.
-- Entity search runs through the authenticated/anon Supabase client so RLS applies.
-- Extensible later for Live / Hashtags / Places (reserved entity labels documented below).
-- Fail-closed RLS on recent searches. No privileged anon grants.

-- ---------------------------------------------------------------------------
-- 0) Extensions
-- ---------------------------------------------------------------------------

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- 1) Normalize helper (SECURITY INVOKER) — used by recent-search trigger
-- ---------------------------------------------------------------------------

create or replace function public.normalize_search_query(p_query text)
returns text
language sql
immutable
security invoker
set search_path = public
as $$
  select nullif(
    lower(btrim(regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g'))),
    ''
  );
$$;

revoke all on function public.normalize_search_query(text) from public;
grant execute on function public.normalize_search_query(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Reserved entity registry (documentation / future expansion — no demo rows
--    beyond the static type catalog itself)
--    V1 active: people, videos, stories, stores, products
--    Reserved: live, hashtags, places
-- ---------------------------------------------------------------------------

create table if not exists public.search_entity_types (
  entity_type text primary key
    check (entity_type in (
      'people',
      'videos',
      'stories',
      'stores',
      'products',
      'live',
      'hashtags',
      'places'
    )),
  is_active boolean not null default false,
  notes text
    check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

insert into public.search_entity_types (entity_type, is_active, notes)
values
  ('people', true, 'profiles.username / display_name / full_name'),
  ('videos', true, 'ready video posts only'),
  ('stories', true, 'active follower-visible stories'),
  ('stores', true, 'active stores'),
  ('products', true, 'active approved products on active stores'),
  ('live', false, 'Reserved for Live rooms'),
  ('hashtags', false, 'Reserved for hashtag index'),
  ('places', false, 'Reserved for city/place search')
on conflict (entity_type) do update
set
  is_active = excluded.is_active,
  notes = excluded.notes;

alter table public.search_entity_types enable row level security;
alter table public.search_entity_types force row level security;

drop policy if exists "Anyone can read search entity types" on public.search_entity_types;
create policy "Anyone can read search entity types"
  on public.search_entity_types
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on table public.search_entity_types from anon, authenticated;
grant select on table public.search_entity_types to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Recent searches (per-user history)
-- ---------------------------------------------------------------------------

create table if not exists public.search_recent_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query_text text not null
    check (char_length(btrim(query_text)) between 1 and 80),
  query_normalized text not null
    check (char_length(query_normalized) between 1 and 80),
  result_tab text not null default 'all'
    check (result_tab in ('all', 'people', 'videos', 'stories', 'stores', 'products')),
  created_at timestamptz not null default now(),
  last_searched_at timestamptz not null default now(),
  constraint search_recent_queries_user_norm_uidx unique (user_id, query_normalized)
);

create index if not exists search_recent_queries_user_last_idx
  on public.search_recent_queries (user_id, last_searched_at desc);

-- Force owner identity + normalized query on write (defense in depth beyond RLS).
create or replace function public.search_recent_queries_enforce_owner()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required for recent searches';
  end if;

  new.user_id := auth.uid();
  new.query_text := btrim(coalesce(new.query_text, ''));
  new.query_normalized := public.normalize_search_query(new.query_text);

  if new.query_normalized is null
     or char_length(new.query_text) < 1
     or char_length(new.query_text) > 80
     or char_length(new.query_normalized) > 80 then
    raise exception 'Invalid recent search query';
  end if;

  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
    new.id := old.id;
  end if;

  new.last_searched_at := coalesce(new.last_searched_at, now());
  return new;
end;
$$;

drop trigger if exists search_recent_queries_enforce_owner_trg on public.search_recent_queries;
create trigger search_recent_queries_enforce_owner_trg
  before insert or update on public.search_recent_queries
  for each row execute function public.search_recent_queries_enforce_owner();

revoke all on function public.search_recent_queries_enforce_owner() from public, anon;
grant execute on function public.search_recent_queries_enforce_owner() to authenticated;

alter table public.search_recent_queries enable row level security;
alter table public.search_recent_queries force row level security;

drop policy if exists "Users manage own recent searches" on public.search_recent_queries;
drop policy if exists "Users read own recent searches" on public.search_recent_queries;
drop policy if exists "Users insert own recent searches" on public.search_recent_queries;
drop policy if exists "Users update own recent searches" on public.search_recent_queries;
drop policy if exists "Users delete own recent searches" on public.search_recent_queries;

create policy "Users read own recent searches"
  on public.search_recent_queries
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users insert own recent searches"
  on public.search_recent_queries
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update own recent searches"
  on public.search_recent_queries
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users delete own recent searches"
  on public.search_recent_queries
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.search_recent_queries from anon;
revoke all on table public.search_recent_queries from public;
grant select, insert, update, delete on table public.search_recent_queries to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Trigram / support indexes for V1 entity search
-- ---------------------------------------------------------------------------

-- People
create index if not exists profiles_username_trgm_idx
  on public.profiles using gin (username gin_trgm_ops);
create index if not exists profiles_display_name_trgm_idx
  on public.profiles using gin (display_name gin_trgm_ops);
create index if not exists profiles_full_name_trgm_idx
  on public.profiles using gin (full_name gin_trgm_ops);

-- Videos (ready video posts — content is the caption field)
create index if not exists posts_content_trgm_idx
  on public.posts using gin (content gin_trgm_ops)
  where post_type = 'video' and media_status = 'ready';

create index if not exists posts_author_username_trgm_idx
  on public.posts using gin (author_username gin_trgm_ops)
  where post_type = 'video' and media_status = 'ready';

-- Stories (caption; visibility still enforced by Stories RLS)
create index if not exists stories_caption_trgm_idx
  on public.stories using gin (caption gin_trgm_ops)
  where caption is not null;

create index if not exists stories_expires_at_active_idx
  on public.stories (expires_at desc);

-- Stores
create index if not exists stores_name_trgm_idx
  on public.stores using gin (name gin_trgm_ops);
create index if not exists stores_slug_trgm_idx
  on public.stores using gin (slug gin_trgm_ops);

-- Products
create index if not exists store_products_title_trgm_idx
  on public.store_products using gin (title gin_trgm_ops);
create index if not exists store_products_short_description_trgm_idx
  on public.store_products using gin (short_description gin_trgm_ops);
