-- UMTUBA Article Auto-Teaser Video V1
-- Additive. Git-only until explicit remote apply GO.
-- Jobs for generating 5s title-card MP4 teasers when article has no uploaded video.
-- Does not alter Learning / Store / Games / UM Points.
-- Does NOT create feed-visible posts; worker finalizes posts only after real MP4 upload.

-- ---------------------------------------------------------------------------
-- 1. article_teaser_jobs
-- ---------------------------------------------------------------------------

create table if not exists public.article_teaser_jobs (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null
    constraint article_teaser_jobs_status_check check (
      status in ('not_required', 'pending', 'processing', 'ready', 'failed')
    ),
  teaser_source text not null
    constraint article_teaser_jobs_source_check check (
      teaser_source in ('uploaded', 'generated')
    ),
  background_mode text not null default 'gradient'
    constraint article_teaser_jobs_bg_mode_check check (
      background_mode in ('gradient', 'article_image', 'uploaded_image', 'plain')
    ),
  background_asset_path text,
  audio_mode text not null default 'silent'
    constraint article_teaser_jobs_audio_mode_check check (
      audio_mode in ('silent', 'user_upload')
    ),
  audio_asset_path text,
  generated_video_path text,
  generated_post_id bigint references public.posts (id) on delete set null,
  attempt_count integer not null default 0
    constraint article_teaser_jobs_attempt_nonneg check (attempt_count >= 0),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint article_teaser_jobs_audio_path_when_upload check (
    audio_mode <> 'user_upload' or audio_asset_path is not null
  ),
  constraint article_teaser_jobs_uploaded_implies_not_required check (
    teaser_source <> 'uploaded' or status = 'not_required'
  ),
  constraint article_teaser_jobs_generated_not_not_required check (
    teaser_source <> 'generated' or status <> 'not_required'
  )
);

comment on table public.article_teaser_jobs is
  'Article Auto-Teaser Video V1 — one job per article; feed posts only after worker marks ready with real video_path.';

-- Exactly one job row per article (idempotency root).
create unique index if not exists article_teaser_jobs_article_id_uidx
  on public.article_teaser_jobs (article_id);

create index if not exists article_teaser_jobs_pending_idx
  on public.article_teaser_jobs (created_at asc)
  where status = 'pending';

create index if not exists article_teaser_jobs_owner_idx
  on public.article_teaser_jobs (owner_user_id, updated_at desc);

create index if not exists article_teaser_jobs_generated_post_idx
  on public.article_teaser_jobs (generated_post_id)
  where generated_post_id is not null;

drop trigger if exists article_teaser_jobs_set_updated_at on public.article_teaser_jobs;
create trigger article_teaser_jobs_set_updated_at
  before update on public.article_teaser_jobs
  for each row execute function public.set_row_updated_at();

alter table public.article_teaser_jobs enable row level security;
alter table public.article_teaser_jobs force row level security;

revoke all on table public.article_teaser_jobs from public, anon, authenticated;
grant select on table public.article_teaser_jobs to authenticated;
grant all on table public.article_teaser_jobs to service_role;

drop policy if exists "Owners read own article teaser jobs" on public.article_teaser_jobs;
create policy "Owners read own article teaser jobs"
  on public.article_teaser_jobs for select to authenticated
  using (owner_user_id = (select auth.uid()));

-- Inserts/updates go through SECURITY DEFINER RPCs (enqueue / retry / mark uploaded).
drop policy if exists "Owners insert own article teaser jobs" on public.article_teaser_jobs;
drop policy if exists "Owners update own failed teaser jobs" on public.article_teaser_jobs;

-- ---------------------------------------------------------------------------
-- 2. Owner RPCs — enqueue / retry / mark uploaded (no feed post creation)
-- ---------------------------------------------------------------------------

