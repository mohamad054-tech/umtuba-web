-- =============================================================================
-- UM Learning OS — Learner Lesson Bookmarks / Saved Lessons V1
-- Migration: 20260916_learning_lesson_bookmarks_v1.sql
--
-- Private per-learner lesson bookmarks. One row per (user, lesson).
-- Distinct from Resume/Continue Learning and Personal Notes.
-- No folders, tags, sharing, social saves, Store favorites, or instructor browse.
--
-- Stale entitlement: rows are preserved after access loss; Hub/list filters with
-- live has_learning_course_access. Delete remains owner-only without access check
-- so callers can clean private bookmarks after entitlement loss.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) learning_lesson_bookmarks
-- ---------------------------------------------------------------------------

create table if not exists public.learning_lesson_bookmarks (
  user_id uuid not null
    references public.profiles (id) on delete cascade,
  lesson_id uuid not null
    references public.learning_lessons (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

comment on table public.learning_lesson_bookmarks is
  'Private learner lesson bookmarks (Saved Lessons). Owner-only. One row per user+lesson. Not resume/progress/notes.';

comment on column public.learning_lesson_bookmarks.created_at is
  'When the learner first saved the lesson. Preserved on idempotent re-save.';

create index if not exists learning_lesson_bookmarks_user_created_idx
  on public.learning_lesson_bookmarks (user_id, created_at desc);

comment on index public.learning_lesson_bookmarks_user_created_idx is
  'Saved Lessons Hub V1: caller-scoped created_at ordering.';

alter table public.learning_lesson_bookmarks enable row level security;
alter table public.learning_lesson_bookmarks force row level security;

revoke all on table public.learning_lesson_bookmarks from public, anon, authenticated;
grant select, insert, delete on table public.learning_lesson_bookmarks to authenticated;
grant all on table public.learning_lesson_bookmarks to service_role;

-- Owner-only read. No instructor/admin/public SELECT policy.
drop policy if exists "Learners read own lesson bookmarks"
  on public.learning_lesson_bookmarks;
create policy "Learners read own lesson bookmarks"
  on public.learning_lesson_bookmarks
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Learners insert own lesson bookmarks"
  on public.learning_lesson_bookmarks;
create policy "Learners insert own lesson bookmarks"
  on public.learning_lesson_bookmarks
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.learning_lessons l
      join public.learning_sections s on s.id = l.section_id
      where l.id = lesson_id
        and public.has_learning_course_access(s.course_id, (select auth.uid()))
    )
  );

drop policy if exists "Learners delete own lesson bookmarks"
  on public.learning_lesson_bookmarks;
create policy "Learners delete own lesson bookmarks"
  on public.learning_lesson_bookmarks
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2) Access helper
-- ---------------------------------------------------------------------------

create or replace function public.learning_lesson_bookmarks_assert_lesson_access(
  p_lesson_id uuid,
  p_user_id uuid default auth.uid()
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_course_id uuid;
begin
  if p_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_lesson_id is null then
    raise exception 'Lesson not found';
  end if;

  select s.course_id
    into v_course_id
  from public.learning_lessons l
  join public.learning_sections s on s.id = l.section_id
  where l.id = p_lesson_id;

  if v_course_id is null then
    raise exception 'Lesson not found';
  end if;

  if not public.has_learning_course_access(v_course_id, p_user_id) then
    raise exception 'Not entitled to this lesson';
  end if;

  return v_course_id;
end;
$$;

revoke all on function public.learning_lesson_bookmarks_assert_lesson_access(uuid, uuid)
  from public, anon;
grant execute on function public.learning_lesson_bookmarks_assert_lesson_access(uuid, uuid)
  to authenticated, service_role;

comment on function public.learning_lesson_bookmarks_assert_lesson_access(uuid, uuid) is
  'Fail-closed lesson entitlement for bookmarks. Resolves course via lesson→section→course, then has_learning_course_access.';

-- ---------------------------------------------------------------------------
-- 3) save_my_learning_lesson_bookmark
-- ---------------------------------------------------------------------------

