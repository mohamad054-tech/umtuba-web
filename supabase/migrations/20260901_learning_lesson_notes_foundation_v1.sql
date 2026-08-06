-- UM Learning OS — Learner Personal Lesson Notes Foundation V1
-- Additive. Git-only until explicit remote apply GO.
--
-- Private per-learner notes attached to a lesson. Plain text only.
-- No sharing, no collaboration, no AI processing, no instructor read path.
--
-- Locked decisions:
--  1. Owner-only RLS for SELECT/INSERT/UPDATE/DELETE (auth.uid() = user_id).
--  2. Writes also require live has_learning_course_access for the lesson's course.
--  3. Client mutations via SECURITY DEFINER RPCs; identity from auth.uid() only.
--  4. Deterministic list order: updated_at desc, id desc.
--  5. No public / staff / instructor SELECT policy on this table.

-- ---------------------------------------------------------------------------
-- 1) learning_lesson_notes
-- ---------------------------------------------------------------------------

create table if not exists public.learning_lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references public.profiles (id) on delete cascade,
  lesson_id uuid not null
    references public.learning_lessons (id) on delete cascade,
  body text not null
    constraint learning_lesson_notes_body_len check (
      char_length(btrim(body)) between 1 and 20000
    ),
  lesson_position_seconds integer
    constraint learning_lesson_notes_position_nonneg check (
      lesson_position_seconds is null
      or lesson_position_seconds >= 0
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.learning_lesson_notes is
  'Private learner lesson notes. Owner-only. No sharing, staff read, or AI processing.';

comment on column public.learning_lesson_notes.body is
  'Plain text note body (1..20000 chars after trim). No HTML rendering.';

comment on column public.learning_lesson_notes.lesson_position_seconds is
  'Optional nonnegative media/lesson position in seconds.';

create index if not exists learning_lesson_notes_user_lesson_updated_idx
  on public.learning_lesson_notes (user_id, lesson_id, updated_at desc);

create index if not exists learning_lesson_notes_lesson_user_idx
  on public.learning_lesson_notes (lesson_id, user_id);

drop trigger if exists learning_lesson_notes_set_updated_at
  on public.learning_lesson_notes;
create trigger learning_lesson_notes_set_updated_at
  before update on public.learning_lesson_notes
  for each row execute function public.set_row_updated_at();

alter table public.learning_lesson_notes enable row level security;
alter table public.learning_lesson_notes force row level security;

revoke all on table public.learning_lesson_notes from public, anon, authenticated;
grant select, insert, update, delete on table public.learning_lesson_notes to authenticated;
grant all on table public.learning_lesson_notes to service_role;

-- Owner-only read. No instructor/admin/public SELECT policy.
drop policy if exists "Learners read own lesson notes"
  on public.learning_lesson_notes;
create policy "Learners read own lesson notes"
  on public.learning_lesson_notes
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Learners insert own lesson notes"
  on public.learning_lesson_notes;
create policy "Learners insert own lesson notes"
  on public.learning_lesson_notes
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.learning_lessons l
      where l.id = lesson_id
        and public.has_learning_course_access(l.course_id, (select auth.uid()))
    )
  );

drop policy if exists "Learners update own lesson notes"
  on public.learning_lesson_notes;
create policy "Learners update own lesson notes"
  on public.learning_lesson_notes
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.learning_lessons l
      where l.id = lesson_id
        and public.has_learning_course_access(l.course_id, (select auth.uid()))
    )
  );

drop policy if exists "Learners delete own lesson notes"
  on public.learning_lesson_notes;
create policy "Learners delete own lesson notes"
  on public.learning_lesson_notes
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2) Access helper (RPC / policy shared)
-- ---------------------------------------------------------------------------

create or replace function public.learning_lesson_notes_assert_lesson_access(
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

  select l.course_id
    into v_course_id
  from public.learning_lessons l
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

revoke all on function public.learning_lesson_notes_assert_lesson_access(uuid, uuid)
  from public, anon;
grant execute on function public.learning_lesson_notes_assert_lesson_access(uuid, uuid)
  to authenticated, service_role;

comment on function public.learning_lesson_notes_assert_lesson_access(uuid, uuid) is
  'Fail-closed lesson entitlement for personal notes. Returns course_id when has_learning_course_access.';

-- ---------------------------------------------------------------------------
-- 3) RPCs — identity from auth.uid(); never accept client user_id
-- ---------------------------------------------------------------------------

create or replace function public.list_my_learning_lesson_notes(
  p_lesson_id uuid
)
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

  perform public.learning_lesson_notes_assert_lesson_access(p_lesson_id, v_uid);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'lesson_id', n.lesson_id,
        'body', n.body,
        'lesson_position_seconds', n.lesson_position_seconds,
        'created_at', n.created_at,
        'updated_at', n.updated_at
      )
      order by n.updated_at desc, n.id desc
    ),
    '[]'::jsonb
  )
  into v_items
  from public.learning_lesson_notes n
  where n.user_id = v_uid
    and n.lesson_id = p_lesson_id;

  return jsonb_build_object(
    'lesson_id', p_lesson_id,
    'notes', v_items
  );