create or replace function public.enqueue_my_article_teaser_job(
  p_article_id uuid,
  p_background_mode text default 'gradient',
  p_background_asset_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_article public.articles%rowtype;
  v_job public.article_teaser_jobs%rowtype;
  v_mode text := coalesce(nullif(btrim(p_background_mode), ''), 'gradient');
  v_path text := nullif(btrim(coalesce(p_background_asset_path, '')), '');
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if v_mode not in ('gradient', 'article_image', 'uploaded_image', 'plain') then
    raise exception 'Invalid background mode';
  end if;
  if v_mode = 'uploaded_image' and v_path is null then
    raise exception 'Background image path required';
  end if;
  -- article_image not supported in schema V1 (no article cover column) → treat as gradient
  if v_mode = 'article_image' then
    v_mode := 'gradient';
    v_path := coalesce(v_path, 'template:midnight');
  end if;
  if v_mode = 'gradient' and v_path is null then
    v_path := 'template:midnight';
  end if;

  select * into v_article
  from public.articles
  where id = p_article_id and user_id = v_uid;
  if not found then
    raise exception 'Article not found';
  end if;

  -- Idempotent: if job exists, do not create a second row.
  select * into v_job
  from public.article_teaser_jobs
  where article_id = p_article_id;
  if found then
    if v_job.teaser_source = 'uploaded' or v_job.status = 'not_required' then
      return jsonb_build_object(
        'job_id', v_job.id,
        'article_id', v_job.article_id,
        'status', v_job.status,
        'teaser_source', v_job.teaser_source,
        'created', false
      );
    end if;
    if v_job.status in ('pending', 'processing', 'ready') then
      return jsonb_build_object(
        'job_id', v_job.id,
        'article_id', v_job.article_id,
        'status', v_job.status,
        'teaser_source', v_job.teaser_source,
        'created', false
      );
    end if;
    -- failed → re-queue
    update public.article_teaser_jobs
    set
      status = 'pending',
      background_mode = v_mode,
      background_asset_path = v_path,
      audio_mode = 'silent',
      audio_asset_path = null,
      error_code = null
    where id = v_job.id
    returning * into v_job;
    return jsonb_build_object(
      'job_id', v_job.id,
      'article_id', v_job.article_id,
      'status', v_job.status,
      'teaser_source', v_job.teaser_source,
      'created', false
    );
  end if;

  insert into public.article_teaser_jobs (
    article_id,
    owner_user_id,
    status,
    teaser_source,
    background_mode,
    background_asset_path,
    audio_mode
  )
  values (
    p_article_id,
    v_uid,
    'pending',
    'generated',
    v_mode,
    v_path,
    'silent'
  )
  returning * into v_job;

  return jsonb_build_object(
    'job_id', v_job.id,
    'article_id', v_job.article_id,
    'status', v_job.status,
    'teaser_source', v_job.teaser_source,
    'created', true
  );
end;
$$;

create or replace function public.mark_my_article_teaser_uploaded(
  p_article_id uuid,
  p_teaser_post_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_job public.article_teaser_jobs%rowtype;
  v_updated integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.articles a
    where a.id = p_article_id and a.user_id = v_uid
  ) then
    raise exception 'Article not found';
  end if;

  update public.posts
  set article_id = p_article_id
  where id = p_teaser_post_id
    and user_id = v_uid
    and post_type = 'video'
    and media_status = 'ready'
    and video_path is not null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Teaser video post not found or not ready';
  end if;

  select * into v_job from public.article_teaser_jobs where article_id = p_article_id;
  if found then
    update public.article_teaser_jobs
    set
      status = 'not_required',
      teaser_source = 'uploaded',
      generated_post_id = coalesce(generated_post_id, p_teaser_post_id),
      error_code = null,
      audio_mode = 'silent',
      audio_asset_path = null
    where id = v_job.id
    returning * into v_job;
  else
    insert into public.article_teaser_jobs (
      article_id,
      owner_user_id,
      status,
      teaser_source,
      background_mode,
      background_asset_path,
      audio_mode,
      generated_post_id
    )
    values (
      p_article_id,
      v_uid,
      'not_required',
      'uploaded',
      'plain',
      null,
      'silent',
      p_teaser_post_id
    )
    returning * into v_job;
  end if;

  return jsonb_build_object(
    'job_id', v_job.id,
    'article_id', p_article_id,
    'status', v_job.status,
    'teaser_source', v_job.teaser_source,
    'teaser_post_id', p_teaser_post_id
  );
end;
$$;

create or replace function public.retry_my_article_teaser_job(p_article_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_job public.article_teaser_jobs%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_job
  from public.article_teaser_jobs
  where article_id = p_article_id
    and owner_user_id = v_uid
  for update;
  if not found then
    raise exception 'Teaser job not found';
  end if;
  if v_job.teaser_source = 'uploaded' or v_job.status = 'not_required' then
    raise exception 'Teaser generation not required';
  end if;
  if v_job.status = 'ready' then
    return jsonb_build_object(
      'job_id', v_job.id,
      'status', v_job.status,
      'retried', false
    );
  end if;
  if v_job.status = 'processing' then
    raise exception 'Teaser is already processing';
  end if;
  if v_job.attempt_count >= 8 then
    raise exception 'Teaser retry limit reached';
  end if;

  update public.article_teaser_jobs
  set
    status = 'pending',
    error_code = null
  where id = v_job.id
  returning * into v_job;

  return jsonb_build_object(
    'job_id', v_job.id,
    'status', v_job.status,
    'retried', true
  );
end;
$$;

-- Worker claim — service_role only (CAS pending → processing)
create or replace function public.claim_article_teaser_job()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.article_teaser_jobs%rowtype;
begin
  select * into v_job
  from public.article_teaser_jobs
  where status = 'pending'
  order by created_at asc
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.article_teaser_jobs
  set
    status = 'processing',
    attempt_count = attempt_count + 1,
    error_code = null
  where id = v_job.id
  returning * into v_job;

  return jsonb_build_object(
    'id', v_job.id,
    'article_id', v_job.article_id,
    'owner_user_id', v_job.owner_user_id,
    'status', v_job.status,
    'teaser_source', v_job.teaser_source,
    'background_mode', v_job.background_mode,
    'background_asset_path', v_job.background_asset_path,
    'audio_mode', v_job.audio_mode,
    'audio_asset_path', v_job.audio_asset_path,
    'generated_video_path', v_job.generated_video_path,
    'generated_post_id', v_job.generated_post_id,
    'attempt_count', v_job.attempt_count
  );
end;
$$;

revoke all on function public.enqueue_my_article_teaser_job(uuid, text, text)
  from public, anon;
grant execute on function public.enqueue_my_article_teaser_job(uuid, text, text)
  to authenticated, service_role;

revoke all on function public.mark_my_article_teaser_uploaded(uuid, bigint)
  from public, anon;
grant execute on function public.mark_my_article_teaser_uploaded(uuid, bigint)
  to authenticated, service_role;

revoke all on function public.retry_my_article_teaser_job(uuid)
  from public, anon;
grant execute on function public.retry_my_article_teaser_job(uuid)
  to authenticated, service_role;

revoke all on function public.claim_article_teaser_job()
  from public, anon, authenticated;
grant execute on function public.claim_article_teaser_job()
  to service_role;