create or replace function public.save_my_learning_lesson_bookmark(
  p_lesson_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_created_at timestamptz;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_lesson_id is null then
    raise exception 'Lesson not found';
  end if;

  perform public.learning_lesson_bookmarks_assert_lesson_access(p_lesson_id, v_uid);

  insert into public.learning_lesson_bookmarks (user_id, lesson_id)
  values (v_uid, p_lesson_id)
  on conflict (user_id, lesson_id) do nothing;

  select b.created_at
    into v_created_at
  from public.learning_lesson_bookmarks b
  where b.user_id = v_uid
    and b.lesson_id = p_lesson_id;

  if v_created_at is null then
    raise exception 'Bookmark could not be saved';
  end if;

  return jsonb_build_object(
    'lesson_id', p_lesson_id,
    'saved', true,
    'created_at', v_created_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) delete_my_learning_lesson_bookmark
-- ---------------------------------------------------------------------------

create or replace function public.delete_my_learning_lesson_bookmark(
  p_lesson_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_lesson_id is null then
    raise exception 'Lesson not found';
  end if;

  -- Owner cleanup only. Do NOT require live course access (stale entitlement).
  delete from public.learning_lesson_bookmarks
  where user_id = v_uid
    and lesson_id = p_lesson_id;

  return jsonb_build_object(
    'lesson_id', p_lesson_id,
    'saved', false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) get_my_learning_lesson_bookmark_state
-- ---------------------------------------------------------------------------

create or replace function public.get_my_learning_lesson_bookmark_state(
  p_lesson_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_saved boolean := false;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_lesson_id is null then
    raise exception 'Lesson not found';
  end if;

  perform public.learning_lesson_bookmarks_assert_lesson_access(p_lesson_id, v_uid);

  select exists (
    select 1
    from public.learning_lesson_bookmarks b
    where b.user_id = v_uid
      and b.lesson_id = p_lesson_id
  )
  into v_saved;

  return jsonb_build_object(
    'lesson_id', p_lesson_id,
    'saved', coalesce(v_saved, false)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) list_my_learning_lesson_bookmarks (Saved Lessons hub)
-- ---------------------------------------------------------------------------

create or replace function public.list_my_learning_lesson_bookmarks(
  p_course_id uuid default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer;
  v_fetch integer;
  v_items jsonb;
  v_count integer;
  v_has_more boolean := false;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_fetch := v_limit + 1;

  with ranked as (
    select
      b.lesson_id,
      l.name as lesson_name,
      c.id as course_id,
      c.name as course_name,
      b.created_at
    from public.learning_lesson_bookmarks b
    join public.learning_lessons l on l.id = b.lesson_id
    join public.learning_sections s on s.id = l.section_id
    join public.learning_courses c on c.id = s.course_id
    where b.user_id = v_uid
      and public.has_learning_course_access(c.id, v_uid)
      and (p_course_id is null or c.id = p_course_id)
    order by b.created_at desc, b.lesson_id desc
    limit v_fetch
  ),
  capped as (
    select * from ranked limit v_limit
  )
  select
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'lesson_id', c.lesson_id,
            'lesson_name', c.lesson_name,
            'course_id', c.course_id,
            'course_name', c.course_name,
            'created_at', c.created_at
          )
          order by c.created_at desc, c.lesson_id desc
        )
        from capped c
      ),
      '[]'::jsonb
    ),
    (select count(*)::integer from ranked)
  into v_items, v_count;

  v_has_more := coalesce(v_count, 0) > v_limit;

  return jsonb_build_object(
    'bookmarks', v_items,
    'limit', v_limit,
    'has_more', v_has_more
  );
end;
$$;

revoke all on function public.save_my_learning_lesson_bookmark(uuid)
  from public, anon;
grant execute on function public.save_my_learning_lesson_bookmark(uuid)
  to authenticated, service_role;

revoke all on function public.delete_my_learning_lesson_bookmark(uuid)
  from public, anon;
grant execute on function public.delete_my_learning_lesson_bookmark(uuid)
  to authenticated, service_role;

revoke all on function public.get_my_learning_lesson_bookmark_state(uuid)
  from public, anon;
grant execute on function public.get_my_learning_lesson_bookmark_state(uuid)
  to authenticated, service_role;

revoke all on function public.list_my_learning_lesson_bookmarks(uuid, integer)
  from public, anon;
grant execute on function public.list_my_learning_lesson_bookmarks(uuid, integer)
  to authenticated, service_role;

comment on function public.save_my_learning_lesson_bookmark(uuid) is
  'Save a private lesson bookmark for auth.uid(). Requires live course access. Idempotent; preserves original created_at.';

comment on function public.delete_my_learning_lesson_bookmark(uuid) is
  'Remove own lesson bookmark. Owner-only; does not require live course access. Idempotent.';

comment on function public.get_my_learning_lesson_bookmark_state(uuid) is
  'Return caller bookmark state for a lesson. Requires live course access. Never exposes other users.';

comment on function public.list_my_learning_lesson_bookmarks(uuid, integer) is
  'Saved Lessons hub. Owner-only; live has_learning_course_access filter; optional course filter; newest saved first.';