end;
$$;

create or replace function public.create_my_learning_lesson_note(
  p_lesson_id uuid,
  p_body text,
  p_lesson_position_seconds integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_row public.learning_lesson_notes%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  perform public.learning_lesson_notes_assert_lesson_access(p_lesson_id, v_uid);

  if v_body is null or char_length(v_body) > 20000 then
    raise exception 'body must be 1..20000 chars';
  end if;

  if p_lesson_position_seconds is not null and p_lesson_position_seconds < 0 then
    raise exception 'lesson_position_seconds must be nonnegative';
  end if;

  perform public.learning_lesson_content_block_assert_safe_text(
    'lesson_note.body',
    v_body
  );

  insert into public.learning_lesson_notes (
    user_id,
    lesson_id,
    body,
    lesson_position_seconds
  )
  values (
    v_uid,
    p_lesson_id,
    v_body,
    p_lesson_position_seconds
  )
  returning * into v_row;

  return jsonb_build_object(
    'note', jsonb_build_object(
      'id', v_row.id,
      'lesson_id', v_row.lesson_id,
      'body', v_row.body,
      'lesson_position_seconds', v_row.lesson_position_seconds,
      'created_at', v_row.created_at,
      'updated_at', v_row.updated_at
    )
  );
end;
$$;

create or replace function public.update_my_learning_lesson_note(
  p_note_id uuid,
  p_body text,
  p_lesson_position_seconds integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_row public.learning_lesson_notes%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_note_id is null then
    raise exception 'Note not found';
  end if;

  if v_body is null or char_length(v_body) > 20000 then
    raise exception 'body must be 1..20000 chars';
  end if;

  if p_lesson_position_seconds is not null and p_lesson_position_seconds < 0 then
    raise exception 'lesson_position_seconds must be nonnegative';
  end if;

  perform public.learning_lesson_content_block_assert_safe_text(
    'lesson_note.body',
    v_body
  );

  select * into v_row
  from public.learning_lesson_notes
  where id = p_note_id
  for update;

  if not found or v_row.user_id is distinct from v_uid then
    raise exception 'Note not found';
  end if;

  perform public.learning_lesson_notes_assert_lesson_access(v_row.lesson_id, v_uid);

  update public.learning_lesson_notes
  set
    body = v_body,
    lesson_position_seconds = p_lesson_position_seconds
  where id = p_note_id
    and user_id = v_uid
  returning * into v_row;

  if not found then
    raise exception 'Note not found';
  end if;

  return jsonb_build_object(
    'note', jsonb_build_object(
      'id', v_row.id,
      'lesson_id', v_row.lesson_id,
      'body', v_row.body,
      'lesson_position_seconds', v_row.lesson_position_seconds,
      'created_at', v_row.created_at,
      'updated_at', v_row.updated_at
    )
  );
end;
$$;

create or replace function public.delete_my_learning_lesson_note(
  p_note_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.learning_lesson_notes%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_note_id is null then
    raise exception 'Note not found';
  end if;

  select * into v_row
  from public.learning_lesson_notes
  where id = p_note_id
  for update;

  if not found or v_row.user_id is distinct from v_uid then
    raise exception 'Note not found';
  end if;

  delete from public.learning_lesson_notes
  where id = p_note_id
    and user_id = v_uid;

  return jsonb_build_object(
    'deleted', true,
    'id', p_note_id
  );
end;
$$;

revoke all on function public.list_my_learning_lesson_notes(uuid)
  from public, anon;
grant execute on function public.list_my_learning_lesson_notes(uuid)
  to authenticated, service_role;

revoke all on function public.create_my_learning_lesson_note(uuid, text, integer)
  from public, anon;
grant execute on function public.create_my_learning_lesson_note(uuid, text, integer)
  to authenticated, service_role;

revoke all on function public.update_my_learning_lesson_note(uuid, text, integer)
  from public, anon;
grant execute on function public.update_my_learning_lesson_note(uuid, text, integer)
  to authenticated, service_role;

revoke all on function public.delete_my_learning_lesson_note(uuid)
  from public, anon;
grant execute on function public.delete_my_learning_lesson_note(uuid)
  to authenticated, service_role;

comment on function public.list_my_learning_lesson_notes(uuid) is
  'List current learner notes for a lesson. Owner-only. Ordered updated_at desc, id desc.';

comment on function public.create_my_learning_lesson_note(uuid, text, integer) is
  'Create a private lesson note for auth.uid(). Requires course access. Never accepts user_id.';

comment on function public.update_my_learning_lesson_note(uuid, text, integer) is
  'Update own lesson note. Fail-closed on foreign ownership. Requires live course access.';

comment on function public.delete_my_learning_lesson_note(uuid) is
  'Delete own lesson note. Fail-closed on foreign ownership.';
