-- UMTUBA Articles + Article Teaser Video Foundation V1
-- Additive. Git-only until explicit remote apply GO.
-- Links optional short video posts (post_type=video) to full articles via article_id.
-- Does not alter Learning / Store / Games / UM Points.

-- ---------------------------------------------------------------------------
-- 1. Articles table
-- ---------------------------------------------------------------------------

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null
    constraint articles_title_len check (
      char_length(btrim(title)) between 1 and 200
    ),
  body text not null
    constraint articles_body_len check (
      char_length(btrim(body)) between 1 and 50000
    ),
  status text not null default 'draft'
    constraint articles_status_check check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_user_id_idx
  on public.articles (user_id, created_at desc);

create index if not exists articles_published_idx
  on public.articles (published_at desc)
  where status = 'published';

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_row_updated_at();

alter table public.articles enable row level security;
alter table public.articles force row level security;

revoke all on table public.articles from public, anon, authenticated;
grant select on table public.articles to anon, authenticated;
grant insert, update, delete on table public.articles to authenticated;
grant all on table public.articles to service_role;

drop policy if exists "Anyone can read published articles" on public.articles;
create policy "Anyone can read published articles"
  on public.articles for select to anon, authenticated
  using (status = 'published' or user_id = (select auth.uid()));

drop policy if exists "Owners insert own articles" on public.articles;
create policy "Owners insert own articles"
  on public.articles for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Owners update own articles" on public.articles;
create policy "Owners update own articles"
  on public.articles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Owners delete own articles" on public.articles;
create policy "Owners delete own articles"
  on public.articles for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. Link video posts → articles (teaser)
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists article_id uuid
    references public.articles (id) on delete set null;

create index if not exists posts_article_id_idx
  on public.posts (article_id)
  where article_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Publish helper (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

create or replace function public.publish_my_article(
  p_title text,
  p_body text,
  p_teaser_post_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_article public.articles%rowtype;
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if v_title is null or char_length(v_title) > 200 then
    raise exception 'title is required (1–200 chars)';
  end if;
  if v_body is null or char_length(v_body) > 50000 then
    raise exception 'body is required (1–50000 chars)';
  end if;

  insert into public.articles (user_id, title, body, status, published_at)
  values (v_uid, v_title, v_body, 'published', now())
  returning * into v_article;

  if p_teaser_post_id is not null then
    update public.posts
    set article_id = v_article.id
    where id = p_teaser_post_id
      and user_id = v_uid
      and post_type = 'video'
      and media_status = 'ready'
      and video_path is not null;
    if not found then
      raise exception 'Teaser video post not found or not ready';
    end if;
  end if;

  return jsonb_build_object(
    'article_id', v_article.id,
    'title', v_article.title,
    'status', v_article.status,
    'published_at', v_article.published_at,
    'teaser_post_id', p_teaser_post_id
  );
end;
$$;

revoke all on function public.publish_my_article(text, text, bigint)
  from public, anon;
grant execute on function public.publish_my_article(text, text, bigint)
  to authenticated, service_role;
